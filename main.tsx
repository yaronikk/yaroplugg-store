import React,{useEffect,useMemo,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {createClient, type User} from '@supabase/supabase-js'
import {Search,House,UserRound,X,SlidersHorizontal,Heart,ChevronDown,ArrowUpRight,ChevronLeft,ChevronRight,ZoomIn,ZoomOut,Plus,Minus,Trash2,LogOut,Package,ImagePlus,Pencil,Check,Upload,LoaderCircle} from 'lucide-react'
import './index.css'
import {products as demoProducts} from './data'
import type {Category,Product} from './types'

type Screen='home'|'catalog'|'favorites'|'profile'
const cats=['All','T-Shirts','Hoodies','Pants','Jackets','Belts'] as unknown as Category[]
const sizes=['S','M','L','XL']

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL as string|undefined
const supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined
const supabase=supabaseUrl&&supabaseKey?createClient(supabaseUrl,supabaseKey):null

function readStorage<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}

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
function normalizeColors(value:any):AdminColor[]{
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

function dbProduct(row:any):Product & {lengths:string[];stock:number}{
 const category=(row.category?.name||'T-Shirts') as Exclude<Category,'All'>
 const colors=normalizeColors(row.colors)
 const images=Array.isArray(row.images)?row.images.filter(Boolean):(typeof row.images==='string'?[row.images].filter(Boolean):[])
 return {id:row.id,name:row.name,category,price:Number(row.price),description:row.description||'',composition:row.composition||'',sizes:Array.isArray(row.sizes)?row.sizes:[],lengths:Array.isArray(row.lengths)?row.lengths:[],colors,images:images.length?images:(row.image_url?[row.image_url]:[]),featured:Boolean(row.featured),stock:Math.max(0,Number(row.stock)||0)}
}

const STORE_CACHE_KEY='yp-store-products-v1'
const STORE_CACHE_TTL=5*60*1000

function readStoreCache():Product[]|null{
 try{
  const raw=localStorage.getItem(STORE_CACHE_KEY)
  if(!raw)return null
  const parsed=JSON.parse(raw)
  if(!parsed||!Array.isArray(parsed.items)||Date.now()-Number(parsed.savedAt||0)>STORE_CACHE_TTL)return null
  return parsed.items as Product[]
 }catch{return null}
}
function writeStoreCache(items:Product[]){try{localStorage.setItem(STORE_CACHE_KEY,JSON.stringify({savedAt:Date.now(),items}))}catch{}}

async function fetchStoreProducts():Promise<Product[]>{
 if(!supabase)return demoProducts
 const {data,error}=await supabase
  .from('products')
  .select('id,name,price,description,composition,sizes,lengths,colors,images,image_url,stock,featured,sort_order,created_at,category:categories(name)')
  .eq('is_active',true)
  .order('sort_order',{ascending:true})
  .order('created_at',{ascending:false})
 if(error||!data)return []
 const items=data.map(dbProduct)
 writeStoreCache(items)
 return items
}

function App(){
 const [screen,setScreen]=useState<Screen>('home')
 const [selected,setSelected]=useState<Product|null>(null)
 const [query,setQuery]=useState('')
 const [cat,setCat]=useState<Category>('All')
 const [showFilters,setShowFilters]=useState(false)
 const [filterSize,setFilterSize]=useState('All')
 const [filterColor,setFilterColor]=useState('All')
 const [maxPrice,setMaxPrice]=useState(100)
 const [toast,setToast]=useState('')
 const [favorites,setFavorites]=useState<string[]>(()=>Array.from(new Set(readStorage<string[]>('yp-favorites',[]).filter(Boolean))))
 const [products,setProducts]=useState<Product[]>(()=>readStoreCache()||demoProducts)
 const [storeLoading,setStoreLoading]=useState(true)
 const [storeError,setStoreError]=useState('')
 const colors=useMemo(()=>['All',...Array.from(new Set(products.flatMap(p=>p.colors.map(c=>c.name))))], [products])
 const filtered=useMemo(()=>products.filter(p=>{const text=p.name.toLowerCase().includes(query.toLowerCase())||p.description.toLowerCase().includes(query.toLowerCase());const size=p.category==='Belts'||filterSize==='All'||p.sizes.includes(filterSize);const color=filterColor==='All'||p.colors.some(c=>c.name===filterColor);return(cat==='All'||p.category===cat)&&text&&size&&color&&p.price<=maxPrice}),[products,cat,query,filterSize,filterColor,maxPrice])
 useEffect(()=>{localStorage.setItem('yp-favorites',JSON.stringify(favorites))},[favorites])
 useEffect(()=>{const tg=(window as any).Telegram?.WebApp;if(tg){tg.ready();tg.expand()}},[])
 useEffect(()=>{let active=true;(async()=>{setStoreLoading(true);const items=await fetchStoreProducts();if(!active)return;if(items.length){setProducts(items);setStoreError('')}else if(!readStoreCache()){setProducts(demoProducts);setStoreError('Could not refresh the catalog. Showing the local catalog.')}setStoreLoading(false)})().catch(()=>{if(active){setStoreLoading(false);setStoreError('Could not refresh the catalog. Showing the local catalog.')}});return()=>{active=false}},[])
 function notify(v:string){setToast(v);window.setTimeout(()=>setToast(''),1500)}
 function toggleFavorite(id:string){setFavorites(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id])}
 function openCategory(c:Category){setCat(c);setScreen('catalog');window.scrollTo({top:0,behavior:'smooth'})}
 return <div className="app-shell"><main className="store-shell safe-bottom">
  <header className="site-header"><button onClick={()=>setScreen('home')} className="brand-button" aria-label="YAROPLUGG home"><img src="/logo.png" alt="YAROPLUGG" className="brand-logo"/></button><div className="header-actions"><button onClick={()=>{setScreen('catalog');setTimeout(()=>document.getElementById('search')?.focus(),50)}} className="icon-button" aria-label="Search"><Search size={18}/></button></div></header>
  {screen==='home'&&<Home onCatalog={()=>setScreen('catalog')} onCategory={openCategory} onProduct={setSelected} favorites={favorites} onFavorite={toggleFavorite} products={products}/>} 
  {screen==='catalog'&&<Catalog query={query} setQuery={setQuery} cat={cat} setCat={setCat} products={filtered} onProduct={setSelected} onFilters={()=>setShowFilters(true)} favorites={favorites} onFavorite={toggleFavorite}/>} 
  {screen==='favorites'&&<Favorites products={products.filter(p=>favorites.includes(p.id))} onProduct={setSelected} favorites={favorites} onFavorite={toggleFavorite}/>} 
  {screen==='profile'&&<Profile favorites={favorites}/>} {storeLoading&&<div className="store-loading-bar" aria-label="Loading catalog"><span/></div>} {storeError&&<div className="store-refresh-note">{storeError}</div>}
  <nav className="bottom-nav" aria-label="Main navigation"><Nav icon={<House size={17}/>} label="SHOP" active={screen==='home'} onClick={()=>setScreen('home')}/><Nav icon={<Search size={17}/>} label="CATEGORIES" active={screen==='catalog'} onClick={()=>setScreen('catalog')}/><Nav icon={<Heart size={17}/>} label="FAVORITES" active={screen==='favorites'} onClick={()=>setScreen('favorites')} badge={favorites.length} ariaLabel={`Favorites, ${favorites.length} ${favorites.length===1?'item':'items'}`}/><Nav icon={<UserRound size={17}/>} label="PROFILE" active={screen==='profile'} onClick={()=>setScreen('profile')}/></nav>
  {selected&&<ProductModal product={selected} onClose={()=>setSelected(null)} onFavorite={()=>{toggleFavorite(selected.id);notify(favorites.includes(selected.id)?'Removed from favorites':'Added to favorites')}} favorite={favorites.includes(selected.id)}/>} {showFilters&&<Filters size={filterSize} color={filterColor} maxPrice={maxPrice} colors={colors} onClose={()=>setShowFilters(false)} onApply={(s,c,p)=>{setFilterSize(s);setFilterColor(c);setMaxPrice(p);setShowFilters(false)}}/>} {toast&&<div className="toast">{toast}</div>}
 </main></div>
}
function Nav({icon,label,active,onClick,badge=0,ariaLabel}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void;badge?:number;ariaLabel?:string}){const displayBadge=badge>99?'99+':String(badge);return <button onClick={onClick} className={`nav-item ${active?'is-active':''}`} aria-label={ariaLabel||label}><span className="nav-icon-wrap"><span className="nav-icon">{icon}</span>{badge>0&&<span className="nav-badge" aria-hidden="true">{displayBadge}</span>}</span><span>{label}</span></button>}
function Home({onCatalog,onCategory,onProduct,favorites,onFavorite,products}:{onCatalog:()=>void;onCategory:(c:Category)=>void;onProduct:(p:Product)=>void;favorites:string[];onFavorite:(id:string)=>void;products:Product[]}){return <div className="page-pad"><section className="hero-card"><button onClick={onCatalog} className="hero-image-button" aria-label="Shop new collection"><img src="/hero-drop.png" alt="YAROPLUGG New Drop collection" loading="eager" decoding="async"/></button></section><div className="category-strip">{cats.slice(1).map(c=><button key={c} onClick={()=>onCategory(c)}>{c.toUpperCase()}</button>)}</div><div className="section-head"><div><p>SELECTED</p><h2>NEW IN</h2></div><button onClick={onCatalog}>VIEW ALL <ArrowUpRight size={14}/></button></div><div className="product-grid">{products.filter(p=>p.featured).map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div></div>}
function Catalog({query,setQuery,cat,setCat,products,onProduct,onFilters,favorites,onFavorite}:{query:string;setQuery:(v:string)=>void;cat:Category;setCat:(v:Category)=>void;products:Product[];onProduct:(p:Product)=>void;onFilters:()=>void;favorites:string[];onFavorite:(id:string)=>void}){return <div className="page-pad"><div className="catalog-head"><div><p>COLLECTION</p><h1>SHOP ALL</h1></div><button onClick={onFilters} className="filter-button" aria-label="Filters"><SlidersHorizontal size={17}/></button></div><div className="search-box"><Search size={17}/><input id="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="SEARCH PRODUCTS"/></div><div className="category-strip catalog-tabs">{cats.map(c=><button key={c} onClick={()=>setCat(c)} className={cat===c?'active':''}>{c.toUpperCase()}</button>)}</div><div className="catalog-meta"><span>{products.length} PRODUCTS</span><span>€20 — €100</span></div><div className="product-grid">{products.map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>{products.length===0&&<div className="empty-state">NO PRODUCTS FOUND</div>}</div>}
function Favorites({products,onProduct,favorites,onFavorite}:{products:Product[];onProduct:(p:Product)=>void;favorites:string[];onFavorite:(id:string)=>void}){return <div className="page-pad page-top"><div className="catalog-head"><div><p>YOUR SELECTION</p><h1>FAVORITES</h1></div><span className="favorite-count">{products.length} SAVED</span></div>{products.length===0?<div className="empty-card favorites-empty"><Heart size={22}/><h2>YOUR FAVORITES ARE EMPTY</h2><p>Tap the heart on any product to save it here.</p></div>:<div className="product-grid">{products.map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>}</div>}
function ProductCard({p,onClick,favorite,onFavorite}:{p:Product;onClick:()=>void;favorite:boolean;onFavorite:()=>void}){return <article className="product-card"><div className="product-media"><button onClick={onClick} className="media-button"><img src={p.images[0]} alt={p.name} loading="lazy" decoding="async"/></button><button onClick={e=>{e.stopPropagation();onFavorite()}} className="favorite-button" aria-label={favorite?'Remove from favorites':'Add to favorites'}><Heart size={15} fill={favorite?'currentColor':'none'} className={favorite?'favorite-on':''}/></button></div><button onClick={onClick} className="product-info"><div className="product-name">{p.name}</div><div className="product-price">€{p.price}</div></button></article>}
function ProductModal({product,onClose,onFavorite,favorite}:{product:Product;onClose:()=>void;onFavorite:()=>void;favorite:boolean}){
 const[color,setColor]=useState(product.colors[0]?.name||'');
 const[imageIndex,setImageIndex]=useState(0);
 const[viewerOpen,setViewerOpen]=useState(false);
 const[viewerIndex,setViewerIndex]=useState(0);
 const[zoom,setZoom]=useState(1);
 const[pan,setPan]=useState({x:0,y:0});
 const images=product.images?.filter(Boolean)||[];
 const galleryRef=useRef<HTMLDivElement|null>(null);
 const viewerTouchStart=useRef<number|null>(null);
 const dragRef=useRef<{active:boolean;x:number;y:number;startX:number;startY:number}>({active:false,x:0,y:0,startX:0,startY:0});
 const pointersRef=useRef<Map<number,{x:number;y:number}>>(new Map());
 const pinchRef=useRef<{distance:number;zoom:number}|null>(null);
 const handleGalleryScroll=()=>{const el=galleryRef.current;if(!el||!el.clientWidth)return;setImageIndex(Math.round(el.scrollLeft/el.clientWidth))};
 const openViewer=(i:number)=>{setViewerIndex(i);setZoom(1);setPan({x:0,y:0});setViewerOpen(true)};
 const closeViewer=()=>{setViewerOpen(false);setZoom(1);setPan({x:0,y:0});};
 const prevViewer=()=>{setViewerIndex(i=>(i-1+images.length)%images.length);setZoom(1);setPan({x:0,y:0})};
 const nextViewer=()=>{setViewerIndex(i=>(i+1)%images.length);setZoom(1);setPan({x:0,y:0})};
 const changeZoom=(delta:number)=>{setZoom(z=>{const next=Math.min(3,Math.max(1,Number((z+delta).toFixed(2))));if(next===1)setPan({x:0,y:0});return next})};
 const resetZoom=()=>{setZoom(1);setPan({x:0,y:0})};
 const handlePointerDown=(e:React.PointerEvent<HTMLImageElement>)=>{
  pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  e.currentTarget.setPointerCapture?.(e.pointerId);
  if(pointersRef.current.size===2){
   const pts=[...pointersRef.current.values()];
   pinchRef.current={distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),zoom};
   dragRef.current.active=false;
  }else if(zoom>1){dragRef.current={active:true,x:e.clientX,y:e.clientY,startX:pan.x,startY:pan.y};}
 };
 const handlePointerMove=(e:React.PointerEvent<HTMLImageElement>)=>{
  if(pointersRef.current.has(e.pointerId))pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointersRef.current.size===2&&pinchRef.current){
   const pts=[...pointersRef.current.values()];
   const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
   const next=Math.min(3,Math.max(1,pinchRef.current.zoom*(distance/Math.max(1,pinchRef.current.distance))));
   setZoom(next);if(next===1)setPan({x:0,y:0});return;
  }
  if(dragRef.current.active&&zoom>1)setPan({x:dragRef.current.startX+(e.clientX-dragRef.current.x),y:dragRef.current.startY+(e.clientY-dragRef.current.y)});
 };
 const handlePointerUp=(e:React.PointerEvent<HTMLImageElement>)=>{pointersRef.current.delete(e.pointerId);if(pointersRef.current.size<2)pinchRef.current=null;dragRef.current.active=false;};
 const handleWheel=(e:React.WheelEvent<HTMLImageElement>)=>{e.preventDefault();changeZoom(e.deltaY<0?.25:-.25)};
 const handleDoubleClick=()=>{if(zoom>1)resetZoom();else setZoom(2.2)};
 return <><div className="modal-backdrop"><div className="sheet product-sheet"><div className="modal-media"><div ref={galleryRef} onScroll={handleGalleryScroll} className="product-swipe-gallery" aria-label="Product photos" role="region">{images.length?images.map((url,i)=><button type="button" className="product-swipe-slide" key={`${url}-${i}`} onClick={()=>openViewer(i)} aria-label={`Open ${product.name} photo ${i+1} in full screen`}><img src={url} alt={`${product.name} photo ${i+1}`} loading={i===0?'eager':'lazy'} decoding="async"/></button>):<div className="image-placeholder">NO IMAGE</div>}</div><button onClick={onClose} className="close-button" aria-label="Close"><X size={18}/></button>{images.length>1&&<div className="gallery-dots" aria-label={`Photo ${imageIndex+1} of ${images.length}`}>{images.map((_,i)=><span key={i} className={i===imageIndex?'active':''}/>)}</div>}</div><div className="sheet-content product-sheet-content"><div className="product-title-row"><div><div className="eyebrow red">{product.category}</div><h2>{product.name}</h2></div><div className="modal-price">€{product.price}</div></div><div className={`stock-note ${Math.max(0,Number((product as Product & {stock?:number}).stock)||0)===0?'is-out':''}`}>{Math.max(0,Number((product as Product & {stock?:number}).stock)||0)>0?<><span>IN STOCK</span><b>{Math.max(0,Number((product as Product & {stock?:number}).stock)||0)}</b><em>AVAILABLE</em></>:'OUT OF STOCK'}</div><p className="description">{product.description}</p>{isBeltCategory(product.category)?<div className="option-block"><div className="option-label">BELT LENGTH</div><div className="option-row">{((product as Product & {lengths?:string[]}).lengths||[]).map(l=><span key={l} className="view-size">{l} CM</span>)}</div></div>:<div className="option-block"><div className="option-label">AVAILABLE SIZES</div><div className="option-row">{product.sizes.map(s=><span key={s} className="view-size">{s}</span>)}</div></div>}<div className="option-block"><div className="option-label">COLOR · {color.toUpperCase()}</div><div className="color-row">{product.colors.map(c=><button key={c.name} aria-label={c.name} onClick={()=>setColor(c.name)} style={{background:c.hex}} className={color===c.name?'color-selected':''}/>)}</div></div><div className="composition">COMPOSITION: {product.composition}</div><button onClick={onFavorite} className="primary-red favorite-product-button"><Heart size={15} fill={favorite?'currentColor':'none'}/>{favorite?'REMOVE FROM FAVORITES':'SAVE TO FAVORITES'}</button><div className="view-only-note">VIEW ONLY · PURCHASE COMING SOON</div></div></div></div>{viewerOpen&&images.length>0&&<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} photo viewer`} onClick={closeViewer} onTouchStart={e=>{if(zoom===1&&e.touches.length===1)viewerTouchStart.current=e.touches[0].clientX}} onTouchEnd={e=>{if(zoom!==1){viewerTouchStart.current=null;return}const start=viewerTouchStart.current;viewerTouchStart.current=null;if(start===null)return;const dx=e.changedTouches[0].clientX-start;if(Math.abs(dx)>50){if(dx<0)nextViewer();else prevViewer()}}}>
  <button type="button" className="photo-lightbox-close" onClick={e=>{e.stopPropagation();closeViewer()}} aria-label="Close photo viewer"><X size={22}/></button>
  <div className="photo-lightbox-tools" onClick={e=>e.stopPropagation()}><button type="button" onClick={()=>changeZoom(-.25)} disabled={zoom<=1} aria-label="Zoom out"><ZoomOut size={18}/></button><span>{Math.round(zoom*100)}%</span><button type="button" onClick={()=>changeZoom(.25)} disabled={zoom>=3} aria-label="Zoom in"><ZoomIn size={18}/></button><button type="button" onClick={resetZoom} disabled={zoom===1} aria-label="Reset zoom">RESET</button></div>
  {images.length>1&&<button type="button" className="photo-lightbox-arrow prev" onClick={e=>{e.stopPropagation();prevViewer()}} aria-label="Previous photo"><ChevronLeft size={28}/></button>}
  <img className={`photo-lightbox-image ${zoom>1?'is-zoomed':''}`} src={images[viewerIndex]} alt={`${product.name} photo ${viewerIndex+1}`} style={{transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`}} onClick={e=>e.stopPropagation()} onDoubleClick={e=>{e.stopPropagation();handleDoubleClick()}} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}/>
  {images.length>1&&<button type="button" className="photo-lightbox-arrow next" onClick={e=>{e.stopPropagation();nextViewer()}} aria-label="Next photo"><ChevronRight size={28}/></button>}
  <div className="photo-lightbox-count">{viewerIndex+1} / {images.length} · {zoom>1?'DRAG TO PAN':'PINCH / DOUBLE-TAP TO ZOOM'}</div>
 </div>}</>}

function Filters({size,color,maxPrice,colors,onClose,onApply}:{size:string;color:string;maxPrice:number;colors:string[];onClose:()=>void;onApply:(s:string,c:string,p:number)=>void}){const[s,setS]=useState(size),[c,setC]=useState(color),[p,setP]=useState(maxPrice);return <div className="modal-backdrop align-end"><div className="sheet filter-sheet"><div className="sheet-title-row"><h2>FILTERS</h2><button onClick={onClose} className="close-button small"><X size={18}/></button></div><div className="filter-group"><div className="option-label">SIZE</div><div className="option-row wrap">{['All',...sizes].map(x=><button key={x} onClick={()=>setS(x)} className={s===x?'selected':''}>{x}</button>)}</div></div><div className="filter-group"><div className="option-label">COLOR</div><div className="select-wrap"><select value={c} onChange={e=>setC(e.target.value)}>{colors.map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={18}/></div></div><div className="filter-group"><div className="price-line"><span className="option-label">MAXIMUM PRICE</span><span>€{p}</span></div><input type="range" min="20" max="100" value={p} onChange={e=>setP(Number(e.target.value))}/></div><button onClick={()=>onApply(s,c,p)} className="primary-red">APPLY FILTERS</button></div></div>}
function Profile({favorites}:{favorites:string[]}){return <div className="page-pad page-top"><p className="eyebrow red">YAROPLUGG</p><h1 className="page-title">PROFILE</h1><div className="profile-card"><img src="/logo.png" alt="YAROPLUGG"/><div className="field-label">STORE MODE</div><div className="profile-title">Preview only</div><p>Browse the collection, save your favorites and view product details. Online checkout is not available yet.</p></div><div className="support-card">{favorites.length} SAVED FAVORITES</div></div>}

// ---------------- ADMIN ----------------
type AdminImage={url:string;existing:boolean}
type AdminColor={name:string;hex:string}
const isBeltCategory=(category:string)=>category.trim().toLowerCase()==='belts'
type AdminProductForm={name:string;price:string;category:string;description:string;composition:string;sizes:string[];lengths:string[];colors:AdminColor[];stock:string;isActive:boolean;isNew:boolean;featured:boolean;sortOrder:string;images:AdminImage[]}

const MAX_PRODUCT_IMAGES=8
const MAX_IMAGE_SIZE=10*1024*1024
const ALLOWED_IMAGE_TYPES=['image/jpeg','image/png','image/webp']
const COLOR_PALETTE:AdminColor[]=[
 {name:'Black',hex:'#0b0b0b'},{name:'White',hex:'#ffffff'},{name:'Cream',hex:'#e9e2d6'},
 {name:'Grey',hex:'#8b8b8b'},{name:'Light Grey',hex:'#c8c8c8'},{name:'Red',hex:'#f52222'},
 {name:'Burgundy',hex:'#6d1020'},{name:'Navy',hex:'#18243a'},{name:'Blue',hex:'#2457a6'},
 {name:'Green',hex:'#315b3c'},{name:'Olive',hex:'#687044'},{name:'Brown',hex:'#6b4935'},
 {name:'Beige',hex:'#c9b79c'},{name:'Pink',hex:'#d97893'},{name:'Purple',hex:'#6e4c8f'},
 {name:'Orange',hex:'#d96b24'},{name:'Yellow',hex:'#d6aa24'}
]

const emptyForm:AdminProductForm={name:'',price:'',category:'T-Shirts',description:'',composition:'',sizes:['S','M','L','XL'],lengths:[],colors:[{name:'Black',hex:'#0b0b0b'}],stock:'0',isActive:true,isNew:true,featured:false,sortOrder:'0',images:[]}

function AdminApp(){
 const [user,setUser]=useState<User|null>(null)
 const [loading,setLoading]=useState(true)
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [authError,setAuthError]=useState('')
 const [adminProducts,setAdminProducts]=useState<any[]>([])
 const [categories,setCategories]=useState<any[]>([])
 const [showForm,setShowForm]=useState(false)
 const [editing,setEditing]=useState<any|null>(null)
 const [form,setForm]=useState<AdminProductForm>(emptyForm)
 const [saving,setSaving]=useState(false)
 const [message,setMessage]=useState('')
 const [uploading,setUploading]=useState(false)
 const [newUploadedUrls,setNewUploadedUrls]=useState<string[]>([])
 const [removedExistingUrls,setRemovedExistingUrls]=useState<string[]>([])
 const [stockSavingId,setStockSavingId]=useState<string|null>(null)

 useEffect(()=>{
  if(!supabase){setLoading(false);return}
  supabase.auth.getSession().then(({data})=>{setUser(data.session?.user??null);setLoading(false)})
  const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null))
  return ()=>listener.subscription.unsubscribe()
 },[])
 useEffect(()=>{if(user)loadAdminData()},[user])

 async function loadAdminData(){
  if(!supabase)return
  const [{data:ps,error:pe},{data:cs,error:ce}]=await Promise.all([
   supabase.from('products').select('*, category:categories(name,slug)').order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
   supabase.from('categories').select('*').order('sort_order',{ascending:true})
  ])
  if(pe||ce){setMessage(pe?.message||ce?.message||'Could not load admin data');return}
  setAdminProducts(ps||[]);setCategories(cs||[])
 }
 async function login(e:React.FormEvent){e.preventDefault();setAuthError('');if(!supabase){setAuthError('Supabase is not configured in this deployment.');return}const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setAuthError(error.message)}
 async function logout(){await supabase?.auth.signOut()}
 function startAdd(){setEditing(null);setForm({...emptyForm,colors:emptyForm.colors.map(c=>({...c})),sizes:[...emptyForm.sizes],lengths:[],images:[]});setNewUploadedUrls([]);setRemovedExistingUrls([]);setShowForm(true);setMessage('')}
 function startEdit(p:any){
  const colors=normalizeColors(p.colors)
  const urls=Array.isArray(p.images)&&p.images.length?p.images:(p.image_url?[p.image_url]:[])
  setEditing(p)
  setForm({name:p.name,price:String(p.price),category:p.category?.name||'T-Shirts',description:p.description||'',composition:p.composition||'',sizes:p.sizes||[],lengths:Array.isArray(p.lengths)?p.lengths:[],colors,stock:String(p.stock??0),isActive:Boolean(p.is_active),isNew:Boolean(p.is_new),featured:Boolean(p.featured),sortOrder:String(p.sort_order??0),images:urls.map((url:string)=>({url,existing:true}))})
  setNewUploadedUrls([]);setRemovedExistingUrls([]);setShowForm(true);setMessage('')
 }
 function colorIsSelected(color:AdminColor){return form.colors.some(c=>c.name.toLowerCase()===color.name.toLowerCase())}
 function toggleColor(color:AdminColor){setForm(f=>({...f,colors:colorIsSelected(color)?f.colors.filter(c=>c.name.toLowerCase()!==color.name.toLowerCase()):[...f.colors,{...color}]}))}
 function addCustomColor(name:string,hex:string){const clean=name.trim();if(!clean)return false;if(!/^#[0-9a-fA-F]{6}$/.test(hex))return false;if(form.colors.some(c=>c.name.toLowerCase()===clean.toLowerCase()))return false;setForm(f=>({...f,colors:[...f.colors,{name:clean,hex:hex.toLowerCase()}]}));return true}
 function removeColor(name:string){setForm(f=>({...f,colors:f.colors.filter(c=>c.name!==name)}))}
 function storagePathFromUrl(url:string){const marker='/storage/v1/object/public/product-images/';const i=url.indexOf(marker);return i>=0?decodeURIComponent(url.slice(i+marker.length)):''}
 async function removeStorageUrls(urls:string[]){if(!supabase||!urls.length)return;const paths=urls.map(storagePathFromUrl).filter(Boolean);if(paths.length)await supabase.storage.from('product-images').remove(paths)}
 async function uploadFiles(files:File[]){
  if(!supabase||!user||!files.length)return
  const current=form.images.length
  const available=MAX_PRODUCT_IMAGES-current
  if(available<=0){setMessage(`Maximum ${MAX_PRODUCT_IMAGES} images per product.`);return}
  const selected=files.slice(0,available)
  if(files.length>available)setMessage(`Only ${available} more image${available===1?'':'s'} can be added.`);else setMessage('')
  const valid=selected.filter(file=>ALLOWED_IMAGE_TYPES.includes(file.type)&&file.size<=MAX_IMAGE_SIZE)
  if(valid.length!==selected.length){setMessage(`Use JPG, JPEG, PNG or WEBP files up to 10 MB each.`)}
  if(!valid.length)return
  setUploading(true)
  const added:AdminImage[]=[]
  const addedUrls:string[]=[]
  for(const file of valid){
   const ext=file.name.split('.').pop()?.toLowerCase()||'jpg'
   const path=`${crypto.randomUUID()}.${ext}`
   const {error}=await supabase.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false})
   if(error){setMessage(error.message);continue}
   const {data}=supabase.storage.from('product-images').getPublicUrl(path)
   added.push({url:data.publicUrl,existing:false});addedUrls.push(data.publicUrl)
  }
  if(added.length){setForm(f=>({...f,images:[...f.images,...added]}));setNewUploadedUrls(v=>[...v,...addedUrls])}
  setUploading(false)
 }
 function removeImage(index:number){
  const image=form.images[index]
  if(!image)return
  setForm(f=>({...f,images:f.images.filter((_,i)=>i!==index)}))
  if(image.existing)setRemovedExistingUrls(v=>v.includes(image.url)?v:[...v,image.url])
  else{setNewUploadedUrls(v=>v.filter(url=>url!==image.url));void removeStorageUrls([image.url])}
 }
 function moveImage(index:number,direction:-1|1){
  setForm(f=>{const next=[...f.images];const target=index+direction;if(target<0||target>=next.length)return f;[next[index],next[target]]=[next[target],next[index]];return {...f,images:next}})
 }
 function makeMain(index:number){setForm(f=>{if(index===0)return f;const next=[...f.images];const [item]=next.splice(index,1);next.unshift(item);return {...f,images:next}})}
 function handleDrop(e:React.DragEvent<HTMLDivElement>){e.preventDefault();void uploadFiles(Array.from(e.dataTransfer.files))}
 async function saveProduct(e:React.FormEvent){
  e.preventDefault();if(!supabase||!user)return
  if(!form.name.trim()){setMessage('Product name is required.');return}
  if(!form.colors.length){setMessage('Select at least one color.');return}
  if(isBeltCategory(form.category)&&!form.lengths.length){setMessage('Add at least one belt length in centimeters.');return}
  if(form.images.length>MAX_PRODUCT_IMAGES){setMessage(`Maximum ${MAX_PRODUCT_IMAGES} images per product.`);return}
  setSaving(true);setMessage('')
  const slugBase=form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||`product-${Date.now()}`
  let slug=editing?.slug||slugBase
  if(!editing){
   let n=2;
   while(adminProducts.some(p=>p.slug===slug)){slug=`${slugBase}-${n++}`}
  }else if(form.name.trim()!==String(editing.name||'').trim()){
   slug=slugBase
   let n=2
   while(adminProducts.some(p=>p.id!==editing.id&&p.slug===slug)){slug=`${slugBase}-${n++}`}
  }
  const category=categories.find(c=>c.name===form.category)
  const imageUrls=form.images.map(i=>i.url)
  const stockValue=Number(form.stock)
  if(!Number.isInteger(stockValue)||stockValue<0){setSaving(false);setMessage('Stock must be a whole number 0 or greater.');return}
  const payload={name:form.name.trim(),slug,description:form.description.trim(),composition:form.composition.trim(),price:Number(form.price)||0,category_id:category?.id||null,sizes:isBeltCategory(form.category)?[]:form.sizes,lengths:isBeltCategory(form.category)?form.lengths:[],colors:form.colors,stock:stockValue,image_url:imageUrls[0]||null,images:imageUrls,is_active:form.isActive,is_new:form.isNew,featured:form.featured,sort_order:Number(form.sortOrder)||0,updated_at:new Date().toISOString()}
  let result=editing?await supabase.from('products').update(payload).eq('id',editing.id):await supabase.from('products').insert(payload)
  if(result.error&&editing){
   const stockRetry=await supabase.from('products').update({stock:stockValue,updated_at:new Date().toISOString()}).eq('id',editing.id)
   if(!stockRetry.error){
    await removeStorageUrls(newUploadedUrls);setNewUploadedUrls([]);setRemovedExistingUrls([]);setSaving(false);setShowForm(false);setMessage('Stock updated. Other changes could not be saved: '+result.error.message);await loadAdminData();return
   }
  }
  if(result.error){await removeStorageUrls(newUploadedUrls);setSaving(false);setMessage(result.error.message);return}
  if(removedExistingUrls.length)await removeStorageUrls(removedExistingUrls)
  setNewUploadedUrls([]);setRemovedExistingUrls([]);setSaving(false);setShowForm(false);setMessage(editing?'Product updated':'Product added');await loadAdminData()
 }
 async function cancelForm(){if(newUploadedUrls.length)await removeStorageUrls(newUploadedUrls);setNewUploadedUrls([]);setRemovedExistingUrls([]);setShowForm(false)}
 async function updateStock(p:any,next:number){
  if(!supabase||!user||stockSavingId)return
  const value=Math.max(0,Math.floor(Number(next)||0))
  setStockSavingId(p.id);setMessage('')
  const previous=p.stock??0
  setAdminProducts(items=>items.map(item=>item.id===p.id?{...item,stock:value}:item))
  const {error}=await supabase.from('products').update({stock:value,updated_at:new Date().toISOString()}).eq('id',p.id)
  if(error){setAdminProducts(items=>items.map(item=>item.id===p.id?{...item,stock:previous}:item));setMessage(`Could not update stock: ${error.message}`)}
  else setMessage(`${p.name} stock updated to ${value}`)
  setStockSavingId(null)
 }
 async function deleteProduct(p:any){if(!supabase||!user)return;if(!window.confirm(`Delete ${p.name}?`))return;const urls=Array.isArray(p.images)&&p.images.length?p.images:(p.image_url?[p.image_url]:[]);const {error}=await supabase.from('products').delete().eq('id',p.id);if(error){setMessage(error.message);return}if(urls.length)await removeStorageUrls(urls);setMessage('Product deleted');await loadAdminData()}
 async function importDemo(){
  if(!supabase||!user||adminProducts.length)return
  const rows=demoProducts.map((p,i)=>{const category=categories.find(c=>c.name===p.category);return {name:p.name,slug:`${p.id}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,description:p.description,composition:p.composition,price:p.price,category_id:category?.id||null,sizes:p.sizes,colors:p.colors,stock:10,image_url:p.images[0]||null,images:p.images,is_active:true,is_new:true,featured:Boolean(p.featured),sort_order:i}})
  const {error}=await supabase.from('products').insert(rows)
  if(error){setMessage(error.message);return}
  setMessage('Current catalog imported');await loadAdminData()
 }
 if(loading)return <AdminFrame><AdminLoading/></AdminFrame>
 if(!user)return <AdminLogin email={email} password={password} setEmail={setEmail} setPassword={setPassword} error={authError} onSubmit={login}/>
 return <AdminFrame><div className="admin-shell"><header className="admin-header"><div><div className="admin-kicker">YAROPLUGG</div><h1>ADMIN</h1></div><button className="admin-ghost" onClick={logout}><LogOut size={15}/> LOG OUT</button></header><section className="admin-stats"><div><span>PRODUCTS</span><b>{adminProducts.length}</b></div><div><span>ACTIVE</span><b>{adminProducts.filter(p=>p.is_active).length}</b></div><div><span>OUT OF STOCK</span><b>{adminProducts.filter(p=>(p.stock??0)<=0).length}</b></div></section><div className="admin-toolbar"><div><div className="admin-section-label">CATALOG</div><h2>PRODUCTS</h2></div><button className="admin-primary" onClick={startAdd}><Plus size={16}/> ADD PRODUCT</button></div>{message&&<div className="admin-message">{message}</div>}<div className="admin-product-list">{adminProducts.length===0?<div className="admin-empty"><Package size={22}/><b>NO PRODUCTS YET</b><span>Add your first product to the catalog.</span><div className="admin-empty-actions"><button className="admin-primary" onClick={startAdd}><Plus size={15}/> ADD PRODUCT</button><button className="admin-ghost" onClick={importDemo}><Check size={15}/> IMPORT CURRENT CATALOG</button></div></div>:adminProducts.map(p=><AdminProductRow key={p.id} p={p} onEdit={()=>startEdit(p)} onDelete={()=>deleteProduct(p)} onStockChange={(next)=>updateStock(p,next)} stockSaving={stockSavingId===p.id}/>)}</div>{showForm&&<AdminProductFormView form={form} setForm={setForm} categories={categories} editing={editing} saving={saving} uploading={uploading} onUpload={uploadFiles} onRemoveImage={removeImage} onMoveImage={moveImage} onMakeMain={makeMain} onDrop={handleDrop} onToggleColor={toggleColor} onRemoveColor={removeColor} onAddCustomColor={addCustomColor} onCancel={cancelForm} onClose={cancelForm} onSubmit={saveProduct}/>}</div></AdminFrame>
}
function AdminFrame({children}:{children:React.ReactNode}){return <div className="admin-app">{children}</div>}
function AdminLoading(){return <div className="admin-loading"><LoaderCircle size={26} className="spin"/><span>LOADING ADMIN</span></div>}
function AdminLogin({email,password,setEmail,setPassword,error,onSubmit}:{email:string;password:string;setEmail:(v:string)=>void;setPassword:(v:string)=>void;error:string;onSubmit:(e:React.FormEvent)=>void}){return <AdminFrame><div className="admin-login"><div className="admin-login-card"><img src="/logo.png" alt="YAROPLUGG"/><div className="admin-kicker">PRIVATE AREA</div><h1>ADMIN LOGIN</h1><p>Sign in with your YAROPLUGG admin account.</p><form onSubmit={onSubmit}><label>EMAIL<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>PASSWORD<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{error&&<div className="admin-error">{error}</div>}<button className="admin-primary" type="submit">SIGN IN</button></form></div></div></AdminFrame>}
function AdminProductRow({p,onEdit,onDelete,onStockChange,stockSaving}:{p:any;onEdit:()=>void;onDelete:()=>void;onStockChange:(next:number)=>void;stockSaving:boolean}){
 const img=p.image_url||p.images?.[0];const count=Array.isArray(p.images)?p.images.length:(img?1:0)
 const [draft,setDraft]=useState(String(p.stock??0))
 useEffect(()=>setDraft(String(p.stock??0)),[p.stock])
 function commit(){const value=Math.max(0,Math.floor(Number(draft)||0));setDraft(String(value));if(value!==Number(p.stock??0))onStockChange(value)}
 return <div className="admin-product-row">{img?<img src={img} alt="" loading="lazy" decoding="async"/>:<div className="admin-image-empty"><ImagePlus size={18}/></div>}<div className="admin-product-main"><b>{p.name}</b><span>{p.category?.name||'Uncategorized'} · €{Number(p.price).toFixed(2)}</span><small>{count} PHOTO{count===1?'':'S'} · {p.is_active?'ACTIVE':'HIDDEN'}</small></div><div className="admin-stock-editor"><span>STOCK</span><div><button type="button" onClick={()=>onStockChange(Math.max(0,Number(p.stock??0)-1))} disabled={stockSaving||Number(p.stock??0)<=0} aria-label={`Decrease stock for ${p.name}`}><Minus size={13}/></button><input value={draft} inputMode="numeric" aria-label={`Stock for ${p.name}`} onChange={e=>setDraft(e.target.value.replace(/[^0-9]/g,''))} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit()}}} disabled={stockSaving}/><button type="button" onClick={()=>onStockChange(Number(p.stock??0)+1)} disabled={stockSaving} aria-label={`Increase stock for ${p.name}`}><Plus size={13}/></button></div></div><div className="admin-row-actions"><button type="button" onClick={onEdit} aria-label={`Edit ${p.name}`} title="Edit product"><Pencil size={15}/><span>EDIT</span></button><button type="button" onClick={onDelete} aria-label={`Delete ${p.name}`} title="Delete product"><Trash2 size={15}/><span>DELETE</span></button></div></div>}
function AdminProductFormView({form,setForm,categories,editing,saving,uploading,onUpload,onRemoveImage,onMoveImage,onMakeMain,onDrop,onToggleColor,onRemoveColor,onAddCustomColor,onCancel,onClose,onSubmit}:{form:AdminProductForm;setForm:React.Dispatch<React.SetStateAction<AdminProductForm>>;categories:any[];editing:any;saving:boolean;uploading:boolean;onUpload:(files:File[])=>void;onRemoveImage:(index:number)=>void;onMoveImage:(index:number,direction:-1|1)=>void;onMakeMain:(index:number)=>void;onDrop:(e:React.DragEvent<HTMLDivElement>)=>void;onToggleColor:(color:AdminColor)=>void;onRemoveColor:(name:string)=>void;onAddCustomColor:(name:string,hex:string)=>boolean;onCancel:()=>void;onClose:()=>void;onSubmit:(e:React.FormEvent)=>void}){
 const set=(key:keyof AdminProductForm,val:any)=>setForm(f=>({...f,[key]:val}))
 const [colorSearch,setColorSearch]=useState('')
 const [customName,setCustomName]=useState('')
 const [customHex,setCustomHex]=useState('#888888')
 const [colorError,setColorError]=useState('')
 const filteredColors=COLOR_PALETTE.filter(c=>c.name.toLowerCase().includes(colorSearch.toLowerCase()))
 function addColor(){const ok=onAddCustomColor(customName,customHex);if(!ok){setColorError('Enter a unique color name and a valid HEX value.');return}setCustomName('');setCustomHex('#888888');setColorError('')}
 return <div className="admin-modal"><div className="admin-form-card"><div className="admin-form-head"><div><div className="admin-kicker">{editing?'EDIT PRODUCT':'NEW PRODUCT'}</div><h2>{editing?'EDIT PRODUCT':'ADD PRODUCT'}</h2></div><button onClick={onClose} className="admin-close" aria-label="Close"><X size={18}/></button></div><form onSubmit={onSubmit} className="admin-form">
  <label>PRODUCT NAME<input value={form.name} onChange={e=>set('name',e.target.value)} required placeholder="Heavy Basic Tee"/></label>
  <div className="admin-form-grid"><label>PRICE (€)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)} required/></label><label>CATEGORY<select value={form.category} onChange={e=>{const next=e.target.value;setForm(f=>({...f,category:next,sizes:isBeltCategory(next)?[]:f.sizes}))}}>{categories.map(c=><option key={c.id}>{c.name}</option>)}</select></label></div>
  <label>DESCRIPTION<textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={3}/></label>
  <label>COMPOSITION<input value={form.composition} onChange={e=>set('composition',e.target.value)} placeholder="100% cotton"/></label>
  {isBeltCategory(form.category)?<div><div className="admin-field-title">BELT LENGTHS <span className="admin-help">In centimeters</span></div><div className="admin-length-editor"><div className="admin-length-chips">{form.lengths.map(l=><span key={l} className="admin-length-chip">{l} cm<button type="button" onClick={()=>set('lengths',form.lengths.filter(x=>x!==l))} aria-label={`Remove ${l} cm`}><X size={12}/></button></span>)}</div><div className="admin-length-add"><input type="number" min="1" max="250" step="1" placeholder="e.g. 90" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const v=Number((e.currentTarget as HTMLInputElement).value);if(v>0&&!form.lengths.includes(String(v))){set('lengths',[...form.lengths,String(v)]);e.currentTarget.value=''}}}}/><button type="button" className="admin-ghost" onClick={e=>{const input=(e.currentTarget.previousElementSibling as HTMLInputElement|null);const v=Number(input?.value);if(v>0&&!form.lengths.includes(String(v))){set('lengths',[...form.lengths,String(v)]);if(input)input.value=''}}}><Plus size={14}/> ADD LENGTH</button></div></div></div>:<div><div className="admin-field-title">SIZES</div><div className="admin-size-grid">{sizes.map(s=><button type="button" key={s} onClick={()=>set('sizes',form.sizes.includes(s)?form.sizes.filter(x=>x!==s):[...form.sizes,s])} className={form.sizes.includes(s)?'selected':''}>{s}</button>)}</div></div>}
  <div className="admin-color-section"><div className="admin-field-title">COLORS <span className="admin-help">Choose one or more</span></div><div className="admin-color-selected">{form.colors.length?form.colors.map(c=><span key={c.name} className="admin-color-chip"><i style={{background:c.hex}}/>{c.name}<button type="button" onClick={()=>onRemoveColor(c.name)} aria-label={`Remove ${c.name}`}><X size={12}/></button></span>):<span className="admin-color-empty">No colors selected</span>}</div><div className="admin-color-search"><input value={colorSearch} onChange={e=>setColorSearch(e.target.value)} placeholder="Search colors…" aria-label="Search colors"/></div><div className="admin-color-palette" aria-label="Available colors">{filteredColors.map(c=><button type="button" key={c.name} onClick={()=>onToggleColor(c)} className={form.colors.some(x=>x.name.toLowerCase()===c.name.toLowerCase())?'selected':''}><i style={{background:c.hex}}/><span>{c.name}</span></button>)}</div><div className="admin-custom-color"><input value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="Custom color name" aria-label="Custom color name"/><label className="admin-color-picker"><input type="color" value={customHex} onChange={e=>setCustomHex(e.target.value)} aria-label="Custom color swatch"/><span style={{background:customHex}}/></label><input value={customHex} onChange={e=>setCustomHex(e.target.value)} placeholder="#888888" aria-label="Custom HEX color"/><button type="button" className="admin-ghost" onClick={addColor}><Plus size={14}/> ADD</button></div>{colorError&&<div className="admin-inline-error">{colorError}</div>}</div>
  <label>STOCK<input type="number" min="0" value={form.stock} onChange={e=>set('stock',e.target.value)} required/></label>
  <div><div className="admin-field-title">PRODUCT PHOTOS <span className="admin-help">Up to {MAX_PRODUCT_IMAGES} · 10 MB each</span></div><div className="admin-dropzone" onDragOver={e=>e.preventDefault()} onDrop={onDrop}><input id="admin-photos" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple onChange={e=>{if(e.target.files?.length){void onUpload(Array.from(e.target.files));e.currentTarget.value=''}}} hidden/><label htmlFor="admin-photos" className="admin-dropzone-button"><Upload size={15}/> {uploading?'UPLOADING…':'CHOOSE PHOTOS'}</label><span>or drag and drop JPG, PNG or WEBP files here</span><small>First photo is the main product photo. Click MAIN or drag images to reorder.</small></div>{form.images.length>0&&<div className="admin-image-grid">{form.images.map((img,i)=><div key={img.url} className={`admin-image-card ${i===0?'is-main':''}`} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',String(i))} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)&&from!==i){setForm(f=>{const next=[...f.images];const [item]=next.splice(from,1);next.splice(i,0,item);return {...f,images:next}})}}}><img src={img.url} alt={`${form.name||'Product'} photo ${i+1}`}/><div className="admin-image-overlay"><span>{i===0?'MAIN':`PHOTO ${i+1}`}</span><button type="button" onClick={()=>onMakeMain(i)} disabled={i===0}>MAIN</button><button type="button" onClick={()=>onMoveImage(i,-1)} disabled={i===0} aria-label="Move photo left">←</button><button type="button" onClick={()=>onMoveImage(i,1)} disabled={i===form.images.length-1} aria-label="Move photo right">→</button><button type="button" onClick={()=>onRemoveImage(i)} className="remove" aria-label={`Remove photo ${i+1}`}><Trash2 size={13}/></button></div></div>)}</div>}</div>
  <div className="admin-toggles"><label><input type="checkbox" checked={form.isActive} onChange={e=>set('isActive',e.target.checked)}/><span>ACTIVE</span></label><label><input type="checkbox" checked={form.isNew} onChange={e=>set('isNew',e.target.checked)}/><span>NEW IN</span></label><label><input type="checkbox" checked={form.featured} onChange={e=>set('featured',e.target.checked)}/><span>FEATURED</span></label></div>
  <div className="admin-form-actions"><button type="button" className="admin-ghost" onClick={onCancel}>CANCEL</button><button type="submit" className="admin-primary" disabled={saving||uploading}>{saving?<><LoaderCircle size={15} className="spin"/> SAVING…</>:<><Check size={15}/> SAVE PRODUCT</>}</button></div>
 </form></div></div>
}

const root=document.getElementById('root')!
createRoot(root).render(window.location.pathname.startsWith('/admin')?<AdminApp/>:<App/>)
