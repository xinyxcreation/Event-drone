import json, math, re, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

CENTER_LAT = 47.718
CENTER_LON = -1.376
MAX_KM = 100
DAYS = 30

def haversine(a,b,c,d):
    p=math.pi/180
    x=math.sin((c-a)*p/2)**2+math.cos(a*p)*math.cos(c*p)*math.sin((d-b)*p/2)**2
    return 6371*2*math.atan2(math.sqrt(x),math.sqrt(1-x))

def norm(s):
    return re.sub(r"[^a-z0-9]","",str(s).lower().replace("é","e").replace("è","e").replace("ê","e").replace("à","a").replace("â","a").replace("ô","o").replace("ù","u").replace("û","u").replace("ç","c"))

def walk(o):
    if isinstance(o,dict):
        yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o,list):
        for v in o:
            yield from walk(v)

def flatten(o):
    if isinstance(o,dict) and isinstance(o.get("fields"),dict):
        x=dict(o["fields"])
        for k in ("recordid","record_timestamp"):
            if k in o and k not in x: x[k]=o[k]
        return x
    return o

def parse_date(v):
    if isinstance(v,list):
        for x in v:
            d=parse_date(x)
            if d:return d
        return None
    if isinstance(v,dict):
        for x in v.values():
            d=parse_date(x)
            if d:return d
        return None
    if not isinstance(v,(str,int,float)): return None
    s=str(v).strip()
    for x in (s,s[:19],s[:10]):
        try:
            d=datetime.fromisoformat(x.replace("Z","+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except: pass
    for f in ("%Y-%m-%d","%d/%m/%Y","%d-%m-%Y","%Y/%m/%d"):
        try:return datetime.strptime(s[:10],f).replace(tzinfo=timezone.utc)
        except: pass
    return None

def find_date(o):
    # Prefer fields whose names clearly indicate the beginning/start of an event.
    candidates=[]
    for d in walk(o):
        if not isinstance(d,dict): continue
        for k,v in d.items():
            nk=norm(k)
            if any(x in nk for x in ("datedebut","datedebutmanifestation","startdate","debut","firstdate")):
                candidates.append(v)
    for v in candidates:
        x=parse_date(v)
        if x:return x
    # Fallback: any plausible date in the record.
    for d in walk(o):
        if isinstance(d,dict):
            for v in d.values():
                x=parse_date(v)
                if x and 2000 <= x.year <= 2035:return x
    return None

def find_text(o, wanted):
    for d in walk(o):
        if not isinstance(d,dict): continue
        for k,v in d.items():
            nk=norm(k)
            if any(x in nk for x in wanted) and isinstance(v,(str,int,float)) and str(v).strip():
                return str(v).strip()
    return ""

def find_coords(o):
    for d in walk(o):
        if not isinstance(d,dict): continue
        lat=lon=None
        for k,v in d.items():
            nk=norm(k)
            if nk in ("lat","latitude","latitudedecimale","latitudegps"): lat=v
            if nk in ("lon","lng","longitude","longitudedecimale","longitudegps"): lon=v
        try:
            if lat is not None and lon is not None:
                la,lo=float(str(lat).replace(",",".")),float(str(lon).replace(",","."))
                if 40<la<52 and -6<lo<10:return la,lo
        except: pass

        for k,v in d.items():
            nk=norm(k)
            if isinstance(v,(list,tuple)) and len(v)>=2 and ("geo" in nk or "coord" in nk or "point" in nk):
                try:
                    a=float(str(v[0]).replace(",",".")); b=float(str(v[1]).replace(",","."))
                    if 40<a<52 and -6<b<10:return a,b
                    if 40<b<52 and -6<a<10:return b,a
                except: pass
            if isinstance(v,str) and ("geo" in nk or "coord" in nk or "point" in nk):
                m=re.findall(r"-?\d+(?:[.,]\d+)?",v)
                if len(m)>=2:
                    a=float(m[0].replace(",",".")); b=float(m[1].replace(",","."))
                    if 40<a<52 and -6<b<10:return a,b
                    if 40<b<52 and -6<a<10:return b,a
    return None

geocode_cache={}
def geocode(place,postal=""):
    key=(place.strip().lower(),postal.strip())
    if key in geocode_cache:return geocode_cache[key]
    q=(postal+" "+place).strip()
    if not q:return None
    try:
        url="https://api-adresse.data.gouv.fr/search/?limit=1&q="+urllib.parse.quote(q)
        req=urllib.request.Request(url,headers={"User-Agent":"Event-Drone/1.0"})
        with urllib.request.urlopen(req,timeout=10) as r:
            data=json.load(r)
        f=data.get("features",[])
        if f:
            lon,lat=f[0]["geometry"]["coordinates"][:2]
            result=(float(lat),float(lon))
            geocode_cache[key]=result
            time.sleep(0.15)
            return result
    except Exception:
        pass
    geocode_cache[key]=None
    return None

raw=json.loads(Path("data/source-events.json").read_text(encoding="utf-8"))
records=raw if isinstance(raw,list) else raw.get("results",raw.get("data",raw.get("events",[])))
records=[flatten(x) for x in records if isinstance(x,dict)]

now=datetime.now(timezone.utc)
end=now+timedelta(days=DAYS)
events=[]
seen=set()

for o in records:
    d=find_date(o)
    if not d or d<now-timedelta(days=1) or d>end: continue

    title=find_text(o,("nomdelamanifestation","nommanifestation","titre","title","libelle","nom")) or "Événement"
    place=find_text(o,("nomdelacommune","commune","ville","localite","localiteevenement","lieu","place")) or "Lieu non précisé"
    postal=find_text(o,("codepostal","postalcode","cp"))
    coords=find_coords(o)

    if coords is None:
        coords=geocode(place,postal)
    if coords is None: continue

    lat,lon=coords
    distance=haversine(CENTER_LAT,CENTER_LON,lat,lon)
    if distance>MAX_KM: continue

    desc=find_text(o,("description","descriptif","resume","detail","presentation"))
    url=find_text(o,("siteinternet","siteweb","website","url","lien"))
    text=json.dumps(o,ensure_ascii=False).lower()
    outdoor=bool(re.search(r"plein air|extérieur|exterieur|stade|terrain|parc|marché|vide.?grenier|brocante|fête|fete|festival|concert|course|randonn|sport|moto|auto|rassemblement|braderie|kermesse|feu d.?artifice",text))
    eid=str(o.get("recordid") or o.get("id") or f"{d.date()}-{title}-{place}")
    if eid in seen:continue
    seen.add(eid)

    events.append({
        "id":eid,
        "date":d.isoformat(),
        "title":title,
        "place":place,
        "description":desc,
        "distance":round(distance,1),
        "outdoor":outdoor,
        "url":url
    })

events.sort(key=lambda x:(x["date"],x["distance"],x["title"].lower()))
Path("events.json").write_text(json.dumps({
    "generatedAt":datetime.now(timezone.utc).isoformat(),
    "center":{"lat":CENTER_LAT,"lon":CENTER_LON,"name":"Châteaubriant"},
    "radiusKm":MAX_KM,
    "days":DAYS,
    "events":events
},ensure_ascii=False,indent=2),encoding="utf-8")
print(f"{len(events)} événements générés")
