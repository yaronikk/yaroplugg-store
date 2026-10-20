import React,{useEffect,useRef,useState} from 'react'
import {X,Minus,Plus,Trash2} from 'lucide-react'
import type {Product} from '../types'
import type {CartLine} from './shared'
import {normalizeContact,type ContactType,validateContact} from '../lib/orderValidation'
import {useI18n} from '../i18n'

type TurnstileApi={render:(element:HTMLElement,options:Record<string,unknown>)=>string;reset:(widgetId?:string)=>void;remove:(widgetId:string)=>void}
declare global { interface Window { turnstile?:TurnstileApi } }
export type CheckoutSubmission={customerName:string;contactType:ContactType;contactValue:string;comment:string;termsAccepted:boolean;turnstileToken:string}

export function CartCheckout({cart,products,setCart,onClose,onCheckout,customerName,setCustomerName,initialContact,isTelegram,turnstileSiteKey,busy,message}:{cart:CartLine[];products:Product[];setCart:React.Dispatch<React.SetStateAction<CartLine[]>>;onClose:()=>void;onCheckout:(submission:CheckoutSubmission)=>void;customerName:string;setCustomerName:(v:string)=>void;initialContact:string;isTelegram:boolean;turnstileSiteKey:string;busy:boolean;message:string}){
 const {t}=useI18n()
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[onClose])
 const rows=cart.map(line=>({line,product:products.find(p=>p.id===line.productId)})).filter((row):row is {line:CartLine;product:Product}=>Boolean(row.product))
 const total=rows.reduce((sum,row)=>sum+Number(row.product.price)*row.line.quantity,0)
 const itemCount=rows.reduce((sum,row)=>sum+row.line.quantity,0)
 const [contactType,setContactType]=useState<ContactType>('telegram')
 const [contactValue,setContactValue]=useState(initialContact)
 const [comment,setComment]=useState('')
 const [termsAccepted,setTermsAccepted]=useState(false)
 const [turnstileToken,setTurnstileToken]=useState('')
 const [turnstileError,setTurnstileError]=useState('')
 const captchaRef=useRef<HTMLDivElement|null>(null)
 const widgetIdRef=useRef<string|null>(null)
 const validContact=validateContact(contactType,contactValue)

 useEffect(()=>{
  if(isTelegram||!turnstileSiteKey||!captchaRef.current)return
  let disposed=false
  const render=()=>{if(!disposed&&captchaRef.current&&window.turnstile&&!widgetIdRef.current)widgetIdRef.current=window.turnstile.render(captchaRef.current,{sitekey:turnstileSiteKey,callback:(token:string)=>{setTurnstileToken(token);setTurnstileError('')},'expired-callback':()=>setTurnstileToken(''),'error-callback':()=>{setTurnstileToken('');setTurnstileError(t('captchaFailed'))}})}
  let script=document.querySelector<HTMLScriptElement>('script[data-turnstile-widget]')
  if(window.turnstile)render()
  else if(script)script.addEventListener('load',render)
  else{script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.turnstileWidget='true';script.addEventListener('load',render);script.addEventListener('error',()=>setTurnstileError(t('captchaLoad')));document.head.appendChild(script)}
  return()=>{disposed=true;script?.removeEventListener('load',render);if(widgetIdRef.current&&window.turnstile){window.turnstile.remove(widgetIdRef.current);widgetIdRef.current=null}}
 },[isTelegram,turnstileSiteKey])

 function submit(){
  if(!customerName.trim()){setTurnstileError(t('enterName'));return}
  if(!validContact){setTurnstileError(t('validContact'));return}
  if(!termsAccepted){setTurnstileError(t('acceptTerms'));return}
  if(!isTelegram&&(!turnstileSiteKey||!turnstileToken)){setTurnstileError(turnstileSiteKey?t('completeCaptcha'):t('captchaMissing'));return}
  setTurnstileError('')
  onCheckout({customerName:customerName.trim(),contactType,contactValue:normalizeContact(contactType,contactValue),comment:comment.trim(),termsAccepted,turnstileToken})
 }

 return <div className="modal-backdrop"><section className="sheet cart-sheet" role="dialog" aria-modal="true" aria-labelledby="cart-dialog-title"><div className="sheet-title-row"><div><div className="eyebrow red">YAROPLUGG</div><h2 id="cart-dialog-title">{t('bag')}</h2></div><button onClick={onClose} className="close-button small" aria-label="Close bag"><X size={18}/></button></div>{rows.length===0?<div className="cart-empty">{t('emptyBag')}</div>:<><div className="cart-lines">{rows.map(({line,product})=><article className="cart-line" key={`${line.productId}-${line.size}-${line.length}-${line.color}`}><img src={product.thumbnailUrls?.[0]||product.images[0]} alt=""/><div className="cart-line-info"><b>{product.name}</b><span>{line.size||`${line.length} cm`} · {line.color}</span><span>€{Number(product.price).toFixed(2)}</span><div className="cart-quantity"><button type="button" onClick={()=>setCart(current=>current.flatMap(x=>x===line?(x.quantity<=1?[]:[{...x,quantity:x.quantity-1}]):x))} aria-label={`Decrease quantity of ${product.name}`}><Minus size={13} strokeWidth={1.8}/></button><span aria-live="polite">{line.quantity}</span><button type="button" disabled={itemCount>=5} onClick={()=>setCart(current=>itemCount>=5?current:current.map(x=>x===line?{...x,quantity:x.quantity+1}:x))} aria-label={`Increase quantity of ${product.name}`}><Plus size={13} strokeWidth={1.8}/></button><button type="button" className="cart-remove" onClick={()=>setCart(current=>current.filter(x=>x!==line))} aria-label={`Remove ${product.name} from bag`} title="Remove item"><Trash2 size={14} strokeWidth={1.7}/></button></div></div></article>)}</div><div className="cart-total"><span>{t('itemsTotal')}</span><b>€{total.toFixed(2)}</b></div>
  <div className="checkout-fields">
   <label>{t('name')}<input autoComplete="name" value={customerName} onChange={e=>setCustomerName(e.target.value)} maxLength={120} required/></label>
   <label>{t('contactType')}<select value={contactType} onChange={e=>setContactType(e.target.value as ContactType)}><option value="telegram">{t('telegram')}</option><option value="phone">{t('phone')}</option><option value="email">{t('email')}</option></select></label>
   <label>{contactType==='telegram'?t('telegram').toUpperCase():contactType==='phone'?t('phone').toUpperCase():t('email').toUpperCase()}<input autoComplete={contactType==='email'?'email':contactType==='phone'?'tel':'off'} value={contactValue} onChange={e=>setContactValue(e.target.value)} maxLength={120} placeholder={contactType==='telegram'?'@username':contactType==='phone'?'+372…':'name@example.com'} required/><small className="admin-field-hint">{t('contactHint')}</small></label>
   <label>{t('comment')}<textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={1000} rows={3} placeholder={t('commentPlaceholder')}/></label>
  </div>
  <p className="checkout-disclaimer">{t('manager')}</p>
  <label className="checkout-consent"><input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)}/><span>{t('agree')}</span></label>
  {!isTelegram&&<div className="turnstile-area"><div ref={captchaRef}/>{!turnstileSiteKey&&<small className="admin-field-hint">{t('browserOrdersDisabled')}</small>}</div>}
  {(turnstileError||message)&&<p className="checkout-error" role="alert">{turnstileError||message}</p>}
  <button className="primary-red" disabled={busy||rows.length===0||itemCount>5||!customerName.trim()||!validContact||!termsAccepted||(!isTelegram&&(!turnstileSiteKey||!turnstileToken))} onClick={submit}>{busy?t('creatingOrder'):t('checkout').toUpperCase()}</button>
 </>}</section></div>
}
