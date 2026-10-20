const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export default async function handler(req:any,res:any){
 const slug=String(req.query?.slug||'').slice(0,180)
 const base=process.env.VITE_SUPABASE_URL, key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY
 if(!slug||!base||!key)return res.status(503).send('Product page is not configured')
 try{
  const url=new URL('/rest/v1/products',base);url.searchParams.set('select','name,slug,brand,description,price,image_url,images,resale_status,category:categories(name)');url.searchParams.set('slug',`eq.${slug}`);url.searchParams.set('is_active','eq.true');url.searchParams.set('limit','1')
  const response=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`}});if(!response.ok)throw new Error('Product lookup failed')
  const [product]=await response.json();if(!product)return res.status(404).send('Product not found')
  const origin=process.env.SHOP_SITE_URL||'https://yaropluggstore.vercel.app'
  const title=`${product.name} | YAROPLUGG STORE`,description=String(product.description||`${product.brand||''} · ${product.category?.name||'Resale clothing'} · €${product.price}`).slice(0,280),canonical=`${origin}/p/${encodeURIComponent(product.slug)}`,image=product.images?.[0]||product.image_url||''
  const documentResponse=await fetch(`${origin}/index.html`);let html=await documentResponse.text()
  const metadata=`<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="product"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">${image?`<meta property="og:image" content="${esc(image)}">`:''}<meta name="twitter:card" content="${image?'summary_large_image':'summary'}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Product',name:product.name,description,image,brand:product.brand?{'@type':'Brand',name:product.brand}:undefined,offers:{'@type':'Offer',price:String(product.price),priceCurrency:'EUR',availability:product.resale_status==='sold'?'https://schema.org/OutOfStock':product.resale_status==='reserved'?'https://schema.org/LimitedAvailability':'https://schema.org/InStock',url:canonical}}).replace(/</g,'\\u003c')}</script>`
  html=html.replace(/<title>[\s\S]*?<\/title>/i,metadata).replace(/<meta name="description"[^>]*>/i,'')
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');return res.status(200).send(html)
 }catch{return res.status(500).send('Could not load product page')}
}
