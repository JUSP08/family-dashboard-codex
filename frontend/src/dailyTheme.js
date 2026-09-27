// Local-calendar seeds keep every screen in the house on the same theme all day.
const palettes = {
  winter: [
    ['Frost & Pine', '#93c5fd', '#99f6e4'],
    ['Winter Lanterns', '#c4b5fd', '#fde68a'],
    ['Bluebird Snow', '#7dd3fc', '#e0f2fe'],
    ['Cranberry Frost', '#fda4af', '#a5f3fc'],
    ['Evergreen Glass', '#6ee7b7', '#bfdbfe'],
    ['Silver Hearth', '#d8b4fe', '#fed7aa'],
  ],
  spring: [
    ['Garden Morning', '#86efac', '#f9a8d4'],
    ['April Sky', '#7dd3fc', '#a7f3d0'],
    ['Lilac Rain', '#d8b4fe', '#93c5fd'],
    ['Daffodil Day', '#fde047', '#86efac'],
    ['Cherry Breeze', '#fda4af', '#bae6fd'],
    ['Meadow Glass', '#bef264', '#67e8f9'],
  ],
  summer: [
    ['Summer Shoreline', '#67e8f9', '#fde68a'],
    ['Peach Sunset', '#fdba74', '#f9a8d4'],
    ['Poolside Sky', '#38bdf8', '#a7f3d0'],
    ['Berry Lemonade', '#f0abfc', '#fef08a'],
    ['Firefly Field', '#bef264', '#5eead4'],
    ['Seashell Morning', '#fecdd3', '#a5f3fc'],
  ],
  autumn: [
    ['Autumn Orchard', '#fdba74', '#bef264'],
    ['Hearth & Harvest', '#fde68a', '#fca5a5'],
    ['Maple Sky', '#fb923c', '#c4b5fd'],
    ['Cider Evening', '#fbbf24', '#fda4af'],
    ['Moss & Copper', '#a3e635', '#fdba74'],
    ['Crisp Blue Morning', '#7dd3fc', '#fcd34d'],
  ],
};

const phaseCanvases = {
  sunrise: ['#3b1d5a', '#9a4d5c', '#0f766e', '#07111f'],
  day: ['#075985', '#0284c7', '#0f766e', '#082f49'],
  sunset: ['#7c2d12', '#be185d', '#3730a3', '#080c1c'],
  night: ['#020617', '#111827', '#172554', '#2b2118'],
};

const phaseStrength = {
  sunrise: ['52', '3d'],
  day: ['46', '32'],
  sunset: ['50', '40'],
  night: ['24', '1c'],
};

const headingFonts = [
  '"Segoe UI", system-ui, sans-serif',
  '"Trebuchet MS", "Segoe UI", sans-serif',
  'Verdana, "Segoe UI", sans-serif',
];

function hashDate(key) {
  let seed = 2166136261;
  for (const character of key) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return seed;
}

function dayOfYear(date) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / 86400000);
}

function occasion(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 1 && day === 1) return ['New Year', '#fde68a', '#c4b5fd'];
  if (month === 2 && day === 14) return ['Valentine’s Day', '#f9a8d4', '#fda4af'];
  if (month === 3 && day === 17) return ['St. Patrick’s Day', '#86efac', '#fde68a'];
  if (month === 7 && day === 4) return ['Independence Day', '#93c5fd', '#fca5a5'];
  if (month === 10 && day === 31) return ['Halloween', '#fdba74', '#c4b5fd'];
  if (month === 11 && date.getDay() === 4 && day >= 22 && day <= 28) return ['Thanksgiving', '#fde68a', '#fdba74'];
  if (month === 12 && day === 25) return ['Christmas', '#86efac', '#fca5a5'];
  if (month === 9 && day <= 14 && date.getDay() > 0 && date.getDay() < 6) return ['Back to School', '#fde68a', '#93c5fd'];
  return null;
}

export function getDailyTheme(date = new Date(), phase = 'day') {
  const key = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
  const seed = hashDate(key);
  const ordinal = dayOfYear(date);
  const month = date.getMonth();
  const season = month < 2 || month === 11 ? 'winter' : month < 5 ? 'spring' : month < 8 ? 'summer' : 'autumn';
  const specialTheme = occasion(date);
  const [baseName, accent, secondary] = specialTheme || palettes[season][seed % palettes[season].length];
  const canvas = phaseCanvases[phase] || phaseCanvases.day;
  const [accentAlpha, secondaryAlpha] = phaseStrength[phase] || phaseStrength.day;

  const x = 10 + seed % 70;
  const y = 6 + (seed >>> 8) % 32;
  const horizon = 58 + (seed >>> 16) % 24;
  const sweep = 105 + ordinal * 0.2;
  const crossSweep = 210 + (seed >>> 20) % 80;
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    name: `${baseName} · ${dateLabel}`,
    key,
    style: {
      '--theme-accent': accent,
      '--theme-secondary': secondary,
      '--theme-heading-font': headingFonts[(seed >>> 12) % headingFonts.length],
      backgroundColor: canvas[3],
      backgroundImage: [
        `radial-gradient(ellipse at ${x}% ${y}%, ${accent}${accentAlpha}, transparent ${42 + seed % 20}%)`,
        `radial-gradient(ellipse at ${100 - x}% ${horizon}%, ${secondary}${secondaryAlpha}, transparent ${50 + (seed >>> 5) % 18}%)`,
        `linear-gradient(${crossSweep}deg, transparent 24%, ${accent}12 48%, transparent 70%)`,
        `linear-gradient(${sweep.toFixed(1)}deg, ${canvas[0]} 0%, ${canvas[1]} ${32 + seed % 14}%, ${canvas[2]} ${horizon}%, ${canvas[3]} 100%)`,
      ].join(', '),
      backgroundBlendMode: 'screen, soft-light, overlay, normal',
    },
  };
}
