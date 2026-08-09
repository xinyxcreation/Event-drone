import json, math, re
from datetime import datetime, timedelta, timezone
from pathlib import Path

CENTER_LAT = 47.718
CENTER_LON = -1.376
MAX_KM = 100
DAYS = 30

src = Path("data/source-events.json")
out = Path("events.json")

raw = json.loads(src.read_text(encoding="utf-8"))
items = raw if isinstance(raw, list) else raw.get("results", raw.get("data", raw.get("events", [])))

def get(o, *keys):
    for k in keys:
        if isinstance(o, dict) and o.get(k) not in (None, ""):
            return o[k]
    return None

def haversine(lat1, lon1, lat2, lon2):
    r = 6371
    p = math.pi / 180
    a = math.sin((lat2-lat1)*p/2)**2 + math.cos(lat1*p)*math.cos(lat2*p)*math.sin((lon2-lon1)*p/2)**2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def parse_date(v):
    if not v:
        return None
    s = str(v)
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
    except:
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(s[:10], fmt).replace(tzinfo=timezone.utc)
            except:
                pass
    return None

def text(o):
    return " ".join(str(v) for v in o.values() if isinstance(v, (str,int,float))).lower()

def outdoor(o):
    s = text(o)
    inside = re.search(r"salle|mus[ée]e|cin[ée]ma|th[ée][âa]tre|biblioth[èe]que|église|eglise|chapelle|restaurant|bar|conférence|conference", s)
    outside = re.search(r"plein air|extérieur|exterieur|stade|terrain|parc|march[ée]|vide.?grenier|brocante|fête|fete|festival|concert|course|randonn|sport|moto|auto|rassemblement|braderie|kermesse|feu d.?artifice", s)
    return bool(outside and not inside)

now = datetime.now(timezone.utc)
end = now + timedelta(days=DAYS)
result = []
seen = set()

for i, o in enumerate(items):
    d = parse_date(get(o, "date_debut", "dateDebut", "date", "start_date", "startDate", "first_date"))
    if not d or d < now - timedelta(days=1) or d > end:
        continue

    lat = get(o, "latitude", "lat", "geo_lat")
    lon = get(o, "longitude", "lon", "lng", "geo_lon")
    try:
        lat, lon = float(lat), float(lon)
        distance = haversine(CENTER_LAT, CENTER_LON, lat, lon)
    except:
        continue

    if distance > MAX_KM:
        continue

    title = get(o, "titre", "title", "nom", "name") or "Événement"
    place = get(o, "commune", "ville", "city", "locationName", "lieu") or "Lieu non précisé"
    desc = get(o, "description", "summary", "resume") or ""
    url = get(o, "url", "link", "website") or ""
    event_id = str(get(o, "id", "uid", "identifiant", "event_id") or f"{d.date()}-{title}-{place}")
    key = re.sub(r"\W+", "", event_id.lower())
    if key in seen:
        continue
    seen.add(key)

    result.append({
        "id": event_id,
        "date": d.isoformat(),
        "title": str(title),
        "place": str(place),
        "description": str(desc),
        "distance": round(distance, 1),
        "outdoor": outdoor(o),
        "url": str(url)
    })

result.sort(key=lambda x: (x["date"], x["distance"], x["title"].lower()))
out.write_text(json.dumps({
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "center": {"lat": CENTER_LAT, "lon": CENTER_LON, "name": "Châteaubriant"},
    "radiusKm": MAX_KM,
    "days": DAYS,
    "events": result
}, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"{len(result)} événements générés")
