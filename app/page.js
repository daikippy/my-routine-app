"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, where, updateDoc, arrayUnion } from "firebase/firestore";
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
  { name: "LEGEND", min: 100, color: "text-yellow-400", bg: "bg-yellow-400/20", border: "border-yellow-400/50" },
  { name: "PLATINUM", min: 80, color: "text-blue-300", bg: "bg-blue-300/20", border: "border-blue-300/50" },
  { name: "GOLD", min: 50, color: "text-yellow-600", bg: "bg-yellow-600/20", border: "border-yellow-600/50" },
  { name: "SILVER", min: 20, color: "text-gray-400", bg: "bg-gray-400/20", border: "border-gray-400/50" },
  { name: "BEGINNER", min: 0, color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/50" }
];

const THEMES = [
  { name: "漆黒", color: "#030712", bg: "bg-gray-950", accent: "from-blue-400 to-emerald-400" },
  { name: "深夜", color: "#0f172a", bg: "bg-slate-900", accent: "from-indigo-400 to-cyan-400" },
  { name: "深海", color: "#1e1b4b", bg: "bg-indigo-950", accent: "from-blue-600 to-blue-300" },
  { name: "毒", color: "#3b0764", bg: "bg-violet-950", accent: "from-purple-400 to-fuchsia-300" }
];

export default function Home() {
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState("main"); 
  const [socialSubTab, setSocialSubTab] = useState("list");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState({ morning: [], afternoon: [], night: [] });
  const [checks, setChecks] = useState({});
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);
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
  const currentTheme = THEMES[themeIndex] || THEMES[0];

  const chartData = useMemo(() => history.slice(-7).map(h => ({ ...h, displayDate: h.date.split('-').slice(1).join('/') })), [history]);

  // --- ストリーク計算 ---
  const calculateStreak = (hist) => {
    let count = 0;
    const sorted = [...hist].sort((a, b) => new Date(b.date) - new Date(a.date));
    let checkDate = new Date();
    
    for (let h of sorted) {
      const d = new Date(h.date);
      const diff = Math.floor((checkDate - d) / (1000 * 60 * 60 * 24));
      if (diff <= 1 && h.percent > 0) {
        count++;
        checkDate = d;
      } else if (diff > 1) break;
    }
    return count;
  };

  // --- 既読処理 ---
  useEffect(() => {
    if (activeTab === "social" && socialSubTab === "msgs" && user && userMessages.some(m => !m.read)) {
      updateDoc(doc(db, "users", user.uid), { messageHistory: userMessages.map(m => ({ ...m, read: true })) });
    }
  }, [activeTab, socialSubTab, userMessages, user]);

  // --- Auto Save ---
  const saveToFirebase = async (updatedData = {}) => {
    if (!user) return;
    const currentTasks = updatedData.tasks || tasks;
    const currentChecks = updatedData.checks || checks;
    const currentHistory = updatedData.history || history;
    
    const comp = Object.values(currentChecks).filter(Boolean).length;
    const total = currentTasks.morning.length + currentTasks.afternoon.length + currentTasks.night.length;
    const newPercent = total === 0 ? 0 : Math.round((comp / total) * 100);
    
    const nextHistory = [...currentHistory.filter(h => h.date !== today), { date: today, percent: newPercent }];
    const newStreak = calculateStreak(nextHistory);
    setStreak(newStreak);

    const stats = {
      morning: currentTasks.morning.length === 0 ? 0 : Math.round((currentTasks.morning.filter(t => currentChecks["morning" + t]).length / currentTasks.morning.length) * 100),
      afternoon: currentTasks.afternoon.length === 0 ? 0 : Math.round((currentTasks.afternoon.filter(t => currentChecks["afternoon" + t]).length / currentTasks.afternoon.length) * 100),
      night: currentTasks.night.length === 0 ? 0 : Math.round((currentTasks.night.filter(t => currentChecks["night" + t]).length / currentTasks.night.length) * 100)
    };

    await setDoc(doc(db, "users", user.uid), { 
      tasks: currentTasks, checks: currentChecks, lastCheckDate: today, 
      history: nextHistory, streak: newStreak, percent: newPercent,
      rank: RANK_LIST.find(r => newPercent >= r.min)?.name || "BEGINNER",
      sectionStats: stats, themeIndex: updatedData.themeIndex ?? themeIndex,
      charIndex: updatedData.charIndex ?? charIndex, friends: updatedData.friendsList ?? friendsList,
      displayName: user.displayName, shortId: myDisplayId
    }, { merge: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        onSnapshot(doc(db, "users", u.uid), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setTasks(d.tasks || { morning: [], afternoon: [], night: [] });
            setHistory(d.history || []);
            setFriendsList(d.friends || []);
            setThemeIndex(d.themeIndex || 0);
            setCharIndex(d.charIndex || 0);
            setStreak(d.streak || 0);
            setUserMessages(d.messageHistory || []);
            if (d.lastCheckDate === today) setChecks(d.checks || {});
            if (d.message) {
              setIncomingMsg(d.message);
              setTimeout(() => updateDoc(doc(db, "users", u.uid), { message: null }), 5000);
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
    return onSnapshot(q, (s) => setFriendsData(s.docs.map(d => d.data())));
  }, [friendsList, user]);

  const sendMessage = async (targetUid, name) => {
    const msgText = window.prompt(`${name}さんへメッセージ`, "応援してるよ！");
    if (msgText) {
      const msgObj = { id: Date.now(), from: user.displayName, text: msgText, time: new Date().toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'}), read: false };
      await updateDoc(doc(db, "users", targetUid), { message: msgObj, messageHistory: arrayUnion(msgObj) });
      alert("送信完了！");
    }
  };

  const addFriend = async () => {
    if (!friendIdInput || friendIdInput === myDisplayId) return;
    const q = query(collection(db, "users"), where("shortId", "==", friendIdInput));
    const s = await getDoc(doc(db, "users", "dummy")); // dummy logic
    onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const target = snap.docs[0];
        const nextList = [...friendsList, friendIdInput];
        setFriendsList(nextList);
        saveToFirebase({ friendsList: nextList });
        await updateDoc(doc(db, "users", target.id), { friends: arrayUnion(myDisplayId) });
        setFriendIdInput("");
        alert("相互フレンドになりました！");
      }
    }, {onlyOnce: true});
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black animate-pulse">LOADING...</div>;

  return (
    <div className={`min-h-screen text-white transition-all duration-700 ${currentTheme.bg} flex overflow-hidden font-sans`}>
      <style jsx global>{`
        @keyframes bounce-rich { 0%, 100% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-15px) scale(1.05, 0.95); } }
        @keyframes blink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes mouth-move { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.3); } }
        .animate-bounce-rich { animation: bounce-rich 2s infinite ease-in-out; }
        .animate-blink { animation: blink 4s infinite; }
        .animate-mouth { animation: mouth-move 3s infinite ease-in-out; }
      `}</style>

      <main className="flex-1 overflow-y-auto h-screen scrollbar-hide p-4 relative">
        {incomingMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-white text-black p-4 rounded-3xl shadow-2xl animate-bounce flex items-center gap-4">
            <div className="text-2xl">📩</div>
            <div><p className="text-[10px] font-black opacity-50">{incomingMsg.from}</p><p className="text-sm font-bold truncate">{incomingMsg.text}</p></div>
          </div>
        )}

        <div className="max-w-xl mx-auto pb-24">
          <header className="flex justify-between items-center py-4 mb-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10">☰</button>
            <h1 className={`text-xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent}`}>ROUTINE MASTER</h1>
            <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10">⚙️</button>
          </header>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-6 mx-auto w-fit">
            <button onClick={() => setActiveTab("main")} className={`px-8 py-2 rounded-xl text-[10px] font-black tracking-widest ${activeTab === "main" ? "bg-white text-black" : "text-gray-500"}`}>MAIN</button>
            <button onClick={() => setActiveTab("social")} className={`px-8 py-2 rounded-xl text-[10px] font-black tracking-widest ${activeTab === "social" ? "bg-white text-black" : "text-gray-500"}`}>SOCIAL</button>
          </div>

          {activeTab === "main" ? (
            <>
              {/* Character Section */}
              <div className="bg-white/5 p-8 rounded-[3.5rem] border border-white/10 mb-6 flex flex-col items-center relative shadow-2xl">
                <div className="absolute top-8 left-8 flex flex-col items-center">
                   <span className="text-[10px] font-black text-orange-400">STREAK</span>
                   <span className="text-2xl font-black italic">🔥{streak}</span>
                </div>
                
                <div className="relative mb-6 mt-4">
                  <div className={`w-36 h-36 rounded-full ${currentChar.color} shadow-2xl flex flex-col items-center justify-center animate-bounce-rich overflow-hidden`}>
                      {/* Eyes - 表情変化 */}
                      <div className="flex gap-8 mb-3 animate-blink">
                        {percent >= 100 ? (
                          <><span className="text-2xl font-black text-white">^</span><span className="text-2xl font-black text-white">^</span></>
                        ) : percent >= 50 ? (
                          <><div className="w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div><div className="w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div></>
                        ) : (
                          <><div className="w-3 h-3 bg-black rounded-full"></div><div className="w-3 h-3 bg-black rounded-full"></div></>
                        )}
                      </div>
                      {/* Mouth - 表情変化 */}
                      <div className={`transition-all duration-500 animate-mouth ${percent >= 100 ? 'w-10 h-5 bg-white/40 rounded-b-full' : percent >= 50 ? 'w-8 h-2 bg-black/20 rounded-full' : 'w-4 h-1 bg-black/40 rounded-full'}`}></div>
                  </div>
                </div>
                <p className="text-[11px] font-black bg-white text-black px-6 py-2 rounded-2xl shadow-xl uppercase">{percent}% {percent >= 100 ? "PERFECT!" : "GOING GOOD"}</p>
              </div>

              {/* Status Tiles */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className={`p-5 rounded-[2.5rem] border ${currentRank.border} ${currentRank.bg} text-center flex flex-col items-center`}>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full bg-white/20 mb-1`}>{currentRank.name}</span>
                  <div className="text-4xl font-black">{percent}%</div>
                </div>
                <div className="bg-white/5 p-3 rounded-[2.5rem] border border-white/10 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}><Line type="monotone" dataKey="percent" stroke="#3b82f6" strokeWidth={4} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tasks */}
              {["morning", "afternoon", "night"].map(time => (
                <div key={time} className="bg-white/5 p-6 rounded-[2.5rem] mb-4 border border-white/10">
                  <h2 className="text-[9px] font-black text-gray-600 uppercase mb-4 tracking-[0.3em]">{time}</h2>
                  <div className="space-y-3">
                    {tasks[time].map((task, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <button onClick={() => toggleCheck(time + task)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${checks[time+task] ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-white/5 border border-white/10'}`}>{checks[time+task] && '✓'}</button>
                        <span className={`flex-1 text-sm font-bold ${checks[time+task] ? 'opacity-20 line-through' : ''}`}>{task.startsWith('!') ? '🌟 '+task.slice(1) : task}</span>
                        <button onClick={() => removeTask(time, idx)} className="text-gray-600 hover:text-red-500">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex mt-5 gap-2">
                    <input value={newTasks[time]} onChange={(e)=>setNewTasks({...newTasks, [time]:e.target.value})} className="flex-1 bg-black/20 text-xs p-3 rounded-xl border border-white/5 outline-none" placeholder="Add task..." />
                    <button onClick={()=>addTask(time)} className="bg-white text-black px-4 rounded-xl font-black text-[10px]">ADD</button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-8 mb-6 justify-center">
                <button onClick={() => setSocialSubTab("list")} className={`text-[10px] font-black tracking-widest ${socialSubTab==='list'?'text-white border-b-2':'text-gray-600'}`}>FRIENDS</button>
                <button onClick={() => setSocialSubTab("msgs")} className={`text-[10px] font-black tracking-widest relative ${socialSubTab==='msgs'?'text-white border-b-2':'text-gray-600'}`}>MESSAGES {userMessages.some(m=>!m.read) && <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
              </div>

              {socialSubTab === "list" ? (
                friendsData.map((f, i) => {
                  const fRank = RANK_LIST.find(r => r.name === f.rank) || RANK_LIST[4];
                  return (
                    <div key={i} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full ${CHARACTERS[f.charIndex||0].color} animate-bounce-rich`}></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black">{f.displayName}</h3>
                            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${fRank.bg} ${fRank.color}`}>{f.rank}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-xl font-black">{f.percent}%</span>
                             <span className="text-[10px] font-black text-orange-400">🔥{f.streak || 0}</span>
                          </div>
                        </div>
                        <button onClick={() => sendMessage(f.uid, f.displayName)} className="p-3 bg-white/10 rounded-2xl hover:bg-white hover:text-black">✉️</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 px-2">
                         {['AM','PM','NG'].map((label, idx) => (
                           <div key={idx} className="flex flex-col gap-1">
                             <span className="text-[7px] font-black opacity-30">{label}</span>
                             <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-400" style={{width: `${Object.values(f.sectionStats||{})[idx]}%`}}></div></div>
                           </div>
                         ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-4 px-2">
                  {userMessages.slice().reverse().map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.from === user.displayName ? 'items-end' : 'items-start'}`}>
                      <span className="text-[8px] font-black text-gray-600 mb-1 px-2">{m.from}</span>
                      <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm font-bold ${m.from === user.displayName ? 'bg-blue-600 rounded-tr-none' : 'bg-white/10 rounded-tl-none border border-white/5'}`}>{m.text}</div>
                      <span className="text-[7px] text-gray-700 mt-1">{m.time} {m.from === user.displayName && (m.read ? '既読' : '未読')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl" onClick={()=>setIsMenuOpen(false)}>
          <div className={`w-full max-w-sm p-8 rounded-[3.5rem] ${currentTheme.bg} border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]`} onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10"><h2 className="text-lg font-black italic text-gray-600">SETTINGS</h2><button onClick={()=>setIsMenuOpen(false)}>✕</button></div>
            <div className="space-y-10">
              <section className="bg-white/5 p-6 rounded-[2.5rem] text-center"><p className="text-[9px] font-black text-gray-500 mb-2 tracking-widest uppercase">My ID</p><p className="text-4xl font-black select-all">{myDisplayId}</p></section>
              <section>
                 <p className="text-[10px] font-black text-gray-500 mb-4 uppercase tracking-widest">Add Friend</p>
                 <div className="flex gap-2"><input value={friendIdInput} onChange={e=>setFriendIdInput(e.target.value.substring(0,8))} className="flex-1 bg-black/40 text-xs p-4 rounded-2xl outline-none" placeholder="Enter ID..." /><button onClick={addFriend} className="bg-white text-black px-6 rounded-2xl font-black text-[10px]">ADD</button></div>
              </section>
              <section>
                 <p className="text-[10px] font-black text-gray-500 mb-4 uppercase tracking-widest">Theme</p>
                 <div className="grid grid-cols-4 gap-3">{THEMES.map((t,i)=><button key={i} onClick={()=>{setThemeIndex(i); saveToFirebase({themeIndex:i});}} className={`w-10 h-10 rounded-full border-2 ${themeIndex===i?'border-white scale-110 shadow-lg':'border-transparent'}`} style={{backgroundColor:t.color}}></button>)}</div>
              </section>
              <button onClick={()=>signOut(auth)} className="w-full py-4 bg-red-500/10 text-red-500 rounded-[1.5rem] font-black text-xs border border-red-500/20 active:bg-red-500 active:text-white transition-all">LOGOUT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
