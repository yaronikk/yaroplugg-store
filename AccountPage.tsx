import React, { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, CheckCircle2, LoaderCircle, LogIn, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'

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
}

function metadataName(user: User) {
  return String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim()
}

export default function AccountPage({ supabase, user, loading }: AccountPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState(user ? metadataName(user) : '')
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const telegramUsername = useMemo(() => {
    const raw = profile?.telegram_username
      || user?.user_metadata?.preferred_username
      || user?.user_metadata?.username
      || ''
    return String(raw).replace(/^@/, '')
  }, [profile, user])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setDisplayName('')
      return
    }
    setDisplayName(profile?.display_name || metadataName(user))
    let active = true
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
        if (displayName.trim().length < 2) throw new Error('Enter your name (at least 2 characters).')
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
        if (authError) throw authError
        if (!data.session) {
          setMessage('Registration created. Check your email and confirm your address to finish signing in.')
        } else {
          setMessage('Your account has been created.')
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
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

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase || !user || busy) return
    const cleanName = displayName.trim()
    if (cleanName.length < 2 || cleanName.length > 80) {
      setError('Name must contain between 2 and 80 characters.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: cleanName },
      })
      if (metadataError) throw metadataError
      const { data, error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: cleanName,
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        telegram_username: telegramUsername || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' }).select('display_name,avatar_url,telegram_username,created_at').single()
      if (profileError) throw profileError
      setProfile(data as AccountProfile)
      setMessage('Profile updated successfully.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your profile.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    if (!supabase || busy) return
    setBusy(true)
    const { error: authError } = await supabase.auth.signOut()
    if (authError) setError(authError.message)
    setBusy(false)
  }

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const identityProviders = Array.from(new Set((user?.identities || []).map(identity => identity.provider)))

  return (
    <section className="account-page page-pad page-top">
      <div className="account-heading">
        <div><p className="eyebrow red">YAROPLUGG</p><h1>MY ACCOUNT</h1></div>
        <UserRound size={22} />
      </div>

      {loading ? (
        <div className="account-state"><LoaderCircle className="spin" size={22} /> LOADING ACCOUNT</div>
      ) : !supabase ? (
        <div className="account-card"><p>Account service is not configured in this deployment.</p></div>
      ) : user ? (
        <>
          <div className="account-card account-profile-card">
            <div className="account-profile-top">
              {avatarUrl ? <img className="account-avatar" src={avatarUrl} alt="" /> : <div className="account-avatar account-avatar-placeholder"><UserRound size={26} /></div>}
              <div className="account-profile-copy">
                <strong>{profile?.display_name || metadataName(user) || 'Yaroplugg user'}</strong>
                <span>{user.email || 'Telegram account'}</span>
                {telegramUsername && <a href={`https://t.me/${encodeURIComponent(telegramUsername)}`} target="_blank" rel="noreferrer">@{telegramUsername}</a>}
              </div>
            </div>
            <div className="account-identities">
              {identityProviders.map(provider => <span key={provider}><ShieldCheck size={13} /> {provider === 'custom:telegram' ? 'TELEGRAM' : provider.toUpperCase()}</span>)}
            </div>
          </div>

          <form className="account-card account-form" onSubmit={saveProfile}>
            <h2>PROFILE DETAILS</h2>
            <label>DISPLAY NAME<input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} autoComplete="name" required /></label>
            <button className="account-primary" type="submit" disabled={busy}><CheckCircle2 size={16} /> {busy ? 'SAVING…' : 'SAVE PROFILE'}</button>
          </form>

          {message && <div className="account-message"><CheckCircle2 size={16} /> {message}</div>}
          {error && <div className="account-error">{error}</div>}
          <button className="account-secondary" type="button" onClick={signOut} disabled={busy}><LogOut size={16} /> SIGN OUT</button>
        </>
      ) : (
        <div className="account-card account-auth-card">
          <div className="account-auth-intro"><h2>{mode === 'signup' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</h2><p>Sign in to manage your Yaroplugg profile.</p></div>
          <button className="account-telegram" type="button" onClick={signInWithTelegram} disabled={busy}><span className="account-telegram-mark">➤</span> CONTINUE WITH TELEGRAM</button>
          <div className="account-or"><span>OR USE EMAIL</span></div>
          <form className="account-form" onSubmit={submitEmail}>
            {mode === 'signup' && <label>NAME<input value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" maxLength={80} required /></label>}
            <label>EMAIL<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>PASSWORD<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
            <button className="account-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <LogIn size={16} />}{mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}</button>
          </form>
          {message && <div className="account-message"><Mail size={16} /> {message}</div>}
          {error && <div className="account-error">{error}</div>}
          <button className="account-mode-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>
            {mode === 'login' ? 'NEW HERE? CREATE AN ACCOUNT' : 'ALREADY HAVE AN ACCOUNT? SIGN IN'}
          </button>
        </div>
      )}
      <p className="account-footnote">Marketplace accounts are separate from the store administrator login.</p>
    </section>
  )
}
