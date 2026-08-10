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
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatDate = value => {
    const d = value instanceof Date ? value : parseDate(value);
    if (!d) return value || 'Date inconnue';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long'
    });
  };

  const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  const monthIndex = date => date.getMonth();

  function status(activity) {
    const start = parseDate(activity.harvestStart);
    const end = parseDate(activity.harvestEnd);
    if (!start || !end) return 'none';

    const prospectStart = addMonths(start, -1);
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    if (now >= start && now <= end) return 'harvest';
    if (now >= prospectStart && now < start) return 'prospect';
    return 'none';
  }

  function activityMonths(activity) {
    const start = parseDate(activity.harvestStart);
    const end = parseDate(activity.harvestEnd);
    if (!start || !end) return [];

    const prospectStart = addMonths(start, -1);
    const prospectEnd = new Date(start);
    prospectEnd.setDate(prospectEnd.getDate() - 1);

    return MONTHS.map((_, index) => {
      const year = start.getFullYear();
      const candidates = [];

      // Include the month in the harvest/prospect window if any day
      // of that month intersects the corresponding period.
      for (const y of [year - 1, year, year + 1]) {
        const monthStart = new Date(y, index, 1, 12);
        const monthEnd = new Date(y, index + 1, 0, 12);
        if (monthEnd >= prospectStart && monthStart <= prospectEnd) {
          candidates.push('prospect');
        }
        if (monthEnd >= start && monthStart <= end) {
          candidates.push('harvest');
        }
      }

      if (candidates.includes('harvest')) return 'harvest';
      if (candidates.includes('prospect')) return 'prospect';
      return '';
    });
  }

  function renderTimeline(activity) {
    const months = activityMonths(activity);
    const currentMonth = new Date().getMonth();

    return `
      <div class="agri-calendar" aria-label="Calendrier annuel">
        <div class="agri-month-labels">
          ${MONTHS.map((month, index) => `
            <span class="agri-month-label ${index === currentMonth ? 'current' : ''}">
              ${month}
            </span>
          `).join('')}
        </div>

        <div class="agri-month-grid">
          ${months.map((type, index) => `
            <span
              class="agri-month-cell ${type} ${index === currentMonth ? 'current' : ''}"
              title="${type === 'harvest' ? 'Récolte' : type === 'prospect' ? 'Prospection thermique' : 'Hors période'}"
            ></span>
          `).join('')}
        </div>
      </div>
    `;
  }

  function interestText(level) {
    return ['Faible', 'Intéressant', 'Très intéressant', 'Très intéressant'][
      Math.max(0, Math.min(3, Number(level) || 0))
    ];
  }

  function render(container) {
    if (!container) return;

    const activities = [...data.activities].sort((a, b) => {
      const sa = parseDate(a.harvestStart)?.getTime() ?? Infinity;
      const sb = parseDate(b.harvestStart)?.getTime() ?? Infinity;
      return sa - sb;
    });

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
          ${activities.map(activity => {
            const state = status(activity);

            const stateLabel =
              state === 'harvest'
                ? '<span class="agri-state harvest">🟢 Récolte en cours</span>'
                : state === 'prospect'
                  ? '<span class="agri-state prospect">🟡 Prospection thermique</span>'
                  : '';

            return `
              <article class="agri-card agri-${state}">

                <button
                  type="button"
                  class="agri-card-button"
                  aria-expanded="false"
                >
                  <span class="agri-icon" aria-hidden="true">${esc(activity.type).split(' ')[0]}</span>

                  <span class="agri-card-main">
                    <span class="agri-type">
                      ${esc(activity.type).replace(/^\S+\s*/, '')}
                    </span>

                    <span class="agri-period">
                      ${formatDate(activity.harvestStart)}
                      → ${formatDate(activity.harvestEnd)}
                    </span>
                  </span>

                  <span class="agri-card-calendar">
                    ${renderTimeline(activity)}
                  </span>

                  <span class="agri-card-side">
                    ${stateLabel}
                    <span class="agri-chevron" aria-hidden="true">⌄</span>
                  </span>
                </button>

                <div class="agri-details" hidden>
                  <div class="agri-detail-grid">

                    <div>
                      <span class="agri-detail-label">📅 Récolte estimée</span>
                      <strong>
                        ${formatDate(activity.harvestStart)}
                        → ${formatDate(activity.harvestEnd)}
                      </strong>
                    </div>

                    <div>
                      <span class="agri-detail-label">🚁 Prospection thermique</span>
                      <strong>
                        ${formatDate(addMonths(parseDate(activity.harvestStart), -1))}
                        → ${formatDate(parseDate(activity.harvestStart))}
                      </strong>
                    </div>

                    <div>
                      <span class="agri-detail-label">⭐ Niveau d'intérêt</span>
                      <strong>${esc(interestText(activity.interest))}</strong>
                    </div>

                    <div>
                      <span class="agri-detail-label">📍 Secteur</span>
                      <strong>
                        ${esc((activity.sectors || []).join(' · ') || data.sector)}
                      </strong>
                    </div>

                  </div>

                  <div class="agri-explanation">
                    <strong>Pourquoi prospecter ?</strong>
                    <p>${esc(activity.explanation)}</p>
                  </div>

                  <div class="agri-detail-note">
                    Les dates restent indicatives et dépendent notamment
                    de la météo, de la culture, de la parcelle et des pratiques
                    de l'exploitation.
                  </div>
                </div>

              </article>
            `;
          }).join('')}
        </div>

        <p class="agri-note">
          ℹ️ Les périodes sont indicatives et peuvent varier selon l'année,
          la météo, la culture, la parcelle et les pratiques de l'exploitation.
        </p>

      </section>
    `;

    container.querySelectorAll('.agri-card-button').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('.agri-card');
        const details = card.querySelector('.agri-details');
        const isOpen = !details.hidden;

        details.hidden = isOpen;
        button.setAttribute('aria-expanded', String(!isOpen));
        card.classList.toggle('expanded', !isOpen);
      });
    });
  }

  async function load(url = './plugin/agriculture/agriculture.json') {
    const response = await fetch(`${url}?ts=${Date.now()}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Agriculture HTTP ${response.status}`);
    }

    data = await response.json();
    return data;
  }

  async function init(container) {
    try {
      await load();
      render(container);
    } catch (error) {
      console.error('Event-drone Agriculture:', error);

      if (container) {
        container.innerHTML = `
          <div class="agri-error">
            Impossible de charger le calendrier agricole.
          </div>
        `;
      }
    }
  }

  return {
    load,
    render,
    init,
    get data() {
      return data;
    }
  };
})();
