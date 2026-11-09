const normalize = value => String(value || '').normalize('NFKC').toLowerCase()
  .replace(/['\u2018\u2019]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const dayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function titleKey(event, allDay) {
  let title = normalize(event.title);
  if (!allDay) return title;
  title = title.replace(/^(bethel public schools|bps) /, '');
  if (/^(no school )?veterans day( observed| school closed| no school)*$/.test(title)) return 'veterans day';
  if (/^(no school )?thanksgiving (recess|break)( school closed| no school)?$/.test(title)) return 'thanksgiving recess';
  return title;
}

function timedKey(event) {
  if (event.isCustom && event.rawCustomData) {
    const raw = event.rawCustomData;
    const instant = time => {
      if (!time) return '';
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date(event.rawDate);
      date.setHours(hours, minutes, 0, 0);
      return date.getTime();
    };
    return `${instant(raw.startTime || raw.time)}|${instant(raw.endTime)}`;
  }
  return event.startInstant
    ? `${Date.parse(event.startInstant)}|${event.endInstant ? Date.parse(event.endInstant) : ''}`
    : normalize(event.time);
}

// Collapse display copies, retaining their IDs for a single dashboard-only removal.
export function deduplicateCalendarEvents(events) {
  const groups = new Map();
  for (const event of events) {
    if (!(event.rawDate instanceof Date) || Number.isNaN(event.rawDate.getTime()) || !normalize(event.title)) {
      groups.set(Symbol(), [event]);
      continue;
    }
    const allDay = Boolean(event.allDayStart) || normalize(event.time) === 'all day';
    const start = event.allDayStart ? new Date(`${event.allDayStart}T12:00:00`) : new Date(event.rawDate);
    const end = event.allDayEnd ? new Date(`${event.allDayEnd}T12:00:00`) : null;
    for (const day = new Date(start); ; day.setDate(day.getDate() + 1)) {
      const date = dayKey(day);
      const key = JSON.stringify([titleKey(event, allDay), date, allDay ? 'all-day' : timedKey(event)]);
      const candidates = groups.get(key) || [];
      const location = normalize(event.location);
      let group = candidates.find(candidate => !location || !normalize(candidate.location) || normalize(candidate.location) === location);
      const copy = {
        ...event,
        ...(allDay ? { rawDate: new Date(`${date}T12:00:00`), allDayStart: date, allDayEnd: null } : {}),
        calendarLabels: [event.calendarLabel].filter(Boolean),
        sourceEventIds: event.isCustom ? [] : [event.id],
        customEventIds: event.isCustom ? [event.id] : [],
      };
      if (!group) {
        group = copy;
        candidates.push(group);
        groups.set(key, candidates);
      } else {
        const labels = [...new Set([...group.calendarLabels, ...copy.calendarLabels])];
        const sourceIds = [...new Set([...group.sourceEventIds, ...copy.sourceEventIds])];
        const customIds = [...new Set([...group.customEventIds, ...copy.customEventIds])];
        if (copy.isCustom && !group.isCustom) Object.assign(group, copy);
        if (!group.location && location) group.location = event.location;
        Object.assign(group, { calendarLabels: labels, sourceEventIds: sourceIds, customEventIds: customIds });
      }
      if (!allDay || !end || Number.isNaN(end.getTime())) break;
      const next = new Date(day); next.setDate(next.getDate() + 1);
      if (next >= end) break;
    }
  }
  return [...groups.values()].flat();
}
