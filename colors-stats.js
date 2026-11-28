import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {initAnalytics} from './analytics.js?v=20261129';
const c=window.OITAN_CONFIG;
if(c?.supabaseUrl&&c?.publishableKey){
 const client=createClient(c.supabaseUrl,c.publishableKey);
 const {data}=await client.auth.getSession();let admin=false;
 if(data.session){const result=await client.rpc('oitan_is_admin');admin=result.data===true;}
 initAnalytics(client,admin);
}
