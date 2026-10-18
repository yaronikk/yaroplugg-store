export default async function handler(req:any,res:any){
 const origin=`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}`
 try{const response=await fetch(`${origin}/index.html`);let html=await response.text();html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>Admin | YAROPLUGG</title><meta name="robots" content="noindex,nofollow">');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.status(200).send(html)}catch{return res.status(503).send('Admin is temporarily unavailable')}
}
