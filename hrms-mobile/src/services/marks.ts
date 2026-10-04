import type { MarkedDates } from '../components/MonthCalendar';
import { DOT } from '../components/MonthCalendar';

export type AttDay = {
  date: string; // YYYY-MM-DD
  check_in: string | null;
  check_out: string | null;
  status: string; // present | late | absent | half_day ...
};

export type LeaveSpan = { start: string; end: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const stop = new Date(end + 'T00:00:00');
  while (cur <= stop) {
    out.push(iso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Build multi-dot marks for a visible month (YYYY-MM):
 * green = full present day, yellow = late, blue = approved leave,
 * purple = holiday, red = absent (past weekday, no record/leave/holiday).
 */
export function buildMarks(
  month: string, // YYYY-MM
  records: AttDay[],
  leaves: LeaveSpan[],
  holidays: string[], // YYYY-MM-DD list
  todayStr: string,
): MarkedDates {
  const marked: MarkedDates = {};
  const byDate = new Map(records.map((r) => [r.date, r]));
  const leaveDays = new Set<string>();
  leaves.forEach((l) => eachDay(l.start, l.end).forEach((d) => leaveDays.add(d)));
  const holSet = new Set(holidays);
  const dot = (color: string) => ({ key: color, color });

  const [y, m] = month.split('-').map(Number);
  const daysIn = new Date(y, m, 0).getDate();
  for (let d = 1; d <= daysIn; d++) {
    const key = `${month}-${String(d).padStart(2, '0')}`;
    if (key > todayStr) continue; // future: no mark
    const rec = byDate.get(key);
    const dots: { key: string; color: string }[] = [];
    if (rec && rec.check_in) {
      dots.push(dot(rec.status === 'late' ? DOT.late : DOT.present));
    } else if (leaveDays.has(key)) {
      dots.push(dot(DOT.leave));
    } else if (holSet.has(key)) {
      dots.push(dot(DOT.holiday));
    } else {
      const dow = new Date(key + 'T00:00:00').getDay();
      if (dow !== 0 && dow !== 6) dots.push(dot(DOT.absent));
    }
    if (dots.length) marked[key] = { dots };
  }
  return marked;
}

export function monthOf(dateStr: string) {
  return dateStr.slice(0, 7);
}

export function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
