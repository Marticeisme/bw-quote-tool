// Sign-in gate: gating, username->identifier mapping, error handling, sign-out, bypass.
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const SEED = { quotes: { cem: { q1: { id: 1, label: 'Existing Family', total: 500, date: 'x', state: { fields: {} } } } } };

async function open(browser, { account = ['martice@bwquote.local', 'correct-horse'], query = '' } = {}) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`(${(s, a) => { window.__fake.seed(s); if (a) window.__fake.addAccount(a[0], a[1]); }}).call(null, ${JSON.stringify(SEED)}, ${JSON.stringify(account)});`);
  // dev-server.mjs only special-cases req.url === '/', so '/?x=1' falls through to a directory
  // read and 404s. Request index.html explicitly whenever there is a query string.
  await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/' + (query ? 'index.html' + query : ''), { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

const gateState = page => page.evaluate(() => {
  const g = document.getElementById('bwGate');
  return {
    gateVisible: !!g && getComputedStyle(g).display !== 'none',
    storeStarted: !!window._bwAppStarted,
    fbReady: !!window._fbQuotesReady,
    quotesLoaded: (window._cemSavedQuotes || []).length,
    status: (document.getElementById('fbStatus') || {}).textContent || '',
    sidebarName: (document.querySelector('.sb-user-name') || {}).textContent || '',
    sidebarRole: (document.querySelector('.sb-user-role') || {}).textContent || '',
    avatar: (document.querySelector('.sb-avatar') || {}).textContent || '',
  };
});

const browser = await chromium.launch();

// ── 1. Signed out: gate up, store never starts ───────────────────────────────────────
console.log('\n1. Signed out');
{
  const { ctx, page, errs } = await open(browser);
  const s = await gateState(page);
  ok('gate is visible', s.gateVisible, s);
  ok('quote store did NOT start', s.storeStarted === false, s);
  ok('no saved quotes loaded into memory', s.quotesLoaded === 0, s);
  ok('status line names the cause', /Not signed in/.test(s.status), s.status);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 2. Wrong password ────────────────────────────────────────────────────────────────
console.log('\n2. Bad credentials');
{
  const { ctx, page } = await open(browser);
  await page.fill('#bwUser', 'martice');
  await page.fill('#bwPass', 'wrong');
  await page.click('#bwGateBtn');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    err: document.getElementById('bwGateErr').textContent,
    errShown: getComputedStyle(document.getElementById('bwGateErr')).display !== 'none',
    gateVisible: getComputedStyle(document.getElementById('bwGate')).display !== 'none',
    btnLabel: document.getElementById('bwGateBtn').textContent,
    btnEnabled: !document.getElementById('bwGateBtn').disabled,
    started: !!window._bwAppStarted,
  }));
  ok('error message shown', r.errShown && /not recognised/i.test(r.err), r.err);
  // Must not distinguish "no such user" from "wrong password" — that would confirm which
  // usernames exist. The word "username" itself is fine; the revealing phrasings are not.
  ok('message does not reveal whether the username exists',
    !/(no such|not found|does not exist|unknown user|wrong password|incorrect password)/i.test(r.err), r.err);
  ok('gate stays up', r.gateVisible);
  ok('button re-enabled for another try', r.btnEnabled && r.btnLabel === 'Sign in', r);
  ok('store still not started', r.started === false);
  await ctx.close();
}

// ── 3. Correct credentials ───────────────────────────────────────────────────────────
console.log('\n3. Successful sign-in');
{
  const { ctx, page, errs } = await open(browser);
  await page.fill('#bwUser', '  MARTICE  ');           // whitespace + case
  await page.fill('#bwPass', 'correct-horse');
  await page.click('#bwGateBtn');
  await page.waitForTimeout(600);
  const s = await gateState(page);
  const ident = await page.evaluate(() => window.__fake.log().filter(l => l.op === 'signIn').map(l => l.path));
  ok('username normalised and suffixed', ident.join() === 'martice@bwquote.local', ident);
  ok('gate dismissed', !s.gateVisible, s);
  ok('quote store started', s.storeStarted === true, s);
  ok('saved quotes now loaded', s.quotesLoaded === 1, s);
  ok('status line reads synced', /synced/.test(s.status), s.status);
  ok('sidebar shows the full display name', s.sidebarName === 'Martice Morrison', s.sidebarName);
  ok('avatar uses real initials, not first two letters', s.avatar === 'MM', s.avatar);
  ok('role line preserved alongside sign out', /Advanced Planning · Sign out/.test(s.sidebarRole), s.sidebarRole);
  ok('no page errors', errs.length === 0, errs);

  // password field cleared after success
  const pw = await page.evaluate(() => document.getElementById('bwPass').value);
  ok('password field cleared', pw === '', pw);
  await ctx.close();
}

// ── 4. A second counselor sees the same shared list ──────────────────────────────────
console.log('\n4. Second FSD, shared quotes');
{
  const { ctx, page } = await open(browser, { account: ['randy@bwquote.local', 'pw2'] });
  await page.fill('#bwUser', 'randy');
  await page.fill('#bwPass', 'pw2');
  await page.click('#bwGateBtn');
  await page.waitForTimeout(600);
  const s = await gateState(page);
  ok('second account signs in', !s.gateVisible && s.storeStarted, s);
  ok('sees the same shared saved quotes', s.quotesLoaded === 1, s);
  ok('sidebar shows their display name', s.sidebarName === 'Randy Bergquist', s.sidebarName);
  ok('their initials are right', s.avatar === 'RB', s.avatar);
  ok('role line preserved alongside sign out', /Advanced Planning · Sign out/.test(s.sidebarRole), s.sidebarRole);
  await ctx.close();
}

// ── 4b. An account with no BW_USERS entry still works ────────────────────────────────
console.log('\n4b. Unmapped account falls back gracefully');
{
  const { ctx, page } = await open(browser, { account: ['newhire@bwquote.local', 'pw3'] });
  await page.fill('#bwUser', 'newhire');
  await page.fill('#bwPass', 'pw3');
  await page.click('#bwGateBtn');
  await page.waitForTimeout(600);
  const s = await gateState(page);
  ok('signs in without a display-name entry', !s.gateVisible && s.storeStarted, s);
  ok('falls back to the capitalised username', s.sidebarName === 'Newhire', s.sidebarName);
  await ctx.close();
}

// ── 5. Sign out ──────────────────────────────────────────────────────────────────────
console.log('\n5. Sign out');
{
  const { ctx, page } = await open(browser);
  await page.fill('#bwUser', 'martice');
  await page.fill('#bwPass', 'correct-horse');
  await page.click('#bwGateBtn');
  await page.waitForTimeout(500);
  const r = await page.evaluate(async () => {
    // Calls the SDK directly rather than bwSignOut(), which additionally reloads the page —
    // the state transition is what matters here, and a reload would discard it.
    await _fbAuth.signOut();
    await new Promise(r => setTimeout(r, 100));
    return {
      gateVisible: getComputedStyle(document.getElementById('bwGate')).display !== 'none',
      user: window._bwUser,
      status: document.getElementById('fbStatus').textContent,
    };
  });
  ok('gate returns on sign-out', r.gateVisible, r);
  ok('user cleared', r.user === null, r.user);
  ok('status reflects signed out', /Not signed in/.test(r.status), r.status);
  await ctx.close();
}

// ── 6. The retired rollout hatch really is gone ──────────────────────────────────────
console.log('\n6. ?nosignin=1 no longer bypasses anything');
{
  const { ctx, page, errs } = await open(browser, { query: '?nosignin=1' });
  const s = await gateState(page);
  ok('gate still up', s.gateVisible, s);
  ok('store still did not start', s.storeStarted === false, s);
  ok('no quotes loaded', s.quotesLoaded === 0, s);
  ok('bypass helper is gone entirely', await page.evaluate(() => typeof window.bwSignInBypassed === 'undefined'));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
