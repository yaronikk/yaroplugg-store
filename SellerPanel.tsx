import React, { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { CheckCircle2, ImagePlus, LoaderCircle, Plus, Trash2, Package, RotateCcw, Tag } from 'lucide-react'

type Props = { supabase: any; user: User; language: 'en'|'ru'|'et' }
type Listing = { id:string; title:string; description:string; price:number; category:string; brand:string; size_label:string; item_condition:string; defects:string; images:string[]; status:string; moderation_reason:string|null; created_at:string }
const words = {
 en:{title:'SELLER PANEL',intro:'Create listings and manage your items.',new:'NEW LISTING',my:'MY LISTINGS',name:'TITLE',desc:'DESCRIPTION',price:'PRICE · EUR',category:'CATEGORY',brand:'BRAND',size:'SIZE',condition:'CONDITION',defects:'DEFECTS (OPTIONAL)',photos:'PHOTOS · 3–10',submit:'SUBMIT FOR REVIEW',save:'SAVE CHANGES',loading:'LOADING…',empty:'No listings yet.',pending:'UNDER REVIEW',approved:'PUBLISHED',rejected:'CHANGES REQUIRED',sold:'SOLD',remove:'DELETE',markSold:'MARK AS SOLD',resubmit:'RESUBMIT',uploading:'UPLOADING PHOTOS…',success:'Listing sent for moderation.',needPhotos:'Please add 3–10 photos.',conditionOptions:['New with tags','Excellent','Good','Has defects'],categories:['Clothing','Shoes','Accessories'],error:'Could not save listing.'},
 ru:{title:'ПАНЕЛЬ ПРОДАВЦА',intro:'Создавай объявления и управляй своими вещами.',new:'НОВОЕ ОБЪЯВЛЕНИЕ',my:'МОИ ОБЪЯВЛЕНИЯ',name:'НАЗВАНИЕ',desc:'ОПИСАНИЕ',price:'ЦЕНА · EUR',category:'КАТЕГОРИЯ',brand:'БРЕНД',size:'РАЗМЕР',condition:'СОСТОЯНИЕ',defects:'ДЕФЕКТЫ (НЕОБЯЗАТЕЛЬНО)',photos:'ФОТОГРАФИИ · 3–10',submit:'ОТПРАВИТЬ НА ПРОВЕРКУ',save:'СОХРАНИТЬ ИЗМЕНЕНИЯ',loading:'ЗАГРУЗКА…',empty:'Объявлений пока нет.',pending:'НА ПРОВЕРКЕ',approved:'ОПУБЛИКОВАНО',rejected:'НУЖНЫ ИЗМЕНЕНИЯ',sold:'ПРОДАНО',remove:'УДАЛИТЬ',markSold:'ОТМЕТИТЬ ПРОДАННЫМ',resubmit:'ОТПРАВИТЬ ПОВТОРНО',uploading:'ЗАГРУЖАЕМ ФОТО…',success:'Объявление отправлено на модерацию.',needPhotos:'Добавь от 3 до 10 фотографий.',conditionOptions:['Новое с бирками','Отличное','Хорошее','Есть дефекты'],categories:['Одежда','Обувь','Аксессуары'],error:'Не удалось сохранить объявление.'},
 et:{title:'MÜÜJA PANEEL',intro:'Loo kuulutusi ja halda oma tooteid.',new:'UUS KUULUTUS',my:'MINU KUULUTUSED',name:'PEALKIRI',desc:'KIRJELDUS',price:'HIND · EUR',category:'KATEGOORIA',brand:'BRÄND',size:'SUURUS',condition:'SEISUKORD',defects:'DEFEKTID (VALIKULINE)',photos:'FOTOD · 3–10',submit:'SAADA KONTROLLI',save:'SALVESTA MUUDATUSED',loading:'LAADIMINE…',empty:'Kuulutusi veel pole.',pending:'KONTROLLIMISEL',approved:'AVALDATUD',rejected:'VAJAB MUUDATUSI',sold:'MÜÜDUD',remove:'KUSTUTA',markSold:'MÄRGI MÜÜDuks',resubmit:'SAADA UUESTI',uploading:'FOTOSID LAADITAKSE…',success:'Kuulutus saadeti modereerimisele.',needPhotos:'Lisa 3–10 fotot.',conditionOptions:['Uus siltidega','Suurepärane','Hea','Defektidega'],categories:['Riided','Jalanõud','Aksessuaarid'],error:'Kuulutuse salvestamine ebaõnnestus.'}
}
const statusKey:Record<string,'pending'|'approved'|'rejected'|'sold'>={pending:'pending',approved:'approved',rejected:'rejected',sold:'sold'}
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
 const [category,setCategory]=useState('clothing')
 const [brand,setBrand]=useState('')
 const [size,setSize]=useState('')
 const [condition,setCondition]=useState('good')
 const [defects,setDefects]=useState('')
 const [files,setFiles]=useState<File[]>([])
 const [existingImages,setExistingImages]=useState<string[]>([])
 const [showForm,setShowForm]=useState(false)
 const previews=useMemo(()=>files.map(file=>URL.createObjectURL(file)),[files])
 useEffect(()=>()=>previews.forEach(URL.revokeObjectURL),[previews])
 async function refresh(){
  const {data,error}=await supabase.from('marketplace_listings').select('*').eq('seller_id',user.id).order('created_at',{ascending:false})
  if(error)throw error
  setListings((data||[]) as Listing[])
 }
 useEffect(()=>{let active=true;(async()=>{try{await refresh()}catch(e){if(active)setError(e instanceof Error?e.message:t.error)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[user.id])
 function reset(){setEditing(null);setTitle('');setDescription('');setPrice('');setCategory('clothing');setBrand('');setSize('');setCondition('good');setDefects('');setFiles([]);setExistingImages([]);setShowForm(false)}
 function startEdit(item:Listing){setEditing(item);setTitle(item.title);setDescription(item.description);setPrice(String(item.price));setCategory(item.category);setBrand(item.brand||'');setSize(item.size_label||'');setCondition(item.item_condition);setDefects(item.defects||'');setExistingImages(item.images||[]);setFiles([]);setShowForm(true)}
 async function submit(event:React.FormEvent){
  event.preventDefault();setError('');setMessage('')
  const total=existingImages.length+files.length
  if(total<3||total>10){setError(t.needPhotos);return}
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
   const payload={title:title.trim(),description:description.trim(),price:Number(price),category,brand:brand.trim(),size_label:size.trim(),item_condition:condition,defects:defects.trim(),images:[...existingImages,...uploaded]}
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
    <label>{t.category}<select value={category} onChange={e=>setCategory(e.target.value)}>{t.categories.map((x,i)=><option key={x} value={['clothing','shoes','accessories'][i]}>{x}</option>)}</select></label>
    <label>{t.brand}<input value={brand} onChange={e=>setBrand(e.target.value)} maxLength={80}/></label>
    <label>{t.size}<input value={size} onChange={e=>setSize(e.target.value)} maxLength={40}/></label>
    <label>{t.condition}<select value={condition} onChange={e=>setCondition(e.target.value)}><option value="new_with_tags">{t.conditionOptions[0]}</option><option value="excellent">{t.conditionOptions[1]}</option><option value="good">{t.conditionOptions[2]}</option><option value="defects">{t.conditionOptions[3]}</option></select></label>
    <label className="seller-form-wide">{t.desc}<textarea value={description} onChange={e=>setDescription(e.target.value)} minLength={10} maxLength={3000} rows={4} required/></label>
    <label className="seller-form-wide">{t.defects}<textarea value={defects} onChange={e=>setDefects(e.target.value)} maxLength={1000} rows={2}/></label>
   </div>
   <div className="seller-photo-field"><span>{t.photos}</span><label className="seller-photo-picker"><ImagePlus size={18}/><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,10-existingImages.length))}/></label><div className="seller-photo-grid">{existingImages.map((src,i)=><button type="button" key={src} onClick={()=>setExistingImages(items=>items.filter((_,n)=>n!==i))}><img src={src} alt=""/><span>×</span></button>)}{previews.map((src,i)=><button type="button" key={src} onClick={()=>setFiles(items=>items.filter((_,n)=>n!==i))}><img src={src} alt=""/><span>×</span></button>)}</div></div>
   <div className="seller-form-actions"><button className="account-primary" disabled={busy} type="submit">{busy?<LoaderCircle className="spin" size={16}/>:<CheckCircle2 size={16}/>} {busy?t.uploading:editing?t.save:editing?.status==='rejected'?t.resubmit:t.submit}</button><button className="account-secondary" type="button" disabled={busy} onClick={reset}>CANCEL</button></div>
  </form>}
  {loading?<div className="account-state"><LoaderCircle className="spin" size={18}/>{t.loading}</div>:listings.length===0?<div className="seller-empty">{t.empty}</div>:<div className="seller-list">{listings.map(item=><article className="seller-listing" key={item.id}><img src={item.images?.[0]} alt=""/><div className="seller-listing-info"><strong>{item.title}</strong><span>€{Number(item.price).toFixed(2)}</span><small className={'seller-status '+item.status}>{statusText(item.status)}</small>{item.moderation_reason&&<p>{item.moderation_reason}</p>}</div><div className="seller-listing-actions">{['pending','rejected'].includes(item.status)&&<button type="button" onClick={()=>startEdit(item)}><RotateCcw size={14}/></button>}{item.status==='approved'&&<button type="button" onClick={()=>markSold(item)} title={t.markSold}><Tag size={14}/></button>}<button type="button" onClick={()=>remove(item)} title={t.remove}><Trash2 size={14}/></button></div></article>)}</div>}
 </section>
}
