import React,{useEffect,useMemo,useState} from 'react'
import {Search,House,Heart,ShoppingBag,Info as InfoIcon,Tag} from 'lucide-react'
import type {Category,CategoryRecord,Product} from './types'
import {supabase} from './lib/supabase'
import {dbProduct,isBeltCategory} from './lib/format'
import {readStorage,readStoreCache,writeStoreCache} from './lib/storage'
import {Nav,Home,Catalog,Favorites,ProductCard,ProductModal,CartCheckout,Filters,Sold} from './components'
import {Info} from './components/Info'
import {LanguageSwitch} from './components/LanguageSwitch'
import {useI18n} from './i18n'
import type {CartLine} from './components/shared'
import {SHOP} from './config'
import {normalizeContact} from './lib/orderValidation'
import {OrderSuccess} from './components/OrderSuccess'
import type {CheckoutSubmission} from './components/CartCheckout'
import {track} from './lib/analytics'
 type Screen='home'|'catalog'|'favorites'|'sold'|'info'

async function fetchStoreProducts():Promise<Product[]>{
 if(!supabase)throw new Error('Store connection is not configured.')
 const {data,error}=await supabase
  .from('products')
  .select('id,name,slug,brand,condition,size_label,measurements,defects,resale_status,is_sold,thumbnail_urls,price,description,composition,sizes,lengths,colors,images,image_url,stock,featured,sort_order,created_at,category:categories(name,name_ru,name_et,name_en,category_type)')
  .eq('is_active',true)
  .order('sort_order',{ascending:true})
  .order('created_at',{ascending:false})
 if(error)throw error
 if(!data)throw new Error('Could not load catalog.')
 const items=data.map(dbProduct)
 writeStoreCache(items)
 return items
}
async function fetchStoreCategories():Promise<CategoryRecord[]>{
 if(!supabase)throw new Error('Store connection is not configured.')
 const {data,error}=await supabase.from('categories').select('id,name,slug,name_ru,name_et,name_en,category_type').order('sort_order',{ascending:true})
 if(error)throw error
 return data||[]
}

export function App(){
  const {language,t}=useI18n()
 const [screen,setScreenState]=useState<Screen>(()=>window.location.pathname==='/shop'?'catalog':window.location.pathname==='/sold'?'sold':window.location.pathname.startsWith('/info/')?'info':'home')
 const setScreen=(next:Screen)=>{setScreenState(next);const path=next==='catalog'?'/shop':next==='sold'?'/sold':next==='info'?'/info/about':next==='home'?'/':'/shop';if(window.location.pathname!==path)window.history.pushState({},'',path)}
 const [selected,setSelected]=useState<Product|null>(null)
 const [query,setQuery]=useState('')
 const [cat,setCat]=useState<Category>('All')
 const [categories,setCategories]=useState<CategoryRecord[]>([])
 const [showFilters,setShowFilters]=useState(false)
 const [filterSize,setFilterSize]=useState('All')
 const [filterColor,setFilterColor]=useState('All')
 const [filterBrand,setFilterBrand]=useState('All')
 const [filterCondition,setFilterCondition]=useState('All')
 const [sortOrder,setSortOrder]=useState<'newest'|'price_asc'|'price_desc'>('newest')
 const [maxPrice,setMaxPrice]=useState<number|null>(null)
 const [toast,setToast]=useState('')
 const [favorites,setFavorites]=useState<string[]>(()=>Array.from(new Set(readStorage<string[]>('yp-favorites',[]).filter(Boolean))))
 const [products,setProducts]=useState<Product[]>(()=>readStoreCache()||[])
 const [storeLoading,setStoreLoading]=useState(true)
 const [storeError,setStoreError]=useState('')
 const [cart,setCart]=useState<CartLine[]>(()=>readStorage<CartLine[]>('yp-cart',[]))
 const [checkoutOpen,setCheckoutOpen]=useState(false)
 const [checkoutBusy,setCheckoutBusy]=useState(false)
 const [customerName,setCustomerName]=useState('')
 const [initialContact]=useState(()=>{const user=(window as any).Telegram?.WebApp?.initDataUnsafe?.user;return user?.id!==undefined&&user?.id!==null?String(user.id):''})
 const [createdOrder,setCreatedOrder]=useState<number|null>(null)
 const [orderMessage,setOrderMessage]=useState('')
 const [pendingOrderRequest,setPendingOrderRequest]=useState<{fingerprint:string;key:string}|null>(()=>readStorage('yp-pending-order-request',null))
 const knownInfoPages=['about','howOrder','deliveryPayment','returns','contacts','terms','privacy'];const routeValid=window.location.pathname==='/'||window.location.pathname==='/shop'||window.location.pathname==='/sold'||/^\/p\/[^/]+$/.test(window.location.pathname)||(/^\/info\/[^/]+$/.test(window.location.pathname)&&knownInfoPages.includes(window.location.pathname.split('/')[2]))
 const activeProducts=useMemo(()=>products.filter(p=>p.resaleStatus!=='sold'&&!p.isSold),[products])
 const soldProducts=useMemo(()=>products.filter(p=>p.resaleStatus==='sold'||p.isSold),[products])
 const colors=useMemo(()=>['All',...Array.from(new Set(activeProducts.flatMap(p=>p.colors.map(c=>c.name))))], [activeProducts])
 const brands=useMemo(()=>Array.from(new Set(activeProducts.map(p=>p.brand).filter(Boolean))).sort(),[activeProducts])
 const availableSizes=useMemo(()=>Array.from(new Set(activeProducts.flatMap(p=>[...p.sizes,...(p.sizeLabel?[p.sizeLabel]:[])]))).sort(),[activeProducts])
 const priceBounds=useMemo(()=>{const prices=activeProducts.map(p=>Number(p.price)).filter(Number.isFinite);if(!prices.length)return {min:0,max:0};return {min:Math.floor(Math.min(...prices)),max:Math.ceil(Math.max(...prices))}},[activeProducts])
 const effectiveMaxPrice=maxPrice===null?priceBounds.max:Math.min(Math.max(maxPrice,priceBounds.min),priceBounds.max)
 useEffect(()=>{if(priceBounds.max>0)setMaxPrice(current=>current===null?priceBounds.max:Math.min(Math.max(current,priceBounds.min),priceBounds.max))},[priceBounds.min,priceBounds.max])
 const filtered=useMemo(()=>activeProducts.filter(p=>{const search=query.toLowerCase();const text=p.name.toLowerCase().includes(search)||p.brand.toLowerCase().includes(search)||p.description.toLowerCase().includes(search);const size=filterSize==='All'||p.sizes.includes(filterSize)||p.sizeLabel.toLowerCase().includes(filterSize.toLowerCase());const color=filterColor==='All'||p.colors.some(c=>c.name===filterColor);return(cat==='All'||p.category===cat)&&text&&size&&color&&(filterBrand==='All'||p.brand===filterBrand)&&(filterCondition==='All'||p.condition===filterCondition)&&p.price<=effectiveMaxPrice}).sort((a,b)=>{if(sortOrder==='price_asc')return a.price-b.price;if(sortOrder==='price_desc')return b.price-a.price;return 0}),[activeProducts,cat,query,filterSize,filterColor,filterBrand,filterCondition,sortOrder,effectiveMaxPrice])
 useEffect(()=>{localStorage.setItem('yp-favorites',JSON.stringify(favorites))},[favorites])
 useEffect(()=>{localStorage.setItem('yp-cart',JSON.stringify(cart))},[cart])
 useEffect(()=>{if(window.location.pathname.startsWith('/p/')||window.location.pathname.startsWith('/info/'))return;const isMissing=!routeValid;document.title=isMissing?`404 | YAROPLUGG STORE`:`${t(screen==='catalog'?'categories':screen==='sold'?'soldTab':'shop')} | YAROPLUGG STORE`;const description=isMissing?t('notFound'):screen==='catalog'?t('catalogDescription'):screen==='sold'?t('soldDescription'):t('storeDescription');let meta=document.querySelector<HTMLMetaElement>('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.appendChild(meta)}meta.content=description},[language,screen,routeValid,t])
 useEffect(()=>{const tg=(window as any).Telegram?.WebApp;if(tg){document.documentElement.classList.add('telegram-mini-app');tg.ready();tg.expand()}else document.documentElement.classList.remove('telegram-mini-app')},[])
 async function refreshCatalog(){setStoreLoading(true);setStoreError('');try{const [items,categoryRows]=await Promise.all([fetchStoreProducts(),fetchStoreCategories()]);setProducts(items);setCategories(categoryRows);setStoreLoading(false)}catch{setStoreError('Could not load the catalog. Check your connection and try again.');setStoreLoading(false)}}
 useEffect(()=>{void refreshCatalog()},[])
 useEffect(()=>{if(selected)track('Product view',{product:selected.slug})},[selected?.id])
 useEffect(()=>{const tg=(window as any).Telegram?.WebApp;const startParam=tg?.initDataUnsafe?.start_param as string|undefined;const match=window.location.pathname.match(/^\/p\/([^/]+)/);const slug=match?.[1]||(startParam?.startsWith('p_')?startParam.slice(2):new URLSearchParams(window.location.search).get('product'));if(slug){const product=products.find(p=>p.slug===decodeURIComponent(slug));if(product){setSelected(product);if(!match)window.history.replaceState({},'',`/p/${encodeURIComponent(product.slug)}`)}}},[products])
 useEffect(()=>{const onPop=()=>{setScreenState(window.location.pathname==='/shop'?'catalog':window.location.pathname==='/sold'?'sold':window.location.pathname.startsWith('/info/')?'info':'home');const slug=window.location.pathname.match(/^\/p\/([^/]+)/)?.[1];setSelected(slug?products.find(p=>p.slug===decodeURIComponent(slug))||null:null)};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[products])
 useEffect(()=>{const tg=(window as any).Telegram?.WebApp;if(!tg?.BackButton)return;const back=()=>{if(selected){setSelected(null);window.history.back()}else if(screen!=='home'){setScreen('home');window.history.back()}};if(selected||screen!=='home'){tg.BackButton.show();tg.BackButton.onClick(back);return()=>tg.BackButton.offClick?.(back)}tg.BackButton.hide()},[selected,screen])
 function notify(v:string){setToast(v);window.setTimeout(()=>setToast(''),1500)}
 function toggleFavorite(id:string){setFavorites(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id])}
 function addToCart(line:CartLine){if(cart.reduce((n,x)=>n+x.quantity,0)>=5){notify(t('maxItems'));return}track('Add to bag',{product:products.find(p=>p.id===line.productId)?.slug||line.productId});setCart(current=>{if(current.reduce((n,x)=>n+x.quantity,0)>=5)return current;const found=current.find(x=>x.productId===line.productId&&x.color===line.color&&x.size===line.size&&x.length===line.length);return found?current.map(x=>x===found?{...x,quantity:x.quantity+1}:x):[...current,line]});setSelected(null);notify(t('addedToBag'))}
 async function placeOrder(submission:CheckoutSubmission){
  if(!cart.length||checkoutBusy)return
  if(!supabase){setOrderMessage('Order service is not configured for this store.');return}
  const initData=(window as any).Telegram?.WebApp?.initData||''
  setCheckoutBusy(true);setOrderMessage('')
  const fingerprint=JSON.stringify({cart,...submission})
  const idempotencyKey=pendingOrderRequest?.fingerprint===fingerprint?pendingOrderRequest.key:crypto.randomUUID()
  const pendingRequest={fingerprint,key:idempotencyKey}
  setPendingOrderRequest(pendingRequest);localStorage.setItem('yp-pending-order-request',JSON.stringify(pendingRequest))
  try{
   const orderLanguage=language
  const {data,error}=await supabase.functions.invoke('create-order',{body:{customerName:submission.customerName,telegramId:normalizeContact(submission.contactType,submission.contactValue),phone:'',items:cart.map(line=>({productId:line.productId,quantity:line.quantity,size:line.size||'',color:line.color,length:line.length||''})),telegramInitData:initData,idempotencyKey,language:orderLanguage}})
   if(error||data?.error){let code=data?.code||data?.error||'ORDER_FAILED';try{const response=(error as any)?.context;if(response&&typeof response.clone==='function'){const body=await response.clone().json();if(body?.code)code=body.code}}catch{}throw new Error(code)}
   track('Order created');setCart([]);setCheckoutOpen(false);setCustomerName('');localStorage.removeItem('yp-pending-order-request');setPendingOrderRequest(null);setOrderMessage('');setCreatedOrder(Number(data.orderNumber))
  }catch(error){const code=error instanceof Error?error.message:'ORDER_FAILED';const messages:Record<string,string>={RATE_LIMITED:t('rateLimited'),OUT_OF_STOCK:t('outOfStock'),PRICE_CHANGED:t('priceChanged'),PRODUCT_UNAVAILABLE:t('productUnavailable'),INVALID_ORDER:t('invalidOrder'),CAPTCHA_FAILED:t('captchaFailedOrder'),ORDER_FAILED:t('orderFailed')};setOrderMessage(messages[code]||t('orderFailed'))}
  finally{setCheckoutBusy(false)}
 }
 function openCategory(c:Category){setCat(c);setScreen('catalog');window.scrollTo({top:0,behavior:'smooth'})}
 function showProduct(product:Product|null){setSelected(product);if(product){const path=`/p/${encodeURIComponent(product.slug)}`;if(window.location.pathname!==path)window.history.pushState({},'',path)}}
 return <div className="app-shell"><main className="store-shell safe-bottom">
  <header className="site-header"><button onClick={()=>setScreen('home')} className="brand-button" aria-label="YAROPLUGG home"><img src="/logo.webp" alt="YAROPLUGG" className="brand-logo"/></button><div className="header-actions"><LanguageSwitch/><button onClick={()=>{setScreen('catalog');setTimeout(()=>document.getElementById('search')?.focus(),50)}} className="icon-button" aria-label={t('search')}><Search size={18}/></button><button onClick={()=>{track('Checkout started');setCheckoutOpen(true)}} className="icon-button cart-icon" aria-label={`${t('bag')}, ${cart.reduce((n,x)=>n+x.quantity,0)}`}><ShoppingBag size={18}/>{cart.length>0&&<span>{cart.reduce((n,x)=>n+x.quantity,0)}</span>}</button></div></header>
  {!routeValid?<section className="page-pad page-top"><h1>404</h1><p>{t('notFound')}</p><button className="primary-red" onClick={()=>setScreen('home')}>{t('backToStore')}</button></section>:null}
  {routeValid&&screen==='home'&&<Home onCatalog={()=>setScreen('catalog')} onCategory={openCategory} onProduct={showProduct} favorites={favorites} onFavorite={toggleFavorite} products={activeProducts} categories={categories}/>}
  {routeValid&&screen==='catalog'&&<Catalog query={query} setQuery={setQuery} cat={cat} setCat={setCat} products={filtered} priceMin={priceBounds.min} priceMax={priceBounds.max} onProduct={showProduct} onFilters={()=>setShowFilters(true)} favorites={favorites} onFavorite={toggleFavorite} hasCatalogProducts={products.length>0} categories={categories}/>}
  {routeValid&&screen==='favorites'&&<Favorites products={activeProducts.filter(p=>favorites.includes(p.id))} onProduct={showProduct} favorites={favorites} onFavorite={toggleFavorite}/>}
  {routeValid&&screen==='sold'&&<Sold products={soldProducts} onProduct={showProduct}/>}
  {routeValid&&screen==='info'&&<Info/>} {(storeLoading||storeError||(!products.length&&!storeLoading))&&<section className="store-status" aria-live="polite">{storeLoading?<><div className="store-skeleton-grid" aria-label={t('loading')}>{Array.from({length:4},(_,i)=><div className="store-skeleton-card" key={i}><span/><i/><b/></div>)}</div><p>{t('loading')}</p></>:storeError?<><p>{storeError}</p><button type="button" className="admin-ghost" onClick={()=>void refreshCatalog()}>{t('retry')}</button></>:<><p>{t('empty')}</p><span>{t('empty')}</span></>}</section>}
  <nav className="bottom-nav" aria-label={t('shop')}><Nav icon={<House size={17}/>} label={t('shop')} active={screen==='home'} onClick={()=>setScreen('home')}/><Nav icon={<Search size={17}/>} label={t('categories')} active={screen==='catalog'} onClick={()=>setScreen('catalog')}/><Nav icon={<Heart size={17}/>} label={t('favorites')} active={screen==='favorites'} onClick={()=>setScreen('favorites')} badge={favorites.length} ariaLabel={`${t('favorites')}, ${favorites.length}`}/><Nav icon={<Tag size={17}/>} label={t('soldTab')} active={screen==='sold'} onClick={()=>setScreen('sold')}/><Nav icon={<InfoIcon size={17}/>} label={t('info')} active={screen==='info'} onClick={()=>setScreen('info')}/></nav>
  {selected&&<ProductModal product={selected} onClose={()=>{setSelected(null);if(window.location.pathname.startsWith('/p/'))window.history.back()}} onAdd={addToCart} onFavorite={()=>{toggleFavorite(selected.id);notify(favorites.includes(selected.id)?'Removed from favorites':'Added to favorites')}} favorite={favorites.includes(selected.id)} relatedProducts={products.filter(p=>p.id!==selected.id&&(p.category===selected.category||(selected.brand&&p.brand===selected.brand))).slice(0,4)} onSelectRelated={showProduct}/>} {showFilters&&<Filters size={filterSize} color={filterColor} brand={filterBrand} condition={filterCondition} sort={sortOrder} maxPrice={effectiveMaxPrice} minPrice={priceBounds.min} maxPriceBound={priceBounds.max} colors={colors} brands={brands} sizes={availableSizes} onClose={()=>setShowFilters(false)} onApply={(s,c,b,condition,sort,p)=>{setFilterSize(s);setFilterColor(c);setFilterBrand(b);setFilterCondition(condition);setSortOrder(sort);setMaxPrice(p);setShowFilters(false)}}/>} {checkoutOpen&&<CartCheckout cart={cart} products={products} setCart={setCart} onClose={()=>setCheckoutOpen(false)} onCheckout={placeOrder} customerName={customerName} setCustomerName={setCustomerName} initialContact={initialContact} isTelegram={Boolean((window as any).Telegram?.WebApp?.initData)} turnstileSiteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY||''} busy={checkoutBusy} message={orderMessage}/>} {createdOrder!==null&&<OrderSuccess orderNumber={createdOrder} onClose={()=>setCreatedOrder(null)}/>} {orderMessage&&!checkoutOpen&&<div className="toast">{orderMessage}</div>} {toast&&<div className="toast">{toast}</div>}
 </main></div>
}
