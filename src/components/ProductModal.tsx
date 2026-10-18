import React,{useEffect,useRef,useState} from 'react'
import {X,ZoomIn,ZoomOut,ChevronLeft,ChevronRight,ShoppingBag,Heart,Share2} from 'lucide-react'
import type {Product} from '../types'
import type {CartLine} from './shared'
import {isBeltCategory} from '../lib/format'
import {useI18n} from '../i18n'
import {SHOP} from '../config'
export function ProductModal({product,onClose,onAdd,onFavorite,favorite,relatedProducts,onSelectRelated}:{product:Product;onClose:()=>void;onAdd:(line:CartLine)=>void;onFavorite:()=>void;favorite:boolean;relatedProducts:Product[];onSelectRelated:(product:Product)=>void}){
 const {t}=useI18n()
 const[color,setColor]=useState(product.colors[0]?.name||'');
 const[size,setSize]=useState(product.sizes[0]||product.sizeLabel||'');
 const[length,setLength]=useState(((product as Product & {lengths?:string[]}).lengths||[])[0]||'');
 const[imageIndex,setImageIndex]=useState(0);
 const[viewerOpen,setViewerOpen]=useState(false);
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){if(viewerOpen)setViewerOpen(false);else onClose()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[viewerOpen,onClose]);
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
 return <><div className="modal-backdrop"><div className="sheet product-sheet" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title"><div className="modal-media"><div ref={galleryRef} onScroll={handleGalleryScroll} className="product-swipe-gallery" aria-label="Product photos" role="region">{images.length?images.map((url,i)=><button type="button" className="product-swipe-slide" key={`${url}-${i}`} onClick={()=>openViewer(i)} aria-label={`Open ${product.name} photo ${i+1} in full screen`}><img src={url} alt={`${product.name} photo ${i+1}`} loading={i===0?'eager':'lazy'} decoding="async"/></button>):<div className="image-placeholder">NO IMAGE</div>}</div><button onClick={onClose} className="close-button" aria-label="Close"><X size={18}/></button>{images.length>1&&<div className="gallery-dots" aria-label={`Photo ${imageIndex+1} of ${images.length}`}>{images.map((_,i)=><span key={i} className={i===imageIndex?'active':''}/>)}</div>}</div><div className="sheet-content product-sheet-content"><div className="product-title-row"><div><div className="eyebrow red">{product.category}</div><h2 id="product-dialog-title">{product.name}</h2></div><div className="modal-price">€{product.price}</div></div><div className={`stock-note ${product.resaleStatus!=='available'?'is-out':''}`}>{product.resaleStatus==='sold'?t('sold'):product.resaleStatus==='reserved'?t('reserved'):t('available')}</div><div className="product-options-grid">{isBeltCategory(product.category)?<div className="option-block"><div className="option-label">{t('beltLength')}</div><div className="option-row">{((product as Product & {lengths?:string[]}).lengths||[]).map(l=><button type="button" key={l} onClick={()=>setLength(l)} className={`view-size ${length===l?'selected':''}`}>{l} CM</button>)}</div></div>:<div className="option-block"><div className="option-label">{t('availableSizes')}</div><div className="option-row">{product.sizes.length?product.sizes.map(s=><button type="button" key={s} onClick={()=>setSize(s)} className={`view-size ${size===s?'selected':''}`}>{s}</button>):product.sizeLabel?<button type="button" className="view-size selected">{product.sizeLabel}</button>:<span className="option-label">{t('oneSize')}</span>}</div></div>}<div className="option-block"><div className="option-label">{t('color')} · {color.toUpperCase()}</div><div className="color-row">{product.colors.map(c=><button key={c.name} aria-label={c.name} onClick={()=>setColor(c.name)} style={{background:c.hex}} className={color===c.name?'color-selected':''}/>)}</div></div></div><div className="description">{product.description}</div><div className="composition">{t('composition')}: {product.composition}</div><section className="resale-details"><h3>{t('condition')}</h3><p><b>{t('conditionLabel')}</b> · {({new_with_tags:t('conditionNew'),excellent:t('conditionExcellent'),good:t('conditionGood'),defects:t('conditionDefects')} as Record<string,string>)[product.condition]||product.condition}</p>{product.sizeLabel&&<p><b>{t('sizeLabel')}</b> · {product.sizeLabel}</p>}{product.measurements&&<p><b>{t('measurements')}</b><br/>{product.measurements}</p>}{product.defects&&<p><b>{t('defects')}</b><br/>{product.defects}</p>}</section><section className="how-to-order"><h3>{t('howToOrder')}</h3><p>{t('howOrderDesc')}</p></section>{relatedProducts.length>0&&<section className="similar-products"><h3>{t('similar')}</h3><div>{relatedProducts.map(item=><button key={item.id} onClick={()=>onSelectRelated(item)}><img src={item.thumbnailUrls?.[0]||item.images[0]} alt=""/><span>{item.brand?`${item.brand} · `:''}{item.name}</span><b>€{item.price}</b></button>)}</div></section>}<button type="button" className="product-share-button" onClick={()=>{const mini=SHOP.botUsername&&SHOP.miniAppShortName?`https://t.me/${SHOP.botUsername}/${SHOP.miniAppShortName}?startapp=p_${encodeURIComponent(product.slug)}`:`${window.location.origin}/p/${encodeURIComponent(product.slug)}`;if(navigator.share)void navigator.share({title:product.name,url:mini}).catch(()=>{});else void navigator.clipboard?.writeText(mini)}}><Share2 size={15}/>{t('share')}</button><button type="button" className="primary-dark add-to-bag" disabled={product.resaleStatus!=='available'||((Number((product as Product & {stock?:number}).stock)||0)<1)||!color||(isBeltCategory(product.category)?!length:(product.categoryType!=='accessories'&&!size))} onClick={()=>onAdd({productId:product.id,quantity:1,color,...(isBeltCategory(product.category)?{length}:{...(size?{size}:{})})})}><ShoppingBag size={16}/>{product.resaleStatus==='sold'?t('sold'):product.resaleStatus==='reserved'?t('reserved'):`${t('addToBag')} · €${Number(product.price).toFixed(2)}`}</button><button onClick={onFavorite} className="primary-red favorite-product-button"><Heart size={15} fill={favorite?'currentColor':'none'}/>{favorite?t('removeFavorites'):t('saveFavorites')}</button></div></div></div>{viewerOpen&&images.length>0&&<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} photo viewer`} onClick={closeViewer} onTouchStart={e=>{if(zoom===1&&e.touches.length===1)viewerTouchStart.current=e.touches[0].clientX}} onTouchEnd={e=>{if(zoom!==1){viewerTouchStart.current=null;return}const start=viewerTouchStart.current;viewerTouchStart.current=null;if(start===null)return;const dx=e.changedTouches[0].clientX-start;if(Math.abs(dx)>50){if(dx<0)nextViewer();else prevViewer()}}}>
  <button type="button" className="photo-lightbox-close" onClick={e=>{e.stopPropagation();closeViewer()}} aria-label="Close photo viewer"><X size={22}/></button>
  <div className="photo-lightbox-tools" onClick={e=>e.stopPropagation()}><button type="button" onClick={()=>changeZoom(-.25)} disabled={zoom<=1} aria-label="Zoom out"><ZoomOut size={18}/></button><span>{Math.round(zoom*100)}%</span><button type="button" onClick={()=>changeZoom(.25)} disabled={zoom>=3} aria-label="Zoom in"><ZoomIn size={18}/></button><button type="button" onClick={resetZoom} disabled={zoom===1} aria-label="Reset zoom">RESET</button></div>
  {images.length>1&&<button type="button" className="photo-lightbox-arrow prev" onClick={e=>{e.stopPropagation();prevViewer()}} aria-label="Previous photo"><ChevronLeft size={28}/></button>}
  <img className={`photo-lightbox-image ${zoom>1?'is-zoomed':''}`} src={images[viewerIndex]} alt={`${product.name} photo ${viewerIndex+1}`} style={{transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`}} onClick={e=>e.stopPropagation()} onDoubleClick={e=>{e.stopPropagation();handleDoubleClick()}} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}/>
  {images.length>1&&<button type="button" className="photo-lightbox-arrow next" onClick={e=>{e.stopPropagation();nextViewer()}} aria-label="Next photo"><ChevronRight size={28}/></button>}
  <div className="photo-lightbox-count">{viewerIndex+1} / {images.length} · {zoom>1?'DRAG TO PAN':'PINCH / DOUBLE-TAP TO ZOOM'}</div>
 </div>}</>}
