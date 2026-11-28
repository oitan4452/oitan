// Only daily totals and one of two page names are stored. No visitor identifiers.
let started=false;
export function initAnalytics(client,isAdmin){
  if(started)return;started=true;
  const page=location.pathname.endsWith('colors.html')?'colors':'library';
  if(!isAdmin){client.rpc('oitan_track_view',{p_page:page}).catch(()=>{});return;}
  const button=document.createElement('button');button.type='button';button.textContent='アクセス数';button.className='stats-open';
  (document.querySelector('.top-actions')||document.querySelector('header')).append(button);
  const dialog=document.createElement('dialog');dialog.className='stats-dialog';
  dialog.innerHTML='<div class="stats-head"><h2>アクセス数</h2><button type="button" aria-label="アクセス数を閉じる">×</button></div><p>あなた専用の集計画面です</p><div class="stats-content" aria-live="polite"></div><p class="stats-help">日本時間で集計 ／ ページが開かれた回数です<br>ログイン中の管理者は除外します<br>人数ではありません 同じ人の再読み込みや自動アクセスも含む場合があります<br>計測開始前のデータはありません</p>';
  document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
  button.onclick=async()=>{dialog.showModal();const body=dialog.querySelector('.stats-content');body.textContent='読み込み中…';
    try{const {data,error}=await client.rpc('oitan_view_stats');if(error)throw error;
      const rows=Array.isArray(data)?data:[],today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
      const days=Array.from({length:30},(_,i)=>new Date(Date.parse(today+'T00:00:00Z')-i*86400000).toISOString().slice(0,10));
      const sum=filter=>rows.filter(filter).reduce((n,r)=>n+Number(r.views),0);
      const cards=[['今日',sum(r=>r.day===today)],['直近7日',sum(r=>days.slice(0,7).includes(r.day))],['直近30日',sum(r=>days.includes(r.day))],['計測開始から',sum(()=>true)]];
      body.innerHTML='<div class="stats-totals">'+cards.map(([label,n])=>'<div><span>'+label+'</span><strong>'+n.toLocaleString()+'</strong><small>回</small></div>').join('')+'</div><h3>直近30日</h3><div class="stats-table-wrap"><table><thead><tr><th>日付</th><th>TOP</th><th>配色</th><th>合計</th></tr></thead><tbody>'+days.map(day=>{const a=sum(r=>r.day===day&&r.page==='library'),b=sum(r=>r.day===day&&r.page==='colors');return '<tr><th>'+day+'</th><td>'+a+'</td><td>'+b+'</td><td>'+(a+b)+'</td></tr>';}).join('')+'</tbody></table></div>';
    }catch{body.textContent='集計を読み込めませんでした 管理者でログインし直してお試しください';}
  };
}
