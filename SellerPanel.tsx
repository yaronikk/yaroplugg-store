import React, { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { CheckCircle2, ImagePlus, LoaderCircle, Plus, Trash2, Package, RotateCcw, Tag } from 'lucide-react'

type Props = { supabase: any; user: User; language: 'en'|'ru'|'et' }
type AdminColor={name:string;hex:string}
type Listing = { id:string; title:string; description:string; price:number; category:string; brand:string; size_label:string; item_condition:string; colors:AdminColor[]; images:string[]; status:string; moderation_reason:string|null; created_at:string }
type StoreCategory = { id:string; name:string; slug:string }
const words = {
 en:{colors:'COLORS',chooseColors:'Choose one or more',searchColors:'Search colors…',customColor:'Custom color name',addColor:'ADD',noColors:'Select at least one color.',title:'SELLER PANEL',intro:'Create listings and manage your items.',new:'NEW LISTING',my:'MY LISTINGS',name:'TITLE',desc:'DESCRIPTION',price:'PRICE · EUR',category:'CATEGORY',brand:'BRAND',size:'SIZE',condition:'CONDITION',photos:'PHOTOS · 3–10',submit:'SUBMIT FOR REVIEW',save:'SAVE CHANGES',loading:'LOADING…',empty:'No listings yet.',pending:'UNDER REVIEW',approved:'PUBLISHED',rejected:'CHANGES REQUIRED',sold:'SOLD',remove:'DELETE',markSold:'MARK AS SOLD',resubmit:'RESUBMIT',uploading:'UPLOADING PHOTOS…',success:'Listing sent for moderation.',needPhotos:'Please add 3–10 photos.',conditionOptions:['New with tags','New without tags','Excellent','Good','Has defects'],beltSize:'SIZE · CM',clothingSize:'SIZE',selectSize:'Select size',beltPlaceholder:'Enter belt length in cm',error:'Could not save listing.',all:'ALL LISTINGS',active:'ACTIVE',soldTab:'SOLD'},
 ru:{colors:'ЦВЕТА',chooseColors:'Можно выбрать несколько',searchColors:'Поиск цветов…',customColor:'Название своего цвета',addColor:'ДОБАВИТЬ',noColors:'Выбери хотя бы один цвет.',title:'ПАНЕЛЬ ПРОДАВЦА',intro:'Создавай объявления и управляй своими вещами.',new:'НОВОЕ ОБЪЯВЛЕНИЕ',my:'МОИ ОБЪЯВЛЕНИЯ',name:'НАЗВАНИЕ',desc:'ОПИСАНИЕ',price:'ЦЕНА · EUR',category:'КАТЕГОРИЯ',brand:'БРЕНД',size:'РАЗМЕР',condition:'СОСТОЯНИЕ',photos:'ФОТОГРАФИИ · 3–10',submit:'ОТПРАВИТЬ НА ПРОВЕРКУ',save:'СОХРАНИТЬ ИЗМЕНЕНИЯ',loading:'ЗАГРУЗКА…',empty:'Объявлений пока нет.',pending:'НА ПРОВЕРКЕ',approved:'ОПУБЛИКОВАНО',rejected:'НУЖНЫ ИЗМЕНЕНИЯ',sold:'ПРОДАНО',remove:'УДАЛИТЬ',markSold:'ОТМЕТИТЬ ПРОДАННЫМ',resubmit:'ОТПРАВИТЬ ПОВТОРНО',uploading:'ЗАГРУЖАЕМ ФОТО…',success:'Объявление отправлено на модерацию.',needPhotos:'Добавь от 3 до 10 фотографий.',conditionOptions:['Новое с бирками','Новое без бирок','Отличное','Хорошее','Есть дефекты'],beltSize:'РАЗМЕР · СМ',clothingSize:'РАЗМЕР',selectSize:'Выбери размер',beltPlaceholder:'Введи длину ремня в см',error:'Не удалось сохранить объявление.',all:'ВСЕ ОБЪЯВЛЕНИЯ',active:'АКТИВНЫЕ',soldTab:'ПРОДАННЫЕ'},
 et:{colors:'VÄRVID',chooseColors:'Vali üks või mitu',searchColors:'Otsi värve…',customColor:'Kohandatud värvi nimi',addColor:'LISA',noColors:'Vali vähemalt üks värv.',title:'MÜÜJA PANEEL',intro:'Loo kuulutusi ja halda oma tooteid.',new:'UUS KUULUTUS',my:'MINU KUULUTUSED',name:'PEALKIRI',desc:'KIRJELDUS',price:'HIND · EUR',category:'KATEGOORIA',brand:'BRÄND',size:'SUURUS',condition:'SEISUKORD',photos:'FOTOD · 3–10',submit:'SAADA KONTROLLI',save:'SALVESTA MUUDATUSED',loading:'LAADIMINE…',empty:'Kuulutusi veel pole.',pending:'KONTROLLIMISEL',approved:'AVALDATUD',rejected:'VAJAB MUUDATUSI',sold:'MÜÜDUD',remove:'KUSTUTA',markSold:'MÄRGI MÜÜDuks',resubmit:'SAADA UUESTI',uploading:'FOTOSID LAADITAKSE…',success:'Kuulutus saadeti modereerimisele.',needPhotos:'Lisa 3–10 fotot.',conditionOptions:['Uus siltidega','Uus ilma siltideta','Suurepärane','Hea','Defektidega'],beltSize:'SUURUS · CM',clothingSize:'SUURUS',selectSize:'Vali suurus',beltPlaceholder:'Sisesta vöö pikkus cm',error:'Kuulutuse salvestamine ebaõnnestus.',all:'KÕIK KUULUTUSED',active:'AKTIIVSED',soldTab:'MÜÜDUD'}
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
 const [condition,setCondition]=useState('good')
 const [colors,setColors]=useState<AdminColor[]>([{name:'Black',hex:'#0b0b0b'}])
 const [colorSearch,setColorSearch]=useState('')
 const [customColorName,setCustomColorName]=useState('')
 const [customColorHex,setCustomColorHex]=useState('#888888')
 const [colorError,setColorError]=useState('')
 const [files,setFiles]=useState<File[]>([])
 const [existingImages,setExistingImages]=useState<string[]>([])
 const [showForm,setShowForm]=useState(false)
 const [listingFilter,setListingFilter]=useState<'all'|'active'|'sold'>('all')
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
  setCategory(current=>current||rows[0]?.name||'')
  setCategoriesLoading(false)
 }
 useEffect(()=>{let active=true;(async()=>{try{await Promise.all([refresh(),loadCategories()])}catch(e){if(active)setError(e instanceof Error?e.message:t.error);if(active)setCategoriesLoading(false)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[user.id])
 function reset(){setEditing(null);setTitle('');setDescription('');setPrice('');setCategory(categories[0]?.name||'');setBrand('');setSize('');setCondition('good');setColors([{name:'Black',hex:'#0b0b0b'}]);setColorSearch('');setCustomColorName('');setCustomColorHex('#888888');setColorError('');setFiles([]);setExistingImages([]);setShowForm(false)}
 function startEdit(item:Listing){setEditing(item);setTitle(item.title);setDescription(item.description);setPrice(String(item.price));setCategory(categories.find(c=>c.name===item.category||c.slug===item.category)?.name||item.category);setBrand(item.brand||'');setSize(isBeltCategory(categories.find(c=>c.name===item.category||c.slug===item.category)?.name||item.category)?(item.size_label||'').replace(/\\s*cm$/i,''):(item.size_label||''));setCondition(item.item_condition);setColors(Array.isArray(item.colors)&&item.colors.length?item.colors:[{name:'Black',hex:'#0b0b0b'}]);setExistingImages(item.images||[]);setFiles([]);setShowForm(true)}
 async function submit(event:React.FormEvent){
  event.preventDefault();setError('');setMessage('')
  const total=existingImages.length+files.length
  if(total<3||total>10){setError(t.needPhotos);return}
  if(!category||!categories.some(item=>item.name===category)){setError('Please select a valid category.');return}
  if(!size.trim()||(isBeltCategory(category)&&(!Number.isFinite(Number(size))||Number(size)<=0||Number(size)>300))){setError(isBeltCategory(category)?t.beltPlaceholder:t.selectSize);return}
  if(!colors.length){setColorError(t.noColors);setError(t.noColors);return}
  if(!Number.isFinite(Number(price))||Number(price)<=0){setError('Enter a valid price.');return}
  setBusy(true)
  const uploaded:string[]=[]
  try{
   for(const file of files){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Use JPG, PNG or WebP images up to 10 MB.')
   }
   const listingId=editing?.id||crypto.randomUUID()
   for(const file of files){
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
    const path=user.id+'/'+listingId+'/'+crypto.randomUUID()+'.'+ext
    const {error:uploadError}=await supabase.storage.from('marketplace-listings').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false})
    if(uploadError)throw uploadError
    uploaded.push(supabase.storage.from('marketplace-listings').getPublicUrl(path).data.publicUrl)
   }
   const payload={title:title.trim(),description:description.trim(),price:Number(price),category,brand:brand.trim(),size_label:isBeltCategory(category)?`${size.trim()} cm`:size.trim(),item_condition:condition,colors,images:[...existingImages,...uploaded]}
   if(editing){
    const {error:saveError}=await supabase.from('marketplace_listings').update({...payload,status:'pending'}).eq('id',editing.id).eq('seller_id',user.id)
    if(saveError)throw saveError
   }else{
    const {error:saveError}=await supabase.from('marketplace_listings').insert({id:listingId,seller_id:user.id,...payload,status:'pending'})
    if(saveError)throw saveError
   }
   await refresh();setMessage(t.success);reset()
  }catch(e){if(uploaded.length){const paths=uploaded.map(url=>{try{return new URL(url).pathname.split('/marketplace-listings/')[1]}catch{return ''}}).filter(Boolean);if(paths.length)await supabase.storage.from('marketplace-listings').remove(paths)}setError(e instanceof Error?e.message:t.error)}
  finally{setBusy(false)}
 }
 async function remove(item:Listing){if(!window.confirm(t.remove+'?'))return;setError('');const {error}=await supabase.from('marketplace_listings').delete().eq('id',item.id).eq('seller_id',user.id);if(error)setError(error.message);else await refresh()}
 async function markSold(item:Listing){setError('');const {error}=await supabase.rpc('mark_marketplace_listing_sold',{p_listing_id:item.id});if(error)setError(error.message);else await refresh()}
 const statusText=(status:string)=>t[statusKey[status]||'pending']
 return <section className="seller-panel">
  <div className="seller-panel-heading"><div><p className="eyebrow red">MARKETPLACE</p><h2>{t.title}</h2><p>{t.intro}</p></div><Package size={21}/></div>
  <div className="seller-panel-toolbar"><h3>{t.my}</h3><button type="button" onClick={()=>{reset();setShowForm(true)}}><Plus size={15}/>{t.new}</button></div>
  {message&&<div className="account-message"><CheckCircle2 size={16}/>{message}</div>}
  {error&&<div className="account-error">{error}</div>}
  {showForm&&<form className="seller-form" onSubmit={submit}>
   <div className="seller-form-grid">
    <label>{t.name}<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} required minLength={3}/></label>
    <label>{t.price}<input type="number" value={price} onChange={e=>setPrice(e.target.value)} min="0.01" step="0.01" required/></label>
    <label>{t.category}<select value={category} onChange={e=>{const next=e.target.value;setCategory(next);setSize('')}} disabled={categoriesLoading||categories.length===0} required><option value="" disabled>{categoriesLoading?'Loading…':'Select category'}</option>{categories.map(item=><option key={item.id} value={item.name}>{categoryLabel(item.name,language)}</option>)}</select></label>
    <label>{t.brand}<input value={brand} onChange={e=>setBrand(e.target.value)} maxLength={80}/></label>
    <label>{isBeltCategory(category)?t.beltSize:t.clothingSize}{isBeltCategory(category)?<div className="seller-belt-size"><input type="number" inputMode="numeric" min="1" max="300" step="1" value={size} onChange={e=>setSize(e.target.value)} placeholder={t.beltPlaceholder} required/><span>cm</span></div>:<select value={size} onChange={e=>setSize(e.target.value)} required><option value="" disabled>{t.selectSize}</option>{CLOTHING_SIZES.map(value=><option key={value} value={value}>{value}</option>)}{size&&!CLOTHING_SIZES.includes(size)&&<option value={size}>{size}</option>}</select>}</label>
    <label>{t.condition}<select value={condition} onChange={e=>setCondition(e.target.value)}><option value="new_with_tags">{t.conditionOptions[0]}</option><option value="new_without_tags">{t.conditionOptions[1]}</option><option value="excellent">{t.conditionOptions[2]}</option><option value="good">{t.conditionOptions[3]}</option><option value="defects">{t.conditionOptions[4]}</option></select></label>
   <div className="admin-color-section seller-color-section">
    <div className="admin-field-title">{t.colors} <span className="admin-help">{t.chooseColors}</span></div>
    <div className="admin-color-selected">{colors.length?colors.map(color=><span key={color.name} className="admin-color-chip"><i style={{background:color.hex}}/>{color.name}<button type="button" onClick={()=>setColors(items=>items.filter(item=>item.name!==color.name))} aria-label={`Remove ${color.name}`}>×</button></span>):<span className="admin-color-empty">{t.noColors}</span>}</div>
    <div className="admin-color-search"><input value={colorSearch} onChange={e=>setColorSearch(e.target.value)} placeholder={t.searchColors} aria-label={t.searchColors}/></div>
    <div className="admin-color-palette" aria-label={t.colors}>{COLOR_PALETTE.filter(color=>color.name.toLowerCase().includes(colorSearch.toLowerCase())).map(color=><button type="button" key={color.name} onClick={()=>setColors(items=>items.some(item=>item.name.toLowerCase()===color.name.toLowerCase())?items.filter(item=>item.name.toLowerCase()!==color.name.toLowerCase()):[...items,{...color}])} className={colors.some(item=>item.name.toLowerCase()===color.name.toLowerCase())?'selected':''}><i style={{background:color.hex}}/><span>{color.name}</span></button>)}</div>
    <div className="admin-custom-color"><input value={customColorName} onChange={e=>setCustomColorName(e.target.value)} placeholder={t.customColor} aria-label={t.customColor}/><label className="admin-color-picker"><input type="color" value={customColorHex} onChange={e=>setCustomColorHex(e.target.value)} aria-label="Custom color swatch"/><span style={{background:customColorHex}}/></label><input value={customColorHex} onChange={e=>setCustomColorHex(e.target.value)} placeholder="#888888" aria-label="Custom HEX color"/><button type="button" className="admin-ghost" onClick={()=>{const name=customColorName.trim();if(!name||!/^#[0-9a-fA-F]{6}$/.test(customColorHex)||colors.some(item=>item.name.toLowerCase()===name.toLowerCase())){setColorError('Enter a unique color name and a valid HEX value.');return}setColors(items=>[...items,{name,hex:customColorHex.toLowerCase()}]);setCustomColorName('');setCustomColorHex('#888888');setColorError('')}}><Plus size={14}/>{t.addColor}</button></div>
    {colorError&&<div className="admin-inline-error">{colorError}</div>}
   </div>
    <label className="seller-form-wide">{t.desc}<textarea value={description} onChange={e=>setDescription(e.target.value)} minLength={10} maxLength={3000} rows={4} required/></label>
   </div>
   <div className="seller-photo-field"><span>{t.photos}</span><label className="seller-photo-picker"><ImagePlus size={18}/><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,10-existingImages.length))}/></label><div className="seller-photo-grid">{existingImages.map((src,i)=><button type="button" key={src} onClick={()=>setExistingImages(items=>items.filter((_,n)=>n!==i))}><img src={src} alt=""/><span>×</span></button>)}{previews.map((src,i)=><button type="button" key={src} onClick={()=>setFiles(items=>items.filter((_,n)=>n!==i))}><img src={src} alt=""/><span>×</span></button>)}</div></div>
   <div className="seller-form-actions"><button className="account-primary" disabled={busy} type="submit">{busy?<LoaderCircle className="spin" size={16}/>:<CheckCircle2 size={16}/>} {busy?t.uploading:editing?t.save:editing?.status==='rejected'?t.resubmit:t.submit}</button><button className="account-secondary" type="button" disabled={busy} onClick={reset}>CANCEL</button></div>
  </form>}
  <div className="seller-list-filters" role="tablist" aria-label={t.my}><button type="button" className={listingFilter==='all'?'active':''} onClick={()=>setListingFilter('all')}>{t.all} <span>{listings.length}</span></button><button type="button" className={listingFilter==='active'?'active':''} onClick={()=>setListingFilter('active')}>{t.active} <span>{listings.filter(item=>item.status!=='sold').length}</span></button><button type="button" className={listingFilter==='sold'?'active':''} onClick={()=>setListingFilter('sold')}>{t.soldTab} <span>{listings.filter(item=>item.status==='sold').length}</span></button></div>
  {loading?<div className="account-state"><LoaderCircle className="spin" size={18}/>{t.loading}</div>:listings.filter(item=>listingFilter==='all'||(listingFilter==='sold'?item.status==='sold':item.status!=='sold')).length===0?<div className="seller-empty">{listingFilter==='sold'?t.empty:t.empty}</div>:<div className="seller-list">{listings.filter(item=>listingFilter==='all'||(listingFilter==='sold'?item.status==='sold':item.status!=='sold')).map(item=><article className="seller-listing" key={item.id}><img src={item.images?.[0]} alt=""/><div className="seller-listing-info"><strong>{item.title}</strong><span>€{Number(item.price).toFixed(2)}</span><small className={'seller-status '+item.status}>{statusText(item.status)}</small>{item.moderation_reason&&<p>{item.moderation_reason}</p>}</div><div className="seller-listing-actions">{['pending','rejected'].includes(item.status)&&<button type="button" onClick={()=>startEdit(item)}><RotateCcw size={14}/></button>}{item.status==='approved'&&<button type="button" onClick={()=>markSold(item)} title={t.markSold}><Tag size={14}/></button>}<button type="button" onClick={()=>remove(item)} title={t.remove}><Trash2 size={14}/></button></div></article>)}</div>}
 </section>
}
