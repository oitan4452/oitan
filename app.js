(() => {
  const data = window.ARCHIVE_DATA || { characters: [], stories: [], prompts: [] };
  const $ = (s) => document.querySelector(s);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const tag = (text, kind = "") => `<span class="tag ${kind.toLowerCase() === "代理" ? "proxy" : kind.toLowerCase() === "oc" ? "oc" : ""}">${esc(text)}</span>`;
  const characterGrid = $("#character-grid");
  const filterHost = $("#character-filters");
  let activeKind = "すべて";
  const kinds = ["すべて", ...new Set(data.characters.map(c => c.kind).filter(Boolean))];
  filterHost.innerHTML = kinds.map(k => `<button class="filter-btn ${k === activeKind ? "active" : ""}" data-kind="${esc(k)}">${esc(k)}</button>`).join("");
  function renderCharacters() {
    const query = $("#character-search").value.trim().toLowerCase();
    const items = data.characters.filter(c => (activeKind === "すべて" || c.kind === activeKind) && `${c.name} ${c.summary} ${c.kind}`.toLowerCase().includes(query));
    $("#character-count").textContent = `${String(items.length).padStart(2,"0")} FILES`;
    characterGrid.innerHTML = items.map(c => `<article class="character-card" data-id="${esc(c.id)}" tabindex="0" role="button" aria-label="${esc(c.name)}のプロフィールを開く">
      <div class="portrait">${c.image ? `<img src="images/${esc(c.image)}" alt="${esc(c.name)}">` : `<span class="portrait-placeholder">${esc(c.name.slice(0,1))}</span>`}</div>
      <div class="card-meta"><h3>${esc(c.name)}</h3><span class="card-no">NO.${esc(c.no)}</span></div>
      <div class="card-tags">${tag(c.kind, c.kind)}${(c.promptTags || []).slice(0,2).map(t => tag(t)).join("")}</div>
    </article>`).join("");
    characterGrid.querySelectorAll(".character-card").forEach(card => {
      const open = () => showCharacter(data.characters.find(c => c.id === card.dataset.id));
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }
  function showCharacter(c) {
    if (!c) return;
    const promptBlock = c.prompt ? `<div class="detail-prompt"><p class="eyebrow">PROMPT / COPY</p><div class="prompt-tags">${(c.promptTags || []).map(t => tag(t)).join("")}</div><pre>${esc(c.prompt)}</pre><button class="copy-btn" data-copy="${esc(c.id)}">COPY PROMPT</button></div>` : "";
    $("#dialog-content").innerHTML = `<p class="eyebrow">CHARACTER FILE / NO.${esc(c.no)}</p><h2>${esc(c.name)}</h2>${c.image ? `<img class="detail-cover" src="images/${esc(c.image)}" alt="${esc(c.name)}">` : ""}<div class="card-tags">${tag(c.kind,c.kind)}</div><p class="detail-copy">${esc(c.profile || c.summary || "プロフィールをdata.jsに入力してください")}</p>${promptBlock}`;
    $("#character-dialog").showModal();
    const copy = $("#dialog-content [data-copy]");
    if (copy) copy.addEventListener("click", () => copyText(c.prompt));
  }
  filterHost.addEventListener("click", e => {
    const btn = e.target.closest("[data-kind]"); if (!btn) return;
    activeKind = btn.dataset.kind;
    filterHost.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b === btn));
    renderCharacters();
  });
  $("#character-search").addEventListener("input", renderCharacters);
  $(".dialog-close").addEventListener("click", () => $("#character-dialog").close());
  $("#character-dialog").addEventListener("click", e => { if (e.target === $("#character-dialog")) $("#character-dialog").close(); });
  function renderStories() {
    const host = $("#story-grid");
    $("#story-count").textContent = `${String(data.stories.length).padStart(2,"0")} FILES`;
    $("#story-empty").hidden = data.stories.length > 0;
    host.innerHTML = data.stories.map((s, i) => `<article class="story-card"><div><p class="eyebrow">PLOT FILE / ${String(i+1).padStart(3,"0")}</p><h3>${esc(s.title)}</h3><p>${esc(s.summary || "")}</p><div class="card-tags">${(s.tags || []).map(t=>tag(t)).join("")}</div></div><span class="story-arrow">↗</span></article>`).join("");
  }
  function renderPrompts() {
    const host = $("#prompt-grid");
    const items = data.prompts.filter(p => p.text);
    $("#prompt-empty").hidden = items.length > 0;
    host.innerHTML = items.map(p => `<article class="prompt-card"><p class="eyebrow">PROMPT FILE</p><h3>${esc(p.title)}</h3><div class="prompt-tags">${(p.tags || []).map(t=>tag(t)).join("")}</div><div class="prompt-preview">${esc(p.text)}</div><button class="copy-btn">COPY PROMPT</button></article>`).join("");
    host.querySelectorAll(".copy-btn").forEach((b,i)=>b.addEventListener("click",()=>copyText(items[i].text)));
  }
  let toastTimer;
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove(); }
    const toast=$("#toast");toast.textContent="PROMPT COPIED";toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),1500);
  }
  renderCharacters(); renderStories(); renderPrompts();
})();
