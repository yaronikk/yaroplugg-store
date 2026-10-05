import React,{useEffect,useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {createClient, type User} from '@supabase/supabase-js'
import {Search,House,UserRound,X,SlidersHorizontal,Heart,ChevronDown,ArrowUpRight,Plus,Trash2,LogOut,Package,ImagePlus,Pencil,Check,Upload,LoaderCircle} from 'lucide-react'
import './index.css'
import {products as demoProducts} from './data'
import type {Category,Product} from './types'

type Screen='home'|'catalog'|'favorites'|'profile'
const cats:Category[]=['All','T-Shirts','Hoodies','Pants','Jackets']
const sizes=['S','M','L','XL']

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL as string|undefined
const supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined
const supabase=supabaseUrl&&supabaseKey?createClient(supabaseUrl,supabaseKey):null

function readStorage<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}

function dbProduct(row:any):Product{
 const category=(row.category?.name||'T-Shirts') as Exclude<Category,'All'>
 return {id:row.id,name:row.name,category,price:Number(row.price),description:row.description||'',composition:row.composition||'',sizes:row.sizes||[],colors:row.colors||[],images:row.images?.length?row.images:(row.image_url?[row.image_url]:[]),featured:Boolean(row.featured)}
}

async function fetchStoreProducts():Promise<Product[]>{
 if(!supabase)return demoProducts
 const {data,error}=await supabase.from('products').select('*, category:categories(name)').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false})
 if(error||!data)return demoProducts
 return data.length?data.map(dbProduct):demoProducts
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
 const [favorites,setFavorites]=useState<string[]>(()=>readStorage('yp-favorites',[]))
 const [products,setProducts]=useState<Product[]>(demoProducts)
 const colors=useMemo(()=>['All',...Array.from(new Set(products.flatMap(p=>p.colors.map(c=>c.name))))], [products])
 const filtered=useMemo(()=>products.filter(p=>{const text=p.name.toLowerCase().includes(query.toLowerCase())||p.description.toLowerCase().includes(query.toLowerCase());const size=filterSize==='All'||p.sizes.includes(filterSize);const color=filterColor==='All'||p.colors.some(c=>c.name===filterColor);return(cat==='All'||p.category===cat)&&text&&size&&color&&p.price<=maxPrice}),[products,cat,query,filterSize,filterColor,maxPrice])
 useEffect(()=>{localStorage.setItem('yp-favorites',JSON.stringify(favorites))},[favorites])
 useEffect(()=>{const tg=(window as any).Telegram?.WebApp;if(tg){tg.ready();tg.expand()}},[])
 useEffect(()=>{fetchStoreProducts().then(setProducts)},[])
 function notify(v:string){setToast(v);window.setTimeout(()=>setToast(''),1500)}
 function toggleFavorite(id:string){setFavorites(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id])}
 function openCategory(c:Category){setCat(c);setScreen('catalog');window.scrollTo({top:0,behavior:'smooth'})}
 return <div className="app-shell"><main className="store-shell safe-bottom">
  <header className="site-header"><button onClick={()=>setScreen('home')} className="brand-button" aria-label="YAROPLUGG home"><img src="/logo.png" alt="YAROPLUGG" className="brand-logo"/></button><div className="header-actions"><button onClick={()=>{setScreen('catalog');setTimeout(()=>document.getElementById('search')?.focus(),50)}} className="icon-button" aria-label="Search"><Search size={18}/></button></div></header>
  {screen==='home'&&<Home onCatalog={()=>setScreen('catalog')} onCategory={openCategory} onProduct={setSelected} favorites={favorites} onFavorite={toggleFavorite} products={products}/>} 
  {screen==='catalog'&&<Catalog query={query} setQuery={setQuery} cat={cat} setCat={setCat} products={filtered} onProduct={setSelected} onFilters={()=>setShowFilters(true)} favorites={favorites} onFavorite={toggleFavorite}/>} 
  {screen==='favorites'&&<Favorites products={products.filter(p=>favorites.includes(p.id))} onProduct={setSelected} favorites={favorites} onFavorite={toggleFavorite}/>} 
  {screen==='profile'&&<Profile favorites={favorites}/>} 
  <nav className="bottom-nav" aria-label="Main navigation"><Nav icon={<House size={17}/>} label="SHOP" active={screen==='home'} onClick={()=>setScreen('home')}/><Nav icon={<Search size={17}/>} label="CATEGORIES" active={screen==='catalog'} onClick={()=>setScreen('catalog')}/><Nav icon={<Heart size={17}/>} label="FAVORITES" active={screen==='favorites'} onClick={()=>setScreen('favorites')}/><Nav icon={<UserRound size={17}/>} label="PROFILE" active={screen==='profile'} onClick={()=>setScreen('profile')}/></nav>
  {selected&&<ProductModal product={selected} onClose={()=>setSelected(null)} onFavorite={()=>{toggleFavorite(selected.id);notify(favorites.includes(selected.id)?'Removed from favorites':'Added to favorites')}} favorite={favorites.includes(selected.id)}/>} {showFilters&&<Filters size={filterSize} color={filterColor} maxPrice={maxPrice} colors={colors} onClose={()=>setShowFilters(false)} onApply={(s,c,p)=>{setFilterSize(s);setFilterColor(c);setMaxPrice(p);setShowFilters(false)}}/>} {toast&&<div className="toast">{toast}</div>}
 </main></div>
}
function Nav({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void}){return <button onClick={onClick} className={`nav-item ${active?'is-active':''}`}><span className="nav-icon">{icon}</span><span>{label}</span></button>}
function Home({onCatalog,onCategory,onProduct,favorites,onFavorite,products}:{onCatalog:()=>void;onCategory:(c:Category)=>void;onProduct:(p:Product)=>void;favorites:string[];onFavorite:(id:string)=>void;products:Product[]}){return <div className="page-pad"><section className="hero-card"><div className="hero-top"><p>NEW COLLECTION / 01</p><span>YPG</span></div><h1>WEAR<br/>LESS.<br/><em>CHOOSE<br/>BETTER.</em></h1><button onClick={onCatalog} className="primary-dark">SHOP COLLECTION <ArrowUpRight size={16}/></button><div className="hero-ring"/></section><div className="category-strip">{cats.slice(1,4).map(c=><button key={c} onClick={()=>onCategory(c)}>{c.toUpperCase()}</button>)}</div><div className="section-head"><div><p>SELECTED</p><h2>NEW IN</h2></div><button onClick={onCatalog}>VIEW ALL <ArrowUpRight size={14}/></button></div><div className="product-grid">{products.filter(p=>p.featured).map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div></div>}
function Catalog({query,setQuery,cat,setCat,products,onProduct,onFilters,favorites,onFavorite}:{query:string;setQuery:(v:string)=>void;cat:Category;setCat:(v:Category)=>void;products:Product[];onProduct:(p:Product)=>void;onFilters:()=>void;favorites:string[];onFavorite:(id:string)=>void}){return <div className="page-pad"><div className="catalog-head"><div><p>COLLECTION</p><h1>SHOP ALL</h1></div><button onClick={onFilters} className="filter-button" aria-label="Filters"><SlidersHorizontal size={17}/></button></div><div className="search-box"><Search size={17}/><input id="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="SEARCH PRODUCTS"/></div><div className="category-strip catalog-tabs">{cats.map(c=><button key={c} onClick={()=>setCat(c)} className={cat===c?'active':''}>{c.toUpperCase()}</button>)}</div><div className="catalog-meta"><span>{products.length} PRODUCTS</span><span>€20 — €100</span></div><div className="product-grid">{products.map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>{products.length===0&&<div className="empty-state">NO PRODUCTS FOUND</div>}</div>}
function Favorites({products,onProduct,favorites,onFavorite}:{products:Product[];onProduct:(p:Product)=>void;favorites:string[];onFavorite:(id:string)=>void}){return <div className="page-pad page-top"><div className="catalog-head"><div><p>YOUR SELECTION</p><h1>FAVORITES</h1></div><span className="favorite-count">{products.length} SAVED</span></div>{products.length===0?<div className="empty-card favorites-empty"><Heart size={22}/><h2>YOUR FAVORITES ARE EMPTY</h2><p>Tap the heart on any product to save it here.</p></div>:<div className="product-grid">{products.map(p=><ProductCard key={p.id} p={p} onClick={()=>onProduct(p)} favorite={favorites.includes(p.id)} onFavorite={()=>onFavorite(p.id)}/>)}</div>}</div>}
function ProductCard({p,onClick,favorite,onFavorite}:{p:Product;onClick:()=>void;favorite:boolean;onFavorite:()=>void}){return <article className="product-card"><div className="product-media"><button onClick={onClick} className="media-button"><img src={p.images[0]} alt={p.name} loading="lazy" decoding="async"/></button><button onClick={e=>{e.stopPropagation();onFavorite()}} className="favorite-button" aria-label={favorite?'Remove from favorites':'Add to favorites'}><Heart size={15} fill={favorite?'currentColor':'none'} className={favorite?'favorite-on':''}/></button></div><button onClick={onClick} className="product-info"><div className="product-name">{p.name}</div><div className="product-price">€{p.price}</div></button></article>}
function ProductModal({product,onClose,onFavorite,favorite}:{product:Product;onClose:()=>void;onFavorite:()=>void;favorite:boolean}){const[color,setColor]=useState(product.colors[0]?.name||'');return <div className="modal-backdrop"><div className="sheet product-sheet"><div className="modal-media">{product.images[0]?<img src={product.images[0]} alt={product.name} loading="eager" decoding="async"/>:<div className="image-placeholder">NO IMAGE</div>}<button onClick={onClose} className="close-button" aria-label="Close"><X size={18}/></button></div><div className="sheet-content product-sheet-content"><div className="product-title-row"><div><div className="eyebrow red">{product.category}</div><h2>{product.name}</h2></div><div className="modal-price">€{product.price}</div></div><p className="description">{product.description}</p><div className="option-block"><div className="option-label">AVAILABLE SIZES</div><div className="option-row">{product.sizes.map(s=><span key={s} className="view-size">{s}</span>)}</div></div><div className="option-block"><div className="option-label">COLOR · {color.toUpperCase()}</div><div className="color-row">{product.colors.map(c=><button key={c.name} aria-label={c.name} onClick={()=>setColor(c.name)} style={{background:c.hex}} className={color===c.name?'color-selected':''}/>)}</div></div><div className="composition">COMPOSITION: {product.composition}</div><button onClick={onFavorite} className="primary-red favorite-product-button"><Heart size={15} fill={favorite?'currentColor':'none'}/>{favorite?'REMOVE FROM FAVORITES':'SAVE TO FAVORITES'}</button><div className="view-only-note">VIEW ONLY · PURCHASE COMING SOON</div></div></div></div>}
function Filters({size,color,maxPrice,colors,onClose,onApply}:{size:string;color:string;maxPrice:number;colors:string[];onClose:()=>void;onApply:(s:string,c:string,p:number)=>void}){const[s,setS]=useState(size),[c,setC]=useState(color),[p,setP]=useState(maxPrice);return <div className="modal-backdrop align-end"><div className="sheet filter-sheet"><div className="sheet-title-row"><h2>FILTERS</h2><button onClick={onClose} className="close-button small"><X size={18}/></button></div><div className="filter-group"><div className="option-label">SIZE</div><div className="option-row wrap">{['All',...sizes].map(x=><button key={x} onClick={()=>setS(x)} className={s===x?'selected':''}>{x}</button>)}</div></div><div className="filter-group"><div className="option-label">COLOR</div><div className="select-wrap"><select value={c} onChange={e=>setC(e.target.value)}>{colors.map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={18}/></div></div><div className="filter-group"><div className="price-line"><span className="option-label">MAXIMUM PRICE</span><span>€{p}</span></div><input type="range" min="20" max="100" value={p} onChange={e=>setP(Number(e.target.value))}/></div><button onClick={()=>onApply(s,c,p)} className="primary-red">APPLY FILTERS</button></div></div>}
function Profile({favorites}:{favorites:string[]}){return <div className="page-pad page-top"><p className="eyebrow red">YAROPLUGG</p><h1 className="page-title">PROFILE</h1><div className="profile-card"><img src="/logo.png" alt="YAROPLUGG"/><div className="field-label">STORE MODE</div><div className="profile-title">Preview only</div><p>Browse the collection, save your favorites and view product details. Online checkout is not available yet.</p></div><div className="support-card">{favorites.length} SAVED FAVORITES</div></div>}

// ---------------- ADMIN ----------------
type AdminProductForm={name:string;price:string;category:string;description:string;composition:string;sizes:string[];colors:string;stock:string;isActive:boolean;isNew:boolean;featured:boolean;sortOrder:string;imageUrl:string}
const emptyForm:AdminProductForm={name:'',price:'',category:'T-Shirts',description:'',composition:'',sizes:['S','M','L','XL'],colors:'Black:#0b0b0b',stock:'0',isActive:true,isNew:true,featured:false,sortOrder:'0',imageUrl:''}

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
 function startAdd(){setEditing(null);setForm({...emptyForm});setShowForm(true);setMessage('')}
 function startEdit(p:any){setEditing(p);setForm({name:p.name,price:String(p.price),category:p.category?.name||'T-Shirts',description:p.description||'',composition:p.composition||'',sizes:p.sizes||[],colors:(p.colors||[]).map((c:any)=>`${c.name}:${c.hex}`).join(', '),stock:String(p.stock??0),isActive:Boolean(p.is_active),isNew:Boolean(p.is_new),featured:Boolean(p.featured),sortOrder:String(p.sort_order??0),imageUrl:p.image_url||p.images?.[0]||''});setShowForm(true);setMessage('')}
 function parseColors(v:string){return v.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const [name,...hexParts]=x.split(':');return {name:name.trim(),hex:(hexParts.join(':').trim()||'#0b0b0b')}})}
 async function uploadImage(file:File){if(!supabase||!user)return;setUploading(true);setMessage('');const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';const path=`${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false});if(error){setMessage(error.message);setUploading(false);return}const {data}=supabase.storage.from('product-images').getPublicUrl(path);setForm(f=>({...f,imageUrl:data.publicUrl}));setUploading(false)}
 async function saveProduct(e:React.FormEvent){e.preventDefault();if(!supabase||!user)return;setSaving(true);setMessage('');const colors=parseColors(form.colors);const slugBase=form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||`product-${Date.now()}`;let slug=slugBase;if(!editing){let n=2;while(adminProducts.some(p=>p.slug===slug)){slug=`${slugBase}-${n++}`}}
  const category=categories.find(c=>c.name===form.category);const payload={name:form.name.trim(),slug,description:form.description.trim(),price:Number(form.price)||0,category_id:category?.id||null,sizes:form.sizes,colors,stock:Math.max(0,Number(form.stock)||0),image_url:form.imageUrl||null,images:form.imageUrl?[form.imageUrl]:[],is_active:form.isActive,is_new:form.isNew,featured:form.featured,sort_order:Number(form.sortOrder)||0,updated_at:new Date().toISOString()}
  const result=editing?await supabase.from('products').update(payload).eq('id',editing.id):await supabase.from('products').insert(payload)
  if(result.error){setMessage(result.error.message);setSaving(false);return}
  setSaving(false);setShowForm(false);setMessage(editing?'Product updated':'Product added');await loadAdminData()
 }
 async function deleteProduct(p:any){if(!supabase||!user)return;if(!window.confirm(`Delete ${p.name}?`))return;const {error}=await supabase.from('products').delete().eq('id',p.id);if(error){setMessage(error.message);return}setMessage('Product deleted');await loadAdminData()}
 async function importDemo(){
  if(!supabase||!user||adminProducts.length)return
  const rows=demoProducts.map((p,i)=>{const category=categories.find(c=>c.name===p.category);return {name:p.name,slug:`${p.id}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,description:p.description,composition:p.composition,price:p.price,category_id:category?.id||null,sizes:p.sizes,colors:p.colors,stock:10,image_url:p.images[0]||null,images:p.images,is_active:true,is_new:true,featured:Boolean(p.featured),sort_order:i}})
  const {error}=await supabase.from('products').insert(rows)
  if(error){setMessage(error.message);return}
  setMessage('Current catalog imported');await loadAdminData()
 }
 if(loading)return <AdminFrame><AdminLoading/></AdminFrame>
 if(!user)return <AdminLogin email={email} password={password} setEmail={setEmail} setPassword={setPassword} error={authError} onSubmit={login}/>
 return <AdminFrame><div className="admin-shell"><header className="admin-header"><div><div className="admin-kicker">YAROPLUGG</div><h1>ADMIN</h1></div><button className="admin-ghost" onClick={logout}><LogOut size={15}/> LOG OUT</button></header><section className="admin-stats"><div><span>PRODUCTS</span><b>{adminProducts.length}</b></div><div><span>ACTIVE</span><b>{adminProducts.filter(p=>p.is_active).length}</b></div><div><span>OUT OF STOCK</span><b>{adminProducts.filter(p=>(p.stock??0)<=0).length}</b></div></section><div className="admin-toolbar"><div><div className="admin-section-label">CATALOG</div><h2>PRODUCTS</h2></div><button className="admin-primary" onClick={startAdd}><Plus size={16}/> ADD PRODUCT</button></div>{message&&<div className="admin-message">{message}</div>}<div className="admin-product-list">{adminProducts.length===0?<div className="admin-empty"><Package size={22}/><b>NO PRODUCTS YET</b><span>Add your first product to the catalog.</span><div className="admin-empty-actions"><button className="admin-primary" onClick={startAdd}><Plus size={15}/> ADD PRODUCT</button><button className="admin-ghost" onClick={importDemo}><Check size={15}/> IMPORT CURRENT CATALOG</button></div></div>:adminProducts.map(p=><AdminProductRow key={p.id} p={p} onEdit={()=>startEdit(p)} onDelete={()=>deleteProduct(p)}/>)}</div>{showForm&&<AdminProductFormView form={form} setForm={setForm} categories={categories} editing={editing} saving={saving} uploading={uploading} onUpload={uploadImage} onClose={()=>setShowForm(false)} onSubmit={saveProduct}/>}</div></AdminFrame>
}
function AdminFrame({children}:{children:React.ReactNode}){return <div className="admin-app">{children}</div>}
function AdminLoading(){return <div className="admin-loading"><LoaderCircle size={26} className="spin"/><span>LOADING ADMIN</span></div>}
function AdminLogin({email,password,setEmail,setPassword,error,onSubmit}:{email:string;password:string;setEmail:(v:string)=>void;setPassword:(v:string)=>void;error:string;onSubmit:(e:React.FormEvent)=>void}){return <AdminFrame><div className="admin-login"><div className="admin-login-card"><img src="/logo.png" alt="YAROPLUGG"/><div className="admin-kicker">PRIVATE AREA</div><h1>ADMIN LOGIN</h1><p>Sign in with your YAROPLUGG admin account.</p><form onSubmit={onSubmit}><label>EMAIL<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>PASSWORD<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{error&&<div className="admin-error">{error}</div>}<button className="admin-primary" type="submit">SIGN IN</button></form></div></div></AdminFrame>}
function AdminProductRow({p,onEdit,onDelete}:{p:any;onEdit:()=>void;onDelete:()=>void}){const img=p.image_url||p.images?.[0];return <div className="admin-product-row">{img?<img src={img} alt=""/>:<div className="admin-image-empty"><ImagePlus size={18}/></div>}<div className="admin-product-main"><b>{p.name}</b><span>{p.category?.name||'Uncategorized'} · €{Number(p.price).toFixed(2)}</span><small>{p.stock??0} IN STOCK · {p.is_active?'ACTIVE':'HIDDEN'}</small></div><div className="admin-row-actions"><button onClick={onEdit} aria-label="Edit"><Pencil size={15}/></button><button onClick={onDelete} aria-label="Delete"><Trash2 size={15}/></button></div></div>}
function AdminProductFormView({form,setForm,categories,editing,saving,uploading,onUpload,onClose,onSubmit}:{form:AdminProductForm;setForm:React.Dispatch<React.SetStateAction<AdminProductForm>>;categories:any[];editing:any;saving:boolean;uploading:boolean;onUpload:(file:File)=>void;onClose:()=>void;onSubmit:(e:React.FormEvent)=>void}){const set=(key:keyof AdminProductForm,val:any)=>setForm(f=>({...f,[key]:val}));return <div className="admin-modal"><div className="admin-form-card"><div className="admin-form-head"><div><div className="admin-kicker">{editing?'EDIT PRODUCT':'NEW PRODUCT'}</div><h2>{editing?'EDIT PRODUCT':'ADD PRODUCT'}</h2></div><button onClick={onClose} className="admin-close"><X size={18}/></button></div><form onSubmit={onSubmit} className="admin-form"><label>PRODUCT NAME<input value={form.name} onChange={e=>set('name',e.target.value)} required placeholder="Heavy Basic Tee"/></label><div className="admin-form-grid"><label>PRICE (€)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)} required/></label><label>CATEGORY<select value={form.category} onChange={e=>set('category',e.target.value)}>{categories.map(c=><option key={c.id}>{c.name}</option>)}</select></label></div><label>DESCRIPTION<textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={3}/></label><label>COMPOSITION<input value={form.composition} onChange={e=>set('composition',e.target.value)} placeholder="100% cotton"/></label><div><div className="admin-field-title">SIZES</div><div className="admin-size-grid">{sizes.map(s=><button type="button" key={s} onClick={()=>set('sizes',form.sizes.includes(s)?form.sizes.filter(x=>x!==s):[...form.sizes,s])} className={form.sizes.includes(s)?'selected':''}>{s}</button>)}</div></div><label>COLORS <span className="admin-help">Name:Hex, separated by commas</span><input value={form.colors} onChange={e=>set('colors',e.target.value)} placeholder="Black:#0b0b0b, Cream:#e9e2d6"/></label><label>STOCK<input type="number" min="0" value={form.stock} onChange={e=>set('stock',e.target.value)} required/></label><div><div className="admin-field-title">PRODUCT PHOTO</div><div className="admin-upload"><div className="admin-upload-preview">{form.imageUrl?<img src={form.imageUrl} alt="Preview"/>:<ImagePlus size={24}/>}</div><div><input id="admin-photo" type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0])} hidden/><label htmlFor="admin-photo" className="admin-upload-button"><Upload size={15}/>{uploading?'UPLOADING…':'UPLOAD PHOTO'}</label><p>JPG, PNG or WEBP. The image is stored in Supabase Storage.</p></div></div></div><div className="admin-toggles"><label><input type="checkbox" checked={form.isActive} onChange={e=>set('isActive',e.target.checked)}/><span>ACTIVE</span></label><label><input type="checkbox" checked={form.isNew} onChange={e=>set('isNew',e.target.checked)}/><span>NEW IN</span></label><label><input type="checkbox" checked={form.featured} onChange={e=>set('featured',e.target.checked)}/><span>FEATURED</span></label></div><div className="admin-form-actions"><button type="button" className="admin-ghost" onClick={onClose}>CANCEL</button><button type="submit" className="admin-primary" disabled={saving||uploading}>{saving?<><LoaderCircle size={15} className="spin"/> SAVING…</>:<><Check size={15}/> SAVE PRODUCT</>}</button></div></form></div></div>}

const root=document.getElementById('root')!
createRoot(root).render(window.location.pathname.startsWith('/admin')?<AdminApp/>:<App/>)
