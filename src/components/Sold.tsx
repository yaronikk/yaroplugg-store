import React from 'react'
import {Tag} from 'lucide-react'
import type {Product} from '../types'
import {ProductCard} from './ProductCard'
import {useI18n} from '../i18n'

export function Sold({products,onProduct}:{products:Product[];onProduct:(product:Product)=>void}){
 const {t}=useI18n()
 return <div className="page-pad page-top"><div className="catalog-head"><div><p>{t('pastDrops')}</p><h1>{t('soldTab')}</h1></div><span className="favorite-count">{products.length} {t('soldCount')}</span></div>{products.length===0?<div className="empty-card favorites-empty"><Tag size={22}/><h2>{t('nothingSoldYet')}</h2></div>:<div className="product-grid">{products.map(product=><ProductCard key={product.id} p={product} onClick={()=>onProduct(product)} favorite={false} onFavorite={()=>{}}/>)}</div>}</div>
}
