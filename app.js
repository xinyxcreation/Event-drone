const STORAGE='events-drone-v1';
const defaultEvents=[
 {id:'1',date:'2026-08-23',title:'Fanfare Tzila Brass',place:'Châteaubriant',distance:1,description:'Animation musicale en plein air.',contact:'todo',flight:'unknown',favorite:false},
 {id:'2',date:'2026-08-28',title:'Ciné plein-air – Un p’tit truc en plus',place:'Châteaubriant',distance:1,description:'Projection en plein air à la Promenade du Duc d’Aumale.',contact:'todo',flight:'unknown',favorite:false},
 {id:'3',date:'2026-08-29',title:'Forum des associations',place:'Halle de Béré, Châteaubriant',distance:1,description:'Près de 100 associations, 10h–18h.',contact:'todo',flight:'unknown',favorite:false},
 {id:'4',date:'2026-09-05',title:'Nozay s’Expose !',place:'Nozay',distance:25,description:'Artisans, associations, braderie, vide-grenier et animations.',contact:'todo',flight:'unknown',favorite:false},
 {id:'5',date:'2026-09-06',title:'Vide-grenier',place:'Halle de Béré, Châteaubriant',distance:1,description:'Vide-grenier.',contact:'todo',flight:'unknown',favorite:false},
 {id:'6',date:'2026-09-06',title:'Vide-grenier + fête des résidents',place:'Pouancé / Ombrée d’Anjou',distance:20,description:'Animations locales.',contact:'todo',flight:'unknown',favorite:false},
 {id:'7',date:'2026-09-06',title:'Route 44 et ses motards',place:'Sion-les-Mines',distance:18,description:'Rassemblement / vide-grenier.',contact:'todo',flight:'unknown',favorite:false}
];

let events=JSON.parse(localStorage.getItem(STORAGE)||'null')||defaultEvents;

const $=s=>document.querySelector(s);
function save(){localStorage.setItem(STORAGE,JSON.stringify(events))}
function fmtDate(d){return new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'})}
function contactLabel(v){return ({todo:'À contacter',contacted:'Contacté'})[v]||'À contacter'}
function flightLabel(v){return ({unknown:'Vol non vérifié',asked:'Autorisation demandée',accepted:'Vol accepté ✓',refused:'Vol refusé ✕'})[v]||'Vol non vérifié'}

function render(){
 const max=+$('#distance').value, filter=$('#statusFilter').value;
 let list=events.filter(e=>e.distance<=max);
 if(filter==='fav') list=list.filter(e=>e.favorite);
 if(filter==='todo') list=list.filter(e=>e.contact==='todo');
 if(filter==='contacted') list=list.filter(e=>e.contact==='contacted');
 if(filter==='accepted') list=list.filter(e=>e.flight==='accepted');
 if(filter==='refused') list=list.filter(e=>e.flight==='refused');
 list.sort((a,b)=>a.date.localeCompare(b.date));

 $('#stats').innerHTML=[
  ['📅',events.filter(e=>e.distance<=max).length],
  ['⭐',events.filter(e=>e.distance<=max&&e.favorite).length],
  ['📞',events.filter(e=>e.distance<=max&&e.contact==='contacted').length],
  ['🚁',events.filter(e=>e.distance<=max&&e.flight==='accepted').length]
 ].map(x=>`<div class="stat">${x[0]} ${x[1]}</div>`).join('');

 const box=$('#events'); box.innerHTML='';
 if(!list.length){box.innerHTML='<div class="empty">Aucun événement avec ces filtres.</div>';return}
 list.forEach(e=>{
   const node=$('#eventTemplate').content.cloneNode(true);
   node.querySelector('.date').textContent=fmtDate(e.date);
   node.querySelector('.title').textContent=e.title;
   node.querySelector('.place').textContent='📍 '+e.place;
   node.querySelector('.description').textContent=e.description||'';
   node.querySelector('.distance-badge').textContent=`${e.distance} km`;
   node.querySelector('.contact-badge').textContent='📞 '+contactLabel(e.contact);
   node.querySelector('.flight-badge').textContent='🚁 '+flightLabel(e.flight);
   node.querySelector('.fav').textContent=e.favorite?'★':'☆';
   node.querySelector('.fav').onclick=()=>{e.favorite=!e.favorite;save();render()};
   node.querySelector('.contact').onclick=()=>{e.contact=e.contact==='contacted'?'todo':'contacted';save();render()};
   node.querySelector('.flight').onclick=()=>{
     const states=['unknown','asked','accepted','refused'];
     e.flight=states[(states.indexOf(e.flight)+1)%states.length];save();render()
   };
   node.querySelector('.details').onclick=()=>alert(`${e.title}\n${e.place}\n${fmtDate(e.date)}\n\nContact : ${contactLabel(e.contact)}\nDrone : ${flightLabel(e.flight)}`);
   box.appendChild(node);
 })
 $('#updated').textContent='Actualisé : '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

function refresh(){
 // Point d'entrée prévu pour une future API/JSON distante.
 // Les données locales restent disponibles hors connexion.
 render();
}
$('#distance').onchange=render;
$('#statusFilter').onchange=render;
$('#refresh').onclick=refresh;
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
render();
