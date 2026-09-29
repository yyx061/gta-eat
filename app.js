(function(){
const DATA=window.FOOD_DATA;
const CUI=DATA.cuisines;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k,d){try{const v=localStorage.getItem('eat:'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('eat:'+k,JSON.stringify(v))}catch(e){}}};

/* ---------- cuisine names ---------- */
const ZH={chinese:'中餐',cantonese:'粤菜',hakka:'客家菜',taiwanese:'台湾菜',sichuan:'川菜',szechuan:'川菜',shanghainese:'上海菜',dim_sum:'点心',dumpling:'饺子',dumplings:'饺子',hunan:'湘菜',hotpot:'火锅',hot_pot:'火锅',noodle:'面馆',noodles:'面馆',congee:'粥',hong_kong:'港式',uyghur:'新疆菜',xinjiang:'新疆菜',
japanese:'日料',sushi:'寿司',ramen:'拉面',izakaya:'居酒屋',udon:'乌冬',donburi:'丼饭',korean:'韩餐',korean_bbq:'韩式烤肉',vietnamese:'越南菜',pho:'越南粉',banh_mi:'越南法包',thai:'泰国菜',malaysian:'马来西亚菜',filipino:'菲律宾菜',indonesian:'印尼菜',singaporean:'新加坡菜',burmese:'缅甸菜',asian:'亚洲菜',
indian:'印度菜',pakistani:'巴基斯坦菜',bangladeshi:'孟加拉菜',nepalese:'尼泊尔菜',sri_lankan:'斯里兰卡菜',tibetan:'藏餐',middle_eastern:'中东菜',lebanese:'黎巴嫩菜',persian:'波斯菜',iranian:'伊朗菜',afghan:'阿富汗菜',turkish:'土耳其菜',arab:'阿拉伯菜',shawarma:'沙威玛',kebab:'烤肉串',falafel:'炸豆丸',pita:'皮塔饼',syrian:'叙利亚菜',
mediterranean:'地中海菜',greek:'希腊菜',italian:'意大利菜',pasta:'意面',pizza:'披萨',french:'法餐',portuguese:'葡萄牙菜',spanish:'西班牙菜',polish:'波兰菜',german:'德国菜',ukrainian:'乌克兰菜',european:'欧洲菜',irish:'爱尔兰菜',british:'英式',
mexican:'墨西哥菜','tex-mex':'德州墨西哥菜',tacos:'塔可',latin_american:'拉美菜',peruvian:'秘鲁菜',brazilian:'巴西菜',salvadoran:'萨尔瓦多菜',colombian:'哥伦比亚菜',caribbean:'加勒比菜',jamaican:'牙买加菜',trinidadian:'特立尼达菜',guyanese:'圭亚那菜',roti:'罗蒂饼',
ethiopian:'埃塞俄比亚菜',african:'非洲菜',eritrean:'厄立特里亚菜',somali:'索马里菜',nigerian:'尼日利亚菜',
american:'美式',burger:'汉堡',diner:'美式餐馆',barbecue:'烧烤',bbq:'烧烤',steak_house:'牛排馆',steak:'牛排',grill:'烤肉',bar_and_grill:'酒吧烧烤',wings:'鸡翅',hot_dog:'热狗',chicken:'炸鸡',fried_chicken:'炸鸡',cajun:'卡津菜',canadian:'加拿大菜',poutine:'肉汁薯条',regional:'地方菜',international:'各国菜',fries:'薯条',
seafood:'海鲜',fish:'鱼',fish_and_chips:'炸鱼薯条',
coffee_shop:'咖啡',coffee:'咖啡',cafe:'咖啡馆',bubble_tea:'奶茶',tea:'茶饮',juice:'果汁',smoothie:'奶昔',dessert:'甜品',ice_cream:'冰淇淋',frozen_yogurt:'冻酸奶',gelato:'意式冰淇淋',donut:'甜甜圈',cake:'蛋糕',bakery:'面包',pastry:'糕点',crepe:'可丽饼',waffle:'华夫饼',
sandwich:'三明治',salad:'沙拉',bagel:'贝果',breakfast:'早餐',brunch:'早午餐',pancake:'松饼',poke:'波奇饭',bowl:'碗饭',vegetarian:'素食',vegan:'纯素',healthy:'健康餐',soup:'汤',popcorn:'爆米花',pretzel:'椒盐卷饼',sub:'潜艇堡'};
/* ---------- 语言（文字表在 i18n.js）---------- */
const I18N=window.I18N;
let LANG=LS.get('lang',null)||((navigator.language||'').toLowerCase().startsWith('zh')?'zh':'en');
function t(k,v){
  let s=I18N[LANG]&&I18N[LANG][k]; if(s==null) s=I18N.zh[k]; if(s==null) return k;
  return typeof s==='string'&&v?s.replace(/\{(\w+)\}/g,(m,x)=>v[x]!=null?v[x]:m):s;
}
const cap=x=>x.charAt(0).toUpperCase()+x.slice(1);
const cz=c=>LANG==='zh'?(ZH[c]||c.replace(/_/g,' ')):(I18N.en.cuisine[c]||cap(c.replace(/_/g,' ')));
const typeName=i=>t('types')[i];

/* ---------- places ---------- */
const DISH=window.DISH_DATA||{};
const P=DATA.rows.map((r,i)=>({i,name:r[0],zh:r[1],lat:r[2],lng:r[3],type:r[4],cu:r[5].map(k=>CUI[k]),oh:r[6],addr:r[7],city:r[8],veg:r[9],take:r[10],web:r[11],oid:r[12],phone:r[13]||'',src:r[14]||'o',ds:r[15]||'',dish:DISH[r[12]]}));
let overrides=LS.get('oh',{});
let favs=new Set(LS.get('favs',[]));

/* ---------- opening_hours parser (common OSM syntax) ---------- */
const DAYS={Mo:0,Tu:1,We:2,Th:3,Fr:4,Sa:5,Su:6};
const DN=new Proxy([],{get:(o,k)=>t('days')[k]});  // DN[i]：当前语言的星期几
function parseDays(s){
  const out=new Set();
  for(let tok of s.split(',')){
    tok=tok.trim(); if(!tok||tok==='PH') continue;
    const m=tok.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(Mo|Tu|We|Th|Fr|Sa|Su))?$/);
    if(!m) return null;
    const a=DAYS[m[1]], b=m[2]?DAYS[m[2]]:a;
    for(let d=a;;d=(d+1)%7){out.add(d);if(d===b)break}
  }
  return out.size?[...out]:[];
}
function parseOH(str){
  if(!str) return null;
  let s=str.trim().split('||')[0].trim();
  if(/^24\/7$/.test(s)) return [[0,10080]];
  const week=[null,null,null,null,null,null,null];
  const rules=s.split(';').flatMap(r=>r.split(/(?<=\d)\s*,\s*(?=(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)\b)/)).map(r=>r.trim()).filter(Boolean);
  let any=false;
  for(const r0 of rules){
    let r=r0.replace(/"[^"]*"/g,'').trim();
    if(/^(PH|SH)\b/.test(r)) continue;
    if(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|easter)\b/i.test(r)) continue;
    const m=r.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?\s*,?\s*)+)(.*)$/);
    let days,rest;
    if(m){days=parseDays(m[1].replace(/,\s*$/,''));rest=m[2].trim()}else{days=[0,1,2,3,4,5,6];rest=r}
    if(days===null) return null;
    if(!days.length) continue;
    rest=rest.replace(/\s+open$/i,'').trim();
    if(/^(off|closed)$/i.test(rest)){days.forEach(d=>week[d]=[]);any=true;continue}
    if(rest==='24/7'){days.forEach(d=>week[d]=[[0,1440]]);any=true;continue}
    const ivs=[];
    for(const part of rest.split(',')){
      const t=part.replace(/\s+/g,'');
      const a=t.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\+?$/), o=t.match(/^(\d{1,2}):(\d{2})\+$/);
      if(a){let x=+a[1]*60+ +a[2], y=+a[3]*60+ +a[4]; if(y<=x) y+=1440; ivs.push([x,y])}
      else if(o){const x=+o[1]*60+ +o[2]; ivs.push([x,Math.max(x+240,1440)])}
      else return null;
    }
    if(!ivs.length) return null;
    days.forEach(d=>week[d]=ivs); any=true;
  }
  if(!any) return null;
  const out=[]; week.forEach((ivs,d)=>(ivs||[]).forEach(([a,b])=>out.push([d*1440+a,d*1440+b])));
  return out;
}
const schedCache=new Map();
function sched(p){
  const src=overrides[p.oid]||p.oh||p.ohChain;
  const key=p.i+'|'+src;
  if(!schedCache.has(key)) schedCache.set(key,parseOH(src));
  return schedCache.get(key);
}
/* 连锁店推测：同名店 ≥3 家、其中 ≥2 家有营业时间时，给没登记的分店套用最常见的那份 */
const normName=s=>s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,'');
(function(){
  const g={}; for(const p of P){const k=normName(p.name);if(k)(g[k]=g[k]||[]).push(p)}
  for(const list of Object.values(g)){
    if(list.length<3) continue;
    const c={}; let n=0;
    for(const p of list) if(p.oh&&parseOH(p.oh)){c[p.oh]=(c[p.oh]||0)+1;n++}
    if(n<2) continue;
    const best=Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];
    for(const p of list) if(!p.oh) p.ohChain=best;
  }
})();
const isGuess=p=>!overrides[p.oid]&&!p.oh&&!!p.ohChain;
function openAt(iv,w){for(const [a,b] of iv){if(a<=w&&w<b)return b-w;if(a<=w+10080&&w+10080<b)return b-w-10080}return -1}
function nextOpen(iv,w){let best=null;for(const [a] of iv){const d=((a-w)%10080+10080)%10080;if(d>0&&(best===null||d<best))best=d}return best}
const hhmm=m=>{m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
function lateNight(p){const s=sched(p);return !!s&&s.some(([a,b])=>b%1440>=1380||b-Math.floor(a/1440)*1440>1440)}

/* ---------- time ---------- */
function torontoNow(){
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
  return {dow:{Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6}[p.weekday],min:(+p.hour%24)*60+ +p.minute};
}
function startW(){
  const n=torontoNow();
  if(S.when==='now') return n.dow*1440+n.min;
  const [h,m]=(S.whenTime||'18:30').split(':').map(Number);
  const d=(n.dow+(+S.whenDay||0))%7;
  return d*1440+h*60+m;
}

/* ---------- places & neighbourhoods ---------- */
const HOODS=[
  ['Union 站 / 金融区','Union Station / Financial District',43.6453,-79.3806],['唐人街 Spadina','Chinatown (Spadina)',43.6529,-79.3980],['多伦多大学','University of Toronto',43.6629,-79.3957],['Yonge & Bloor','Yonge & Bloor',43.6709,-79.3857],['约克维尔','Yorkville',43.6708,-79.3915],
  ['King West','King West',43.6440,-79.4000],['Liberty Village','Liberty Village',43.6386,-79.4200],['Ossington / 三一贝尔伍兹','Ossington / Trinity Bellwoods',43.6470,-79.4200],['肯辛顿市场','Kensington Market',43.6547,-79.4005],['韩国城 Bloor & Christie','Koreatown (Bloor & Christie)',43.6645,-79.4185],
  ['圣劳伦斯市场','St. Lawrence Market',43.6487,-79.3716],['Leslieville','Leslieville',43.6620,-79.3340],['希腊城 Danforth','Greektown (Danforth)',43.6780,-79.3500],['Yonge & Eglinton','Yonge & Eglinton',43.7067,-79.3985],['Don Mills','Don Mills',43.7350,-79.3440],
  ['北约克中心','North York Centre',43.7680,-79.4128],['Yonge & Finch','Yonge & Finch',43.7806,-79.4155],['Fairview Mall','Fairview Mall',43.7780,-79.3440],['士嘉堡市中心','Scarborough Town Centre',43.7757,-79.2578],['Agincourt','Agincourt',43.7854,-79.2785],
  ['太古广场 Kennedy & Steeles','Pacific Mall (Kennedy & Steeles)',43.8253,-79.3063],['万锦 Unionville','Markham (Unionville)',43.8680,-79.3120],['列治文山 Hwy 7 & Leslie','Richmond Hill (Hwy 7 & Leslie)',43.8465,-79.3780],['列治文山 Yonge & Major Mac','Richmond Hill (Yonge & Major Mac)',43.8765,-79.4390],['旺市都会中心 VMC','Vaughan Metropolitan Centre',43.7942,-79.5273],
  ['密西沙加 Square One','Mississauga (Square One)',43.5933,-79.6425],['Port Credit','Port Credit',43.5510,-79.5850],['怡陶碧谷 Kipling','Etobicoke (Kipling)',43.6375,-79.5360],['宾顿市中心','Downtown Brampton',43.6850,-79.7597],['奥克维尔市中心','Downtown Oakville',43.4470,-79.6660],['皮克林','Pickering',43.8359,-79.0860]
];
const hoodName=h=>LANG==='zh'?h[0]:h[1];
const S=Object.assign({lat:43.6532,lng:-79.3832,locName:'',when:'now',whenDay:0,whenTime:'18:30',mode:'walk',mins:15,view:'rand',show:'eat+unk',sort:'open',kw:[],mood:[],q:''},LS.get('state',{}));
S.kw=S.kw||[]; S.mood=S.mood||[];
if(S.walk&&!LS.get('state',{}).mins) S.mins=S.walk; // 旧版只有步行分钟数
if(!['rand','find','fav','me'].includes(S.view)) S.view='rand';
if(S.locKey===undefined){  // 旧版只存了中文名字：换成可翻译的 key
  const old={'市政厅附近':'cityhall','我现在的位置':'here','粘贴的坐标':'pasted','地图上选的位置':'mappick'}[S.locName];
  const hi=HOODS.findIndex(h=>h[0]===S.locName);
  S.locKey=old||(hi>=0?'hood:'+hi:(S.locName?null:'cityhall'));
}
const LOCKEY={cityhall:'locCityhall',here:'locHere',pasted:'locPasted',mappick:'locMap'};
const locLabel=()=>S.locKey?(S.locKey.startsWith('hood:')?hoodName(HOODS[+S.locKey.slice(5)]):t(LOCKEY[S.locKey])):S.locName;
const save=()=>LS.set('state',{lat:S.lat,lng:S.lng,locName:S.locName,locKey:S.locKey,mode:S.mode,mins:S.mins,view:S.view,show:S.show,sort:S.sort,kw:S.kw,mood:S.mood,acc:S.acc,when:S.when,whenDay:S.whenDay,whenTime:S.whenTime});

/* ---------- keyword library ---------- */
const has=(p,list)=>p.cu.some(c=>list.includes(c));
const KW=[
  {g:'菜系',mode:'or',items:[
    ['中餐',['chinese','cantonese','hakka','taiwanese','sichuan','szechuan','shanghainese','dim_sum','dumpling','dumplings','hunan','hong_kong','hotpot','hot_pot','congee','uyghur','xinjiang']],
    ['日料',['japanese','sushi','ramen','izakaya','udon','donburi']],['韩餐',['korean','korean_bbq']],['越南',['vietnamese','pho','banh_mi']],['泰国',['thai']],
    ['东南亚',['malaysian','filipino','indonesian','singaporean','burmese']],['印度/南亚',['indian','pakistani','bangladeshi','nepalese','sri_lankan','tibetan']],
    ['中东',['middle_eastern','lebanese','persian','iranian','afghan','turkish','arab','shawarma','kebab','falafel','pita','syrian']],['希腊/地中海',['greek','mediterranean']],
    ['意大利',['italian','pasta']],['欧洲',['french','portuguese','spanish','polish','german','ukrainian','european','irish','british']],
    ['墨西哥/拉美',['mexican','tex-mex','tacos','latin_american','peruvian','brazilian','salvadoran','colombian']],['加勒比',['caribbean','jamaican','trinidadian','guyanese','roti']],
    ['非洲',['ethiopian','african','eritrean','somali','nigerian']],['美式',['american','burger','diner','barbecue','bbq','steak_house','steak','grill','bar_and_grill','wings','hot_dog','cajun']],
    ['海鲜',['seafood','fish','fish_and_chips']]
  ]},
  {g:'想吃点',mode:'or',items:[
    ['热汤面',['ramen','noodle','noodles','pho','vietnamese','hotpot','hot_pot','udon','soup','congee']],['辣的',['sichuan','szechuan','hunan','thai','indian','korean','jamaican','caribbean','mexican','hotpot','hot_pot','malaysian','pakistani']],
    ['米饭',['chinese','japanese','donburi','korean','indian','filipino','poke','bowl','hakka','cantonese','thai']],['烤肉',['barbecue','bbq','korean_bbq','kebab','shawarma','grill','steak_house','steak','brazilian']],
    ['寿司',['sushi']],['披萨',['pizza']],['汉堡炸鸡',['burger','chicken','fried_chicken','wings']],['三明治/轻食',['sandwich','salad','juice','poke','healthy','bowl','bagel','sub']],
    ['早餐',['breakfast','brunch','bagel','diner','pancake']],['甜品',['dessert','ice_cream','cake','donut','pastry','bakery','crepe','frozen_yogurt','gelato','waffle']],
    ['奶茶',['bubble_tea','tea']],['咖啡',p=>p.type===2||has(p,['coffee_shop','coffee'])]
  ]},
  {g:'场景',mode:'and',items:[
    ['坐下慢慢吃',p=>p.type===0],['快速解决',p=>p.type===1||p.type===3],['素食友好',p=>p.veg>0||has(p,['vegetarian','vegan'])],['可外带',p=>!!p.take],
    ['深夜还开',p=>lateNight(p)],['有营业时间',p=>!!sched(p)],['我收藏的',p=>favs.has(p.oid)]
  ]}
];
const KWI={}; KW.forEach(g=>g.items.forEach(([n,t])=>{KWI[g.g+':'+n]={g:g.g,mode:g.mode,test:typeof t==='function'?t:(p=>has(p,t))}}));
const kwText=n=>LANG==='zh'?n:(I18N.en.kw[n]||n);
const gText=g=>t('kwGroups')[g]||g;
function kwTest(id){if(KWI[id])return KWI[id];if(id.startsWith('c:')){const c=id.slice(2);return {g:'菜系',mode:'or',test:p=>p.cu.includes(c)}}return null}

/* ---------- travel modes ---------- */
// 直线距离 × 绕路系数 ÷ 速度 + 等车/取车时间。都是粗估；以后可换成地图服务的等时圈。
const MODES={
  walk:{k:'modeWalk',ico:'🚶',spd:80,det:1.25,wait:0,g:'walking'},
  bike:{k:'modeBike',ico:'🚲',spd:250,det:1.25,wait:1,g:'bicycling'},
  taxi:{k:'modeTaxi',ico:'🚕',spd:417,det:1.35,wait:4,g:'driving'}
};
const MINS=[5,10,15,20,30,45];
const M=()=>MODES[S.mode]||MODES.walk;
const modeL=()=>t(M().k);
const tripMin=d=>{const m=M();return Math.max(1,Math.round(m.wait+d*m.det/m.spd))};
const maxDist=()=>{const m=M();return Math.max(0,S.mins-m.wait)*m.spd/m.det};

/* ---------- compute ---------- */
const R=6371000, rad=Math.PI/180;
function dist(a,b,c,d){const x=(d-b)*rad*Math.cos((a+c)/2*rad), y=(c-a)*rad;return Math.sqrt(x*x+y*y)*R}
function status(p,w0,tm){
  const iv=sched(p); if(!iv) return {k:'unk',t:t('stUnk')};
  const w=(w0+tm)%10080, left=openAt(iv,w), need=p.type===0?45:20;
  if(left>=0){
    const close=hhmm(w+left);
    if(left>=need) return {k:'ok',t:t('stOk',{close}),left};
    return {k:'tight',t:t('stTight',{left,close}),left};
  }
  const nx=nextOpen(iv,w);
  if(nx!==null&&nx<=60) return {k:'soon',t:t('stSoon',{n:nx}),wait:nx};
  if(nx===null) return {k:'closed',t:t('stNone')};
  const at=w+nx, day=Math.floor((at%10080)/1440), sameDay=Math.floor(w/1440)===Math.floor(at/1440)&&nx<1440;
  return {k:'closed',t:t('stClosed',{day:sameDay?t('today'):DN[day],time:hhmm(at)})};
}
const statusOf=(p,w0,tm)=>{const st=status(p,w0,tm);if(st.k!=='unk'&&isGuess(p))st.t+=t('stChain');return st};
const RANK={ok:0,tight:1,soon:2,unk:3,closed:4};
const visible=st=>S.show==='all'||['ok','tight','soon'].includes(st.k)||(S.show==='eat+unk'&&st.k==='unk');
const row=(p,w0)=>{const d=dist(S.lat,S.lng,p.lat,p.lng), tm=tripMin(d);return {p,d,tm,st:statusOf(p,w0,tm),fit:taste(p)}};
function matches(p,ids,q){
  // 带 ! 前缀的是「不想吃」：命中任何一个就排除，优先级最高
  for(const id of ids) if(id[0]==='!'){const t=kwTest(id.slice(1));if(t&&t.test(p)) return false}
  const tests=ids.filter(id=>id[0]!=='!').map(kwTest).filter(Boolean);
  const orT=tests.filter(t=>t.mode==='or'), andT=tests.filter(t=>t.mode==='and');
  if(orT.length&&!orT.some(t=>t.test(p))) return false;
  if(andT.length&&!andT.every(t=>t.test(p))) return false;
  if(q&&!(p.name.toLowerCase().includes(q)||p.zh.includes(q)||(p.addr||'').toLowerCase().includes(q)||p.cu.some(c=>c.includes(q)||cz(c).includes(q))||(p.dish&&p.dish.d.some(([a,b])=>a.includes(q)||b.toLowerCase().includes(q))))) return false;
  return true;
}
/* ---------- 口味档案 & 吃过的记录（只存在这台设备上）---------- */
// likes：标签 id，带 ! 前缀是不喜欢；spice：0 不吃辣 1 微辣 2 能吃辣；budget：人均上限（加元，人均数据补齐后生效）
const PROF=Object.assign({likes:[],spice:null,veg:false,budget:null},LS.get('profile',{}));
let HIST=LS.get('history',[]);  // [{oid,name,cu,t,r}]，r：1 好吃 0 一般 -1 不好吃 null 没评
const saveProf=()=>LS.set('profile',PROF), saveHist=()=>LS.set('history',HIST);
const DAY=864e5;
const SPICY_CU=['sichuan','szechuan','hunan','thai','indian','pakistani','korean','jamaican','caribbean','mexican','hotpot','hot_pot','malaysian','wings'];
const kwLabel=id=>id.startsWith('c:')?cz(id.slice(2)):kwText(id.split(':')[1]);
let PER;
function persona(){  // 每次档案或记录变了重新整理一次，compute 里只查表
  const now=Date.now(), rated={}, recentStore={}, recentCu={};
  for(const h of HIST){
    if(h.r!=null) rated[h.oid]=h.r;
    const age=(now-h.t)/DAY;
    if(age<3) recentStore[h.oid]=Math.min(recentStore[h.oid]??9,age);
    if(age<1.5) for(const c of h.cu||[]) recentCu[c]=1;
  }
  const tests=(pos)=>PROF.likes.filter(x=>(x[0]==='!')!==pos).map(x=>x.replace(/^!/,'')).map(id=>[id,kwTest(id)]).filter(x=>x[1]);
  PER={rated,recentStore,recentCu,like:tests(true),dislike:tests(false)};
}
persona();
const agoTxt=d=>t(d<1?'ago0':d<2?'ago1':'ago2');
function taste(p){  // {s:分数, why:[{t:原因, good:true/false}]}
  const why=[]; let s=0;
  const r=PER.rated[p.oid];
  if(r===-1) return {s:-9,why:[{t:t('whyRatedBad'),good:false}]};
  if(r===1){s+=2;why.push({t:t('whyRatedGood'),good:true})}
  const lk=PER.like.find(([,t])=>t.test(p)); if(lk){s+=2;why.push({t:t('whyLike',{x:kwLabel(lk[0])}),good:true})}
  const dk=PER.dislike.find(([,t])=>t.test(p)); if(dk){s-=3;why.push({t:t('whyDislike',{x:kwLabel(dk[0])}),good:false})}
  if(PROF.spice===0&&p.cu.some(c=>SPICY_CU.includes(c))){s-=1.5;why.push({t:t('whySpicy'),good:false})}
  if(PROF.veg&&(p.veg||has(p,['vegetarian','vegan']))){s+=1.5;why.push({t:t('whyVeg'),good:true})}
  const rs=PER.recentStore[p.oid];
  if(rs!=null){s-=2.5;why.push({t:t('whyRecent',{ago:agoTxt(rs)}),good:false})}
  else if(p.cu.some(c=>PER.recentCu[c])){s-=1;why.push({t:t('whyRecentCu'),good:false})}
  return {s,why};
}
const personalized=()=>PROF.likes.length>0||HIST.length>0||PROF.spice===0||PROF.veg;
function whyHTML(r){
  const w=r.fit.why; if(!w.length) return '';
  return `<div class="why-row">${w.map(x=>`<span class="why ${x.good?'good':'bad'}">${esc(x.t)}</span>`).join('')}</div>`;
}

let NEAR=[], RES=[], POOL=[], FAV=[], HROWS=[], limit=40, selected=null, picked=null;
function compute(){
  const w0=startW(), maxD=maxDist(), q=S.q.trim().toLowerCase();
  const dLat=maxD/111000, dLng=maxD/(111000*Math.cos(S.lat*rad));
  NEAR=[]; RES=[];
  for(const p of P){
    if(Math.abs(p.lat-S.lat)>dLat||Math.abs(p.lng-S.lng)>dLng) continue;
    const r=row(p,w0); if(r.d>maxD||!visible(r.st)) continue;
    NEAR.push(r);
    if(matches(p,S.kw,q)) RES.push(r);
  }
  const open=r=>['ok','tight','soon'].includes(r.st.k)?0:r.st.k==='unk'?1:2;
  RES.sort(S.sort==='near'?((a,b)=>a.d-b.d):S.sort==='fit'?((a,b)=>open(a)-open(b)||b.fit.s-a.fit.s||a.d-b.d):((a,b)=>RANK[a.st.k]-RANK[b.st.k]||a.d-b.d));
  // 随便吃：只看范围内、符合心情的店；有能吃上的就只从能吃上的里抽
  const mood=NEAR.filter(r=>matches(r.p,S.mood,''));
  const ok=mood.filter(r=>r.st.k==='ok');
  POOL=(ok.length?ok:mood.filter(r=>r.st.k!=='closed')).filter(r=>r.fit.s>-9);  // 给过 👎 的不再抽到
  FAV=P.filter(p=>favs.has(p.oid)).map(p=>row(p,w0)).sort((a,b)=>a.d-b.d);
  const byOid=new Map(P.map(p=>[p.oid,p]));
  HROWS=[...new Set(HIST.map(h=>h.oid))].map(o=>byOid.get(o)).filter(Boolean).map(p=>row(p,w0));
}

/* ---------- render helpers ---------- */
function segBtns(el,opts,val,on){el.innerHTML=opts.map(([v,l])=>`<button type="button" data-v="${esc(v)}" aria-pressed="${String(v)===String(val)}">${esc(l)}</button>`).join('');el.onclick=e=>{const b=e.target.closest('button');if(b)on(b.dataset.v)}}
function radios(el,opts,val,on){el.innerHTML=opts.map(([v,l])=>`<button type="button" role="radio" data-v="${esc(v)}" aria-checked="${String(v)===String(val)}">${l}</button>`).join('');el.onclick=e=>{const b=e.target.closest('button');if(b)on(b.dataset.v)}}
const distTxt=d=>d<1000?Math.round(d/10)*10+' m':(d/1000).toFixed(1)+' km';
const tripTxt=r=>t('trip',{mode:modeL(),n:r.tm});
const SRC={site:'dishSite',guess:'dishGuess',name:'dishName'};
function dishHTML(p){
  if(!p.dish) return '';
  // 中文界面显示中文菜名、英文界面显示原文菜名（没有就用中文），另一个放在悬停提示里
  return `<div class="dishes"><span class="lab">${t('signature')}</span>${p.dish.d.map(([a,b])=>{const [m,o]=LANG==='zh'||!b?[a,b]:[b,a];return `<span class="d"${o?` title="${esc(o)}"`:''}>${esc(m)}</span>`}).join('')}<span class="src">${SRC[p.dish.s]?t(SRC[p.dish.s]):''}</span></div>`;
}
const tagHTML=p=>[...new Set(p.cu.map(cz))].slice(0,4).map(t=>`<span class="t">${esc(t)}</span>`).join('');
const telHTML=p=>p.phone?`<a href="tel:${esc(p.phone.replace(/[^+\d]/g,''))}">📞 ${esc(p.phone.replace(/^\+1\s?/,''))}</a>`:'';
function srcHTML(p){
  const s=[p.src.includes('o')&&'OpenStreetMap',p.src.includes('v')&&'Overture',p.src.includes('d')&&t('srcTor')].filter(Boolean).join(t('sep'));
  return t('srcLine',{s})+(p.ds?t('srcDs',{d:esc(p.ds)}):'');
}
function gmaps(p){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name,p.addr,p.city||'Ontario'].filter(Boolean).join(' '))}`}
function gdir(p){return `https://www.google.com/maps/dir/?api=1&origin=${S.lat},${S.lng}&destination=${p.lat},${p.lng}&travelmode=${M().g}`}

/* ---------- 条件 ---------- */
function renderQuery(){
  $('tok-loc').textContent=locLabel();
  const w=startW();
  $('tok-when').textContent=S.when==='now'?t('now'):`${S.whenDay==0?t('today'):S.whenDay==1?t('tomorrow'):DN[Math.floor(w/1440)]} ${hhmm(w)}`;
  radios($('mode-seg'),Object.entries(MODES).map(([k,m])=>[k,`${m.ico} ${esc(t(m.k))}`]),S.mode,v=>{S.mode=v;save();limit=40;update(true)});
  radios($('mins-seg'),MINS.map(n=>[n,n]),S.mins,v=>{S.mins=+v;save();limit=40;update(true)});
  $('where').innerHTML=`${esc(t('whereNow'))}<b>${esc(locLabel())}</b> <span class="num">${S.lat.toFixed(4)}, ${S.lng.toFixed(4)}</span>${S.acc?` · ${esc(t('accuracy',{n:Math.round(S.acc)}))}`:''}`;
}
function renderClock(){const n=torontoNow();$('clock').innerHTML=`${esc(t('toronto'))} ${DN[n.dow]} <b>${hhmm(n.min)}</b>`}
function renderControls(){
  $('loc-preset').innerHTML=`<option value="">${esc(t('pickArea'))}</option>`+HOODS.map((h,i)=>`<option value="${i}">${esc(hoodName(h))}</option>`).join('');
  segBtns($('when-seg'),[['now',t('leaveNow')],['later',t('leaveLater')]],S.when,v=>{S.when=v;$('when-custom').hidden=v!=='later';renderControls();save();update()});
  $('when-custom').hidden=S.when!=='later';
  const n=torontoNow();
  $('when-day').innerHTML=[0,1,2,3,4,5,6].map(i=>`<option value="${i}">${i===0?t('today'):i===1?t('tomorrow'):DN[(n.dow+i)%7]}</option>`).join('');
  $('when-day').value=S.whenDay; $('when-time').value=S.whenTime;
  segBtns($('show-seg'),[['eat',t('showEat')],['eat+unk',t('showEatUnk')],['all',t('showAll')]],S.show,v=>{S.show=v;save();renderControls();update()});
  segBtns($('sort-seg'),[['fit',t('sortFit')],['open',t('sortOpen')],['near',t('sortNear')]],S.sort,v=>{S.sort=v;save();renderControls();update()});
}

/* ---------- 随便吃 ---------- */
const MOOD_GROUPS=[['菜系',KW[0].items.map(([n])=>'菜系:'+n)],['想吃点',KW[1].items.map(([n])=>'想吃点:'+n)],['场景',['场景:快速解决','场景:坐下慢慢吃','场景:素食友好']]];
function renderMoods(){
  $('moods').innerHTML=MOOD_GROUPS.map(([g,ids])=>`<div class="kg"><span class="lab">${esc(gText(g))}</span><div class="chips">${ids.map(id=>`<button type="button" class="chip" data-mood="${esc(id)}" ${chipAttr(S.mood,id,kwLabel(id))}>${esc(kwLabel(id))}</button>`).join('')}</div></div>`).join('');
}
function roll(){
  if(!POOL.length){picked=null;return}
  // 按口味加权随机：分数高的更容易抽到，但每家都有机会
  const w=POOL.map(r=>Math.exp(Math.max(-4,Math.min(4,r.fit.s))*0.55)), sum=w.reduce((a,b)=>a+b,0);
  // 一半机会只在「合你口味」的店里抽（有的话），另一半在全部里按权重抽，保留惊喜
  const fav=POOL.map((r,i)=>i).filter(i=>POOL[i].fit.s>=1.5), fsum=fav.reduce((a,i)=>a+w[i],0);
  const draw1=()=>{
    const idx=fav.length&&Math.random()<0.5?fav:null, tot=idx?fsum:sum;
    let x=Math.random()*tot;
    for(const i of idx||POOL.keys()){x-=w[i];if(x<=0)return POOL[i]}
    return POOL[(idx||[POOL.length-1]).slice(-1)[0]];
  };
  let r; for(let i=0;i<6;i++){r=draw1();if(r.p.oid!==picked||POOL.length===1)break}
  picked=r.p.oid;
}
function renderPick(){
  const r=POOL.find(x=>x.p.oid===picked);
  if(!r){
    $('pick').innerHTML=`<div class="empty-pick">${esc(t(NEAR.length?'emptyMood':'emptyNear'))}</div>`;
    return;
  }
  const p=r.p, okN=POOL.length;
  $('pick').innerHTML=`<article class="pick">
    <div class="pick-walk"><b class="num">${r.tm}</b>${esc(t('minUnit'))} · ${esc(modeL())} · ${distTxt(r.d)}</div>
    <div class="pn">${esc(p.name)}${p.zh&&p.zh!==p.name?`<small>${esc(p.zh)}</small>`:''}</div>
    <div class="tags">${tagHTML(p)}<span>${typeName(p.type)}</span>${p.veg?`<span>${esc(t('vegFriendly'))}</span>`:''}</div>
    ${dishHTML(p)}
    ${whyHTML(r)}
    <div class="st"><span class="pill ${r.st.k}">${esc(r.st.t)}</span></div>
    <div class="pick-acts">
      <button class="btn primary" type="button" id="reroll">${esc(t('reroll'))}</button>
      <a class="btn" href="${gdir(p)}" target="_blank" rel="noopener" data-nav="${esc(p.oid)}">${esc(t('goNav'))}</a>
      <button class="btn ghost" type="button" data-ate="${esc(p.oid)}">${esc(t('ateThis'))}</button>
      <a class="btn ghost" href="${gmaps(p)}" target="_blank" rel="noopener">${esc(t('seeReviews'))}</a>${r.st.k==='unk'&&p.phone?`<a class="btn ghost" href="tel:${esc(p.phone.replace(/[^+\d]/g,''))}">${esc(t('callHours'))}</a>`:''}
      <button class="star" type="button" data-fav="${esc(p.oid)}" aria-pressed="${favs.has(p.oid)}" title="${esc(t('fav'))}">★</button>
    </div>
    <div class="pick-count">${esc(t('poolCount',{n:okN,open:POOL[0]&&POOL[0].st.k==='ok'?t('poolOpen'):'',mine:personalized()?t('poolMine'):''}))}</div>
  </article>`;
}

/* ---------- 找一家 ---------- */
function renderKW(){
  const cu=KW[0];
  $('kw-main').innerHTML=cu.items.map(([n])=>{const id=cu.g+':'+n;return `<button type="button" class="chip" data-k="${esc(id)}" ${chipAttr(S.kw,id,kwText(n))}>${esc(kwText(n))}</button>`}).join('')
    +S.kw.filter(k=>k.replace(/^!/,'').startsWith('c:')).map(k=>{const id=k.replace(/^!/,''),n=cz(id.slice(2));return `<button type="button" class="chip" data-k="${esc(id)}" ${chipAttr(S.kw,id,n)}>${esc(n)}</button>`}).join('');
  $('kw-more').innerHTML=KW.slice(1).map(g=>`<div class="kg"><span class="lab">${esc(gText(g.g))}</span><div class="chips">${g.items.map(([n])=>{const id=g.g+':'+n;return `<button type="button" class="chip" data-k="${esc(id)}" ${chipAttr(S.kw,id,kwText(n))}>${esc(kwText(n))}</button>`}).join('')}</div></div>`).join('');
  const hidden=S.kw.map(k=>k.replace(/^!/,'')).filter(k=>!k.startsWith('菜系:')&&!k.startsWith('c:')).length;
  $('more-kw').querySelector('summary').textContent=hidden?t('moreKwN',{n:hidden}):t('moreKw');
}
// 标签三态：没选 → 想吃 → 不想吃 → 没选
function cycle(arr,id){const i=arr.indexOf(id),j=arr.indexOf('!'+id);if(i>=0)arr[i]='!'+id;else if(j>=0)arr.splice(j,1);else arr.push(id)}
const chipSt=(arr,id)=>arr.includes(id)?'yes':arr.includes('!'+id)?'no':'';
const chipAttr=(arr,id,label)=>{const st=chipSt(arr,id);return `aria-pressed="${st==='yes'}" data-st="${st}"${st==='no'?` aria-label="${esc(t('dontWant',{x:label}))}"`:''}`};
function toggleKW(id){cycle(S.kw,id);save();renderKW();limit=40;update()}
function renderNearby(){
  const cnt={}; NEAR.forEach(r=>{new Set(r.p.cu.map(cz)).forEach(z=>{cnt[z]=(cnt[z]||0)+1})});
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,18);
  $('nearby-h').innerHTML=t('nearbyH',{mode:esc(modeL()),mins:S.mins,now:S.show==='all'?'':t('nearbyNow'),k:Object.keys(cnt).length,n:NEAR.length});
  const rev={}; NEAR.forEach(r=>r.p.cu.forEach(c=>{rev[cz(c)]=rev[cz(c)]||c}));
  $('nearby').innerHTML=top.length?top.map(([z,n])=>{const id='c:'+rev[z];return `<button type="button" class="chip" data-k="${esc(id)}" ${chipAttr(S.kw,id,z)}>${esc(z)}<small>${n}</small></button>`}).join(''):'';
}
function card(r){
  const p=r.p, sel=selected===p.oid, ohSrc=overrides[p.oid]||p.oh||'';
  return `<div class="card${sel?' sel':''}" data-o="${esc(p.oid)}" id="c-${esc(p.oid)}">
    <div class="walk"><b>${r.tm}</b><span>${esc(t('minUnit'))}</span></div>
    <div><div class="cn">${esc(p.name)}${p.zh&&p.zh!==p.name?`<small>${esc(p.zh)}</small>`:''}</div>
      <div class="tags">${tagHTML(p)}<span>${typeName(p.type)}</span><span class="num">${distTxt(r.d)}</span>${p.veg?`<span>${esc(t('vegFriendly'))}</span>`:''}</div>
      ${dishHTML(p)}
      ${whyHTML(r)}
      <div class="st"><span class="pill ${r.st.k}">${esc(r.st.t)}</span></div></div>
    <div class="acts"><button class="star" type="button" data-fav="${esc(p.oid)}" aria-pressed="${favs.has(p.oid)}" title="${esc(t('fav'))}">★</button></div>
    <div class="more">
      <div>${esc([p.addr,p.city].filter(Boolean).join(', ')||t('noAddr'))}</div>
      <div class="links"><a href="${gmaps(p)}" target="_blank" rel="noopener">${esc(t('gmapsReviews'))}</a><a href="${gdir(p)}" target="_blank" rel="noopener" data-nav="${esc(p.oid)}">${esc(t('navTo',{mode:modeL()}))}</a>${/^https?:/.test(p.web)?`<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(t('website'))}</a>`:''}${telHTML(p)}<button class="linkbtn" type="button" data-ate="${esc(p.oid)}">${esc(t('ateBefore'))}</button></div>
      <div>${srcHTML(p)}</div>
      <div class="ohedit"><input class="in" id="oh-${esc(p.oid)}" value="${esc(ohSrc)}" placeholder="${esc(t('ohPh'))}"><button class="btn" type="button" data-oh="${esc(p.oid)}">${esc(t('ohSave'))}</button>${overrides[p.oid]?`<button class="btn" type="button" data-ohx="${esc(p.oid)}">${esc(t('ohReset'))}</button>`:''}</div>
    </div>
  </div>`;
}
function renderList(){
  $('list-h').textContent=t('found',{n:RES.length});
  $('cards').innerHTML=RES.length?RES.slice(0,limit).map(card).join('')+(RES.length>limit?`<div class="showmore"><button class="btn" type="button" id="more">${esc(t('showMore',{n:Math.min(40,RES.length-limit)}))}</button></div>`:''):`<div class="empty">${esc(t('emptyList'))}${S.show!=='all'?'<br>'+esc(t('emptyListClosed')):''}</div>`;
}

/* ---------- 收藏 ---------- */
function renderFav(){
  $('fav-count').textContent=favs.size?t('favN',{n:favs.size}):t('favNone');
  $('fav-h').textContent=favs.size?t('favH',{n:favs.size}):t('tabFav');
  $('fav-cards').innerHTML=FAV.length?FAV.map(card).join(''):`<div class="empty">${esc(t('favEmpty'))}</div>`;
}
/* ---------- 我的：口味档案、吃过的记录 ---------- */
const PROF_GROUPS=[['菜系',KW[0].items.map(([n])=>'菜系:'+n)],['想吃点',KW[1].items.map(([n])=>'想吃点:'+n)]];
const RATE=[[1,'rate1'],[0,'rate0'],[-1,'rateN1']];  // 显示时用 t()
function renderMe(){
  $('me-likes').innerHTML=PROF_GROUPS.map(([g,ids])=>`<div class="kg"><span class="lab">${esc(gText(g))}</span><div class="chips">${ids.map(id=>{const st=chipSt(PROF.likes,id);return `<button type="button" class="chip" data-like="${esc(id)}" aria-pressed="${st==='yes'}" data-st="${st}">${st==='yes'?'❤️ ':''}${esc(kwLabel(id))}</button>`}).join('')}</div></div>`).join('');
  segBtns($('me-spice'),[['',t('spiceUnset')],['0',t('spice0')],['1',t('spice1')],['2',t('spice2')]],PROF.spice==null?'':PROF.spice,v=>{PROF.spice=v===''?null:+v;profChanged()});
  segBtns($('me-veg'),[['0',t('vegAny')],['1',t('vegPref')]],PROF.veg?'1':'0',v=>{PROF.veg=v==='1';profChanged()});
  segBtns($('me-budget'),[['',t('budgetAny')],...[15,25,40].map(n=>[String(n),t('budgetUpTo',{n})])],PROF.budget==null?'':PROF.budget,v=>{PROF.budget=v===''?null:+v;profChanged()});
  const hs=[...HIST].sort((a,b)=>b.t-a.t).slice(0,50);
  $('me-hist-h').textContent=HIST.length?t('meHistN',{n:HIST.length}):t('meHist');
  $('me-hist').innerHTML=hs.length?hs.map(h=>{const d=new Date(h.t);return `<div class="hrow">
    <span class="num hdate">${d.getMonth()+1}/${d.getDate()}</span>
    <span class="hname">${esc(h.name)}</span>
    <span class="seg hrate">${RATE.map(([v,l])=>`<button type="button" data-hrate="${h.t}|${v}" aria-pressed="${h.r===v}">${esc(t(l))}</button>`).join('')}</span>
    <button type="button" class="linkbtn" data-hdel="${h.t}" title="${esc(t('delTitle'))}">${esc(t('del'))}</button></div>`}).join(''):`<div class="empty">${esc(t('meHistEmpty'))}</div>`;
}
function profChanged(){saveProf();persona();if(personalized()&&!LS.get('fitSortSet',false)){S.sort='fit';save();LS.set('fitSortSet',true);renderControls()}renderMe();compute();renderFav();draw(false)}
function histChanged(){saveHist();persona();profChanged()}
function ate(oid,r){
  const p=P.find(x=>x.oid===oid); if(!p) return;
  const last=HIST.find(h=>h.oid===oid&&Date.now()-h.t<12*3600e3);  // 12 小时内同一家算同一顿
  if(last) last.r=r; else HIST.push({oid,name:p.name,cu:p.cu,t:Date.now(),r});
  histChanged(); toast(t(r===1?'toastGood':r===-1?'toastBad':'toastOk'));
}
function askRate(el,oid){  // 在按钮旁边问「好吃吗」
  el.outerHTML=`<span class="rateask">${esc(t('rateAsk'))}${RATE.map(([v,l])=>`<button type="button" class="btn ${v===1?'primary':''}" data-rate="${esc(oid)}|${v}">${esc(t(l))}</button>`).join('')}</span>`;
}
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>el.hidden=true,2600)}
// 点了导航之后，下次打开时问一句
function checkPending(){
  const pd=LS.get('pending',null); if(!pd){$('ask-banner').hidden=true;return}
  const age=Date.now()-pd.t;
  if(age>18*3600e3){LS.set('pending',null);$('ask-banner').hidden=true;return}
  if(age<25*60e3){$('ask-banner').hidden=true;return}  // 刚出门，还没吃
  $('ask-banner').hidden=false;
  $('ask-banner').innerHTML=`<span>${t('askLast',{name:esc(pd.name)})}</span><span class="rateask">${RATE.map(([v,l])=>`<button type="button" class="btn ${v===1?'primary':''}" data-rate="${esc(pd.oid)}|${v}">${esc(t('askAte',{r:t(l).replace(/^[^ ]+ /,'')}))}</button>`).join('')}<button type="button" class="btn ghost" data-pending-no>${esc(t('askNo'))}</button></span>`;
}

function renderFoot(){
  const withH=P.filter(p=>p.oh).length, nChain=P.filter(p=>!p.oh&&p.ohChain).length, nd=Object.keys(DISH).length;
  const v={ts:DATA.ts.slice(0,10),ov:DATA.overture||'',total:P.length.toLocaleString(),withH:withH.toLocaleString(),pct:Math.round(withH/P.length*100),chain:nChain.toLocaleString(),n:nd};
  $('foot').innerHTML=['foot1','foot2','foot3','foot4'].map(k=>`<p>${esc(t(k,v))}</p>`).join('');
}

/* ---------- map (Leaflet) ---------- */
const map=L.map('map',{preferCanvas:true,zoomControl:true,attributionControl:true}).setView([S.lat,S.lng],15);
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches};
let tiles=[];
const ESRI=n=>`https://server.arcgisonline.com/ArcGIS/rest/services/${n}/MapServer/tile/{z}/{y}/{x}`;
const ATTR=()=>t('mapAttr');
function setTiles(){
  tiles.forEach(t=>map.removeLayer(t));
  tiles=isDark()
    ?[L.tileLayer(ESRI('Canvas/World_Dark_Gray_Base'),{maxZoom:19,maxNativeZoom:16,attribution:ATTR()}),L.tileLayer(ESRI('Canvas/World_Dark_Gray_Reference'),{maxZoom:19,maxNativeZoom:16})]
    :[L.tileLayer(ESRI('World_Street_Map'),{maxZoom:19,attribution:ATTR()})];
  tiles.forEach(t=>t.addTo(map));
}
setTiles();
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const COL={ok:'--ok',tight:'--warn',soon:'--warn',closed:'--bad',unk:'--unk'};
const dots=L.layerGroup().addTo(map);
let ring=null, me=null, accRing=null, picking=false;
function fitRange(){if(ring&&maxDist()>0)map.fitBounds(ring.getBounds(),{padding:[16,16]});else map.setView([S.lat,S.lng],15)}
function popHTML(r){
  const p=r.p;
  return `<div class="pp-name">${esc(p.name)}${p.zh&&p.zh!==p.name?` <small>${esc(p.zh)}</small>`:''}</div>
    <div class="tags">${tagHTML(p)}<span>${tripTxt(r)}</span></div>${dishHTML(p)}
    <div class="st"><span class="pill ${r.st.k}">${esc(r.st.t)}</span></div>
    <button type="button" class="pp-go" data-go="${esc(p.oid)}">${esc(t(S.view==='rand'?'ppPick':'ppList'))}</button>`;
}
function draw(fit){
  const cols={}; for(const k in COL) cols[k]=cssv(COL[k]);
  const surf=cssv('--surface'), acc=cssv('--accent');
  if(ring) map.removeLayer(ring);
  ring=L.circle([S.lat,S.lng],{radius:Math.max(maxDist(),1),color:cssv('--ink'),weight:1.5,opacity:.55,dashArray:'6 6',fill:true,fillOpacity:.04,interactive:false}).addTo(map);
  if(accRing) map.removeLayer(accRing);
  accRing=S.acc?L.circle([S.lat,S.lng],{radius:S.acc,color:cssv('--me'),weight:1,opacity:.8,fillColor:cssv('--me'),fillOpacity:.15,interactive:false}).addTo(map):null;
  if(me) map.removeLayer(me);
  me=L.marker([S.lat,S.lng],{icon:L.divIcon({className:'',html:'<div class="me-pin"></div>',iconSize:[18,18],iconAnchor:[9,9]}),keyboard:false,interactive:false,zIndexOffset:1000}).addTo(map);
  dots.clearLayers();
  const list=S.view==='rand'?POOL:S.view==='fav'?FAV:S.view==='me'?HROWS:RES;
  const hi=S.view==='rand'?picked:selected;
  let hiRow=null;
  for(const r of list.slice(0,3000)){
    if(r.p.oid===hi){hiRow=r;continue}
    const o=r.st.k==='unk' // 时间未知：小空心圈，不抢眼
      ?{radius:3.5,color:cols.unk,weight:1.5,opacity:S.view==='rand'?.5:.8,fill:true,fillColor:surf,fillOpacity:.6}
      :{radius:S.view==='rand'?4:5.5,color:surf,weight:1,fillColor:cols[r.st.k],fillOpacity:S.view==='rand'?.45:.95};
    L.circleMarker([r.p.lat,r.p.lng],o).bindPopup(()=>popHTML(r)).addTo(dots);
  }
  if(hiRow){
    const m=L.circleMarker([hiRow.p.lat,hiRow.p.lng],{radius:10,color:acc,weight:3,fillColor:cols[hiRow.st.k],fillOpacity:1}).bindPopup(()=>popHTML(hiRow)).addTo(dots);
    m.bindTooltip(esc(hiRow.p.name),{permanent:true,direction:'top',offset:[0,-10]});
  }
  if(fit) fitRange();
}
map.on('click',e=>{if(picking){setLoc(e.latlng.lat,e.latlng.lng,'',null,'mappick');setPicking(false)}});
$('zme').onclick=()=>fitRange();
function setPicking(on){picking=on;$('mapbox').classList.toggle('picking',on);$('maphint').hidden=!on;$('pick-btn').classList.toggle('on',on);$('pick-btn').textContent=t(on?'pickingCancel':'pickOnMap');if(on)closePops()}
$('pick-btn').onclick=()=>{setPicking(!picking);if(picking&&window.innerWidth<1100)$('mapbox').scrollIntoView({behavior:'smooth',block:'center'})};

/* ---------- views ---------- */
function renderView(){
  document.querySelector('.stage').dataset.view=S.view;
  for(const v of ['rand','find','fav','me']){$('view-'+v).hidden=S.view!==v;$('tab-'+v).setAttribute('aria-selected',S.view===v)}
}
function setView(v){S.view=v;save();if(v==='rand'&&!POOL.some(r=>r.p.oid===picked))roll();renderView();renderPanel();draw(false);window.scrollTo({top:0})}
function renderPanel(){
  if(S.view==='rand') renderPick();
  else if(S.view==='find'){renderNearby();renderList()}
  else if(S.view==='me') renderMe();
  else renderFav();
}
function update(fit){
  compute();
  if(S.view==='rand'&&!POOL.some(r=>r.p.oid===picked)) roll();
  renderClock();renderQuery();renderFav();renderPanel();draw(fit);
}

/* ---------- interactions ---------- */
function setLoc(lat,lng,name,acc,key){S.lat=+lat;S.lng=+lng;S.locName=name||'';S.locKey=key||null;S.acc=acc||null;save();limit=40;picked=null;selected=null;closePops();update(true)}
function select(oid,scroll){
  selected=selected===oid&&!scroll?null:oid;
  if(scroll){const idx=RES.findIndex(x=>x.p.oid===oid);if(idx>=limit){limit=idx+10}}
  renderPanel();draw(false);
  if(scroll){const el=document.getElementById('c-'+oid);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'})}
  const r=[...RES,...FAV].find(x=>x.p.oid===oid); if(r&&selected&&!scroll) map.panTo([r.p.lat,r.p.lng]);
}
function closePops(){for(const id of ['loc','when']){$('pop-'+id).hidden=true;$('tok-'+id).setAttribute('aria-expanded','false')}}
for(const id of ['loc','when']) $('tok-'+id).onclick=e=>{e.stopPropagation();const open=$('pop-'+id).hidden;closePops();if(open){$('pop-'+id).hidden=false;$('tok-'+id).setAttribute('aria-expanded','true');if(id==='loc'){renderRecent();setTimeout(()=>$('loc-q').focus(),0)}}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePops();if(picking)setPicking(false)}});
$('loc-preset').onchange=e=>{const i=+e.target.value,h=HOODS[i];if(e.target.value!==''&&h)setLoc(h[2],h[3],h[0],null,'hood:'+i);e.target.value=''};
function parseLoc(s){
  const m=s.match(/@?(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if(!m) return null; const la=+m[1],lo=+m[2];
  if(la<43.2||la>44.3||lo<-80.3||lo>-78.6) return 'far';
  return [la,lo];
}
/* ---------- 地址搜索：边输入边用 Photon 提示，回车时没有提示再问 Nominatim（都免 key，都基于 OpenStreetMap）---------- */
const GTA_BOX='-79.95,43.40,-78.85,44.05';
let sugs=[], sugCtl=null, sugTimer=null;
const addrErr=m=>{$('where').querySelector('.err')?.remove();$('where').insertAdjacentHTML('beforeend',`<div class="err">${m}</div>`)};
function photonLabel(p){
  const street=[p.housenumber,p.street].filter(Boolean).join(' ');
  const main=p.name||street||p.city||'';
  const sub=[p.name&&street,p.district||p.locality,p.city,p.postcode].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i&&x!==main).join(', ');
  return {main,sub};
}
async function photon(q,signal){
  const u=`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lat=${S.lat}&lon=${S.lng}&bbox=${GTA_BOX}`;
  const j=await (await fetch(u,{signal})).json();
  return (j.features||[]).map(f=>{const {main,sub}=photonLabel(f.properties);return {lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],main,sub}}).filter((x,i,a)=>x.main&&a.findIndex(y=>y.main===x.main&&y.sub===x.sub)===i);
}
async function nominatim(q){
  const u=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&countrycodes=ca&viewbox=-79.95,44.05,-78.85,43.40&bounded=1&accept-language=${LANG==='zh'?'zh,en':'en'}`;
  const j=await (await fetch(u)).json();
  return j.map(x=>({lat:+x.lat,lng:+x.lon,main:x.name||x.display_name.split(',')[0],sub:x.display_name.split(',').slice(1,4).join(',')}));
}
function renderSugs(msg){
  const ul=$('loc-sug');
  if(!sugs.length&&!msg){ul.hidden=true;ul.innerHTML='';return}
  ul.hidden=false;
  ul.innerHTML=sugs.length?sugs.map((x,i)=>`<li><button type="button" role="option" data-sug="${i}" class="${i===0?'first':''}"><b>${esc(x.main)}</b>${x.sub?`<small>${esc(x.sub)}</small>`:''}</button></li>`).join(''):`<li class="none">${esc(msg)}</li>`;
}
function useAddr(x){
  if(!inGTA(x.lat,x.lng)) return addrErr(esc(t('addrOutside')));
  const rec=[{n:x.main,lat:x.lat,lng:x.lng},...LS.get('recentLocs',[]).filter(r=>r.n!==x.main)].slice(0,5);
  LS.set('recentLocs',rec);
  $('loc-q').value=''; sugs=[]; renderSugs(); renderRecent();
  setLoc(x.lat,x.lng,x.main);
}
function renderRecent(){
  const rec=LS.get('recentLocs',[]);
  $('loc-recent').innerHTML=rec.length?`<span class="lab">${esc(t('recentLocs'))}</span>`+rec.map((r,i)=>`<button type="button" class="chip" data-rl="${i}">${esc(r.n)}</button>`).join(''):'';
}
$('loc-q').oninput=e=>{
  const q=e.target.value.trim(); clearTimeout(sugTimer); if(sugCtl) sugCtl.abort();
  $('where').querySelector('.err')?.remove();
  if(q.length<3||parseLoc(q)){sugs=[];renderSugs();return}
  sugTimer=setTimeout(async()=>{
    sugCtl=new AbortController();
    try{sugs=await photon(q,sugCtl.signal);renderSugs(sugs.length?'':t('addrNoMatch'))}
    catch(err){if(err.name!=='AbortError'){sugs=[];renderSugs()}}
  },300);
};
$('loc-form').onsubmit=async e=>{
  e.preventDefault();
  const q=$('loc-q').value.trim(); if(!q) return;
  const v=parseLoc(q);  // 坐标或 Google 地图链接
  if(v==='far') return addrErr(esc(t('coordOutside')));
  if(v){$('loc-q').value='';return setLoc(v[0],v[1],'',null,'pasted')}
  if(sugs.length) return useAddr(sugs[0]);
  const b=$('loc-go'); b.disabled=true; b.textContent=t('searching');
  try{
    let r=await photon(q); if(!r.length) r=await nominatim(q);
    if(r.length) useAddr(r[0]); else addrErr(esc(t('addrNotFound')));
  }catch(err){addrErr(esc(t('addrOffline')))}
  b.disabled=false; b.textContent=t('useAddr');
};
// 定位：持续读几秒，等 GPS 收敛。精度到 GOOD 米以内立即采用，否则最多等 MAXWAIT 毫秒取最准的一次
const GEO={GOOD:35,MAXWAIT:10000,BAD:1000};
const inGTA=(la,lo)=>!(la<43.2||la>44.3||lo<-80.3||lo>-78.6);
let geoWatch=null;
function geoMsg(html){$('where').querySelector('.err')?.remove();$('where').insertAdjacentHTML('beforeend',`<div class="err">${html}</div>`)}
$('geo-btn').onclick=()=>{
  const b=$('geo-btn'), label=t('useMyLoc');
  if(geoWatch!==null) return;
  $('where').querySelector('.err')?.remove();
  if(!navigator.geolocation) return geoMsg(esc(t('geoNoSupport')));
  let best=null, timer=null;
  const stop=()=>{navigator.geolocation.clearWatch(geoWatch);geoWatch=null;clearTimeout(timer);b.disabled=false;b.textContent=label};
  const finish=()=>{
    stop();
    if(!best) return geoMsg(esc(t('geoFail')));
    const {latitude:la,longitude:lo,accuracy:acc}=best.coords;
    if(!inGTA(la,lo)) return geoMsg(esc(t('geoOutside')));
    setLoc(la,lo,'',acc,'here');
    if(acc>GEO.BAD){ // 很可能关了「精确位置」，把弹框留着显示提示
      $('pop-loc').hidden=false;$('tok-loc').setAttribute('aria-expanded','true');
      geoMsg(esc(t('geoImprecise',{km:(acc/1000).toFixed(1)})));
    }
  };
  b.disabled=true; b.textContent=t('locating');
  geoWatch=navigator.geolocation.watchPosition(pos=>{
    if(!best||pos.coords.accuracy<best.coords.accuracy) best=pos;
    b.textContent=t('locatingAcc',{n:Math.round(best.coords.accuracy)});
    if(best.coords.accuracy<=GEO.GOOD) finish();
  },e=>{
    if(e.code===1){stop();return geoMsg(esc(t('geoDenied')))}
    if(e.code!==3&&!best){stop();geoMsg(esc(t('geoFail')))}
  },{enableHighAccuracy:true,maximumAge:0,timeout:GEO.MAXWAIT});
  timer=setTimeout(finish,GEO.MAXWAIT);
};
$('when-day').onchange=e=>{S.whenDay=+e.target.value;save();update()};
$('when-time').onchange=e=>{S.whenTime=e.target.value||'18:30';save();update()};
let qt=null;$('q').value=S.q;$('q').oninput=e=>{clearTimeout(qt);qt=setTimeout(()=>{S.q=e.target.value;limit=40;update()},150)};
$('clear').onclick=()=>{S.kw=[];S.q='';$('q').value='';save();renderKW();update()};
$('about-btn').onclick=()=>$('about').showModal();
document.querySelector('.tabs').onclick=e=>{const t=e.target.closest('[data-view]');if(t)setView(t.dataset.view)};
document.addEventListener('click',e=>{
  if(!e.target.closest('.pop,.tok')) closePops();
  const sg=e.target.closest('[data-sug]'); if(sg){useAddr(sugs[+sg.dataset.sug]);return}
  const rl=e.target.closest('[data-rl]'); if(rl){const r=LS.get('recentLocs',[])[+rl.dataset.rl];if(r)useAddr({main:r.n,lat:r.lat,lng:r.lng});return}
  const k=e.target.closest('[data-k]'); if(k){toggleKW(k.dataset.k);return}
  const md=e.target.closest('[data-mood]'); if(md){cycle(S.mood,md.dataset.mood);save();renderMoods();compute();roll();renderPick();draw(false);return}
  if(e.target.id==='reroll'){roll();renderPick();draw(false);return}
  const nav=e.target.closest('[data-nav]'); if(nav){const p=P.find(x=>x.oid===nav.dataset.nav);if(p)LS.set('pending',{oid:p.oid,name:p.name,t:Date.now()});return}
  const at=e.target.closest('[data-ate]'); if(at){askRate(at,at.dataset.ate);return}
  const rt=e.target.closest('[data-rate]'); if(rt){const [o,v]=rt.dataset.rate.split('|');ate(o,+v);const pd=LS.get('pending',null);if(pd&&pd.oid===o)LS.set('pending',null);checkPending();rt.closest('.rateask')?.replaceWith(Object.assign(document.createElement('span'),{className:'rated',textContent:t('rated')}));if(S.view==='rand'&&+v===-1){compute();roll()}renderPanel();return}
  if(e.target.closest('[data-pending-no]')){LS.set('pending',null);checkPending();return}
  const lk=e.target.closest('[data-like]'); if(lk){cycle(PROF.likes,lk.dataset.like);profChanged();return}
  const hr=e.target.closest('[data-hrate]'); if(hr){const [t,v]=hr.dataset.hrate.split('|');const h=HIST.find(x=>x.t===+t);if(h){h.r=h.r===+v?null:+v;histChanged()}return}
  const hd=e.target.closest('[data-hdel]'); if(hd){HIST=HIST.filter(x=>x.t!==+hd.dataset.hdel);histChanged();return}
  if(e.target.id==='more'){limit+=40;renderList();return}
  const go=e.target.closest('[data-go]'); if(go){map.closePopup();if(S.view==='rand'){picked=go.dataset.go;renderPick();draw(false)}else select(go.dataset.go,true);return}
  const f=e.target.closest('[data-fav]'); if(f){const o=f.dataset.fav;favs.has(o)?favs.delete(o):favs.add(o);LS.set('favs',[...favs]);f.setAttribute('aria-pressed',favs.has(o));compute();renderFav();if(S.view==='fav'||S.kw.includes('场景:我收藏的'))update();return}
  const oh=e.target.closest('[data-oh]'); if(oh){const o=oh.dataset.oh;const v=document.getElementById('oh-'+o).value.trim();
    if(v&&!parseOH(v)){oh.insertAdjacentHTML('afterend',`<span class="err">${esc(t('ohBad'))}</span>`);return}
    if(v)overrides[o]=v;else delete overrides[o];LS.set('oh',overrides);update();return}
  const ox=e.target.closest('[data-ohx]'); if(ox){delete overrides[ox.dataset.ohx];LS.set('oh',overrides);update();return}
  if(e.target.closest('a,input,button,select,.leaflet-container')) return;
  const c=e.target.closest('.card'); if(c){select(c.dataset.o,false)}
});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{setTiles();draw(false)})}catch(e){}
new MutationObserver(()=>{setTiles();draw(false)}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
setInterval(()=>{if(S.when==='now')update();else renderClock()},60000);

$('me-export').onclick=()=>{
  const blob=new Blob([JSON.stringify({v:1,exported:new Date().toISOString(),profile:PROF,history:HIST,favs:[...favs]},null,1)],{type:'application/json'});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`${t('exportName')}-${new Date().toISOString().slice(0,10)}.json`});
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
};
$('me-import').onchange=async e=>{
  const f=e.target.files[0]; if(!f) return;
  try{
    const j=JSON.parse(await f.text());
    if(j.profile){for(const k of ['spice','veg','budget']) if(j.profile[k]!==undefined) PROF[k]=j.profile[k]; PROF.likes=[...new Set([...PROF.likes,...(j.profile.likes||[])])]}
    if(Array.isArray(j.history)){const seen=new Set(HIST.map(h=>h.oid+'|'+h.t));for(const h of j.history) if(h&&h.oid&&h.t&&!seen.has(h.oid+'|'+h.t)) HIST.push({oid:h.oid,name:h.name||'',cu:h.cu||[],t:+h.t,r:h.r??null})}
    if(Array.isArray(j.favs)){j.favs.forEach(o=>favs.add(o));LS.set('favs',[...favs])}
    histChanged(); toast(t('imported'));
  }catch(err){toast(t('importBad'))}
  e.target.value='';
};
/* ---------- 切换语言 ---------- */
function applyStatic(){  // index.html 里带 data-i18n 的静态文字
  document.documentElement.lang=LANG==='zh'?'zh-CN':'en';
  document.title=t('title');
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{el.innerHTML=t(el.dataset.i18nHtml)});  // 只用于 i18n.js 里写死的可信 HTML
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{el.placeholder=t(el.dataset.i18nPh)});
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAria))});
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{el.title=t(el.dataset.i18nTitle)});
  document.querySelectorAll('[data-lang-seg]').forEach(el=>segBtns(el,[['zh','中文'],['en','English']],LANG,setLang));
}
function setLang(l){
  if(l===LANG) return;
  LANG=l; LS.set('lang',l);
  applyStatic(); persona(); setTiles(); renderControls(); renderKW(); renderMoods(); renderFoot(); checkPending();
  if(picking) setPicking(true);
  update(); if(S.view==='me') renderMe();
}
applyStatic();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkPending()});
checkPending();
renderControls();renderKW();renderMoods();renderFoot();renderView();
update(true);
})();
