// Public browsing must remain available if the sign-in library cannot load.
try {
  await import('./backend.js?v=20261129-mobile');
} catch {
  const config=window.OITAN_CONFIG||{};
  window.OitanBackend={
    validImage(value){try{const url=new URL(value);return url.origin===new URL(config.supabaseUrl).origin&&url.pathname.startsWith('/storage/v1/object/public/oitan-images/');}catch{return false;}},
    async request(path,options={}){
      if(path==='/api/session')return {signedIn:false,isAdmin:false};
      if((options.method||'GET')!=='GET')throw new Error('管理機能を読み込めませんでした。SafariやChromeで開き直してください。');
      const response=await fetch(config.supabaseUrl+'/rest/v1/oitan_materials?select=id,record,version&deleted_at=is.null&order=created_at.asc',{headers:{apikey:config.publishableKey}});
      if(!response.ok)throw new Error('素材に接続できませんでした。通信状態を確認して再読み込みしてください。');
      return {items:(await response.json()).map(row=>({...row.record,id:row.id,version:row.version}))};
    },
    async login(){throw new Error('管理機能を読み込めませんでした。SafariやChromeで開き直してください。');},
    async logout(){}
  };
  await import('./vault.js?v=20261129-mobile');
}
