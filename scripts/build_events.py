import json, math, re, unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

CENTER_LAT, CENTER_LON = 47.718, -1.376
MAX_KM, DAYS = 100, 30

def haversine(a,b,c,d):
    p=math.pi/180
    x=math.sin((c-a)*p/2)**2+math.cos(a*p)*math.cos(c*p)*math.sin((d-b)*p/2)**2
    return 6371*2*math.atan2(math.sqrt(x),math.sqrt(1-x))

def norm(s):
    s=str(s).lower()
    s=''.join(c for c in unicodedata.normalize("NFD",s) if unicodedata.category(c)!="Mn")
    return re.sub(r"[^a-z0-9]","",s)

def day(s):
    try: return datetime.strptime(s.strip(),"%d/%m/%Y").replace(tzinfo=timezone.utc)
    except: return None

def occurrences(value):
    out=[]
    if not isinstance(value,str): return out
    for block in value.split(","):
        parts=block.split("||")
        ds=[day(x) for x in parts[:2] if day(x)]
        if not ds: continue
        start,end=ds[0],ds[-1]
        st=parts[2].strip() if len(parts)>2 else ""
        et=parts[3].strip() if len(parts)>3 else ""
        cur=start
        while cur.date()<=end.date():
            out.append((cur,st,et))
            cur+=timedelta(days=1)
    return out

raw=json.loads(Path("data/source-events.json").read_text(encoding="utf-8"))
records=raw if isinstance(raw,list) else (raw.get("records") or raw.get("results") or raw.get("data") or raw.get("events") or []) if isinstance(raw,dict) else []

print("Type source:",type(raw).__name__)
print("Nombre de records source:",len(records))
if records: print("Champs détectés:",list(records[0].keys())[:25])

today=datetime.now(timezone.utc).replace(hour=0,minute=0,second=0,microsecond=0)
limit=today+timedelta(days=DAYS)
events=[]; seen=set()
stats={"records":len(records),"dates_trouvees":0,"dans_30_jours":0,"dans_100_km":0}

for o in records:
    if not isinstance(o,dict): continue
    title=str(o.get("nomoffre") or "Événement").strip()
    category=str(o.get("categorie") or "").strip()
    commune=str(o.get("commune") or "").strip()
    postal=str(o.get("codepostal") or "").strip()
    try:
        loc=o.get("localisation") or {}
        lat=float(o.get("latitude") if o.get("latitude") is not None else loc.get("lat"))
        lon=float(o.get("longitude") if o.get("longitude") is not None else loc.get("lon"))
    except: continue
    occs=occurrences(o.get("ouverturegranule") or "")
    stats["dates_trouvees"]+=len(occs)
    dist=haversine(CENTER_LAT,CENTER_LON,lat,lon)
    if dist>MAX_KM: continue
    stats["dans_100_km"]+=len(occs)
    address=" ".join(str(o.get(k) or "").strip() for k in ("adresse1","adresse1suite","adresse2","adresse3") if o.get(k)).strip()
    for d,st,et in occs:
        if d<today or d>limit: continue
        stats["dans_30_jours"]+=1
        key=(title.lower(),commune.lower(),d.date().isoformat(),st,et)
        if key in seen: continue
        seen.add(key)
        text=f"{title} {category} {address}".lower()
        outdoor=bool(re.search(r"plein.?air|extérieur|exterieur|stade|terrain|parc|marché|marche|vide.?grenier|brocante|fête|fete|festival|concert|course|randonn|sport|moto|auto|rassemblement|braderie|kermesse|feu d.?artifice|guinguette|foire",text))
        events.append({
            "id":f"{norm(title)}-{d.strftime('%Y%m%d')}-{norm(commune)}",
            "date":d.strftime("%Y-%m-%d"),"startTime":st,"endTime":et,
            "title":title,"category":category,"place":commune,"postalCode":postal,
            "address":address,"latitude":lat,"longitude":lon,"distance":round(dist,1),
            "outdoor":outdoor,"phone":o.get("commtel") or o.get("commmob") or "",
            "email":o.get("commmail") or "","website":o.get("commweb") or "",
            "reservation":o.get("resaenligne") or "",
            "free":str(o.get("tarifgratuit") or "").lower()=="oui"
        })

events.sort(key=lambda x:(x["date"],x["distance"],x["title"].lower()))
Path("events.json").write_text(json.dumps({
    "generatedAt":datetime.now(timezone.utc).isoformat(),
    "center":{"name":"Châteaubriant","lat":CENTER_LAT,"lon":CENTER_LON},
    "radiusKm":MAX_KM,"days":DAYS,"events":events
},ensure_ascii=False,indent=2),encoding="utf-8")

print("STATISTIQUES:",stats)
print("ÉVÉNEMENTS GÉNÉRÉS:",len(events))
if not events: raise SystemExit("Aucun événement dans les 30 jours et 100 km.")
