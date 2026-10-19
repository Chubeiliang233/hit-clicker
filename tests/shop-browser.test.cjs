// Browser regression: run with a local preview server and Playwright installed.
// HIT_CLICKER_PLAYWRIGHT may point to an existing Playwright installation.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.HIT_CLICKER_PLAYWRIGHT || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true, channel:process.env.HIT_CLICKER_BROWSER || 'msedge'});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900},locale:'zh-CN'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.HIT_CLICKER_BASE_URL || 'http://127.0.0.1:3000');
    // Freeze only decorative idle sway for deterministic purchase coordinates.
    // The moving controls and click feedback are exercised in motion-browser.test.cjs.
    await page.addStyleTag({content:'[data-no-hit] * {animation-play-state:paused!important}'});
    await page.evaluate(async () => {
      await document.fonts.ready;
      hits = totalHits = 10000000;
      upgradeLevel = 7;
      helpers.a.unlocked = helpers.b.unlocked = true;
      helpers.a.power = helpers.b.power = 3;
      syncHelperTimer();
      updateDisplay();
    });
    await page.locator('#shop-button').click();

    // A refresh between down/up must retain the image and deliver exactly one purchase.
    for (const [id, expression] of [
      ['helper-a-power','helpers.a.power'],
      ['helper-b-power','helpers.b.power'],
      ['plus','plusLevel'],
      ['upgrade','upgradeLevel']
    ]) {
      const button = page.locator(`#${id}-button`);
      const bounds = await button.boundingBox();
      const x = bounds.x+bounds.width/2, y = bounds.y+bounds.height/2;
      for (let attempt=0; attempt<3; attempt++) {
        const before = await page.evaluate(expression);
        await page.mouse.move(x,y);
        await page.evaluate(id => {window.pressedIcon=document.querySelector(`#${id}-button img`);},id);
        await page.mouse.down();
        await page.evaluate(() => {updateDisplay();updateDisplay();});
        assert.equal(await page.evaluate(() => pressedIcon.isConnected),true);
        await page.mouse.up();
        assert.equal(await page.evaluate(expression),before+1,`${id}: one press must purchase one level`);
      }
    }

    // Pointer focus on a partially visible node must not move it away from the press.
    await page.evaluate(() => {
      const skill=treeSkills.find(s=>s.id==='helper-a-power');
      const p=treeLayout[skill.id];
      treeDrag.x=43-800-p[0];
      applyTreePan();
      document.querySelector('#shop-close').focus();
    });
    const edge=await page.locator('#helper-a-power-button').boundingBox();
    const beforeEdge=await page.evaluate(()=>({level:helpers.a.power,x:treeDrag.x,y:treeDrag.y}));
    await page.mouse.click(edge.x+edge.width/2,edge.y+edge.height/2);
    const afterEdge=await page.evaluate(()=>({level:helpers.a.power,x:treeDrag.x,y:treeDrag.y}));
    assert.equal(afterEdge.level,beforeEdge.level+1);
    assert.equal(afterEdge.x,beforeEdge.x);
    assert.equal(afterEdge.y,beforeEdge.y);

    // A deliberate drag across a node must pan without buying it or selecting text/images.
    const dragButton=await page.locator('#helper-a-power-button').boundingBox();
    const beforeDrag=await page.evaluate(()=>helpers.a.power);
    await page.mouse.move(dragButton.x+32,dragButton.y+32);
    await page.mouse.down();
    await page.mouse.move(dragButton.x+72,dragButton.y+62,{steps:5});
    await page.mouse.up();
    assert.equal(await page.evaluate(()=>helpers.a.power),beforeDrag);
    assert.equal(await page.evaluate(()=>window.getSelection().toString()),'');
    assert.equal(await page.locator('#shop img').first().evaluate(n=>getComputedStyle(n).pointerEvents),'none');
    assert.equal(await page.locator('.tree-level').first().evaluate(n=>getComputedStyle(n).userSelect),'none');

    // Keyboard focus still brings a node fully into the viewport.
    await page.evaluate(()=>{
      document.querySelector('#shop-close').focus();
      const p=treeLayout['helper-a-power'];
      treeDrag.x=43-800-p[0];applyTreePan();
      document.querySelector('#helper-a-power-button').focus();
    });
    const keyboardNode=await page.locator('#helper-a-power-button').boundingBox();
    const viewport=await page.locator('#tree-viewport').boundingBox();
    assert.ok(keyboardNode.x>=viewport.x && keyboardNode.x+keyboardNode.width<=viewport.x+viewport.width);

    await page.locator('#shop-close').click();
    await page.locator('#volume-slider').focus();
    const volume=Number(await page.locator('#volume-slider').inputValue());
    await page.keyboard.press('ArrowUp');
    assert.equal(Number(await page.locator('#volume-slider').inputValue()),volume+1);
    assert.equal(await page.locator('#volume-slider').evaluate(n=>getComputedStyle(n,'::-webkit-slider-thumb').backgroundColor),'rgba(0, 0, 0, 0)');
    const autoText=await page.evaluate(()=>{
      const text=[],originalEffect=showFloatingEffect,originalSettlement=settleHelperIncome;
      try {
        showFloatingEffect=(x,y,value,kind)=>{if(kind==='auto')text.push(value);};
        settleHelperIncome=()=>3;runHelperTick();return text;
      } finally {showFloatingEffect=originalEffect;settleHelperIncome=originalSettlement;}
    });
    assert.deepEqual(autoText,['+3']);

    // The history dialog shows actual new credits, stays live, persists, and cannot award clicks.
    await page.evaluate(()=>{
      clearInterval(helperTimer);helperTimer=null;helperLastAt=null;
      incomeHistory=[];helpers.a.progress=helpers.b.progress=0;
    });
    const clickBefore=await page.evaluate(()=>hits);
    await page.mouse.click(900,750);
    assert.equal(await page.evaluate(()=>incomeHistory.length),1);
    assert.equal(await page.evaluate(()=>incomeHistory[0].amount),await page.evaluate(()=>hits)-clickBefore);
    const openBefore=await page.evaluate(()=>hits);
    await page.locator('#history-button').click();
    assert.equal(await page.locator('#history-dialog').evaluate(n=>n.open),true);
    assert.equal(await page.evaluate(()=>hits),openBefore);
    assert.equal(await page.locator('#history-list li').count(),1);
    assert.match(await page.locator('#history-list').textContent(),/手动点击/);
    await page.evaluate(()=>{helperLastAt=performance.now()-1000;runHelperTick();});
    assert.equal(await page.locator('#history-list li').count(),3);
    assert.match(await page.locator('#history-list').textContent(),/小帮手 A/);
    assert.match(await page.locator('#history-list').textContent(),/小帮手 B/);
    await page.evaluate(()=>{queueSave();saveGame();});
    const persistedHistory=await page.evaluate(()=>JSON.stringify(incomeHistory));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#history-dialog').evaluate(n=>n.open),false);
    assert.equal(await page.locator('#history-button').evaluate(n=>n===document.activeElement),true);
    await page.reload();
    await page.addStyleTag({content:'[data-no-hit] * {animation-play-state:paused!important}'});
    await page.evaluate(()=>{clearInterval(helperTimer);helperTimer=null;helperLastAt=null;});
    assert.equal(await page.evaluate(()=>JSON.stringify(incomeHistory)),persistedHistory);
    await page.locator('#history-button').click();
    await page.evaluate(()=>{incomeHistory=Array.from({length:100},(_,i)=>({source:'manual',amount:i+1,at:Date.now()-i*1000,detail:'普通点击'}));renderIncomeHistory();});
    assert.equal(await page.locator('#history-list li').count(),100);
    assert.equal(await page.locator('#history-list').evaluate(n=>n.scrollHeight>n.clientHeight),true);
    await page.setViewportSize({width:390,height:720});
    const historyBounds=await page.locator('#history-dialog').boundingBox();
    const historyClose=await page.locator('#history-close').boundingBox();
    assert.ok(historyBounds.x>=0&&historyBounds.x+historyBounds.width<=390);
    assert.ok(historyClose.x>=0&&historyClose.x+historyClose.width<=390);
    assert.equal(await page.locator('#history-close').evaluate(n=>getComputedStyle(n).isolation),'isolate');
    assert.equal(await page.locator('#history-close').evaluate(n=>{
      const r=n.getBoundingClientRect();return document.elementFromPoint(r.left+8,r.bottom-8)===n;
    }),true,'overlapping close-button area must stay above the history body');
    await page.locator('#history-close').click();

    // Unaffordable, unowned nodes stay visually distinct from owned nodes.
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(()=>{hits=0;upgradeLevel=3;plusLevel=0;updateDisplay();});
    await page.locator('#shop-button').click();
    assert.equal(await page.locator('#plus-button').evaluate(n=>n.parentElement.dataset.owned),'false');
    assert.equal(await page.locator('#plus-button').evaluate(n=>getComputedStyle(n,'::before').backgroundColor),'rgb(70, 70, 94)');
    assert.equal(await page.locator('#tree-links line[data-skill=plus]').getAttribute('data-state'),'available');
    assert.equal(await page.locator('#tree-links line[data-skill=plus]').evaluate(n=>getComputedStyle(n).stroke),'rgb(50, 127, 100)');
    assert.deepEqual(errors,[]);
    console.log('PASS: native purchases, edge focus, dragging/selection, keyboard/volume, numeric helper feedback, live/persisted/scrollable income history, mobile bounds and unowned/poor node styling.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
