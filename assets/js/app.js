
const I18N = {
  dict: {},
  current: 'ru',
  async load(lang){
    const r = await fetch(`i18n/${lang}.json`);
    I18N.dict = await r.json();
    I18N.current = lang;
    I18N.apply();
    localStorage.setItem('lang', lang);
  },
  t(key, fallback=''){
    return I18N.dict[key] || fallback || key;
  },
  apply(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const k = el.getAttribute('data-i18n');
      el.textContent = I18N.t(k, el.textContent);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const k = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', I18N.t(k, el.getAttribute('placeholder')));
    });
  }
};

const Favorites = {
  key: 'appforge-fav',
  get(){ try{ return new Set(JSON.parse(localStorage.getItem(Favorites.key) || '[]')); }catch(e){ return new Set(); } },
  save(s){ localStorage.setItem(Favorites.key, JSON.stringify([...s])); },
  has(id){ return Favorites.get().has(id); },
  toggle(id, btn){
    const s = Favorites.get();
    if(s.has(id)){ s.delete(id); btn.textContent=I18N.t('fav_add','★ В избранное'); }
    else { s.add(id); btn.textContent=I18N.t('fav_in','✓ В избранном'); }
    Favorites.save(s);
  }
};

const Site = {
  async loadJSON(p){ const r = await fetch(p); return r.json(); },
  img(i){ return (i.images && i.images[0]) || 'assets/img/ph.png'; },
  card(i){
    const cats = (i.categories||[]).join(', ');
    const fav = Favorites.has(i.id) ? I18N.t('fav_in','✓ В избранном') : I18N.t('fav_add','★ В избранное');
    return `<article class="card" itemscope itemtype="https://schema.org/SoftwareApplication">
      <img class="thumb" loading="lazy" src="${Site.img(i)}" alt="" itemprop="image"/>
      <a href="view.html?id=${encodeURIComponent(i.id)}"><h4 itemprop="name">${i.title}</h4></a>
      <div class="meta">${cats}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        ${i.url?`<a class="button" href="${i.url}" target="_blank" rel="nofollow noopener" itemprop="downloadUrl">⬇ ${I18N.t('download','Скачать')}</a>`:''}
        <button class="button" onclick="Favorites.toggle('${i.id}', this)">${fav}</button>
      </div>
    </article>`;
  },
  async list(sel, src, fn=()=>true){
    const el = document.querySelector(sel);
    const data = await Site.loadJSON(src);
    const items = data.items.filter(fn);
    el.innerHTML = items.map(Site.card).join('') || `<div class="card">${I18N.t('nothing','Ничего не найдено')}</div>`;
  },
  searchRedirect(e){
    e.preventDefault();
    const q = document.getElementById('q').value.trim();
    const dest = new URL('search.html', location.href);
    if(q) dest.searchParams.set('q', q);
    location.href = dest.toString(); return false;
  },
  highlight(txt, q){
    if(!q) return txt;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'ig');
    return txt.replace(re, m=> `<span class="hl">${m}</span>`);
  },
  async autocomplete(){
    const ac = document.getElementById('ac');
    const inp = document.getElementById('q');
    const all = (await Site.loadJSON('data/all.json')).items;
    let open = false;
    function show(items){
      ac.innerHTML = items.slice(0,10).map(i=>`<div class="ac-item" data-id="${i.id}">${Site.highlight(i.title, inp.value)}</div>`).join('');
      ac.classList.toggle('open', items.length>0);
      open = items.length>0;
    }
    inp.addEventListener('input', ()=>{
      const q = inp.value.trim().toLowerCase();
      if(!q){ ac.classList.remove('open'); return; }
      const res = all.filter(i => i.title.toLowerCase().includes(q) || (i.categories||[]).join(' ').toLowerCase().includes(q));
      show(res);
    });
    ac.addEventListener('click', (e)=>{
      const it = e.target.closest('.ac-item'); if(!it) return;
      const id = it.getAttribute('data-id');
      location.href = `view.html?id=${encodeURIComponent(id)}`;
    });
    document.addEventListener('click', (e)=>{ if(!ac.contains(e.target) && e.target!==inp){ ac.classList.remove('open'); } });
  },
  async favoritesPage(){
    const fav = Favorites.get();
    const all = (await Site.loadJSON('data/all.json')).items;
    const res = all.filter(i => fav.has(i.id));
    const el = document.querySelector('#fav');
    el.innerHTML = res.map(Site.card).join('') || `<div class="card">${I18N.t('fav_empty','Пока пусто')}</div>`;
  },
  async viewPage(){
    const id = new URLSearchParams(location.search).get('id');
    const all = (await Site.loadJSON('data/all.json')).items;
    const item = all.find(x=>x.id===id);
    const box = document.getElementById('viewbox');
    if(!item){ box.innerHTML = `<div class="card">${I18N.t('notfound','Элемент не найден')}</div>`; return; }
    const cats = (item.categories||[]).join(', ');
    const images = (item.images||[]);
    const fav = Favorites.has(item.id) ? I18N.t('fav_in','✓ В избранном') : I18N.t('fav_add','★ В избранное');
    box.innerHTML = `<article class="card">
      <h2>${item.title}</h2>
      <div class="meta">${cats}</div>
      <div class="gallery">${images.map(src=>`<img src="${src}" alt="" data-full="${src}">`).join('')}</div>
      <p>${item.desc||''}</p>
      <div style="display:flex;gap:8px;margin-top:8px">
        ${item.url?`<a class="button" href="${item.url}" target="_blank" rel="nofollow noopener">⬇ ${I18N.t('download','Скачать')}</a>`:''}
        <button class="button" id="favBtn">${fav}</button>
      </div>
    </article>`;
    // gallery lightbox
    const lb = document.getElementById('lightbox'); const lbimg = lb.querySelector('img');
    box.querySelectorAll('.gallery img').forEach(img=> img.addEventListener('click', ()=>{ lbimg.src = img.dataset.full; lb.classList.add('open'); }));
    // favorites
    document.getElementById('favBtn').onclick = ()=> Favorites.toggle(item.id, document.getElementById('favBtn'));
    // related
    const related = all.filter(x => x.id!==item.id && (x.categories||[]).some(c => (item.categories||[]).includes(c))).slice(0,4);
    document.getElementById('related').innerHTML = related.map(Site.card).join('');
  }
};

document.addEventListener('DOMContentLoaded', async ()=>{
  // Lang init
  const saved = localStorage.getItem('lang') || (navigator.language||'ru').slice(0,2);
  const lang = (saved==='en') ? 'en' : 'ru';
  await I18N.load(lang);
  const sel = document.getElementById('langToggle'); if(sel){ sel.value = lang; sel.onchange = ()=> I18N.load(sel.value); }
  // Autocomplete on all pages
  Site.autocomplete();
});
