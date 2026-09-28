// 营业时间解析：和 app.js 里的 parseOH 同一份逻辑（app.js 是浏览器脚本，不能直接 import），改一边记得改另一边
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
export { parseOH };
