import json,re,urllib.request,collections,pathlib
c=open('config.js').read();U=re.search(r"https://[a-z]+\.supabase\.co",c)[0];K=re.search(r"_supabaseKey = '([^']+)",c)[1]
rows=[];o=0
while True:
    r=urllib.request.Request(f"{U}/rest/v1/propers?select=mass_key,part_code,text_la,text_fr&limit=1000&offset={o}",headers={"apikey":K,"Authorization":"Bearer "+K})
    d=json.load(urllib.request.urlopen(r,timeout=60));rows+=d;o+=len(d)
    if len(d)<1000:break
s={"pieces":len(rows),"cles":len({x['mass_key'] for x in rows}),"tronquees":sum(1 for x in rows if (x['text_la'] or '').rstrip().endswith('...') or (x['text_fr'] or '').rstrip().endswith('...')),"fr_vide":sum(1 for x in rows if not (x['text_fr'] or '').strip()),"la_vide":sum(1 for x in rows if not (x['text_la'] or '').strip())}
cp=collections.Counter(x['mass_key'] for x in rows);s["pieces_par_cle"]=cp;s["parties"]=collections.Counter(x['part_code'] for x in rows)
pathlib.Path('tools/messe/essai/propers_stat.json').write_text(json.dumps(s,ensure_ascii=False))
print({k:v for k,v in s.items() if k!='pieces_par_cle'})
