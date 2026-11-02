import React,{useEffect,useMemo,useState} from 'react'
import {Search,X,MessageCircle,Package,LoaderCircle,ArrowUpRight,ChevronDown,Check} from 'lucide-react'

type Language='en'|'ru'|'et'
type Listing={id:string;seller_id:string;telegram_username?:string|null;title:string;description:string;price:number;category:string;brand:string;size_label:string;item_condition:string;is_legit:boolean;colors:{name:string;hex:string}[];images:string[];created_at:string;status:string}
type Seller={id:string;display_name:string;avatar_url:string|null;telegram_username:string|null}
const words={
 en:{eyebrow:'PRE-LOVED FINDS',title:'MARKETPLACE',intro:'Discover pieces listed by the community.',search:'Search items or brands…',all:'ALL',category:'CATEGORY',condition:'CONDITION',size:'SIZE',sort:'SORT BY',newest:'Newest',low:'Price: low to high',high:'Price: high to low',empty:'No listings found',emptyHint:'Try another search or category.',loading:'LOADING LISTINGS…',conditionNames:['New with tags','New without tags','Excellent','Good','Has defects'],contact:'CONTACT SELLER',details:'ITEM DETAILS',seller:'SELLER',noSeller:'Yaroplugg seller',close:'Close',clear:'Clear filters',legit:'SELLER MARKED LEGIT',rep:'SELLER MARKED R€P',sizeLabel:'SIZE',colors:'COLORS',description:'DESCRIPTION',error:'Could not load marketplace listings.',noPhoto:'NO PHOTO',count:'LISTINGS'},
 ru:{eyebrow:'ВЕЩИ ОТ СООБЩЕСТВА',title:'МАРКЕТПЛЕЙС',intro:'Находи интересные вещи от других пользователей.',search:'Поиск вещей или брендов…',all:'ВСЕ',category:'КАТЕГОРИЯ',condition:'СОСТОЯНИЕ',size:'РАЗМЕР',sort:'СОРТИРОВКА',newest:'Сначала новые',low:'Сначала дешевле',high:'Сначала дороже',empty:'Объявлений не найдено',emptyHint:'Попробуй изменить поиск или категорию.',loading:'ЗАГРУЗКА ОБЪЯВЛЕНИЙ…',conditionNames:['Новое с бирками','Новое без бирок','Отличное','Хорошее','Есть дефекты'],contact:'НАПИСАТЬ ПРОДАВЦУ',details:'ИНФОРМАЦИЯ О ТОВАРЕ',seller:'ПРОДАВЕЦ',noSeller:'Продавец Yaroplugg',close:'Закрыть',clear:'Сбросить фильтры',legit:'ПРОДАВЕЦ ОТМЕТИЛ LEGIT',rep:'ПРОДАВЕЦ ОТМЕТИЛ R€P',sizeLabel:'РАЗМЕР',colors:'ЦВЕТА',description:'ОПИСАНИЕ',error:'Не удалось загрузить объявления.',noPhoto:'НЕТ ФОТО',count:'ОБЪЯВЛЕНИЙ'},
 et:{eyebrow:'KOGUKONNA LEIUD',title:'TURG',intro:'Avasta teiste kasutajate müügikuulutusi.',search:'Otsi tooteid või brände…',all:'KÕIK',category:'KATEGOORIA',condition:'SEISUKORD',size:'SUURUS',sort:'JÄRJESTUS',newest:'Uuemad ees',low:'Odavamad ees',high:'Kallimad ees',empty:'Kuulutusi ei leitud',emptyHint:'Proovi muuta otsingut või kategooriat.',loading:'KUULUTUSI LAADITAKSE…',conditionNames:['Uus siltidega','Uus ilma siltideta','Suurepärane','Hea','Defektidega'],contact:'VÕTA MÜÜJAGA ÜHENDUST',details:'TOOTE ANDMED',seller:'MÜÜJA',noSeller:'Yaropluggi müüja',close:'Sulge',clear:'Tühjenda filtrid',legit:'MÜÜJA MÄRKIS LEGIT',rep:'MÜÜJA MÄRKIS R€P',sizeLabel:'SUURUS',colors:'VÄRVID',description:'KIRJELDUS',error:'Kuulutuste laadimine ebaõnnestus.',noPhoto:'PILT PUUDUB',count:'KUULUTUST'}
} as const
const categories=[{en:'T-Shirts',ru:'Футболки',et:'T-särgid'},{en:'Hoodies',ru:'Худи',et:'Pusad'},{en:'Pants',ru:'Брюки',et:'Püksid'},{en:'Accessories',ru:'Аксессуары',et:'Aksessuaarid'},{en:'Belts',ru:'Ремни',et:'Vööd'},{en:'Jackets',ru:'Куртки',et:'Joped'}]
const conditionIndexes:Record<string,number>={new_with_tags:0,new_without_tags:1,excellent:2,good:3,defects:4}
const conditionKey=(v:string)=>conditionIndexes[v]??3
type DropdownOption={value:string;label:string}
function MarketDropdown({value,options,onChange,ariaLabel}:{value:string;options:DropdownOption[];onChange:(value:string)=>void;ariaLabel:string}){
 const [open,setOpen]=useState(false)
 const current=options.find(option=>option.value===value)||options[0]
 return <div className={`marketplace-dropdown ${open?'is-open':''}`}>
  <button type="button" className="marketplace-dropdown-trigger" aria-label={ariaLabel} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
   <span>{current?.label}</span><ChevronDown size={16}/>
  </button>
  {open&&<div className="marketplace-dropdown-menu" role="listbox" aria-label={ariaLabel}>
   {options.map(option=><button type="button" role="option" aria-selected={value===option.value} className={`marketplace-dropdown-option ${value===option.value?'is-selected':''}`} key={option.value} onClick={()=>{onChange(option.value);setOpen(false)}}>
    <span>{option.label}</span><span className="marketplace-dropdown-check">{value===option.value&&<Check size={14}/>}</span>
   </button>)}
  </div>}
 </div>
}
export default function Marketplace({supabase,language}:{supabase:any;language:Language}){
 const t=words[language]
 const [items,setItems]=useState<Listing[]>([])
 const [sellers,setSellers]=useState<Record<string,Seller>>({})
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [query,setQuery]=useState('')
 const [category,setCategory]=useState('all')
 const [condition,setCondition]=useState('all')
 const [size,setSize]=useState('all')
 const [sort,setSort]=useState('newest')
 const [selected,setSelected]=useState<Listing|null>(null)
 useEffect(()=>{let active=true;(async()=>{setLoading(true);setError('');try{
  if(!supabase)throw new Error(t.error)
  const {data,error}=await supabase.from('marketplace_listings').select('id,seller_id,telegram_username,title,description,price,category,brand,size_label,item_condition,is_legit,colors,images,created_at,status').eq('status','approved').order('created_at',{ascending:false}).limit(100)
  if(error)throw error
  const rows=(data||[]) as Listing[]
  const ids=Array.from(new Set(rows.map(x=>x.seller_id).filter(Boolean)))
  let profiles:Seller[]=[]
  if(ids.length){const result=await supabase.from('profiles').select('id,display_name,avatar_url,telegram_username').in('id',ids);if(!result.error)profiles=(result.data||[]) as Seller[]}
  if(!active)return
  setItems(rows);setSellers(Object.fromEntries(profiles.map(p=>[p.id,p])))
 }catch(e){if(active)setError(e instanceof Error?e.message:t.error)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[supabase,language])
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();const result=items.filter(item=>(category==='all'||item.category.toLowerCase()===category.toLowerCase())&&(condition==='all'||item.item_condition===condition)&&(size==='all'||item.size_label?.toLowerCase()===size.toLowerCase())&&(!q||[item.title,item.brand,item.description,item.category].some(v=>String(v||'').toLowerCase().includes(q))));return result.sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:new Date(b.created_at).getTime()-new Date(a.created_at).getTime())},[items,query,category,condition,size,sort])
 const categoryName=(value:string)=>{const c=categories.find(x=>x.en.toLowerCase()===value.toLowerCase());return c?c[language]:value}
 const conditionName=(value:string)=>t.conditionNames[conditionKey(value)]
 const seller=(id:string)=>sellers[id]
 const telegram=(id:string)=>String(items.find(item=>item.seller_id===id&&item.telegram_username)?.telegram_username||seller(id)?.telegram_username||'').replace(/^@/,'')
 return <section className="marketplace-page page-pad page-top">
  <div className="marketplace-heading"><div><p className="eyebrow">{t.eyebrow}</p><h1 className="page-title">{t.title}</h1><p>{t.intro}</p></div><Package size={22}/></div>
  <div className="marketplace-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label={t.clear}><X size={15}/></button>}</div>
  <div className="marketplace-filter-row"><MarketDropdown value={category} onChange={setCategory} ariaLabel={t.category} options={[{value:'all',label:`${t.all} · ${t.category}`},...categories.map(c=>({value:c.en.toLowerCase(),label:c[language]}))]}/><MarketDropdown value={condition} onChange={setCondition} ariaLabel={t.condition} options={[{value:'all',label:`${t.all} · ${t.condition}`},...['new_with_tags','new_without_tags','excellent','good','defects'].map((v,i)=>({value:v,label:t.conditionNames[i]}))]}/></div>
  <div className="marketplace-sort"><span>{filtered.length} {t.count}</span><div className="marketplace-sort-control"><MarketDropdown value={sort} onChange={setSort} ariaLabel={t.sort} options={[{value:'newest',label:t.newest},{value:'low',label:t.low},{value:'high',label:t.high}]}/></div></div>
  {loading?<div className="marketplace-loading"><LoaderCircle className="spin" size={22}/>{t.loading}</div>:error?<div className="account-error">{error}</div>:filtered.length===0?<div className="marketplace-empty"><Package size={28}/><strong>{t.empty}</strong><span>{t.emptyHint}</span></div>:<div className="marketplace-grid">{filtered.map(item=><button type="button" className="marketplace-card" key={item.id} onClick={()=>setSelected(item)}><div className="marketplace-card-media">{item.images?.[0]?<img src={item.images[0]} alt={item.title} loading="lazy"/>:<span>{t.noPhoto}</span>}<span className={`marketplace-auth-badge ${item.is_legit?'is-legit':'is-rep'}`}>{item.is_legit?'LEGIT':'R€P'}</span></div><div className="marketplace-card-info"><span className="marketplace-card-category">{categoryName(item.category)}</span><strong>{item.title}</strong><div><span>{item.brand||conditionName(item.item_condition)}</span><b>€{Number(item.price).toFixed(2)}</b></div></div></button>)}</div>}
  {selected&&<div className="marketplace-overlay" role="dialog" aria-modal="true" aria-label={selected.title} onClick={()=>setSelected(null)}><div className="marketplace-detail" onClick={e=>e.stopPropagation()}><button className="marketplace-detail-close" type="button" onClick={()=>setSelected(null)} aria-label={t.close}><X size={19}/></button><div className="marketplace-detail-images">{(selected.images||[]).map((src,i)=><img key={src+i} src={src} alt={selected.title}/>)}</div><div className="marketplace-detail-content"><p className="eyebrow">{categoryName(selected.category)}</p><div className="marketplace-detail-title"><h2>{selected.title}</h2><strong>€{Number(selected.price).toFixed(2)}</strong></div><span className={`marketplace-auth-badge detail-badge ${selected.is_legit?'is-legit':'is-rep'}`}>{selected.is_legit?'LEGIT':'R€P'}</span><div className="marketplace-specs"><span>{t.sizeLabel}: <b>{selected.size_label||'—'}</b></span><span>{t.condition}: <b>{conditionName(selected.item_condition)}</b></span><span>{t.colors}: <b>{(selected.colors||[]).map(c=>c.name).join(', ')||'—'}</b></span></div><h3>{t.description}</h3><p className="marketplace-description">{selected.description}</p><div className="marketplace-seller"><span className="marketplace-seller-avatar">{seller(selected.seller_id)?.avatar_url?<img src={seller(selected.seller_id)?.avatar_url||''} alt=""/>:<Package size={17}/>}</span><div><small>{t.seller}</small><strong>{seller(selected.seller_id)?.display_name||t.noSeller}</strong></div></div>{telegram(selected.seller_id)?<a className="marketplace-contact" href={`https://t.me/${encodeURIComponent(telegram(selected.seller_id))}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{t.contact}<ArrowUpRight size={15}/></a>:<p className="marketplace-contact-disabled">{language==='ru'?'Продавец не указал Telegram':language==='et'?'Müüja pole Telegrami lisanud':'Seller has not added Telegram'}</p>}</div></div></div>}
 </section>
}
