// Generates the world-regions repatriation graphic as inline SVG for
// inman-travel-plan-guide.html. Run from the repo root:
//   node scripts/build_inman_region_map.mjs   (prints the markup; splice it into the guide)
//
// Laid out west to east so the three columns read as geography: the Americas,
// then Europe and Africa, then the Middle East and Asia and the Pacific.
// Every size is in USER UNITS and the viewBox is 720 wide, which is the printed
// column at 96dpi (7.5in), so one user unit is one printed CSS pixel and the
// 14px floor in the graphic is a real 14px on paper.
const W = 720, COLW = 236, GUT = 6, HEADY = 20, TOP = 30, GAP = 10;
const h = (n) => 74 + 20 * n;

const COLS = [
  { head: 'THE AMERICAS', plates: [
    { name: 'Domestic, 75 miles and up', range: '$1,500–$3,000', ex: [
      ['Coast to coast', '$2,000–$3,000'], ['Hawaii', '$2,850–$6,250'],
      ['Arizona', '$1,500–$2,500']] },
    { name: 'Mexico & Central America', range: '$5,000–$14,000', ex: [
      ['Mexico', '$5,000–$6,500'], ['El Salvador', '$7,500–$9,000'],
      ['Central America', '$9,000–$14,000']] },
    { name: 'South America', range: '$11,000–$11,500', ex: [
      ['Brazil', '$11,000'], ['Peru', '$11,500']] },
  ] },
  { head: 'EUROPE & AFRICA', plates: [
    { name: 'Europe', range: '$8,000–$11,000', ex: [
      ['England', '$8,000'], ['Germany', '$9,000'], ['France', '$9,500'], ['Italy', '$11,000']] },
    { name: 'Africa', range: '$12,500–$14,500', ex: [
      ['South Africa', '$12,500'], ['Zimbabwe', '$12,900'], ['Congo', '$14,500']] },
    { name: 'Somewhere not on here?', lines: [
      'Inman covers the whole world.', 'Ask me and I will get you the', 'figure for wherever it is.'] },
  ] },
  { head: 'THE MIDDLE EAST & ASIA', plates: [
    { name: 'Middle East', range: '$12,500–$14,000', ex: [['Saudi Arabia', '$12,500–$14,000']] },
    { name: 'Asia', range: '$11,000–$22,000', ex: [
      ['South Korea', '$11,000'], ['Japan', '$11,500'], ['Philippines', '$11,500'], ['China', '$22,000']] },
    { name: 'Australia & New Zealand', range: '$8,700–$16,500', ex: [
      ['Sydney', '$8,700'], ['New Zealand', '$16,500']] },
  ] },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const out = [];
let maxBottom = 0;
COLS.forEach((col, ci) => {
  const x = ci * (COLW + GUT);
  out.push(`  <text class="rm-colhead" x="${x + 2}" y="${HEADY}">${esc(col.head)}</text>`);
  let y = TOP;
  for (const p of col.plates) {
    const n = p.ex ? p.ex.length : p.lines.length;
    const ph = h(n);
    out.push(`  <g>`);
    out.push(`    <rect class="rm-plate" x="${x}" y="${y}" width="${COLW}" height="${ph}" rx="7"/>`);
    out.push(`    <rect class="rm-bar" x="${x}" y="${y}" width="4" height="${ph}"/>`);
    out.push(`    <text class="rm-region" x="${x + 14}" y="${y + 26}">${esc(p.name)}</text>`);
    if (p.range) out.push(`    <text class="rm-range" x="${x + 14}" y="${y + 58}">${esc(p.range)}</text>`);
    (p.ex || []).forEach(([nm, fig], i) => {
      out.push(`    <text class="rm-ex" x="${x + 14}" y="${y + 84 + i * 20}">${esc(nm)}</text>`);
      out.push(`    <text class="rm-fig" x="${x + COLW - 12}" y="${y + 84 + i * 20}" text-anchor="end">${esc(fig)}</text>`);
    });
    (p.lines || []).forEach((t, i) => {
      out.push(`    <text class="rm-ex" x="${x + 14}" y="${y + 58 + i * 20}">${esc(t)}</text>`);
    });
    out.push(`  </g>`);
    y += ph + GAP;
  }
  maxBottom = Math.max(maxBottom, y - GAP);
});
const H = maxBottom + 4;
console.log(`<svg class="rmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average cost of bringing a person home to the United States, by part of the world, from Inman Shipping, January 2025">
${out.join('\n')}
</svg>`);
