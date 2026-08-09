import json, math, re, time, unicodedata, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

CENTER_LAT, CENTER_LON = 47.718, -1.376
MAX_KM, DAYS = 100, 30

def haversine(a, b, c, d):
    p = math.pi / 180
    x = math.sin((c-a)*p/2)**2 + math.cos(a*p)*math.cos(c*p)*math.sin((d-b)*p/2)**2
    return 6371 * 2 * math.atan2(math.sqrt(x), math.sqrt(1-x))

def norm(s):
    s = str(s).lower()
    s = ''.join(c for c in unicodedata.normalize("NFD", s)
                if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)

def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)

def parse_date(v):
    if isinstance(v, (list, tuple)):
        for x in v:
            d = parse_date(x)
            if d:
                return d
        return None
    if isinstance(v, dict):
        for key in ("date", "datetime", "value", "start"):
            if key in v:
                d = parse_date(v[key])
                if d:
                    return d
        for x in v.values():
            d = parse_date(x)
            if d:
                return d
        return None
    if not isinstance(v, (str, int, float)):
        return None
    s = str(v).strip()
    for x in (s, s[:19], s[:10]):
        try:
            d = datetime.fromisoformat(x.replace("Z", "+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    for f in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s[:10], f).replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return None

def find_date(o):
    preferred = (
        "datedebut", "datedebutmanifestation", "datededebut",
        "startdate", "debut", "firstdate", "date"
    )
    vals = []
    for d in walk(o):
        if isinstance(d, dict):
            for k, v in d.items():
                nk = norm(k)
                if any(x in nk for x in preferred):
                    vals.append(v)
    for v in vals:
        d = parse_date(v)
        if d:
            return d
    return None

def find_text(o, wanted):
    wanted = tuple(norm(x) for x in wanted)
    for d in walk(o):
        if not isinstance(d, dict):
            continue
        for k, v in d.items():
            if any(x in norm(k) for x in wanted) and isinstance(v, (str, int, float)) and str(v).strip():
                return str(v).strip()
    return ""

def coords(o):
    for d in walk(o):
        if not isinstance(d, dict):
            continue
        lat = lon = None
        for k, v in d.items():
            nk = norm(k)
            if nk in ("lat", "latitude", "latitudedecimale", "latitudegps"):
                lat = v
            if nk in ("lon", "lng", "longitude", "longitudedecimale", "longitudegps"):
                lon = v
        try:
            if lat is not None and lon is not None:
                a = float(str(lat).replace(",", "."))
                b = float(str(lon).replace(",", "."))
                if 40 < a < 52 and -6 < b < 10:
                    return a, b
        except Exception:
            pass
    return None

cache = {}
def geocode(place, postal):
    key = (place, postal)
    if key in cache:
        return cache[key]
    q = (postal + " " + place).strip()
    if not q:
        cache[key] = None
        return None
    try:
        u = "https://api-adresse.data.gouv.fr/search/?limit=1&q=" + urllib.parse.quote(q)
        req = urllib.request.Request(u, headers={"User-Agent": "Event-Drone/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            fs = json.load(r).get("features", [])
        if fs:
            lon, lat = fs[0]["geometry"]["coordinates"][:2]
            cache[key] = (float(lat), float(lon))
            time.sleep(0.1)
            return cache[key]
    except Exception:
        pass
    cache[key] = None
    return None

raw = json.loads(Path("data/source-events.json").read_text(encoding="utf-8"))

if isinstance(raw, list):
    records = raw
elif isinstance(raw, dict):
    records = raw.get("records") or raw.get("results") or raw.get("data") or raw.get("events") or []
else:
    records = []

print("Type source:", type(raw).__name__)
print("Nombre de records source:", len(records))
if records and isinstance(records[0], dict):
    print("Premières clés:", list(records[0].keys())[:30])

now = datetime.now(timezone.utc)
end = now + timedelta(days=DAYS)
events = []
seen = set()
stats = {"date": 0, "distance": 0, "geocode": 0}

for o in records:
    d = find_date(o)
    if not d or d < now - timedelta(days=1) or d > end:
        continue
    stats["date"] += 1

    title = find_text(o, ("nomdelamanifestation", "nommanifestation", "titre", "title", "libelle", "nom", "name")) or "Événement"
    place = find_text(o, ("nomdelacommune", "commune", "ville", "localite", "localiteevenement", "lieu", "place", "city")) or "Lieu non précisé"
    postal = find_text(o, ("codepostal", "postalcode", "codepostalcommune", "cp"))

    c = coords(o)
    if c is None:
        c = geocode(place, postal)
        if c:
            stats["geocode"] += 1
    if c is None:
        continue

    distance = haversine(CENTER_LAT, CENTER_LON, *c)
    if distance > MAX_KM:
        continue
    stats["distance"] += 1

    eid = str(o.get("recordid") or o.get("id") or f"{d.date()}-{title}-{place}")
    if eid in seen:
        continue
    seen.add(eid)

    text = json.dumps(o, ensure_ascii=False).lower()
    outdoor = bool(re.search(
        r"plein.?air|extérieur|exterieur|stade|terrain|parc|marché|marche|vide.?grenier|"
        r"brocante|fête|fete|festival|concert|course|randonn|sport|moto|auto|rassemblement|"
        r"braderie|kermesse|feu d.?artifice", text
    ))

    events.append({
        "id": eid,
        "date": d.isoformat(),
        "title": title,
        "place": place,
        "description": find_text(o, ("description", "descriptif", "resume", "detail", "presentation")),
        "distance": round(distance, 1),
        "outdoor": outdoor,
        "url": find_text(o, ("siteinternet", "siteweb", "website", "url", "lien"))
    })

events.sort(key=lambda x: (x["date"], x["distance"], x["title"].lower()))

Path("events.json").write_text(json.dumps({
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "center": {"lat": CENTER_LAT, "lon": CENTER_LON, "name": "Châteaubriant"},
    "radiusKm": MAX_KM,
    "days": DAYS,
    "events": events
}, ensure_ascii=False, indent=2), encoding="utf-8")

print("STATISTIQUES:", stats)
print("ÉVÉNEMENTS GÉNÉRÉS:", len(events))
