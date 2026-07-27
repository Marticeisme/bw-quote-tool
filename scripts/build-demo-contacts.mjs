// Writes data/demo-contacts.csv. Kept as a script so the file's shape is reviewable as data
// rather than as 31 hand-typed lines, and so the expected view counts can be re-derived.
//
// SYNTHETIC BY RULE (DESIGN.md §6): invented names, @example.com only, phones only in the
// reserved fictional (206) 555-01xx range, generic public city names. Nothing here comes from
// any real record or from wmp-cemetery-map/.
import fs from 'fs';

const COLS = ['first','last','email','phone','street','city','state','zip','source','status',
              'category','flags','salutation','note','next_action','next_action_date'];

// first, last, email, phone, street, city, state, zip, source, status, category, flags,
// salutation, note, next_action, next_action_date
const R = [
  // ── ten rows carrying an open to-do ────────────────────────────────────────────────
  // six overdue (Needs follow-up), two far-future, two with no due date at all.
  ['Delphine','Aristide','delphine.aristide@example.com','(206) 555-0101','4180 S Ridgeway Ln','Burien','WA','98166','Walk-In','Working','Pre-Need Cemetery','Veteran','Dear Del,','Toured the veterans section, wants two spaces side by side','Call back about the veterans section','2026-06-18'],
  ['Marcus','Bellweather','marcus.bellweather@example.com','(206) 555-0102','921 Cedar Grove Ave','Renton','WA','98055','Referral','Appointment Set','Pre-Need Funeral','','','','Annual plan review','2029-04-12'],
  ['Rosalind','Cadwallader','rosalind.cadwallader@example.com','(206) 555-0103','210 Emerald Hills Dr','SeaTac','WA','98148','Walk-In','New','Pre-Need Cemetery','','','','',''],
  ['Teodoro','Vasquez-Marin','teodoro.vasquez@example.com','(206) 555-0104','55 Riverton Heights','SeaTac','WA','98148','Referral','Working','Pre-Need Funeral','','',"Prefers his wife's family plot in section 12",'',''],
  ['Henrietta','Doverhill','henrietta.doverhill@example.com','(206) 555-0105','63 Larkspur Ct','Tukwila','WA','98188','Direct Mail','Presented','Pre-Need Cemetery','Payment Plan','','','Send the payment schedule','2026-07-02'],
  ['Ignatius','Pemberly','ignatius.pemberly@example.com','(206) 555-0106','1877 Highline Ave S','Burien','WA','98166','Direct Mail','New','Pre-Need Funeral','','','','',''],
  ['Solveig','Skagerling','solveig.skagerling@example.com','(206) 555-0107','42 Fauntleroy Way','Seattle','WA','98126','Web Lead','Working','Pre-Need Cemetery','','','','',''],
  ['Barnaby','Wickersham','barnaby.wickersham@example.com','(206) 555-0108','7712 Marine Hills Way','Federal Way','WA','98003','Web Lead','Working','Pre-Need Cemetery','','','','Second follow-up call','2026-07-10'],
  ['Clementine','Ashgrove','clementine.ashgrove@example.com','(206) 555-0109','3390 Military Rd S','SeaTac','WA','98188','At-Need Family','Sold','At-Need','Estate','Dear Clem & family,','Service held in April. Estate paperwork complete.','',''],
  ['Fitzgerald','Okonjo','fitzgerald.okonjo@example.com','(206) 555-0110','250 Kent-Des Moines Rd','Kent','WA','98032','Phone-In','Working','At-Need','','','','Call when he is back from the hospital',''],

  ['Perpetua','Lindqvist','perpetua.lindqvist@example.com','(206) 555-0111','715 Three Tree Point Rd','Burien','WA','98166','Community Event','New','Pre-Need Cemetery','','','','',''],
  ['Oswald','Trembleton','oswald.trembleton@example.com','(206) 555-0112','1104 Angle Lake Dr','SeaTac','WA','98188','Walk-In','Appointment Set','Pre-Need Funeral','','','Coming in Thursday to look at urns.','',''],
  ['Marisol','Echevarria','marisol.echevarria@example.com','(206) 555-0113','1490 Beacon Crest Dr','Seattle','WA','98108','Community Event','Working','Pre-Need Funeral','Spanish Speaking','','','Bring the Spanish brochure','2026-06-30'],
  ['Cornelius','Blythewood','cornelius.blythewood@example.com','(206) 555-0114','9 Star Lake Rd','Federal Way','WA','98003','Referral','Presented','Pre-Need Cemetery','Payment Plan','','','',''],
  ['Winifred','Halloway','winifred.halloway@example.com','(206) 555-0115','2266 Duwamish Trail','Seattle','WA','98108','Cold Call','Working','Other','','','','',''],
  ['Ambrose','Ashendale','ambrose.ashendale@example.com','(206) 555-0116','480 Kent Valley Hwy','Kent','WA','98032','Cold Call','Not Interested','Other','Do Not Mail','','','',''],
  ['Xiomara','Delacroix','xiomara.delacroix@example.com','(206) 555-0117','88 Normandy Terrace','Normandy Park','WA','98166','Existing Owner','Working','Existing Owner','','','','Marker order paperwork','2026-05-22'],
  ['Reginald','Tuppence','reginald.tuppence@example.com','(206) 555-0118','133 Salmon Creek Way','Burien','WA','98166','Direct Mail','Idle','Pre-Need Funeral','','','Asked us to check back next spring.','',''],
  ['Genevieve','Marchbanks','genevieve.marchbanks@example.com','(206) 555-0119','3305 Puget Sound Ave','Des Moines','WA','98198','Referral','Appointment Set','Pre-Need Cemetery','VIP; Estate','','','Review the trust paperwork','2029-09-04'],
  ['Thaddeus','Ravenscroft','thaddeus.ravenscroft@example.com','(206) 555-0120','7080 Sylvester Rd SW','Seattle','WA','98126','Phone-In','New','Family of Record','','','','',''],

  ['Beatrix','Sandoval-Reyes','beatrix.sandoval@example.com','(206) 555-0121','604 Ambaum Blvd SW','White Center','WA','98146','Walk-In','New','Pre-Need Cemetery','Spanish Speaking','','','Wait for her daughter to visit',''],
  ['Ellsworth','Pennyworth','ellsworth.pennyworth@example.com','(206) 555-0122','512 Pacific Hwy S','Des Moines','WA','98198','Other','Do Not Contact','Other','Do Not Mail','','','',''],
  ['Lucinda','Wintergarth','lucinda.wintergarth@example.com','(206) 555-0123','1200 SW Sunset Blvd, Apt 4B','Renton','WA','98055','Cold Call','Working','Pre-Need Funeral','','','','Confirm she received the guide','2026-07-14'],
  ['Horatio','Kingsley','horatio.kingsley@example.com','(206) 555-0124','1601 Highline Blvd','Burien','WA','98166','Existing Owner','Sold','Existing Owner','','','','',''],
  ['Anneliese','Brightmore','anneliese.brightmore@example.com','(206) 555-0125','344 Chinook Wind Ln','Tukwila','WA','98188','Web Lead','Working','Veteran','Veteran','','','',''],

  // ── five rows that are deliberately incomplete, one per Data-health rule ───────────
  // 26: no first name, so no salutation can be auto-filled.
  ['','Vandermolen','m.vandermolen@example.com','(206) 555-0126','90 Boulevard Park Pl','Seattle','WA','98148','Walk-In','Working','Pre-Need Cemetery','','','','',''],
  // 27: no email and no phone. Still importable — a name alone is a valid contact.
  ['Cassius','Bramblewood','','','27 Longfellow Creek','Seattle','WA','98126','Referral','New','Pre-Need Funeral','','','','',''],
  // 28: no source.
  ['Philippa','Thornbecket','philippa.thornbecket@example.com','(206) 555-0128','1450 Southcenter Pkwy','Tukwila','WA','98188','','Working','Pre-Need Cemetery','','','','',''],
  // 29: no status.
  ['Ignacio','Ferreira','ignacio.ferreira@example.com','(206) 555-0129','806 Riverton Ave','SeaTac','WA','98148','Phone-In','','Pre-Need Funeral','','','','',''],
  // 30: a phone that is not ten digits.
  ['Octavia','Sternwood','octavia.sternwood@example.com','555-0130','2110 Pacific Hwy S','Federal Way','WA','98003','Community Event','Working','Pre-Need Cemetery','','','','',''],

  // ── 31: the same person entered a second time, spelled differently, same email ─────
  // Deliberate, and asserted in tests/test-contact-csv.mjs: it is what makes the duplicate
  // skip visible in the preview during the operator's own import. It is NOT a copied line —
  // the name, the phone and the note all differ; only the email matches row 8.
  ['Barnabas','Wickersham','barnaby.wickersham@example.com','(206) 555-0131','7712 Marine Hills Way','Federal Way','WA','98003','Web Lead','New','Pre-Need Cemetery','','','Second entry for the Wickersham family, typed by mistake.','',''],
];

const cell = (v) => (/[",\r\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
const csv = [COLS.join(',')].concat(R.map(r => r.map(cell).join(','))).join('\r\n') + '\r\n';

if (R.length !== 31) throw new Error('expected 31 data rows, got ' + R.length);
R.forEach((r, i) => { if (r.length !== COLS.length) throw new Error('row ' + (i + 1) + ' has ' + r.length + ' cells'); });

fs.writeFileSync('data/demo-contacts.csv', csv, 'utf8');
console.log('wrote data/demo-contacts.csv —', csv.length, 'bytes,', R.length, 'data rows');
