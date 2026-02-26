"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDNkvB6F_niXtk3SmmgTVm1wK418Fq7t9Q",
  authDomain: "routine-app-94afe.firebaseapp.com",
  projectId: "routine-app-94afe",
  storageBucket: "routine-app-94afe.firebasestorage.app",
  messagingSenderId: "1091003523795",
  appId: "1:1091003523795:web:2d8720af00587551e02a26"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

const CHARACTERS = [
  { id: "blob", name: "ぷるぷる", color: "bg-blue-500", suffix: "だね！" },
  { id: "fluff", name: "もふもふ", color: "bg-orange-400", suffix: "ですよぉ" },
  { id: "spark", name: "ぴかぴか", color: "bg-yellow-400", suffix: "だよっ☆" }
];

export default function Home() {
  const [tasks, setTasks] = useState({ morning: [], afternoon: [], night: [] });
  const [checks, setChecks] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalTasks = tasks.morning.length + tasks.afternoon.length + tasks.night.length;
  const completedTasks = Object.values(checks).filter(Boolean).length;
  const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black">LOADING...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-black text-white mb-8 italic">ROUTINE MASTER</h1>
        <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-10 py-4 rounded-full font-black shadow-2xl active:scale-95 transition-all">
          GOOGLE LOGIN
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center py-4">
          <h1 className="text-xl font-black italic text-blue-400">ROUTINE MASTER</h1>
          <button onClick={() => signOut(auth)} className="text-[10px] bg-white/10 px-3 py-1 rounded-full">LOGOUT</button>
        </header>

        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 mb-6 flex flex-col items-center shadow-2xl">
           <div className="bg-white text-black text-xs font-black p-3 rounded-2xl mb-6 relative">
             {percent === 100 ? "完璧！" : "一緒に頑張ろう！"}{CHARACTERS[charIndex].suffix}
             <div className="absolute left-1/2 -bottom-2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-t-white border-l-transparent border-r-transparent -translate-x-1/2"></div>
           </div>
           <div className={`w-24 h-24 rounded-full ${CHARACTERS[charIndex].color} shadow-xl flex items-center justify-center animate-bounce`}>
              <div className="flex gap-4">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
           </div>
           <div className="mt-6 text-3xl font-black">{percent}%</div>
        </div>

        {["morning", "afternoon", "night"].map(time => (
          <div key={time} className="bg-white/5 p-6 rounded-[2rem] mb-4 border border-white/10">
            <h2 className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">{time}</h2>
            <div className="space-y-3">
              {tasks[time].map((task, i) => (
                <div key={i} className="flex items-center gap-3">
                  <button 
                    onClick={() => setChecks(prev => ({ ...prev, [time + i]: !prev[time + i] }))}
                    className={`w-6 h-6 rounded-lg border-2 border-white/10 ${checks[time + i] ? "bg-emerald-500 border-none" : ""}`}
                  >
                    {checks[time + i] && "✓"}
                  </button>
                  <span className={checks[time + i] ? "opacity-30 line-through" : ""}>{task}</span>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <input 
                  id={`input-${time}`}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none" 
                  placeholder="タスクを追加..." 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      setTasks({...tasks, [time]: [...tasks[time], e.target.value]});
                      e.target.value = "";
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
