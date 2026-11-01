import React, { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import SellerPanel from './SellerPanel'
import { Camera, CheckCircle2, LoaderCircle, LogIn, LogOut, Mail, ShieldCheck, Trash2, UserRound } from 'lucide-react'

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
function metadataName(user: User) {
  return String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim()
}

const text = {
  en: {
    myAccount:'MY ACCOUNT', loading:'LOADING ACCOUNT', notConfigured:'Account service is not configured in this deployment.',
    create:'CREATE YOUR ACCOUNT', welcome:'WELCOME BACK', intro:'Sign in to manage your Yaroplugg profile.',
    telegram:'CONTINUE WITH TELEGRAM', linkTelegram:'CONNECT TELEGRAM ACCOUNT', orEmail:'OR USE EMAIL', name:'NAME', email:'EMAIL', password:'PASSWORD',
    save:'SAVE PROFILE', saving:'SAVING…', details:'PROFILE DETAILS', signIn:'SIGN IN', createAccount:'CREATE ACCOUNT',
    newHere:'NEW HERE? CREATE AN ACCOUNT', haveAccount:'ALREADY HAVE AN ACCOUNT? SIGN IN', signOut:'SIGN OUT',
    footnote:'Marketplace accounts are separate from the store administrator login.',
    registration:'Registration created. Check your email and confirm your address to finish signing in.',
    created:'Your account has been created.', updated:'Profile updated successfully.',
    minName:'Enter your name (at least 2 characters).', nameLength:'Name must contain between 2 and 80 characters.',
    displayName:'DISPLAY NAME', uploadAvatar:'UPLOAD PHOTO', changeAvatar:'CHANGE PHOTO', removeAvatar:'REMOVE PHOTO', uploadingAvatar:'UPLOADING…', avatarTypeError:'Choose a JPG, PNG or WebP image.', avatarSizeError:'Image must be 3 MB or smaller.'
  },
  ru: {
    myAccount:'МОЙ АККАУНТ', loading:'ЗАГРУЗКА АККАУНТА', notConfigured:'Сервис аккаунтов пока не настроен в этой версии сайта.',
    create:'СОЗДАТЬ АККАУНТ', welcome:'С ВОЗВРАЩЕНИЕМ', intro:'Войдите, чтобы управлять своим профилем Yaroplugg.',
    telegram:'ВОЙТИ ЧЕРЕЗ TELEGRAM', linkTelegram:'ПОДКЛЮЧИТЬ TELEGRAM', orEmail:'ИЛИ ЧЕРЕЗ EMAIL', name:'ИМЯ', email:'EMAIL', password:'ПАРОЛЬ',
    save:'СОХРАНИТЬ ПРОФИЛЬ', saving:'СОХРАНЕНИЕ…', details:'ДАННЫЕ ПРОФИЛЯ', signIn:'ВОЙТИ', createAccount:'СОЗДАТЬ АККАУНТ',
    newHere:'ВПЕРВЫЕ ЗДЕСЬ? СОЗДАТЬ АККАУНТ', haveAccount:'УЖЕ ЕСТЬ АККАУНТ? ВОЙТИ', signOut:'ВЫЙТИ',
    footnote:'Аккаунт Marketplace отдельный от входа администратора магазина.',
    registration:'Регистрация создана. Проверьте почту и подтвердите адрес, чтобы завершить вход.',
    created:'Аккаунт создан.', updated:'Профиль успешно обновлён.',
    minName:'Введите имя (не менее 2 символов).', nameLength:'Имя должно содержать от 2 до 80 символов.',
    displayName:'ИМЯ В ПРОФИЛЕ', uploadAvatar:'ЗАГРУЗИТЬ ФОТО', changeAvatar:'ИЗМЕНИТЬ ФОТО', removeAvatar:'УДАЛИТЬ ФОТО', uploadingAvatar:'ЗАГРУЗКА…', avatarTypeError:'Выбери изображение JPG, PNG или WebP.', avatarSizeError:'Размер изображения не должен превышать 3 МБ.'
  },
  et: {
    myAccount:'MINU KONTO', loading:'KONTO LAADIMINE', notConfigured:'Kontoteenus pole selles versioonis seadistatud.',
    create:'LOO KONTO', welcome:'TERE TULEMAST TAGASI', intro:'Logi sisse, et hallata oma Yaropluggi profiili.',
    telegram:'JÄTKA TELEGRAMIGA', linkTelegram:'ÜHENDA TELEGRAM', orEmail:'VÕI KASUTA E-POSTI', name:'NIMI', email:'E-POST', password:'PAROOL',
    save:'SALVESTA PROFIIL', saving:'SALVESTAMINE…', details:'PROFIILI ANDMED', signIn:'LOGI SISSE', createAccount:'LOO KONTO',
    newHere:'UUS KASUTAJA? LOO KONTO', haveAccount:'KONTO ON JUBA OLEMAS? LOGI SISSE', signOut:'LOGI VÄLJA',
    footnote:'Marketplace konto on poe administraatori sisselogimisest eraldi.',
    registration:'Registreerimine on loodud. Kontrolli e-posti ja kinnita aadress.',
    created:'Konto on loodud.', updated:'Profiil on edukalt uuendatud.',
    minName:'Sisesta nimi (vähemalt 2 märki).', nameLength:'Nimi peab sisaldama 2–80 märki.',
    displayName:'KUVA NIMI', uploadAvatar:'LAADI FOTO', changeAvatar:'MUUDA FOTOT', removeAvatar:'EEMALDA FOTO', uploadingAvatar:'ÜLESLAADIMINE…', avatarTypeError:'Vali JPG-, PNG- või WebP-pilt.', avatarSizeError:'Pilt peab olema kuni 3 MB.'
  }
} as const

export default function AccountPage({ supabase, user, loading, language }: AccountPageProps) {
  const t = text[language]
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState(user ? metadataName(user) : '')
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

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

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'signup') {
        if (displayName.trim().length < 2) throw new Error(t.minName)
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: displayName.trim() }, emailRedirectTo: window.location.origin },
        })
        if (authError) throw authError
        setMessage(data.session ? t.created : t.registration)
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function signInWithTelegram() {
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'custom:telegram',
      options: { redirectTo: window.location.origin },
    })
    if (authError) {
      setError(authError.message)
      setBusy(false)
    }
  }


  async function linkTelegram() {
    if (!supabase || !user || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: 'custom:telegram',
      options: { redirectTo: window.location.origin },
    })
    if (linkError) {
      setError(linkError.message)
      setBusy(false)
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase || !user || busy) return
    const cleanName = displayName.trim()
    if (cleanName.length < 2 || cleanName.length > 80) {
      setError(t.nameLength)
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: cleanName } })
      if (metadataError) throw metadataError
      const { data, error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: cleanName,
        avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
        telegram_username: telegramUsername || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' }).select('display_name,avatar_url,telegram_username,created_at').single()
      if (profileError) throw profileError
      setProfile(data as AccountProfile)
      setMessage(t.updated)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your profile.')
    } finally {
      setBusy(false)
    }
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

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !supabase || !user || avatarBusy) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t.avatarTypeError)
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError(t.avatarSizeError)
      return
    }
    setAvatarBusy(true)
    setError('')
    setMessage('')
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`
    try {
      const { error: uploadError } = await supabase.storage.from('marketplace-avatars').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type,
      })
      if (uploadError) throw uploadError
      const { data: publicData } = supabase.storage.from('marketplace-avatars').getPublicUrl(path)
      const { data, error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: profile?.display_name || metadataName(user) || 'Yaroplugg user',
        avatar_url: publicData.publicUrl,
        telegram_username: telegramUsername || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' }).select('display_name,avatar_url,telegram_username,created_at').single()
      if (profileError) {
        await supabase.storage.from('marketplace-avatars').remove([path])
        throw profileError
      }
      const oldPath = ownAvatarStoragePath(profile?.avatar_url)
      setProfile(data as AccountProfile)
      setAvatarLoadFailed(false)
      setMessage(t.updated)
      if (oldPath && oldPath !== path) await supabase.storage.from('marketplace-avatars').remove([oldPath])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not upload the avatar.')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function removeAvatar() {
    if (!supabase || !user || avatarBusy) return
    setAvatarBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: profile?.display_name || metadataName(user) || 'Yaroplugg user',
        avatar_url: '',
        telegram_username: telegramUsername || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' }).select('display_name,avatar_url,telegram_username,created_at').single()
      if (profileError) throw profileError
      const oldPath = ownAvatarStoragePath(profile?.avatar_url)
      setProfile(data as AccountProfile)
      setAvatarLoadFailed(false)
      setMessage(t.updated)
      if (oldPath) await supabase.storage.from('marketplace-avatars').remove([oldPath])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the avatar.')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function signOut() {
    if (!supabase || busy) return
    setBusy(true)
    const { error: authError } = await supabase.auth.signOut()
    if (authError) setError(authError.message)
    setBusy(false)
  }

  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? ''
  const avatarInitial = (profile?.display_name || displayName || metadataName(user || ({} as User)) || 'Y').trim().charAt(0).toUpperCase()
  const identityProviders = Array.from(new Set((user?.identities || []).map(identity => identity.provider)))

  useEffect(() => { setAvatarLoadFailed(false) }, [avatarUrl])

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
                <button className="account-avatar-edit" type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarBusy} aria-label={t.uploadAvatar}><Camera size={14} /></button>
                <input ref={avatarInputRef} className="account-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
              </div>
              <div className="account-profile-copy">
                <strong>{profile?.display_name || metadataName(user) || 'Yaroplugg user'}</strong>
                <span>{user.email || 'Telegram account'}</span>
                {telegramUsername && <a href={`https://t.me/${encodeURIComponent(telegramUsername)}`} target="_blank" rel="noreferrer">@{telegramUsername}</a>}
              </div>
            </div>
            {profile?.avatar_url && ownAvatarStoragePath(profile.avatar_url) && (
              <div className="account-avatar-actions">
                <button type="button" onClick={removeAvatar} disabled={avatarBusy}><Trash2 size={13} /> {t.removeAvatar}</button>
              </div>
            )}
            <div className="account-identities">
              {identityProviders.map(provider => <span key={provider}><ShieldCheck size={13} /> {provider === 'custom:telegram' ? 'TELEGRAM' : provider.toUpperCase()}</span>)}
            </div>
          </div>

          {!identityProviders.includes('custom:telegram') && !identityProviders.includes('telegram') && (
            <button className="account-telegram" type="button" onClick={linkTelegram} disabled={busy}>
              <span className="account-telegram-mark">➤</span> {t.linkTelegram}
            </button>
          )}
          <SellerPanel supabase={supabase} user={user} language={language} />
          <form className="account-card account-form" onSubmit={saveProfile}>
            <h2>{t.details}</h2>
            <label>{t.displayName}<input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} autoComplete="name" required /></label>
            <button className="account-primary" type="submit" disabled={busy}><CheckCircle2 size={16} /> {busy ? t.saving : t.save}</button>
          </form>
          {message && <div className="account-message"><CheckCircle2 size={16} /> {message}</div>}
          {error && <div className="account-error">{error}</div>}
          <button className="account-secondary" type="button" onClick={signOut} disabled={busy}><LogOut size={16} /> {t.signOut}</button>
        </>
      ) : (
        <div className="account-card account-auth-card">
          <div className="account-auth-intro"><h2>{mode === 'signup' ? t.create : t.welcome}</h2><p>{t.intro}</p></div>
          <button className="account-telegram" type="button" onClick={signInWithTelegram} disabled={busy}>
            <span className="account-telegram-mark">➤</span> {busy ? <LoaderCircle size={16} className="spin" /> : t.telegram}
          </button>
          <div className="account-or"><span>{t.orEmail}</span></div>
          <form className="account-form" onSubmit={submitEmail}>
            {mode === 'signup' && <label>{t.name}<input value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" maxLength={80} required /></label>}
            <label>{t.email}<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>{t.password}<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
            <button className="account-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <LogIn size={16} />}{mode === 'signup' ? t.createAccount : t.signIn}</button>
          </form>
          {message && <div className="account-message"><Mail size={16} /> {message}</div>}
          {error && <div className="account-error">{error}</div>}
          <button className="account-mode-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>
            {mode === 'login' ? t.newHere : t.haveAccount}
          </button>
        </div>
      )}
      <p className="account-footnote">{t.footnote}</p>
    </section>
  )
}
