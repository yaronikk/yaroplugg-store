import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { z } from 'zod'

const app=express(); app.use(cors()); app.use(express.json());
const PORT=process.env.PORT||3001; const orders=[]
function verifyTelegramInitData(initData,botToken){if(!initData||!botToken)return false;const p=new URLSearchParams(initData);const hash=p.get('hash');if(!hash)return false;p.delete('hash');const dataCheck=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');const secret=crypto.createHmac('sha256','WebAppData').update(botToken).digest();const expected=crypto.createHmac('sha256',secret).update(dataCheck).digest('hex');return crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(expected))}
app.get('/api/health',(_,res)=>res.json({ok:true}))
app.post('/api/auth/telegram',(req,res)=>{if(!verifyTelegramInitData(req.body.initData,process.env.BOT_TOKEN))return res.status(401).json({error:'Invalid Telegram initData'});res.json({ok:true})})
app.get('/api/products',(_,res)=>res.json({items:[]}))
const orderSchema=z.object({telegramUserId:z.string().min(1),customer:z.object({name:z.string().min(1),phone:z.string().min(7),address:z.string().optional()}),delivery:z.string().min(1),payment:z.string().min(1),items:z.array(z.object({productId:z.string(),size:z.string(),color:z.string(),quantity:z.number().int().positive(),price:z.number().nonnegative()})).min(1),total:z.number().nonnegative(),idempotencyKey:z.string().min(8)})
app.post('/api/orders',(req,res)=>{const parsed=orderSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid order',details:parsed.error.flatten()});const duplicate=orders.find(o=>o.idempotencyKey===parsed.data.idempotencyKey);if(duplicate)return res.status(200).json(duplicate);const id=`${Date.now()}`;const order={id,status:'new',createdAt:new Date().toISOString(),...parsed.data};orders.push(order);res.status(201).json(order)})
app.get('/api/orders/:telegramUserId',(req,res)=>res.json(orders.filter(o=>o.telegramUserId===req.params.telegramUserId)))
app.patch('/api/orders/:id/status',(req,res)=>{if(req.headers['x-admin-key']!==process.env.ADMIN_KEY)return res.status(403).json({error:'Forbidden'});const o=orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({error:'Not found'});const status=z.enum(['new','confirmed','processing','shipped','delivered','cancelled']).safeParse(req.body.status);if(!status.success)return res.status(400).json({error:'Invalid status'});o.status=status.data;res.json(o)})
app.listen(PORT,()=>console.log(`API on ${PORT}`))
