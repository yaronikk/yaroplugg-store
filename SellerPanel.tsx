import React, { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { CheckCircle2, ImagePlus, LoaderCircle, Plus, Trash2, Package, RotateCcw, Tag } from 'lucide-react'

type Props = { supabase: any; user: User; language: 'en'|'ru'|'et' }
type AdminColor={name:string;hex:string}
type Listing = { id:string; title:string; description:string; price:number; category:string; brand:string; size_label:string; item_condition:string; is_legit:boolean; colors:AdminColor[]; images:string[]; status:string; moderation_reason:string|null; created_at:string }
type StoreCategory = { id:string; name:string; slug:string }
const words = {
 en:{colors:'COLORS',chooseColors:'Choose one or more',searchColors:'Search colors…',customColor:'Custom color name',addColor:'ADD',noColors:'Select at least one color.',title:'SELLER PANEL',intro:'Create listings and manage your items.',new:'NEW LISTING',my:'MY LISTINGS',name:'TITLE',desc:'DESCRIPTION',price:'PRICE · EUR',category:'CATEGORY',brand:'BRAND',size:'SIZE',condition:'CONDITION',selectCondition:'Select condition',legit:'AUTHENTICITY',legitYes:'LEGIT',legitNo:'R€P',legitHint:'Seller-declared status',photos:'PHOTOS · 3–10',photoCover:'COVER',addPhotos:'Add photos',photoHint:'JPG, PNG or WebP · up to 10 photos · max 10 MB each',submit:'SUBMIT FOR REVIEW',save:'SAVE CHANGES',loading:'LOADING…',empty:'No listings yet.',pending:'UNDER REVIEW',approved:'PUBLISHED',rejected:'CHANGES REQUIRED',sold:'SOLD',remove:'DELETE',markSold:'MARK AS SOLD',resubmit:'RESUBMIT',uploading:'UPLOADING PHOTOS…',success:'Listing sent for moderation.',needPhotos:'Please add 3–10 photos.',conditionOptions:['New with tags','New without tags','Excellent','Good','Has defects'],beltSize:'SIZE · CM',clothingSize:'SIZE',selectSize:'Select size',beltPlaceholder:'Enter belt length in cm',error:'Could not save listing.',all:'ALL LISTINGS',active:'ACTIVE',rejectedTab:'REJECTED',marketTab:'MARKET',marketEmpty:'No published listings in the market yet.',photoSection:'Photos',photoSectionHint:'Add clear photos from different angles. The first photo will be the cover.',itemInfo:'Item information',itemInfoHint:'Add a clear title and price.',specifications:'Specifications',specificationsHint:'Choose the appropriate item details.',descriptionSection:'Description',descriptionHint:'Describe the fit, condition and any flaws.',descriptionPlaceholder:'Describe the item, fit and any flaws…',titlePlaceholder:'For example, vintage Nike hoodie',brandPlaceholder:'For example, Nike, Carhartt',cancel:'CANCEL',close:'Close form',preview:'Photo preview',validCategory:'Select a category from the list.',validPrice:'Enter a valid price.',invalidImage:'Use JPG, PNG or WebP images up to 10 MB.',uniqueColor:'Enter a unique color name and valid HEX code.',customSwatch:'Custom color swatch',customHex:'Custom color HEX',removePhoto:'Remove photo',moveLeft:'Move photo left',moveRight:'Move photo right',markedLegit:'Seller marked this item as LEGIT',markedRep:'Seller marked this item as R€P',loadingCategories:'Loading…',selectCategory:'Select category',marketplace:"MARKETPLACE",createHint:"Add photos first, then fill in the item details.",photosHeading:"Photos",photosHint:"Add clear photos from multiple angles. The first photo will be your cover.",itemInfoHeading:"Item information",itemInfoHint:"Give your listing a clear title and price.",specsHeading:"Specifications",specsHint:"Choose the closest match for your item.",descriptionHeading:"Description",descriptionHint:"Add useful details about fit, condition and flaws.",titlePlaceholder:"e.g. Vintage Nike hoodie",brandPlaceholder:"e.g. Nike, Carhartt",descriptionPlaceholder:"Describe the item, its fit and any imperfections…",closeForm:"Close form",previewPhoto:"Preview photo",listingPhoto:"Listing photo",movePhotoLeft:"Move photo left",movePhotoRight:"Move photo right",removePhoto:"Remove photo",removeColor:"Remove color",customSwatch:"Custom color swatch",customHex:"Custom HEX color",cancel:"CANCEL",soldEmpty:"No sold listings yet.",createTitle:"CREATE LISTING",closePreview:"Close preview"},
 ru:{colors:'ЦВЕТА',chooseColors:'Можно выбрать несколько',searchColors:'Поиск цветов…',customColor:'Название своего цвета',addColor:'ДОБАВИТЬ',noColors:'Выбери хотя бы один цвет.',title:'ПАНЕЛЬ ПРОДАВЦА',intro:'Создавай объявления и управляй своими вещами.',new:'НОВОЕ ОБЪЯВЛЕНИЕ',my:'МОИ ОБЪЯВЛЕНИЯ',name:'НАЗВАНИЕ',desc:'ОПИСАНИЕ',price:'ЦЕНА · EUR',category:'КАТЕГОРИЯ',brand:'БРЕНД',size:'РАЗМЕР',condition:'СОСТОЯНИЕ',selectCondition:'Выбери состояние',legit:'ОРИГИНАЛЬНОСТЬ',legitYes:'LEGIT',legitNo:'R€P',legitHint:'Отметка продавца, не проверка платформы',photos:'ФОТОГРАФИИ · 3–10',photoCover:'ОБЛОЖКА',addPhotos:'Добавить фото',photoHint:'JPG, PNG или WebP · до 10 фото · максимум 10 МБ каждое',submit:'ОТПРАВИТЬ НА ПРОВЕРКУ',save:'СОХРАНИТЬ ИЗМЕНЕНИЯ',loading:'ЗАГРУЗКА…',empty:'Объявлений пока нет.',pending:'НА ПРОВЕРКЕ',approved:'ОПУБЛИКОВАНО',rejected:'НУЖНЫ ИЗМЕНЕНИЯ',sold:'ПРОДАНО',remove:'УДАЛИТЬ',markSold:'ОТМЕТИТЬ ПРОДАННЫМ',resubmit:'ОТПРАВИТЬ ПОВТОРНО',uploading:'ЗАГРУЖАЕМ ФОТО…',success:'Объявление отправлено на модерацию.',needPhotos:'Добавь от 3 до 10 фотографий.',conditionOptions:['Новое с бирками','Новое без бирок','Отличное','Хорошее','Есть дефекты'],beltSize:'РАЗМЕР · СМ',clothingSize:'РАЗМЕР',selectSize:'Выбери размер',beltPlaceholder:'Введи длину ремня в см',error:'Не удалось сохранить объявление.',all:'ВСЕ ОБЪЯВЛЕНИЯ',active:'АКТИВНЫЕ',rejectedTab:'ОТКЛОНЁННЫЕ',marketTab:'МАРКЕТ',marketEmpty:'Пока нет опубликованных объявлений в маркете.',photoSection:'Фотографии',photoSectionHint:'Добавь чёткие фото с разных ракурсов. Первое фото будет обложкой.',itemInfo:'Информация о товаре',itemInfoHint:'Укажи понятное название и цену.',specifications:'Характеристики',specificationsHint:'Выбери подходящие параметры товара.',descriptionSection:'Описание',descriptionHint:'Добавь информацию о посадке, состоянии и недостатках.',descriptionPlaceholder:'Опиши товар, посадку и возможные недостатки…',titlePlaceholder:'Например, винтажное худи Nike',brandPlaceholder:'Например, Nike, Carhartt',cancel:'ОТМЕНА',close:'Закрыть форму',preview:'Предпросмотр фото',validCategory:'Выбери категорию из списка.',validPrice:'Укажи корректную цену.',invalidImage:'Используй JPG, PNG или WebP размером до 10 МБ.',uniqueColor:'Укажи уникальное название цвета и корректный HEX-код.',customSwatch:'Образец своего цвета',customHex:'HEX-код своего цвета',removePhoto:'Удалить фото',moveLeft:'Переместить фото влево',moveRight:'Переместить фото вправо',markedLegit:'Продавец отметил товар как LEGIT',markedRep:'Продавец отметил товар как R€P',loadingCategories:'Загрузка…',selectCategory:'Выбери категорию',marketplace:"МАРКЕТПЛЕЙС",createHint:"Сначала добавь фотографии, затем заполни данные товара.",photosHeading:"Фотографии",photosHint:"Добавь чёткие фото с разных ракурсов. Первое фото будет обложкой.",itemInfoHeading:"Информация о товаре",itemInfoHint:"Укажи понятное название и цену.",specsHeading:"Характеристики",specsHint:"Выбери подходящие параметры товара.",descriptionHeading:"Описание",descriptionHint:"Добавь информацию о посадке, состоянии и недостатках.",titlePlaceholder:"Например, винтажное худи Nike",brandPlaceholder:"Например, Nike, Carhartt",descriptionPlaceholder:"Опиши товар, посадку и возможные недостатки…",closeForm:"Закрыть форму",previewPhoto:"Предпросмотр фото",listingPhoto:"Фото объявления",movePhotoLeft:"Переместить фото влево",movePhotoRight:"Переместить фото вправо",removePhoto:"Удалить фото",removeColor:"Удалить цвет",customSwatch:"Образец своего цвета",customHex:"Свой HEX-код цвета",cancel:"ОТМЕНА",soldEmpty:"Проданных объявлений пока нет.",createTitle:"СОЗДАНИЕ ОБЪЯВЛЕНИЯ",closePreview:"Закрыть предпросмотр"},
 et:{colors:'VÄRVID',chooseColors:'Vali üks või mitu',searchColors:'Otsi värve…',customColor:'Kohandatud värvi nimi',addColor:'LISA',noColors:'Vali vähemalt üks värv.',title:'MÜÜJA PANEEL',intro:'Loo kuulutusi ja halda oma tooteid.',new:'UUS KUULUTUS',my:'MINU KUULUTUSED',name:'PEALKIRI',desc:'KIRJELDUS',price:'HIND · EUR',category:'KATEGOORIA',brand:'BRÄND',size:'SUURUS',condition:'SEISUKORD',selectCondition:'Vali seisukord',legit:'AUTENTSUS',legitYes:'LEGIT',legitNo:'R€P',legitHint:'Müüja märgitud staatus',photos:'FOTOD · 3–10',photoCover:'KAANEFOTO',addPhotos:'Lisa fotosid',photoHint:'JPG, PNG või WebP · kuni 10 fotot · kuni 10 MB igaüks',submit:'SAADA KONTROLLI',save:'SALVESTA MUUDATUSED',loading:'LAADIMINE…',empty:'Kuulutusi veel pole.',pending:'KONTROLLIMISEL',approved:'AVALDATUD',rejected:'VAJAB MUUDATUSI',sold:'MÜÜDUD',remove:'KUSTUTA',markSold:'MÄRGI MÜÜDuks',resubmit:'SAADA UUESTI',uploading:'FOTOSID LAADITAKSE…',success:'Kuulutus saadeti modereerimisele.',needPhotos:'Lisa 3–10 fotot.',conditionOptions:['Uus siltidega','Uus ilma siltideta','Suurepärane','Hea','Defektidega'],beltSize:'SUURUS · CM',clothingSize:'SUURUS',selectSize:'Vali suurus',beltPlaceholder:'Sisesta vöö pikkus cm',error:'Kuulutuse salvestamine ebaõnnestus.',all:'KÕIK KUULUTUSED',active:'AKTIIVSED',rejectedTab:'TAGASI LÜKATUD',marketTab:'TURG',marketEmpty:'Turul pole veel avaldatud kuulutusi.',photoSection:'Fotod',photoSectionHint:'Lisa selged fotod eri nurkade alt. Esimene foto on kaanefoto.',itemInfo:'Toote andmed',itemInfoHint:'Lisa kuulutusele selge pealkiri ja hind.',specifications:'Tehnilised andmed',specificationsHint:'Vali tootele sobivad omadused.',descriptionSection:'Kirjeldus',descriptionHint:'Lisa teavet istuvuse, seisukorra ja puuduste kohta.',descriptionPlaceholder:'Kirjelda toodet, istuvust ja võimalikke puudusi…',titlePlaceholder:'Nt vintage Nike’i pusa',brandPlaceholder:'Nt Nike, Carhartt',cancel:'TÜHISTA',close:'Sulge vorm',preview:'Foto eelvaade',validCategory:'Vali loendist kategooria.',validPrice:'Sisesta korrektne hind.',invalidImage:'Kasuta JPG-, PNG- või WebP-pilte, mille suurus on kuni 10 MB.',uniqueColor:'Sisesta kordumatu värvinimi ja korrektne HEX-kood.',customSwatch:'Kohandatud värvinäidis',customHex:'Kohandatud HEX-värv',removePhoto:'Eemalda foto',moveLeft:'Liiguta fotot vasakule',moveRight:'Liiguta fotot paremale',markedLegit:'Müüja märkis toote LEGIT-iks',markedRep:'Müüja märkis toote R€P-iks',loadingCategories:'Laadimine…',selectCategory:'Vali kategooria',marketplace:"TURG",createHint:"Lisa esmalt fotod, seejärel täida toote andmed.",photosHeading:"Fotod",photosHint:"Lisa selged fotod eri nurkade alt. Esimene foto on kaanefoto.",itemInfoHeading:"Toote andmed",itemInfoHint:"Lisa kuulutusele selge pealkiri ja hind.",specsHeading:"Tehnilised andmed",specsHint:"Vali tootele kõige sobivamad omadused.",descriptionHeading:"Kirjeldus",descriptionHint:"Lisa teavet istuvuse, seisukorra ja puuduste kohta.",titlePlaceholder:"Nt vintage Nike’i pusa",brandPlaceholder:"Nt Nike, Carhartt",descriptionPlaceholder:"Kirjelda toodet, istuvust ja võimalikke puudusi…",closeForm:"Sulge vorm",previewPhoto:"Foto eelvaade",listingPhoto:"Kuulutuse foto",movePhotoLeft:"Liiguta fotot vasakule",movePhotoRight:"Liiguta fotot paremale",removePhoto:"Eemalda foto",removeColor:"Eemalda värv",customSwatch:"Kohandatud värvinäidis",customHex:"Kohandatud HEX-värv",cancel:"TÜHISTA",soldEmpty:"Müüdud kuulutusi veel pole.",createTitle:"KUULUTUSE LOOMINE",closePreview:"Sulge eelvaade"}
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
 const [message,setMessage]=useState('')
 const [editing,setEditing]=useState<Listing|null>(null)
 const [title,setTitle]=useState('')
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
 const [existingImages,setExistingImages]=useState<string[]>([])
 const [showForm,setShowForm]=useState(false)
 const [listingFilter,setListingFilter]=useState<'all'|'active'|'rejected'|'market'>('all')
 const [photoPreview,setPhotoPreview]=useState<string|null>(null)
 const previews=useMemo(()=>files.map(file=>URL.createObjectURL(file)),[files])
 useEffect(()=>()=>previews.forEach(URL.revokeObjectURL),[previews])
 async function refresh(){
  const {data,error}=await supabase.from('marketplace_listings').select('*').eq('seller_id',user.id).order('created_at',{ascending:false})
  if(error)throw error
  setListings((data||[]) as Listing[])
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
 function reset(){setEditing(null);setTitle('');setDescription('');setPrice('');setCategory('');setBrand('');setSize('');setIsLegit(false);setCondition('');setColors([]);setColorSearch('');setCustomColorName('');setCustomColorHex('#888888');setColorError('');setFiles([]);setExistingImages([]);setShowForm(false)}
 function startEdit(item:Listing){setEditing(item);setTitle(item.title);setDescription(item.description);setPrice(String(item.price));setCategory(categories.find(c=>c.name===item.category||c.slug===item.category)?.name||item.category);setBrand(item.brand||'');setSize(isBeltCategory(categories.find(c=>c.name===item.category||c.slug===item.category)?.name||item.category)?(item.size_label||'').replace(/\\s*(?:cm|см)$/i,''):(item.size_label||''));setIsLegit(Boolean(item.is_legit));setCondition(item.item_condition);setColors(Array.isArray(item.colors)?item.colors:[]);setExistingImages(item.images||[]);setFiles([]);setShowForm(true)}
 function movePhoto(from:number,to:number){
  const ordered=[...existingImages.map(src=>({kind:'existing' as const,src})),...files.map(file=>({kind:'new' as const,file}))];
  if(to<0||to>=ordered.length)return;
  const [moving]=ordered.splice(from,1);ordered.splice(to,0,moving);
  setExistingImages(ordered.filter((item):item is {kind:'existing';src:string}=>item.kind==='existing').map(item=>item.src));
  setFiles(ordered.filter((item):item is {kind:'new';file:File}=>item.kind==='new').map(item=>item.file));
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();setError('');setMessage('')
  const total=existingImages.length+files.length
  if(total<3||total>10){setError(t.needPhotos);return}
  if(!category||!categories.some(item=>item.name===category)){setError(t.validCategory);return}
  if(!size.trim()||(isBeltCategory(category)&&(!Number.isFinite(Number(size))||Number(size)<=0||Number(size)>300))){setError(isBeltCategory(category)?t.beltPlaceholder:t.selectSize);return}
  if(!colors.length){setColorError(t.noColors);setError(t.noColors);return}
  if(!Number.isFinite(Number(price))||Number(price)<=0){setError(t.validPrice);return}
  setBusy(true)
  const uploaded:string[]=[]
  try{
   for(const file of files){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error(t.invalidImage)
   }
   const listingId=editing?.id||crypto.randomUUID()
   for(const file of files){
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
    const path=user.id+'/'+listingId+'/'+crypto.randomUUID()+'.'+ext
    const {error:uploadError}=await supabase.storage.from('marketplace-listings').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false})
    if(uploadError)throw uploadError
    uploaded.push(supabase.storage.from('marketplace-listings').getPublicUrl(path).data.publicUrl)
   }
   const payload={title:title.trim(),description:description.trim(),price:Number(price),category,brand:brand.trim(),size_label:isBeltCategory(category)?`${size.trim()} ${language==='ru'?'см':'cm'}`:size.trim(),item_condition:condition,is_legit:isLegit,colors,images:[...existingImages,...uploaded]}
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
 async function remove(item:Listing){if(!window.confirm(t.remove+'?'))return;setError('');const {error}=await supabase.from('marketplace_listings').delete().eq('id',item.id).eq('seller_id',user.id);if(error)setError(error.message);else await refresh()}
 async function markSold(item:Listing){setError('');const {error}=await supabase.rpc('mark_marketplace_listing_sold',{p_listing_id:item.id});if(error)setError(error.message);else await refresh()}
 const statusText=(status:string)=>t[statusKey[status]||'pending']
 return <section className="seller-panel">
  <div className="seller-panel-heading"><div><p className="eyebrow red">{t.marketplace}</p><h2>{t.title}</h2><p>{t.intro}</p></div><Package size={21}/></div>
  <div className="seller-panel-toolbar"><h3>{t.my}</h3><button type="button" onClick={()=>{reset();setShowForm(true)}}><Plus size={15}/>{t.new}</button></div>
  {message&&<div className="account-message"><CheckCircle2 size={16}/>{message}</div>}
  {error&&<div className="account-error">{error}</div>}
  {showForm&&<form className="seller-form" onSubmit={submit}>
   <div className="seller-form-intro"><div><span className="seller-section-kicker">{t.createTitle}</span><h3>{editing?t.save:t.new}</h3><p>{t.createHint}</p></div><button type="button" className="seller-form-close" onClick={reset} aria-label={t.closeForm}>×</button></div>
   <section className="seller-form-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">01</span><div><h4>{t.photosHeading}</h4><p>{t.photos} · {t.photosHint}</p></div></div>
    <div className="seller-photo-field seller-photo-field-featured"><label className="seller-photo-picker seller-photo-picker-featured"><ImagePlus size={22}/><span><strong>{t.addPhotos}</strong><small>{t.photoHint}</small></span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const selected=Array.from(e.target.files||[]);setFiles(items=>[...items,...selected].slice(0,10-existingImages.length));e.currentTarget.value=""}}/></label><div className="seller-photo-grid seller-photo-grid-preview">{[...existingImages.map((src,i)=>({src,kind:'existing' as const,index:i})),...previews.map((src,i)=>({src,kind:'new' as const,index:i}))].map((photo,i,all)=><div className={`seller-photo-thumb ${i===0?'is-cover':''}`} key={photo.src}><button type="button" className="seller-photo-open" onClick={()=>setPhotoPreview(photo.src)} aria-label={t.previewPhoto}><img src={photo.src} alt={`${t.listingPhoto} ${i+1}`}/></button>{i===0&&<span className="seller-photo-cover">{t.photoCover}</span>}<span className="seller-photo-index">{i+1}</span><div className="seller-photo-thumb-actions">{i>0&&<button type="button" onClick={()=>movePhoto(i,i-1)} aria-label={t.movePhotoLeft}>←</button>}{i<all.length-1&&<button type="button" onClick={()=>movePhoto(i,i+1)} aria-label={t.movePhotoRight}>→</button>}<button type="button" className="remove" onClick={()=>photo.kind==='existing'?setExistingImages(items=>items.filter((_,n)=>n!==photo.index)):setFiles(items=>items.filter((_,n)=>n!==photo.index))} aria-label={t.removePhoto}>×</button></div></div>)}</div></div>
   </section>
   <section className="seller-form-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">01</span><div><h4>{t.itemInfoHeading}</h4><p>{t.itemInfoHint}</p></div></div>
    <div className="seller-form-grid seller-form-grid-main">
     <label className="seller-field-title">{t.name}<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} required minLength={3} placeholder={t.titlePlaceholder}/></label>
     <label className="seller-field-price">{t.price}<div className="seller-price-wrap"><input type="number" value={price} onChange={e=>setPrice(e.target.value)} min="0.01" step="0.01" required placeholder="0.00"/><span>€</span></div></label>
    </div>
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
     <div className="admin-color-selected">{colors.length?colors.map(color=><span key={color.name} className="admin-color-chip"><i style={{background:color.hex}}/>{color.name}<button type="button" onClick={()=>setColors(items=>items.filter(item=>item.name!==color.name))} aria-label={`${t.removeColor}: ${color.name}`}>×</button></span>):<span className="admin-color-empty">{t.noColors}</span>}</div>
     <div className="admin-color-search"><input value={colorSearch} onChange={e=>setColorSearch(e.target.value)} placeholder={t.searchColors} aria-label={t.searchColors}/></div>
     <div className="admin-color-palette" aria-label={t.colors}>{COLOR_PALETTE.filter(color=>color.name.toLowerCase().includes(colorSearch.toLowerCase())).map(color=><button type="button" key={color.name} onClick={()=>setColors(items=>items.some(item=>item.name.toLowerCase()===color.name.toLowerCase())?items.filter(item=>item.name.toLowerCase()!==color.name.toLowerCase()):[...items,{...color}])} className={colors.some(item=>item.name.toLowerCase()===color.name.toLowerCase())?'selected':''}><i style={{background:color.hex}}/><span>{color.name}</span></button>)}</div>
     <div className="admin-custom-color"><input value={customColorName} onChange={e=>setCustomColorName(e.target.value)} placeholder={t.customColor} aria-label={t.customColor}/><label className="admin-color-picker"><input type="color" value={customColorHex} onChange={e=>setCustomColorHex(e.target.value)} aria-label={t.customSwatch}/><span style={{background:customColorHex}}/></label><input value={customColorHex} onChange={e=>setCustomColorHex(e.target.value)} placeholder="#888888" aria-label={t.customHex}/><button type="button" className="admin-ghost" onClick={()=>{const name=customColorName.trim();if(!name||!/^#[0-9a-fA-F]{6}$/.test(customColorHex)||colors.some(item=>item.name.toLowerCase()===name.toLowerCase())){setColorError(t.uniqueColor);return}setColors(items=>[...items,{name,hex:customColorHex.toLowerCase()}]);setCustomColorName('');setCustomColorHex('#888888');setColorError('')}}><Plus size={14}/>{t.addColor}</button></div>
     {colorError&&<div className="admin-inline-error">{colorError}</div>}
    </div>
   </section>
   <section className="seller-form-section">
    <div className="seller-section-heading"><span className="seller-section-kicker">05</span><div><h4>{t.descriptionHeading}</h4><p>{t.descriptionHint}</p></div></div>
    <label className="seller-description-field">{t.desc}<textarea value={description} onChange={e=>setDescription(e.target.value)} minLength={10} maxLength={3000} rows={5} required placeholder={t.descriptionPlaceholder}/></label>
   </section>

   <div className="seller-form-actions"><button className="account-primary" disabled={busy} type="submit">{busy?<LoaderCircle className="spin" size={16}/>:<CheckCircle2 size={16}/>} {busy?t.uploading:editing?t.save:t.submit}</button><button className="account-secondary" type="button" disabled={busy} onClick={reset}>{t.cancel}</button></div>
  </form>}
  {photoPreview&&<div className="seller-photo-lightbox" role="dialog" aria-modal="true" aria-label={t.previewPhoto} onClick={()=>setPhotoPreview(null)}><button type="button" onClick={()=>setPhotoPreview(null)} aria-label={t.closePreview}>×</button><img src={photoPreview} alt={t.previewPhoto} onClick={e=>e.stopPropagation()}/></div>}
  <div className="seller-list-filters" role="tablist" aria-label={t.my}><button type="button" className={listingFilter==='all'?'active':''} onClick={()=>setListingFilter('all')}>{t.all} <span>{listings.length}</span></button><button type="button" className={listingFilter==='active'?'active':''} onClick={()=>setListingFilter('active')}>{t.active} <span>{listings.filter(item=>item.status==='pending'||item.status==='approved').length}</span></button><button type="button" className={listingFilter==='rejected'?'active':''} onClick={()=>setListingFilter('rejected')}>{t.rejectedTab} <span>{listings.filter(item=>item.status==='rejected').length}</span></button><button type="button" className={listingFilter==='market'?'active':''} onClick={()=>setListingFilter('market')}>{t.marketTab} <span>{listings.filter(item=>item.status==='approved').length}</span></button></div>
  {loading?<div className="account-state"><LoaderCircle className="spin" size={18}/>{t.loading}</div>:listings.filter(item=>listingFilter==='all'||(listingFilter==='market'?item.status==='approved':listingFilter==='rejected'?item.status==='rejected':(item.status==='pending'||item.status==='approved'))).length===0?<div className="seller-empty">{listingFilter==='market'?t.marketEmpty:listingFilter==='rejected'?t.empty:t.empty}</div>:<div className="seller-list">{listings.filter(item=>listingFilter==='all'||(listingFilter==='market'?item.status==='approved':listingFilter==='rejected'?item.status==='rejected':item.status!=='sold')).map(item=><article className="seller-listing" key={item.id}><img src={item.images?.[0]} alt={t.listingPhoto}/><div className="seller-listing-info"><strong>{item.title}</strong><span>€{Number(item.price).toFixed(2)}</span><small className={'seller-status '+item.status}>{statusText(item.status)}</small><span className={`seller-legit-badge ${item.is_legit?'is-legit':'is-rep'}`}>{item.is_legit?'LEGIT':'R€P'}</span>{item.status==='rejected'&&<div className="seller-rejection-note"><strong>{language==='ru'?'Причина отклонения':language==='et'?'Tagasilükkamise põhjus':'Reason for rejection'}</strong><p>{item.moderation_reason|| (language==='ru'?'Администратор не указал причину.':language==='et'?'Administraator ei lisanud põhjust.':'No reason was provided by the admin.')}</p></div>}</div><div className="seller-listing-actions">{['pending','rejected'].includes(item.status)&&<button type="button" onClick={()=>startEdit(item)}><RotateCcw size={14}/></button>}{item.status==='approved'&&<button type="button" onClick={()=>markSold(item)} title={t.markSold}><Tag size={14}/></button>}<button type="button" onClick={()=>remove(item)} title={t.remove}><Trash2 size={14}/></button></div></article>)}</div>}
 </section>
}
