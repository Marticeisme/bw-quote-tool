// Writes data/demo-contacts.csv. Kept as a script so the file's shape is reviewable as data
// rather than as 31 hand-typed lines, and so the expected view counts can be re-derived.
//
// SYNTHETIC BY RULE (DESIGN.md §6): invented names, @example.com only, phones only in the
// reserved fictional (206) 555-01xx range, generic public city names. Nothing here comes from
// any real record or from wmp-cemetery-map/.
import fs from 'fs';

const COLS = ['first','last','email','phone','street','city','state','zip','source','status',
              'category','flags','salutation','note','next_action','next_action_date',
              'property_section','property_lot','property_lot_alpha','property_space',
              'property_sid','property_kind','property_spaces_owned','property_interments_used',
              'property_deed','property_purchased_on'];

// ── THE PROPERTY COLUMNS, and why these positions and no others ──────────────────────
//
// Martice asked for locations taken from MIS's own lot-inquiry export
// (E:\Downloads\LotInquiryList.csv, 40,816 rows). Taken literally that would publish, in a
// PUBLIC repo, a record asserting that an invented person owns a grave a real person is buried
// in. So: real section codes, real row/tier letters and real space ranges — and every position
// GENERATED FROM THE HOLES, i.e. from (section, alpha, space) triples the export does not record
// as occupied. tests/test-contact-property.mjs asserts zero collisions against that file and
// prints a loud NOTE when the file is not on the machine.
//
// Two measured facts that shaped this, both worth knowing before editing the table below:
//
//   1. The export's LotNumber (the BLOCK) is 0 on essentially every lawn row, so
//      (section, alpha, space) is NOT a unique grave there — garden 18's whole A-D x 1-4 grid
//      reads as occupied. That is why no demo position uses 06 07 09 10 11 13 14 16 17 17S 18
//      19 21 23 VETS VETSN CC ROA VERSES GOG: those sections have no free triple at all.
//      Gardens 08, 12, 15 and 20 do, and they are what the lawn cases use.
//   2. "Not in the interment list" is not the same as "not sold". The export only knows who is
//      INTERRED. It is the strongest guarantee this source can give, and the residual limit is
//      recorded here rather than left for someone to discover.
//
// sids are DEMO-1..3 on purpose. A real sid would deep-link the map at a real person's position.
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

// ── property, by 1-based data-row number ─────────────────────────────────────────────
// section, lot(block), row/tier letter, space, sid, kind, spacesOwned, intermentsUsed,
// deed, purchasedOn.
//
// `kind` is left blank wherever BW_SECTION_TYPES already knows it. It is filled in only for the
// two sections that hold BOTH products — COM has 301 niches and 574 crypts and a section code
// alone cannot say which one a family bought.
//
// The hand-computed availability each row is meant to show, and the rule it exercises:
//   row  2  Garden 12   2 owned, 0 interred -> 2 available     grave, capacity 1
//   row  4  Garden 12   4 owned, 2 interred -> 2 available     the headline case
//   row  5  SCGF        1 owned, 1 interred -> not derived     scattering, capacity unknown
//   row  6  COH         1 owned, 1 interred -> 0 available     the Court of Honor exception: 1
//   row  7  LUG         1 owned, 0 interred -> 1 available     Lake Urn Garden space: 1 urn
//   row  8  Garden 15   2 owned, 1 interred -> 1 available
//   row  9  COM crypt   1 owned, 1 interred -> not derived     mixed section, per-record kind
//   row 11  Garden 08   4 owned, 0 interred -> 4 available
//   row 13  GOM         1 owned, 0 interred -> 2 available     niche: 2 urns
//   row 14  GCN         2 owned, 0 interred -> 4 available     niche: 2 urns, two niches
//   row 15  RUG         2 owned, 1 interred -> not derived     urn garden, capacity unknown
//   row 17  Garden 08   2 owned, 1 interred -> 1 available
//   row 18  ELM         1 owned, 0 interred -> not derived     crypt, capacity per unit
//   row 19  MVC         3 owned, 0 interred -> 6 available
//   row 20  Garden 20   1 owned, 1 interred -> 0 available     the zero-available lawn case
//   row 21  CN          2 owned, 1 interred -> 3 available
//   row 23  SER         1 owned, 0 interred -> 2 available
//   row 24  ROAC        1 owned, 2 interred -> 0 available     a niche used to capacity
//   row 25  VETSM       1 owned, 0 interred -> 2 available
//   row 31  Garden 15   2 owned, 0 interred -> never created   the row that is skipped as a dup
const PROP = {
  2:  ['12',    '', 'A', '5',   '',       '',      '2', '0', 'D-118240', '1994-05-16'],
  4:  ['12',    '', 'B', '5',   'DEMO-1', '',      '4', '2', 'D-104772', '1988-09-02'],
  5:  ['SCGF',  '', '',  '13',  '',       '',      '1', '1', 'D-221096', '2011-03-28'],
  6:  ['COH',   '', 'A', '4',   '',       '',      '1', '1', 'D-160355', '2003-07-21'],
  7:  ['LUG',   '', 'B', '12',  'DEMO-2', '',      '1', '0', 'D-233418', '2016-02-09'],
  8:  ['15',    '', 'A', '5',   '',       '',      '2', '1', 'D-127903', '1996-11-04'],
  9:  ['COM',   '', 'A', '104', '',       'Crypt', '1', '1', 'D-198641', '2008-06-13'],
  11: ['08',    '', 'C', '9',   '',       '',      '4', '0', 'D-091507', '1979-04-25'],
  13: ['GOM',   '', 'B', '1',   '',       '',      '1', '0', 'D-244810', '2019-08-30'],
  14: ['GCN',   '', 'A', '3',   '',       '',      '2', '0', 'D-215566', '2010-01-15'],
  15: ['RUG',   '', 'NORTH', '22', '',    '',      '2', '1', 'D-186229', '2006-10-06'],
  17: ['08',    '', 'B', '7',   'DEMO-3', '',      '2', '1', 'D-073118', '1971-06-17'],
  18: ['ELM',   '', 'A', '13',  '',       '',      '1', '0', 'D-207934', '2009-05-11'],
  19: ['MVC',   '', 'F', '13',  '',       '',      '3', '0', 'D-239075', '2017-12-01'],
  20: ['20',    '', 'A', '5',   '',       '',      '1', '1', 'D-112680', '1991-02-19'],
  21: ['CN',    '', 'A', '1',   '',       '',      '2', '1', 'D-149302', '2000-08-08'],
  23: ['SER',   '', 'C', '1',   '',       '',      '1', '0', 'D-251447', '2021-05-24'],
  24: ['ROAC',  '', 'A', '2',   '',       '',      '1', '2', 'D-173865', '2004-03-09'],
  25: ['VETSM', '', '',  '61',  '',       '',      '1', '0', 'D-228190', '2013-11-12'],
  31: ['15',    '', 'D', '5',   '',       '',      '2', '0', 'D-127904', '1996-11-04'],
};
const BLANK_PROP = ['', '', '', '', '', '', '', '', '', ''];

if (R.length !== 31) throw new Error('expected 31 data rows, got ' + R.length);
R.forEach((r, i) => { if (r.length !== 16) throw new Error('row ' + (i + 1) + ' has ' + r.length + ' cells'); });
Object.keys(PROP).forEach((k) => {
  if (+k < 1 || +k > R.length) throw new Error('PROP names row ' + k + ', which does not exist');
  if (PROP[k].length !== BLANK_PROP.length) throw new Error('PROP row ' + k + ' has ' + PROP[k].length + ' cells');
});
// Two-thirds of the rows that actually land must carry property, so the existing-owner case is
// the visible one and the prospect case still exists. Row 31 is the deliberate duplicate: it is
// skipped on import, so its property is never created.
const withProp = Object.keys(PROP).filter((k) => +k !== 31).length;
if (withProp !== 19) throw new Error('expected 19 importable rows with property, got ' + withProp);

const ROWS = R.map((r, i) => r.concat(PROP[i + 1] || BLANK_PROP));
ROWS.forEach((r, i) => { if (r.length !== COLS.length) throw new Error('row ' + (i + 1) + ' has ' + r.length + ' cells'); });

const cell = (v) => (/[",\r\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
const csv = [COLS.join(',')].concat(ROWS.map(r => r.map(cell).join(','))).join('\r\n') + '\r\n';

fs.writeFileSync('data/demo-contacts.csv', csv, 'utf8');
console.log('wrote data/demo-contacts.csv —', csv.length, 'bytes,', R.length, 'data rows');
