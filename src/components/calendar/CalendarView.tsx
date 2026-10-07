import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CalendarEvent, WorkspaceCategory } from '../../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const {
    calendarEvents,
    createCalendarEvent,
    deleteCalendarEvent,
    createChat,
    setCurrentView,
    addToast,
  } = useWorkspace();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('10:00');
  const [eventType, setEventType] = useState<CalendarEvent['type']>('deadline');
  const [eventCategory, setEventCategory] = useState<WorkspaceCategory>('university');
  const [eventDesc, setEventDesc] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Empty lead days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        events: calendarEvents.filter((e) => e.date === dateStr),
      });
    }

    return days;
  }, [year, month, calendarEvents]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleOpenAddModal = (dateStr?: string) => {
    if (dateStr) setEventDate(dateStr);
    setEventTitle('');
    setEventDesc('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    await createCalendarEvent({
      title: eventTitle.trim(),
      date: eventDate,
      time: eventTime,
      type: eventType,
      category: eventCategory,
      description: eventDesc.trim(),
    });

    setIsModalOpen(false);
  };

  const handleAiScheduleOptimizer = () => {
    const eventsSummary = calendarEvents
      .map((e) => `- ${e.date} (${e.time || 'All day'}): [${e.type.toUpperCase()}] ${e.title} (${e.category})`)
      .join('\n');

    createChat(
      'study',
      `Please analyze my upcoming workspace schedule and academic calendar:

${eventsSummary}

1. Identify critical crunch periods or exam overlaps.
2. Generate an optimized daily study and work block plan for this month.
3. Suggest buffer times for revision, paper grading, and research writing.`
    );
    setCurrentView('ai');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-500" />
            <span>Academic & Work Schedule</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Coordinate assignments, exams, faculty meetings, and research deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAiScheduleOptimizer}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>AI Schedule Optimizer</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Month Navigation & Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 py-1 border-b border-slate-100 dark:border-slate-800">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((item, idx) => {
            if (!item) {
              return <div key={`empty_${idx}`} className="h-24 sm:h-28 bg-slate-50/30 dark:bg-slate-950/20 rounded-xl" />;
            }

            const isToday =
              item.dateStr === new Date().toISOString().split('T')[0];

            return (
              <div
                key={item.dateStr}
                onClick={() => handleOpenAddModal(item.dateStr)}
                className={`h-24 sm:h-28 p-1.5 sm:p-2 border rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:border-emerald-500/60 overflow-hidden ${
                  isToday
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                      isToday
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.day}
                  </span>
                  {item.events.length > 0 && (
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      {item.events.length}
                    </span>
                  )}
                </div>

                {/* Event Pills */}
                <div className="space-y-1 overflow-y-auto max-h-16 scrollbar-none">
                  {item.events.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center justify-between group ${
                        ev.type === 'exam'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : ev.type === 'deadline'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      <span className="truncate">{ev.title}</span>
                      <button
                        onClick={() => deleteCalendarEvent(ev.id)}
                        className="hidden group-hover:block text-slate-400 hover:text-rose-500 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Schedule Calendar Event</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g., Real Analysis Midterm Exam"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Time</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as CalendarEvent['type'])}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="deadline">Deadline</option>
                    <option value="meeting">Meeting</option>
                    <option value="milestone">Milestone</option>
                    <option value="event">General Event</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Domain Category</label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value as WorkspaceCategory)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="university">University</option>
                    <option value="teaching">Teaching</option>
                    <option value="school_admin">School Admin</option>
                    <option value="research">Research</option>
                    <option value="business">Business</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Location, agenda, or preparation materials..."
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Add Event
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
