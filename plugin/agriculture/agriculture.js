window.EventDroneAgriculture = (() => {
  let data = {
    activities: [],
    sector: 'Châteaubriant · Loire-Atlantique',
    prospectionLeadMonths: 1
  };

  const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[c]));

  const parseDate = value => {
    if (value instanceof Date) return value;
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatDate = value => {
    const d = parseDate(value);
    if (!d) return value || 'Date inconnue';
    return d.toLocaleDateString('fr-FR', {day:'numeric', month:'long'});
  };

  const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  function status(activity) {
    const start = parseDate(activity.harvestStart);
    const end = parseDate(activity.harvestEnd);
    if (!start || !end) return 'none';

    const prospectStart = addMonths(start, -1);
    const now = new Date();
    now.setHours(12,0,0,0);

    if (now >= start && now <= end) return 'harvest';
    if (now >= prospectStart && now < start) return 'prospect';
    return 'none';
  }

  function monthState(activity) {
    const start = parseDate(activity.harvestStart);
    const end = parseDate(activity.harvestEnd);
    if (!start || !end) return MONTHS.map(()=>'none');

    const prospectStart = addMonths(start, -1);
    const prospectEnd = new Date(start);
    prospectEnd.setDate(prospectEnd.getDate()-1);

    return MONTHS.map((_, month) => {
      // The calendar represents the activity's annual period.
      // A month is colored if any day in that month intersects the period.
      const year = start.getFullYear();
      let result = 'none';

      for (const y of [year-1, year, year+1]) {
        const ms = new Date(y, month, 1, 12);
        const me = new Date(y, month+1, 0, 12);

        if (me >= start && ms <= end) result = 'harvest';
        else if (me >= prospectStart && ms <= prospectEnd && result === 'none') result = 'prospect';
      }
      return result;
    });
  }

  function timeline(activity) {
    const currentMonth = new Date().getMonth();
    const states = monthState(activity);

    return `
      <div class="agri-calendar">
        <div class="agri-months">
          ${MONTHS.map((m,i)=>`
            <span class="agri-month ${i===currentMonth?'is-current':''}">${m}</span>
          `).join('')}
        </div>
        <div class="agri-months">
          ${states.map((s,i)=>`
            <span
              class="agri-month-cell ${s} ${i===currentMonth?'is-current':''}"
              title="${s==='harvest'?'Récolte / fauche':s==='prospect'?'Prospection thermique':'Hors période'}"
            ></span>
          `).join('')}
        </div>
      </div>
    `;
  }

  function stateMarkup(state) {
    if (state === 'harvest') {
      return `<span class="agri-state harvest"><i></i>Récolte en cours</span>`;
    }
    if (state === 'prospect') {
      return `<span class="agri-state prospect"><i></i>Prospection thermique</span>`;
    }
    return '';
  }

  function render(container) {
    if (!container) return;

    const activities = [...data.activities].sort((a,b) =>
      (parseDate(a.harvestStart)?.getTime() ?? Infinity) -
      (parseDate(b.harvestStart)?.getTime() ?? Infinity)
    );

    container.innerHTML = `
      <section class="agri-page">

        <div class="agri-intro">
          <div class="agri-kicker">🌾 Agriculture</div>
          <div class="agri-rule">
            <span class="agri-rule-icon">🚁</span>
            <div>
              <strong>Période favorable à la prospection thermique</strong>
              <small>Environ 1 mois avant le début de la récolte ou de la fauche.</small>
            </div>
          </div>
          <div class="agri-location">📍 ${esc(data.sector)}</div>
        </div>

        <div class="agri-list">
          ${activities.map((activity,index)=>{
            const state=status(activity);
            const icon=(String(activity.type).match(/^\S+/)||['🌾'])[0];
            const name=String(activity.type).replace(/^\S+\s*/,'');
            const detailsId=`agri-details-${index}`;

            return `
              <article class="agri-card agri-${state}" data-agri-card>

                <div
                  class="agri-card-toggle"
                  role="button"
                  tabindex="0"
                  aria-expanded="false"
                  aria-controls="${detailsId}"
                >
                  <div class="agri-crop">
                    <span class="agri-icon">${esc(icon)}</span>
                    <span class="agri-name-wrap">
                      <strong>${esc(name)}</strong>
                      <small>${formatDate(activity.harvestStart)} → ${formatDate(activity.harvestEnd)}</small>
                    </span>
                  </div>

                  <div class="agri-timeline-wrap">
                    ${timeline(activity)}
                  </div>

                  <div class="agri-card-status">
                    ${stateMarkup(state)}
                  </div>

                  <span class="agri-chevron" aria-hidden="true">⌄</span>
                </div>

                <div class="agri-details" id="${detailsId}" hidden>
                  <div class="agri-details-grid">
                    <div>
                      <span>📅 Récolte / fauche</span>
                      <strong>${formatDate(activity.harvestStart)} → ${formatDate(activity.harvestEnd)}</strong>
                    </div>
                    <div>
                      <span>🚁 Prospection thermique</span>
                      <strong>${formatDate(addMonths(parseDate(activity.harvestStart),-1))} → ${formatDate(activity.harvestStart)}</strong>
                    </div>
                    <div>
                      <span>📍 Secteur</span>
                      <strong>${esc((activity.sectors||[]).join(' · ') || data.sector)}</strong>
                    </div>
                  </div>

                  <div class="agri-explanation">
                    <strong>Pourquoi prospecter ?</strong>
                    <p>${esc(activity.explanation)}</p>
                  </div>
                </div>

              </article>
            `;
          }).join('')}
        </div>

        <p class="agri-note">
          ℹ️ Les périodes sont indicatives et peuvent varier selon l'année, la météo,
          la culture, la parcelle et les pratiques de l'exploitation.
        </p>
      </section>
    `;

    const toggle = card => {
      const details=card.querySelector('.agri-details');
      const open=!details.hidden;
      details.hidden=open;
      card.classList.toggle('expanded',!open);
      const control=card.querySelector('.agri-card-toggle');
      control.setAttribute('aria-expanded',String(!open));
    };

    container.querySelectorAll('[data-agri-card]').forEach(card=>{
      const control=card.querySelector('.agri-card-toggle');
      control.addEventListener('click',()=>toggle(card));
      control.addEventListener('keydown',e=>{
        if(e.key==='Enter' || e.key===' '){
          e.preventDefault();
          toggle(card);
        }
      });
    });
  }

  async function load(url='./plugin/agriculture/agriculture.json'){
    const response=await fetch(`${url}?ts=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) throw new Error(`Agriculture HTTP ${response.status}`);
    data=await response.json();
    return data;
  }

  async function init(container){
    try{
      await load();
      render(container);
    }catch(error){
      console.error('Event-drone Agriculture:',error);
      if(container){
        container.innerHTML=`<div class="agri-error">Impossible de charger le calendrier agricole.</div>`;
      }
    }
  }

  return {load,render,init,get data(){return data;}};
})();
