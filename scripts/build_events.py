import json, math, re
from datetime import datetime, timedelta, timezone
from pathlib import Path

LAT0 = 47.718
LON0 = -1.376
MAX_KM = 100
DAYS = 30

def haversine(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    r = 6371
    a = math.sin((lat2-lat1)*p/2)**2 + math.cos(lat1*p)*math.cos(lat2*p)*math.sin((lon2-lon1)*p/2)**2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def flatten_record(o):
    # OpenDataSoft exports commonly wrap actual fields inside "fields".
    if isinstance(o, dict) and isinstance(o.get("fields"), dict):
        x = dict(o["fields"])
        for k in ("recordid", "record_timestamp"):
            if k in o and k not in x:
                x[k] = o[k]
        return x
    return o

def find_value(o, patterns):
    if not isinstance(o, dict):
        return None
    # Exact/substring field-name matching, case/accents insensitive enough for these data.
    for k, v in o.items():
        if v in (None, ""):
            continue
        nk = str(k).lower().replace("_", "").replace("-", "").replace(" ", "")
        for p in patterns:
            if p in nk:
                return v
    return None

def parse_date(v):
    if not v:
        return None
    if isinstance(v, list) and v:
        v = v[0]
    s = str(v).strip()
    for candidate in (s, s[:19], s[:10]):
        try:
            d = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s[:10], fmt).replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return None

def get_coordinates(o):
    # Direct numeric fields
    lat = find_value(o, ["latitude", "lat"])
    lon = find_value(o, ["longitude", "lon", "lng"])
    try:
        if lat is not None and lon is not None:
            return float(lat), float(lon)
    except Exception:
        pass

    # Common OpenDataSoft/Tourinsoft location objects.
    for key, value in o.items():
        kl = str(key).lower()
        if isinstance(value, dict):
            if ("location" in kl or "localisation" in kl or "geoloc" in kl or "geo" in kl):
                la = value.get("lat", value.get("latitude"))
                lo = value.get("lon", value.get("lng", value.get("longitude")))
                try:
                    return float(la), float(lo)
                except Exception:
                    pass
        if isinstance(value, (list, tuple)) and len(value) >= 2 and ("coord" in kl or "geo" in kl):
            try:
                # GeoJSON is [longitude, latitude]
                return float(value[1]), float(value[0])
            except Exception:
                pass

    return None, None

def text(o):
    return " ".join(str(v) for v in o.values() if isinstance(v, (str, int, float))).lower()

def is_outdoor(o):
    s = text(o)
    inside = re.search(r"salle|mus[ée]e|cin[ée]ma|th[ée][âa]tre|biblioth|église|eglise|chapelle|restaurant|bar|conférence|conference", s)
    outside = re.search(r"plein air|extérieur|exterieur|stade|terrain|parc|march|vide.?grenier|brocante|fête|fete|festival|concert|course|randonn|sport|moto|auto|rassemblement|braderie|kermesse|feu d.?artifice", s)
    return bool(outside and not inside)

raw = json.loads(Path("data/source-events.json").read_text(encoding="utf-8"))
if isinstance(raw, dict):
    records = raw.get("results") or raw.get("data") or raw.get("events") or []
else:
    records = raw

records = [flatten_record(x) for x in records if isinstance(x, dict)]

# Date field candidates: use likely event-start fields first, then semantic matching.
DATE_KEYS = [
    "datedebut", "date_debut", "datededebut", "datededebutdelamanifestation",
    "date", "startdate", "debut", "datedevenement"
]
TITLE_KEYS = ["nomdelamanifestation", "nommanifestation", "titre", "nom", "title", "libelle"]
PLACE_KEYS = ["nomdelacommune", "commune", "ville", "localite", "lieu"]
DESC_KEYS = ["description", "descriptif", "detail", "resume"]
URL_KEYS = ["url", "siteinternet", "siteweb", "web"]

def preferred(o, keys, patterns):
    for key in keys:
        if key in o and o[key] not in (None, ""):
            return o[key]
    return find_value(o, patterns)

now = datetime.now(timezone.utc)
end = now + timedelta(days=DAYS)
events = []
seen = set()

for i, o in enumerate(records):
    # First try all likely date fields.
    dv = preferred(o, DATE_KEYS, ["datedebut", "dateevenement", "startdate", "debut", "date"])
    d = parse_date(dv)
    if not d or d < now - timedelta(days=1) or d > end:
        continue

    lat, lon = get_coordinates(o)
    if lat is None or lon is None:
        continue

    distance = haversine(LAT0, LON0, lat, lon)
    if distance > MAX_KM:
        continue

    title = preferred(o, TITLE_KEYS, ["manifestation", "titre", "nom", "libelle"]) or "Événement"
    place = preferred(o, PLACE_KEYS, ["commune", "ville", "localite", "lieu"]) or "Lieu non précisé"
    desc = preferred(o, DESC_KEYS, ["description", "descriptif", "resume", "detail"]) or ""
    url = preferred(o, URL_KEYS, ["siteinternet", "siteweb", "url", "website"]) or ""
    eid = str(o.get("recordid") or o.get("id") or f"{d.date()}-{title}-{place}")
    if eid in seen:
        continue
    seen.add(eid)

    events.append({
        "id": eid,
        "date": d.isoformat(),
        "title": str(title),
        "place": str(place),
        "description": str(desc),
        "distance": round(distance, 1),
        "outdoor": is_outdoor(o),
        "url": str(url)
    })

events.sort(key=lambda x: (x["date"], x["distance"], x["title"].lower()))

Path("events.json").write_text(json.dumps({
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "center": {"lat": LAT0, "lon": LON0, "name": "Châteaubriant"},
    "radiusKm": MAX_KM,
    "days": DAYS,
    "events": events
}, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"{len(events)} événements générés")
