"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { initializeApp } from "firebase/app";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const CHARACTERS = [
  { id: "blob", name: "ぷるぷる", color: "bg-blue-500", suffix: "だね！", accent: "from-blue-400 to-blue-600", personality: "standard" },
  { id: "fluff", name: "もふもふ", color: "bg-orange-400", suffix: "ですよぉ", accent: "from-orange-300 to-orange-500", personality: "gentle" },
  { id: "spark", name: "ぴかぴか", color: "bg-yellow-400", suffix: "だよっ☆", accent: "from-yellow-300 to-yellow-500", personality: "energetic" },
  { id: "fire", name: "メラメラ", color: "bg-red-500", suffix: "だぜッ！", accent: "from-red-400 to-red-600", personality: "hot" },
  { id: "cool", name: "しっとり", color: "bg-indigo-600", suffix: "ですね。", accent: "from-indigo-500 to-indigo-700", personality: "cool" },
  { id: "ghost", name: "ふわふわ", color: "bg-purple-400", suffix: "なの…？", accent: "from-purple-300 to-purple-500", personality: "mysterious" }
];

const RANK_LIST = [
  { name: "LEGEND", min: 100, color: "text-yellow-400", bg: "bg-yellow-400/20", desc: "完璧. 神の領域." },
  { name: "PLATINUM", min: 80, color: "text-blue-300", bg: "bg-blue-300/20", desc: "超一流. 尊敬の的." },
  { name: "GOLD", min: 50, color: "text-yellow-600", bg: "bg-yellow-600/20", desc: "安定. 習慣の達人." },
  { name: "SILVER", min: 20, color: "text-gray-400", bg: "bg-gray-400/20", desc: "見習い. 一歩ずつ前へ." },
  { name: "BEGINNER", min: 0, color: "text-gray-500", bg: "bg-gray-500/10", desc: "挑戦者. ここから始まる." }
];

const THEMES = [
  { name: "漆黒", color: "#030712", bg: "bg-gray-950", accent: "from-blue-400 to-emerald-400" },
  { name: "深夜", color: "#0f172a", bg: "bg-slate-900", accent: "from-indigo-400 to-cyan-400" },
  { name: "深森", color: "#064e3b", bg: "bg-emerald-950", accent: "from-green-400 to-yellow-200" },
  { name: "紫紅", color: "#2e1065", bg: "bg-neutral-950", accent: "from-purple-500 to-pink-400" },
  { name: "紅蓮", color: "#450a0a", bg: "bg-red-950", accent: "from-orange-500 to-red-400" },
  { name: "深海", color: "#1e1b4b", bg: "bg-indigo-950", accent: "from-blue-600 to-blue-300" },
  { name: "桜", color: "#500724", bg: "bg-rose-950", accent: "from-pink-400 to-rose-300" },
  { name: "黄金", color: "#422006", bg: "bg-yellow-950", accent: "from-yellow-500 to-amber-200" },
  { name: "白銀", color: "#1f2937", bg: "bg-gray-900", accent: "from-gray-300 to-slate-100" },
  { name: "空", color: "#0c4a6e", bg: "bg-sky-950", accent: "from-sky-400 to-blue-200" },
  { name: "毒", color: "#3b0764", bg: "bg-violet-950", accent: "from-purple-400 to-fuchsia-300" },
  { name: "灰", color: "#18181b", bg: "bg-zinc-950", accent: "from-zinc-400 to-zinc-200" }
];

export default function Home() {
  const today = new Date().toISOString().split('T')[0];
  
  const [activeTab, setActiveTab] = useState("main"); // "main" or "social"
  const [tasks, setTasks] = useState({ morning: [], afternoon: [], night: [] });
  const [checks, setChecks] = useState({});
  const [history, setHistory] = useState([]);
  const [newTasks, setNewTasks] = useState({ morning: "", afternoon: "", night: "" });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeIndex, setThemeIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState("");
  const [friendsList, setFriendsList] = useState([]);
  const [friendsData, setFriendsData] = useState([]);

  // --- Timer ---
  const [timeLeft, setTimeLeft] = useState(1500);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef(null);

  const totalTasks = tasks.morning.length + tasks.afternoon.length + tasks.night.length;
  const completedTasks = Object.values(checks).filter(Boolean).length;
  const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const currentRank = RANK_LIST.find(r => percent >= r.min) || RANK_LIST[4];
  const myDisplayId = user ? user.uid.substring(0, 8) : "";
  const currentChar = CHARACTERS[charIndex];

  const chartData = useMemo(() => {
    return history.slice(-7).map(h => ({
      ...h,
      displayDate: h.date.split('-').slice(1).join('/')
    }));
  }, [history]);

  const setTimerMinutes = (m) => {
    setIsTimerActive(false);
    setTimeLeft(m * 60);
  };

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
      alert("時間ですよ！");
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerActive, timeLeft]);

  // --- Auth & Data ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, "users", u.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data();
          if (d.tasks) setTasks(d.tasks);
          if (d.history) setHistory(d.history);
          if (d.friends) setFriendsList(d.friends);
          setThemeIndex(d.themeIndex || 0);
          setCharIndex(d.charIndex || 0);
          if (d.lastCheckDate === today) setChecks(d.checks || {});
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [today]);

  // --- Real-time Friends Data Fetch ---
  useEffect(() => {
    if (!user || friendsList.length === 0) {
      setFriendsData([]);
      return;
    }
    const q = query(collection(db, "users"), where("shortId", "in", friendsList));
    const unsub = onSnapshot(q, (s) => {
      setFriendsData(s.docs.map(d => d.data()));
    });
    return () => unsub();
  }, [friendsList, user]);

  const saveProgress = async () => {
    if (!user) return;
    const newHistory = [...history.filter(h => h.date !== today), { date: today, percent }];
    
    // セクションごとの達成率もフレンド用に保存
    const sectionStats = {
      morning: tasks.morning.length === 0 ? 0 : Math.round((tasks.morning.filter(t => checks["morning" + t]).length / tasks.morning.length) * 100),
      afternoon: tasks.afternoon.length === 0 ? 0 : Math.round((tasks.afternoon.filter(t => checks["afternoon" + t]).length / tasks.afternoon.length) * 100),
      night: tasks.night.length === 0 ? 0 : Math.round((tasks.night.filter(t => checks["night" + t]).length / tasks.night.length) * 100)
    };

    await setDoc(doc(db, "users", user.uid), { 
      tasks, checks, lastCheckDate: today, history: newHistory, 
      displayName: user.displayName, shortId: myDisplayId,
      rank: currentRank.name, percent, friends: friendsList,
      sectionStats,
      themeIndex, charIndex, lastActive: Date.now()
    }, { merge: true });
    alert("保存しました！");
  };

  const addFriend = async () => {
    if (!friendIdInput || friendIdInput === myDisplayId) return;
    if (friendsList.includes(friendIdInput)) {
      alert("すでに追加されています");
      return;
    }
    const q = query(collection(db, "users"), where("shortId", "==", friendIdInput));
    onSnapshot(q, (s) => {
      if (s.empty) {
        alert("ユーザーが見つかりません。相手が一度保存(Save)しているか確認してください。");
      } else {
        const newList = [...friendsList, friendIdInput];
        setFriendsList(newList);
        setFriendIdInput("");
        alert("フレンドを追加しました！");
      }
    }, {onlyOnce: true});
  };

  const currentTheme = THEMES[themeIndex];

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black animate-pulse">LOADING...</div>;

  if (!user) return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center px-6 text-center transition-all duration-700 ${currentTheme.bg}`}>
       <div className="w-full max-w-sm flex flex-col items-center">
         <h1 className={`text-4xl sm:text-5xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent} leading-tight`}>
           ROUTINE<br className="sm:hidden" /> MASTER
         </h1>
         <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="mt-10 w-full sm:w-auto bg-white text-black px-12 py-5 rounded-full font-black shadow-2xl transition-all active:scale-95 text-sm tracking-widest">GOOGLE LOGIN</button>
       </div>
    </div>
  );

  return (
    <div className={`min-h-screen text-white p-4 transition-all duration-700 ${currentTheme.bg}`}>
      <style jsx global>{`
        @keyframes bounce-rich { 0%, 100% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-12px) scale(0.97, 1.03); } }
        @keyframes blink-rich { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes float-rich { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .animate-bounce-rich { animation: bounce-rich 2.5s infinite ease-in-out; }
        .animate-blink-rich { animation: blink-rich 5s infinite; }
        .animate-float-rich { animation: float-rich 3s infinite ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="max-w-xl mx-auto pb-24">
        <header className="flex justify-between items-center py-4 mb-4">
          <h1 className={`text-xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent}`}>ROUTINE MASTER</h1>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-lg active:scale-90 transition-all">⚙️</button>
        </header>

        {/* --- Tab Switcher --- */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-6 mx-auto w-fit">
          <button onClick={() => setActiveTab("main")} className={`px-8 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === "main" ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"}`}>MAIN</button>
          <button onClick={() => setActiveTab("social")} className={`px-8 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === "social" ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"}`}>SOCIAL</button>
        </div>

        {activeTab === "main" ? (
          <>
            {/* --- Timer & Character Hero --- */}
            <div className="bg-white/5 p-6 sm:p-8 rounded-[3.5rem] border border-white/10 mb-6 flex flex-col items-center relative overflow-hidden shadow-2xl">
              <div className="w-full flex flex-col items-center mb-6 bg-black/20 p-4 rounded-[2.5rem] border border-white/5">
                  <div className="flex gap-2 mb-3">
                    {[5, 15, 25, 45].map(m => (
                      <button key={m} onClick={() => setTimerMinutes(m)} className="text-[10px] font-black border border-white/10 px-3 py-1 rounded-full hover:bg-white hover:text-black transition-all">
                        {m === 5 ? "5m⚡" : `${m}m`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-4xl font-mono font-black tabular-nums tracking-tighter">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
                    <button onClick={() => setIsTimerActive(!isTimerActive)} className={`px-6 py-2 text-[10px] font-black rounded-full uppercase transition-all ${isTimerActive ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-white text-black"}`}>
                      {isTimerActive ? "STOP" : "START"}
                    </button>
                  </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white text-black text-[11px] font-black p-3 rounded-2xl mb-6 animate-float-rich relative shadow-xl">
                    {percent === 100 ? "完璧すぎるよ！" : (percent > 80 ? "あとちょっとだね！" : "一緒にやろう！")}{currentChar.suffix}
                    <div className="absolute left-1/2 -bottom-2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-t-white border-l-transparent border-r-transparent -translate-x-1/2"></div>
                </div>
                <div className={`w-32 h-32 rounded-full ${currentChar.color} shadow-[0_25px_60px_rgba(0,0,0,0.4)] flex items-center justify-center animate-bounce-rich relative`}>
                    <div className="flex gap-6 animate-blink-rich">
                      <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div>
                      <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div>
                    </div>
                </div>
              </div>
            </div>

            {/* --- Stats & Graph --- */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 text-center flex flex-col justify-center items-center shadow-lg">
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${currentRank.bg} ${currentRank.color} mb-2 border border-current`}>{currentRank.name}</span>
                <div className="text-4xl font-black mt-1 tracking-tighter">{percent}%</div>
              </div>
              <div className="bg-white/5 p-3 rounded-[2.5rem] border border-white/10 h-32 overflow-hidden shadow-lg">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 8, fill: '#666', fontWeight: 'bold'}} />
                    <Line type="monotone" dataKey="percent" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* --- Friends Activity (Mini List) --- */}
            {friendsData.length > 0 && (
              <div className="bg-white/5 p-6 rounded-[2.5rem] mb-6 border border-white/10 shadow-xl overflow-hidden">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-5 tracking-[0.3em] text-center">Friends Quick View</p>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {friendsData.map((f, i) => {
                    const fChar = CHARACTERS[f.charIndex || 0];
                    return (
                      <div key={i} className="flex flex-col items-center min-w-[80px] bg-white/5 p-4 rounded-3xl border border-white/5">
                        <div className={`w-10 h-10 rounded-full ${fChar.color} mb-2 shadow-lg flex items-center justify-center`}>
                          <div className="flex gap-2"><div className="w-1 h-1 bg-white rounded-full"></div><div className="w-1 h-1 bg-white rounded-full"></div></div>
                        </div>
                        <p className="text-[10px] font-black truncate w-full text-center mb-1">{f.displayName?.split(' ')[0]}</p>
                        <p className={`text-[8px] font-black ${RANK_LIST.find(r => r.name === f.rank)?.color}`}>{f.percent}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- Task Lists --- */}
            {["morning", "afternoon", "night"].map(time => (
              <div key={time} className="bg-white/5 p-6 rounded-[2.5rem] mb-6 border border-white/10 shadow-xl group relative">
                <h2 className="text-[10px] font-black text-gray-500 uppercase mb-5 tracking-[0.3em] text-center opacity-40">{time}</h2>
                <div className="space-y-4">
                  {tasks[time].map((task, index) => (
                    <div key={index} className="flex items-center group/item transition-all hover:translate-x-1">
                      <button onClick={() => setChecks(prev => ({ ...prev, [time + task]: !prev[time + task] }))} className={`w-6 h-6 mr-3 rounded-lg border-2 border-white/10 flex items-center justify-center transition-all ${checks[time + task] ? "bg-emerald-500 border-none scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-black/20"}`}>
                        {checks[time + task] && <span className="text-[10px] font-black">✓</span>}
                      </button>
                      <span className={`flex-1 text-sm font-bold transition-all ${checks[time + task] ? 'opacity-20 line-through' : 'text-gray-200'}`}>
                        {task.startsWith('!') ? <span className="text-orange-400">🌟 {task.substring(1)}</span> : task}
                      </span>
                      <button onClick={() => { const nl = [...tasks[time]]; nl.splice(index,1); setTasks({...tasks, [time]: nl}); }} className="opacity-0 group-hover/item:opacity-100 text-red-500 transition-all p-2 text-sm">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex mt-6 gap-2">
                  <button onClick={() => { const val = newTasks[time] || ""; setNewTasks({ ...newTasks, [time]: val.startsWith("!") ? val.substring(1) : "!" + val }); }} className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all shadow-lg ${newTasks[time]?.startsWith("!") ? "bg-orange-500 border-orange-300 scale-105" : "bg-white/5 border-white/10 opacity-40"}`}>🌟</button>
                  <input value={newTasks[time]} onChange={(e) => setNewTasks({ ...newTasks, [time]: e.target.value })} className="flex-1 bg-black/40 text-xs p-3 rounded-xl border border-white/5 outline-none focus:border-white/20 transition-all" placeholder="新しいタスク..." />
                  <button onClick={() => { if (!newTasks[time]) return; setTasks({...tasks, [time]: [...tasks[time], newTasks[time]]}); setNewTasks({...newTasks, [time]: ""}); }} className="bg-white text-black px-5 rounded-xl font-black text-[10px] shadow-lg active:scale-90">ADD</button>
                </div>
              </div>
            ))}
            <button onClick={saveProgress} className={`w-full py-5 bg-gradient-to-r ${currentTheme.accent} text-gray-950 rounded-[2.5rem] font-black shadow-2xl active:scale-95 transition-all uppercase tracking-[0.2em] text-sm mt-4`}>Save Progress</button>
          </>
        ) : (
          /* --- SOCIAL TAB CONTENT --- */
          <div className="space-y-6">
            {friendsData.length === 0 ? (
              <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10 text-center">
                <p className="text-gray-500 font-bold text-sm">フレンドがまだいません。<br/>設定からIDで友達を追加しよう！</p>
              </div>
            ) : (
              friendsData.map((f, i) => {
                const fChar = CHARACTERS[f.charIndex || 0];
                const fRank = RANK_LIST.find(r => r.name === f.rank) || RANK_LIST[4];
                return (
                  <div key={i} className="bg-white/5 p-6 rounded-[3rem] border border-white/10 shadow-xl transition-all hover:border-white/20">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-16 h-16 rounded-full ${fChar.color} shadow-lg flex items-center justify-center animate-bounce-rich`}>
                        <div className="flex gap-2"><div className="w-1.5 h-1.5 bg-white rounded-full"></div><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-black tracking-tight">{f.displayName}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${fRank.bg} ${fRank.color}`}>{f.rank}</span>
                          <span className="text-xl font-black tracking-tighter">{f.percent}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detailed Progress Bars */}
                    <div className="space-y-3 bg-black/20 p-5 rounded-3xl">
                      {[
                        { label: "Morning", val: f.sectionStats?.morning || 0, color: "bg-blue-400" },
                        { label: "Afternoon", val: f.sectionStats?.afternoon || 0, color: "bg-orange-400" },
                        { label: "Night", val: f.sectionStats?.night || 0, color: "bg-indigo-400" }
                      ].map((sec, si) => (
                        <div key={si}>
                          <div className="flex justify-between text-[8px] font-black uppercase mb-1 opacity-50">
                            <span>{sec.label}</span>
                            <span>{sec.val}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${sec.color} transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.2)]`} style={{ width: `${sec.val}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-[8px] text-gray-500 font-black mt-4 text-center uppercase tracking-widest italic leading-relaxed">
                      " {fRank.desc} "
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* --- Settings Menu --- */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)}></div>
          <div className={`relative w-full max-w-sm p-8 rounded-[3.5rem] ${currentTheme.bg} border border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide`}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-black italic tracking-widest text-gray-500">SETTINGS</h2>
              <button onClick={() => setIsMenuOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-xl hover:bg-white/10 transition-colors">✕</button>
            </div>
            
            <div className="space-y-12 pb-10">
              <section className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">My Routine ID</p>
                <p className="text-2xl font-mono font-black tracking-widest text-white mb-2">{myDisplayId}</p>
                <p className="text-[8px] text-gray-500">このIDを友達に教えてね！</p>
              </section>

              <section>
                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Add Friend</p>
                <div className="flex gap-2">
                  <input value={friendIdInput} onChange={(e) => setFriendIdInput(e.target.value.substring(0,8))} className="flex-1 bg-black/40 text-sm p-3 rounded-xl border border-white/5 outline-none focus:border-white/20" placeholder="友達のIDを入力..." />
                  <button onClick={addFriend} className="bg-white text-black px-4 rounded-xl font-black text-[10px]">ADD</button>
                </div>
              </section>

              <section>
                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Character Select</p>
                <div className="grid grid-cols-2 gap-3">
                  {CHARACTERS.map((c, i) => (
                    <button key={i} onClick={() => setCharIndex(i)} className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center ${charIndex === i ? 'border-white bg-white/10' : 'border-transparent opacity-30 hover:opacity-60'}`}>
                      <div className={`w-10 h-10 rounded-full ${c.color} mb-3 shadow-lg`}></div>
                      <p className="text-[10px] font-black mb-1">{c.name}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Rank System</p>
                <div className="space-y-2.5">
                  {RANK_LIST.map((r, i) => (
                    <div key={i} className={`p-4 rounded-[1.5rem] border transition-all ${percent >= r.min ? 'bg-white/10 border-white/20 shadow-lg' : 'border-white/5 opacity-20'}`}>
                      <div className="flex justify-between font-black text-[10px] mb-1.5"><span className={r.color}>● {r.name}</span><span className="opacity-50">{r.min}%+</span></div>
                      <p className="text-[9px] text-gray-400 font-bold italic">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <button onClick={() => signOut(auth)} className="w-full py-4 bg-red-500/10 text-red-500 rounded-[1.5rem] font-black text-xs border border-red-500/20 active:bg-red-500 active:text-white transition-all">LOGOUT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
