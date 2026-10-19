// Persistent labels and live status messages. Excel remains the copy source.
const i18n=window.HitI18n;
const t=(id,params)=>i18n.t(id,params);
const copyBindings=new Map();
function say(node,id,params={}){copyBindings.set(node,{id,params});node.textContent=t(id,typeof params==='function'?params():params);}
function localizedParts(node,id,params={}){
  node.replaceChildren();
  for(const part of i18n.template(id).split(/(\{\w+\})/g)){
    const name=/^\{(\w+)\}$/.exec(part)?.[1];
    if(!name){node.append(part);continue;}
    const value=params[name];if(value===undefined)throw new Error('Missing parameter: '+id+'.'+name);
    if(typeof value==='number'||/^[+−-]?\d/.test(String(value))){const span=document.createElement('span');span.className='value';span.textContent=String(value);node.append(span);}else node.append(String(value));
  }
}
function applyStaticCopy(){
  const labels={
    'h1':'game.name','.stat-heading':'hud.balance','.total-card>span':'hud.total',
    '.rate-card:first-child>span':'hud.per_click','.rate-card:last-child>span':'hud.auto',
    '.rate-card:first-child small':'unit.hit','.rate-card:last-child small':'unit.hit_second',
    '#shop-button>span':'shop.entry','.shop-balance>span':'shop.balance','#shop-title':'a11y.shop_title',
    '#history-title':'history.title','#history-note':'history.note','#shop-help':'shop.help','#confirm-cancel':'confirm.cancel','label[for=volume-slider]':'a11y.volume'
  };
  for(const [selector,id]of Object.entries(labels)){const node=document.querySelector(selector);if(node)node.textContent=t(id);}
  const aria={'#game-field':'a11y.field','#reset-button':'a11y.reset','#history-button':'a11y.history','#volume-slider':'a11y.volume','.hud':'a11y.hud','#shop-button':'a11y.shop_open','#shop-close':'a11y.shop_close','#tree-viewport':'a11y.tree','#tree-home':'a11y.tree_center','#tree-center':'a11y.tree_center','#helper-roster':'a11y.roster','#history-list':'a11y.history_list','#history-close':'a11y.history_close'};
  for(const [selector,id]of Object.entries(aria))document.querySelector(selector)?.setAttribute('aria-label',t(id));
  document.title=t('game.name');
  document.querySelector('#save-retry').textContent=t(invalidSave?'save.replace':'save.retry');
  const button=document.querySelector('#language-button');
  if(button){const zh=i18n.locale==='zh-CN';button.title=zh?'切换到 English':'Switch to 中文';button.setAttribute('aria-label',button.title);button.dataset.locale=i18n.locale;const icon=button.querySelector('img');if(icon)icon.src=zh?'assets/figma/language-zh.svg':'assets/figma/language-en.svg';}
  for(const [node,{id,params}]of copyBindings)node.textContent=t(id,typeof params==='function'?params():params);
}
function skillCopyParams(id){
  const normal=rules.clickIncome(upgradeLevel,plusLevel)+getEmperorBonus();
  if(id==='upgrade')return {current:normal,next:rules.clickIncome(upgradeLevel+1,plusLevel)+getEmperorBonus(),step:rules.clickStep(plusLevel)};
  if(id==='plus')return {current:normal,next:rules.clickIncome(upgradeLevel,plusLevel+1)+getEmperorBonus()};
  if(id==='lucky')return {chance:luckyUnlocked?formatRate(getEffectiveChance()*100):10,multiplier:2+multiplierLevel,normal,lucky:normal*(2+multiplierLevel)};
  if(id==='chance')return {current:chanceLevel*10,next:Math.min(5,chanceLevel+1)*10};
  if(id==='multiplier')return {current:2+multiplierLevel,next:3+multiplierLevel};
  if(id==='jackpot')return {multiplier:rules.jackpotMultiplier(0)};
  if(id==='frequency')return {current:20-frequencyLevel,next:Math.max(10,19-frequencyLevel)};
  if(id==='jackpot-power')return {current:rules.jackpotMultiplier(jackpotPowerLevel),next:rules.jackpotMultiplier(jackpotPowerLevel+1)};
  if(id==='combo-a'||id==='combo-b')return {multiplier:rules.helperDamage(id.endsWith('a')?'a':'b',helpers[id.endsWith('a')?'a':'b'].power)};
  if(id.startsWith('helper-')){
    const kind=id.split('-')[1],h=helpers[kind];
    if(id.endsWith('-power'))return {current:rules.helperDamage(kind,h.power),next:rules.helperDamage(kind,h.power+1),step:kind==='a'?2:10};
    if(id.endsWith('-speed'))return {current:rules.helperInterval(h.speed),next:rules.helperInterval(Math.min(5,h.speed+1)),rate:formatRate(helperRate(kind,h,false)),nextRate:formatRate(helperRate(kind,{...h,speed:Math.min(5,h.speed+1)},false))};
    if(id.endsWith('-lucky'))return {chance:formatRate(getEffectiveChance()*100),multiplier:2+multiplierLevel};
    return {amount:rules.helperDamage(kind,h.power),interval:rules.helperInterval(h.speed)};
  }
  return {};
}
function historyPartsFromLegacy(detail){
  if(detail==='普通点击'||detail==='Normal click')return [{key:'history.normal',params:{}}];
  if(detail==='保留的旧版自动收益'||detail==='Retained legacy automatic income')return [{key:'history.legacy',params:{}}];
  let m=/^(\d+) 次自动点击(?:，其中幸运 (\d+) 次)?$/.exec(detail)||/^(\d+) automatic clicks(?:, including (\d+) lucky hits)?$/.exec(detail);
  if(m)return [{key:m[2]?'history.auto_lucky':'history.auto',params:{count:Number(m[1]),luckyCount:Number(m[2]||0)}}];
  const parts=[];
  for(const piece of detail.split(' · ')){
    m=/^(?:欧皇基础|Fortune Favored base) \+(\d+)$/.exec(piece);
    if(m){parts.push({key:'history.emperor',params:{bonus:Number(m[1])}});continue;}
    m=/^(幸运|Lucky|大额|Big Hit|组合 A|Combo A|组合 B|Combo B) ×(\d+)$/.exec(piece);
    if(!m)return null;
    const key=({'幸运':'lucky','Lucky':'lucky','大额':'jackpot','Big Hit':'jackpot','组合 A':'combo_a','Combo A':'combo_a','组合 B':'combo_b','Combo B':'combo_b'})[m[1]];
    parts.push({key:'history.'+key,params:{multiplier:Number(m[2])}});
  }
  return parts.length?parts:null;
}
function incomeDetail(entry){const parts=entry.parts||historyPartsFromLegacy(entry.detail);return parts?parts.map(p=>t(p.key,p.params)).join(' · '):entry.detail;}
