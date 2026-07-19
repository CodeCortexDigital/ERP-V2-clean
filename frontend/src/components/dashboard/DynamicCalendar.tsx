import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
];
const DAY_NAMES_SHORT = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

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

  const todayLabel = `${DAY_NAMES_SHORT[today.getDay()]} ${MONTH_NAMES[today.getMonth()].slice(0, 3)} ${String(today.getDate()).padStart(2, '0')} ${today.getFullYear()}`;
  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-purple-700 font-black text-xs">
            {MONTH_NAMES[calMonth]} , {calYear}
          </p>
          <p className="text-[9px] text-rose-500 font-bold tracking-wider">{todayLabel}</p>
        </div>
        <button
          onClick={nextMonth}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-[9px] font-bold text-slate-400 border-t border-slate-100 pt-2">
        {DAY_NAMES_SHORT.map((d) => (
          <span key={d} className="text-center">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {calCells.map((cell, idx) => (
          <span
            key={idx}
            className={`text-center text-xs font-semibold py-1 rounded-md transition-colors ${
              !cell.currentMonth
                ? 'text-slate-300'
                : isToday(cell.day, cell.currentMonth)
                ? 'font-black text-rose-500 border-2 border-rose-400'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cell.day}
          </span>
        ))}
      </div>
    </div>
  );
}
