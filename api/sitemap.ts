export default async function handler(req:any,res:any){
 const base=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY,origin=`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}`
 let slugs:string[]=[]
 if(base&&key){try{const url=new URL('/rest/v1/products',base);url.searchParams.set('select','slug');url.searchParams.set('is_active','eq.true');url.searchParams.set('resale_status','neq.sold');const r=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`}});if(r.ok)slugs=(await r.json()).map((p:any)=>p.slug).filter(Boolean)}catch{}}
 const urls=['/','/shop','/info/about','/info/howOrder','/info/deliveryPayment','/info/returns','/info/contacts','/info/terms','/info/privacy',...slugs.map(slug=>`/p/${encodeURIComponent(slug)}`)]
 const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path=>`<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`
 res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');res.status(200).send(xml)
}
