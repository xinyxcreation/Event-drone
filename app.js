const STORAGE='events-drone-user-v7';
const SETTINGS='events-drone-settings-v2';
const CENTER_DEFAULT={lat:47.718,lon:-1.376,name:'Châteaubriant'};
const LEARN_THRESHOLD=3;

const fallback=[
{id:'local-1',date:'2026-08-23',title:'Fanfare Tzila Brass',category:'Animation musicale',place:'Châteaubriant',postalCode:'44110',latitude:47.718,longitude:-1.376,description:'Animation musicale en plein air.',outdoor:true,droneScore:8},
{id:'local-2',date:'2026-08-28',title:'Ciné plein-air – Un p’tit truc en plus',category:'Ciné plein-air',place:'Châteaubriant',postalCode:'44110',latitude:47.718,longitude:-1.376,address:'Promenade du Duc d’Aumale',startTime:'21:00',description:'Projection en plein air.',outdoor:true,droneScore:10},
{id:'local-3',date:'2026-08-29',title:'Forum des associations',category:'Forum / associations',place:'Châteaubriant',postalCode:'44110',latitude:47.718,longitude:-1.376,address:'Halle de Béré',description:'Près de 100 associations.',outdoor:true,droneScore:8},
{id:'local-4',date:'2026-09-05',title:'Nozay s’Expose !',category:'Animation locale / exposition',place:'Nozay',postalCode:'44170',latitude:47.5642,longitude:-1.615,description:'Artisans, associations, braderie, vide-grenier et animations.',outdoor:true,droneScore:10},
{id:'local-5',date:'2026-09-06',title:'Vide-grenier',category:'Brocante / vide-grenier',place:'Châteaubriant',postalCode:'44110',latitude:47.718,longitude:-1.376,address:'Halle de Béré',description:'Vide-grenier.',outdoor:true,droneScore:8},
{id:'local-6',date:'2026-09-06',title:'Vide-grenier + fête des résidents',category:'Fête locale',place:'Pouancé / Ombrée d’Anjou',postalCode:'49420',latitude:47.739,longitude:-1.176,description:'Animations locales.',outdoor:true,droneScore:10},
{id:'local-7',date:'2026-09-06',title:'Route 44 et ses motards',category:'Rassemblement / animation',place:'Sion-les-Mines',postalCode:'44590',latitude:47.7332,longitude:-1.5916,description:'Rassemblement / vide-grenier.',outdoor:true,droneScore:10}
];

const $=s=>document.querySelector(s);
const load=(key,def)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??def}catch{return def}};
let settings=load(SETTINGS,{center:{...CENTER_DEFAULT},excludedCategories:[],favoriteCategories:{},favoriteKeywords:{}});
settings.center=settings.center||{...CENTER_DEFAULT};
settings.excludedCategories=settings.excludedCategories||[];
settings.favoriteCategories=settings.favoriteCategories||{};
settings.favoriteKeywords=settings.favoriteKeywords||{};
let user=load(STORAGE,{});
let events=[];

function save(){localStorage.setItem(STORAGE,JSON.stringify(user));localStorage.setItem(SETTINGS,JSON.stringify(settings))}
function keyCategory(s){return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function words(s){return norm(s).split(' ').filter(w=>w.length>=5&&!['animation','evenement','evenements','festival','local','locale','association','associations'].includes(w))}
function hav(a,b,c,d){const R=6371,r=x=>x*Math.PI/180;const A=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return R*2*Math.atan2(Math.sqrt(A),Math.sqrt(1-A))}
function fmtDate(d){const x=new Date(d+'T12:00:00');return isNaN(x)?String(d||'Date inconnue'):x.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'})}
function applyUserState(list){return list.map(e=>({...e,...(user[e.id]||{}),favorite:!!user[e.id]?.favorite,contact:user[e.id]?.contact||'todo',flight:user[e.id]?.flight||'unknown'}))}
function isExcluded(e){return settings.excludedCategories.includes(keyCategory(e.category))}
function learnedCategory(e){return (settings.favoriteCategories[keyCategory(e.category)]||0)>=LEARN_THRESHOLD}
function learnedKeyword(e){return words(e.title+' '+e.category).some(w=>(settings.favoriteKeywords[w]||0)>=LEARN_THRESHOLD)}
function basePotential(e){
  if(Number(e.droneScore)>=6||e.dronePotential==='high')return 2;
  if(Number(e.droneScore)>=3||e.dronePotential==='medium')return 1;
  return 0;
}
function potential(e){
  if(isExcluded(e))return 0;
  if(learnedCategory(e)||learnedKeyword(e))return 3;
  return basePotential(e);
}
function potentialLabel(level){return ['—','★ Potentiel','★★ Potentiel élevé','★★★ Très haut potentiel'][level]}
function potentialClass(level){return ['low','medium','high','very-high'][level]}
function favoriteEvent(e,on){
  const was=!!e.favorite;e.favorite=on;
  if(on&&!was){
    const c=keyCategory(e.category);
    if(c)settings.favoriteCategories[c]=(settings.favoriteCategories[c]||0)+1;
    for(const w of new Set(words(e.title+' '+e.category)))settings.favoriteKeywords[w]=(settings.favoriteKeywords[w]||0)+1;
  }
  save();render();
}
function statusBadge(e){return ({unknown:'🚁 Non vérifié',asked:'🟠 Autorisation demandée',accepted:'🟢 Vol accepté',refused:'🔴 Vol refusé'})[e.flight]||'🚁 Non vérifié'}
function recalcDistances(){for(const e of events)if(Number.isFinite(Number(e.latitude))&&Number.isFinite(Number(e.longitude)))e.distance=Math.round(hav(settings.center.lat,settings.center.lon,Number(e.latitude),Number(e.longitude))*10)/10}

function openModal(html){
  $('#modalContent').innerHTML=html;$('#modal').hidden=false;document.body.classList.add('modal-open');
}
function closeModal(){ $('#modal').hidden=true;document.body.classList.remove('modal-open') }
document.addEventListener('click',e=>{if(e.target.matches('[data-close-modal]'))closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden)closeModal()});

function showPrefs(){
  const learned=Object.entries(settings.favoriteCategories).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  const excluded=settings.excludedCategories;
  openModal(`
    <div class="modal-kicker">APPRENTISSAGE</div>
    <h2>Mes préférences</h2>
    <p class="modal-intro">L'application apprend les types d'événements que tu ajoutes en favoris.</p>
    <div class="preference-list">
      ${learned.length?learned.map(([c,n])=>`<div class="preference-row"><span>${n>=LEARN_THRESHOLD?'★★★':'★'} ${c}</span><b>${n}</b></div>`).join(''):'<div class="empty-mini">Aucun type appris pour le moment.</div>'}
    </div>
    <h3>Types ignorés</h3>
    ${excluded.length?`<div class="preference-list">${excluded.map(c=>`<div class="preference-row"><span>🚫 ${c}</span><button class="small-action restore-category" data-category="${encodeURIComponent(c)}">Réactiver</button></div>`).join('')}</div>`:'<div class="empty-mini">Aucun type ignoré.</div>'}
  `);
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('.restore-category');
  if(!btn)return;
  const c=decodeURIComponent(btn.dataset.category);
  settings.excludedCategories=settings.excludedCategories.filter(x=>x!==c);
  save();showPrefs();render();
});

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
        ? `<button class="secondary-action" id="restoreType">Réactiver ce type</button>`
        : `<button class="danger-action" id="excludeType">Ignorer ce type</button>`}
      <button class="primary-action" id="closeDetails">Fermer</button>
    </div>
  `);
  $('#closeDetails').onclick=closeModal;
  if($('#excludeType'))$('#excludeType').onclick=()=>{settings.excludedCategories.push(keyCategory(e.category));save();closeModal();render()};
  if($('#restoreType'))$('#restoreType').onclick=()=>{settings.excludedCategories=settings.excludedCategories.filter(x=>x!==keyCategory(e.category));save();closeModal();render()};
}

function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escapeAttr(s){return escapeHtml(s).replace(/`/g,'&#96;')}

function normalize(raw){
  const arr=Array.isArray(raw)?raw:(raw?.events||raw?.data||raw?.results||[]);
  const now=Date.now(),end=now+45*86400000;
  return arr.map((o,i)=>{
    const d=new Date(o.date||o.date_debut||o.dateDebut||o.startDate||o.start||o.beginAt||'');
    if(isNaN(d)||d.getTime()<now||d.getTime()>end)return null;
    const lat=Number(o.latitude??o.lat),lon=Number(o.longitude??o.lon??o.lng);
    return {
      id:String(o.id??o.uid??o.event_id??('api-'+i+'-'+(o.title||o.nomoffre||'event'))),
      date:d.toISOString().slice(0,10),
      title:o.title||o.titre||o.name||o.nomoffre||o.nom||'Événement',
      category:o.category||o.categorie||'',
      place:o.place||o.commune||o.city||o.ville||o.locationName||o.lieu||'Lieu non précisé',
      postalCode:o.postalCode||o.codepostal||'',
      address:o.address||[o.adresse1,o.adresse1suite,o.adresse2,o.adresse3].filter(Boolean).join(' '),
      latitude:lat,longitude:lon,
      description:o.description||o.desc||o.summary||'',
      distance:Number.isFinite(lat)&&Number.isFinite(lon)?hav(settings.center.lat,settings.center.lon,lat,lon):999,
      outdoor:o.outdoor??false,droneScore:Number(o.droneScore||0),dronePotential:o.dronePotential,
      url:o.url||o.website||o.commweb||'',phone:o.phone||o.commtel||o.commmob||'',email:o.email||o.commmail||'',
      startTime:o.startTime||'',endTime:o.endTime||''
    };
  }).filter(Boolean);
}

async function searchSector(){
  const q=$('#sector').value.trim();if(!q)return;
  $('#sectorStatus').textContent='Recherche du secteur…';
  $('#sectorSearch').disabled=true;
  try{
    const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=fr&q='+encodeURIComponent(q),{headers:{Accept:'application/json'}});
    const results=await r.json();
    if(!results.length)throw new Error('Secteur introuvable');
    showCitySuggestions(results);
  }catch(e){$('#sectorStatus').textContent='Secteur introuvable';}
  finally{$('#sectorSearch').disabled=false}
}

function showCitySuggestions(results){
  const box=$('#citySuggestions');
  box.innerHTML=results.map((r,i)=>{
    const label=(r.display_name||'').split(',').slice(0,3).join(', ');
    return `<button class="city-result" data-index="${i}"><span>⌖</span><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(r.type||'Localisation')}</small></span><b>›</b></button>`;
  }).join('');
  box.hidden=false;
  box._results=results;
}
$('#citySuggestions').addEventListener('click',e=>{
  const b=e.target.closest('.city-result');if(!b)return;
  const r=$('#citySuggestions')._results[Number(b.dataset.index)];
  const name=(r.display_name||'').split(',').slice(0,2).join(', ');
  settings.center={lat:Number(r.lat),lon:Number(r.lon),name};
  $('#sector').value=name;
  $('#selectedCity').textContent=name;
  $('#sectorStatus').textContent='Secteur actif';
  $('#citySuggestions').hidden=true;
  save();recalcDistances();render();
});

function resetCity(){
  settings.center={...CENTER_DEFAULT};
  $('#sector').value=CENTER_DEFAULT.name;
  $('#selectedCity').textContent=CENTER_DEFAULT.name;
  $('#sectorStatus').textContent='Secteur actif';
  $('#citySuggestions').hidden=true;
  save();recalcDistances();render();
}
$('#clearCity').onclick=resetCity;

function statFilter(filter){
  $('#statusFilter').value=filter;
  render();
  window.scrollTo({top:document.querySelector('.filters').offsetTop-8,behavior:'smooth'});
}

function render(){
  recalcDistances();
  const max=Number($('#distance').value),filter=$('#statusFilter').value;
  let list=events.filter(e=>e.distance<=max);

  if(filter==='outdoor')list=list.filter(e=>e.outdoor);
  if(filter==='star1')list=list.filter(e=>potential(e)===1);
  if(filter==='star2')list=list.filter(e=>potential(e)===2);
  if(filter==='star3')list=list.filter(e=>potential(e)===3);
  if(filter==='fav')list=list.filter(e=>e.favorite);
  if(filter==='todo')list=list.filter(e=>e.contact==='todo');
  if(filter==='contacted')list=list.filter(e=>e.contact==='contacted');
  if(filter==='accepted')list=list.filter(e=>e.flight==='accepted');
  if(filter==='refused')list=list.filter(e=>e.flight==='refused');

  list.sort((a,b)=>new Date(a.date)-new Date(b.date)||potential(b)-potential(a)||a.distance-b.distance);

  const within=events.filter(e=>e.distance<=max);
  const stats=[
    ['📅',within.length,'all','Événements'],
    ['🚁',within.filter(e=>e.outdoor).length,'outdoor','Extérieur'],
    ['★',within.filter(e=>potential(e)===1).length,'star1','Potentiel'],
    ['★★',within.filter(e=>potential(e)===2).length,'star2','Potentiel élevé'],
    ['★★★',within.filter(e=>potential(e)===3).length,'star3','Très haut potentiel'],
    ['📞',within.filter(e=>e.contact==='todo').length,'todo','À contacter']
  ];
  $('#stats').innerHTML=stats.map(([icon,n,filter,label])=>`<button class="stat ${$('#statusFilter').value===filter?'active':''}" data-stat-filter="${filter}" title="Afficher : ${label}"><strong>${icon}</strong><b>${n}</b><small>${label}</small></button>`).join('');

  const box=$('#events');box.innerHTML='';
  if(!list.length){box.innerHTML='<div class="empty">Aucun événement avec ces filtres.</div>';return}

  list.forEach(e=>{
    const n=$('#eventTemplate').content.cloneNode(true),level=potential(e);
    n.querySelector('.date').textContent=fmtDate(e.date)+(e.startTime?' · '+e.startTime:'');
    n.querySelector('.title').textContent=e.title;
    n.querySelector('.place').textContent='📍 '+e.place+(e.address?' — '+e.address:'');
    n.querySelector('.description').textContent=e.description||'';
    n.querySelector('.distance-badge').textContent=`${Math.round(e.distance*10)/10} km`;
    n.querySelector('.potential-badge').textContent=potentialLabel(level);
    n.querySelector('.potential-badge').className='potential-badge '+potentialClass(level);
    n.querySelector('.outdoor-badge').textContent=e.outdoor?'🚁 Extérieur':'🏠 Intérieur';
    n.querySelector('.contact-badge').textContent=e.contact==='contacted'?'📞 Contacté':'📞 À contacter';
    n.querySelector('.flight-badge').textContent=statusBadge(e);
    n.querySelector('.fav').textContent=e.favorite?'★':'☆';
    n.querySelector('.fav').setAttribute('aria-label',e.favorite?'Retirer des favoris':'Ajouter aux favoris');
    n.querySelector('.fav').onclick=()=>favoriteEvent(e,!e.favorite);
    n.querySelector('.contact').onclick=()=>{e.contact=e.contact==='contacted'?'todo':'contacted';save();render()};
    n.querySelector('.flight').onclick=()=>{const s=['unknown','asked','accepted','refused'];e.flight=s[(s.indexOf(e.flight)+1)%s.length];save();render()};
    n.querySelector('.details').onclick=()=>openEventDetails(e);
    box.appendChild(n);
  });
}

async function refresh(){
  $('#updated').textContent='🔄 Actualisation…';
  try{
    const r=await fetch('./events.json?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error(r.status);
    const data=await r.json();
    events=applyUserState(data.events||[]);
    for(const f of fallback)if(!events.some(e=>e.id===f.id))events.push(f);
    $('#updated').textContent=`✓ ${events.length} événements · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
  }catch(e){
    events=applyUserState(fallback);
    $('#updated').textContent='⚠️ Données locales';
  }
  recalcDistances();render();
}

$('#distance').onchange=render;
$('#statusFilter').onchange=render;
$('#refresh').onclick=refresh;
$('#sectorSearch').onclick=searchSector;
$('#sector').addEventListener('keydown',e=>{if(e.key==='Enter')searchSector()});
$('#sector').addEventListener('input',()=>{$('#citySuggestions').hidden=true});
$('#prefs').onclick=showPrefs;

$('#stats').addEventListener('click',e=>{
  const b=e.target.closest('[data-stat-filter]');
  if(b)statFilter(b.dataset.statFilter);
});

$('#sector').value=settings.center.name||CENTER_DEFAULT.name;
$('#selectedCity').textContent=settings.center.name||CENTER_DEFAULT.name;
$('#sectorStatus').textContent='Secteur actif';
refresh();
