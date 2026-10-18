const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const source = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function boot(saved, failBackup = false) {
  const elements = new Map();
  let clock = 0;
  class Element {
    constructor() { this.listeners = {}; this.style = {}; this.dataset = {}; this.children = []; this.open = false; }
    addEventListener(name, fn) { (this.listeners[name] ??= []).push(fn); }
    set id(value) { elements.set(`#${value}`, this); }
    setAttribute() {} focus() {} querySelectorAll() { return []; }
    append(...nodes) { this.children.push(...nodes); for (const n of nodes) n.parentElement = this; }
    insertBefore(node) { this.append(node); }
    replaceChildren(...nodes) { this.children = nodes; }
    getBoundingClientRect() { return { left: 0, top: 0, bottom: 100, width: 100, height: 30 }; }
    animate() { return {}; } remove() {}
    showModal() { this.open = true; }
    close() { this.open = false; this.fire('close'); }
    fire(name, extra = {}) { for (const fn of this.listeners[name] ?? []) fn({ currentTarget: this, target: this, detail: 0, button: 0, clientX: 20, clientY: 20, ...extra }); }
    closest() { return false; }
  }
  const get = key => { if (!elements.has(key)) elements.set(key, new Element()); return elements.get(key); };
  const document = new Element();
  Object.assign(document, { querySelector: get, createElement: () => new Element(), body: new Element(), hidden: false });
  get('#lucky-node').parentElement = new Element();
  const storage = new Map(saved ? [['hit-clicker-save-v1', JSON.stringify(saved)]] : []);
  const window = new Element();
  Object.assign(window, { matchMedia: () => ({ matches: true }), localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => { if (failBackup && k.endsWith('backup')) throw Error('quota'); storage.set(k,v); } } });
  const context = vm.createContext({ window, document, performance: { now: () => clock }, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(fs.readFileSync('game-rules.js','utf8'), context);
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run('soundEnabled = false; showFloatingEffect = () => ({ remove() {} });');
  return { run, get, document, storage, advance: ms => { clock += ms; }, click: () => document.fire('click'), buy: id => get(`#${id}-button`).fire('click') };
}
let game = boot();
const r = game.run('rules');
assert.deepEqual(Array.from({length: 8}, (_,i) => r.cost(10,10,1,i+1)), [10,20,40,60,100,140,220,300]);
assert.deepEqual(Array.from({length: 8}, (_,i) => r.cost(150,50,2,i+1)), [150,200,300,400,600,800,1100,1400]);
assert.equal(game.run('upgradeLevel'),1);
game.click(); assert.equal(game.run('hits'),1);
game.buy('plus'); assert.equal(game.run('plusLevel'),0);
game.run('hits = totalHits = 100000;');
game.buy('upgrade'); assert.equal(game.run('upgradeLevel'),2); assert.equal(game.run('hits'),99980);
game.buy('lucky'); assert.equal(game.run('chanceLevel'),1); assert.equal(game.run('hits'),99930);
game.buy('lucky'); assert.equal(game.run('hits'),99930);
game.buy('upgrade'); assert.equal(game.run('upgradeLevel'),3);
game.buy('plus'); assert.equal(game.run('hitsPerClick'),5);
game.buy('plus'); assert.equal(game.run('hitsPerClick'),9);
game.buy('jackpot'); assert.equal(game.run('jackpotUnlocked'),false);
for (let i=0;i<4;i++) game.buy('chance');
assert.equal(game.run('chanceLevel'),5);
const balance = game.run('hits'); game.buy('chance'); assert.equal(game.run('hits'),balance);
game.buy('upgrade'); game.buy('upgrade'); game.buy('jackpot');
assert.equal(game.run('jackpotUnlocked'),true);
game.run('Math.random = () => 0.99;');
const normal = game.run('hitsPerClick');
for (let i=0;i<19;i++) game.click();
assert.equal(game.run('jackpotProgress'),19);
const before = game.run('hits'); game.click(); assert.equal(game.run('hits')-before,normal*10); assert.equal(game.run('jackpotProgress'),0);
game.run('jackpotProgress=19; Math.random=()=>0;');
const both = game.run('hits'); game.click(); assert.equal(game.run('hits')-both,normal*20);
game.run('jackpotProgress=19;'); game.buy('frequency'); assert.equal(game.run('jackpotProgress'),18);
game.click(); assert.equal(game.run('jackpotProgress'),0);
game.run('hits=0;'); const level=game.run('multiplierLevel'); game.buy('multiplier'); assert.equal(game.run('multiplierLevel'),level); assert.equal(game.run('hits'),0);
game.run('hits=totalHits=100000; isPaused=true;'); game.buy('plus'); game.click(); assert.equal(game.run('hits'),100000);
game.run('isPaused=false;');
for (let i=0;i<20;i++) game.buy('frequency'); assert.equal(game.run('frequencyLevel'),10);
const saved = game.run('getSaveData()'); assert.equal(saved.version,3);
game = boot(saved); assert.equal(game.run('frequencyLevel'),10); assert.equal(game.run('plusLevel'),2);
const old = {version:1,hits:99,totalHits:1000,upgradeLevel:4,luckyUnlocked:true,helperCount:2,helperPowerLevel:3,helperCreditRemainder:.25,soundEnabled:false,soundVolume:32,isPaused:false};
game = boot(old); assert.equal(game.run('upgradeLevel'),5); assert.equal(game.run('hitsPerClick'),5); assert.equal(game.run('chanceLevel'),2); assert.equal(game.run('getAutoIncome()'),8); assert.equal(game.run('hits'),99); assert.equal(game.storage.get('hit-clicker-save-v1-backup'),JSON.stringify(old));
game = boot(old,true); assert.equal(game.run('canWriteSave'),false); assert.equal(game.run('hits'),99); game.click(); game.run('saveGame()'); assert.equal(game.storage.get('hit-clicker-save-v1'),JSON.stringify(old));
game = boot({...saved,chanceLevel:6}); assert.equal(game.run('invalidSave'),true); assert.equal(game.run('canWriteSave'),false);
game = boot(saved); game.get('#reset-button').fire('click'); game.get('#confirm-accept').fire('click'); assert.equal(game.run('upgradeLevel'),1); assert.equal(game.run('plusLevel + chanceLevel + jackpotProgress'),0); assert.equal(game.run('jackpotUnlocked'),false);
console.log('PASS: price curves, unlocks, purchases, retroactive Plus, probability cap, stacked jackpot, frequency boundary, pause, insufficient funds, save roundtrip, v1 backup/migration, backup failure, invalid save, reset.');


// A/B prerequisites, one-time ownership, cumulative income vs spendable balance.
game = boot();
game.run('hits=999;totalHits=999;upgradeLevel=7;updateDisplay();');
game.buy('helper-a'); assert.equal(game.run('helpers.a.unlocked'),false);
game.run('totalHits=1000;hits=199;'); game.buy('helper-a'); assert.equal(game.run('helpers.a.unlocked'),false);
game.run('hits=200;'); game.buy('helper-a'); assert.equal(game.run('helpers.a.unlocked'),true); assert.equal(game.run('hits'),0); assert.equal(game.run('totalHits'),1000);
game.run('hits=1000000;totalHits=1000000;');
let unchanged=game.run('hits'); game.buy('helper-a'); assert.equal(game.run('hits'),unchanged);
game.buy('helper-a-speed'); assert.equal(game.run('helpers.a.speed'),0);
for(let i=0;i<3;i++) game.buy('helper-a-power');
assert.equal(game.run('rules.helperDamage("a",helpers.a.power)'),7);
assert.equal(game.run('helperSkills.find(s=>s.id==="helper-a-speed").cost()'),150);
game.buy('helper-a-speed'); assert.equal(game.run('helpers.a.speed'),1);
assert.equal(game.run('helpers.a.progress'),0);
assert.ok(Math.abs(game.run('getAutoIncome()')-7/.9)<1e-8);
// 0.9-second interval: no proportional advance reward, exactly one full event.
game.advance(899); game.run('runHelperTick()'); let beforeAuto=game.run('hits');
game.advance(1); game.run('runHelperTick()'); assert.equal(game.run('hits')-beforeAuto,7);
assert.equal(game.run('jackpotProgress'),0);
// Speed is capped at .5 seconds; purchases settle elapsed time at the old rate.
game.advance(450); unchanged=game.run('hits'); game.buy('helper-a-speed');
assert.equal(game.run('hits'),unchanged-190); assert.ok(Math.abs(game.run('helpers.a.progress')-.5)<1e-8);
game.advance(400); unchanged=game.run('hits'); game.run('runHelperTick()'); assert.equal(game.run('hits')-unchanged,7);
for(let i=0;i<10;i++) game.buy('helper-a-speed'); assert.equal(game.run('helpers.a.speed'),5);
assert.equal(game.run('rules.helperInterval(helpers.a.speed)'),.5);
game.buy('helper-b'); assert.equal(game.run('helpers.b.unlocked'),false);
game.buy('helper-a-power'); game.buy('helper-b'); assert.equal(game.run('helpers.b.unlocked'),true);
assert.equal(game.run('helpers.b.progress'),0);
for(let i=0;i<3;i++) game.buy('helper-b-power');
assert.equal(game.run('helpers.b.power'),3);
assert.equal(game.run('rules.helperDamage("b",helpers.b.power)'),130);
assert.equal(game.run('helperSkills.find(s=>s.id==="helper-b-power").cost()'),3400);
assert.equal(game.run('helperSkills.find(s=>s.id==="helper-b-speed").cost()'),1500);
game.buy('helper-b-speed'); assert.equal(game.run('helpers.b.speed'),1);
// Lucky upgrades require probability Lv.5; player jackpot never advances from helpers.
game.buy('helper-a-lucky'); assert.equal(game.run('helpers.a.lucky'),false);
game.run('luckyUnlocked=true;chanceLevel=5;multiplierLevel=1;Math.random=()=>0;');
game.buy('helper-a-lucky'); game.buy('helper-b-lucky');
assert.equal(game.run('helpers.a.lucky && helpers.b.lucky'),true);
game.run('jackpotUnlocked=true;jackpotProgress=12;helpers.a.progress=0;helpers.b.progress=0;');
unchanged=game.run('hits'); game.advance(900); game.run('runHelperTick()');
assert.equal(game.run('hits')-unchanged,9*3+130*3); assert.equal(game.run('jackpotProgress'),12);
// Partial cycles survive pause and reload, hidden time earns nothing.
game.advance(100); game.get('#pause-button').fire('click');
const partial=game.run('helpers.b.progress'); unchanged=game.run('hits');
game.advance(10000); game.run('runHelperTick()'); assert.equal(game.run('hits'),unchanged);
game.get('#pause-button').fire('click'); game.advance(100); game.run('runHelperTick()');
assert.ok(Math.abs(game.run('helpers.b.progress')-partial-1/9)<1e-8);
const helperSave=game.run('getSaveData()'); game=boot(helperSave);
assert.equal(game.run('helpers.b.speed'),1); assert.equal(game.run('helpers.a.lucky'),true);
assert.equal(game.run('helpers.b.progress'),helperSave.helpers.b.progress);
unchanged=game.run('hits'); game.advance(100); game.document.hidden=true; game.document.fire('visibilitychange');
const atHide=game.run('hits'); game.advance(30000); game.run('runHelperTick()'); assert.equal(game.run('hits'),atHide);
game.document.hidden=false; game.document.fire('visibilitychange'); game.advance(100); game.run('runHelperTick()');
assert.ok(game.run('hits')-unchanged<1000);
// Save v2 keeps legacy income, without granting locked new A/B skills.
const v2={...old,version:2,upgradeLevel:7,plusLevel:1,chanceLevel:2,multiplierLevel:0,jackpotUnlocked:false,frequencyLevel:0,jackpotPowerLevel:0,jackpotProgress:0};
game=boot(v2); assert.equal(game.run('getAutoIncome()'),8); assert.equal(game.run('helpers.a.unlocked'),false);
assert.equal(game.storage.get('hit-clicker-save-v2-backup'),JSON.stringify(v2));
game.advance(1000); game.run('runHelperTick()'); assert.equal(game.run('hits'),107);
const bad=structuredClone(helperSave); bad.helpers.b.speed=6;
game=boot(bad); assert.equal(game.run('invalidSave'),true);
game=boot(helperSave); game.get('#reset-button').fire('click'); game.get('#confirm-accept').fire('click');
assert.equal(game.run('hasHelpers()'),false); assert.equal(game.run('getAutoIncome()'),0);
console.log('PASS: A/B thresholds, costs, one-time unlocks, event intervals, speed cap, old-rate settlement, separate lucky rolls, no manual jackpot from auto, pause/visibility, cycle save/restore, v2 legacy migration, helper validation/reset.');


// Each helper event draws its own chance; exactly-at-threshold is not lucky.
const luckyState={unlocked:true,power:3,speed:0,lucky:true,progress:0};
let draws=[.49,.5]; let drawsUsed=0;
const separate=r.helperIncome('a',luckyState,2,.5,3,()=>{drawsUsed++;return draws.shift();});
assert.equal(drawsUsed,2); assert.equal(separate.events,2); assert.equal(separate.luckyEvents,1); assert.equal(separate.income,28);
let cycles={unlocked:true,power:0,speed:0,lucky:false,progress:0}; let accumulated=0;
for(let i=0;i<10;i++){ const result=r.helperIncome('a',cycles,.1,0,2); accumulated+=result.income; cycles.progress=result.progress; }
assert.equal(accumulated,1); assert.equal(cycles.progress,0);
console.log('PASS: independent auto-lucky thresholds and fractional-cycle precision.');

// Combinations: independent 1% rolls, precise boundary, all multipliers stack.
const comboState={upgradeLevel:7,plusLevel:1,luckyUnlocked:true,chanceLevel:5,multiplierLevel:1,jackpotUnlocked:true,frequencyLevel:0,jackpotPowerLevel:1,jackpotProgress:19,comboAUnlocked:true,comboBUnlocked:true,helpers:{a:{power:4,speed:5,lucky:true},b:{power:2,speed:5,lucky:true}}};
let rolls=[.009,.01]; let calls=0;
let result=r.resolveClick(comboState,0,()=>{calls++;return rolls.shift();});
assert.equal(calls,2); assert.equal(result.isComboA,true); assert.equal(result.isComboB,false);
assert.equal(result.amount,13*3*20*9); assert.equal(result.progress,0);
rolls=[.01,.009]; result=r.resolveClick(comboState,.9,()=>rolls.shift());
assert.equal(result.isComboA,false); assert.equal(result.isComboB,true); assert.equal(result.amount,13*20*120);
result=r.resolveClick(comboState,0,()=>0); assert.equal(result.amount,13*3*20*9*120);
const after=structuredClone(comboState); after.helpers.b.power=3;
assert.equal(r.resolveClick(after,0,()=>0).comboBFactor,130);
assert.equal(r.resolveClick({...comboState,comboAUnlocked:false,comboBUnlocked:false},0,()=>{throw Error('locked combo drew randomness');}).amount,13*3*20);
// Unlock flow validates both cumulative totals and independent spendable prices.
game=boot(helperSave); game.run('hits=9999;totalHits=9999;'); game.buy('combo-a'); assert.equal(game.run('comboAUnlocked'),false);
game.run('totalHits=100000;hits=9999;'); game.buy('combo-a'); assert.equal(game.run('hits'),9999); assert.equal(game.run('comboAUnlocked'),false);
game.buy('combo-b'); assert.equal(game.run('comboBUnlocked'),false);
game.run('hits=100000;'); game.buy('combo-a'); assert.equal(game.run('comboAUnlocked'),true); assert.equal(game.run('hits'),90000);
game.buy('combo-a'); assert.equal(game.run('hits'),90000);
game.buy('combo-b'); assert.equal(game.run('comboBUnlocked'),true); assert.equal(game.run('hits'),40000);
game.buy('combo-b'); assert.equal(game.run('hits'),40000);
const rateBeforeCombo=game.run('getAutoIncome()');
const progressBefore=game.run('helpers.a.progress');
game.run('jackpotProgress=19; Math.random=()=>0;');
const beforeCombo=game.run('hits'); const totalBeforeCombo=game.run('totalHits'); game.click();
const expectedCombo=game.run('hitsPerClick * (2+multiplierLevel) * (10+10*jackpotPowerLevel) * rules.helperDamage("a",helpers.a.power) * rules.helperDamage("b",helpers.b.power)');
assert.equal(game.run('hits')-beforeCombo,expectedCombo); assert.equal(game.run('totalHits')-totalBeforeCombo,expectedCombo);
assert.equal(game.run('helpers.a.progress'),progressBefore); assert.equal(game.run('getAutoIncome()'),rateBeforeCombo);
assert.match(game.get('#combo-feedback').textContent,/组合A ×9.*组合B ×130/);
assert.equal(game.get('#combo-feedback').hidden,false);
const comboSave=game.run('getSaveData()'); game=boot(comboSave); assert.equal(game.run('comboAUnlocked && comboBUnlocked'),true);
const noFields=structuredClone(helperSave); delete noFields.comboAUnlocked; delete noFields.comboBUnlocked;
game=boot(noFields); assert.equal(game.run('invalidSave'),false); assert.equal(game.run('comboAUnlocked || comboBUnlocked'),false);
const badCombo=structuredClone(comboSave); badCombo.comboAUnlocked=false;
game=boot(badCombo); assert.equal(game.run('invalidSave'),true);
const badType=structuredClone(comboSave); badType.comboAUnlocked='true';
game=boot(badType); assert.equal(game.run('invalidSave'),true);
const badPower=structuredClone(comboSave); badPower.helpers.b.power=1; badPower.helpers.b.speed=0;
game=boot(badPower); assert.equal(game.run('invalidSave'),true);
game=boot(comboSave); game.run('isPaused=true;'); const pausedHits=game.run('hits'); game.click(); assert.equal(game.run('hits'),pausedHits);
game.get('#reset-button').fire('click'); game.get('#confirm-accept').fire('click'); assert.equal(game.run('comboAUnlocked || comboBUnlocked'),false); assert.equal(game.get('#combo-feedback').hidden,true);
console.log('PASS: combo prerequisites/prices, one-time ownership, separate 1% threshold draws, four-effect multiplication, live helper damage, no extra auto credit, feedback, old/new save compatibility, invalid combos, pause/reset.');

// Fortune probability is a percentage-point correction, after base chance cap.
const fortuneState={...comboState,fortuneUnlocked:true,fortune:50,emperorUnlocked:true,pityUnlocked:true,fortuneProgress:0,lowFortuneClicks:0};
assert.equal(r.effectiveChance({...fortuneState,fortune:0}),.25);
assert.equal(r.effectiveChance(fortuneState),.5);
assert.equal(r.effectiveChance({...fortuneState,fortune:100}),.75);
assert.equal(r.effectiveChance({...fortuneState,luckyUnlocked:false}),0);
assert.equal(r.resolveClick({...fortuneState,fortune:100},.74,()=>0).amount,(13+6)*3*20*9*120);
assert.equal(r.resolveClick({...fortuneState,fortune:100},.75,()=>.9).isLucky,false);
assert.equal(r.resolveClick({...fortuneState,fortune:99},.9,()=>.9).emperorBonus,0);
let fState={...fortuneState}; let fortuneDraws=0;
for(let i=0;i<2;i++){const n=r.advanceFortune(fState,()=>{fortuneDraws++;return 0;}); fState.fortune=n.fortune;fState.fortuneProgress=n.progress;fState.lowFortuneClicks=n.lowClicks;}
assert.equal(fortuneDraws,0); assert.equal(fState.fortune,50);
let next=r.advanceFortune(fState,()=>{fortuneDraws++;return 0;}); assert.equal(fortuneDraws,1); assert.equal(next.fortune,55); assert.equal(next.progress,0);
assert.equal(r.advanceFortune({...fortuneState,fortune:100,fortuneProgress:2},()=>0).fortune,100);
assert.equal(r.advanceFortune({...fortuneState,fortune:0,fortuneProgress:2},()=>.5).fortune,0);
next=r.advanceFortune({...fortuneState,fortune:20,fortuneProgress:2,lowFortuneClicks:98},()=>.5); assert.equal(next.fortune,15); assert.equal(next.lowClicks,99);
next=r.advanceFortune({...fortuneState,fortune:20,fortuneProgress:2,lowFortuneClicks:99},()=>.5); assert.equal(next.fortune,18); assert.equal(next.lowClicks,100);
next=r.advanceFortune({...fortuneState,fortune:47,fortuneProgress:2,lowFortuneClicks:100},()=>0); assert.equal(next.fortune,52); assert.equal(next.lowClicks,0);
next=r.advanceFortune({...fortuneState,fortune:20,pityUnlocked:false,fortuneProgress:2,lowFortuneClicks:0},()=>.9); assert.equal(next.fortune,15); assert.equal(next.lowClicks,0);
// Interactive unlocks, ordinary mistakes, and once-only prices.
game=boot(helperSave); game.run('chanceLevel=4;hits=100000;totalHits=1000000;'); game.buy('fortune'); assert.equal(game.run('fortuneUnlocked'),false);
game.buy('emperor');game.buy('pity');assert.equal(game.run('emperorUnlocked || pityUnlocked'),false);
game.run('chanceLevel=5;hits=4999;');game.buy('fortune');assert.equal(game.run('fortuneUnlocked'),false);assert.equal(game.run('hits'),4999);
game.run('hits=100000;');game.buy('fortune');assert.equal(game.run('fortune'),50);assert.equal(game.run('hits'),95000);game.buy('fortune');assert.equal(game.run('hits'),95000);
game.buy('emperor');game.buy('pity');assert.equal(game.run('hits'),95000-6666-5555);
let afterBuying=game.run('hits');game.buy('emperor');game.buy('pity');assert.equal(game.run('hits'),afterBuying);
game.run('Math.random=()=>.99;');game.click();game.click();assert.equal(game.run('fortune'),50);assert.equal(game.run('fortuneProgress'),2);game.click();assert.equal(game.run('fortune'),45);
assert.match(game.get('#fortune-feedback').textContent,/50 → 45/);
// Low-fortune clicks count only manual actions, not helper ticks or shop clicks.
game.run('fortune=20;fortuneProgress=2;lowFortuneClicks=99;');game.click();assert.equal(game.run('fortune'),18);assert.equal(game.run('lowFortuneClicks'),100);
const fortuneBeforeAuto=game.run('fortune');const lowBeforeAuto=game.run('lowFortuneClicks');game.advance(1000);game.run('runHelperTick()');assert.equal(game.run('fortune'),fortuneBeforeAuto);assert.equal(game.run('lowFortuneClicks'),lowBeforeAuto);
game.get('#shop-button').fire('click');game.click();assert.equal(game.run('lowFortuneClicks'),100);game.get('#shop').close();
// Emperor applies before that click updates fortune from 100 to 95.
game.run('fortune=100;fortuneProgress=2;lowFortuneClicks=0;jackpotProgress=0;Math.random=()=>.99;updateDisplay();');
const emperorBase=game.run('rules.clickIncome(upgradeLevel,plusLevel)+6');const beforeEmperor=game.run('hits');game.click();assert.equal(game.run('hits')-beforeEmperor,emperorBase);assert.equal(game.run('fortune'),95);assert.equal(game.run('hitsPerClick'),emperorBase-6);
// Helpers settle under the old fortune before manual input changes its value.
game.run('fortune=100;fortuneProgress=2;helpers.a.progress=0;helpers.b.progress=0;Math.random=()=>.74;');
game.advance(500);const beforeOldChance=game.run('hits');game.click();assert.equal(game.run('fortune'),95);
assert.equal(game.run('hits')-beforeOldChance,game.run('(rules.helperDamage("a",helpers.a.power)+rules.clickIncome(upgradeLevel,plusLevel)+6)*(2+multiplierLevel)'));
game.run('fortune=45;updateDisplay();'); const fortuneSave=game.run('getSaveData()');game=boot(fortuneSave);assert.equal(game.run('fortune'),45);assert.equal(game.run('emperorUnlocked && pityUnlocked'),true);
const oldFortune=structuredClone(helperSave);for(const key of ['fortuneUnlocked','fortune','fortuneProgress','lowFortuneClicks','emperorUnlocked','pityUnlocked']) delete oldFortune[key];
game=boot(oldFortune);assert.equal(game.run('invalidSave'),false);assert.equal(game.run('fortuneUnlocked'),false);assert.equal(game.run('fortune'),50);
for(const patch of [{fortune:101},{fortune:null},{fortuneProgress:3},{fortuneUnlocked:false},{chanceLevel:4},{lowFortuneClicks:101},{fortune:50,lowFortuneClicks:1}]){
 game=boot({...fortuneSave,...patch});assert.equal(game.run('invalidSave'),true,JSON.stringify(patch));
}
game=boot(fortuneSave);game.run('isPaused=true;');game.click();assert.equal(game.run('fortune'),45);
game.get('#reset-button').fire('click');game.get('#confirm-accept').fire('click');assert.equal(game.run('fortuneUnlocked || emperorUnlocked || pityUnlocked'),false);assert.equal(game.run('fortune'),50);assert.equal(game.run('lowFortuneClicks+fortuneProgress'),0);assert.equal(game.get('#fortune-feedback').hidden,true);
console.log('PASS: fortune unlock/prices, probability corrections/boundaries, three-click updates, 0/100 clamps, pity at click100 and recovery reset, emperor before multipliers/update, old-rate helper settlement, no auto/shop fortune progress, save compatibility/validation, pause/reset.');
