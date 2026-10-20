import React,{useState} from 'react'
import {Check,Copy,MessageCircle} from 'lucide-react'
import {SHOP} from '../config'
import {useI18n} from '../i18n'
import {track} from '../lib/analytics'

export function OrderSuccess({orderNumber,onClose}:{orderNumber:number;onClose:()=>void}){
 const [copied,setCopied]=useState(false)
 const {language,t}=useI18n()
 const manager=SHOP.managerTelegram.replace(/^@/,'')
 const message=`Hello! I placed order #${orderNumber} at ${SHOP.name||'YAROPLUGG STORE'}.`
 async function copy(){try{await navigator.clipboard.writeText(String(orderNumber));setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}}
 return <div className="modal-backdrop"><section className="sheet cart-sheet order-success" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
  <div className="order-success-icon"><Check size={25}/></div><div className="eyebrow red">YAROPLUGG</div><h2 id="order-success-title">{t('orderReceived')} · #{orderNumber}</h2>
  <p>{t('orderThanks')}</p>
  <p>{t('reservationTime')}</p>
  <p>{SHOP.replyTime[language]||t('replyDefault')}</p>
  {manager&&<a className="primary-red order-manager-link" href={`https://t.me/${encodeURIComponent(manager)}?text=${encodeURIComponent(message)}`} onClick={()=>track('Manager clicked')} target="_blank" rel="noreferrer"><MessageCircle size={17}/> {t('contactManager')}</a>}
  <button className="admin-ghost order-copy-button" onClick={()=>void copy()}><Copy size={16}/>{copied?t('copied'):t('copyOrder')}</button>
  <button className="admin-ghost order-close-button" onClick={onClose}>{t('continueShopping')}</button>
 </section></div>
}
