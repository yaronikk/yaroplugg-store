import type { Product } from '../types'
const STORE_CACHE_KEY='yp-store-products-v1'
const STORE_CACHE_TTL=5*60*1000
export function readStorage<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
export function readStoreCache():Product[]|null{
 try{
  const raw=localStorage.getItem(STORE_CACHE_KEY)
  if(!raw)return null
  const parsed=JSON.parse(raw)
  if(!parsed||!Array.isArray(parsed.items)||Date.now()-Number(parsed.savedAt||0)>STORE_CACHE_TTL)return null
  return parsed.items as Product[]
 }catch{return null}
}
export function writeStoreCache(items:Product[]){try{localStorage.setItem(STORE_CACHE_KEY,JSON.stringify({savedAt:Date.now(),items}))}catch{}}

