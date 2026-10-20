"""Fetch trusted hydrological readings for the Ostashkov gauge.
Never substitute meteorological air temperature for water temperature.
All timestamps are provider timestamps; stale readings are retained but flagged by UI.
"""
import json, urllib.request, datetime, pathlib, re
from zoneinfo import ZoneInfo
root=pathlib.Path(__file__).resolve().parent
path=root/'data/water.json'
try: data=json.loads(path.read_text(encoding='utf-8'))
except (ValueError,OSError): data={'station':'Осташков, озеро Селигер','level':{},'temperature':{}}
data['checked_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
data['level_source']='https://ris.kim-online.ru/api.php?demand=water_levels'
def download(url):
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 SELIGER-Fishing/1.0','Accept':'application/json,text/html'})
    with urllib.request.urlopen(request,timeout=18) as response:
        return response.read().decode('utf-8','replace')
try:
    response=json.loads(download(data['level_source']))
    def find_station(node):
        if isinstance(node,dict):
            if str(node.get('object_id'))=='247' or ('Осташков' in str(node.get('name_and_km','')) and node.get('value_rel') is not None):
                return node
            for val in node.values():
                found=find_station(val)
                if found:return found
        if isinstance(node,list):
            for val in node:
                found=find_station(val)
                if found:return found
        return None
    station=find_station(response)
    if not station: raise ValueError('Ostashkov station 247 not found')
    cm=float(station['value_rel'])
    stamp=datetime.datetime.strptime(station['measure_date_str'],'%d.%m.%Y %H:%M').replace(tzinfo=ZoneInfo('Europe/Moscow'))
    if stamp>datetime.datetime.now(ZoneInfo('Europe/Moscow'))+datetime.timedelta(hours=2):raise ValueError('Future timestamp')
    if stamp.year<2025:raise ValueError('Measurement too old')
    previous=data.get('level') or {}
    if not previous.get('measured_at') or stamp.isoformat()>=previous['measured_at']:
        data['level']={'cm':cm,'measured_at':stamp.isoformat(),'source':data['level_source'],'absolute_m':float(station['value_abs']) if station.get('value_abs') else None,'daily_change_cm':float(station['diff']) if station.get('diff') not in (None,'') else None}
    print('Hydropost',cm,stamp.isoformat())
except Exception as exc:
    print('Hydropost unavailable, preserving dated previous reading:',exc)
# Temperature has no confirmed public machine-readable 2026 current source; do not infer it from the air.
data.setdefault('temperature',{'celsius':None,'measured_at':None})
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
