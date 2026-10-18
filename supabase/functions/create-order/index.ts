import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char))

async function verifyTelegramInitData(initData:string,botToken:string){
 const params=new URLSearchParams(initData),receivedHash=params.get('hash'),authDate=Number(params.get('auth_date'))
 if(!receivedHash||!Number.isFinite(authDate)||Date.now()/1000-authDate>86400||authDate>Date.now()/1000+60)return false
 const check=[...params.entries()].filter(([key])=>key!=='hash').sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${key}=${value}`).join('\n'),encoder=new TextEncoder()
 const key=await crypto.subtle.importKey('raw',encoder.encode(botToken),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 const secret=await crypto.subtle.sign('HMAC',key,encoder.encode('WebAppData'))
 const signingKey=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['sign'])
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',signingKey,encoder.encode(check)))
 const expected=[...digest].map(byte=>byte.toString(16).padStart(2,'0')).join('')
 return expected.length===receivedHash.length&&[...expected].reduce((same,char,index)=>same|(char.charCodeAt(0)^receivedHash.charCodeAt(index)),0)===0
}
function telegramIdentity(initData:string){try{const user=JSON.parse(new URLSearchParams(initData).get('user')||'null');if(!Number.isSafeInteger(user?.id)||user.id<=0)return null;return{id:String(user.id),username:typeof user.username==='string'&&/^[A-Za-z0-9_]{5,32}$/.test(user.username)?user.username:null}}catch{return null}}
function validContact(type:string,value:string){if(value.length<5||value.length>120)return false;if(type==='telegram')return /^@?[A-Za-z0-9_]{5,32}$/.test(value);if(type==='phone')return /^\+?[0-9().\s-]{5,30}$/.test(value)&&(value.match(/\d/g)?.length||0)>=5;return type==='email'&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)}
async function hashIdentity(secret:string,value:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function verifyTurnstile(token:string,secret:string,ip:string){const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret,response:token,remoteip:ip})});if(!result.ok)return false;const data=await result.json();return data.success===true}

Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
 if(request.method!=='POST')return json({error:'Method not allowed'},405)
 const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 if(!url||!serviceKey)return json({error:'Order service is not configured'},503)
 try{
  const payload=await request.json(),customerName=typeof payload.customerName==='string'?payload.customerName.trim():''
  const contactType=typeof payload.contactType==='string'?payload.contactType:''
  const contactValue=typeof payload.contactValue==='string'?payload.contactValue.trim():''
  const idempotencyKey=payload.idempotencyKey,inputItems=payload.items,initData=typeof payload.telegramInitData==='string'?payload.telegramInitData:''
  if(customerName.length<1||customerName.length>120||!validContact(contactType,contactValue)||!payload.termsAccepted||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey||'')||
    !Array.isArray(inputItems)||inputItems.length<1||inputItems.length>30)return json({error:'Check the order details and try again.'},400)
  const ids=[...new Set(inputItems.map(item=>item?.productId))]
  if(ids.some(id=>typeof id!=='string')||inputItems.some(item=>!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20||['size','color','length'].some(key=>item[key]!=null&&(typeof item[key]!=='string'||item[key].length>60))))return json({error:'Invalid products or quantities.'},400)
  const webAppBotToken=Deno.env.get('TELEGRAM_WEBAPP_BOT_TOKEN')||Deno.env.get('TELEGRAM_BOT_TOKEN')||''
  let telegramUser:null|{id:string;username:string|null}=null,source:'miniapp'|'web'='web',ipHash:string|null=null
  if(initData){
   if(!webAppBotToken||!await verifyTelegramInitData(initData,webAppBotToken))return json({error:'Telegram Mini App verification failed. Check that the web app bot token matches the bot that launched it.'},401)
   telegramUser=telegramIdentity(initData);if(!telegramUser)return json({error:'Could not verify the Telegram account.'},401);source='miniapp'
  }else{
   const token=typeof payload.turnstileToken==='string'?payload.turnstileToken:''
   const secret=Deno.env.get('TURNSTILE_SECRET')||'',ip=(request.headers.get('cf-connecting-ip')||'').trim()
   if(!secret||!ip)return json({error:'Browser spam protection is not configured.'},503)
   if(!token||token.length>2048||!await verifyTurnstile(token,secret,ip))return json({error:'Spam check failed. Please complete it and try again.'},400)
   ipHash=await hashIdentity(serviceKey,ip)
  }
  const normalized=contactType==='telegram'?`@${contactValue.replace(/^@+/, '')}`:contactValue
  const contactHash=await hashIdentity(serviceKey,`${contactType}:${normalized.toLowerCase()}`)
  let deliveryMethods:any[]=[]
  try{deliveryMethods=JSON.parse(Deno.env.get('SHOP_DELIVERY_METHODS_JSON')||'[]')}catch{return json({error:'Delivery configuration is invalid.'},503)}
  const delivery=deliveryMethods.find(method=>method?.id===payload.deliveryMethod&&Number.isFinite(method.priceEur)&&method.priceEur>=0)
  if(!delivery)return json({error:'This delivery option is not configured. Please contact the store manager.'},400)
  const deliveryLabel=typeof delivery[(['ru','et','en'].includes(payload.language)?payload.language:'en')]==='string'?delivery[(['ru','et','en'].includes(payload.language)?payload.language:'en')]:delivery.id
  const deliveryCity=typeof payload.deliveryCity==='string'?payload.deliveryCity.trim():''
  const deliveryAddress=typeof payload.deliveryAddress==='string'?payload.deliveryAddress.trim():''
  const comment=typeof payload.comment==='string'?payload.comment.trim():''
  if(deliveryCity.length<2||deliveryCity.length>100||deliveryAddress.length>240||comment.length>1000)return json({error:'Check the delivery details and try again.'},400)
  const language=['ru','et','en'].includes(payload.language)?payload.language:'en'
  const supabase=createClient(url,serviceKey,{auth:{persistSession:false}})
  const {data:products,error:productError}=await supabase.from('products').select('id,name,price,stock,sizes,lengths,size_label,resale_status,colors,is_active,category:categories(name,category_type)').in('id',ids)
  if(productError)throw productError
  if(!products||products.length!==ids.length)return json({error:'A product is no longer available.'},409)
  const byId=new Map(products.map(p=>[p.id,p])),qty=new Map<string,number>()
  for(const item of inputItems)qty.set(item.productId,(qty.get(item.productId)||0)+item.quantity)
  let totalCents=0;const items=[]
  for(const input of inputItems){
   const product=byId.get(input.productId);if(!product||product.is_active!==true||product.resale_status!=='available')return json({error:'A product is no longer available.'},409)
   if(!Number.isFinite(Number(product.price))||Number(product.price)<0)return json({error:'Invalid product price.'},409)
   if((qty.get(product.id)||0)>Number(product.stock||0))return json({error:`${product.name} has insufficient stock.`},409)
   const isBelt=(product.category?.name||'').trim().toLowerCase()==='belts'
   if(isBelt){if(!Array.isArray(product.lengths)||!product.lengths.map(String).includes(input.length)||input.size)return json({error:`Choose an available length for ${product.name}.`},400)}
   else if(input.length||((product.category?.category_type||'clothing')==='accessories'?Boolean(input.size&&input.size!==product.size_label):(!Array.isArray(product.sizes)||!product.sizes.includes(input.size))))return json({error:`Choose an available size for ${product.name}.`},400)
   const colors=Array.isArray(product.colors)?product.colors.map((v:any)=>{if(typeof v!=='string')return v?.name||'';try{return JSON.parse(v)?.name||v}catch{return v}}).filter(Boolean):[]
   if(!colors.includes(input.color))return json({error:`Choose an available color for ${product.name}.`},400)
   const cents=Math.round(Number(product.price)*100);totalCents+=cents*input.quantity
   items.push({product_id:product.id,product_name:product.name,unit_price_cents:cents,quantity:input.quantity,size:input.size||'',color:input.color,length:input.length||''})
  }
  totalCents+=Math.round(Number(delivery.priceEur)*100)
  if(!Number.isSafeInteger(totalCents)||totalCents<1)return json({error:'Invalid order total.'},400)
  const {data:created,error:createError}=await supabase.rpc('create_store_order',{p_idempotency_key:idempotencyKey,p_customer_name:customerName,p_phone:contactType==='phone'?normalized:null,p_items:items,p_total_cents:totalCents,p_telegram_user_id:telegramUser?.id||null,p_telegram_username:telegramUser?.username||null,p_contact_type:contactType,p_contact_value:normalized,p_delivery_method:payload.deliveryMethod,p_delivery_city:deliveryCity,p_delivery_address:deliveryAddress,p_comment:comment,p_source:source,p_language:language,p_ip_hash:ipHash,p_contact_hash:contactHash,p_terms_accepted:true})
  if(createError?.message==='ORDER_RATE_LIMITED')return json({error:'Too many orders with this contact or from this connection. Please try again later.'},429)
  if(createError?.message==='ORDER_IDEMPOTENCY_CONFLICT')return json({error:'This order request has already been used. Refresh the store and try again.'},409)
  if(createError?.message==='INSUFFICIENT_STOCK'||createError?.message==='PRODUCT_UNAVAILABLE'||createError?.message==='PRICE_CHANGED')return json({error:'Stock or price changed. Please refresh the catalog and try again.'},409)
  if(createError)throw createError
  const order=Array.isArray(created)?created[0]:created;if(!order)throw new Error('Order was not returned')
  let notificationSent=false
  const botToken=Deno.env.get('TELEGRAM_BOT_TOKEN'),chatId=Deno.env.get('TELEGRAM_CHAT_ID'),siteUrl=Deno.env.get('SHOP_SITE_URL')||''
  if(order.created&&botToken&&chatId){
   const contactUrl=contactType==='email'?`mailto:${normalized}`:contactType==='phone'?`tel:${normalized}`:telegramUser?`tg://user?id=${telegramUser.id}`:`https://t.me/${encodeURIComponent(normalized.replace(/^@/,''))}`
   const lines=items.map(i=>`• ${escapeHtml(i.product_name)} × ${i.quantity}${i.size?` · ${escapeHtml(i.size)}`:''}${i.length?` · ${escapeHtml(i.length)} cm`:''}${i.color?` · ${escapeHtml(i.color)}`:''}`).join('\n')
   const message=`<b>Новый заказ #${order.order_number}</b>\nСтатус: новый · ожидает подтверждения\nПокупатель: ${escapeHtml(customerName)}\nКонтакт: <a href="${escapeHtml(contactUrl)}">${escapeHtml(normalized)}</a>${telegramUser?.username?`\nTelegram: @${escapeHtml(telegramUser.username)}`:''}\nДоставка: ${escapeHtml(deliveryLabel)}\nГород: ${escapeHtml(deliveryCity)}${deliveryAddress?`\nАдрес: ${escapeHtml(deliveryAddress)}`:''}${comment?`\nКомментарий: ${escapeHtml(comment)}`:''}\n\n${lines}\nДоставка: €${Number(delivery.priceEur).toFixed(2)}\nИтого: €${(Number(order.total_cents)/100).toFixed(2)}`.slice(0,3900)
   const keyboard=siteUrl.startsWith('https://')?{inline_keyboard:[[{text:'Открыть заказ в админке',url:`${siteUrl.replace(/\/$/,'')}/admin?tab=orders`}]]}:undefined
   try{const response=await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text:message,parse_mode:'HTML',disable_web_page_preview:true,reply_markup:keyboard})});notificationSent=response.ok;if(!response.ok)console.error('Telegram notification failed',response.status)}catch(error){console.error('Telegram notification failed',error)}
  }
  return json({orderNumber:order.order_number,totalCents:order.total_cents,status:order.status,paymentStatus:order.payment_status,notificationSent})
 }catch(error){console.error('Order creation failed',error);return json({error:'Could not create the order. Please try again.'},500)}
})
