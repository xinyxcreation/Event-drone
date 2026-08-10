/*
 * Event-drone — Module Agriculture
 * Version 1.0
 *
 * Le module affiche des périodes agricoles indicatives.
 * La fenêtre de prospection thermique est calculée 1 mois
 * avant le début de la période agricole lorsqu'une date
 * exploitable est disponible.
 */

const Agriculture = (() => {
  let activities = [];

  const $ = (selector, root = document) => root.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function stars(level) {
    return '★'.repeat(Math.max(0, Math.min(3, Number(level) || 0)));
  }

  function prospectLabel(level) {
    return [
      'Faible intérêt',
      'Intéressant',
      'Très intéressant',
      'Très intéressant'
    ][Math.max(0, Math.min(3, Number(level) || 0))];
  }

  function render(target) {
    const root = typeof target === 'string' ? $(target) : target;
    if (!root) return;

    const sorted = [...activities].sort((a, b) =>
      Number(b.interest || 0) - Number(a.interest || 0)
    );

    root.innerHTML = `
      <section class="agri-page">
        <header class="agri-header">
          <div>
            <div class="agri-kicker">🌾 Agriculture</div>
            <h2>Calendrier agricole</h2>
            <p>Repérez les périodes favorables à la prospection thermique.</p>
          </div>
          <div class="agri-sector">📍 ${escapeHtml(
            window.AGRICULTURE_SECTOR || 'Châteaubriant / Loire-Atlantique'
          )}</div>
        </header>

        <div class="agri-info">
          🚁 <strong>Période favorable à la prospection thermique :</strong>
          environ 1 mois avant le début de la récolte ou de la fauche.
        </div>

        <div class="agri-list">
          ${sorted.map(card).join('')}
        </div>

        <p class="agri-disclaimer">
          ℹ️ Les périodes agricoles sont indicatives. Elles peuvent varier
          selon l'année, la météo, la culture, la parcelle et les pratiques
          de l'exploitation.
        </p>
      </section>
    `;
  }

  function card(a) {
    const level = Number(a.interest) || 0;

    return `
      <article class="agri-card">
        <div class="agri-card-top">
          <div>
            <div class="agri-type">${escapeHtml(a.type)}</div>
            <div class="agri-period">📅 ${escapeHtml(a.period)}</div>
          </div>
          <div class="agri-interest" title="${escapeHtml(prospectLabel(level))}">
            ${stars(level)}
          </div>
        </div>

        <div class="agri-prospect">
          🚁 <strong>Période favorable à la prospection thermique</strong>
          <span>1 mois avant le début de la période agricole</span>
        </div>

        <div class="agri-detail">
          <strong>Niveau d'intérêt :</strong>
          ${escapeHtml(prospectLabel(level))}
        </div>

        <div class="agri-detail">
          <strong>Explication :</strong>
          ${escapeHtml(a.explanation)}
        </div>

        <div class="agri-detail">
          <strong>📍 Secteurs concernés :</strong>
          ${escapeHtml((a.sectors || []).join(' · ') || 'Secteur non précisé')}
        </div>
      </article>
    `;
  }

  async function load(url = './agriculture.json') {
    const response = await fetch(`${url}?ts=${Date.now()}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Agriculture: HTTP ${response.status}`);
    }

    const data = await response.json();
    activities = Array.isArray(data.activities) ? data.activities : [];
    window.AGRICULTURE_SECTOR = data.sector || 'Châteaubriant / Loire-Atlantique';
    return activities;
  }

  return {
    load,
    render,
    get activities() {
      return [...activities];
    }
  };
})();
