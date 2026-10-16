import type { Plugin } from 'vite';
import { randomUUID } from 'node:crypto';
import { seed, session, user, operators, type Row } from './data';
export function demoPlugin(): Plugin {
 let db=seed();
 function matches(row: Row, params: URLSearchParams): boolean {
  for(const [key,expr] of params){
   if(['select','order','limit','offset','on_conflict'].includes(key)) continue;
   if(key==='or') {if(!expr.slice(1,-1).split(',').some(term=>{const [k,,...v]=term.split('.');return String(row[k]??'').toLowerCase().includes(v.join('.').replace(/[%*]/g,'').toLowerCase());}))return false;continue;}
   const dot=expr.indexOf('.'),op=expr.slice(0,dot),v=expr.slice(dot+1),actual=row[key];
   if(op==='eq'&&String(actual)!==v)return false;
   if(op==='neq'&&String(actual)===v)return false;
   if(op==='in'&&!v.slice(1,-1).split(',').map(x=>x.replaceAll('"','')).includes(String(actual)))return false;
   if(op==='gte'&&String(actual)<v)return false;
   if(op==='lte'&&String(actual)>v)return false;
   if(op==='not'&&v==='is.null'&&actual==null)return false;
   if(op==='is'&&v==='null'&&actual!=null)return false;
  }return true;
 }
 function embed(table:string,row:Row):Row {
  const r={...row},find=(t:string,id:unknown)=>db[t]?.find(x=>x.id===id)??null;
  if(table==='conversations')r.number=find('whatsapp_channels',r.whatsapp_channel_id);
  if(table==='deals'){
   r.contact={...find('contacts',r.contact_id),conversations:db.conversations.find(c=>c.contact_id===r.contact_id)};
   r.stage=find('stages',r.stage_id);r.deal_tags=db.deal_tags.filter(x=>x.deal_id===r.id).map(x=>({tag:find('tags',x.tag_id)}));r.deal_products=db.deal_products.filter(x=>x.deal_id===r.id).map(x=>({product:find('products',x.product_id)}));r.custom_field_values=db.custom_field_values.filter(x=>x.deal_id===r.id);
  }
  if(table==='contact_tags'||table==='deal_tags') r.tag=find('tags',r.tag_id);
  if(table==='deal_products')r.product=find('products',r.product_id);
  if(table==='campaigns')r.template=find('templates',r.template_id);
  if(table==='crm_activities')r.deal=find('deals',r.deal_id);
  return r;
 }
 return {name:'local-recording-demo',
 transformIndexHtml(){return [{tag:'script',injectTo:'head-prepend',children:`localStorage.setItem('sb-127-auth-token',${JSON.stringify(JSON.stringify(session))});`}]},
 configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url??'/', 'http://127.0.0.1:5180'),p=url.pathname;
  if(!p.startsWith('/demo-backend/')&&!p.startsWith('/api/'))return next();
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const send=(data:any,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data));};
  let body:Row={};if(req.method!=='GET'&&req.method!=='HEAD'){let raw='';for await(const c of req)raw+=c;try{body=JSON.parse(raw||'{}');}catch{body={};}}
  if(p==='/api/demo-reset'){db=seed();return send({ok:true});}
  if(p==='/api/channels'){
   if(req.method==='PATCH'){const c=db.whatsapp_channels.find(c=>c.id===body.id);if(c)Object.assign(c,body);}
   if(body.action==='webhook'){const c=db.whatsapp_channels.find(c=>c.id===body.id);if(c)c.webhook_ready=true;}
   if(body.action==='add_uazapi')db.whatsapp_channels.push({id:randomUUID(),provider:'uazapi',name:body.name,phone:'+55 11 0000-1004',connected:true,enabled:true,assignment_mode:'round_robin',operator_id:null,add_to_funnel:false,pipeline_id:null,webhook_ready:true});
   return send({success:true,channels:db.whatsapp_channels,zernio_configured:true});
  }
  if(p.startsWith('/api/')){
   if(p.includes('credentials'))return send(Object.fromEntries((url.searchParams.get('keys')??'').split(',').map(k=>[k,{exists:true}])));
   if(p.includes('uazapi'))return send({success:true,configured:true,connected:true,logged_in:true,instance_name:'Aurora • Atendimento',webhook_ready:true,webhook_url:'http://127.0.0.1:5180/demo-backend/functions/v1/whatsapp-inbound'});
   if(p.includes('zernio'))return send({success:true,connected:true,configured:true,accountId:'demo-account',profileId:'demo-profile',number:{display_phone_number:'(11) 0000-0000',verified_name:'Aurora Negócios',messaging_limit_tier:'TIER_10K',quality_rating:'GREEN',health_status:'CONNECTED'}});
   return send({success:true,ok:true});
  }
  if(p.includes('/auth/v1/'))return send(p.endsWith('/user')?user:session);
  if(p.includes('/functions/v1/')){
   const fn=p.split('/').at(-1);
   if(fn==='send-operator-message'||fn==='send-operator-media'){
    const m={id:randomUUID(),conversation_id:body.conversation_id,content:body.content??'Arquivo enviado',content_type:body.is_private_note?'note':'text',is_private_note:!!body.is_private_note,direction:'outbound',sender_type:'operator',sender_id:user.id,meta_status:'read',created_at:new Date().toISOString()};db.messages.push(m);return send({ok:true,message_id:m.id});
   }
   if(fn==='zernio-number-status')return send({ok:true,connected:true,number:{display_phone_number:'(11) 0000-0000',verified_name:'Aurora Negócios',messaging_limit_tier:'TIER_10K',quality_rating:'GREEN',health_status:'CONNECTED'}});
   if(fn==='invite-team-member'){const id=randomUUID();db.app_users.push({user_id:id,email:body.email,role:body.role??'operator',created_at:new Date().toISOString(),accepted_at:null});return send({ok:true,data:{user_id:id}});}
   if(fn==='saas-tenants'){
    db.saas_tenants??=[{id:'mock-megacrm',slug:'megacrm',name:'MEGACRM',status:'active',owner_email:'marina@exemplo.com',created_at:new Date().toISOString(),plan:'inicial',subscription_status:'active',users:1}];
    db.saas_members??={['mock-megacrm']:[{user_id:user.id,email:user.email,role:'admin',accepted_at:new Date().toISOString(),commercial_plan:'inicial'}]};
    db.platform_admins??=[{user_id:user.id,email:user.email,created_at:new Date().toISOString()}];
    const action=body.action??'list';
    if(action==='create'){
     const tenant={id:randomUUID(),slug:String(body.name??'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40),name:body.name,status:'active',owner_email:body.owner_email,created_at:new Date().toISOString(),plan:body.plan??'inicial',subscription_status:'active',users:1};
     db.saas_tenants.push(tenant);
     db.saas_members[tenant.id]=[{user_id:randomUUID(),email:body.owner_email,role:'admin',accepted_at:null,commercial_plan:tenant.plan}];
     return send({ok:true,tenant});
    }
    if(action==='update'){
     const tenant=db.saas_tenants.find((t:{id:string})=>t.id===body.id);
     if(!tenant)return send({ok:false,error:'CRM não encontrado.'});
     if(body.plan)tenant.plan=body.plan;
     if(body.status){tenant.status=body.status;tenant.subscription_status=body.status;}
     return send({ok:true,tenant});
    }
    if(action==='members')return send({ok:true,members:db.saas_members[body.tenant_id]??[]});
    if(action==='invite'){
     const member={user_id:randomUUID(),email:body.email,role:body.role??'operator',accepted_at:null,commercial_plan:'inicial'};
     (db.saas_members[body.tenant_id]??=[]).push(member);
     return send({ok:true,user_id:member.user_id,email:body.email,role:body.role});
    }
    if(action==='revoke'){
     db.saas_members[body.tenant_id]=(db.saas_members[body.tenant_id]??[]).filter((m:{user_id:string})=>m.user_id!==body.user_id);
     return send({ok:true,user_id:body.user_id});
    }
    if(action==='list_platform_admins')return send({ok:true,admins:db.platform_admins});
    if(action==='invite_platform_admin'){
     const admin={user_id:randomUUID(),email:body.email,created_at:new Date().toISOString()};
     db.platform_admins.push(admin);
     return send({ok:true,user_id:admin.user_id,email:body.email});
    }
    if(action==='revoke_platform_admin'){
     db.platform_admins=db.platform_admins.filter((a:{user_id:string})=>a.user_id!==body.user_id);
     return send({ok:true,user_id:body.user_id});
    }
    return send({ok:true,tenants:db.saas_tenants,live:true});
   }
   return send({ok:true,success:true,data:{}});
  }
  if(p.includes('/rest/v1/rpc/')) {
   const rpc=p.split('/').at(-1);
   if(rpc==='list_operators')return send(db.app_users.map(x=>({user_id:x.user_id,email:x.email,name:x.name,role:x.role})));
   return send([]);
  }
  if(p.includes('/rest/v1/')){
   const table=p.split('/').at(-1)!;db[table]??=[];const params=url.searchParams;
   let rows=db[table].filter(r=>matches(r,params));
   if(req.method==='POST'){
    const additions=(Array.isArray(body)?body:[body]).map(b=>({id:randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...b}));
    for(const row of additions){const existing=String(req.headers.prefer).includes('resolution=merge')?db[table].find(r=>r.id===row.id):null;if(existing)Object.assign(existing,row);else db[table].push(row);}rows=additions;
   }else if(req.method==='PATCH'){for(const r of rows)Object.assign(r,body);}
   else if(req.method==='DELETE'){db[table]=db[table].filter(r=>!rows.includes(r));}
   const total=rows.length,order=params.get('order');
   if(order){const [key,dir]=order.split('.');rows.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''),undefined,{numeric:true})*(dir==='desc'?-1:1));}
   const offset=Number(params.get('offset')??0),limit=Number(params.get('limit')??total);
   rows=rows.slice(offset,offset+limit).map(r=>embed(table,r));res.setHeader('Content-Range',`${offset}-${Math.max(offset,offset+rows.length-1)}/${total}`);
   if(req.method==='HEAD'){res.end();return;}
   if(String(req.headers.accept).includes('vnd.pgrst.object'))return send(rows[0]??null);
   return send(rows);
  }
  return send({ok:true});
 });}
 };
}
