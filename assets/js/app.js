
const App = {
  dataCache: {},
  async init(){
    if('serviceWorker' in navigator){ try{ await navigator.serviceWorker.register('sw.js'); }catch(e){} }
    this.bind();
    const page = location.pathname.split('/').pop() || 'index.html';
    if(page===''||page==='index.html') this.renderHome();
    if(page==='apps.html') this.renderList('data/apps.json');
    if(page==='os.html') this.renderList('data/os.json');
    if(page==='articles.html') this.renderList('data/articles.json');
    if(page==='search.html') this.renderSearch();
    if(page==='view.html') this.renderView();
  },
  bind(){
    const q = document.getElementById('q');
    const ac = document.getElementById('ac');
    if(q && ac){
      let all = [];
      fetch('data/all.json').then(r=>r.json()).then(d=> all = d.items);
      q.addEventListener('input', ()=>{
        const s = q.value.trim().toLowerCase();
        if(!s){ ac.classList.remove('open'); return; }
        const res = all.filter(i=> (i.title||'').toLowerCase().includes(s) || (i.tags||[]).join(' ').toLowerCase().includes(s)).slice(0,8);
        ac.innerHTML = res.map(i=> `<div class="ac-item" data-id="${i.id}">${i.title}</div>`).join('');
        ac.classList.toggle('open', res.length>0);
      });
      ac.addEventListener('click', e=>{
        const item = e.target.closest('.ac-item'); if(!item) return;
        location.href = `view.html?id=${encodeURIComponent(item.dataset.id)}`;
      });
      document.addEventListener('click', e=>{ if(!ac.contains(e.target) && e.target!==q) ac.classList.remove('open'); });
    }
  },
  async json(url){ if(this.dataCache[url]) return this.dataCache[url]; const r = await fetch(url); const j = await r.json(); this.dataCache[url]=j; return j; },
  starRow(rating=0){ const r = Math.max(0, Math.min(5, rating)); let html=''; for(let i=1;i<=5;i++){ html += `<svg class="star" width="16" height="16" viewBox="0 0 24 24" fill="${i<=r?'#ffd54a':'#384355'}"><path d="M12 .587l3.668 7.431L24 9.748l-6 5.853 1.416 8.26L12 19.771l-7.416 4.09L6 15.6 0 9.748l8.332-1.73z"/></svg>`; } return `<div class="rating">${html}</div>`; },
  tagsRow(tags){ return !tags||!tags.length ? '' : `<div class="tags">${tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>`; },
  card(i){
    const img = (i.images&&i.images[0]) || 'assets/img/ph.png';
    const vidBadge = i.video ? `<span class="tag">Видео-превью</span>` : '';
    return `<article class="card">
      <img class="thumb" src="${img}" alt="">
      <h4>${i.title}</h4>
      ${this.starRow(i.rating||0)}
      <div class="meta">${(i.categories||[]).join(', ')}</div>
      ${this.tagsRow(i.tags||[])}
      <div class="meta">${i.date||''}</div>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <a class="button brand" href="view.html?id=${encodeURIComponent(i.id)}">Подробнее</a>
        ${vidBadge}
      </div>
    </article>`;
  },
  async renderHome(){
    const apps = (await this.json('data/apps.json')).items.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
    document.getElementById('recent-apps').innerHTML = apps.slice(0,6).map(i=> this.card(i)).join('');
    const os = (await this.json('data/os.json')).items;
    document.getElementById('popular-os').innerHTML = os.slice(0,6).map(i=> this.card(i)).join('');
  },
  async renderList(url){
    const data = (await this.json(url)).items;
    const list = document.getElementById('list');
    const sel = document.getElementById('sort');
    function sortItems(mode, arr){
      const a = [...arr];
      if(mode==='date_desc') a.sort((x,y)=> (y.date||'').localeCompare(x.date||''));
      if(mode==='date_asc')  a.sort((x,y)=> (x.date||'').localeCompare(y.date||''));
      if(mode==='title_asc') a.sort((x,y)=> x.title.localeCompare(y.title));
      if(mode==='title_desc')a.sort((x,y)=> y.title.localeCompare(x.title));
      if(mode==='rating_desc')a.sort((x,y)=> (y.rating||0)-(x.rating||0));
      return a;
    }
    function render(){ list.innerHTML = sortItems(sel.value, data).map(i=> App.card(i)).join(''); }
    sel.addEventListener('change', ()=>{ localStorage.setItem('sort', sel.value); render(); });
    sel.value = localStorage.getItem('sort') || 'date_desc';
    render();
  },
  async renderSearch(){
    const q = new URLSearchParams(location.search).get('q')||'';
    const all = (await this.json('data/all.json')).items;
    const res = all.filter(i=> (i.title||'').toLowerCase().includes(q.toLowerCase()) || (i.tags||[]).join(' ').toLowerCase().includes(q.toLowerCase()));
    document.getElementById('results').innerHTML = res.map(i=> this.card(i)).join('') || '<div class="card">Ничего не найдено</div>';
  },
  async renderView(){
    const id = new URLSearchParams(location.search).get('id');
    const all = (await this.json('data/all.json')).items;
    const item = all.find(x=> x.id===id);
    const box  = document.getElementById('viewbox');
    if(!item){ box.innerHTML = '<div class="card">Элемент не найден</div>'; return; }
    const imgs = item.images||[];
    const gal = imgs.length? `<div class="gallery">${imgs.map(s=>`<img src="${s}" data-full="${s}">`).join('')}</div>`:'';
    const videoBtn = item.video? `<button class="button ghost" id="playVideo">▶ Видео-превью</button>`:'';
    const dlLocal = item.file_url? `<a class="button brand" id="openInstaller">⬇ Скачать с AppForge</a>`:'';
    const dlOff  = item.url_official? `<a class="button ghost" href="${item.url_official}" target="_blank" rel="noopener">🌐 Официальный сайт</a>`:'';
    const tags = this.tagsRow(item.tags||[]);
    const rating = this.starRow(item.rating||0);
    const methods = (item.activation_methods||[]).map(m=> `<li>${m}</li>`).join('') or '<li>—</li>';
    box.innerHTML = `
      <div class="view-hero">
        <div class="view-left">
          <h1>${item.title}</h1>
          ${rating}
          <div class="meta">${(item.categories||[]).join(', ')}</div>
          ${tags}
          <p>${item.desc||''}</p>
          ${gal}
        </div>
        <div class="view-right">
          <div class="card">
            <div class="meta"><strong>Загрузки</strong></div>
            <div class="row" style="margin-top:6px">${dlLocal} ${dlOff} ${videoBtn}</div>
            <hr style="border-color:var(--border)">
            <div class="meta"><strong>Методы активации</strong></div>
            <ul style="margin:6px 0 0 18px">${methods}</ul>
          </div>
        </div>
      </div>
      <section class="section"><h3>Похожие</h3></section>
      <div id="related" class="grid"></div>
      <div id="installer" class="installer">
        <h3>Установщик AppForge</h3>
        <p class="meta">Файл: ${item.file_url||'—'}</p>
        <div class="row"><input type="checkbox" id="shortcut"><label for="shortcut">Создать ярлык на рабочем столе</label></div>
        <div class="row"><progress id="prog" value="0" max="100" style="width:100%"></progress></div>
        <div class="row"><button class="button brand" id="doInstall">Установить</button><button class="button ghost" id="closeInstaller">Отмена</button></div>
      </div>
      <div id="lightbox" class="lightbox"><img alt=""></div>
    `;
    // lightbox (images)
    const lb = document.getElementById('lightbox'); const lbImg = lb.querySelector('img');
    box.querySelectorAll('.gallery img').forEach(im=> im.addEventListener('click', ()=>{ lbImg.src = im.dataset.full; lb.classList.add('open'); }));
    lb.addEventListener('click', ()=> lb.classList.remove('open'));
    // related
    const rel = all.filter(x=> x.id!==item.id && (x.categories||[]).some(c=> (item.categories||[]).includes(c))).slice(0,4);
    document.getElementById('related').innerHTML = rel.map(i=> this.card(i)).join('');
    // video
    if(item.video){
      document.getElementById('playVideo').addEventListener('click', ()=>{
        lb.innerHTML = `<video src="${item.video}" controls autoplay></video>`; lb.classList.add('open');
      });
    }
    // installer modal
    const inst = document.getElementById('installer');
    const openBtn = document.getElementById('openInstaller');
    const closeBtn= document.getElementById('closeInstaller');
    const doBtn   = document.getElementById('doInstall');
    openBtn && openBtn.addEventListener('click', ()=> inst.classList.add('open'));
    closeBtn && closeBtn.addEventListener('click', ()=> inst.classList.remove('open'));
    doBtn && doBtn.addEventListener('click', async ()=>{
      const prog = document.getElementById('prog');
      prog.value = 0;
      for(let i=0;i<=100;i+=5){ await new Promise(r=>setTimeout(r,40)); prog.value=i; }
      inst.classList.remove('open');
      const a = document.createElement('a'); a.href=item.file_url; a.download=''; a.click();
    });
  }
};
document.addEventListener('DOMContentLoaded', ()=> App.init());
