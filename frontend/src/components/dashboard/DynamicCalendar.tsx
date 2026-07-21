import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function DynamicCalendar() {
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  const calCells: { day: number; currentMonth: boolean }[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calCells.push({ day: prevMonthDays - i, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push({ day: d, currentMonth: true });
  }
  const remaining = 42 - calCells.length;
  for (let d = 1; d <= remaining; d++) {
    calCells.push({ day: d, currentMonth: false });
  }

  const isToday = (day: number, currentMonth: boolean) =>
    currentMonth &&
    day === today.getDate() &&
    calMonth === today.getMonth() &&
    calYear === today.getFullYear();

  const todayLabel = `${DAY_NAMES_SHORT[today.getDay()]}, ${MONTH_NAMES[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={prevMonth}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded hover:bg-slate-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">
            {MONTH_NAMES[calMonth]} {calYear}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">{todayLabel}</p>
        </div>
        <button
          onClick={nextMonth}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded hover:bg-slate-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-100">
        {DAY_NAMES_SHORT.map((d) => (
          <div key={d} className="bg-white px-2 py-2 text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{d}</span>
          </div>
        ))}
        {calCells.map((cell, idx) => (
          <div
            key={idx}
            className={`bg-white px-2 py-2 text-center text-sm transition-colors ${
              !cell.currentMonth
                ? 'text-slate-300'
                : isToday(cell.day, cell.currentMonth)
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cell.day}
          </div>
        ))}
      </div>
    </div>
  );
}
