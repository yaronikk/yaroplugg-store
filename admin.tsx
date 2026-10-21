import React,{useEffect,useMemo,useRef,useState} from 'react'
import {createClient, type User} from '@supabase/supabase-js'
import {Search,House,UserRound,Info as InfoIcon,X,SlidersHorizontal,Heart,ChevronDown,ArrowUpRight,ChevronLeft,ChevronRight,Plus,Minus,Trash2,LogOut,Package,ImagePlus,Pencil,Check,Upload,LoaderCircle,ShoppingBag,ClipboardList,CheckCircle2,RotateCcw,Tag} from 'lucide-react'
import './index.css'
import type {Category,Product} from './types'

type OrderStatus='new'|'contacted'|'reserved'|'shipped'|'completed'|'cancelled'
type PaymentStatus='pending_payment'|'paid'|'refunded'
type AdminSection='products'|'sold'|'orders'

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL as string|undefined
const supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined
const supabase=supabaseUrl&&supabaseKey?createClient(supabaseUrl,supabaseKey):null

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

