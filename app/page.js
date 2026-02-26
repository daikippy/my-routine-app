"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, where, updateDoc, arrayUnion, writeBatch } from "firebase/firestore";
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
  { id: "blob", name: "ぷるぷる", color: "bg-blue-500", suffix: "だね！", accent: "from-blue-400 to-blue-600" },
  { id: "fluff", name: "もふもふ", color: "bg-orange-400", suffix: "ですよぉ", accent: "from-orange-300 to-orange-500" },
  { id: "spark", name: "ぴかぴか", color: "bg-yellow-400", suffix: "だよっ☆", accent: "from-yellow-300 to-yellow-500" },
  { id: "fire", name: "メラメラ", color: "bg-red-500", suffix: "だぜッ！", accent: "from-red-400 to-red-600" },
  { id: "cool", name: "しっとり", color: "bg-indigo-600", suffix: "ですね。", accent: "from-indigo-500 to-indigo-700" },
  { id: "ghost", name: "ふわふわ", color: "bg-purple-400", suffix: "なの…？", accent: "from-purple-300 to-purple-500" }
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
  const [activeTab, setActiveTab] = useState("main"); 
  const [socialSubTab, setSocialSubTab] = useState("list");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  const [userMessages, setUserMessages] = useState([]);
  const [incomingMsg, setIncomingMsg] = useState(null);

  const [timeLeft, setTimeLeft] = useState(1500);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef(null);

  const totalTasks = tasks.morning.length + tasks.afternoon.length + tasks.night.length;
  const completedTasks = Object.values(checks).filter(Boolean).length;
  const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const currentRank = RANK_LIST.find(r => percent >= r.min) || RANK_LIST[4];
  const myDisplayId = user ? user.uid.substring(0, 8) : "";
  const currentChar = CHARACTERS[charIndex];
  const currentTheme = THEMES[themeIndex];

  const chartData = useMemo(() => history.slice(-7).map(h => ({ ...h, displayDate: h.date.split('-').slice(1).join('/') })), [history]);

  const calendarDays = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const days = [];
    for (let i = 0; i < start.getDay(); i++) days.push(null);
    for (let i = 1; i <= end.getDate(); i++) {
      const dStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const record = history.find(h => h.date === dStr);
      days.push({ day: i, date: dStr, percent: record ? record.percent : null });
    }
    return days;
  }, [history]);

  // --- 既読処理 ---
  useEffect(() => {
    if (activeTab === "social" && socialSubTab === "msgs" && user) {
      const hasUnread = userMessages.some(m => !m.read);
      if (hasUnread) {
        const updatedMsgs = userMessages.map(m => ({ ...m, read: true }));
        updateDoc(doc(db, "users", user.uid), { messageHistory: updatedMsgs });
      }
    }
  }, [activeTab, socialSubTab, userMessages, user]);

  // --- Auto Save ---
  const saveToFirebase = async (updatedData = {}) => {
    if (!user) return;
    const currentTasks = updatedData.tasks || tasks;
    const currentChecks = updatedData.checks || checks;
    const currentHistory = updatedData.history || history;
    const currentThemeIdx = updatedData.themeIndex !== undefined ? updatedData.themeIndex : themeIndex;
    const currentCharIdx = updatedData.charIndex !== undefined ? updatedData.charIndex : charIndex;
    const currentFriendsList = updatedData.friendsList || friendsList;

    const comp = Object.values(currentChecks).filter(Boolean).length;
    const total = currentTasks.morning.length + currentTasks.afternoon.length + currentTasks.night.length;
    const newPercent = total === 0 ? 0 : Math.round((comp / total) * 100);
    const newRank = RANK_LIST.find(r => newPercent >= r.min)?.name || "BEGINNER";
    const nextHistory = [...currentHistory.filter(h => h.date !== today), { date: today, percent: newPercent }];

    const sectionStats = {
      morning: currentTasks.morning.length === 0 ? 0 : Math.round((currentTasks.morning.filter(t => currentChecks["morning" + t]).length / currentTasks.morning.length) * 100),
      afternoon: currentTasks.afternoon.length === 0 ? 0 : Math.round((currentTasks.afternoon.filter(t => currentChecks["afternoon" + t]).length / currentTasks.afternoon.length) * 100),
      night: currentTasks.night.length === 0 ? 0 : Math.round((currentTasks.night.filter(t => currentChecks["night" + t]).length / currentTasks.night.length) * 100)
    };

    await setDoc(doc(db, "users", user.uid), { 
      uid: user.uid, tasks: currentTasks, checks: currentChecks, lastCheckDate: today, 
      history: nextHistory, displayName: user.displayName, shortId: myDisplayId,
      rank: newRank, percent: newPercent, friends: currentFriendsList,
      sectionStats, themeIndex: currentThemeIdx, charIndex: currentCharIdx, lastActive: Date.now()
    }, { merge: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, "users", u.uid);
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setTasks(d.tasks || { morning: [], afternoon: [], night: [] });
            setHistory(d.history || []);
            setFriendsList(d.friends || []);
            setThemeIndex(d.themeIndex || 0);
            setCharIndex(d.charIndex || 0);
            setUserMessages(d.messageHistory || []);
            if (d.lastCheckDate === today) setChecks(d.checks || {});
            if (d.message) {
              setIncomingMsg(d.message);
              setTimeout(() => updateDoc(docRef, { message: null }), 5000);
            }
          }
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [today]);

  useEffect(() => {
    if (!user || friendsList.length === 0) { setFriendsData([]); return; }
    const q = query(collection(db, "users"), where("shortId", "in", friendsList));
    const unsub = onSnapshot(q, (s) => setFriendsData(s.docs.map(d => d.data())));
    return () => unsub();
  }, [friendsList, user]);

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
      alert("時間ですよ！");
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerActive, timeLeft]);

  // --- Handlers ---
  const toggleCheck = (id) => {
    const nextChecks = { ...checks, [id]: !checks[id] };
    setChecks(nextChecks);
    saveToFirebase({ checks: nextChecks });
  };

  const addTask = (time) => {
    if (!newTasks[time]) return;
    const nextTasks = {...tasks, [time]: [...tasks[time], newTasks[time]]};
    setTasks(nextTasks);
    setNewTasks({...newTasks, [time]: ""});
    saveToFirebase({ tasks: nextTasks });
  };

  const removeTask = (time, index) => {
    const nl = [...tasks[time]];
    nl.splice(index, 1);
    const nextTasks = {...tasks, [time]: nl};
    setTasks(nextTasks);
    saveToFirebase({ tasks: nextTasks });
  };

  const addFriend = async () => {
    if (!friendIdInput || friendIdInput === myDisplayId) return;
    if (friendsList.includes(friendIdInput)) { alert("すでに追加されています"); return; }
    
    const q = query(collection(db, "users"), where("shortId", "==", friendIdInput));
    const snap = await getDoc(doc(db, "users", "dummy")); // Trigger for query
    
    onSnapshot(q, async (s) => {
      if (s.empty) {
        alert("ユーザーが見つかりません");
      } else {
        const targetUserDoc = s.docs[0];
        const targetUid = targetUserDoc.id;

        const nextList = [...friendsList, friendIdInput];
        setFriendsList(nextList);
        saveToFirebase({ friendsList: nextList });

        await updateDoc(doc(db, "users", targetUid), {
          friends: arrayUnion(myDisplayId)
        });

        setFriendIdInput("");
        alert("フレンドを相互登録しました！");
      }
    }, {onlyOnce: true});
  };

  const removeFriend = async (fid) => {
    if (!window.confirm("フレンドを削除しますか？")) return;
    const nextList = friendsList.filter(id => id !== fid);
    setFriendsList(nextList);
    saveToFirebase({ friendsList: nextList });
  };

  const sendMessage = async (targetUid, name) => {
    const msgText = window.prompt(`${name}さんへメッセージを送る`, "今日も頑張ろう！");
    if (msgText) {
      const msgObj = {
        id: Date.now() + Math.random(),
        from: user.displayName,
        text: msgText,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        read: false
      };
      
      const targetRef = doc(db, "users", targetUid);
      await updateDoc(targetRef, {
        message: msgObj,
        messageHistory: arrayUnion(msgObj)
      });
      alert("送信しました！");
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black animate-pulse">LOADING...</div>;

  if (!user) return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center px-6 transition-all ${currentTheme.bg}`}>
       <h1 className={`text-5xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent}`}>ROUTINE MASTER</h1>
       <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="mt-10 bg-white text-black px-12 py-5 rounded-full font-black shadow-2xl active:scale-95 text-sm tracking-widest uppercase">Start Journey</button>
    </div>
  );

  return (
    <div className={`min-h-screen text-white transition-all duration-700 ${currentTheme.bg} flex overflow-hidden font-sans`}>
      <style jsx global>{`
        @keyframes bounce-rich { 0%, 100% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-15px) scale(0.95, 1.05); } }
        @keyframes blink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes mouth { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.2) scaleY(0.8); } }
        @keyframes slideIn { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-bounce-rich { animation: bounce-rich 2s infinite ease-in-out; }
        .animate-blink { animation: blink 4s infinite; }
        .animate-mouth { animation: mouth 3s infinite ease-in-out; }
        .animate-slideIn { animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {/* --- Sidebar --- */}
      <div className={`fixed inset-0 z-40 transition-opacity duration-500 ${isSidebarOpen ? "bg-black/60 backdrop-blur-sm opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`fixed left-0 top-0 h-full w-80 z-50 transition-transform duration-500 bg-black/40 backdrop-blur-2xl border-r border-white/10 p-6 flex flex-col ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex justify-between items-center mb-10"><p className="text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase">Archive</p><button onClick={() => setIsSidebarOpen(false)} className="text-xl">✕</button></div>
        <section className="bg-white/5 p-4 rounded-[2rem] border border-white/10 mb-8 text-center">
          <p className="text-[10px] font-black mb-4 opacity-50 uppercase tracking-widest">{new Date().toLocaleString('default', { month: 'long' })}</p>
          <div className="grid grid-cols-7 gap-1 mb-2">{['S','M','T','W','T','F','S'].map(d => <span key={d} className="text-[8px] font-black text-gray-600">{d}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => (
              <div key={i} className="aspect-square flex items-center justify-center relative">
                {d && <><div className={`w-full h-full rounded-lg ${d.percent === null ? 'bg-white/5' : d.percent >= 100 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : `bg-blue-500/${Math.max(10, d.percent)}`}`}></div><span className="absolute inset-0 flex items-center justify-center text-[8px] font-black">{d.day}</span></>}
              </div>
            ))}
          </div>
        </section>
        <section className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent History</p>
          {history.slice(-10).reverse().map((h, i) => (
            <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5"><span className="text-xs font-bold text-gray-400">{h.date}</span><span className="text-xs font-black">{h.percent}%</span></div>
          ))}
        </section>
      </aside>

      {/* --- Main --- */}
      <main className="flex-1 overflow-y-auto h-screen scrollbar-hide p-4 relative">
        {/* 通知トースト */}
        {incomingMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-white text-black p-4 rounded-3xl shadow-2xl animate-slideIn flex items-center gap-4">
            <div className="text-2xl">📩</div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black opacity-50">{incomingMsg.from}からのメッセージ</p>
              <p className="text-sm font-bold truncate">{incomingMsg.text}</p>
            </div>
          </div>
        )}

        <div className="max-w-xl mx-auto pb-24">
          <header className="flex justify-between items-center py-4 mb-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-lg active:scale-90">☰</button>
            <h1 className={`text-xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent}`}>ROUTINE MASTER</h1>
            <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-lg active:scale-90">⚙️</button>
          </header>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-6 mx-auto w-fit">
            <button onClick={() => setActiveTab("main")} className={`px-8 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === "main" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}>MAIN</button>
            <button onClick={() => setActiveTab("social")} className={`px-8 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === "social" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}>SOCIAL</button>
          </div>

          {activeTab === "main" ? (
            <>
              {/* Hero */}
              <div className="bg-white/5 p-6 sm:p-8 rounded-[3.5rem] border border-white/10 mb-6 flex flex-col items-center relative shadow-2xl">
                <div className="w-full flex flex-col items-center mb-8 bg-black/20 p-4 rounded-[2.5rem] border border-white/5">
                    <div className="flex gap-2 mb-3">
                      {[5, 15, 25, 45].map(m => <button key={m} onClick={() => { setIsTimerActive(false); setTimeLeft(m*60); }} className="text-[10px] font-black border border-white/10 px-3 py-1 rounded-full hover:bg-white hover:text-black transition-all">{m}m</button>)}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-4xl font-mono font-black tabular-nums">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
                      <button onClick={() => setIsTimerActive(!isTimerActive)} className={`px-6 py-2 text-[10px] font-black rounded-full transition-all ${isTimerActive ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-white text-black"}`}>{isTimerActive ? "STOP" : "START"}</button>
                    </div>
                </div>
                <div className="relative mb-6">
                  <div className={`w-32 h-32 rounded-full ${currentChar.color} shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center animate-bounce-rich relative overflow-hidden`}>
                      <div className="flex gap-7 mb-2 animate-blink">
                        <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black rounded-full"></div></div>
                        <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black rounded-full"></div></div>
                      </div>
                      <div className={`w-4 h-2 bg-black/20 rounded-full animate-mouth ${percent > 50 ? 'h-3 rounded-b-full bg-white/30' : ''}`}></div>
                  </div>
                </div>
                <p className="mt-4 text-[11px] font-black bg-white text-black px-5 py-2.5 rounded-2xl shadow-xl">{percent}%達成{currentChar.suffix}</p>
              </div>

              {/* Stats & Graph */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 text-center flex flex-col justify-center items-center shadow-lg">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${currentRank.bg} ${currentRank.color} mb-2`}>{currentRank.name}</span>
                  <div className="text-4xl font-black mt-1 tracking-tighter">{percent}%</div>
                </div>
                <div className="bg-white/5 p-3 rounded-[2.5rem] border border-white/10 h-32 overflow-hidden shadow-lg">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="displayDate" stroke="#444" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Line type="monotone" dataKey="percent" stroke="#3b82f6" strokeWidth={4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tasks */}
              {["morning", "afternoon", "night"].map(time => (
                <div key={time} className="bg-white/5 p-6 rounded-[2.5rem] mb-6 border border-white/10 shadow-xl group">
                  <h2 className="text-[10px] font-black text-gray-500 uppercase mb-5 tracking-[0.3em] text-center opacity-40">{time}</h2>
                  <div className="space-y-4">
                    {tasks[time].map((task, index) => (
                      <div key={index} className="flex items-center group/item transition-all">
                        <button onClick={() => toggleCheck(time + task)} className={`w-6 h-6 mr-3 rounded-lg border-2 border-white/10 flex items-center justify-center transition-all ${checks[time + task] ? "bg-emerald-500 border-none shadow-lg shadow-emerald-500/30" : "bg-black/20"}`}>
                          {checks[time + task] && <span className="text-[10px] font-black">✓</span>}
                        </button>
                        <span className={`flex-1 text-sm font-bold ${checks[time + task] ? 'opacity-20 line-through' : 'text-gray-200'}`}>
                          {task.startsWith('!') ? <span className="text-orange-400 font-black">🌟 {task.substring(1)}</span> : task}
                        </span>
                        <button onClick={() => removeTask(time, index)} className="opacity-0 group-hover/item:opacity-100 text-red-500 p-2">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex mt-6 gap-2">
                    <button onClick={() => { const val = newTasks[time] || ""; setNewTasks({ ...newTasks, [time]: val.startsWith("!") ? val.substring(1) : "!" + val }); }} className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all ${newTasks[time]?.startsWith("!") ? "bg-orange-500 border-orange-300 shadow-lg" : "bg-white/5 border-white/10 opacity-40"}`}>🌟</button>
                    <input value={newTasks[time]} onChange={(e) => setNewTasks({ ...newTasks, [time]: e.target.value })} className="flex-1 bg-black/40 text-xs p-3 rounded-xl border border-white/5 outline-none" placeholder="新しいタスク..." />
                    <button onClick={() => addTask(time)} className="bg-white text-black px-5 rounded-xl font-black text-[10px] active:scale-95 transition-all">ADD</button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-8 mb-6 justify-center">
                <button onClick={() => setSocialSubTab("list")} className={`text-[11px] font-black tracking-widest transition-all ${socialSubTab === 'list' ? 'text-white border-b-2 border-white pb-1' : 'text-gray-500'}`}>FRIENDS</button>
                <button onClick={() => setSocialSubTab("msgs")} className={`text-[11px] font-black tracking-widest transition-all relative ${socialSubTab === 'msgs' ? 'text-white border-b-2 border-white pb-1' : 'text-gray-500'}`}>
                  MESSAGES
                  {userMessages.some(m => !m.read) && <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
              </div>

              {socialSubTab === "list" ? (
                friendsData.length === 0 ? <p className="text-center text-gray-500 py-20 font-bold">友達をIDで追加しよう！</p> : friendsData.map((f, i) => (
                  <div key={i} className="bg-white/5 p-6 rounded-[3rem] border border-white/10 shadow-xl relative group">
                    <button onClick={() => removeFriend(f.shortId)} className="absolute top-6 right-6 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 rounded-full ${CHARACTERS[f.charIndex || 0].color} flex items-center justify-center animate-bounce-rich shadow-lg`}><div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-white rounded-full"></div><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black">{f.displayName}</h3>
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${RANK_LIST.find(r=>r.name===f.rank)?.bg} ${RANK_LIST.find(r=>r.name===f.rank)?.color}`}>{f.rank}</span>
                        </div>
                        <div className="text-2xl font-black">{f.percent}%</div>
                      </div>
                      <button onClick={() => sendMessage(f.uid, f.displayName)} className="bg-white/10 p-3 rounded-2xl text-xl hover:bg-white hover:text-black transition-all">✉️</button>
                    </div>
                    <div className="space-y-2 bg-black/20 p-4 rounded-3xl">
                      {[{ label: "AM", val: f.sectionStats?.morning || 0 }, { label: "PM", val: f.sectionStats?.afternoon || 0 }, { label: "NG", val: f.sectionStats?.night || 0 }].map((sec, si) => (
                        <div key={si} className="flex items-center gap-3"><span className="text-[7px] font-black w-8 opacity-40">{sec.label}</span><div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-400" style={{ width: `${sec.val}%` }}></div></div></div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-4 px-2">
                  {(!userMessages || userMessages.length === 0) ? (
                    <p className="text-center text-gray-500 py-20 font-bold">メッセージはまだありません</p>
                  ) : (
                    [...userMessages].reverse().map((m, i) => (
                      <div key={i} className={`flex flex-col ${m.from === user.displayName ? 'items-end' : 'items-start'}`}>
                        <span className="text-[8px] font-black text-gray-500 mb-1 px-2 uppercase">{m.from}</span>
                        <div className="flex items-end gap-2 max-w-[85%]">
                          {m.from === user.displayName && <span className="text-[8px] text-gray-600 font-bold mb-1">{m.read ? '既読' : '未読'}</span>}
                          <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm font-bold ${m.from === user.displayName ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'}`}>
                            {m.text}
                          </div>
                          <span className="text-[8px] text-gray-600 font-bold mb-1 min-w-fit">{m.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- Settings --- */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)}></div>
          <div className={`relative w-full max-w-sm p-8 rounded-[3.5rem] ${currentTheme.bg} border border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide`}>
            <div className="flex justify-between items-center mb-10"><h2 className="text-xl font-black italic text-gray-500">SETTINGS</h2><button onClick={() => setIsMenuOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">✕</button></div>
            <div className="space-y-12">
              <section className="bg-white/5 p-8 rounded-[2.5rem] text-center border border-white/10 shadow-inner">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest">My ID</p>
                <p className="text-5xl font-black tracking-tighter text-white select-all">{myDisplayId}</p>
                <p className="text-[9px] text-gray-600 mt-3 font-bold italic">Tap to copy and share</p>
              </section>
              <section>
                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Add Friend</p>
                <div className="flex gap-2">
                  <input value={friendIdInput} onChange={(e) => setFriendIdInput(e.target.value.substring(0,8))} className="flex-1 bg-black/40 text-xs p-4 rounded-2xl border border-white/5 outline-none" placeholder="Enter ID..." />
                  <button onClick={addFriend} className="bg-white text-black px-6 rounded-2xl font-black text-[10px] active:scale-95 transition-all shadow-lg">ADD</button>
                </div>
              </section>
              <section>
                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Character</p>
                <div className="grid grid-cols-2 gap-3">
                  {CHARACTERS.map((c, i) => (
                    <button key={i} onClick={() => { setCharIndex(i); saveToFirebase({ charIndex: i }); }} className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center ${charIndex === i ? 'border-white bg-white/10 shadow-lg' : 'border-transparent opacity-30'}`}>
                      <div className={`w-8 h-8 rounded-full ${c.color} mb-2 shadow-lg`}></div>
                      <p className="text-[9px] font-black">{c.name}</p>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Theme Color</p>
                <div className="grid grid-cols-4 gap-3">
                  {THEMES.map((t, i) => <button key={i} onClick={() => { setThemeIndex(i); saveToFirebase({ themeIndex: i }); }} className={`w-10 h-10 rounded-full border-2 transition-all ${themeIndex === i ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: t.color }}></button>)}
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
