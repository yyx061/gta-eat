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
const cz=c=>ZH[c]||c.replace(/_/g,' ');
const TYPE=['餐厅','快餐','咖啡馆','美食广场'];

/* ---------- places ---------- */
const DISH=window.DISH_DATA||{};
const P=DATA.rows.map((r,i)=>({i,name:r[0],zh:r[1],lat:r[2],lng:r[3],type:r[4],cu:r[5].map(k=>CUI[k]),oh:r[6],addr:r[7],city:r[8],veg:r[9],take:r[10],web:r[11],oid:r[12],phone:r[13]||'',src:r[14]||'o',ds:r[15]||'',dish:DISH[r[12]]}));
let overrides=LS.get('oh',{});
let favs=new Set(LS.get('favs',[]));

/* ---------- opening_hours parser (common OSM syntax) ---------- */
const DAYS={Mo:0,Tu:1,We:2,Th:3,Fr:4,Sa:5,Su:6};
const DN=['周一','周二','周三','周四','周五','周六','周日'];
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
  ['Union 站 / 金融区',43.6453,-79.3806],['唐人街 Spadina',43.6529,-79.3980],['多伦多大学',43.6629,-79.3957],['Yonge & Bloor',43.6709,-79.3857],['约克维尔',43.6708,-79.3915],
  ['King West',43.6440,-79.4000],['Liberty Village',43.6386,-79.4200],['Ossington / 三一贝尔伍兹',43.6470,-79.4200],['肯辛顿市场',43.6547,-79.4005],['韩国城 Bloor & Christie',43.6645,-79.4185],
  ['圣劳伦斯市场',43.6487,-79.3716],['Leslieville',43.6620,-79.3340],['希腊城 Danforth',43.6780,-79.3500],['Yonge & Eglinton',43.7067,-79.3985],['Don Mills',43.7350,-79.3440],
  ['北约克中心',43.7680,-79.4128],['Yonge & Finch',43.7806,-79.4155],['Fairview Mall',43.7780,-79.3440],['士嘉堡市中心',43.7757,-79.2578],['Agincourt',43.7854,-79.2785],
  ['太古广场 Kennedy & Steeles',43.8253,-79.3063],['万锦 Unionville',43.8680,-79.3120],['列治文山 Hwy 7 & Leslie',43.8465,-79.3780],['列治文山 Yonge & Major Mac',43.8765,-79.4390],['旺市都会中心 VMC',43.7942,-79.5273],
  ['密西沙加 Square One',43.5933,-79.6425],['Port Credit',43.5510,-79.5850],['怡陶碧谷 Kipling',43.6375,-79.5360],['宾顿市中心',43.6850,-79.7597],['奥克维尔市中心',43.4470,-79.6660],['皮克林',43.8359,-79.0860]
];
const S=Object.assign({lat:43.6532,lng:-79.3832,locName:'市政厅附近',when:'now',whenDay:0,whenTime:'18:30',mode:'walk',mins:15,view:'rand',show:'eat+unk',sort:'open',kw:[],mood:[],q:''},LS.get('state',{}));
S.kw=S.kw||[]; S.mood=S.mood||[];
if(S.walk&&!LS.get('state',{}).mins) S.mins=S.walk; // 旧版只有步行分钟数
if(!['rand','find','fav'].includes(S.view)) S.view='rand';
const save=()=>LS.set('state',{lat:S.lat,lng:S.lng,locName:S.locName,mode:S.mode,mins:S.mins,view:S.view,show:S.show,sort:S.sort,kw:S.kw,mood:S.mood,acc:S.acc,when:S.when,whenDay:S.whenDay,whenTime:S.whenTime});

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
function kwTest(id){if(KWI[id])return KWI[id];if(id.startsWith('c:')){const c=id.slice(2);return {g:'菜系',mode:'or',test:p=>p.cu.includes(c)}}return null}

/* ---------- travel modes ---------- */
// 直线距离 × 绕路系数 ÷ 速度 + 等车/取车时间。都是粗估；以后可换成地图服务的等时圈。
const MODES={
  walk:{l:'步行',ico:'🚶',spd:80,det:1.25,wait:0,g:'walking'},
  bike:{l:'骑车',ico:'🚲',spd:250,det:1.25,wait:1,g:'bicycling'},
  taxi:{l:'打车',ico:'🚕',spd:417,det:1.35,wait:4,g:'driving'}
};
const MINS=[5,10,15,20,30,45];
const M=()=>MODES[S.mode]||MODES.walk;
const tripMin=d=>{const m=M();return Math.max(1,Math.round(m.wait+d*m.det/m.spd))};
const maxDist=()=>{const m=M();return Math.max(0,S.mins-m.wait)*m.spd/m.det};

/* ---------- compute ---------- */
const R=6371000, rad=Math.PI/180;
function dist(a,b,c,d){const x=(d-b)*rad*Math.cos((a+c)/2*rad), y=(c-a)*rad;return Math.sqrt(x*x+y*y)*R}
function status(p,w0,tm){
  const iv=sched(p); if(!iv) return {k:'unk',t:'营业时间未知'};
  const w=(w0+tm)%10080, left=openAt(iv,w), need=p.type===0?45:20;
  if(left>=0){
    const close=hhmm(w+left);
    if(left>=need) return {k:'ok',t:`能吃上 · 营业到 ${close}`,left};
    return {k:'tight',t:`很赶 · 到店后只剩 ${left} 分钟（${close} 关）`,left};
  }
  const nx=nextOpen(iv,w);
  if(nx!==null&&nx<=60) return {k:'soon',t:`到了等 ${nx} 分钟开门`,wait:nx};
  if(nx===null) return {k:'closed',t:'这几天都不开'};
  const at=w+nx, day=Math.floor((at%10080)/1440), sameDay=Math.floor(w/1440)===Math.floor(at/1440)&&nx<1440;
  return {k:'closed',t:`到时已关门 · ${sameDay?'今天':DN[day]} ${hhmm(at)} 开`};
}
const statusOf=(p,w0,tm)=>{const st=status(p,w0,tm);if(st.k!=='unk'&&isGuess(p))st.t+=' · 按连锁店推测';return st};
const RANK={ok:0,tight:1,soon:2,unk:3,closed:4};
const visible=st=>S.show==='all'||['ok','tight','soon'].includes(st.k)||(S.show==='eat+unk'&&st.k==='unk');
const row=(p,w0)=>{const d=dist(S.lat,S.lng,p.lat,p.lng), tm=tripMin(d);return {p,d,tm,st:statusOf(p,w0,tm)}};
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
let NEAR=[], RES=[], POOL=[], FAV=[], limit=40, selected=null, picked=null;
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
  RES.sort(S.sort==='near'?((a,b)=>a.d-b.d):((a,b)=>RANK[a.st.k]-RANK[b.st.k]||a.d-b.d));
  // 随便吃：只看范围内、符合心情的店；有能吃上的就只从能吃上的里抽
  const mood=NEAR.filter(r=>matches(r.p,S.mood,''));
  const ok=mood.filter(r=>r.st.k==='ok');
  POOL=ok.length?ok:mood.filter(r=>r.st.k!=='closed');
  FAV=P.filter(p=>favs.has(p.oid)).map(p=>row(p,w0)).sort((a,b)=>a.d-b.d);
}

/* ---------- render helpers ---------- */
function segBtns(el,opts,val,on){el.innerHTML=opts.map(([v,l])=>`<button type="button" data-v="${esc(v)}" aria-pressed="${String(v)===String(val)}">${esc(l)}</button>`).join('');el.onclick=e=>{const b=e.target.closest('button');if(b)on(b.dataset.v)}}
function radios(el,opts,val,on){el.innerHTML=opts.map(([v,l])=>`<button type="button" role="radio" data-v="${esc(v)}" aria-checked="${String(v)===String(val)}">${l}</button>`).join('');el.onclick=e=>{const b=e.target.closest('button');if(b)on(b.dataset.v)}}
const distTxt=d=>d<1000?Math.round(d/10)*10+' m':(d/1000).toFixed(1)+' km';
const tripTxt=r=>`${M().l}约 ${r.tm} 分钟`;
const SRC={site:'据官网菜单',guess:'AI 推测',name:'据店名'};
function dishHTML(p){
  if(!p.dish) return '';
  return `<div class="dishes"><span class="lab">招牌</span>${p.dish.d.map(([a,b])=>`<span class="d"${b?` title="${esc(b)}"`:''}>${esc(a)}</span>`).join('')}<span class="src">${SRC[p.dish.s]||''}</span></div>`;
}
const tagHTML=p=>[...new Set(p.cu.map(cz))].slice(0,4).map(t=>`<span class="t">${esc(t)}</span>`).join('');
const telHTML=p=>p.phone?`<a href="tel:${esc(p.phone.replace(/[^+\d]/g,''))}">📞 ${esc(p.phone.replace(/^\+1\s?/,''))}</a>`:'';
function srcHTML(p){
  const s=[p.src.includes('o')&&'OpenStreetMap',p.src.includes('v')&&'Overture',p.src.includes('d')&&'多伦多卫生检查'].filter(Boolean).join('、');
  return `数据来源：${s}${p.ds?`（最近一次 ${esc(p.ds)}，说明还在营业）`:''}`;
}
function gmaps(p){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name,p.addr,p.city||'Ontario'].filter(Boolean).join(' '))}`}
function gdir(p){return `https://www.google.com/maps/dir/?api=1&origin=${S.lat},${S.lng}&destination=${p.lat},${p.lng}&travelmode=${M().g}`}

/* ---------- 条件 ---------- */
function renderQuery(){
  $('tok-loc').textContent=S.locName;
  const w=startW();
  $('tok-when').textContent=S.when==='now'?'现在':`${S.whenDay==0?'今天':S.whenDay==1?'明天':DN[Math.floor(w/1440)]} ${hhmm(w)}`;
  radios($('mode-seg'),Object.entries(MODES).map(([k,m])=>[k,`${m.ico} ${m.l}`]),S.mode,v=>{S.mode=v;save();limit=40;update(true)});
  radios($('mins-seg'),MINS.map(n=>[n,n]),S.mins,v=>{S.mins=+v;save();limit=40;update(true)});
  $('where').innerHTML=`当前出发点：<b>${esc(S.locName)}</b> <span class="num">${S.lat.toFixed(4)}, ${S.lng.toFixed(4)}</span>${S.acc?` · 精度约 ±<span class="num">${Math.round(S.acc)}</span> 米`:''}`;
}
function renderClock(){const n=torontoNow();$('clock').innerHTML=`多伦多 ${DN[n.dow]} <b>${hhmm(n.min)}</b>`}
function renderControls(){
  $('loc-preset').innerHTML=`<option value="">选一个区域…</option>`+HOODS.map((h,i)=>`<option value="${i}">${esc(h[0])}</option>`).join('');
  segBtns($('when-seg'),[['now','现在出发'],['later','换个时间']],S.when,v=>{S.when=v;$('when-custom').hidden=v!=='later';renderControls();save();update()});
  $('when-custom').hidden=S.when!=='later';
  const n=torontoNow();
  $('when-day').innerHTML=[0,1,2,3,4,5,6].map(i=>`<option value="${i}">${i===0?'今天':i===1?'明天':DN[(n.dow+i)%7]}</option>`).join('');
  $('when-day').value=S.whenDay; $('when-time').value=S.whenTime;
  segBtns($('show-seg'),[['eat','能吃上的'],['eat+unk','加上时间未知'],['all','全部']],S.show,v=>{S.show=v;save();renderControls();update()});
  segBtns($('sort-seg'),[['open','能吃上优先'],['near','最近']],S.sort,v=>{S.sort=v;save();renderControls();update()});
}

/* ---------- 随便吃 ---------- */
const MOOD_GROUPS=[['菜系',KW[0].items.map(([n])=>'菜系:'+n)],['想吃点',KW[1].items.map(([n])=>'想吃点:'+n)],['场景',['场景:快速解决','场景:坐下慢慢吃','场景:素食友好']]];
function renderMoods(){
  $('moods').innerHTML=MOOD_GROUPS.map(([g,ids])=>`<div class="kg"><span class="lab">${g}</span><div class="chips">${ids.map(id=>`<button type="button" class="chip" data-mood="${esc(id)}" ${chipAttr(S.mood,id,id.split(':')[1])}>${esc(id.split(':')[1])}</button>`).join('')}</div></div>`).join('');
}
function roll(){
  if(!POOL.length){picked=null;return}
  let r; for(let i=0;i<6;i++){r=POOL[Math.floor(Math.random()*POOL.length)];if(r.p.oid!==picked||POOL.length===1)break}
  picked=r.p.oid;
}
function renderPick(){
  const r=POOL.find(x=>x.p.oid===picked);
  if(!r){
    $('pick').innerHTML=`<div class="empty-pick">${NEAR.length?'这个范围里没有符合心情的店。少选几个心情，或者换个交通方式走远一点。':'这个范围里现在没有能去的店。试试把时间放宽，或者换成骑车、打车。'}</div>`;
    return;
  }
  const p=r.p, okN=POOL.length;
  $('pick').innerHTML=`<article class="pick">
    <div class="pick-walk"><b class="num">${r.tm}</b>分钟 · ${M().l} · ${distTxt(r.d)}</div>
    <div class="pn">${esc(p.name)}${p.zh&&p.zh!==p.name?`<small>${esc(p.zh)}</small>`:''}</div>
    <div class="tags">${tagHTML(p)}<span>${TYPE[p.type]}</span>${p.veg?'<span>素食友好</span>':''}</div>
    ${dishHTML(p)}
    <div class="st"><span class="pill ${r.st.k}">${esc(r.st.t)}</span></div>
    <div class="pick-acts">
      <button class="btn primary" type="button" id="reroll">换一家</button>
      <a class="btn" href="${gdir(p)}" target="_blank" rel="noopener">就它了，导航 ↗</a>
      <a class="btn ghost" href="${gmaps(p)}" target="_blank" rel="noopener">看 Google 评价 ↗</a>${r.st.k==='unk'&&p.phone?`<a class="btn ghost" href="tel:${esc(p.phone.replace(/[^+\d]/g,''))}">📞 打电话问营业时间</a>`:''}
      <button class="star" type="button" data-fav="${esc(p.oid)}" aria-pressed="${favs.has(p.oid)}" title="收藏">★</button>
    </div>
    <div class="pick-count">从 ${okN} 家${POOL[0]&&POOL[0].st.k==='ok'?'能吃上的':''}店里随机抽的</div>
  </article>`;
}

/* ---------- 找一家 ---------- */
function renderKW(){
  const cu=KW[0];
  $('kw-main').innerHTML=cu.items.map(([n])=>{const id=cu.g+':'+n;return `<button type="button" class="chip" data-k="${esc(id)}" ${chipAttr(S.kw,id,n)}>${esc(n)}</button>`}).join('')
    +S.kw.filter(k=>k.replace(/^!/,'').startsWith('c:')).map(k=>{const id=k.replace(/^!/,''),n=cz(id.slice(2));return `<button type="button" class="chip" data-k="${esc(id)}" ${chipAttr(S.kw,id,n)}>${esc(n)}</button>`}).join('');
  $('kw-more').innerHTML=KW.slice(1).map(g=>`<div class="kg"><span class="lab">${g.g}</span><div class="chips">${g.items.map(([n])=>{const id=g.g+':'+n;return `<button type="button" class="chip" data-k="${esc(id)}" ${chipAttr(S.kw,id,n)}>${esc(n)}</button>`}).join('')}</div></div>`).join('');
  const hidden=S.kw.map(k=>k.replace(/^!/,'')).filter(k=>!k.startsWith('菜系:')&&!k.startsWith('c:')).length;
  $('more-kw').querySelector('summary').textContent=hidden?`更多条件（已选 ${hidden} 个）`:'更多条件';
}
// 标签三态：没选 → 想吃 → 不想吃 → 没选
function cycle(arr,id){const i=arr.indexOf(id),j=arr.indexOf('!'+id);if(i>=0)arr[i]='!'+id;else if(j>=0)arr.splice(j,1);else arr.push(id)}
const chipSt=(arr,id)=>arr.includes(id)?'yes':arr.includes('!'+id)?'no':'';
const chipAttr=(arr,id,label)=>{const st=chipSt(arr,id);return `aria-pressed="${st==='yes'}" data-st="${st}"${st==='no'?` aria-label="不想吃 ${esc(label)}"`:''}`};
function toggleKW(id){cycle(S.kw,id);save();renderKW();limit=40;update()}
function renderNearby(){
  const cnt={}; NEAR.forEach(r=>{new Set(r.p.cu.map(cz)).forEach(z=>{cnt[z]=(cnt[z]||0)+1})});
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,18);
  $('nearby-h').innerHTML=`${M().l} ${S.mins} 分钟内${S.show==='all'?'':'这会儿'}有 <em>${Object.keys(cnt).length}</em> 种吃的，共 <em>${NEAR.length}</em> 家`;
  const rev={}; NEAR.forEach(r=>r.p.cu.forEach(c=>{rev[cz(c)]=rev[cz(c)]||c}));
  $('nearby').innerHTML=top.length?top.map(([z,n])=>{const id='c:'+rev[z];return `<button type="button" class="chip" data-k="${esc(id)}" ${chipAttr(S.kw,id,z)}>${esc(z)}<small>${n}</small></button>`}).join(''):'';
}
function card(r){
  const p=r.p, sel=selected===p.oid, ohSrc=overrides[p.oid]||p.oh||'';
  return `<div class="card${sel?' sel':''}" data-o="${esc(p.oid)}" id="c-${esc(p.oid)}">
    <div class="walk"><b>${r.tm}</b><span>分钟</span></div>
    <div><div class="cn">${esc(p.name)}${p.zh&&p.zh!==p.name?`<small>${esc(p.zh)}</small>`:''}</div>
      <div class="tags">${tagHTML(p)}<span>${TYPE[p.type]}</span><span class="num">${distTxt(r.d)}</span>${p.veg?'<span>素食友好</span>':''}</div>
      ${dishHTML(p)}
      <div class="st"><span class="pill ${r.st.k}">${esc(r.st.t)}</span></div></div>
    <div class="acts"><button class="star" type="button" data-fav="${esc(p.oid)}" aria-pressed="${favs.has(p.oid)}" title="收藏">★</button></div>
    <div class="more">
      <div>${esc([p.addr,p.city].filter(Boolean).join(', ')||'没有地址信息')}</div>
      <div class="links"><a href="${gmaps(p)}" target="_blank" rel="noopener">Google 地图看评价 ↗</a><a href="${gdir(p)}" target="_blank" rel="noopener">${M().l}导航 ↗</a>${/^https?:/.test(p.web)?`<a href="${esc(p.web)}" target="_blank" rel="noopener">官网 ↗</a>`:''}${telHTML(p)}</div>
      <div>${srcHTML(p)}</div>
      <div class="ohedit"><input class="in" id="oh-${esc(p.oid)}" value="${esc(ohSrc)}" placeholder="补营业时间，如 Mo-Fr 11:00-22:00; Sa-Su 12:00-23:00"><button class="btn" type="button" data-oh="${esc(p.oid)}">保存时间</button>${overrides[p.oid]?`<button class="btn" type="button" data-ohx="${esc(p.oid)}">恢复原数据</button>`:''}</div>
    </div>
  </div>`;
}
function renderList(){
  $('list-h').textContent=`找到 ${RES.length} 家`;
  $('cards').innerHTML=RES.length?RES.slice(0,limit).map(card).join('')+(RES.length>limit?`<div class="showmore"><button class="btn" type="button" id="more">再显示 ${Math.min(40,RES.length-limit)} 家</button></div>`:''):`<div class="empty">没有符合条件的店。少选几个条件，或者把时间放宽、换个交通方式。${S.show!=='all'?'<br>也可能是店到时已关门：在「更多条件 → 显示」里选「全部」就能看到。':''}</div>`;
}

/* ---------- 收藏 ---------- */
function renderFav(){
  $('fav-count').textContent=favs.size?`${favs.size} 家`:'还没有';
  $('fav-h').textContent=favs.size?`收藏的 ${favs.size} 家（按距离）`:'收藏';
  $('fav-cards').innerHTML=FAV.length?FAV.map(card).join(''):`<div class="empty">还没有收藏。在店铺卡片上点 ★ 就会出现在这里。</div>`;
}
function renderFoot(){
  const withH=P.filter(p=>p.oh).length, nChain=P.filter(p=>!p.oh&&p.ohChain).length, nd=Object.keys(DISH).length;
  $('foot').innerHTML=`<p>店铺数据合并自三个来源：OpenStreetMap（${DATA.ts.slice(0,10)} 抓取）、Overture Maps（${DATA.overture||''} 版，补充漏收的店、官网和电话）和多伦多市 DineSafe 卫生检查记录（补充近两年检查过的店）。大多伦多地区共 ${P.length.toLocaleString()} 家餐厅、快餐和咖啡馆，其中 ${withH.toLocaleString()} 家（约 ${Math.round(withH/P.length*100)}%）登记了营业时间；另有 ${nChain.toLocaleString()} 家连锁分店按同名店最常见的营业时间推测（卡片上会注明），个别分店可能不同。</p>
  <p>特色菜目前只有 ${nd} 家（试跑的唐人街和 King West）：「据官网菜单」是从店家官网提炼的，「AI 推测」和「据店名」可能不准。</p>
  <p>路程按直线距离估算：步行每分钟 80 米、骑车约 15 km/h、打车约 25 km/h 并加 4 分钟等车，没算红绿灯和堵车。餐厅按关门前 45 分钟、快餐和咖啡按 20 分钟算「来得及」。</p>
  <p>营业时间以店家实际为准，出门前可点「Google 地图」核对。你补的营业时间、收藏和位置只保存在这个浏览器里。地图底图 © Esri。店铺数据 © OpenStreetMap 贡献者（ODbL）、© Overture Maps Foundation、Contains information licensed under the Open Government Licence – Toronto。</p>`;
}

/* ---------- map (Leaflet) ---------- */
const map=L.map('map',{preferCanvas:true,zoomControl:true,attributionControl:true}).setView([S.lat,S.lng],15);
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches};
let tiles=[];
const ESRI=n=>`https://server.arcgisonline.com/ArcGIS/rest/services/${n}/MapServer/tile/{z}/{y}/{x}`;
const ATTR='地图 © Esri、HERE、OpenStreetMap 贡献者';
function setTiles(){
  tiles.forEach(t=>map.removeLayer(t));
  tiles=isDark()
    ?[L.tileLayer(ESRI('Canvas/World_Dark_Gray_Base'),{maxZoom:19,maxNativeZoom:16,attribution:ATTR}),L.tileLayer(ESRI('Canvas/World_Dark_Gray_Reference'),{maxZoom:19,maxNativeZoom:16})]
    :[L.tileLayer(ESRI('World_Street_Map'),{maxZoom:19,attribution:ATTR})];
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
    <button type="button" class="pp-go" data-go="${esc(p.oid)}">${S.view==='rand'?'就选这家':'在列表里看'}</button>`;
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
  const list=S.view==='rand'?POOL:S.view==='fav'?FAV:RES;
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
map.on('click',e=>{if(picking){setLoc(e.latlng.lat,e.latlng.lng,'地图上选的位置');setPicking(false)}});
$('zme').onclick=()=>fitRange();
function setPicking(on){picking=on;$('mapbox').classList.toggle('picking',on);$('maphint').hidden=!on;$('pick-btn').classList.toggle('on',on);$('pick-btn').textContent=on?'点地图…（取消）':'在地图上点选';if(on)closePops()}
$('pick-btn').onclick=()=>{setPicking(!picking);if(picking&&window.innerWidth<1100)$('mapbox').scrollIntoView({behavior:'smooth',block:'center'})};

/* ---------- views ---------- */
function renderView(){
  document.querySelector('.stage').dataset.view=S.view;
  for(const v of ['rand','find','fav']){$('view-'+v).hidden=S.view!==v;$('tab-'+v).setAttribute('aria-selected',S.view===v)}
}
function setView(v){S.view=v;save();if(v==='rand'&&!POOL.some(r=>r.p.oid===picked))roll();renderView();renderPanel();draw(false);window.scrollTo({top:0})}
function renderPanel(){
  if(S.view==='rand') renderPick();
  else if(S.view==='find'){renderNearby();renderList()}
  else renderFav();
}
function update(fit){
  compute();
  if(S.view==='rand'&&!POOL.some(r=>r.p.oid===picked)) roll();
  renderClock();renderQuery();renderFav();renderPanel();draw(fit);
}

/* ---------- interactions ---------- */
function setLoc(lat,lng,name,acc){S.lat=+lat;S.lng=+lng;S.locName=name;S.acc=acc||null;save();limit=40;picked=null;selected=null;closePops();update(true)}
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
$('loc-preset').onchange=e=>{const h=HOODS[+e.target.value];if(h)setLoc(h[1],h[2],h[0]);e.target.value=''};
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
  const u=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&countrycodes=ca&viewbox=-79.95,44.05,-78.85,43.40&bounded=1&accept-language=zh,en`;
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
  if(!inGTA(x.lat,x.lng)) return addrErr('这个地址不在大多伦多地区，目前只收录了 GTA 的店。');
  const rec=[{n:x.main,lat:x.lat,lng:x.lng},...LS.get('recentLocs',[]).filter(r=>r.n!==x.main)].slice(0,5);
  LS.set('recentLocs',rec);
  $('loc-q').value=''; sugs=[]; renderSugs(); renderRecent();
  setLoc(x.lat,x.lng,x.main);
}
function renderRecent(){
  const rec=LS.get('recentLocs',[]);
  $('loc-recent').innerHTML=rec.length?`<span class="lab">最近用过</span>`+rec.map((r,i)=>`<button type="button" class="chip" data-rl="${i}">${esc(r.n)}</button>`).join(''):'';
}
$('loc-q').oninput=e=>{
  const q=e.target.value.trim(); clearTimeout(sugTimer); if(sugCtl) sugCtl.abort();
  $('where').querySelector('.err')?.remove();
  if(q.length<3||parseLoc(q)){sugs=[];renderSugs();return}
  sugTimer=setTimeout(async()=>{
    sugCtl=new AbortController();
    try{sugs=await photon(q,sugCtl.signal);renderSugs(sugs.length?'':'没有匹配的地址，按「用这个地址」再找一次')}
    catch(err){if(err.name!=='AbortError'){sugs=[];renderSugs()}}
  },300);
};
$('loc-form').onsubmit=async e=>{
  e.preventDefault();
  const q=$('loc-q').value.trim(); if(!q) return;
  const v=parseLoc(q);  // 坐标或 Google 地图链接
  if(v==='far') return addrErr('这个坐标不在大多伦多地区，目前只收录了 GTA 的店。');
  if(v){$('loc-q').value='';return setLoc(v[0],v[1],'粘贴的坐标')}
  if(sugs.length) return useAddr(sugs[0]);
  const b=$('loc-go'); b.disabled=true; b.textContent='查找中…';
  try{
    let r=await photon(q); if(!r.length) r=await nominatim(q);
    if(r.length) useAddr(r[0]); else addrErr('没找到这个地址。试试写成「门牌号 + 街名」，或者路口，如 Yonge & Bloor。');
  }catch(err){addrErr('查地址需要联网，现在连不上。可以先选一个区域，或者在地图上点选。')}
  b.disabled=false; b.textContent='用这个地址';
};
// 定位：持续读几秒，等 GPS 收敛。精度到 GOOD 米以内立即采用，否则最多等 MAXWAIT 毫秒取最准的一次
const GEO={GOOD:35,MAXWAIT:10000,BAD:1000};
const inGTA=(la,lo)=>!(la<43.2||la>44.3||lo<-80.3||lo>-78.6);
let geoWatch=null;
function geoMsg(html){$('where').querySelector('.err')?.remove();$('where').insertAdjacentHTML('beforeend',`<div class="err">${html}</div>`)}
$('geo-btn').onclick=()=>{
  const b=$('geo-btn'), label='📍 用我现在的位置';
  if(geoWatch!==null) return;
  $('where').querySelector('.err')?.remove();
  if(!navigator.geolocation) return geoMsg('这个浏览器不支持定位。');
  let best=null, timer=null;
  const stop=()=>{navigator.geolocation.clearWatch(geoWatch);geoWatch=null;clearTimeout(timer);b.disabled=false;b.textContent=label};
  const finish=()=>{
    stop();
    if(!best) return geoMsg('没拿到位置，稍后再试，或者选一个区域。');
    const {latitude:la,longitude:lo,accuracy:acc}=best.coords;
    if(!inGTA(la,lo)) return geoMsg('你现在不在大多伦多地区，目前只收录了 GTA 的店。');
    setLoc(la,lo,'我现在的位置',acc);
    if(acc>GEO.BAD){ // 很可能关了「精确位置」，把弹框留着显示提示
      $('pop-loc').hidden=false;$('tok-loc').setAttribute('aria-expanded','true');
      geoMsg(`定位误差约 ${(acc/1000).toFixed(1)} 公里，很可能没开「精确位置」：iPhone「设置 → 隐私与安全性 → 定位服务 → Safari 网站」里打开「精确位置」。也可以点「在地图上点选」手动定准。`);
    }
  };
  b.disabled=true; b.textContent='定位中…';
  geoWatch=navigator.geolocation.watchPosition(pos=>{
    if(!best||pos.coords.accuracy<best.coords.accuracy) best=pos;
    b.textContent=`定位中… ±${Math.round(best.coords.accuracy)} 米`;
    if(best.coords.accuracy<=GEO.GOOD) finish();
  },e=>{
    if(e.code===1){stop();return geoMsg('没有定位权限：在 iPhone「设置 → 隐私与安全性 → 定位服务 → Safari 网站」里选「使用 App 期间」，并打开「精确位置」。')}
    if(e.code!==3&&!best){stop();geoMsg('没拿到位置，稍后再试，或者选一个区域。')}
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
  if(e.target.id==='more'){limit+=40;renderList();return}
  const go=e.target.closest('[data-go]'); if(go){map.closePopup();if(S.view==='rand'){picked=go.dataset.go;renderPick();draw(false)}else select(go.dataset.go,true);return}
  const f=e.target.closest('[data-fav]'); if(f){const o=f.dataset.fav;favs.has(o)?favs.delete(o):favs.add(o);LS.set('favs',[...favs]);f.setAttribute('aria-pressed',favs.has(o));compute();renderFav();if(S.view==='fav'||S.kw.includes('场景:我收藏的'))update();return}
  const oh=e.target.closest('[data-oh]'); if(oh){const o=oh.dataset.oh;const v=document.getElementById('oh-'+o).value.trim();
    if(v&&!parseOH(v)){oh.insertAdjacentHTML('afterend','<span class="err">格式没认出来，参考：Mo-Fr 11:00-22:00; Sa,Su 12:00-23:00</span>');return}
    if(v)overrides[o]=v;else delete overrides[o];LS.set('oh',overrides);update();return}
  const ox=e.target.closest('[data-ohx]'); if(ox){delete overrides[ox.dataset.ohx];LS.set('oh',overrides);update();return}
  if(e.target.closest('a,input,button,select,.leaflet-container')) return;
  const c=e.target.closest('.card'); if(c){select(c.dataset.o,false)}
});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{setTiles();draw(false)})}catch(e){}
new MutationObserver(()=>{setTiles();draw(false)}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
setInterval(()=>{if(S.when==='now')update();else renderClock()},60000);

renderControls();renderKW();renderMoods();renderFoot();renderView();
update(true);
})();
