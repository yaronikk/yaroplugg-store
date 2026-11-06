import React, { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Camera, CheckCircle2, LoaderCircle, LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react'

type AccountProfile = {
  display_name: string
  avatar_url: string | null
  telegram_username: string | null
  created_at?: string
}
type AccountPageProps = {
  supabase: any
  user: User | null
  loading: boolean
  language: 'en' | 'ru' | 'et'
}
const TELEGRAM_LOGIN_SCRIPT = 'https://telegram.org/js/telegram-login.js?3'

function loadTelegramLoginSdk(): Promise<void> {
  if ((window as any).Telegram?.Login?.auth) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-telegram-login-sdk]')
    if (!script) {
      script = document.createElement('script')
      script.src = TELEGRAM_LOGIN_SCRIPT
      script.async = true
      script.dataset.telegramLoginSdk = 'true'
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => {
      if ((window as any).Telegram?.Login?.auth) resolve()
      else reject(new Error('Telegram login could not be initialized. Please reload the page.'))
    }, { once: true })
    script.addEventListener('error', () => reject(new Error('Could not load Telegram login. Check your connection and try again.')), { once: true })
    if ((window as any).Telegram?.Login?.auth) resolve()
  })
}

function metadataName(user: User) {
  return String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim()
}

const text = {
  en: {
    myAccount:'MY ACCOUNT', loading:'LOADING ACCOUNT', notConfigured:'Account service is not configured in this deployment.',
    create:'CREATE YOUR ACCOUNT', welcome:'WELCOME BACK', intro:'Sign in to manage your Yaroplugg profile.',
    telegram:'CONTINUE WITH TELEGRAM', linkTelegram:'CONNECT TELEGRAM ACCOUNT',
    save:'SAVE PROFILE', saving:'SAVING…', details:'PROFILE DETAILS', signOut:'SIGN OUT',
    footnote:'Marketplace accounts are separate from the store administrator login.',
    updated:'Profile updated successfully.',
    minName:'Enter your name (at least 2 characters).', nameLength:'Name must contain between 2 and 80 characters.',
    displayName:'DISPLAY NAME', uploadAvatar:'UPLOAD PHOTO', changeAvatar:'CHANGE PHOTO', removeAvatar:'REMOVE PHOTO', uploadingAvatar:'UPLOADING…', avatarTypeError:'Choose a JPG, PNG or WebP image.', avatarSizeError:'Image must be 3 MB or smaller.'
  },
  ru: {
    myAccount:'МОЙ АККАУНТ', loading:'ЗАГРУЗКА АККАУНТА', notConfigured:'Сервис аккаунтов пока не настроен в этой версии сайта.',
    create:'СОЗДАТЬ АККАУНТ', welcome:'С ВОЗВРАЩЕНИЕМ', intro:'Войдите, чтобы управлять своим профилем Yaroplugg.',
    telegram:'ВОЙТИ ЧЕРЕЗ TELEGRAM', linkTelegram:'ПРИВЯЗАТЬ TELEGRAM',
    save:'СОХРАНИТЬ ПРОФИЛЬ', saving:'СОХРАНЕНИЕ…', details:'ДАННЫЕ ПРОФИЛЯ', signOut:'ВЫЙТИ',
    footnote:'Аккаунт Marketplace отдельный от входа администратора магазина.',
    updated:'Профиль успешно обновлён.',
    minName:'Введите имя (не менее 2 символов).', nameLength:'Имя должно содержать от 2 до 80 символов.',
    displayName:'ИМЯ В ПРОФИЛЕ', uploadAvatar:'ЗАГРУЗИТЬ ФОТО', changeAvatar:'ИЗМЕНИТЬ ФОТО', removeAvatar:'УДАЛИТЬ ФОТО', uploadingAvatar:'ЗАГРУЗКА…', avatarTypeError:'Выбери изображение JPG, PNG или WebP.', avatarSizeError:'Размер изображения не должен превышать 3 МБ.'
  },
  et: {
    myAccount:'MINU KONTO', loading:'KONTO LAADIMINE', notConfigured:'Kontoteenus pole selles versioonis seadistatud.',
    create:'LOO KONTO', welcome:'TERE TULEMAST TAGASI', intro:'Logi sisse, et hallata oma Yaropluggi profiili.',
    telegram:'JÄTKA TELEGRAMIGA', linkTelegram:'ÜHENDA TELEGRAM',
    save:'SALVESTA PROFIIL', saving:'SALVESTAMINE…', details:'PROFIILI ANDMED', signOut:'LOGI VÄLJA',
    footnote:'Marketplace konto on poe administraatori sisselogimisest eraldi.',
    updated:'Profiil on edukalt uuendatud.',
    minName:'Sisesta nimi (vähemalt 2 märki).', nameLength:'Nimi peab sisaldama 2–80 märki.',
    displayName:'KUVA NIMI', uploadAvatar:'LAADI FOTO', changeAvatar:'MUUDA FOTOT', removeAvatar:'EEMALDA FOTO', uploadingAvatar:'ÜLESLAADIMINE…', avatarTypeError:'Vali JPG-, PNG- või WebP-pilt.', avatarSizeError:'Pilt peab olema kuni 3 MB.'
  }
} as const

export default function AccountPage({ supabase, user, loading, language }: AccountPageProps) {
  const t = text[language]
  const [displayName, setDisplayName] = useState(user ? metadataName(user) : '')
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState('')
  const [websiteNonce, setWebsiteNonce] = useState('')
  const [telegramReady, setTelegramReady] = useState(false)
  const [removeAvatarPending, setRemoveAvatarPending] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  async function issueWebsiteChallenge() {
    if (!supabase) return
    setTelegramReady(false)
    const { data, error: challengeError } = await supabase.functions.invoke('telegram-website-auth', {
      body: { action: 'challenge' },
    })
    if (challengeError) throw challengeError
    if (typeof data?.nonce !== 'string' || data.nonce.length < 20) throw new Error('Could not prepare secure Telegram login.')
    setWebsiteNonce(data.nonce)
    setTelegramReady(true)
  }

  useEffect(() => {
    let active = true
    if (loading || user || !supabase) return () => { active = false }
    // In a Telegram Mini App, initData is already available; don't wait for the website OIDC SDK.
    if ((window as any).Telegram?.WebApp?.initData) {
      setTelegramReady(true)
      return () => { active = false }
    }
    Promise.all([loadTelegramLoginSdk(), issueWebsiteChallenge()])
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Telegram login could not be prepared.')
      })
    return () => { active = false }
  }, [loading, user?.id, supabase])

  const telegramUsername = String(
    profile?.telegram_username || user?.user_metadata?.preferred_username || user?.user_metadata?.username || ''
  ).replace(/^@/, '')

  useEffect(() => {
    let active = true
    setProfile(null)
    if (!user) {
      setDisplayName('')
      return () => { active = false }
    }
    setDisplayName(metadataName(user))
    if (supabase) {
      supabase.from('profiles')
        .select('display_name,avatar_url,telegram_username,created_at')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data, error: profileError }: any) => {
          if (!active) return
          if (data) {
            setProfile(data as AccountProfile)
            setDisplayName(String(data.display_name || metadataName(user)))
          } else if (profileError) {
            setError(profileError.message)
          }
        })
    }
    return () => { active = false }
  }, [supabase, user?.id])

  async function signInWithTelegram() {
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    let signedIn = false
    try {
      const telegram = (window as any).Telegram?.WebApp
      const initData = typeof telegram?.initData === 'string' ? telegram.initData : ''
      if (initData) {
        // Mini Apps use server-verified initData; never trust initDataUnsafe for authentication.
        const { data, error: exchangeError } = await supabase.functions.invoke('telegram-miniapp-auth', {
          body: { initData },
        })
        if (exchangeError) throw exchangeError
        if (!data?.token_hash) throw new Error('Telegram sign-in could not be completed. Please reopen the Mini App and try again.')
        const { error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink',
        })
        if (sessionError) throw sessionError
        return
      }

      // Website login uses Telegram's official OIDC SDK so the signed ID token's
      // numeric "id" claim can be verified server-side (Supabase's stored identity
      // currently exposes only "sub" for this provider).
      const loginApi = (window as any).Telegram?.Login
      if (!loginApi?.auth || !websiteNonce) throw new Error('Telegram login is still preparing. Please try again in a moment.')
      const nonce = websiteNonce
      setWebsiteNonce('')
      const idToken = await new Promise<string>((resolve, reject) => {
        loginApi.auth({
          client_id: 8854350692,
          scope: ['profile'],
          nonce,
          lang: language,
        }, (result: any) => {
          if (result?.error) reject(new Error(String(result.error)))
          else if (typeof result?.id_token === 'string' && result.id_token) resolve(result.id_token)
          else reject(new Error('Telegram did not return a valid login token. Please try again.'))
        })
      })
      const { data, error: exchangeError } = await supabase.functions.invoke('telegram-website-auth', {
        body: { action: 'complete', nonce, idToken },
      })
      if (exchangeError) throw exchangeError
      if (!data?.token_hash) throw new Error('Telegram sign-in could not be completed. Please try again.')
      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      })
      if (sessionError) throw sessionError
      signedIn = true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Telegram sign-in failed. Please try again.')
    } finally {
      setBusy(false)
      if (!signedIn && !(window as any).Telegram?.WebApp?.initData) {
        void issueWebsiteChallenge().catch(cause => setError(cause instanceof Error ? cause.message : 'Telegram login could not be prepared.'))
      }
    }
  }

  async function linkTelegram() {
    if (!supabase || !user || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider: 'custom:telegram',
        options: { redirectTo: window.location.origin },
      })
      if (linkError) throw linkError
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect Telegram. Please try again.')
      setBusy(false)
    }
  }

  const savedDisplayName = String(profile?.display_name ?? (user ? metadataName(user) : '')).trim()
  const hasProfileChanges = displayName.trim() !== savedDisplayName || pendingAvatarFile !== null || removeAvatarPending

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase || !user || busy || avatarBusy || !hasProfileChanges) return
    const cleanName = displayName.trim()
    if (cleanName.length < 2 || cleanName.length > 80) { setError(t.nameLength); return }
    setBusy(true); setError(''); setMessage('')
    let uploadedPath: string | null = null
    try {
      let nextAvatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
      if (pendingAvatarFile) {
        const extension = pendingAvatarFile.type === 'image/png' ? 'png' : pendingAvatarFile.type === 'image/webp' ? 'webp' : 'jpg'
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('marketplace-avatars').upload(uploadedPath, pendingAvatarFile, { cacheControl: '3600', upsert: false, contentType: pendingAvatarFile.type })
        if (uploadError) throw uploadError
        nextAvatarUrl = supabase.storage.from('marketplace-avatars').getPublicUrl(uploadedPath).data.publicUrl
      } else if (removeAvatarPending) nextAvatarUrl = null
      const { data, error: profileError } = await supabase.from('profiles').upsert({ id: user.id, display_name: cleanName, avatar_url: nextAvatarUrl, telegram_username: telegramUsername || null, updated_at: new Date().toISOString() }, { onConflict: 'id' }).select('display_name,avatar_url,telegram_username,created_at').single()
      if (profileError) throw profileError
      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: cleanName } })
      if (metadataError) console.warn('Profile saved, but auth metadata could not be refreshed:', metadataError)
      const oldPath = ownAvatarStoragePath(profile?.avatar_url)
      setProfile(data as AccountProfile); setPendingAvatarFile(null); setPendingAvatarPreview(''); setRemoveAvatarPending(false); setAvatarLoadFailed(false); setMessage(t.updated)
      if (oldPath && oldPath !== uploadedPath && (pendingAvatarFile || removeAvatarPending)) await supabase.storage.from('marketplace-avatars').remove([oldPath])
    } catch (cause) {
      if (uploadedPath) await supabase.storage.from('marketplace-avatars').remove([uploadedPath])
      setError(cause instanceof Error ? cause.message : 'Could not update your profile.')
    } finally { setBusy(false) }
  }

  function ownAvatarStoragePath(url: string | null | undefined) {
    if (!url || !supabase || !user) return null
    try {
      const parsed = new URL(url)
      const marker = '/storage/v1/object/public/marketplace-avatars/'
      const index = parsed.pathname.indexOf(marker)
      if (index < 0) return null
      const path = decodeURIComponent(parsed.pathname.slice(index + marker.length))
      return path.startsWith(`${user.id}/`) ? path : null
    } catch {
      return null
    }
  }

  function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file || !supabase || !user) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(t.avatarTypeError); return }
    if (file.size > 3 * 1024 * 1024) { setError(t.avatarSizeError); return }
    setError(''); setMessage(''); setPendingAvatarFile(file); setPendingAvatarPreview(URL.createObjectURL(file)); setRemoveAvatarPending(false)
  }

  function removeAvatar() { setPendingAvatarFile(null); setPendingAvatarPreview(''); setRemoveAvatarPending(true); setError(''); setMessage('') }

  async function signOut() {
    if (!supabase || busy) return
    setBusy(true)
    const { error: authError } = await supabase.auth.signOut({ scope: 'local' })
    if (authError) setError(authError.message)
    setBusy(false)
  }

  const avatarUrl = pendingAvatarPreview || (removeAvatarPending ? '' : profile ? (profile.avatar_url || '') : user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? '')
  const avatarInitial = (profile?.display_name || displayName || metadataName(user || ({} as User)) || 'Y').trim().charAt(0).toUpperCase()
  const isTelegramMiniAppAccount = user?.user_metadata?.auth_method === 'telegram_miniapp'
  const hasVerifiedTelegramId = Boolean(user?.app_metadata?.telegram_id)
  const identityProviders = Array.from(new Set((user?.identities || []).map(identity => identity.provider)))
  const displayedIdentityProviders = isTelegramMiniAppAccount || hasVerifiedTelegramId
    ? ['custom:telegram', ...identityProviders.filter(provider => provider !== 'email' && provider !== 'custom:telegram')]
    : identityProviders

  useEffect(() => { setAvatarLoadFailed(false) }, [avatarUrl])
  useEffect(() => () => { if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview) }, [pendingAvatarPreview])

  return (
    <section className="account-page page-pad page-top">
      <div className="account-heading">
        <div><p className="eyebrow red">YAROPLUGG</p><h1>{t.myAccount}</h1></div>
        <UserRound size={22} />
      </div>
      {loading ? (
        <div className="account-state"><LoaderCircle className="spin" size={22} /> {t.loading}</div>
      ) : !supabase ? (
        <div className="account-card"><p>{t.notConfigured}</p></div>
      ) : user ? (
        <>
          <div className="account-card account-profile-card">
            <div className="account-profile-top">
              <div className="account-avatar-wrap">
                {avatarUrl && !avatarLoadFailed ? <img className="account-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setAvatarLoadFailed(true)} /> : <div className="account-avatar account-avatar-placeholder" aria-label={avatarInitial}><span className="account-avatar-initial">{avatarInitial}</span></div>}
                <button className="account-avatar-edit" type="button" onClick={() => avatarInputRef.current?.click()} disabled={busy || avatarBusy} aria-label={t.uploadAvatar}><Camera size={14} /></button>
                <input ref={avatarInputRef} className="account-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
              </div>
              <div className="account-profile-copy">
                <strong>{profile?.display_name || metadataName(user) || 'Yaroplugg user'}</strong>
                <span>{user.user_metadata?.auth_method === 'telegram_miniapp' || user.app_metadata?.telegram_id ? 'Telegram account' : user.email || 'Telegram account'}</span>
                {telegramUsername && <a href={`https://t.me/${encodeURIComponent(telegramUsername)}`} target="_blank" rel="noreferrer">@{telegramUsername}</a>}
              </div>
            </div>
            {(pendingAvatarFile || removeAvatarPending || (profile?.avatar_url && ownAvatarStoragePath(profile.avatar_url))) && (
              <div className="account-avatar-actions">
                <button type="button" onClick={removeAvatar} disabled={busy || avatarBusy}><Trash2 size={13} /> {t.removeAvatar}</button>
              </div>
            )}
            <div className="account-identities">
              {displayedIdentityProviders.map(provider => <span key={provider}><ShieldCheck size={13} /> {provider === 'custom:telegram' ? 'TELEGRAM' : provider.toUpperCase()}</span>)}
            </div>
          </div>

          {!isTelegramMiniAppAccount && !hasVerifiedTelegramId && !identityProviders.includes('custom:telegram') && !identityProviders.includes('telegram') && (
            <button className="account-telegram" type="button" onClick={linkTelegram} disabled={busy}>
              <span className="account-telegram-mark">➤</span> {t.linkTelegram}
            </button>
          )}
          <form className="account-card account-form" onSubmit={saveProfile}>
            <h2>{t.details}</h2>
            <label>{t.displayName}<input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} autoComplete="name" required /></label>
            {hasProfileChanges && <button className="account-primary" type="submit" disabled={busy || avatarBusy}><CheckCircle2 size={16} /> {busy ? t.saving : t.save}</button>}
          </form>
          {message && <div className="account-message"><CheckCircle2 size={16} /> {message}</div>}
          {error && <div className="account-error">{error}</div>}
          <button className="account-secondary" type="button" onClick={signOut} disabled={busy}><LogOut size={16} /> {t.signOut}</button>
        </>
      ) : (
        <div className="account-card account-auth-card">
          <div className="account-auth-intro"><h2>{t.welcome}</h2><p>{t.intro}</p></div>
          <button className="account-telegram" type="button" onClick={signInWithTelegram} disabled={busy || !telegramReady}>
            <span className="account-telegram-mark">➤</span> {busy || !telegramReady ? <LoaderCircle size={16} className="spin" /> : t.telegram}
          </button>
          {message && <div className="account-message"><CheckCircle2 size={16} /> {message}</div>}
          {error && <div className="account-error">{error}</div>}
        </div>
      )}
      <p className="account-footnote">{t.footnote}</p>
    </section>
  )
}

