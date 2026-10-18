import {useEffect,useState} from 'react'
import {X} from 'lucide-react'
import {useI18n} from '../i18n'
type SortOrder='newest'|'price_asc'|'price_desc'
export function Filters({size,color,brand,condition,sort,maxPrice,minPrice,maxPriceBound,colors,brands,sizes,onClose,onApply}:{size:string;color:string;brand:string;condition:string;sort:SortOrder;maxPrice:number;minPrice:number;maxPriceBound:number;colors:string[];brands:string[];sizes:string[];onClose:()=>void;onApply:(size:string,color:string,brand:string,condition:string,sort:SortOrder,maxPrice:number)=>void}){
 const {t}=useI18n()
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[onClose])
 const[s,setS]=useState(size),[c,setC]=useState(color),[b,setB]=useState(brand),[cond,setCond]=useState(condition),[order,setOrder]=useState(sort),[price,setPrice]=useState(maxPrice)
 return <div className="modal-backdrop align-end"><section className="sheet filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title"><div className="sheet-title-row"><h2 id="filter-title">{t('filters')}</h2><button onClick={onClose} className="close-button small" aria-label="Close filters"><X size={18}/></button></div>
  <div className="filter-group"><div className="option-label">{t('size')}</div><div className="option-row wrap">{['All',...sizes].map(x=><button key={x} onClick={()=>setS(x)} className={s===x?'selected':''}>{x}</button>)}</div></div>
  <div className="filter-group"><div className="option-label">{t('brand')}</div><select value={b} onChange={e=>setB(e.target.value)}><option value="All">{t('allBrands')}</option>{brands.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
  <div className="filter-group"><div className="option-label">{t('condition')}</div><select value={cond} onChange={e=>setCond(e.target.value)}><option value="All">{t('allConditions')}</option><option value="new_with_tags">New with tags</option><option value="excellent">Excellent</option><option value="good">Good</option><option value="defects">Has defects</option></select></div>
  <div className="filter-group"><div className="option-label">{t('color')}</div><select value={c} onChange={e=>setC(e.target.value)}>{colors.map(x=><option key={x}>{x}</option>)}</select></div>
  <div className="filter-group"><div className="option-label">{t('sort')}</div><select value={order} onChange={e=>setOrder(e.target.value as SortOrder)}><option value="newest">{t('newest')}</option><option value="price_asc">{t('priceLow')}</option><option value="price_desc">{t('priceHigh')}</option></select></div>
  <div className="filter-group"><div className="price-line"><span className="option-label">{t('maximumPrice')}</span><span>€{price}</span></div><input type="range" min={minPrice} max={maxPriceBound} value={price} onChange={e=>setPrice(Number(e.target.value))}/></div>
  <button onClick={()=>onApply(s,c,b,cond,order,price)} className="primary-red">{t('apply')}</button></section></div>
}
