"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
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

// --- 定数 ---
const CHARACTERS = [
  { id: "blob", name: "ぷるぷる", color: "bg-blue-500", suffix: "だね！", accent: "from-blue-400 to-blue-600" },
  { id: "fluff", name: "もふもふ", color: "bg-orange-400", suffix: "ですよぉ", accent: "from-orange-300 to-orange-500" },
  { id: "spark", name: "ぴかぴか", color: "bg-yellow-400", suffix: "だよっ☆", accent: "from-yellow-300 to-yellow-500" },
  { id: "fire", name: "メラメラ", color: "bg-red-500", suffix: "だぜッ！", accent: "from-red-400 to-red-600" },
  { id: "cool", name: "しっとり", color: "bg-indigo-600", suffix: "ですね。", accent: "from-indigo-500 to-indigo-700" },
  { id: "ghost", name: "ふわふわ", color: "bg-purple-400", suffix: "なの…？", accent: "from-purple-300 to-purple-500" }
];

const RANK_LIST = [
  { name: "レジェンド", min: 100, color: "text-yellow-400", bg: "bg-yellow-400/20", desc: "完璧。神の領域。" },
  { name: "プラチナ", min: 80, color: "text-blue-300", bg: "bg-blue-300/20", desc: "超一流。尊敬の的。" },
  { name: "ゴールド", min: 50, color: "text-yellow-600", bg: "bg-yellow-600/20", desc: "安定。習慣の達人。" },
  { name: "シルバー", min: 20, color: "text-gray-400", bg: "bg-gray-400/20", desc: "見習い。一歩ずつ前へ。" },
  { name: "ビギナー", min: 0, color: "text-gray-500", bg: "bg-gray-500/10", desc: "挑戦者。ここから始まる。" }
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

  const [timeLeft, setTimeLeft] = useState(300); // 初期5分
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef(null);

  const totalTasks = tasks.morning.length + tasks.afternoon.length + tasks.night.length;
  const completedTasks = Object.values(checks).filter(Boolean).length;
  const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const currentRank = RANK_LIST.find(r => percent >= r.min) || RANK_LIST[4];
  const myDisplayId = user ? user.uid.substring(0, 8) : "";
  const currentChar = CHARACTERS[charIndex];
  const currentTheme = THEMES[themeIndex];

  const streakCount = useMemo(() => {
    let count = 0;
    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (let h of sortedHistory) {
      if (h.percent >= 80) count++;
      else break;
    }
    return count;
  }, [history]);

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

  useEffect(() => {
    if (activeTab === "social" && socialSubTab === "msgs" && user) {
      const hasUnread = userMessages.some(m => !m.read && m.from !== user.displayName);
      if (hasUnread) {
        const updatedMsgs = userMessages.map(m => (m.from !== user.displayName ? { ...m, read: true } : m));
        updateDoc(doc(db, "users", user.uid), { messageHistory: updatedMsgs });
      }
    }
  }, [activeTab, socialSubTab, userMessages, user]);

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
    const newRank = RANK_LIST.find(r => newPercent >= r.min)?.name || "ビギナー";
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
      streak: streakCount,
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
      alert("時間です！");
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerActive, timeLeft]);

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
    const q = query(collection(db, "users"), where("shortId", "==", friendIdInput));
    onSnapshot(q, async (s) => {
      if (s.empty) { alert("ユーザーが見つかりません"); } else {
        const targetUserDoc = s.docs[0];
        const targetUid = targetUserDoc.id;
        if (friendsList.includes(friendIdInput)) return;
        const nextList = [...friendsList, friendIdInput];
        setFriendsList(nextList);
        saveToFirebase({ friendsList: nextList });
        await updateDoc(doc(db, "users", targetUid), { friends: arrayUnion(myDisplayId) });
        setFriendIdInput("");
        alert("友達に追加しました！");
      }
    }, {onlyOnce: true});
  };

  const removeFriend = async (fid) => {
    if (!window.confirm("友達解除しますか？")) return;
    const nextList = friendsList.filter(id => id !== fid);
    setFriendsList(nextList);
    saveToFirebase({ friendsList: nextList });
  };

  const sendMessage = async (targetUid, targetName) => {
    const msgText = window.prompt(`${targetName}さんへ応援メッセージ`, "お疲れ様！応援してるよ！");
    if (msgText) {
      const msgObj = {
        id: Date.now() + Math.random(),
        from: user.displayName,
        to: targetName,
        text: msgText,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        read: false
      };
      const batch = writeBatch(db);
      batch.update(doc(db, "users", targetUid), { message: msgObj, messageHistory: arrayUnion(msgObj) });
      batch.update(doc(db, "users", user.uid), { messageHistory: arrayUnion(msgObj) });
      await batch.commit();
      alert("メッセージを送りました！");
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black animate-pulse">読み込み中...</div>;

  if (!user) return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center px-6 transition-all ${currentTheme.bg}`}>
       <h1 className={`text-5xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent}`}>ROUTINE MASTER</h1>
       <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="mt-10 bg-white text-black px-12 py-5 rounded-full font-black shadow-2xl active:scale-95 text-sm tracking-widest">はじめる</button>
    </div>
  );

  return (
    <div className={`min-h-screen text-white transition-all duration-700 ${currentTheme.bg} flex overflow-hidden font-sans`}>
      <style jsx global>{`
        @keyframes bounce-rich { 0%, 100% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-15px) scale(0.95, 1.05); } }
        @keyframes blink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes pulse-gold { 0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(234, 179, 8, 0); } 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); } }
        @keyframes mouth-move { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3, 0.7); } }
        .animate-bounce-rich { animation: bounce-rich 2s infinite ease-in-out; }
        .animate-blink { animation: blink 4s infinite; }
        .animate-gold { animation: pulse-gold 1.5s infinite; }
        .animate-mouth { animation: mouth-move 2s infinite ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {/* --- サイドバー --- */}
      <aside className={`fixed left-0 top-0 h-full w-80 z-50 transition-transform duration-500 bg-black/40 backdrop-blur-2xl border-r border-white/10 p-6 flex flex-col ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex justify-between items-center mb-10"><p className="text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase">これまでの記録</p><button onClick={() => setIsSidebarOpen(false)} className="text-xl">✕</button></div>
        <section className="bg-white/5 p-4 rounded-[2rem] border border-white/10 mb-8 text-center">
          <p className="text-[10px] font-black mb-4 opacity-50 tracking-widest">{new Date().getMonth() + 1}月</p>
          <div className="grid grid-cols-7 gap-1 mb-2 text-[8px] font-black text-gray-600">
            {['日','月','火','水','木','金','土'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => (
              <div key={i} className="aspect-square flex items-center justify-center relative">
                {d && <><div className={`w-full h-full rounded-lg ${d.percent === null ? 'bg-white/5' : d.percent >= 80 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : `bg-blue-500/${Math.max(10, d.percent)}`}`}></div><span className="absolute inset-0 flex items-center justify-center text-[8px] font-black">{d.day}</span></>}
              </div>
            ))}
          </div>
        </section>
        <section className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
          <p className="text-[10px] font-black text-gray-500 tracking-widest">直近の達成率</p>
          {history.slice(-10).reverse().map((h, i) => (
            <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5"><span className="text-xs font-bold text-gray-400">{h.date}</span><span className="text-xs font-black">{h.percent}%</span></div>
          ))}
        </section>
      </aside>

      {/* --- メインコンテンツ --- */}
      <main className="flex-1 overflow-y-auto min-h-screen scrollbar-hide p-4 relative">
        <div className="max-w-4xl mx-auto pb-32">
          <header className="flex justify-between items-center py-4 mb-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-lg active:scale-90">☰</button>
            <h1 className={`text-xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent}`}>ROUTINE MASTER</h1>
            <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-lg active:scale-90">⚙️</button>
          </header>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-8 mx-auto w-fit">
            <button onClick={() => setActiveTab("main")} className={`px-8 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === "main" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}>メイン</button>
            <button onClick={() => setActiveTab("social")} className={`px-8 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === "social" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}>フレンド</button>
          </div>

          {activeTab === "main" ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* キャラクターカード */}
                <div className="bg-white/5 p-8 rounded-[3.5rem] border border-white/10 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden min-h-[350px]">
                  <div className={`w-36 h-36 rounded-full ${currentChar.color} shadow-2xl flex flex-col items-center justify-center animate-bounce-rich relative overflow-hidden transition-all duration-700 ${percent === 100 ? 'animate-gold' : ''}`}>
                    {/* 表情ロジック */}
                    <div className="flex gap-8 mb-4 animate-blink">
                      {percent === 100 ? ( <><span className="text-3xl">🔥</span><span className="text-3xl">🔥</span></> ) :
                       percent >= 80 ? ( <><span className="text-2xl">✨</span><span className="text-2xl">✨</span></> ) :
                       percent <= 20 ? ( <><div className="w-5 h-1.5 bg-black/40 rounded-full rotate-12"></div><div className="w-5 h-1.5 bg-black/40 rounded-full -rotate-12"></div></> ) :
                       ( <><div className="w-5 h-5 bg-white rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-black rounded-full"></div></div><div className="w-5 h-5 bg-white rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-black rounded-full"></div></div></> )}
                    </div>
                    <div className={`transition-all duration-500 animate-mouth ${percent >= 50 ? 'w-10 h-6 bg-white/30 rounded-b-full' : 'w-8 h-1 bg-black/20 rounded-full'}`}></div>
                    {percent >= 70 && <div className="absolute inset-x-0 bottom-10 flex justify-between px-6 opacity-40"><div className="w-5 h-2 bg-pink-300 rounded-full blur-sm"></div><div className="w-5 h-2 bg-pink-300 rounded-full blur-sm"></div></div>}
                  </div>
                  <div className="mt-8 text-center space-y-2">
                    <p className="text-[13px] font-black bg-white text-black px-8 py-3 rounded-2xl shadow-2xl inline-block hover:scale-110 transition-transform">{percent}% 達成！{currentChar.suffix}</p>
                    <p className="text-[10px] font-bold text-gray-400 italic block">継続中: {streakCount}日間 🔥</p>
                  </div>
                </div>

                {/* ランク説明 & ステータス */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                         <span className={`text-[8px] font-black px-3 py-1 rounded-full ${currentRank.bg} ${currentRank.color}`}>{currentRank.name}</span>
                         <h2 className="text-3xl font-black mt-1">{percent}%</h2>
                       </div>
                       <div className="text-right">
                         <p className="text-[8px] font-black text-gray-500 tracking-widest">ランク一覧</p>
                         <div className="mt-1 space-y-0.5">
                            {RANK_LIST.map(r => (
                              <div key={r.name} className={`flex items-center gap-2 text-[7px] font-bold ${percent >= r.min ? 'opacity-100' : 'opacity-20'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${r.color.replace('text','bg')}`}></div>
                                <span>{r.name} ({r.min}%〜)</span>
                                <span className="text-gray-600 hidden lg:inline">- {r.desc}</span>
                              </div>
                            ))}
                         </div>
                    </div>
                    </div>
                    <div className="h-28 w-full bg-black/20 rounded-2xl p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="displayDate" stroke="#444" fontSize={8} fontWeight="black" tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{backgroundColor:'#000', border:'none', borderRadius:'12px', fontSize:'10px'}} />
                          <Line type="monotone" dataKey="percent" stroke="#3b82f6" strokeWidth={4} dot={{r:3, fill:'#3b82f6'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* タイマー（5分〜） */}
                  <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex items-center justify-around shadow-lg">
                    <div className="text-center">
                      <p className="text-[28px] font-mono font-black tabular-nums">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
                      <button onClick={() => setIsTimerActive(!isTimerActive)} className={`mt-1 px-5 py-1.5 text-[9px] font-black rounded-full transition-all ${isTimerActive ? "bg-red-500" : "bg-white text-black"}`}>{isTimerActive ? "停止" : "開始"}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[5, 15, 25, 45].map(m => <button key={m} onClick={() => { setIsTimerActive(false); setTimeLeft(m*60); }} className="text-[8px] font-black border border-white/10 w-10 py-2 rounded-xl hover:bg-white hover:text-black transition-all">{m}分</button>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* タスクエリア（最小高さを無くし可変に） */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {["morning", "afternoon", "night"].map(time => (
                  <div key={time} className="bg-white/5 p-7 rounded-[3rem] border border-white/10 shadow-xl flex flex-col h-auto">
                    <h2 className="text-[11px] font-black text-gray-500 uppercase mb-4 tracking-[0.4em] text-center opacity-30">{time === 'morning' ? '朝' : time === 'afternoon' ? '昼' : '夜'}</h2>
                    <div className="space-y-4">
                      {tasks[time].map((task, index) => (
                        <div key={index} className="flex items-center group/item">
                          <button onClick={() => toggleCheck(time + task)} className={`w-6 h-6 mr-3 rounded-lg border-2 border-white/10 flex items-center justify-center transition-all ${checks[time + task] ? "bg-emerald-500 border-none scale-110 shadow-lg" : "bg-black/20"}`}>
                            {checks[time + task] && <span className="text-[10px] font-black text-white">✓</span>}
                          </button>
                          <span className={`flex-1 text-sm font-bold ${checks[time + task] ? 'opacity-20 line-through' : 'text-gray-200'}`}>
                            {task.startsWith('!') ? <span className="text-orange-400 font-black">🌟 {task.substring(1)}</span> : task}
                          </span>
                          <button onClick={() => removeTask(time, index)} className="opacity-0 group-hover/item:opacity-100 text-red-500 p-1 transition-all">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button onClick={() => { const val = newTasks[time] || ""; setNewTasks({ ...newTasks, [time]: val.startsWith("!") ? val.substring(1) : "!" + val }); }} className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${newTasks[time]?.startsWith("!") ? "bg-orange-500 border-orange-300" : "bg-white/5 border-white/10 opacity-40"}`}>🌟</button>
                        <input value={newTasks[time]} onChange={(e) => setNewTasks({ ...newTasks, [time]: e.target.value })} className="flex-1 bg-black/40 text-[11px] p-3 rounded-xl border border-white/5 outline-none focus:border-white/20" placeholder="タスクを入力..." />
                      </div>
                      <button onClick={() => addTask(time)} className="w-full bg-white text-black py-3 rounded-xl font-black text-[10px] active:scale-95 transition-all shadow-lg">追加する</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ソーシャルビュー (LINE風) */
            <div className="space-y-6">
               <div className="flex gap-8 mb-6 justify-center">
                <button onClick={() => setSocialSubTab("list")} className={`text-[11px] font-black tracking-widest transition-all ${socialSubTab === 'list' ? 'text-white border-b-2 border-white pb-1' : 'text-gray-500'}`}>友達リスト</button>
                <button onClick={() => setSocialSubTab("msgs")} className={`text-[11px] font-black tracking-widest transition-all relative ${socialSubTab === 'msgs' ? 'text-white border-b-2 border-white pb-1' : 'text-gray-500'}`}>
                  トーク
                  {userMessages.some(m => !m.read && m.from !== user.displayName) && <span className="absolute -top-1 -right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse"></span>}
                </button>
              </div>

              {socialSubTab === "list" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friendsData.map((f, i) => (
                    <div key={i} className="bg-white/5 p-6 rounded-[3rem] border border-white/10 relative group overflow-hidden shadow-2xl hover:bg-white/[0.07] transition-all">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${CHARACTERS[f.charIndex || 0].accent} bg-gradient-to-b`}></div>
                      <div className="flex items-center gap-4 mb-5">
                        <div className={`w-16 h-16 rounded-full ${CHARACTERS[f.charIndex || 0].color} flex items-center justify-center animate-bounce-rich shadow-lg`}>
                          <div className="flex gap-1.5"><div className="w-2 h-2 bg-white rounded-full"></div><div className="w-2 h-2 bg-white rounded-full"></div></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-black flex items-center gap-2">{f.displayName}<span className={`text-[7px] px-2 py-0.5 rounded-full ${RANK_LIST.find(r=>r.name===f.rank)?.bg} ${RANK_LIST.find(r=>r.name===f.rank)?.color}`}>{f.rank}</span></h3>
                          <div className="flex items-end gap-3 mt-1">
                            <span className="text-3xl font-black">{f.percent}%</span>
                            <span className="text-[10px] font-black text-orange-400 mb-1.5">🔥 {f.streak || 0}日間</span>
                          </div>
                        </div>
                        <button onClick={() => sendMessage(f.uid, f.displayName)} className="bg-white text-black w-12 h-12 rounded-2xl text-xl flex items-center justify-center hover:scale-110 transition-all shadow-xl">✉️</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 bg-black/40 p-4 rounded-2xl border border-white/5">
                        {[{ label: "朝", val: f.sectionStats?.morning || 0 }, { label: "昼", val: f.sectionStats?.afternoon || 0 }, { label: "夜", val: f.sectionStats?.night || 0 }].map((sec, si) => (
                          <div key={si} className="text-center">
                            <p className="text-[7px] font-black text-gray-500 mb-1">{sec.label}</p>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1"><div className="h-full bg-blue-500" style={{ width: `${sec.val}%` }}></div></div>
                            <p className="text-[9px] font-black">{sec.val}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col h-[65vh] bg-black/30 rounded-[3rem] border border-white/5 overflow-hidden max-w-lg mx-auto shadow-inner">
                  <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
                    {userMessages.map((m, i) => (
                      <div key={i} className={`flex flex-col ${m.from === user.displayName ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-end gap-2 max-w-[85%]">
                          {m.from === user.displayName ? (
                            <>
                              <div className="flex flex-col items-end gap-0.5">
                                {m.read && <span className="text-[8px] text-blue-400 font-black">既読</span>}
                                <span className="text-[7px] text-gray-600 font-bold">{m.time}</span>
                              </div>
                              <div className="px-5 py-3 rounded-[1.5rem] shadow-lg text-sm font-bold bg-[#06C755] text-white rounded-tr-none">
                                {m.text}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-black border border-white/5 shrink-0 shadow-lg">{m.from[0]}</div>
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-500 ml-1">{m.from}</span>
                                <div className="px-5 py-3 rounded-[1.5rem] shadow-md text-sm font-bold bg-white/10 text-gray-100 rounded-tl-none border border-white/5">
                                  {m.text}
                                </div>
                              </div>
                              <span className="text-[7px] text-gray-600 font-bold mb-1">{m.time}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- 設定モーダル --- */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)}></div>
          <div className={`relative w-full max-w-sm p-8 rounded-[4rem] ${currentTheme.bg} border border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide`}>
            <div className="flex justify-between items-center mb-10"><h2 className="text-xl font-black italic text-gray-500">設定</h2><button onClick={() => setIsMenuOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">✕</button></div>
            <div className="space-y-12">
              <section className="bg-white/5 p-8 rounded-[3rem] text-center border border-white/10">
                <p className="text-[10px] font-black text-gray-500 mb-3 tracking-widest">マイID</p>
                <p className="text-5xl font-black tracking-tighter text-white select-all">{myDisplayId}</p>
              </section>
              <section>
                <p className="text-[10px] font-black text-gray-500 mb-4 tracking-widest">友達追加</p>
                <div className="flex gap-2">
                  <input value={friendIdInput} onChange={(e) => setFriendIdInput(e.target.value.substring(0,8))} className="flex-1 bg-black/40 text-xs p-4 rounded-2xl border border-white/5 outline-none" placeholder="IDを入力..." />
                  <button onClick={addFriend} className="bg-white text-black px-6 rounded-2xl font-black text-[10px] active:scale-95 shadow-lg">追加</button>
                </div>
              </section>
              <section>
                <p className="text-[10px] font-black text-gray-500 mb-4 tracking-widest">キャラクター選択</p>
                <div className="grid grid-cols-2 gap-3">
                  {CHARACTERS.map((c, i) => (
                    <button key={i} onClick={() => { setCharIndex(i); saveToFirebase({ charIndex: i }); }} className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center ${charIndex === i ? 'border-white bg-white/10 shadow-xl' : 'border-transparent opacity-30'}`}>
                      <div className={`w-8 h-8 rounded-full ${c.color} mb-2`}></div>
                      <p className="text-[9px] font-black">{c.name}</p>
                    </button>
                  ))}
                </div>
              </section>
              <button onClick={() => signOut(auth)} className="w-full py-4 bg-red-500/10 text-red-500 rounded-3xl font-black text-xs border border-red-500/20 active:bg-red-500 active:text-white">ログアウト</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
