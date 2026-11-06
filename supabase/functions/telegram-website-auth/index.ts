import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6'

const CLIENT_ID = '8854350692'
const ISSUER = 'https://oauth.telegram.org'
const JWKS = createRemoteJWKSet(new URL('https://oauth.telegram.org/.well-known/jwks.json'))
const allowedOrigins = new Set(
  ['https://yaropluggstore.vercel.app', Deno.env.get('SHOP_SITE_URL') || '']
    .filter(Boolean)
    .map(value => { try { return new URL(value).origin } catch { return '' } })
    .filter(Boolean)
)
const response = (body: unknown, status = 200, origin = '') => new Response(JSON.stringify(body), {
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
function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async request => {
  const origin = request.headers.get('origin') || ''
  if (request.method === 'OPTIONS') {
    if (!allowedOrigins.has(origin)) return response({ code: 'ORIGIN_NOT_ALLOWED' }, 403)
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    } })
  }
  if (origin && !allowedOrigins.has(origin)) return response({ code: 'ORIGIN_NOT_ALLOWED' }, 403)
  if (request.method !== 'POST') return response({ code: 'METHOD_NOT_ALLOWED' }, 405, origin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return response({ code: 'AUTH_UNAVAILABLE' }, 503, origin)
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const payload = await request.json()
    if (payload?.action === 'challenge') {
      const nonce = crypto.randomUUID() + crypto.randomUUID()
      const { error } = await admin.from('telegram_login_challenges').insert({ nonce })
      if (error) throw error
      await admin.from('telegram_login_challenges').delete().lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      return response({ nonce }, 200, origin)
    }

    if (payload?.action !== 'complete') return response({ code: 'INVALID_REQUEST' }, 400, origin)
    const idToken = typeof payload.idToken === 'string' ? payload.idToken : ''
    const nonce = typeof payload.nonce === 'string' ? payload.nonce : ''
    if (!idToken || idToken.length > 12000 || !nonce || nonce.length > 200) {
      return response({ code: 'TELEGRAM_VERIFICATION_FAILED' }, 401, origin)
    }

    const { payload: claims } = await jwtVerify(idToken, JWKS, {
      issuer: ISSUER,
      audience: CLIENT_ID,
      algorithms: ['RS256'],
    })
    const telegramId = typeof claims.id === 'number' ? claims.id :
      (typeof claims.id === 'string' && /^\d{1,20}$/.test(claims.id) ? Number(claims.id) : NaN)
    const subject = claims.sub
    const now = Math.floor(Date.now() / 1000)
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
      console.warn('Telegram login rejected: invalid_profile_id')
      return response({ code: 'TELEGRAM_PROFILE_ID_MISSING' }, 401, origin)
    }
    if (typeof subject !== 'string' || !subject) {
      console.warn('Telegram login rejected: missing_subject')
      return response({ code: 'TELEGRAM_SUBJECT_MISSING' }, 401, origin)
    }
    if (claims.nonce !== nonce) {
      console.warn('Telegram login rejected: nonce_mismatch')
      return response({ code: 'TELEGRAM_NONCE_MISMATCH' }, 401, origin)
    }
    if (typeof claims.iat !== 'number' || claims.iat > now + 60 ||
        typeof claims.exp !== 'number' || claims.exp <= now) {
      console.warn('Telegram login rejected: token_time_invalid')
      return response({ code: 'TELEGRAM_TOKEN_EXPIRED' }, 401, origin)
    }

    const { data: challenge, error: challengeError } = await admin
      .from('telegram_login_challenges')
      .update({ used_at: new Date().toISOString() })
      .eq('nonce', nonce)
      .is('used_at', null)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .select('nonce')
      .maybeSingle()
    if (challengeError) throw challengeError
    if (!challenge) return response({ code: 'TELEGRAM_CHALLENGE_EXPIRED' }, 401, origin)

    const id = String(telegramId)
    const syntheticEmail = `telegram-${id}@users.yaroplugg.internal`
    let matchedUser: any = null
    for (let page = 1; page <= 100 && !matchedUser; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      const users = data?.users || []
      matchedUser = users.find((user: any) =>
        user.email === syntheticEmail ||
        String(user.app_metadata?.telegram_id || '') === id ||
        (user.identities || []).some((identity: any) =>
          identity.provider === 'custom:telegram' && String(identity.identity_data?.sub || identity.provider_id || '') === subject
        )
      ) || null
      if (users.length < 1000) break
    }

    const username = typeof claims.preferred_username === 'string' && /^[A-Za-z0-9_]{5,32}$/.test(claims.preferred_username)
      ? claims.preferred_username : null
    const displayName = typeof claims.name === 'string' ? claims.name.trim().slice(0, 160) : 'Telegram user'
    const picture = typeof claims.picture === 'string' && claims.picture.startsWith('https://') ? claims.picture : null

    if (!matchedUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          preferred_username: username,
          picture,
          telegram_id: id,
          auth_method: 'telegram_oidc_verified',
        },
        app_metadata: { telegram_id: id, telegram_auth_provider: 'telegram_oidc' },
      })
      if (error) {
        if (!/already|exists|registered/i.test(error.message)) throw error
        const { data: retry, error: retryError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (retryError) throw retryError
        matchedUser = (retry.users || []).find((user: any) => user.email === syntheticEmail) || null
        if (!matchedUser) throw error
      } else matchedUser = data.user
    }

    if (matchedUser) {
      const currentUserMetadata = matchedUser.user_metadata || {}
      const currentAppMetadata = matchedUser.app_metadata || {}
      const { data, error } = await admin.auth.admin.updateUserById(matchedUser.id, {
        user_metadata: {
          ...currentUserMetadata,
          full_name: displayName || currentUserMetadata.full_name,
          preferred_username: username || currentUserMetadata.preferred_username,
          picture: picture || currentUserMetadata.picture,
          telegram_id: id,
          auth_method: currentUserMetadata.auth_method === 'telegram_miniapp' ? 'telegram_miniapp' : 'telegram_oidc_verified',
        },
        app_metadata: { ...currentAppMetadata, telegram_id: id, telegram_auth_provider: 'telegram_oidc' },
      })
      if (error) throw error
      matchedUser = data.user
    }

    if (!matchedUser?.email) {
      const { data, error } = await admin.auth.admin.updateUserById(matchedUser.id, {
        email: syntheticEmail, email_confirm: true,
      })
      if (error) throw error
      matchedUser = data.user
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
    console.error('Telegram website authentication failed:', error)
    return response({ code: 'AUTH_FAILED' }, 500, origin)
  }
})
