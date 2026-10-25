(() => {
  const characters = (window.ARCHIVE_DATA?.characters || []).filter(c => c && c.name && ["代理", "OC"].includes(c.kind));
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const tag = value => `<span class="tag">${esc(value)}</span>`;
  const page = document.body.dataset.page || "all";
  const pageInfo = {
    all: { title: "All Characters", eyebrow: "THE COMPLETE INDEX", kind: null },
    proxy: { title: "代理", eyebrow: "PERSONAL AVATARS", kind: "代理" },
    oc: { title: "OC", eyebrow: "ORIGINAL CHARACTERS", kind: "OC" }
  }[page] || { title: "All Characters", eyebrow: "THE COMPLETE INDEX", kind: null };
  let toastTimer;

  if (page === "character") {
    renderCharacterFile();
    return;
  }

  $("#page-title").textContent = pageInfo.title;
  $("#page-eyebrow").textContent = pageInfo.eyebrow;
  document.querySelectorAll("[data-nav]").forEach(link => {
    if (link.dataset.nav === page) { link.classList.add("active"); link.setAttribute("aria-current", "page"); }
  });

  function renderCard(c) {
    const searchText = `${c.name} ${c.summary || ""} ${c.profile || ""} ${(c.promptTags || []).join(" ")}`.toLocaleLowerCase("ja");
    const portrait = c.image
      ? `<img src="images/${esc(c.image)}" alt="${esc(c.name)}" loading="lazy">`
      : `<span class="portrait-placeholder"><i>${esc(c.name.slice(0, 1))}</i><small>PORTRAIT<br>NOT SET</small></span>`;
    const note = c.summary ? `<span class="card-summary">${esc(c.summary)}</span>` : "";
    const badges = (c.promptTags || []).slice(0, 2).map(tag).join("");
    return `<a class="character-card ${c.kind === "OC" ? "oc-card" : "proxy-card"}" href="character.html?id=${encodeURIComponent(c.id)}" data-search="${esc(searchText)}">
      <span class="card-portrait">${portrait}<span class="portrait-index">NO. ${esc(c.no || "—")}</span><span class="portrait-open">PROMPT +</span></span>
      <span class="card-info"><span class="card-title-row"><span class="card-name">${esc(c.name)}</span><span class="card-kind">${c.kind === "OC" ? "OC" : "代理"}</span></span>${note}<span class="card-bottom"><span class="card-tags">${badges}</span><span class="card-arrow">↗</span></span></span>
    </a>`;
  }

  function render() {
    const visible = characters.filter(c => !pageInfo.kind || c.kind === pageInfo.kind);
    $("#character-grid").innerHTML = visible.map(renderCard).join("");
    $("#character-count").textContent = `${String(visible.length).padStart(2, "0")} CHARACTERS`;
    $("#no-results").hidden = visible.length > 0;
    // Cards navigate to a dedicated prompt record page.
  }

  function openCharacter(c) {
    if (!c) return;
    const image = c.image ? `<img class="detail-cover" src="images/${esc(c.image)}" alt="${esc(c.name)}">` : "";
    const profile = c.profile || c.summary || "プロフィールはまだ登録されていません。";
    const prompt = c.prompt ? `<section class="detail-block"><div class="detail-block-head"><div><p class="eyebrow">PROMPT / COPY</p><h3>生成プロンプト</h3></div><button class="action-button" id="copy-prompt">プロンプトをコピー <span>↗</span></button></div><div class="prompt-tags">${(c.promptTags || []).map(tag).join("")}</div><pre>${esc(c.prompt)}</pre></section>` : "";
    $("#dialog-content").innerHTML = `<p class="eyebrow">${c.kind === "OC" ? "ORIGINAL CHARACTER" : "PERSONAL AVATAR"} / FILE NO.${esc(c.no || "—")}</p><div class="detail-title-row"><h2 id="dialog-name">${esc(c.name)}</h2><span class="detail-kind ${c.kind === "OC" ? "oc-kind" : "proxy-kind"}">${c.kind === "OC" ? "OC" : "代理"}</span></div>${image}<section class="detail-block profile-block"><div class="detail-block-head"><div><p class="eyebrow">PROFILE</p><h3>プロフィール</h3></div><button class="action-button" id="copy-profile">プロフィールをコピー <span>↗</span></button></div><p class="detail-copy">${esc(profile)}</p></section>${prompt}`;
    $("#character-dialog").showModal();
    $("#copy-profile").addEventListener("click", () => copyText(profile, "PROFILE COPIED"));
    const promptButton = $("#copy-prompt");
    if (promptButton) promptButton.addEventListener("click", () => copyText(c.prompt, "PROMPT COPIED"));
  }

  async function copyText(text, message) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const area = document.createElement("textarea");
      area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
      document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
    }
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 1500);
  }

  function renderCharacterFile() {
    const id = new URLSearchParams(location.search).get("id");
    const c = characters.find(item => item.id === id);
    const content = document.querySelector("#character-file-content");
    if (!c || !content) {
      if (content) content.innerHTML = `<div class="file-not-found"><p class="eyebrow">RECORD NOT FOUND</p><h1>キャラクターが見つかりません</h1><a class="file-back" href="index.html">← 一覧へ戻る</a></div>`;
      return;
    }
    const portrait = c.image
      ? `<img src="images/${esc(c.image)}" alt="${esc(c.name)}">`
      : `<div class="file-portrait-placeholder"><span>${esc(c.name.slice(0,1))}</span><small>PORTRAIT / ${esc(c.no || "—")}</small></div>`;
    const appearance = c.appearancePrompt || c.prompt || "容姿プロンプトはまだ登録されていません。";
    const outfit = c.outfitPrompt || "服装プロンプトはまだ登録されていません。";
    const kindPage = c.kind === "代理" ? "proxy.html" : "oc.html";
    const promptBox = (type, label, title, value, tags) => `<section class="spec-block"><div class="spec-head"><div><p class="eyebrow">PROMPT DATA / ${type}</p><h2>${label}</h2></div><span class="spec-index">TXT / ${esc(c.no || "—")}</span></div>${tags?.length ? `<div class="prompt-tags">${tags.map(tag).join("")}</div>` : ""}<pre class="spec-prompt">${esc(value)}</pre><button class="copy-wide" type="button" data-copy="${type}">▣　COPY ${title} TO CLIPBOARD ↗</button></section>`;
    content.innerHTML = `<a class="file-back" href="${kindPage}">← BACK TO ${c.kind === "代理" ? "代理" : "OC"} INDEX</a><div class="record-meta"><span>CHARACTER RECORD / ${esc(c.no || "—")}</span><span>STATUS: AVAILABLE</span></div><div class="character-file-layout"><div class="file-portrait">${portrait}</div><div class="file-information"><p class="eyebrow">SPECIMEN NO. ${esc(c.no || "—")} / ${c.kind === "OC" ? "ORIGINAL CHARACTER" : "PERSONAL AVATAR"}</p><h1>${esc(c.name)}</h1><div class="file-summary">${esc(c.summary || c.profile || "")}</div><div class="file-tags">${(c.promptTags || []).map(tag).join("")}</div>${promptBox("APPEARANCE", "容姿", "APPEARANCE", appearance, c.appearanceTags || c.promptTags)}${promptBox("OUTFIT", "服装", "OUTFIT", outfit, c.outfitTags || [])}</div></div>`;
    content.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", () => {
      const value = button.dataset.copy === "APPEARANCE" ? appearance : outfit;
      copyText(value, `${button.dataset.copy} COPIED`);
    }));
  }

  $(".dialog-close").addEventListener("click", () => $("#character-dialog").close());
  $("#character-dialog").addEventListener("click", event => { if (event.target === $("#character-dialog")) $("#character-dialog").close(); });
  render();
})();
