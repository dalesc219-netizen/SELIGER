#!/usr/bin/env python3
"""Respectful incremental public Rusfishing indexer.

Indexes only public posts; no login, no anti-bot bypass, and no geocoding
or publication of a fishing GPS pin without separate human review.
Runs 25 older pages per batch from the most recent Seliger thread page.
"""
import argparse
import datetime as dt
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from html import unescape

ROOT=pathlib.Path(__file__).resolve().parent
STATE=ROOT/'data/forum_scan_state.json'
CANDIDATES=ROOT/'data/forum_candidates.json'
BASE='https://www.rusfishing.ru/forum/threads/seliger.1485/'
USER_AGENT='SELIGER-Fishing-Research/1.0 (+source-link public indexing; no login)'
FISH={'щука':r'щук|щурён|щурен','судак':r'судак|судач|клыкаст','окунь':r'окун|окуш',
      'лещ':r'лещ|подлещик','плотва':r'плотв|плотвич','язь':r'\bяз[ьяе]\b','налим':r'налим'}
PLACES={'Берёзовский плёс':r'бер[её]зовск(?:ий|ом|ого)\s+пл[её]с',
        'Полоновка':r'полоновк','Новые Ельцы':r'новы[хе]\s+ельц',
        'Свапуще':r'свапущ','Заречье':r'заречь','Турская':r'турск',
        'Заплавье':r'заплав','Пески':r'\bпеск[иаех]\b','Неприе':r'неприе',
        'Сокол':r'турбаз[аые]?\s+[«"]?сокол','Городомля':r'городомл',
        'Нилова пустынь':r'нилов[ао]\s+пустын','Сорога':r'сорог',
        'Осташков':r'осташков'}
def read(path,default):
    try:return json.loads(path.read_text(encoding='utf-8'))
    except (OSError,ValueError):return default
def save(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def request(url):
    req=urllib.request.Request(url,headers={'User-Agent':USER_AGENT,'Accept':'text/html','Accept-Language':'ru-RU,ru;q=0.9'})
    with urllib.request.urlopen(req,timeout=18) as response:
        if response.status!=200:raise ValueError('HTTP '+str(response.status))
        return response.read(2_000_000).decode('utf-8','replace')
def extract(html,page):
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(html,'html.parser');found=[]
    posts=soup.select('article.message--post, article.message')
    if not posts:raise ValueError('No public post elements parsed; page format changed or access restricted')
    for post in posts:
        content=post.select_one('.bbWrapper')
        if not content:continue
        for q in content.select('blockquote,.bbCodeBlock,script,style'):q.decompose()
        body=' '.join(content.get_text(' ',strip=True).split())
        if len(body)<35:continue
        fish=[k for k,pattern in FISH.items() if re.search(pattern,body,re.I)]
        places=[k for k,pattern in PLACES.items() if re.search(pattern,body,re.I)]
        if not fish or not places:continue
        time_node=post.select_one('time[data-time]')
        try:date=dt.datetime.fromtimestamp(int(time_node.get('data-time')),dt.timezone.utc).date().isoformat()
        except (AttributeError,TypeError,ValueError,OverflowError):date=None
        anchor=post.get('id','')
        num=re.search(r'(\d{3,})$',anchor)
        if not num:
            a=post.select_one('a[href*="/post-"]')
            num=re.search(r'(\d{3,})',a.get('href','')) if a else None
        ident='post-'+num.group(1) if num else 'page-'+str(page)+'-'+str(len(found))
        found.append({'id':ident,'date':date,'page':page,'areas':places,'fish':fish,
            'verified':False,'has_exact_catch_coordinates':False,'map_allowed':False,
            'source':BASE+'page-'+str(page)+(('#'+anchor) if anchor else ''),
            'note':'Автоматически найдено по словам; это не географическая точка и не проверенный улов.'})
    return found

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--pages',type=int,default=25)
    ap.add_argument('--latest-page',type=int,default=248)
    args=ap.parse_args()
    state=read(STATE,{'next_page':args.latest_page,'pages_scanned':[],'errors':[]})
    records=read(CANDIDATES,[])
    if not isinstance(records,list):records=[]
    now=dt.datetime.now(dt.timezone.utc).isoformat()
    parser=urllib.robotparser.RobotFileParser();parser.set_url('https://www.rusfishing.ru/robots.txt')
    try:parser.read()
    except Exception as e:
        state['status']='robots_unavailable';state['errors']=[str(e)[:160]];state['checked_at']=now
        save(STATE,state);print('Robots.txt unavailable; crawl skipped safely');return
    if not parser.can_fetch(USER_AGENT,BASE+'page-248'):
        state['status']='robots_disallow';state['checked_at']=now;save(STATE,state)
        print('Robots disallow accessing thread; crawl skipped');return
    next_page=int(state.get('next_page',args.latest_page))
    scanned=set(state.get('pages_scanned',[]))
    by_id={r['id']:r for r in records if isinstance(r,dict) and r.get('id')}
    errors=[]
    for page in range(next_page,max(0,next_page-args.pages),-1):
        if page<1:break
        if page in scanned:continue
        if not parser.can_fetch(USER_AGENT,BASE+'page-'+str(page)):
            errors.append({'page':page,'error':'disallowed by robots.txt'});break
        try:
            batch=extract(request(BASE+'page-'+str(page)),page)
            for r in batch:by_id[r['id']]=r
            scanned.add(page)
            state['next_page']=page-1
            print('Scanned page',page,'candidates',len(batch))
            time.sleep(1.4)
        except Exception as e:
            errors.append({'page':page,'error':str(e)[:150]})
            print('Page inaccessible',page,str(e)[:150])
            break
    state.update({'checked_at':now,'pages_scanned':sorted(scanned),
       'pages_completed':len(scanned),'estimated_total_pages':args.latest_page,
       'status':'complete' if state.get('next_page',next_page)<1 else ('blocked' if errors else 'in_progress'),
       'errors':errors[-10:],
       'candidate_count':len(by_id),
       'notice':'Candidate terms are not verified catches or map coordinates.'})
    save(CANDIDATES,sorted(by_id.values(),key=lambda r:(r.get('date') or '',r['id']),reverse=True))
    save(STATE,state)
    print('DONE',state['pages_completed'],'pages; candidates',len(by_id),'status',state['status'])
if __name__=='__main__':main()
