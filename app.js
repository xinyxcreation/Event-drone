const STORAGE = 'events-drone-user-v5';
const LEARN_THRESHOLD = 3;

let events = [];
let learningCache = null;
let potentialCache = new Map();

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

const $ = selector => document.querySelector(selector);


/* =========================================================
 U TILISA*TEUR / LOCAL STORAGE
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


/*
 * Sauvegarde uniquement l'événement modifié.
 *
 * Avant :
 *   on réécrivait les ~9 000 événements à chaque clic.
 *
 * Maintenant :
 *   on écrit uniquement l'état de l'événement concerné.
 */
function saveEventState(e) {
  const user = loadUser();

  user[e.id] = {
    favorite: !!e.favorite,
    contact: e.contact || 'todo',
    flight: e.flight || 'unknown'
  };

  localStorage.setItem(
    STORAGE,
    JSON.stringify(user)
  );

  learningCache = null;
  potentialCache.clear();
}


/* =========================================================
 T EXTE  *
 ========================================================= */

function normalizeText(value) {
  return String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
}


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
  .filter(word =>
  word.length >= 5 &&
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
  ].includes(word)
  );
}


/* =========================================================
 D ATES  *
 ========================================================= */

function fmtDate(date) {
  const x = new Date(
    String(date || '') + 'T12:00:00'
  );

  if (isNaN(x)) {
    return String(date || 'Date inconnue');
  }

  return x.toLocaleDateString(
    'fr-FR',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'long'
    }
  );
}


/* =========================================================
 E TAT UT*ILISATEUR
 ========================================================= */

function applyUserState(list) {
  const user = loadUser();

  return list.map(e => {
    const state = user[e.id] || {};

    return {
      ...e,

      favorite: !!state.favorite,

      contact:
      state.contact ||
      e.contact ||
      'todo',

      flight:
      state.flight ||
      e.flight ||
      'unknown'
    };
  });
}


/* =========================================================
 D EDOUBL*ONNAGE
 ========================================================= */

/*
 * Certains événements peuvent apparaître plusieurs fois
 * dans la source avec des IDs différents.
 *
 * On construit une clé avec :
 * titre + date + heure + lieu + adresse
 */

function eventDuplicateKey(e) {
  return normalizeText(
    [
      e.title,
      e.date,
      e.startTime,
      e.place,
      e.address
    ]
    .filter(Boolean)
    .join('|')
  );
}


function deduplicateEvents(list) {
  const seen = new Set();
  const result = [];

  for (const event of list) {
    const key = eventDuplicateKey(event);

    if (!key) {
      result.push(event);
      continue;
    }

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(event);
  }

  return result;
}


/* =========================================================
 F ALLBAC*K
 ========================================================= */

function mergeFallback(list) {
  const existingKeys = new Set(
    list.map(eventDuplicateKey)
  );

  const additions = fallback.filter(
    event => !existingKeys.has(
      eventDuplicateKey(event)
    )
  );

  return deduplicateEvents([
    ...list,
    ...additions
  ]);
}


/* =========================================================
 A PPRENT*ISSAGE
 ========================================================= */

/*
 * Le système apprend des favoris.
 *
 * 3 favoris similaires :
 *
 * catégorie régulièrement favorite
 *       OU
 * mots régulièrement présents
 *
 * => ★★★ Très haut potentiel
 */

function learning() {
  if (learningCache) {
    return learningCache;
  }

  const category = Object.create(null);
  const words = Object.create(null);

  for (const e of events) {
    if (!e.favorite) {
      continue;
    }

    const categoryName = categoryKey(e);

    category[categoryName] =
    (category[categoryName] || 0) + 1;

    const uniqueWords = new Set(
      meaningfulWords(e)
    );

    for (const word of uniqueWords) {
      words[word] =
      (words[word] || 0) + 1;
    }
  }

  learningCache = {
    category,
    words
  };

  return learningCache;
}


/* =========================================================
 P OTENTI*EL
 ========================================================= */

function potentialLevel(e) {

  /*
   * Cache individuel.
   *
   * Un même événement peut être demandé
   * plusieurs dizaines de fois pendant render().
   */
  if (potentialCache.has(e.id)) {
    return potentialCache.get(e.id);
  }

  const learned = learning();

  let level = 0;

  /*
   * ★★★
   * Apprentissage automatique.
   */

  if (
    (learned.category[categoryKey(e)] || 0)
    >= LEARN_THRESHOLD
  ) {
    level = 3;
  }

  if (level < 3) {
    for (const word of meaningfulWords(e)) {

      if (
        (learned.words[word] || 0)
        >= LEARN_THRESHOLD
      ) {
        level = 3;
        break;
      }
    }
  }

  /*
   * Potentiel fourni par la source.
   */

  if (level < 3) {

    if (
      e.dronePotential === 'high' ||
      Number(e.droneScore || 0) >= 6
    ) {
      level = 2;
    }

    else if (
      e.dronePotential === 'medium' ||
      Number(e.droneScore || 0) >= 3
    ) {
      level = 1;
    }
  }

  potentialCache.set(
    e.id,
    level
  );

  return level;
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
 E TATS  *
 ========================================================= */

function statusLabel(e) {
  return {
    unknown: '🚁 Non vérifié',
    asked: '🟠 Autorisation demandée',
    accepted: '🟢 Vol accepté',
    refused: '🔴 Vol refusé'
  }[e.flight] || '🚁 Non vérifié';
}


/*
 * "À contacter" = favoris non encore contactés.
 */

function isToContact(e) {
  return (
    !!e.favorite &&
    e.contact !== 'contacted'
  );
}


function isPotential(e) {
  return potentialLevel(e) >= 1;
}


/* =========================================================
 F ILTRE *RAPIDE
 ========================================================= */

function quickFilter(filter) {

  const select = $('#statusFilter');

  if (!select) {
    return;
  }

  select.value = filter;

  render();
}


/* =========================================================
 A CTUALI*SATION
 ========================================================= */

async function refresh() {

  if ($('#updated')) {
    $('#updated').textContent =
    '🔄 Actualisation…';
  }

  try {

    const response = await fetch(
      './events.json?ts=' + Date.now(),
                                 {
                                   cache: 'no-store'
                                 }
    );

    if (!response.ok) {
      throw new Error(
        'HTTP ' + response.status
      );
    }

    const data = await response.json();

    let list = Array.isArray(data.events)
    ? data.events
    : [];

    /*
     * Dédoublonnage avant tout traitement.
     */
    list = deduplicateEvents(list);

    /*
     * Ajout des événements locaux
     * qui ne sont pas déjà présents.
     */
    list = mergeFallback(list);

    /*
     * Application des favoris / contacts / vols.
     */
    events = applyUserState(list);

    learningCache = null;
    potentialCache.clear();

    if ($('#updated')) {

      $('#updated').textContent =
      `✓ ${events.length} événements · ` +
      new Date().toLocaleTimeString(
        'fr-FR',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      );
    }

  } catch (error) {

    console.error(
      'Erreur chargement events.json:',
      error
    );

    events = applyUserState(
      deduplicateEvents(fallback)
    );

    learningCache = null;
    potentialCache.clear();

    if ($('#updated')) {
      $('#updated').textContent =
      '⚠️ events.json indisponible · données locales';
    }
  }

  render();
}


/* =========================================================
 R ENDU  *
 ========================================================= */

function render() {

  const distanceElement = $('#distance');
  const filterElement = $('#statusFilter');

  if (!distanceElement || !filterElement) {
    return;
  }

  const max = Number(
    distanceElement.value
  );

  const filter =
  filterElement.value;

  /*
   * Nouveau calcul d'apprentissage uniquement
   * lorsqu'un état a changé.
   */
  learningCache = null;
  potentialCache.clear();

  /*
   * Calcul du potentiel une seule fois par événement.
   */
  for (const e of events) {
    potentialLevel(e);
  }

  /*
   * Filtre distance.
   */
  let list = events.filter(
    e => Number(e.distance) <= max
  );

  /*
   * Filtres.
   */

  switch (filter) {

    case 'potential':
      list = list.filter(
        e => potentialLevel(e) >= 1
      );
      break;

    case 'high':
      list = list.filter(
        e => potentialLevel(e) === 2
      );
      break;

    case 'very-high':
      list = list.filter(
        e => potentialLevel(e) === 3
      );
      break;

    case 'medium':
      list = list.filter(
        e => potentialLevel(e) === 1
      );
      break;

    case 'outdoor':
      list = list.filter(
        e => e.outdoor
      );
      break;

    case 'fav':
      list = list.filter(
        e => e.favorite
      );
      break;

    case 'todo':
      list = list.filter(
        isToContact
      );
      break;

    case 'contacted':
      list = list.filter(
        e => e.contact === 'contacted'
      );
      break;

    case 'accepted':
      list = list.filter(
        e => e.flight === 'accepted'
      );
      break;

    case 'refused':
      list = list.filter(
        e => e.flight === 'refused'
      );
      break;
  }


  /* =======================================================
   T RI  *
   ======================================================= */

  list.sort(
    (a, b) => {

      const dateA =
      new Date(
        `${a.date || '9999-12-31'}T${a.startTime || '00:00'}`
      );

      const dateB =
      new Date(
        `${b.date || '9999-12-31'}T${b.startTime || '00:00'}`
      );

      return (
        dateA - dateB ||
        potentialLevel(b) - potentialLevel(a) ||
        Number(a.distance || 0) -
        Number(b.distance || 0)
      );
    }
  );


  /* =======================================================
   S TATI*STIQUES / FILTRES RAPIDES
   ======================================================= */

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
        e => potentialLevel(e) >= 1
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


  const stats = $('#stats');

  if (stats) {

    stats.innerHTML =
    quick.map(
      item => `
      <button
      type="button"
      class="stat ${
        filter === item[0]
        ? 'active'
        : ''
      }"
      data-filter="${item[0]}"
      >
      <span class="stat-icon">
      ${item[1]}
      </span>

      <span>
      ${item[2]}
      </span>
      </button>
      `
    ).join('');


    /*
     * Un seul gestionnaire par bouton.
     */
    stats
    .querySelectorAll('.stat')
    .forEach(button => {

      button.onclick = () => {
        quickFilter(
          button.dataset.filter
        );
      };

    });
  }


  /* =======================================================
   E VENE*MENTS
   ======================================================= */

  const box = $('#events');

  if (!box) {
    return;
  }

  box.innerHTML = '';


  if (!list.length) {

    box.textContent =
    'Aucun événement avec ces filtres.';

  return;
  }


  const template =
  $('#eventTemplate');

  if (!template) {
    console.error(
      'eventTemplate introuvable'
    );
    return;
  }


  /*
   * Création des cartes.
   */

  const fragment =
  document.createDocumentFragment();


  for (const e of list) {

    const node =
    template.content.cloneNode(true);

    const level =
    potentialLevel(e);


    /* Date */

    const dateElement =
    node.querySelector('.date');

    if (dateElement) {

      dateElement.textContent =
      fmtDate(e.date) +
      (
        e.startTime
        ? ' · ' + e.startTime
        : ''
      );
    }


    /* Titre */

    const titleElement =
    node.querySelector('.title');

    if (titleElement) {
      titleElement.textContent =
      e.title || 'Événement';
    }


    /* Lieu */

    const placeElement =
    node.querySelector('.place');

    if (placeElement) {

      placeElement.textContent =
      '📍 ' +
      (e.place || '') +
      (
        e.address
        ? ' — ' + e.address
        : ''
      );
    }


    /* Description */

    const descriptionElement =
    node.querySelector('.description');

    if (descriptionElement) {

      descriptionElement.textContent =
      e.description || '';
    }


    /* Distance */

    const distanceElement =
    node.querySelector(
      '.distance-badge'
    );

    if (distanceElement) {

      distanceElement.textContent =
      `${e.distance} km`;
    }


    /* Potentiel */

    const potentialElement =
    node.querySelector(
      '.potential-badge'
    );

    if (potentialElement) {

      potentialElement.textContent =
      potentialLabel(level);

      potentialElement.className =
      'potential-badge ' +
      potentialClass(level);
    }


    /* Extérieur / intérieur */

    const outdoorElement =
    node.querySelector(
      '.outdoor-badge'
    );

    if (outdoorElement) {

      outdoorElement.textContent =
      e.outdoor
      ? '🚁 Extérieur'
      : '🏠 Intérieur';
    }


    /* Contact */

    const contactBadge =
    node.querySelector(
      '.contact-badge'
    );

    if (contactBadge) {

      contactBadge.textContent =
      e.contact === 'contacted'
      ? '📞 Contacté'
      : '📞 À contacter';
    }


    /* Vol */

    const flightBadge =
    node.querySelector(
      '.flight-badge'
    );

    if (flightBadge) {

      flightBadge.textContent =
      statusLabel(e);
    }


    /* Favori */

    const favoriteButton =
    node.querySelector('.fav');

    if (favoriteButton) {

      favoriteButton.textContent =
      e.favorite
      ? '★'
      : '☆';

      favoriteButton.classList.toggle(
        'active',
        e.favorite
      );


      favoriteButton.onclick = () => {

        e.favorite =
        !e.favorite;

        saveEventState(e);

        /*
         * Pas de délai :
         * le rendu est immédiat.
         */
        render();
      };
    }


    /* Contact */

    const contactButton =
    node.querySelector('.contact');

    if (contactButton) {

      contactButton.onclick = () => {

        e.contact =
        e.contact === 'contacted'
        ? 'todo'
        : 'contacted';

        saveEventState(e);

        render();
      };
    }


    /* Vol */

    const flightButton =
    node.querySelector('.flight');

    if (flightButton) {

      flightButton.onclick = () => {

        const states = [
          'unknown',
          'asked',
          'accepted',
          'refused'
        ];

        const currentIndex =
        states.indexOf(
          e.flight
        );

        e.flight =
        states[
          (currentIndex + 1) %
          states.length
        ];

        saveEventState(e);

        render();
      };
    }


    /* Détails */

    const detailsButton =
    node.querySelector('.details');

    if (detailsButton) {

      detailsButton.onclick = () => {

        const reasons =
        Array.isArray(
          e.droneReasons
        )
        ? e.droneReasons.join(', ')
        : '';

        alert(
          `${e.title || 'Événement'}\n` +
          `${e.place || ''}` +
          (
            e.address
            ? ` — ${e.address}`
            : ''
          ) +
          `\n` +
          `${fmtDate(e.date)}` +
          (
            e.startTime
            ? ` · ${e.startTime}`
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
            ? 'Événement extérieur\n'
            : 'Événement intérieur\n'
          ) +

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
            ? `\nTéléphone : ${e.phone}`
            : ''
          ) +

          (
            e.email
            ? `\nEmail : ${e.email}`
            : ''
          ) +

          (
            e.url
            ? `\n\n${e.url}`
            : ''
          )
        );
      };
    }


    fragment.appendChild(node);
  }


  /*
   * Un seul ajout au DOM au lieu de modifier
   * le DOM à chaque événement.
   */
  box.appendChild(fragment);
}


/* =========================================================
 C ONTROL*ES
 ========================================================= */

const distanceElement =
$('#distance');

if (distanceElement) {

  distanceElement.onchange =
  render;
}


const statusElement =
$('#statusFilter');

if (statusElement) {

  statusElement.onchange =
  render;
}


const refreshButton =
$('#refresh');

if (refreshButton) {

  refreshButton.onclick =
  refresh;
}


/* =========================================================
 S ERVICE* WORKER
 ========================================================= */

if (
  'serviceWorker' in navigator
) {

  navigator.serviceWorker
  .register('sw.js')
  .catch(error => {
    console.warn(
      'Service Worker :',
      error
    );
  });
}


/* =========================================================
 D EMARRA*GE
 ========================================================= */

render();
refresh();
