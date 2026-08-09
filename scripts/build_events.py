import json, math, re, unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

CENTER_LAT, CENTER_LON = 47.718, -1.376
MAX_KM, DAYS = 150, 45


def haversine(a, b, c, d):
    p = math.pi / 180
    x = math.sin((c-a)*p/2)**2 + math.cos(a*p)*math.cos(c*p)*math.sin((d-b)*p/2)**2
    return 6371 * 2 * math.atan2(math.sqrt(x), math.sqrt(1-x))


def norm(s):
    s = str(s or '').lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def day(s):
    try:
        return datetime.strptime(str(s).strip(), '%d/%m/%Y').replace(tzinfo=timezone.utc)
    except Exception:
        return None


def occurrences(value):
    out = []
    if not isinstance(value, str):
        return out
    for block in value.split(','):
        parts = block.split('||')
        start = day(parts[0]) if len(parts) > 0 else None
        end = day(parts[1]) if len(parts) > 1 else None
        if not start:
            continue
        end = end or start
        st = parts[2].strip() if len(parts) > 2 else ''
        et = parts[3].strip() if len(parts) > 3 else ''
        cur = start
        while cur.date() <= end.date():
            out.append((cur, st, et))
            cur += timedelta(days=1)
    return out


HIGH = [
    'festival', 'fete', 'fête', 'concert', 'feu d artifice', 'feu d\'artifice',
    'guinguette', 'foire', 'vide-grenier', 'vide grenier', 'brocante', 'braderie',
    'kermesse', 'carnaval', 'course', 'trail', 'marathon', 'rallye', 'motocross',
    'moto', 'automobile', 'auto', 'rassemblement', 'forum des associations',
    'fête communale', 'fête locale', 'marché de noël', 'marché de noel',
    'ciné plein-air', 'cine plein-air', 'plein air', 'plein-air', 'exposition extérieure'
]
MEDIUM = [
    'marché', 'marche', 'sport', 'tournoi', 'association', 'animation', 'spectacle',
    'vide-bibliothèque', 'vide bibliothèque', 'portes ouvertes', 'visite', 'randonnée',
    'randonnee', 'bal', 'danse', 'pétanque', 'petanque', 'fête de village', 'village'
]
INDOOR = [
    'théâtre', 'theatre', 'cinéma', 'cinema', 'conférence', 'conference', 'atelier',
    'réunion', 'reunion', 'salle', 'médiathèque', 'mediatheque', 'bibliothèque',
    'bibliotheque', 'église', 'eglise', 'musée', 'musee'
]


def potential(title, category, address):
    text = f'{title} {category} {address}'.lower()
    compact = norm(text).replace('-', ' ')
    score = 0
    reasons = []
    for word in HIGH:
        if word in text or norm(word) in compact:
            score += 4
            reasons.append(word)
    for word in MEDIUM:
        if word in text or norm(word) in compact:
            score += 2
            reasons.append(word)
    for word in INDOOR:
        if word in text or norm(word) in compact:
            score -= 3
    if re.search(r'plein.?air|extérieur|exterieur|stade|terrain|parc|étang|etang|place|esplanade|rue|centre.?bourg', text):
        score += 3
        reasons.append('extérieur')
    score = max(0, min(10, score))
    level = 'high' if score >= 6 else ('medium' if score >= 3 else 'low')
    return score, level, sorted(set(reasons))


def add_event(events, seen, o, d, st='', et='', source='loire-atlantique'):
    title = str(o.get('nomoffre') or o.get('title') or 'Événement').strip()
    category = str(o.get('categorie') or o.get('category') or '').strip()
    commune = str(o.get('commune') or o.get('place') or '').strip()
    postal = str(o.get('codepostal') or o.get('postalCode') or '').strip()
    try:
        loc = o.get('localisation') or {}
        lat = float(o.get('latitude') if o.get('latitude') is not None else loc.get('lat'))
        lon = float(o.get('longitude') if o.get('longitude') is not None else loc.get('lon'))
    except Exception:
        return False
    dist = haversine(CENTER_LAT, CENTER_LON, lat, lon)
    if dist > MAX_KM or d is None:
        return False
    address = str(o.get('address') or '').strip() or ' '.join(str(o.get(k) or '').strip() for k in ('adresse1','adresse1suite','adresse2','adresse3') if o.get(k)).strip()
    score, level, reasons = potential(title, category, address)
    key = (title.casefold(), commune.casefold(), d.date().isoformat(), st, et)
    if key in seen:
        return False
    seen.add(key)
    events.append({
        'id': f'{norm(title)}-{d.strftime("%Y%m%d")}-{norm(commune)}',
        'date': d.strftime('%Y-%m-%d'), 'startTime': st, 'endTime': et,
        'title': title, 'category': category, 'place': commune, 'postalCode': postal,
        'address': address, 'latitude': lat, 'longitude': lon, 'distance': round(dist, 1),
        'outdoor': score >= 3 or bool(re.search(r'plein.?air|extérieur|exterieur|stade|terrain|parc|marché|marche|fête|fete|festival|concert|course|sport|rassemblement|guinguette|foire', f'{title} {category} {address}', re.I)),
        'droneScore': score, 'dronePotential': level, 'droneReasons': reasons,
        'source': source,
        'phone': o.get('commtel') or o.get('commmob') or o.get('phone') or '',
        'email': o.get('commmail') or o.get('email') or '',
        'website': o.get('commweb') or o.get('website') or '',
        'reservation': o.get('resaenligne') or o.get('reservation') or '',
        'url': o.get('url') or o.get('website') or '',
        'free': str(o.get('tarifgratuit') or o.get('free') or '').lower() == 'oui' or o.get('free') is True
    })
    return True

raw = json.loads(Path('data/source-events.json').read_text(encoding='utf-8'))
records = raw if isinstance(raw, list) else (raw.get('records') or raw.get('results') or raw.get('data') or raw.get('events') or []) if isinstance(raw, dict) else []

print('Type source:', type(raw).__name__)
print('Nombre de records source:', len(records))

today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
limit = today + timedelta(days=DAYS)
events, seen = [], set()
stats = {'records': len(records), 'dates_trouvees': 0, 'dans_30_jours': 0, 'dans_100_km': 0, 'curated_ajoutes': 0}

for o in records:
    if not isinstance(o, dict):
        continue
    occs = occurrences(o.get('ouverturegranule') or '')
    stats['dates_trouvees'] += len(occs)
    for d, st, et in occs:
        if d < today or d > limit:
            continue
        stats['dans_30_jours'] += 1
        if add_event(events, seen, o, d, st, et, 'loire-atlantique'):
            stats['dans_100_km'] += 1

# Keep the useful local events found by the first version even when the large tourism feed
# does not contain them. This file is intentionally tiny and can be extended later.
priority_path = Path('data/priority-events.json')
if priority_path.exists():
    priority = json.loads(priority_path.read_text(encoding='utf-8'))
    for o in priority if isinstance(priority, list) else []:
        d = day(o.get('date'))
        if d and today <= d <= limit:
            if add_event(events, seen, o, d, o.get('startTime',''), o.get('endTime',''), o.get('source','agenda-local')):
                stats['curated_ajoutes'] += 1

# Highest potential first within each day is useful for the app, while the UI can still sort/filter.
events.sort(key=lambda x: (x['date'], -x['droneScore'], x['distance'], x['title'].casefold()))

Path('events.json').write_text(json.dumps({
    'generatedAt': datetime.now(timezone.utc).isoformat(),
    'center': {'name': 'Châteaubriant', 'lat': CENTER_LAT, 'lon': CENTER_LON},
    'radiusKm': MAX_KM, 'days': DAYS, 'events': events
}, ensure_ascii=False, indent=2), encoding='utf-8')

print('STATISTIQUES:', stats)
print('ÉVÉNEMENTS GÉNÉRÉS:', len(events))
print('POTENTIEL ÉLEVÉ:', sum(e['dronePotential'] == 'high' for e in events))
print('POTENTIEL MOYEN:', sum(e['dronePotential'] == 'medium' for e in events))
if not events:
    raise SystemExit('Aucun événement dans les 30 jours et 100 km.')
