import React,{useEffect,useMemo,useRef,useState} from 'react'
import {Search,X,MessageCircle,Package,LoaderCircle,ArrowUpRight,ChevronDown,Check,Heart,UserRound} from 'lucide-react'

type Language='en'|'ru'|'et'
type Listing={id:string;seller_id:string;telegram_username?:string|null;title:string;description:string;price:number;category:string;brand:string;size_label:string;item_condition:string;is_legit:boolean;colors:{name:string;hex:string}[];images:string[];created_at:string;status:string}
type Seller={id:string;display_name:string;avatar_url:string|null;telegram_username:string|null}
const words={
 en:{eyebrow:'PRE-LOVED FINDS',title:'MARKETPLACE',intro:'Discover pieces listed by the community.',search:'Search items or brands…',all:'ALL',category:'CATEGORY',condition:'CONDITION',size:'SIZE',sort:'SORT BY',newest:'Newest',low:'Price: low to high',high:'Price: high to low',empty:'No listings found',emptyHint:'Try another search or category.',loading:'LOADING LISTINGS…',conditionNames:['New with tags','New without tags','Excellent','Good','Has defects'],contact:'CONTACT SELLER',details:'ITEM DETAILS',seller:'SELLER',noSeller:'Yaroplugg seller',close:'Close',clear:'Clear filters',legit:'SELLER MARKED LEGIT',rep:'SELLER MARKED R3p',sizeLabel:'SIZE',colors:'COLORS',description:'DESCRIPTION',error:'Could not load marketplace listings.',noPhoto:'NO PHOTO',count:'LISTINGS',saveFavorite:'SAVE TO FAVORITES',removeFavorite:'REMOVE FROM FAVORITES',saved:'MARKETPLACE SAVED',loadMore:'LOAD MORE LISTINGS',loadingMore:'LOADING…'},
 ru:{eyebrow:'ВЕЩИ ОТ СООБЩЕСТВА',title:'МАРКЕТПЛЕЙС',intro:'Находи интересные вещи от других пользователей.',search:'Поиск вещей или брендов…',all:'ВСЕ',category:'КАТЕГОРИЯ',condition:'СОСТОЯНИЕ',size:'РАЗМЕР',sort:'СОРТИРОВКА',newest:'Сначала новые',low:'Сначала дешевле',high:'Сначала дороже',empty:'Объявлений не найдено',emptyHint:'Попробуй изменить поиск или категорию.',loading:'ЗАГРУЗКА ОБЪЯВЛЕНИЙ…',conditionNames:['Новое с бирками','Новое без бирок','Отличное','Хорошее','Есть дефекты'],contact:'НАПИСАТЬ ПРОДАВЦУ',details:'ИНФОРМАЦИЯ О ТОВАРЕ',seller:'ПРОДАВЕЦ',noSeller:'Продавец Yaroplugg',close:'Закрыть',clear:'Сбросить фильтры',legit:'ПРОДАВЕЦ ОТМЕТИЛ LEGIT',rep:'ПРОДАВЕЦ ОТМЕТИЛ R3p',sizeLabel:'РАЗМЕР',colors:'ЦВЕТА',description:'ОПИСАНИЕ',error:'Не удалось загрузить объявления.',noPhoto:'НЕТ ФОТО',count:'ОБЪЯВЛЕНИЙ',saveFavorite:'В ИЗБРАННОЕ',removeFavorite:'УБРАТЬ ИЗ ИЗБРАННОГО',saved:'ИЗБРАННОЕ ИЗ МАРКЕТПЛЕЙСА',loadMore:'ПОКАЗАТЬ ЕЩЁ',loadingMore:'ЗАГРУЗКА…'},
 et:{eyebrow:'KOGUKONNA LEIUD',title:'TURG',intro:'Avasta teiste kasutajate müügikuulutusi.',search:'Otsi tooteid või brände…',all:'KÕIK',category:'KATEGOORIA',condition:'SEISUKORD',size:'SUURUS',sort:'JÄRJESTUS',newest:'Uuemad ees',low:'Odavamad ees',high:'Kallimad ees',empty:'Kuulutusi ei leitud',emptyHint:'Proovi muuta otsingut või kategooriat.',loading:'KUULUTUSI LAADITAKSE…',conditionNames:['Uus siltidega','Uus ilma siltideta','Suurepärane','Hea','Defektidega'],contact:'VÕTA MÜÜJAGA ÜHENDUST',details:'TOOTE ANDMED',seller:'MÜÜJA',noSeller:'Yaropluggi müüja',close:'Sulge',clear:'Tühjenda filtrid',legit:'MÜÜJA MÄRKIS LEGIT',rep:'MÜÜJA MÄRKIS R3p',sizeLabel:'SUURUS',colors:'VÄRVID',description:'KIRJELDUS',error:'Kuulutuste laadimine ebaõnnestus.',noPhoto:'PILT PUUDUB',count:'KUULUTUST',saveFavorite:'SALVESTA LEMMIKUTESSE',removeFavorite:'EEMALDA LEMMIKUTEST',saved:'TURU LEMMIKUD',loadMore:'LAADI VEEL',loadingMore:'LAADIMINE…'}
} as const
const categories=[{en:'T-Shirts',ru:'Футболки',et:'T-särgid'},{en:'Hoodies',ru:'Худи',et:'Pusad'},{en:'Pants',ru:'Брюки',et:'Püksid'},{en:'Accessories',ru:'Аксессуары',et:'Aksessuaarid'},{en:'Belts',ru:'Ремни',et:'Vööd'},{en:'Jackets',ru:'Куртки',et:'Joped'}]
const conditionIndexes:Record<string,number>={new_with_tags:0,new_without_tags:1,excellent:2,good:3,defects:4}
const conditionKey=(v:string)=>conditionIndexes[v]??3
const MARKETPLACE_PAGE_SIZE=20
const MARKETPLACE_FIELDS='id,seller_id,telegram_username,title,description,price,category,brand,size_label,item_condition,is_legit,colors,images,created_at,status'
function buildMarketplaceQuery(supabase:any,filters:{query:string;category:string;condition:string;size:string;sort:string},withCount=false){
 const builder=withCount
  ?supabase.from('marketplace_listings').select(MARKETPLACE_FIELDS,{count:'exact'})
  :supabase.from('marketplace_listings').select(MARKETPLACE_FIELDS)
 let request=builder.eq('status','approved')
 if(filters.category!=='all')request=request.ilike('category',filters.category)
 if(filters.condition!=='all')request=request.eq('item_condition',filters.condition)
 if(filters.size!=='all')request=request.ilike('size_label',filters.size)
 const term=filters.query.trim().replace(/[(),\\%_*]/g,' ').replace(/\s+/g,' ')
 if(term)request=request.or(['title','brand','description','category'].map(field=>field+'.ilike.%'+term+'%').join(','))
 if(filters.sort==='low')request=request.order('price',{ascending:true})
 else if(filters.sort==='high')request=request.order('price',{ascending:false})
 else request=request.order('created_at',{ascending:false})
 return request
}
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
const marketplaceFavoriteKey=(id:string)=>`marketplace:${id}`
function marketplaceImageSrc(src:string,width:number){
 try{
  const image=new URL(src)
  const prefix='/storage/v1/object/public/'
  const start=image.pathname.indexOf(prefix)
  if(image.hostname!=='itbatnhmrmvegspsqmgb.supabase.co'||start<0)return src
  const path=image.pathname.slice(start+prefix.length)
  if(!path.startsWith('marketplace-listings/')||path.includes('..'))return src
  const params=new URLSearchParams({path,width:String(width)})
  return '/api/marketplace-image?'+params.toString()
 }catch{return src}
}

function MarketplaceSellerAvatar({src}:{src:string|null|undefined}){
 const [failedUrl,setFailedUrl]=useState<string|null>(null)
 const imageSrc=src&&src!==failedUrl?src:null
 return <span className="marketplace-seller-avatar">{imageSrc?<img src={imageSrc} alt="" onError={()=>setFailedUrl(imageSrc)}/>:<UserRound size={19} strokeWidth={1.8} aria-hidden="true"/>}</span>
}
function MarketplacePhotoGallery({images,title,language}:{images:string[];title:string;language:Language}){
 const galleryRef=useRef<HTMLDivElement>(null)
 const pointerPositions=useRef(new Map<number,{x:number;y:number}>())
 const gesture=useRef<{distance:number;zoom:number;x:number;y:number;pointX:number;pointY:number;originX:number;originY:number;localX:number;localY:number}|null>(null)
 const [activeIndex,setActiveIndex]=useState(0)
 const [viewerIndex,setViewerIndex]=useState<number|null>(null)
 const [zoom,setZoom]=useState(1)
 const [pan,setPan]=useState({x:0,y:0})
 const [interacting,setInteracting]=useState(false)
 if(!images.length)return null
 const label=(index:number)=>language==='ru'?'Фото '+(index+1)+' из '+images.length:language==='et'?'Foto '+(index+1)+' / '+images.length:'Photo '+(index+1)+' of '+images.length
 const text=language==='ru'?{open:'Открыть фото на весь экран',close:'Закрыть просмотр',zoomIn:'Увеличить',zoomOut:'Уменьшить',reset:'Сбросить масштаб',previous:'Предыдущее фото',next:'Следующее фото',hint:'Разведите пальцы, чтобы приблизить фото'}:language==='et'?{open:'Ava foto täisekraanil',close:'Sulge vaade',zoomIn:'Suurenda',zoomOut:'Vähenda',reset:'Lähtesta suurendus',previous:'Eelmine foto',next:'Järgmine foto',hint:'Suurendamiseks vii sõrmed lahku'}:{open:'Open photo fullscreen',close:'Close viewer',zoomIn:'Zoom in',zoomOut:'Zoom out',reset:'Reset zoom',previous:'Previous photo',next:'Next photo',hint:'Pinch out to zoom in'}
 function showImage(index:number){const gallery=galleryRef.current;if(!gallery)return;gallery.scrollTo({left:index*gallery.clientWidth,behavior:'smooth'});setActiveIndex(index)}
 function resetViewer(index:number|null){pointerPositions.current.clear();gesture.current=null;setInteracting(false);setViewerIndex(index);setZoom(1);setPan({x:0,y:0})}
 function openViewer(index:number){resetViewer(index)}
 function clampZoom(value:number){return Math.max(1,Math.min(4,value))}
 function boundedPan(x:number,y:number,nextZoom:number,image:HTMLImageElement){
  if(nextZoom<=1)return{x:0,y:0}
  const rect=image.getBoundingClientRect()
  const maxX=Math.max(0,rect.width/zoom*(nextZoom-1)/2)
  const maxY=Math.max(0,rect.height/zoom*(nextZoom-1)/2)
  return{x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))}
 }
 function changeZoom(next:number,image?:HTMLImageElement,anchorX?:number,anchorY?:number){
  const nextZoom=clampZoom(next)
  if(nextZoom<=1){setZoom(1);setPan({x:0,y:0});return}
  if(image&&anchorX!==undefined&&anchorY!==undefined&&zoom>0){
   const rect=image.getBoundingClientRect()
   const centerX=rect.left+rect.width/2-pan.x,centerY=rect.top+rect.height/2-pan.y
   const localX=(anchorX-centerX-pan.x)/zoom,localY=(anchorY-centerY-pan.y)/zoom
   setPan(boundedPan(anchorX-centerX-localX*nextZoom,anchorY-centerY-localY*nextZoom,nextZoom,image))
  }
  setZoom(nextZoom)
 }
 function pointerDown(event:React.PointerEvent<HTMLImageElement>){
  event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setInteracting(true)
  pointerPositions.current.set(event.pointerId,{x:event.clientX,y:event.clientY})
  const points=[...pointerPositions.current.values()]
  if(points.length===2){
   const midX=(points[0].x+points[1].x)/2,midY=(points[0].y+points[1].y)/2
   const dx=points[0].x-points[1].x,dy=points[0].y-points[1].y,rect=event.currentTarget.getBoundingClientRect()
   const originX=rect.left+rect.width/2-pan.x,originY=rect.top+rect.height/2-pan.y
   gesture.current={distance:Math.hypot(dx,dy),zoom,x:pan.x,y:pan.y,pointX:event.clientX,pointY:event.clientY,originX,originY,localX:(midX-originX-pan.x)/zoom,localY:(midY-originY-pan.y)/zoom}
  }else gesture.current={distance:0,zoom,x:pan.x,y:pan.y,pointX:event.clientX,pointY:event.clientY,originX:0,originY:0,localX:0,localY:0}
 }
 function pointerMove(event:React.PointerEvent<HTMLImageElement>){
  if(!pointerPositions.current.has(event.pointerId))return
  event.preventDefault();pointerPositions.current.set(event.pointerId,{x:event.clientX,y:event.clientY})
  const points=[...pointerPositions.current.values()],g=gesture.current;if(!g)return
  if(points.length===2&&g.distance){
   const dx=points[0].x-points[1].x,dy=points[0].y-points[1].y,distance=Math.hypot(dx,dy),nextZoom=clampZoom(g.zoom*distance/g.distance)
   const midX=(points[0].x+points[1].x)/2,midY=(points[0].y+points[1].y)/2
   setZoom(nextZoom);setPan(boundedPan(midX-g.originX-g.localX*nextZoom,midY-g.originY-g.localY*nextZoom,nextZoom,event.currentTarget))
  }else if(points.length===1&&zoom>1)setPan(boundedPan(g.x+event.clientX-g.pointX,g.y+event.clientY-g.pointY,zoom,event.currentTarget))
 }
 function pointerEnd(event:React.PointerEvent<HTMLImageElement>){
  pointerPositions.current.delete(event.pointerId);gesture.current=null
  if(pointerPositions.current.size===0)setInteracting(false)
 }
 useEffect(()=>{if(viewerIndex===null)return;const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')resetViewer(null);if(event.key==='ArrowRight')resetViewer((viewerIndex+1)%images.length);if(event.key==='ArrowLeft')resetViewer((viewerIndex-1+images.length)%images.length)};document.addEventListener('keydown',onKeyDown);const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previousOverflow}},[viewerIndex,images.length])
 return <div className="marketplace-detail-gallery">
  <div ref={galleryRef} className="marketplace-detail-images" role="group" aria-label={language==='ru'?'Фотографии: '+title:language==='et'?'Fotod: '+title:'Photos: '+title} onScroll={event=>{const width=event.currentTarget.clientWidth;if(width)setActiveIndex(Math.min(images.length-1,Math.round(event.currentTarget.scrollLeft/width)))}}>
   {images.map((src,index)=><button key={src+index} type="button" className="marketplace-detail-image-button" aria-label={text.open+' · '+label(index)} onClick={()=>openViewer(index)}><img src={marketplaceImageSrc(src,1600)} alt={title} loading={index===0?'eager':'lazy'} decoding="async"/></button>)}
  </div>
  {images.length>1&&<div className="marketplace-gallery-indicator">
   <span className="marketplace-gallery-count" aria-live="polite">{activeIndex+1} / {images.length}</span>
   <div className="marketplace-gallery-dots" role="group" aria-label={language==='ru'?'Выбрать фотографию':language==='et'?'Vali foto':'Choose a photo'}>
    {images.map((_,index)=><button key={index} type="button" className={index===activeIndex?'is-active':''} aria-label={label(index)} aria-current={index===activeIndex?'true':undefined} onClick={()=>showImage(index)}><span/></button>)}
   </div>
  </div>}
  {viewerIndex!==null&&<div className="marketplace-photo-viewer" role="dialog" aria-modal="true" aria-label={title} onClick={()=>resetViewer(null)}>
   <button type="button" className="marketplace-photo-viewer-close" aria-label={text.close} onClick={()=>resetViewer(null)}><X size={20}/></button>
   {images.length>1&&<button type="button" className="marketplace-photo-viewer-nav is-previous" aria-label={text.previous} onClick={event=>{event.stopPropagation();resetViewer((viewerIndex-1+images.length)%images.length)}}><ChevronDown size={22}/></button>}
   <img className={'marketplace-photo-viewer-image'+(interacting?' is-interacting':'')} src={marketplaceImageSrc(images[viewerIndex],2200)} alt={title} draggable={false} style={{transform:'translate('+pan.x+'px, '+pan.y+'px) scale('+zoom+')'}} onClick={event=>event.stopPropagation()} onDoubleClick={event=>{event.stopPropagation();const next=zoom>1?1:2;changeZoom(next,event.currentTarget,event.clientX,event.clientY)}} onWheel={event=>{event.preventDefault();changeZoom(zoom+(event.deltaY<0?.2:-.2),event.currentTarget,event.clientX,event.clientY)}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}/>
   {images.length>1&&<button type="button" className="marketplace-photo-viewer-nav is-next" aria-label={text.next} onClick={event=>{event.stopPropagation();resetViewer((viewerIndex+1)%images.length)}}><ChevronDown size={22}/></button>}
   <div className="marketplace-photo-viewer-toolbar" onClick={event=>event.stopPropagation()}>
    <button type="button" aria-label={text.zoomOut} onClick={()=>changeZoom(zoom-.2)} disabled={zoom<=1}><span>−</span></button><button type="button" className="marketplace-photo-viewer-reset" aria-label={text.reset} onClick={()=>{setZoom(1);setPan({x:0,y:0})}}>{Math.round(zoom*100)}%</button><button type="button" aria-label={text.zoomIn} onClick={()=>changeZoom(zoom+.2)} disabled={zoom>=4}><span>+</span></button>
   </div>
   <span className="marketplace-photo-viewer-count">{viewerIndex+1} / {images.length}</span><span className="marketplace-photo-viewer-hint">{text.hint}</span>
  </div>}
 </div>
}
function MarketplaceCard({item,language,favorite,onFavorite,onSelect}:{item:Listing;language:Language;favorite:boolean;onFavorite:()=>void;onSelect:()=>void}){
 const t=words[language]
 const categoryName=(value:string)=>{const c=categories.find(x=>x.en.toLowerCase()===value.toLowerCase());return c?c[language]:value}
 const conditionName=(value:string)=>t.conditionNames[conditionKey(value)]
 return <article className="marketplace-card">
  <button type="button" className="marketplace-card-open" onClick={onSelect}>
   <div className="marketplace-card-media">{item.images?.[0]?<img src={marketplaceImageSrc(item.images[0],640)} alt={item.title} loading="lazy" decoding="async"/>:<span>{t.noPhoto}</span>}<span className={`marketplace-auth-badge ${item.is_legit?'is-legit':'is-rep'}`}>{item.is_legit?'LEGIT':'R3p'}</span></div>
   <div className="marketplace-card-info"><span className="marketplace-card-category">{categoryName(item.category)}</span><strong>{item.title}</strong><div><span>{item.brand||conditionName(item.item_condition)}</span><b>€{Number(item.price).toFixed(2)}</b></div></div>
  </button>
  <button type="button" className={`marketplace-favorite-toggle ${favorite?'is-favorite':''}`} aria-label={favorite?t.removeFavorite:t.saveFavorite} aria-pressed={favorite} onClick={onFavorite}><Heart size={16} fill={favorite?'currentColor':'none'}/></button>
 </article>
}

export default function Marketplace({supabase,language,favorites,onFavorite}:{supabase:any;language:Language;favorites:string[];onFavorite:(id:string)=>void}){
 const t=words[language]
 const [items,setItems]=useState<Listing[]>([])
 const [sellers,setSellers]=useState<Record<string,Seller>>({})
 const [loading,setLoading]=useState(true)
 const [loadingMore,setLoadingMore]=useState(false)
 const [hasMore,setHasMore]=useState(false)
 const [totalCount,setTotalCount]=useState(0)
 const [error,setError]=useState('')
 const [query,setQuery]=useState('')
 const [category,setCategory]=useState('all')
 const [condition,setCondition]=useState('all')
 const [size,setSize]=useState('all')
 const [sort,setSort]=useState('newest')
 const [selected,setSelected]=useState<Listing|null>(null)
 const requestVersion=useRef(0)
 useEffect(()=>{let active=true;const version=++requestVersion.current;setLoadingMore(false);const timer=window.setTimeout(()=>{setLoading(true);setError('');(async()=>{try{
  if(!supabase)throw new Error(t.error)
  const {data,count,error}=await buildMarketplaceQuery(supabase,{query,category,condition,size,sort},true).range(0,MARKETPLACE_PAGE_SIZE-1)
  if(error)throw error
  const rows=(data||[]) as Listing[]
  const ids=Array.from(new Set(rows.map(item=>item.seller_id).filter(Boolean)))
  let profiles:Seller[]=[]
  if(ids.length){const result=await supabase.from('profiles').select('id,display_name,avatar_url,telegram_username').in('id',ids);if(!result.error)profiles=(result.data||[]) as Seller[]}
  if(!active||requestVersion.current!==version)return
  setItems(rows);setSellers(Object.fromEntries(profiles.map(profile=>[profile.id,profile])))
  const total=count??rows.length
  setTotalCount(total);setHasMore(rows.length<total)
 }catch(e){if(active&&requestVersion.current===version)setError(e instanceof Error?e.message:t.error)}finally{if(active&&requestVersion.current===version)setLoading(false)}})()},query.trim()?240:0);return()=>{active=false;window.clearTimeout(timer)}},[supabase,language,query,category,condition,size,sort])
 async function loadMore(){
  if(!supabase||loadingMore||!hasMore)return
  const offset=items.length,version=requestVersion.current
  setLoadingMore(true);setError('')
  try{
   const {data,error}=await buildMarketplaceQuery(supabase,{query,category,condition,size,sort}).range(offset,offset+MARKETPLACE_PAGE_SIZE-1)
   if(error)throw error
   if(version!==requestVersion.current)return
   const rows=(data||[]) as Listing[]
   const ids=Array.from(new Set(rows.map(item=>item.seller_id).filter(Boolean)))
   let profiles:Seller[]=[]
   if(ids.length){const result=await supabase.from('profiles').select('id,display_name,avatar_url,telegram_username').in('id',ids);if(!result.error)profiles=(result.data||[]) as Seller[]}
   if(version!==requestVersion.current)return
   setItems(current=>{const known=new Set(current.map(item=>item.id));return [...current,...rows.filter(item=>!known.has(item.id))]})
   setSellers(current=>({...current,...Object.fromEntries(profiles.map(profile=>[profile.id,profile]))}))
   setHasMore(offset+rows.length<totalCount)
  }catch(e){if(version===requestVersion.current)setError(e instanceof Error?e.message:t.error)}finally{if(version===requestVersion.current)setLoadingMore(false)}
 }
 const categoryName=(value:string)=>{const c=categories.find(x=>x.en.toLowerCase()===value.toLowerCase());return c?c[language]:value}
 const conditionName=(value:string)=>t.conditionNames[conditionKey(value)]
 const seller=(id:string)=>sellers[id]
 const telegram=(id:string)=>String(items.find(item=>item.seller_id===id&&item.telegram_username)?.telegram_username||seller(id)?.telegram_username||'').replace(/^@/,'')
 return <section className="marketplace-page page-pad page-top">
  <div className="marketplace-heading"><div><p className="eyebrow">{t.eyebrow}</p><h1 className="page-title">{t.title}</h1><p>{t.intro}</p></div><Package size={22}/></div>
  <div className="marketplace-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label={t.clear}><X size={15}/></button>}</div>
  <div className="marketplace-filter-row"><MarketDropdown value={category} onChange={setCategory} ariaLabel={t.category} options={[{value:'all',label:`${t.all} · ${t.category}`},...categories.map(c=>({value:c.en.toLowerCase(),label:c[language]}))]}/><MarketDropdown value={condition} onChange={setCondition} ariaLabel={t.condition} options={[{value:'all',label:`${t.all} · ${t.condition}`},...['new_with_tags','new_without_tags','excellent','good','defects'].map((v,i)=>({value:v,label:t.conditionNames[i]}))]}/></div>
  <div className="marketplace-sort"><span>{totalCount} {t.count}</span><div className="marketplace-sort-control"><MarketDropdown value={sort} onChange={setSort} ariaLabel={t.sort} options={[{value:'newest',label:t.newest},{value:'low',label:t.low},{value:'high',label:t.high}]}/></div></div>
  {loading?<div className="marketplace-loading"><LoaderCircle className="spin" size={22}/>{t.loading}</div>:error&&items.length===0?<div className="account-error">{error}</div>:items.length===0?<div className="marketplace-empty"><Package size={28}/><strong>{t.empty}</strong><span>{t.emptyHint}</span></div>:<div className="marketplace-grid">{items.map(item=><MarketplaceCard key={item.id} item={item} language={language} favorite={favorites.includes(marketplaceFavoriteKey(item.id))} onFavorite={()=>onFavorite(marketplaceFavoriteKey(item.id))} onSelect={()=>setSelected(item)}/>)}</div>}
  {error&&items.length>0&&<div className="account-error">{error}</div>}
  {hasMore&&!loading&&<button type="button" className="marketplace-load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore?<LoaderCircle className="spin" size={15}/>:<ChevronDown size={15}/>} {loadingMore?t.loadingMore:t.loadMore}</button>}
  {selected&&<div className="marketplace-overlay" role="dialog" aria-modal="true" aria-label={selected.title} onClick={()=>setSelected(null)}><div className="marketplace-detail" onClick={e=>e.stopPropagation()}><button className="marketplace-detail-close" type="button" onClick={()=>setSelected(null)} aria-label={t.close}><X size={19}/></button><MarketplacePhotoGallery images={selected.images||[]} title={selected.title} language={language}/><div className="marketplace-detail-content"><p className="eyebrow">{categoryName(selected.category)}</p><div className="marketplace-detail-title"><h2>{selected.title}</h2><strong>€{Number(selected.price).toFixed(2)}</strong></div><span className={`marketplace-auth-badge detail-badge ${selected.is_legit?'is-legit':'is-rep'}`}>{selected.is_legit?'LEGIT':'R3p'}</span><div className="marketplace-specs"><span>{t.sizeLabel}: <b>{selected.size_label||'—'}</b></span><span>{t.condition}: <b>{conditionName(selected.item_condition)}</b></span><span>{t.colors}: <b>{(selected.colors||[]).map(c=>c.name).join(', ')||'—'}</b></span></div><h3>{t.description}</h3><p className="marketplace-description">{selected.description}</p><div className="marketplace-seller"><MarketplaceSellerAvatar src={seller(selected.seller_id)?.avatar_url}/><div><small>{t.seller}</small><strong>{seller(selected.seller_id)?.display_name||t.noSeller}</strong></div></div>{telegram(selected.seller_id)?<a className="marketplace-contact" href={`https://t.me/${encodeURIComponent(telegram(selected.seller_id))}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{t.contact}<ArrowUpRight size={15}/></a>:<p className="marketplace-contact-disabled">{language==='ru'?'Продавец не указал Telegram':language==='et'?'Müüja pole Telegrami lisanud':'Seller has not added Telegram'}</p>}</div></div></div>}
 </section>
}


export function MarketplaceFavorites({supabase,language,favoriteIds,onFavorite}:{supabase:any;language:Language;favoriteIds:string[];onFavorite:(id:string)=>void}){
 const t=words[language]
 const [items,setItems]=useState<Listing[]>([])
 const [sellers,setSellers]=useState<Record<string,Seller>>({})
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [selected,setSelected]=useState<Listing|null>(null)
 const ids=useMemo(()=>Array.from(new Set(favoriteIds.filter(Boolean))),[favoriteIds.join('|')])
 useEffect(()=>{let active=true;if(!ids.length){setItems([]);setSellers({});setError('');setLoading(false);return()=>{active=false}};setLoading(true);setError('');(async()=>{try{
  if(!supabase)throw new Error(t.error)
  const {data,error}=await supabase.from('marketplace_listings').select('id,seller_id,telegram_username,title,description,price,category,brand,size_label,item_condition,is_legit,colors,images,created_at,status').in('id',ids).eq('status','approved')
  if(error)throw error
  const rows=(data||[]) as Listing[]
  const sellerIds=Array.from(new Set(rows.map(item=>item.seller_id).filter(Boolean)))
  let profiles:Seller[]=[]
  if(sellerIds.length){const result=await supabase.from('profiles').select('id,display_name,avatar_url,telegram_username').in('id',sellerIds);if(!result.error)profiles=(result.data||[]) as Seller[]}
  if(active){setItems(rows.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)));setSellers(Object.fromEntries(profiles.map(profile=>[profile.id,profile])))}
 }catch(e){if(active)setError(e instanceof Error?e.message:t.error)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[supabase,ids.join('|'),language])
 if(!favoriteIds.length)return null
 return <section className="marketplace-saved-section"><div className="catalog-head"><div><p>{t.eyebrow}</p><h2>{t.saved}</h2></div><span className="favorite-count">{items.length} {t.count}</span></div>{loading?<div className="marketplace-loading"><LoaderCircle className="spin" size={20}/>{t.loading}</div>:error?<div className="account-error">{error}</div>:items.length===0?<div className="marketplace-empty compact"><Package size={22}/><span>{language==='ru'?'Сохранённые объявления больше недоступны.':language==='et'?'Salvestatud kuulutused pole enam saadaval.':'Saved listings are no longer available.'}</span></div>:<div className="marketplace-grid">{items.map(item=><MarketplaceCard key={item.id} item={item} language={language} favorite onFavorite={()=>onFavorite(marketplaceFavoriteKey(item.id))} onSelect={()=>setSelected(item)}/>)}</div>}{selected&&<div className="marketplace-overlay" role="dialog" aria-modal="true" aria-label={selected.title} onClick={()=>setSelected(null)}><div className="marketplace-detail" onClick={e=>e.stopPropagation()}><button className="marketplace-detail-close" type="button" onClick={()=>setSelected(null)} aria-label={t.close}><X size={19}/></button><MarketplacePhotoGallery images={selected.images||[]} title={selected.title} language={language}/><div className="marketplace-detail-content"><p className="eyebrow">{selected.category}</p><div className="marketplace-detail-title"><h2>{selected.title}</h2><strong>€{Number(selected.price).toFixed(2)}</strong></div><button type="button" className={`marketplace-detail-favorite ${favoriteIds.includes(marketplaceFavoriteKey(selected.id))?'is-favorite':''}`} aria-label={favoriteIds.includes(marketplaceFavoriteKey(selected.id))?t.removeFavorite:t.saveFavorite} aria-pressed={favoriteIds.includes(marketplaceFavoriteKey(selected.id))} onClick={()=>onFavorite(marketplaceFavoriteKey(selected.id))}><Heart size={16} fill={favoriteIds.includes(marketplaceFavoriteKey(selected.id))?'currentColor':'none'}/>{favoriteIds.includes(marketplaceFavoriteKey(selected.id))?t.removeFavorite:t.saveFavorite}</button><p className="marketplace-description">{selected.description}</p>{selected.telegram_username&&<a className="marketplace-contact" href={`https://t.me/${encodeURIComponent(selected.telegram_username.replace(/^@/,''))}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{t.contact}<ArrowUpRight size={15}/></a>}</div></div></div>}</section>
}
