const STORAGE='events-drone-user-v5';
let events=[];

const fallback=[
{id:'local-1',date:'2026-08-23',title:'Fanfare Tzila Brass',place:'Châteaubriant',distance:1,description:'Animation musicale en plein air.',outdoor:true,droneScore:8,dronePotential:'high'},
{id:'local-2',date:'2026-08-28',title:'Ciné plein-air – Un p’tit truc en plus',place:'Châteaubriant',distance:1,address:'Promenade du Duc d’Aumale',startTime:'21:00',description:'Projection en plein air.',outdoor:true,droneScore:10,dronePotential:'high'},
{id:'local-3',date:'2026-08-29',title:'Forum des associations',place:'Châteaubriant',distance:1,address:'Halle de Béré',description:'Près de 100 associations.',outdoor:true,droneScore:8,dronePotential:'high'},
{id:'local-4',date:'2026-09-05',title:'Nozay s’Expose !',place:'Nozay',distance:25,description:'Artisans, associations, braderie, vide-grenier et animations.',outdoor:true,droneScore:10,dronePotential:'high'},
{id:'local-5',date:'2026-09-06',title:'Vide-grenier',place:'Châteaubriant',distance:1,address:'Halle de Béré',description:'Vide-grenier.',outdoor:true,droneScore:8,dronePotential:'high'},
{id:'local-6',date:'2026-09-06',title:'Vide-grenier + fête des résidents',place:'Pouancé / Ombrée d’Anjou',distance:20,description:'Animations locales.',outdoor:true,droneScore:10,dronePotential:'high'},
{id:'local-7',date:'2026-09-06',title:'Route 44 et ses motards',place:'Sion-les-Mines',distance:18,description:'Rassemblement / vide-grenier.',outdoor:true,droneScore:10,dronePotential:'high'}
];

const $=s=>document.querySelector(s);

function loadUser(){
  try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}
  catch{return {}}
}

function saveUser(){
  const state={};
  for(const e of events){
    state[e.id]={
      favorite:!!e.favorite,
      contact:e.contact||'todo',
      flight:e.flight||'unknown'
    };
  }
  localStorage.setItem(STORAGE,JSON.stringify(state));
}

function fmtDate(d){
  const x=new Date(d+'T12:00:00');
  return isNaN(x)
    ? String(d||'Date inconnue')
    : x.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'});
}

/*
 * Normalise les données anciennes/nouvelles.
 * Le système de localisation n'est volontairement pas touché ici :
 * la distance fournie par build_events.py reste la référence.
 */
function normalizeEvent(e){
  const score=Number(e.droneScore);
  let potential=e.dronePotential;

  if(!['high','medium','low'].includes(potential)){
    potential=Number.isFinite(score)
      ? (score>=6?'high':score>=3?'medium':'low')
      : 'low';
  }

  return {
    ...e,
    droneScore:Number.isFinite(score)?Math.max(0,Math.min(10,score)):0,
    dronePotential:potential,
    outdoor:e.outdoor===true || e.outdoor==='true' || e.outdoor===1 || e.outdoor==='1',
    distance:Number.isFinite(Number(e.distance))?Number(e.distance):999
  };
}

function applyUserState(list){
  const u=loadUser();

  return list.map(raw=>{
    const e=normalizeEvent(raw);
    const saved=u[e.id]||{};

    return {
      ...e,
      ...saved,
      contact:saved.contact||e.contact||'todo',
      flight:saved.flight||e.flight||'unknown',
      favorite:!!saved.favorite
    };
  });
}

function mergeFallback(list){
  const ids=new Set(list.map(e=>e.id));
  return [...list,...fallback.filter(e=>!ids.has(e.id)).map(normalizeEvent)];
}

/* Potentiel intelligent :
   - on utilise le score calculé par build_events.py ;
   - on garde une sécurité pour les anciennes données ;
   - le filtre "potentiel drone" = tout ce qui est réellement exploitable
     (moyen + élevé), jamais les événements faibles.
*/
function level(e){
  const score=Number(e.droneScore);
  if(Number.isFinite(score)){
    if(score>=6)return 'high';
    if(score>=3)return 'medium';
    return 'low';
  }
  return e.dronePotential||'low';
}

function isPotential(e){
  return level(e)==='high'||level(e)==='medium';
}

function levelLabel(e){
  const l=level(e);
  if(l==='high')return '⭐ Fort potentiel';
  if(l==='medium')return '🟢 Potentiel moyen';
  return '⚪ Faible potentiel';
}

function potentialReason(e){
  if(Array.isArray(e.droneReasons)&&e.droneReasons.length){
    return e.droneReasons.slice(0,4).join(' · ');
  }
  if(e.outdoor && level(e)==='high')return 'Extérieur · forte opportunité';
  if(e.outdoor && level(e)==='medium')return 'Extérieur · opportunité possible';
  if(level(e)==='high')return 'Score élevé';
  if(level(e)==='medium')return 'Score intermédiaire';
  return 'Peu intéressant pour le drone';
}

function filterList(list,filter){
  switch(filter){
    case 'potential': return list.filter(isPotential);
    case 'high': return list.filter(e=>level(e)==='high');
    case 'medium': return list.filter(e=>level(e)==='medium');
    case 'low': return list.filter(e=>level(e)==='low');
    case 'outdoor': return list.filter(e=>e.outdoor);
    case 'fav': return list.filter(e=>e.favorite);
    case 'todo': return list.filter(e=>e.contact==='todo');
    case 'contacted': return list.filter(e=>e.contact==='contacted');
    case 'accepted': return list.filter(e=>e.flight==='accepted');
    case 'refused': return list.filter(e=>e.flight==='refused');
    default: return list;
  }
}

function statButton(icon,count,label,filter,active){
  return `<button type="button" class="stat ${active?'active':''}" data-filter="${filter}">
    <strong>${icon} ${count}</strong><small>${label}</small>
  </button>`;
}

async function refresh(){
  $('#updated').textContent='🔄 Actualisation…';

  try{
    const r=await fetch('./events.json?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error(r.status);

    const data=await r.json();
    const source=Array.isArray(data)?data:(data.events||[]);
    events=applyUserState(mergeFallback(source));

    $('#updated').textContent=
      `✓ ${events.length} événements · `+
      new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  }catch(e){
    console.error(e);
    events=applyUserState(fallback);

    $('#updated').textContent=
      '⚠️ events.json indisponible · données locales';
  }

  render();
}

function render(){
  const max=Number($('#distance').value);
  const filter=$('#statusFilter').value;

  // Distance uniquement : aucun changement de centre/localisation.
  const within=events.filter(e=>e.distance<=max);
  let list=filterList(within,filter);

  // Tri : date, puis meilleur potentiel, puis proximité.
  list.sort((a,b)=>
    new Date(a.date)-new Date(b.date) ||
    Number(b.droneScore||0)-Number(a.droneScore||0) ||
    Number(a.distance)-Number(b.distance) ||
    String(a.title).localeCompare(String(b.title),'fr')
  );

  $('#stats').innerHTML=[
    statButton('📅',within.length,'Événements','all',filter==='all'),
    statButton('🚁',within.filter(e=>e.outdoor).length,'Extérieur','outdoor',filter==='outdoor'),
    statButton('⭐',within.filter(e=>level(e)==='high').length,'Fort potentiel','high',filter==='high'),
    statButton('🟢',within.filter(e=>level(e)==='medium').length,'Potentiel moyen','medium',filter==='medium'),
    statButton('📞',within.filter(e=>e.contact==='todo').length,'À contacter','todo',filter==='todo'),
    statButton('🟢',within.filter(e=>e.flight==='accepted').length,'Vol accepté','accepted',filter==='accepted')
  ].join('');

  const box=$('#events');
  box.innerHTML='';

  if(!list.length){
    box.innerHTML='<div class="empty">Aucun événement avec ces filtres.</div>';
    return;
  }

  for(const e of list){
    const n=$('#eventTemplate').content.cloneNode(true);

    n.querySelector('.date').textContent=
      fmtDate(e.date)+(e.startTime?' · '+e.startTime:'');

    n.querySelector('.title').textContent=e.title;
    n.querySelector('.place').textContent=
      '📍 '+(e.place||'Lieu non précisé')+(e.address?' — '+e.address:'');

    n.querySelector('.description').textContent=e.description||'';

    n.querySelector('.distance-badge').textContent=
      `${Number(e.distance).toFixed(1).replace('.0','')} km`;

    const potentialBadge=n.querySelector('.potential-badge');
    potentialBadge.textContent=levelLabel(e);
    potentialBadge.title=potentialReason(e);

    n.querySelector('.outdoor-badge').textContent=
      e.outdoor?'🚁 Extérieur':'🏠 Intérieur';

    n.querySelector('.contact-badge').textContent=
      e.contact==='contacted'?'📞 Contacté':'📞 À contacter';

    n.querySelector('.flight-badge').textContent=({
      unknown:'🚁 Non vérifié',
      asked:'🟠 Autorisation demandée',
      accepted:'🟢 Vol accepté',
      refused:'🔴 Vol refusé'
    })[e.flight]||'🚁 Non vérifié';

    n.querySelector('.fav').textContent=e.favorite?'★':'☆';

    n.querySelector('.fav').onclick=()=>{
      e.favorite=!e.favorite;
      saveUser();
      render();
    };

    n.querySelector('.contact').onclick=()=>{
      e.contact=e.contact==='contacted'?'todo':'contacted';
      saveUser();
      render();
    };

    n.querySelector('.flight').onclick=()=>{
      const states=['unknown','asked','accepted','refused'];
      const i=states.indexOf(e.flight);
      e.flight=states[(i+1+states.length)%states.length];
      saveUser();
      render();
    };

    n.querySelector('.details').onclick=()=>{
      const reasons=potentialReason(e);

      alert(
`${e.title}
${e.place||'Lieu non précisé'}${e.address?' — '+e.address:''}
${fmtDate(e.date)}${e.startTime?' · '+e.startTime:''}

Potentiel drone : ${levelLabel(e)}
Score : ${Number(e.droneScore||0)}/10
Pourquoi : ${reasons}
${e.outdoor?'Événement extérieur':'Événement intérieur'}

Contact : ${e.contact==='contacted'?'Contacté':'À contacter'}
Drone : ${e.flight}
${e.phone?'Téléphone : '+e.phone+'\n':''}${e.email?'Email : '+e.email+'\n':''}${e.url?'\n'+e.url:''}`
      );
    };

    box.appendChild(n);
  }
}

// Les cartes statistiques sont maintenant de vrais filtres rapides.
document.addEventListener('click',e=>{
  const stat=e.target.closest('[data-filter]');
  if(!stat)return;

  $('#statusFilter').value=stat.dataset.filter;
  render();
});

$('#distance').onchange=render;
$('#statusFilter').onchange=render;
$('#refresh').onclick=refresh;

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(console.warn);
}

render();
refresh();
