(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const categories = [
    {id:'all',label:'すべての素材',icon:'▦',english:'THE COLLECTION'},
    {id:'pose',label:'ポーズ',icon:'◇',english:'POSE REFERENCES'},
    {id:'palette',label:'配色',icon:'◐',english:'COLOR PALETTES'},
    {id:'outfit',label:'衣装',icon:'♧',english:'OUTFIT REFERENCES'},
    {id:'expression',label:'表情',icon:'◡',english:'EXPRESSIONS'},
    {id:'reference',label:'参考資料',icon:'▧',english:'REFERENCES'}
  ];
  const allowedCategories = ['pose','palette','outfit','expression','reference'];
  let customItems = [];
  let favorites = new Set();
  let isAdmin = false;
  let loading = true;
  let currentCategory = 'all';
  let favoriteOnly = false;
  let searchTerm = '';
  let sortOrder = 'default';
  let draftImage = '';
  let draftId = null;
  let saving = false;
  let toastTimer;
  const detail = $('#detail-dialog');
  const editor = $('#editor-dialog');

  function categoryInfo(id) {
    return categories.find(category => category.id === id) || categories[0];
  }
  function allItems() {
    return [...customItems];
  }
  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ['https:','http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function parseColors(text) {
    return String(text || '').split(/[\s,、]+/).filter(Boolean).map(value => value.startsWith('#') ? value : '#'+value).filter(value => /^#[0-9a-f]{6}$/i.test(value)).slice(0,12);
  }
  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2800);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      const host = detail.open ? detail : document.body;
      host.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      if (!copied) { toast('コピーできませんでした。本文を選択してコピーしてください。'); return; }
    }
    toast('コピーしました');
  }
  async function apiRequest(path, options = {}) {
    return window.OitanBackend.request(path,options);
  }

  function writeState(items, ids) {
    try {
      localStorage.setItem('oitan-public-favorites', JSON.stringify([...ids]));
      return Promise.resolve();
    } catch { return Promise.reject(new Error('お気に入りを保存できませんでした。')); }
  }
  function isValidImage(value) {
    return typeof value === 'string' && value.length < 12000000 && /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=\r\n]+$/.test(value);
  }
  function normalizeItem(item) {
    if (!item || !allowedCategories.includes(item.category) || typeof item.title !== 'string' || !item.title.trim()) {
      throw new Error('読み込みファイルに不正な素材データがあります。');
    }
    const colors = parseColors(Array.isArray(item.colors) ? item.colors.join(' ') : '');
    if (item.category === 'palette' && !colors.length) throw new Error('配色のカラーコードを確認してください。');
    return {
      id:typeof item.id === 'string' && /^[a-f0-9-]{36}$/.test(item.id) ? item.id : 'custom:'+crypto.randomUUID(),
      title:item.title.trim().slice(0,120), category:item.category,
      image:window.OitanBackend.validImage(item.image) || isValidImage(item.image) || /^\/media\/[a-f0-9-]{36}\.(png|jpg|webp|gif)$/.test(item.image || '') ? item.image : '', colors,
      tags:Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string').map(tag => tag.slice(0,60)).slice(0,20) : [],
      prompt:String(item.prompt || '').slice(0,50000), notes:String(item.notes || '').slice(0,20000),
      sections:Array.isArray(item.sections) ? item.sections.map(section => ({label:String(section.label||''),heading:String(section.heading||''),text:String(section.text||'')})) : [],
      source:safeUrl(item.source), created:Number.isFinite(item.created) ? item.created : Date.now(), version:Number.isInteger(item.version) ? item.version : 1
    };
  }
  function renderNav() {
    const items = allItems();
    $('#category-nav').innerHTML = categories.map(category => `<button class="nav-item ${currentCategory === category.id && !favoriteOnly ? 'active' : ''}" data-category="${category.id}" aria-pressed="${currentCategory === category.id && !favoriteOnly}"><span class="nav-icon" aria-hidden="true">${category.icon}</span><span>${category.id === 'all' ? 'すべて' : category.label}</span><span class="nav-count">${category.id === 'all' ? items.length : items.filter(item => item.category === category.id).length}</span></button>`).join('');
    $('#favorite-count').textContent = items.filter(item => favorites.has(item.id)).length;
    $('#favorites-nav').classList.toggle('active',favoriteOnly);
    $('#favorites-nav').setAttribute('aria-pressed',String(favoriteOnly));
    $('#hero-total').innerHTML = `${items.length}<span>ITEMS</span>`;
  }
  function cardMarkup(item,index) {
    let visual = `<span class="text-cover">${escapeHtml(categoryInfo(item.category).english)}</span>`;
    if (item.category === 'palette') {
      visual = `<span class="palette-card">${item.colors.map(color => `<span style="background:${color}"></span>`).join('')}</span>`;
    } else if (item.image) {
      visual = `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">`;
    }
    const saved = favorites.has(item.id);
    return `<article class="material-card" style="--delay:${Math.min(index,11)*20}ms"><button class="card-open" data-open="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}の詳細を開く"><span class="card-image">${visual}<span class="card-type">${escapeHtml(categoryInfo(item.category).label)}</span></span><span class="card-copy"><span class="card-title">${escapeHtml(item.title)}</span><span class="card-subtitle">${escapeHtml(item.tags.slice(0,2).join(' / ') || categoryInfo(item.category).english)}</span></span></button><button class="favorite-button ${saved ? 'saved' : ''}" data-favorite="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}をお気に入り${saved ? 'から外す' : 'に追加'}" aria-pressed="${saved}">${saved ? '★' : '☆'}</button><span class="card-bottom-line"></span></article>`;
  }
  function render() {
    renderNav();
    const category = categoryInfo(currentCategory);
    $('#breadcrumb-label').textContent = favoriteOnly ? 'お気に入り' : category.id === 'all' ? '素材ライブラリ' : category.label;
    $('#collection-title').firstChild.textContent = (favoriteOnly ? 'お気に入り' : category.label)+' ';
    $('#collection-eyebrow').textContent = favoriteOnly ? 'YOUR FAVORITES' : category.english;
    const query = searchTerm.trim().toLocaleLowerCase('ja');
    let items = allItems().filter(item => (currentCategory === 'all' || item.category === currentCategory) && (!favoriteOnly || favorites.has(item.id)));
    if (query) items = items.filter(item => [item.title,item.tags.join(' '),item.prompt,item.notes,...(item.sections||[]).map(section=>[section.label,section.heading,section.text].join(' '))].join(' ').toLocaleLowerCase('ja').includes(query));
    if (sortOrder === 'name') items.sort((a,b) => a.title.localeCompare(b.title,'ja'));
    if (sortOrder === 'newest') items = items.map((item,index) => ({item,index})).sort((a,b) => b.item.created-a.item.created || b.index-a.index).map(entry => entry.item);
    $('#result-count').textContent = items.length;
    $('#cards').innerHTML = items.map(cardMarkup).join('');
    $('#empty-state').hidden = loading || items.length > 0;
    $('#empty-title').textContent = query ? '該当する素材がありません' : favoriteOnly ? 'お気に入りを集めよう' : isAdmin ? `${category.id === 'all' ? '最初の素材' : category.label}を追加` : '素材は準備中です';
    $('#empty-copy').textContent = query ? '検索する言葉や分類を変えてみてください。' : favoriteOnly ? 'カードの星を押すと、ここに集まります。' : isAdmin ? '画像やプロンプトを保存して、素材庫を育てていこう。' : '公開された素材がここに並びます。';
    $('#add-empty').hidden = !isAdmin || Boolean(query) || favoriteOnly;
    $('#footer-count').textContent = loading ? '素材を読み込み中…' : `${items.length}件の素材を表示`;
    document.title = `${favoriteOnly ? 'お気に入り' : category.label} — OITAN`;
  }
  function section(title,text,copyId) {
    if (!text) return '';
    return `<section class="detail-section"><h3>${escapeHtml(title)}</h3><${copyId ? 'pre class="prompt-text"' : 'p class="detail-copy"'}>${escapeHtml(text)}</${copyId ? 'pre' : 'p'}>${copyId ? `<button class="copy-button" data-copy="${copyId}">コピーする</button>` : ''}</section>`;
  }
  function showDetail(id) {
    const item = allItems().find(item => item.id === id);
    if (!item) return;
    const copyValues = {};
    let sections = '';
    if (item.category === 'palette') sections += `<section class="detail-section"><h3>カラーコード</h3><div class="detail-palette">${item.colors.map(color => `<button class="swatch-button" data-color="${color}" aria-label="${color}をコピー"><span style="--swatch:${color}"></span><small>${color.toUpperCase()}</small></button>`).join('')}</div><button class="copy-button" data-copy="palette">配色をまとめてコピー</button></section>`;
    copyValues.palette = (item.colors || []).join(', ');
    const prompts = [...(item.prompt ? [{label:'PROMPT',heading:'プロンプト',text:item.prompt}] : []),...(item.sections||[])];
    if(prompts.length) {
      sections += `<div class="prompt-tabs" role="tablist" aria-label="プロンプトの項目">${prompts.map((entry,index)=>`<button type="button" role="tab" id="prompt-tab-${index}" aria-controls="prompt-panel-${index}" aria-selected="${index===0}" tabindex="${index===0?0:-1}" data-prompt-tab="${index}">${escapeHtml(entry.heading||entry.label)}</button>`).join('')}</div>`;
      sections += prompts.map((entry,index)=>{
        copyValues['prompt-'+index]=entry.text;
        return `<section class="detail-section prompt-panel" role="tabpanel" id="prompt-panel-${index}" aria-labelledby="prompt-tab-${index}" ${index?'hidden':''}><p class="eyebrow">PROMPT DATA / ${escapeHtml(entry.label||'PROMPT')}</p><h3>${escapeHtml(entry.heading||entry.label)}</h3><pre class="prompt-text">${escapeHtml(entry.text)}</pre><button class="copy-button" data-copy="prompt-${index}">${escapeHtml(entry.label||entry.heading)} をコピー</button></section>`;
      }).join('');
    }
    sections += section('メモ',item.notes);
    const url = safeUrl(item.source);
    const visual = item.category === 'palette' ? `<div class="palette-card">${item.colors.map(color => `<span style="background:${color}"></span>`).join('')}</div>` : item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">` : `<div class="text-cover">${escapeHtml(categoryInfo(item.category).english)}</div>`;
    $('#detail-content').innerHTML = `<div class="detail-layout"><div class="detail-visual">${visual}</div><div class="detail-body"><div class="detail-top"><div><p class="eyebrow">${categoryInfo(item.category).english}</p><h2 id="detail-title">${escapeHtml(item.title)}</h2></div><button class="close-button" data-close-detail aria-label="閉じる">×</button></div><div class="detail-tags">${item.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div><div class="detail-actions"><button class="secondary-button" data-detail-favorite>${favorites.has(id) ? '★ お気に入り登録済み' : '☆ お気に入りに追加'}</button>${isAdmin ? '<button class="secondary-button" data-edit>編集</button><button class="secondary-button delete-button" data-delete>削除</button>' : ''}</div>${sections}${url ? `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">参照元を開く</a>` : ''}</div></div>`;
    $('#detail-content').querySelector('[data-close-detail]').addEventListener('click',() => detail.close());
    $('#detail-content').querySelector('[data-detail-favorite]').addEventListener('click',async () => {
      await toggleFavorite(id);
      if (detail.open) showDetail(id);
    });
    $('#detail-content').querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click',() => copyText(copyValues[button.dataset.copy])));
    const tabs=[...$('#detail-content').querySelectorAll('[data-prompt-tab]')];
    function selectTab(index,focus=false){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;$('#prompt-panel-'+i).hidden=i!==index;});if(focus)tabs[index].focus();}
    tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectTab(index));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();selectTab(next,true);}});});
    $('#detail-content').querySelectorAll('[data-color]').forEach(button => button.addEventListener('click',() => copyText(button.dataset.color)));
    $('#detail-content').querySelector('[data-edit]')?.addEventListener('click',() => {detail.close();openEditor(item);});
    $('#detail-content').querySelector('[data-delete]')?.addEventListener('click',async () => {
      const button = $('#detail-content').querySelector('[data-delete]');
      if (button.dataset.confirmed !== 'true') {
        button.dataset.confirmed = 'true';
        button.textContent = 'もう一度押すと削除';
        return;
      }
      try {
        const next = customItems.filter(record => record.id !== id);
        const nextFavorites = new Set(favorites);
        nextFavorites.delete(id);
        await apiRequest('/api/items/'+encodeURIComponent(id), { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({version:item.version}) });
        await writeState(next,nextFavorites);
        customItems = next; favorites = nextFavorites; detail.close(); render(); toast('素材を削除しました');
      } catch (error) {toast('削除できませんでした。'+error.message);}
    });
    if (!detail.open) detail.showModal();
    detail.scrollTop = 0;
  }
  async function toggleFavorite(id) {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id); else next.add(id);
    try {await writeState(customItems,next);favorites = next;render();}
    catch (error) {toast(error.message || '保存できませんでした。');}
  }
  function updatePaletteField() {
    const isPalette = $('#item-category').value === 'palette';
    $('#palette-field').hidden = !isPalette;
    $('#image-field').hidden = isPalette;
    $('#palette-preview').innerHTML = parseColors($('#item-colors').value).map(color => `<span style="background:${color}"></span>`).join('');
  }
  function openEditor(item) {
    if (!isAdmin) return;
    $('#editor-form').reset();
    draftId = item?.id || null;
    draftImage = item?.image || '';
    $('#editor-title').textContent = item ? '素材を編集' : '素材を追加';
    $('#item-title').value = item?.title || '';
    $('#item-category').value = item?.category || (allowedCategories.includes(currentCategory) ? currentCategory : 'pose');
    $('#item-tags').value = item?.tags.join(', ') || '';
    $('#item-prompt').value = item?.prompt || '';
    $('#prompt-sections').replaceChildren();
    (item?.sections||[]).forEach(addPromptSection);
    $('#item-notes').value = item?.notes || '';
    $('#item-source').value = item?.source || '';
    $('#item-colors').value = item?.colors?.join(' ') || '';
    $('#form-error').textContent = '';
    $('#save-item').disabled = false;
    $('#image-preview').hidden = !draftImage;
    if (draftImage) $('#image-preview').src = draftImage; else $('#image-preview').removeAttribute('src');
    updatePaletteField();
    editor.showModal();
  }
  $('#editor-form').addEventListener('submit',async event => {
    event.preventDefault();
    if (saving || !isAdmin) return;
    saving = true;
    $('#form-error').textContent = '';
    $('#save-item').disabled = true;
    try {
      const inputColors = $('#item-colors').value.trim();
      const colors = parseColors(inputColors);
      const category = $('#item-category').value;
      if (category === 'palette' && (!colors.length || inputColors.split(/[\s,、]+/).filter(Boolean).length !== colors.length)) throw new Error('カラーコードは # と6桁の英数字で入力してください。最大12色です。');
      const item = normalizeItem({
        id:draftId || crypto.randomUUID(),title:$('#item-title').value,category,
        image:category === 'palette' ? '' : draftImage,colors,
        tags:$('#item-tags').value.split(/[,、]/).map(tag => tag.trim()).filter(Boolean),
        prompt:$('#item-prompt').value,sections:readPromptSections(),notes:$('#item-notes').value,source:$('#item-source').value,
        created:customItems.find(item => item.id === draftId)?.created || Date.now(),
        version:customItems.find(item => item.id === draftId)?.version || 1
      });
      const result = await apiRequest(draftId ? '/api/items/'+encodeURIComponent(draftId) : '/api/items', {
        method:draftId ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(item)
      });
      const next = customItems.filter(record => record.id !== result.item.id);
      next.push(result.item);
      customItems = next;
      currentCategory = category; favoriteOnly = false; searchTerm = ''; $('#search').value = '';
      render(); editor.close(); toast('素材を保存しました');
    } catch (error) {$('#form-error').textContent = error.message || '保存できませんでした。';}
    finally {saving = false;$('#save-item').disabled = false;}
  });
  function addPromptSection(value={}) {
    const host=$('#prompt-sections');
    if(host.children.length>=30){toast('セクションは30個まで追加できます');return;}
    const row=document.createElement('div');row.className='prompt-section-editor';
    row.innerHTML=`<div class="section-fields"><label>英語ラベル<input data-section-label maxlength="80" placeholder="例：APPEARANCE" value="${escapeHtml(value.label||'')}"></label><label>見出し<input data-section-heading maxlength="120" placeholder="例：容姿" value="${escapeHtml(value.heading||'')}"></label><button type="button" class="close-button" aria-label="このセクションを削除">×</button></div><label>プロンプト本文<textarea data-section-text rows="5" maxlength="50000" required placeholder="この項目のプロンプト">${escapeHtml(value.text||'')}</textarea></label>`;
    row.querySelector('button').addEventListener('click',()=>{const next=row.nextElementSibling?.querySelector('input')||row.previousElementSibling?.querySelector('input')||$('#add-section');row.remove();next.focus();});
    host.append(row);
    return row;
  }
  function readPromptSections(){return [...$('#prompt-sections').children].map(row=>{const value={label:row.querySelector('[data-section-label]').value.trim(),heading:row.querySelector('[data-section-heading]').value.trim(),text:row.querySelector('[data-section-text]').value};if(!value.label&&!value.heading)throw new Error('セクションのラベルか見出しを入力してください。');if(!value.text.trim())throw new Error('セクションの本文を入力してください。');return value;});}
  $('#add-section').addEventListener('click',()=>{const row=addPromptSection();row?.querySelector('input').focus();});
  $('#item-image').addEventListener('change',async event => {
    const file = event.target.files[0];
    if (!file) return;
    $('#form-error').textContent = '';
    if (!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type) || file.size > 8*1024*1024) {
      $('#form-error').textContent = '8MB以下のPNG・JPG・WEBP・GIFを選んでください。';
      event.target.value = ''; return;
    }
    $('#save-item').disabled = true;
    try {
      draftImage = await new Promise((resolve,reject) => {const reader = new FileReader();reader.onload = () => resolve(reader.result);reader.onerror = () => reject(new Error('画像を読み込めませんでした。'));reader.readAsDataURL(file);});
      $('#image-preview').src = draftImage; $('#image-preview').hidden = false;
    } catch (error) {$('#form-error').textContent = error.message;}
    finally {$('#save-item').disabled = false;}
  });
  $('#item-category').addEventListener('change',updatePaletteField);
  $('#item-colors').addEventListener('input',updatePaletteField);
  $('#category-nav').addEventListener('click',event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    currentCategory = button.dataset.category; favoriteOnly = false; render();
  });
  $('#favorites-nav').addEventListener('click',() => {favoriteOnly = !favoriteOnly;currentCategory = 'all';render();});
  $('#search').addEventListener('input',event => {searchTerm = event.target.value;render();});
  $('#sort').addEventListener('change',event => {sortOrder = event.target.value;render();});
  $('#cards').addEventListener('click',event => {
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {toggleFavorite(favorite.dataset.favorite);return;}
    const button = event.target.closest('[data-open]');
    if (button) showDetail(button.dataset.open);
  });
  $('#view-comfort').addEventListener('click',() => setView(false));
  $('#view-dense').addEventListener('click',() => setView(true));
  function setView(dense) {
    $('#cards').classList.toggle('dense',dense);
    $('#view-dense').classList.toggle('selected',dense); $('#view-dense').setAttribute('aria-pressed',String(dense));
    $('#view-comfort').classList.toggle('selected',!dense); $('#view-comfort').setAttribute('aria-pressed',String(!dense));
  }
  $('#add-top').addEventListener('click',() => openEditor());
  $('#add-empty').addEventListener('click',() => openEditor());
  $('#close-editor').addEventListener('click',() => editor.close());
  for (const dialog of [detail,editor]) dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  document.addEventListener('keydown',event => {
    if (event.key === '/' && !detail.open && !editor.open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus();}
  });
  /* Images are served directly by the configured storage. */
  document.addEventListener('error',event => {
    const image = event.target;
    if (image.tagName !== 'IMG' || image.dataset.fallback || !image.getAttribute('src') || image.src.startsWith('data:')) return;
    image.dataset.fallback = 'true';
    const name = image.getAttribute('src');
    image.alt = '画像を読み込めませんでした：'+image.alt;
  },true);
  const loginDialog=$('#admin-login-dialog');
  $('#admin-login').addEventListener('click',event=>{event.preventDefault();$('#login-error').textContent='';loginDialog.showModal();});
  $('#close-login').addEventListener('click',()=>loginDialog.close());
  $('#admin-logout').addEventListener('click',async event=>{event.preventDefault();try{await window.OitanBackend.logout();location.reload();}catch(error){toast(error.message);}});
  $('#login-form').addEventListener('submit',async event=>{event.preventDefault();$('#login-submit').disabled=true;try{await window.OitanBackend.login($('#login-email').value,$('#login-password').value);$('#login-password').value='';location.reload();}catch(error){$('#login-error').textContent=error.message;}finally{$('#login-submit').disabled=false;}});
  render();
  Promise.all([apiRequest('/api/session'),apiRequest('/api/items')]).then(([session,result]) => {
    isAdmin = session.isAdmin === true;
    customItems = result.items.map(normalizeItem);
    try { favorites = new Set(JSON.parse(localStorage.getItem('oitan-public-favorites') || '[]')); } catch {favorites = new Set();}
    $('#add-top').hidden = !isAdmin;
    $('#admin-login').hidden = session.signedIn;
    $('#admin-logout').hidden = !session.signedIn;
    loading = false;
    render();
    if(!window.OITAN_CONFIG?.supabaseUrl||!window.OITAN_CONFIG?.publishableKey){$('#empty-title').textContent='保存先の初期設定が必要です';$('#empty-copy').textContent='Supabaseの接続設定が完了すると、公開素材がここに表示されます。';}
  }).catch(error => {
    loading = false;
    $('#empty-state').hidden = true;
    $('#footer-count').textContent = '読み込みに失敗しました。ページを再読み込みしてください。';
    toast(error.message);
  });
})();
