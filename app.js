(() => {
  const characters = (window.ARCHIVE_DATA?.characters || []).filter(c => c && c.name && ["代理", "OC"].includes(c.kind));
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const tag = value => `<span class="tag">${esc(value)}</span>`;
  let toastTimer;

  function renderCard(c) {
    const searchText = `${c.name} ${c.summary || ""} ${c.profile || ""} ${(c.promptTags || []).join(" ")}`.toLowerCase();
    const portrait = c.image
      ? `<img src="images/${esc(c.image)}" alt="${esc(c.name)}" loading="lazy">`
      : `<span class="portrait-placeholder"><i>${esc(c.name.slice(0, 1))}</i><small>PORTRAIT<br>NOT SET</small></span>`;
    const note = c.summary ? `<p class="card-summary">${esc(c.summary)}</p>` : "";
    const badges = (c.promptTags || []).slice(0, 2).map(tag).join("");
    return `<button class="character-card ${c.kind === "OC" ? "oc-card" : "proxy-card"}" type="button" data-id="${esc(c.id)}" data-search="${esc(searchText)}">
      <span class="card-portrait">${portrait}<span class="portrait-index">NO. ${esc(c.no || "—")}</span><span class="portrait-open">OPEN FILE ↗</span></span>
      <span class="card-info"><span class="card-title-row"><span class="card-name">${esc(c.name)}</span><span class="card-kind">${c.kind === "OC" ? "OC" : "PROXY"}</span></span>${note}<span class="card-bottom"><span class="card-tags">${badges}</span><span class="card-arrow">↗</span></span></span>
    </button>`;
  }

  function render() {
    const query = $("#character-search").value.trim().toLocaleLowerCase("ja");
    const filtered = characters.filter(c => `${c.name} ${c.summary || ""} ${c.profile || ""} ${(c.promptTags || []).join(" ")}`.toLocaleLowerCase("ja").includes(query));
    const groups = [
      { kind: "代理", grid: "#proxy-grid", count: "#proxy-count", navCount: "#proxy-nav-count", empty: "#proxy-empty" },
      { kind: "OC", grid: "#oc-grid", count: "#oc-count", navCount: "#oc-nav-count", empty: "#oc-empty" }
    ];
    groups.forEach(group => {
      const list = filtered.filter(c => c.kind === group.kind);
      $(group.grid).innerHTML = list.map(renderCard).join("");
      $(group.count).textContent = `${String(list.length).padStart(2, "0")} CHARACTERS`;
      $(group.navCount).textContent = String(characters.filter(c => c.kind === group.kind).length).padStart(2, "0");
      $(group.empty).hidden = list.length > 0 || query !== "";
      document.querySelector(group.grid).closest(".character-section").hidden = !list.length && !!query;
    });
    $("#no-results").hidden = filtered.length > 0;
    document.querySelectorAll(".character-card").forEach(card => card.addEventListener("click", () => openCharacter(characters.find(c => c.id === card.dataset.id))));
  }

  function openCharacter(c) {
    if (!c) return;
    const image = c.image ? `<img class="detail-cover" src="images/${esc(c.image)}" alt="${esc(c.name)}">` : "";
    const profile = c.profile || c.summary || "プロフィールはまだ登録されていません。";
    const prompt = c.prompt ? `<section class="detail-block"><div class="detail-block-head"><div><p class="eyebrow">PROMPT / COPY</p><h3>生成プロンプト</h3></div><button class="action-button" id="copy-prompt">プロンプトをコピー <span>↗</span></button></div><div class="prompt-tags">${(c.promptTags || []).map(tag).join("")}</div><pre>${esc(c.prompt)}</pre></section>` : "";
    $("#dialog-content").innerHTML = `<p class="eyebrow">${c.kind === "OC" ? "ORIGINAL CHARACTER" : "PERSONAL AVATAR"} / FILE NO.${esc(c.no || "—")}</p><div class="detail-title-row"><h2 id="dialog-name">${esc(c.name)}</h2><span class="detail-kind ${c.kind === "OC" ? "oc-kind" : "proxy-kind"}">${c.kind === "OC" ? "OC" : "PROXY"}</span></div>${image}<section class="detail-block profile-block"><div class="detail-block-head"><div><p class="eyebrow">PROFILE</p><h3>プロフィール</h3></div><button class="action-button" id="copy-profile">プロフィールをコピー <span>↗</span></button></div><p class="detail-copy">${esc(profile)}</p></section>${prompt}`;
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

  $("#character-search").addEventListener("input", render);
  $(".dialog-close").addEventListener("click", () => $("#character-dialog").close());
  $("#character-dialog").addEventListener("click", event => { if (event.target === $("#character-dialog")) $("#character-dialog").close(); });
  render();
})();
