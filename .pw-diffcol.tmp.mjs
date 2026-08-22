import { chromium } from 'playwright';
const APP='https://anachrony.staging.boardgameedge.com/';
const DATA='https://data.staging.boardgameedge.com/api/anachrony';
const b=await chromium.launch(); const ctx=await b.newContext(); const p=await ctx.newPage();
const wait=(ms=700)=>p.waitForTimeout(ms); const body=()=>p.locator('body').innerText();
const api=(path,opts)=>p.evaluate(async([u,o])=>{const r=await fetch(u,{credentials:'include',...(o||{})});
  let j=null; try{j=await r.clone().json();}catch{} return {status:r.status,json:j};},[`${DATA}${path}`,opts]);
await p.goto(APP,{waitUntil:'networkidle'});
await p.getByRole('button',{name:/Log in/i}).first().click();
await p.waitForLoadState('networkidle'); await wait(900);
await p.locator('input[name="username"], input[name="email"], input[type="email"], input[type="text"]').first().fill(process.env.BGE_USER);
await p.locator('input[type="password"]').first().fill(process.env.BGE_PASS);
await p.locator('button[type="submit"], input[type="submit"]').first().click();
await p.waitForLoadState('networkidle'); await wait(1500);
async function finish(bot, pick){
  await p.goto(APP,{waitUntil:'networkidle'}); await wait(500);
  await p.evaluate(()=>{for(const k of ['anachrony:chronossus','anachrony:chronobot']) localStorage.removeItem(k);});
  await p.goto(APP,{waitUntil:'networkidle'}); await wait(600);
  await p.getByText(bot,{exact:false}).first().click(); await wait(1000);
  if(bot==='Chronossus'){
    await p.getByRole('button',{name:/Continue/i}).first().click(); await wait();
    await p.getByText(pick,{exact:true}).first().click(); await wait(400);
    // add one difficulty option so the label has something to show
    for(let i=0;i<8;i++){ const t=await body();
      if(/Difficulty/i.test(t) && await p.locator('.difficulty-opt').count()) break;
      const c=p.getByRole('button',{name:/Continue/i}).first(); if(!(await c.count()))break; await c.click(); await wait(400);}
    const opt=p.locator('.difficulty-opt').first();
    if(await opt.count()){ await opt.click(); await wait(300); }
  }
  for(let i=0;i<8;i++){ if(/Begin Era 1/i.test(await body())) break;
    const c=p.getByRole('button',{name:/Continue|Start/i}).first(); if(!(await c.count()))break; await c.click(); await wait(500);}
  await p.getByRole('button',{name:/Begin Era 1/i}).first().click(); await wait(1000);
  const key = bot==='Chronossus' ? 'anachrony:chronossus' : 'anachrony:chronobot';
  await p.evaluate((k)=>{const d=JSON.parse(localStorage.getItem(k));
    d.state.era=7; d.state.phase='endgame'; d.state.finished=true; localStorage.setItem(k,JSON.stringify(d));},key);
  await p.reload({waitUntil:'networkidle'}); await wait(1600);
  const modes=p.locator('.score-mode button'); if(await modes.count()){ await modes.first().click(); await wait(400); }
  const inp=p.locator('.score-screen input').first(); await inp.click(); await inp.type('42',{delay:60}); await wait(4000);
}
await finish('Chronossus','Doomsday');
await finish('Chronobot');
const rows=(await api('/me/games')).json??[];
console.log('\nrecorded difficulty values:');
for(const r of rows) console.log(`  id=${r.id}  "${r.difficulty}"   modes=${JSON.stringify(r.payload?.modes??null)} opponent=${r.payload?.opponent}`);
for(const r of rows.filter(r=>r.player_score===42)){ const d=await api(`/me/games/${r.id}`,{method:'DELETE'}); console.log(`deleted ${r.id}: ${d.status}`); }
await b.close();
