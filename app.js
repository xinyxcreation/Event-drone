const STORAGE='events-drone-v2';
const API='https://france-evasion-regions.com/api/open/evenements.json';
const CENTER={lat:47.718,lon:-1.376}; // Châteaubriant

const fallback=[
{id:'local-1',date:'2026-08-23',title:'Fanfare Tzila Brass',place:'Châteaubriant',distance:1,description:'Animation musicale en plein air.',outdoor:true},
{id:'local-2',date:'2026-08-28',title:'Ciné plein-air – Un p’tit truc en plus',place:'Châteaubriant',distance:1,description:'Projection en plein air.',outdoor:true},
{id:'local-3',date:'2026-08-29',title:'Forum des associations',place:'Halle de Béré, Châteaubriant',distance:1,description:'Près de 100 associations.',outdoor:true},
{id:'local-4',date:'2026-09-05',title:'Nozay s’Expose !',place:'Nozay',distance:25,description:'Artisans, associations, braderie, vide-grenier et animations.',outdoor:true},
{id:'local-5',date:'2026-09-06',title:'Vide-grenier',place:'Halle de Béré, Châteaubriant',distance:1,description:'Vide-grenier.',outdoor:true},
{id:'local-6',date:'2026-09-06',title:'Vide-grenier + fête des résidents',place:'Pouancé / Ombrée d’Anjou',distance:20,description:'Animations locales.',outdoor:true},
{id:'local-7',date:'2026-09-06',title:'Route 44 et ses motards',place:'Sion-les-Mines',distance:18,description:'Rassemblement / vide-grenier.',outdoor:true}
];

let saved=JSON.parse(localStorage.getItem(STORAGE)||'null');
let events=saved?.events || fallback.map(e=>({...e,contact:'todo',flight:'unknown',favorite:false}));

const $=s=>document.querySelector(s);
const esc=s=>String(s??'');
function save(){localStorage.setItem(STORAGE,JSON.stringify({events,updated:new Date().toISOString()}))}
function fmtDate(d){const x=new Date(d);return isNaN(x)?String(d||'Date inconnue'):x.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'})}
function hav(a,b,c,d){const R=6371,r=x=>x*Math.PI/180;const A=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return R*2*Math.atan2(Math.sqrt(A),Math.sqrt(1-A))}
function val(o,...keys){for(const k of keys){if(o?.[k]!=null)return o[k]}return ''}
function dateOf(o){return val(o,'date_debut','dateDebut','startDate','start','date','beginAt','dateStart')}
function titleOf(o){return val(o,'titre','title','name','nom')||'Événement'}
function descOf(o){return val(o,'description','desc','summary','resume','shortDescription')}
function placeOf(o){return val(o,'commune','city','ville','locationName','lieu','place')||'Lieu non précisé'}
function latOf(o){return Number(val(o,'latitude','lat','location_lat','y','geo_lat'))}
function lonOf(o){return Number(val(o,'longitude','lon','lng','location_lon','x','geo_lon'))}

function outdoorOf(o){
 const s=(titleOf(o)+' '+descOf(o)+' '+placeOf(o)+' '+JSON.stringify(o)).toLowerCase();
 const inside=/salle|mus[ée]e|cin[ée]ma|th[ée][âa]tre|biblioth[èe]que|église|eglise|chapelle|restaurant|bar|conférence|conference|exposition/.test(s);
 const outside=/plein air|extérieur|exterieur|stade|terrain|parc|place |march[ée]|vide[- ]grenier|brocante|fête|fete|festival|concert|course|randonnée|randonnee|sport|motocross|moto|auto|rassemblement|braderie|kermesse|feu d'artifice|feu d artifice/.test(s);
 return outside && !inside;
}

function normalize(raw){
 const arr=Array.isArray(raw)?raw:(raw?.events||raw?.data||raw?.results||[]);
 const now=Date.now(), end=now+30*86400000;
 return arr.map((o,i)=>{
   const d=new Date(dateOf(o)); if(isNaN(d)||d.getTime()<now||d.getTime()>end)return null;
   const lat=latOf(o),lon=lonOf(o);
   let distance=Number(o.distance);
   if(!Number.isFinite(distance) && Number.isFinite(lat)&&Number.isFinite(lon)) distance=hav(CENTER.lat,CENTER.lon,lat,lon);
   if(!Number.isFinite(distance)) distance=999;
   return {id:String(val(o,'id','uid','event_id')||('api-'+i+'-'+titleOf(o))),date:d.toISOString(),title:titleOf(o),place:placeOf(o),description:descOf(o),distance:Math.round(distance*10)/10,outdoor:outdoorOf(o),url:val(o,'url','link','website'),contact:'todo',flight:'unknown',favorite:false};
 }).filter(Boolean);
}

function merge(incoming){
 const old=new Map(events.map(e=>[e.id,e]));
 for(const n of incoming){
   const p=old.get(n.id);
   if(p){Object.assign(p,n,{contact:p.contact,flight:p.flight,favorite:p.favorite});}
   else events.push(n);
 }
 // conserve seulement 30 jours à venir, mais garde les fiches déjà suivies tant qu'elles ne sont pas très anciennes
 const limit=Date.now()-7*86400000;
 events=events.filter(e=>new Date(e.date).getTime()>limit);
 save();
}

async function refresh(){
 $('#updated').textContent='🔄 Recherche des événements…';
 try{
   const r=await fetch(API+'?limit=500',{cache:'no-store'});
   if(!r.ok)throw new Error('API '+r.status);
   const data=await r.json();
   const incoming=normalize(data);
   if(incoming.length) merge(incoming);
   $('#updated').textContent=`✓ ${incoming.length} événements trouvés · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
 }catch(e){
   $('#updated').textContent='⚠️ Source indisponible · données locales';
 }
 render();
}

function render(){
 const max=+$('#distance').value, filter=$('#statusFilter').value;
 let list=events.filter(e=>e.distance<=max);
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
  n.querySelector('.fav').onclick=()=>{e.favorite=!e.favorite;save();render()};
  n.querySelector('.contact').onclick=()=>{e.contact=e.contact==='contacted'?'todo':'contacted';save();render()};
  n.querySelector('.flight').onclick=()=>{const s=['unknown','asked','accepted','refused'];e.flight=s[(s.indexOf(e.flight)+1)%s.length];save();render()};
  n.querySelector('.details').onclick=()=>{let x=`${e.title}\n${e.place}\n${fmtDate(e.date)}\n\n${e.outdoor?'Événement extérieur':'Événement intérieur'}\nContact : ${e.contact==='contacted'?'Contacté':'À contacter'}\nDrone : ${e.flight}`;if(e.url)x+=`\\n\\n${e.url}`;alert(x)};
  box.appendChild(n);
 });
}
$('#distance').onchange=render;$('#statusFilter').onchange=render;$('#refresh').onclick=refresh;
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
render();
// Actualisation uniquement au lancement de l'application.
refresh();
