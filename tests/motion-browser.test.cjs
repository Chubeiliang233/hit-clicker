const assert = require('node:assert/strict');
const {chromium} = require(process.env.HIT_CLICKER_PLAYWRIGHT || 'playwright');

(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.HIT_CLICKER_BROWSER || 'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.HIT_CLICKER_BASE_URL || 'http://127.0.0.1:3000');
    await page.evaluate(()=>document.fonts.ready);
    for(const selector of ['.balance-card','.total-card','.rate-card','#shop-button','#pause-button','#reset-button','#history-button','.volume-row','.helper-camp']){
      assert.equal(await page.locator(selector).first().evaluate(n=>getComputedStyle(n).animationName),'module-sway',selector);
    }
    await page.mouse.click(900,750);
    assert.equal(await page.evaluate(()=>balanceShake),null,'one isolated click should not start a shake');
    await page.mouse.click(900,750);
    assert.equal(await page.evaluate(()=>balanceShake.playState),'running');
    const before=await page.evaluate(()=>hits);
    await page.mouse.click(900,750);
    assert.equal(await page.evaluate(()=>hits),before+1);
    assert.equal(await page.locator('.balance-card').evaluate(n=>n.getAnimations().filter(a=>!a.animationName).length),1,'rapid clicks replace rather than stack shakes');
    await page.waitForTimeout(380);
    assert.equal(await page.locator('.balance-card').evaluate(n=>getComputedStyle(n).translate),'none','shake must settle after clicking stops');

    const history=page.locator('#history-button'),r=await history.boundingBox();
    await page.mouse.move(r.x+r.width/2,r.y+r.height/2);
    await page.waitForTimeout(220);
    assert.ok(await history.evaluate(n=>Number(getComputedStyle(n).scale)>1.08));
    await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
    assert.equal(await page.locator('#history-dialog').evaluate(n=>n.open),true,'moving, enlarged button remains clickable');
    await page.keyboard.press('Escape');
    await page.setViewportSize({width:390,height:720});
    assert.equal(await page.locator('.balance-card').evaluate(n=>getComputedStyle(n).transform),'none','mobile positioning is preserved');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await history.evaluate(n=>getComputedStyle(n).animationName),'none');
    await page.mouse.click(180,650);await page.mouse.click(180,650);
    assert.equal(await page.locator('.balance-card').evaluate(n=>n.getAnimations().length),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: idle module sway, manual streak shake/settling, bounded animations, stronger hover, moving-icon clicks, mobile positioning and reduced motion.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
