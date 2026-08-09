const STORAGE='events-drone-user-v4';
let events=[];
const fallback=[
{id:'local-1',date:'2026-08-23',title:'Fanfare Tzila Brass',place:'Châteaubriant',distance:1,description:'Animation musicale en plein air.',outdoor:true},
{id:'local-2',date:'2026-08-28',title:'Ciné plein-air – Un p’tit truc en plus',place:'Châteaubriant',distance:1,description:'Projection en plein air.',outdoor:true},
{id:'local-3',date:'2026-08-29',title:'Forum des associations',place:'Halle de Béré, Châteaubriant',distance:1,description:'Près de 100 associations.',outdoor:true},
{id:'local-4',date:'2026-09-05',title:'Nozay s’Expose !',place:'Nozay',distance:25,description:'Artisans, associations, braderie, vide-grenier et animations.',outdoor:true},
{id:'local-5',date:'2026-09-06',title:'Vide-grenier',place:'Halle de Béré, Châteaubriant',distance:1,description:'Vide-grenier.',outdoor:true},
{id:'local-6',date:'2026-09-06',title:'Vide-grenier + fête des résidents',place:'Pouancé / Ombrée d’Anjou',distance:20,description:'Animations locales.',outdoor:true},
{id:'local-7',date:'2026-09-06',title:'Route 44 et ses motards',place:'Sion-les-Mines',distance:18,description:'Rassemblement / vide-grenier.',outdoor:true}
];
const $=s=>document.querySelector(s);
function loadUser(){return JSON.parse(localStorage.getItem(STORAGE)||'{}')}
function saveUser(){localStorage.setItem(STORAGE,JSON.stringify(Object.fromEntries(events.map(e=>[e.id,{favorite:e.favorite,contact:e.contact,flight:e.flight}]))))}
function fmtDate(d){const x=new Date(d);return isNaN(x)?String(d||'Date inconnue'):x.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'})}
function applyUserState(list){const u=loadUser();return list.map(e=>({...e,...(u[e.id]||{}),contact:u[e.id]?.contact||e.contact||'todo',flight:u[e.id]?.flight||e.flight||'unknown',favorite:!!u[e.id]?.favorite}))}
async function refresh(){
 $('#updated').textContent='🔄 Actualisation…';
 try{
  const r=await fetch('./events.json?ts='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error(r.status);
  const data=await r.json();
  events=applyUserState(data.events||[]);
  $('#updated').textContent=`✓ ${events.length} événements · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
 }catch(e){
  events=applyUserState(fallback);
  $('#updated').textContent='⚠️ events.json indisponible · données locales';
 }
 render();
}
function render(){
 const max=+$('#distance').value,filter=$('#statusFilter').value;
 let list=events.filter(e=>Number(e.distance)<=max);
 if(filter==='outdoor')list=list.filter(e=>e.outdoor);
 if(filter==='fav')list=list.filter(e=>e.favorite);
 if(filter==='todo')list=list.filter(e=>e.contact==='todo');
 if(filter==='contacted')list=list.filter(e=>e.contact==='contacted');
 if(filter==='accepted')list=list.filter(e=>e.flight==='accepted');
 if(filter==='refused')list=list.filter(e=>e.flight==='refused');
 list.sort((a,b)=>new Date(a.date)-new Date(b.date));
 $('#stats').innerHTML=[
 ['📅',events.filter(e=>e.distance<=max).length],
 ['🚁',events.filter(e=>e.distance<=max&&e.outdoor).length],
 ['⭐',events.filter(e=>e.distance<=max&&e.favorite).length],
 ['📞',events.filter(e=>e.distance<=max&&e.contact==='todo').length],
 ['🟢',events.filter(e=>e.distance<=max&&e.flight==='accepted').length]
 ].map(x=>`<div class="stat">${x[0]} ${x[1]}</div>`).join('');
 const box=$('#events');box.innerHTML='';
 if(!list.length){box.innerHTML='<div class="empty">Aucun événement avec ces filtres.</div>';return}
 list.forEach(e=>{
  const n=$('#eventTemplate').content.cloneNode(true);
  n.querySelector('.date').textContent=fmtDate(e.date);
  n.querySelector('.title').textContent=e.title;
  n.querySelector('.place').textContent='📍 '+e.place;
  n.querySelector('.description').textContent=e.description||'';
  n.querySelector('.distance-badge').textContent=`${e.distance} km`;
  n.querySelector('.outdoor-badge').textContent=e.outdoor?'🚁 Extérieur':'🏠 Intérieur';
  n.querySelector('.contact-badge').textContent=e.contact==='contacted'?'📞 Contacté':'📞 À contacter';
  n.querySelector('.flight-badge').textContent=({unknown:'🚁 Non vérifié',asked:'🟠 Autorisation demandée',accepted:'🟢 Vol accepté',refused:'🔴 Vol refusé'})[e.flight];
  n.querySelector('.fav').textContent=e.favorite?'★':'☆';
  n.querySelector('.fav').onclick=()=>{e.favorite=!e.favorite;saveUser();render()};
  n.querySelector('.contact').onclick=()=>{e.contact=e.contact==='contacted'?'todo':'contacted';saveUser();render()};
  n.querySelector('.flight').onclick=()=>{const s=['unknown','asked','accepted','refused'];e.flight=s[(s.indexOf(e.flight)+1)%s.length];saveUser();render()};
  n.querySelector('.details').onclick=()=>alert(`${e.title}\n${e.place}\n${fmtDate(e.date)}\n\n${e.outdoor?'Événement extérieur':'Événement intérieur'}\nContact : ${e.contact==='contacted'?'Contacté':'À contacter'}\nDrone : ${e.flight}${e.url?'\n\n'+e.url:''}`);
  box.appendChild(n);
 });
}
$('#distance').onchange=render;
$('#statusFilter').onchange=render;
$('#refresh').onclick=refresh;
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
render();
refresh();
