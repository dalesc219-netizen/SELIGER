import json, urllib.request, datetime, pathlib, os, tempfile
root = pathlib.Path(__file__).parent
keys = 'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,precipitation_probability,pressure_msl'
current = 'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,pressure_msl'
daily = 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,sunrise,sunset'
url = ('https://api.open-meteo.com/v1/forecast?latitude=57.146&longitude=33.108'
       f'&hourly={keys}&current={current}&daily={daily}'
       '&timezone=Europe%2FMoscow&wind_speed_unit=ms&forecast_days=16&past_days=2')
request = urllib.request.Request(url, headers={'User-Agent':'SELIGER-Fishing-Weather/1.0', 'Accept':'application/json'})
with urllib.request.urlopen(request, timeout=40) as response:
    data = json.load(response)
if not data.get('hourly', {}).get('time') or not data.get('current'):
    raise RuntimeError('Weather provider returned an invalid dataset')
saved_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
latest = {'saved_at': saved_at, 'source': 'Open-Meteo', **data}
history_path = root / 'data/history.json'
try:
    history = json.loads(history_path.read_text(encoding='utf-8'))
    if not isinstance(history,list): history = []
except (OSError,ValueError):
    history = []
history.append({'saved_at': saved_at,'hourly':data['hourly']})
history = history[-90:]
def atomic(path, content):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=path.parent,delete=False) as tmp:
        tmp.write(content)
        name=tmp.name
    os.replace(name,path)
atomic(root/'data/latest.json',json.dumps(latest,ensure_ascii=False,separators=(',',':'))+'\n')
atomic(history_path,json.dumps(history,ensure_ascii=False,separators=(',',':'))+'\n')
print('Saved latest weather at',saved_at,'snapshots',len(history))
