// Local-calendar seeds keep all screens consistent for a whole day.
const palettes = {
  winter: [['Frost & pine', '#93c5fd', '#99f6e4'], ['Winter lanterns', '#c4b5fd', '#fde68a']],
  spring: [['Garden morning', '#86efac', '#f9a8d4'], ['April sky', '#7dd3fc', '#a7f3d0']],
  summer: [['Summer shoreline', '#67e8f9', '#fde68a'], ['Peach sunset', '#fdba74', '#f9a8d4']],
  autumn: [['Autumn orchard', '#fdba74', '#bef264'], ['Hearth & harvest', '#fde68a', '#fca5a5']],
};
const headingFonts = [
  '"Segoe UI", system-ui, sans-serif',
  '"Trebuchet MS", "Segoe UI", sans-serif',
  'Verdana, "Segoe UI", sans-serif',
];

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
  if (month === 9 && day <= 14 && date.getDay() > 0 && date.getDay() < 6) return ['Back to school', '#fde68a', '#93c5fd'];
  return null;
}

export function getDailyTheme(date = new Date(), phase = 'day') {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let seed = 2166136261;
  for (const character of key) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  const month = date.getMonth();
  const season = month < 2 || month === 11 ? 'winter' : month < 5 ? 'spring' : month < 8 ? 'summer' : 'autumn';
  const [name, accent, secondary] = occasion(date) || palettes[season][seed % palettes[season].length];
  const x = 12 + seed % 65;
  const y = 8 + (seed >>> 8) % 30;
  const alpha = phase === 'night' ? '24' : phase === 'day' ? '48' : '38';
  return {
    name,
    key,
    style: {
      '--theme-accent': accent,
      '--theme-secondary': secondary,
      '--theme-heading-font': headingFonts[(seed >>> 12) % headingFonts.length],
      backgroundColor: '#08111f',
      backgroundImage: `radial-gradient(ellipse at ${x}% ${y}%, ${accent}${alpha}, transparent 60%), radial-gradient(ellipse at ${100 - x}% 85%, ${secondary}${alpha}, transparent 65%), linear-gradient(${120 + seed % 50}deg, #08111f, #111827)`,
    },
  };
}
