// Browser regression: run with a local preview server and Playwright installed.
// HIT_CLICKER_PLAYWRIGHT may point to an existing Playwright installation.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.HIT_CLICKER_PLAYWRIGHT || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true, channel:process.env.HIT_CLICKER_BROWSER || 'msedge'});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.HIT_CLICKER_BASE_URL || 'http://127.0.0.1:3000');
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
    assert.deepEqual(errors,[]);
    console.log('PASS: native purchases survive automatic refresh; edge focus, drag, selection, keyboard navigation, thumb styling and helper feedback.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
