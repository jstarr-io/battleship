// WWI nations: simplified-but-recognizable inline SVG flags + short anthem
// melodies (note names) played via Web Audio. Historical era ~1914-1918.

const W = 60;
const H = 40;

function svg(inner) {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="flag-svg">${inner}</svg>`;
}

function hStripes(colors) {
  const h = H / colors.length;
  return svg(
    colors
      .map((col, i) => `<rect x="0" y="${i * h}" width="${W}" height="${h}" fill="${col}"/>`)
      .join('')
  );
}

function vStripes(colors) {
  const w = W / colors.length;
  return svg(
    colors
      .map((col, i) => `<rect x="${i * w}" y="0" width="${w}" height="${H}" fill="${col}"/>`)
      .join('')
  );
}

// --- Custom flags ---
function unionJack() {
  return svg(`
    <rect width="${W}" height="${H}" fill="#012169"/>
    <path d="M0,0 L${W},${H} M${W},0 L0,${H}" stroke="#fff" stroke-width="8"/>
    <path d="M0,0 L${W},${H} M${W},0 L0,${H}" stroke="#C8102E" stroke-width="3"/>
    <rect x="25" y="0" width="10" height="${H}" fill="#fff"/>
    <rect x="0" y="15" width="${W}" height="10" fill="#fff"/>
    <rect x="27" y="0" width="6" height="${H}" fill="#C8102E"/>
    <rect x="0" y="17" width="${W}" height="6" fill="#C8102E"/>
  `);
}

function usa() {
  const stripes = [];
  const sh = H / 13;
  for (let i = 0; i < 13; i++) {
    stripes.push(
      `<rect x="0" y="${i * sh}" width="${W}" height="${sh}" fill="${i % 2 ? '#fff' : '#B22234'}"/>`
    );
  }
  let stars = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      stars += `<circle cx="${3 + c * 4.2}" cy="${3 + r * 4.5}" r="0.9" fill="#fff"/>`;
    }
  }
  return svg(`${stripes.join('')}<rect x="0" y="0" width="24" height="${sh * 7}" fill="#3C3B6E"/>${stars}`);
}

function liberia() {
  const stripes = [];
  const sh = H / 11;
  for (let i = 0; i < 11; i++) {
    stripes.push(
      `<rect x="0" y="${i * sh}" width="${W}" height="${sh}" fill="${i % 2 ? '#fff' : '#BF0A30'}"/>`
    );
  }
  return svg(`${stripes.join('')}<rect x="0" y="0" width="20" height="${sh * 5}" fill="#002868"/><text x="10" y="${sh * 3.2}" font-size="10" text-anchor="middle" fill="#fff">★</text>`);
}

function japan() {
  return svg(`<rect width="${W}" height="${H}" fill="#fff"/><circle cx="${W / 2}" cy="${H / 2}" r="11" fill="#BC002D"/>`);
}

function ottoman() {
  return svg(`<rect width="${W}" height="${H}" fill="#E30A17"/><circle cx="26" cy="20" r="9" fill="#fff"/><circle cx="29" cy="20" r="7.5" fill="#E30A17"/><text x="40" y="25" font-size="12" fill="#fff" text-anchor="middle">★</text>`);
}

function brazil() {
  return svg(`<rect width="${W}" height="${H}" fill="#009C3B"/><polygon points="${W / 2},5 ${W - 6},20 ${W / 2},35 6,20" fill="#FFDF00"/><circle cx="${W / 2}" cy="20" r="8" fill="#002776"/>`);
}

function greece() {
  const stripes = [];
  const sh = H / 9;
  for (let i = 0; i < 9; i++) {
    stripes.push(`<rect x="0" y="${i * sh}" width="${W}" height="${sh}" fill="${i % 2 ? '#fff' : '#0D5EAF'}"/>`);
  }
  return svg(`${stripes.join('')}<rect x="0" y="0" width="${sh * 5}" height="${sh * 5}" fill="#0D5EAF"/><rect x="${sh * 2}" y="0" width="${sh}" height="${sh * 5}" fill="#fff"/><rect x="0" y="${sh * 2}" width="${sh * 5}" height="${sh}" fill="#fff"/>`);
}

function cuba() {
  const stripes = [];
  const sh = H / 5;
  for (let i = 0; i < 5; i++) {
    stripes.push(`<rect x="0" y="${i * sh}" width="${W}" height="${sh}" fill="${i % 2 ? '#fff' : '#002A8F'}"/>`);
  }
  return svg(`${stripes.join('')}<polygon points="0,0 26,20 0,40" fill="#CF142B"/><text x="7" y="25" font-size="9" fill="#fff" text-anchor="middle">★</text>`);
}

function panama() {
  return svg(`<rect width="${W}" height="${H}" fill="#fff"/><rect x="${W / 2}" y="0" width="${W / 2}" height="${H / 2}" fill="#005293"/><rect x="0" y="${H / 2}" width="${W / 2}" height="${H / 2}" fill="#D21034"/><text x="15" y="14" font-size="9" fill="#005293" text-anchor="middle">★</text><text x="45" y="34" font-size="9" fill="#D21034" text-anchor="middle">★</text>`);
}

function portugal() {
  return svg(`<rect width="24" height="${H}" fill="#006600"/><rect x="24" y="0" width="36" height="${H}" fill="#FF0000"/><circle cx="24" cy="20" r="7" fill="#FFD700" stroke="#fff" stroke-width="1"/>`);
}

function serbia() {
  return hStripes(['#C6363C', '#0C4076', '#fff']);
}

function montenegro() {
  return svg(`<rect width="${W}" height="${H}" fill="#C40308" stroke="#FFD700" stroke-width="3"/><text x="${W / 2}" y="26" font-size="16" fill="#FFD700" text-anchor="middle">♛</text>`);
}

function andorra() {
  return svg(`<rect x="0" width="20" height="${H}" fill="#10069F"/><rect x="20" width="20" height="${H}" fill="#FEDF00"/><rect x="40" width="20" height="${H}" fill="#D50032"/><circle cx="30" cy="20" r="6" fill="#fff" stroke="#7a5b00" stroke-width="0.7"/>`);
}

// name -> { flag(), anthem: [notes] }
// Anthem snippets are short, recognizable opening phrases (where known),
// otherwise a neutral martial fanfare.
const FANFARE = ['G4', 'G4', 'C5', 'E5', 'G5', 'E5', 'C5'];

export const COUNTRIES = {
  France: { flag: () => vStripes(['#0055A4', '#fff', '#EF4135']), anthem: ['D4', 'D4', 'D4', 'G4', 'G4', 'A4', 'A4', 'D5', 'B4', 'G4'] },
  'British Empire': { flag: unionJack, anthem: ['G4', 'G4', 'A4', 'F#4', 'G4', 'A4', 'B4', 'B4', 'C5', 'B4', 'A4', 'G4'] },
  Russia: { flag: () => hStripes(['#fff', '#0039A6', '#D52B1E']), anthem: ['E4', 'A4', 'A4', 'B4', 'C5', 'C5', 'D5', 'C5', 'B4', 'A4'] },
  'United States': { flag: usa, anthem: ['G4', 'E4', 'C4', 'E4', 'G4', 'C5', 'E5', 'D5', 'C5', 'E4'] },
  Italy: { flag: () => vStripes(['#009246', '#fff', '#CE2B37']), anthem: ['C5', 'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'C5', 'C5'] },
  Japan: { flag: japan, anthem: ['D4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'E4', 'D4'] },
  Germany: { flag: () => hStripes(['#000', '#fff', '#D00']), anthem: ['G4', 'F#4', 'G4', 'A4', 'B4', 'A4', 'G4', 'D5', 'B4', 'G4'] },
  'Austria-Hungary': { flag: () => hStripes(['#000', '#FFD700']), anthem: ['G4', 'A4', 'G4', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4'] },
  'Ottoman Empire': { flag: ottoman, anthem: ['A4', 'B4', 'C5', 'B4', 'A4', 'G4', 'A4', 'B4', 'A4'] },
  Bulgaria: { flag: () => hStripes(['#fff', '#00966E', '#D62612']), anthem: FANFARE },
  Serbia: { flag: serbia, anthem: ['D4', 'G4', 'G4', 'A4', 'B4', 'A4', 'G4', 'D5'] },
  Montenegro: { flag: montenegro, anthem: FANFARE },
  Romania: { flag: () => vStripes(['#002B7F', '#FCD116', '#CE1126']), anthem: ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4'] },
  Greece: { flag: greece, anthem: ['A4', 'A4', 'B4', 'C5', 'C5', 'B4', 'A4', 'G4', 'A4'] },
  Belgium: { flag: () => vStripes(['#000', '#FDDA24', '#EF3340']), anthem: ['F4', 'A4', 'C5', 'F5', 'E5', 'D5', 'C5'] },
  Portugal: { flag: portugal, anthem: ['C5', 'C5', 'C5', 'C5', 'A4', 'C5', 'F5', 'E5', 'D5'] },
  Brazil: { flag: brazil, anthem: ['C4', 'E4', 'G4', 'C5', 'B4', 'C5', 'A4', 'G4'] },
  Cuba: { flag: cuba, anthem: FANFARE },
  Panama: { flag: panama, anthem: FANFARE },
  China: { flag: () => hStripes(['#DE2910', '#FFC600', '#1E4DA1', '#fff', '#000']), anthem: FANFARE },
  Siam: { flag: () => hStripes(['#A51931', '#fff', '#2D2A4A', '#fff', '#A51931']), anthem: FANFARE },
  Liberia: { flag: liberia, anthem: FANFARE },
  'San Marino': { flag: () => hStripes(['#fff', '#5EB6E4']), anthem: FANFARE },
  Andorra: { flag: andorra, anthem: FANFARE },
  'Costa Rica': { flag: () => hStripes(['#002B7F', '#fff', '#CE1126', '#fff', '#002B7F']), anthem: FANFARE },
  Guatemala: { flag: () => vStripes(['#4997D0', '#fff', '#4997D0']), anthem: FANFARE },
  Haiti: { flag: () => hStripes(['#00209F', '#D21034']), anthem: FANFARE },
  Honduras: { flag: () => hStripes(['#0073CF', '#fff', '#0073CF']), anthem: FANFARE },
  Nicaragua: { flag: () => hStripes(['#0067C6', '#fff', '#0067C6']), anthem: FANFARE },
};

export const COUNTRY_NAMES = Object.keys(COUNTRIES);

export function flagHTML(name) {
  const c = COUNTRIES[name];
  return c ? c.flag() : '';
}

export function anthemNotes(name) {
  const c = COUNTRIES[name];
  return c ? c.anthem : FANFARE;
}
