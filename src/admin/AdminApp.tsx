import React,{useEffect,useState} from 'react'
import type {User} from '@supabase/supabase-js'
import {LogOut,Plus,Package} from 'lucide-react'
import {supabase} from '../lib/supabase'
import {normalizeColors,isBeltCategory} from '../lib/format'
import {AdminFrame} from './AdminFrame'
import {AdminLoading} from './AdminLoading'
import {AdminLogin} from './AdminLogin'
import {AdminProductRow} from './AdminProductRow'
import {AdminProductFormView} from './AdminProductForm'
import {AdminOrders} from './AdminOrders'
import {AdminReviews,type AdminReview} from './AdminReviews'
import {emptyForm,MAX_PRODUCT_IMAGES,MAX_IMAGE_SIZE,ALLOWED_IMAGE_TYPES,type AdminImage,type AdminColor,type AdminProductForm} from './model'
import {createWebpVariants} from './compressImage'
export function AdminApp(){
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
 const [activeTab,setActiveTab]=useState<'products'|'orders'|'reviews'>(()=>{const tab=new URLSearchParams(window.location.search).get('tab');return tab==='orders'||tab==='reviews'?tab:'products'})
 const [orders,setOrders]=useState<any[]>([])
 const [ordersLoading,setOrdersLoading]=useState(false)
 const [ordersError,setOrdersError]=useState('')
 const [reviews,setReviews]=useState<AdminReview[]>([])
 const [reviewsLoading,setReviewsLoading]=useState(false)
 const [reviewsError,setReviewsError]=useState('')

 useEffect(()=>{document.title='Admin | YAROPLUGG';let meta=document.querySelector('meta[name="robots"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','robots');document.head.appendChild(meta)}meta.setAttribute('content','noindex,nofollow');return()=>{meta?.remove()}},[])
 useEffect(()=>{
  if(!supabase){setLoading(false);return}
  supabase.auth.getSession().then(({data})=>{setUser(data.session?.user??null);setLoading(false)})
  const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null))
  return ()=>listener.subscription.unsubscribe()
 },[])
 useEffect(()=>{if(user)loadAdminData()},[user])
 useEffect(()=>{if(user&&activeTab==='orders')void loadOrders()},[user,activeTab])
 useEffect(()=>{if(user&&activeTab==='reviews')void loadReviews()},[user,activeTab])

 async function loadAdminData(){
  if(!supabase)return
  const [{data:ps,error:pe},{data:cs,error:ce}]=await Promise.all([
   supabase.from('products').select('*, category:categories(name,slug)').order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
   supabase.from('categories').select('*').order('sort_order',{ascending:true})
  ])
  if(pe||ce){setMessage(pe?.message||ce?.message||'Could not load admin data');return}
  setAdminProducts(ps||[]);setCategories(cs||[])
 }
 async function loadOrders(){
  if(!supabase)return
  setOrdersLoading(true);setOrdersError('')
  try{
   const {data,error}=await supabase.from('store_orders').select('id,order_number,customer_name,phone,telegram_user_id,telegram_username,contact_type,contact_value,delivery_method,delivery_city,delivery_address,comment,manager_note,total_cents,status,payment_status,created_at,items:store_order_items(product_name,quantity,size,color,length),history:store_order_status_history(old_status,new_status,old_payment_status,new_payment_status,changed_at)').order('created_at',{ascending:false}).limit(100)
   if(error)throw error
   setOrders(data||[])
  }catch{
   setOrdersError('Could not load orders. Apply both admin order migrations and confirm your admin app_metadata.role is admin.')
   setOrders([])
  }finally{setOrdersLoading(false)}
 }
 async function updateOrder(id:string,status:string|null,paymentStatus:string|null,managerNote?:string){
  if(!supabase)return
  const {error}=await supabase.rpc('admin_update_store_order',{p_order_id:id,p_status:status,p_payment_status:paymentStatus,p_manager_note:managerNote??null})
  if(error){setOrdersError(error.message||'Could not update order.');return}
  await loadOrders()
 }
 async function loadReviews(){if(!supabase)return;setReviewsLoading(true);setReviewsError('');const {data,error}=await supabase.from('reviews').select('id,customer_name,body,rating,language,is_published,created_at').order('created_at',{ascending:false});if(error){setReviewsError(error.message);setReviews([])}else setReviews(data||[]);setReviewsLoading(false)}
 async function createReview(name:string,body:string,rating:number,language:string){if(!supabase)return;const {error}=await supabase.from('reviews').insert({customer_name:name.trim(),body:body.trim(),rating,language,is_published:false});if(error){setReviewsError(error.message);return}await loadReviews()}
 async function toggleReview(review:AdminReview){if(!supabase)return;const {error}=await supabase.from('reviews').update({is_published:!review.is_published}).eq('id',review.id);if(error){setReviewsError(error.message);return}await loadReviews()}
 async function deleteReview(review:AdminReview){if(!supabase||!window.confirm(`Delete review by ${review.customer_name}?`))return;const {error}=await supabase.from('reviews').delete().eq('id',review.id);if(error){setReviewsError(error.message);return}await loadReviews()}
 async function login(e:React.FormEvent){e.preventDefault();setAuthError('');if(!supabase){setAuthError('Supabase is not configured in this deployment.');return}const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setAuthError(error.message)}
 async function logout(){await supabase?.auth.signOut()}
 function startAdd(){setEditing(null);setForm({...emptyForm,category:categories[0]?.name||'',colors:emptyForm.colors.map(c=>({...c})),sizes:[...emptyForm.sizes],lengths:[],images:[]});setNewUploadedUrls([]);setRemovedExistingUrls([]);setShowForm(true);setMessage('')}
 function startEdit(p:any){
  const colors=normalizeColors(p.colors)
  const urls=Array.isArray(p.images)&&p.images.length?p.images:(p.image_url?[p.image_url]:[])
  const thumbs=Array.isArray(p.thumbnail_urls)?p.thumbnail_urls:[]
  setEditing(p)
  setForm({name:p.name,brand:p.brand||'',price:String(p.price),category:p.category?.name||'',description:p.description||'',composition:p.composition||'',sizes:p.sizes||[],sizeLabel:p.size_label||'',measurements:p.measurements||'',defects:p.defects||'',condition:p.condition||'good',resaleStatus:p.resale_status||'available',lengths:Array.isArray(p.lengths)?p.lengths:[],colors,stock:String(p.stock??0),isActive:Boolean(p.is_active),isNew:Boolean(p.is_new),featured:Boolean(p.featured),sortOrder:String(p.sort_order??0),images:urls.map((url:string,index:number)=>({url,thumbnailUrl:thumbs[index]||'',existing:true}))})
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
   try{const {full,thumbnail}=await createWebpVariants(file);const stem=crypto.randomUUID();const fullPath=`${stem}.webp`,thumbPath=`${stem}.thumb.webp`;const storage=supabase.storage.from('product-images');const [fullResult,thumbResult]=await Promise.all([storage.upload(fullPath,full,{contentType:'image/webp',upsert:false}),storage.upload(thumbPath,thumbnail,{contentType:'image/webp',upsert:false})]);if(fullResult.error||thumbResult.error){await storage.remove([fullPath,thumbPath]);setMessage(fullResult.error?.message||thumbResult.error?.message||'Image upload failed');continue}const fullUrl=storage.getPublicUrl(fullPath).data.publicUrl,thumbUrl=storage.getPublicUrl(thumbPath).data.publicUrl;added.push({url:fullUrl,thumbnailUrl:thumbUrl,existing:false});addedUrls.push(fullUrl,thumbUrl)}catch(error){setMessage(error instanceof Error?error.message:'Image processing failed.')}}
  if(added.length){setForm(f=>({...f,images:[...f.images,...added]}));setNewUploadedUrls(v=>[...v,...addedUrls])}
  setUploading(false)
 }
 function removeImage(index:number){
  const image=form.images[index]
  if(!image)return
  setForm(f=>({...f,images:f.images.filter((_,i)=>i!==index)}))
  if(image.existing){const urls=[image.url,image.thumbnailUrl||''].filter(Boolean);setRemovedExistingUrls(v=>[...new Set([...v,...urls])])}
  else{const urls=[image.url,image.thumbnailUrl||''].filter(Boolean);setNewUploadedUrls(v=>v.filter(url=>!urls.includes(url)));void removeStorageUrls(urls)}
 }
 function moveImage(index:number,direction:-1|1){
  setForm(f=>{const next=[...f.images];const target=index+direction;if(target<0||target>=next.length)return f;[next[index],next[target]]=[next[target],next[index]];return {...f,images:next}})
 }
 function makeMain(index:number){setForm(f=>{if(index===0)return f;const next=[...f.images];const [item]=next.splice(index,1);next.unshift(item);return {...f,images:next}})}
 function handleDrop(e:React.DragEvent<HTMLDivElement>){e.preventDefault();void uploadFiles(Array.from(e.dataTransfer.files))}
 async function saveProduct(e:React.FormEvent){
  e.preventDefault();if(!supabase||!user)return
  if(!form.name.trim()){setMessage('Product name is required.');return}
  if(!categories.some(c=>c.name===form.category)){setMessage('Choose a category from the categories table.');return}
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
  const thumbnailUrls=form.images.map(i=>i.thumbnailUrl||'')
  const stockValue=Number(form.stock)
  if(!Number.isInteger(stockValue)||stockValue<0){setSaving(false);setMessage('Stock must be a whole number 0 or greater.');return}
  const payload={name:form.name.trim(),slug,brand:form.brand.trim(),description:form.description.trim(),composition:form.composition.trim(),price:Number(form.price)||0,category_id:category?.id||null,sizes:isBeltCategory(form.category)?[]:form.sizes,size_label:form.sizeLabel.trim(),measurements:form.measurements.trim(),condition:form.condition,defects:form.defects.trim(),resale_status:form.resaleStatus,lengths:isBeltCategory(form.category)?form.lengths:[],colors:form.colors,stock:form.resaleStatus==='sold'?0:stockValue,image_url:imageUrls[0]||null,images:imageUrls,thumbnail_urls:thumbnailUrls,is_active:form.isActive,is_new:form.isNew,featured:form.featured,sort_order:Number(form.sortOrder)||0,updated_at:new Date().toISOString()}
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
 async function setResaleStatus(p:any,status:'available'|'reserved'|'sold'){
  if(!supabase||!user)return
  const values:any={resale_status:status,updated_at:new Date().toISOString()}
  if(status==='sold')values.stock=0
  const {error}=await supabase.from('products').update(values).eq('id',p.id)
  if(error){setMessage(`Could not update status: ${error.message}`);return}
  setMessage(`${p.name} marked ${status}.`);await loadAdminData()
 }
 async function duplicateProduct(p:any){
  if(!supabase||!user)return
  const base=`${String(p.slug||p.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'product'}-copy`
  let slug=`${base}-${Date.now().toString().slice(-5)}`
  const copy={...p,id:undefined,created_at:undefined,updated_at:new Date().toISOString(),slug,name:`${p.name} (copy)`,stock:0,resale_status:'available',is_active:false}
  delete (copy as any).category
  const {error}=await supabase.from('products').insert(copy)
  if(error){setMessage(`Could not duplicate product: ${error.message}`);return}
  setMessage(`Draft copy created: ${slug}.`);await loadAdminData()
 }
 async function deleteProduct(p:any){if(!supabase||!user)return;if(!window.confirm(`Delete ${p.name}?`))return;const urls=[...(Array.isArray(p.images)&&p.images.length?p.images:(p.image_url?[p.image_url]:[])),...(Array.isArray(p.thumbnail_urls)?p.thumbnail_urls:[])];const {error}=await supabase.from('products').delete().eq('id',p.id);if(error){setMessage(error.message);return}if(urls.length)await removeStorageUrls(urls);setMessage('Product deleted');await loadAdminData()}
 if(loading)return <AdminFrame><AdminLoading/></AdminFrame>
 if(!user)return <AdminLogin email={email} password={password} setEmail={setEmail} setPassword={setPassword} error={authError} onSubmit={login}/>
 return <AdminFrame><div className="admin-shell"><header className="admin-header"><div><div className="admin-kicker">YAROPLUGG</div><h1>ADMIN</h1></div><button className="admin-ghost" onClick={logout}><LogOut size={15}/> LOG OUT</button></header><section className="admin-stats"><div><span>PRODUCTS</span><b>{adminProducts.length}</b></div><div><span>ACTIVE</span><b>{adminProducts.filter(p=>p.is_active).length}</b></div><div><span>OUT OF STOCK</span><b>{adminProducts.filter(p=>(p.stock??0)<=0).length}</b></div></section><div className="admin-tabs" role="tablist"><button role="tab" aria-selected={activeTab==='products'} className={activeTab==='products'?'active':''} onClick={()=>setActiveTab('products')}>PRODUCTS</button><button role="tab" aria-selected={activeTab==='orders'} className={activeTab==='orders'?'active':''} onClick={()=>setActiveTab('orders')}>ORDERS</button><button role="tab" aria-selected={activeTab==='reviews'} className={activeTab==='reviews'?'active':''} onClick={()=>setActiveTab('reviews')}>REVIEWS</button></div>{activeTab==='orders'?<AdminOrders orders={orders} loading={ordersLoading} error={ordersError} onRefresh={()=>void loadOrders()} onUpdate={updateOrder}/>:activeTab==='reviews'?<AdminReviews reviews={reviews} loading={reviewsLoading} error={reviewsError} onRefresh={()=>void loadReviews()} onCreate={createReview} onToggle={toggleReview} onDelete={deleteReview}/>:<><div className="admin-toolbar"><div><div className="admin-section-label">CATALOG</div><h2>PRODUCTS</h2></div><button className="admin-primary" onClick={startAdd}><Plus size={16}/> ADD PRODUCT</button></div>{message&&<div className="admin-message">{message}</div>}<div className="admin-product-list">{adminProducts.length===0?<div className="admin-empty"><Package size={22}/><b>NO PRODUCTS YET</b><span>Add your first product to the catalog.</span><div className="admin-empty-actions"><button className="admin-primary" onClick={startAdd}><Plus size={15}/> ADD PRODUCT</button></div></div>:adminProducts.map(p=><AdminProductRow key={p.id} p={p} onEdit={()=>startEdit(p)} onDelete={()=>deleteProduct(p)} onStockChange={(next)=>updateStock(p,next)} onSetResaleStatus={(status)=>void setResaleStatus(p,status)} onDuplicate={()=>void duplicateProduct(p)} stockSaving={stockSavingId===p.id}/>)}</div>{showForm&&<AdminProductFormView form={form} setForm={setForm} categories={categories} editing={editing} saving={saving} uploading={uploading} onUpload={uploadFiles} onRemoveImage={removeImage} onMoveImage={moveImage} onMakeMain={makeMain} onDrop={handleDrop} onToggleColor={toggleColor} onRemoveColor={removeColor} onAddCustomColor={addCustomColor} onCancel={cancelForm} onClose={cancelForm} onSubmit={saveProduct}/>}</>}</div></AdminFrame>
}
