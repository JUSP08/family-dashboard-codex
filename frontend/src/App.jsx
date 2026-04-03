

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Settings,
  Clock,
  Coffee,
  BookOpen,
  Award,
  Bell,
  Banknote,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trophy,
  GraduationCap,
  Home,
  Users,
  Bus,
  ArrowUp,
  ArrowDown,
  Check,
  Delete,
  Lock,
  X,
  Pencil,
  Trash,
  CloudSun,
  Play,
  Pause,
  StopCircle,
  ArrowRight,
  Copy,
  Edit2,
  Plus,
  RefreshCw,
  CreditCard,
  DollarSign,
  Save
} from "lucide-react";
import "./index.css";
import "./App.css";

// Determine which theme to use based on time
export function getDayPhase(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";    // 5am–11:59am
  if (h >= 12 && h < 17) return "afternoon"; // 12pm–4:59pm
  return "evening";                          // 5pm–4:59am
}

// Mapping theme → class (Updated for Dark Glass aesthetic)
export const THEME_CLASSES = {
  morning: "theme-bg theme-bg-morning",
  afternoon: "theme-bg theme-bg-afternoon",
  evening: "theme-bg theme-bg-evening",
};

/* --------------------------------------------------
   CONSTANTS
-------------------------------------------------- */
const HA_URL = "http://192.168.50.50:8123"; // ⚠️ Replace with your real IP

/* --------------------------------------------------
   DATA CONSTANTS
-------------------------------------------------- */
const CHILDREN = [
  { id: "c7", name: "Blake", role: "child", color: "bg-blue-500", avatar: "🧢", img: "/kids/blake.jpg", qustodioUid: "e4fb6de0dde041c5a5d927b0c29ef433" },
  { id: "c8", name: "Hannah", role: "child", color: "bg-pink-500", avatar: "👱‍♀️", img: "/kids/hannah.jpg", qustodioUid: "f8da9355b3fe490fa9fb3862f519429a" },
  { id: "c3", name: "Tristan", role: "child", color: "bg-emerald-500", avatar: "🦖", img: "/kids/tristan.jpg", qustodioUid: "34f4ad13cbaf49b8ba8441ea807685b3" },
  { id: "c4", name: "Sloane", role: "child", color: "bg-rose-500", avatar: "🦄", img: "/kids/sloane.jpg", qustodioUid: "591bca889e894f28b821a32a90ecab34" },
  { id: "c5", name: "Emerson", role: "child", color: "bg-orange-500", avatar: "🦁", img: "/kids/emerson.jpg", qustodioUid: "ffdc32e0c9204db586e3f170f458fa4b" },
  { id: "c6", name: "Guinevere", role: "child", color: "bg-cyan-500", avatar: "👶", img: "/kids/guinevere.jpg", qustodioUid: "" },
  { id: "p1", name: "Dad", role: "parent", color: "bg-slate-600", avatar: "👨" },
  { id: "p2", name: "Mom", role: "parent", color: "bg-slate-600", avatar: "👩" },
];

// --- CONFIGURATION CONSTANTS ---

// --- CONFIGURATION CONSTANTS ---

const COACH_TIME_RANGES = {
  morning: { start: 6, end: 9 },    // 6am - 9am
  afternoon: { start: 2, end: 18 }, // 3pm - 6pm
  evening: { start: 18, end: 22 }    // 6pm - 11pm
};

// ✅ RENAMED to avoid conflict
const COACH_DEADLINES = {
  morning: {
    c7: '06:40', // Blake
    c8: '07:40', // Hannah
    c3: '08:20', // Tristan
    c4: '08:20', // Sloane
    c5: '08:20', // Emerson
    c6: '08:20'  // Guinevere
  },
  evening: {
    c7: '21:00', // Blake (9:30 PM)
    c8: '21:00', // Hannah (9:30 PM)
    c3: '21:00', // Tristan (9:00 PM)
    c4: '21:00', // Sloane (9:00 PM)
    c5: '21:00', // Emerson (9:00 PM)
    c6: '21:00'  // Guinevere (9:00 PM)
  }
};

const INITIAL_MASTER_TASKS = [
  // Morning
  { id: "mt1", label: "Eat Breakfast", icon: "🥣", category: "morning", recurrence: "daily", days: [], assignees: ["all"] },
  { id: "mt2", label: "Brush Teeth", icon: "🦷", category: "morning", recurrence: "daily", days: [], assignees: ["all"] },
  { id: "mt3", label: "Get Dressed", icon: "👕", category: "morning", recurrence: "daily", days: [], assignees: ["all"] },
  { id: "mt4", label: "Hair Care", icon: "🪮", category: "morning", recurrence: "daily", days: [], assignees: ["all"] },
  { id: "mt5", label: "Pack Backpack", icon: "🎒", category: "morning", recurrence: "schooldays", days: [1, 2, 3, 4, 5], assignees: ["c3", "c4", "c5", "c7", "c8"] },
  { id: "mt6", label: "Pack Snack", icon: "🍎", category: "morning", recurrence: "schooldays", days: [1, 2, 3, 4, 5], assignees: ["c3", "c4", "c5"] },
  { id: "mt7", label: "Water Bottle", icon: "💧", category: "morning", recurrence: "daily", days: [], assignees: ["all"] },

  // Afternoon
  { id: "at1", label: "Unload Backpack", icon: "🎒", category: "afternoon", recurrence: "schooldays", days: [1, 2, 3, 4, 5], assignees: ["c3", "c4", "c5", "c7", "c8"] },
  { id: "at2", label: "Homework", icon: "📚", category: "afternoon", recurrence: "schooldays", days: [1, 2, 3, 4, 5], assignees: ["c3", "c4", "c5", "c7", "c8"] },
  { id: "at3", label: "Snack & Water", icon: "🥤", category: "afternoon", recurrence: "daily", days: [], assignees: ["all"] },

  // Evening
  { id: "bt1", label: "Shower / Bath", icon: "🛁", category: "evening", recurrence: "daily", days: [], assignees: ["all"] },
  { id: "bt2", label: "PJs & Teeth", icon: "😴", category: "evening", recurrence: "daily", days: [], assignees: ["all"] },
  { id: "bt3", label: "Pick Clothes for Tomorrow", icon: "👕", category: "evening", recurrence: "daily", days: [], assignees: ["all"] },
];


/* --------------------------------------------------
   TIMELINE CONFIGURATION
-------------------------------------------------- */
const PHASE_BOUNDARIES = {
  morning: { start: 6, end: 8.5 }, // 6:00 AM – 8:30 AM
  afternoon: { start: 14.5, end: 18 },  // 2:30 PM – 6:00 PM
  evening: { start: 18, end: 22 },  // 6:00 PM – 9:00 PM
};

const CHILD_DEADLINES = {
  morning: {
    c7: "06:40", // Blake
    c8: "07:40", // Hannah
    c3: "08:15", // Tristan
    c4: "08:15", // Sloane
    c5: "08:15", // Emerson
    c6: "08:15", // Guinevere
  },
  afternoon: {},
  evening: {}
};

// --------------------------------------------------
// DAY PHASE + THEMES (REDESIGNED FOR DARK GLASS)
// --------------------------------------------------

const commonGlass = "backdrop-blur-xl border border-white/10 shadow-2xl";

const THEMES = {
  morning: {
    // Deep Teal / Slate Gradient
    appBg: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900 via-slate-900 to-black",
    overlayClass: "opacity-20",
    text: "text-slate-100",
    calendarBg: `bg-slate-900/60 ${commonGlass}`,
    cardBg: `bg-slate-800/40 ${commonGlass}`,
  },
  afternoon: {
    // Indigo / Violet Gradient
    appBg: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black",
    overlayClass: "opacity-20",
    text: "text-slate-100",
    calendarBg: `bg-slate-900/60 ${commonGlass}`,
    cardBg: `bg-slate-800/40 ${commonGlass}`,
  },
  evening: {
    // Midnight / Onyx Gradient
    appBg: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-black to-black",
    overlayClass: "opacity-20",
    text: "text-slate-100",
    calendarBg: `bg-black/60 ${commonGlass}`,
    cardBg: `bg-white/5 ${commonGlass}`,
  },
};

const CALENDAR_SOURCES = [
  { type: "google_api", id: "kidlindstrom@gmail.com", label: "Family", color: "border-sky-400" },
  { type: "google_api", id: "ke619q4g2ntjl8hd50omn4v1ih88o164@import.calendar.google.com", label: "BHS Calendar", color: "border-emerald-400" },
  { type: "google_api", id: "21qdt0nm2krk7r25q356bcn8bboapgq5@import.calendar.google.com", label: "BHS Wrestling", color: "border-red-400" },
  { type: "google_api", id: "6ft4fjkcqs6ib8l0m4ang8b9knna35gu@import.calendar.google.com", label: "BMS Calendar", color: "border-amber-400" },
  { type: "google_api", id: "m27tg0lr6n8rgkdn9dfc9vmvmn1371pa@import.calendar.google.com", label: "JES Calendar", color: "border-purple-400" },
  { type: "google_api", id: "dfe3olntlh7eem1l3v7ra1tu3cfg8o3u@import.calendar.google.com", label: "RES Calendar", color: "border-rose-400" },
];

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

// Simple ICS parser
const parseICS = (icsData) => {
  const events = [];
  const lines = icsData.replace(/\r\n/g, "\n").split("\n");
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("BEGIN:VEVENT")) {
      currentEvent = {};
    } else if (line.startsWith("END:VEVENT")) {
      if (currentEvent && currentEvent.start) events.push(currentEvent);
      currentEvent = null;
    } else if (currentEvent) {
      const [keyPart, ...valueParts] = line.split(":");
      if (!keyPart) continue;
      const value = valueParts.join(":");
      const key = keyPart.split(";")[0];

      if (key === "SUMMARY") {
        currentEvent.title = value;
      } else if (key === "LOCATION") {
        currentEvent.location = value;
      } else if (key === "DTSTART" || key.startsWith("DTSTART")) {
        const dateStr = value.replace("Z", "");
        const year = parseInt(dateStr.slice(0, 4), 10);
        const month = parseInt(dateStr.slice(4, 6), 10) - 1;
        const day = parseInt(dateStr.slice(6, 8), 10);
        if (dateStr.length > 8) {
          const hour = parseInt(dateStr.slice(9, 11) || "0", 10);
          const min = parseInt(dateStr.slice(11, 13) || "0", 10);
          currentEvent.start = new Date(Date.UTC(year, month, day, hour, min));
          currentEvent.allDay = false;
        } else {
          currentEvent.start = new Date(Date.UTC(year, month, day));
          currentEvent.allDay = true;
        }
      } else if (key === "UID") {
        currentEvent.id = value;
      }
    }
  }
  return events;
};

// Gemini
const callGemini = async (prompt) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) return "Gemini API Key missing";
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini error", data);
      return data.error?.message || "Gemini API error";
    }
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini"
    );
  } catch (err) {
    console.error("Gemini fetch error", err);
    return "Network / API Error";
  }
};

// Weather
const describeWeather = (code) => {
  if (code === undefined || code === null) return { label: "—", icon: "❓" };
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if (code === 1 || code === 2 || code === 3) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 45 || code === 48) return { label: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 67) return { label: "Drizzle / light rain", icon: "🌦️" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", icon: "🌧️" };
  if (code === 95 || code === 96 || code === 99) return { label: "Thunderstorms", icon: "⛈️" };
  return { label: "Mixed clouds", icon: "🌤️" };
};

const fromLocalDateString = (isoDateStr) => {
  if (!isoDateStr) return new Date();
  const [year, month, day] = isoDateStr.split("-").map((x) => parseInt(x, 10));
  return new Date(year, month - 1, day);
};

const shortDay = (date) =>
  date.toLocaleDateString("en-US", { weekday: "short" });

// Map kid names in event titles to special border colors
const CHILD_EVENT_COLOR_RULES = [
  { name: "Blake", colorClass: "border-orange-500" },
  { name: "Hannah", colorClass: "border-purple-500" },
  { name: "Tristan", colorClass: "border-blue-500" },
  { name: "Sloane", colorClass: "border-teal-500" },
  { name: "Emerson", colorClass: "border-pink-500" },
  { name: "Guinevere", colorClass: "border-fuchsia-500" },
];

const getChildEventColor = (summary, defaultColor) => {
  if (!summary) return defaultColor;
  const lower = summary.toLowerCase();

  for (const rule of CHILD_EVENT_COLOR_RULES) {
    if (lower.includes(rule.name.toLowerCase())) {
      return rule.colorClass;
    }
  }
  return defaultColor;
};

// --- NEW SOURCE ICON HELPER ---
const getSourceIcon = (label) => {
  if (!label) return null;
  const l = label.toLowerCase();

  // Sports -> Gold Trophy
  if (l.includes("wrestling") || l.includes("sport") || l.includes("football") || l.includes("soccer") || l.includes("basketball")) {
    return <Trophy className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />;
  }

  // Schools -> Indigo Graduation Cap
  if (l.includes("bhs") || l.includes("bms") || l.includes("jes") || l.includes("res") || l.includes("school") || l.includes("elementary") || l.includes("middle") || l.includes("high")) {
    return <GraduationCap className="w-3.5 h-3.5 text-indigo-300 drop-shadow-[0_0_5px_rgba(165,180,252,0.5)]" />;
  }

  // Family -> Cyan Home
  if (l.includes("family")) {
    return <Home className="w-3.5 h-3.5 text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.5)]" />;
  }

  // Fallback -> Slate User
  return <Users className="w-3.5 h-3.5 text-slate-400" />;
};

/* --------------------------------------------------
   NAV BUTTON (bottom nav)
-------------------------------------------------- */

const NavButton = ({ view, target, icon, label, setView, color }) => {
  const active = view === target;
  return (
    <button
      onClick={() => setView(target)}
      className="flex flex-col items-center justify-center px-2 group"
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ease-out 
        ${active
            ? `${color} text-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)] border-white/50`
            : "bg-white/5 border-white/10 text-slate-400 group-hover:bg-white/10"
          }`}
      >
        {icon}
      </div>
      <span
        className={`mt-1.5 text-[13px] font-medium tracking-wide transition-colors ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
          }`}
      >
        {label}
      </span>
    </button>
  );
};

/* --------------------------------------------------
   TIMELINE COMPONENT (COACH)
-------------------------------------------------- */
const TimelineTrack = ({ phase, childId, currentTime }) => {
  const boundaries = PHASE_BOUNDARIES[phase] || { start: 6, end: 21 }; // Default fallback
  const deadlineStr = CHILD_DEADLINES[phase]?.[childId];

  // 1. Calculate Total Window Duration (minutes)
  const startTotalMinutes = boundaries.start * 60;
  const endTotalMinutes = boundaries.end * 60;
  const totalDuration = endTotalMinutes - startTotalMinutes;

  // 2. Calculate Current Position (%)
  const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Clamp the progress between 0 and 100
  let currentPct = ((currentTotalMinutes - startTotalMinutes) / totalDuration) * 100;
  currentPct = Math.max(0, Math.min(100, currentPct));

  // 3. Calculate Deadline Position (%) - if one exists
  let deadlinePct = null;
  let isLate = false;

  if (deadlineStr) {
    const [dH, dM] = deadlineStr.split(":").map(Number);
    const deadlineTotalMinutes = dH * 60 + dM;
    deadlinePct = ((deadlineTotalMinutes - startTotalMinutes) / totalDuration) * 100;

    // Check if we passed the deadline
    if (currentTotalMinutes > deadlineTotalMinutes) {
      isLate = true;
    }
  }

  // Only render if we are somewhat near the timeframe (or just always render for consistency)
  return (
    <div className="relative w-full h-8 mt-4 mb-1">
      {/* Background Track */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-2 bg-slate-700/50 rounded-full border border-white/5 overflow-hidden">
        {/* Time Passed Gradient (Gray/Blue) */}
        <div
          className="h-full bg-slate-500/30 transition-all duration-1000"
          style={{ width: `${currentPct}%` }}
        />
      </div>

      {/* DEADLINE MARKER (The Bus) */}
      {deadlinePct !== null && (
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center group z-10"
          style={{ left: `${deadlinePct}%`, transform: 'translateX(-50%)' }}
        >
          {/* Dashed Line */}
          <div className={`h-full w-px border-l-2 border-dashed ${isLate ? "border-rose-500/50" : "border-emerald-500/50"}`} />

          {/* Icon Flag */}
          <div className={`absolute -top-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg backdrop-blur-md
            ${isLate
              ? "bg-rose-900/80 text-rose-200 border border-rose-500"
              : "bg-emerald-900/80 text-emerald-200 border border-emerald-500"}`}
          >
            <Bus className="w-3 h-3" />
            <span>{deadlineStr}</span>
          </div>
        </div>
      )}

      {/* CURRENT TIME NEEDLE */}
      <div
        className="absolute top-0 bottom-0 z-20 transition-all duration-1000 ease-linear"
        style={{ left: `${currentPct}%`, transform: 'translateX(-50%)' }}
      >
        {/* Glowing Line */}
        <div className={`h-full w-0.5 shadow-[0_0_10px_currentColor] ${isLate ? "bg-rose-500 text-rose-500" : "bg-cyan-400 text-cyan-400"}`} />

        {/* "You are Here" Dot */}
        <div className={`absolute top-1/2 -translate-y-1/2 -left-[3px] w-2 h-2 rounded-full ring-2 ring-slate-900 ${isLate ? "bg-rose-500" : "bg-cyan-400"}`} />
      </div>

      {/* Start/End Labels (Optional) */}
      <div className="absolute -bottom-4 w-full flex justify-between text-[9px] text-slate-500 font-mono">
        <span>{boundaries.start}:00</span>
        <span>{boundaries.end}:00</span>
      </div>
    </div>
  );
};


/* --------------------------------------------------
   DASHBOARD VIEW (Updated: Flex Rows, No Scroll)
-------------------------------------------------- */

// (Keep getEventEmoji helper here if it's not global...)
const getEventEmoji = (sourceIcon, title = "", label = "") => {
  if (sourceIcon) return sourceIcon;
  const text = (title + " " + label).toLowerCase();
  if (text.includes("birthday") || text.includes("party")) return "🎂";
  if (text.includes("soccer") || text.includes("football")) return "⚽";
  if (text.includes("baseball") || text.includes("softball")) return "⚾";
  if (text.includes("basketball")) return "🏀";
  if (text.includes("dance") || text.includes("ballet")) return "🩰";
  if (text.includes("gym") || text.includes("workout") || text.includes("crossfit")) return "💪";
  if (text.includes("swim") || text.includes("pool")) return "🏊";
  if (text.includes("doctor") || text.includes("dr.") || text.includes("pediatrician")) return "🩺";
  if (text.includes("dentist") || text.includes("ortho")) return "🦷";
  if (text.includes("hair") || text.includes("barber") || text.includes("salon")) return "✂️";
  if (text.includes("flight") || text.includes("fly") || text.includes("airport")) return "✈️";
  if (text.includes("dinner") || text.includes("lunch")) return "🍽️";
  if (label.toLowerCase().includes("school")) return "📚";
  if (label.toLowerCase().includes("work")) return "💼";
  if (label.toLowerCase().includes("trash") || label.toLowerCase().includes("garbage")) return "🗑️";
  if (label.toLowerCase().includes("holiday")) return "🎉";
  if (label.toLowerCase().includes("scout")) return "⚜️";
  return "📅";
};

/* --------------------------------------------------
   DASHBOARD VIEW (Portrait Mode: Weather/Sparkle Left, Goals Right)
-------------------------------------------------- */

/* --------------------------------------------------
   DASHBOARD VIEW (Landscape: Calendar Left, Widgets Right)
-------------------------------------------------- */

/* --------------------------------------------------
   DASHBOARD VIEW (Calendar Left, Widgets Right, With Recurrence)
-------------------------------------------------- */

/* --------------------------------------------------
   DASHBOARD VIEW (Calendar Left, Widgets Right, With Recurrence)
-------------------------------------------------- */

const DashboardView = ({
  theme, currentTime, calendarEvents, calendarErrors, getProgress, calendarView, setCalendarView,
  weather, calendarDate, onNavigateCalendar, masterTasks, completedTasks, calendarSources,
  childrenData, addCustomEvent, updateCustomEvent, deleteCustomEvent, hideExternalEvent
}) => {

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState(null);

  // ✅ UPDATED: Added 'recurrence' field
  const [newEventForm, setNewEventForm] = useState({ title: "", startTime: "", endTime: "", type: "family", icon: "", recurrence: "none" });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // --- Handlers ---
  const openAddModal = (date) => {
    setNewEventDate(date);
    // ✅ UPDATED: Reset recurrence to 'none'
    setNewEventForm({ title: "", startTime: "", endTime: "", type: "family", icon: "", recurrence: "none" });
    setIsAddingEvent(true);
  };

  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!newEventForm.title) return;
    addCustomEvent({
      title: newEventForm.title,
      date: newEventDate.toISOString(),
      startTime: newEventForm.startTime || null,
      endTime: newEventForm.endTime || null,
      type: newEventForm.type,
      icon: newEventForm.icon,
      recurrence: newEventForm.recurrence // ✅ UPDATED: Pass recurrence
    });
    setIsAddingEvent(false);
  };

  const handleUpdateEvent = (e) => {
    e.preventDefault();
    if (!editForm.title) return;
    updateCustomEvent({
      id: selectedEvent.id,
      title: editForm.title,
      startTime: editForm.startTime || null,
      endTime: editForm.endTime || null,
      type: editForm.type,
      icon: editForm.icon,
      recurrence: editForm.recurrence // ✅ UPDATED: Pass recurrence
    });
    setIsEditing(false);
    setSelectedEvent(null);
  };

  const handleDelete = () => {
    if (selectedEvent.isCustom) {
      deleteCustomEvent(selectedEvent.id);
    } else {
      hideExternalEvent(selectedEvent.id);
    }
    setSelectedEvent(null);
  };

  const startEdit = () => {
    const raw = selectedEvent.rawCustomData;
    setEditForm({
      title: raw.title,
      startTime: raw.startTime || raw.time || "",
      endTime: raw.endTime || "",
      type: raw.type || "family",
      icon: raw.icon || "",
      recurrence: raw.recurrence || "none" // ✅ UPDATED: Load recurrence
    });
    setIsEditing(true);
  };

  const start = new Date(calendarDate); start.setHours(0, 0, 0, 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const year = calendarDate.getFullYear(); const month = calendarDate.getMonth(); const firstOfMonth = new Date(year, month, 1); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
  const monthCells = []; for (let i = 0; i < firstDayIndex; i++) monthCells.push(null); for (let d = 1; d <= daysInMonth; d++) monthCells.push(new Date(year, month, d));

  // --- UPDATED SPARKLE LOGIC (No Repeats) ---
  const [sparkleContent, setSparkleContent] = useState("");
  const [isSparkleLoading, setIsSparkleLoading] = useState(false);

  const SPARKLE_HISTORY_KEY = "dailySparkleHistory";
  const SPARKLE_TODAY_KEY = "dailySparkleToday";

  const getSparkleHistory = () => { try { const raw = localStorage.getItem(SPARKLE_HISTORY_KEY); if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
  const pushSparkleToHistory = (text) => { try { const history = getSparkleHistory(); const next = [text, ...history].slice(0, 20); localStorage.setItem(SPARKLE_HISTORY_KEY, JSON.stringify(next)); } catch { } };

  const generateSparklePrompt = () => {
    const history = getSparkleHistory();
    const recent = history.slice(0, 10);
    const dateStr = currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    return `
      You are creating a unique "Daily Sparkle" for kids.
      - Topic: A fun fact, a short joke, or an inspiring mini-quote.
      - Constraints: Under 30 words. NO title. NO "Daily Sparkle" label.
      - Context: Today is ${dateStr}.
      - ANTI-REPEAT: Do NOT use any of these recent sparkles: ${JSON.stringify(recent)}.
      - GOAL: Generate something brand new and delightful.
    `.trim();
  };

  const fetchSparkle = async (forceRefresh = false) => {
    const todayStr = new Date().toDateString();
    if (!forceRefresh) {
      try {
        const todaySaved = JSON.parse(localStorage.getItem(SPARKLE_TODAY_KEY));
        if (todaySaved && todaySaved.date === todayStr && todaySaved.content) {
          setSparkleContent(todaySaved.content);
          return;
        }
      } catch { }
    }
    setIsSparkleLoading(true);
    const prompt = generateSparklePrompt();
    const result = await callGemini(prompt);
    const cleaned = (result || "").trim().replace(/^"|"$/g, '');
    if (cleaned) {
      setSparkleContent(cleaned);
      pushSparkleToHistory(cleaned);
      localStorage.setItem(SPARKLE_TODAY_KEY, JSON.stringify({ date: todayStr, content: cleaned }));
    }
    setIsSparkleLoading(false);
  };

  useEffect(() => { fetchSparkle(false); }, []);
  const regenerateSparkle = () => fetchSparkle(true);

const todayKey = currentTime.toLocaleDateString("en-CA");  const dow = currentTime.getDay();
  const weekday = dow === 0 ? 7 : dow;
  const getTodayTasksForChild = (childId) => masterTasks.filter((t) => { const isAssigned = t.assignees.includes("all") || t.assignees.includes(childId); if (!isAssigned) return false; if (t.recurrence === "schooldays") return t.days?.includes(weekday); return true; });
  const childProgress = (childrenData || []).filter((c) => c.role === "child").map((child) => { const { completed, total } = getProgress(child.id); const todaysTasks = getTodayTasksForChild(child.id); let completionTime = null; if (total > 0 && completed === total) { const timestamps = todaysTasks.map((t) => { const key = `${todayKey}-${child.id}-${t.id}`; return completedTasks[key]; }).filter(Boolean); if (timestamps.length > 0) completionTime = Math.max(...timestamps); } const pct = total === 0 ? 0 : Math.round((completed / total) * 100); return { child, completed, total, pct, completionTime }; });
  const sortedProgress = [...childProgress].sort((a, b) => { if (b.pct !== a.pct) return b.pct - a.pct; if (a.completionTime && b.completionTime) return a.completionTime - b.completionTime; return a.child.name.localeCompare(b.child.name); });
  let winnerId = null; const fullFinishers = childProgress.filter((p) => p.pct === 100 && p.completionTime); if (fullFinishers.length > 0) { const firstFinisher = fullFinishers.reduce((best, curr) => { if (!best) return curr; return curr.completionTime < best.completionTime ? curr : best; }, null); winnerId = firstFinisher.child.id; }

  return (
    <div className="h-full flex gap-6 overflow-hidden pb-4 relative">

      {/* --- ADD EVENT POPUP --- */}
      {isAddingEvent && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsAddingEvent(false)}>
          <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Add Event</h3>
            <p className="text-xs text-slate-400 mb-4">{newEventDate?.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Title</label>
                  <input autoFocus className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Soccer" value={newEventForm.title} onChange={e => setNewEventForm({ ...newEventForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 ml-1 text-center">Icon</label>
                  <input className="w-[46px] h-[46px] rounded-xl bg-slate-900/50 border border-white/10 text-center text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white" placeholder="📅" value={newEventForm.icon} onChange={e => setNewEventForm({ ...newEventForm, icon: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Start</label><input type="time" className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={newEventForm.startTime} onChange={e => setNewEventForm({ ...newEventForm, startTime: e.target.value })} /></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-1 ml-1">End</label><input type="time" className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={newEventForm.endTime} onChange={e => setNewEventForm({ ...newEventForm, endTime: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Type</label>
                  <select className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={newEventForm.type} onChange={e => setNewEventForm({ ...newEventForm, type: e.target.value })}>
                    <option value="family">Family</option><option value="work">Work</option><option value="school">School</option>
                  </select>
                </div>
                {/* ✅ UPDATED: NEW RECURRENCE FIELD */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Repeat</label>
                  <select className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={newEventForm.recurrence} onChange={e => setNewEventForm({ ...newEventForm, recurrence: e.target.value })}>
                    <option value="none">Never</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all">Save Event</button>
            </form>
          </div>
        </div>
      )}

      {/* --- EVENT DETAILS / EDIT POPUP --- */}
      {selectedEvent && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => { setSelectedEvent(null); setIsEditing(false); }}>
          <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setSelectedEvent(null); setIsEditing(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-1"><X className="w-5 h-5" /></button>

            {isEditing ? (
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-2">Edit Event</h3>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Title</label>
                    <input className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 ml-1 text-center">Icon</label>
                    <input className="w-[46px] h-[46px] rounded-xl bg-slate-900/50 border border-white/10 text-center text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white" value={editForm.icon} onChange={e => setEditForm({ ...editForm, icon: e.target.value })} placeholder="📅" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Start</label><input type="time" className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} /></div>
                  <div><label className="block text-xs font-bold text-slate-400 mb-1 ml-1">End</label><input type="time" className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Type</label>
                    <select className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                      <option value="family">Family</option><option value="work">Work</option><option value="school">School</option>
                    </select>
                  </div>
                  {/* ✅ UPDATED: EDIT RECURRENCE FIELD */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Repeat</label>
                    <select className="w-full rounded-xl bg-slate-900/50 border border-white/10 text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={editForm.recurrence} onChange={e => setEditForm({ ...editForm, recurrence: e.target.value })}>
                      <option value="none">Never</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all">Save</button>
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-3 bg-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-600">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-slate-700/50 shadow-inner`}>{getEventEmoji(selectedEvent.sourceIcon, selectedEvent.title, selectedEvent.calendarLabel)}</div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center"><h3 className="text-xl font-bold text-white leading-tight mb-1">{selectedEvent.title}</h3><div className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/10 text-slate-300 border-l-2 ${selectedEvent.colorClass.replace('bg-', 'border-')}`}>{selectedEvent.calendarLabel}</div></div>
                </div>
                <div className="space-y-3 bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-3 text-slate-300"><Clock className="w-5 h-5 text-indigo-400" /><span className="text-lg font-mono font-medium">{selectedEvent.time}</span></div>
                  <div className="flex items-center gap-3 text-slate-300"><CalendarIcon className="w-5 h-5 text-indigo-400" /><span className="text-base">{selectedEvent.rawDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
                  {/* Show Recurrence in details if exists */}
                  {selectedEvent.isCustom && selectedEvent.rawCustomData?.recurrence && selectedEvent.rawCustomData.recurrence !== 'none' && (
                    <div className="flex items-center gap-3 text-slate-300"><RefreshCw className="w-5 h-5 text-indigo-400" /><span className="text-base capitalize">{selectedEvent.rawCustomData.recurrence}</span></div>
                  )}
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                  {selectedEvent.isCustom && (
                    <button onClick={startEdit} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                  )}
                  <button onClick={handleDelete} className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                    <Trash className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* LEFT COLUMN: CALENDAR */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className={`${theme.calendarBg} rounded-[2rem] p-6 flex-1 flex flex-col overflow-hidden`}>
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 rounded-xl text-xl leading-none">📅</div><h3 className="font-semibold text-slate-100 text-lg tracking-wide">{calendarView === "week" ? "Week" : "Month"}</h3></div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <button onClick={() => onNavigateCalendar("prev")} className="p-1.5 rounded-full hover:bg-white/10 text-white"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-medium text-white/90 min-w-[100px] text-center">{calendarView === "week" ? calendarDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : calendarDate.toLocaleDateString([], { month: "long", year: "numeric" })}</span>
                <button onClick={() => onNavigateCalendar("next")} className="p-1.5 rounded-full hover:bg-white/10 text-white"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden xl:flex gap-2 text-[10px] font-bold tracking-wider uppercase">{calendarSources.map((s) => (<span key={s.id} className={`px-2 py-1 rounded-md border ${s.color} text-slate-300 bg-slate-900/50`}>{s.label}</span>))}</div>
              <div className="inline-flex rounded-full bg-black/40 p-1 border border-white/10">
                <button onClick={() => setCalendarView("week")} className={`px-3 py-1 text-xs rounded-full transition-all ${calendarView === "week" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>Week</button>
                <button onClick={() => setCalendarView("month")} className={`px-3 py-1 text-xs rounded-full transition-all ${calendarView === "month" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>Month</button>
              </div>
            </div>
          </div>
          {calendarErrors.length > 0 && (<div className="bg-rose-900/40 border border-rose-500/50 text-rose-200 p-3 text-xs flex items-center gap-2 rounded-xl mb-3 backdrop-blur-md shrink-0"><AlertTriangle className="w-4 h-4" />Error: {calendarErrors.map((e) => e.id).join(", ")}</div>)}

          {calendarView === "week" ? (
            <div className="flex-1 grid grid-cols-7 border-t border-white/5 min-h-[260px] overflow-hidden">
              {weekDays.map((date, i) => {
                const isToday = date.toDateString() === currentTime.toDateString(); const dayOfWeek = date.getDay(); const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; const bgClass = isToday ? "bg-blue-500/10" : isWeekend ? "bg-white/[0.03]" : "bg-transparent"; const evts = calendarEvents.filter((e) => e.rawDate.toDateString() === date.toDateString()).sort((a, b) => a.rawDate - b.rawDate);
                return (
                  <div key={i} onClick={() => openAddModal(date)} className={`flex flex-col h-full border-r border-white/5 last:border-r-0 ${bgClass} cursor-pointer hover:bg-white/5 transition-colors`}>
                    <div className={`p-3 text-center border-b border-white/5 ${isToday ? "text-blue-400" : "text-slate-400"}`}><div className="text-[10px] uppercase font-bold tracking-widest opacity-70">{date.toLocaleDateString("en-US", { weekday: "short" })}</div><div className="text-xl font-light mt-1 text-slate-200">{date.getDate()}</div></div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                      {evts.map((e, idx) => (
                        <div key={`${e.id}-${idx}`} onClick={(evt) => { evt.stopPropagation(); setSelectedEvent(e); }} className={`px-2 py-2 rounded-lg text-xs border-l-[3px] shadow-sm backdrop-blur-sm cursor-pointer hover:brightness-125 transition-all active:scale-95 ${e.colorClass} ${e.isChildEvent ? "bg-blue-900/30" : "bg-slate-800/60"}`}>
                          <div className="flex items-center justify-between gap-1 mb-1"><div className="font-bold text-slate-200 opacity-80 text-[10px]">{e.time}</div><div className="text-sm leading-none" title={e.calendarLabel}>{getEventEmoji(e.sourceIcon, e.title, e.calendarLabel)}</div></div>
                          {/* ✅ CHANGED FROM text-[30px] TO text-sm */}
                          <div className="text-sm font-bold text-slate-100 leading-tight line-clamp-2">{e.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-7 border-b border-white/10 pb-2 mb-2 text-[10px] uppercase font-bold text-slate-500 text-center tracking-widest">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (<div key={d}>{d}</div>))}</div>
              <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(80px,_1fr)] gap-[1px] bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                {monthCells.map((date, idx) => {
                  if (!date) return <div key={idx} className="bg-slate-900/80" />; const isToday = date.toDateString() === currentTime.toDateString(); const dayOfWeek = date.getDay(); const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; let bgClass = "bg-slate-900/40 hover:bg-slate-800/60 transition-colors"; if (isWeekend) bgClass = "bg-slate-900/60"; if (isToday) bgClass = "bg-blue-900/20"; const evts = calendarEvents.filter((e) => e.rawDate.toDateString() === date.toDateString()).sort((a, b) => a.rawDate - b.rawDate);
                  return (
                    <div key={idx} onClick={() => openAddModal(date)} className={`p-1.5 align-top cursor-pointer ${bgClass}`}>
                      <div className="flex justify-between items-center mb-1"><span className={`text-xs font-medium ${isToday ? "text-blue-400" : "text-slate-400"}`}>{date.getDate()}</span></div>
                      <div className="space-y-1">
                        {evts.slice(0, 3).map((e, i) => (
                          <div key={`${e.id}-${i}`} onClick={(evt) => { evt.stopPropagation(); setSelectedEvent(e); }} className={`px-1 py-0.5 rounded-[2px] text-[9px] border-l-2 truncate text-slate-300 ${e.colorClass} bg-white/5 flex items-center justify-between gap-1 cursor-pointer hover:bg-white/10`}>
                            <div className="truncate flex-1"><span className="opacity-70 mr-1">{e.time}</span>{e.title}</div>
                            <span className="shrink-0 text-[10px]" title={e.calendarLabel}>{getEventEmoji(e.sourceIcon, e.title, e.calendarLabel)}</span>
                          </div>
                        ))}
                        {evts.length > 3 && (<div className="text-[9px] text-slate-500 text-center">+{evts.length - 3}</div>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: SIDEBAR (30% WIDTH) */}
      <div className="w-[30%] flex flex-col gap-6 shrink-0 min-h-0 overflow-y-auto custom-scrollbar">

        {/* 1. WEATHER */}
        <div className={`${theme.cardBg} rounded-[2rem] p-5 relative overflow-hidden group shrink-0`}>
          {weather ? (
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Bethel, CT</div>
                  <div className="flex items-center gap-2 text-cyan-300">
                    {describeWeather(weather.current.code).icon}
                    <span className="text-sm font-medium">{describeWeather(weather.current.code).label}</span>
                  </div>
                </div>
                <div className="text-5xl font-light text-white tracking-tighter">{Math.round(weather.current.temperature)}°</div>
              </div>

              {/* Forecast */}
              <div className="flex justify-between gap-2 pt-2 border-t border-white/5">
                {weather.daily && weather.daily.slice(0, 4).map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{shortDay(d.date)}</span>
                    <span className="text-xl my-1 opacity-90">{describeWeather(d.code).icon}</span>
                    <span className="text-[10px] text-slate-300 font-mono">{Math.round(d.high)}°</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 animate-pulse">Scanning atmosphere...</div>
          )}
        </div>

        {/* 2. SPARKLE */}
        <div className={`${theme.cardBg} rounded-[2rem] p-5 shrink-0 flex flex-col gap-3 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">✨</div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-yellow-500/20 rounded-lg text-yellow-300 text-sm">🔔</div>
              <h2 className="font-bold text-slate-200 text-sm tracking-wide uppercase">Sparkle</h2>
            </div>
            <button onClick={regenerateSparkle} className="text-xs p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-300 transition-colors">✨</button>
          </div>
          <p className="relative z-10 text-base font-light italic text-slate-100 leading-snug line-clamp-4">
            {isSparkleLoading ? "Summoning magic..." : `"${sparkleContent}"`}
          </p>
        </div>

        {/* 3. DAILY GOALS */}
        <div className={`${theme.cardBg} rounded-[2rem] p-4 flex-1 flex flex-col min-h-0 overflow-hidden`}>
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 text-sm">🏆</div>
            <h2 className="font-bold text-slate-200 text-sm tracking-wide uppercase">Daily Goals</h2>
          </div>

          <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto custom-scrollbar">
            {sortedProgress.map(({ child, pct }) => (
              <div key={child.id} className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-3 py-2 border border-white/5 hover:bg-slate-800/60 transition-all">
                <ChildAvatar child={child} className="w-8 h-8 shrink-0" textSize="text-xs" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200 flex items-center gap-2 truncate text-xs">
                      {child.name}
                      {winnerId === child.id && (<span className="text-[8px] font-bold text-amber-300 bg-amber-900/30 border border-amber-500/30 px-1 rounded">#1</span>)}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden relative">
                    <div className="h-full bg-emerald-400 shadow-[0_0_10px_#34d399] transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
/* --------------------------------------------------
   COACH VIEW (Updated with Timeline)
-------------------------------------------------- */
const getPhaseFromHour = (h) => {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 16) return "afternoon";
  return "evening";
};

/* --------------------------------------------------
   NEW: MASTER TIMELINE COMPONENTS
-------------------------------------------------- */

// --- UPDATED TIME RULER (Fixes Alignment) ---
const TimeRuler = ({ phase }) => {
  const { start, end } = COACH_TIME_RANGES[phase] || { start: 6, end: 21 };
  const duration = end - start;
  const ticks = Array.from({ length: duration + 1 }, (_, i) => start + i);

  return (
    // ✅ NO MARGINS here. Width is 100% of parent.
    <div className="relative h-6 border-b border-white/10 mb-2 w-full">
      {ticks.map((hour, index) => {
        const pct = ((hour - start) / duration) * 100;
        const label = hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;

        let translateClass = "-translate-x-1/2";
        if (index === 0) translateClass = "translate-x-0";
        if (index === ticks.length - 1) translateClass = "-translate-x-full";

        return (
          <div key={hour} className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${pct}%`, transform: index === 0 ? 'translateX(0)' : index === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
            <div className="h-2 w-px bg-slate-500/50 mb-1" />
            <span className="text-[15px] font-bold text-slate-500 uppercase tracking-widest leading-none">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

// --- UPDATED SWEEPING LINE (Matches Ruler Logic) ---
const SweepingLine = ({ phase, currentTime }) => {
  const boundaries = COACH_TIME_RANGES[phase] || { start: 6, end: 21 };
  const startTotal = boundaries.start * 60;
  const endTotal = boundaries.end * 60;
  const duration = endTotal - startTotal;
  const currentTotal = currentTime.getHours() * 60 + currentTime.getMinutes();
  let pct = ((currentTotal - startTotal) / duration) * 100;
  const isVisible = pct >= 0 && pct <= 100;

  if (!isVisible) return null;

  return (
    // ✅ Position is purely based on %, parent padding handles the offset
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-50 pointer-events-none shadow-[0_0_15px_#22d3ee] transition-all duration-[60000ms] ease-linear"
      style={{ left: `${pct}%` }}
    >
      <div className="absolute -top-1.5 -left-[5px] w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] ring-2 ring-slate-900" />
      <div className="absolute top-8 left-2 bg-slate-900/90 text-cyan-400 text-[13px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap">
        {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </div>
    </div>
  );
};

const EveningDeadlineBand = ({ phase }) => {
  // Only show this in the Evening phase
  if (phase !== "evening") return null;

  // Hardcoded for 9:00 PM (75% of the 4-hour window)
  const leftPct = 75;
  const widthPct = 2.0833; // 5 minutes width

  return (
    <>
      {/* 1. THE RED BAND (Background Layer) */}
      <div
        className="absolute top-8 bottom-0 z-0 bg-rose-500/10 border-l border-r border-rose-500/30 pointer-events-none"
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(244,63,94,0.1)_2px,rgba(244,63,94,0.1)_4px)]" />
      </div>

      {/* 2. THE FLOATING BED (Image Layer) 
          - Decoupled from the band div
          - Positioned exactly at the center of the band (leftPct + half width)
          - Centered vertically (top: 50%)
      */}
      <div
        className="absolute z-50 pointer-events-none flex justify-center items-center"
        style={{
          left: `${leftPct + (widthPct / 2)}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)' // Perfect centering
        }}
      >
        <img
          src="/bed.png"
          alt="Bedtime"
          className="w-40 h-40 object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
        />
      </div>
    </>
  );
};


/* --------------------------------------------------
   COACH VIEW (Updated with 🚌 Emoji)
-------------------------------------------------- */
const ChildAvatar = ({ child, className = "w-10 h-10", textSize = "text-xl" }) => {

  // Helper to map background colors to ring colors explicitly
  // This ensures Tailwind generates the CSS classes we need
  const getRingColor = (bgClass) => {
    switch (bgClass) {
      case "bg-blue-500": return "ring-blue-500";
      case "bg-indigo-500": return "ring-indigo-500";
      case "bg-purple-500": return "ring-purple-500";
      case "bg-pink-500": return "ring-pink-500";
      case "bg-rose-500": return "ring-rose-500";
      case "bg-red-500": return "ring-red-500";
      case "bg-orange-500": return "ring-orange-500";
      case "bg-amber-500": return "ring-amber-500";
      case "bg-yellow-500": return "ring-yellow-500";
      case "bg-lime-500": return "ring-lime-500";
      case "bg-green-500": return "ring-green-500";
      case "bg-emerald-500": return "ring-emerald-500";
      case "bg-teal-500": return "ring-teal-500";
      case "bg-cyan-500": return "ring-cyan-500";
      case "bg-sky-500": return "ring-sky-500";
      case "bg-slate-600": return "ring-slate-600";
      default: return "ring-slate-500";
    }
  };

  const ringColor = getRingColor(child.color);

  if (child.img) {
    return (
      <img
        src={child.img}
        alt={child.name}
        className={`${className} rounded-full object-cover shadow-lg ring-[3px] ${ringColor} ring-offset-2 ring-offset-slate-800 bg-slate-800`}
      />
    );
  }

  return (
    <div className={`${className} rounded-full flex items-center justify-center ${textSize} ${child.color} ring-2 ring-slate-800 shadow-lg shrink-0`}>
      {child.avatar}
    </div>
  );
};

/* --------------------------------------------------
   COACH VIEW (Updated: Redemption & Notifications)
-------------------------------------------------- */

// --- UPDATED COACH VIEW (Removes Offset) ---
const CoachView = ({
  theme,
  currentTime,
  masterTasks,
  completedTasks,
  toggleTask,
  getProgress,
  childrenData
}) => {
  const initialPhase = getPhaseFromHour(currentTime.getHours());
  const [phase, setPhase] = useState(initialPhase);

  // Header Phase Icons
  const iconForPhase = phase === "morning" ? <span className="text-xl">☕</span> : phase === "afternoon" ? <span className="text-xl">☀️</span> : <span className="text-xl">🌙</span>;

  const phaseLabel = phase === "morning" ? "Morning Coach" : phase === "afternoon" ? "Afternoon Coach" : "Evening Coach";

  // Calculate Day ID (1=Mon ... 7=Sun) to match your Settings
  const jsDay = currentTime.getDay();
  const currentDayId = jsDay === 0 ? 7 : jsDay;

  // Filter by Phase AND Day of Week
  const tasksForPhase = masterTasks.filter((t) => {
    const isCorrectPhase = t.category === phase;
    const isCorrectDay = t.days ? t.days.includes(currentDayId) : true;
    return isCorrectPhase && isCorrectDay;
  });

  // OLD (Incorrect - uses UTC):
  // const todayKey = currentTime.toISOString().split("T")[0];

  // NEW (Correct - uses Local Device Time):
  const todayKey = currentTime.toLocaleDateString("en-CA"); // Returns "YYYY-MM-DD" in local time
  const kidOrder = ["c7", "c8", "c3", "c4", "c5", "c6"];
  const orderedKids = kidOrder.map((id) => childrenData.find((c) => c.id === id)).filter(Boolean);

  const getDeadlinePct = (childId) => {
    const boundaries = COACH_TIME_RANGES[phase] || { start: 6, end: 9 };
    const deadlineStr = COACH_DEADLINES[phase]?.[childId];
    if (!deadlineStr) return null;

    const [dH, dM] = deadlineStr.split(":").map(Number);
    const startTotal = boundaries.start * 60;
    const endTotal = boundaries.end * 60;
    const duration = endTotal - startTotal;
    const deadlineTotal = dH * 60 + dM;

    return ((deadlineTotal - startTotal) / duration) * 100;
  };

  const formatToAmPm = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${suffix}`;
  };

  // --- DAY LOGIC ---
  // Weekend = Saturday (6) or Sunday (0)
  const isWeekend = jsDay === 0 || jsDay === 6;

  // School Night = Sunday (0) through Thursday (4)
  const isSchoolNight = jsDay >= 0 && jsDay <= 4;

  // --- IMAGE SELECTION ---
  let deadlineImage = null;

  // 1. Morning: Show Bus only if it's NOT a weekend (Mon-Fri)
  if (phase === "morning" && !isWeekend) {
    deadlineImage = "/bus.png";
  }
  // 2. Evening: Show Bed only if it IS a school night (Sun-Thu)
  else if (phase === "evening" && isSchoolNight) {
    deadlineImage = "/bed.png";
  }

  return (
    <div className="h-full w-full mx-auto flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between mb-3 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            {iconForPhase}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{phaseLabel}</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
              {currentTime.toLocaleDateString([], { weekday: "long" })}
            </p>
          </div>
        </div>

        {/* Phase Toggle */}
        <div className="inline-flex rounded-full bg-slate-900/80 p-1 border border-white/10 backdrop-blur-md">
          {[{ id: "morning", label: "AM" }, { id: "afternoon", label: "PM" }, { id: "evening", label: "Night" }].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setPhase(mode.id)}
              className={`px-3 py-1 rounded-full text-[15px] font-bold transition-all ${phase === mode.id ? "bg-slate-700 text-white shadow-md" : "text-slate-500 hover:text-slate-300"}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </header>

      {/* TIMELINE CONTAINER */}
      <div className="relative flex-1 flex flex-col bg-slate-900/40 rounded-[2rem] border border-white/5 backdrop-blur-md overflow-hidden">

        {/* 1. MASTER RULER WRAPPER 
            ✅ We apply px-4 here. This establishes the "0%" line at exactly 16px from the left. 
        */}
        <div className="w-full px-4 pt-4 shrink-0">
          <TimeRuler phase={phase} />
        </div>

        {/* 2. SWEEPING LINE CONTAINER
            ✅ Absolute overlay that spans the whole height.
            ✅ Crucial: It ALSO has px-4. So "left: 0%" inside here aligns with "left: 0%" of the ruler.
        */}
        <div className="absolute inset-0 px-4 pointer-events-none z-20 pt-[3.5rem] pb-4">
          {/* The padding-top (pt) ensures the line starts below the ruler text, 
               but the vertical line spans the whole height */}
          <div className="relative w-full h-full">
            <SweepingLine phase={phase} currentTime={currentTime} />
          </div>
        </div>

        {/* 3. KID ROWS 
            The rows themselves have px-4 padding inside (from previous styling). 
            This means the progress bars inside them also start at 16px.
            Everything is now aligned.
        */}
        <div className="flex-1 flex flex-col gap-3 pt-2 relative z-10 min-h-0 px-2 pb-4">
          {orderedKids.map((child) => {
            const childTasks = tasksForPhase.filter((t) => t.assignees.includes("all") || t.assignees.includes(child.id));
            const { completed, total } = getProgress(child.id, phase);
            const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
            const markerLeft = getDeadlinePct(child.id);

            return (
              <div
                key={child.id}
                className="relative flex-1 flex flex-col justify-center bg-slate-800/60 rounded-xl px-4 py-3 border border-white/5 group min-h-0"
              >
                {/* DEADLINE MARKER (Bus/Bed) */}
                {markerLeft !== null && markerLeft >= 0 && markerLeft <= 100 && deadlineImage && (
                  <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{ left: `${markerLeft}%` }}
                  >
                    <div className="absolute top-0 bottom-0 w-0 border-l-4 border-dashed border-slate-600/30 -translate-x-1/2" />
                    <div className="absolute top-[-1.5rem] -translate-x-1/2 flex flex-col items-center w-max">
                      <span className="mb-0.5 text-xs font-bold text-white bg-slate-900/90 border border-slate-600 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                        {formatToAmPm(COACH_DEADLINES[phase][child.id])}
                      </span>
                      <img src={deadlineImage} alt="Deadline" className="w-20 max-w-none h-auto drop-shadow-xl" />
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="relative z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <ChildAvatar child={child} className="w-12 h-12" textSize="text-xl" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xl font-bold text-slate-200">{child.name}</span>
                        <span className="text-xs font-mono text-emerald-400">{completed}/{total}</span>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden w-full ring-1 ring-white/5">
                        <div className="h-full bg-emerald-500 shadow-[0_0_10px_#34d399]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pl-[4rem] items-center">
                    {childTasks.length === 0 ? (
                      <span className="text-[10px] text-slate-600 italic">No tasks.</span>
                    ) : (
                      childTasks.map((task) => {
                        const key = `${todayKey}-${child.id}-${task.id}`;
                        const done = !!completedTasks[key];
                        return (
                          <button
                            key={task.id}
                            onClick={() => toggleTask(child.id, task.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${done ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300" : "bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}
                          >
                            <span className="text-sm">{task.icon}</span>
                            <span className="text-xs">{task.label}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
/* --------------------------------------------------
   GIGS VIEW (Updated: Redemption & Notifications)
-------------------------------------------------- */

/* --------------------------------------------------
   GIGS VIEW (Pure Task Board)
-------------------------------------------------- */
const GigsView = ({ theme, gigs, setGigs, childrenData = [], wallet, setWallet }) => {
  const [claimModeId, setClaimModeId] = useState(null);

  // PIN STATE (Still needed for "Approve & Pay")
  const [showPinPad, setShowPinPad] = useState(false);
  const [pendingGigId, setPendingGigId] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const PARENT_PIN = "8675";

  const initiateCompletion = (gigId) => {
    const gig = gigs.find(g => g.id === gigId);
    if (!gig) return;

    // 1. SUNDAY GUARD
    const today = new Date();
    const isSunday = today.getDay() === 0;
    const screenTimeTypes = ['tv', 'tablet', 'pc', 'xbox'];

    if (isSunday && screenTimeTypes.includes(gig.compensationType)) {
      alert("🚫 Screen time cannot be redeemed on Sundays.");
      return;
    }

    // 2. UPDATE WALLET STATE
    if (gig.claimedBy) {
      setWallet(prev => {
        const current = prev[gig.claimedBy] || { money: 0, time: 0 };
        const amount = Number(gig.compensationAmount) || 0;
        return {
          ...prev,
          [gig.claimedBy]: {
            ...current,
            money: gig.compensationType === 'money' ? current.money + amount : current.money,
            time: gig.compensationType !== 'money' ? current.time + amount : current.time
          }
        };
      });
    }

    // 3. UPDATE GIG STATE
    setGigs(prev => prev.map(g => g.id === gigId ? { ...g, completed: true } : g));

    // 4. SEND TO API
    const payload = { child_id: gig.claimedBy, amount: gig.compensationAmount, type: gig.compensationType, gig_name: gig.title };
    if (typeof HA_URL !== 'undefined') {
      fetch(`${HA_URL}/api/webhook/family_dashboard_payout`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      }).catch(err => console.error("Failed to send to HA:", err));
    }
  };

  // PIN LOGIC
  const handlePinClick = (num) => { if (pinInput.length < 4) { setPinInput(prev => prev + num); setPinError(false); } };
  const handlePinBackspace = () => { setPinInput(prev => prev.slice(0, -1)); };
  const handlePinSubmit = () => { if (pinInput === PARENT_PIN) { initiateCompletion(pendingGigId); closePinPad(); } else { setPinError(true); setPinInput(""); setTimeout(() => setPinError(false), 500); } };
  const closePinPad = () => { setShowPinPad(false); setPendingGigId(null); setPinInput(""); setPinError(false); };

  const claimGig = (gigId, childId) => { setGigs((prev) => prev.map((g) => (g.id === gigId ? { ...g, claimedBy: childId } : g))); setClaimModeId(null); };
  const unclaimGig = (gigId) => { if (window.confirm("Release this gig?")) { setGigs((prev) => prev.map((g) => (g.id === gigId ? { ...g, claimedBy: null, completed: false } : g))); } };

  const kids = (childrenData || []).filter(c => c.role === 'child');
  const openGigs = gigs.filter(g => !g.claimedBy && !g.completed);
  const claimedGigs = gigs.filter(g => g.claimedBy && !g.completed);
  const completedGigs = gigs.filter(g => g.completed);

  const renderGigCard = (gig) => {
    const isClaimed = !!gig.claimedBy;
    const claimer = isClaimed ? (childrenData || []).find((c) => c.id === gig.claimedBy) : null;
    return (
      <div key={gig.id} className={`relative flex flex-col p-5 rounded-2xl border transition-all duration-300 ${gig.completed ? "bg-emerald-900/10 border-emerald-500/20 opacity-60 grayscale-[0.5]" : isClaimed ? "bg-slate-800 border-indigo-500/30" : "bg-slate-900/40 border-white/10 hover:bg-slate-800/60"}`}>
        <div className="flex justify-between items-start mb-3">
          <div className={`px-2.5 py-1 rounded-lg text-sm font-bold uppercase tracking-wider border ${gig.compensationType === "money" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}>
            {gig.compensationType === "money" ? `$${gig.compensationAmount}` : `${gig.compensationAmount}m Time`}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {gig.expectedMinutes && <div className="text-slate-500 text-xs flex items-center gap-1"><Clock className="w-4 h-4" /> {gig.expectedMinutes}m</div>}
            {claimer && <div className="flex items-center gap-1" title={gig.completed ? `Completed by ${claimer.name}` : `Claimed by ${claimer.name}`}><ChildAvatar child={claimer} className="w-8 h-8 ring-1 ring-slate-600" textSize="text-xs" /></div>}
          </div>
        </div>
        <div className="flex items-start gap-3 mb-1 mt-[-2px]">
          <span className="text-3xl leading-none pt-0.5">{gig.icon || "💵"}</span>
          <h3 className="text-base font-bold text-white leading-tight">{gig.title}</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed ml-11">{gig.description}</p>
        <div className="mt-auto pt-3 border-t border-white/5">
          {isClaimed && !gig.completed ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Claimed by <span className="text-slate-200 font-bold">{claimer?.name}</span></span>
              <div className="flex gap-2">
                <button onClick={() => unclaimGig(gig.id)} className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5">Cancel</button>
                <button onClick={() => { setPendingGigId(gig.id); setShowPinPad(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center gap-1 transition-all active:scale-95"><span>Approve & Pay</span></button>
              </div>
            </div>
          ) : isClaimed && gig.completed ? (
            <div className="flex justify-end"><span className="text-xs text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1"><Check className="w-4 h-4" /> Paid</span></div>
          ) : (
            claimModeId === gig.id ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                <p className="text-xs text-slate-500 uppercase font-bold mb-2 text-center">Who is claiming this?</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {kids.map((child) => (<button key={child.id} onClick={() => claimGig(gig.id, child.id)} className="flex flex-col items-center gap-1 group"><ChildAvatar child={child} className="w-10 h-10 group-hover:ring-2 ring-emerald-500 transition-all" textSize="text-sm" /></button>))}
                  <button onClick={() => setClaimModeId(null)} className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-slate-700">✕</button>
                </div>
              </div>
            ) : (<button onClick={() => setClaimModeId(gig.id)} className="w-full bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 hover:text-white text-sm font-bold py-3 rounded-lg transition-all">Claim Job</button>)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full pb-24 overflow-hidden flex flex-col relative">
      <header className="shrink-0 bg-slate-800/40 border-b border-white/5 p-4 mb-4 backdrop-blur-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Gig Board</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Available Tasks</p>
        </div>
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest border border-white/10 px-2 py-1 rounded-lg">Check 'Balances' to Redeem</div>
      </header>

      {/* PIN PAD */}
      {showPinPad && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 shadow-2xl w-full max-w-xs flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 mb-2 text-slate-300"><Lock className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">Parent Approval</span></div>
            <div className={`h-12 bg-slate-900 rounded-xl flex items-center justify-center gap-2 text-2xl font-mono text-white tracking-[0.5em] border border-white/5 ${pinError ? 'border-rose-500 animate-pulse text-rose-500' : ''}`}>{"•".repeat(pinInput.length)}{pinInput.length < 4 && <span className="opacity-20 animate-pulse">|</span>}</div>
            <div className="grid grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (<button key={num} onClick={() => handlePinClick(num.toString())} className="h-14 rounded-xl bg-slate-700/50 hover:bg-slate-600 text-white text-xl font-bold transition-colors active:scale-95">{num}</button>))}<button onClick={closePinPad} className="h-14 rounded-xl text-slate-500 text-xs font-bold hover:text-white uppercase tracking-wider">Cancel</button><button onClick={() => handlePinClick("0")} className="h-14 rounded-xl bg-slate-700/50 hover:bg-slate-600 text-white text-xl font-bold transition-colors active:scale-95">0</button><button onClick={handlePinBackspace} className="h-14 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 flex items-center justify-center active:scale-95"><Delete className="w-6 h-6" /></button></div>
            <button onClick={handlePinSubmit} disabled={pinInput.length !== 4} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg mt-2 transition-all">Approve Payment</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[500px]">
          <div className="flex flex-col bg-slate-800/20 rounded-[2rem] border border-white/5 overflow-hidden">
            <div className="p-4 bg-slate-800/40 border-b border-white/5 flex items-center justify-between"><h2 className="font-bold text-slate-300 text-sm uppercase tracking-wide flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-500" /> Open</h2><span className="text-xs font-mono text-slate-500">{openGigs.length}</span></div>
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">{openGigs.length === 0 && <div className="text-center text-xs text-slate-600 italic py-10">No open gigs.</div>}{openGigs.map(renderGigCard)}</div>
          </div>
          <div className="flex flex-col bg-slate-800/20 rounded-[2rem] border border-white/5 overflow-hidden">
            <div className="p-4 bg-slate-800/40 border-b border-white/5 flex items-center justify-between"><h2 className="font-bold text-indigo-300 text-sm uppercase tracking-wide flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> In Progress</h2><span className="text-xs font-mono text-slate-500">{claimedGigs.length}</span></div>
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">{claimedGigs.length === 0 && <div className="text-center text-xs text-slate-600 italic py-10">Nothing in progress.</div>}{claimedGigs.map(renderGigCard)}</div>
          </div>
          <div className="flex flex-col bg-slate-800/20 rounded-[2rem] border border-white/5 overflow-hidden">
            <div className="p-4 bg-slate-800/40 border-b border-white/5 flex items-center justify-between"><h2 className="font-bold text-emerald-300 text-sm uppercase tracking-wide flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed</h2><span className="text-xs font-mono text-slate-500">{completedGigs.length}</span></div>
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">{completedGigs.length === 0 && <div className="text-center text-xs text-slate-600 italic py-10">No completed gigs yet.</div>}{completedGigs.map(renderGigCard)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
/* --------------------------------------------------
   SCHOOL MENU VIEW
-------------------------------------------------- */
/* --------------------------------------------------
   SCHOOL MENU VIEW
-------------------------------------------------- */
/* --------------------------------------------------
   SCHOOL MENU VIEW (Increased Text Size)
-------------------------------------------------- */
const SCHOOL_LOOKUP = {
  "2608": "RES – Rockwell Elementary",
  "2607": "JES – Johnson Elementary",
  "2606": "BMS – Bethel Middle School",
  "2605": "BHS – Bethel High School",
};

const SchoolMenuView = ({ theme, schoolMenu, selectedSchool, setSelectedSchool, currentTime }) => {
  const menuByKey = new Map(
    (schoolMenu || []).filter((d) => d && d.date instanceof Date && !isNaN(d.date)).map((d) => [d.date.toISOString().slice(0, 10), d])
  );
  const todayKey = currentTime.toISOString().slice(0, 10);
  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const thisMonday = getMonday(currentTime);
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  const weeks = [{ label: "This Week", start: thisMonday }, { label: "Next Week", start: nextMonday }];

  const weekRows = weeks.map((week) => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(week.start);
      d.setDate(week.start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const menu = menuByKey.get(key) || null;
      days.push({ date: d, key, menu });
    }
    return { label: week.label, start: week.start, days };
  });

  return (
    <div className="h-full w-full pb-24 flex flex-col">
      <div className="w-full h-full flex flex-col">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            {/* Increased Icon Size */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              {/* Increased Title (2xl -> 3xl) */}
              <h1 className="text-3xl font-bold text-white">School Lunch</h1>
              {/* Increased Subtitle (xs -> sm) */}
              <p className="text-sm text-slate-400">Monday–Friday Entrées</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              // Increased select text (sm -> base)
              className="appearance-none rounded-xl bg-slate-800 border border-white/10 text-white px-5 py-3 pr-12 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-lg"
            >
              {Object.entries(SCHOOL_LOOKUP).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <ChevronRight className="w-5 h-5 rotate-90" />
            </div>
          </div>
        </header>

        <div className={`${theme.cardBg} rounded-[2rem] p-6 flex-1 overflow-y-auto custom-scrollbar`}>
          {/* Increased Day Headers (xs -> sm) */}
          <div className="grid grid-cols-5 gap-4 mb-3 text-sm font-bold text-slate-500 uppercase tracking-widest text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((label) => <div key={label}>{label}</div>)}
          </div>
          <div className="space-y-6">
            {weekRows.map((week, rowIdx) => (
              <div key={rowIdx}>
                <div className="flex items-baseline gap-2 mb-2 px-1">
                  {/* Increased Week Label (sm -> base) */}
                  <span className="text-base font-bold text-indigo-300">{week.label}</span>
                  {/* Increased Date Range (10px -> xs) */}
                  <span className="text-xs text-slate-500">Week of {week.start.toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {week.days.map((day, colIdx) => {
                    const isToday = day.key === todayKey;
                    return (
                      <div
                        key={colIdx}
                        // Increased min-height to accommodate larger text
                        className={`rounded-2xl border p-4 min-h-[160px] flex flex-col transition-all duration-300
                          ${isToday
                            ? "bg-indigo-900/30 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] scale-105 z-10"
                            : "bg-slate-900/40 border-white/5 hover:bg-slate-800/60"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                          {/* Increased Date Number (base -> xl) */}
                          <span className={`text-xl font-bold ${isToday ? "text-indigo-300" : "text-slate-300"}`}>
                            {day.date.toLocaleDateString([], { month: "numeric", day: "numeric" })}
                          </span>
                        </div>
                        {day.menu?.items?.length > 0 ? (
                          <ul className="space-y-2">
                            {day.menu.items.map((item, idx) => (
                              // Increased Menu Item Text (sm -> base)
                              <li key={idx} className="text-base font-medium leading-snug text-slate-200 flex gap-2">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          // Increased 'No menu' text (xs -> sm)
                          <p className="text-sm text-slate-600 italic">No menu</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------
   SETTINGS VIEW (Updated: Fixed squished child circles)
-------------------------------------------------- */

const SettingsView = ({
  gigs, setGigs,
  gigTemplates, setGigTemplates,
  calendarSources, setCalendarSources,
  masterTasks, setMasterTasks,
  calendarFilters, setCalendarFilters,
  childrenData, setChildrenData,
  wallet, setWallet,
  hiddenEventIds, setHiddenEventIds,
  rewardThreshold, setRewardThreshold
}) => {

  // --- ADMIN LOCK STATE ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [adminPinError, setAdminPinError] = useState(false);
  const CONFIG_PIN = "7433";

  const handleAdminPinClick = (num) => { if (adminPinInput.length < 4) setAdminPinInput(prev => prev + num); };
  const handleAdminPinBackspace = () => setAdminPinInput(prev => prev.slice(0, -1));
  const handleAdminPinSubmit = () => {
    if (adminPinInput === CONFIG_PIN) {
      setIsAdmin(true);
      setShowAdminPin(false);
      setAdminPinInput("");
    } else {
      setAdminPinError(true);
      setAdminPinInput("");
      setTimeout(() => setAdminPinError(false), 500);
    }
  };

  // --- EMOJI STATE ---
  const [emojiSearch, setEmojiSearch] = useState("");
  const [copiedEmoji, setCopiedEmoji] = useState(null);

  // Custom Emoji State (Persisted)
  const [customEmojiInput, setCustomEmojiInput] = useState("");
  const [customEmojis, setCustomEmojis] = useState(() => {
    try {
      const saved = localStorage.getItem("familyCustomEmojis");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("familyCustomEmojis", JSON.stringify(customEmojis));
  }, [customEmojis]);

  // Full Unicode emoji index
  const [emojiIndex, setEmojiIndex] = useState([]);
  const [emojiIndexReady, setEmojiIndexReady] = useState(false);
  const [emojiIndexError, setEmojiIndexError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mod = await import("emojibase-data/en/data.json");
        const data = mod.default || mod;

        const mapped = (Array.isArray(data) ? data : [])
          .filter((e) => e?.emoji)
          .map((e) => {
            const label = e.label || "";
            const tags = Array.isArray(e.tags) ? e.tags : [];
            const shortcodes = Array.isArray(e.shortcodes) ? e.shortcodes : [];
            const skins = Array.isArray(e.skins) ? e.skins : [];
            const keywords = [label, ...tags, ...shortcodes].join(" ").toLowerCase();

            const entries = [{ c: e.emoji, k: keywords }];
            skins.forEach((s) => {
              if (s?.emoji) entries.push({ c: s.emoji, k: keywords });
            });
            return entries;
          })
          .flat();

        if (!alive) return;
        setEmojiIndex(mapped);
        setEmojiIndexReady(true);
      } catch (err) {
        if (!alive) return;
        console.error("Emoji dataset load failed:", err);
        setEmojiIndexError(err);
        setEmojiIndexReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Filter emojis based on search
  const filteredEmojis = useMemo(() => {
    const q = (emojiSearch || "").trim().toLowerCase();
    if (!q) return [];
    return (emojiIndex || []).filter((e) => (e.k || "").includes(q)).slice(0, 300);
  }, [emojiIndex, emojiSearch]);

  // --- ACTIONS ---

  const handleCopyEmoji = (emojiChar) => {
    if (!emojiChar) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emojiChar)
        .then(() => triggerCopySuccess(emojiChar))
        .catch(err => {
          console.warn("Secure copy failed, trying fallback...", err);
          fallbackCopyTextToClipboard(emojiChar);
        });
    } else {
      fallbackCopyTextToClipboard(emojiChar);
    }
  };

  const fallbackCopyTextToClipboard = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) triggerCopySuccess(text);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
  };

  const triggerCopySuccess = (char) => {
    setCopiedEmoji(char);
    setTimeout(() => setCopiedEmoji(null), 2000);
  };

  const handleAddCustomEmoji = (e) => {
    e.preventDefault();
    if (!customEmojiInput.trim()) return;
    const char = customEmojiInput.trim();
    if (!customEmojis.includes(char)) {
      setCustomEmojis(prev => [char, ...prev]);
    }
    setCustomEmojiInput("");
  };

  const saveToFavorites = (e, emojiChar) => {
    e.stopPropagation();
    if (!customEmojis.includes(emojiChar)) {
      setCustomEmojis(prev => [emojiChar, ...prev]);
    }
  };

  const removeCustomEmoji = (e, emojiToRemove) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Remove this emoji from favorites?")) {
      setCustomEmojis(prev => prev.filter(e => e !== emojiToRemove));
    }
  };

  // --- FORM STATE & HANDLERS ---
  const emptyForm = { title: "", description: "", successCriteria: "", expectedMinutes: "", compensationType: "money", compensationAmount: "", icon: "🧹" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [calForm, setCalForm] = useState({ label: "", googleId: "", color: "border-sky-500", icon: "" });
  const [editingCalendarId, setEditingCalendarId] = useState(null);

  const [filterInput, setFilterInput] = useState("");

  const emptyTaskForm = { label: "", icon: "📌", category: "morning", days: [1, 2, 3, 4, 5, 6, 7], assignees: ["all"] };
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const COLOR_OPTIONS = ["bg-red-500", "bg-rose-500", "bg-pink-500", "bg-purple-500", "bg-indigo-500", "bg-blue-500", "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-green-500", "bg-lime-500", "bg-yellow-500", "bg-amber-500", "bg-orange-500"];
  const inputClass = "w-full rounded-xl bg-slate-900/50 border border-white/10 text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all";
  const labelClass = "block text-xs font-semibold text-slate-400 mb-1 ml-1";
  const DAY_LABELS = [{ id: 1, L: 'M' }, { id: 2, L: 'T' }, { id: 3, L: 'W' }, { id: 4, L: 'T' }, { id: 5, L: 'F' }, { id: 6, L: 'S' }, { id: 7, L: 'S' }];

  // Helper functions
  const updateChildColor = (childId, newColor) => { setChildrenData(prev => prev.map(c => c.id === childId ? { ...c, color: newColor } : c)); };
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const resetForm = () => { setForm(emptyForm); setEditingId(null); };
  const upsertTemplateFromPayload = (payload) => { setGigTemplates((prev) => { const idx = prev.findIndex((t) => t.title.toLowerCase() === payload.title.toLowerCase()); const base = { id: idx >= 0 ? prev[idx].id : `tpl-${Date.now()}`, ...payload }; if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], ...base }; return copy; } return [...prev, base]; }); };
  const handleSubmit = (e) => { e.preventDefault(); if (!form.title.trim()) return; const payload = { title: form.title.trim(), description: form.description.trim(), successCriteria: form.successCriteria.trim(), expectedMinutes: form.expectedMinutes === "" ? "" : Number(form.expectedMinutes) || 0, compensationType: form.compensationType, compensationAmount: form.compensationAmount === "" ? "" : Number(form.compensationAmount) || 0, icon: form.icon || "🧹" }; if (editingId) { setGigs((prev) => prev.map((g) => (g.id === editingId ? { ...g, ...payload } : g))); } else { setGigs((prev) => [...prev, { id: `gig-${Date.now()}`, ...payload, claimedBy: null, completed: false }]); } upsertTemplateFromPayload(payload); resetForm(); };

  // DUPLICATE GIG
  const handleDuplicate = (gig) => {
    setForm({
      title: gig.title,
      description: gig.description || "",
      successCriteria: gig.successCriteria || "",
      expectedMinutes: gig.expectedMinutes == null ? "" : String(gig.expectedMinutes),
      compensationType: gig.compensationType || "money",
      compensationAmount: gig.compensationAmount == null ? "" : String(gig.compensationAmount),
      icon: gig.icon || "🧹"
    });
    setEditingId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = (gig) => { setEditingId(gig.id); setForm({ title: gig.title || "", description: gig.description || "", successCriteria: gig.successCriteria || "", expectedMinutes: gig.expectedMinutes == null ? "" : String(gig.expectedMinutes), compensationType: gig.compensationType || "money", compensationAmount: gig.compensationAmount == null ? "" : String(gig.compensationAmount), icon: gig.icon || "🧹" }); };
  const deleteGig = (gigId) => { if (window.confirm("Delete?")) setGigs((prev) => prev.filter((g) => g.id !== gigId)); if (editingId === gigId) resetForm(); };
  // Add this inside SettingsView, near deleteGig
  const handleRepost = (gig) => {
    if (window.confirm(`Repost "${gig.title}" to the Open board?`)) {
      const newGig = {
        ...gig,
        id: `gig-${Date.now()}`, // New ID for the new instance
        claimedBy: null,         // Reset claim
        completed: false         // Reset status
      };
      setGigs(prev => [...prev, newGig]);
    }
  };
  // ... inside SettingsView, after your other helper functions ...

  // ✅ INSERT THIS LOGIC HERE (Before the 'return' statement)
  const activeGigs = gigs.filter(g => !g.completed);
  const completedGigsList = gigs.filter(g => g.completed);


  const handleCalendarChange = (field, value) => setCalForm((prev) => ({ ...prev, [field]: value }));
  const resetCalendarForm = () => { setCalForm({ label: "", googleId: "", color: "border-sky-500", icon: "" }); setEditingCalendarId(null); };
  const submitCalendar = (e) => { e.preventDefault(); if (!calForm.label || !calForm.googleId) return; const payload = { type: "google_api", id: calForm.googleId, label: calForm.label, color: calForm.color, icon: calForm.icon }; if (editingCalendarId) { setCalendarSources((prev) => prev.map((src) => (src.id === editingCalendarId ? { ...src, ...payload } : src))); } else { setCalendarSources((prev) => [...prev, payload]); } resetCalendarForm(); };
  const startEditCalendar = (src) => { setEditingCalendarId(src.id); setCalForm({ label: src.label || "", googleId: src.id || "", color: src.color || "border-sky-500", icon: src.icon || "" }); };
  const deleteCalendar = (id) => { if (window.confirm("Remove source?")) setCalendarSources((prev) => prev.filter((src) => src.id !== id)); };

  const addFilter = (e) => { e.preventDefault(); if (!filterInput.trim()) return; if (calendarFilters.includes(filterInput.trim())) { setFilterInput(""); return; } setCalendarFilters(prev => [...prev, filterInput.trim()]); setFilterInput(""); };
  const removeFilter = (val) => setCalendarFilters(prev => prev.filter(f => f !== val));

  const handleTaskChange = (field, value) => setTaskForm(prev => ({ ...prev, [field]: value }));
  const toggleTaskAssignee = (childId) => { setTaskForm(prev => { const current = prev.assignees; if (childId === 'all') return { ...prev, assignees: ['all'] }; let newAssignees = current.includes('all') ? [] : [...current]; if (newAssignees.includes(childId)) { newAssignees = newAssignees.filter(id => id !== childId); } else { newAssignees.push(childId); } if (newAssignees.length === 0) newAssignees = ['all']; return { ...prev, assignees: newAssignees }; }); };
  const toggleDay = (dayNum) => { setTaskForm(prev => { const current = prev.days || []; if (current.includes(dayNum)) return { ...prev, days: current.filter(d => d !== dayNum) }; return { ...prev, days: [...current, dayNum] }; }); };
  const selectDays = (type) => { if (type === "all") setTaskForm(prev => ({ ...prev, days: [1, 2, 3, 4, 5, 6, 7] })); if (type === "weekdays") setTaskForm(prev => ({ ...prev, days: [1, 2, 3, 4, 5] })); if (type === "weekends") setTaskForm(prev => ({ ...prev, days: [6, 7] })); };
  const submitTask = (e) => { e.preventDefault(); if (!taskForm.label) return; const payload = { ...taskForm, id: editingTaskId || `mt-${Date.now()}` }; if (editingTaskId) { setMasterTasks(prev => prev.map(t => t.id === editingTaskId ? payload : t)); } else { setMasterTasks(prev => [...prev, payload]); } setTaskForm(emptyTaskForm); setEditingTaskId(null); };
  const startEditTask = (task) => { setEditingTaskId(task.id); const days = task.days && task.days.length > 0 ? task.days : [1, 2, 3, 4, 5, 6, 7]; setTaskForm({ ...task, days }); };
  const deleteTask = (id) => { if (window.confirm("Delete this task?")) setMasterTasks(prev => prev.filter(t => t.id !== id)); };

  // Updated Move Logic
  const moveTask = (task, direction) => {
    const index = masterTasks.indexOf(task);
    if (index === -1) return;
    const newTasks = [...masterTasks];

    if (direction === 'up' && index > 0) {
      [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
    } else if (direction === 'down' && index < newTasks.length - 1) {
      [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
    }
    setMasterTasks(newTasks);
  };

  const handlePhotoUpload = (e, childId) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const MAX_SIZE = 150; let width = img.width; let height = img.height; if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } } canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height); const dataUrl = canvas.toDataURL('image/jpeg', 0.7); setChildrenData(prev => prev.map(c => c.id === childId ? { ...c, img: dataUrl } : c)); }; img.src = event.target.result; }; reader.readAsDataURL(file); };
  const removePhoto = (childId) => { if (window.confirm("Remove this photo?")) { setChildrenData(prev => prev.map(c => c.id === childId ? { ...c, img: null } : c)); } };
  const adjustBalance = (childId, type, amount) => { setWallet(prev => { const current = prev[childId] || { money: 0, time: 0 }; const newValue = type === 'money' ? current.money + amount : current.time + amount; return { ...prev, [childId]: { ...current, [type]: newValue } }; }); };
  const unhideAll = () => { if (window.confirm(`Restore ${hiddenEventIds.length} hidden events?`)) { setHiddenEventIds([]); } };

  // --- COLUMN HELPER FOR TASKS ---
  const renderTaskColumn = (title, category, colorClass, titleColor) => {
    const tasks = masterTasks.filter(t => t.category === category);
    return (
      <div className="flex flex-col h-full bg-slate-900/30 rounded-xl border border-white/5 overflow-hidden">
        <h3 className={`text-xs font-bold ${titleColor} uppercase tracking-wider p-3 bg-white/5 text-center`}>{title} ({tasks.length})</h3>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {tasks.length === 0 && <p className="text-[10px] text-slate-600 text-center italic mt-4">No tasks</p>}
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-white/5 group hover:border-white/20 transition-all">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex flex-col gap-0.5 text-slate-600">
                  <button onClick={() => moveTask(task, 'up')} className="hover:text-white"><ArrowUp className="w-2.5 h-2.5" /></button>
                  <button onClick={() => moveTask(task, 'down')} className="hover:text-white"><ArrowDown className="w-2.5 h-2.5" /></button>
                </div>
                <span className="text-xl">{task.icon}</span>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-200 truncate">{task.label}</h3>
                  <div className="text-[9px] text-slate-500 truncate">
                    {(task.days || []).length === 7 ? 'Every Day' : (task.days || []).length === 5 && !task.days.includes(6) && !task.days.includes(7) ? 'Weekdays' : `${(task.days || []).length} Days/Wk`}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEditTask(task)} className="p-1 bg-slate-700 text-white rounded hover:bg-slate-600"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => deleteTask(task.id)} className="p-1 bg-rose-900/50 text-rose-300 rounded hover:bg-rose-900"><X className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24 max-w-6xl mx-auto space-y-8">
      {/* HEADER WITH LOCK TOGGLE */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 shadow-md">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white">System Config</h1>
        </div>

        <button
          onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminPin(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isAdmin ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}
        >
          {isAdmin ? <Lock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span>{isAdmin ? "Lock Admin" : "Unlock Admin"}</span>
        </button>
      </header>

      {/* ADMIN PIN MODAL */}
      {showAdminPin && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowAdminPin(false)}>
          <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 shadow-2xl w-full max-w-xs flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 mb-2 text-slate-300"><Lock className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">Admin Access</span></div>
            <div className={`h-12 bg-slate-900 rounded-xl flex items-center justify-center gap-2 text-2xl font-mono text-white tracking-[0.5em] border border-white/5 ${adminPinError ? 'border-rose-500 animate-pulse text-rose-500' : ''}`}>
              {"•".repeat(adminPinInput.length)}{adminPinInput.length < 4 && <span className="opacity-20 animate-pulse">|</span>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (<button key={num} onClick={() => handleAdminPinClick(num.toString())} className="h-14 rounded-xl bg-slate-700/50 hover:bg-slate-600 text-white text-xl font-bold active:scale-95">{num}</button>))}
              <button onClick={() => setShowAdminPin(false)} className="h-14 rounded-xl text-slate-500 text-xs font-bold uppercase tracking-wider hover:text-white">Cancel</button>
              <button onClick={() => handleAdminPinClick("0")} className="h-14 rounded-xl bg-slate-700/50 hover:bg-slate-600 text-white text-xl font-bold active:scale-95">0</button>
              <button onClick={handleAdminPinBackspace} className="h-14 rounded-xl text-rose-400 hover:bg-rose-900/20 flex items-center justify-center active:scale-95"><Delete className="w-6 h-6" /></button>
            </div>
            <button onClick={handleAdminPinSubmit} disabled={adminPinInput.length !== 4} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg mt-2">Unlock</button>
          </div>
        </div>
      )}


      {/* SECTION 0: CHILD PROFILES */}
      {isAdmin && (
        <section className="p-6 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Child Profiles</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {childrenData.filter(c => c.role === 'child').map(child => (
              <div key={child.id} className="flex flex-col items-center gap-4 bg-slate-900/40 p-5 rounded-xl border border-white/5">
                <div className="relative group shrink-0">
                  {child.img ? (<img src={child.img} alt={child.name} className="w-20 h-20 rounded-full object-cover shadow-lg ring-2 ring-slate-700" />) : (<div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${child.color} shadow-lg ring-2 ring-slate-700`}>{child.avatar}</div>)}
                  {child.img && (<button onClick={() => removePhoto(child.id)} className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:scale-110 transition-transform">×</button>)}
                </div>
                <div className="text-center w-full">
                  <div className="font-bold text-slate-200">{child.name}</div>
                  <div className="mt-2 mb-3"><label className="cursor-pointer inline-block px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors">Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, child.id)} /></label></div>
                  <div className="flex flex-wrap justify-center gap-1.5 px-2">{COLOR_OPTIONS.map(color => (<button key={color} onClick={() => updateChildColor(child.id, color)} className={`w-4 h-4 rounded-full ${color} ${child.color === color ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`} title="Pick Color" />))}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isAdmin && <div className="w-full h-px bg-white/10" />}

      <div className="w-full h-px bg-white/10" />

      {/* BANK CONSOLE */}
      {/* BANK CONSOLE (Direct Edit Mode) */}
      {isAdmin && (
        <section className="p-6 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Bank Console</h2>
              <p className="text-xs text-slate-400">Directly edit wallet balances</p>
            </div>
          </div>

          <div className="grid gap-4">
            {childrenData.filter(c => c.role === 'child').map((child) => {
              const bal = wallet[child.id] || { money: 0, time: 0 };

              return (
                <div key={child.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-inner">

                  {/* Child Name */}
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    <ChildAvatar child={child} className="w-10 h-10" textSize="text-sm" />
                    <span className="font-bold text-slate-200">{child.name}</span>
                  </div>

                  {/* Money Input */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Cash Balance</label>
                      <input
                        type="number"
                        step="0.01"
                        value={bal.money}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setWallet(prev => ({
                            ...prev,
                            [child.id]: { ...prev[child.id], money: val }
                          }));
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Time Input */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Time Balance (min)</label>
                      <input
                        type="number"
                        step="1"
                        value={bal.time}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                          setWallet(prev => ({
                            ...prev,
                            [child.id]: { ...prev[child.id], time: val }
                          }));
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </section>
      )}

      {isAdmin && <div className="w-full h-px bg-white/10" />}

      <div className="w-full h-px bg-white/10" />

      {/* SECTION 1: COACH TASK MANAGER */}
      <div className="grid md:grid-cols-3 gap-6">
        <section className="md:col-span-1 p-5 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10 shadow-lg h-fit">
          <div className="flex items-center gap-2 mb-4"><h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">{editingTaskId ? "Edit Task" : "New Coach Task"}</h2></div>
          <form onSubmit={submitTask} className="space-y-3">
            <div className="flex gap-2"><label className="flex-1"><span className={labelClass}>Task Name</span><input className={inputClass} value={taskForm.label} onChange={e => handleTaskChange('label', e.target.value)} placeholder="e.g. Walk Dog" /></label><label className="w-20"><span className={labelClass}>Icon</span><input className={`${inputClass} text-center text-lg`} value={taskForm.icon} onChange={e => handleTaskChange('icon', e.target.value)} /></label></div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline"><span className={labelClass}>Recurrence</span><div className="flex gap-1 text-[10px]"><button type="button" onClick={() => selectDays('weekdays')} className="text-slate-500 hover:text-white">Mon-Fri</button><span className="text-slate-700">|</span><button type="button" onClick={() => selectDays('all')} className="text-slate-500 hover:text-white">All</button></div></div>
              <div className="flex justify-between gap-1">
                {/* RECURRENCE BUTTONS: PURPLE FOR WEEKENDS */}
                {DAY_LABELS.map((day) => {
                  const isActive = (taskForm.days || []).includes(day.id);
                  const isWeekend = day.id === 6 || day.id === 7;
                  const activeColor = isWeekend ? "bg-purple-500 border-purple-500 shadow-purple-900/40" : "bg-indigo-500 border-indigo-500 shadow-indigo-900/40";
                  return (
                    <button type="button" key={day.id} onClick={() => toggleDay(day.id)} className={`w-8 h-8 rounded-full text-xs font-bold transition-all border ${isActive ? `${activeColor} text-white shadow-md scale-105` : "bg-slate-800/50 border-slate-600 text-slate-500 hover:border-slate-400"}`}>
                      {day.L}
                    </button>
                  );
                })}
              </div>
            </div>
            <label><span className={labelClass}>Time of Day</span><select className={inputClass} value={taskForm.category} onChange={e => handleTaskChange('category', e.target.value)}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></label>
            <div><span className={labelClass}>Assign To</span><div className="flex flex-wrap gap-2 mt-1"><button type="button" onClick={() => toggleTaskAssignee('all')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${taskForm.assignees.includes('all') ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400"}`}>All</button>{childrenData.filter(c => c.role === 'child').map(child => (<button type="button" key={child.id} onClick={() => toggleTaskAssignee(child.id)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all border-2 ${taskForm.assignees.includes(child.id) && !taskForm.assignees.includes('all') ? `${child.color} border-white text-white scale-110` : "bg-slate-700 border-transparent text-slate-400 grayscale opacity-50 hover:opacity-100"}`}><ChildAvatar child={child} className="w-full h-full" textSize="text-[10px]" /></button>))}</div></div>
            <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl py-2 shadow-lg transition-all">{editingTaskId ? "Update Task" : "Add Task"}</button>{editingTaskId && <button type="button" onClick={() => { setTaskForm(emptyTaskForm); setEditingTaskId(null); }} className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-bold">Cancel</button>}</div>
          </form>
        </section>

        {/* NEW 3-COLUMN LIBRARY LAYOUT */}
        <section className="md:col-span-2 p-6 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10 h-[600px] flex flex-col">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Coach Task Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full overflow-hidden">
            {renderTaskColumn("Morning", "morning", "bg-amber-500/10", "text-amber-300")}
            {renderTaskColumn("Afternoon", "afternoon", "bg-cyan-500/10", "text-cyan-300")}
            {renderTaskColumn("Evening", "evening", "bg-indigo-500/10", "text-indigo-300")}
          </div>
        </section>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* SECTION 2: GIG MANAGER */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* LEFT COLUMN: GIG FORM */}
        <section className={`md:col-span-1 p-5 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10 shadow-lg`}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
              {editingId ? "Edit Gig" : "New Gig"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <label className="flex-1">
                <span className={labelClass}>Gig Title</span>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. Wash Car"
                />
              </label>
              <label className="w-16 text-center">
                <span className={labelClass}>Icon</span>
                <input
                  className={`${inputClass} text-center text-lg px-0`}
                  value={form.icon}
                  onChange={(e) => handleChange("icon", e.target.value)}
                  placeholder="🧹"
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Description</span>
              <textarea
                className={inputClass}
                rows={2}
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Success Criteria</span>
              <textarea
                className={inputClass}
                rows={2}
                value={form.successCriteria}
                onChange={(e) => handleChange("successCriteria", e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={labelClass}>Minutes</span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.expectedMinutes}
                  onChange={(e) => handleChange("expectedMinutes", e.target.value)}
                />
              </label>
              <label>
                <span className={labelClass}>Pay Amount</span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.compensationAmount}
                  onChange={(e) => handleChange("compensationAmount", e.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Reward Type</span>
              <select
                className={inputClass}
                value={form.compensationType}
                onChange={(e) => handleChange("compensationType", e.target.value)}
              >
                <option value="money">💰 Money ($)</option>
                <option value="tv">📺 TV Time (min)</option>
                <option value="tablet">📱 Tablet Time (min)</option>
                <option value="pc">💻 PC Time (min)</option>
                <option value="xbox">🎮 Xbox Time (min)</option>
              </select>
            </label>

            <div className="pt-2 flex gap-2">
              <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl py-2 shadow-lg shadow-emerald-900/40 transition-all">
                {editingId ? "Save" : "Post Gig"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-bold">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* RIGHT COLUMN: GIG LISTS (ACTIVE & COMPLETED) */}
        <div className="md:col-span-2 flex flex-col gap-6">

          {/* 1. ACTIVE GIGS */}
          <section className="p-6 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Active Gig Board</h2>
            <div className="space-y-3">
              {activeGigs.length === 0 ? (
                <p className="text-xs text-slate-500">No active jobs.</p>
              ) : (
                activeGigs.map((gig) => (
                  <div key={gig.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex justify-between items-center group hover:border-white/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{gig.icon || "💵"}</div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-200">{gig.title}</h3>
                        <p className="text-[10px] text-slate-500">
                          {gig.compensationType === "money" ? "$" : "Time: "}{gig.compensationAmount}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDuplicate(gig)}
                        className="text-xs bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-600 hover:text-white transition-all flex items-center gap-1"
                        title="Duplicate Gig"
                      >
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">Copy</span>
                      </button>
                      <button onClick={() => startEdit(gig)} className="text-xs bg-slate-700 px-2 py-1 rounded text-white">Edit</button>
                      <button onClick={() => deleteGig(gig.id)} className="text-xs bg-rose-900/50 text-rose-300 px-2 py-1 rounded">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 2. COMPLETED GIGS */}
          {completedGigsList.length > 0 && (
            <section className="p-6 rounded-[2rem] bg-emerald-900/10 backdrop-blur-xl border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Completed Gigs</h2>
              </div>

              <div className="space-y-3">
                {completedGigsList.map((gig) => {
                  const claimer = childrenData.find(c => c.id === gig.claimedBy);
                  return (
                    <div key={gig.id} className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-3 flex justify-between items-center opacity-80 hover:opacity-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl grayscale opacity-70">{gig.icon || "✅"}</div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-300 line-through decoration-slate-500">{gig.title}</h3>
                          <div className="flex gap-2 text-[10px]">
                            <span className="text-emerald-400 font-bold">
                              PAID: {gig.compensationType === "money" ? "$" : ""}{gig.compensationAmount}{gig.compensationType !== "money" && "m"}
                            </span>
                            {claimer && <span className="text-slate-500">to {claimer.name}</span>}
                          </div>
                        </div>
                      </div>
                      
                      {/* ACTION BUTTONS */}
                      <div className="flex gap-2">
                        {/* ✅ NEW REPOST BUTTON */}
                        <button
                          onClick={() => handleRepost(gig)}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg"
                          title="Clone back to Open Board"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Repost</span>
                        </button>

                        <button
                          onClick={() => deleteGig(gig.id)}
                          className="text-xs bg-slate-800 hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 px-3 py-2 rounded-lg transition-all flex items-center gap-2 border border-white/5 hover:border-rose-500/30"
                        >
                          <Trash className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* SECTION 3: CALENDARS & FILTERS */}
      {isAdmin && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <section className="p-6 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10 h-full">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Calendar Feeds</h2>
              <form onSubmit={submitCalendar} className="grid grid-cols-6 gap-2 mb-4 items-end">
                <label className="col-span-1"><span className={labelClass}>Icon</span><input className={`${inputClass} text-center`} value={calForm.icon} onChange={(e) => handleCalendarChange("icon", e.target.value)} placeholder="📅" /></label>
                <label className="col-span-2"><span className={labelClass}>Label</span><input className={inputClass} value={calForm.label} onChange={(e) => handleCalendarChange("label", e.target.value)} /></label>
                <label className="col-span-2"><span className={labelClass}>Google ID</span><input className={inputClass} value={calForm.googleId} onChange={(e) => handleCalendarChange("googleId", e.target.value)} /></label>
                <button type="submit" className="col-span-1 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-xl py-2 shadow-lg h-[38px]">{editingCalendarId ? "Save" : "Add"}</button>
              </form>
              <div className="space-y-2">
                {calendarSources.map((src) => (
                  <div key={src.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/30 border border-white/5">
                    <div className="flex items-center gap-2 truncate"><div className={`w-2 h-2 rounded-full border ${src.color}`} /><span className="text-sm">{src.icon || "📅"}</span><span className="text-xs font-bold text-slate-300">{src.label}</span></div>
                    <div className="flex gap-2"><button onClick={() => startEditCalendar(src)} className="text-[10px] text-slate-400 hover:text-white">Edit</button><button onClick={() => deleteCalendar(src.id)} className="text-[10px] text-rose-400 hover:text-rose-300">Del</button></div>
                  </div>
                ))}
              </div>
            </section>
            <section className="p-6 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10 h-full flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Calendar Filters</h2>
                {hiddenEventIds.length > 0 && (
                  <button
                    onClick={unhideAll}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider bg-white/5 px-2 py-1 rounded"
                  >
                    Restore {hiddenEventIds.length} Hidden
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mb-4">Events matching these keywords will be hidden.</p>
              <form onSubmit={addFilter} className="flex gap-2 mb-4">
                <input className={inputClass} value={filterInput} onChange={(e) => setFilterInput(e.target.value)} placeholder="e.g. Varsity, Grade 2" />
                <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl px-4 shadow-lg">Block</button>
              </form>
              <div className="flex flex-wrap gap-2 content-start">
                {calendarFilters.length === 0 ? <p className="text-xs text-slate-600 italic">No filters active.</p> : calendarFilters.map((filter) => (
                  <div key={filter} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-900/30 border border-rose-500/30 text-rose-200 text-xs font-medium">
                    <span>{filter}</span><button onClick={() => removeFilter(filter)} className="hover:text-white w-4 h-4 flex items-center justify-center rounded-full hover:bg-rose-500/50">×</button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="w-full h-px bg-white/10" />
        </>
      )}

      {/* UPDATED: EMOJI FINDER TOOL */}
      <section className="p-6 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Emoji Finder (Click to Copy, + to Add)</h2>

        {/* Search & Custom Input */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            className="flex-1 rounded-xl bg-slate-900/50 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600"
            placeholder="Search topics (e.g. food, sports, dog)..."
            value={emojiSearch}
            onChange={(e) => setEmojiSearch(e.target.value)}
          />
          <form onSubmit={handleAddCustomEmoji} className="flex gap-2">
            <input
              className="w-16 rounded-xl bg-slate-900/50 border border-white/10 text-white text-center text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+"
              value={customEmojiInput}
              onChange={(e) => setCustomEmojiInput(e.target.value)}
            />
            <button type="submit" className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm">Add</button>
          </form>
        </div>

        {/* 1. Custom / Favorites List */}
        {customEmojis.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">My Favorites</h3>
            <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
              {customEmojis.map((emoji, i) => (
                <div key={`custom-${i}`} className="relative group">
                  <button
                    onClick={() => handleCopyEmoji(emoji)}
                    className="w-full aspect-square rounded-xl bg-indigo-900/30 hover:bg-indigo-800/50 flex items-center justify-center text-2xl transition-all active:scale-95 border border-indigo-500/30 shadow-[0_0_10px_rgba(79,70,229,0.1)]"
                    title="Click to Copy"
                  >
                    {emoji}
                  </button>
                  <button
                    onClick={(e) => removeCustomEmoji(e, emoji)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {customEmojis.length > 0 && <div className="w-full h-px bg-white/5 mb-6" />}

        {/* 2. Standard Library (Search Results) */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Search Results</h3>
        <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2 min-h-[50px]">

          {/* Status Loading/Error/Empty */}
          {!emojiIndexReady && (<div className="col-span-full text-xs text-slate-500 italic">Loading full emoji library...</div>)}
          {emojiIndexError && (<div className="col-span-full text-xs text-rose-400 italic">Library failed to load.</div>)}

          {emojiIndexReady && !emojiSearch.trim() && (
            <div className="col-span-full py-8 text-center text-slate-600 text-sm italic">
              Type above to find emojis...
            </div>
          )}

          {/* Grid Items */}
          {filteredEmojis.map((emoji, i) => (
            <div key={`${emoji.c}-${i}`} className="relative group animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => handleCopyEmoji(emoji.c)}
                className="w-full aspect-square rounded-xl bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center text-2xl transition-all active:scale-95 border border-white/5 hover:border-emerald-500/50"
                title={emoji.k}
              >
                {emoji.c}
              </button>

              {/* The "Add to Favorites" Button */}
              {!customEmojis.includes(emoji.c) && (
                <button
                  onClick={(e) => saveToFavorites(e, emoji.c)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 z-10"
                  title="Add to Favorites"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Floating Toast Notification */}
        {copiedEmoji && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-[100] flex items-center gap-2">
            <span className="text-xl">{copiedEmoji}</span>
            <span>Copied to clipboard!</span>
          </div>
        )}
      </section>
      {/* --- GLOBAL SETTINGS SECTION --- */}
      {isAdmin && (
        <section className="p-6 rounded-[2rem] bg-slate-800/40 backdrop-blur-xl border border-white/10 mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
            Global Automation Settings
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-200 mb-1">
                Daily Success Threshold
              </label>
              <p className="text-xs text-slate-500">
                Children must complete this percentage of their daily tasks to earn the 1-hour bonus (Disabled on Saturdays).
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-2 border border-white/10">
              <input
                type="number"
                min="1"
                max="100"
                value={rewardThreshold}
                onChange={(e) => setRewardThreshold(Number(e.target.value))}
                className="bg-transparent text-white font-bold text-xl w-16 text-center focus:outline-none"
              />
              <span className="text-slate-500 font-bold pr-2">%</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

/* --------------------------------------------------
   BALANCES VIEW (New Home for Redemption)
-------------------------------------------------- */
const BalancesView = ({ theme, childrenData, wallet, setWallet }) => {
  // REDEMPTION STATE
  const [redeemingChildId, setRedeemingChildId] = useState(null);
const [redeemType, setRedeemType] = useState("time"); // 'time' or 'money'
const [redeemAmount, setRedeemAmount] = useState("");
const [redeemTarget, setRedeemTarget] = useState("Tablet");

  // Helper: Send Notification
  // --- HELPER: Send Notification ---
const sendNotification = async (childName, type, amount, target) => {
  const PI_IP = window.location.origin;

  const payload = {
    child_name: childName,
    amount,
    type: type === "time" ? "minutes" : type,
    target,
  };

  const response = await fetch(`${PI_IP}/api/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notify failed: ${response.status} ${text}`);
  }

  return response.json();
};

const handleRedeemSubmit = async (e) => {
  e.preventDefault();

  const amount = Number(redeemAmount);
  if (!amount || amount <= 0) return;

  const child =
    childrenData.find(c => c.id === redeemingChildId) ||
    CHILDREN.find(c => c.id === redeemingChildId);

  if (!child) {
    alert("Could not find child.");
    return;
  }

  const currentBalance = wallet[redeemingChildId]?.[redeemType] || 0;

  if (amount > currentBalance) {
    alert(`Insufficient funds! You only have ${currentBalance}.`);
    return;
  }

  // 1. Update Local Wallet (authoritative local redemption)
  setWallet(prev => ({
    ...prev,
    [redeemingChildId]: {
      ...prev[redeemingChildId],
      [redeemType]: currentBalance - amount
    }
  }));

  // 2. Send backend notification
  try {
    await sendNotification(child.name, redeemType, amount, redeemTarget);
    console.log("✅ Redemption notification sent");
  } catch (err) {
    console.error("❌ Notification failed:", err);
  }

  // 3. Send Qustodio grant only for tablet time
  const normalizedTarget = String(redeemTarget || "").toLowerCase();
  const isTabletRedemption =
    redeemType === "time" &&
    (normalizedTarget.includes("tablet") || normalizedTarget.includes("ipad"));

  const qUid = child.qustodioUid || "";

  if (isTabletRedemption && qUid) {
    try {
      const response = await fetch("/api/qustodio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: child.id,
          uid: qUid,
          name: child.name.toLowerCase(),
          minutes: amount
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("❌ Qustodio HTTP error:", response.status, data);
      } else {
        console.log("✅ Qustodio response:", data);
      }
    } catch (err) {
      console.error("❌ Qustodio fetch error:", err);
    }
  } else {
    console.log("Qustodio skipped", {
      redeemType,
      redeemTarget,
      hasUid: !!qUid
    });
  }

  // 4. Reset Form
  setRedeemingChildId(null);
  setRedeemAmount("");
};

  const redeemingChild = childrenData.find(c => c.id === redeemingChildId);
  const kids = childrenData.filter(c => c.role === 'child');
  const adjustRedeemMinutes = (delta) => {
  const current = Number(redeemAmount) || 0;
  const next = Math.max(0, current + delta);
  setRedeemAmount(next === 0 ? "" : String(next));
  };

  return (
    <div className="h-full w-full p-6 flex flex-col items-center">

      {/* PAGE HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Wallet & Redemption</h1>
        <p className="text-slate-400 uppercase tracking-widest text-sm">Select your profile to spend your earnings</p>
      </div>

      {/* AVATAR GRID (Centered and Larger) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {kids.map(kid => {
          const balance = wallet[kid.id] || { money: 0, time: 0 };
          return (
            <button
              key={kid.id}
              onClick={() => setRedeemingChildId(kid.id)}
              className="relative flex flex-col items-center gap-4 bg-slate-800/40 hover:bg-slate-700/60 border border-white/5 hover:border-white/20 rounded-[2rem] p-6 transition-all duration-300 group active:scale-95"
            >
              <ChildAvatar child={kid} className="w-24 h-24 shadow-2xl ring-4 ring-transparent group-hover:ring-emerald-500 transition-all" textSize="text-4xl" />

              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-1">{kid.name}</h3>
                <div className="flex flex-col gap-1">
                  <div className="px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 font-bold font-mono text-lg">
                    ${balance.money.toFixed(2)}
                  </div>
                  <div className="px-3 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400 font-bold font-mono text-lg">
                    {balance.time}m
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* REDEMPTION POPUP */}
      {redeemingChild && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setRedeemingChildId(null)}>
          <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ChildAvatar child={redeemingChild} className="w-12 h-12" textSize="text-lg" />
                <div>
                  <h3 className="text-xl font-bold text-white">{redeemingChild.name}</h3>
                  <div className="flex gap-3 text-xs font-mono mt-1">
                    <span className="text-purple-400">{(wallet && wallet[redeemingChildId]?.time) || 0}m Time</span>
                    <span className="text-emerald-400">${((wallet && wallet[redeemingChildId]?.money) || 0).toFixed(2)} Cash</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setRedeemingChildId(null)} className="p-2 bg-slate-700/50 rounded-full text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleRedeemSubmit} className="space-y-5">
<div className="grid grid-cols-2 bg-slate-900/50 rounded-xl p-1">
  <button
    type="button"
    onClick={() => { setRedeemType("time"); setRedeemTarget("Tablet"); }}
    className={`py-2 rounded-lg text-sm font-bold transition-all ${
      redeemType === "time"
        ? "bg-purple-600 text-white shadow-lg"
        : "text-slate-500 hover:text-slate-300"
    }`}
  >
    Time
  </button>

  <button
    type="button"
    onClick={() => { setRedeemType("money"); setRedeemTarget("Greenlight"); }}
    className={`py-2 rounded-lg text-sm font-bold transition-all ${
      redeemType === "money"
        ? "bg-emerald-600 text-white shadow-lg"
        : "text-slate-500 hover:text-slate-300"
    }`}
  >
    Money
  </button>
</div>

<div>
  <label className="block text-xs font-bold text-slate-400 mb-1 ml-1 uppercase tracking-wider">
    Amount to Redeem
  </label>

{redeemType === "time" ? (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => adjustRedeemMinutes(-5)}
      className="w-12 h-12 rounded-xl bg-rose-600 border border-rose-400/30 text-white flex items-center justify-center hover:bg-rose-500 active:scale-95 transition-all shadow-lg"
      aria-label="Subtract 5 minutes"
    >
      <span className="text-2xl font-bold leading-none">−</span>
    </button>

    <div className="relative flex-1">
      <input
        type="text"
        inputMode="numeric"
        autoFocus
        className="w-full rounded-xl bg-slate-900 border border-white/10 text-white px-4 py-3 text-lg font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="0"
        value={redeemAmount}
        onChange={(e) => {
          const digitsOnly = e.target.value.replace(/[^\d]/g, "");
          setRedeemAmount(digitsOnly);
        }}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold pointer-events-none">
        min
      </span>
    </div>

    <button
      type="button"
      onClick={() => adjustRedeemMinutes(5)}
      className="w-12 h-12 rounded-xl bg-emerald-600 border border-emerald-400/30 text-white flex items-center justify-center hover:bg-emerald-500 active:scale-95 transition-all shadow-lg"
      aria-label="Add 5 minutes"
    >
      <span className="text-2xl font-bold leading-none">+</span>
    </button>
  </div>
) : (
    <div className="relative">
      <input
        type="number"
        autoFocus
        min="0"
        className="w-full rounded-xl bg-slate-900 border border-white/10 text-white px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="0"
        value={redeemAmount}
        onChange={(e) => setRedeemAmount(e.target.value)}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
        $
      </span>
    </div>
  )}
</div>

<div>
  <label className="block text-xs font-bold text-slate-400 mb-1 ml-1 uppercase tracking-wider">
    Destination
  </label>
  <div className="grid grid-cols-3 gap-2">
    {(redeemType === "time" ? ["Tablet", "PC"] : ["Greenlight", "Cash", "Amazon"]).map(t => (
      <button
        key={t}
        type="button"
        onClick={() => setRedeemTarget(t)}
        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${redeemTarget === t ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-slate-900 border-transparent text-slate-500 hover:bg-slate-800"}`}
      >
        {t}
      </button>
    ))}
  </div>
</div>

              <button type="submit" className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-2">
                <span>Redeem Now</span> <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------
   MAIN APP (Updated: Header with Dynamic Pizzazz)
-------------------------------------------------- */

function FamilyDashboard() {
  const [view, setView] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarErrors, setCalendarErrors] = useState([]);

  // 1. LOAD SAVED DATA
  const [childrenData, setChildrenData] = useState(() => {
    try {
      const saved = localStorage.getItem("familyChildren");
      return saved ? JSON.parse(saved) : CHILDREN;
    } catch { return CHILDREN; }
  });

  const [wallet, setWallet] = useState(() => {
    try {
      const saved = localStorage.getItem("familyWallet");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [customEvents, setCustomEvents] = useState(() => {
    try {
      const saved = localStorage.getItem("familyCustomEvents");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [hiddenEventIds, setHiddenEventIds] = useState(() => {
    try {
      const saved = localStorage.getItem("familyHiddenEvents");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [masterTasks, setMasterTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("familyMasterTasks");
      return saved ? JSON.parse(saved) : INITIAL_MASTER_TASKS;
    } catch (e) { return INITIAL_MASTER_TASKS; }
  });

  const [gigs, setGigs] = useState(() => {
    try {
      const saved = localStorage.getItem("familyGigs");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [gigTemplates, setGigTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("gigTemplates");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [calendarSources, setCalendarSources] = useState(() => {
    try {
      const raw = localStorage.getItem("calendarSources");
      return raw ? JSON.parse(raw) : CALENDAR_SOURCES;
    } catch { return CALENDAR_SOURCES; }
  });

  const [calendarFilters, setCalendarFilters] = useState(() => {
    try {
      const raw = localStorage.getItem("calendarFilters");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // --- NEW STATE: Daily Rewards & Threshold ---
  const [rewardThreshold, setRewardThreshold] = useState(100);
  const [dailyRewards, setDailyRewards] = useState({});


  const [completedTasks, setCompletedTasks] = useState(() => {
  try {
    const saved = localStorage.getItem("familyCompletedTasks");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
});

useEffect(() => {
  localStorage.setItem("familyCompletedTasks", JSON.stringify(completedTasks));
}, [completedTasks]);

  // --- Shared  persistence ---
  // We bootstrap from localStorage (fast/offline), then hydrate from the RPI4 via /api/state.
  // After hydration, we debounce-save back to the server so every device stays in sync.
  const serverHydratedRef = useRef(false);
  const serverSaveTimerRef = useRef(null);

  const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isPlainObject(data)) throw new Error("Bad server state");

        // Only set if present; otherwise keep what localStorage/defaults provided.
        if (cancelled) return;

        if (Array.isArray(data.childrenData)) setChildrenData(data.childrenData);
        if (isPlainObject(data.wallet)) setWallet(data.wallet);
        if (Array.isArray(data.customEvents)) setCustomEvents(data.customEvents);
        if (Array.isArray(data.hiddenEventIds)) setHiddenEventIds(data.hiddenEventIds);
        if (Array.isArray(data.masterTasks)) setMasterTasks(data.masterTasks);
        if (Array.isArray(data.gigs)) setGigs(data.gigs);
        if (Array.isArray(data.gigTemplates)) setGigTemplates(data.gigTemplates);
        if (Array.isArray(data.calendarSources)) setCalendarSources(data.calendarSources);
        if (Array.isArray(data.calendarFilters)) setCalendarFilters(data.calendarFilters);

        // ✅ Load Reward Settings from Pi
        if (isPlainObject(data.dailyRewards)) setDailyRewards(data.dailyRewards);
        if (typeof data.rewardThreshold === 'number') setRewardThreshold(data.rewardThreshold);

        serverHydratedRef.current = true;
      } catch (e) {
        // Server might be offline (or you haven't deployed server.py yet). In that case,
        // keep using localStorage and don't start pushing writes to the server.
        serverHydratedRef.current = false;
        // eslint-disable-next-line no-console
        console.warn(
          "Family Dashboard: server state not available; using localStorage only.",
          e
        );
      }
    };

    hydrateFromServer();

    return () => {
      cancelled = true;
      if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    };
  }, []);


  const [calendarView, setCalendarView] = useState("week");
  const [weather, setWeather] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState("2607"); // Default to JES
  const [schoolMenu, setSchoolMenu] = useState([]);

  const [themePhase, setThemePhase] = useState(getDayPhase());
  useEffect(() => { const i = setInterval(() => setThemePhase(getDayPhase()), 60000); return () => clearInterval(i); }, []);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const resetTimerRef = useRef(null);

  // NEW (Correct - uses Local Device Time):
  const todayKey = currentTime.toLocaleDateString("en-CA"); // Returns "YYYY-MM-DD" in local time
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const theme = THEMES[themePhase];

  // 2. PERSIST DATA
  useEffect(() => { localStorage.setItem("familyChildren", JSON.stringify(childrenData)); }, [childrenData]);
  useEffect(() => { localStorage.setItem("familyWallet", JSON.stringify(wallet)); }, [wallet]);
  useEffect(() => { localStorage.setItem("familyCustomEvents", JSON.stringify(customEvents)); }, [customEvents]);
  useEffect(() => { localStorage.setItem("familyHiddenEvents", JSON.stringify(hiddenEventIds)); }, [hiddenEventIds]);
  useEffect(() => { localStorage.setItem("familyMasterTasks", JSON.stringify(masterTasks)); }, [masterTasks]);
  useEffect(() => { localStorage.setItem("familyGigs", JSON.stringify(gigs)); }, [gigs]);
  useEffect(() => { localStorage.setItem("gigTemplates", JSON.stringify(gigTemplates)); }, [gigTemplates]);
  useEffect(() => { localStorage.setItem("calendarSources", JSON.stringify(calendarSources)); }, [calendarSources]);
  useEffect(() => { localStorage.setItem("calendarFilters", JSON.stringify(calendarFilters)); }, [calendarFilters]);

  // 2b. PERSIST SHARED DATA (RPI4) — debounced to avoid spam
  useEffect(() => {
    // Don't push anything until we've successfully hydrated from the server.
    // This prevents overwriting the Pi's saved state with defaults on first load.
    if (!serverHydratedRef.current) return;

    const nextState = {
      childrenData,
      wallet,
      customEvents,
      hiddenEventIds,
      masterTasks,
      gigs,
      gigTemplates,
      calendarSources,
      calendarFilters,
      // ✅ ADD THESE TWO LINES:
      completedTasks,
      dailyRewards,
      rewardThreshold
    };

    if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextState),
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.warn("Family Dashboard: failed to save server state.", e);
      });
    }, 500);

    return () => {
      if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    };
  }, [
    childrenData, wallet, customEvents, hiddenEventIds, masterTasks, gigs,
    gigTemplates, calendarSources, calendarFilters,
    dailyRewards, rewardThreshold // 👈 ADD THESE HERE
  ]);

  // --- AUTOMATION: Daily Percentage Reward ---
  // --- AUTOMATION: Nightly Check (11:55 PM) ---
  useEffect(() => {
    // 1. Check Time: Run only during the 23:55 (11:55 PM) minute
    if (currentTime.getHours() !== 23 || currentTime.getMinutes() !== 55) return;

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
    const dateKey = today.toLocaleDateString("en-CA");

    // 2. SATURDAY RULE: Skip rewards on Saturday (Optional)
    if (dayOfWeek !== 6) {
      const currentDayId = dayOfWeek === 0 ? 7 : dayOfWeek;

      childrenData.forEach(child => {
        if (child.role !== 'child') return;

        const rewardKey = `${dateKey}-${child.id}`;
        // Safety Check: Skip if already paid today
        if (dailyRewards[rewardKey]) return;

        // 3. Calculate Total Tasks for TODAY
        const childTasks = masterTasks.filter(t => {
          const assigned = t.assignees.includes("all") || t.assignees.includes(child.id);
          const scheduled = t.days ? t.days.includes(currentDayId) : true;
          return assigned && scheduled;
        });

        if (childTasks.length === 0) return;

        // 4. Calculate Percentage
        const completedCount = childTasks.filter(t => {
          const key = `${dateKey}-${child.id}-${t.id}`;
          return completedTasks[key];
        }).length;

        const currentPct = (completedCount / childTasks.length) * 100;

        // 5. TRIGGER REWARD (If Percentage >= Threshold)
        if (currentPct >= rewardThreshold) {
          console.log(`🎉 Nightly Check: ${child.name} passed ${rewardThreshold}%! Awarding 1 hour.`);

          // A. Add 60 mins to Wallet
          setWallet(prev => ({
            ...prev,
            [child.id]: {
              ...prev[child.id],
              time: ((prev[child.id]?.time) || 0) + 60,
              money: (prev[child.id]?.money) || 0
            }
          }));

          // B. Mark as Paid
          setDailyRewards(prev => ({ ...prev, [rewardKey]: true }));

          // C. Notify Home Assistant
          const payload = {
            child_id: child.id,
            child_name: child.name,
            amount: 60,
            reason: `Nightly Success > ${rewardThreshold}%`
          };

          if (typeof HA_URL !== 'undefined') {
            fetch(`${HA_URL}/api/webhook/family_dashboard_reward`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            }).catch(err => console.warn("Failed to notify HA", err));
          }
        }
      });
    }

    // --- 6. DATA CLEANUP (The "Reset" Assurance) ---
    // This block runs once per night to delete tasks older than 7 days.
    // This keeps the app fast and ensures old data doesn't pile up.
    const maintenanceKey = `${dateKey}-maintenance`;

    if (!dailyRewards[maintenanceKey]) {
      setCompletedTasks(prev => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7); // Keep 7 days of history

        const next = { ...prev };
        let prunedCount = 0;

        Object.keys(next).forEach(key => {
          // Key format is "YYYY-MM-DD-childID-taskID"
          // We grab the first 10 chars (YYYY-MM-DD) to check the date
          const datePart = key.substring(0, 10);
          const taskDate = new Date(datePart);

          if (taskDate < cutoff) {
            delete next[key];
            prunedCount++;
          }
        });

        if (prunedCount > 0) console.log(`🧹 Pruned ${prunedCount} old tasks.`);
        return next;
      });

      // Mark maintenance as done so it doesn't run again this minute
      setDailyRewards(prev => ({ ...prev, [maintenanceKey]: true }));
    }

  }, [currentTime, masterTasks, completedTasks, childrenData, dailyRewards, rewardThreshold]);
  // --- AUTOMATION: Daily Percentage Reward ---
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
    const dateKey = today.toLocaleDateString("en-CA");

    // 1. SATURDAY RULE: Do not accumulate minutes on Saturday
    if (dayOfWeek === 6) return;

    const currentDayId = dayOfWeek === 0 ? 7 : dayOfWeek;

    childrenData.forEach(child => {
      if (child.role !== 'child') return;

      const rewardKey = `${dateKey}-${child.id}`;
      // Skip if already paid today
      if (dailyRewards[rewardKey]) return;

      // 2. Calculate Total Tasks for TODAY
      const childTasks = masterTasks.filter(t => {
        const assigned = t.assignees.includes("all") || t.assignees.includes(child.id);
        const scheduled = t.days ? t.days.includes(currentDayId) : true;
        return assigned && scheduled;
      });

      if (childTasks.length === 0) return;

      // 3. Calculate Percentage
      const completedCount = childTasks.filter(t => {
        const key = `${dateKey}-${child.id}-${t.id}`;
        return completedTasks[key];
      }).length;

      const currentPct = (completedCount / childTasks.length) * 100;

      // 4. TRIGGER REWARD (If Percentage >= Threshold)
      if (currentPct >= rewardThreshold) {
        console.log(`🎉 ${child.name} passed ${rewardThreshold}%! Awarding 1 hour.`);

        // A. Add 60 mins to Wallet
        setWallet(prev => ({
          ...prev,
          [child.id]: {
            ...prev[child.id],
            time: ((prev[child.id]?.time) || 0) + 60,
            money: (prev[child.id]?.money) || 0
          }
        }));

        // B. Mark as Paid (Updates API State via useEffect)
        setDailyRewards(prev => ({ ...prev, [rewardKey]: true }));

        // C. Notify Home Assistant
        const payload = {
          child_id: child.id,
          child_name: child.name,
          amount: 60,
          reason: `Daily Progress > ${rewardThreshold}%`
        };

        if (typeof HA_URL !== 'undefined') {
          fetch(`${HA_URL}/api/webhook/family_dashboard_reward`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).catch(err => console.warn("Failed to notify HA", err));
        }
      }
    });

  }, [completedTasks, masterTasks, childrenData, dailyRewards, rewardThreshold]);


  // Weather & Menu Fetch (Standard)
  useEffect(() => { const fetchWeather = async () => { try { const url = `https://api.open-meteo.com/v1/forecast?latitude=41.3712&longitude=-73.414&current_weather=true&hourly=temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m,weathercode&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York`; const res = await fetch(url); const data = await res.json(); if (!data.current_weather) return; const daily = data.daily.time.map((iso, i) => ({ date: fromLocalDateString(iso), high: data.daily.temperature_2m_max[i], low: data.daily.temperature_2m_min[i], code: data.daily.weathercode[i], })).slice(0, 7); setWeather({ current: { temperature: data.current_weather.temperature, code: data.current_weather.weathercode }, daily, unit: "F" }); } catch (e) { } }; fetchWeather(); }, []);
  useEffect(() => { const fetchMenu = async () => { try { const year = currentTime.getFullYear(); const month = String(currentTime.getMonth() + 1).padStart(2, "0"); const url = `https://apiservicelocatorstenant.fdmealplanner.com/api/v1/data-locator-webapi/3/meals?menuId=0&accountId=651&locationId=${selectedSchool}&mealPeriodId=2&tenantId=3&monthId=${month}&startDate=${year}/${month}/01&endDate=${year}/${month}/31&timeOffset=300`; const res = await fetch(url); const raw = await res.json(); const rows = Array.isArray(raw?.result) ? raw.result : []; const normalized = rows.map((row) => { const dateStr = row.strMenuForDate || row.menuForDate || row.date; if (!dateStr) return null; let items = []; if (Array.isArray(row.menuRecipiesData)) { items = row.menuRecipiesData.filter((r) => r.isEntreeType === 1 && (r.isShowOnMenu === 1 || r.isShowOnMenu === true || r.isShowOnMenu === "1")).map((r) => r.componentEnglishName || r.name || "").filter(Boolean); items = Array.from(new Set(items)); } return { date: new Date(dateStr), items }; }).filter(Boolean); setSchoolMenu(normalized); } catch (err) { setSchoolMenu([]); } }; fetchMenu(); }, [selectedSchool, currentTime.getFullYear(), currentTime.getMonth()]);

  const toggleTask = (childId, taskId) => { const key = `${todayKey}-${childId}-${taskId}`; setCompletedTasks((prev) => { const c = { ...prev }; if (c[key]) delete c[key]; else c[key] = Date.now(); return c; }); };
  const getProgress = (childId, category) => { const dow = currentTime.getDay(); const weekday = dow === 0 ? 7 : dow; const tasks = masterTasks.filter((t) => { if (category && t.category !== category) return false; if (!(t.assignees.includes("all") || t.assignees.includes(childId))) return false; if (t.days && t.days.length > 0 && !t.days.includes(weekday)) return false; return true; }); let completed = 0; tasks.forEach((t) => { if (completedTasks[`${todayKey}-${childId}-${t.id}`]) completed++; }); return { completed, total: tasks.length }; };

  const addCustomEvent = (payload) => { const newEvent = { ...payload, id: `local-${Date.now()}` }; setCustomEvents(prev => [...prev, newEvent]); };
  const updateCustomEvent = (updated) => { setCustomEvents(prev => prev.map(evt => evt.id === updated.id ? { ...evt, ...updated } : evt)); };
  const deleteCustomEvent = (id) => { if (window.confirm("Delete this event?")) { setCustomEvents(prev => prev.filter(evt => evt.id !== id)); } };
  const hideExternalEvent = (id) => { if (window.confirm("Remove this event from the dashboard? (It will remain on your Google Calendar)")) { setHiddenEventIds(prev => [...prev, id]); } };

  const calendarMonthKey = calendarDate.getFullYear() + "-" + calendarDate.getMonth();

  useEffect(() => {
    const fetchAllCalendars = async () => {
      const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
      const end = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 2, 1);
      let merged = [], errs = [];

      for (const src of calendarSources) {
        try {
          if (src.type === "google_api" && GOOGLE_API_KEY) {
            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(src.id)}/events?key=${GOOGLE_API_KEY}&timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`);
            const data = await res.json();
            if (!res.ok) { errs.push({ id: src.label }); continue; }
            if (data.items) {
              merged.push(...data.items.map((i) => {
                let color = src.color;
                let isChild = false;
                if (src.id === "kidlindstrom@gmail.com") {
                  const match = CHILD_EVENT_COLOR_RULES.find(r => (i.summary || "").toLowerCase().includes(r.name.toLowerCase()));
                  if (match) { color = match.colorClass; isChild = true; }
                }

                let timeStr = "All Day";
                if (!i.start.date) {
                  const sTime = new Date(i.start.dateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                  if (i.end && i.end.dateTime) {
                    const eTime = new Date(i.end.dateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                    timeStr = `${sTime} - ${eTime}`;
                  } else {
                    timeStr = sTime;
                  }
                }

                return {
                  id: i.id, title: i.summary || "Busy",
                  time: timeStr, colorClass: color,
                  rawDate: new Date(i.start.dateTime || i.start.date),
                  calendarLabel: src.label, sourceIcon: src.icon || null,
                  isChildEvent: isChild, isCustom: false
                };
              }));
            }
          }
        } catch { errs.push({ id: src.label }); }
      }

      const formatLocalTime = (t) => {
        const [h, m] = t.split(':');
        const d = new Date(); d.setHours(h, m);
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      };

      customEvents.forEach(evt => {
        const d = new Date(evt.date);
        let timeStr = "All Day";
        if (evt.startTime) {
          const s = formatLocalTime(evt.startTime);
          const e = evt.endTime ? formatLocalTime(evt.endTime) : "";
          timeStr = e ? `${s} - ${e}` : s;
        } else if (evt.time) {
          timeStr = formatLocalTime(evt.time);
        }

        merged.push({
          id: evt.id, title: evt.title, time: timeStr, rawDate: d,
          colorClass: evt.type === 'work' ? 'border-sky-500' : evt.type === 'school' ? 'border-indigo-500' : 'border-emerald-500',
          calendarLabel: evt.type || "Family",
          sourceIcon: evt.icon || null,
          isCustom: true, rawCustomData: evt
        });
      });

      const filteredEvents = merged.filter(evt => {
        if (!evt.title) return true;
        if (hiddenEventIds.includes(evt.id)) return false;
        const titleLower = evt.title.toLowerCase();
        return !calendarFilters.some(filterStr => titleLower.includes(filterStr.toLowerCase()));
      });
      setCalendarEvents(filteredEvents);
      setCalendarErrors(errs);
    };
    fetchAllCalendars();
  }, [calendarMonthKey, calendarSources, calendarFilters, customEvents, hiddenEventIds]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden font-sans transition-all duration-1000 ease-in-out ${theme.appBg}`}>
      <div className={`pointer-events-none absolute inset-0 ${theme.overlayClass}`} />
      <div className="relative z-10 h-full w-full flex flex-col">
        {/* UPDATED HEADER: DYNAMIC PIZZAZZ */}
        <header className="flex justify-between items-center px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-5">
            {/* Glowing Icon */}
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
              <div className="relative w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-white shadow-2xl">
                <Sun className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            {/* Styled Title */}
            <div>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-white drop-shadow-sm">
                Lindstrom HQ
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">Family Command Center</p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-6xl font-extralight text-white tracking-tighter drop-shadow-lg leading-none">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(/(AM|PM)/, '')}<span className="text-lg font-bold text-slate-500 ml-1">{currentTime.toLocaleTimeString([], { hour12: true }).slice(-2)}</span>
            </div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              {currentTime.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-6 pb-28 custom-scrollbar">

          {/* 1. DASHBOARD */}
          {view === "dashboard" && (
            <DashboardView
              theme={theme}
              currentTime={currentTime}
              calendarEvents={calendarEvents}
              calendarErrors={calendarErrors}
              getProgress={getProgress}
              calendarView={calendarView}
              setCalendarView={setCalendarView}
              weather={weather}
              calendarDate={calendarDate}
              calendarSources={calendarSources}
              onNavigateCalendar={(d) => {
                setCalendarDate((prev) => {
                  const n = new Date(prev);
                  if (calendarView === "week") n.setDate(n.getDate() + (d === "next" ? 7 : -7));
                  else n.setMonth(n.getMonth() + (d === "next" ? 1 : -1));
                  return n;
                });
                if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
                resetTimerRef.current = setTimeout(() => setCalendarDate(new Date()), 30000);
              }}
              masterTasks={masterTasks}
              completedTasks={completedTasks}
              childrenData={childrenData}
              addCustomEvent={addCustomEvent}
              updateCustomEvent={updateCustomEvent}
              deleteCustomEvent={deleteCustomEvent}
              hideExternalEvent={hideExternalEvent}
            />
          )}

          {/* 2. COACH */}
          {view === "coach" && (
            <CoachView
              theme={theme}
              currentTime={currentTime}
              masterTasks={masterTasks}
              completedTasks={completedTasks}
              toggleTask={toggleTask}
              getProgress={getProgress}
              childrenData={childrenData}
            />
          )}

          {/* 3. GIGS */}
          {view === "gigs" && (
            <GigsView
              theme={theme}
              gigs={gigs}
              setGigs={setGigs}
              childrenData={childrenData}
              wallet={wallet}
              setWallet={setWallet}
            />
          )}

          {/* 4. BALANCES */}
          {view === "balances" && (
            <BalancesView
              theme={theme}
              childrenData={childrenData}
              wallet={wallet}
              setWallet={setWallet}
            />
          )}

          {/* 5. CONFIG / SETTINGS */}
          {view === "settings" && (
            <SettingsView
              // 1. Theme & Basic Data
              theme={theme}
              childrenData={childrenData}
              setChildrenData={setChildrenData}

              // 2. Tasks
              masterTasks={masterTasks}
              setMasterTasks={setMasterTasks}

              // 3. Gigs (MISSING PREVIOUSLY - THIS FIXES THE CRASH)
              gigs={gigs}
              setGigs={setGigs}
              gigTemplates={gigTemplates}
              setGigTemplates={setGigTemplates}

              // 4. Calendars
              calendarSources={calendarSources}
              setCalendarSources={setCalendarSources}
              calendarFilters={calendarFilters}
              setCalendarFilters={setCalendarFilters}
              hiddenEventIds={hiddenEventIds}
              setHiddenEventIds={setHiddenEventIds}

              // 5. Wallet & Automation
              wallet={wallet}
              setWallet={setWallet}
              rewardThreshold={rewardThreshold}
              setRewardThreshold={setRewardThreshold}
            />
          )}

          {/* 6. SCHOOL MENU */}
          {view === "schoolmenu" && (
            <SchoolMenuView
              theme={theme}
              schoolMenu={schoolMenu}
              selectedSchool={selectedSchool}
              setSelectedSchool={setSelectedSchool}
              currentTime={currentTime}
            />
          )}

        </main>

        {/* Floating Nav */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-2xl text-white rounded-full px-2 py-2 flex items-center gap-2 z-50 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <NavButton view={view} target="dashboard" icon={<Clock className="w-5 h-5" />} label="Home" setView={setView} color="bg-blue-600" />
          <NavButton view={view} target="coach" icon={<Coffee className="w-5 h-5" />} label="Coach" setView={setView} color="bg-amber-500" />
          <NavButton view={view} target="gigs" icon={<Banknote className="w-5 h-5" />} label="Gigs" setView={setView} color="bg-emerald-600" />
          <NavButton view={view} target="balances" icon={<CreditCard className="w-5 h-5" />} label="Balances" setView={setView} color="bg-purple-600" />
          <div className="w-px h-8 bg-white/10 mx-1" />
          <NavButton view={view} target="schoolmenu" icon={<BookOpen className="w-5 h-5" />} label="Lunch" setView={setView} color="bg-indigo-600" />
          <div className="w-px h-8 bg-white/10 mx-1" />
          <NavButton view={view} target="settings" icon={<Settings className="w-5 h-5" />} label="Config" setView={setView} color="bg-slate-700" />
        </nav>
      </div>
    </div>
  );
}
export default function App() { return <FamilyDashboard />; }