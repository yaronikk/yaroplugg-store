import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { CheckCircle2, ImagePlus, LoaderCircle, Plus, Trash2, Package, RotateCcw, Tag } from 'lucide-react'

type Props = { supabase: any; user: User; language: 'en'|'ru'|'et' }
type AdminColor={name:string;hex:string}
type Listing = { id:string; seller_id:string; title:string; description:string; price:number; category:string; brand:string; size_label:string; item_condition:string; is_legit:boolean; colors:AdminColor[]; images:string[]; status:string; moderation_reason:string|null; created_at:string }
type StoreCategory = { id:string; name:string; slug:string }

async function prepareListingPhoto(file:File):Promise<File>{
 if(typeof createImageBitmap==='undefined')return file
 let bitmap:ImageBitmap
 try{bitmap=await createImageBitmap(file)}catch{return file}
 try{
  const scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height))
  const canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round(bitmap.width*scale))
  canvas.height=Math.max(1,Math.round(bitmap.height*scale))
  const context=canvas.getContext('2d')
  if(!context)return file
  context.drawImage(bitmap,0,0,canvas.width,canvas.height)
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.84))
  if(!blob||blob.size>=file.size)return file
  const base=file.name.replace(/\.[^.]+$/,'')
  return new File([blob],base+'.webp',{type:'image/webp',lastModified:file.lastModified})
 }finally{bitmap.close()}
}
const words = {
 en:{colors:'COLORS',chooseColors:'Choose one or more',searchColors:'Search colors…',customColor:'Color name',telegramContact:'TELEGRAM CONTACT',telegramHint:'Required so buyers can contact you. Enter your username, not phone number.',addColor:'ADD COLOR',noColors:'Select at least one color.',title:'SELLER PANEL',intro:'Create listings and manage your items.',new:'NEW LISTING',my:'MY LISTINGS',name:'TITLE',desc:'DESCRIPTION',price:'PRICE · EUR',category:'CATEGORY',brand:'BRAND',size:'SIZE',condition:'CONDITION',selectCondition:'Select condition',legit:'AUTHENTICITY',legitYes:'LEGIT',legitNo:'R€P',legitHint:'Seller-declared status',photos:'PHOTOS · UP TO 20',photoCover:'COVER',addPhotos:'Add photos',photoHint:'JPG, PNG or WebP · up to 20 photos · max 10 MB each',submit:'SUBMIT FOR REVIEW',save:'SAVE CHANGES',loading:'LOADING…',empty:'No listings yet.',pending:'UNDER REVIEW',approved:'PUBLISHED',rejected:'CHANGES REQUIRED',sold:'SOLD',remove:'DELETE',markSold:'MARK AS SOLD',soldTab:'SOLD ITEMS',confirmSold:'Mark this listing as sold? It will no longer appear in the marketplace and will move to Sold.',resubmit:'RESUBMIT',uploading:'UPLOADING PHOTOS…',saving:'SAVING LISTING…',photoTipHeading:'PHOTO RECIPE',photoTip:'Start with a full view, then add label details and close-ups of any flaws.',success:'Listing sent for moderation.',needPhotos:'Add at least 1 photo. You can add up to 20.',conditionOptions:['New with tags','New without tags','Excellent','Good','Has defects'],beltSize:'SIZE · CM',clothingSize:'SIZE',selectSize:'Select size',beltPlaceholder:'Enter belt length in cm',error:'Could not save listing.',all:'ALL LISTINGS',active:'ACTIVE',rejectedTab:'REJECTED',marketTab:'MARKET',marketEmpty:'No published listings in the market yet.',photoSection:'Photos',photoSectionHint:'Add clear photos from different angles. The first photo will be the cover.',itemInfo:'Item information',specifications:'Specifications',specificationsHint:'Choose the appropriate item details.',descriptionSection:'Description',close:'Close form',preview:'Photo preview',validCategory:'Select a category from the list.',validPrice:'Enter a valid price.',invalidImage:'Use JPG, PNG or WebP images up to 10 MB.',uniqueColor:'Enter a unique color name and valid HEX code.',moveLeft:'Move photo left',moveRight:'Move photo right',markedLegit:'Seller marked this item as LEGIT',markedRep:'Seller marked this item as R€P',loadingCategories:'Loading…',selectCategory:'Select category',marketplace:"MARKETPLACE",createHint:"Add photos first, then fill in the item details.",photosHeading:"Photos",photosHint:"Add clear photos from multiple angles. Drag to reorder; the first photo will be the cover.",itemInfoHeading:"Item information",itemInfoHint:"Give your listing a clear title and price.",specsHeading:"Specifications",specsHint:"Choose the closest match for your item.",descriptionHeading:"Description",descriptionHint:"Add useful details about fit, condition and flaws.",titlePlaceholder:"e.g. Vintage Nike hoodie",brandPlaceholder:"e.g. Nike, Carhartt",descriptionPlaceholder:"Describe the item, its fit and any imperfections…",closeForm:"Close form",previewPhoto:"Preview photo",listingPhoto:"Listing photo",movePhotoLeft:"Move photo left",movePhotoRight:"Move photo right",removePhoto:"Remove photo",removeColor:"Remove color",customSwatch:"Custom color swatch",customHex:"Custom HEX color",cancel:"CANCEL",soldEmpty:"No sold listings yet.",createTitle:"CREATE LISTING",closePreview:"Close preview"},
 ru:{colors:'ЦВЕТА',chooseColors:'Можно выбрать несколько',searchColors:'Поиск цветов…',customColor:'Название цвета',telegramContact:'TELEGRAM ДЛЯ СВЯЗИ',telegramHint:'Обязательно для связи с покупателями. Укажи username, а не номер телефона.',addColor:'Добавить',noColors:'Выбери хотя бы один цвет.',title:'ПАНЕЛЬ ПРОДАВЦА',intro:'Создавай объявления и управляй своими товарами.',new:'НОВОЕ ОБЪЯВЛЕНИЕ',my:'МОИ ОБЪЯВЛЕНИЯ',name:'НАЗВАНИЕ',desc:'ОПИСАНИЕ',price:'ЦЕНА · EUR',category:'КАТЕГОРИЯ',brand:'БРЕНД',size:'РАЗМЕР',condition:'СОСТОЯНИЕ',selectCondition:'Выбери состояние',legit:'ОРИГИНАЛЬНОСТЬ',legitYes:'LEGIT',legitNo:'R€P',legitHint:'Статус указан продавцом и не проверен платформой',photos:'ФОТОГРАФИИ · ДО 20',photoCover:'ОБЛОЖКА',addPhotos:'Добавить фото',photoHint:'JPG, PNG или WebP · до 20 фото · максимум 10 МБ каждое',submit:'ОТПРАВИТЬ НА ПРОВЕРКУ',save:'СОХРАНИТЬ ИЗМЕНЕНИЯ',loading:'ЗАГРУЗКА…',empty:'Объявлений пока нет.',pending:'НА ПРОВЕРКЕ',approved:'ОПУБЛИКОВАНО',rejected:'НУЖНЫ ИЗМЕНЕНИЯ',sold:'ПРОДАНО',remove:'УДАЛИТЬ',markSold:'ОТМЕТИТЬ КАК ПРОДАННОЕ',soldTab:'ПРОДАНО',confirmSold:'Отметить это объявление как проданное? Оно исчезнет из маркетплейса и появится во вкладке «Продано».',resubmit:'ОТПРАВИТЬ ПОВТОРНО',uploading:'ЗАГРУЖАЕМ ФОТО…',saving:'СОХРАНЯЕМ ОБЪЯВЛЕНИЕ…',photoTipHeading:'ПОДСКАЗКА ПО ФОТО',photoTip:'Сначала покажи вещь целиком, затем добавь фото ярлыка, деталей и возможных дефектов.',success:'Объявление отправлено на модерацию.',needPhotos:'Добавь хотя бы одну фотографию. Можно добавить до 20.',conditionOptions:['Новое с бирками','Новое без бирок','Отличное','Хорошее','Есть дефекты'],beltSize:'РАЗМЕР · СМ',clothingSize:'РАЗМЕР',selectSize:'Выбери размер',beltPlaceholder:'Введи длину ремня в см',error:'Не удалось сохранить объявление.',all:'ВСЕ ОБЪЯВЛЕНИЯ',active:'АКТИВНЫЕ',rejectedTab:'ОТКЛОНЁННЫЕ',marketTab:'МАРКЕТПЛЕЙС',marketEmpty:'Пока нет опубликованных объявлений в маркете.',photoSection:'Фотографии',photoSectionHint:'Добавь чёткие фото с разных ракурсов. Первое фото будет обложкой.',itemInfo:'Информация о товаре',specifications:'Характеристики',specificationsHint:'Выбери подходящие параметры товара.',descriptionSection:'Описание',close:'Закрыть форму',preview:'Предпросмотр фото',validCategory:'Выбери категорию из списка.',validPrice:'Укажи корректную цену.',invalidImage:'Используй JPG, PNG или WebP размером до 10 МБ.',uniqueColor:'Укажи уникальное название цвета и корректный HEX-код.',moveLeft:'Переместить фото влево',moveRight:'Переместить фото вправо',markedLegit:'Продавец отметил товар как оригинальный',markedRep:'Продавец отметил товар как реплику',loadingCategories:'Загрузка…',selectCategory:'Выбери категорию',marketplace:"МАРКЕТПЛЕЙС",createHint:"Сначала добавь фотографии, затем заполни данные товара.",photosHeading:"Фотографии",photosHint:"Добавь чёткие фото с разных ракурсов. Перетаскивай их, чтобы поменять порядок; первое фото станет обложкой.",itemInfoHeading:"Информация о товаре",itemInfoHint:"Укажи понятное название и цену.",specsHeading:"Характеристики",specsHint:"Выбери подходящие параметры товара.",descriptionHeading:"Описание",descriptionHint:"Добавь информацию о посадке, состоянии и недостатках.",titlePlaceholder:"Например, винтажное худи Nike",brandPlaceholder:"Например, Nike, Carhartt",descriptionPlaceholder:"Опиши товар, посадку и возможные недостатки…",closeForm:"Закрыть форму",previewPhoto:"Предпросмотр фото",listingPhoto:"Фото объявления",movePhotoLeft:"Переместить фото влево",movePhotoRight:"Переместить фото вправо",removePhoto:"Удалить фото",removeColor:"Удалить цвет",customSwatch:"Образец своего цвета",customHex:"Свой HEX-код цвета",cancel:"ОТМЕНА",soldEmpty:"Проданных объявлений пока нет.",createTitle:"СОЗДАНИЕ ОБЪЯВЛЕНИЯ",closePreview:"Закрыть предпросмотр"},
 et:{colors:'VÄRVID',chooseColors:'Vali üks või mitu',searchColors:'Otsi värve…',customColor:'Värvi nimi',telegramContact:'TELEGRAMI KONTAKT',telegramHint:'Ostjad saavad sinuga ühendust võtta. Sisesta kasutajanimi, mitte telefoninumber.',addColor:'Lisa',noColors:'Vali vähemalt üks värv.',title:'MÜÜJA PANEEL',intro:'Loo kuulutusi ja halda oma tooteid.',new:'UUS KUULUTUS',my:'MINU KUULUTUSED',name:'PEALKIRI',desc:'KIRJELDUS',price:'HIND · EUR',category:'KATEGOORIA',brand:'BRÄND',size:'SUURUS',condition:'SEISUKORD',selectCondition:'Vali seisukord',legit:'AUTENTSUS',legitYes:'LEGIT',legitNo:'R€P',legitHint:'Müüja märgitud staatus',photos:'FOTOD · KUNI 20',photoCover:'KAANEFOTO',addPhotos:'Lisa fotosid',photoHint:'JPG, PNG või WebP · kuni 20 fotot · kuni 10 MB igaüks',submit:'SAADA KONTROLLI',save:'SALVESTA MUUDATUSED',loading:'LAADIMINE…',empty:'Kuulutusi veel pole.',pending:'KONTROLLIMISEL',approved:'AVALDATUD',rejected:'VAJAB MUUDATUSI',sold:'MÜÜDUD',remove:'KUSTUTA',markSold:'MÄRGI MÜÜDUKS',soldTab:'MÜÜDUD',confirmSold:'Märkida see kuulutus müüduks? See eemaldatakse turult ja liigub jaotisse „Müüdud“',resubmit:'SAADA UUESTI',uploading:'FOTOSID LAADITAKSE…',saving:'KUULUTUST SALVESTATAKSE…',photoTipHeading:'FOTOJUHIS',photoTip:'Alusta üldvaatega, lisa siis sildi ja detailide fotod ning näita võimalikke vigu.',success:'Kuulutus saadeti modereerimisele.',needPhotos:'Lisa vähemalt 1 foto. Kokku saab lisada kuni 20.',conditionOptions:['Uus siltidega','Uus ilma siltideta','Suurepärane','Hea','Defektidega'],beltSize:'SUURUS · CM',clothingSize:'SUURUS',selectSize:'Vali suurus',beltPlaceholder:'Sisesta vöö pikkus cm',error:'Kuulutuse salvestamine ebaõnnestus.',all:'KÕIK KUULUTUSED',active:'AKTIIVSED',rejectedTab:'TAGASI LÜKATUD',marketTab:'TURG',marketEmpty:'Turul pole veel avaldatud kuulutusi.',photoSection:'Fotod',photoSectionHint:'Lisa selged fotod eri nurkade alt. Esimene foto on kaanefoto.',itemInfo:'Toote andmed',specifications:'Tehnilised andmed',specificationsHint:'Vali tootele sobivad omadused.',descriptionSection:'Kirjeldus',close:'Sulge vorm',preview:'Foto eelvaade',validCategory:'Vali loendist kategooria.',validPrice:'Sisesta korrektne hind.',invalidImage:'Kasuta JPG-, PNG- või WebP-pilte, mille suurus on kuni 10 MB.',uniqueColor:'Sisesta kordumatu värvinimi ja korrektne HEX-kood.',moveLeft:'Liiguta fotot vasakule',moveRight:'Liiguta fotot paremale',markedLegit:'Müüja märkis toote LEGIT-iks',markedRep:'Müüja märkis toote R€P-iks',loadingCategories:'Laadimine…',selectCategory:'Vali kategooria',marketplace:"TURG",createHint:"Lisa esmalt fotod, seejärel täida toote andmed.",photosHeading:"Fotod",photosHint:"Lisa selged fotod eri nurkade alt. Järjestuse muutmiseks lohista fotosid; esimene jääb kaanefotoks.",itemInfoHeading:"Toote andmed",itemInfoHint:"Lisa kuulutusele selge pealkiri ja hind.",specsHeading:"Tehnilised andmed",specsHint:"Vali tootele kõige sobivamad omadused.",descriptionHeading:"Kirjeldus",descriptionHint:"Lisa teavet istuvuse, seisukorra ja puuduste kohta.",titlePlaceholder:"Nt vintage Nike’i pusa",brandPlaceholder:"Nt Nike, Carhartt",descriptionPlaceholder:"Kirjelda toodet, istuvust ja võimalikke puudusi…",closeForm:"Sulge vorm",previewPhoto:"Foto eelvaade",listingPhoto:"Kuulutuse foto",movePhotoLeft:"Liiguta fotot vasakule",movePhotoRight:"Liiguta fotot paremale",removePhoto:"Eemalda foto",removeColor:"Eemalda värv",customSwatch:"Kohandatud värvinäidis",customHex:"Kohandatud HEX-värv",cancel:"TÜHISTA",soldEmpty:"Müüdud kuulutusi veel pole.",createTitle:"KUULUTUSE LOOMINE",closePreview:"Sulge eelvaade"}
}
const statusKey:Record<string,'pending'|'approved'|'rejected'|'sold'>={pending:'pending',approved:'approved',rejected:'rejected',sold:'sold'}
const COLOR_PALETTE:AdminColor[]=[
 {name:'Black',hex:'#0b0b0b'},{name:'White',hex:'#ffffff'},{name:'Cream',hex:'#e9e2d6'},
 {name:'Grey',hex:'#8b8b8b'},{name:'Light Grey',hex:'#c8c8c8'},{name:'Red',hex:'#f52222'},
 {name:'Burgundy',hex:'#6d1020'},{name:'Navy',hex:'#18243a'},{name:'Blue',hex:'#2457a6'},
 {name:'Green',hex:'#315b3c'},{name:'Olive',hex:'#687044'},{name:'Brown',hex:'#6b4935'},
 {name:'Beige',hex:'#c9b79c'},{name:'Pink',hex:'#d97893'},{name:'Purple',hex:'#6e4c8f'},
 {name:'Orange',hex:'#d96b24'},{name:'Yellow',hex:'#d6aa24'}
]
const isBeltCategory=(name:string)=>/belt|ремн|vöö/i.test(name)
const COLOR_LABELS:Record<string,{ru:string;et:string}>={
 Black:{ru:'Чёрный',et:'Must'},White:{ru:'Белый',et:'Valge'},Cream:{ru:'Кремовый',et:'Kreem'},Grey:{ru:'Серый',et:'Hall'},'Light Grey':{ru:'Светло-серый',et:'Helehall'},Red:{ru:'Красный',et:'Punane'},Burgundy:{ru:'Бордовый',et:'Burgundia'},Navy:{ru:'Тёмно-синий',et:'Tumesinine'},Blue:{ru:'Синий',et:'Sinine'},Green:{ru:'Зелёный',et:'Roheline'},Olive:{ru:'Оливковый',et:'Oliiviroheline'},Brown:{ru:'Коричневый',et:'Pruun'},Beige:{ru:'Бежевый',et:'Beež'},Pink:{ru:'Розовый',et:'Roosa'},Purple:{ru:'Фиолетовый',et:'Lilla'},Orange:{ru:'Оранжевый',et:'Oranž'},Yellow:{ru:'Жёлтый',et:'Kollane'}
}
const colorLabel=(name:string,language:'en'|'ru'|'et')=>language==='en'?name:(COLOR_LABELS[name]?.[language]||name)
const CLOTHING_SIZES=['XS','S','M','L','XL']
const categoryLabel=(name:string,language:'en'|'ru'|'et')=>{
 const labels:Record<string,{ru:string;et:string}>={
  'T-Shirts':{ru:'Футболки',et:'T-särgid'},'Hoodies':{ru:'Худи',et:'Pusad'},'Pants':{ru:'Брюки',et:'Püksid'},
  'Accessories':{ru:'Аксессуары',et:'Aksessuaarid'},'Jackets':{ru:'Куртки',et:'Joped'},'Belts':{ru:'Ремни',et:'Vööd'}
 }
 return language==='en'?name:(labels[name]?.[language]||name)
}
export default function SellerPanel({supabase,user,language}:Props){
 const t=words[language]
 const [listings,setListings]=useState<Listing[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [accountMismatch,setAccountMismatch]=useState(false)
 const [message,setMessage]=useState('')
 const [editing,setEditing]=useState<Listing|null>(null)
 const [title,setTitle]=useState('')
 const [telegramUsername,setTelegramUsername]=useState('')
 const [telegramAutofilled,setTelegramAutofilled]=useState(false)
 const [description,setDescription]=useState('')
 const [price,setPrice]=useState('')
 const [category,setCategory]=useState('')
 const [categories,setCategories]=useState<StoreCategory[]>([])
 const [categoriesLoading,setCategoriesLoading]=useState(true)
 const [brand,setBrand]=useState('')
 const [size,setSize]=useState('')
 const [isLegit,setIsLegit]=useState(false)
 const [condition,setCondition]=useState('')
 const [colors,setColors]=useState<AdminColor[]>([])
 const [colorSearch,setColorSearch]=useState('')
 const [customColorName,setCustomColorName]=useState('')
 const [customColorHex,setCustomColorHex]=useState('#888888')
 const [colorError,setColorError]=useState('')
 const [files,setFiles]=useState<File[]>([])
 const [uploadProgress,setUploadProgress]=useState(0)
 const [existingImages,setExistingImages]=useState<string[]>([])
 const [showForm,setShowForm]=useState(false)
 const [listingFilter,setListingFilter]=useState<'all'|'market'|'sold'>('all')
 const [draggedPhoto,setDraggedPhoto]=useState<number|null>(null)
 const photoDragRef=useRef<number|null>(null)
 const suppressPreviewClick=useRef(false)
 const [photoPreview,setPhotoPreview]=useState<string|null>(null)
 const previews=useMemo(()=>files.map(file=>URL.createObjectURL(file)),[files])
 useEffect(()=>()=>previews.forEach(URL.revokeObjectURL),[previews])
 useEffect(()=>{
  let active=true
  ;(async()=>{
   try{
    const {data:authData,error:authError}=await supabase.auth.getUser()
    if(authError)throw authError
    const currentUser=authData.user
    if(!currentUser||currentUser.id!==user.id)return
    const {data:profile,error:profileError}=await supabase.from('profiles').select('telegram_username').eq('id',currentUser.id).maybeSingle()
    if(profileError)throw profileError
    const meta=currentUser.user_metadata||user.user_metadata||{}
    const candidates=[profile?.telegram_username,meta.preferred_username,meta.username,meta.user_name,meta.telegram_username]
    const value=String(candidates.find(v=>typeof v==='string'&&v.trim())||'').trim().replace(/^@/,'')
    if(!active)return
    if(value){
     setTelegramUsername(value)
     setTelegramAutofilled(true)
     if(!profile?.telegram_username){
      const {error:saveError}=await supabase.from('profiles').upsert({id:currentUser.id,telegram_username:value,display_name:String(meta.full_name||meta.name||meta.given_name||'Yaroplugg user').trim().slice(0,80)||'Yaroplugg user',avatar_url:meta.avatar_url||meta.picture||null,updated_at:new Date().toISOString()},{onConflict:'id'})
      if(saveError)console.warn('Could not persist Telegram username to profile',saveError)
     }
    }
   }catch(error){if(active)console.warn('Could not load Telegram username',error)}
  })()
  return()=>{active=false}
 },[supabase,user.id])
 async function refresh(){
  const {data,error}=await supabase.from('marketplace_listings').select('id,seller_id,title,description,price,category,brand,size_label,item_condition,is_legit,colors,images,status,moderation_reason,created_at,telegram_username').eq('seller_id',user.id).order('created_at',{ascending:false})
  if(error)throw error
  const ownListings=(data||[]) as Listing[]
  setListings(ownListings)
  // Detect an account mismatch without ever transferring listing ownership by username.
  if(!ownListings.length){
   const {data:profile}=await supabase.from('profiles').select('telegram_username').eq('id',user.id).maybeSingle()
   const telegram=String(profile?.telegram_username||user.user_metadata?.preferred_username||user.user_metadata?.username||'').replace(/^@/,'').trim()
   if(telegram){
    const {data:otherListings,error:otherError}=await supabase.from('marketplace_listings').select('id,seller_id').neq('seller_id',user.id).eq('telegram_username',telegram).limit(1)
    if(otherError)console.warn('Could not check for listings linked to another account',otherError)
    setAccountMismatch(Boolean(otherListings?.length))
   }else setAccountMismatch(false)
  }else setAccountMismatch(false)
 }
 async function loadCategories(){
  setCategoriesLoading(true)
  const {data,error}=await supabase.from('categories').select('id,name,slug').order('sort_order',{ascending:true})
  if(error)throw error
  const rows=(data||[]) as StoreCategory[]
  setCategories(rows)
  setCategoriesLoading(false)
 }
 useEffect(()=>{let active=true;(async()=>{try{await Promise.all([refresh(),loadCategories()])}catch(e){if(active)setError(e instanceof Error?e.message:t.error);if(active)setCategoriesLoading(false)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[user.id])
 function reset(){setEditing(null);setTitle('');setTelegramUsername('');setTelegramAutofilled(false);setDescription('');setPrice('');setCategory('');setBrand('');setSize('');setIsLegit(false);setCondition('');setColors([]);setCustomColorName('');setCustomColorHex('#888888');setColorError('');setFiles([]);setExistingImages([]);setShowForm(false)}
 function startEdit(item:Listing){setEditing(item);setTelegramUsername(String((item as any).telegram_username||''));setTelegramAutofilled(false);setTitle(item.title);setDescription(item.description);setPrice(String(item.price));setCategory(categories.find(c=>c.name===item.category||c.slug===item.category)?.name||item.category);setBrand(item.brand||'');setSize(isBeltCategory(categories.find(c=>c.name===item.category||c.slug===item.category)?.name||item.category)?(item.size_label||'').replace(/\\s*(?:cm|см)$/i,''):(item.size_label||''));setIsLegit(Boolean(item.is_legit));setCondition(item.item_condition);setColors(Array.isArray(item.colors)?item.colors:[]);setExistingImages(item.images||[]);setFiles([]);setShowForm(true)}
 function movePhoto(from:number,to:number){
  const ordered=[...existingImages.map(src=>({kind:'existing' as const,src})),...files.map(file=>({kind:'new' as const,file}))];
  if(to<0||to>=ordered.length)return;
  const [moving]=ordered.splice(from,1);ordered.splice(to,0,moving);
  setExistingImages(ordered.filter((item):item is {kind:'existing';src:string}=>item.kind==='existing').map(item=>item.src));
  setFiles(ordered.filter((item):item is {kind:'new';file:File}=>item.kind==='new').map(item=>item.file));
 }
 function startPhotoDrag(event:React.PointerEvent<HTMLDivElement>,index:number){
  if((event.target as HTMLElement).closest('.seller-photo-thumb-actions'))return
  photoDragRef.current=index;setDraggedPhoto(index);event.currentTarget.setPointerCapture(event.pointerId)
 }
 function finishPhotoDrag(event:React.PointerEvent<HTMLDivElement>){
  const from=photoDragRef.current;if(from===null)return
  const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-photo-index]')
  const to=target?Number(target.dataset.photoIndex):from
  if(Number.isInteger(to)&&to!==from){movePhoto(from,to);suppressPreviewClick.current=true;window.setTimeout(()=>{suppressPreviewClick.current=false},0)}
  photoDragRef.current=null;setDraggedPhoto(null)
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();setError('');setMessage('')
  const total=existingImages.length+files.length
  if(total<1||total>20){setError(t.needPhotos);return}
  if(!category||!categories.some(item=>item.name===category)){setError(t.validCategory);return}
  if(!size.trim()||(isBeltCategory(category)&&(!Number.isFinite(Number(size))||Number(size)<=0||Number(size)>300))){setError(isBeltCategory(category)?t.beltPlaceholder:t.selectSize);return}
  if(!colors.length){setColorError(t.noColors);setError(t.noColors);return}
  if(!Number.isFinite(Number(price))||Number(price)<=0){setError(t.validPrice);return}
  const cleanTelegram=telegramUsername.trim().replace(/^@/,'')
  if(!/^[A-Za-z0-9_]{5,32}$/.test(cleanTelegram)){setError(language==='ru'?'Укажи корректный Telegram username (5–32 символа, латиница, цифры и _).':'Enter a valid Telegram username (5–32 characters, letters, numbers and _).');return}
  setBusy(true)
  const uploaded:string[]=[]
  try{
   for(const file of files){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error(t.invalidImage)
   }
   const listingId=editing?.id||crypto.randomUUID()
   const uploadedByIndex:string[]=[]
   setUploadProgress(0)
   for(let offset=0;offset<files.length;offset+=3){
    const batch=files.slice(offset,offset+3)
    const results=await Promise.allSettled(batch.map(async file=>{
     const optimized=await prepareListingPhoto(file)
     const ext=optimized.type==='image/png'?'png':optimized.type==='image/webp'?'webp':'jpg'
     const path=user.id+'/'+listingId+'/'+crypto.randomUUID()+'.'+ext
     const {error:uploadError}=await supabase.storage.from('marketplace-listings').upload(path,optimized,{contentType:optimized.type,cacheControl:'3600',upsert:false})
     if(uploadError)throw uploadError
     return supabase.storage.from('marketplace-listings').getPublicUrl(path).data.publicUrl
    }))
    results.forEach((result,index)=>{if(result.status==='fulfilled'){uploadedByIndex[offset+index]=result.value;uploaded.push(result.value)}})
    setUploadProgress(uploadedByIndex.filter(Boolean).length)
    const failed=results.find((result):result is PromiseRejectedResult=>result.status==='rejected')
    if(failed)throw failed.reason
   }
   const payload={title:title.trim(),telegram_username:cleanTelegram,description:description.trim(),price:Number(price),category,brand:brand.trim(),size_label:isBeltCategory(category)?`${size.trim()} ${language==='ru'?'см':'cm'}`:size.trim(),item_condition:condition,is_legit:isLegit,colors,images:[...existingImages,...uploadedByIndex]}
   if(editing){
    const {data:saved,error:saveError}=await supabase.from('marketplace_listings').update({...payload,status:'pending',moderation_reason:null,moderated_at:null,moderated_by:null}).eq('id',editing.id).eq('seller_id',user.id).select('id').single()
    if(saveError)throw saveError
    if(!saved)throw new Error(t.error)
   }else{
    const {data:saved,error:saveError}=await supabase.from('marketplace_listings').insert({id:listingId,seller_id:user.id,...payload,status:'pending'}).select('id').single()
    if(saveError)throw saveError
    if(!saved)throw new Error(t.error)
   }
   setMessage(t.success);reset()
   try{await refresh()}catch(refreshError){setError((refreshError instanceof Error?refreshError.message:t.error)+' · '+(language==='ru'?'Объявление сохранено, но список не удалось обновить.':'Listing saved, but the list could not be refreshed.'))}
  }catch(e){if(uploaded.length){const paths=uploaded.map(url=>{try{return new URL(url).pathname.split('/marketplace-listings/')[1]}catch{return ''}}).filter(Boolean);if(paths.length)await supabase.storage.from('marketplace-listings').remove(paths)}setError(e instanceof Error?e.message:t.error)}
  finally{setBusy(false)}
 }
 async function remove(item:Listing){
  if(!window.confirm(t.remove+'?'))return
  setError('');setMessage('');setBusy(true)
  try{
   const {data:deleted,error:deleteError}=await supabase.from('marketplace_listings').delete().eq('id',item.id).eq('seller_id',user.id).select('id').maybeSingle()
   if(deleteError)throw deleteError
   if(!deleted?.id)throw new Error(language==='ru'?'Объявление не удалено: оно не найдено для текущего аккаунта. Обнови страницу и проверь, в тот ли аккаунт ты вошёл.':'Listing was not deleted: it was not found for the current account. Refresh and check which account is signed in.')
   const paths=(item.images||[]).map(url=>{try{return new URL(url).pathname.split('/marketplace-listings/')[1]}catch{return ''}}).filter(Boolean)
   if(paths.length){
    const {error:storageError}=await supabase.storage.from('marketplace-listings').remove(paths)
    if(storageError)setMessage(language==='ru'?'Объявление удалено, но часть фотографий не удалось очистить.':'Listing deleted, but some photos could not be cleaned up.')
   }
   await refresh()
  }catch(e){setError(e instanceof Error?e.message:t.error)}
  finally{setBusy(false)}
 }
 async function markSold(item:Listing){if(busy||!window.confirm(t.confirmSold))return;setError('');setMessage('');setBusy(true);try{const {error}=await supabase.rpc('mark_marketplace_listing_sold',{p_listing_id:item.id});if(error)throw error;setMessage(language==='ru'?'Товар отмечен как проданный.':language==='et'?'Toode märgiti müüduks.':'Item marked as sold.');setListingFilter('sold');await refresh()}catch(e){setError(e instanceof Error?e.message:t.error)}finally{setBusy(false)}}
 const statusText=(status:string)=>t[statusKey[status]||'pending']
 const visibleListings=useMemo(()=>listings.filter(item=>listingFilter==='all'||(listingFilter==='market'?item.status==='approved':item.status==='sold')), [listings,listingFilter])
 return <section className={`seller-panel ${language==='ru'?'seller-panel-ru':''}`} lang={language}>
  <div className="seller-panel-heading"><div><p className="eyebrow red">{t.marketplace}</p><h2>{t.title}</h2><p>{t.intro}</p></div><Package size={21}/></div>
  <div className="seller-panel-toolbar"><h3>{t.my}</h3><button type="button" onClick={()=>{reset();setShowForm(true)}}><Plus size={15}/>{t.new}</button></div>
  {message&&<div className="account-message"><CheckCircle2 size={16}/>{message}</div>}
  {accountMismatch&&<div className="account-error">{language==='ru'?'Похоже, ты вошёл в другой аккаунт. У этого Telegram username есть объявления в другой учётной записи. Выйди и войди через исходный Telegram-аккаунт; объявления не удалены.':'This looks like a different account. Listings exist under another account with this Telegram username. Sign out and use the original Telegram login; your listings have not been deleted.'}</div>}
  {error&&<div className="account-error">{error}</div>}
  {showForm&&<form className="seller-form" onSubmit={submit}>
   <div className="seller-form-intro"><div><span className="seller-section-kicker">{t.createTitle}</span><h3>{editing?t.save:t.new}</h3><p>{t.createHint}</p></div><button type="button" className="seller-form-close" onClick={reset} aria-label={t.closeForm}>×</button></div>
   <section className="seller-form-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">01</span><div><h4>{t.photosHeading}</h4><p>{t.photos} · {t.photosHint}</p></div></div>
    <div className="seller-photo-field seller-photo-field-featured"><label className={`seller-photo-picker seller-photo-picker-featured ${existingImages.length+files.length>=20?'is-full':''}`}><ImagePlus size={22}/><span><strong>{t.addPhotos}</strong><small>{t.photoHint} · {existingImages.length+files.length}/20</small></span><input disabled={existingImages.length+files.length>=20} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const selected=Array.from(e.target.files||[]);setFiles(items=>[...items,...selected].slice(0,20-existingImages.length));e.currentTarget.value=""}}/></label><div className="seller-photo-grid seller-photo-grid-preview">{[...existingImages.map((src,i)=>({src,kind:'existing' as const,index:i})),...previews.map((src,i)=>({src,kind:'new' as const,index:i}))].map((photo,i,all)=><div className={`seller-photo-thumb ${i===0?'is-cover':''}`} key={photo.src} data-photo-index={i} data-dragging={draggedPhoto===i || undefined} onPointerDown={e=>startPhotoDrag(e,i)} onPointerUp={finishPhotoDrag} onPointerCancel={()=>{photoDragRef.current=null;setDraggedPhoto(null)}}><button type="button" className="seller-photo-open" onClick={()=>{if(!suppressPreviewClick.current)setPhotoPreview(photo.src)}} aria-label={t.previewPhoto}><img src={photo.src} alt={`${t.listingPhoto} ${i+1}`}/></button>{i===0&&<span className="seller-photo-cover">{t.photoCover}</span>}<span className="seller-photo-index">{i+1}</span><div className="seller-photo-thumb-actions"><button type="button" className="remove" onPointerDown={e=>e.stopPropagation()} onClick={()=>photo.kind==='existing'?setExistingImages(items=>items.filter((_,n)=>n!==photo.index)):setFiles(items=>items.filter((_,n)=>n!==photo.index))} aria-label={t.removePhoto} title={t.removePhoto}><Trash2 size={13}/></button></div></div>)}</div><div className="seller-photo-tip"><span>{t.photoTipHeading}</span><p>{t.photoTip}</p></div></div>
   </section>
   <section className="seller-form-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">01</span><div><h4>{t.itemInfoHeading}</h4><p>{t.itemInfoHint}</p></div></div>
    <div className="seller-form-grid seller-form-grid-main">
     <label className="seller-field-title">{t.name}<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} required minLength={3} placeholder={t.titlePlaceholder}/></label>
     <label className="seller-field-price">{t.price}<div className="seller-price-wrap"><input type="number" value={price} onChange={e=>setPrice(e.target.value)} min="0.01" step="0.01" required placeholder="0.00"/><span>€</span></div></label>
    </div>
    <label className="seller-field-title seller-telegram-field">{t.telegramContact}<input value={telegramUsername} onChange={e=>{setTelegramUsername(e.target.value);setTelegramAutofilled(false)}} placeholder="@username" required minLength={5} maxLength={33} pattern="@?[A-Za-z0-9_]{5,32}"/><small>{telegramAutofilled?(language==='ru'?'Заполнено автоматически из профиля Telegram. Можно изменить.':language==='et'?'Täideti automaatselt sinu Telegrami profiilist. Saad seda muuta.':'Auto-filled from your Telegram profile. You can edit it.'):t.telegramHint}</small></label>
   </section>
   <section className="seller-form-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">02</span><div><h4>{t.specsHeading}</h4><p>{t.specsHint}</p></div></div>
    <div className="seller-form-grid">
     <label>{t.category}<select value={category} onChange={e=>{const next=e.target.value;setCategory(next);setSize('')}} disabled={categoriesLoading||categories.length===0} required><option value="" disabled>{categoriesLoading?t.loadingCategories:t.selectCategory}</option>{categories.map(item=><option key={item.id} value={item.name}>{categoryLabel(item.name,language)}</option>)}</select></label>
     <label>{t.brand}<input value={brand} onChange={e=>setBrand(e.target.value)} maxLength={80} placeholder={t.brandPlaceholder}/></label>
     <label>{isBeltCategory(category)?t.beltSize:t.clothingSize}{isBeltCategory(category)?<div className="seller-belt-size"><input type="number" inputMode="numeric" min="1" max="300" step="1" value={size} onChange={e=>setSize(e.target.value)} placeholder={t.beltPlaceholder} required/><span>{language==='ru'?'см':'cm'}</span></div>:<select value={size} onChange={e=>setSize(e.target.value)} required><option value="" disabled>{t.selectSize}</option>{CLOTHING_SIZES.map(value=><option key={value} value={value}>{value}</option>)}{size&&!CLOTHING_SIZES.includes(size)&&<option value={size}>{size}</option>}</select>}</label>
     <label>{t.condition}<select value={condition} onChange={e=>setCondition(e.target.value)} required><option value="" disabled>{t.selectCondition}</option><option value="new_with_tags">{t.conditionOptions[0]}</option><option value="new_without_tags">{t.conditionOptions[1]}</option><option value="excellent">{t.conditionOptions[2]}</option><option value="good">{t.conditionOptions[3]}</option><option value="defects">{t.conditionOptions[4]}</option></select></label>
    </div>
   </section>
   <section className="seller-form-section seller-auth-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">03</span><div><h4>{t.legit}</h4><p>{t.legitHint}</p></div></div>
    <button type="button" role="switch" aria-checked={isLegit} className={`seller-legit-switch-v2 ${isLegit?'is-legit':'is-rep'}`} onClick={()=>setIsLegit(value=>!value)}>
     <span className="seller-legit-state"><span className="seller-legit-state-dot"/><strong>{isLegit?t.legitYes:t.legitNo}</strong></span>
     <span className="seller-legit-track"><span className="seller-legit-knob-v2"/></span>
     <span className="seller-legit-description">{isLegit?t.markedLegit:t.markedRep}</span>
    </button>
   </section>
   <section className="seller-form-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">04</span><div><h4>{t.colors}</h4><p>{t.chooseColors}</p></div></div>
    <div className="seller-color-section">
     {colors.length>0&&<div className="admin-color-selected">{colors.map(color=><span key={color.name} className="admin-color-chip"><i style={{background:color.hex}}/>{color.name}<button type="button" onClick={()=>setColors(items=>items.filter(item=>item.name!==color.name))} aria-label={`${t.removeColor}: ${color.name}`}>×</button></span>)}</div>}
          <div className="admin-color-palette" aria-label={t.colors}>{COLOR_PALETTE.map(color=><button type="button" key={color.name} title={colorLabel(color.name,language)} aria-label={colorLabel(color.name,language)} aria-pressed={colors.some(item=>item.name.toLowerCase()===color.name.toLowerCase())} onClick={()=>setColors(items=>items.some(item=>item.name.toLowerCase()===color.name.toLowerCase())?items.filter(item=>item.name.toLowerCase()!==color.name.toLowerCase()):[...items,{...color}])} className={colors.some(item=>item.name.toLowerCase()===color.name.toLowerCase())?'selected':''}><i style={{background:color.hex}}/>{colors.some(item=>item.name.toLowerCase()===color.name.toLowerCase())&&<span>✓</span>}</button>)}</div>
     <div className="admin-custom-color"><input value={customColorName} onChange={e=>setCustomColorName(e.target.value)} placeholder={t.customColor} aria-label={t.customColor}/><label className="admin-color-picker"><input type="color" value={customColorHex} onChange={e=>setCustomColorHex(e.target.value)} aria-label={t.customSwatch}/><span style={{background:customColorHex}}/></label><button type="button" className="admin-ghost" onClick={()=>{const name=customColorName.trim();if(!name||colors.some(item=>item.name.toLowerCase()===name.toLowerCase())){setColorError(t.uniqueColor);return}setColors(items=>[...items,{name,hex:customColorHex.toLowerCase()}]);setCustomColorName('');setCustomColorHex('#888888');setColorError('')}}><Plus size={14}/>{t.addColor}</button></div>
     {colorError&&<div className="admin-inline-error">{colorError}</div>}
    </div>
   </section>
   <section className="seller-form-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">05</span><div><h4>{t.descriptionHeading}</h4><p>{t.descriptionHint}</p></div></div>
    <label className="seller-description-field">{t.desc}<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={3000} rows={5} required placeholder={t.descriptionPlaceholder}/></label>
   </section>

   {busy&&files.length>0&&<div className="seller-upload-progress" role="status"><div><span>{t.uploading}</span><strong>{uploadProgress}/{files.length}</strong></div><i><span style={{width:Math.round(uploadProgress/files.length*100)+'%'}}/></i></div>}
   <div className="seller-form-actions"><button className="account-primary" disabled={busy} type="submit">{busy?<LoaderCircle className="spin" size={16}/>:<CheckCircle2 size={16}/>} {busy?(files.length?t.uploading+' '+uploadProgress+'/'+files.length:t.saving):editing?t.save:t.submit}</button><button className="account-secondary" type="button" disabled={busy} onClick={reset}>{t.cancel}</button></div>
  </form>}
  {photoPreview&&<div className="seller-photo-lightbox" role="dialog" aria-modal="true" aria-label={t.previewPhoto} onClick={()=>setPhotoPreview(null)}><button type="button" onClick={()=>setPhotoPreview(null)} aria-label={t.closePreview}>×</button><img src={photoPreview} alt={t.previewPhoto} onClick={e=>e.stopPropagation()}/></div>}
  <div className="seller-list-filters" role="tablist" aria-label={t.my}><button type="button" className={listingFilter==='all'?'active':''} onClick={()=>setListingFilter('all')}>{t.all} <span>{listings.length}</span></button><button type="button" className={listingFilter==='market'?'active':''} onClick={()=>setListingFilter('market')}>{t.marketTab} <span>{listings.filter(item=>item.status==='approved').length}</span></button><button type="button" className={listingFilter==='sold'?'active':''} onClick={()=>setListingFilter('sold')}>{t.soldTab} <span>{listings.filter(item=>item.status==='sold').length}</span></button></div>
  {loading?<div className="account-state"><LoaderCircle className="spin" size={18}/>{t.loading}</div>:visibleListings.length===0?<div className="seller-empty">{listingFilter==='market'?t.marketEmpty:t.empty}</div>:<div className="seller-list">{visibleListings.map(item=><article className="seller-listing" key={item.id}><img src={item.images?.[0]} alt={t.listingPhoto}/><div className="seller-listing-info"><strong>{item.title}</strong><span>€{Number(item.price).toFixed(2)}</span><small className={'seller-status '+item.status}>{statusText(item.status)}</small><span className={`seller-legit-badge ${item.is_legit?'is-legit':'is-rep'}`}>{item.is_legit?'LEGIT':'R€P'}</span>{item.status==='rejected'&&<div className="seller-rejection-note"><strong>{language==='ru'?'Причина отклонения':language==='et'?'Tagasilükkamise põhjus':'Reason for rejection'}</strong><p>{item.moderation_reason|| (language==='ru'?'Администратор не указал причину.':language==='et'?'Administraator ei lisanud põhjust.':'No reason was provided by the admin.')}</p></div>}</div><div className="seller-listing-actions">{['pending','rejected'].includes(item.status)&&<button type="button" onClick={()=>startEdit(item)}><RotateCcw size={14}/></button>}{item.status==='approved'&&<button type="button" className="seller-mark-sold" disabled={busy} onClick={()=>markSold(item)} title={t.markSold} aria-label={t.markSold}><Tag size={14}/><span>{t.markSold}</span></button>}<button type="button" onClick={()=>remove(item)} title={t.remove}><Trash2 size={14}/></button></div></article>)}</div>}
 </section>
}

