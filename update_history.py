import json, urllib.request, datetime, pathlib
root=pathlib.Path(__file__).parent
keys='temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,precipitation_probability,pressure_msl'
url=f'https://api.open-meteo.com/v1/forecast?latitude=57.146&longitude=33.108&hourly={keys}&timezone=Europe%2FMoscow&wind_speed_unit=ms&forecast_days=16'
with urllib.request.urlopen(url,timeout=35) as response: data=json.load(response)
path=root/'data/history.json'
try: history=json.loads(path.read_text())
except (OSError,ValueError): history=[]
history.append({'saved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'hourly':data['hourly']})
history=history[-90:]
path.write_text(json.dumps(history,ensure_ascii=False,separators=(',',':'))+'\n')
print('Saved',len(history),'forecast snapshots')
