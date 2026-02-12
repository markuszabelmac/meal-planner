// Get Monday of the week containing the given date
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Sunday = 0, Monday = 1, ..., Saturday = 6
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get Sunday of the week containing the given date
export function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

// Get all 7 days of the week (Mon-Sun) for a given date
export function getWeekDays(date: Date): Date[] {
  const monday = getMonday(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Format date as YYYY-MM-DD (for API calls)
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Format date for display: "Mo 10.02."
const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function formatDayShort(date: Date): string {
  const dayName = DAY_NAMES[date.getDay()];
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${dayName} ${d}.${m}.`;
}

// Format week range: "10.02. – 16.02.2026"
export function formatWeekRange(date: Date): string {
  const monday = getMonday(date);
  const sunday = getSunday(date);
  const mDay = String(monday.getDate()).padStart(2, "0");
  const mMonth = String(monday.getMonth() + 1).padStart(2, "0");
  const sDay = String(sunday.getDate()).padStart(2, "0");
  const sMonth = String(sunday.getMonth() + 1).padStart(2, "0");
  const year = sunday.getFullYear();
  return `${mDay}.${mMonth}. – ${sDay}.${sMonth}.${year}`;
}

// Check if a date is today
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}
