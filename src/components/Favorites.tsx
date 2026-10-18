import React from 'react'
import {Heart} from 'lucide-react'
import type {Product} from '../types'
import {ProductCard} from './ProductCard'
export function Favorites({products,onProduct,favorites,onFavorite}:{products:Product[];onProduct:(p:Product)=>void;favorites:string[];onFavorite:(id:string)=>void}){return <div className="page-pad page-top"><div className="catalog-head"><div><p>YOUR SELECTION</p><h1>FAVORITES</h1></div><span className="favorite-count">{products.length} SAVED</span></div>{products.length===0?<div className="empty-card favorites-empty"><Heart size={22}/><h2>YOUR FAVORITES ARE EMPTY</h2><p>Tap the heart on any product to save it here.</p></div>:<div className="product-grid">{products.map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>}</div>}
