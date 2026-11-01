import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('motion-evidence/frames',{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:1200},deviceScaleFactor:2,reducedMotion:'reduce'});
const page=await context.newPage();
await page.goto('http://127.0.0.1:4173'); await page.locator('#readings-count').waitFor();
await page.locator('.readout').scrollIntoViewIfNeeded();
await page.screenshot({path:'motion-evidence/actual-context.png',fullPage:true});
const before=await page.locator('#finding').innerText();
const evidence=[];
for(let frame=0;frame<240;frame++){
  // Real keyboard interaction; the app calculates every displayed number.
  if(frame===48) await page.locator('#readings').focus();
  if(frame>=48 && frame<=118 && (frame-48)%5===0) await page.keyboard.press('ArrowRight');
  if(frame===144) await page.locator('.readout h2').click();
  const readings=await page.locator('#readings-count').innerText();
  const units=await page.locator('#units-count').innerText();
  if(units!=='6') throw new Error('Unexpected scientific unit state');
  if(frame===0 && readings!=='30')throw new Error('Wrong baseline');
  if(frame>=118 && readings!=='120')throw new Error('Wrong final count');
  if((await page.locator('#finding').innerText())!==before)throw new Error('Warning changed');
  await page.locator('.readout').screenshot({path:`motion-evidence/frames/${String(frame).padStart(4,'0')}.png`,animations:'disabled'});
  evidence.push({frame,readings,units});
}
await writeFile('motion-evidence/state-proof.json',JSON.stringify({source:'Actual browser application, keyboard input, no UI reconstruction',duration:10,fps:24,warning:before,frames:evidence},null,2));
await browser.close();
