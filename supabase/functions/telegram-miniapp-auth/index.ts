import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set(
  ['https://yaropluggstore.vercel.app', Deno.env.get('SHOP_SITE_URL') || '']
    .filter(Boolean)
    .map(value => {
      try { return new URL(value).origin } catch { return '' }
    })
    .filter(Boolean)
)

function response(body: unknown, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(origin && allowedOrigins.has(origin) ? {
        'Access-Control-Allow-Origin': origin,
        'Vary': 'Origin',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      } : {}),
    },
  })
}

async function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData)
  const receivedHash = (params.get('hash') || '').toLowerCase()
  const authDate = Number(params.get('auth_date'))
  const now = Math.floor(Date.now() / 1000)
  if (!/^[a-f0-9]{64}$/.test(receivedHash) || !Number.isFinite(authDate) || now - authDate > 900 || authDate > now + 60) return false

  const checkString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const encoder = new TextEncoder()
  const webAppKey = await crypto.subtle.importKey('raw', encoder.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const secret = await crypto.subtle.sign('HMAC', webAppKey, encoder.encode(botToken))
  const signingKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, encoder.encode(checkString)))
  const expected = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('')
  let difference = expected.length ^ receivedHash.length
  for (let i = 0; i < Math.min(expected.length, receivedHash.length); i++) difference |= expected.charCodeAt(i) ^ receivedHash.charCodeAt(i)
  return difference === 0
}

function parseTelegramUser(initData: string) {
  try {
    const user = JSON.parse(new URLSearchParams(initData).get('user') || 'null')
    if (!Number.isSafeInteger(user?.id) || user.id <= 0) return null
    const username = typeof user.username === 'string' && /^[A-Za-z0-9_]{5,32}$/.test(user.username) ? user.username : null
    const firstName = typeof user.first_name === 'string' ? user.first_name.trim().slice(0, 80) : ''
    const lastName = typeof user.last_name === 'string' ? user.last_name.trim().slice(0, 80) : ''
    return { id: String(user.id), username, displayName: [firstName, lastName].filter(Boolean).join(' ') || username || 'Telegram user' }
  } catch {
    return null
  }
}

function randomPassword() {
  // Supabase Auth enforces a 72-character maximum for passwords.
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async request => {
  const origin = request.headers.get('origin') || ''
  if (request.method === 'OPTIONS') {
    if (!allowedOrigins.has(origin)) return response({ code: 'ORIGIN_NOT_ALLOWED' }, 403)
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Vary': 'Origin',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }
  if (origin && !allowedOrigins.has(origin)) return response({ code: 'ORIGIN_NOT_ALLOWED' }, 403)
  if (request.method !== 'POST') return response({ code: 'METHOD_NOT_ALLOWED' }, 405, origin)

  const botToken = Deno.env.get('TELEGRAM_WEBAPP_BOT_TOKEN') || Deno.env.get('TELEGRAM_BOT_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!botToken || !supabaseUrl || !serviceRoleKey) return response({ code: 'AUTH_UNAVAILABLE' }, 503, origin)

  try {
    const payload = await request.json()
    const initData = typeof payload?.initData === 'string' ? payload.initData : ''
    if (!initData || initData.length > 8192 || !await verifyTelegramInitData(initData, botToken)) {
      return response({ code: 'TELEGRAM_VERIFICATION_FAILED' }, 401, origin)
    }
    const telegramUser = parseTelegramUser(initData)
    if (!telegramUser) return response({ code: 'TELEGRAM_USER_MISSING' }, 401, origin)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const syntheticEmail = `telegram-${telegramUser.id}@users.yaroplugg.internal`
    let matchedUser: any = null

    // Reuse users previously authenticated through Telegram OIDC where the verified identity is present.
    for (let page = 1; page <= 100 && !matchedUser; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      const users = data?.users || []
      matchedUser = users.find((user: any) =>
        user.email === syntheticEmail ||
        (user.identities || []).some((identity: any) => {
          const identityId = String(identity.identity_data?.sub || identity.provider_id || '')
          return ['telegram', 'custom:telegram'].includes(identity.provider) && identityId === telegramUser.id
        })
      ) || null
      if (users.length < 1000) break
    }

    if (!matchedUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: {
          full_name: telegramUser.displayName,
          preferred_username: telegramUser.username,
          telegram_id: telegramUser.id,
          auth_method: 'telegram_miniapp',
        },
      })
      if (error) {
        // A simultaneous first login may have created the same synthetic account.
        if (!/already|exists|registered/i.test(error.message)) throw error
        for (let page = 1; page <= 100 && !matchedUser; page++) {
          const { data: pageData, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
          if (listError) throw listError
          matchedUser = (pageData?.users || []).find((user: any) => user.email === syntheticEmail) || null
          if ((pageData?.users || []).length < 1000) break
        }
        if (!matchedUser) throw error
      } else {
        matchedUser = data.user
      }
    }

    if (matchedUser) {
      const currentMetadata = matchedUser.user_metadata || {}
      const { data: updatedProfile, error: profileError } = await admin.auth.admin.updateUserById(matchedUser.id, {
        user_metadata: { ...currentMetadata, telegram_id: telegramUser.id, auth_method: 'telegram_miniapp', full_name: telegramUser.displayName, preferred_username: telegramUser.username },
      })
      if (profileError) throw profileError
      matchedUser = updatedProfile.user
    }

    if (matchedUser && !matchedUser.email) {
      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(matchedUser.id, {
        email: syntheticEmail,
        email_confirm: true,
      })
      if (updateError) throw updateError
      matchedUser = updated.user
    }
    if (!matchedUser?.email) return response({ code: 'ACCOUNT_EMAIL_UNAVAILABLE' }, 500, origin)
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: matchedUser.email,
    })
    if (linkError) throw linkError
    const tokenHash = link?.properties?.hashed_token
    if (typeof tokenHash !== 'string' || !tokenHash) throw new Error('Supabase did not return a one-time login token')

    return response({ token_hash: tokenHash }, 200, origin)
  } catch (error) {
    console.error('Telegram Mini App authentication failed:', error)
    return response({ code: 'AUTH_FAILED' }, 500, origin)
  }
})
