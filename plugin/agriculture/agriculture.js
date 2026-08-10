window.EventDroneAgriculture = (() => {
  let data = {
    activities: [],
    sector: 'Châteaubriant · Loire-Atlantique',
    prospectionLeadMonths: 1
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[c]));

  const parseDate = value => {
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatDate = value => {
    const d = parseDate(value);
    if (!d) return value || 'Date inconnue';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long'
    });
  };

  const addMonth = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  function status(activity) {
    const start = parseDate(activity.harvestStart);
    const end = parseDate(activity.harvestEnd);

    if (!start || !end) return 'none';

    const prospectStart = addMonth(start, -1);
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    if (now >= start && now <= end) return 'harvest';
    if (now >= prospectStart && now < start) return 'prospect';
    return 'none';
  }

  function stars(level) {
    return '★'.repeat(Math.max(0, Math.min(3, Number(level) || 0)));
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
          <h2>Calendrier agricole</h2>
          <p class="agri-intro-text">
            Repérez les périodes favorables à la prospection thermique
            avant les travaux agricoles.
          </p>

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
              state === 'harvest' ? '🟢 Récolte en cours' :
              state === 'prospect' ? '🟡 Période de prospection' :
              '';

            return `
              <article class="agri-card agri-${state}" tabindex="0">

                <button
                  type="button"
                  class="agri-card-button"
                  aria-expanded="false"
                >
                  <span class="agri-card-main">
                    <span class="agri-type">${esc(activity.type)}</span>
                    <span class="agri-period">
                      ${formatDate(activity.harvestStart)}
                      → ${formatDate(activity.harvestEnd)}
                    </span>

                    <span class="agri-timeline" aria-hidden="true">
                      <span class="agri-timeline-prospect"></span>
                      <span class="agri-timeline-harvest"></span>
                    </span>

                    ${stateLabel ? `<span class="agri-state">${stateLabel}</span>` : ''}
                  </span>

                  <span class="agri-card-side">
                    <span class="agri-stars">${stars(activity.interest)}</span>
                    <span class="agri-chevron">⌄</span>
                  </span>
                </button>

                <div class="agri-details" hidden>
                  <div class="agri-detail-grid">
                    <div>
                      <span class="agri-detail-label">📅 Récolte estimée</span>
                      <strong>${formatDate(activity.harvestStart)} → ${formatDate(activity.harvestEnd)}</strong>
                    </div>

                    <div>
                      <span class="agri-detail-label">🚁 Prospection thermique</span>
                      <strong>${formatDate(addMonth(parseDate(activity.harvestStart), -1).toISOString().slice(0,10))}
                        → ${formatDate(activity.harvestStart)}</strong>
                    </div>

                    <div>
                      <span class="agri-detail-label">⭐ Niveau d'intérêt</span>
                      <strong>${esc(interestText(activity.interest))}</strong>
                    </div>

                    <div>
                      <span class="agri-detail-label">📍 Secteur</span>
                      <strong>${esc((activity.sectors || []).join(' · ') || data.sector)}</strong>
                    </div>
                  </div>

                  <div class="agri-explanation">
                    <strong>Pourquoi ?</strong>
                    <p>${esc(activity.explanation)}</p>
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
        const open = !details.hidden;

        details.hidden = open;
        button.setAttribute('aria-expanded', String(!open));
        card.classList.toggle('expanded', !open);
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
