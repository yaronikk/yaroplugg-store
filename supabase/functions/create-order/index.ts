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

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData)
  const receivedHash = params.get('hash')
  const authDate = Number(params.get('auth_date'))
  if (!receivedHash || !Number.isFinite(authDate) || Date.now() / 1000 - authDate > 86400 || authDate > Date.now() / 1000 + 60) return false
  const checkString = [...params.entries()].filter(([key]) => key !== 'hash').sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const secret = await crypto.subtle.sign('HMAC', key, encoder.encode(botToken))
  const signingKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, encoder.encode(checkString)))
  const expectedHash = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return expectedHash.length === receivedHash.length && [...expectedHash].reduce((match, char, index) => match | (char.charCodeAt(0) ^ receivedHash.charCodeAt(index)), 0) === 0
}

function getTelegramIdentity(initData: string) {
  const rawUser = new URLSearchParams(initData).get('user')
  if (!rawUser) return null
  try {
    const user = JSON.parse(rawUser)
    if (!Number.isSafeInteger(user?.id) || user.id <= 0) return null
    const username = typeof user.username === 'string' && /^[A-Za-z0-9_]{5,32}$/.test(user.username) ? user.username : null
    return { id: String(user.id), username }
  } catch {
    return null
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // The Mini App must be validated with the token of the bot that launched it.
  // Notifications may be sent by another bot if the owner chooses.
  const notificationBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const webAppBotToken = Deno.env.get('TELEGRAM_WEBAPP_BOT_TOKEN') || notificationBotToken
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  if (!url || !serviceKey || !webAppBotToken || !notificationBotToken || !chatId) return json({ error: 'Order service is not configured' }, 503)

  try {
    const payload = await request.json()
    const customerName = typeof payload.customerName === 'string' ? payload.customerName.trim() : ''
    const phone = typeof payload.phone === 'string' ? payload.phone.trim() : ''
    const comment = typeof payload.comment === 'string' ? payload.comment.trim().slice(0, 1000) : ''
    const termsAccepted = payload.termsAccepted === true
    const language = ['ru', 'et', 'en'].includes(payload.language) ? payload.language : 'en'
    const telegramId = typeof payload.telegramId === 'string' ? payload.telegramId.trim() : ''
    const idempotencyKey = payload.idempotencyKey
    const inputItems = payload.items
    const initData = typeof payload.telegramInitData === 'string' ? payload.telegramInitData : ''
    if (!await verifyTelegramInitData(initData, webAppBotToken)) return json({ error: 'Telegram Mini App verification failed. Check that TELEGRAM_WEBAPP_BOT_TOKEN belongs to the bot that opened this Mini App.' }, 401)
    const telegramUser = getTelegramIdentity(initData)
    if (!telegramUser || !/^\d{5,20}$/.test(telegramId) || telegramId !== telegramUser.id) {
      return json({ error: 'Enter the Telegram ID shown for your own Telegram account.' }, 400)
    }
    if (customerName.length < 1 || customerName.length > 120 || phone.length > 40 || !termsAccepted ||
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
      const colors = Array.isArray(product.colors) ? product.colors.map((value: any) => {
        if (typeof value !== 'string') return typeof value?.name === 'string' ? value.name : ''
        try {
          const parsed = JSON.parse(value)
          return typeof parsed?.name === 'string' ? parsed.name : value
        } catch {
          return value
        }
      }).filter(Boolean) : []
      if (!colors.includes(input.color)) return json({ error: `Choose an available color for ${product.name}` }, 400)
      const unitPriceCents = Math.round(Number(product.price) * 100)
      totalCents += unitPriceCents * input.quantity
      items.push({ product_id: product.id, product_name: product.name, unit_price_cents: unitPriceCents, quantity: input.quantity, size: input.size || '', color: input.color, length: input.length || '' })
    }
    if (!Number.isSafeInteger(totalCents) || totalCents < 1) return json({ error: 'Invalid order total' }, 400)

    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
    const ipHash = forwardedFor ? await sha256(forwardedFor) : ''
    const contactHash = await sha256(`telegram:${telegramId}`)
    const { data: created, error: createError } = await supabase.rpc('create_store_order', {
      p_idempotency_key: idempotencyKey,
      p_customer_name: customerName,
      p_phone: phone,
      p_items: items,
      p_total_cents: totalCents,
      p_telegram_user_id: telegramId,
      p_telegram_username: telegramUser.username,
      p_contact_type: 'telegram',
      p_contact_value: telegramId,
      p_comment: comment,
      p_source: 'miniapp',
      p_language: language,
      p_ip_hash: ipHash,
      p_contact_hash: contactHash,
      p_terms_accepted: termsAccepted,
    })
    if (createError?.code === 'P0001' && createError.message === 'ORDER_RATE_LIMITED') {
      return json({ error: 'Too many orders from this Telegram account. Please try again later.', code: 'RATE_LIMITED' }, 429)
    }
    if (createError?.code === 'P0001' && createError.message === 'ORDER_IDEMPOTENCY_CONFLICT') {
      return json({ error: 'This order request has already been used. Please refresh the store and try again.', code: 'INVALID_ORDER' }, 409)
    }
    if (createError?.code === 'P0001' && createError.message === 'INVALID_ORDER') {
      return json({ error: 'Check the order details and accept the purchase terms.', code: 'INVALID_ORDER' }, 400)
    }
    if (createError?.code === 'P0001' && createError.message === 'INSUFFICIENT_STOCK') {
      return json({ error: 'One or more items are no longer available in the requested quantity.', code: 'OUT_OF_STOCK' }, 409)
    }
    if (createError?.code === 'P0001' && createError.message === 'PRODUCT_UNAVAILABLE') {
      return json({ error: 'A product is no longer available.', code: 'PRODUCT_UNAVAILABLE' }, 409)
    }
    if (createError?.code === 'P0001' && createError.message === 'PRICE_CHANGED') {
      return json({ error: 'The price has changed. Refresh the store and try again.', code: 'PRICE_CHANGED' }, 409)
    }
    if (createError) throw createError
    const order = Array.isArray(created) ? created[0] : created
    if (!order) throw new Error('Order was not returned')

    let notificationSent = false
    if (order.created) {
      const lines = items.map((item) => `• ${item.product_name} × ${item.quantity}${item.size ? ` · ${item.size}` : ''}${item.length ? ` · ${item.length} cm` : ''} · ${item.color}`).join('\n')
      const telegramContact = `${telegramUser.username ? `@${telegramUser.username}` : 'username не указан'} · ID ${telegramUser.id}`
      const message = `Новый заказ #${order.order_number}\nСтатус: ожидает оплаты\nПокупатель: ${customerName}${phone ? `\nТелефон: ${phone}` : ''}\nTelegram: ${telegramContact}\n${lines}\nИтого: €${(Number(order.total_cents) / 100).toFixed(2)}`.slice(0, 4000)
      try {
        const response = await fetch(`https://api.telegram.org/bot${notificationBotToken}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message }),
        })
        notificationSent = response.ok
        if (!response.ok) console.error('Telegram notification failed', response.status)
      } catch { console.error('Telegram notification request failed') }
    }

    return json({ orderNumber: order.order_number, totalCents: order.total_cents, status: order.status, notificationSent })
  } catch (error) {
    console.error('Order creation failed')
    return json({ error: 'Could not create the order. Please try again.' }, 500)
  }
})
