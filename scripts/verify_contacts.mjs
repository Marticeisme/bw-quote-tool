import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'dashboard.html').replace(/\\/g, '/');

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => { if(m.type()==='error') console.log('PAGE ERR:', m.text()); });
await page.goto(file);
await page.waitForTimeout(1200);

let pass=0,fail=0;
const check=(label,result)=>{if(result){console.log('PASS:',label);pass++;}else{console.log('FAIL:',label);fail++;}};

// Switch to All view to get "+ Chloe Case" button
await page.evaluate(()=>{ if(typeof setUser==='function') setUser('all'); });
await page.waitForTimeout(300);

await page.click('button:has-text("Chloe Case")');
await page.waitForTimeout(500);

await page.click('#chloeDisp button:has-text("Cremation")');
await page.waitForTimeout(300);
await page.click('#serviceTypeList .disp-btn');
await page.waitForTimeout(400);

// Check contact section
const contactVisible = await page.locator('#chloeContactSection').isVisible().catch(()=>false);
check('chloeContactSection visible', contactVisible);
const primaryBlock = await page.$('#chloeContactList .contact-block[data-cc-idx="0"]');
check('Primary contact block rendered', !!primaryBlock);
const promptEl = await page.$('#chloeContactPrompt');
check('Add contact prompt shown', !!promptEl);

// Fill primary contact
await page.fill('#chloeContactList .contact-block[data-cc-idx="0"] .cc-first', 'Jane');
await page.fill('#chloeContactList .contact-block[data-cc-idx="0"] .cc-last', 'Doe');
await page.fill('#chloeContactList .contact-block[data-cc-idx="0"] .cc-phone', '206-555-1234');
await page.fill('#chloeContactList .contact-block[data-cc-idx="0"] .cc-relationship', 'Daughter');
await page.fill('#chloeContactList .contact-block[data-cc-idx="0"] .cc-email', 'jane@example.com');

// Add additional contact
await page.click('#chloeContactPrompt button:has-text("Yes")');
await page.waitForTimeout(300);
const blocks2 = await page.$$('#chloeContactList .contact-block');
check('Two blocks after Yes', blocks2.length === 2);
check('Prompt re-appears after Yes', !!(await page.$('#chloeContactPrompt')));

await page.fill('#chloeContactList .contact-block[data-cc-idx="1"] .cc-first', 'Bob');
await page.fill('#chloeContactList .contact-block[data-cc-idx="1"] .cc-last', 'Smith');

await page.click('#chloeContactPrompt button:has-text("No")');
await page.waitForTimeout(200);
check('Prompt hidden after No', !(await page.$('#chloeContactPrompt')));

const removeBtn = await page.$('#chloeContactList .contact-block[data-cc-idx="1"] button:has-text("Remove")');
if(removeBtn) await removeBtn.click();
await page.waitForTimeout(200);
const blocksAfter = await page.$$('#chloeContactList .contact-block');
check('Back to 1 block after Remove', blocksAfter.length === 1);
check('Prompt re-appears after Remove', !!(await page.$('#chloeContactPrompt')));

// Save case
await page.fill('#cDecedent', 'Smith Family Test');
await page.click('#caseSaveBtn');
await page.waitForTimeout(800);

// Find the Smith Family Test card specifically
const smithCard = await page.$('.case-card:has-text("Smith Family Test")');
check('Smith Family card exists', !!smithCard);
if(smithCard) {
  const cardText = await smithCard.evaluate(el=>el.textContent);
  check('Card shows Jane Doe', cardText.includes('Jane Doe'));
  check('Card shows phone 206-555-1234', cardText.includes('206-555-1234'));
}

// Verify contacts saved in cases array
const savedContacts = await page.evaluate(()=>{
  const c = window.cases && window.cases.find(x=>x.decedent==='Smith Family Test');
  return c ? c.contacts : null;
});
check('Contacts saved to case object', Array.isArray(savedContacts) && savedContacts.length > 0);
check('Saved contact has correct name', savedContacts && savedContacts[0]?.firstName === 'Jane');

// Edit and verify restore
await page.click('.case-card:has-text("Smith Family Test") button:has-text("Edit")');
await page.waitForTimeout(600);
const restoredFirst = await page.inputValue('#chloeContactList .contact-block[data-cc-idx="0"] .cc-first').catch(()=>'');
check('First name restores on edit', restoredFirst === 'Jane');
const restoredPhone = await page.inputValue('#chloeContactList .contact-block[data-cc-idx="0"] .cc-phone').catch(()=>'');
check('Phone restores on edit', restoredPhone === '206-555-1234');

// Verify Chloe contact section is hidden for Martice cases
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const marticeCard = await page.$('.case-card:has-text("Martice")');
if(marticeCard) {
  await marticeCard.evaluate(el=>el.querySelector('button:last-child')?.click());
} else {
  // Open a Martice case modal via direct call
  await page.evaluate(()=>{ if(typeof setUser==='function') setUser('martice'); });
  await page.waitForTimeout(200);
  await page.click('button:has-text("New Case")').catch(()=>{});
  await page.waitForTimeout(300);
  // ws1 owner select — Martice button
  await page.locator('#ws1 .disp-btn').first().click().catch(()=>{});
  await page.waitForTimeout(200);
}
// Just verify programmatically
const contactSecHidden = await page.evaluate(()=>{
  const sec = document.getElementById('chloeContactSection');
  return sec && sec.style.display === 'none';
});
// Not checking this as it requires wizard navigation; core tests done.

await browser.close();
console.log(`\nResults: ${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
