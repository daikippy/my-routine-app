"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// --- Firebase Config (提供されたものを維持) ---
const firebaseConfig = {
  apiKey: "AIzaSyDNkvB6F_niXtk3SmmgTVm1wK418Fq7t9Q",
  authDomain: "routine-app-94afe.firebaseapp.com",
  projectId: "routine-app-94afe",
  storageBucket: "routine-app-94afe.firebasestorage.app",
  messagingSenderId: "1091003523795",
  appId: "1:1091003523795:web:2d8720af00587551e02a26"
};

// 安全な初期化
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const CHARACTERS = [
  { id: "blob", name: "ぷるぷる", color: "bg-blue-500", suffix: "だね！" },
  { id: "fluff", name: "もふもふ", color: "bg-orange-400", suffix: "ですよぉ" },
  { id: "spark", name: "ぴかぴか", color: "bg-yellow-400", suffix: "だよっ☆" },
  { id: "fire", name: "メラメラ", color: "bg-red-500", suffix: "だぜッ！" },
  { id: "cool", name: "しっとり", color: "bg-indigo-600", suffix: "ですね。" },
  { id: "ghost", name: "ふわふわ", color: "bg-purple-400", suffix: "なの…？" }
];

const THEMES = [
  { name: "漆黒", color: "#030712", bg: "bg-gray-950", accent: "from-blue-400 to-emerald-400" },
  { name: "深夜", color: "#0f172a", bg: "bg-slate-900", accent: "from-indigo-400 to-cyan-400" },
  { name: "深森", color: "#064e3b", bg: "bg-emerald-950", accent: "from-green-400 to-yellow-200" },
  { name: "紫紅", color: "#2e1065", bg: "bg-neutral-950", accent: "from-purple-500 to-pink-400" }
];

const RANK_LIST = [
  { name: "LEGEND", min: 100, color: "text-yellow-400", bg: "bg-yellow-400/20" },
  { name: "PLATINUM", min: 80, color: "text-blue-300", bg: "bg-blue-300/20" },
  { name: "GOLD", min: 50, color: "text-yellow-600", bg: "bg-yellow-600/20" },
  { name: "SILVER", min: 20, color: "text-gray-400", bg: "bg-gray-400/20" },
  { name: "BEGINNER", min: 0, color: "text-gray-500", bg: "bg-gray-500/10" }
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("main");
  const [tasks, setTasks] = useState({ morning: [], afternoon: [], night: [] });
  const [checks, setChecks] = useState({});
  const [history, setHistory] = useState([]);
  const [themeIndex, setThemeIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [inputTask, setInputTask] = useState({ morning: "", afternoon: "", night: "" });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // ハイドレーションエラー防止
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth & Firestore Listeners
  useEffect(() => {
    if (!mounted) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const unsubscribeSnap = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setTasks(d.tasks || { morning: [], afternoon: [], night: [] });
            setHistory(d.history || []);
            setThemeIndex(d.themeIndex || 0);
            setCharIndex(d.charIndex || 0);
            if (d.lastCheckDate === today) setChecks(d.checks || {});
          }
          setLoading(false);
        });
        return () => unsubscribeSnap();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [mounted, today]);

  // Derived calculations (安全に計算)
  const stats = useMemo(() => {
    const t = (tasks?.morning?.length || 0) + (tasks?.afternoon?.length || 0) + (tasks?.night?.length || 0);
    const c = Object.values(checks || {}).filter(Boolean).length;
    const p = t === 0 ? 0 : Math.round((c / t) * 100);
    const r = RANK_LIST.find(rank => p >= rank.min) || RANK_LIST[4];
    return { total: t, completed: c, percent: p, rank: r };
  }, [tasks, checks]);

  const chartData = useMemo(() => 
    history.slice(-7).map(h => ({ 
      date: h.date?.split('-').slice(1).join('/') || "", 
      percent: h.percent || 0 
    })), [history]
  );

  // Firestore Save
  const save = async (updates) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ...updates,
        percent: stats.percent,
        rank: stats.rank.name,
        lastActive: Date.now()
      });
    } catch (e) {
      console.error("Save error:", e);
      // fallback for new users
      await setDoc(doc(db, "users", user.uid), { uid: user.uid, ...updates }, { merge: true });
    }
  };

  const toggleCheck = (id) => {
    const nextChecks = { ...checks, [id]: !checks[id] };
    setChecks(nextChecks);
    save({ checks: nextChecks, lastCheckDate: today });
  };

  const addTask = (time) => {
    if (!inputTask[time]) return;
    const nextTasks = { ...tasks, [time]: [...(tasks[time] || []), inputTask[time]] };
    setTasks(nextTasks);
    setInputTask({ ...inputTask, [time]: "" });
    save({ tasks: nextTasks });
  };

  if (!mounted) return null; // サーバーサイドでのレンダリングをスキップ

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white font-black animate-pulse">
      LOADING...
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${THEMES[0].bg}`}>
      <h1 className="text-5xl font-black italic bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-10">
        ROUTINE MASTER
      </h1>
      <button 
        onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
        className="bg-white text-black px-12 py-5 rounded-full font-black shadow-2xl active:scale-95 transition-all"
      >
        START WITH GOOGLE
      </button>
    </div>
  );

  const currentTheme = THEMES[themeIndex] || THEMES[0];
  const currentChar = CHARACTERS[charIndex] || CHARACTERS[0];

  return (
    <div className={`min-h-screen ${currentTheme.bg} text-white font-sans overflow-x-hidden transition-colors duration-700`}>
      <style jsx global>{`
        @keyframes bounce-custom { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        .animate-bounce-custom { animation: bounce-custom 2s infinite ease-in-out; }
      `}</style>

      <main className="max-w-md mx-auto p-4 pb-20">
        <header className="flex justify-between items-center py-6">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10">☰</button>
          <h1 className={`text-xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent}`}>
            ROUTINE MASTER
          </h1>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10">⚙️</button>
        </header>

        {/* Hero Section */}
        <section className="bg-white/5 rounded-[3rem] p-8 border border-white/10 mb-6 flex flex-col items-center shadow-2xl">
          <div className={`w-24 h-24 rounded-full ${currentChar.color} animate-bounce-custom shadow-2xl flex items-center justify-center mb-6`}>
             <div className="flex gap-2">
               <div className="w-2 h-2 bg-white rounded-full"></div>
               <div className="w-2 h-2 bg-white rounded-full"></div>
             </div>
          </div>
          <div className="text-center">
            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${stats.rank.bg} ${stats.rank.color} mb-2 inline-block`}>
              {stats.rank.name}
            </span>
            <h2 className="text-6xl font-black tracking-tighter">{stats.percent}%</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Today's Achievement</p>
          </div>
        </section>

        {/* Tasks Section */}
        <div className="space-y-6">
          {["morning", "afternoon", "night"].map(time => (
            <div key={time} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
              <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">{time}</h3>
              <div className="space-y-3">
                {tasks[time]?.map((task, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleCheck(time + task)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checks[time + task] ? 'bg-emerald-500 border-emerald-500' : 'border-white/10'}`}
                    >
                      {checks[time + task] && <span className="text-xs">✓</span>}
                    </button>
                    <span className={`text-sm font-bold ${checks[time + task] ? 'opacity-30 line-through' : ''}`}>
                      {task}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input 
                  value={inputTask[time]} 
                  onChange={(e) => setInputTask({ ...inputTask, [time]: e.target.value })}
                  placeholder="Task..."
                  className="flex-1 bg-black/20 rounded-xl px-4 py-2 text-sm outline-none border border-white/5 focus:border-white/20"
                />
                <button 
                  onClick={() => addTask(time)}
                  className="bg-white text-black px-4 rounded-xl font-black text-[10px]"
                >
                  ADD
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Graph Section */}
        <div className="mt-6 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <Line type="monotone" dataKey="percent" stroke="#3b82f6" strokeWidth={4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>

      {/* Settings Modal (簡易実装) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-gray-900 w-full max-w-xs rounded-[3rem] p-8 border border-white/10">
            <div className="flex justify-between mb-8">
              <h2 className="font-black italic">SETTINGS</h2>
              <button onClick={() => setIsMenuOpen(false)}>✕</button>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs"
            >
              LOGOUT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
