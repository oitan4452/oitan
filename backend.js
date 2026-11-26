import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const config = window.OITAN_CONFIG || {};
let client;
function db() {
  if (!config.supabaseUrl || !config.publishableKey) throw new Error('保存先が未設定です。config.js と初期設定の手順を確認してください。');
  return client ||= createClient(config.supabaseUrl, config.publishableKey);
}
function checked(result) { if (result.error) throw new Error(result.error.message); return result.data; }
function decode(row) { return {...row.record,id:row.id,version:row.version}; }
async function owner() { return checked(await db().rpc('oitan_is_admin')) === true; }
function clean(input) {
  if (!['pose','palette','outfit','expression','reference'].includes(input.category)) throw new Error('カテゴリを選んでください。');
  const sections = input.sections || [];
  if (sections.length > 30) throw new Error('セクションは30個までです。');
  return {title:input.title,category:input.category,tags:input.tags||[],colors:input.colors||[],prompt:input.prompt||'',sections,notes:input.notes||'',source:input.source||'',created:input.created||Date.now(),updated:Date.now()};
}
async function imageFor(value,previous) {
  if (!value) return {url:'',key:null};
  if (value === previous && !value.startsWith('data:')) return {url:value,key:null};
  if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(value)) throw new Error('画像を選び直してください。');
  const blob = await (await fetch(value)).blob();
  if (blob.size > 8*1024*1024) throw new Error('画像は8MB以下にしてください。');
  const key = crypto.randomUUID()+'.'+({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif' })[blob.type];
  checked(await db().storage.from('oitan-images').upload(key,blob,{contentType:blob.type,upsert:false}));
  return {url:db().storage.from('oitan-images').getPublicUrl(key).data.publicUrl,key};
}
window.OitanBackend = {
  validImage(value) {
    try { const url = new URL(value); return url.origin === new URL(config.supabaseUrl).origin && url.pathname.startsWith('/storage/v1/object/public/oitan-images/'); } catch { return false; }
  },
  async request(path,options={}) {
    const method=options.method||'GET';
    if (path==='/api/session') {
      if (!config.supabaseUrl || !config.publishableKey) return {isAdmin:false,signedIn:false};
      const session=checked(await db().auth.getSession()).session;
      return {signedIn:!!session,isAdmin:session?await owner():false};
    }
    if (method==='GET') {
      if (!config.supabaseUrl || !config.publishableKey) return {items:[]};
      return {items:checked(await db().from('oitan_materials').select('id,record,version').is('deleted_at',null).order('created_at')).map(decode)};
    }
    if (!await owner()) throw new Error('追加・編集・削除は管理者だけが利用できます。');
    const input=JSON.parse(options.body);
    const id=path.startsWith('/api/items/')?path.slice('/api/items/'.length):null;
    if (method==='DELETE') {
      const rows=checked(await db().from('oitan_materials').update({deleted_at:new Date().toISOString()}).eq('id',id).eq('version',input.version).is('deleted_at',null).select('id'));
      if (!rows.length) throw new Error('別の画面で更新されています。再読み込みしてください。');
      return {ok:true};
    }
    let previous;
    if (id) previous=checked(await db().from('oitan_materials').select('record,version').eq('id',id).is('deleted_at',null).single());
    if(previous && previous.version!==input.version) throw new Error('別の画面で更新されています。再読み込みしてください。');
    const record=clean(input);
    const uploaded=[];
    try {
      const image=await imageFor(input.category==='palette'?'':input.image,previous?.record.image);
      record.image=image.url;if(image.key)uploaded.push(image.key);
      record.sections=await (async()=>{const result=[];for(const section of record.sections){
        const previousImage=(previous?.record.sections||[]).find(entry=>entry.image===section.image)?.image;
        const attachment=await imageFor(section.image,previousImage);
        if(attachment.key)uploaded.push(attachment.key);
        result.push({...section,image:attachment.url});
      }return result;})();
      const result=id ? await db().from('oitan_materials').update({record}).eq('id',id).eq('version',input.version).is('deleted_at',null).select('id,record,version').single() : await db().from('oitan_materials').insert({record}).select('id,record,version').single();
      return {item:decode(checked(result))};
    } catch(error) {
      if(uploaded.length) await db().storage.from('oitan-images').remove(uploaded);
      throw error;
    }
  },
  async login(email,password) { checked(await db().auth.signInWithPassword({email,password})); if(!await owner()){await db().auth.signOut();throw new Error('このアカウントには編集権限がありません。');} },
  async logout() { checked(await db().auth.signOut()); }
};
await import('./vault.js?v=20261127-images');
