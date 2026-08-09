/* =========================================================
 E VENT-D*RONE
 Sauvegarde synchronisée Supabase
 Identifiant unique : event-drone-dronix
 ========================================================= */

const STORAGE = 'events-drone-user-v5';

const SUPABASE_URL =
'https://bqfeuzynjeofcwqqlcgw.supabase.co';

const SUPABASE_KEY =
'sb_publishable_w68t2Dfy6yCyCtOltOFDcQ_Et3nMBE5';

const SUPABASE_TABLE =
'event_drone_user_data';

const USER_ID =
'event-drone-dronix';

const LEARN_THRESHOLD = 3;

let events = [];

let learningCache = null;
let potentialCache = new Map();

let cloudReady = false;
let cloudSyncPromise = null;


/* =========================================================
 F ALLBAC*K
 ========================================================= */

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
  description:
  'Artisans, associations, braderie, vide-grenier et animations.',
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


/* =========================================================
 D OM    *
 ========================================================= */

const $ = selector =>
document.querySelector(selector);


/* =========================================================
 L OCAL S*TORAGE
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


function saveLocalEvent(e) {

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
}


/* =========================================================
 S UPABAS*E
 ========================================================= */

function supabaseHeaders(extra = {}) {

  return {
    apikey: SUPABASE_KEY,

    Authorization:
    `Bearer ${SUPABASE_KEY}`,

    'Content-Type':
    'application/json',

    ...extra
  };
}


/*
 * Vérifie que Supabase répond.
 */

async function testSupabase() {

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}` +
      `?select=event_id&user_id=eq.${encodeURIComponent(USER_ID)}` +
      `&limit=1`,
      {
        method: 'GET',
        headers: supabaseHeaders()
      }
    );

    if (!response.ok) {

      console.warn(
        'Supabase indisponible:',
        response.status,
        await response.text()
      );

      return false;
    }

    return true;

  } catch (error) {

    console.warn(
      'Supabase inaccessible:',
      error
    );

    return false;
  }
}


/*
 * Récupère toutes les données utilisateur.
 */

async function loadCloudUserData() {

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}` +
      `?select=event_id,favorite,contact,flight,updated_at` +
      `&user_id=eq.${encodeURIComponent(USER_ID)}`,
                                 {
                                   method: 'GET',
                                   headers: supabaseHeaders()
                                 }
    );

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}: ` +
        await response.text()
      );
    }

    const rows =
    await response.json();

    return Array.isArray(rows)
    ? rows
    : [];

  } catch (error) {

    console.warn(
      'Impossible de récupérer Supabase:',
      error
    );

    return null;
  }
}


/*
 * Sauvegarde un événement dans Supabase.
 *
 * UPSERT :
 * - crée si absent
 * - modifie si présent
 */

async function saveCloudEvent(e) {

  const payload = {

    user_id: USER_ID,

    event_id: String(e.id),

    favorite: !!e.favorite,

    contact:
    e.contact || 'todo',

    flight:
    e.flight || 'unknown',

    updated_at:
    new Date().toISOString()
  };


  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`,
      {
        method: 'POST',

        headers: supabaseHeaders({
          Prefer:
          'resolution=merge-duplicates,return=minimal'
        }),

        body:
        JSON.stringify(payload)
      }
    );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}: ` +
        await response.text()
      );
    }


    cloudReady = true;

    return true;

  } catch (error) {

    cloudReady = false;

    console.warn(
      'Sauvegarde Supabase échouée:',
      error
    );

    return false;
  }
}


/* =========================================================
 S YNCHRO*NISATION
 ========================================================= */

async function synchronizeUserData() {

  /*
   * Évite plusieurs synchronisations simultanées.
   */

  if (cloudSyncPromise) {
    return cloudSyncPromise;
  }


  cloudSyncPromise =
  (async () => {

    const local =
    loadUser();


    const remote =
    await loadCloudUserData();


    /*
     * Supabase inaccessible :
     * on continue avec le cache local.
     */

    if (remote === null) {

      cloudReady = false;

      return;
    }


    cloudReady = true;


    /*
     * Conversion des données distantes.
     */

    const remoteUser = {};

    for (const row of remote) {

      remoteUser[row.event_id] = {

        favorite:
        !!row.favorite,

        contact:
        row.contact || 'todo',

        flight:
        row.flight || 'unknown'
      };
    }


    /*
     * On commence avec les données locales.
     */

    const merged = {
      ...local
    };


    /*
     * Les données présentes dans Supabase
     * sont prioritaires.
     */

    for (const [id, state] of Object.entries(
      remoteUser
    )) {

      merged[id] = state;
    }


    /*
     * Mise à jour locale.
     */

    localStorage.setItem(
      STORAGE,
      JSON.stringify(merged)
    );


    /*
     * Application immédiate aux événements.
     */

    events = events.map(e => {

      const state =
      merged[e.id];

      if (!state) {
        return e;
      }

      return {
        ...e,

        favorite:
        !!state.favorite,

        contact:
        state.contact ||
        'todo',

        flight:
        state.flight ||
        'unknown'
      };
    });


    /*
     * Migration automatique :
     *
     * Les données qui existaient seulement
     * dans localStorage sont envoyées
     * vers Supabase.
     */

    const remoteIds =
    new Set(
      remote.map(row =>
      String(row.event_id)
      )
    );


    const localEntries =
    Object.entries(local);


    for (const [eventId, state] of localEntries) {

      if (remoteIds.has(String(eventId))) {
        continue;
      }


      await saveCloudEvent({

        id: eventId,

        favorite:
        !!state.favorite,

        contact:
        state.contact ||
        'todo',

        flight:
        state.flight ||
        'unknown'
      });
    }


    learningCache = null;
    potentialCache.clear();

  })()
  .finally(() => {

    cloudSyncPromise = null;
  });


  return cloudSyncPromise;
}


/* =========================================================
 S AUVEGA*RDE UTILISATEUR
 ========================================================= */

async function saveEventState(e) {

  /*
   * Sauvegarde locale immédiate.
   * L'interface n'attend pas Internet.
   */

  saveLocalEvent(e);

  learningCache = null;
  potentialCache.clear();


  /*
   * Sauvegarde distante en arrière-plan.
   */

  if (cloudReady) {

    saveCloudEvent(e);

  } else {

    /*
     * Si Supabase n'était pas disponible,
     * on retente.
     */

    const available =
    await testSupabase();

    if (available) {

      cloudReady = true;

      await saveCloudEvent(e);
    }
  }
}


/* =========================================================
 T EXTE  *
 ========================================================= */

function normalizeText(value) {

  return String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(
    /[\u0300-\u036f]/g,
    ''
  )
  .replace(
    /[^a-z0-9\s-]/g,
    ' '
  )
  .replace(
    /\s+/g,
    ' '
  )
  .trim();
}


function categoryKey(e) {

  return normalizeText(
    e.category ||
    'sans categorie'
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
 D ATE   *
 ========================================================= */

function fmtDate(date) {

  const x =
  new Date(
    String(date || '') +
    'T12:00:00'
  );


  if (isNaN(x)) {

    return String(
      date ||
      'Date inconnue'
    );
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

  const user =
  loadUser();


  return list.map(e => {

    const state =
    user[e.id] ||
    {};


    return {

      ...e,

      favorite:
      !!state.favorite,

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

  const seen =
  new Set();

  const result =
  [];


  for (const event of list) {

    const key =
    eventDuplicateKey(event);


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

  const existingKeys =
  new Set(
    list.map(eventDuplicateKey)
  );


  const additions =
  fallback.filter(
    event =>
    !existingKeys.has(
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

function learning() {

  if (learningCache) {
    return learningCache;
  }


  const category =
  Object.create(null);

  const words =
  Object.create(null);


  for (const e of events) {

    if (!e.favorite) {
      continue;
    }


    const categoryName =
    categoryKey(e);


    category[categoryName] =
    (category[categoryName] || 0) + 1;


    const uniqueWords =
    new Set(
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

  if (
    potentialCache.has(e.id)
  ) {

    return potentialCache.get(
      e.id
    );
  }


  const learned =
  learning();


  let level = 0;


  /*
   * ★★★ appris automatiquement
   */

  if (
    (
      learned.category[
        categoryKey(e)
      ] || 0
    ) >= LEARN_THRESHOLD
  ) {

    level = 3;
  }


  if (level < 3) {

    for (
      const word of meaningfulWords(e)
    ) {

      if (
        (
          learned.words[word] || 0
        ) >= LEARN_THRESHOLD
      ) {

        level = 3;

        break;
      }
    }
  }


  /*
   * ★★ potentiel fourni par la source
   */

  if (level < 3) {

    if (
      e.dronePotential === 'high' ||
      Number(e.droneScore || 0) >= 6
    ) {

      level = 2;

    } else if (
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
 S TATUT *VOL
 ========================================================= */

function statusLabel(e) {

  return {

    unknown:
    '🚁 Non vérifié',

    asked:
    '🟠 Autorisation demandée',

    accepted:
    '🟢 Vol accepté',

    refused:
    '🔴 Vol refusé'

  }[
    e.flight
  ] || '🚁 Non vérifié';
}


/* =========================================================
 C ONTACT*
 ========================================================= */

function isToContact(e) {

  return (
    !!e.favorite &&
    e.contact !== 'contacted'
  );
}


function isPotential(e) {

  return (
    potentialLevel(e) >= 1
  );
}


/* =========================================================
 F ILTRE *RAPIDE
 ========================================================= */

function quickFilter(filter) {

  const select =
  $('#statusFilter');


  if (!select) {
    return;
  }


  select.value =
  filter;


  render();
}


/* =========================================================
 C HARGEM*ENT EVENTS.JSON
 ========================================================= */

async function refresh() {

  const updated =
  $('#updated');


  if (updated) {

    updated.textContent =
    '🔄 Actualisation…';
  }


  try {

    const response =
    await fetch(
      './events.json?ts=' +
      Date.now(),
                {
                  cache: 'no-store'
                }
    );


    if (!response.ok) {

      throw new Error(
        'HTTP ' +
        response.status
      );
    }


    const data =
    await response.json();


    let list =
    Array.isArray(data.events)
    ? data.events
    : [];


    /*
     * Suppression des doublons
     */

    list =
    deduplicateEvents(list);


    /*
     * Ajout des événements locaux
     */

    list =
    mergeFallback(list);


    /*
     * Application du cache local
     */

    events =
    applyUserState(list);


    learningCache = null;
    potentialCache.clear();


    if (updated) {

      updated.textContent =
      `✓ ${events.length} événements · ` +
      new Date().toLocaleTimeString(
        'fr-FR',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      );
    }


    /*
     * Affichage immédiatement.
     */

    render();


    /*
     * Synchronisation cloud
     * sans bloquer l'affichage.
     */

    synchronizeUserData()
    .then(() => {

      render();

    })
    .catch(error => {

      console.warn(
        'Synchronisation:',
        error
      );
    });


  } catch (error) {

    console.error(
      'Erreur chargement events.json:',
      error
    );


    events =
    applyUserState(
      deduplicateEvents(
        fallback
      )
    );


    learningCache = null;
    potentialCache.clear();


    if (updated) {

      updated.textContent =
      '⚠️ events.json indisponible · données locales';
    }


    render();


    /*
     * Même en fallback, on tente
     * de récupérer les données cloud.
     */

    synchronizeUserData()
    .then(() => render())
    .catch(() => {});
  }
}


/* =========================================================
 R ENDU  *
 ========================================================= */

function render() {

  const distanceElement =
  $('#distance');

  const filterElement =
  $('#statusFilter');


  if (
    !distanceElement ||
    !filterElement
  ) {

    return;
  }


  const max =
  Number(
    distanceElement.value
  );


  const filter =
  filterElement.value;


  /*
   * Reconstruction du cache potentiel.
   */

  learningCache = null;
  potentialCache.clear();


  /*
   * Calcul une seule fois.
   */

  for (const e of events) {

    potentialLevel(e);
  }


  /*
   * Distance
   */

  let list =
  events.filter(
    e =>
    Number(e.distance) <= max
  );


  /*
   * Filtres
   */

  switch (filter) {

    case 'potential':

      list =
      list.filter(
        e =>
        potentialLevel(e) >= 1
      );

      break;


    case 'high':

      list =
      list.filter(
        e =>
        potentialLevel(e) === 2
      );

      break;


    case 'very-high':

      list =
      list.filter(
        e =>
        potentialLevel(e) === 3
      );

      break;


    case 'medium':

      list =
      list.filter(
        e =>
        potentialLevel(e) === 1
      );

      break;


    case 'outdoor':

      list =
      list.filter(
        e => e.outdoor
      );

      break;


    case 'fav':

      list =
      list.filter(
        e => e.favorite
      );

      break;


    case 'todo':

      list =
      list.filter(
        isToContact
      );

      break;


    case 'contacted':

      list =
      list.filter(
        e =>
        e.contact === 'contacted'
      );

      break;


    case 'accepted':

      list =
      list.filter(
        e =>
        e.flight === 'accepted'
      );

      break;


    case 'refused':

      list =
      list.filter(
        e =>
        e.flight === 'refused'
      );

      break;
  }


  /*
   * Tri
   */

  list.sort(
    (a, b) => {

      const dateA =
      new Date(
        `${a.date || '9999-12-31'}T${
          a.startTime || '00:00'
        }`
      );


      const dateB =
      new Date(
        `${b.date || '9999-12-31'}T${
          b.startTime || '00:00'
        }`
      );


      return (
        dateA - dateB ||
        potentialLevel(b) -
        potentialLevel(a) ||
        Number(a.distance || 0) -
        Number(b.distance || 0)
      );
    }
  );


  /*
   * Statistiques
   */

  const within =
  events.filter(
    e =>
    Number(e.distance) <= max
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
        e =>
        potentialLevel(e) >= 1
      ).length
    ],

    [
      'high',
      '★★',
      within.filter(
        e =>
        potentialLevel(e) === 2
      ).length
    ],

    [
      'very-high',
      '★★★',
      within.filter(
        e =>
        potentialLevel(e) === 3
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


  const stats =
  $('#stats');


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


    stats
    .querySelectorAll('.stat')
    .forEach(button => {

      button.onclick =
      () => {

        quickFilter(
          button.dataset.filter
        );
      };
    });
  }


  /*
   * Liste
   */

  const box =
  $('#events');


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


  const fragment =
  document.createDocumentFragment();


  for (const e of list) {

    const node =
    template.content.cloneNode(
      true
    );


    const level =
    potentialLevel(e);


    /*
     * DATE
     */

    const date =
    node.querySelector(
      '.date'
    );


    if (date) {

      date.textContent =
      fmtDate(e.date) +
      (
        e.startTime
        ? ' · ' +
        e.startTime
        : ''
      );
    }


    /*
     * TITRE
     */

    const title =
    node.querySelector(
      '.title'
    );


    if (title) {

      title.textContent =
      e.title ||
      'Événement';
    }


    /*
     * LIEU
     */

    const place =
    node.querySelector(
      '.place'
    );


    if (place) {

      place.textContent =
      '📍 ' +
      (e.place || '') +
      (
        e.address
        ? ' — ' +
        e.address
        : ''
      );
    }


    /*
     * DESCRIPTION
     */

    const description =
    node.querySelector(
      '.description'
    );


    if (description) {

      description.textContent =
      e.description ||
      '';
    }


    /*
     * DISTANCE
     */

    const distance =
    node.querySelector(
      '.distance-badge'
    );


    if (distance) {

      distance.textContent =
      `${e.distance} km`;
    }


    /*
     * POTENTIEL
     */

    const potential =
    node.querySelector(
      '.potential-badge'
    );


    if (potential) {

      potential.textContent =
      potentialLabel(
        level
      );


      potential.className =
      'potential-badge ' +
      potentialClass(
        level
      );
    }


    /*
     * EXTÉRIEUR
     */

    const outdoor =
    node.querySelector(
      '.outdoor-badge'
    );


    if (outdoor) {

      outdoor.textContent =
      e.outdoor
      ? '🚁 Extérieur'
      : '🏠 Intérieur';
    }


    /*
     * CONTACT
     */

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


    /*
     * VOL
     */

    const flightBadge =
    node.querySelector(
      '.flight-badge'
    );


    if (flightBadge) {

      flightBadge.textContent =
      statusLabel(e);
    }


    /*
     * FAVORI
     */

    const favorite =
    node.querySelector(
      '.fav'
    );


    if (favorite) {

      favorite.textContent =
      e.favorite
      ? '★'
      : '☆';


      favorite.classList.toggle(
        'active',
        e.favorite
      );


      favorite.onclick =
      async () => {

        e.favorite =
        !e.favorite;


        /*
         * Sauvegarde locale immédiate.
         */

        saveLocalEvent(e);


        /*
         * Invalidation apprentissage.
         */

        learningCache = null;
        potentialCache.clear();


        /*
         * On rafraîchit immédiatement.
         */

        render();


        /*
         * Puis cloud en arrière-plan.
         */

        await saveEventState(
          e
        );
      };
    }


    /*
     * CONTACT
     */

    const contact =
    node.querySelector(
      '.contact'
    );


    if (contact) {

      contact.onclick =
      async () => {

        e.contact =
        e.contact ===
        'contacted'
        ? 'todo'
        : 'contacted';


        saveLocalEvent(e);


        render();


        await saveEventState(
          e
        );
      };
    }


    /*
     * VOL
     */

    const flight =
    node.querySelector(
      '.flight'
    );


    if (flight) {

      flight.onclick =
      async () => {

        const states = [
          'unknown',
          'asked',
          'accepted',
          'refused'
        ];


        const index =
        states.indexOf(
          e.flight
        );


        e.flight =
        states[
          (index + 1) %
          states.length
        ];


        saveLocalEvent(e);


        render();


        await saveEventState(
          e
        );
      };
    }


    /*
     * DETAILS
     */

    const details =
    node.querySelector(
      '.details'
    );


    if (details) {

      details.onclick =
      () => {

        const reasons =
        Array.isArray(
          e.droneReasons
        )
        ? e.droneReasons.join(
          ', '
        )
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
            e.contact ===
            'contacted'
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


    fragment.appendChild(
      node
    );
  }


  /*
   * Un seul ajout au DOM.
   */

  box.appendChild(
    fragment
  );
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

/*
 * Chargement des événements.
 * La synchronisation Supabase est lancée
 * automatiquement par refresh().
 */

refresh();
