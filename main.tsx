import React,{useEffect,useMemo,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {createClient, type User} from '@supabase/supabase-js'
import {Search,House,UserRound,Info as InfoIcon,X,SlidersHorizontal,Heart,ChevronDown,ArrowUpRight,ChevronLeft,ChevronRight,Plus,Minus,Trash2,LogOut,Package,ImagePlus,Pencil,Check,Upload,LoaderCircle,ShoppingBag,ClipboardList,CheckCircle2,RotateCcw,Tag} from 'lucide-react'
import './index.css'
import type {Category,Product} from './types'

type Language='en'|'ru'|'et'
type Screen='home'|'catalog'|'favorites'|'info'|'sold'
type StoreProduct = Product & {isSold?:boolean;lengths?:string[];stock?:number}
type CartLine={productId:string;quantity:number;color:string;size?:string;length?:string}
type OrderStatus='new'|'contacted'|'reserved'|'shipped'|'completed'|'cancelled'
type PaymentStatus='pending_payment'|'paid'|'refunded'
type AdminSection='products'|'sold'|'orders'
const cats=['All','T-Shirts','Hoodies','Pants','Jackets','Belts'] as unknown as Category[]
const sizes=['S','M','L','XL']

const translations:Record<Language,Record<string,string>>={
 en:{SOLD:'SOLD','PAST DROPS':'PAST DROPS','Pieces that have found a new home.':'Pieces that have found a new home.','NOTHING SOLD YET':'NOTHING SOLD YET','Sold pieces will appear here when they are marked as sold in the admin.':'Sold pieces will appear here when they are marked as sold in the admin.','MARK AS SOLD':'MARK AS SOLD','RESTORE TO SHOP':'RESTORE TO SHOP',SHOP:'SHOP',CATEGORIES:'CATEGORIES',FAVORITES:'FAVORITES',INFO:'INFO',All:'All',ALL:'ALL','T-Shirts':'T-Shirts',Hoodies:'Hoodies',Pants:'Pants',Jackets:'Jackets',Belts:'Belts',SELECTED:'SELECTED', 'NEW IN':'NEW IN','VIEW ALL':'VIEW ALL',COLLECTION:'COLLECTION','SHOP ALL':'SHOP ALL',FILTERS:'FILTERS','SEARCH PRODUCTS':'SEARCH PRODUCTS',PRODUCTS:'PRODUCTS','NO PRODUCTS FOUND':'NO PRODUCTS FOUND','YOUR SELECTION':'YOUR SELECTION',SAVED:'SAVED','YOUR FAVORITES ARE EMPTY':'YOUR FAVORITES ARE EMPTY','Tap the heart on any product to save it here.':'Tap the heart on any product to save it here.','IN STOCK':'IN STOCK',AVAILABLE:'AVAILABLE','OUT OF STOCK':'OUT OF STOCK','BELT LENGTH':'BELT LENGTH','AVAILABLE SIZES':'AVAILABLE SIZES','COLOR ·':'COLOR ·','COMPOSITION:':'COMPOSITION:','MAX AVAILABLE IN BAG':'MAX AVAILABLE IN BAG','ADD TO BAG':'ADD TO BAG','REMOVE FROM FAVORITES':'REMOVE FROM FAVORITES','SAVE TO FAVORITES':'SAVE TO FAVORITES','NO IMAGE':'NO IMAGE','YOUR BAG':'YOUR BAG','ORDER TOTAL':'ORDER TOTAL',NAME:'NAME','TELEGRAM ID':'TELEGRAM ID','PLACE ORDER · AWAITING PAYMENT':'PLACE ORDER · AWAITING PAYMENT', 'This order is not paid yet. Payment options will be confirmed separately.':'This order is not paid yet. Payment options will be confirmed separately.', 'About the store':'About the store','How to order':'How to order','Delivery and payment':'Delivery and payment','Follow us on Instagram':'Follow us on Instagram','Orders enabled':'Orders enabled','Place an order in the bag. Orders are saved as awaiting payment; payment is not connected yet.':'Place an order in the bag. Our manager will contact you to confirm payment and delivery details.','Language':'Language','English':'English','Russian':'Русский','Estonian':'Eesti','Choose an item, add it to your bag and submit your order. Our manager will contact you to confirm payment and delivery details.':'Choose an item, add it to your bag and submit your order. Our manager will contact you to confirm payment and delivery details.','Delivery and payment are arranged with the manager after you submit your order.':'Delivery and payment are arranged with the manager after you submit your order.'},
 ru:{SOLD:'ПРОДАНО','PAST DROPS':'ПРОДАННЫЕ ВЕЩИ','Pieces that have found a new home.':'Вещи, которые нашли нового владельца.','NOTHING SOLD YET':'ПОКА НИЧЕГО НЕ ПРОДАНО','Sold pieces will appear here when they are marked as sold in the admin.':'Здесь будут отображаться вещи, которые ты отметил как проданные в админке.','MARK AS SOLD':'ОТМЕТИТЬ КАК ПРОДАННОЕ','RESTORE TO SHOP':'ВЕРНУТЬ В МАГАЗИН',SHOP:'МАГАЗИН',CATEGORIES:'КАТАЛОГ',FAVORITES:'ИЗБРАННОЕ',INFO:'ИНФО',All:'Все',ALL:'ВСЕ','T-Shirts':'Футболки',Hoodies:'Худи',Pants:'Брюки',Jackets:'Куртки',Belts:'Ремни',SELECTED:'ПОДБРАНО ДЛЯ ВАС','NEW IN':'НОВИНКИ','VIEW ALL':'СМОТРЕТЬ ВСЁ',COLLECTION:'КОЛЛЕКЦИЯ','SHOP ALL':'ВСЕ ТОВАРЫ',FILTERS:'ФИЛЬТРЫ','SEARCH PRODUCTS':'ПОИСК ТОВАРОВ',PRODUCTS:'ТОВАРОВ','NO PRODUCTS FOUND':'ТОВАРЫ НЕ НАЙДЕНЫ','YOUR SELECTION':'ВАШ ВЫБОР',SAVED:'В ИЗБРАННОМ','YOUR FAVORITES ARE EMPTY':'В ИЗБРАННОМ ПОКА ПУСТО','Tap the heart on any product to save it here.':'Нажмите на сердечко у товара, чтобы сохранить его здесь.','IN STOCK':'В НАЛИЧИИ',AVAILABLE:'ДОСТУПНО','OUT OF STOCK':'НЕТ В НАЛИЧИИ','BELT LENGTH':'ДЛИНА РЕМНЯ','AVAILABLE SIZES':'ДОСТУПНЫЕ РАЗМЕРЫ','COLOR ·':'ЦВЕТ ·','COMPOSITION:':'СОСТАВ:','MAX AVAILABLE IN BAG':'ДОСТИГНУТО МАКСИМАЛЬНОЕ КОЛИЧЕСТВО','ADD TO BAG':'В КОРЗИНУ','REMOVE FROM FAVORITES':'УБРАТЬ ИЗ ИЗБРАННОГО','SAVE TO FAVORITES':'В ИЗБРАННОЕ','NO IMAGE':'НЕТ ФОТО','YOUR BAG':'ВАША КОРЗИНА','ORDER TOTAL':'ИТОГО',NAME:'ИМЯ','TELEGRAM ID':'TELEGRAM ID','PLACE ORDER · AWAITING PAYMENT':'ОФОРМИТЬ ЗАКАЗ · ОЖИДАЕТ ОПЛАТЫ','This order is not paid yet. Payment options will be confirmed separately.':'Заказ ещё не оплачен. Способ оплаты менеджер согласует отдельно.','About the store':'О магазине','How to order':'Как заказать','Delivery and payment':'Доставка и оплата','Follow us on Instagram':'Мы в Instagram','Orders enabled':'Приём заказов открыт','Place an order in the bag. Orders are saved as awaiting payment; payment is not connected yet.':'Оформите заказ через корзину. Менеджер свяжется с вами, чтобы подтвердить оплату и доставку.','Language':'Язык','English':'English','Russian':'Русский','Estonian':'Eesti','Choose an item, add it to your bag and submit your order. Our manager will contact you to confirm payment and delivery details.':'Выберите товар, добавьте его в корзину и отправьте заказ. Менеджер свяжется с вами, чтобы подтвердить оплату и доставку.','Delivery and payment are arranged with the manager after you submit your order.':'Доставка и оплата согласуются с менеджером после отправки заказа.'},
 et:{SOLD:'MÜÜDUD','PAST DROPS':'MÜÜDUD TOOTED','Pieces that have found a new home.':'Tooted, mis on leidnud uue omaniku.','NOTHING SOLD YET':'VEEL POLE MÜÜDUD','Sold pieces will appear here when they are marked as sold in the admin.':'Siin kuvatakse tooted, mis on halduses müüduks märgitud.','MARK AS SOLD':'MÄRGI MÜÜDuks','RESTORE TO SHOP':'TOO POODI TAGASI',SHOP:'POOD',CATEGORIES:'KATEGOORIAD',FAVORITES:'LEMMIKUD',INFO:'INFO',All:'Kõik',ALL:'KÕIK','T-Shirts':'T-särgid',Hoodies:'Pusad',Pants:'Püksid',Jackets:'Joped',Belts:'Vööd',SELECTED:'VALITUD SINU JAOKS','NEW IN':'UUS KAUP','VIEW ALL':'VAATA KÕIKI',COLLECTION:'KOLLEKTSIOON','SHOP ALL':'KÕIK TOOTED',FILTERS:'FILTRID','SEARCH PRODUCTS':'OTSI TOOTEID',PRODUCTS:'TOODET','NO PRODUCTS FOUND':'TOOTEID EI LEITUD','YOUR SELECTION':'SINU VALIK',SAVED:'SALVESTATUD','YOUR FAVORITES ARE EMPTY':'LEMMIKUID VEEL POLE','Tap the heart on any product to save it here.':'Toote salvestamiseks puuduta selle juures südameikooni.','IN STOCK':'SAADAVAL',AVAILABLE:'SAADAVAL','OUT OF STOCK':'LÄBI MÜÜDUD','BELT LENGTH':'VÖÖ PIKKUS','AVAILABLE SIZES':'SAADAOLEVAD SUURUSED','COLOR ·':'VÄRV ·','COMPOSITION:':'KOOSTIS:','MAX AVAILABLE IN BAG':'KOGU SAADAOLEV KOGUS ON OSTUKORVIS','ADD TO BAG':'LISA OSTUKOTTI','REMOVE FROM FAVORITES':'EEMALDA LEMMIKUTEST','SAVE TO FAVORITES':'SALVESTA LEMMIKUTESSE','NO IMAGE':'PILT PUUDUB','YOUR BAG':'SINU OSTUKOTT','ORDER TOTAL':'KOKKU',NAME:'NIMI','TELEGRAM ID':'TELEGRAMI ID','PLACE ORDER · AWAITING PAYMENT':'ESITA TELLIMUS · OOTAB MAKSET','This order is not paid yet. Payment options will be confirmed separately.':'Tellimus ei ole veel tasutud. Makseviis lepitakse eraldi kokku.','About the store':'Meist','How to order':'Kuidas tellida','Delivery and payment':'Tarne ja maksmine','Follow us on Instagram':'Jälgi meid Instagramis','Orders enabled':'Tellimuste vastuvõtt on avatud','Place an order in the bag. Orders are saved as awaiting payment; payment is not connected yet.':'Esita tellimus ostukoti kaudu. Haldur võtab sinuga ühendust, et makse ja tarne kinnitada.','Language':'Keel','English':'English','Russian':'Русский','Estonian':'Eesti','Choose an item, add it to your bag and submit your order. Our manager will contact you to confirm payment and delivery details.':'Vali toode, lisa see ostukotti ja esita tellimus. Haldur võtab sinuga ühendust, et makse ja tarne kinnitada.','Delivery and payment are arranged with the manager after you submit your order.':'Tarne ja makse lepitakse halduriga kokku pärast tellimuse esitamist.'}
}
Object.assign(translations.en,{SIZE:'SIZE',COLOR:'COLOR', 'MAXIMUM PRICE':'MAXIMUM PRICE','APPLY FILTERS':'APPLY FILTERS','YOUR BAG IS EMPTY':'YOUR BAG IS EMPTY','Filled from your Telegram account. Check that it is yours.':'Filled from your Telegram account. Check that it is yours.','CREATING ORDER…':'CREATING ORDER…','NO IMAGE':'NO IMAGE','SHOP NEW COLLECTION':'SHOP NEW COLLECTION','Favorites,':'Favorites,','FILTERS':'FILTERS','Close bag':'Close bag','All':'All','ALL':'ALL','SAVED':'SAVED','T-SHIRTS':'T-SHIRTS','HOODIES':'HOODIES','PANTS':'PANTS','JACKETS':'JACKETS','BELTS':'BELTS',' cm':' cm'})
Object.assign(translations.ru,{SIZE:'РАЗМЕР',COLOR:'ЦВЕТ','MAXIMUM PRICE':'МАКСИМАЛЬНАЯ ЦЕНА','APPLY FILTERS':'ПОКАЗАТЬ ТОВАРЫ','YOUR BAG IS EMPTY':'КОРЗИНА ПОКА ПУСТА','Filled from your Telegram account. Check that it is yours.':'Поле заполнено данными вашего аккаунта Telegram. Проверьте, что это ваш аккаунт.','CREATING ORDER…':'СОЗДАЁМ ЗАКАЗ…','SHOP NEW COLLECTION':'СМОТРЕТЬ НОВУЮ КОЛЛЕКЦИЮ','FILTERS':'ФИЛЬТРЫ','Close bag':'Закрыть корзину','All':'Все','ALL':'ВСЕ','SAVED':'В ИЗБРАННОМ','T-SHIRTS':'ФУТБОЛКИ','HOODIES':'ХУДИ','PANTS':'БРЮКИ','JACKETS':'КУРТКИ','BELTS':'РЕМНИ',' cm':' см'})
Object.assign(translations.et,{SIZE:'SUURUS',COLOR:'VÄRV','MAXIMUM PRICE':'HINNA ÜLEMPIIR','APPLY FILTERS':'RAKENDA FILTREID','YOUR BAG IS EMPTY':'OSTUKOTT ON TÜHI','Filled from your Telegram account. Check that it is yours.':'Väli täideti sinu Telegrami konto andmetega. Kontrolli, et konto kuulub sulle.','CREATING ORDER…':'TELLIMUST ESITATAKSE…','SHOP NEW COLLECTION':'VAATA UUT KOLLEKTSIOONI','FILTERS':'FILTRID','Close bag':'Sulge ostukott','All':'Kõik','ALL':'KÕIK','SAVED':'SALVESTATUD','T-SHIRTS':'T-SÄRGID','HOODIES':'PUSAD','PANTS':'PÜKSID','JACKETS':'JOPED','BELTS':'VÖÖD',' cm':' cm'})
Object.assign(translations.ru,{'This item is out of stock':'Этого товара сейчас нет в наличии','Maximum available quantity is already in your bag':'В корзине уже максимальное доступное количество','Added to bag':'Добавлено в корзину','Removed from favorites':'Убрано из избранного','Added to favorites':'Добавлено в избранное','Order service is not configured for this store.':'Сервис оформления заказов пока не настроен.','Open this store from its Telegram Mini App to place an order.':'Чтобы оформить заказ, откройте магазин через мини-приложение Telegram.','Could not create the order. Please try again.':'Не удалось оформить заказ. Попробуйте ещё раз.','Loading catalog':'ЗАГРУЗКА КАТАЛОГА','Photo photos':'Фотографии товара','IN STOCK':'В НАЛИЧИИ','AVAILABLE':'ДОСТУПНО','NEW IN':'НОВИНКИ','COLLECTION':'КОЛЛЕКЦИЯ','SHOP ALL':'ВСЕ ТОВАРЫ','YOUR SELECTION':'ВАШ ВЫБОР','FAVORITES ARE EMPTY':'В ИЗБРАННОМ ПОКА ПУСТО','SIZE':'РАЗМЕР','COLOR':'ЦВЕТ','PRODUCTS':'ТОВАРОВ','NAME':'ИМЯ','TELEGRAM ID':'TELEGRAM ID'})
Object.assign(translations.et,{'This item is out of stock':'Toode on praegu otsas','Maximum available quantity is already in your bag':'Ostukotis on juba kogu saadaolev kogus','Added to bag':'Lisatud ostukotti','Removed from favorites':'Eemaldatud lemmikutest','Added to favorites':'Lisatud lemmikutesse','Order service is not configured for this store.':'Tellimisteenus pole veel seadistatud.','Open this store from its Telegram Mini App to place an order.':'Tellimuse esitamiseks ava pood Telegrami minirakenduses.','Could not create the order. Please try again.':'Tellimuse esitamine ebaõnnestus. Proovi uuesti.','Loading catalog':'KATALOOGI LAADIMINE','IN STOCK':'SAADAVAL','NEW IN':'UUS KAUP','COLLECTION':'KOLLEKTSIOON','SHOP ALL':'KÕIK TOOTED','YOUR SELECTION':'SINU VALIK','PRODUCTS':'TOODET','NAME':'NIMI','TELEGRAM ID':'TELEGRAMI ID'})
const languageNames:Record<Language,string>={en:'EN',ru:'RU',et:'ET'}
const languageContext=React.createContext<Language>('en')
function localizeText(value:string,language:Language){const table=translations[language];const leading=value.match(/^\s*/)?.[0]||'';const trailing=value.match(/\s*$/)?.[0]||'';const core=value.trim();return table[core]!==undefined?leading+table[core]+trailing:value}
function Localized({children}:{children:React.ReactNode}){const language=React.useContext(languageContext);const visit=(node:React.ReactNode):React.ReactNode=>{if(typeof node==='string')return localizeText(node,language);if(Array.isArray(node))return node.map(visit);if(React.isValidElement(node)){const props=node.props as {children?:React.ReactNode;placeholder?:string;title?:string;['aria-label']?:string};return React.cloneElement(node as React.ReactElement<any>,{'placeholder':props.placeholder?localizeText(props.placeholder,language):undefined,'title':props.title?localizeText(props.title,language):undefined,'aria-label':props['aria-label']?localizeText(props['aria-label'],language):undefined},visit(props.children))}return node};return <>{visit(children)}</>}
function detectLanguage():Language{try{const saved=localStorage.getItem('yp-language');if(saved==='ru'||saved==='et'||saved==='en')return saved}catch{}const tg=(window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code;const value=String(tg||navigator.language||'en').toLowerCase();return value.startsWith('ru')?'ru':value.startsWith('et')?'et':'en'}
const instagramUrl=String(import.meta.env.VITE_INSTAGRAM_URL||'').trim()

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

function stockForProduct(product:Product):number{return Math.max(0,Math.floor(Number((product as Product & {stock?:number}).stock)||0))}
function quantityOfProduct(cart:CartLine[],productId:string):number{return cart.reduce((total,line)=>total+(line.productId===productId?line.quantity:0),0)}

function dbProduct(row:any):StoreProduct{
 const category=(row.category?.name||'T-Shirts') as Exclude<Category,'All'>
 const colors=normalizeColors(row.colors)
 const images=Array.isArray(row.images)?row.images.filter(Boolean):(typeof row.images==='string'?[row.images].filter(Boolean):[])
 return {id:row.id,name:row.name,category,price:Number(row.price),description:row.description||'',composition:row.composition||'',sizes:Array.isArray(row.sizes)?row.sizes:[],lengths:Array.isArray(row.lengths)?row.lengths:[],colors,images:images.length?images:(row.image_url?[row.image_url]:[]),featured:Boolean(row.featured),stock:Math.max(0,Number(row.stock)||0),isSold:Boolean(row.is_sold)}
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
 if(!supabase)throw new Error('Catalog service is not configured.')
 const {data,error}=await supabase
  .from('products')
  .select('id,name,price,description,composition,sizes,lengths,colors,images,image_url,stock,featured,is_sold,sort_order,created_at,category:categories(name)')
  .or('is_active.eq.true,is_sold.eq.true')
  .order('sort_order',{ascending:true})
  .order('created_at',{ascending:false})
 if(error)throw error
 if(!data)return []
 const items=data.map(dbProduct)
 writeStoreCache(items)
 return items
}

function App(){
 const [screen,setScreen]=useState<Screen>('home')
 const [language,setLanguage]=useState<Language>(detectLanguage)
 const [selected,setSelected]=useState<Product|null>(null)
 const [query,setQuery]=useState('')
 const [cat,setCat]=useState<Category>('All')
 const [showFilters,setShowFilters]=useState(false)
 const [filterSize,setFilterSize]=useState('All')
 const [filterColor,setFilterColor]=useState('All')
 const [maxPrice,setMaxPrice]=useState<number|null>(null)
 const [toast,setToast]=useState('')
 const [favorites,setFavorites]=useState<string[]>(()=>Array.from(new Set(readStorage<string[]>('yp-favorites',[]).filter(Boolean))))
 const [products,setProducts]=useState<StoreProduct[]>(()=>((readStoreCache()||[]) as StoreProduct[]))
 const [storeLoading,setStoreLoading]=useState(true)
 const [storeError,setStoreError]=useState('')
 const [cart,setCart]=useState<CartLine[]>(()=>readStorage<CartLine[]>('yp-cart',[]))
 const [checkoutOpen,setCheckoutOpen]=useState(false)
 const [checkoutBusy,setCheckoutBusy]=useState(false)
 const [telegramId,setTelegramId]=useState(()=>String((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id||''))
 const [orderMessage,setOrderMessage]=useState('')
 const [pendingOrderRequest,setPendingOrderRequest]=useState<{fingerprint:string;key:string}|null>(()=>readStorage('yp-pending-order-request',null))
 const activeProducts=useMemo(()=>products.filter(p=>!p.isSold),[products])
 const soldProducts=useMemo(()=>products.filter(p=>p.isSold),[products])
 const colors=useMemo(()=>['All',...Array.from(new Set(activeProducts.flatMap(p=>p.colors.map(c=>c.name))))], [activeProducts])
 const priceBounds=useMemo(()=>{const prices=activeProducts.map(p=>Number(p.price)).filter(Number.isFinite);if(!prices.length)return {min:0,max:0};return {min:Math.floor(Math.min(...prices)),max:Math.ceil(Math.max(...prices))}},[products])
 const effectiveMaxPrice=maxPrice===null?priceBounds.max:Math.min(Math.max(maxPrice,priceBounds.min),priceBounds.max)
 useEffect(()=>{if(priceBounds.max>0)setMaxPrice(current=>current===null?priceBounds.max:Math.min(Math.max(current,priceBounds.min),priceBounds.max))},[priceBounds.min,priceBounds.max])
 const filtered=useMemo(()=>activeProducts.filter(p=>{const text=p.name.toLowerCase().includes(query.toLowerCase())||p.description.toLowerCase().includes(query.toLowerCase());const size=isBeltCategory(String(p.category))||filterSize==='All'||p.sizes.includes(filterSize);const color=filterColor==='All'||p.colors.some(c=>c.name===filterColor);return(cat==='All'||p.category===cat)&&text&&size&&color&&p.price<=effectiveMaxPrice}),[activeProducts,cat,query,filterSize,filterColor,effectiveMaxPrice])
 useEffect(()=>{localStorage.setItem('yp-favorites',JSON.stringify(favorites))},[favorites])
 useEffect(()=>{localStorage.setItem('yp-cart',JSON.stringify(cart))},[cart])
 useEffect(()=>{document.documentElement.lang=language;localStorage.setItem('yp-language',language)},[language])
 useEffect(()=>{const tg=(window as any).Telegram?.WebApp;if(tg){tg.ready();tg.expand()}},[])
 useEffect(()=>{let active=true;(async()=>{setStoreLoading(true);const items=await fetchStoreProducts();if(!active)return;setProducts(items as StoreProduct[]);setCart(current=>current.filter(line=>items.some(item=>item.id===line.productId&&!Boolean((item as StoreProduct).isSold))));setStoreError('');setStoreLoading(false)})().catch(()=>{if(active){const cached=readStoreCache();if(cached)setProducts(cached as StoreProduct[]);else setProducts([]);setStoreError(cached?'Could not refresh the catalog. Showing cached products.':'Could not load the catalog.');setStoreLoading(false)}});return()=>{active=false}},[])
 function notify(v:string){setToast(v);window.setTimeout(()=>setToast(''),1500)}
 function toggleFavorite(id:string){setFavorites(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id])}
 function addToCart(line:CartLine){const product=products.find(item=>item.id===line.productId);const stock=product?stockForProduct(product):0;if(!product||(product as StoreProduct).isSold||quantityOfProduct(cart,line.productId)>=stock){notify(!product||(product as StoreProduct).isSold?'This item has been sold':stock<1?'This item is out of stock':'Maximum available quantity is already in your bag');return}setCart(current=>{if(quantityOfProduct(current,line.productId)>=stock)return current;const found=current.find(x=>x.productId===line.productId&&x.color===line.color&&x.size===line.size&&x.length===line.length);return found?current.map(x=>x===found?{...x,quantity:x.quantity+1}:x):[...current,line]});setSelected(null);notify('Added to bag')}
 async function placeOrder(customerNameValue:string){
  if(!cart.length||checkoutBusy)return
  if(!supabase){setOrderMessage('Order service is not configured for this store.');return}
  const initData=(window as any).Telegram?.WebApp?.initData||''
  if(!initData){setOrderMessage('Open this store from its Telegram Mini App to place an order.');return}
  setCheckoutBusy(true);setOrderMessage('')
  const fingerprint=JSON.stringify({cart,customerName:customerNameValue,telegramId:telegramId.trim()})
  const idempotencyKey=pendingOrderRequest?.fingerprint===fingerprint?pendingOrderRequest.key:crypto.randomUUID()
  const pendingRequest={fingerprint,key:idempotencyKey}
  setPendingOrderRequest(pendingRequest);localStorage.setItem('yp-pending-order-request',JSON.stringify(pendingRequest))
  try{
   const {data,error}=await supabase.functions.invoke('create-order',{body:{customerName:customerNameValue,phone:'',telegramId:telegramId.trim(),items:cart,telegramInitData:initData,idempotencyKey}})
   if(error||data?.error||data?.code){let message=data?.error||data?.code||'Could not create the order. Please try again.';try{const response=(error as any)?.context;if(response&&typeof response.clone==='function'){const body=await response.clone().json();if(body?.error||body?.code)message=body.error||body.code}}catch{}throw new Error(message)}
   setCart([]);setCheckoutOpen(false);localStorage.removeItem('yp-pending-order-request');setPendingOrderRequest(null);setOrderMessage(`Order #${data.orderNumber} created. Status: awaiting payment.${data.notificationSent?'':' Telegram notification was not sent; check the function logs.'}`)
  }catch(error){setOrderMessage(error instanceof Error?error.message:'Could not create the order. Please try again.')}
  finally{setCheckoutBusy(false)}
 }
 function openCategory(c:Category){setCat(c);setScreen('catalog');window.scrollTo({top:0,behavior:'smooth'})}
 return <languageContext.Provider value={language}><Localized><div className="app-shell"><main className="store-shell safe-bottom">
  <header className="site-header"><button onClick={()=>setScreen('home')} className="brand-button" aria-label="YAROPLUGG home"><img src="/logo.png" alt="YAROPLUGG" className="brand-logo"/></button><div className="header-actions"><div className="language-switch" role="group" aria-label="Language">{(['en','ru','et'] as Language[]).map(code=><button key={code} type="button" className={language===code?'active':''} aria-pressed={language===code} onClick={()=>setLanguage(code)}>{languageNames[code]}</button>)}</div><button onClick={()=>{setScreen('catalog');setTimeout(()=>document.getElementById('search')?.focus(),50)}} className="icon-button" aria-label="Search"><Search size={18}/></button><button onClick={()=>setCheckoutOpen(true)} className="icon-button cart-icon" aria-label={`Shopping bag, ${cart.reduce((n,x)=>n+x.quantity,0)} items`}><ShoppingBag size={18}/>{cart.length>0&&<span>{cart.reduce((n,x)=>n+x.quantity,0)}</span>}</button></div></header>
  {screen==='home'&&<Home onCatalog={()=>setScreen('catalog')} onCategory={openCategory} onProduct={setSelected} favorites={favorites} onFavorite={toggleFavorite} products={activeProducts} loading={storeLoading}/>} 
  {screen==='catalog'&&<Catalog query={query} setQuery={setQuery} cat={cat} setCat={setCat} products={filtered} priceMin={priceBounds.min} priceMax={priceBounds.max} onProduct={setSelected} onFilters={()=>setShowFilters(true)} favorites={favorites} onFavorite={toggleFavorite} loading={storeLoading}/>} 
  {screen==='favorites'&&<Favorites products={activeProducts.filter(p=>favorites.includes(p.id))} onProduct={setSelected} favorites={favorites} onFavorite={toggleFavorite}/>} 
  {screen==='info'&&<InfoPage instagramUrl={instagramUrl}/>} {screen==='sold'&&<Sold products={soldProducts} onProduct={setSelected}/>} {storeLoading&&<div className="store-loading-bar" aria-label="Loading catalog"><span/></div>} {storeError&&<div className="store-refresh-note">{storeError}</div>}
  <nav className="bottom-nav" aria-label="Main navigation"><Nav icon={<House size={17}/>} label="SHOP" active={screen==='home'} onClick={()=>setScreen('home')}/><Nav icon={<Search size={17}/>} label="CATEGORIES" active={screen==='catalog'} onClick={()=>setScreen('catalog')}/><Nav icon={<Heart size={17}/>} label="FAVORITES" active={screen==='favorites'} onClick={()=>setScreen('favorites')} badge={favorites.length} ariaLabel={`Favorites, ${favorites.length} ${favorites.length===1?'item':'items'}`}/><Nav icon={<Tag size={17}/>} label="SOLD" active={screen==='sold'} onClick={()=>setScreen('sold')}/><Nav icon={<InfoIcon size={17}/>} label="INFO" active={screen==='info'} onClick={()=>setScreen('info')}/></nav>
  {selected&&<ProductModal product={selected} cartQuantity={quantityOfProduct(cart,selected.id)} onClose={()=>setSelected(null)} onAdd={addToCart} onFavorite={()=>{toggleFavorite(selected.id);notify(favorites.includes(selected.id)?'Removed from favorites':'Added to favorites')}} favorite={favorites.includes(selected.id)}/>} {showFilters&&<Filters size={filterSize} color={filterColor} maxPrice={effectiveMaxPrice} minPrice={priceBounds.min} maxPriceBound={priceBounds.max} colors={colors} onClose={()=>setShowFilters(false)} onApply={(s,c,p)=>{setFilterSize(s);setFilterColor(c);setMaxPrice(p);setShowFilters(false)}}/>} {checkoutOpen&&<CartCheckout cart={cart} products={activeProducts} setCart={setCart} onClose={()=>setCheckoutOpen(false)} onCheckout={placeOrder} telegramId={telegramId} setTelegramId={setTelegramId} busy={checkoutBusy} message={orderMessage}/>} {orderMessage&&!checkoutOpen&&<div className="toast">{orderMessage}</div>} {toast&&<div className="toast">{toast}</div>}
 </main></div></Localized></languageContext.Provider>
}
function Nav({icon,label,active,onClick,badge=0,ariaLabel}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void;badge?:number;ariaLabel?:string}){const displayBadge=badge>99?'99+':String(badge);return <Localized>{<button onClick={onClick} className={`nav-item ${active?'is-active':''}`} aria-label={ariaLabel||label}><span className="nav-icon-wrap"><span className="nav-icon">{icon}</span>{badge>0&&<span className="nav-badge" aria-hidden="true">{displayBadge}</span>}</span><span>{label}</span></button>}</Localized>}
function Home({onCatalog,onCategory,onProduct,favorites,onFavorite,products,loading}:{onCatalog:()=>void;onCategory:(c:Category)=>void;onProduct:(p:Product)=>void;favorites:string[];onFavorite:(id:string)=>void;products:Product[];loading:boolean}){return <Localized>{<div className="page-pad"><section className="hero-card"><button onClick={onCatalog} className="hero-image-button" aria-label="Shop new collection"><img src="/hero-drop.png" alt="YAROPLUGG New Drop collection" loading="eager" decoding="async"/></button></section><div className="category-strip">{cats.slice(1).map(c=><button key={c} onClick={()=>onCategory(c)}>{c.toUpperCase()}</button>)}</div><div className="section-head"><div><p>SELECTED</p><h2>NEW IN</h2></div><button onClick={onCatalog}>VIEW ALL <ArrowUpRight size={14}/></button></div>{loading&&!products.some(p=>p.featured)?<ProductGridSkeleton count={4}/>:<div className="product-grid">{products.filter(p=>p.featured).map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>}</div>}</Localized>}
function Catalog({query,setQuery,cat,setCat,products,priceMin,priceMax,onProduct,onFilters,favorites,onFavorite,loading}:{query:string;setQuery:(v:string)=>void;cat:Category;setCat:(v:Category)=>void;products:Product[];priceMin:number;priceMax:number;onProduct:(p:Product)=>void;onFilters:()=>void;favorites:string[];onFavorite:(id:string)=>void;loading:boolean}){return <Localized>{<div className="page-pad"><div className="catalog-head"><div><p>COLLECTION</p><h1>SHOP ALL</h1></div><button onClick={onFilters} className="filter-button" aria-label="Filters"><SlidersHorizontal size={17}/></button></div><div className="search-box"><Search size={17}/><input id="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="SEARCH PRODUCTS"/></div><div className="category-strip catalog-tabs">{cats.map(c=><button key={c} onClick={()=>setCat(c)} className={cat===c?'active':''}>{c.toUpperCase()}</button>)}</div><div className="catalog-meta"><span>{loading&&products.length===0?'LOADING PRODUCTS':products.length+' PRODUCTS'}</span><span>{priceMax>0?`€${priceMin} — €${priceMax}`:''}</span></div>{loading&&products.length===0?<ProductGridSkeleton count={6}/>:<><div className="product-grid">{products.map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>{products.length===0&&<div className="empty-state">NO PRODUCTS FOUND</div>}</>}</div>}</Localized>}
function Favorites({products,onProduct,favorites,onFavorite}:{products:Product[];onProduct:(p:Product)=>void;favorites:string[];onFavorite:(id:string)=>void}){return <Localized>{<div className="page-pad page-top"><div className="catalog-head"><div><p>YOUR SELECTION</p><h1>FAVORITES</h1></div><span className="favorite-count">{products.length} SAVED</span></div>{products.length===0?<div className="empty-card favorites-empty"><Heart size={22}/><h2>YOUR FAVORITES ARE EMPTY</h2><p>Tap the heart on any product to save it here.</p></div>:<div className="product-grid">{products.map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>}</div>}</Localized>}
function Sold({products,onProduct}:{products:Product[];onProduct:(p:Product)=>void}){return <Localized>{<div className="page-pad page-top"><div className="catalog-head"><div><p>PAST DROPS</p><h1>SOLD</h1></div><span className="favorite-count">{products.length} SOLD</span></div>{products.length===0?<div className="empty-card favorites-empty"><Tag size={22}/><h2>NOTHING SOLD YET</h2></div>:<div className="product-grid">{products.map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={false} onFavorite={()=>{}}/>)}</div>}</div>}</Localized>}

function ProductGridSkeleton({count}:{count:number}){return <div className="product-grid product-grid-loading" aria-label="Loading products">{Array.from({length:count},(_,i)=><div className="product-skeleton" key={i} aria-hidden="true"><div className="product-skeleton-media"/><div className="product-skeleton-line"/><div className="product-skeleton-line short"/></div>)}</div>}
function ProductCard({p,onClick,favorite,onFavorite}:{p:Product;onClick:()=>void;favorite:boolean;onFavorite:()=>void}){const sold=Boolean((p as StoreProduct).isSold);return <Localized>{<article className={`product-card ${sold?'is-sold-card':''}`}><div className="product-media"><button onClick={onClick} className="media-button"><img src={p.images[0]} alt={p.name} loading="lazy" decoding="async"/></button>{sold&&<span className="sold-stamp">SOLD</span>}{!sold&&<button onClick={e=>{e.stopPropagation();onFavorite()}} className="favorite-button" aria-label={favorite?'Remove from favorites':'Add to favorites'}><Heart size={15} fill={favorite?'currentColor':'none'} className={favorite?'favorite-on':''}/></button>}</div><button onClick={onClick} className="product-info"><div className="product-name">{p.name}</div><div className="product-price">€{p.price}</div></button></article>}</Localized>}
function ProductModal({product,cartQuantity,onClose,onAdd,onFavorite,favorite}:{product:Product;cartQuantity:number;onClose:()=>void;onAdd:(line:CartLine)=>void;onFavorite:()=>void;favorite:boolean}){
 const sold=Boolean((product as StoreProduct).isSold)
 const[color,setColor]=useState(product.colors[0]?.name||'');
 const[size,setSize]=useState(product.sizes[0]||'');
 const[length,setLength]=useState(((product as Product & {lengths?:string[]}).lengths||[])[0]||'');
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
 return <Localized>{<><div className="modal-backdrop"><div className="sheet product-sheet"><div className="modal-media"><div ref={galleryRef} onScroll={handleGalleryScroll} className="product-swipe-gallery" aria-label="Product photos" role="region">{images.length?images.map((url,i)=><button type="button" className="product-swipe-slide" key={`${url}-${i}`} onClick={()=>openViewer(i)} aria-label={`Open ${product.name} photo ${i+1} in full screen`}><img src={url} alt={`${product.name} photo ${i+1}`} loading={i===0?'eager':'lazy'} decoding="async"/></button>):<div className="image-placeholder">NO IMAGE</div>}</div><button onClick={onClose} className="close-button" aria-label="Close"><X size={18}/></button>{images.length>1&&<div className="gallery-dots" aria-label={`Photo ${imageIndex+1} of ${images.length}`}>{images.map((_,i)=><span key={i} className={i===imageIndex?'active':''}/>)}</div>}</div><div className="sheet-content product-sheet-content"><div className="product-title-row"><div><div className="eyebrow red">{product.category}</div><h2>{product.name}</h2></div><div className="modal-price">€{product.price}</div></div><div className={`stock-note ${Math.max(0,Number((product as Product & {stock?:number}).stock)||0)===0?'is-out':''}`}>{Math.max(0,Number((product as Product & {stock?:number}).stock)||0)>0?<><span>IN STOCK</span><b>{Math.max(0,Number((product as Product & {stock?:number}).stock)||0)}</b><em>AVAILABLE</em></>:'OUT OF STOCK'}</div><div className="product-options-grid">{isBeltCategory(product.category)?<div className="option-block"><div className="option-label">BELT LENGTH</div><div className="option-row">{((product as Product & {lengths?:string[]}).lengths||[]).map(l=><button type="button" key={l} onClick={()=>setLength(l)} className={`view-size ${length===l?'selected':''}`}>{l} CM</button>)}</div></div>:<div className="option-block"><div className="option-label">AVAILABLE SIZES</div><div className="option-row">{product.sizes.map(s=><button type="button" key={s} onClick={()=>setSize(s)} className={`view-size ${size===s?'selected':''}`}>{s}</button>)}</div></div>}<div className="option-block"><div className="option-label">COLOR · {color.toUpperCase()}</div><div className="color-row">{product.colors.map(c=><button key={c.name} aria-label={c.name} onClick={()=>setColor(c.name)} style={{background:c.hex}} className={color===c.name?'color-selected':''}/>)}</div></div></div><div className="description">{product.description}</div><div className="composition">COMPOSITION: {product.composition}</div><button type="button" className="primary-dark add-to-bag" disabled={sold||stockForProduct(product)<1||cartQuantity>=stockForProduct(product)||!color||(isBeltCategory(product.category)?!length:!size)} onClick={()=>onAdd({productId:product.id,quantity:1,color,...(isBeltCategory(product.category)?{length}:{size})})}><ShoppingBag size={16}/> {sold?'SOLD':cartQuantity>=stockForProduct(product)?'MAX AVAILABLE IN BAG':'ADD TO BAG'} · €{Number(product.price).toFixed(2)}</button><button onClick={onFavorite} className="primary-red favorite-product-button"><Heart size={15} fill={favorite?'currentColor':'none'}/>{favorite?'REMOVE FROM FAVORITES':'SAVE TO FAVORITES'}</button></div></div></div>{viewerOpen&&images.length>0&&<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} photo viewer`} onClick={closeViewer} onTouchStart={e=>{if(zoom===1&&e.touches.length===1)viewerTouchStart.current=e.touches[0].clientX}} onTouchEnd={e=>{if(zoom!==1){viewerTouchStart.current=null;return}const start=viewerTouchStart.current;viewerTouchStart.current=null;if(start===null)return;const dx=e.changedTouches[0].clientX-start;if(Math.abs(dx)>50){if(dx<0)nextViewer();else prevViewer()}}}>
  <button type="button" className="photo-lightbox-close" onClick={e=>{e.stopPropagation();closeViewer()}} aria-label="Close photo viewer"><X size={22}/></button>
  
  {images.length>1&&<button type="button" className="photo-lightbox-arrow prev" onClick={e=>{e.stopPropagation();prevViewer()}} aria-label="Previous photo"><ChevronLeft size={28}/></button>}
  <img className={`photo-lightbox-image ${zoom>1?'is-zoomed':''}`} src={images[viewerIndex]} alt={`${product.name} photo ${viewerIndex+1}`} style={{transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`}} onClick={e=>e.stopPropagation()} onDoubleClick={e=>{e.stopPropagation();handleDoubleClick()}} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}/>
  {images.length>1&&<button type="button" className="photo-lightbox-arrow next" onClick={e=>{e.stopPropagation();nextViewer()}} aria-label="Next photo"><ChevronRight size={28}/></button>}
  <div className="photo-lightbox-count">{viewerIndex+1} / {images.length}</div>
 </div>}</>}</Localized>}

function CartCheckout({cart,products,setCart,onClose,onCheckout,telegramId,setTelegramId,busy,message}:{cart:CartLine[];products:Product[];setCart:React.Dispatch<React.SetStateAction<CartLine[]>>;onClose:()=>void;onCheckout:(customerName:string)=>void;telegramId:string;setTelegramId:(v:string)=>void;busy:boolean;message:string}){
 const [customerName,setCustomerName]=useState('')
 const rows=cart.map(line=>({line,product:products.find(p=>p.id===line.productId)})).filter((row):row is {line:CartLine;product:Product}=>Boolean(row.product))
 const total=rows.reduce((sum,row)=>sum+Number(row.product.price)*row.line.quantity,0)
 return <Localized>{<div className="modal-backdrop"><section className="sheet cart-sheet"><div className="sheet-title-row"><div><div className="eyebrow red">YAROPLUGG</div><h2>YOUR BAG</h2></div><button onClick={onClose} className="close-button small" aria-label="Close bag"><X size={18}/></button></div>{rows.length===0?<div className="cart-empty">YOUR BAG IS EMPTY</div>:<><div className="cart-lines">{rows.map(({line,product})=><article className="cart-line" key={`${line.productId}-${line.size}-${line.length}-${line.color}`}><img src={product.images[0]} alt=""/><div className="cart-line-info"><b>{product.name}</b><span>{line.size||`${line.length} cm`} · {line.color}</span><span>€{Number(product.price).toFixed(2)}</span><div className="cart-quantity"><button type="button" onClick={()=>setCart(current=>current.flatMap(x=>x===line?(x.quantity<=1?[]:[{...x,quantity:x.quantity-1}]):[x]))} aria-label={`Decrease quantity of ${product.name}`}><Minus size={13} strokeWidth={1.8}/></button><span aria-live="polite">{line.quantity}</span><button type="button" disabled={quantityOfProduct(cart,product.id)>=stockForProduct(product)} onClick={()=>setCart(current=>quantityOfProduct(current,product.id)>=stockForProduct(product)?current:current.map(x=>x===line?{...x,quantity:x.quantity+1}:x))} aria-label={`Increase quantity of ${product.name}; maximum ${stockForProduct(product)} in stock`}><Plus size={13} strokeWidth={1.8}/></button><button type="button" className="cart-remove" onClick={()=>setCart(current=>current.filter(x=>x!==line))} aria-label={`Remove ${product.name} from bag`} title="Remove item"><Trash2 size={14} strokeWidth={1.7}/></button></div></div></article>)}</div><div className="cart-total"><span>ORDER TOTAL</span><b>€{total.toFixed(2)}</b></div><div className="checkout-fields"><label>NAME<input autoComplete="name" value={customerName} onChange={e=>setCustomerName(e.target.value)} maxLength={120} required/></label><label>TELEGRAM ID<input autoComplete="off" inputMode="numeric" pattern="[0-9]{5,20}" value={telegramId} onChange={e=>setTelegramId(e.target.value.replace(/\D/g,''))} maxLength={20} required/><small className="admin-field-hint">Filled from your Telegram account. Check that it is yours.</small></label></div><p className="checkout-disclaimer">This order is not paid yet. Payment options will be confirmed separately.</p>{message&&<p className="checkout-error">{message}</p>}<button className="primary-red" disabled={busy||!customerName.trim()||!/^[0-9]{5,20}$/.test(telegramId.trim())} onClick={()=>onCheckout(customerName)}>{busy?'CREATING ORDER…':'PLACE ORDER · AWAITING PAYMENT'}</button></>}</section></div>
}</Localized>}

function Filters({size,color,maxPrice,minPrice,maxPriceBound,colors,onClose,onApply}:{size:string;color:string;maxPrice:number;minPrice:number;maxPriceBound:number;colors:string[];onClose:()=>void;onApply:(s:string,c:string,p:number)=>void}){const[s,setS]=useState(size),[c,setC]=useState(color),[p,setP]=useState(maxPrice);return <Localized>{<div className="modal-backdrop align-end"><div className="sheet filter-sheet"><div className="sheet-title-row"><h2>FILTERS</h2><button onClick={onClose} className="close-button small"><X size={18}/></button></div><div className="filter-group"><div className="option-label">SIZE</div><div className="option-row wrap">{['All',...sizes].map(x=><button key={x} onClick={()=>setS(x)} className={s===x?'selected':''}>{x}</button>)}</div></div><div className="filter-group"><div className="option-label">COLOR</div><div className="select-wrap"><select value={c} onChange={e=>setC(e.target.value)}>{colors.map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={18}/></div></div><div className="filter-group"><div className="price-line"><span className="option-label">MAXIMUM PRICE</span><span>€{p}</span></div><input type="range" min={minPrice} max={maxPriceBound} value={p} onChange={e=>setP(Number(e.target.value))}/></div><button onClick={()=>onApply(s,c,p)} className="primary-red">APPLY FILTERS</button></div></div>}</Localized>}
function InfoPage({instagramUrl}:{instagramUrl:string}){
 const language=React.useContext(languageContext)
 const copy={
  en:{eyebrow:'YAROPLUGG STORE',title:'INFO',about:'ABOUT THE STORE',aboutText:'YAROPLUGG STORE began with a simple idea: bring our clothing store closer to our Telegram community. Now the collection, bag and ordering come together in one place. Find a piece that feels like you.',ordering:'HOW TO ORDER',orderingText:'Choose an item, add it to your bag and submit your order. Our manager will contact you to confirm the order and discuss payment and delivery.',delivery:'DELIVERY & PAYMENT',deliveryText:'The delivery method, cost and payment details are agreed with the manager after you submit your order.',social:'SOCIAL NETWORKS'},
  ru:{eyebrow:'YAROPLUGG STORE',title:'ИНФО',about:'О МАГАЗИНЕ',aboutText:'YAROPLUGG STORE начался с простой идеи — сделать наш магазин одежды ближе к аудитории Telegram. Теперь каталог, корзина и оформление заказа собраны в одном месте. Выберите то, что подходит вашему стилю.',ordering:'КАК ЗАКАЗАТЬ',orderingText:'Выберите товар, добавьте его в корзину и отправьте заказ. Менеджер свяжется с вами, чтобы подтвердить заказ и обсудить оплату и доставку.',delivery:'ДОСТАВКА И ОПЛАТА',deliveryText:'Способ и стоимость доставки, а также оплату менеджер согласует с вами после отправки заказа.',social:'СОЦ. СЕТИ'},
  et:{eyebrow:'YAROPLUGG STORE',title:'INFO',about:'MEIST',aboutText:'YAROPLUGG STORE sai alguse lihtsast mõttest tuua meie rõivapood Telegrami kogukonnale lähemale. Nüüd on kataloog, ostukott ja tellimuse esitamine ühes kohas. Leia oma stiiliga sobiv ese.',ordering:'KUIDAS TELLIDA',orderingText:'Vali toode, lisa see ostukotti ja esita tellimus. Haldur võtab sinuga ühendust, et tellimus kinnitada ning makse ja tarne kokku leppida.',delivery:'TARNE JA MAKSMINE',deliveryText:'Tarneviisi ja -hinna ning makse lepib haldur sinuga kokku pärast tellimuse esitamist.',social:'SOTS. VÕRGUSTIKUD'}
 }[language]
 const safeInstagram=/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(instagramUrl)?instagramUrl:''
 return <div className="page-pad page-top"><p className="eyebrow red">{copy.eyebrow}</p><div className="info-title-row"><h1 className="page-title">{copy.title}</h1>{safeInstagram&&<div className="info-social"><span>{copy.social}</span><a className="instagram-icon-link" href={safeInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram @yarowth" title="Instagram @yarowth"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="instagram-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop stopColor="#feda75"/><stop offset=".34" stopColor="#fa7e1e"/><stop offset=".62" stopColor="#d62976"/><stop offset=".82" stopColor="#962fbf"/><stop offset="1" stopColor="#4f5bd5"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#instagram-gradient)" strokeWidth="2"/><circle cx="12" cy="12" r="4.2" stroke="url(#instagram-gradient)" strokeWidth="2"/><circle cx="17.5" cy="6.8" r="1.15" fill="url(#instagram-gradient)"/></svg></a></div>}</div><div className="info-list"><section className="info-card"><span>{copy.about}</span><p>{copy.aboutText}</p></section><section className="info-card"><span>{copy.ordering}</span><p>{copy.orderingText}</p></section><section className="info-card"><span>{copy.delivery}</span><p>{copy.deliveryText}</p></section></div></div>
}

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
 const [adminSection,setAdminSection]=useState<AdminSection>('products')
 const [orders,setOrders]=useState<any[]>([])
 const [ordersLoading,setOrdersLoading]=useState(false)
 const [ordersError,setOrdersError]=useState('')
 const [savingOrderId,setSavingOrderId]=useState<string|null>(null)
 const [orderFilter,setOrderFilter]=useState<'all'|OrderStatus>('all')

 useEffect(()=>{
  if(!supabase){setLoading(false);return}
  supabase.auth.getSession().then(({data})=>{setUser(data.session?.user??null);setLoading(false)})
  const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null))
  return ()=>listener.subscription.unsubscribe()
 },[])
 useEffect(()=>{if(user?.app_metadata?.role==='admin')void loadAdminData()},[user])
 useEffect(()=>{if(user?.app_metadata?.role==='admin'&&adminSection==='orders')void loadOrders()},[user,adminSection])

 async function loadAdminData(){
  if(!supabase||user?.app_metadata?.role!=='admin')return
  const [{data:ps,error:pe},{data:cs,error:ce}]=await Promise.all([
   supabase.from('products').select('*, category:categories(name,slug)').order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
   supabase.from('categories').select('*').order('sort_order',{ascending:true})
  ])
  if(pe||ce){setMessage(pe?.message||ce?.message||'Could not load admin data');return}
  setAdminProducts(ps||[]);setCategories(cs||[])
 }
 async function loadOrders(){
  if(!supabase)return
  if(user?.app_metadata?.role!=='admin'){setOrdersError('Order access is restricted. In Supabase, set app_metadata.role to admin for your admin account, then sign out and sign in again.');return}
  setOrdersLoading(true);setOrdersError('')
  const {data,error}=await supabase.from('store_orders').select('id,order_number,customer_name,telegram_user_id,telegram_username,total_cents,status,payment_status,fulfillment_status,stock_reserved,manager_note,created_at,store_order_items(id,product_name,unit_price_cents,quantity,size,color,length)').order('created_at',{ascending:false})
  if(error)setOrdersError(error.message)
  else setOrders(data||[])
  setOrdersLoading(false)
 }
 async function updateOrderStatus(orderId:string,status:OrderStatus){
  if(!supabase||!user||user.app_metadata?.role!=='admin')return
  setSavingOrderId(orderId);setOrdersError('')
  try{
   const {error}=await supabase.rpc('admin_update_store_order',{p_order_id:orderId,p_status:status,p_payment_status:null,p_manager_note:null})
   if(error)throw error
   await loadOrders()
   setMessage(status==='cancelled'?'Order cancelled and reserved stock returned.':'Order status updated.')
  }catch(error){setOrdersError(error instanceof Error?error.message:'Could not update order status.')}
  finally{setSavingOrderId(null)}
 }
 async function updateOrderPaymentStatus(orderId:string,status:PaymentStatus){
  if(!supabase||!user||user.app_metadata?.role!=='admin')return
  setSavingOrderId(orderId);setOrdersError('')
  try{
   const {error}=await supabase.rpc('admin_update_store_order',{p_order_id:orderId,p_status:null,p_payment_status:status,p_manager_note:null})
   if(error)throw error
   await loadOrders()
   setMessage(status==='paid'?'Payment marked as paid.':'Payment marked as refunded.')
  }catch(error){setOrdersError(error instanceof Error?error.message:'Could not update payment status.')}
  finally{setSavingOrderId(null)}
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
 async function markProductSold(p:any){if(!supabase||!user||user.app_metadata?.role!=='admin')return;if(!window.confirm(`Mark ${p.name} as sold? It will disappear from the active catalog and appear in SOLD.`))return;setMessage('');const {error}=await supabase.from('products').update({is_sold:true,is_active:false,updated_at:new Date().toISOString()}).eq('id',p.id);if(error){setMessage(`Could not mark as sold: ${error.message}`);return}setMessage(`${p.name} moved to SOLD`);await loadAdminData()}
 async function restoreSoldProduct(p:any){if(!supabase||!user||user.app_metadata?.role!=='admin')return;const {error}=await supabase.from('products').update({is_sold:false,is_active:true,updated_at:new Date().toISOString()}).eq('id',p.id);if(error){setMessage(`Could not restore product: ${error.message}`);return}setMessage(`${p.name} restored to PRODUCTS`);await loadAdminData()}
 async function deleteProduct(p:any){if(!supabase||!user)return;if(!window.confirm(`Delete ${p.name}?`))return;const urls=Array.isArray(p.images)&&p.images.length?p.images:(p.image_url?[p.image_url]:[]);const {error}=await supabase.from('products').delete().eq('id',p.id);if(error){setMessage(error.message);return}if(urls.length)await removeStorageUrls(urls);setMessage('Product deleted');await loadAdminData()}

 if(loading)return <AdminFrame><AdminLoading/></AdminFrame>
 if(!user)return <AdminLogin email={email} password={password} setEmail={setEmail} setPassword={setPassword} error={authError} onSubmit={login}/>
 if(user.app_metadata?.role!=='admin')return <AdminFrame><div className="admin-login"><div className="admin-login-card"><img src="/logo.png" alt="YAROPLUGG"/><div className="admin-kicker">PRIVATE AREA</div><h1>ACCESS DENIED</h1><p>This account does not have administrator access.</p><button className="admin-primary" onClick={logout}><LogOut size={15}/> LOG OUT</button></div></div></AdminFrame>
 const attentionOrderCount=orders.filter(order=>['new','contacted','reserved','shipped'].includes(normalizeOrderStatus(order))).length
 return <AdminFrame><div className="admin-shell"><header className="admin-header"><div><div className="admin-kicker">YAROPLUGG</div><h1>ADMIN</h1></div><button className="admin-ghost" onClick={logout}><LogOut size={15}/> LOG OUT</button></header><nav className="admin-section-tabs" aria-label="Admin sections"><button type="button" className={adminSection==='products'?'active':''} onClick={()=>setAdminSection('products')}><Package size={15}/> PRODUCTS</button><button type="button" className={adminSection==='sold'?'active':''} onClick={()=>setAdminSection('sold')}><Tag size={15}/> SOLD {adminProducts.filter(p=>p.is_sold).length>0&&<span className="admin-sold-count">{adminProducts.filter(p=>p.is_sold).length>99?'99+':adminProducts.filter(p=>p.is_sold).length}</span>}</button><button type="button" className={adminSection==='orders'?'active':''} onClick={()=>setAdminSection('orders')}><ClipboardList size={15}/> ORDERS{attentionOrderCount>0&&<span className="admin-order-attention-badge" aria-label={`${attentionOrderCount} orders needing attention`}>{attentionOrderCount>99?'99+':attentionOrderCount}</span>}</button></nav>{message&&<div className="admin-message">{message}</div>}{adminSection==='products'?<><section className="admin-stats"><div><span>PRODUCTS</span><b>{adminProducts.filter(p=>!p.is_sold).length}</b></div><div><span>ACTIVE</span><b>{adminProducts.filter(p=>p.is_active&&!p.is_sold).length}</b></div><div><span>OUT OF STOCK</span><b>{adminProducts.filter(p=>!p.is_sold&&(p.stock??0)<=0).length}</b></div></section><div className="admin-toolbar"><div><div className="admin-section-label">CATALOG</div><h2>PRODUCTS</h2></div><button className="admin-primary" onClick={startAdd}><Plus size={16}/> ADD PRODUCT</button></div><div className="admin-product-list">{adminProducts.filter(p=>!p.is_sold).length===0?<div className="admin-empty"><Package size={22}/><b>NO PRODUCTS YET</b><span>Add your first product to the catalog.</span><div className="admin-empty-actions"><button className="admin-primary" onClick={startAdd}><Plus size={15}/> ADD PRODUCT</button></div></div>:adminProducts.filter(p=>!p.is_sold).map(p=><AdminProductRow key={p.id} p={p} onEdit={()=>startEdit(p)} onDelete={()=>deleteProduct(p)} onMarkSold={()=>markProductSold(p)} onRestoreSold={()=>restoreSoldProduct(p)} showRestore={false} onStockChange={(next)=>updateStock(p,next)} stockSaving={stockSavingId===p.id}/>)}</div></>:adminSection==='sold'?<><div className="admin-toolbar"><div><div className="admin-section-label">CATALOG</div><h2>SOLD</h2></div></div><div className="admin-product-list">{adminProducts.filter(p=>p.is_sold).length===0?<div className="admin-empty"><Tag size={22}/><b>NO SOLD ITEMS YET</b></div>:adminProducts.filter(p=>p.is_sold).map(p=><AdminProductRow key={p.id} p={p} onEdit={()=>startEdit(p)} onDelete={()=>deleteProduct(p)} onMarkSold={()=>markProductSold(p)} onRestoreSold={()=>restoreSoldProduct(p)} showRestore={true} onStockChange={(next)=>updateStock(p,next)} stockSaving={stockSavingId===p.id}/>)}</div></>:<AdminOrders orders={orders} loading={ordersLoading} error={ordersError} filter={orderFilter} setFilter={setOrderFilter} savingOrderId={savingOrderId} onRefresh={loadOrders} onUpdateStatus={updateOrderStatus} onUpdatePaymentStatus={updateOrderPaymentStatus}/>}{showForm&&<AdminProductFormView form={form} setForm={setForm} categories={categories} editing={editing} saving={saving} uploading={uploading} onUpload={uploadFiles} onRemoveImage={removeImage} onMoveImage={moveImage} onMakeMain={makeMain} onDrop={handleDrop} onToggleColor={toggleColor} onRemoveColor={removeColor} onAddCustomColor={addCustomColor} onCancel={cancelForm} onClose={cancelForm} onSubmit={saveProduct}/>}</div></AdminFrame>
}
function AdminFrame({children}:{children:React.ReactNode}){return <div className="admin-app">{children}</div>}
function AdminLoading(){return <div className="admin-loading"><LoaderCircle size={26} className="spin"/><span>LOADING ADMIN</span></div>}
function normalizeOrderStatus(order:any):OrderStatus{
 const value=String(order?.status||'')
 if(['new','contacted','reserved','shipped','completed','cancelled'].includes(value))return value as OrderStatus
 const legacy=String(order?.fulfillment_status||'')
 if(legacy==='completed')return 'completed'
 if(legacy==='cancelled')return 'cancelled'
 if(legacy==='not_completed')return 'contacted'
 return 'new'
}
type AdminOrdersProps={orders:any[];loading:boolean;error:string;filter:'all'|OrderStatus;setFilter:(value:'all'|OrderStatus)=>void;savingOrderId:string|null;onRefresh:()=>void;onUpdateStatus:(orderId:string,status:OrderStatus)=>void;onUpdatePaymentStatus:(orderId:string,status:PaymentStatus)=>void}
function AdminOrders({orders,loading,error,filter,setFilter,savingOrderId,onRefresh,onUpdateStatus,onUpdatePaymentStatus}:AdminOrdersProps){
 const filters:Array<{value:'all'|OrderStatus;label:string}>= [{value:'all',label:'ALL'},{value:'new',label:'NEW'},{value:'contacted',label:'CONTACTED'},{value:'reserved',label:'RESERVED'},{value:'shipped',label:'SHIPPED'},{value:'completed',label:'COMPLETED'},{value:'cancelled',label:'CANCELLED'}]
 const filtered=filter==='all'?orders:orders.filter(order=>normalizeOrderStatus(order)===filter)
 function formatDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
 function statusLabel(value:OrderStatus){return value.replaceAll('_',' ').toUpperCase()}
 function nextStatus(status:OrderStatus):OrderStatus|null{return status==='new'?'contacted':status==='contacted'?'reserved':status==='reserved'?'shipped':status==='shipped'?'completed':null}
 function cancelOrder(order:any){if(window.confirm('Cancel order #'+order.order_number+'? Any reserved stock will be returned to the shop. The order record will be kept for history.'))onUpdateStatus(order.id,'cancelled')}
 return <section className="admin-orders"><div className="admin-toolbar"><div><div className="admin-section-label">STORE MANAGEMENT</div><h2>ORDERS <span className="admin-order-count">{orders.length}</span></h2></div><button type="button" className="admin-ghost" onClick={onRefresh} disabled={loading}><RotateCcw size={14} className={loading?'spin':''}/> REFRESH</button></div><p className="admin-orders-note">Order status and payment status are tracked separately. Cancelling an order returns reserved stock and keeps the order history.</p><div className="admin-order-filters">{filters.map(item=><button type="button" key={item.value} className={filter===item.value?'active':''} onClick={()=>setFilter(item.value)}>{item.label}<span>{item.value==='all'?orders.length:orders.filter(order=>normalizeOrderStatus(order)===item.value).length}</span></button>)}</div>{error&&<div className="admin-message">{error}</div>}{loading?<div className="admin-loading inline"><LoaderCircle size={22} className="spin"/><span>LOADING ORDERS</span></div>:filtered.length===0?<div className="admin-empty admin-orders-empty"><Package size={22}/><b>{orders.length?'NO ORDERS IN THIS STATUS':'NO ORDERS YET'}</b><span>New orders from the storefront will appear here.</span></div>:<div className="admin-order-list">{filtered.map(order=>{const status=normalizeOrderStatus(order);const paymentStatus=(['pending_payment','paid','refunded'].includes(String(order.payment_status))?order.payment_status:'pending_payment') as PaymentStatus;const username=typeof order.telegram_username==='string'&&/^[A-Za-z0-9_]{5,32}$/.test(order.telegram_username)?order.telegram_username:null;const items=Array.isArray(order.store_order_items)?order.store_order_items:[];const next=nextStatus(status);const paymentAction:PaymentStatus|null=paymentStatus==='paid'?'refunded':paymentStatus==='pending_payment'&&status!=='cancelled'?'paid':null;return <article className={'admin-order-card status-'+status} key={order.id}><header className="admin-order-header"><div><span>ORDER</span><b>#{order.order_number}</b></div><time>{formatDate(order.created_at)}</time></header><div className="admin-order-customer"><b>{order.customer_name}</b><div>{username?<a href={'https://t.me/'+username} target="_blank" rel="noreferrer">@{username}</a>:null}{order.telegram_user_id&&<span>TELEGRAM ID · {order.telegram_user_id}</span>}</div></div><div className="admin-order-payment"><span>PAYMENT</span><b>{paymentStatus.replaceAll('_',' ').toUpperCase()}</b></div><div className="admin-order-items">{items.map((item:any)=><div key={item.id}><span><b>{item.quantity}×</b> {item.product_name}{[item.size,item.length?item.length+' cm':null,item.color].filter(Boolean).length>0&&<small>{[item.size,item.length?item.length+' cm':null,item.color].filter(Boolean).join(' · ')}</small>}</span><b>€{((Number(item.unit_price_cents)||0)*(Number(item.quantity)||0)/100).toFixed(2)}</b></div>)}</div><footer className="admin-order-footer"><div><span>ORDER TOTAL</span><b>€{(Number(order.total_cents||0)/100).toFixed(2)}</b></div><span className={'admin-order-status status-'+status}>{statusLabel(status)}</span></footer>{(next||paymentAction||(status!=='completed'&&status!=='cancelled'))&&<div className="admin-order-actions">{next&&<button type="button" className={next==='completed'?'selected':''} disabled={savingOrderId===order.id} onClick={()=>onUpdateStatus(order.id,next)}><CheckCircle2 size={15}/>{savingOrderId===order.id?'SAVING…':next==='contacted'?'MARK CONTACTED':next==='reserved'?'RESERVE STOCK':next==='shipped'?'MARK SHIPPED':'COMPLETE ORDER'}</button>}{paymentAction&&<button type="button" disabled={savingOrderId===order.id} onClick={()=>onUpdatePaymentStatus(order.id,paymentAction)}><CheckCircle2 size={15}/>{savingOrderId===order.id?'SAVING…':paymentAction==='paid'?'MARK PAID':'MARK REFUNDED'}</button>}{status!=='completed'&&status!=='cancelled'&&<button type="button" className="cancel" disabled={savingOrderId===order.id} onClick={()=>cancelOrder(order)}><Trash2 size={14}/>{savingOrderId===order.id?'SAVING…':'CANCEL · RESTORE STOCK'}</button>}</div>}</article>})}</div>}</section>
}
function AdminLogin({email,password,setEmail,setPassword,error,onSubmit}:{email:string;password:string;setEmail:(v:string)=>void;setPassword:(v:string)=>void;error:string;onSubmit:(e:React.FormEvent)=>void}){return <AdminFrame><div className="admin-login"><div className="admin-login-card"><img src="/logo.png" alt="YAROPLUGG"/><div className="admin-kicker">PRIVATE AREA</div><h1>ADMIN LOGIN</h1><p>Sign in with your YAROPLUGG admin account.</p><form onSubmit={onSubmit}><label>EMAIL<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>PASSWORD<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{error&&<div className="admin-error">{error}</div>}<button className="admin-primary" type="submit">SIGN IN</button></form></div></div></AdminFrame>}
function AdminProductRow({p,onEdit,onDelete,onMarkSold,onRestoreSold,showRestore,onStockChange,stockSaving}:{p:any;onEdit:()=>void;onDelete:()=>void;onMarkSold:()=>void;onRestoreSold:()=>void;showRestore:boolean;onStockChange:(next:number)=>void;stockSaving:boolean}){
 const img=p.image_url||p.images?.[0];const count=Array.isArray(p.images)?p.images.length:(img?1:0)
 const [draft,setDraft]=useState(String(p.stock??0))
 useEffect(()=>setDraft(String(p.stock??0)),[p.stock])
 function commit(){const value=Math.max(0,Math.floor(Number(draft)||0));setDraft(String(value));if(value!==Number(p.stock??0))onStockChange(value)}
 return <div className="admin-product-row">{img?<img src={img} alt="" loading="lazy" decoding="async"/>:<div className="admin-image-empty"><ImagePlus size={18}/></div>}<div className="admin-product-main"><b>{p.name}</b><span>{p.category?.name||'Uncategorized'} · €{Number(p.price).toFixed(2)}</span><small>{count} PHOTO{count===1?'':'S'} · {p.is_active?'ACTIVE':'HIDDEN'}</small></div><div className="admin-stock-editor"><span>STOCK</span><div><button type="button" onClick={()=>onStockChange(Math.max(0,Number(p.stock??0)-1))} disabled={stockSaving||Number(p.stock??0)<=0} aria-label={`Decrease stock for ${p.name}`}><Minus size={13}/></button><input value={draft} inputMode="numeric" aria-label={`Stock for ${p.name}`} onChange={e=>setDraft(e.target.value.replace(/[^0-9]/g,''))} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit()}}} disabled={stockSaving}/><button type="button" onClick={()=>onStockChange(Number(p.stock??0)+1)} disabled={stockSaving} aria-label={`Increase stock for ${p.name}`}><Plus size={13}/></button></div></div><div className="admin-row-actions">{showRestore?<button type="button" onClick={onRestoreSold} aria-label={`Restore ${p.name}`} title="Restore product"><RotateCcw size={15}/><span>RESTORE TO SHOP</span></button>:<button type="button" onClick={onMarkSold} aria-label={`Mark ${p.name} as sold`} title="Mark as sold"><Tag size={15}/><span>MARK AS SOLD</span></button>}<button type="button" onClick={onEdit} aria-label={`Edit ${p.name}`} title="Edit product"><Pencil size={15}/><span>EDIT</span></button><button type="button" onClick={onDelete} aria-label={`Delete ${p.name}`} title="Delete product"><Trash2 size={15}/><span>DELETE</span></button></div></div>}
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
  <label className="admin-text-field">DESCRIPTION<span className="admin-field-hint">Press Enter to create a new line. Formatting will be kept on the product page.</span><textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={7} placeholder="Write a clear product description…" /></label>
  <label className="admin-text-field">COMPOSITION<span className="admin-field-hint">Example: 100% cotton · Made in Portugal</span><input value={form.composition} onChange={e=>set('composition',e.target.value)} placeholder="100% cotton"/></label>
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
