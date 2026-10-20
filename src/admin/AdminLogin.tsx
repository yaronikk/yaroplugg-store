import React,{useEffect,useRef} from 'react'
import {AdminFrame} from './AdminFrame'
type TurnstileApi={render:(element:HTMLElement,options:Record<string,unknown>)=>string;reset:(widgetId?:string)=>void;remove:(widgetId:string)=>void}
declare global{interface Window{turnstile?:TurnstileApi}}
export function AdminLogin({email,password,setEmail,setPassword,error,onSubmit,captchaToken,setCaptchaToken,turnstileSiteKey}:{email:string;password:string;setEmail:(v:string)=>void;setPassword:(v:string)=>void;error:string;onSubmit:(e:React.FormEvent)=>void;captchaToken:string;setCaptchaToken:(v:string)=>void;turnstileSiteKey:string}){
 const captchaRef=useRef<HTMLDivElement|null>(null),widgetIdRef=useRef<string|null>(null)
 useEffect(()=>{
  if(!turnstileSiteKey||!captchaRef.current)return
  let disposed=false
  const render=()=>{if(!disposed&&captchaRef.current&&window.turnstile&&!widgetIdRef.current)widgetIdRef.current=window.turnstile.render(captchaRef.current,{sitekey:turnstileSiteKey,callback:setCaptchaToken,'expired-callback':()=>setCaptchaToken(''),'error-callback':()=>setCaptchaToken('')})}
  let script=document.querySelector<HTMLScriptElement>('script[data-turnstile-widget]')
  if(window.turnstile)render()
  else if(script)script.addEventListener('load',render)
  else{script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.turnstileWidget='true';script.addEventListener('load',render);document.head.appendChild(script)}
  return()=>{disposed=true;script?.removeEventListener('load',render);if(widgetIdRef.current&&window.turnstile){window.turnstile.remove(widgetIdRef.current);widgetIdRef.current=null}}
 },[turnstileSiteKey,setCaptchaToken])
 function submit(event:React.FormEvent){event.preventDefault();onSubmit(event);if(widgetIdRef.current)window.turnstile?.reset(widgetIdRef.current)}
 return <AdminFrame><div className="admin-login"><div className="admin-login-card"><img src="/logo.webp" alt="YAROPLUGG"/><div className="admin-kicker">PRIVATE AREA</div><h1>ADMIN LOGIN</h1><p>Sign in with your YAROPLUGG admin account.</p><form onSubmit={submit}><label>EMAIL<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>PASSWORD<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{turnstileSiteKey&&<div className="turnstile-area"><div ref={captchaRef}/></div>}{error&&<div className="admin-error" role="alert">{error}</div>}<button className="admin-primary" type="submit" disabled={Boolean(turnstileSiteKey&&!captchaToken)}>SIGN IN</button></form></div></div></AdminFrame>
}
