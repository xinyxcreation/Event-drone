const STORAGE='events-drone-user-v7';
const SETTINGS='events-drone-settings-v2';
const CENTER_DEFAULT={lat:47.718,lon:-1.376,name:'Châteaubriant'};
const LEARN_THRESHOLD=3;

const $=s=>document.querySelector(s);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};

let settings=load(SETTINGS,{
  center:{...CENTER_DEFAULT},
  excludedCategories:[],
  favoriteCategories:{},
  favoriteKeywords:{}
});

// Pour cette version stable, le secteur reste volontairement fixe.
settings.center={...CENTER_DEFAULT};
settings.excludedCategories=settings.excludedCategories||[];
settings.favoriteCategories=settings.favoriteCategories||{};
settings.favoriteKeywords=settings.favoriteKeywords||{};

let user=load(STORAGE,{});
let events=[];

function save(){
  localStorage.setItem(STORAGE,JSON.stringify(user));
  localStorage.setItem(SETTINGS,JSON.stringify(settings));
}

function keyCategory(s){
  return String(s||'').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ');
}

function norm(s){
  return String(s||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}

function words(s){
  return norm(s).split(' ').filter(w=>w.length>=5 &&
    !['animation','evenement','evenements','festival','local','locale',
      'association','associations'].includes(w));
}

function hav(a,b,c,d){
  const R=6371,r=x=>x*Math.PI/180;
  const A=Math.sin((c-a)*r/2)**2+
    Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;
  return R*2*Math.atan2(Math.sqrt(A),Math.sqrt(1-A));
}

function fmtDate(d){
  const x=new Date(d+'T12:00:00');
  return isNaN(x)?String(d||'Date inconnue'):
    x.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'});
}

function isExcluded(e){
  return settings.excludedCategories.includes(keyCategory(e.category));
}

function learnedCategory(e){
  return (settings.favoriteCategories[keyCategory(e.category)]||0)>=LEARN_THRESHOLD;
}

function learnedKeyword(e){
  return words(e.title+' '+e.category)
    .some(w=>(settings.favoriteKeywords[w]||0)>=LEARN_THRESHOLD);
}

function basePotential(e){
  if(Number(e.droneScore)>=6 || e.dronePotential==='high') return 2;
  if(Number(e.droneScore)>=3 || e.dronePotential==='medium') return 1;
  return 0;
}

function potential(e){
  if(isExcluded(e)) return 0;
  if(learnedCategory(e)||learnedKeyword(e)) return 3;
  return basePotential(e);
}

function potentialLabel(n){
  return ['—','★ Potentiel','★★ Potentiel élevé','★★★ Très haut potentiel'][n];
}

function potentialClass(n){
  return ['low','medium','high','very-high'][n];
}

function applyUserState(list){
  return list.map(e=>({
    ...e,
    ...(user[e.id]||{}),
    favorite:!!user[e.id]?.favorite,
    contact:user[e.id]?.contact||'todo',
    flight:user[e.id]?.flight||'unknown'
  }));
}

function statusBadge(e){
  return ({
    unknown:'🚁 Non vérifié',
    asked:'🟠 Autorisation demandée',
    accepted:'🟢 Vol accepté',
    refused:'🔴 Vol refusé'
  })[e.flight]||'🚁 Non vérifié';
}

function recalcDistances(){
  for(const e of events){
    if(Number.isFinite(e.latitude)&&Number.isFinite(e.longitude)){
      e.distance=Math.round(
        hav(CENTER_DEFAULT.lat,CENTER_DEFAULT.lon,e.latitude,e.longitude)*10
      )/10;
    }
  }
}

function escapeHtml(s){
  return String(s??'').replace(/[&<>\"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function escapeAttr(s){
  return escapeHtml(s).replace(/`/g,'&#96;');
}

function openModal(html){
  $('#modalContent').innerHTML=html;
  $('#modal').hidden=false;
  document.body.classList.add('modal-open');
}

function closeModal(){
  $('#modal').hidden=true;
  document.body.classList.remove('modal-open');
}

document.addEventListener('click',e=>{
  if(e.target.matches('[data-close-modal]')) closeModal();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && !$('#modal').hidden) closeModal();
});

function favoriteEvent(e,on){
  const was=!!e.favorite;
  e.favorite=on;
  user[e.id]=user[e.id]||{};
  user[e.id].favorite=on;

  // L'apprentissage se fait uniquement lors d'un ajout réel en favori.
  if(on&&!was){
    const c=keyCategory(e.category);
    if(c) settings.favoriteCategories[c]=(settings.favoriteCategories[c]||0)+1;
    for(const w of new Set(words(e.title+' '+e.category))){
      settings.favoriteKeywords[w]=(settings.favoriteKeywords[w]||0)+1;
    }
  }

  save();
  render();
}

function normalize(raw){
  const arr=Array.isArray(raw)?raw:(raw?.events||raw?.data||raw?.results||[]);
  const now=Date.now();
  const end=now+45*86400000;

  return arr.map((o,i)=>{
    const d=new Date(
      o.date||o.date_debut||o.dateDebut||o.startDate||o.start||o.beginAt||''
    );

    if(isNaN(d)||d.getTime()<now||d.getTime()>end) return null;

    const lat=Number(o.latitude??o.lat);
    const lon=Number(o.longitude??o.lon??o.lng);

    return {
      id:String(o.id??o.uid??o.event_id??('api-'+i)),
      date:d.toISOString().slice(0,10),
      title:o.title||o.titre||o.name||o.nomoffre||o.nom||'Événement',
      category:o.category||o.categorie||'',
      place:o.place||o.commune||o.city||o.ville||o.locationName||o.lieu||'Lieu non précisé',
      postalCode:o.postalCode||o.codepostal||'',
      address:o.address||[
        o.adresse1,o.adresse1suite,o.adresse2,o.adresse3
      ].filter(Boolean).join(' '),
      latitude:lat,
      longitude:lon,
      description:o.description||o.desc||o.summary||'',
      distance:999,
      outdoor:o.outdoor??false,
      droneScore:Number(o.droneScore||0),
      dronePotential:o.dronePotential,
      url:o.url||o.website||o.commweb||'',
      phone:o.phone||o.commtel||o.commmob||'',
      email:o.email||o.commmail||'',
      startTime:o.startTime||'',
      endTime:o.endTime||''
    };
  }).filter(Boolean);
}

function openEventDetails(e){
  const level=potential(e);

  openModal(`
    <div class="modal-kicker">${fmtDate(e.date)}${e.startTime?' · '+e.startTime:''}</div>
    <h2>${escapeHtml(e.title)}</h2>
    <p class="modal-place">📍 ${escapeHtml(e.place)}${e.address?' — '+escapeHtml(e.address):''}</p>
    ${e.description?`<p class="modal-description">${escapeHtml(e.description)}</p>`:''}

    <div class="modal-badges">
      <span class="potential-badge ${potentialClass(level)}">${potentialLabel(level)}</span>
      <span>${e.outdoor?'🚁 Extérieur':'🏠 Intérieur'}</span>
      <span>${e.distance} km</span>
      <span>${statusBadge(e)}</span>
    </div>

    <div class="detail-grid">
      ${e.phone?`<a href="tel:${escapeAttr(e.phone)}">📞 ${escapeHtml(e.phone)}</a>`:''}
      ${e.email?`<a href="mailto:${escapeAttr(e.email)}">✉️ ${escapeHtml(e.email)}</a>`:''}
      ${e.url?`<a href="${escapeAttr(e.url)}" target="_blank" rel="noopener">🌐 Site web</a>`:''}
    </div>

    <div class="modal-actions">
      ${isExcluded(e)
        ? '<button class="secondary-action" id="restoreType">Réactiver ce type</button>'
        : '<button class="danger-action" id="excludeType">Ignorer ce type</button>'}
      <button class="primary-action" id="closeDetails">Fermer</button>
    </div>
  `);

  $('#closeDetails').onclick=closeModal;

  if($('#excludeType')){
    $('#excludeType').onclick=()=>{
      const c=keyCategory(e.category);
      if(!settings.excludedCategories.includes(c))
        settings.excludedCategories.push(c);
      save();
      closeModal();
      render();
    };
  }

  if($('#restoreType')){
    $('#restoreType').onclick=()=>{
      settings.excludedCategories=
        settings.excludedCategories.filter(x=>x!==keyCategory(e.category));
      save();
      closeModal();
      render();
    };
  }
}

function statFilter(f){
  $('#statusFilter').value=f;
  render();
  window.scrollTo({
    top:document.querySelector('.filters').offsetTop-8,
    behavior:'smooth'
  });
}

function render(){
  recalcDistances();

  const max=Number($('#distance').value);
  const filter=$('#statusFilter').value;

  let list=events.filter(e=>e.distance<=max);

  if(filter==='outdoor') list=list.filter(e=>e.outdoor);
  if(filter==='star1') list=list.filter(e=>potential(e)===1);
  if(filter==='star2') list=list.filter(e=>potential(e)===2);
  if(filter==='star3') list=list.filter(e=>potential(e)===3);
  if(filter==='fav') list=list.filter(e=>e.favorite);
  if(filter==='todo') list=list.filter(e=>e.contact==='todo');
  if(filter==='contacted') list=list.filter(e=>e.contact==='contacted');
  if(filter==='accepted') list=list.filter(e=>e.flight==='accepted');
  if(filter==='refused') list=list.filter(e=>e.flight==='refused');

  list.sort((a,b)=>
    new Date(a.date)-new Date(b.date)||
    potential(b)-potential(a)||
    a.distance-b.distance
  );

  const within=events.filter(e=>e.distance<=max);

  const stats=[
    ['📅',within.length,'all','Événements'],
    ['🚁',within.filter(e=>e.outdoor).length,'outdoor','Extérieur'],
    ['★',within.filter(e=>potential(e)===1).length,'star1','Potentiel'],
    ['★★',within.filter(e=>potential(e)===2).length,'star2','Potentiel élevé'],
    ['★★★',within.filter(e=>potential(e)===3).length,'star3','Très haut potentiel'],
    ['⭐',within.filter(e=>e.favorite).length,'fav','Favoris'],
    ['📞',within.filter(e=>e.contact==='todo').length,'todo','À contacter']
  ];

  $('#stats').innerHTML=stats.map(s=>`
    <button class="stat ${filter===s[2]?'active':''}" data-filter="${s[2]}">
      <strong>${s[0]} ${s[1]}</strong>
      <small>${s[3]}</small>
    </button>
  `).join('');

  const box=$('#events');

  if(!list.length){
    box.innerHTML='<div class="empty">Aucun événement avec ces filtres.</div>';
    return;
  }

  box.innerHTML=list.map(e=>{
    const l=potential(e);

    return `
      <article class="event">
        <div class="event-top">
          <div>
            <span class="date">
              ${fmtDate(e.date)}${e.startTime?' · '+escapeHtml(e.startTime):''}
            </span>
            <h2 class="title">${escapeHtml(e.title)}</h2>
            <p class="place">📍 ${escapeHtml(e.place)}</p>
          </div>
          <button class="fav" data-id="${escapeAttr(e.id)}" aria-label="Favori">
            ${e.favorite?'★':'☆'}
          </button>
        </div>

        ${e.description?`<p class="description">${escapeHtml(e.description)}</p>`:''}

        <div class="badges">
          <span class="distance-badge">${e.distance} km</span>
          <span class="potential-badge ${potentialClass(l)}">${potentialLabel(l)}</span>
          <span class="outdoor-badge">${e.outdoor?'🚁 Extérieur':'🏠 Intérieur'}</span>
          <span class="contact-badge">${e.contact==='contacted'?'📞 Contacté':'📞 À contacter'}</span>
          <span class="flight-badge">${statusBadge(e)}</span>
        </div>

        <div class="actions">
          <button class="contact" data-action="contact" data-id="${escapeAttr(e.id)}">📞 Contact</button>
          <button class="flight" data-action="flight" data-id="${escapeAttr(e.id)}">🚁 Vol</button>
          <button class="details" data-action="details" data-id="${escapeAttr(e.id)}">Détails</button>
        </div>
      </article>
    `;
  }).join('');
}

document.addEventListener('click',e=>{
  const stat=e.target.closest('[data-filter]');
  if(stat){
    statFilter(stat.dataset.filter);
    return;
  }

  const fav=e.target.closest('.fav');
  if(fav){
    const x=events.find(v=>v.id===fav.dataset.id);
    if(x) favoriteEvent(x,!x.favorite);
    return;
  }

  const action=e.target.closest('[data-action]');
  if(!action) return;

  const x=events.find(v=>v.id===action.dataset.id);
  if(!x) return;

  if(action.dataset.action==='details'){
    openEventDetails(x);
  }

  if(action.dataset.action==='contact'){
    x.contact=x.contact==='contacted'?'todo':'contacted';
    user[x.id]={...(user[x.id]||{}),contact:x.contact};
    save();
    render();
  }

  if(action.dataset.action==='flight'){
    const next={
      unknown:'asked',
      asked:'accepted',
      accepted:'refused',
      refused:'unknown'
    };
    x.flight=next[x.flight]||'asked';
    user[x.id]={...(user[x.id]||{}),flight:x.flight};
    save();
    render();
  }
});

async function loadEvents(){
  const updated=$('#updated');

  try{
    const r=await fetch('events.json?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('events.json '+r.status);

    const raw=await r.json();
    events=applyUserState(normalize(raw));
    recalcDistances();

    updated.textContent=
      `✓ ${events.length} événements · `+
      new Date().toLocaleTimeString('fr-FR',{
        hour:'2-digit',
        minute:'2-digit'
      });

    render();
  }catch(err){
    console.error(err);
    updated.textContent='⚠️ Impossible de charger les événements';
    events=[];
    render();
  }
}

$('#distance').onchange=render;
$('#statusFilter').onchange=render;
$('#refresh').onclick=loadEvents;

loadEvents();
