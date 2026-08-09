const STORAGE='events-drone-user-v6';
const SETTINGS='events-drone-settings-v1';
const CENTER_DEFAULT={lat:47.718,lon:-1.376,name:'Châteaubriant'};
const LEARN_THRESHOLD=3;

const fallback=[
{id:'local-1',date:'2026-08-23',title:'Fanfare Tzila Brass',category:'Animation musicale',place:'Châteaubriant',postalCode:'44110',lat:47.718,lon:-1.376,distance:1,description:'Animation musicale en plein air.',outdoor:true,droneScore:8},
{id:'local-2',date:'2026-08-28',title:'Ciné plein-air – Un p’tit truc en plus',category:'Ciné plein-air',place:'Châteaubriant',postalCode:'44110',lat:47.718,lon:-1.376,distance:1,address:'Promenade du Duc d’Aumale',startTime:'21:00',description:'Projection en plein air.',outdoor:true,droneScore:10},
{id:'local-3',date:'2026-08-29',title:'Forum des associations',category:'Forum / associations',place:'Châteaubriant',postalCode:'44110',lat:47.718,lon:-1.376,distance:1,address:'Halle de Béré',description:'Près de 100 associations.',outdoor:true,droneScore:8},
{id:'local-4',date:'2026-09-05',title:'Nozay s’Expose !',category:'Animation locale / exposition',place:'Nozay',postalCode:'44170',lat:47.5642,lon:-1.615,distance:25,description:'Artisans, associations, braderie, vide-grenier et animations.',outdoor:true,droneScore:10},
{id:'local-5',date:'2026-09-06',title:'Vide-grenier',category:'Brocante / vide-grenier',place:'Châteaubriant',postalCode:'44110',lat:47.718,lon:-1.376,distance:1,address:'Halle de Béré',description:'Vide-grenier.',outdoor:true,droneScore:8},
{id:'local-6',date:'2026-09-06',title:'Vide-grenier + fête des résidents',category:'Fête locale',place:'Pouancé / Ombrée d’Anjou',postalCode:'49420',lat:47.739,lon:-1.176,distance:20,description:'Animations locales.',outdoor:true,droneScore:10},
{id:'local-7',date:'2026-09-06',title:'Route 44 et ses motards',category:'Rassemblement / animation',place:'Sion-les-Mines',postalCode:'44590',lat:47.7332,lon:-1.5916,distance:18,description:'Rassemblement / vide-grenier.',outdoor:true,droneScore:10}
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
function learnedKeyword(e){const ws=words(e.title+' '+e.category);return ws.some(w=>(settings.favoriteKeywords[w]||0)>=LEARN_THRESHOLD)}
function basePotential(e){
  if(e.droneScore>=6 || e.dronePotential==='high') return 2;
  if(e.droneScore>=3 || e.dronePotential==='medium') return 1;
  return 0;
}
function potential(e){
  if(isExcluded(e)) return 0;
  if(learnedCategory(e)||learnedKeyword(e)) return 3;
  return basePotential(e);
}
function potentialLabel(level){return ['—','★ Potentiel','★★ Potentiel élevé','★★★ Très haut potentiel'][level]}
function potentialClass(level){return ['low','medium','high','very-high'][level]}
function favoriteEvent(e,on){
  const was=!!e.favorite;
  e.favorite=on;
  if(on&&!was){
    const c=keyCategory(e.category); if(c)settings.favoriteCategories[c]=(settings.favoriteCategories[c]||0)+1;
    for(const w of new Set(words(e.title+' '+e.category))) settings.favoriteKeywords[w]=(settings.favoriteKeywords[w]||0)+1;
  }
  save();render();
}
function excludeType(e){
  const c=keyCategory(e.category); if(!c)return;
  if(!settings.excludedCategories.includes(c))settings.excludedCategories.push(c);
  save();render();alert(`Type ignoré : ${e.category}\nLes futurs événements de ce type ne seront plus classés en potentiel élevé.`)
}
function restoreType(e){
  const c=keyCategory(e.category);settings.excludedCategories=settings.excludedCategories.filter(x=>x!==c);save();render();
}
function statusBadge(e){return ({unknown:'🚁 Non vérifié',asked:'🟠 Autorisation demandée',accepted:'🟢 Vol accepté',refused:'🔴 Vol refusé'})[e.flight]||'🚁 Non vérifié'}
function dateValue(o){return o.date||o.date_debut||o.dateDebut||o.startDate||o.start||o.beginAt||o.dateStart||''}
function titleValue(o){return o.title||o.titre||o.name||o.nomoffre||o.nom||'Événement'}
function categoryValue(o){return o.category||o.categorie||''}
function placeValue(o){return o.place||o.commune||o.city||o.ville||o.locationName||o.lieu||'Lieu non précisé'}
function coords(o){let lat=Number(o.latitude??o.lat??o.location_lat),lon=Number(o.longitude??o.lon??o.lng??o.location_lon);if(!Number.isFinite(lat)||!Number.isFinite(lon)){const g=o.localisation||o.location||{};lat=Number(g.lat);lon=Number(g.lon??g.lng)}return {lat,lon}}
function normalize(raw){
 const arr=Array.isArray(raw)?raw:(raw?.events||raw?.data||raw?.results||[]);const now=Date.now(),end=now+45*86400000;
 return arr.map((o,i)=>{const ds=dateValue(o),d=new Date(ds);if(isNaN(d)||d.getTime()<now||d.getTime()>end)return null;const {lat,lon}=coords(o);let distance=Number(o.distance);if(!Number.isFinite(distance)&&Number.isFinite(lat)&&Number.isFinite(lon))distance=hav(settings.center.lat,settings.center.lon,lat,lon);if(!Number.isFinite(distance))distance=999;return {id:String(o.id??o.uid??o.event_id??('api-'+i+'-'+titleValue(o))),date:d.toISOString().slice(0,10),title:titleValue(o),category:categoryValue(o),place:placeValue(o),postalCode:o.postalCode||o.codepostal||'',address:o.address||[o.adresse1,o.adresse1suite,o.adresse2,o.adresse3].filter(Boolean).join(' '),latitude:lat,longitude:lon,description:o.description||o.desc||o.summary||'',distance:Math.round(distance*10)/10,outdoor:o.outdoor??false,droneScore:Number(o.droneScore||0),dronePotential:o.dronePotential,url:o.url||o.website||o.commweb||'',phone:o.phone||o.commtel||o.commmob||'',email:o.email||o.commmail||'',startTime:o.startTime||'',endTime:o.endTime||''}}).filter(Boolean)
}

async function searchSector(){
 const q=$('#sector').value.trim();if(!q)return;
 $('#sectorStatus').textContent='Recherche…';
 try{
  const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fr&q='+encodeURIComponent(q),{headers:{Accept:'application/json'}});
  const a=await r.json();if(!a.length)throw new Error('Secteur introuvable');
  settings.center={lat:Number(a[0].lat),lon:Number(a[0].lon),name:a[0].display_name.split(',').slice(0,2).join(',')};
  $('#sector').value=settings.center.name;save();
  recalcDistances();render();
  $('#sectorStatus').textContent=`📍 ${settings.center.name}`;
 }catch(e){$('#sectorStatus').textContent='❌ Secteur introuvable'}
}
function recalcDistances(){for(const e of events){if(Number.isFinite(e.latitude)&&Number.isFinite(e.longitude))e.distance=Math.round(hav(settings.center.lat,settings.center.lon,e.latitude,e.longitude)*10)/10}}
function showPrefs(){
 const learned=Object.entries(settings.favoriteCategories).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
 const excluded=settings.excludedCategories;
 let msg='APPRENTISSAGE\n\n';msg+=learned.length?learned.map(([c,n])=>`${n>=LEARN_THRESHOLD?'***':'*'} ${c} — ${n} favori(s)`).join('\n'):'Aucun type appris pour le moment.';
 msg+='\n\nTYPES IGNORÉS\n'+(excluded.length?excluded.join('\n'):'Aucun');
 if(excluded.length){msg+='\n\nPour réactiver un type : ouvre un événement de ce type et utilise « Réactiver ce type ».'.replace('ouvre','ouvre');}
 alert(msg);
}
function render(){
 recalcDistances();const max=+$('#distance').value,filter=$('#statusFilter').value;let list=events.filter(e=>e.distance<=max);if(filter==='very')list=list.filter(e=>potential(e)===3);if(filter==='high')list=list.filter(e=>potential(e)===2);if(filter==='medium')list=list.filter(e=>potential(e)===1);if(filter==='potential')list=list.filter(e=>potential(e)>=1);if(filter==='outdoor')list=list.filter(e=>e.outdoor);
 if(filter==='star1')list=list.filter(e=>(e.droneScore||e.potential||0)>=1);
 if(filter==='star2')list=list.filter(e=>(e.droneScore||e.potential||0)>=2);
 if(filter==='star3')list=list.filter(e=>(e.droneScore||e.potential||0)>=3);if(filter==='fav')list=list.filter(e=>e.favorite);if(filter==='todo')list=list.filter(e=>e.contact==='todo');if(filter==='contacted')list=list.filter(e=>e.contact==='contacted');if(filter==='accepted')list=list.filter(e=>e.flight==='accepted');if(filter==='refused')list=list.filter(e=>e.flight==='refused');list.sort((a,b)=>new Date(a.date)-new Date(b.date)||potential(b)-potential(a)||a.distance-b.distance);
 const within=events.filter(e=>e.distance<=max);$('#stats').innerHTML=[['📅',within.length],['🚁',within.filter(e=>e.outdoor).length],['***',within.filter(e=>potential(e)===3).length],['**',within.filter(e=>potential(e)===2).length],['*',within.filter(e=>potential(e)===1).length],['📞',within.filter(e=>e.contact==='todo').length]].map(x=>`<div class="stat">${x[0]} ${x[1]}</div>`).join('');
 const box=$('#events');box.innerHTML='';if(!list.length){box.innerHTML='<div class="empty">Aucun événement avec ces filtres.</div>';return}
 list.forEach(e=>{const n=$('#eventTemplate').content.cloneNode(true),level=potential(e);n.querySelector('.date').textContent=fmtDate(e.date);n.querySelector('.title').textContent=e.title;n.querySelector('.place').textContent='📍 '+e.place+(e.address?' — '+e.address:'');n.querySelector('.description').textContent=e.description||'';n.querySelector('.distance-badge').textContent=`${e.distance} km`;n.querySelector('.potential-badge').textContent=potentialLabel(level);n.querySelector('.potential-badge').className='potential-badge '+potentialClass(level);n.querySelector('.outdoor-badge').textContent=e.outdoor?'🚁 Extérieur':'🏠 Intérieur';n.querySelector('.contact-badge').textContent=e.contact==='contacted'?'📞 Contacté':'📞 À contacter';n.querySelector('.flight-badge').textContent=statusBadge(e);n.querySelector('.fav').textContent=e.favorite?'★':'☆';n.querySelector('.fav').onclick=()=>favoriteEvent(e,!e.favorite);n.querySelector('.contact').onclick=()=>{e.contact=e.contact==='contacted'?'todo':'contacted';save();render()};n.querySelector('.flight').onclick=()=>{const s=['unknown','asked','accepted','refused'];e.flight=s[(s.indexOf(e.flight)+1)%s.length];save();render()};n.querySelector('.details').onclick=()=>{
 let x=`${e.title}\n${e.category?e.category+'\n':''}${e.place}${e.address?' — '+e.address:''}\n${fmtDate(e.date)}${e.startTime?' · '+e.startTime:''}\n\nPotentiel : ${potentialLabel(level)}\n${e.outdoor?'Événement extérieur':'Événement intérieur'}\nContact : ${e.contact==='contacted'?'Contacté':'À contacter'}\nDrone : ${e.flight}`;
 if(e.phone)x+=`\nTéléphone : ${e.phone}`;
 if(e.email)x+=`\nEmail : ${e.email}`;
 if(isExcluded(e))x+='\n\n🚫 Type actuellement ignoré';
 const action=prompt(x+'\n\nTapez IGNORER pour exclure ce type, ou RETABLIR pour le réactiver.\nLaissez vide pour fermer.','');
 if(action?.toUpperCase()==='IGNORER'&&!isExcluded(e))excludeType(e);
 if(action?.toUpperCase()==='RETABLIR'&&isExcluded(e))restoreType(e);
};box.appendChild(n)});
}

$('#distance').onchange=render;$('#statusFilter').onchange=render;$('#refresh').onclick=refresh;$('#sectorSearch').onclick=searchSector;$('#sector').addEventListener('keydown',e=>{if(e.key==='Enter')searchSector()});$('#prefs').onclick=showPrefs;

let searchCenter = {lat:47.718, lon:-1.376, name:"Châteaubriant"};

async function searchLocation(){
  const input = document.querySelector('#location');
  const status = document.querySelector('#locationStatus');
  const q = (input?.value || '').trim();
  if(!q) return;
  status.textContent = 'Recherche…';
  try{
    const url='https://api-adresse.data.gouv.fr/search/?limit=1&q='+encodeURIComponent(q);
    const r=await fetch(url);
    const data=await r.json();
    const f=data.features?.[0];
    if(!f) throw new Error('Lieu introuvable');
    const [lon,lat]=f.geometry.coordinates;
    searchCenter={lat,lon,name:f.properties?.label||q};
    // Recalculate the displayed distances without changing the event database.
    events=events.map(e=>{
      if(e.latitude==null || e.longitude==null) return e;
      const R=6371, p=Math.PI/180;
      const a=Math.sin((e.latitude-lat)*p/2)**2+
        Math.cos(lat*p)*Math.cos(e.latitude*p)*Math.sin((e.longitude-lon)*p/2)**2;
      return {...e,distance:Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*10)/10};
    });
    status.textContent='📍 '+(f.properties?.label||q);
    render();
  }catch(err){
    status.textContent='Lieu introuvable';
  }
}

async function refresh(){
 $('#updated').textContent='🔄 Actualisation…';
 try{const r=await fetch('./events.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(r.status);const data=await r.json();events=applyUserState(data.events||[]);const old=events.length;events=applyUserState([...events,...fallback.filter(f=>!events.some(e=>e.id===f.id))]);recalcDistances();$('#updated').textContent=`✓ ${events.length} événements · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`}catch(e){events=applyUserState(fallback);$('#updated').textContent='⚠️ events.json indisponible · données locales'}render()}
$('#sector').value=settings.center.name||CENTER_DEFAULT.name;$('#sectorStatus').textContent=`📍 ${settings.center.name||CENTER_DEFAULT.name}`;render();refresh();

document.querySelector('#searchLocation')?.addEventListener('click', searchLocation);
document.querySelector('#location')?.addEventListener('keydown', e=>{
  if(e.key==='Enter') searchLocation();
});
