import json, math, re
from datetime import datetime, timedelta, timezone
from pathlib import Path

LAT0,LON0=47.718,-1.376
MAX_KM,DAYS=100,30

def hav(lat1,lon1,lat2,lon2):
    p=math.pi/180; R=6371
    a=math.sin((lat2-lat1)*p/2)**2+math.cos(lat1*p)*math.cos(lat2*p)*math.sin((lon2-lon1)*p/2)**2
    return R*2*math.atan2(math.sqrt(a),math.sqrt(1-a))

def get(o,*keys):
    for k in keys:
        v=o.get(k) if isinstance(o,dict) else None
        if v not in (None,""): return v
    return None

def recursive(o):
    if isinstance(o,dict):
        yield o
        for v in o.values():
            yield from recursive(v)
    elif isinstance(o,list):
        for v in o: yield from recursive(v)

def dateparse(v):
    if not v:return None
    s=str(v)
    for x in (s,s[:10]):
        try:
            d=datetime.fromisoformat(x.replace("Z","+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except:pass
    for f in ("%Y-%m-%d","%d/%m/%Y","%Y/%m/%d"):
        try:return datetime.strptime(s[:10],f).replace(tzinfo=timezone.utc)
        except:pass
    return None

def coords(o):
    lat=get(o,"latitude","lat","geo_lat")
    lon=get(o,"longitude","lon","lng","geo_lon")
    geo=get(o,"location","localisation","geolocalisation","geo","coordinates")
    if isinstance(geo,dict):
        lat=lat or get(geo,"lat","latitude")
        lon=lon or get(geo,"lon","lng","longitude")
        c=get(geo,"coordinates")
        if isinstance(c,(list,tuple)) and len(c)>=2:
            lon,lat=c[0],c[1]
    if isinstance(geo,(list,tuple)) and len(geo)>=2:
        lon,lat=geo[0],geo[1]
    try:return float(lat),float(lon)
    except:return None,None

def outdoor(o):
    s=json.dumps(o,ensure_ascii=False).lower()
    inside=re.search(r"salle|mus[ée]e|cin[ée]ma|th[ée][âa]tre|biblioth|église|eglise|chapelle|restaurant|bar|conférence|conference",s)
    outside=re.search(r"plein air|extérieur|exterieur|stade|terrain|parc|march|vide.?grenier|brocante|fête|fete|festival|concert|course|randonn|sport|moto|auto|rassemblement|braderie|kermesse|feu d.?artifice",s)
    return bool(outside and not inside)

raw=json.loads(Path("data/source-events.json").read_text())
items=raw if isinstance(raw,list) else raw.get("results",raw.get("data",raw.get("events",[])))
now=datetime.now(timezone.utc); end=now+timedelta(days=DAYS)
out=[];seen=set()

for i,o in enumerate(items):
    if not isinstance(o,dict):continue
    d=dateparse(get(o,"date_debut","dateDebut","date","start_date","startDate","first_date","date_start"))
    lat,lon=coords(o)
    if not d or d<now-timedelta(days=1) or d>end or lat is None:continue
    dist=hav(LAT0,LON0,lat,lon)
    if dist>MAX_KM:continue
    title=get(o,"titre","title","nom","name") or "Événement"
    place=get(o,"commune","ville","city","locationName","lieu","place") or "Lieu non précisé"
    desc=get(o,"description","summary","resume","shortDescription") or ""
    url=get(o,"url","link","website") or ""
    eid=str(get(o,"id","uid","identifiant","event_id") or f"{d.date()}-{title}-{place}")
    if eid in seen:continue
    seen.add(eid)
    out.append({"id":eid,"date":d.isoformat(),"title":str(title),"place":str(place),"description":str(desc),"distance":round(dist,1),"outdoor":outdoor(o),"url":str(url)})

out.sort(key=lambda x:(x["date"],x["distance"],x["title"].lower()))
Path("events.json").write_text(json.dumps({"generatedAt":datetime.now(timezone.utc).isoformat(),"center":{"lat":LAT0,"lon":LON0,"name":"Châteaubriant"},"radiusKm":MAX_KM,"days":DAYS,"events":out},ensure_ascii=False,indent=2))
print("Événements:",len(out))
