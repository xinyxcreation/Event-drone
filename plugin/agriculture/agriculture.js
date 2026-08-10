window.EventDroneAgriculture=(()=>{
const CSS_URL='./plugin/agriculture/agriculture.css';
function ensureStyles(){
  if(document.querySelector('link[data-event-drone-agriculture]')) return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=CSS_URL+'?v=7';
  link.dataset.eventDroneAgriculture='';
  document.head.appendChild(link);
}
ensureStyles();
let data={activities:[],sector:'Châteaubriant · Loire-Atlantique',prospectionLeadMonths:1};
const MONTHS=['J','F','M','A','M','J','J','A','S','O','N','D'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const date=v=>{const d=v instanceof Date?v:new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?null:d};
const fmt=v=>{const d=date(v);return d?d.toLocaleDateString('fr-FR',{day:'numeric',month:'long'}):String(v||'Date inconnue')};
const addMonths=(v,n)=>{const d=new Date(v);d.setMonth(d.getMonth()+n);return d};
function currentState(a){const s=date(a.harvestStart),e=date(a.harvestEnd);if(!s||!e)return'none';const p=addMonths(s,-1),n=new Date();n.setHours(12,0,0,0);if(n>=s&&n<=e)return'harvest';if(n>=p&&n<s)return'prospect';return'none'}
function monthStates(a){const s=date(a.harvestStart),e=date(a.harvestEnd);if(!s||!e)return MONTHS.map(()=> 'none');const p=addMonths(s,-1), out=[];for(let m=0;m<12;m++){let st='none';for(const y of [s.getFullYear()-1,s.getFullYear(),s.getFullYear()+1]){const ms=new Date(y,m,1,12),me=new Date(y,m+1,0,12);if(me>=s&&ms<=e){st='harvest';break}if(me>=p&&ms<s&&st==='none')st='prospect'}out.push(st)}return out}
function timeline(a){const now=new Date().getMonth(),states=monthStates(a);return `<div class="edag-calendar"><div class="edag-months">${MONTHS.map((m,i)=>`<span class="edag-month ${i===now?'current':''}">${m}</span>`).join('')}</div><div class="edag-cells">${states.map((s,i)=>`<span class="edag-cell ${s} ${i===now?'current':''}"></span>`).join('')}</div></div>`}
function status(s){return s==='harvest'?'<span class="edag-status harvest"><i></i>Récolte en cours</span>':s==='prospect'?'<span class="edag-status prospect"><i></i>Prospection thermique</span>':''}
function render(c){if(!c)return;const list=[...data.activities].sort((a,b)=>(date(a.harvestStart)?.getTime()??Infinity)-(date(b.harvestStart)?.getTime()??Infinity));c.innerHTML=`<section class="edag-page"><div class="edag-intro"><div class="edag-title"><span>🚁</span><strong>Période favorable à la prospection thermique</strong></div><div class="edag-subtitle">Environ 1 mois avant le début de la récolte ou de la fauche.</div><div class="edag-location">📍 ${esc(data.sector)}</div></div><div class="edag-list">${list.map((a,i)=>{const st=currentState(a), raw=String(a.type||'🌾 Culture'), icon=(raw.match(/^\S+/)||['🌾'])[0],name=raw.replace(/^\S+\s*/,'');return `<article class="edag-card ${st}" data-card><div class="edag-row" role="button" tabindex="0" aria-expanded="false"><div class="edag-crop"><span class="edag-icon">${esc(icon)}</span><div><strong>${esc(name)}</strong><small>${fmt(a.harvestStart)} → ${fmt(a.harvestEnd)}</small></div></div><div class="edag-timeline">${timeline(a)}</div><div class="edag-status-wrap">${status(st)}</div><span class="edag-chevron">⌄</span></div><div class="edag-details" hidden><div class="edag-detail-grid"><div><small>📅 Récolte / fauche</small><strong>${fmt(a.harvestStart)} → ${fmt(a.harvestEnd)}</strong></div><div><small>🚁 Prospection thermique</small><strong>${fmt(addMonths(date(a.harvestStart),-1))} → ${fmt(a.harvestStart)}</strong></div><div><small>📍 Secteur</small><strong>${esc((a.sectors||[]).join(' · ')||data.sector)}</strong></div></div><div class="edag-explanation"><strong>Pourquoi prospecter ?</strong><p>${esc(a.explanation)}</p></div></div></article>`}).join('')}</div><p class="edag-note">ℹ️ Les périodes sont indicatives et peuvent varier selon l'année, la météo, la culture, la parcelle et les pratiques de l'exploitation.</p></section>`;c.querySelectorAll('[data-card]').forEach(card=>{const row=card.querySelector('.edag-row'),details=card.querySelector('.edag-details');const toggle=()=>{const open=!details.hidden;details.hidden=open;card.classList.toggle('expanded',!open);row.setAttribute('aria-expanded',String(!open))};row.addEventListener('click',toggle);row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}})})}
async function load(url='./plugin/agriculture/agriculture.json'){const r=await fetch(`${url}?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`Agriculture HTTP ${r.status}`);data=await r.json();return data}
async function init(c){try{await load();render(c)}catch(e){console.error('Event-drone Agriculture:',e);if(c)c.innerHTML='<div class="edag-error">Impossible de charger le calendrier agricole.</div>'}}
return{load,render,init,get data(){return data}};
})();
