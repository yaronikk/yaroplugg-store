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
 useEffect(()=>{const tg=(window as any).Telegram?.WebApp;if(!tg)return;const root=document.documentElement;root.classList.add('telegram-webapp');const syncViewport=()=>{const height=Number(tg.viewportHeight)||window.innerHeight;if(height>0)root.style.setProperty('--tg-viewport-height',String(height)+'px')};tg.ready();tg.expand();syncViewport();tg.onEvent?.('viewportChanged',syncViewport);window.addEventListener('resize',syncViewport);return()=>{tg.offEvent?.('viewportChanged',syncViewport);window.removeEventListener('resize',syncViewport);root.classList.remove('telegram-webapp');root.style.removeProperty('--tg-viewport-height')}},[])
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
 return <Localized>{<div className="modal-backdrop"><section className="sheet cart-sheet"><div className="sheet-title-row"><div><div className="eyebrow red">YAROPLUGG</div><h2>YOUR BAG</h2></div><button onClick={onClose} className="close-button small" aria-label="Close bag"><X size={18}/></button></div>{rows.length===0?<div className="cart-empty">YOUR BAG IS EMPTY</div>:<><div className="cart-lines">{rows.map(({line,product})=><article className="cart-line" key={`${line.productId}-${line.size}-${line.length}-${line.color}`}><img src={product.images[0]} alt=""/><div className="cart-line-info"><b>{product.name}</b><span>{line.size||`${line.length} cm`} · {line.color}</span><span>€{Number(product.price).toFixed(2)}</span><div className="cart-quantity"><button type="button" onClick={()=>setCart(current=>current.flatMap(x=>x===line?(x.quantity<=1?[]:[{...x,quantity:x.quantity-1}]):[x]))} aria-label={`Decrease quantity of ${product.name}`}><Minus size={13} strokeWidth={1.8}/></button><span aria-live="polite">{line.quantity}</span><button type="button" disabled={quantityOfProduct(cart,product.id)>=stockForProduct(product)} onClick={()=>setCart(current=>quantityOfProduct(current,product.id)>=stockForProduct(product)?current:current.map(x=>x===line?{...x,quantity:x.quantity+1}:x))} aria-label={`Increase quantity of ${product.name}; maximum ${stockForProduct(product)} in stock`}><Plus size={13} strokeWidth={1.8}/></button><button type="button" className="cart-remove" onClick={()=>setCart(current=>current.filter(x=>x!==line))} aria-label={`Remove ${product.name} from bag`} title="Remove item"><Trash2 size={14} strokeWidth={1.7}/></button></div></div></article>)}</div><div className="cart-total"><span>ORDER TOTAL</span><b>€{total.toFixed(2)}</b></div><div className="checkout-fields"><label>NAME<input autoComplete="name" autoCapitalize="words" autoCorrect="off" spellCheck={false} value={customerName} onChange={e=>setCustomerName(e.currentTarget.value)} maxLength={120} required/></label><label>TELEGRAM ID<input autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode="numeric" pattern="[0-9]{5,20}" value={telegramId} onChange={e=>setTelegramId(e.currentTarget.value.replace(/\D/g,''))} maxLength={20} required/><small className="admin-field-hint">Filled from your Telegram account. Check that it is yours.</small></label></div><p className="checkout-disclaimer">This order is not paid yet. Payment options will be confirmed separately.</p>{message&&<p className="checkout-error">{message}</p>}<button className="primary-red" disabled={busy||!customerName.trim()||!/^[0-9]{5,20}$/.test(telegramId.trim())} onClick={()=>onCheckout(customerName)}>{busy?'CREATING ORDER…':'PLACE ORDER · AWAITING PAYMENT'}</button></>}</section></div>
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

const root=document.getElementById('root')!
if(window.location.pathname.startsWith('/admin')){
 void import('./admin').then(({AdminApp})=>createRoot(root).render(<AdminApp/>))
}else{
 createRoot(root).render(<App/>)
}
