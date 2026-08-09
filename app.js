const STORAGE = 'events-drone-user-v5';
const LEARN_THRESHOLD = 3;

let events = [];

const fallback = [
  {
    id: 'local-1',
    date: '2026-08-23',
    title: 'Fanfare Tzila Brass',
    place: 'Châteaubriant',
    distance: 1,
    description: 'Animation musicale en plein air.',
    outdoor: true,
    droneScore: 8,
    dronePotential: 'high'
  },
{
  id: 'local-2',
  date: '2026-08-28',
  title: 'Ciné plein-air – Un p’tit truc en plus',
  place: 'Châteaubriant',
  distance: 1,
  address: 'Promenade du Duc d’Aumale',
  startTime: '21:00',
  description: 'Projection en plein air.',
  outdoor: true,
  droneScore: 10,
  dronePotential: 'high'
},
{
  id: 'local-3',
  date: '2026-08-29',
  title: 'Forum des associations',
  place: 'Châteaubriant',
  distance: 1,
  address: 'Halle de Béré',
  description: 'Près de 100 associations.',
  outdoor: true,
  droneScore: 8,
  dronePotential: 'high'
},
{
  id: 'local-4',
  date: '2026-09-05',
  title: 'Nozay s’Expose !',
  place: 'Nozay',
  distance: 25,
  description: 'Artisans, associations, braderie, vide-grenier et animations.',
  outdoor: true,
  droneScore: 10,
  dronePotential: 'high'
},
{
  id: 'local-5',
  date: '2026-09-06',
  title: 'Vide-grenier',
  place: 'Châteaubriant',
  distance: 1,
  address: 'Halle de Béré',
  description: 'Vide-grenier.',
  outdoor: true,
  droneScore: 8,
  dronePotential: 'high'
},
{
  id: 'local-6',
  date: '2026-09-06',
  title: 'Vide-grenier + fête des résidents',
  place: 'Pouancé / Ombrée d’Anjou',
  distance: 20,
  description: 'Animations locales.',
  outdoor: true,
  droneScore: 10,
  dronePotential: 'high'
},
{
  id: 'local-7',
  date: '2026-09-06',
  title: 'Route 44 et ses motards',
  place: 'Sion-les-Mines',
  distance: 18,
  description: 'Rassemblement / vide-grenier.',
  outdoor: true,
  droneScore: 10,
  dronePotential: 'high'
}
];

const $ = s => document.querySelector(s);


/* =========================================================
 S TOCKAG*E UTILISATEUR
 ========================================================= */

function loadUser() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE) || '{}'
    );
  } catch {
    return {};
  }
}


function saveUser() {
  localStorage.setItem(
    STORAGE,
    JSON.stringify(
      Object.fromEntries(
        events.map(e => [
          e.id,
          {
            favorite: !!e.favorite,
            contact: e.contact || 'todo',
            flight: e.flight || 'unknown'
          }
        ])
      )
    )
  );
}


/* =========================================================
 O UTILS *
 ========================================================= */

function fmtDate(d) {
  const x = new Date(d + 'T12:00:00');

  return isNaN(x)
  ? String(d || 'Date inconnue')
  : x.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  });
}


function normalizeText(s) {
  return String(s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
}


/* =========================================================
 D ÉDOUBL*ONNAGE
 =========================================================

 On ne tient volontairement PAS compte :
 - de l'id
 - de la distance

 Deux fiches identiques à 0 km et 1 km seront donc fusionnées.

 En revanche :
 - date différente = événement différent
 - horaire différent = événement différent
 - lieu différent = événement différent
 */

function deduplicateEvents(list) {
  const seen = new Set();

  return list.filter(e => {
    const key = [
      normalizeText(e.title),
                     e.date || '',
                     e.startTime || '',
                     normalizeText(e.place),
                     normalizeText(e.address),
                     normalizeText(e.address2),
                     normalizeText(e.address3)
    ].join('|');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}


/* =========================================================
 A PPRENT*ISSAGE / POTENTIEL
 ========================================================= */

function categoryKey(e) {
  return normalizeText(
    e.category || 'sans categorie'
  );
}


function meaningfulWords(e) {
  return normalizeText(
    `${e.title || ''} ${e.category || ''}`
  )
  .split(' ')
  .filter(w =>
  w.length >= 5 &&
  ![
    'evenement',
    'evenements',
    'animation',
    'animations',
    'locale',
    'locales',
    'festival',
    'association',
    'associations'
  ].includes(w)
  );
}


function learning() {
  const u = loadUser();

  const category = {};
  const words = {};

  for (const e of events) {
    if (!e.favorite) continue;

    const c = categoryKey(e);

    category[c] = (category[c] || 0) + 1;

    for (const w of new Set(meaningfulWords(e))) {
      words[w] = (words[w] || 0) + 1;
    }
  }

  return {
    category,
    words
  };
}


function potentialLevel(e) {
  const l = learning();

  /*
   * Un événement régulièrement mis en favori
   * devient très haut potentiel.
   */

  if (
    (l.category[categoryKey(e)] || 0) >=
    LEARN_THRESHOLD
  ) {
    return 3;
  }

  for (const w of meaningfulWords(e)) {
    if ((l.words[w] || 0) >= LEARN_THRESHOLD) {
      return 3;
    }
  }

  /*
   * Potentiel provenant de la source.
   */

  if (
    e.dronePotential === 'high' ||
    Number(e.droneScore || 0) >= 6
  ) {
    return 2;
  }

  if (
    e.dronePotential === 'medium' ||
    Number(e.droneScore || 0) >= 3
  ) {
    return 1;
  }

  return 0;
}


function potentialLabel(level) {
  return [
    '☆ Faible potentiel',
    '★ Potentiel',
    '★★ Potentiel élevé',
    '★★★ Très haut potentiel'
  ][level];
}


function potentialClass(level) {
  return [
    'low',
    'medium',
    'high',
    'very-high'
  ][level];
}


/* =========================================================
 S TATUT *DRONE
 ========================================================= */

function statusLabel(e) {
  return {
    unknown: '🚁 Non vérifié',
    asked: '🟠 Autorisation demandée',
    accepted: '🟢 Vol accepté',
    refused: '🔴 Vol refusé'
  }[e.flight] || '🚁 Non vérifié';
}


/* =========================================================
 C ONTACT*
 ========================================================= */

/*
 * « À contacter » =
 * uniquement les favoris qui ne sont pas encore contactés.
 */

function isToContact(e) {
  return !!e.favorite &&
  e.contact !== 'contacted';
}


function isPotential(e) {
  return potentialLevel(e) >= 1;
}


/* =========================================================
 F ILTRES* RAPIDES
 ========================================================= */

function quickFilter(filter) {
  $('#statusFilter').value = filter;
  render();
}


/* =========================================================
 C HARGEM*ENT DES DONNÉES
 ========================================================= */

async function refresh() {
  $('#updated').textContent =
  '🔄 Actualisation…';

  try {
    const r = await fetch(
      './events.json?ts=' + Date.now(),
                          {
                            cache: 'no-store'
                          }
    );

    if (!r.ok) {
      throw new Error(r.status);
    }

    const data = await r.json();

    /*
     * Chargement :
     * source JSON
     * + fallback
     * + état utilisateur
     * + suppression des doublons
     */

    events = deduplicateEvents(
      applyUserState(
        mergeFallback(data.events || [])
      )
    );

    $('#updated').textContent =
    `✓ ${events.length} événements · ` +
    new Date().toLocaleTimeString(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );

  } catch (e) {
    console.error(e);

    events = deduplicateEvents(
      applyUserState(fallback)
    );

    $('#updated').textContent =
    '⚠️ events.json indisponible · données locales';
  }

  render();
}


/* =========================================================
 É TAT UT*ILISATEUR
 ========================================================= */

function applyUserState(list) {
  const u = loadUser();

  return list.map(e => ({
    ...e,

    ...(u[e.id] || {}),

                        /*
                         * IMPORTANT :
                         * on récupère bien l'état correspondant
                         * à l'id de l'événement.
                         */

                        contact:
                        u[e.id]?.contact ||
                        e.contact ||
                        'todo',

                        flight:
                        u[e.id]?.flight ||
                        e.flight ||
                        'unknown',

                        favorite:
                        !!u[e.id]?.favorite
  }));
}


/* =========================================================
 F ALLBAC*K
 ========================================================= */

function mergeFallback(list) {
  const ids = new Set(
    list.map(e => e.id)
  );

  return [
    ...list,
    ...fallback.filter(
      e => !ids.has(e.id)
    )
  ];
}


/* =========================================================
 A FFICHA*GE
 ========================================================= */

function render() {
  const max =
  Number($('#distance').value);

  const filter =
  $('#statusFilter').value;

  let list = events.filter(
    e => Number(e.distance) <= max
  );


  /* ---------- Filtres ---------- */

  if (filter === 'potential') {
    list = list.filter(isPotential);
  }

  if (filter === 'high') {
    list = list.filter(
      e => potentialLevel(e) === 2
    );
  }

  if (filter === 'very-high') {
    list = list.filter(
      e => potentialLevel(e) === 3
    );
  }

  if (filter === 'medium') {
    list = list.filter(
      e => potentialLevel(e) === 1
    );
  }

  if (filter === 'outdoor') {
    list = list.filter(
      e => e.outdoor
    );
  }

  if (filter === 'fav') {
    list = list.filter(
      e => e.favorite
    );
  }

  if (filter === 'todo') {
    list = list.filter(
      isToContact
    );
  }

  if (filter === 'contacted') {
    list = list.filter(
      e => e.contact === 'contacted'
    );
  }

  if (filter === 'accepted') {
    list = list.filter(
      e => e.flight === 'accepted'
    );
  }

  if (filter === 'refused') {
    list = list.filter(
      e => e.flight === 'refused'
    );
  }


  /* ---------- Tri ---------- */

  list.sort(
    (a, b) =>
    new Date(a.date) - new Date(b.date) ||
    potentialLevel(b) - potentialLevel(a) ||
    Number(a.distance) - Number(b.distance)
  );


  /* ---------- Statistiques ---------- */

  const within = events.filter(
    e => Number(e.distance) <= max
  );

  const quick = [
    [
      'all',
      '📅',
      within.length
    ],
    [
      'outdoor',
      '🚁',
      within.filter(
        e => e.outdoor
      ).length
    ],
    [
      'potential',
      '★',
      within.filter(
        isPotential
      ).length
    ],
    [
      'high',
      '★★',
      within.filter(
        e => potentialLevel(e) === 2
      ).length
    ],
    [
      'very-high',
      '★★★',
      within.filter(
        e => potentialLevel(e) === 3
      ).length
    ],
    [
      'fav',
      '⭐',
      within.filter(
        e => e.favorite
      ).length
    ],
    [
      'todo',
      '📞',
      within.filter(
        isToContact
      ).length
    ]
  ];


  $('#stats').innerHTML =
  quick.map(x =>
  `<button
  type="button"
  class="stat ${filter === x[0] ? 'active' : ''}"
  data-filter="${x[0]}"
  >
  <span class="stat-icon">${x[1]}</span>
  <span>${x[2]}</span>
  </button>`
  ).join('');


  $('#stats')
  .querySelectorAll('.stat')
  .forEach(btn => {
    btn.onclick = () =>
    quickFilter(
      btn.dataset.filter
    );
  });


  /* ---------- Liste ---------- */

  const box = $('#events');

  box.innerHTML = '';

  if (!list.length) {
    box.innerHTML =
    'Aucun événement avec ces filtres.';
  return;
  }


  /* ---------- Cartes ---------- */

  list.forEach(e => {
    const n =
    $('#eventTemplate')
    .content
    .cloneNode(true);

    const level =
    potentialLevel(e);


    n.querySelector('.date')
    .textContent =
    fmtDate(e.date) +
    (
      e.startTime
      ? ' · ' + e.startTime
      : ''
    );


    n.querySelector('.title')
    .textContent =
    e.title;


    n.querySelector('.place')
    .textContent =
    '📍 ' +
    e.place +
    (
      e.address
      ? ' — ' + e.address
      : ''
    );


    n.querySelector('.description')
    .textContent =
    e.description || '';


    n.querySelector('.distance-badge')
    .textContent =
    `${e.distance} km`;


    /* ---------- Potentiel ---------- */

    const pb =
    n.querySelector(
      '.potential-badge'
    );

    pb.textContent =
    potentialLabel(level);

    pb.className =
    'potential-badge ' +
    potentialClass(level);


    /* ---------- Extérieur ---------- */

    n.querySelector(
      '.outdoor-badge'
    ).textContent =
    e.outdoor
    ? '🚁 Extérieur'
    : '🏠 Intérieur';


    /* ---------- Contact ---------- */

    n.querySelector(
      '.contact-badge'
    ).textContent =
    e.contact === 'contacted'
    ? '📞 Contacté'
    : '📞 À contacter';


    /* ---------- Drone ---------- */

    n.querySelector(
      '.flight-badge'
    ).textContent =
    statusLabel(e);


    /* ---------- Favori ---------- */

    n.querySelector(
      '.fav'
    ).textContent =
    e.favorite
    ? '★'
    : '☆';


    n.querySelector(
      '.fav'
    ).onclick = () => {
      e.favorite =
      !e.favorite;

      saveUser();
      render();
    };


    /* ---------- Contact ---------- */

    n.querySelector(
      '.contact'
    ).onclick = () => {
      e.contact =
      e.contact === 'contacted'
      ? 'todo'
      : 'contacted';

      saveUser();
      render();
    };


    /* ---------- Vol ---------- */

    n.querySelector(
      '.flight'
    ).onclick = () => {
      const states = [
        'unknown',
        'asked',
        'accepted',
        'refused'
      ];

      e.flight =
      states[
        (
          states.indexOf(
            e.flight
          ) + 1
        ) % states.length
      ];

      saveUser();
      render();
    };


    /* ---------- Détails ---------- */

    n.querySelector(
      '.details'
    ).onclick = () => {
      const reasons =
      (e.droneReasons || [])
      .join(', ');

      alert(
        `${e.title}\n` +
        `${e.place}` +
        (
          e.address
          ? ' — ' + e.address
          : ''
        ) +
        `\n` +
        `${fmtDate(e.date)}` +
        (
          e.startTime
          ? ' · ' + e.startTime
          : ''
        ) +
        `\n\n` +

        `Potentiel drone : ` +
        `${potentialLabel(level)} ` +
        `(${e.droneScore || 0}/10)\n` +

        (
          reasons
          ? `Indices : ${reasons}\n`
          : ''
        ) +

        (
          e.outdoor
          ? 'Événement extérieur'
          : 'Événement intérieur'
        ) +
        `\n` +

        `Contact : ` +
        (
          e.contact === 'contacted'
          ? 'Contacté'
          : 'À contacter'
        ) +
        `\n` +

        `Drone : ${e.flight}` +

        (
          e.phone
          ? '\nTéléphone : ' +
          e.phone
          : ''
        ) +

        (
          e.email
          ? '\nEmail : ' +
          e.email
          : ''
        ) +

        (
          e.url
          ? '\n\n' + e.url
          : ''
        )
      );
    };


    box.appendChild(n);
  });
}


/* =========================================================
 É VÉNEME*NTS UI
 ========================================================= */

$('#distance').onchange =
render;

$('#statusFilter').onchange =
render;

$('#refresh').onclick =
refresh;


/* =========================================================
 S ERVICE* WORKER
 ========================================================= */

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(
    './sw.js'
  );
}


/* =========================================================
 D ÉMARRA*GE
 ========================================================= */

render();
refresh();
