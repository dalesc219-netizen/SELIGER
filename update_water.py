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
# Secondary independent source: only accept temperature with an explicit recent date.
# Public page can change HTML structure; any parser ambiguity is a non-fatal unavailable status.
try:
    from html.parser import HTMLParser
    class Plain(HTMLParser):
        def __init__(self):
            super().__init__();self.parts=[]
        def handle_data(self,v):
            self.parts.append(v)
    parser=Plain()
    parser.feed(download('https://allrivers.info/gauge/seliger-ostashkov'))
    cleaned=' '.join(' '.join(parser.parts).split())
    date_match=re.search(r'Дата измерений\\s+(\\d{1,2})\\s+([а-яА-ЯёЁ]+)\\s+(20\\d{2})',cleaned,re.I)
    temp_match=re.search(r'Температура воды\\s+(-?\\d+(?:[.,]\\d+)?)\\s*[°СC]',cleaned,re.I)
    months={'января':1,'февраля':2,'марта':3,'апреля':4,'мая':5,'июня':6,'июля':7,'августа':8,'сентября':9,'октября':10,'ноября':11,'декабря':12}
    if not date_match or not temp_match: raise ValueError('Missing explicit measurement date or water reading')
    dd,mon,yyyy=date_match.groups()
    when=datetime.datetime(int(yyyy),months[mon.lower()],int(dd),12,tzinfo=ZoneInfo('Europe/Moscow'))
    val=float(temp_match.group(1).replace(',','.'))
    if not -1<=val<=35:raise ValueError('Unrealistic lake water temperature')
    prev=data.get('temperature') or {}
    if not prev.get('measured_at') or when.isoformat()>=prev['measured_at']:
        data['temperature']={'celsius':val,'measured_at':when.isoformat(),'source':'https://allrivers.info/gauge/seliger-ostashkov'}
    print('Lake temperature',val,when.date())
except Exception as exc:
    print('Water temperature unavailable, preserving last dated measurement:',exc)

data.setdefault('temperature',{'celsius':None,'measured_at':None})
history_path=root/'data/water_history.json'
try:
    history=json.loads(history_path.read_text(encoding='utf-8'))
    if not isinstance(history,list):history=[]
except (OSError,ValueError):
    history=[]
if data.get('level',{}).get('measured_at'):
    entry={'measured_at':data['level']['measured_at'],'level_cm':data['level'].get('cm'),'source':data['level'].get('source')}
    if not any(x.get('measured_at')==entry['measured_at'] for x in history):
        history.append(entry)
        history.sort(key=lambda x:x['measured_at'])
        history=history[-50:]
history_path.write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
