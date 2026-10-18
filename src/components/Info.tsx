import React,{useState} from 'react'
import {SHOP} from '../config'
import {infoDrafts,infoPageKeys,useI18n,type InfoPage} from '../i18n'

export function Info(){
 const {language,t}=useI18n()
 const [page,setPage]=useState<InfoPage>(()=>{const key=window.location.pathname.split('/')[2] as InfoPage;return infoPageKeys.includes(key)?key:'about'})
 React.useEffect(()=>{const onPop=()=>{const key=window.location.pathname.split('/')[2] as InfoPage;setPage(infoPageKeys.includes(key)?key:'about')};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])
 const social=[['Instagram',SHOP.instagram],['Vinted',SHOP.vinted],['Email',SHOP.email]].filter((item):item is [string,string]=>Boolean(item[1]))
 return <div className="page-pad page-top"><p className="eyebrow red">YAROPLUGG</p><h1 className="page-title">{t('info')}</h1><div className="info-layout"><nav className="info-page-list" aria-label={t('info')}>{infoPageKeys.map(key=><button key={key} className={page===key?'active':''} onClick={()=>{setPage(key);window.history.pushState({},'',`/info/${key}`)}}>{t(key)}</button>)}</nav><article className="info-page-content"><h2>{t(page)}</h2><p>{infoDrafts[language][page]}</p>{page==='contacts'&&<div className="info-socials">{social.map(([name,url])=><a key={name} href={url.startsWith('http')||url.startsWith('mailto:')?url:`mailto:${url}`} target={url.startsWith('http')?'_blank':undefined} rel="noreferrer">{name}</a>)}</div>}</article></div></div>
}
