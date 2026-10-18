import type { Product, Category } from '../types'
import type { AdminColor } from '../admin/model'
const COLOR_HEX:Record<string,string>={black:'#0b0b0b',white:'#f5f5f3',red:'#ef2027',blue:'#2563eb',green:'#16a34a',yellow:'#facc15',orange:'#f97316',purple:'#8b5cf6',pink:'#ec4899',brown:'#8b5e3c',beige:'#d8c3a5',grey:'#808080',gray:'#808080',navy:'#172554',cream:'#f3ead8'}
function parseJsonValue(value:any):any{
 let current=value
 for(let i=0;i<4 && typeof current==='string';i++){
  const text=current.trim()
  if(!text) return ''
  try{current=JSON.parse(text)}catch{break}
 }
 return current
}
export function normalizeColors(value:any):AdminColor[]{
 let raw=parseJsonValue(value)
 if(raw&&typeof raw==='object'&&!Array.isArray(raw)) raw=[raw]
 if(typeof raw==='string') raw=raw.split(',').map(x=>x.trim()).filter(Boolean)
 if(!Array.isArray(raw))return []
 const get=(obj:any,...keys:string[])=>{for(const key of keys){if(obj?.[key]!==undefined&&obj?.[key]!==null)return obj[key];const found=Object.keys(obj||{}).find(k=>k.toLowerCase()===key.toLowerCase());if(found)return obj[found]}return undefined}
 return raw.flatMap((item:any)=>{
  let c=parseJsonValue(item)
  if(typeof c==='string'){
   const name=c.trim();return name?[{name,hex:COLOR_HEX[name.toLowerCase()]||'#808080'}]:[]
  }
  if(!c||typeof c!=='object')return []
  let nested=parseJsonValue(get(c,'name','color'))
  if(nested&&typeof nested==='object'&&!Array.isArray(nested)){c={...nested,...c};if(!get(c,'hex','value','code')&&get(nested,'hex','value','code'))c.hex=get(nested,'hex','value','code')}
  const name=String(get(c,'name','color')??'').trim()
  if(!name)return []
  const rawHex=String(get(c,'hex','value','code')??'').trim()
  const hex=/^#[0-9a-fA-F]{6}$/.test(rawHex)?rawHex.toLowerCase():(COLOR_HEX[name.toLowerCase()]||'#808080')
  return [{name,hex}]
 })
}

export function dbProduct(row:any):Product & {lengths:string[];stock:number}{
 const category=(row.category?.name||'T-Shirts') as Exclude<Category,'All'>
 const colors=normalizeColors(row.colors)
 const images=Array.isArray(row.images)?row.images.filter(Boolean):(typeof row.images==='string'?[row.images].filter(Boolean):[])
 return {id:row.id,name:row.name,slug:row.slug||`${String(row.name||'product').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${String(row.id).slice(0,8)}`,brand:row.brand||'',category,categoryType:row.category?.category_type||'clothing',price:Number(row.price),description:row.description||'',composition:row.composition||'',sizes:Array.isArray(row.sizes)?row.sizes:[],sizeLabel:row.size_label||'',measurements:row.measurements||'',defects:row.defects||'',condition:row.condition||'good',resaleStatus:row.resale_status||'available',lengths:Array.isArray(row.lengths)?row.lengths:[],colors,images:images.length?images:(row.image_url?[row.image_url]:[]),thumbnailUrls:Array.isArray(row.thumbnail_urls)?row.thumbnail_urls:[],featured:Boolean(row.featured),stock:Math.max(0,Number(row.stock)||0)}
}


export const isBeltCategory=(category:string)=>category.trim().toLowerCase()==='belts'
