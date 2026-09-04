#!/usr/bin/env python3
"""
웰라운지 운영 상황판 빌드
------------------------
입력 : live.xlsx  (구글시트 '세라젬_매장운영_취합양식' 을 xlsx 로 내보낸 것)
        1D8u0-YTbuVQ6ZY31y7WH_GfNXtR9j-CNGq9ZDqjkS-0
템플릿: build/head.html · build/app.js   (같은 저장소)
출력 : ops/index.html

실행 : python3 build/build_ops.py <live.xlsx 경로> <저장소 루트>
필요 : pandas, openpyxl
"""
import sys, os, json, math
import pandas as pd, numpy as np

XLSX = sys.argv[1] if len(sys.argv) > 1 else 'live.xlsx'
ROOT = sys.argv[2] if len(sys.argv) > 2 else '.'
BUILD = os.path.join(ROOT, 'build')

x = pd.ExcelFile(XLSX)

# ---------- 매장마스터 ----------
mm = x.parse('매장마스터')[['매장명','매장코드','팀','지역장','운영M','등급','평수','오픈일','적정코치수']]
mm = mm[mm['매장코드'].notna()].drop_duplicates('매장코드').copy()
mm['적정코치수'] = pd.to_numeric(mm['적정코치수'], errors='coerce').fillna(0)
MS = set(mm['매장코드'])

# ---------- 코치현황 ----------
cs = x.parse('매장별코치현황')
cs = cs[cs['매장코드'].notna()].copy()
for c in ['적정코치수','점장','내부코치','외부코치','총인원','최근6M이탈','평균근속(월)','점장부임(월)']:
    cs[c] = pd.to_numeric(cs[c], errors='coerce')
cs['충족률'] = pd.to_numeric(cs['충족률'].astype(str).str.replace('%',''), errors='coerce')
if cs['충족률'].max() <= 2:
    cs['충족률'] = cs['충족률'] * 100
cs = cs.set_index('매장코드')

# ---------- 일별모객 ----------
mo = x.parse('일별모객'); mo['일자'] = pd.to_datetime(mo['일자'], errors='coerce')
mo = mo[mo['매장코드'].isin(MS) & mo['일자'].notna()]
mo = mo.rename(columns={'클래스회원 (무료)':'무료','클래스회원 (유료)':'유료'})
# 방문 수가 실제로 입력된 달만 사용 (월말 회원 스냅샷만 있는 달 제외)
mo['ym'] = mo['일자'].dt.strftime('%Y-%m')
# 방문 입력일이 15일 미만인 달은 부분 집계로 보고 제외
_g = mo.groupby('ym').apply(
    lambda g: g.loc[g['워크인'].notna(), '일자'].nunique(), include_groups=False)
VIS_YM = sorted(_g[_g >= 15].index.tolist())
W = mo[mo['ym'].isin(VIS_YM)].copy()
W = W.groupby(['매장코드','일자','ym'], as_index=False)[['워크인','클래스','무료','유료']].sum()
vis_m = W.groupby(['매장코드','ym']).agg(일수=('일자','nunique'), 워크인=('워크인','sum'), 클래스=('클래스','sum')).reset_index()
snap = W.sort_values('일자').groupby(['매장코드','ym']).last()[['무료','유료']].reset_index()

# ---------- 신규결제 ----------
pay = x.parse('신규결제')
pay['기준월'] = pd.to_datetime(pay['기준월'], errors='coerce').dt.strftime('%Y-%m')
pay = pay[pay['매장코드'].isin(MS) & pay['기준월'].notna()]
pay_m = pay.groupby(['매장코드','기준월'])['신규결제건수'].sum().reset_index()

# ---------- 일별매출 → 계약수량 (1행 = 1계약 = 1대) ----------
sa = x.parse('일별매출')
sa['주문확정일'] = pd.to_datetime(sa['주문확정일'], errors='coerce')
sa = sa[sa['매장코드'].isin(MS) & sa['주문확정일'].notna()].copy()
sa['d']  = sa['주문확정일'].dt.strftime('%Y-%m-%d')
sa['ym'] = sa['주문확정일'].dt.strftime('%Y-%m')
MAXD = sa['d'].max()
# 마지막 달이 부분 집계면 월별 추이에서 제외
_last = pd.Timestamp(MAXD)
MAXYM = (_last.to_period('M') - (0 if _last.day >= 26 else 1)).strftime('%Y-%m')
qty_m = sa[sa['ym'] <= MAXYM].groupby(['매장코드','ym']).size().rename('대수').reset_index()

# ---------- 매장별 시계열 ----------
ser = {}
def put(code, key, d):
    ser.setdefault(code, {}).setdefault(key, {}).update(d)
for c, g in qty_m.groupby('매장코드'):
    put(c, 'cnt', {r.ym: int(r.대수) for r in g.itertuples()})
for c, g in vis_m.groupby('매장코드'):
    put(c, 'wi', {r.ym: float(r.워크인) for r in g.itertuples()})
    put(c, 'cl', {r.ym: float(r.클래스) for r in g.itertuples()})
    put(c, 'dy', {r.ym: int(r.일수)   for r in g.itertuples()})
for c, g in pay_m.groupby('매장코드'):
    put(c, 'pay', {r.기준월: int(r.신규결제건수) for r in g.itertuples()})
for c, g in snap.groupby('매장코드'):
    put(c, 'mem', {r.ym: int(r.유료) for r in g.itertuples()})

# ---------- 데이터 품질 플래그 ----------
D = mm.set_index('매장코드').drop(columns=['등급']).join(
    cs[['등급','점장','내부코치','외부코치','충족률','최근6M이탈','평균근속(월)','점장부임(월)']])
D['등급'] = D['등급'].fillna(mm.set_index('매장코드')['등급'])
LASTV = VIS_YM[-1] if VIS_YM else None
def dq(code, row):
    f, s = [], ser.get(code, {})
    if not s.get('cnt'):
        f.append('계약수량 미연동')
    visit = sum((s.get('wi') or {}).values()) + sum((s.get('cl') or {}).values())
    mem_last = (s.get('mem') or {}).get(LASTV)
    if visit > 500 and (mem_last in (None, 0)):
        f.append('유료회원 미입력')
    return f
D['dq'] = [dq(c, r) for c, r in D.iterrows()]
D = D.reset_index()

ATTR = ['매장명','매장코드','팀','지역장','운영M','등급','적정코치수','점장','내부코치',
        '외부코치','충족률','평균근속(월)','최근6M이탈','점장부임(월)','dq']
stores = json.loads(D[ATTR].to_json(orient='records', force_ascii=False))

months = {'sal': sorted(qty_m['ym'].unique().tolist()),
          'vis': VIS_YM,
          'pay': sorted(pay_m['기준월'].unique().tolist()),
          'mem': sorted(snap['ym'].unique().tolist())}

def clean(o):
    if isinstance(o, dict):  return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):  return [clean(v) for v in o]
    if isinstance(o, float) and (math.isnan(o) or math.isinf(o)): return None
    return o

payload = clean({'stores': stores, 'series': ser, 'months': months, 'maxYm': MAXYM})

# ---------- 데일리 (진행월 · 전월 · 전년 동월) ----------
CUR  = MAXD[:7]
PREV = (pd.Period(CUR) - 1).strftime('%Y-%m')
LY   = (pd.Period(CUR) - 12).strftime('%Y-%m')
sub  = sa[sa['ym'].isin([CUR, PREV, LY])]
store_daily = {}
for (c, d), g in sub.groupby(['매장코드','d']):
    store_daily.setdefault(c, {})[d] = len(g)
co = sa.groupby('d').size()
co = co[co.index >= (_last - pd.Timedelta(days=400)).strftime('%Y-%m-%d')]
r90 = sa[sa['주문확정일'] >= _last - pd.Timedelta(days=90)]
nday = r90['주문확정일'].dt.normalize().nunique() or 1
dowg = r90.groupby(r90['주문확정일'].dt.dayofweek).size() / nday
daily = {'maxDay': MAXD, 'cur': CUR, 'prev': PREV, 'ly': LY,
         'storeDaily': store_daily,
         'coDaily': {k: int(v) for k, v in co.items()},
         'dow': [round(float(dowg.get(i, 0)), 1) for i in range(7)]}


# ---------- 당일실적(당월) : 목표 대비 진행 ----------
TODAY = None
if '당일실적(당월)' in x.sheet_names:
    td = x.parse('당일실적(당월)')
    td.columns = [str(c).replace('\n', '') for c in td.columns]
    META = ['매장코드','매장명','지역장','사업팀','운영M','목표','실적','달성률','순위','합계']
    SUB  = [c for c in td.columns if c.startswith('Unnamed')]      # V계열/M계열/기타 소계
    MODELS = [c for c in td.columns if c not in META + SUB]
    for c in ['목표','실적','달성률','순위','합계'] + MODELS + SUB:
        if c in td.columns:
            td[c] = pd.to_numeric(td[c], errors='coerce')
    td = td[td['매장명'].notna()].copy()
    # 매장코드가 비었으면 매장명으로 일별매출에서 코드를 찾아 채운다
    name2code = (sa.dropna(subset=['매장명','매장코드'])
                   .drop_duplicates('매장명').set_index('매장명')['매장코드'].to_dict())
    td['매장코드'] = td['매장코드'].fillna(td['매장명'].map(name2code))
    V  = [c for c in MODELS if c.startswith('V')]
    MS_= [c for c in MODELS if c.startswith('M') or c.startswith('S')]
    ETC= [c for c in MODELS if c not in V + MS_]
    rows = []
    for r in td.itertuples(index=False):
        g = r._asdict() if hasattr(r, '_asdict') else {}
        rows.append(g)
    tdd = td.to_dict('records')
    out_rows = []
    for r in tdd:
        models = {m: int(r[m]) for m in MODELS if pd.notna(r.get(m)) and r[m]}
        out_rows.append({
            '매장코드': r.get('매장코드') if pd.notna(r.get('매장코드')) else None,
            '매장명': r['매장명'],
            '팀': r.get('사업팀'), '지역장': r.get('지역장'), '운영M': r.get('운영M'),
            '목표': None if pd.isna(r.get('목표')) else int(r['목표']),
            '실적': 0 if pd.isna(r.get('실적')) else int(r['실적']),
            '순위': None if pd.isna(r.get('순위')) else int(r['순위']),
            '등록': bool(pd.notna(r.get('매장코드')) and r.get('매장코드') in MS),
            'models': models,
            'grp': [int(sum(v for k, v in models.items() if k in V)),
                    int(sum(v for k, v in models.items() if k in MS_)),
                    int(sum(v for k, v in models.items() if k in ETC))]})
    TODAY = {'rows': out_rows, 'month': CUR,
             'groups': [{'k': 'V 시리즈', 'items': V},
                        {'k': 'M·S 시리즈', 'items': MS_},
                        {'k': '기타', 'items': ETC}],
             'models': MODELS}

# ---------- 조립 ----------
head = open(os.path.join(BUILD, 'head.html'), encoding='utf-8').read()
app  = open(os.path.join(BUILD, 'app.js'),   encoding='utf-8').read()
body = (head
        + '\n<script id="D" type="application/json">'
        + json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(',', ':')) + '</script>\n'
        + '<script id="DAILY" type="application/json">'
        + json.dumps(daily,   ensure_ascii=False, allow_nan=False, separators=(',', ':')) + '</script>\n'
        + '<script id="TODAY" type="application/json">'
        + json.dumps(clean(TODAY) if TODAY else None, ensure_ascii=False, allow_nan=False, separators=(',', ':')) + '</script>\n'
        + '<script>\n' + app + '\n</script>\n')
i = body.index('<style>')
html = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        + body[:i]
        + '<style>html{color-scheme:light dark}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        '</head>\n<body>\n' + body[i:] + '\n</body>\n</html>\n')

out = os.path.join(ROOT, 'ops', 'index.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print(f'생성 완료: {out}')
print(f'  매장 {len(stores)}개 · 계약수량 {months["sal"][0]}~{MAXYM} · 모객 {",".join(VIS_YM) or "없음"}')
print(f'  데일리 진행월 {CUR} · 최종일 {MAXD}')
if TODAY:
    _t = sum(r['실적'] for r in TODAY['rows']); _g = sum(r['목표'] or 0 for r in TODAY['rows'])
    _un = sum(1 for r in TODAY['rows'] if not r['등록'])
    print(f'  당일실적 탭 {len(TODAY["rows"])}행 · 실적 {_t}대 / 목표 {_g}대 · 마스터 미등록 {_un}개')
else:
    print('  당일실적(당월) 탭 없음')
