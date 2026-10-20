import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json=(body:unknown,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}:{}),'Content-Type':'application/json'}})
function isAllowedOrigin(origin:string,siteUrl:string){try{const candidate=new URL(origin),site=siteUrl?new URL(siteUrl):null;return(Boolean(site&&candidate.origin===site.origin)||candidate.hostname==='telegram.org'||candidate.hostname.endsWith('.telegram.org')||candidate.hostname.endsWith('.t.me'))}catch{return false}}
const errorResponse=(code:string,status:number,origin='')=>json({code},status,origin)
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
 const origin=request.headers.get('origin')||'',siteUrl=Deno.env.get('SHOP_SITE_URL')||''
 const allowed=origin?isAllowedOrigin(origin,siteUrl):false
 const response=(body:unknown,status=200)=>json(body,status,allowed?origin:'')
 const fail=(code:string,status:number)=>errorResponse(code,status,allowed?origin:'')
 if(origin&&!allowed)return fail('ORIGIN_NOT_ALLOWED',403)
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...(allowed?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})}})
 if(request.method!=='POST')return fail('METHOD_NOT_ALLOWED',405)
 const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 if(!url||!serviceKey)return fail('ORDER_UNAVAILABLE',503)
 try{
  const payload=await request.json(),customerName=typeof payload.customerName==='string'?payload.customerName.trim():''
  const contactType=typeof payload.contactType==='string'?payload.contactType:''
  const contactValue=typeof payload.contactValue==='string'?payload.contactValue.trim():''
  const idempotencyKey=payload.idempotencyKey,inputItems=payload.items,initData=typeof payload.telegramInitData==='string'?payload.telegramInitData:''
  if(customerName.length<1||customerName.length>120||!validContact(contactType,contactValue)||!payload.termsAccepted||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey||'')||
    !Array.isArray(inputItems)||inputItems.length<1||inputItems.length>5||inputItems.reduce((sum,item)=>sum+(Number(item?.quantity)||0),0)>5)return fail('INVALID_ORDER',400)
  const ids=[...new Set(inputItems.map(item=>item?.productId))]
  if(ids.some(id=>typeof id!=='string')||inputItems.some(item=>!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>5||['size','color','length'].some(key=>item[key]!=null&&(typeof item[key]!=='string'||item[key].length>60))))return fail('INVALID_ORDER',400)
  const webAppBotToken=Deno.env.get('TELEGRAM_WEBAPP_BOT_TOKEN')||Deno.env.get('TELEGRAM_BOT_TOKEN')||''
  let telegramUser:null|{id:string;username:string|null}=null,source:'miniapp'|'web'='web',ipHash:string|null=null
  if(initData){
   if(!webAppBotToken||!await verifyTelegramInitData(initData,webAppBotToken))return fail('TELEGRAM_VERIFICATION_FAILED',401)
   telegramUser=telegramIdentity(initData);if(!telegramUser)return fail('TELEGRAM_VERIFICATION_FAILED',401);source='miniapp'
  }else{
   const token=typeof payload.turnstileToken==='string'?payload.turnstileToken:''
   const secret=Deno.env.get('TURNSTILE_SECRET')||'',ip=(request.headers.get('cf-connecting-ip')||'').trim()
   if(!secret||!ip)return fail('WEB_CHECKOUT_DISABLED',503)
   if(!token||token.length>2048||!await verifyTurnstile(token,secret,ip))return fail('CAPTCHA_FAILED',400)
   ipHash=await hashIdentity(serviceKey,ip)
  }
  const normalized=contactType==='telegram'?`@${contactValue.replace(/^@+/, '')}`:contactValue
  const contactHash=await hashIdentity(serviceKey,`${contactType}:${normalized.toLowerCase()}`)
  const comment=typeof payload.comment==='string'?payload.comment.trim():''
  if(comment.length>1000)return fail('INVALID_ORDER',400)
  const language=['ru','et','en'].includes(payload.language)?payload.language:'en'
  const supabase=createClient(url,serviceKey,{auth:{persistSession:false}})
  const {data:products,error:productError}=await supabase.from('products').select('id,name,price,stock,sizes,lengths,size_label,resale_status,colors,is_active,category:categories(name,category_type)').in('id',ids)
  if(productError)throw productError
  if(!products||products.length!==ids.length)return fail('PRODUCT_UNAVAILABLE',409)
  const byId=new Map(products.map(p=>[p.id,p])),qty=new Map<string,number>()
  for(const item of inputItems)qty.set(item.productId,(qty.get(item.productId)||0)+item.quantity)
  let totalCents=0;const items=[]
  for(const input of inputItems){
   const product=byId.get(input.productId);if(!product||product.is_active!==true||product.resale_status!=='available')return fail('PRODUCT_UNAVAILABLE',409)
   if(!Number.isFinite(Number(product.price))||Number(product.price)<0)return fail('INVALID_ORDER',409)
   if((qty.get(product.id)||0)>Number(product.stock||0))return fail('OUT_OF_STOCK',409)
   const isBelt=(product.category?.name||'').trim().toLowerCase()==='belts'
   if(isBelt){if(!Array.isArray(product.lengths)||!product.lengths.map(String).includes(input.length)||input.size)return fail('INVALID_ORDER',400)}
   else if(input.length||((product.category?.category_type||'clothing')==='accessories'?Boolean(input.size&&input.size!==product.size_label):(!Array.isArray(product.sizes)||!product.sizes.includes(input.size))))return fail('INVALID_ORDER',400)
   const colors=Array.isArray(product.colors)?product.colors.map((v:any)=>{if(typeof v!=='string')return v?.name||'';try{return JSON.parse(v)?.name||v}catch{return v}}).filter(Boolean):[]
   if(!colors.includes(input.color))return fail('INVALID_ORDER',400)
   const cents=Math.round(Number(product.price)*100);totalCents+=cents*input.quantity
   items.push({product_id:product.id,product_name:product.name,unit_price_cents:cents,quantity:input.quantity,size:input.size||'',color:input.color,length:input.length||''})
  }
  if(!Number.isSafeInteger(totalCents)||totalCents<1)return fail('INVALID_ORDER',400)
  const {data:created,error:createError}=await supabase.rpc('create_store_order',{p_idempotency_key:idempotencyKey,p_customer_name:customerName,p_phone:contactType==='phone'?normalized:null,p_items:items,p_total_cents:totalCents,p_telegram_user_id:telegramUser?.id||null,p_telegram_username:telegramUser?.username||null,p_contact_type:contactType,p_contact_value:normalized,p_comment:comment,p_source:source,p_language:language,p_ip_hash:ipHash,p_contact_hash:contactHash,p_terms_accepted:true})
  if(createError?.message==='ORDER_RATE_LIMITED')return fail('RATE_LIMITED',429)
  if(createError?.message==='ORDER_IDEMPOTENCY_CONFLICT')return fail('INVALID_ORDER',409)
  if(createError?.message==='INSUFFICIENT_STOCK')return fail('OUT_OF_STOCK',409)
  if(createError?.message==='PRODUCT_UNAVAILABLE')return fail('PRODUCT_UNAVAILABLE',409)
  if(createError?.message==='PRICE_CHANGED')return fail('PRICE_CHANGED',409)
  if(createError?.message==='INVALID_ORDER')return fail('INVALID_ORDER',400)
  if(createError)throw createError
  const order=Array.isArray(created)?created[0]:created;if(!order)throw new Error('Order was not returned')
  let notificationSent=false
  const botToken=Deno.env.get('TELEGRAM_BOT_TOKEN'),chatId=Deno.env.get('TELEGRAM_CHAT_ID')
  if(order.created&&botToken&&chatId){
   const contactUrl=contactType==='email'?`mailto:${normalized}`:contactType==='phone'?`tel:${normalized}`:telegramUser?`tg://user?id=${telegramUser.id}`:`https://t.me/${encodeURIComponent(normalized.replace(/^@/,''))}`
   const lines=items.map(i=>`• ${escapeHtml(i.product_name)} × ${i.quantity}${i.size?` · ${escapeHtml(i.size)}`:''}${i.length?` · ${escapeHtml(i.length)} cm`:''}${i.color?` · ${escapeHtml(i.color)}`:''}`).join('\n')
   const message=`<b>Новый заказ #${order.order_number}</b>\nСтатус: новый · ожидает подтверждения\nПокупатель: ${escapeHtml(customerName)}\nКонтакт: <a href="${escapeHtml(contactUrl)}">${escapeHtml(normalized)}</a>${telegramUser?.username?`\nTelegram: @${escapeHtml(telegramUser.username)}`:''}${comment?`\nКомментарий: ${escapeHtml(comment)}`:''}\n\n${lines}\nИтого за вещи: €${(Number(order.total_cents)/100).toFixed(2)}`.slice(0,3900)
   const keyboard=siteUrl.startsWith('https://')?{inline_keyboard:[[{text:'Открыть заказ в админке',url:`${siteUrl.replace(/\/$/,'')}/admin?tab=orders`}]]}:undefined
   try{const response=await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text:message,parse_mode:'HTML',disable_web_page_preview:true,reply_markup:keyboard})});notificationSent=response.ok;if(!response.ok)console.error('Telegram notification failed',response.status)}catch(error){console.error('Telegram notification failed',error)}
  }
  if(order.created&&source==='miniapp'&&telegramUser&&botToken){
   const textByLanguage:Record<string,string>={ru:`Заказ №${order.order_number} принят. Менеджер свяжется с вами.`,et:`Tellimus nr ${order.order_number} on vastu võetud. Haldur võtab teiega ühendust.`,en:`Order #${order.order_number} has been received. The manager will contact you.`}
   try{await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:telegramUser.id,text:textByLanguage[language]||textByLanguage.en})})}catch{}
  }
  return response({orderNumber:order.order_number,totalCents:order.total_cents,status:order.status,paymentStatus:order.payment_status,notificationSent})
 }catch(error){console.error('Order creation failed',error);return fail('ORDER_FAILED',500)}
})
