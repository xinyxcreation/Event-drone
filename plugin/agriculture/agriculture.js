/*
 * Event-drone — Plugin Agriculture
 * Dossier : plugin/agriculture/
 *
 * Le plugin est volontairement indépendant du moteur actuel.
 * Il peut être chargé depuis index.html sans modifier app.js.
 */

window.EventDroneAgriculture = (() => {
  let data = { activities: [], sector: 'Châteaubriant / Loire-Atlantique', prospectionLeadMonths: 1 };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));

  function stars(level) {
    return '★'.repeat(Math.max(0, Math.min(3, Number(level) || 0)));
  }

  function interestText(level) {
    return ['Faible','Intéressant','Très intéressant','Très intéressant'][
      Math.max(0, Math.min(3, Number(level) || 0))
    ];
  }

  function render(container) {
    if (!container) return;

    const list = [...data.activities].sort(
      (a, b) => Number(b.interest || 0) - Number(a.interest || 0)
    );

    container.innerHTML = `
      <section class="agri-page">
        <div class="agri-header">
          <div>
            <div class="agri-kicker">🌾 Agriculture</div>
            <h2>Calendrier agricole</h2>
            <p>Repérez les périodes favorables à la prospection thermique.</p>
          </div>
          <div class="agri-sector">📍 ${esc(data.sector)}</div>
        </div>

        <div class="agri-info">
          🚁 <strong>Période favorable à la prospection thermique</strong>
          <span>1 mois avant le début de la période agricole.</span>
        </div>

        <div class="agri-list">
          ${list.map(activity => `
            <article class="agri-card">
              <div class="agri-card-top">
                <div>
                  <div class="agri-type">${esc(activity.type)}</div>
                  <div class="agri-period">📅 ${esc(activity.period)}</div>
                </div>
                <div class="agri-stars" aria-label="${esc(interestText(activity.interest))}">
                  ${stars(activity.interest)}
                </div>
              </div>

              <div class="agri-prospect">
                🚁 <strong>Période favorable à la prospection thermique</strong>
                <span>Environ 1 mois avant le début de la récolte ou de la fauche.</span>
              </div>

              <div class="agri-detail">
                <strong>Niveau d'intérêt :</strong>
                ${esc(interestText(activity.interest))}
              </div>

              <div class="agri-detail">
                <strong>Explication :</strong>
                ${esc(activity.explanation)}
              </div>

              <div class="agri-detail">
                <strong>📍 Communes / secteurs :</strong>
                ${esc((activity.sectors || []).join(' · ') || 'Non précisé')}
              </div>
            </article>
          `).join('')}
        </div>

        <div class="agri-note">
          ℹ️ Les périodes sont indicatives et peuvent varier selon l'année,
          la météo, la culture, la parcelle et les pratiques de l'exploitation.
        </div>
      </section>
    `;
  }

  async function load(url = './plugin/agriculture/agriculture.json') {
    const response = await fetch(`${url}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Agriculture HTTP ${response.status}`);
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

  return { load, render, init, get data() { return data; } };
})();
