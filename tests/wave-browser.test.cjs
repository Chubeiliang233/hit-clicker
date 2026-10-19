const assert=require('node:assert/strict');
const {chromium}=require(process.env.HIT_CLICKER_PLAYWRIGHT || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.HIT_CLICKER_BROWSER || 'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.HIT_CLICKER_BASE_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(()=>window.HitWave?.inspect().ready);
    await page.evaluate(()=>{totalHits=250;updateDisplay();});
    await page.waitForFunction(()=>HitWave.inspect().progress>.49);
    assert.equal(await page.evaluate(()=>HitWave.isOrangeAt(700,800)),true);
    assert.equal(await page.evaluate(()=>HitWave.isOrangeAt(700,40)),false);
    const level=await page.evaluate(()=>HitWave.inspect().target.progress);
    await page.evaluate(()=>{hits=0;updateDisplay();});
    assert.equal(await page.evaluate(()=>HitWave.inspect().target.progress),level,'spending balance cannot lower the water');
    await page.mouse.click(900,750);
    assert.ok(await page.evaluate(()=>HitWave.inspect().bubbles.every(b=>b.color==='#fb803d'&&b.opacity===1)),'orange waves emit solid orange steam');
    await page.evaluate(()=>{totalHits=500;updateDisplay();});
    await page.waitForFunction(()=>HitWave.inspect().stage===1);
    assert.equal(await page.evaluate(()=>HitWave.isOrangeAt(700,40)),true);
    assert.equal(await page.evaluate(()=>HitWave.isOrangeAt(700,899)),false);
    await page.evaluate(()=>showFloatingEffect(700,300,'幸运！+2','lucky'));
    assert.equal(await page.locator('#hit-effects .hit-burst').last().locator('.hit-gain').evaluate(n=>getComputedStyle(n).color),'rgb(254, 228, 188)');
    await page.evaluate(()=>showFloatingEffect(700,300,'幸运·组合！+20','combo',true));
    assert.equal(await page.locator('#hit-effects .hit-burst').last().locator('.hit-gain').evaluate(n=>getComputedStyle(n).color),'rgb(254, 228, 188)');
    await page.evaluate(()=>showFloatingEffect(700,899,'幸运！+2','lucky'));
    assert.equal(await page.locator('#hit-effects .hit-burst').last().locator('.hit-gain').evaluate(n=>getComputedStyle(n).color),'rgb(251, 128, 61)');

    await page.waitForTimeout(1250);
    await page.mouse.click(900,750);
    const steam=await page.evaluate(()=>HitWave.inspect().bubbles);
    assert.ok(steam.length>=2&&steam.length<=5);
    for(const b of steam){assert.ok(b.radius>=4&&b.radius<=16);assert.ok(b.life>=500&&b.life<=1200);assert.ok(b.rise>=50&&b.rise<=140);assert.ok(Math.abs(b.drift)<=28);assert.equal(b.opacity,1);assert.equal(b.color,'#fee4bc','cream waves emit cream steam');}
    for(let i=0;i<8;i++)await page.mouse.click(900,750);
    await page.waitForFunction(()=>HitWave.inspect().frequency>.5);
    assert.ok(await page.evaluate(()=>HitWave.inspect().frequency<=1.5));
    await page.waitForTimeout(2200);
    assert.equal(await page.evaluate(()=>HitWave.inspect().bubbleCount),0);
    assert.ok(await page.evaluate(()=>HitWave.inspect().frequency<.13));
    // Large gains skip thresholds without flashing through thousands of colors.
    await page.evaluate(()=>{totalHits=1e12;updateDisplay();});
    await page.waitForFunction(()=>HitWave.inspect().stage===WaveRules.state(1e12).stage,{},{timeout:6000});
    await page.evaluate(()=>{totalHits=0;updateDisplay();});
    assert.equal(await page.evaluate(()=>HitWave.inspect().stage),0);
    await page.setViewportSize({width:390,height:720});
    assert.equal(await page.evaluate(()=>HitWave.inspect().width),390);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{totalHits=875;updateDisplay();});
    const quiet=await page.evaluate(()=>HitWave.inspect());
    assert.equal(quiet.stage,1);assert.equal(quiet.progress,.5);
    await page.evaluate(()=>{queueSave();saveGame();});
    await page.reload();
    await page.waitForFunction(()=>window.HitWave?.inspect().ready);
    assert.equal(await page.evaluate(()=>HitWave.inspect().stage),1);
    assert.equal(await page.evaluate(()=>HitWave.inspect().progress),.5,'restore the water level from existing cumulative hits');
    await page.mouse.click(180,650);
    assert.equal(await page.evaluate(()=>HitWave.inspect().bubbleCount),0);
    assert.equal(await page.locator('.stat-heading').first().evaluate(n=>getComputedStyle(n).webkitTextStrokeWidth),'8px');
    await page.evaluate(()=>{hits=100;upgradeLevel=2;updateDisplay();});
    assert.equal(await page.locator('#tree-links line[data-state=locked]').first().evaluate(n=>getComputedStyle(n).stroke),'rgb(50, 127, 100)');
    assert.deepEqual(errors,[]);
    console.log('PASS: cumulative water level, color cycles, spending independence, lucky contrast, steam bounds/expiry, click-speed acceleration/decay, huge gains, reset, mobile and reduced motion.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
