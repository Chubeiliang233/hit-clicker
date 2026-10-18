const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const source = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function boot(saved, failBackup = false) {
  const elements = new Map();
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
  const context = vm.createContext({ window, document, performance: { now: () => 0 }, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(fs.readFileSync('game-rules.js','utf8'), context);
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run('soundEnabled = false; showFloatingEffect = () => ({ remove() {} });');
  return { run, get, document, storage, click: () => document.fire('click'), buy: id => get(`#${id}-button`).fire('click') };
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
const saved = game.run('getSaveData()'); assert.equal(saved.version,2);
game = boot(saved); assert.equal(game.run('frequencyLevel'),10); assert.equal(game.run('plusLevel'),2);
const old = {version:1,hits:99,totalHits:1000,upgradeLevel:4,luckyUnlocked:true,helperCount:2,helperPowerLevel:3,helperCreditRemainder:.25,soundEnabled:false,soundVolume:32,isPaused:false};
game = boot(old); assert.equal(game.run('upgradeLevel'),5); assert.equal(game.run('hitsPerClick'),5); assert.equal(game.run('chanceLevel'),2); assert.equal(game.run('getAutoIncome()'),8); assert.equal(game.run('hits'),99); assert.equal(game.storage.get('hit-clicker-save-v1-backup'),JSON.stringify(old));
game = boot(old,true); assert.equal(game.run('canWriteSave'),false); assert.equal(game.run('hits'),99); game.click(); game.run('saveGame()'); assert.equal(game.storage.get('hit-clicker-save-v1'),JSON.stringify(old));
game = boot({...saved,chanceLevel:6}); assert.equal(game.run('invalidSave'),true); assert.equal(game.run('canWriteSave'),false);
game = boot(saved); game.get('#reset-button').fire('click'); game.get('#confirm-accept').fire('click'); assert.equal(game.run('upgradeLevel'),1); assert.equal(game.run('plusLevel + chanceLevel + jackpotProgress'),0); assert.equal(game.run('jackpotUnlocked'),false);
console.log('PASS: price curves, unlocks, purchases, retroactive Plus, probability cap, stacked jackpot, frequency boundary, pause, insufficient funds, save roundtrip, v1 backup/migration, backup failure, invalid save, reset.');

