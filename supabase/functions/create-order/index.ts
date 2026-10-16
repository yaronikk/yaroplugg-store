import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

async function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData)
  const receivedHash = params.get('hash')
  const authDate = Number(params.get('auth_date'))
  if (!receivedHash || !Number.isFinite(authDate) || Date.now() / 1000 - authDate > 86400 || authDate > Date.now() / 1000 + 60) return false
  const checkString = [...params.entries()].filter(([key]) => key !== 'hash').sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(botToken), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const secret = await crypto.subtle.sign('HMAC', key, encoder.encode('WebAppData'))
  const signingKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, encoder.encode(checkString)))
  const expectedHash = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return expectedHash.length === receivedHash.length && [...expectedHash].reduce((match, char, index) => match | (char.charCodeAt(0) ^ receivedHash.charCodeAt(index)), 0) === 0
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  if (!url || !serviceKey || !botToken || !chatId) return json({ error: 'Order service is not configured' }, 503)

  try {
    const payload = await request.json()
    const customerName = typeof payload.customerName === 'string' ? payload.customerName.trim() : ''
    const phone = typeof payload.phone === 'string' ? payload.phone.trim() : ''
    const idempotencyKey = payload.idempotencyKey
    const inputItems = payload.items
    const initData = typeof payload.telegramInitData === 'string' ? payload.telegramInitData : ''
    if (!await verifyTelegramInitData(initData, botToken)) return json({ error: 'Open the store from the official Telegram Mini App' }, 401)
    if (customerName.length < 1 || customerName.length > 120 || phone.length < 5 || phone.length > 40 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey || '') ||
      !Array.isArray(inputItems) || inputItems.length < 1 || inputItems.length > 30) {
      return json({ error: 'Check the order details and try again' }, 400)
    }

    const productIds = [...new Set(inputItems.map((item) => item?.productId))]
    if (productIds.some((id) => typeof id !== 'string')) {
      return json({ error: 'Invalid products in order' }, 400)
    }
    for (const item of inputItems) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 ||
        ['size', 'color', 'length'].some((key) => item[key] != null && (typeof item[key] !== 'string' || item[key].length > 60))) {
        return json({ error: 'Invalid product options or quantity' }, 400)
      }
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: products, error: productError } = await supabase.from('products')
      .select('id,name,price,stock,sizes,lengths,colors,is_active,category:categories(name)')
      .in('id', productIds)
    if (productError) throw productError
    if (!products || products.length !== productIds.length) return json({ error: 'A product is no longer available' }, 409)

    const byId = new Map(products.map((product) => [product.id, product]))
    const quantitiesByProduct = new Map<string, number>()
    for (const input of inputItems) quantitiesByProduct.set(input.productId, (quantitiesByProduct.get(input.productId) || 0) + input.quantity)
    let totalCents = 0
    const items = []
    for (const input of inputItems) {
      const product = byId.get(input.productId)
      if (!product || product.is_active !== true) return json({ error: 'A product is no longer available' }, 409)
      if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) return json({ error: 'Invalid product price' }, 409)
      const stock = Number(product.stock) || 0
      if ((quantitiesByProduct.get(product.id) || 0) > stock) return json({ error: `${product.name} has insufficient stock` }, 409)
      const categoryName = product.category?.name || ''
      const isBelt = categoryName.trim().toLowerCase() === 'belts'
      if (isBelt) {
        if (!Array.isArray(product.lengths) || !product.lengths.map(String).includes(input.length) || input.size) return json({ error: `Choose an available length for ${product.name}` }, 400)
      } else if (!Array.isArray(product.sizes) || !product.sizes.includes(input.size) || input.length) {
        return json({ error: `Choose an available size for ${product.name}` }, 400)
      }
      const colors = Array.isArray(product.colors) ? product.colors.map((value: any) => typeof value === 'string' ? value : value?.name).filter(Boolean) : []
      if (!colors.includes(input.color)) return json({ error: `Choose an available color for ${product.name}` }, 400)
      const unitPriceCents = Math.round(Number(product.price) * 100)
      totalCents += unitPriceCents * input.quantity
      items.push({ product_id: product.id, product_name: product.name, unit_price_cents: unitPriceCents, quantity: input.quantity, size: input.size || '', color: input.color, length: input.length || '' })
    }
    if (!Number.isSafeInteger(totalCents) || totalCents < 1) return json({ error: 'Invalid order total' }, 400)

    const { data: created, error: createError } = await supabase.rpc('create_store_order', {
      p_idempotency_key: idempotencyKey,
      p_customer_name: customerName,
      p_phone: phone,
      p_items: items,
      p_total_cents: totalCents,
    })
    if (createError) throw createError
    const order = Array.isArray(created) ? created[0] : created
    if (!order) throw new Error('Order was not returned')

    let notificationSent = false
    if (order.created) {
      const lines = items.map((item) => `• ${item.product_name} × ${item.quantity}${item.size ? ` · ${item.size}` : ''}${item.length ? ` · ${item.length} cm` : ''} · ${item.color}`).join('\n')
      const message = `Новый заказ #${order.order_number}\nСтатус: ожидает оплаты\nПокупатель: ${customerName}\nТелефон: ${phone}\n${lines}\nИтого: €${(Number(order.total_cents) / 100).toFixed(2)}`.slice(0, 4000)
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message }),
        })
        notificationSent = response.ok
        if (!response.ok) console.error('Telegram notification failed', response.status)
      } catch (error) { console.error('Telegram notification failed', error) }
    }

    return json({ orderNumber: order.order_number, totalCents: order.total_cents, status: order.status, notificationSent })
  } catch (error) {
    console.error('Order creation failed', error)
    return json({ error: 'Could not create the order. Please try again.' }, 500)
  }
})
