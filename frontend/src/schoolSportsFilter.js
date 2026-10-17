const BHS_CALENDAR_ID = 'ke619q4g2ntjl8hd50omn4v1ih88o164@import.calendar.google.com';
const BHS_WRESTLING_ID = '21qdt0nm2krk7r25q356bcn8bboapgq5@import.calendar.google.com';

// Presentation only: the curated Family calendar and younger children's feeds
// remain intact unless the title explicitly identifies high-school athletics.
// Curated JV titles from the combined JV/Froshmore feed are preserved.
export function shouldDisplaySchoolEvent(event, sourceId) {
  const title = (event.summary || '').trim();
  const curatedFamily = sourceId === 'kidlindstrom@gmail.com';
  const explicitlyHighSchool = /\b(?:bhs|high[ -]school)\b/i.test(title) || /\bblake\b.*\bfootball\b/i.test(title);
  if (sourceId !== BHS_CALENDAR_ID && sourceId !== BHS_WRESTLING_ID && !(curatedFamily && explicitlyHighSchool)) return true;
  const football = /\bfootball\b/i.test(title);
  // Explicit user exception: Blake's Oct 17, 2026, 8-10 AM Eastern film session.
  if (curatedFamily && event.id === 'eev7oktm8li4bkoukb6u7g9uks') return true;
  const teamFixture = /^(?:boys\s+|girls\s+)?(?:varsity|junior\s+varsity|jv|freshm[ae]n|sophomores?|frosh(?:more)?|fr(?:esh)?\s*[/&-]\s*soph(?:omore)?)(?:\b|\s)/i.test(title);
  const sport = /\b(?:field\s+hockey|volleyball|soccer|cross[ -]country|swimming|diving|wrestling|basketball|ice\s+hockey|hockey|softball|baseball|tennis|lacrosse|track(?:\s*(?:and|&)\s*field)?|golf|cheerleading|gymnastics|football)\b/i.test(title);
  // Ordinary school announcements stay visible even if they mention a team.
  const schoolAnnouncement = /\b(?:fundraiser|banquet|awards?|picture|photos?|meeting|conferences?)\b/i.test(title);
  if (schoolAnnouncement && !football) return true;
  if (football && /\b(?:fundraiser|banquet|awards?|picture|photos?)\b/i.test(title)) return true;
  const sportsEvent = (teamFixture && sport) || (sport && /\b(?:vs\.?|versus|at|game|meet|match|practice|training|tryouts?|scrimmage)\b/i.test(title));
  if (!sportsEvent && !(explicitlyHighSchool && sport)) return true;
  if (!football) return false;
  if (/\b(?:film|meeting)\b/i.test(title)) return false;
  if (/\b(?:practice|training|tryouts?|scrimmage|conditioning|workout|camp)\b/i.test(title)) return false;
  // The approved combined JV/Froshmore source uses ambiguous JV titles.
  if (curatedFamily && /\b(?:jv|junior\s+varsity)\b/i.test(title)) return true;
  const varsity = /\bvarsity\b/i.test(title) && !/\b(?:junior\s+varsity|jv)\b/i.test(title);
  const froshmore = /\b(?:freshm[ae]n|sophomores?|frosh(?:more)?|fr(?:esh)?\s*[/&-]\s*soph(?:omore)?)\b/i.test(title);
  return varsity || froshmore;
}
