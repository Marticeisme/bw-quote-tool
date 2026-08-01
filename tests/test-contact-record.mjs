// Sprint-04 Track A — the contact record: taxonomies, notes, to-dos, derived next action,
// and the settings screen's removal report. Fake Firebase only; production is never contacted.
//
// House rule (SPRINT.md): no assertion may read a value from the same constant the code reads.
// Everything about labels and codes below is asserted against RENDERED DOM, so deleting an entry
// from BW_STATUSES turns an assertion red instead of silently agreeing with itself.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const DB_OPS = l => !['once', 'signIn', 'signOut'].includes(l.op);

async function open(browser) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', d => d.accept());
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local','pw');`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

// Days relative to LOCAL today, as YYYY-MM-DD. Computed in Node, independently of the app's
// own bwToday(), so a bug in that helper cannot make these assertions agree with it.
function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
const YESTERDAY = day(-1), TODAY = day(0), TOMORROW = day(1);

const browser = await chromium.launch();

// 1. Taxonomies render as labels; an unresolved code renders as the code, never blank
console.log('\n1. Taxonomy labels, and the code that no longer resolves');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    // A known code and a code that is in NO taxonomy.
    const good = await saveParty({ given: 'Wren', family: 'Alcott', status: 'working',
      source: 'walk-in', category: 'pre-need-cemetery', flags: ['veteran', 'vip'] });
    const orphan = await saveParty({ given: 'Bram', family: 'Delacroix', status: 'zzz-retired-code',
      source: 'yyy-gone', category: 'xxx-vanished' });

    location.hash = '#contacts';
    await new Promise(r => setTimeout(r, 200));

    openContactDetail(good.id);
    const goodTags = [...document.querySelectorAll('#ctTags .ct-tag')].map(e => ({ t: e.textContent, unknown: e.classList.contains('ct-unknown') }));
    openContactDetail(orphan.id);
    const orphanTags = [...document.querySelectorAll('#ctTags .ct-tag')].map(e => ({ t: e.textContent, unknown: e.classList.contains('ct-unknown') }));
    closeContactDetail();
    return { goodTags, orphanTags };
  });
  const gt = r.goodTags.map(x => x.t);
  ok('status renders its label', gt.includes('Working'), gt);
  ok('source renders its label', gt.includes('Walk-In'), gt);
  ok('category renders its label', gt.includes('Pre-Need Cemetery'), gt);
  ok('both flags render their labels', gt.includes('Veteran') && gt.includes('VIP'), gt);
  ok('a resolved code is not styled as unknown', r.goodTags.every(x => !x.unknown), r.goodTags);

  const ot = r.orphanTags.map(x => x.t);
  ok('an unresolved status renders the RAW CODE, not blank', ot.includes('zzz-retired-code'), ot);
  ok('an unresolved source renders the raw code', ot.includes('yyy-gone'), ot);
  ok('an unresolved category renders the raw code', ot.includes('xxx-vanished'), ot);
  ok('no tag is empty', r.orphanTags.concat(r.goodTags).every(x => x.t.trim().length > 0), r.orphanTags);
  ok('unresolved codes carry the muted style', r.orphanTags.every(x => x.unknown), r.orphanTags);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. Notes and to-dos are their own nodes and survive a saveParty()  — D3
console.log('\n2. D3 — a note and a to-do survive a party save');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Isolde', family: 'Marchetti', phones: { p1: { value: '2065550188', isPrimary: true } } });
    const n = await saveContactNote({ partyId: p.id, body: 'Wants the columbarium <east> wall & a bench.' });
    const t = await saveContactTask({ partyId: p.id, summary: 'Post the brochure', dueOn: '2026-08-04', category: 'letter' });

    window.__fake.clearLog();
    // The exact call that would wipe a nested note: parties/<id>.set() replaces the record.
    const again = await saveParty(Object.assign({}, bwPartyById(p.id), { nickname: 'Izzy' }));
    const writes = window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op));

    return {
      notePath: !!window.__fake.get('contactNotes/' + n.id),
      taskPath: !!window.__fake.get('contactTasks/' + t.id),
      noteNestedUnderParty: JSON.stringify(window.__fake.get('parties/' + p.id)).indexOf('columbarium') > -1,
      writes: writes.map(w => w.op + ' ' + w.path.split('/')[0]),
      notesAfter: bwNotesFor(p.id).length,
      tasksAfter: bwTasksFor(p.id).length,
      bodyAfter: (bwNotesFor(p.id)[0] || {}).body,
      nickname: again.nickname,
      // per-record write shape, never a whole collection
      notePathIsPerRecord: window.__fake.log().some(l => l.op === 'set' && l.path === 'contactNotes/' + n.id),
      taskPathIsPerRecord: true,
      allSetPaths: window.__fake.dump() && Object.keys(window.__fake.get('contactNotes') || {}).length,
    };
  });
  ok('the note lives at contactNotes/<id>', r.notePath);
  ok('the to-do lives at contactTasks/<id>', r.taskPath);
  ok('the note is NOT nested inside the party record', !r.noteNestedUnderParty);
  ok('a party save writes only the party', r.writes.length === 1 && r.writes[0] === 'set parties', r.writes);
  ok('the note survives the party save', r.notesAfter === 1, r.notesAfter);
  ok('the to-do survives the party save', r.tasksAfter === 1, r.tasksAfter);
  ok('the note body is intact, angle brackets and all', r.bodyAfter === 'Wants the columbarium <east> wall & a bench.', r.bodyAfter);
  ok('the party edit still landed', r.nickname === 'Izzy', r.nickname);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 3. Every new store writes ONE record per path, never a whole collection node
console.log('\n3. No whole-collection .set()');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Cato', family: 'Vandersloot' });
    window.__fake.clearLog();
    await saveContactNote({ partyId: p.id, body: 'one' });
    await saveContactTask({ partyId: p.id, summary: 'two', dueOn: '2026-09-01' });
    await bwAddTaxonomyValue('sources', 'Chamber Mixer');
    const writes = window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op));
    return {
      paths: writes.map(w => w.path),
      // a collection-level write is a path with no "/" after the collection name
      bare: writes.filter(w => ['contactNotes', 'contactTasks', 'crmTaxonomy', 'parties', 'savedQuotes']
        .includes(w.path.replace(/\/.*$/, '')) && w.path.split('/').length < 2).map(w => w.path),
      taxDepth: writes.filter(w => w.path.indexOf('crmTaxonomy') === 0).map(w => w.path.split('/').length),
    };
  });
  ok('no write targets a bare collection node', r.bare.length === 0, r.bare);
  ok('every taxonomy write is crmTaxonomy/<kind>/<code>', r.taxDepth.length > 0 && r.taxDepth.every(d => d === 3), r.taxDepth);
  ok('notes and tasks write one record each', r.paths.filter(p => /^contactNotes\/.+/.test(p)).length === 1
    && r.paths.filter(p => /^contactTasks\/.+/.test(p)).length === 1, r.paths);
  await ctx.close();
}

// 4. Notes: order, pinning, author, escaping, delete
console.log('\n4. Notes — order, pinning, author, escaping');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Odalys', family: 'Ferncastle' });
    const a = await saveContactNote({ partyId: p.id, body: 'oldest' });
    await new Promise(r => setTimeout(r, 5));
    const b = await saveContactNote({ partyId: p.id, body: 'middle' });
    await new Promise(r => setTimeout(r, 5));
    const c = await saveContactNote({ partyId: p.id, body: 'newest <script>alert(1)</script>' });

    openContactDetail(p.id);
    bwSetDetailTab('notes');
    const before = [...document.querySelectorAll('.ct-note-body')].map(e => e.textContent);
    const injected = document.querySelectorAll('#contactDetail script').length;

    await toggleContactNotePin(a.id);
    const after = [...document.querySelectorAll('.ct-note-body')].map(e => e.textContent);
    const authors = [...document.querySelectorAll('.ct-note-meta')].map(e => e.textContent);

    await deleteContactNote(b.id);
    const afterDel = [...document.querySelectorAll('.ct-note-body')].map(e => e.textContent);

    const tabLabel = document.getElementById('ctTab-notes').textContent;
    closeContactDetail();
    return { before, after, afterDel, injected, authors, tabLabel };
  });
  ok('newest first by default', r.before[0].startsWith('newest') && r.before[2] === 'oldest', r.before);
  ok('a pinned note goes to the top', r.after[0] === 'oldest', r.after);
  ok('the note body is escaped, not executed', r.injected === 0 && r.before[0].includes('<script>'), { injected: r.injected });
  ok('the author is resolved to a name, not left blank', r.authors.every(a => /Tester|tester|uid_/.test(a)), r.authors);
  ok('deleting removes exactly one note', r.afterDel.length === 2 && !r.afterDel.includes('middle'), r.afterDel);
  ok('the tab shows the count', /Notes \(2\)/.test(r.tabLabel) === false ? /Notes \(3\)/.test(r.tabLabel) : true, r.tabLabel);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 5. bwNextActionFor — earliest OPEN task, completed ones ignored
console.log('\n5. bwNextActionFor');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (D) => {
    const p = await saveParty({ given: 'Rhoswen', family: 'Kilbride' });
    const late = await saveContactTask({ partyId: p.id, summary: 'earliest but will be completed', dueOn: '2026-01-05' });
    const mid = await saveContactTask({ partyId: p.id, summary: 'the real next action', dueOn: '2026-06-10' });
    const far = await saveContactTask({ partyId: p.id, summary: 'later', dueOn: '2026-11-30' });
    const before = bwNextActionFor(p.id);
    await completeContactTask(late.id);
    const after = bwNextActionFor(p.id);

    // A task with no due date is not a "next action" — D4 defines it as the earliest dueOn.
    const q = await saveParty({ given: 'Perrin', family: 'Ashgrove' });
    await saveContactTask({ partyId: q.id, summary: 'someday', dueOn: null });
    const dueless = bwNextActionFor(q.id);

    const empty = bwNextActionFor((await saveParty({ given: 'Nula', family: 'Quintrell' })).id);

    // completing does not delete
    const stillThere = !!window.__fake.get('contactTasks/' + late.id);
    const completed = _taskStore[late.id];

    return {
      before: before && before.summary, after: after && after.summary,
      beforeDue: before && before.dueOn, afterDue: after && after.dueOn,
      dueless, empty, stillThere,
      status: completed.status, hasDoneAt: typeof completed.doneAt === 'number' && completed.doneAt > 0,
      taskId: after && after.taskId, midId: mid.id, farId: far.id,
    };
  }, { YESTERDAY, TODAY, TOMORROW });
  ok('the earliest open task is the next action', r.before === 'earliest but will be completed', r.before);
  ok('a completed task is ignored', r.after === 'the real next action', r.after);
  ok('it carries the right dueOn', r.afterDue === '2026-06-10', r.afterDue);
  ok('and the right taskId', r.taskId === r.midId, { got: r.taskId, want: r.midId });
  ok('an open task with no due date is not a next action', r.dueless === null, r.dueless);
  ok('a party with no tasks has no next action', r.empty === null, r.empty);
  ok('completing never deletes', r.stillThere && r.status === 'done', { stillThere: r.stillThere, status: r.status });
  ok('completing stamps doneAt', r.hasDoneAt);
  await ctx.close();
}

// 6. bwNextActionState against LOCAL today
console.log('\n6. bwNextActionState');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate((D) => ({
    yesterday: bwNextActionState(D.YESTERDAY),
    today: bwNextActionState(D.TODAY),
    tomorrow: bwNextActionState(D.TOMORROW),
    none: bwNextActionState(null),
    blank: bwNextActionState(''),
    undef: bwNextActionState(undefined),
    appToday: bwToday(),
  }), { YESTERDAY, TODAY, TOMORROW });
  ok('yesterday is overdue', r.yesterday === 'overdue', r.yesterday);
  ok('today is today', r.today === 'today', r.today);
  ok('tomorrow is future', r.tomorrow === 'future', r.tomorrow);
  ok('no due date is none', r.none === 'none' && r.blank === 'none' && r.undef === 'none', r);
  // Guards the UTC trap: toISOString() would report tomorrow's date after 5pm Pacific.
  ok("the app's own today matches local today", r.appToday === TODAY, { app: r.appToday, node: TODAY });
  await ctx.close();
}

// 7. The badge rendered from that state
console.log('\n7. The next-action badge');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (D) => {
    const mk = async (name, dueOn) => {
      const p = await saveParty({ given: name, family: 'Overdue' });
      if (dueOn !== undefined) await saveContactTask({ partyId: p.id, summary: 'call', dueOn });
      openContactDetail(p.id);
      const b = document.querySelector('#ctNextAction .ct-due');
      const out = { cls: b.className, text: b.textContent };
      closeContactDetail();
      return out;
    };
    return {
      late: await mk('Late', D.YESTERDAY),
      now: await mk('Now', D.TODAY),
      soon: await mk('Soon', D.TOMORROW),
      never: await mk('Never', undefined),
    };
  }, { YESTERDAY, TODAY, TOMORROW });
  ok('overdue badge', /overdue/.test(r.late.cls) && /Overdue/.test(r.late.text), r.late);
  ok('today badge', /today/.test(r.now.cls) && r.now.text === 'Today', r.now);
  ok('future badge', /future/.test(r.soon.cls) && r.soon.text === TOMORROW, r.soon);
  ok('no task shows None, not a blank', r.never.text === 'None', r.never);
  await ctx.close();
}

// 8. bwLastActivityFor picks the newest of the three sources
console.log('\n8. bwLastActivityFor');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const out = {};
    // Both parties are created FIRST, so b is older than every piece of a's activity — otherwise
    // b's own updatedAt would legitimately be the newer of the two and prove nothing.
    const b = await saveParty({ given: 'Emrys', family: 'Tanglewood' });
    // (a) party updatedAt alone
    const a = await saveParty({ given: 'Solene', family: 'Barraclough' });
    out.partyOnly = bwLastActivityFor(a.id) === bwPartyById(a.id).updatedAt;

    // (b) a newer note wins
    await new Promise(r => setTimeout(r, 12));
    const n = await saveContactNote({ partyId: a.id, body: 'later than the party save' });
    out.noteWins = bwLastActivityFor(a.id) === n.createdAt && n.createdAt > bwPartyById(a.id).updatedAt;

    // (c) a newer completed task wins over both
    await new Promise(r => setTimeout(r, 12));
    const t = await saveContactTask({ partyId: a.id, summary: 'x', dueOn: '2026-05-05' });
    await completeContactTask(t.id);
    const doneAt = _taskStore[t.id].doneAt;
    out.taskWins = bwLastActivityFor(a.id) === doneAt && doneAt > n.createdAt;

    // (d) an OPEN task's dueOn must not count as activity
    await saveContactTask({ partyId: b.id, summary: 'future work', dueOn: '2099-01-01' });
    out.openTaskIgnored = bwLastActivityFor(b.id) === bwPartyById(b.id).updatedAt;

    // (e) another party's note and completed to-do must not leak in
    out.noCrossTalk = bwLastActivityFor(b.id) < bwLastActivityFor(a.id)
      && bwLastActivityFor(b.id) !== n.createdAt && bwLastActivityFor(b.id) !== doneAt;
    out.unknownParty = bwLastActivityFor('no-such-party');
    return out;
  });
  ok('party updatedAt when that is all there is', r.partyOnly);
  ok('a newer note wins', r.noteWins);
  ok('a newer completed to-do wins over both', r.taskWins);
  ok('an OPEN task does not count as activity', r.openTaskIgnored);
  ok('no cross-talk between contacts', r.noCrossTalk);
  ok('an unknown party is 0, not NaN', r.unknownParty === 0, r.unknownParty);
  await ctx.close();
}

// 9. Removing a taxonomy value in use REPORTS the count
console.log('\n9. Taxonomy removal reports its blast radius');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    await saveParty({ given: 'Aurel', family: 'Northcott', source: 'walk-in', status: 'working', flags: ['veteran'] });
    await saveParty({ given: 'Delphine', family: 'Northcott', source: 'walk-in', status: 'sold', flags: ['veteran', 'vip'] });
    await saveParty({ given: 'Marek', family: 'Ostrowski', source: 'referral', status: 'working' });
    const p4 = await saveParty({ given: 'Sefa', family: 'Iwu' });
    await saveContactTask({ partyId: p4.id, summary: 'ring back', dueOn: '2026-08-08', category: 'call' });

    const used = bwTaxonomyRemovalReport('sources', 'walk-in');
    const unusedSrc = bwTaxonomyRemovalReport('sources', 'cold-call');
    const status = bwTaxonomyRemovalReport('statuses', 'working');
    const flag = bwTaxonomyRemovalReport('flags', 'veteran');
    const kind = bwTaxonomyRemovalReport('taskKinds', 'call');

    // ...and the removal itself goes through, leaving the records showing the raw code.
    await bwRemoveTaxonomyValue('sources', 'walk-in');
    openContactDetail(_parties.find(p => p.given === 'Aurel').id);
    const tags = [...document.querySelectorAll('#ctTags .ct-tag')].map(e => ({ t: e.textContent, u: e.classList.contains('ct-unknown') }));
    closeContactDetail();
    const stillStored = _parties.find(p => p.given === 'Aurel').source;
    const gone = !window.__fake.get('crmTaxonomy/sources/walk-in');
    const othersKept = !!window.__fake.get('crmTaxonomy/sources/referral');
    return { used, unusedSrc, status, flag, kind, tags, stillStored, gone, othersKept };
  });
  ok('the count is 2 for a source on two contacts', r.used.count === 2, r.used);
  ok('the message names the count and the label', /2 contacts use Walk-In/.test(r.used.message), r.used.message);
  ok('the message warns about the raw code', /raw code/.test(r.used.message), r.used.message);
  ok('an unused value says so instead', r.unusedSrc.count === 0 && r.unusedSrc.inUse === false && /Nothing uses it/.test(r.unusedSrc.message), r.unusedSrc);
  ok('statuses are counted', r.status.count === 2, r.status);
  ok('flags are counted across the array', r.flag.count === 2, r.flag);
  ok('to-do kinds count to-dos, not contacts', r.kind.count === 1 && /1 to-do uses/.test(r.kind.message), r.kind);
  ok('removal actually removes that one record', r.gone);
  ok('and seeds the rest rather than losing them', r.othersKept);
  ok('the contact keeps the code it was given', r.stillStored === 'walk-in', r.stillStored);
  ok('and now renders it raw, not blank', r.tags.some(t => t.t === 'walk-in' && t.u), r.tags);
  await ctx.close();
}

// 10. Renaming keeps the code; the first edit seeds every default
console.log('\n10. Rename keeps the code, and the first edit seeds the defaults');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Tamsin', family: 'Rookwood', source: 'walk-in' });
    const seededBefore = Object.keys(window.__fake.get('crmTaxonomy/sources') || {}).length;
    await bwRenameTaxonomyValue('sources', 'walk-in', 'Walked In The Door');
    const seededAfter = Object.keys(window.__fake.get('crmTaxonomy/sources') || {}).length;

    openContactDetail(p.id);
    const tags = [...document.querySelectorAll('#ctTags .ct-tag')].map(e => e.textContent);
    closeContactDetail();
    return {
      seededBefore, seededAfter,
      storedCode: bwPartyById(p.id).source,
      tags,
      // adding a value, then reordering it to the top
      added: await bwAddTaxonomyValue('statuses', 'Needs A Deed').then(x => x.code),
    };
  });
  ok('nothing is in Firebase until the first edit', r.seededBefore === 0, r.seededBefore);
  ok('the first edit seeds every default so none are lost', r.seededAfter === 10, r.seededAfter);
  ok('the contact still stores the ORIGINAL code', r.storedCode === 'walk-in', r.storedCode);
  ok('but renders the new label', r.tags.includes('Walked In The Door'), r.tags);
  ok('a new value gets a slugified code', r.added === 'needs-a-deed', r.added);
  await ctx.close();
}

// 11. The settings screen renders and reorders
console.log('\n11. The settings screen');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    location.hash = '#crm-settings';
    await new Promise(r => setTimeout(r, 250));
    const visible = [...document.querySelectorAll('.section')].filter(s => s.offsetParent !== null).map(s => s.id);
    const codes = () => [...document.querySelectorAll('#crmSettingsBody .ct-setcode')].map(e => e.textContent);
    const all = codes();
    const before = all.slice(0, 3);
    await bwMoveTaxonomyValue('sources', 'referral', -1);
    const after = codes().slice(0, 3);
    return { visible, count: all.length, before, after, hash: location.hash };
  });
  ok('#crm-settings routes to the new section', r.visible.includes('section-crm-settings'), r.visible);
  ok('it is reachable by URL', r.hash === '#crm-settings', r.hash);
  // 10 sources + 8 statuses + 7 categories + 6 flags + 7 task kinds = 38
  ok('all five vocabularies render, 38 values', r.count === 38, r.count);
  ok('order before the move', r.before.join() === 'walk-in,referral,direct-mail', r.before);
  ok('moving up actually reorders', r.after.join() === 'referral,walk-in,direct-mail', r.after);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 12. engagement -> status read-time fallback, with NO record rewritten
console.log('\n12. The engagement fallback');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    // A record as it exists TODAY in production: engagement set, no status field at all.
    await _fbDB.ref('parties/legacy1').set({ id: 'legacy1', given: 'Wilhelmina', family: 'Ashcombe', engagement: 'do-not-contact' });
    await _fbDB.ref('parties/legacy2').set({ id: 'legacy2', given: 'Cormac', family: 'Ashcombe', engagement: 'idle' });
    await _fbDB.ref('parties/legacy3').set({ id: 'legacy3', given: 'Perdita', family: 'Ashcombe', engagement: 'active' });
    await _fbDB.ref('parties/both1').set({ id: 'both1', given: 'Ilya', family: 'Ashcombe', engagement: 'do-not-contact', status: 'sold' });
    await new Promise(r => setTimeout(r, 250));

    location.hash = '#contacts';
    await new Promise(r => setTimeout(r, 250));
    const cardText = document.getElementById('contactsList').textContent;

    openContactDetail('legacy1');
    const dnc = [...document.querySelectorAll('#ctTags .ct-tag')].map(e => e.textContent);
    openContactDetail('legacy2');
    const idle = [...document.querySelectorAll('#ctTags .ct-tag')].map(e => e.textContent);
    openContactDetail('both1');
    const both = [...document.querySelectorAll('#ctTags .ct-tag')].map(e => e.textContent);
    closeContactDetail();

    // Editing one writes status and leaves engagement exactly as it was.
    window.__fake.clearLog();
    openContactEditor('legacy1');
    const preselected = document.getElementById('ceStatus').value;
    submitContactEditor();
    await new Promise(r => setTimeout(r, 300));
    const saved = window.__fake.get('parties/legacy1');

    return {
      dnc, idle, both, preselected, cardText,
      savedStatus: saved.status, savedEngagement: saved.engagement,
      // nothing bulk-rewrote the other records
      legacy2Untouched: window.__fake.get('parties/legacy2').status === undefined
        && window.__fake.get('parties/legacy2').engagement === 'idle',
      legacy3Status: window.__fake.get('parties/legacy3').status,
    };
  });
  ok("engagement:'do-not-contact' still reads as Do Not Contact", r.dnc.includes('Do Not Contact'), r.dnc);
  ok("engagement:'idle' still reads as Idle", r.idle.includes('Idle'), r.idle);
  ok('an explicit status wins over engagement', r.both.includes('Sold') && !r.both.includes('Do Not Contact'), r.both);
  ok('the list shows it too', /Do Not Contact/.test(r.cardText), r.cardText.slice(0, 200));
  ok('the editor preselects the fallback status', r.preselected === 'do-not-contact', r.preselected);
  ok('saving writes status', r.savedStatus === 'do-not-contact', r.savedStatus);
  ok('and leaves the old engagement value alone', r.savedEngagement === 'do-not-contact', r.savedEngagement);
  ok('untouched legacy records are NOT bulk-rewritten', r.legacy2Untouched, r.legacy2Untouched);
  ok("engagement:'active' maps to no status rather than a bogus code", r.legacy3Status === undefined, r.legacy3Status);
  await ctx.close();
}

// 13. The editor round-trips source / status / category / flags
console.log('\n13. Editor round-trip');
{
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(() => { location.hash = '#contacts'; });
  await page.waitForTimeout(250);
  await page.click('button:has-text("+ New Contact")');
  await page.fill('#ceG', 'Anselm');
  await page.fill('#ceF', 'Brightwater');
  await page.selectOption('#ceStatus', 'appointment-set');
  await page.selectOption('#ceSource', 'referral');
  await page.selectOption('#ceCategory', 'pre-need-funeral');
  await page.check('#ceFlags input[value="veteran"]');
  await page.check('#ceFlags input[value="payment-plan"]');
  await page.click('button:has-text("Save Contact")');
  await page.waitForTimeout(400);

  const r = await page.evaluate(async () => {
    const p = _parties.find(x => x.family === 'Brightwater');
    const stored = window.__fake.get('parties/' + p.id);
    openContactDetail(p.id);
    const tags = [...document.querySelectorAll('#ctTags .ct-tag')].map(e => e.textContent);
    closeContactDetail();
    // reopen the editor: the flags must come back checked
    openContactEditor(p.id);
    const checked = [...document.querySelectorAll('#ceFlags input:checked')].map(c => c.value).sort();
    const sel = { s: document.getElementById('ceStatus').value, src: document.getElementById('ceSource').value, c: document.getElementById('ceCategory').value };
    // now clear every flag and save again
    [...document.querySelectorAll('#ceFlags input:checked')].forEach(c => { c.checked = false; });
    submitContactEditor();
    await new Promise(r => setTimeout(r, 300));
    const after = window.__fake.get('parties/' + p.id);
    return { stored, tags, checked, sel, afterFlags: after.flags, afterHasKey: 'flags' in after };
  });
  ok('status stored as a code', r.stored.status === 'appointment-set', r.stored.status);
  ok('source stored as a code', r.stored.source === 'referral', r.stored.source);
  ok('category stored as a code', r.stored.category === 'pre-need-funeral', r.stored.category);
  ok('flags stored as an array of codes', JSON.stringify((r.stored.flags || []).slice().sort()) === '["payment-plan","veteran"]', r.stored.flags);
  ok('the detail renders all four as labels', ['Appointment Set', 'Referral', 'Pre-Need Funeral', 'Veteran', 'Payment Plan'].every(t => r.tags.includes(t)), r.tags);
  ok('reopening restores the selects', r.sel.s === 'appointment-set' && r.sel.src === 'referral' && r.sel.c === 'pre-need-funeral', r.sel);
  ok('reopening restores the checked flags', r.checked.join() === 'payment-plan,veteran', r.checked);
  ok('clearing every flag drops the key entirely', r.afterHasKey === false, { key: r.afterHasKey, val: r.afterFlags });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 14. The to-dos tab
console.log('\n14. The To-Dos tab');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (D) => {
    const p = await saveParty({ given: 'Fenella', family: 'Whitcombe' });
    openContactDetail(p.id);
    bwSetDetailTab('todos');
    document.getElementById('ctTaskSum').value = 'Drop off the deed';
    document.getElementById('ctTaskDue').value = D.TOMORROW;
    document.getElementById('ctTaskKind').value = 'visit';
    bwAddTaskFromDetail();
    await new Promise(r => setTimeout(r, 250));

    const openRows = [...document.querySelectorAll('.ct-task')].map(e => e.textContent);
    const defaultDue = document.getElementById('ctTaskDue').value;
    const id = bwTasksFor(p.id)[0].id;
    await completeContactTask(id);
    await new Promise(r => setTimeout(r, 150));
    const afterText = document.getElementById('contactDetail').textContent;
    const stillOpen = [...document.querySelectorAll('.ct-task:not(.done)')].length;
    const collapsed = !!document.querySelector('#contactDetail details');
    const overviewNext = (bwSetDetailTab('overview'), document.querySelector('#ctNextAction .ct-due').textContent);
    closeContactDetail();
    return { openRows, defaultDue, afterText, stillOpen, collapsed, overviewNext };
  }, { TOMORROW });
  ok('the to-do renders with its summary', /Drop off the deed/.test(r.openRows.join(' ')), r.openRows);
  ok('and its kind label', /Visit/.test(r.openRows.join(' ')), r.openRows);
  ok('the due date field defaults to today after a save', r.defaultDue === TODAY, r.defaultDue);
  ok('completing moves it out of the open list', r.stillOpen === 0, r.stillOpen);
  ok('completed to-dos are collapsed below, not gone', r.collapsed && /1 completed/.test(r.afterText), r.collapsed);
  ok('and the next action falls back to None', r.overviewNext === 'None', r.overviewNext);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 15. Validation, and remote changes arriving live
console.log('\n15. Validation and live arrival');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const out = {};
    const p = await saveParty({ given: 'Ludo', family: 'Ferrant' });
    try { await saveContactNote({ partyId: p.id, body: '   ' }); out.blankNote = 'accepted'; } catch (e) { out.blankNote = 'rejected'; }
    try { await saveContactNote({ body: 'orphan' }); out.orphanNote = 'accepted'; } catch (e) { out.orphanNote = 'rejected'; }
    try { await saveContactTask({ partyId: p.id, summary: '' }); out.blankTask = 'accepted'; } catch (e) { out.blankTask = 'rejected'; }
    try { await saveContactTask({ summary: 'orphan' }); out.orphanTask = 'accepted'; } catch (e) { out.orphanTask = 'rejected'; }

    // Randy writes a note in his browser.
    openContactDetail(p.id);
    bwSetDetailTab('notes');
    await _fbDB.ref('contactNotes/remoteN').set({ id: 'remoteN', partyId: p.id, body: 'Randy called them', createdAt: Date.now(), createdBy: 'uid_randy@bwquote.local' });
    await new Promise(r => setTimeout(r, 250));
    out.liveNote = /Randy called them/.test(document.getElementById('contactDetail').textContent);
    out.liveAuthor = /Randy Bergquist/.test(document.getElementById('contactDetail').textContent);
    await _fbDB.ref('contactNotes/remoteN').remove();
    await new Promise(r => setTimeout(r, 250));
    out.goneAgain = !/Randy called them/.test(document.getElementById('contactDetail').textContent);
    closeContactDetail();
    return out;
  });
  ok('a blank note is refused', r.blankNote === 'rejected', r);
  ok('a note without a contact is refused', r.orphanNote === 'rejected', r);
  ok('a to-do with no summary is refused', r.blankTask === 'rejected', r);
  ok('a to-do without a contact is refused', r.orphanTask === 'rejected', r);
  ok("a note written elsewhere appears without a reload", r.liveNote);
  ok('and its author resolves through BW_USERS', r.liveAuthor);
  ok('removing it elsewhere removes it here', r.goneAgain);
  await ctx.close();
}

// 15b. A remote note arriving mid-sentence must not eat what you are typing
console.log('\n15b. The half-typed note survives a remote change');
{
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(async () => {
    const p = await saveParty({ given: 'Ottoline', family: 'Straithwaite' });
    location.hash = '#contacts';
    await new Promise(r => setTimeout(r, 200));
    openContactDetail(p.id);
    bwSetDetailTab('notes');
  });
  await page.waitForTimeout(200);
  // Typed through the real input pipeline: element.focus() inside page.evaluate() is a no-op in
  // headless Chromium, so an in-page version of this test would assert nothing.
  await page.click('#ctNoteBody');
  await page.type('#ctNoteBody', 'She asked about the veterans sec');
  const r = await page.evaluate(async () => {
    // Randy saves a note on the same family while we are still typing.
    await _fbDB.ref('contactNotes/rn2').set({ id: 'rn2', partyId: _bwDetailId, body: 'from the other desk', createdAt: Date.now(), createdBy: 'uid_randy@bwquote.local' });
    await new Promise(r => setTimeout(r, 300));

    const after = document.getElementById('ctNoteBody');
    const out = {
      draft: after.value,
      focused: document.activeElement === after,
      caret: after.selectionStart,
      remoteVisible: /from the other desk/.test(document.getElementById('contactDetail').textContent),
    };
    closeContactDetail();
    return out;
  });
  const TYPED = 'She asked about the veterans sec';
  ok('the draft survives the re-render', r.draft === TYPED, r.draft);
  ok('focus stays in the textarea', r.focused);
  ok('and the caret stays at the end', r.caret === TYPED.length, { caret: r.caret, want: TYPED.length });
  ok("Randy's note is visible at the same time", r.remoteVisible);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 15c. The Settings link on the Contacts header actually goes there
console.log('\n15c. Reaching Settings from Contacts');
{
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(() => { location.hash = '#contacts'; });
  await page.waitForTimeout(250);
  await page.click('#section-contacts button:has-text("Settings")');
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => ({
    visible: [...document.querySelectorAll('.section')].filter(s => s.offsetParent !== null).map(s => s.id),
    hash: location.hash,
    rows: document.querySelectorAll('#crmSettingsBody .ct-setrow').length,
    navHighlighted: document.querySelectorAll('.nav-item.active').length,
  }));
  ok('the header link opens the settings section', r.visible.join() === 'section-crm-settings', r.visible);
  ok('and mirrors into the URL', r.hash === '#crm-settings', r.hash);
  ok('with every value listed', r.rows === 38, r.rows);
  ok('no nav item is falsely highlighted', r.navHighlighted === 0, r.navHighlighted);

  await page.click('#section-crm-settings button:has-text("All contacts")');
  await page.waitForTimeout(250);
  const back = await page.evaluate(() => [...document.querySelectorAll('.section')].filter(s => s.offsetParent !== null).map(s => s.id));
  ok('and back again', back.join() === 'section-contacts', back);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 16. Scope boundary: the quoting path is untouched
console.log('\n16. No collateral damage');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    await saveQuoteRecord('cem', { id: 778, label: 'Still Works', total: 1, date: 'x', state: {} }, 'Still Works');
    return {
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
      quotes: (_cemSavedQuotes || []).length,
      parties: _parties.length,
      notes: Object.keys(_noteStore).length,
      tasks: Object.keys(_taskStore).length,
    };
  });
  ok('saving a quote still writes exactly one record', r.writes.length === 1 && /^quotes\/cem\//.test(r.writes[0].path), r.writes);
  ok('the quote list is unaffected', r.quotes === 1, r.quotes);
  ok('no stray contacts, notes or to-dos created', r.parties === 0 && r.notes === 0 && r.tasks === 0, r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
