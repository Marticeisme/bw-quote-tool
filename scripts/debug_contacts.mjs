import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'dashboard.html').replace(/\\/g, '/');

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => { if(m.type()==='error') console.log('PAGE ERR:', m.text()); });
await page.goto(file);
await page.waitForTimeout(800);

// Find what user-switch buttons exist
const btnIds = await page.evaluate(() => [...document.querySelectorAll('button.user-btn')].map(b=>({id:b.id,text:b.textContent.trim()})));
console.log('User buttons:', JSON.stringify(btnIds));

// Try to get to All view — look for any "All" button
await page.evaluate(() => { if(typeof setUser==='function') setUser('all'); });
await page.waitForTimeout(300);

// Now "+ Chloe Case" button should exist
const chloeCaseBtn = await page.$('button:has-text("Chloe Case")');
console.log('Chloe Case button found:', !!chloeCaseBtn);
await chloeCaseBtn?.click();
await page.waitForTimeout(500);

// ws2: click Cremation
await page.click('#chloeDisp button:has-text("Cremation")');
await page.waitForTimeout(300);

// ws3: click first service type
await page.click('#serviceTypeList .disp-btn');
await page.waitForTimeout(400);

// Fill primary contact
await page.fill('#chloeContactList .contact-block[data-cc-idx="0"] .cc-first', 'Jane');
await page.fill('#chloeContactList .contact-block[data-cc-idx="0"] .cc-last', 'Doe');
await page.fill('#chloeContactList .contact-block[data-cc-idx="0"] .cc-phone', '206-555-1234');

// Save
await page.fill('#cDecedent', 'Smith Family');
await page.click('#caseSaveBtn');
await page.waitForTimeout(700);

const cards = await page.$$('.case-card');
console.log('Number of case cards:', cards.length);
const cardText = await page.$eval('.case-card', el => el.textContent).catch(()=>'NOT FOUND');
console.log('Card text (first 300 chars):', cardText.slice(0,300));

// Check specific elements
const purchRow = await page.$('.case-card .purchaser-row');
console.log('Purchaser row in card:', !!purchRow);
if(purchRow) {
  const purchText = await purchRow.textContent();
  console.log('Purchaser row text:', purchText.trim());
}

// Check contacts in page state
const contactsData = await page.evaluate(() => {
  const c = window.cases && window.cases[0];
  return c ? {owner: c.owner, contacts: c.contacts} : null;
});
console.log('Saved case contacts:', JSON.stringify(contactsData));

await browser.close();
