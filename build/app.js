(function(){
const RAW=JSON.parse(document.getElementById('D').textContent);
const S=RAW.stores, SER=RAW.series, MM=RAW.months, MAXYM=RAW.maxYm;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const nf=(v,d=0)=>v==null||isNaN(v)?'—':Number(v).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=v=>v==null||isNaN(v)?'—':(v>0?'+':'')+nf(v,1)+'%';
const pcol=v=>v==null?'var(--ink-3)':(v<0?'var(--crit)':'var(--ok)');
const ALL=MM.sal.slice();
const shift=(m,k)=>{let y=+m.slice(0,4),mo=+m.slice(5)+k;y+=Math.floor((mo-1)/12);mo=((mo-1)%12+12)%12+1;
  return y+'-'+String(mo).padStart(2,'0');};
const range=(a,b)=>ALL.filter(m=>m>=a&&m<=b);
function med(a){a=a.filter(v=>v!=null&&!isNaN(v)).sort((x,y)=>x-y);
  if(!a.length)return null;const h=a.length>>1;return a.length%2?a[h]:(a[h-1]+a[h])/2;}

/* ===== 기간 ===== */
const PRESETS=[
 {k:'vis',   l:'모객 완전구간', from:MM.vis[0], to:MM.vis[MM.vis.length-1]},
 {k:'m3',    l:'최근 3개월',   from:shift(MAXYM,-2), to:MAXYM},
 {k:'m6',    l:'최근 6개월',   from:shift(MAXYM,-5), to:MAXYM},
 {k:'m12',   l:'최근 12개월',  from:shift(MAXYM,-11),to:MAXYM},
 {k:'y2026', l:'2026년',       from:'2026-01', to:MAXYM},
 {k:'y2025', l:'2025년',       from:'2025-01', to:'2025-12'},
 {k:'all',   l:'전체 32개월',  from:ALL[0], to:MAXYM}];
let F={team:'전체',mgr:'전체',grade:'전체'}, TAB='all';
let W={from:PRESETS[0].from,to:PRESETS[0].to,preset:'vis'};
const MB='qty';                                 /* 계약수량 전용 */
const isQ=()=>true;
const MLAB=()=>'대수';
const BU=()=>isQ()?'대':'억원';                  /* KPI 단위 */
const BV=v=>v==null?'—':(isQ()?nf(v):(v/1e8).toFixed(1));
const TU=()=>isQ()?'대':'백만';                  /* 표 단위 */
const TV=v=>v==null?'—':(isQ()?nf(v):nf(v/1e6));
const RV=v=>isQ()?nf(v)+'대':v.toFixed(1)+'억';   /* 랭킹 */
const RS=v=>isQ()?v:v/1e8;                       /* 랭킹 스케일 */
const PU=()=>isQ()?'대':'만원';                  /* 코치 1인당 */
const PV=v=>v==null?'—':(isQ()?nf(v,1):nf(v/1e4));

/* ===== 기간 지표 계산 ===== */
function calc(d){
 const s=SER[d.매장코드]||{}, ms=range(W.from,W.to);
 const g=(k,m)=>(s[k]&&s[k][m]!=null)?s[k][m]:null;
 let salSum=0,salN=0,cnt=0,cntN=0,ly=0,cntLy=0,lyN=0;
 ms.forEach(m=>{const v=g('sal',m); if(v!=null){salSum+=v;salN++;}
   const c=g('cnt',m); if(c!=null){cnt+=c;cntN++;}
   const p=shift(m,-12);
   if(p>=ALL[0]){lyN++; const lv=g('sal',p); if(lv!=null)ly+=lv;
     const lc=g('cnt',p); if(lc!=null)cntLy+=lc;} else lyN=-999;});
 let wi=0,cl=0,dy=0,visN=0;
 ms.forEach(m=>{if(g('wi',m)!=null){wi+=s.wi[m];cl+=s.cl[m];dy+=s.dy[m];visN++;}});
 const convM=ms.filter(m=>g('wi',m)!=null&&g('pay',m)!=null);
 let cWi=0,cCl=0,cPay=0;
 convM.forEach(m=>{cWi+=s.wi[m];cCl+=s.cl[m];cPay+=s.pay[m];});
 let pay=0,payN=0;
 ms.forEach(m=>{const p=g('pay',m); if(p!=null){pay+=p;payN++;}});
 const memM=ms.filter(m=>g('mem',m)!=null);
 const m0=memM.length?s.mem[memM[0]]:null, m1=memM.length?s.mem[memM[memM.length-1]]:null;
 const visit=wi+cl;
 const o={
  ...d,
  금액합:salSum*1e6, 금액월:salN?salSum/salN*1e6:null,
  대수합:cnt, 대수월:cntN?cnt/cntN:null,
  salSum:isQ()?cnt:salSum*1e6,
  salM:isQ()?(cntN?cnt/cntN:null):(salN?salSum/salN*1e6:null),
  salN,
  yoy:(lyN!==ms.length)?null:(isQ()?(cntLy>0?((cnt/cntLy-1)*100):null):(ly>0?((salSum/ly-1)*100):null)),
  건수:cnt, 객단가:cnt?salSum*1e6/cnt:null,
  워크인일평균:dy?wi/dy:null, 클래스일평균:dy?cl/dy:null, 총방문일평균:dy?visit/dy:null,
  총방문:visit, 영업일:dy, visN,
  클래스비중:visit?cl/visit*100:null,
  신규결제:pay, payN, 신규결제월평균:payN?pay/payN:null,
  전환율:(cWi+cCl)>0?cPay/(cWi+cCl)*100:null,
  유료회원_현재:m1, 유료회원_증감:(m0!=null&&m1!=null&&memM.length>1)?m1-m0:null,
  유료회원_증감율:(m0>0&&m1!=null&&memM.length>1)?((m1/m0-1)*100):null,
  코치1인매출:d.내부코치?(isQ()?(cntN?cnt/cntN/d.내부코치:null):(salN?salSum/salN*1e6/d.내부코치:null)):null,
  memMonths:memM.length};
 return o;
}
function build(){
 const L=S.filter(d=>(F.team==='전체'||d.팀===F.team)&&(F.mgr==='전체'||d.지역장===F.mgr)&&(F.grade==='전체'||d.등급===F.grade))
          .map(calc);
 // 등급 중앙값 기준 지수 — 필터된 집합이 작으면 전체 기준으로
 const BASE = L.length>=12 ? L : S.map(calc);
 const gm={};
 ['A','B','C'].forEach(g=>{const v=BASE.filter(d=>d.등급===g);
  gm[g]={vis:med(v.map(d=>d.총방문일평균)),conv:med(v.map(d=>d.전환율)),
         sal:med(v.map(d=>d.코치1인매출)),mem:med(v.map(d=>d.유료회원_현재)),
         fill:med(v.map(d=>d.충족률)),ten:med(v.map(d=>d['평균근속(월)'])),
         ch:med(v.map(d=>d.최근6M이탈))};});
 const ix=(v,m,cap=200)=>(v==null||m==null||m===0)?null:Math.min(cap,Math.max(0,v/m*100));
 L.forEach(d=>{const b=gm[d.등급]||{};
  d.i_유입=ix(d.총방문일평균,b.vis); d.i_전환=ix(d.전환율,b.conv);
  d.i_매출=ix(d.코치1인매출,b.sal); d.i_회원=ix(d.유료회원_현재,b.mem);
  d.i_충족=ix(d.충족률,b.fill,120); d.i_근속=ix(d['평균근속(월)'],b.ten);
  d.i_이탈=(b.ch==null)?null:(d.최근6M이탈===0?150:Math.min(150,b.ch/d.최근6M이탈*100));
  const P=[d.i_매출,d.i_유입,d.i_전환,d.i_회원].filter(v=>v!=null);
  const H=[d.i_충족,d.i_근속,d.i_이탈].filter(v=>v!=null);
  d.성과지수=P.length?P.reduce((a,b)=>a+b,0)/P.length:null;
  d.인력지수=H.length?H.reduce((a,b)=>a+b,0)/H.length:null;
  const t=[]; const dq=d.dq||[];
  if(d.i_유입!=null&&d.i_유입<80) t.push('유입');
  if(d.i_전환!=null&&d.i_전환<80&&!dq.includes('계약수량 미연동')) t.push('전환');
  if(d.유료회원_증감율!=null&&d.유료회원_증감율<-10&&!dq.includes('유료회원 미입력')) t.push('유지');
  if(d.i_충족!=null&&d.i_충족<80) t.push('인력');
  d.진단=t; d.조합=t.join('+')||'이상없음';});
 return L;
}
function agg(L){
 const sum=k=>L.reduce((s,d)=>s+(d[k]||0),0);
 const ms=range(W.from,W.to);
 const by=k=>{const o={};L.forEach(d=>{const s=SER[d.매장코드]||{};
   if(s[k]) for(const m in s[k]) if(m>=W.from&&m<=W.to) o[m]=(o[m]||0)+s[k][m];});return o;};
 const salBy={};
 L.forEach(d=>{const s=SER[d.매장코드]||{};
   const src=isQ()?s.cnt:s.sal;
   if(src) for(const m in src) salBy[m]=(salBy[m]||0)+src[m];});
 const wiB=by('wi'),clB=by('cl'),dyB={},payB=by('pay'),memB=by('mem');
 L.forEach(d=>{const s=SER[d.매장코드]||{};if(s.dy)for(const m in s.dy)
   if(m>=W.from&&m<=W.to) dyB[m]=Math.max(dyB[m]||0,s.dy[m]);});
 const visMons=ms.filter(m=>wiB[m]!=null);
 const wiAvg={},clAvg={};
 visMons.forEach(m=>{wiAvg[m]=dyB[m]?wiB[m]/dyB[m]:0;clAvg[m]=dyB[m]?clB[m]/dyB[m]:0;});
 const yoy=m=>{const p=shift(m,-12);return (salBy[p]>0)?((salBy[m]/salBy[p]-1)*100):null;};
 const salSeries=ALL.map(m=>({ym:m,v:isQ()?(salBy[m]||0):(salBy[m]||0)/100,
   yoy:yoy(m)==null?null:Math.round(yoy(m)*10)/10, on:m>=W.from&&m<=W.to}));
 const wSal=ms.reduce((s,m)=>s+(salBy[m]||0),0);
 const lyOk=ms.every(m=>shift(m,-12)>=ALL[0]);
 const wLy=lyOk?ms.reduce((s,m)=>s+(salBy[shift(m,-12)]||0),0):0;
 const lastOn=[...ms].reverse().find(m=>salBy[m]!=null);
 const memK=visMons.filter(m=>memB[m]!=null);
 const totVisit=L.reduce((s,d)=>s+(d.총방문||0),0);
 return {L,n:L.length,ms,
  salSum:isQ()?wSal:wSal*1e6,
  salM:ms.length?(wSal/ms.filter(m=>salBy[m]!=null).length)*(isQ()?1:1e6):0,
  wYoy:(lyOk&&wLy>0)?((wSal/wLy-1)*100):null, salSeries, salBy,
  wiAvg,clAvg,payB,memB,visMons,
  lastYm:lastOn, lastSal:lastOn?(isQ()?salBy[lastOn]:salBy[lastOn]/100):0, lastYoy:lastOn?yoy(lastOn):null,
  visLast:visMons.length?(wiAvg[visMons[visMons.length-1]]+clAvg[visMons[visMons.length-1]]):0,
  wiLast:visMons.length?wiAvg[visMons[visMons.length-1]]:0,
  clLast:visMons.length?clAvg[visMons[visMons.length-1]]:0,
  pay:sum('신규결제'), visTot:totVisit,
  conv:totVisit?sum('신규결제')/totVisit*100:null,
  mem:memK.length?memB[memK[memK.length-1]]:null,
  memD:memK.length>1?memB[memK[memK.length-1]]-memB[memK[0]]:null,
  memDown:L.filter(d=>d.유료회원_증감<0).length, memUp:L.filter(d=>d.유료회원_증감>0).length,
  inner:sum('내부코치'), outer:sum('외부코치'), need:sum('적정코치수'), mgr:sum('점장'),
  under:L.filter(d=>d.충족률!=null&&d.충족률<100).length,
  churn:sum('최근6M이탈'), churn2:L.filter(d=>d.최근6M이탈>=2).length,
  ten:med(L.map(d=>d['평균근속(월)'])), 객단가:med(L.map(d=>d.객단가)), medStore:med(L.map(d=>d.salM)),
  hasVis:visMons.length>0, hasMem:memK.length>1, hasPay:ms.some(m=>payB[m]!=null),
  visN:visMons.length, payN:ms.filter(m=>payB[m]!=null).length, memN:memK.length};
}

/* ===== 필터 UI ===== */
const TEAMS=[...new Set(S.map(d=>d.팀))].sort();
document.getElementById('fTeam').innerHTML=['전체',...TEAMS]
 .map(t=>'<button class="chip" data-team="'+t+'" aria-pressed="'+(t==='전체')+'">'+t+'</button>').join(' ');
document.getElementById('fGrade').innerHTML=['전체','A','B','C']
 .map(g=>'<button class="chip" data-grade="'+g+'" aria-pressed="'+(g==='전체')+'">'+g+'</button>').join(' ');
document.getElementById('fPreset').innerHTML=PRESETS
 .map(p=>'<button class="pchip" data-p="'+p.k+'" aria-pressed="'+(W.preset===p.k)+'">'+p.l+'</button>').join(' ');
function opts(sel,val){document.getElementById(sel).innerHTML=
 ALL.map(m=>'<option value="'+m+'"'+(m===val?' selected':'')+'>'+m+'</option>').join('');}
function fillMgr(){
 const pool=F.team==='전체'?S:S.filter(d=>d.팀===F.team);
 const list=[...new Set(pool.map(d=>d.지역장))].filter(Boolean).sort();
 if(F.mgr!=='전체'&&!list.includes(F.mgr)) F.mgr='전체';
 document.getElementById('fMgr').innerHTML='<option value="전체">전체 ('+list.length+'명)</option>'
  +list.map(m=>'<option value="'+m+'"'+(F.mgr===m?' selected':'')+'>'+m+' · '+pool.filter(d=>d.지역장===m).length+'개</option>').join('');
}
function syncPeriodUI(){
 opts('fFrom',W.from); opts('fTo',W.to);
 [...document.querySelectorAll('.pchip')].forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===W.preset));
}
document.querySelector('.filters').addEventListener('click',e=>{
 const p=e.target.closest('.pchip');
 if(p){const P=PRESETS.find(x=>x.k===p.dataset.p);W={from:P.from,to:P.to,preset:P.k};syncPeriodUI();render();return;}
 const b=e.target.closest('.chip');
 if(b){ if(b.dataset.team!==undefined){F.team=b.dataset.team;fillMgr();} else F.grade=b.dataset.grade;
   [...document.querySelectorAll('.chip')].forEach(c=>c.setAttribute('aria-pressed',
     c.dataset.team!==undefined?c.dataset.team===F.team:c.dataset.grade===F.grade));
   render(); return;}
 if(e.target.id==='fReset'){F={team:'전체',mgr:'전체',grade:'전체'};
   W={from:PRESETS[0].from,to:PRESETS[0].to,preset:'vis'};
   fillMgr();syncPeriodUI();
   [...document.querySelectorAll('.chip')].forEach(c=>c.setAttribute('aria-pressed',
     c.dataset.team!==undefined?c.dataset.team==='전체':c.dataset.grade==='전체'));
   render();}
});
document.getElementById('fMgr').addEventListener('change',e=>{F.mgr=e.target.value;render();});
['fFrom','fTo'].forEach(id=>document.getElementById(id).addEventListener('change',()=>{
 let a=document.getElementById('fFrom').value, b=document.getElementById('fTo').value;
 if(a>b){ if(id==='fFrom') b=a; else a=b; }
 W={from:a,to:b,preset:null}; syncPeriodUI(); render();
}));
document.getElementById('tabbar').addEventListener('click',e=>{
 const b=e.target.closest('.tb'); if(!b) return;
 TAB=b.dataset.t;
 [...document.querySelectorAll('.tb')].forEach(t=>t.setAttribute('aria-selected',t===b));
 render(); window.scrollTo({top:0,behavior:'instant'});
});

/* ===== 차트 ===== */
function chartSales(A){
 const d=A.salSeries; if(!d.length) return '<div class="empty">계약수량 데이터가 없습니다</div>';
 const W2=Math.max(720,d.length*30),H=250,P={t:14,r:44,b:32,l:48},iw=W2-P.l-P.r,ih=H-P.t-P.b;
 const mv=Math.max(...d.map(r=>r.v),1)*1.1, ys=v=>P.t+ih-(v/mv)*ih, bw=iw/d.length*.62;
 const yo=d.filter(r=>r.on&&r.yoy!=null).map(r=>r.yoy);
 const ym=yo.length?Math.max(...yo.map(Math.abs),10)*1.15:60, y2=v=>P.t+ih/2-(v/ym)*(ih/2);
 let g='',bars='',lbl='',dots='';
 [0,.25,.5,.75,1].forEach(f=>{const v=mv*f;
  g+='<line x1="'+P.l+'" x2="'+(W2-P.r)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="'+css('--line-soft')+'"/>'
   +'<text x="'+(P.l-7)+'" y="'+(ys(v)+4)+'" text-anchor="end" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">'+nf(v)+'</text>';});
 d.forEach((r,i)=>{const cx=P.l+(i+.5)*(iw/d.length);
  bars+='<rect x="'+(cx-bw/2)+'" y="'+ys(r.v)+'" width="'+bw+'" height="'+Math.max(0,ih-(ys(r.v)-P.t))+'" rx="1" fill="'+css('--accent-2')+'" opacity="'+(r.on?1:.22)+'"><title>'+r.ym+' · '+(isQ()?nf(r.v)+'대':r.v.toFixed(1)+'억')+(r.yoy!=null?' · 전년비 '+r.yoy+'%':'')+(r.on?'':' (선택 기간 밖)')+'</title></rect>';
  if(r.ym.endsWith('-01')||r.ym.endsWith('-07'))
   lbl+='<text x="'+cx+'" y="'+(H-P.b+15)+'" text-anchor="middle" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">'+r.ym.slice(2)+'</text>';
  if(r.on&&r.yoy!=null) dots+='<circle cx="'+cx+'" cy="'+y2(r.yoy)+'" r="2.5" fill="'+(r.yoy>=0?css('--warn'):css('--crit'))+'"><title>'+r.ym+' 전년비 '+r.yoy+'%</title></circle>';});
 const on=d.filter(r=>r.on);
 let bandStr='';
 if(on.length&&on.length<d.length){
  const i0=d.indexOf(on[0]), i1=d.indexOf(on[on.length-1]);
  const x0=P.l+i0*(iw/d.length), x1=P.l+(i1+1)*(iw/d.length);
  bandStr='<rect x="'+x0+'" y="'+P.t+'" width="'+(x1-x0)+'" height="'+ih+'" fill="'+css('--accent')+'" opacity=".05"/>'
   +'<line x1="'+x0+'" x2="'+x0+'" y1="'+P.t+'" y2="'+(P.t+ih)+'" stroke="'+css('--accent')+'" stroke-width="1" opacity=".45"/>'
   +'<line x1="'+x1+'" x2="'+x1+'" y1="'+P.t+'" y2="'+(P.t+ih)+'" stroke="'+css('--accent')+'" stroke-width="1" opacity=".45"/>';
 }
 const pts=on.map(r=>r.yoy==null?null:(P.l+(d.indexOf(r)+.5)*(iw/d.length))+','+y2(r.yoy)).filter(Boolean);
 const zero='<line x1="'+P.l+'" x2="'+(W2-P.r)+'" y1="'+y2(0)+'" y2="'+y2(0)+'" stroke="'+css('--ink-3')+'" stroke-dasharray="3 3" opacity=".7"/>'
  +'<text x="'+(W2-P.r+5)+'" y="'+(y2(0)+4)+'" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">0%</text>'
  +'<text x="'+(W2-P.r+5)+'" y="'+(y2(ym*.7)+4)+'" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">+'+Math.round(ym*.7)+'</text>';
 return '<svg viewBox="0 0 '+W2+' '+H+'" width="'+W2+'" height="'+H+'" role="img" aria-label="월 계약수량과 전년 동월비">'
  +g+bandStr+bars+zero+(pts.length>1?'<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+css('--warn')+'" stroke-width="1.6"/>':'')+dots+lbl+'</svg>';
}
function chartLines(mons,series){
 const vals=series.flatMap(s=>mons.map(m=>s.src[m]).filter(v=>v!=null));
 if(!vals.length) return '<div class="empty">선택한 기간에 데이터가 없습니다</div>';
 const W2=Math.max(400,mons.length*96),H=215,P={t:16,r:18,b:32,l:52},iw=W2-P.l-P.r,ih=H-P.t-P.b;
 const mx=Math.max(...vals)*1.14||1, ys=v=>P.t+ih-(v/mx)*ih, xs=i=>P.l+(mons.length<2?iw/2:i*(iw/(mons.length-1)));
 let g='';[0,.25,.5,.75,1].forEach(f=>{const v=mx*f;
  g+='<line x1="'+P.l+'" x2="'+(W2-P.r)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="'+css('--line-soft')+'"/>'
   +'<text x="'+(P.l-7)+'" y="'+(ys(v)+4)+'" text-anchor="end" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">'+nf(v)+'</text>';});
 let b='';
 series.forEach(s=>{const pts=[];
  mons.forEach((m,i)=>{const v=s.src[m];if(v!=null)pts.push(xs(i)+','+ys(v));});
  if(pts.length>1) b+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+s.c+'" stroke-width="2" stroke-linejoin="round"/>';
  mons.forEach((m,i)=>{const v=s.src[m];if(v!=null)
   b+='<circle cx="'+xs(i)+'" cy="'+ys(v)+'" r="3.3" fill="'+s.c+'"><title>'+m+' '+s.lab+' '+nf(v,1)+'</title></circle>';});});
 let l='';mons.forEach((m,i)=>{l+='<text x="'+xs(i)+'" y="'+(H-P.b+15)+'" text-anchor="middle" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">'+m.slice(2)+'</text>';});
 return '<svg viewBox="0 0 '+W2+' '+H+'" width="'+W2+'" height="'+H+'" role="img" aria-label="월별 추이">'+g+b+l+'</svg>';
}
function chartStack(mons,a,b,ca,cb,la,lb){
 const tot=mons.map(m=>(a[m]||0)+(b[m]||0));
 if(!tot.length||!tot.some(v=>v>0)) return '<div class="empty">선택한 기간에 모객 데이터가 없습니다</div>';
 const W2=Math.max(360,mons.length*110),H=215,P={t:16,r:18,b:32,l:52},iw=W2-P.l-P.r,ih=H-P.t-P.b;
 const mx=Math.max(...tot)*1.15||1, ys=v=>P.t+ih-(v/mx)*ih, bw=Math.min(46,iw/mons.length*.5);
 let g='';[0,.5,1].forEach(f=>{const v=mx*f;
  g+='<line x1="'+P.l+'" x2="'+(W2-P.r)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="'+css('--line-soft')+'"/>'
   +'<text x="'+(P.l-7)+'" y="'+(ys(v)+4)+'" text-anchor="end" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">'+nf(v)+'</text>';});
 let r='',l='';
 mons.forEach((m,i)=>{const cx=P.l+(i+.5)*(iw/mons.length), va=a[m]||0, vb=b[m]||0;
  const hb=ih-(ys(vb)-P.t), ha=ih-(ys(va+vb)-P.t)-hb;
  r+='<rect x="'+(cx-bw/2)+'" y="'+ys(vb)+'" width="'+bw+'" height="'+Math.max(0,hb)+'" fill="'+cb+'"><title>'+m+' '+lb+' '+nf(vb,1)+'</title></rect>'
   +'<rect x="'+(cx-bw/2)+'" y="'+ys(va+vb)+'" width="'+bw+'" height="'+Math.max(0,ha)+'" fill="'+ca+'"><title>'+m+' '+la+' '+nf(va,1)+'</title></rect>';
  l+='<text x="'+cx+'" y="'+(H-P.b+15)+'" text-anchor="middle" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">'+m.slice(2)+'</text>';});
 return '<svg viewBox="0 0 '+W2+' '+H+'" width="'+W2+'" height="'+H+'" role="img" aria-label="워크인 클래스 방문">'+g+r+l+'</svg>';
}
function rank(items,fmt,neg){
 if(!items.length) return '<div class="empty">표시할 항목이 없습니다</div>';
 const mx=Math.max(...items.map(i=>Math.abs(i.v)))||1;
 return '<div class="rank">'+items.map(i=>
  '<div class="rk"><span class="rn" title="'+i.k+'">'+i.k+'</span>'
  +'<span class="rb"><i class="'+(neg&&i.v<0?'neg':'')+'" style="width:'+(Math.abs(i.v)/mx*100)+'%"></i></span>'
  +'<span class="rv" style="color:'+(neg?pcol(i.v):'inherit')+'">'+fmt(i.v)+'</span></div>').join('')+'</div>';
}
function groupRows(L,key){const m={};L.forEach(d=>{const k=d[key]||'—';(m[k]=m[k]||[]).push(d);});
 return Object.entries(m).map(([k,v])=>({k,v,A:agg(v)}));}

/* ===== 테이블 ===== */
let SORT={col:null,dir:-1};
function table(cols,rows,id){
 const th=cols.map((c,i)=>'<th class="'+(c.sort===false?'':'s')+'" data-i="'+i+'" data-on="'+(SORT.col===i?1:0)+'">'
   +c.h+(SORT.col===i?(SORT.dir<0?' ▾':' ▴'):'')+'</th>').join('');
 let R=rows.slice();
 if(SORT.col!=null&&cols[SORT.col]&&cols[SORT.col].sort!==false){
  const k=cols[SORT.col].k;
  R.sort((a,b)=>{const x=a[k],y=b[k];
   if(x==null)return 1; if(y==null)return -1;
   return (typeof x==='string'?x.localeCompare(y):x-y)*SORT.dir;});}
 const body=R.map(r=>'<tr>'+cols.map(c=>'<td class="'+(c.cls||'')+'"'+(c.style?' style="'+c.style(r)+'"':'')+'>'+c.f(r)+'</td>').join('')+'</tr>').join('');
 return '<div class="tw" id="'+id+'"><table><thead><tr>'+th+'</tr></thead><tbody>'
  +(body||'<tr><td colspan="'+cols.length+'" class="txt" style="text-align:center;color:var(--ink-3);padding:26px">해당 조건의 매장이 없습니다</td></tr>')+'</tbody></table></div>';
}
document.addEventListener('click',e=>{const th=e.target.closest('th.s'); if(!th) return;
 const i=+th.dataset.i; SORT = SORT.col===i?{col:i,dir:-SORT.dir}:{col:i,dir:-1}; render();});

const NAME=r=>r.매장명+'<span class="gb">'+r.등급+'·'+r.팀+'</span>';
const TAGS=r=>{const t=(r.진단||[]).map(x=>'<span class="tag '+x+'">'+x+'</span>').join('')||'<span class="tag ok">이상없음</span>';
 return '<span class="tags">'+t+((r.dq||[]).length?'<span class="tag dq">'+r.dq[0]+'</span>':'')+'</span>';};
function kpiRow(k){return '<div class="kpis">'+k.map(x=>
 '<div class="kpi"><div class="k-l">'+x.l+'</div><div class="k-v">'+x.v+'<small>'+(x.u||'')+'</small></div>'
 +'<div class="k-d '+(x.c||'')+'">'+(x.d||'')+'</div></div>').join('')+'</div>';}
const PLAB=()=>W.from===W.to?W.from:W.from+' ~ '+W.to;
function noVis(A,what){return '<div class="card"><div class="empty">선택한 기간('+PLAB()+')에는 '+what
 +' 데이터가 없습니다. 모객·회원은 '+MM.vis[0]+' ~ '+MM.vis[MM.vis.length-1]
 +', 신규결제는 '+MM.pay[0]+' ~ '+MM.pay[MM.pay.length-1]+' 구간만 입력돼 있습니다.</div></div>';}

/* ===== 탭 ===== */
function viewAll(A){
 const L=A.L;
 const AX=[{k:'유입',q:'사람이 안 온다',v:'var(--g-in)',p:'같은 등급 대비 총방문 지수 80 미만. 상권 노출·홍보가 1차 과제입니다.'},
  {k:'전환',q:'와도 결제가 안 된다',v:'var(--g-cv)',p:'방문은 나오는데 전환율 지수가 80 미만. 상담·클래스 운영 문제입니다.'},
  {k:'유지',q:'결제해도 남지 않는다',v:'var(--g-rt)',p:'기간 내 유료회원이 10% 넘게 순감. 프로그램·관리 문제입니다.'},
  {k:'인력',q:'돌릴 사람이 없다',v:'var(--g-hr)',p:'충족률이 등급 중앙값의 80% 미만. 다른 축보다 충원이 먼저입니다.'}];
 const cards=AX.map(a=>{const l=L.filter(d=>d.진단.includes(a.k));
  const byG=['A','B','C'].map(g=>g+' '+l.filter(d=>d.등급===g).length).join(' · ');
  const w=l.filter(d=>d.성과지수!=null).sort((x,y)=>x.성과지수-y.성과지수).slice(0,3).map(d=>d.매장명).join(', ');
  return '<div class="dcard" style="--stripe:'+a.v+'"><h4>'+a.k+'<span>'+l.length+'</span></h4><div class="q">'+a.q+'</div>'
   +'<p>'+a.p+'</p><div class="who">등급별 '+byG+'<br><b>'+(w||'—')+'</b></div></div>';}).join('');
 const ok=L.filter(d=>!d.진단.length).length;
 return todayBlock(L)
 +kpiRow([
  {l:'월 '+MLAB()+' ('+A.ms.length+'개월 평균)',v:BV(A.salM),u:BU(),d:'기간 합계 '+BV(A.salSum)+(isQ()?'대':'억'),c:''},
  {l:'기간 전년 동기비',v:A.wYoy==null?'—':pct(A.wYoy).replace('%',''),u:'%',d:A.wYoy==null?'전년 데이터 없음':'선택 기간 대 전년 동기',c:A.wYoy==null?'':A.wYoy<0?'dn':A.wYoy<10?'fl':'up'},
  {l:'일평균 방문',v:A.hasVis?nf(A.visLast):'—',u:'건',d:A.hasVis?('워크인 '+nf(A.wiLast)+' + 클래스 '+nf(A.clLast)):'기간 내 모객 데이터 없음',c:''},
  {l:'전환율',v:A.conv==null?'—':nf(A.conv,2),u:'%',d:A.hasPay?('신규결제 '+nf(A.pay)+'건'):'기간 내 결제 데이터 없음',c:''},
  {l:'유료회원',v:A.mem==null?'—':nf(A.mem),u:'명',d:A.memD==null?'기간 내 비교 불가':((A.memD<0?'▼ ':'▲ ')+Math.abs(A.memD)+'명 · 순감 '+A.memDown+'개점'),c:A.memD<0?'dn':'up'},
  {l:'내부코치',v:nf(A.inner),u:'명',d:A.under+'개점 충족률 미달 · 외부 '+nf(A.outer),c:''}])
 +'<div class="card"><div class="ch"><h3>월 '+MLAB()+'과 전년 동월 대비 성장률</h3>'
 +'<div class="legend"><span><i style="background:var(--accent-2)"></i>월 '+MLAB()+'('+BU()+')</span><span><i style="background:var(--warn)"></i>전년 동월비(%)</span><span>연한 막대 = 선택 기간 밖</span></div></div>'
 +'<div class="scroller">'+chartSales(A)+'</div>'
 +'<p class="cap">선택 기간 <b>'+PLAB()+'</b>의 '+MLAB()+'는 '+BV(A.salSum)+(isQ()?'대':'억')+', 전년 동기 대비 <b>'+pct(A.wYoy)+'</b>입니다. 5월 피크는 3년 연속 반복되는 계절 최고점이니, 짧은 기간을 고를 때는 전년 동기비로 보셔야 계절 착시를 피합니다.</p></div>'
 +'<h2 class="sec">부진의 네 갈래 — 어디가 막혔나</h2><div class="dgrid">'+cards+'</div>'
 +'<p class="note">'+A.n+'개 매장 중 <b>'+ok+'개는 네 축 모두 이상 신호가 없습니다.</b> 판정은 모두 같은 등급 안에서, 선택한 기간 값으로 계산합니다.'
 +(A.hasVis?'':' <b class="fl">지금 기간에는 모객·회원 데이터가 없어 유입·전환·유지 판정이 비어 있습니다.</b>')+'</p>'
 +'<h2 class="sec">매장별 종합 — 성과지수 낮은 순</h2>'
 +table([{h:'매장',k:'매장명',f:NAME,cls:'name'},
   {h:'성과지수',k:'성과지수',f:r=>nf(r.성과지수,1),style:r=>'font-weight:600;color:'+(r.성과지수==null?'var(--ink-3)':r.성과지수<80?'var(--crit)':r.성과지수<100?'var(--warn)':'var(--ink)')},
   {h:'인력지수',k:'인력지수',f:r=>nf(r.인력지수,1)},
   {h:'월'+MLAB()+'('+TU()+')',k:'salM',f:r=>TV(r.salM)},
   {h:'전년비',k:'yoy',f:r=>pct(r.yoy),style:r=>'color:'+pcol(r.yoy)},
   {h:'방문/일',k:'총방문일평균',f:r=>nf(r.총방문일평균,1)},
   {h:'전환율',k:'전환율',f:r=>r.전환율==null?'—':nf(r.전환율,2)+'%'},
   {h:'회원',k:'유료회원_현재',f:r=>nf(r.유료회원_현재)},
   {h:'충족률',k:'충족률',f:r=>nf(r.충족률,0)+'%'},
   {h:'진단',k:'조합',f:TAGS,sort:false}],
  L.slice().sort((a,b)=>(a.성과지수??9e9)-(b.성과지수??9e9)),'tAll');
}
function viewSal(A){
 const L=A.L;
 const byTeam=groupRows(L,'팀').map(g=>({k:g.k+' ('+g.v.length+')',v:RS(g.A.salM)})).sort((a,b)=>b.v-a.v);
 const byMgr=groupRows(L,'지역장').map(g=>({k:g.k+' ('+g.v.length+')',v:RS(g.A.salM)})).sort((a,b)=>b.v-a.v);
 const mgrEff=groupRows(L,'지역장').map(g=>({k:g.k,v:g.A.inner?(isQ()?Math.round(g.A.salM/g.A.inner*10)/10:Math.round(g.A.salM/g.A.inner/1e4)):0})).sort((a,b)=>b.v-a.v);
 const mgrYoy=groupRows(L,'지역장').filter(g=>g.A.wYoy!=null).map(g=>({k:g.k,v:Math.round(g.A.wYoy*10)/10})).sort((a,b)=>a.v-b.v);
 const yoyRank=L.filter(d=>d.yoy!=null).sort((a,b)=>a.yoy-b.yoy).slice(0,10).map(d=>({k:d.매장명,v:Math.round(d.yoy*10)/10}));
 return kpiRow([
  {l:'기간 '+MLAB()+' 합계',v:BV(A.salSum),u:BU(),d:PLAB()+' · '+A.n+'개 매장',c:''},
  {l:'월 '+MLAB()+' 평균',v:BV(A.salM),u:BU(),d:A.ms.length+'개월 기준',c:''},
  {l:'전년 동기비',v:A.wYoy==null?'—':pct(A.wYoy).replace('%',''),u:'%',d:A.wYoy==null?'전년 데이터 없음':'계절 영향 제거된 비교',c:A.wYoy==null?'':A.wYoy<0?'dn':A.wYoy<10?'fl':'up'},
  {l:'최근월 ('+(A.lastYm||'—')+')',v:isQ()?nf(A.lastSal):A.lastSal.toFixed(1),u:BU(),d:'전년비 '+pct(A.lastYoy),c:A.lastYoy<0?'dn':'up'},
  {l:'매장당 월 대수',v:A.n?TV(A.salM/A.n):'—',u:'대',d:'중앙값 '+nf(A.medStore,1)+'대 — 큰 매장 영향 제거',c:''},
  {l:'코치 1인당 월 대수',v:A.inner?PV(A.salM/A.inner):'—',u:'대',d:'내부코치 '+nf(A.inner)+'명 기준',c:''}])
 +'<div class="card"><div class="ch"><h3>월 '+MLAB()+'과 전년 동월 대비 성장률</h3><span class="hint">진한 막대 = 선택 기간 · 커서를 올리면 값이 보입니다</span></div>'
 +'<div class="scroller">'+chartSales(A)+'</div></div>'
 +'<div class="two"><div class="card tight"><div class="ch"><h3>팀별 월 '+MLAB()+'</h3><span class="hint">'+BU()+'</span></div>'+rank(byTeam,RV)
 +'</div><div class="card tight"><div class="ch"><h3>지역장별 코치 1인당 월 '+MLAB()+'</h3><span class="hint">'+PU()+' · 규모 아닌 효율</span></div>'
 +rank(mgrEff.slice(0,12),v=>nf(v,isQ()?1:0)+PU())+'</div></div>'
 +'<div class="two"><div class="card tight"><div class="ch"><h3>지역장별 전년 동기비</h3><span class="hint">% · 낮은 순</span></div>'
 +rank(mgrYoy.slice(0,12),v=>pct(v),true)
 +'</div><div class="card tight"><div class="ch"><h3>전년비 하위 매장</h3><span class="hint">선택 기간 vs 전년 동기</span></div>'
 +rank(yoyRank,v=>pct(v),true)+'</div></div>'
 +'<h2 class="sec">매장별 계약수량 <span style="font-weight:400;color:var(--ink-3);font-size:13px">— '+PLAB()+'</span></h2>'
 +table([{h:'매장',k:'매장명',f:NAME,cls:'name'},
   {h:'지역장',k:'지역장',f:r=>r.지역장||'—',cls:'txt'},
   {h:'기간'+MLAB()+'('+TU()+')',k:'salSum',f:r=>TV(r.salSum)},
   {h:'월평균('+TU()+')',k:'salM',f:r=>TV(r.salM)},
   {h:'전년비',k:'yoy',f:r=>pct(r.yoy),style:r=>'color:'+pcol(r.yoy)},
   {h:'코치1인('+PU()+')',k:'코치1인매출',f:r=>PV(r.코치1인매출)},
   {h:'내부코치',k:'내부코치',f:r=>nf(r.내부코치)}],
  L.slice().sort((a,b)=>(b.salSum||0)-(a.salSum||0)),'tSal')
 +'<p class="note"><b>전년비</b>는 선택 기간과 정확히 같은 달의 전년치를 비교합니다(전년 데이터가 다 있을 때만 값이 나옵니다). 계절성이 큰 사업이라 짧은 기간을 고를수록 전년비로 보셔야 합니다. <b>계약수량은 계약 1건 = 1대</b>로 셉니다. 프로모션 할인이나 품목 구성 차이의 영향을 받지 않아 판매 물량 자체가 그대로 보입니다.</p>';
}
function viewHr(A){
 const L=A.L;
 const gmed={};['A','B','C'].forEach(g=>{const v=L.filter(d=>d.등급===g&&d.적정코치수>0);
  gmed[g]={f:med(v.map(d=>d.충족률)),t:med(v.map(d=>d['평균근속(월)']))};});
 const risk=L.filter(d=>{let s=0;const b=gmed[d.등급]||{};
  if(d.충족률!=null&&b.f!=null&&d.충족률<b.f)s++;
  if(d.충족률!=null&&d.충족률<75)s++;
  if(d['평균근속(월)']!=null&&d['평균근속(월)']<6)s++;
  if(d.최근6M이탈>=3)s++;
  d._risk=s;return s>=2&&!(d['점장부임(월)']!=null&&d['점장부임(월)']<6);})
  .sort((a,b)=>b._risk-a._risk||(a.인력지수??9e9)-(b.인력지수??9e9));
 const stab=L.filter(d=>d['점장부임(월)']!=null&&d['점장부임(월)']<6);
 const base=['A','B','C'].map(g=>{const v=L.filter(d=>d.등급===g&&d.적정코치수>0);
  return {g,n:v.length,fill:med(v.map(d=>d.충족률)),ten:med(v.map(d=>d['평균근속(월)'])),
   ch:med(v.map(d=>d.최근6M이탈)),need:med(v.map(d=>d.적정코치수)),
   inner:v.reduce((s,d)=>s+d.내부코치,0), sal:med(v.map(d=>d.코치1인매출))};}).filter(r=>r.n);
 const mgrHr=groupRows(L,'지역장').map(g=>({k:g.k,v:g.A.ten==null?0:g.A.ten})).sort((a,b)=>a.v-b.v).slice(0,12);
 const mgrFill=groupRows(L,'지역장').map(g=>({k:g.k,v:g.A.need?Math.round(g.A.inner/g.A.need*1000)/10:0})).sort((a,b)=>a.v-b.v).slice(0,12);
 return '<p class="note" style="margin-top:0;margin-bottom:16px"><b>코치 데이터는 2026-09-03 현재 스냅샷입니다.</b> 충족률·근속·이탈은 시계열이 없어 기간 선택의 영향을 받지 않습니다. 다만 <b>코치 1인당 대수</b>는 선택 기간('+PLAB()+') 계약수량으로 다시 계산됩니다.</p>'
 +kpiRow([
  {l:'내부코치',v:nf(A.inner),u:'명',d:'적정 '+nf(A.need)+'명 · 점장 '+nf(A.mgr)+'명',c:''},
  {l:'전체 충족률',v:A.need?(A.inner/A.need*100).toFixed(0):'—',u:'%',d:A.under+'개 매장이 100% 미만',c:A.under>A.n*0.25?'fl':''},
  {l:'평균근속 중앙값',v:nf(A.ten,1),u:'개월',d:L.filter(d=>d['평균근속(월)']<6).length+'개점이 6개월 미만',c:''},
  {l:'최근 6개월 이탈',v:nf(A.churn),u:'명',d:A.churn2+'개 매장에서 2건 이상',c:'fl'},
  {l:'코치 1인당 월 '+MLAB(),v:A.inner?PV(A.salM/A.inner):'—',u:PU(),d:PLAB()+' 기준',c:''},
  {l:'점장 부임 6M 미만',v:stab.length,u:'개점',d:'안정화 구간 — 순위 제외',c:''}])
 +'<h2 class="sec">등급별 기준선 (중앙값)</h2>'
 +'<div class="tw"><table><thead><tr><th>등급</th><th>매장</th><th>내부코치</th><th>적정코치수</th><th>충족률</th><th>평균근속</th><th>최근6M이탈</th><th>코치1인 '+MLAB()+'('+PU()+')</th></tr></thead><tbody>'
 +base.map(r=>'<tr><td class="name">'+r.g+'</td><td>'+r.n+'</td><td>'+r.inner+'</td><td>'+nf(r.need,0)+'</td>'
   +'<td>'+nf(r.fill,0)+'%</td><td style="color:'+(r.ten<5?'var(--crit)':'inherit')+'">'+nf(r.ten,1)+'</td>'
   +'<td>'+nf(r.ch,0)+'</td><td>'+PV(r.sal)+'</td></tr>').join('')+'</tbody></table></div>'
 +'<p class="note"><b>충족률로는 등급이 안 갈리고, 근속이 갈립니다.</b> 세 등급 모두 충족률 중앙값이 100% 안팎인데 평균근속은 A 8.7 → B 6.0 → C 3.1개월로 반토막씩 떨어집니다. 등급이 낮은 매장은 사람이 없는 게 아니라 <b>사람이 계속 바뀝니다.</b></p>'
 +'<div class="two"><div class="card tight"><div class="ch"><h3>지역장별 평균근속</h3><span class="hint">개월 · 짧은 순</span></div>'+rank(mgrHr,v=>nf(v,1)+'M')
 +'</div><div class="card tight"><div class="ch"><h3>지역장별 충족률</h3><span class="hint">% · 낮은 순</span></div>'+rank(mgrFill,v=>nf(v,0)+'%')+'</div></div>'
 +'<h2 class="sec">복합 위험 매장 <span style="font-weight:400;color:var(--ink-3);font-size:13px">— '+risk.length+'개 · 안정화 구간 제외</span></h2>'
 +table([{h:'매장',k:'매장명',f:NAME,cls:'name'},
   {h:'지역장',k:'지역장',f:r=>r.지역장||'—',cls:'txt'},
   {h:'위험도',k:'_risk',f:r=>'●'.repeat(r._risk),style:r=>'color:'+(r._risk>=4?'var(--crit)':'var(--warn)')},
   {h:'내부/적정',k:'내부코치',f:r=>r.내부코치+' / '+nf(r.적정코치수)},
   {h:'충족률',k:'충족률',f:r=>nf(r.충족률,0)+'%',style:r=>'color:'+(r.충족률<75?'var(--crit)':'inherit')},
   {h:'평균근속',k:'평균근속(월)',f:r=>nf(r['평균근속(월)'],1)},
   {h:'6M이탈',k:'최근6M이탈',f:r=>nf(r.최근6M이탈),style:r=>'color:'+(r.최근6M이탈>=3?'var(--crit)':'inherit')},
   {h:'점장부임',k:'점장부임(월)',f:r=>r['점장부임(월)']==null?'공석':nf(r['점장부임(월)'],0)+'M'},
   {h:'월'+MLAB()+'('+TU()+')',k:'salM',f:r=>TV(r.salM)},
   {h:'전년비',k:'yoy',f:r=>pct(r.yoy),style:r=>'color:'+pcol(r.yoy)}],risk,'tHr')
 +'<h2 class="sec">인력이 성과에 붙는 방식</h2>'
 +'<div class="tw"><table><thead><tr><th>인력 지표</th><th style="text-align:left">성과 지표</th><th>상관</th><th style="text-align:left">읽는 법</th></tr></thead><tbody>'
 +[['내부코치 수','월 계약수량','+0.76','사람 수가 판매 물량의 최대 설명 변수'],
   ['적정코치수','유료회원 수','+0.74','매장 규모가 곧 회원 규모. 등급보다 나은 규모 지표입니다'],
   ['적정코치수','일평균 방문','+0.66','규모가 큰 매장에 방문도 몰립니다'],
   ['적정코치수','월 계약수량','+0.63','규모가 곧 물량'],
   ['평균근속','일평균 방문','+0.45','오래 남는 코치가 사람을 데려옵니다'],
   ['일평균 방문','월 계약수량','+0.44','방문이 계약으로 이어지는 정도'],
   ['유료회원 수','월 계약수량','+0.42','회원 기반이 판매로 이어집니다'],
   ['평균근속','월 계약수량','+0.32','근속은 물량보다 방문·회원에 먼저 붙습니다'],
   ['충족률','월 계약수량','+0.31','정원을 채우면 총물량은 늘어납니다'],
   ['충족률','코치 1인당 대수','−0.47','다만 1인 생산성은 떨어집니다 — 한계생산 체감'],
   ['내부코치 수','코치 1인당 대수','−0.52','같은 얘기. 인원 대비 물량은 체감합니다'],
   ['최근 6개월 이탈','월 계약수량','+0.05','이탈은 물량과 직접 관계가 거의 없습니다']]
  .map(r=>'<tr><td class="name">'+r[0]+'</td><td class="txt">'+r[1]+'</td>'
   +'<td style="font-weight:600;color:'+(r[2][0]==='+'?'var(--ok)':'var(--crit)')+'">'+r[2]+'</td>'
   +'<td class="txt">'+r[3]+'</td></tr>').join('')+'</tbody></table></div>'
 +'<div class="tw" style="margin-top:16px"><table><thead><tr><th>평균근속 구간</th><th>매장</th><th>코치1인 대수</th><th>월 대수</th><th>회원</th><th>방문/일</th><th>회원 증감</th><th style="text-align:left">해석</th></tr></thead><tbody>'
 +[['0~3개월',19,'5.9','17.0','35','20.5','+16.0','신규·리셋 매장 — 물량은 아직 안 나옵니다'],
   ['3~6개월',17,'5.3','25.8','51','28.2','−30.7','물량은 붙었으나 회원이 가장 빨리 빠지는 구간'],
   ['6~9개월',28,'5.8','28.4','55','27.6','−16.1','물량 최고 · 회복 시작'],
   ['9개월 이상',31,'5.6','26.2','76','32.6','−11.0','회원 규모가 두 배 이상']]
  .map(r=>'<tr><td class="name">'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+r[4]+'</td><td>'+r[5]+'</td>'
   +'<td style="font-weight:600;color:'+(r[6][0]==='+'?'var(--ok)':'var(--crit)')+'">'+r[6]+'%</td>'
   +'<td class="txt">'+r[7]+'</td></tr>').join('')+'</tbody></table></div>'
 +'<p class="note"><b>근속은 물량보다 모객에 먼저 붙습니다.</b> 평균근속과의 상관이 방문 +0.45·회원 +0.40인데 월 계약수량은 +0.32로 더 약합니다. 근속 3~6개월 구간 매장의 회원 증감이 −30.7%로 가장 나쁩니다. 이 골짜기를 넘기는 것이 인력 정책의 목표점입니다. 위 두 표는 전사 102개·모객 완전구간 기준 고정값으로, 필터나 기간을 바꿔도 변하지 않습니다.</p>';
}
function viewVis(A){
 const L=A.L;
 if(!A.hasVis&&!A.hasPay) return noVis(A,'모객·결제');
 const memDrop=L.filter(d=>d.유료회원_증감율!=null&&!(d.dq||[]).includes('유료회원 미입력'))
   .sort((a,b)=>a.유료회원_증감율-b.유료회원_증감율).slice(0,10).map(d=>({k:d.매장명,v:Math.round(d.유료회원_증감율*10)/10}));
 const convLow=L.filter(d=>d.전환율!=null).sort((a,b)=>a.전환율-b.전환율).slice(0,10)
   .map(d=>({k:d.매장명,v:Math.round(d.전환율*100)/100}));
 const clShare=(A.wiLast+A.clLast)?(A.clLast/(A.wiLast+A.clLast)*100):null;
 const payMons=A.ms.filter(m=>A.payB[m]!=null);
 return kpiRow([
  {l:'일평균 방문',v:A.hasVis?nf(A.visLast):'—',u:'건',d:A.hasVis?(A.visMons[A.visMons.length-1]+' · '+A.n+'개 매장'):'기간 내 데이터 없음',c:''},
  {l:'워크인 / 클래스',v:A.hasVis?(nf(A.wiLast)+' / '+nf(A.clLast)):'—',u:'',d:A.hasVis?('클래스 비중 '+nf(clShare,0)+'%'):'',c:''},
  {l:'신규결제 ('+A.payN+'개월)',v:nf(A.pay),u:'건',d:A.payN?('월평균 '+nf(A.pay/A.payN)+'건'):'기간 내 데이터 없음',c:''},
  {l:'전환율',v:A.conv==null?'—':nf(A.conv,2),u:'%',d:'신규결제 ÷ 총방문',c:''},
  {l:'유료회원',v:A.mem==null?'—':nf(A.mem),u:'명',d:A.memD==null?'기간 내 비교 불가':((A.memD<0?'▼ ':'▲ ')+Math.abs(A.memD)+'명'),c:A.memD<0?'dn':'up'},
  {l:'회원 순감 매장',v:A.memDown,u:'개',d:'순증 '+A.memUp+'개',c:A.memDown>A.memUp?'dn':'up'}])
 +'<div class="two"><div class="card"><div class="ch"><h3>워크인 · 클래스 방문</h3>'
 +'<div class="legend"><span><i style="background:var(--g-in)"></i>워크인</span><span><i style="background:var(--accent-2)"></i>클래스</span></div></div>'
 +'<div class="scroller">'+chartStack(A.visMons,A.wiAvg,A.clAvg,css('--g-in'),css('--accent-2'),'워크인','클래스')+'</div></div>'
 +'<div class="card"><div class="ch"><h3>신규결제와 유료회원</h3>'
 +'<div class="legend"><span><i style="background:var(--g-cv)"></i>신규결제(건)</span><span><i style="background:var(--g-rt)"></i>유료회원(명)</span></div></div>'
 +'<div class="scroller">'+chartLines(payMons.length?payMons:A.visMons,[{src:A.payB,c:css('--g-cv'),lab:'신규결제'},{src:A.memB,c:css('--g-rt'),lab:'유료회원'}])+'</div></div></div>'
 +(A.memD!=null?'<p class="note hot"><b>방문은 유지되는데 회원이 빠집니다.</b> 선택 기간에 유료회원이 '+(A.memD<0?Math.abs(A.memD)+'명 순감':Math.abs(A.memD)+'명 순증')+'했고 '+A.memDown+'개 매장이 줄었습니다. 신규가 안 들어오는 게 아니라 <b>기존 회원이 나가는 속도가 더 빠르다</b>는 뜻이라, 유입·전환보다 리텐션이 먼저입니다.</p>':'')
 +'<div class="two"><div class="card tight"><div class="ch"><h3>유료회원 감소 상위</h3><span class="hint">기간 내 증감률</span></div>'+rank(memDrop,v=>pct(v),true)
 +'</div><div class="card tight"><div class="ch"><h3>전환율 하위</h3><span class="hint">신규결제 ÷ 총방문</span></div>'+rank(convLow,v=>nf(v,2)+'%')+'</div></div>'
 +'<h2 class="sec">매장별 모객 <span style="font-weight:400;color:var(--ink-3);font-size:13px">— '+PLAB()+'</span></h2>'
 +table([{h:'매장',k:'매장명',f:NAME,cls:'name'},
   {h:'지역장',k:'지역장',f:r=>r.지역장||'—',cls:'txt'},
   {h:'워크인/일',k:'워크인일평균',f:r=>nf(r.워크인일평균,1)},
   {h:'클래스/일',k:'클래스일평균',f:r=>nf(r.클래스일평균,1)},
   {h:'클래스비중',k:'클래스비중',f:r=>r.클래스비중==null?'—':nf(r.클래스비중,0)+'%'},
   {h:'신규결제',k:'신규결제',f:r=>nf(r.신규결제)},
   {h:'전환율',k:'전환율',f:r=>r.전환율==null?'—':nf(r.전환율,2)+'%'},
   {h:'회원',k:'유료회원_현재',f:r=>nf(r.유료회원_현재)},
   {h:'회원증감',k:'유료회원_증감율',f:r=>pct(r.유료회원_증감율),style:r=>'color:'+pcol(r.유료회원_증감율)},
   {h:'진단',k:'조합',f:TAGS,sort:false}],
  L.slice().sort((a,b)=>(b.총방문일평균||0)-(a.총방문일평균||0)),'tVis')
 +'<p class="note"><b>클래스 비중이 90%를 넘는 대형점 10곳</b>(서울은평뉴타운·의정부금오·화성동탄호수공원 등)은 워크인이 일 2~7건뿐입니다. 과소입력이 아니라 클래스 중심 운영이라, 워크인만으로 전환율을 내면 40~79%로 튀어 비교가 불가능해집니다. 그래서 전환율 분모를 총방문으로 잡았습니다.</p>';
}


/* ===== 당일 실적 현황 (당월 목표 대비) ===== */
const TDY=(function(){const el=document.getElementById('TODAY');
  if(!el)return null; try{return JSON.parse(el.textContent);}catch(e){return null;}})();
function todayBlock(L){
 if(!TDY||!TDY.rows||!TDY.rows.length) return '';
 const codes=new Set(L.map(d=>d.매장코드));
 const teams=new Set(L.map(d=>d.팀)), mgrs=new Set(L.map(d=>d.지역장));
 // 필터: 등록 매장은 매장코드로, 미등록 매장은 팀·지역장으로 맞춘다
 const rows=TDY.rows.filter(r=> r.등록 ? codes.has(r.매장코드)
    : ((F.team==='전체'||r.팀===F.team) && (F.mgr==='전체'||r.지역장===F.mgr) && F.grade==='전체'));
 if(!rows.length) return '';
 const act=rows.reduce((s,r)=>s+(r.실적||0),0);
 const goal=rows.reduce((s,r)=>s+(r.목표||0),0);
 const rate=goal?act/goal*100:null;
 const zero=rows.filter(r=>!r.실적).length;
 const unreg=rows.filter(r=>!r.등록).length;
 const g=[0,1,2].map(i=>rows.reduce((s,r)=>s+((r.grp&&r.grp[i])||0),0));
 const gl=TDY.groups.map(x=>x.k);
 const top=rows.filter(r=>r.실적).sort((a,b)=>b.실적-a.실적).slice(0,5);
 const cls=rate==null?'':(rate<8?'low':rate<15?'mid':'');
 const w=Math.min(100,rate||0);
 return '<div class="today">'
  +'<div class="t-head"><h3>당일 실적 현황 <span style="font-weight:400;color:var(--ink-3)">— '+TDY.month+' 목표 대비</span></h3>'
  +'<span class="t-when">「당일실적(당월)」 탭 · '+rows.length+'개 매장</span></div>'
  +'<div class="t-grid">'
  +'<div class="t-cell"><div class="tl">누계 실적</div><div class="tv">'+nf(act)+'<small style="font-size:13px;color:var(--ink-3)">대</small></div>'
  +'<div class="td2">실적 없는 매장 '+zero+'개</div></div>'
  +'<div class="t-cell"><div class="tl">월 목표</div><div class="tv">'+nf(goal)+'<small style="font-size:13px;color:var(--ink-3)">대</small></div>'
  +'<div class="td2">매장당 평균 '+(rows.length?nf(goal/rows.length,1):'—')+'대</div></div>'
  +'<div class="t-cell"><div class="tl">달성률</div><div class="tv" style="color:'+(rate<8?'var(--crit)':rate<15?'var(--warn)':'var(--ok)')+'">'+nf(rate,1)+'<small style="font-size:13px;color:var(--ink-3)">%</small></div>'
  +'<div class="td2">남은 물량 '+nf(Math.max(0,goal-act))+'대</div></div>'
  +'<div class="t-cell"><div class="tl">선두</div><div class="tv" style="font-size:17px;font-family:inherit">'+(top[0]?top[0].매장명:'—')+'</div>'
  +'<div class="td2">'+(top[0]?top[0].실적+'대 · 달성률 '+nf(top[0].목표?top[0].실적/top[0].목표*100:null,0)+'%':'')+'</div></div>'
  +'</div>'
  +'<div class="pbar"><i class="'+cls+'" style="width:'+w+'%"></i></div>'
  +'<div class="t-split">'
  + g.map((v,i)=>'<div class="t-seg"><div class="sl">'+gl[i]+'</div><div class="sv">'+nf(v)+'대</div>'
      +'<div class="sp">'+(act?nf(v/act*100,0):'0')+'%</div></div>').join('')
  +'<div class="t-seg"><div class="sl">실적 상위</div><div class="sv" style="font-size:12.5px;font-family:inherit;font-weight:500;line-height:1.5">'
  + (top.map(r=>r.매장명+' '+r.실적).join('<br>')||'—')+'</div></div>'
  +'</div>'
  +'<div class="t-warn">이 블록만 「당일실적(당월)」 탭에서 옵니다. 아래 모든 지표의 출처인 일별매출 탭과 <b>집계 시점이 달라</b> 숫자가 어긋납니다 — 9월 누계가 여기서는 '+nf(act)+'대, 일별매출 기준으로는 '+nf(DLY?Object.values(DLY.storeDaily||{}).reduce((s,o)=>s+Object.keys(o).filter(k=>k.slice(0,7)===TDY.month).reduce((a,k)=>a+o[k],0),0):0)+'대입니다.'
  + (unreg?' 또 <b>'+unreg+'개 매장</b>이 매장마스터에 없어 다른 탭에는 나오지 않습니다.':'')
  +'</div></div>';
}

/* ===== 데일리 탭 ===== */
const DLY=JSON.parse(document.getElementById('DAILY').textContent);
const DOWK=['월','화','수','목','금','토','일'];
function dowOf(ds){const w=new Date(ds+'T00:00:00').getDay();return (w+6)%7;}
function daysIn(ym){const [y,m]=ym.split('-').map(Number);return new Date(y,m,0).getDate();}
function viewDay(L){
 const cur=DLY.cur, prev=DLY.prev, ly=DLY.ly, maxD=DLY.maxDay;
 const upto=+maxD.slice(8);
 const codes=new Set(L.map(d=>d.매장코드));
 const pick=(ym,limit)=>{const o={};
  codes.forEach(c=>{const s=DLY.storeDaily[c]; if(!s)return;
   for(const d in s){ if(d.slice(0,7)!==ym) continue;
     const day=+d.slice(8); if(limit&&day>limit) continue;
     o[d]=(o[d]||0)+s[d];}});
  return o;};
 const cd=pick(cur), pd=pick(prev,upto), ld=pick(ly,upto);
 const pdFull=pick(prev);
 const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
 const mtd=sum(cd), pmtd=sum(pd), lmtd=sum(ld), pfull=sum(pdFull);
 const vsP=pmtd?((mtd/pmtd-1)*100):null, vsL=lmtd?((mtd/lmtd-1)*100):null;
 const days=Object.keys(cd).sort();
 const active=days.length;
 const perDay=active?mtd/active:0;
 const total=daysIn(cur);
 // 월말 예상: 전월 같은 날짜까지의 진행률을 그대로 적용(월 후반 집중 패턴 반영)
 const pfullTmp=sum(pick(prev));
 const proj=(pmtd>0&&pfullTmp>0)?Math.round(pfullTmp*(mtd/pmtd)):Math.round(perDay*total);
 const projBasis=(pmtd>0&&pfullTmp>0)?'전월 진행률 적용':'일평균 × '+total+'일';
 // 매장별 누계
 const byStore=L.map(d=>{const s=DLY.storeDaily[d.매장코드]||{};
   let m=0,p=0;
   for(const k in s){ if(k.slice(0,7)===cur) m+=s[k];
     else if(k.slice(0,7)===prev && +k.slice(8)<=upto) p+=s[k];}
   return {...d,mtd:m,pmtd:p,diff:p?((m/p-1)*100):null};})
   .sort((a,b)=>b.mtd-a.mtd);
 const zero=byStore.filter(d=>d.mtd===0).length;
 // 일자 셀
 const cells=days.map((d,i)=>{const w=dowOf(d), last=(d===maxD);
   return '<div class="dcell'+(w>=5?' wk':'')+(last?' part':'')+'">'
    +'<div class="dd">'+d.slice(5)+' ('+DOWK[w]+')</div>'
    +'<div class="dv">'+nf(cd[d])+'</div></div>';}).join('');
 // 누적 비교 차트
 const cum=(o,n)=>{let s=0;const a=[];for(let i=1;i<=n;i++){const k=(i<10?'0':'')+i;s+=o[cur.slice(0,8)]?0:0;a.push(s);}return a;};
 function cumSeries(o,ym,n){let s=0;const a=[];
  for(let i=1;i<=n;i++){const key=ym+'-'+String(i).padStart(2,'0'); s+=(o[key]||0); a.push(s);}return a;}
 const N=total;
 const sc=cumSeries(cd,cur,N), sp=cumSeries(pdFull,prev,daysIn(prev)), sl=cumSeries(ld,ly,N);
 const chart=cumChart(N,upto,[
   {v:sc.slice(0,upto),c:css('--accent'),lab:cur,w:2.4},
   {v:sp,c:css('--ink-3'),lab:prev+' (전월)',w:1.6,dash:'4 3'},
   {v:sl.slice(0,upto),c:css('--warn'),lab:ly+' (전년)',w:1.6,dash:'2 3'}]);
 return '<p class="note" style="margin-top:0;margin-bottom:16px"><b>데일리 탭은 진행월('+cur+') 고정입니다</b> — 위의 기간 선택은 적용되지 않고, 팀·지역장·등급 필터만 반영됩니다. 데이터는 '+maxD+'까지이며 <b>마지막 날은 집계 중일 수 있습니다.</b></p>'
 +kpiRow([
  {l:cur+' 누계',v:nf(mtd),u:'대',d:maxD+'까지 '+active+'일',c:''},
  {l:'전월 동기 대비',v:vsP==null?'—':pct(vsP).replace('%',''),u:'%',d:prev+' 1~'+upto+'일 '+nf(pmtd)+'대',c:vsP==null?'':vsP<0?'dn':'up'},
  {l:'전년 동월 동기 대비',v:vsL==null?'—':pct(vsL).replace('%',''),u:'%',d:ly+' 1~'+upto+'일 '+nf(lmtd)+'대',c:vsL==null?'':vsL<0?'dn':'up'},
  {l:'일평균',v:nf(perDay,1),u:'대',d:'실적 있는 '+active+'일 기준',c:''},
  {l:'월말 예상',v:nf(proj),u:'대',d:projBasis+' · 전월 실적 '+nf(pfull)+'대',c:proj<pfull?'dn':'up'},
  {l:'실적 없는 매장',v:zero,u:'개',d:'전체 '+L.length+'개 중',c:zero>L.length*0.3?'fl':''}])
 +'<div class="card"><div class="ch"><h3>월 누계 추이 — 전월·전년 동월과 같은 날짜끼리</h3>'
 +'<div class="legend"><span><i style="background:var(--accent)"></i>'+cur+'</span><span><i style="background:var(--ink-3)"></i>'+prev+'</span><span><i style="background:var(--warn)"></i>'+ly+'</span></div></div>'
 +'<div class="scroller">'+chart+'</div>'
 +'<p class="cap">같은 날짜까지의 누계를 겹쳐 그렸습니다. 월말에 계약이 몰리는 패턴이 있어 <b>월중 시점의 절대 누계보다 같은 날짜 대비 위치</b>가 의미 있습니다.</p></div>'
 +'<h2 class="sec">일자별 계약수량</h2><div class="dayrow">'+(cells||'<div class="dcell"><div class="dd">—</div><div class="dv">0</div></div>')+'</div>'
 +'<div class="card tight"><div class="ch"><h3>요일별 평균</h3><span class="hint">최근 90일 · 전사 기준(필터 미적용)</span></div>'
 +rank(DLY.dow.map((v,i)=>({k:DOWK[i]+'요일',v})),v=>nf(v,1)+'대')+'</div>'
 +'<h2 class="sec">매장별 '+cur+' 누계</h2>'
 +table([{h:'매장',k:'매장명',f:NAME,cls:'name'},
   {h:'지역장',k:'지역장',f:r=>r.지역장||'—',cls:'txt'},
   {h:'이번달(대)',k:'mtd',f:r=>nf(r.mtd),style:r=>r.mtd===0?'color:var(--crit)':''},
   {h:'전월 동기',k:'pmtd',f:r=>nf(r.pmtd)},
   {h:'증감',k:'diff',f:r=>pct(r.diff),style:r=>'color:'+pcol(r.diff)},
   {h:'내부코치',k:'내부코치',f:r=>nf(r.내부코치)},
   {h:'코치1인',k:'mtdPer',f:r=>r.내부코치?nf(r.mtd/r.내부코치,1):'—'},
   {h:'충족률',k:'충족률',f:r=>nf(r.충족률,0)+'%'},
   {h:'진단',k:'조합',f:TAGS,sort:false}], byStore,'tDay')
 +'<p class="note">전월 동기는 '+prev+' 1~'+upto+'일 누계입니다. 월초에는 표본이 작아 증감률이 크게 흔들리니 며칠 지난 뒤에 보시는 편이 정확합니다.</p>';
}
function cumChart(N,upto,series){
 const W2=Math.max(620,N*22),H=230,P={t:16,r:54,b:32,l:48},iw=W2-P.l-P.r,ih=H-P.t-P.b;
 const mx=Math.max(1,...series.flatMap(s=>s.v))*1.12;
 const ys=v=>P.t+ih-(v/mx)*ih, xs=i=>P.l+(N<2?iw/2:i*(iw/(N-1)));
 let g='';[0,.25,.5,.75,1].forEach(f=>{const v=mx*f;
  g+='<line x1="'+P.l+'" x2="'+(W2-P.r)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="'+css('--line-soft')+'"/>'
   +'<text x="'+(P.l-7)+'" y="'+(ys(v)+4)+'" text-anchor="end" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">'+nf(v)+'</text>';});
 let b='';
 series.forEach(s=>{
  const pts=s.v.map((v,i)=>xs(i)+','+ys(v));
  if(pts.length>1) b+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+s.c+'" stroke-width="'+s.w+'"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+' stroke-linejoin="round"/>';
  if(s.v.length){const li=s.v.length-1;
   b+='<circle cx="'+xs(li)+'" cy="'+ys(s.v[li])+'" r="3.2" fill="'+s.c+'"/>'
    +'<text x="'+(xs(li)+6)+'" y="'+(ys(s.v[li])+4)+'" font-size="10.5" fill="'+s.c+'" font-family="IBM Plex Mono" font-weight="600">'+nf(s.v[li])+'</text>';}});
 let l='';
 for(let i=0;i<N;i++){ if((i+1)%5===0||i===0)
   l+='<text x="'+xs(i)+'" y="'+(H-P.b+15)+'" text-anchor="middle" font-size="10" fill="'+css('--ink-3')+'" font-family="IBM Plex Mono">'+(i+1)+'</text>';}
 const mark='<line x1="'+xs(upto-1)+'" x2="'+xs(upto-1)+'" y1="'+P.t+'" y2="'+(P.t+ih)+'" stroke="'+css('--accent')+'" stroke-dasharray="3 3" opacity=".5"/>';
 return '<svg viewBox="0 0 '+W2+' '+H+'" width="'+W2+'" height="'+H+'" role="img" aria-label="월 누계 비교">'+g+mark+b+l+'</svg>';
}

/* ===== 렌더 ===== */
function render(){
 const L=build(), A=agg(L);
 document.getElementById('scope').innerHTML='<b>'+L.length+'</b>개 매장'
  +((F.team!=='전체'||F.mgr!=='전체'||F.grade!=='전체')
    ? ' · '+[F.team,F.mgr,F.grade].filter(v=>v!=='전체').join(' / ') : ' · 전체');
 const cv=[];
 cv.push('계약 <b>'+A.ms.filter(m=>A.salBy[m]!=null).length+'</b>개월');
 cv.push(A.visN?('모객 <b>'+A.visN+'</b>개월'):'<span class="miss">모객 없음</span>');
 cv.push(A.payN?('결제 <b>'+A.payN+'</b>개월'):'<span class="miss">결제 없음</span>');
 cv.push(A.memN>1?('회원 <b>'+A.memN+'</b>개월'):'<span class="miss">회원 비교 불가</span>');
 document.getElementById('cover').innerHTML='선택 '+A.ms.length+'개월 — '+cv.join(' · ');
 const v=document.getElementById('view');
 if(!L.length){v.innerHTML='<div class="card"><div class="empty">해당 조건에 맞는 매장이 없습니다. 필터를 초기화해 보세요.</div></div>';return;}
 v.innerHTML = TAB==='sal'?viewSal(A) : TAB==='hr'?viewHr(A) : TAB==='vis'?viewVis(A) : TAB==='day'?viewDay(L) : viewAll(A);
}
fillMgr(); syncPeriodUI(); render();
})();
