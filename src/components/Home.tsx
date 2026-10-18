import React from 'react'
import {ArrowUpRight} from 'lucide-react'
import type {Category,CategoryRecord,Product} from '../types'
import {ProductCard} from './ProductCard'
import {SHOP} from '../config'
import {useI18n} from '../i18n'
export type StoreReview={id:string;customer_name:string;body:string;rating:number;language:string}
export function Home({onCatalog,onCategory,onProduct,favorites,onFavorite,products,categories,reviews}:{onCatalog:()=>void;onCategory:(c:Category)=>void;onProduct:(p:Product)=>void;favorites:string[];onFavorite:(id:string)=>void;products:Product[];categories:CategoryRecord[];reviews:StoreReview[]}){
 const {language,t}=useI18n()
 const socials=[['Instagram',SHOP.instagram],['Vinted',SHOP.vinted],['Telegram',SHOP.managerTelegram?`https://t.me/${SHOP.managerTelegram.replace(/^@/,'')}`:'']].filter((item):item is [string,string]=>Boolean(item[1]))
 return <div className="page-pad"><section className="hero-card"><button onClick={onCatalog} className="hero-image-button" aria-label={t('shop')}><img src="/hero-drop.webp" alt="YAROPLUGG" loading="eager" decoding="async"/></button><div className="home-slogan"><span>YAROPLUGG</span><h1>{t('tagline')}</h1><p>{t('about')}</p><button onClick={onCatalog}>{t('shop')} <ArrowUpRight size={14}/></button></div></section>
  <div className="category-strip">{categories.map(c=><button key={c.id} onClick={()=>onCategory(c.name)}>{((c[`name_${language}`]||c.name) as string).toUpperCase()}</button>)}</div>
  <div className="section-head"><div><p>{t('newIn')}</p><h2>{t('newIn')}</h2></div><button onClick={onCatalog}>{t('viewAll')} <ArrowUpRight size={14}/></button></div>
  <div className="product-grid">{products.filter(p=>p.featured&&p.resaleStatus!=='sold').map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>
  <section className="home-how"><p className="eyebrow red">YAROPLUGG</p><h2>{t('howOrder')}</h2><ol><li>{t('categories')}</li><li>{t('bag')}</li><li>{t('checkout')}</li></ol></section>
  {reviews.length>0&&<section className="home-reviews"><h2>{t('reviews')}</h2><div>{reviews.slice(0,3).map(review=><article key={review.id}><span>{'★'.repeat(Math.max(1,Math.min(5,review.rating)))}</span><p>{review.body}</p><b>{review.customer_name}</b></article>)}</div></section>}
  {!!socials.length&&<footer className="store-socials">{socials.map(([name,url])=><a key={name} href={url} target="_blank" rel="noreferrer">{name}</a>)}</footer>}
 </div>
}
