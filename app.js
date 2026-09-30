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
// 官网提取的营业时间、人均、招牌菜（scripts/build-site-data.mjs 生成）
const SITE=window.SITE_DATA||{};
const P=DATA.rows.map((r,i)=>{const x=SITE[r[12]]||{};return {i,name:r[0],zh:r[1],lat:r[2],lng:r[3],type:r[4],cu:r[5].map(k=>CUI[k]),oh:r[6],addr:r[7],city:r[8],veg:r[9],take:r[10],web:r[11],oid:r[12],phone:r[13]||'',src:r[14]||'o',ds:r[15]||'',
  siteOh:x.h||'',price:x.p?{min:x.p[0],max:x.p[1]}:null,dish:x.d?{s:x.s||'site',d:x.d}:null}});
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
// Google 查到的评分和营业时间（只给看过的店查，存在这台设备上）：编号 → {id,t,r,n,url,st,iv}
let GP=LS.get('gplace',{});
const saveGP=()=>LS.set('gplace',GP);
const gIv=p=>!overrides[p.oid]&&GP[p.oid]&&GP[p.oid].iv;
function sched(p){
  const g=gIv(p); if(g) return g;  // 优先级：自己补的 > Google > OSM > 官网 > 连锁推测
  const src=overrides[p.oid]||p.oh||p.siteOh||p.ohChain;
  const key=p.i+'|'+src;
  if(!schedCache.has(key)) schedCache.set(key,parseOH(src));
  return schedCache.get(key);
}
/* 连锁店推测：同名店 ≥3 家、其中 ≥2 家有营业时间时，给没登记的分店套用最常见的那份 */
const normName=s=>s.toLowerCase().replace(/[^a-z0-9一-鿿]/g,'');
// 品牌名：去掉括号里的分店名、「- Yonge St」之类（和 scripts/uber_profile.py 里的 core 一致）
const brandOf=s=>normName(String(s||'').split(/\s[-–|(]\s?|\(/)[0]);
// 大型快餐连锁：按品牌名认，再加上「快餐类、同名 5 家以上」的（咖啡连锁不算，下午想喝咖啡时不该被排除）
const FAST_RE=/^(mcdonald|popeyes|wendy|kfc|burgerking|aw$|awrestaurant|awcanada|harvey|subway|timhortons|tacobell|pizzapizza|pizzanova|domino|pizzahut|littlecaesar|dairyqueen|marybrown|chickfila|firehouse|jerseymike|quiznos|mrsub|freshii|chipotle|arbys|carlsjr|fatburger|triplebypass|panago|241pizza|papajohn)/;
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
  for(const list of Object.values(g)) if(list.length>=5&&list.filter(p=>p.type===1).length>=list.length/2) for(const p of list) if(p.type!==2) p.fastChain=true;
})();
// 店名里任何位置出现这些品牌也算（比如「York U - Popeye's Louisiana Kitchen」）
const FAST_ANY=/(mcdonald|popeye|wendys|burgerking|harveys|tacobell|pizzapizza|pizzanova|dominos|pizzahut|littlecaesar|dairyqueen|marybrown|chickfila|arbys|fatburger)/;
for(const p of P){ p.brand=brandOf(p.name); if(FAST_RE.test(p.brand)||FAST_ANY.test(normName(p.name))||/\bkfc\b/i.test(p.name)) p.fastChain=true }  // KFC 只认完整单词，免得「PKF Consulting」被误判
const isGuess=p=>!gIv(p)&&!overrides[p.oid]&&!p.oh&&!p.siteOh&&!!p.ohChain;
const fromSite=p=>!gIv(p)&&!overrides[p.oid]&&!p.oh&&!!p.siteOh;
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
const save=()=>LS.set('state',{recN:S.recN,findN:S.findN,lat:S.lat,lng:S.lng,locName:S.locName,locKey:S.locKey,mode:S.mode,mins:S.mins,view:S.view,show:S.show,sort:S.sort,kw:S.kw,mood:S.mood,acc:S.acc,when:S.when,whenDay:S.whenDay,whenTime:S.whenTime});

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
const statusOf=(p,w0,tm)=>{const g=GP[p.oid];if(g&&(g.st==='CLOSED_PERMANENTLY'||g.st==='CLOSED_TEMPORARILY'))return {k:'closed',t:t(g.st==='CLOSED_PERMANENTLY'?'gClosedPerm':'gClosedTemp')};const st=status(p,w0,tm);if(st.k!=='unk'&&gIv(p))st.t+=t('stGoogle');else if(st.k!=='unk'&&isGuess(p))st.t+=t('stChain');else if(st.k!=='unk'&&fromSite(p))st.t+=t('stSite');return st};
const RANK={ok:0,tight:1,soon:2,unk:3,closed:4};
const visible=st=>S.show==='all'||['ok','tight','soon'].includes(st.k)||(S.show==='eat+unk'&&st.k==='unk');
const row=(p,w0)=>{const d=dist(S.lat,S.lng,p.lat,p.lng), tm=tripMin(d);return {p,d,tm,st:statusOf(p,w0,tm),fit:taste(p,d)}};
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
const PROF=Object.assign({likes:[],spice:null,veg:false,budget:null,diet:[],explore:null},LS.get('profile',{}));
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
  // C：每种场合（工作日/周末 × 时段）下常吃、没给过 👎 的菜系
  const habit={};
  for(const h of HIST){ if(!h.ctx||h.r===-1) continue; const m=habit[h.ctx]||(habit[h.ctx]={}); for(const c of h.cu||[]) m[c]=(m[c]||0)+1 }
  for(const h of LS.get('ctxPick',[])){ const m=habit[h.ctx]||(habit[h.ctx]={}); for(const c of h.cu||[]) m[c]=(m[c]||0)+1 }  // 「为什么选它：正想吃这类」
  const tmpNo=LS.get('tmpNo',[]).filter(x=>x.until>now);  // 「没选这家：不想吃这类」，同一场合下 1 天内生效
  PER={rated,recentStore,recentCu,like:tests(true),dislike:tests(false),habit,tmpNo};
}
persona();

/* ---------- 场合：时间段、星期几、天气 ---------- */
// A 默认规则；B 问卷里的场合题（PROF.ctx）会改掉对应的默认；C 从吃过的记录里学（PER.habit）
const slotOf=m=>m<300?'late':m<660?'breakfast':m<840?'lunch':m<1020?'afternoon':m<1260?'dinner':'late';
let WX=LS.get('wx',null);  // 天气缓存 {lat,lng,t,temp,wet,snow}
async function loadWeather(){  // Open-Meteo，免费、不用 key；只在「现在出发」时用
  if(S.when!=='now') return;
  if(WX&&Date.now()-WX.t<30*60e3&&Math.abs(WX.lat-S.lat)<0.05&&Math.abs(WX.lng-S.lng)<0.05) return;
  try{
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${S.lat.toFixed(3)}&longitude=${S.lng.toFixed(3)}&current=temperature_2m,precipitation,weather_code&timezone=America%2FToronto`;
    const c=(await (await fetch(u)).json()).current, code=c.weather_code;
    WX={lat:S.lat,lng:S.lng,t:Date.now(),temp:c.temperature_2m,wet:c.precipitation>0.05||(code>=51&&code<=67)||(code>=71&&code<=86)||code>=95,snow:(code>=71&&code<=77)||code===85||code===86};
    LS.set('wx',WX); update();
  }catch(e){}
}
let CTX={};
function ctxNow(){
  const w=startW(), dow=Math.floor(w/1440)%7, slot=slotOf(w%1440), weekday=dow<=4;
  const wx=S.when==='now'&&WX&&Date.now()-WX.t<3*3600e3?WX:null;
  return {dow,slot,weekday,key:(weekday?'wd':'we')+':'+slot,friNight:(dow===4||dow===5)&&(slot==='dinner'||slot==='late'),
    wet:!!(wx&&wx.wet),snow:!!(wx&&wx.snow),cold:!!(wx&&wx.temp<5),hot:!!(wx&&wx.temp>28),temp:wx?Math.round(wx.temp):null};
}
const kwIs=(id,p)=>{const k=kwTest(id);return !!k&&k.test(p)};
function ctxBoost(p,d){  // 返回 [加分, 原因]；一家店只给一个场合原因，免得卡片太乱
  const c=CTX, pref=PROF.ctx||{}, near=Math.max(0,1-d/Math.max(maxDist(),1));
  if(c.wet||c.cold||c.snow){
    const want=pref.rain||'soup';
    const hit=want==='hotpot'?has(p,['hotpot','hot_pot']):want==='soup'?kwIs('想吃点:热汤面',p):false;
    return hit?[1.5+near*0.5,t(c.snow?'ctxSnow':c.wet?'ctxRain':'ctxCold')]:[near*0.5,null];  // 天不好，近的也加一点
  }
  if(c.hot&&['想吃点:甜品','想吃点:奶茶','想吃点:三明治/轻食'].some(id=>kwIs(id,p))) return [1,t('ctxHot')];
  if(c.slot==='breakfast'&&(kwIs('想吃点:早餐',p)||kwIs('想吃点:咖啡',p))) return [1.5,t('ctxBreakfast')];
  if(c.slot==='afternoon'&&['想吃点:甜品','想吃点:奶茶','想吃点:咖啡'].some(id=>kwIs(id,p))) return [1,t('ctxTea')];
  if(c.weekday&&c.slot==='lunch'){
    const want=pref.lunch||'quick';
    if(want==='quick'&&(p.type===1||p.type===3||near>0.6)) return [1+near,t('ctxLunch')];
    if(want==='sit'&&p.type===0) return [1,t('ctxLunchSit')];
    return [0,null];
  }
  if(c.friNight){
    const want=pref.fri||'sit';
    if(want==='bold'&&(kwIs('想吃点:辣的',p)||kwIs('想吃点:烤肉',p))) return [1.5,t('ctxFriBold')];
    if(want==='sit'&&p.type===0) return [1,t('ctxFri')];
    return [0,null];
  }
  if(c.slot==='late'&&lateNight(p)) return [1,t('ctxLate')];
  return [0,null];
}
function ctxLine(){  // 「随便吃」上方的一句场合说明
  const c=CTX, parts=[t('slot_'+c.slot+(c.weekday?'':'_we'))];
  if(c.temp!=null) parts.push((c.snow?'🌨️ ':c.wet?'☔ ':c.cold?'🥶 ':c.hot?'☀️ ':'')+c.temp+'°C');
  return parts.join(' · ');
}

const agoTxt=d=>t(d<1?'ago0':d<2?'ago1':'ago2');
function taste(p,d=0){  // {s:分数, why:[{t:原因, good:true/false}]}
  const why=[]; let s=0;
  const r=PER.rated[p.oid];
  if(r===-1) return {s:-9,why:[{t:t('whyRatedBad'),good:false}]};
  const g=GP[p.oid];  // Google：关门了就不推荐；评论够多时按评分加减分
  if(g&&(g.st==='CLOSED_PERMANENTLY'||g.st==='CLOSED_TEMPORARILY')) return {s:-9,why:[]};  // 已关门：不推荐（营业状态里会写明）
  if(g&&g.r!=null&&g.n>=20){
    if(g.r>=4.5){s+=1;why.push({t:t('whyGHigh',{r:g.r.toFixed(1)}),good:true})}
    else if(g.r<3.8){s-=2.5;why.push({t:t('whyGLow',{r:g.r.toFixed(1)}),good:false})}
  }
  if(r===1){s+=2;why.push({t:t('whyRatedGood'),good:true})}
  const lk=PER.like.find(([,t])=>t.test(p)); if(lk){s+=2;why.push({t:t('whyLike',{x:kwLabel(lk[0])}),good:true})}
  const dk=PER.dislike.find(([,t])=>t.test(p)); if(dk){s-=3;why.push({t:t('whyDislike',{x:kwLabel(dk[0])}),good:false})}
  if(PROF.spice===0&&p.cu.some(c=>SPICY_CU.includes(c))){s-=1.5;why.push({t:t('whySpicy'),good:false})}
  if(PROF.veg&&(p.veg||has(p,['vegetarian','vegan']))){s+=1.5;why.push({t:t('whyVeg'),good:true})}
  if(PROF.budget&&p.price){  // 只有有人均数据的店才按预算调整
    if(p.price.min>PROF.budget){s-=2;why.push({t:t('whyOverBudget'),good:false})}
    else if(p.price.max<=PROF.budget){s+=0.5;why.push({t:t('whyInBudget'),good:true})}
  }
  const rs=PER.recentStore[p.oid];
  if(rs!=null){s-=2.5;why.push({t:t('whyRecent',{ago:agoTxt(rs)}),good:false})}
  else if(p.cu.some(c=>PER.recentCu[c])){s-=1;why.push({t:t('whyRecentCu'),good:false})}
  // 场合
  const [cb,cr]=ctxBoost(p,d); if(cb){s+=cb;if(cr)why.push({t:cr,good:true})}
  const hb=PER.habit[CTX.key]; let habitHit=false; if(hb&&p.cu.some(c=>hb[c]>=2)){habitHit=true;s+=1;why.push({t:t('ctxHabit',{slot:t('slot_'+CTX.slot+(CTX.weekday?'':'_we'))}),good:true})}
  // 「没选这家」的回答
  if(PER.tmpNo.some(x=>x.key===CTX.key&&x.cu.some(c=>p.cu.includes(c)))){s-=2;why.push({t:t('whyTmpNo'),good:false})}
  if(PROF.nearBias) s-=PROF.nearBias*d/Math.max(maxDist(),1);
  if(PROF.dishBias&&p.dish&&p.dish.s==='site') s+=PROF.dishBias*0.5;          // 「为什么选它：招牌菜吸引我」
  if(PROF.priceRef&&p.price&&p.price.min>PROF.priceRef*1.5) s-=0.5;            // 「为什么选它：价格合适」
  if(PROF.noFast&&p.fastChain){s-=4;why.push({t:t('whyFast'),good:false})}      // 「不推荐快餐连锁」
  else if(PROF.favBrands&&PROF.favBrands.some(b=>p.brand&&(p.brand===b||p.brand.startsWith(b)))){s+=1.5;why.push({t:t('whyUberFav'),good:true})}
  const cl=PROF.ctxLikes&&PROF.ctxLikes[CTX.key];  // Uber：这个场合常点的类别
  if(cl&&!habitHit&&cl.some(id=>kwIs(id,p))){s+=0.8;why.push({t:t('ctxHabit',{slot:t('slot_'+CTX.slot+(CTX.weekday?'':'_we'))}),good:true})}
  if(PROF.softBudget&&p.price&&p.price.min>=PROF.softBudget&&!(PROF.budget&&p.price.min>PROF.budget)){s-=1;why.push({t:t('whyPricey'),good:false})}
  return {s,why};
}
const personalized=()=>PROF.likes.length>0||HIST.length>0||PROF.spice===0||PROF.veg||!!PROF.favBrands||!!PROF.noFast;
function whyHTML(r){
  const w=r.fit.why; if(!w.length) return '';
  return `<div class="why-row">${w.map(x=>`<span class="why ${x.good?'good':'bad'}">${esc(x.t)}</span>`).join('')}</div>`;
}

let NEAR=[], RES=[], POOL=[], FAV=[], HROWS=[], limit=40, selected=null, picked=null;
function compute(){
  CTX=ctxNow();
  const w0=startW(), maxD=maxDist(), q=S.q.trim().toLowerCase();
  const dLat=maxD/111000, dLng=maxD/(111000*Math.cos(S.lat*rad));
  NEAR=[]; RES=[];
  for(const p of P){
    if(Math.abs(p.lat-S.lat)>dLat||Math.abs(p.lng-S.lng)>dLng) continue;
    const r=row(p,w0); if(r.d>maxD||!visible(r.st)) continue;
    NEAR.push(r);
    if(matches(p,S.kw,q)&&!(PROF.noFast&&p.fastChain&&!(q&&p.name.toLowerCase().includes(q)))) RES.push(r);  // 不推荐快餐：只有直接搜店名时才显示
  }
  const open=r=>['ok','tight','soon'].includes(r.st.k)?0:r.st.k==='unk'?1:2;
  RES.sort(S.sort==='near'?((a,b)=>a.d-b.d):S.sort==='fit'?((a,b)=>open(a)-open(b)||b.fit.s-a.fit.s||a.d-b.d):((a,b)=>RANK[a.st.k]-RANK[b.st.k]||a.d-b.d));
  // 随便吃：只看范围内、符合心情的店；有能吃上的就只从能吃上的里抽
  const mood=NEAR.filter(r=>matches(r.p,S.mood,''));
  const ok=mood.filter(r=>r.st.k==='ok');
  POOL=(ok.length?ok:mood.filter(r=>r.st.k!=='closed')).filter(r=>r.fit.s>-9&&!(PROF.noFast&&r.p.fastChain));  // 给过 👎 的、设了不推荐的快餐连锁，都不抽
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
const priceHTML=p=>p.price?`<span class="price num">${esc(t('priceTag',{min:p.price.min,max:p.price.max}))}</span>`:'';
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
  segBtns($('findn-seg'),[[10,'10'],[15,'15'],[20,'20']],S.findN||10,v=>{S.findN=+v;save();renderControls();renderList()});
}

/* ---------- 随便吃：先问两个「当下」的问题，再给 N 张推荐卡（稳的 / 换换口味 / 来点惊喜 / 另一个选择）----------
   长期口味来自口味问卷、Uber 导入和「吃过了」；这里的问题只管这一顿。算法见 SPEC.md 第 5 节。 */
const RQ=[['hunger',['snack','meal','treat']],['taste',['light','bold','soup','new','any']],['avoid',null]];  // 第 3 题：今天想吃（want）/ 不想吃（avoid）的菜系，三态点选，可以不选
const REC_NS=[3,5,7,10,15,20];
let SA=LS.get('sessionQ',null); if(!SA||Date.now()-SA.at>3*3600e3) SA=null;  // 3 小时内的回答还算数
let rqStep=0, REC=null, recDirty=true, SHOWN=new Set(), lateOnly=false;
// 菜系组（沿用 KW「菜系」）和相邻表：「换换口味」从喜欢的菜系的邻居里挑
const GROUPS=KW[0].items.map(([n,l])=>({n,cu:l}));
const groupsOf=p=>p._g||(p._g=GROUPS.filter(g=>p.cu.some(c=>g.cu.includes(c))).map(g=>g.n));
const NEIGH={'中餐':['日料','韩餐','越南','东南亚'],'日料':['韩餐','中餐','海鲜'],'韩餐':['日料','中餐'],'越南':['泰国','东南亚','中餐'],'泰国':['越南','东南亚','印度/南亚'],
  '东南亚':['越南','泰国','中餐'],'印度/南亚':['中东','泰国','非洲'],'中东':['希腊/地中海','印度/南亚','非洲'],'希腊/地中海':['意大利','中东','欧洲'],'意大利':['欧洲','希腊/地中海'],
  '欧洲':['意大利','希腊/地中海'],'墨西哥/拉美':['加勒比','美式'],'加勒比':['墨西哥/拉美','非洲'],'非洲':['加勒比','中东','印度/南亚'],'美式':['墨西哥/拉美','欧洲'],'海鲜':['日料','希腊/地中海']};
// 这一顿的口味方向 → 加分 / 减分的菜系（数据里的 cuisine 值）
const TASTE_MAP={
  light:{plus:['vietnamese','pho','japanese','sushi','salad','poke','greek','mediterranean','seafood','congee'],minus:['burger','fried_chicken','chicken','wings','pizza','hot_dog','fries','poutine']},
  bold:{plus:['sichuan','szechuan','hunan','indian','pakistani','korean','barbecue','bbq','shawarma','kebab','jamaican','caribbean','mexican','thai'],minus:['salad','juice','sandwich']},
  soup:{plus:['ramen','noodle','noodles','pho','vietnamese','hotpot','hot_pot','udon','soup','congee','korean'],minus:['salad','sushi','ice_cream','juice']},
};
const TREAT=['steak_house','steak','sushi','izakaya','french','italian','seafood','korean_bbq','fine_dining'];
// Beta 分布抽样（汤普森采样用）：两个 Gamma 相除，Gamma 用 Marsaglia–Tsang 方法
function randn(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function gammaS(k){
  if(k<1) return gammaS(k+1)*Math.pow(Math.random(),1/k);
  const d=k-1/3,c=1/Math.sqrt(9*d);
  for(;;){let x,v;do{x=randn();v=1+c*x}while(v<=0);v=v*v*v;const u=Math.random();
    if(u<1-0.0331*x*x*x*x||Math.log(u)<0.5*x*x+d*(1-v+Math.log(v))) return d*v}
}
const betaS=(a,b)=>{const x=gammaS(a),y=gammaS(b);return x/(x+y)};
// 2 周内「不要这家」、1 天内「看过没选」的店不再出现
const nopeSet=()=>new Set(LS.get('nope',[]).filter(x=>Date.now()-x.at<14*DAY).map(x=>x.oid));
const passSet=()=>new Set(LS.get('pass',[]).filter(x=>Date.now()-x.at<DAY).map(x=>x.oid));
function learn(p,kind){  // 反馈 → 菜系组的口味分（weights）和汤普森采样的 alpha / beta
  const w=PROF.w||(PROF.w={}), bd=PROF.bandit||(PROF.bandit={});
  for(const g of groupsOf(p)){
    const b=bd[g]||(bd[g]={a:1,b:1});
    if(kind==='ate'){w[g]=Math.min(3,(w[g]||0)+0.5);b.a+=1}
    else if(kind==='nope'){w[g]=Math.max(-3,(w[g]||0)-0.3);b.b+=1}
    else if(kind==='pass'){b.b+=0.3}  // 看过没选：很轻的「不想吃」
  }
  saveProf();
}
(function decay(){  // 口味分随时间淡化：每天 ×0.98
  const days=(Date.now()-(PROF.wAt||Date.now()))/DAY;
  if(PROF.w&&days>=1) for(const k in PROF.w) PROF.w[k]*=Math.pow(0.98,days);
  PROF.wAt=Date.now(); saveProf();
})();
function recCandidates(){
  const nope=nopeSet(), pass=passSet();
  return NEAR.filter(r=>{
    const p=r.p;
    if(!['ok','tight','soon','unk'].includes(r.st.k)) return false;
    if(S.show==='eat'&&r.st.k==='unk') return false;
    if(r.fit.s<=-9||nope.has(p.oid)||pass.has(p.oid)||SHOWN.has(p.oid)) return false;
    if(PROF.noFast&&p.fastChain) return false;
    if(SA&&SA.hunger==='treat'&&p.type!==0) return false;          // 犒劳自己：只要正经餐厅
    if(lateOnly&&!lateNight(p)) return false;                        // 从夜宵提醒进来
    if(SA&&SA.avoid&&SA.avoid.length&&groupsOf(p).some(g=>SA.avoid.includes(g))) return false;  // 今天不想吃
    if(SA&&SA.want&&SA.want.length&&!groupsOf(p).some(g=>SA.want.includes(g))) return false;   // 今天想吃：只从这些菜系里挑
    return true;
  });
}
function recScore(r,samp){  // 在现有口味分（喜欢、评分、场合、Uber、预算…）上叠加 SPEC 第 5.2 节的各项
  const p=r.p, gs=groupsOf(p), now=Date.now(), isNew=SA&&SA.taste==='new';
  let s=r.fit.s, extra=[];
  s+=Math.max(-3,Math.min(3,gs.reduce((a,g)=>a+((PROF.w&&PROF.w[g])||0),0)));   // 口味分
  s+=gs.length?Math.max(...gs.map(g=>samp[g]||0)):samp._none;                      // 探索分（汤普森采样）
  if(SA){
    const m=TASTE_MAP[SA.taste];
    if(m){ if(p.cu.some(c=>m.plus.includes(c))){s+=2;extra.push(t('ans_'+SA.taste))} else if(p.cu.some(c=>m.minus.includes(c))) s-=2 }
    if(SA.hunger==='treat'&&p.cu.some(c=>TREAT.includes(c))){s+=2;extra.push(t('ans_treat'))}
    if(SA.hunger==='meal'&&p.type===0) s+=1;
  }
  for(const h of HIST){  // 最近吃过：同一菜系组 7 天内按时间衰减扣分；同一家 3 天内重扣
    const age=(now-h.t)/DAY; if(age>7) continue;
    if(h.oid===p.oid&&age<3) s-=5;
    const hg=h.g||(h.g=GROUPS.filter(g=>(h.cu||[]).some(c=>g.cu.includes(c))).map(g=>g.n));
    if(hg.some(g=>gs.includes(g))) s-=1.5*Math.pow(0.5,age/3)*(isNew?2:1);
  }
  s-=0.05*r.tm;                          // 距离
  if(r.st.k==='unk') s-=0.8;             // 营业时间未知
  return {s,extra};
}
function newRecs(){
  const n=S.recN||3, isNew=SA&&SA.taste==='new', k=isNew?3:1.5, bd=PROF.bandit||{}, samp={};
  for(const g of GROUPS) samp[g.n]=betaS((bd[g.n]||{a:1}).a,(bd[g.n]||{b:1}).b)*k;
  samp._none=betaS(1,1)*k;
  const cand=recCandidates().map(r=>{const x=recScore(r,samp);return {r,s:x.s,extra:x.extra,g:groupsOf(r.p)}}).sort((a,b)=>b.s-a.s);
  const out=[], used=new Set(), taken=new Set();
  const eaten=HIST.map(h=>h.g||(h.g=GROUPS.filter(g=>(h.cu||[]).some(c=>g.cu.includes(c))).map(g=>g.n)));
  const eaten14=new Set(HIST.filter(h=>Date.now()-h.t<14*DAY).flatMap(h=>h.g||[]));
  const everAte=new Set(eaten.flat());
  const liked=new Set([...Object.keys(PROF.w||{}).filter(g=>PROF.w[g]>0),...PROF.likes.filter(x=>x.startsWith('菜系:')).map(x=>x.slice(3)),...eaten14]);
  const disliked=new Set(PROF.likes.filter(x=>x.startsWith('!菜系:')).map(x=>x.slice(4)));
  const take=(c,role,why)=>{out.push({r:c.r,role,why,extra:c.extra});taken.add(c.r.p.oid);c.g.forEach(g=>used.add(g))};
  const fresh=c=>!taken.has(c.r.p.oid)&&(!c.g.length||c.g.every(g=>!used.has(g)));
  // 1 稳的：总分最高
  if(cand[0]) take(cand[0],'safe');
  // 2 换换口味：喜欢的菜系的邻居，而且这个邻居 14 天内没吃过
  const nb=new Set([...liked].flatMap(g=>NEIGH[g]||[]).filter(g=>!eaten14.has(g)&&!liked.has(g)&&!disliked.has(g)));
  const ch=cand.find(c=>fresh(c)&&c.g.some(g=>nb.has(g)));
  if(ch&&n>=2){
    const to=ch.g.find(g=>nb.has(g)), from=[...liked].find(g=>(NEIGH[g]||[]).includes(to));
    const times=HIST.filter(h=>Date.now()-h.t<7*DAY&&(h.g||[]).includes(from)).length;
    take(ch,'change',times?t('whyChangeN',{n:times,from:kwText(from),to:kwText(to)}):t('whyChange',{to:kwText(to)}));
  }
  // 3 来点惊喜：没吃过、不算喜欢也没排除的菜系；只要正经餐厅、营业时间确定；有官网的略加分
  if(n>=3){
    const sp=cand.filter(c=>fresh(c)&&c.r.p.type===0&&c.r.st.k!=='unk'&&c.g.length&&c.g.every(g=>!everAte.has(g)&&!((PROF.w&&PROF.w[g])>0)&&!disliked.has(g)&&!liked.has(g)))
      .map(c=>({c,s:c.s+(c.r.p.web?0.5:0)})).sort((a,b)=>b.s-a.s)[0];
    if(sp) take(sp.c,'surprise',t('whySurprise',{x:kwText(sp.c.g[0])}));
  }
  // 其余：不同菜系里的下一个高分；菜系用完了再允许重复
  for(const c of cand){ if(out.length>=n) break; if(fresh(c)) take(c,'other') }
  for(const c of cand){ if(out.length>=n) break; if(!taken.has(c.r.p.oid)) take(c,'other') }
  // 前三个位置按固定顺序排：稳的、换换口味、来点惊喜
  const order={safe:0,change:1,surprise:2,other:3}; out.sort((a,b)=>order[a.role]-order[b.role]);
  REC=out; recDirty=false; out.forEach(x=>SHOWN.add(x.r.p.oid));
}
function refreshRecs(){  // 数据刷新（每分钟、改了口味）时：店不变，只更新状态和理由
  if(!REC) return;
  const by=new Map(NEAR.map(r=>[r.p.oid,r]));
  REC=REC.map(x=>by.has(x.r.p.oid)?{...x,r:by.get(x.r.p.oid)}:x);
}
function recCard(x,i){
  const r=x.r, p=r.p, ohSrc=overrides[p.oid]||p.oh||'';
  const role=x.role==='other'?'roleOther':'role_'+x.role;
  const reasons=[x.why,...x.extra,...r.fit.why.filter(w=>w.good).map(w=>w.t)].filter(Boolean);
  const reason=[...new Set(reasons)].slice(0,2).join(' · ');
  return `<article class="rec" data-o="${esc(p.oid)}">
    <div class="rec-top"><span class="role r-${x.role}">${esc(t(role))}</span><span class="rec-walk num">${r.tm} ${esc(t('minUnit'))} · ${esc(modeL())}</span></div>
    <div class="pn">${esc(p.name)}${p.zh&&p.zh!==p.name?`<small>${esc(p.zh)}</small>`:''}</div>
    <div class="tags">${gHTML(p)}${tagHTML(p)}<span>${typeName(p.type)}</span>${priceHTML(p)}<span class="num">${distTxt(r.d)}</span></div>
    ${reason?`<div class="reason">💡 ${esc(reason)}</div>`:''}
    ${dishHTML(p)}
    <div class="st"><span class="pill ${r.st.k}">${esc(r.st.t)}</span>${r.st.k==='unk'?`<span class="hint small">${esc(t('unkWarn'))}</span>`:''}</div>
    <div class="rec-acts">
      <a class="btn primary" href="${gdir(p)}" target="_blank" rel="noopener" data-nav="${esc(p.oid)}">${esc(t('goNav'))}</a>
      <button class="btn" type="button" data-ate="${esc(p.oid)}">${esc(t('ateThis'))}</button>
      <button class="btn ghost" type="button" data-nope-rec="${i}">${esc(t('nopeRec'))}</button>
      <button class="star" type="button" data-fav="${esc(p.oid)}" aria-pressed="${favs.has(p.oid)}" title="${esc(t('fav'))}">★</button>
    </div>
    <details class="rec-more"><summary>${esc(t('more'))}</summary>
      <div class="more-in">
        <div>${esc([p.addr,p.city].filter(Boolean).join(', ')||t('noAddr'))}</div>
        <div class="links"><a href="${gmaps(p)}" target="_blank" rel="noopener">${esc(t('gmapsReviews'))}</a>${/^https?:/.test(p.web)?`<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(t('website'))}</a>`:''}${telHTML(p)}</div>
        <div>${srcHTML(p)}</div>
        <div class="ohedit"><input class="in" id="oh-${esc(p.oid)}" value="${esc(ohSrc)}" placeholder="${esc(t('ohPh'))}"><button class="btn" type="button" data-oh="${esc(p.oid)}">${esc(t('ohSave'))}</button></div>
      </div>
    </details>
  </article>`;
}
function renderRand(){
  const box=$('rand-body');
  if((!SA||!SA.at)&&rqStep<RQ.length){  // 当下的问题：一屏一题，可以跳过或直接推荐
    const [q,opts]=RQ[rqStep];
    box.innerHTML=`<div class="rq">
      <div class="rq-top"><span class="num rq-step">${rqStep+1} / ${RQ.length}</span><button type="button" class="linkbtn" data-rq="direct">${esc(t('rqDirect'))}</button></div>
      <h2>${esc(t('rq_'+q))}</h2>
      ${opts?`<div class="rq-opts">${opts.map(o=>`<button type="button" class="rq-opt" data-rq="${q}|${o}">${esc(t('rq_'+q+'_'+o))}</button>`).join('')}</div>
      <button type="button" class="linkbtn" data-rq="skip">${esc(t('qzSkip'))}</button>`
      :`<p class="hint">${t('tapHint')}</p><div class="chips">${GROUPS.map(g=>{const st=((SA&&SA.want)||[]).includes(g.n)?'yes':((SA&&SA.avoid)||[]).includes(g.n)?'no':'';return `<button type="button" class="chip" data-rq-avoid="${esc(g.n)}" aria-pressed="${st==='yes'}" data-st="${st}">${esc(kwText(g.n))}</button>`}).join('')}</div>
      <button type="button" class="btn primary rq-go" data-rq="skip">${esc(t(((SA&&SA.avoid)||[]).length||((SA&&SA.want)||[]).length?'rqAvoidGo':'rqAvoidNone'))}</button>`}
    </div>`;
    return;
  }
  if(recDirty||!REC) newRecs(); else refreshRecs();
  const ans=SA&&SA.at?[SA.hunger&&t('rq_hunger_'+SA.hunger),SA.taste&&t('rq_taste_'+SA.taste),SA.want&&SA.want.length&&t('rqWantSum',{x:SA.want.map(kwText).join(LANG==='zh'?'、':', ')}),SA.avoid&&SA.avoid.length&&t('rqAvoidSum',{x:SA.avoid.map(kwText).join(LANG==='zh'?'、':', ')})].filter(Boolean).join(' · '):'';
  box.innerHTML=`<div class="rec-head">
      <div class="ctx-line">${esc(ctxLine())}${ans?` · ${esc(ans)}`:''}${lateOnly?` · 🌙`:''}</div>
      <div class="row"><span class="hint">${esc(t('recShow'))}</span><div class="seg" id="rec-n"></div></div>
    </div>
    ${REC.length?`<div class="rec-list">${REC.map(recCard).join('')}</div>`:`<div class="empty-pick">${esc(t(NEAR.length?'emptyMood':'emptyNear'))}</div>`}
    <div class="rec-foot"><button type="button" class="btn primary" data-rec="more">${esc(t('recMore'))}</button><button type="button" class="btn ghost" data-rec="redo">${esc(t('recRedo'))}</button></div>`;
  segBtns($('rec-n'),REC_NS.map(v=>[v,String(v)]),S.recN||3,v=>{S.recN=+v;save();SHOWN=new Set();recDirty=true;renderRand()});
  REC.forEach(x=>gFetch(x.r.p));  // 看到的店：查 Google 评分和营业时间（有缓存、每天有上限）
}
function answerRQ(v){  // SA.at 有值 = 这一轮问题答完了；答到一半时 SA 里只有已答的题
  const d=SA&&!SA.at?SA:{};
  if(v==='direct') SA=Object.assign(d,{at:Date.now()});
  else { if(v!=='skip'){const [q,o]=v.split('|'); d[q]=o} rqStep++; SA=d; if(rqStep>=RQ.length) SA.at=Date.now() }
  if(SA.at){ LS.set('sessionQ',SA); SHOWN=new Set(); recDirty=true; compute() }
  renderRand();
}
function passShown(){  // 「换一批」：这批里没选的，算轻微的「不想吃」，1 天内不再出现
  const l=LS.get('pass',[]).filter(x=>Date.now()-x.at<DAY);
  for(const x of REC||[]){ if(x.acted) continue; learn(x.r.p,'pass'); l.push({oid:x.r.p.oid,at:Date.now()}) }
  LS.set('pass',l);
}
function nopeRec(i){  // 「不想吃这个」：2 周内不再出现，当场换一张，提示里可以撤销
  const x=REC[i]; if(!x) return;
  const p=x.r.p, l=LS.get('nope',[]).filter(y=>Date.now()-y.at<14*DAY); l.push({oid:p.oid,at:Date.now()}); LS.set('nope',l);
  const before={w:JSON.stringify(PROF.w||{}),b:JSON.stringify(PROF.bandit||{})};
  learn(p,'nope'); persona(); compute();
  const cand=recCandidates().filter(r=>!REC.some(y=>y.r.p.oid===r.p.oid));
  const used=new Set(REC.filter((_,j)=>j!==i).flatMap(y=>groupsOf(y.r.p)));
  const alt=cand.find(r=>groupsOf(r.p).every(g=>!used.has(g)))||cand[0];
  if(alt){ REC[i]={r:alt,role:x.role==='safe'?'safe':'other',why:'',extra:[]}; SHOWN.add(alt.p.oid) } else REC.splice(i,1);
  renderRand();
  toast(t('nopeToast',{name:p.name}),()=>{  // 撤销
    LS.set('nope',LS.get('nope',[]).filter(y=>y.oid!==p.oid));
    PROF.w=JSON.parse(before.w); PROF.bandit=JSON.parse(before.b); saveProf(); persona(); compute();
    if(alt) SHOWN.delete(alt.p.oid); REC[i]=x; if(!alt) REC.splice(i,0,x); renderRand();
  });
  askSkip(p.oid,true);  // 顺便问一句原因（可以不理）
}

/* ---------- 看了但没选 / 选了：问一句为什么 ----------
   自动追问：看了 8 秒以上又换掉才问；同一家只问一次；两次至少隔 1 分钟；「我的」里可以关掉。
   「不要这家…」和「为什么选它」是用户自己点的或刚做完决定，不受间隔限制（关掉追问后也不问「为什么选」）。 */
const ASK_VIEW=8e3, ASK_GAP=60e3;
let seen={oid:null,at:0,engaged:false,acted:false,timer:null};   // 随便吃：当前这张卡
let fseen={oid:null,at:0,acted:false};                           // 找一家：当前展开的那家
const askedSkip=new Set();
const canAsk=()=>!PROF.noAsk&&Date.now()-LS.get('askT',0)>ASK_GAP;
const markActed=oid=>{if(seen.oid===oid)seen.acted=true;if(fseen.oid===oid)fseen.acted=true;(REC||[]).forEach(x=>{if(x.r.p.oid===oid)x.acted=true})};
const askBox=()=>$(S.view==='find'?'skip-ask-find':S.view==='fav'?'skip-ask-fav':'skip-ask');
function askSkip(oid,manual){  // 没选这家：为什么？manual=用户自己点了「不要这家…」
  const p=P.find(x=>x.oid===oid); if(!p) return;
  askedSkip.add(oid); if(!manual) LS.set('askT',Date.now());
  const box=askBox(); box.hidden=false; box.dataset.oid=oid; box.dataset.manual=manual?'1':'';
  box.innerHTML=`<span>${t(manual?'nopeQ':'skipQ',{name:esc(p.name)})}</span><span class="chips small">${['far','cu','price','hours','look'].filter(k=>!(manual&&k==='look')).map(k=>`<button type="button" class="chip" data-skip="${k}">${esc(t('skip_'+k))}</button>`).join('')}</span><button type="button" class="linkbtn" data-skip="x" aria-label="${esc(t('close'))}">✕</button>`;
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function answerSkip(k,box){
  const p=P.find(x=>x.oid===box.dataset.oid), manual=box.dataset.manual==='1'; box.hidden=true;
  if(!p) return;
  if(k==='x') return;
  if(k==='far') PROF.nearBias=Math.min(2,(PROF.nearBias||0)+0.7);
  else if(k==='cu'){const l=LS.get('tmpNo',[]).filter(x=>x.until>Date.now());l.push({cu:p.cu,key:CTX.key,until:Date.now()+DAY});LS.set('tmpNo',l)}
  else if(k==='price'&&p.price) PROF.softBudget=Math.min(PROF.softBudget||999,p.price.min);
  else if(k==='hours'&&S.show!=='eat'){S.show='eat';save();renderControls()}
  if(k!=='look'){profChanged();compute()}
  if(S.view==='rand'){ refreshRecs(); renderRand() }
  else if(manual&&selected===p.oid){ selected=null; fseen={oid:null,at:0,acted:false}; renderPanel() }
  else if(k!=='look') renderPanel();
  toast(t(k==='look'?'toastOk':k==='hours'?'skipHoursDone':k==='price'&&!p.price?'skipNoPrice':'skipDone'));
}
// 选了这家（导航或记了吃过）：为什么选它？同一家 12 小时内只问一次
function askWhyPick(oid){
  const p=P.find(x=>x.oid===oid); if(!p||PROF.noAsk) return;
  const asked=LS.get('askedWhy',{}); if(Date.now()-(asked[oid]||0)<12*3600e3) return;
  asked[oid]=Date.now(); LS.set('askedWhy',asked);
  const box=askBox(); box.hidden=false; box.dataset.oid=oid;
  box.innerHTML=`<span>${t('whyQ',{name:esc(p.name)})}</span><span class="chips small">${['near','cu','dish','price','random'].map(k=>`<button type="button" class="chip" data-whypick="${k}">${esc(t('why_'+k))}</button>`).join('')}</span><button type="button" class="linkbtn" data-whypick="x" aria-label="${esc(t('close'))}">✕</button>`;
}
function answerWhyPick(k,box){
  const p=P.find(x=>x.oid===box.dataset.oid); box.hidden=true;
  if(!p||k==='x') return;
  if(k==='near') PROF.nearBias=Math.min(2,(PROF.nearBias||0)+0.3);
  else if(k==='cu'){const l=LS.get('ctxPick',[]);l.push({cu:p.cu,ctx:CTX.key,t:Date.now()});LS.set('ctxPick',l.slice(-200))}  // 记进这个场合的习惯
  else if(k==='dish') PROF.dishBias=Math.min(2,(PROF.dishBias||0)+0.5);
  else if(k==='price'&&p.price) PROF.priceRef=p.price.max;
  if(k!=='random'){profChanged();compute();renderPanel()}
  toast(t('toastOk'));
}

/* ---------- Google 评分和营业时间：只给正在看的店查 ----------
   第一步 Text Search 只要 id（这个 SKU 免费、不限量），id 存下来以后不再找；
   第二步 Place Details 拿评分、评论数、营业时间（Enterprise SKU，每月 1000 次免费）。
   key 只存在这台设备上（「我的」里填），不进 GitHub；App 里每天最多查 GDAILY 次，Google 后台另设每日上限。 */
const GDAILY=30;
const gKey=()=>LS.get('gkey','');
function gUsage(){const d=new Date().toISOString().slice(0,10),u=LS.get('gcount',null);return u&&u.d===d?u:{d,n:0}}
const gPending=new Set(); let gErr='';
function gToIv(periods){  // Google 的 periods（周日=0）→ 我们的周分钟区间（周一=0）
  const out=[];
  for(const pr of periods||[]){
    if(!pr.open) continue;
    const o=((pr.open.day+6)%7)*1440+pr.open.hour*60+(pr.open.minute||0);
    if(!pr.close) return [[0,10080]];  // 没有关门时间 = 24 小时营业
    let c=((pr.close.day+6)%7)*1440+pr.close.hour*60+(pr.close.minute||0); if(c<=o) c+=10080;
    out.push([o,c]);
  }
  return out.length?out:null;
}
async function gFetch(p){
  const key=gKey(); if(!key||!p||gPending.has(p.oid)) return;
  const c=GP[p.oid];
  if(c&&(Date.now()-c.t<DAY||(c.none&&Date.now()-c.t<7*DAY))) return;  // 一天内查过就用缓存；没找到的一周内不再找
  if(gUsage().n>=GDAILY) return;
  gPending.add(p.oid); refreshG(p.oid);
  try{
    const H={'X-Goog-Api-Key':key};
    const search=async(q,near)=>{  // 找对应的 Google 地点：只要 id（这一步免费），拿前 3 个候选；near=只在附近约 200 米内找
      const dLa=0.0018, dLo=0.0025;
      const where=near?{locationRestriction:{rectangle:{low:{latitude:p.lat-dLa,longitude:p.lng-dLo},high:{latitude:p.lat+dLa,longitude:p.lng+dLo}}}}
                      :{locationBias:{circle:{center:{latitude:p.lat,longitude:p.lng},radius:300}}};
      const r=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{...H,'Content-Type':'application/json','X-Goog-FieldMask':'places.id'},
        body:JSON.stringify({textQuery:q,...where,pageSize:3})});
      const j=await r.json(); if(!r.ok) throw new Error((j.error&&j.error.message)||('HTTP '+r.status));
      return (j.places||[]).map(x=>x.id);
    };
    let ids=c&&c.id?[c.id]:await search([p.name,p.addr,p.city].filter(Boolean).join(' '));
    if(!ids.length){GP[p.oid]={t:Date.now(),none:1};saveGP();return}
    // 同一个地址 Google 常有一条「已永久关闭」的旧条目（改过名、搬过家）：第一个候选是关门的，就看下一个近的候选，
    // 只有附近没有开着的候选，才认定这家关门了。最多查 2 个，省额度。
    let best=null;
    for(const id of ids.slice(0,2)){
      if(gUsage().n>=GDAILY) break;
      const uu=gUsage(); uu.n++; LS.set('gcount',uu);
      const r=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=${LANG==='zh'?'zh-CN':'en'}`,
        {headers:{...H,'X-Goog-FieldMask':'id,location,rating,userRatingCount,currentOpeningHours,regularOpeningHours,businessStatus,googleMapsUri'}});
      const d=await r.json(); if(!r.ok) throw new Error((d.error&&d.error.message)||('HTTP '+r.status));
      const off=d.location?dist(p.lat,p.lng,d.location.latitude,d.location.longitude):0;
      if(off>(best?150:400)) continue;  // 位置对不上：多半找错了店
      const e={id,t:Date.now(),r:d.rating??null,n:d.userRatingCount||0,url:d.googleMapsUri||'',st:d.businessStatus||'',
        iv:gToIv((d.currentOpeningHours||d.regularOpeningHours||{}).periods)};
      if(!best||(best.st==='CLOSED_PERMANENTLY'&&e.st!=='CLOSED_PERMANENTLY')) best=e;
      if(best.st!=='CLOSED_PERMANENTLY') break;
    }
    // 带地址搜只找到一条、而且是关门的旧条目：只用店名再搜一次（免费），看附近有没有开着的那条
    if(best&&best.st==='CLOSED_PERMANENTLY'&&ids.length<2&&gUsage().n<GDAILY){
      const more=(await search(p.name,true)).filter(x=>x!==best.id).slice(0,1);  // 只在附近找，最多再查 1 次
      for(const id of more){
        const uu=gUsage(); uu.n++; LS.set('gcount',uu);
        const r=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=${LANG==='zh'?'zh-CN':'en'}`,
          {headers:{...H,'X-Goog-FieldMask':'id,location,rating,userRatingCount,currentOpeningHours,regularOpeningHours,businessStatus,googleMapsUri'}});
        const d=await r.json(); if(!r.ok) break;
        if(d.location&&dist(p.lat,p.lng,d.location.latitude,d.location.longitude)>150) break;  // 不在同一个地方，不是这家
        if(d.businessStatus!=='CLOSED_PERMANENTLY') best={id,t:Date.now(),r:d.rating??null,n:d.userRatingCount||0,url:d.googleMapsUri||'',st:d.businessStatus||'',
          iv:gToIv((d.currentOpeningHours||d.regularOpeningHours||{}).periods)};
        break;
      }
    }
    GP[p.oid]=best||{t:Date.now(),none:1};
    saveGP(); gErr='';
  }catch(e){ gErr=String(e.message||e).slice(0,160) }
  finally{ gPending.delete(p.oid); schedCache.clear(); update(); if(S.view==='me') renderMe() }
}
function refreshG(oid){ document.querySelectorAll(`[data-g="${CSS.escape(oid)}"]`).forEach(el=>{el.outerHTML=gHTML(P.find(p=>p.oid===oid))}) }
function gHTML(p){  // 卡片上的 Google 评分
  if(!p||!gKey()) return '';
  const g=GP[p.oid], a=`data-g="${esc(p.oid)}"`;
  if(gPending.has(p.oid)) return `<span class="grate loading" ${a}>${esc(t('gLoading'))}</span>`;
  if(!g||g.none) return `<span ${a} hidden></span>`;
  if(g.st==='CLOSED_PERMANENTLY'||g.st==='CLOSED_TEMPORARILY') return `<span ${a} hidden></span>`;  // 关门的状态已经显示在营业状态里
  if(g.r==null) return `<span ${a} hidden></span>`;
  return `<a class="grate" ${a} href="${/^https:\/\//.test(g.url)?esc(g.url):gmaps(p)}" target="_blank" rel="noopener">⭐ <b class="num">${g.r.toFixed(1)}</b> <small>${esc(t('gReviews',{n:g.n.toLocaleString()}))}</small></a>`;
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
      <div class="tags">${gHTML(p)}${tagHTML(p)}<span>${typeName(p.type)}</span>${priceHTML(p)}<span class="num">${distTxt(r.d)}</span>${p.veg?`<span>${esc(t('vegFriendly'))}</span>`:''}</div>
      ${dishHTML(p)}
      ${whyHTML(r)}
      <div class="st"><span class="pill ${r.st.k}">${esc(r.st.t)}</span></div></div>
    <div class="acts"><button class="star" type="button" data-fav="${esc(p.oid)}" aria-pressed="${favs.has(p.oid)}" title="${esc(t('fav'))}">★</button></div>
    <div class="more">
      <div>${esc([p.addr,p.city].filter(Boolean).join(', ')||t('noAddr'))}</div>
      <div class="links"><a href="${gmaps(p)}" target="_blank" rel="noopener">${esc(t('gmapsReviews'))}</a><a href="${gdir(p)}" target="_blank" rel="noopener" data-nav="${esc(p.oid)}">${esc(t('navTo',{mode:modeL()}))}</a>${/^https?:/.test(p.web)?`<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(t('website'))}</a>`:''}${telHTML(p)}<button class="linkbtn" type="button" data-ate="${esc(p.oid)}">${esc(t('ateBefore'))}</button><button class="linkbtn" type="button" data-nope="${esc(p.oid)}">${esc(t('nopeBtn'))}</button></div>
      <div>${srcHTML(p)}</div>
      <div class="ohedit"><input class="in" id="oh-${esc(p.oid)}" value="${esc(ohSrc)}" placeholder="${esc(t('ohPh'))}"><button class="btn" type="button" data-oh="${esc(p.oid)}">${esc(t('ohSave'))}</button>${overrides[p.oid]?`<button class="btn" type="button" data-ohx="${esc(p.oid)}">${esc(t('ohReset'))}</button>`:''}</div>
    </div>
  </div>`;
}
function renderList(){
  $('list-h').textContent=t('found',{n:Math.min(RES.length,S.findN||10)});
  const N=S.findN||10;  // 不放长列表：只显示前 N 家（10 / 15 / 20），想看别的就改条件
  $('cards').innerHTML=RES.length?RES.slice(0,N).map(card).join('')+(RES.length>N?`<div class="showmore hint">${esc(t('findMoreHint',{n:RES.length-N}))}</div>`:''):`<div class="empty">${esc(t('emptyList'))}${S.show!=='all'?'<br>'+esc(t('emptyListClosed')):''}</div>`;
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
  renderPush();
  $('me-likes').innerHTML=PROF_GROUPS.map(([g,ids])=>`<div class="kg"><span class="lab">${esc(gText(g))}</span><div class="chips">${ids.map(id=>{const st=chipSt(PROF.likes,id);return `<button type="button" class="chip" data-like="${esc(id)}" aria-pressed="${st==='yes'}" data-st="${st}">${st==='yes'?'❤️ ':''}${esc(kwLabel(id))}</button>`}).join('')}</div></div>`).join('');
  segBtns($('me-spice'),[['',t('spiceUnset')],['0',t('spice0')],['1',t('spice1')],['2',t('spice2')]],PROF.spice==null?'':PROF.spice,v=>{PROF.spice=v===''?null:+v;profChanged()});
  segBtns($('me-veg'),[['0',t('vegAny')],['1',t('vegPref')]],PROF.veg?'1':'0',v=>{PROF.veg=v==='1';profChanged()});
  segBtns($('me-budget'),[['',t('budgetAny')],...[15,25,40].map(n=>[String(n),t('budgetUpTo',{n})])],PROF.budget==null?'':PROF.budget,v=>{PROF.budget=v===''?null:+v;profChanged()});
  const gu=gUsage();
  $('g-status').textContent=gKey()?t('gStatusOn',{n:gu.n,max:GDAILY})+(gErr?' · '+t('gErrTxt',{e:gErr}):''):t('gStatusOff');
  segBtns($('me-fast'),[['0',t('fastYes')],['1',t('fastNo')]],PROF.noFast?'1':'0',v=>{PROF.noFast=v==='1';profChanged();recDirty=true});
  segBtns($('me-ask'),[['1',t('askOn')],['0',t('askOff')]],PROF.noAsk?'0':'1',v=>{PROF.noAsk=v==='0';profChanged()});
  const hs=[...HIST].sort((a,b)=>b.t-a.t).slice(0,50);
  $('me-hist-h').textContent=HIST.length?t('meHistN',{n:HIST.length}):t('meHist');
  $('me-hist').innerHTML=hs.length?hs.map(h=>{const d=new Date(h.t);return `<div class="hrow">
    <span class="num hdate">${d.getMonth()+1}/${d.getDate()}</span>
    <span class="hname">${esc(h.name)}</span>
    <span class="seg hrate">${RATE.map(([v,l])=>`<button type="button" data-hrate="${h.t}|${v}" aria-pressed="${h.r===v}">${esc(t(l))}</button>`).join('')}</span>
    <button type="button" class="linkbtn" data-hdel="${h.t}" title="${esc(t('delTitle'))}">${esc(t('del'))}</button></div>`}).join(''):`<div class="empty">${esc(t('meHistEmpty'))}</div>`;
}
function profChanged(){saveProf();persona();if(personalized()&&!LS.get('fitSortSet',false)){S.sort='fit';save();LS.set('fitSortSet',true);renderControls()}renderMe();compute();renderFav()}
function histChanged(){saveHist();persona();profChanged()}
function ate(oid,r){
  const p=P.find(x=>x.oid===oid); if(!p) return;
  const last=HIST.find(h=>h.oid===oid&&Date.now()-h.t<12*3600e3);  // 12 小时内同一家算同一顿
  if(last) last.r=r; else HIST.push({oid,name:p.name,cu:p.cu,t:Date.now(),r,ctx:CTX.key});  // ctx：当时的场合，用来学习「什么场合吃什么」
  learn(p,r===-1?'nope':'ate');
  (REC||[]).forEach(x=>{if(x.r.p.oid===oid)x.acted=true});
  markActed(oid);
  histChanged(); toast(t(r===1?'toastGood':r===-1?'toastBad':'toastOk'));
}
function askRate(el,oid){  // 在按钮旁边问「好吃吗」
  el.outerHTML=`<span class="rateask">${esc(t('rateAsk'))}${RATE.map(([v,l])=>`<button type="button" class="btn ${v===1?'primary':''}" data-rate="${esc(oid)}|${v}">${esc(t(l))}</button>`).join('')}</span>`;
}
function toast(msg,undo){  // undo：给一个「撤销」按钮，6 秒内有效
  const el=$('toast'); el.innerHTML=''; el.append(document.createTextNode(msg));
  if(undo){const b=document.createElement('button');b.type='button';b.className='toast-undo';b.textContent=t('undo');b.onclick=()=>{el.hidden=true;undo()};el.append(b)}
  el.hidden=false; clearTimeout(toast.h); toast.h=setTimeout(()=>el.hidden=true,undo?6000:2600);
}
// 点了导航之后，下次打开时问一句
// 夜宵提示：Uber 数据说你常在深夜点（nightOwl），或者「吃过了」里深夜吃过 3 次以上
const nightOwl=()=>!!PROF.nightOwl||HIST.filter(h=>/:late$/.test(h.ctx||'')).length>=3;
function checkNight(){
  const el=$('night-banner'), today=new Date().toDateString();
  const show=CTX.slot==='late'&&S.when==='now'&&nightOwl()&&LS.get('nightAsked','')!==today&&!lateOnly;
  el.hidden=!show; if(!show) return;
  el.innerHTML=`<span>${esc(t('nightQ'))}</span><span class="rateask"><button type="button" class="btn primary" data-night="go">${esc(t('nightGo'))}</button><button type="button" class="btn ghost" data-night="no">${esc(t('nightNo'))}</button></span>`;
}
function checkPending(){
  const pd=LS.get('pending',null); if(!pd){$('ask-banner').hidden=true;return}
  const age=Date.now()-pd.t;
  if(age>18*3600e3){LS.set('pending',null);$('ask-banner').hidden=true;return}
  if(age<25*60e3){$('ask-banner').hidden=true;return}  // 刚出门，还没吃
  $('ask-banner').hidden=false;
  $('ask-banner').innerHTML=`<span>${t('askLast',{name:esc(pd.name)})}</span><span class="rateask">${RATE.map(([v,l])=>`<button type="button" class="btn ${v===1?'primary':''}" data-rate="${esc(pd.oid)}|${v}">${esc(t('askAte',{r:t(l).replace(/^[^ ]+ /,'')}))}</button>`).join('')}<button type="button" class="btn ghost" data-pending-no>${esc(t('askNo'))}</button></span>`;
}

function renderFoot(){
  const withH=P.filter(p=>p.oh).length, nSite=P.filter(p=>!p.oh&&p.siteOh).length, nChain=P.filter(p=>!p.oh&&!p.siteOh&&p.ohChain).length;
  const nd=P.filter(p=>p.dish).length, np=P.filter(p=>p.price).length, known=withH+nSite+nChain;
  const v={ts:DATA.ts.slice(0,10),ov:DATA.overture||'',total:P.length.toLocaleString(),withH:withH.toLocaleString(),site:nSite.toLocaleString(),chain:nChain.toLocaleString(),
    pct:Math.round(known/P.length*100),n:nd.toLocaleString(),np:np.toLocaleString()};
  $('foot').innerHTML=['foot1','foot2','foot3','foot4'].map(k=>`<p>${esc(t(k,v))}</p>`).join('');
}

/* ---------- views ---------- */
function renderView(){
  document.querySelector('.stage').dataset.view=S.view;
  for(const v of ['rand','find','fav','me']){$('view-'+v).hidden=S.view!==v;$('tab-'+v).setAttribute('aria-selected',S.view===v)}
}
function setView(v){S.view=v;save();renderView();renderPanel();window.scrollTo({top:0})}
function renderPanel(){
  if(S.view==='rand') renderRand();
  else if(S.view==='find'){renderNearby();renderList()}
  else if(S.view==='me') renderMe();
  else renderFav();
}
function update(fit){
  if(fit) recDirty=true;  // 位置、交通方式、时间变了：推荐卡重新挑
  compute(); checkNight();
  renderClock();renderQuery();renderFav();renderPanel();
}

/* ---------- interactions ---------- */
function setLoc(lat,lng,name,acc,key){S.lat=+lat;S.lng=+lng;S.locName=name||'';S.locKey=key||null;S.acc=acc||null;save();limit=40;picked=null;selected=null;closePops();update(true);loadWeather()}
function select(oid,scroll){
  const prev=fseen;
  selected=selected===oid&&!scroll?null:oid;
  // 找一家：展开看了 8 秒以上、什么都没做就换去看别的（或者收起来），问一句
  if(prev.oid&&prev.oid!==selected&&!prev.acted&&Date.now()-prev.at>ASK_VIEW&&!askedSkip.has(prev.oid)&&canAsk()) askSkip(prev.oid);
  fseen=selected?{oid:selected,at:Date.now(),acted:false}:{oid:null,at:0,acted:false};
  if(selected) gFetch(P.find(x=>x.oid===selected));  // 展开一家：查 Google 评分和营业时间
  if(scroll){const idx=RES.findIndex(x=>x.p.oid===oid);if(idx>=limit){limit=idx+10}}
  renderPanel();
  if(scroll){const el=document.getElementById('c-'+oid);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'})}
}
function closePops(){for(const id of ['loc','when']){$('pop-'+id).hidden=true;$('tok-'+id).setAttribute('aria-expanded','false')}}
for(const id of ['loc','when']) $('tok-'+id).onclick=e=>{e.stopPropagation();const open=$('pop-'+id).hidden;closePops();if(open){$('pop-'+id).hidden=false;$('tok-'+id).setAttribute('aria-expanded','true');if(id==='loc'){renderRecent();setTimeout(()=>$('loc-q').focus(),0)}}};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePops()});
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
$('when-day').onchange=e=>{S.whenDay=+e.target.value;save();update(true)};
$('when-time').onchange=e=>{S.whenTime=e.target.value||'18:30';save();update(true)};
let qt=null;$('q').value=S.q;$('q').oninput=e=>{clearTimeout(qt);qt=setTimeout(()=>{S.q=e.target.value;limit=40;update()},150)};
$('clear').onclick=()=>{S.kw=[];S.q='';$('q').value='';save();renderKW();update()};
$('about-btn').onclick=()=>$('about').showModal();
document.querySelector('.tabs').onclick=e=>{const t=e.target.closest('[data-view]');if(t)setView(t.dataset.view)};
document.addEventListener('click',e=>{
  if(!e.target.closest('.pop,.tok')) closePops();
  const sg=e.target.closest('[data-sug]'); if(sg){useAddr(sugs[+sg.dataset.sug]);return}
  const rl=e.target.closest('[data-rl]'); if(rl){const r=LS.get('recentLocs',[])[+rl.dataset.rl];if(r)useAddr({main:r.n,lat:r.lat,lng:r.lng});return}
  const k=e.target.closest('[data-k]'); if(k){toggleKW(k.dataset.k);return}
  const ra=e.target.closest('[data-rq-avoid]'); if(ra){if(!SA||SA.at)SA={};const w=SA.want||(SA.want=[]),a=SA.avoid||(SA.avoid=[]),g=ra.dataset.rqAvoid,wi=w.indexOf(g),ai=a.indexOf(g);
    if(wi>=0){w.splice(wi,1);a.push(g)}else if(ai>=0)a.splice(ai,1);else w.push(g);renderRand();return}  // 没选 → 想吃 → 不想吃 → 没选
  const rq=e.target.closest('[data-rq]'); if(rq){answerRQ(rq.dataset.rq);return}
  const rc=e.target.closest('[data-rec]'); if(rc){
    if(rc.dataset.rec==='more'){passShown();persona();compute();recDirty=true;renderRand();window.scrollTo({top:0,behavior:'smooth'})}
    else{SA=null;LS.set('sessionQ',null);rqStep=0;SHOWN=new Set();renderRand()}
    return}
  const nr=e.target.closest('[data-nope-rec]'); if(nr){nopeRec(+nr.dataset.nopeRec);return}
  const nope=e.target.closest('[data-nope]'); if(nope){const o=nope.dataset.nope;markActed(o);const l=LS.get('nope',[]).filter(y=>Date.now()-y.at<14*DAY);l.push({oid:o,at:Date.now()});LS.set('nope',l);const pp=P.find(x=>x.oid===o);if(pp){learn(pp,'nope');toast(t('nopeToast',{name:pp.name}),()=>{LS.set('nope',LS.get('nope',[]).filter(y=>y.oid!==o));renderPanel()})}askSkip(o,true);return}
  const nt=e.target.closest('[data-night]'); if(nt){LS.set('nightAsked',new Date().toDateString());$('night-banner').hidden=true;
    if(nt.dataset.night==='go'){lateOnly=true;SHOWN=new Set();recDirty=true;setView('rand')}return}
  const sk=e.target.closest('[data-skip]'); if(sk){answerSkip(sk.dataset.skip,sk.closest('.skip-ask'));return}
  const wp=e.target.closest('[data-whypick]'); if(wp){answerWhyPick(wp.dataset.whypick,wp.closest('.skip-ask'));return}
  const nav=e.target.closest('[data-nav]'); if(nav){const o=nav.dataset.nav;markActed(o);const p=P.find(x=>x.oid===o);if(p){LS.set('pending',{oid:p.oid,name:p.name,t:Date.now()});setTimeout(()=>askWhyPick(o),300)}return}
  const at=e.target.closest('[data-ate]'); if(at){askRate(at,at.dataset.ate);return}
  const rt=e.target.closest('[data-rate]'); if(rt){const [o,v]=rt.dataset.rate.split('|');ate(o,+v);const pd=LS.get('pending',null);if(pd&&pd.oid===o)LS.set('pending',null);checkPending();rt.closest('.rateask')?.replaceWith(Object.assign(document.createElement('span'),{className:'rated',textContent:t('rated')}));renderPanel();if(+v!==-1)askWhyPick(o);return}
  if(e.target.closest('[data-pending-no]')){LS.set('pending',null);checkPending();return}
  const lk=e.target.closest('[data-like]'); if(lk){cycle(PROF.likes,lk.dataset.like);profChanged();return}
  const hr=e.target.closest('[data-hrate]'); if(hr){const [t,v]=hr.dataset.hrate.split('|');const h=HIST.find(x=>x.t===+t);if(h){h.r=h.r===+v?null:+v;histChanged()}return}
  const hd=e.target.closest('[data-hdel]'); if(hd){HIST=HIST.filter(x=>x.t!==+hd.dataset.hdel);histChanged();return}
  const f=e.target.closest('[data-fav]'); if(f){const o=f.dataset.fav;markActed(o);favs.has(o)?favs.delete(o):favs.add(o);LS.set('favs',[...favs]);f.setAttribute('aria-pressed',favs.has(o));compute();renderFav();if(S.view==='fav'||S.kw.includes('场景:我收藏的'))update();return}
  const oh=e.target.closest('[data-oh]'); if(oh){const o=oh.dataset.oh;const v=document.getElementById('oh-'+o).value.trim();
    if(v&&!parseOH(v)){oh.insertAdjacentHTML('afterend',`<span class="err">${esc(t('ohBad'))}</span>`);return}
    if(v)overrides[o]=v;else delete overrides[o];LS.set('oh',overrides);update();return}
  const ox=e.target.closest('[data-ohx]'); if(ox){delete overrides[ox.dataset.ohx];LS.set('oh',overrides);update();return}
  if(e.target.closest('a,input,button,select,.leaflet-container')) return;
  const c=e.target.closest('.card'); if(c){select(c.dataset.o,false)}
});
setInterval(()=>{if(S.when==='now'){update();loadWeather()}else renderClock()},60000);

$('me-export').onclick=()=>{
  const blob=new Blob([JSON.stringify({v:1,exported:new Date().toISOString(),profile:PROF,history:HIST,favs:[...favs]},null,1)],{type:'application/json'});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`${t('exportName')}-${new Date().toISOString().slice(0,10)}.json`});
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
};
function importText(text){  // 导入备份或 Uber 口味档案（文件或粘贴的文字都走这里）
  try{
    const j=JSON.parse(String(text||'').trim());
    if(j.profile){for(const k of ['spice','veg','budget','diet','explore','ctx','noAsk','noFast','favBrands','ctxLikes','nightOwl']) if(j.profile[k]!==undefined&&j.profile[k]!==null) PROF[k]=j.profile[k]; PROF.likes=[...new Set([...PROF.likes,...(j.profile.likes||[])])]}
    if(Array.isArray(j.history)){const seen=new Set(HIST.map(h=>h.oid+'|'+h.t));for(const h of j.history) if(h&&h.oid&&h.t&&!seen.has(h.oid+'|'+h.t)) HIST.push({oid:h.oid,name:h.name||'',cu:h.cu||[],t:+h.t,r:h.r??null})}
    if(Array.isArray(j.favs)){j.favs.forEach(o=>favs.add(o));LS.set('favs',[...favs])}
    if(!j.profile&&!j.history&&!j.favs) throw new Error('empty');
    histChanged(); toast(t('imported')); return true;
  }catch(err){toast(t('importBad')); return false}
}
$('me-import').onchange=async e=>{ const f=e.target.files[0]; if(f) importText(await f.text()); e.target.value='' };
// 粘贴导入：配合苹果的通用剪贴板，在 Mac 上复制、手机上点这里就行；读不了剪贴板时退回手动粘贴的输入框
$('me-paste').onclick=async()=>{
  try{ const txt=await navigator.clipboard.readText(); if(txt&&importText(txt)) return }catch(err){}
  const box=$('paste-box'); box.hidden=false; $('paste-ta').focus();
};
$('paste-go').onclick=()=>{ if(importText($('paste-ta').value)){ $('paste-ta').value=''; $('paste-box').hidden=true } };
/* ---------- 口味问卷：第一次打开时出现，可跳过；「我的」里可以重做 ---------- */
const DIETS=['dietNone','dietVeg','dietVegan','dietHalal','dietNoPork','dietNoBeef','dietNoSeafood','dietGF','dietAllergy'];
// 滑动卡片：16 个菜系 + 12 个「想吃点」，右滑喜欢、左滑不感兴趣、上滑/点「无所谓」跳过
const EMOJI={'中餐':'🥟','日料':'🍱','韩餐':'🥘','越南':'🥖','泰国':'🥥','东南亚':'🍢','印度/南亚':'🍛','中东':'🥙','希腊/地中海':'🫒','意大利':'🍝','欧洲':'🥐',
  '墨西哥/拉美':'🌮','加勒比':'🌴','非洲':'🍲','美式':'🥩','海鲜':'🦞','热汤面':'🍜','辣的':'🌶️','米饭':'🍚','烤肉':'🍖','寿司':'🍣','披萨':'🍕','汉堡炸鸡':'🍔',
  '三明治/轻食':'🥗','早餐':'🍳','甜品':'🍰','奶茶':'🧋','咖啡':'☕'};
const DECK=[...KW[0].items.map(([n,l])=>({id:'菜系:'+n,n,ex:Array.isArray(l)?l:[]})),...KW[1].items.map(([n,l])=>({id:'想吃点:'+n,n,ex:Array.isArray(l)?l:[]}))];
const DECK_IDS=DECK.map(c=>c.id);
const CTXQ=[['lunch',['quick','sit','any']],['fri',['bold','sit','any']],['rain',['soup','hotpot','any']]];  // 问卷里的场合题
const QSTEPS=['intro','diet','spice','swipe','budget','explore','fast','ctx','habit','favs','result'];
let QZ=null;
function quizOpen(){
  const sw={}; for(const id of DECK_IDS){if(PROF.likes.includes(id))sw[id]=1;else if(PROF.likes.includes('!'+id))sw[id]=-1}
  QZ={i:0,diet:[...(PROF.diet||[])],spice:PROF.spice,noFast:PROF.noFast??null,sw,k:0,budget:PROF.budget,explore:PROF.explore,ctx:Object.assign({},PROF.ctx||{}),
      mode:S.mode,mins:S.mins,area:'',favs:[],q:'',found:[]};
  const d=$('quiz'); if(!d.open) d.showModal(); quizRender();
}
function swipeCard(){  // 当前这张卡
  const c=DECK[QZ.k]; if(!c) return '';
  const ex=[...new Set(c.ex.map(cz))].slice(0,4).join(LANG==='zh'?'、':', ');
  const prev=QZ.sw[c.id];
  return `<div class="sw-stack"><div class="sw-card" id="sw-card" tabindex="0">
    <div class="sw-emoji" aria-hidden="true">${EMOJI[c.n]||'🍽️'}</div>
    <div class="sw-name">${esc(kwLabel(c.id))}</div>
    ${ex?`<div class="sw-ex">${esc(ex)}</div>`:''}
    ${prev!=null?`<div class="sw-prev">${esc(t(prev===1?'swPrevLike':'swPrevNo'))}</div>`:''}
    <div class="sw-stamp like">❤️</div><div class="sw-stamp no">👎</div>
  </div></div>
  <div class="sw-btns"><button type="button" class="sw-btn no" data-sw="-1" aria-label="${esc(t('swNo'))}">👎<small>${esc(t('swNo'))}</small></button>
    <button type="button" class="sw-btn meh" data-sw="0">${esc(t('swMeh'))}</button>
    <button type="button" class="sw-btn like" data-sw="1" aria-label="${esc(t('swLike'))}">❤️<small>${esc(t('swLike'))}</small></button></div>`;
}
function swipe(v){  // v：1 喜欢 / -1 不感兴趣 / 0 无所谓
  const c=DECK[QZ.k]; if(!c) return;
  if(v) QZ.sw[c.id]=v; else delete QZ.sw[c.id];
  const el=$('sw-card');
  const go=()=>{QZ.k++; if(QZ.k>=DECK.length){QZ.i++;} quizRender()};
  if(el&&!matchMedia('(prefers-reduced-motion: reduce)').matches){el.style.transition='transform .22s ease-out, opacity .22s';el.style.transform=v===1?'translateX(140%) rotate(18deg)':v===-1?'translateX(-140%) rotate(-18deg)':'translateY(-120%)';el.style.opacity='0';setTimeout(go,200)}
  else go();
}
function bindSwipe(){  // 手指拖动卡片
  const el=$('sw-card'); if(!el) return;
  let x0=0,y0=0,dx=0,dy=0,drag=false;
  el.addEventListener('pointerdown',e=>{drag=true;x0=e.clientX;y0=e.clientY;el.setPointerCapture(e.pointerId);el.style.transition='none'});
  el.addEventListener('pointermove',e=>{if(!drag)return;dx=e.clientX-x0;dy=e.clientY-y0;el.style.transform=`translate(${dx}px,${Math.min(0,dy)}px) rotate(${dx/18}deg)`;el.dataset.lean=dx>40?'like':dx<-40?'no':''});
  const end=()=>{if(!drag)return;drag=false;el.dataset.lean='';
    if(dx>90)swipe(1);else if(dx<-90)swipe(-1);else if(dy<-90)swipe(0);else{el.style.transition='transform .2s';el.style.transform=''}
    dx=dy=0};
  el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end);
  el.addEventListener('keydown',e=>{if(e.key==='ArrowRight')swipe(1);else if(e.key==='ArrowLeft')swipe(-1);else if(e.key==='ArrowUp')swipe(0)});
}
function quizClose(){LS.set('onboarded',true);$('quiz').close()}
const qOpt=(attr,val,on,label)=>`<button type="button" class="chip qopt" ${attr}="${esc(val)}" aria-pressed="${!!on}">${esc(label)}</button>`;
function quizRender(){
  const step=QSTEPS[QZ.i], n=QSTEPS.length-2, body=$('quiz-body');
  let h='', foot='';
  const nav=(next='qzNext',skip=true)=>`<button type="button" class="btn ghost" data-qz="back">${esc(t('qzBack'))}</button>${skip?`<button type="button" class="btn ghost" data-qz="skip">${esc(t('qzSkip'))}</button>`:''}<button type="button" class="btn primary" data-qz="next">${esc(t(next))}</button>`;
  const head=(k,sub)=>`<div class="qz-prog"><span style="width:${Math.round(QZ.i/n*100)}%"></span></div><div class="qz-step num">${t('qzStep',{i:QZ.i,n})}</div><h2>${esc(t(k))}</h2>${sub?`<p class="hint">${esc(sub)}</p>`:''}`;
  if(step==='intro'){
    h=`<h2 class="qz-title">${esc(t('qzTitle'))}</h2><p class="hint">${esc(t('qzIntro'))}</p>`;
    foot=`<button type="button" class="btn ghost" data-qz="close">${esc(t('qzSkipAll'))}</button><button type="button" class="btn primary" data-qz="next">${esc(t('qzStart'))}</button>`;
  }else if(step==='diet'){
    const notes=[];
    if(QZ.diet.some(d=>['dietHalal','dietNoPork','dietNoBeef','dietGF'].includes(d))) notes.push(`<p class="qz-note">${esc(t('qzDietNote'))}</p>`);
    if(QZ.diet.includes('dietAllergy')) notes.push(`<p class="qz-note warn">⚠️ ${esc(t('qzAllergyNote'))}</p>`);
    h=head('qzDiet',t('qzMulti'))+`<div class="chips">${DIETS.map(d=>qOpt('data-qdiet',d,QZ.diet.includes(d),t(d))).join('')}</div>`+notes.join('');
    foot=nav();
  }else if(step==='spice'){
    h=head('qzSpice')+`<div class="chips">${[[0,'spice0'],[1,'spice1'],[2,'spiceMid'],[3,'spice3']].map(([v,k])=>qOpt('data-qspice',v,QZ.spice===v,t(k))).join('')}</div>`;
    foot=nav();
  }else if(step==='swipe'){
    h=head('qzSwipe',t('qzSwipeHint'))+`<div class="sw-count num">${Math.min(QZ.k+1,DECK.length)} / ${DECK.length}</div>`+swipeCard();
    foot=`<button type="button" class="btn ghost" data-qz="back">${esc(t('qzBack'))}</button><button type="button" class="btn ghost" data-qz="next">${esc(t('swSkipRest'))}</button>`;
  }else if(step==='ctx'){
    h=head('qzCtx',t('qzCtxHint'))+CTXQ.map(([q,opts])=>`<div class="qz-ctx"><div class="qz-ctx-q">${esc(t('qzCtx_'+q))}</div><div class="chips">${opts.map(o=>qOpt('data-qctx',q+'|'+o,QZ.ctx[q]===o,t('ctxOpt_'+q+'_'+o))).join('')}</div></div>`).join('');
    foot=nav();
  }else if(step==='budget'){
    h=head('qzBudget')+`<div class="chips">${[[15,'budget15'],[25,'budget25'],[40,'budget40'],['','budgetFree']].map(([v,k])=>qOpt('data-qbudget',v,String(QZ.budget??'')===String(v),t(k))).join('')}</div><p class="hint small">${esc(t('budgetHint'))}</p>`;
    foot=nav();
  }else if(step==='fast'){
    h=head('qzFast')+`<div class="chips">${[[0,'fastYes'],[1,'fastNo']].map(([v,k])=>qOpt('data-qfast',v,QZ.noFast===!!v&&QZ.noFast!=null,t(k))).join('')}</div>`;
    foot=nav();
  }else if(step==='explore'){
    h=head('qzExplore')+`<div class="chips">${[0,1,2].map(v=>qOpt('data-qexplore',v,QZ.explore===v,t('explore'+v))).join('')}</div>`;
    foot=nav();
  }else if(step==='habit'){
    h=head('qzHabit',t('qzHabitHint'))+`<div class="chips">${Object.entries(MODES).map(([k,m])=>qOpt('data-qmode',k,QZ.mode===k,m.ico+' '+t(m.k))).join('')}</div>
      <div class="chips">${MINS.map(v=>qOpt('data-qmins',v,QZ.mins===v,v+' '+t('minUnit'))).join('')}</div>
      <label class="lab" for="qz-area">${esc(t('qzArea'))} · ${esc(t('qzOptional'))}</label>
      <select id="qz-area" class="in"><option value="">${esc(t('pickArea'))}</option>${HOODS.map((hd,i)=>`<option value="${i}"${String(QZ.area)===String(i)?' selected':''}>${esc(hoodName(hd))}</option>`).join('')}</select>`;
    foot=nav();
  }else if(step==='favs'){
    const added=QZ.favs.map(o=>P.find(p=>p.oid===o)).filter(Boolean);
    h=head('qzFavs',t('qzFavsHint')+' '+t('qzOptional'))+`<input id="qz-fav-q" class="in" type="search" placeholder="${esc(t('qzFavsPh'))}" value="${esc(QZ.q)}" autocomplete="off">
      <div class="qz-found">${QZ.q.length>=2?(QZ.found.length?QZ.found.map(p=>`<button type="button" class="qz-hit" data-qfav="${esc(p.oid)}"><b>${esc(p.name)}</b><small>${esc([p.addr,p.city].filter(Boolean).join(', '))}</small></button>`).join(''):`<p class="hint">${esc(t('qzFavsNone'))}</p>`):''}</div>
      ${added.length?`<div class="chips">${added.map(p=>`<button type="button" class="chip" data-qunfav="${esc(p.oid)}" aria-pressed="true">👍 ${esc(p.name)} ✕</button>`).join('')}</div>`:''}`;
    foot=nav('qzDone');
  }else{  // result
    const picks=[...NEAR].filter(r=>r.fit.s>-9&&['ok','tight','soon'].includes(r.st.k)).sort((a,b)=>b.fit.s-a.fit.s||a.d-b.d);
    const out=[], seen=new Set();
    for(const r of picks){const k=(r.fit.why.find(x=>x.good)||{}).t||r.p.cu[0]||r.p.name;if(seen.has(k))continue;seen.add(k);out.push(r);if(out.length===3)break}  // 3 家尽量对应不同的喜好
    h=`<h2 class="qz-title">${esc(t('qzResult'))}</h2>`+(out.length?`<div class="cards">${out.map(card).join('')}</div>`:`<p class="hint">${esc(t('qzResultNone'))}</p>`);
    foot=`<button type="button" class="btn primary" data-qz="close">${esc(t('qzGo'))}</button>`;
  }
  body.innerHTML=h; $('quiz-foot').innerHTML=foot;
  if(step==='favs'){const i=$('qz-fav-q');i.oninput=()=>{QZ.q=i.value.trim();quizSearch();const pos=i.selectionStart;quizRender();const j=$('qz-fav-q');j.focus();j.setSelectionRange(pos,pos)}}
  if(step==='habit') $('qz-area').onchange=e=>{QZ.area=e.target.value};
  if(step==='swipe') bindSwipe();
  body.scrollTop=0;
}
function quizSearch(){
  const q=QZ.q.toLowerCase(); if(q.length<2){QZ.found=[];return}
  const hits=[], seen=new Set();
  for(const p of P){ if(!(p.name.toLowerCase().includes(q)||p.zh.includes(QZ.q))) continue;
    const k=p.name+'|'+p.addr; if(seen.has(k)) continue; seen.add(k); hits.push({p,d:dist(S.lat,S.lng,p.lat,p.lng)}) }
  QZ.found=hits.sort((a,b)=>a.d-b.d).slice(0,6).map(x=>x.p);
}
function quizApply(){  // 把问卷答案写进口味档案
  const keep=PROF.likes.filter(x=>!DECK_IDS.includes(x.replace(/^!/,'')));  // 卡片没覆盖的（比如场景标签）保留
  const likes=Object.entries(QZ.sw).map(([id,v])=>v===1?id:'!'+id);
  if(QZ.spice===3&&!likes.includes('想吃点:辣的')) likes.push('想吃点:辣的');
  if(QZ.diet.includes('dietNoSeafood')&&!likes.includes('!菜系:海鲜')) likes.push('!菜系:海鲜');
  PROF.likes=[...new Set([...keep,...likes])];
  PROF.diet=QZ.diet.filter(d=>d!=='dietNone');
  PROF.veg=PROF.diet.includes('dietVeg')||PROF.diet.includes('dietVegan');
  if(QZ.spice!=null) PROF.spice=Math.min(2,QZ.spice);
  PROF.budget=QZ.budget===''?null:QZ.budget; PROF.explore=QZ.explore; PROF.ctx=QZ.ctx; if(QZ.noFast!=null) PROF.noFast=QZ.noFast;
  for(const o of QZ.favs){const p=P.find(x=>x.oid===o);if(p&&!HIST.some(h=>h.oid===o&&h.r===1))HIST.push({oid:o,name:p.name,cu:p.cu,t:Date.now()-7*DAY,r:1})}
  S.mode=QZ.mode; S.mins=QZ.mins;
  if(QZ.area!==''){const i=+QZ.area,h=HOODS[i];S.lat=h[2];S.lng=h[3];S.locName=h[0];S.locKey='hood:'+i;S.acc=null}
  save(); saveHist(); LS.set('onboarded',true); histChanged(); limit=40; picked=null; update(true);
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#quiz')) return;
  const b=e.target.closest('[data-qz]');
  if(b){const a=b.dataset.qz;
    if(a==='close'){quizClose();if(QSTEPS[QZ.i]==='result'&&S.view!=='rand')setView('rand');return}
    if(a==='back'){
      if(QSTEPS[QZ.i]==='swipe'&&QZ.k>0){QZ.k--;quizRender();return}  // 卡片里：回到上一张
      QZ.i=Math.max(0,QZ.i-1); if(QSTEPS[QZ.i]==='swipe')QZ.k=DECK.length-1; quizRender(); return}
    if(a==='skip'){const st=QSTEPS[QZ.i];if(st==='diet')QZ.diet=[];if(st==='ctx')QZ.ctx={};if(st==='favs')QZ.favs=[]}
    if(QSTEPS[QZ.i]==='favs') quizApply();
    QZ.i=Math.min(QSTEPS.length-1,QZ.i+1); if(QSTEPS[QZ.i]==='swipe'&&QZ.k>=DECK.length)QZ.k=0; quizRender(); return}
  const sw=e.target.closest('[data-sw]'); if(sw){swipe(+sw.dataset.sw);return}
  const el=e.target.closest('[data-qdiet],[data-qspice],[data-qfast],[data-qctx],[data-qbudget],[data-qexplore],[data-qmode],[data-qmins],[data-qfav],[data-qunfav]'); if(!el) return;
  const d=el.dataset, tog=(arr,v)=>{const i=arr.indexOf(v);i>=0?arr.splice(i,1):arr.push(v)};
  if(d.qdiet){ if(d.qdiet==='dietNone') QZ.diet=QZ.diet.includes('dietNone')?[]:['dietNone']; else {QZ.diet=QZ.diet.filter(x=>x!=='dietNone');tog(QZ.diet,d.qdiet)} }
  else if(d.qspice!=null) QZ.spice=QZ.spice===+d.qspice?null:+d.qspice;
  else if(d.qfast!=null) QZ.noFast=QZ.noFast===(d.qfast==='1')?null:d.qfast==='1';
  else if(d.qctx){const [q,o]=d.qctx.split('|');QZ.ctx[q]=QZ.ctx[q]===o?undefined:o}
  else if(d.qbudget!=null) QZ.budget=String(QZ.budget??'')===d.qbudget?null:(d.qbudget===''?'':+d.qbudget);
  else if(d.qexplore!=null) QZ.explore=QZ.explore===+d.qexplore?null:+d.qexplore;
  else if(d.qmode) QZ.mode=d.qmode;
  else if(d.qmins) QZ.mins=+d.qmins;
  else if(d.qfav){if(!QZ.favs.includes(d.qfav))QZ.favs.push(d.qfav);QZ.q='';QZ.found=[]}
  else if(d.qunfav) QZ.favs=QZ.favs.filter(o=>o!==d.qunfav);
  quizRender();
});
$('quiz').addEventListener('cancel',()=>LS.set('onboarded',true));  // Esc 关掉也算跳过
$('qz-redo').onclick=()=>quizOpen();

/* ---------- 夜宵提醒：真推送（GitHub Actions 每晚发，见 .github/workflows/night-push.yml）----------
   这里只负责在手机上订阅，然后把「接收地址」（订阅信息）显示出来，交给 GitHub 的加密设置。 */
const VAPID_PUBLIC='BN-zyczdlZ4969rEG8yghKKuR1Q_VsKAHm_k24yRn9AqC0gt3jHaIauvXzRq5HKlzQphHWqXHwwwLh0i-sYvtno';
const pushOK=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
function b64u(s){const p='='.repeat((4-s.length%4)%4), b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))}
async function renderPush(){
  const box=$('push-box'); if(!box) return;
  if(!pushOK()||location.protocol!=='https:'){box.innerHTML=`<p class="hint">${esc(t('pushUnsupported'))}</p>`;return}
  const reg=await navigator.serviceWorker.ready, sub=await reg.pushManager.getSubscription();
  if(!sub){box.innerHTML=`<button type="button" class="btn primary" id="push-on">${esc(t('pushOn'))}</button>`;return}
  box.innerHTML=`<p class="hint">${esc(t('pushIsOn'))}</p>
    <details><summary>${esc(t('pushShowSub'))}</summary><p class="hint small">${esc(t('pushSubHint'))}</p>
      <textarea class="in push-sub" readonly rows="4">${esc(JSON.stringify(sub))}</textarea>
      <div class="row"><button type="button" class="btn" id="push-copy">${esc(t('pushCopy'))}</button></div></details>
    <div class="row"><button type="button" class="btn ghost" id="push-off">${esc(t('pushOff'))}</button></div>`;
}
document.addEventListener('click',async e=>{
  if(e.target.id==='push-on'){
    try{
      const perm=await Notification.requestPermission(); if(perm!=='granted'){toast(t('pushDenied'));return}
      const reg=await navigator.serviceWorker.ready;
      await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(VAPID_PUBLIC)});
      toast(t('pushSubscribed')); renderPush();
    }catch(err){toast(t('pushFail'))}
  }
  if(e.target.id==='push-copy'){const ta=document.querySelector('.push-sub');ta.select();try{await navigator.clipboard.writeText(ta.value);toast(t('pushCopied'))}catch{document.execCommand('copy');toast(t('pushCopied'))}}
  if(e.target.id==='push-off'){const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();toast(t('pushOffDone'));renderPush()}
});
$('g-save').onclick=()=>{const v=$('g-key').value.trim();if(!v)return;LS.set('gkey',v);$('g-key').value='';gErr='';toast(t('gSaved'));update();renderMe()};
$('g-clear').onclick=()=>{LS.set('gkey','');toast(t('gCleared'));update();renderMe()};

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
  applyStatic(); persona(); renderControls(); renderKW(); renderFoot(); checkPending();
  update(); if(S.view==='me') renderMe();
  if($('quiz').open) quizRender();
}
applyStatic();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkPending();checkNight()}});
checkPending();
renderControls();renderKW();renderFoot();renderView();
update(true);
loadWeather();
if(new URLSearchParams(location.search).get('night')==='1'){LS.set('nightAsked',new Date().toDateString());lateOnly=true;recDirty=true;setView('rand')}
if(!LS.get('onboarded',false)&&!PROF.likes.length&&!HIST.length) quizOpen();  // 第一次打开：口味问卷
})();
