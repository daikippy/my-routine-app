"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, onSnapshot, query, where, updateDoc, arrayUnion, writeBatch, getDocs, arrayRemove, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";

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
  { id: "blob",  name: "ぷるぷる", color: "bg-blue-500",   accent: "from-blue-400 to-blue-600 shadow-blue-500/50" },
  { id: "fluff", name: "もふもふ", color: "bg-orange-400", accent: "from-orange-300 to-orange-500 shadow-orange-500/50" },
  { id: "spark", name: "ぴかぴか", color: "bg-yellow-400", accent: "from-yellow-300 to-yellow-500 shadow-yellow-500/50" },
  { id: "fire",  name: "メラメラ", color: "bg-red-500",    accent: "from-red-400 to-red-600 shadow-red-500/50" },
  { id: "cool",  name: "しっとり", color: "bg-indigo-600", accent: "from-indigo-500 to-indigo-700 shadow-indigo-500/50" },
  { id: "ghost", name: "ふわふわ", color: "bg-purple-400", accent: "from-purple-300 to-purple-500 shadow-purple-500/50" }
];

const EMOJI_ICONS = ["😊","😎","🥳","🤩","😇","🦊","🐼","🐸","🐯","🦁","🐙","🐳","🦄","🐲","🌸","⭐","🔥","💎","🎯","🚀","👑","🎸","🏆","🌈"];

function UserIcon({ 
  photoURL, 
  charIndex, 
  emojiIcon, 
  size = "w-16 h-16", 
  textSize = "text-2xl" 
}) {
  const char = CHARACTERS[charIndex || 0];
  if (photoURL) return <img src={photoURL} alt="icon" className={`${size} rounded-full object-cover`} />;
  if (emojiIcon) return <div className={`${size} rounded-full bg-white/10 flex items-center justify-center ${textSize}`}>{emojiIcon}</div>;
  return (
    <div className={`${size} rounded-full ${char.color} flex items-center justify-center`}>
      <div className="flex gap-1.5">
        <div className="w-2 h-2 bg-white rounded-full" />
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
    </div>
  );
}

const RANK_LIST = [
  { name: "レジェンド", min: 100, color: "text-yellow-400", bg: "bg-yellow-400/20" },
  { name: "プラチナ",   min: 80,  color: "text-blue-300",   bg: "bg-blue-300/20" },
  { name: "ゴールド",   min: 50,  color: "text-yellow-600", bg: "bg-yellow-600/20" },
  { name: "シルバー",   min: 20,  color: "text-gray-400",   bg: "bg-gray-400/20" },
  { name: "ビギナー",   min: 0,   color: "text-gray-500",   bg: "bg-gray-500/10" }
];

const DAILY_AWARDS = [
  { name: "超人!!", min: 100, color: "text-white",    bg: "bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500" },
  { name: "達人",   min: 80,  color: "text-white",    bg: "bg-blue-600" },
  { name: "努力家", min: 50,  color: "text-white",    bg: "bg-emerald-600" },
  { name: "挑戦者", min: 1,   color: "text-white",    bg: "bg-zinc-600" },
  { name: "休息中", min: 0,   color: "text-gray-400", bg: "bg-zinc-800" }
];

const THEMES = [
  { name: "Passion",     color: "#ef4444", bg: "bg-red-500",     title: "text-white" },
  { name: "Soft Red",    color: "#fca5a5", bg: "bg-red-300",     title: "text-red-950" },
  { name: "Deep Red",    color: "#7f1d1d", bg: "bg-red-950",     title: "text-white" },
  { name: "Sun",         color: "#f97316", bg: "bg-orange-500",  title: "text-white" },
  { name: "Apricot",     color: "#fdba74", bg: "bg-orange-300",  title: "text-orange-950" },
  { name: "Deep Orange", color: "#9a3412", bg: "bg-orange-900",  title: "text-white" },
  { name: "Lemon",       color: "#facc15", bg: "bg-yellow-400",  title: "text-yellow-950" },
  { name: "Cream",       color: "#fef9c3", bg: "bg-yellow-100",  title: "text-yellow-950" },
  { name: "Gold",        color: "#ca8a04", bg: "bg-yellow-600",  title: "text-white" },
  { name: "Emerald",     color: "#10b981", bg: "bg-emerald-500", title: "text-white" },
  { name: "Mint",        color: "#a7f3d0", bg: "bg-emerald-200", title: "text-emerald-950" },
  { name: "Forest",      color: "#064e3b", bg: "bg-emerald-950", title: "text-white" },
  { name: "Sky Blue",    color: "#3b82f6", bg: "bg-blue-500",    title: "text-white" },
  { name: "Pale Blue",   color: "#dbeafe", bg: "bg-blue-100",    title: "text-blue-950" },
  { name: "Ocean",       color: "#1e3a8a", bg: "bg-blue-900",    title: "text-white" },
  { name: "Indigo",      color: "#6366f1", bg: "bg-indigo-500",  title: "text-white" },
  { name: "Lavender",    color: "#c7d2fe", bg: "bg-indigo-200",  title: "text-indigo-950" },
  { name: "Midnight",    color: "#312e81", bg: "bg-indigo-950",  title: "text-white" },
  { name: "Grape",       color: "#a855f7", bg: "bg-purple-500",  title: "text-white" },
  { name: "Lilac",       color: "#f3e8ff", bg: "bg-purple-100",  title: "text-purple-950" },
  { name: "Dark Purple", color: "#581c87", bg: "bg-purple-950",  title: "text-white" }
];

export default function Home() {
  const [now, setNow] = useState(new Date());
  const today = now.toISOString().split('T')[0];
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [activeTab, setActiveTab] = useState("main");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<{ morning: string[]; afternoon: string[]; night: string[] }>({ morning: [], afternoon: [], night: [] });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<{ date: string; percent: number }[]>([]);
  const [newTasks, setNewTasks] = useState({ morning: "", afternoon: "", night: "" });
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [themeIndex, setThemeIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState("");
  const [selectedChatFriend, setSelectedChatFriend] = useState<any>(null);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [friendsData, setFriendsData] = useState<any[]>([]);
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [emojiIcon, setEmojiIcon] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  // ⑩ トースト
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "err" } | null>(null);
  // ② チャット入力
  const [chatInput, setChatInput] = useState("");
  // ⑦ テーマ名ホバー
  const [hoveredTheme, setHoveredTheme] = useState<number | null>(null);

  const endTimeRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);

  // ⑩ トースト表示ヘルパー
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const totalTasks = tasks.morning.length + tasks.afternoon.length + tasks.night.length;
  const completedTasks = Object.values(checks).filter(Boolean).length;
  const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // ⑧ 時間帯別進捗
  const timeProgress = useMemo(() => {
    return (["morning", "afternoon", "night"] as const).map(t => {
      const total = tasks[t].length;
      const done = tasks[t].filter((_, i) => checks[`${t}_${i}`]).length;
      return { time: t, total, done };
    });
  }, [tasks, checks]);

  const lastWeekAvg = useMemo(() => {
    const last7 = history.slice(-7);
    if (last7.length === 0) return 0;
    return Math.round(last7.reduce((acc, cur) => acc + (cur.percent || 0), 0) / last7.length);
  }, [history]);

  const currentRank = RANK_LIST.find(r => lastWeekAvg >= r.min) || RANK_LIST[4];
  const currentAward = DAILY_AWARDS.find(a => percent >= a.min) || DAILY_AWARDS[4];
  const myDisplayId = user ? user.uid.substring(0, 8) : "";
  const currentChar = CHARACTERS[charIndex];
  const currentTheme = THEMES[themeIndex];

  useEffect(() => {
    if (typeof Audio !== "undefined") {
      audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audioRef.current.loop = true;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const taskLibrary = useMemo(() => {
    const all = [...tasks.morning, ...tasks.afternoon, ...tasks.night];
    return Array.from(new Set(all)).filter(t => t !== "");
  }, [tasks]);

  // ③ タスク0件のときの専用メッセージ
  const characterMessage = useMemo(() => {
    if (totalTasks === 0) return "まずは朝・昼・夜にルーティンを追加してみよう！";
    if (percent === 0) return "さあ、これから一緒に頑張っていきましょう。";
    if (percent < 30) return "まずは一歩ずつですね。応援しています。";
    if (percent < 50) return "調子が出てきましたね。その調子です。";
    if (percent < 80) return "半分以上クリアしましたね。素晴らしいです。";
    if (percent < 100) return "あと少しです。最後まで走り抜けましょう。";
    return "パーフェクト！最高の結果を出せましたね。";
  }, [percent, totalTasks]);

  // ① 継続記録：日付連続チェック
  const streakCount = useMemo(() => {
    let count = 0;
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (let i = 0; i < sortedHistory.length; i++) {
      const h = sortedHistory[i];
      if (h.percent < 80) break;
      if (i === 0) {
        const diffDays = Math.round((new Date(today).getTime() - new Date(h.date).getTime()) / 86400000);
        if (diffDays > 1) break;
      } else {
        const prevDate = sortedHistory[i - 1].date;
        const diffDays = Math.round((new Date(prevDate).getTime() - new Date(h.date).getTime()) / 86400000);
        if (diffDays !== 1) break;
      }
      count++;
    }
    return count;
  }, [history, today]);

  const chartData = useMemo(() => history.slice(-7).map(h => ({ ...h, displayDate: h.date.split('-').slice(1).join('/') })), [history]);

  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: any[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const record = history.find(h => h.date === dStr);
      days.push({ day: i, date: dStr, percent: record ? record.percent : null });
    }
    return days;
  }, [currentCalendarDate, history]);

  const changeMonth = (offset: number) => setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));

  const postToTimeline = async (message: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "timeline"), {
        uid: user.uid, displayName: displayName || user.displayName,
        charIndex, shortId: myDisplayId, photoURL, emojiIcon,
        message: `${message} (称号: ${currentAward.name})`,
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error("Timeline post error:", e); }
  };

  const removeFromTimeline = async (taskName: string) => {
    if (!user) return;
    try {
      const q = query(collection(db, "timeline"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        if (d.data().message?.startsWith(`${taskName} を完了！`)) batch.delete(d.ref);
      });
      await batch.commit();
    } catch (e) { console.error("Timeline remove error:", e); }
  };

  const saveToFirebase = async (updatedData: any = {}) => {
    if (!user) return;
    const currentTasks = updatedData.tasks || tasks;
    const currentChecks = updatedData.checks || checks;
    const currentHistory = updatedData.history || history;
    const currentThemeIdx = updatedData.themeIndex !== undefined ? updatedData.themeIndex : themeIndex;
    const currentCharIdx = updatedData.charIndex !== undefined ? updatedData.charIndex : charIndex;
    const currentFriendsList = updatedData.friendsList || friendsList;
    const currentName = updatedData.displayName || displayName || user.displayName;
    const currentPhotoURL = updatedData.photoURL !== undefined ? updatedData.photoURL : photoURL;
    const currentEmojiIcon = updatedData.emojiIcon !== undefined ? updatedData.emojiIcon : emojiIcon;

    const comp = Object.values(currentChecks).filter(Boolean).length;
    const total = currentTasks.morning.length + currentTasks.afternoon.length + currentTasks.night.length;
    const newPercent = total === 0 ? 0 : Math.round((comp / total) * 100);

    let nextHistory = [...currentHistory];
    const existingIdx = nextHistory.findIndex((h: any) => h.date === today);
    if (existingIdx >= 0) nextHistory[existingIdx] = { date: today, percent: newPercent };
    else nextHistory.push({ date: today, percent: newPercent });

    const avg = nextHistory.slice(-7).reduce((acc: number, cur: any) => acc + (cur.percent || 0), 0) / Math.min(nextHistory.length, 7);
    const newRank = RANK_LIST.find(r => avg >= r.min)?.name || "ビギナー";
    const awardName = DAILY_AWARDS.find(a => newPercent >= a.min)?.name || "休息中";

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid, tasks: currentTasks, checks: currentChecks, lastCheckDate: today,
      history: nextHistory, displayName: currentName, shortId: myDisplayId,
      rank: newRank, percent: newPercent, award: awardName, avg: Math.round(avg),
      friends: currentFriendsList, streak: streakCount,
      photoURL: currentPhotoURL, emojiIcon: currentEmojiIcon,
      themeIndex: currentThemeIdx, charIndex: currentCharIdx, lastActive: Date.now()
    }, { merge: true });
  };

  const closeTutorial = async () => {
    setShowTutorial(false);
    if (user) await updateDoc(doc(db, "users", user.uid), { hasSeenTutorial: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u: any) => {
      setUser(u);
      if (u) {
        setDisplayName(u.displayName || "");
        const docRef = doc(db, "users", u.uid);
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setTasks(d.tasks || { morning: [], afternoon: [], night: [] });
            setHistory(d.history || []);
            setFriendsList(d.friends || []);
            setThemeIndex(d.themeIndex || 0);
            setCharIndex(d.charIndex || 0);
            if (d.displayName) setDisplayName(d.displayName);
            if (d.photoURL !== undefined) setPhotoURL(d.photoURL || "");
            if (d.emojiIcon !== undefined) setEmojiIcon(d.emojiIcon || "");
            const sortedMsgs = (d.messageHistory || []).sort((a: any, b: any) => a.id - b.id);
            setUserMessages(sortedMsgs);
            if (d.lastCheckDate === today) setChecks(d.checks || {});
            else setChecks({});
            if (!d.hasSeenTutorial) setShowTutorial(true);
          } else {
            setShowTutorial(true);
          }
          setLoading(false);
        });
        // オンライン：ログイン直後に即時更新
        updateDoc(doc(db, "users", u.uid), { lastActive: Date.now() }).catch(() => {});
        const activeInterval = setInterval(() => {
          updateDoc(doc(db, "users", u.uid), { lastActive: Date.now() });
        }, 60000);
        return () => clearInterval(activeInterval);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [today]);

  useEffect(() => {
    if (!user) return;
    const allowedUids = [user.uid, ...friendsData.map((f: any) => f.uid)].slice(0, 10);
    const qTimeline = query(collection(db, "timeline"), where("uid", "in", allowedUids), orderBy("timestamp", "desc"), limit(20));
    const unsub = onSnapshot(qTimeline, (snap) => {
      setTimeline(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user, friendsData]);

  useEffect(() => {
    if (!user || friendsList.length === 0) { setFriendsData([]); return; }
    const q = query(collection(db, "users"), where("shortId", "in", friendsList));
    const unsub = onSnapshot(q, (s) => setFriendsData(s.docs.map(d => d.data())));
    return () => unsub();
  }, [friendsList, user]);

  const addTimerMinutes = (minutes: number) => {
    const addSeconds = minutes * 60;
    setTimeLeft(prev => prev + addSeconds);
    if (isTimerActive && endTimeRef.current) endTimeRef.current += addSeconds * 1000;
  };

  useEffect(() => {
    if (isTimerActive) {
      if (!endTimeRef.current) endTimeRef.current = Date.now() + timeLeft * 1000;
      timerRef.current = setInterval(() => {
        const remaining = Math.round((endTimeRef.current! - Date.now()) / 1000);
        if (remaining <= 0) {
          setIsTimerActive(false); setTimeLeft(0); endTimeRef.current = null;
          clearInterval(timerRef.current);
          if (audioRef.current) { audioRef.current.volume = 1.0; audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
          setTimerFinished(true);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("⏰ タイマー終了！", { body: "時間になりました。OKを押して止めてください。" });
          }
        } else { setTimeLeft(remaining); }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      endTimeRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerActive]);

  useEffect(() => {
    if (selectedChatFriend && chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [userMessages, selectedChatFriend]);

  const toggleCheck = (time: string, index: number, taskName: string) => {
    const checkId = `${time}_${index}`;
    const isChecked = !checks[checkId];
    const nextChecks = { ...checks, [checkId]: isChecked };
    setChecks(nextChecks);
    saveToFirebase({ checks: nextChecks });
    if (isChecked) postToTimeline(`${taskName} を完了！`);
    else removeFromTimeline(taskName);
  };

  const addTask = (time: string) => {
    if (!newTasks[time]) return;
    const nextTasks = { ...tasks, [time]: [...tasks[time], newTasks[time]] };
    setTasks(nextTasks);
    setNewTasks({ ...newTasks, [time]: "" });
    saveToFirebase({ tasks: nextTasks });
  };

  const updateTaskValue = (time: string, index: number, newValue: string) => {
    const nl = [...tasks[time]]; nl[index] = newValue;
    const nextTasks = { ...tasks, [time]: nl };
    setTasks(nextTasks); saveToFirebase({ tasks: nextTasks }); setEditingTask(null);
  };

  const onDragStart = (e: any, time: string, index: number) => { setDraggedItem({ time, index }); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: any, time: string, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.time !== time || draggedItem.index === index) return;
    const newList = [...tasks[time]];
    const item = newList[draggedItem.index];
    newList.splice(draggedItem.index, 1); newList.splice(index, 0, item);
    setTasks({ ...tasks, [time]: newList }); setDraggedItem({ time, index });
  };
  const onDragEnd = () => { saveToFirebase({ tasks }); setDraggedItem(null); };

  // ② チャット送信：prompt廃止
  const sendMessage = async (customText: string | null = null) => {
    if (!selectedChatFriend) return;
    const msgText = customText || chatInput.trim();
    if (!msgText) return;
    setChatInput("");
    const chatId = [myDisplayId, selectedChatFriend.shortId].sort().join("_");
    const msgObj = {
      id: Date.now(), chatId, fromId: myDisplayId,
      from: displayName || user.displayName, text: msgText,
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), read: false
    };
    const batch = writeBatch(db);
    batch.update(doc(db, "users", selectedChatFriend.uid), { messageHistory: arrayUnion(msgObj) });
    batch.update(doc(db, "users", user.uid), { messageHistory: arrayUnion(msgObj) });
    await batch.commit();
  };

  const deleteMessage = async (messageObj: any) => {
    if (!selectedChatFriend) return;
    const batch = writeBatch(db);
    batch.update(doc(db, "users", user.uid), { messageHistory: arrayRemove(messageObj) });
    batch.update(doc(db, "users", selectedChatFriend.uid), { messageHistory: arrayRemove(messageObj) });
    await batch.commit();
  };

  const handleIconPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoURL(base64); setEmojiIcon("");
      await saveToFirebase({ photoURL: base64, emojiIcon: "" });
      showToast("アイコンを更新しました");
    };
    reader.readAsDataURL(file);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 bg-gray-950">
      <h1 className="text-7xl font-black italic tracking-tighter text-center">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500">ROUTINE MASTER</span>
      </h1>
      <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="mt-12 bg-white text-black px-12 py-5 rounded-full font-black">Googleでログイン</button>
    </div>
  );

  return (
    <div className={`min-h-screen text-white transition-all duration-700 ${currentTheme.bg} flex overflow-hidden font-sans`}>
      <style jsx global>{`
        @keyframes bounce-rich{0%,100%{transform:translateY(0) scale(1,1);}50%{transform:translateY(-15px) scale(0.95,1.05);}}
        @keyframes blink{0%,90%,100%{transform:scaleY(1);}95%{transform:scaleY(0.1);}}
        @keyframes pulse-gold{0%{box-shadow:0 0 0 0 rgba(234,179,8,.4);}70%{box-shadow:0 0 0 20px rgba(234,179,8,0);}100%{box-shadow:0 0 0 0 rgba(234,179,8,0);}}
        @keyframes toast-in{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        .animate-bounce-rich{animation:bounce-rich 2s infinite ease-in-out;}
        .animate-blink{animation:blink 4s infinite;}
        .animate-gold{animation:pulse-gold 1.5s infinite;}
        .animate-toast{animation:toast-in .3s ease;}
        .scrollbar-hide::-webkit-scrollbar{display:none;}
      `}</style>

      {/* ⑩ トースト通知 */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[900] px-6 py-3 rounded-2xl font-black text-[11px] shadow-2xl animate-toast pointer-events-none ${toast.type === "err" ? "bg-red-500 text-white" : "bg-white text-black"}`}>
          {toast.msg}
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* サイドバー */}
      <aside className={`fixed left-0 top-0 h-full w-80 z-[100] transition-transform duration-500 bg-black/40 backdrop-blur-2xl border-r border-white/10 p-6 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-between items-center mb-10">
          <p className="text-[10px] font-black tracking-widest text-gray-500">MENU</p>
          <button onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>
        <section className="bg-white/5 p-4 rounded-[2rem] border border-white/10 mb-4 text-center">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)}>←</button>
            <p className="text-[10px] font-black opacity-50">{currentCalendarDate.getFullYear()}年 {currentCalendarDate.getMonth() + 1}月</p>
            <button onClick={() => changeMonth(1)}>→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2 text-[8px] font-black text-gray-600">{['日','月','火','水','木','金','土'].map(d => <span key={d}>{d}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => (
              <div key={i} className="aspect-square flex items-center justify-center relative">
                {d && <div className={`w-full h-full rounded-lg ${d.date === today ? 'border-2 border-white/40' : ''} ${d.percent === null ? 'bg-white/5' : d.percent >= 80 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : `bg-blue-500/${Math.max(10, d.percent)}`}`}></div>}
                {d && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black">{d.day}</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-2 items-center">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-white/5 rounded"></div><span className="text-[7px] text-gray-500">0%</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500/40 rounded"></div><span className="text-[7px] text-gray-500">~79%</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded"></div><span className="text-[7px] text-gray-500">80%+</span></div>
          </div>
        </section>
        <section className="mb-6 px-2 overflow-y-auto scrollbar-hide">
          <p className="text-[10px] font-black text-gray-500 tracking-widest mb-4 uppercase">Library</p>
          <div className="space-y-2 mb-8">
            {taskLibrary.map((t, i) => (
              <div key={i} className="bg-white/5 p-2 rounded-xl flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold truncate flex-1">{t}</span>
                <div className="flex gap-1">{['朝','昼','晩'].map((label, idx) => (
                  <button key={label} onClick={() => {
                    const timeKey = idx === 0 ? 'morning' : idx === 1 ? 'afternoon' : 'night';
                    const nextTasks = { ...tasks, [timeKey]: [...tasks[timeKey], t] };
                    setTasks(nextTasks); saveToFirebase({ tasks: nextTasks });
                  }} className="w-6 h-6 rounded bg-white/10 text-[8px] font-black hover:bg-white hover:text-black">{label}</button>
                ))}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-4">History</p>
          {history.slice(-5).reverse().map((h, i) => (
            <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl mb-2">
              <span className="text-[10px] text-gray-400 font-bold">{h.date}</span>
              <span className="text-[10px] font-black">{h.percent}%</span>
            </div>
          ))}
        </section>
      </aside>

      <main className="flex-1 overflow-y-auto min-h-screen relative pt-20">
        <header className="fixed top-0 left-0 right-0 z-[50] w-full px-4 py-4 flex justify-between items-center bg-black/20 backdrop-blur-xl border-b border-white/5">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 font-black text-xs px-4">MENU</button>
          <h1 className={`text-xl font-black italic ${currentTheme.title}`}>ROUTINE MASTER</h1>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10">⚙️</button>
        </header>

        <div className="max-w-4xl mx-auto px-4 pb-32">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 my-8 mx-auto w-fit">
            <button onClick={() => setActiveTab("main")} className={`px-8 py-2 rounded-xl text-[10px] font-black transition-all ${activeTab === "main" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}>ホーム</button>
            <button onClick={() => setActiveTab("social")} className={`px-8 py-2 rounded-xl text-[10px] font-black transition-all ${activeTab === "social" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}>交流</button>
          </div>

          {activeTab === "main" ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

                {/* キャラクターカード */}
                <div className="bg-white/5 p-8 rounded-[3.5rem] border border-white/10 flex flex-col items-center justify-center relative shadow-2xl min-h-[350px]">
                  <div className={`absolute top-6 right-8 px-4 py-1.5 rounded-full ${currentAward.bg} shadow-lg z-20`}>
                    <p className={`text-[8px] font-black opacity-60 ${currentAward.color}`}>今日の称号</p>
                    <p className={`text-[10px] font-black ${currentAward.color}`}>称号: {currentAward.name}</p>
                  </div>
                  <div className="absolute top-8 left-10 text-left z-10">
                    <p className="text-[10px] font-black text-white/40 tracking-widest">{now.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', weekday: 'short' })}</p>
                    <p className="text-2xl font-black italic tabular-nums">{now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="mb-8 relative mt-12">
                    <div className="bg-white text-black px-6 py-4 rounded-[1.8rem] shadow-xl relative text-center">
                      <p className="text-[11px] font-black leading-relaxed">{characterMessage}</p>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"></div>
                    </div>
                  </div>
                  <div className={`w-36 h-36 rounded-full ${currentChar.color} shadow-2xl flex flex-col items-center justify-center animate-bounce-rich relative transition-all duration-700 ${percent === 100 ? 'animate-gold' : ''} overflow-hidden`}>
                    {photoURL ? (
                      <img src={photoURL} alt="icon" className="w-full h-full object-cover" />
                    ) : emojiIcon ? (
                      <span className="text-5xl">{emojiIcon}</span>
                    ) : (
                      <>
                        <div className="flex gap-8 mb-4 animate-blink">
                          {percent === 100 ? (<><span className="text-4xl">💎</span><span className="text-4xl">💎</span></>)
                            : percent >= 80 ? (<><div className="w-5 h-6 bg-white rounded-full relative overflow-hidden"><div className="w-2.5 h-2.5 bg-black rounded-full absolute bottom-1 left-1"></div></div><div className="w-5 h-6 bg-white rounded-full relative overflow-hidden"><div className="w-2.5 h-2.5 bg-black rounded-full absolute bottom-1 left-1"></div></div></>)
                            : percent >= 50 ? (<><div className="w-5 h-5 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div><div className="w-5 h-5 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div></>)
                            : (<><div className="w-5 h-1 bg-black/40 rounded-full"></div><div className="w-5 h-1 bg-black/40 rounded-full"></div></>)}
                        </div>
                        <div className={`transition-all duration-500 bg-white/30 rounded-full ${percent === 100 ? 'w-12 h-8 rounded-b-full bg-white/40' : percent >= 50 ? 'w-10 h-5 rounded-b-full' : 'w-8 h-1'}`}></div>
                      </>
                    )}
                  </div>
                  {/* ⑨ 継続記録 + 説明 */}
                  <p className="mt-4 text-[10px] font-bold text-gray-400 italic">継続中: {streakCount}日 🔥</p>
                  <p className="text-[8px] text-gray-600 font-black mt-1 uppercase tracking-widest">80%以上達成した日が連続するとカウント</p>
                </div>

                <div className="flex flex-col gap-4">
                  {/* ランク・グラフカード */}
                  <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex-1 flex flex-col justify-between shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">週間ランク (直近7日平均)</p>
                        <span className={`text-[8px] font-black px-3 py-1 rounded-full ${currentRank.bg} ${currentRank.color}`}>RANK: {currentRank.name}</span>
                        <p className="text-[10px] font-black text-gray-500 mt-2 uppercase tracking-widest">Week Avg: {lastWeekAvg}%</p>
                        <p className="text-[8px] font-black text-gray-600 mt-3 mb-1 uppercase tracking-widest">今日の達成率</p>
                        <h2 className="text-3xl font-black mt-1">Today: {percent}%</h2>
                        {/* ④ プログレスバー */}
                        <div className="mt-2 w-40 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                      <div className="text-[7px] font-black space-y-0.5 text-gray-500 border-l border-white/10 pl-3">
                        <p className="mb-1 text-white opacity-50">RANK (Week Avg)</p>
                        {RANK_LIST.map(r => <div key={r.name} className={lastWeekAvg >= r.min ? "text-white opacity-100" : "opacity-30"}>{r.name}: {r.min}%+</div>)}
                      </div>
                    </div>
                    <div className="h-28 w-full bg-black/20 rounded-2xl p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="displayDate" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <YAxis hide domain={[0, 100]} />
                          <Line type="monotone" dataKey="percent" stroke="#3b82f6" strokeWidth={4} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ⑤ タイマーカード：円形プログレス */}
                  <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-lg">
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-2">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                            <circle cx="40" cy="40" r="34" fill="none"
                              stroke={isTimerActive ? "#3b82f6" : "rgba(255,255,255,0.3)"}
                              strokeWidth="6"
                              strokeDasharray={`${2 * Math.PI * 34}`}
                              strokeDashoffset={`${2 * Math.PI * 34 * (1 - Math.min(timeLeft / 3600, 1))}`}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm font-mono font-black tabular-nums">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => setIsTimerActive(!isTimerActive)} className={`px-4 py-2 text-[9px] font-black rounded-full ${isTimerActive ? "bg-red-500" : "bg-white text-black"}`}>{isTimerActive ? "停止" : "開始"}</button>
                          <button onClick={() => { setIsTimerActive(false); setTimeLeft(0); }} className="px-4 py-2 text-[9px] font-black rounded-full bg-white/10 border border-white/10">クリア</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[1, 5, 10, 15, 20, 30].map(m => (
                          <button key={m} onClick={() => addTimerMinutes(m)} className="text-[8px] font-black border border-white/10 w-9 py-2 rounded-xl hover:bg-white hover:text-black">+{m}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* タスクカード */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {(["morning", "afternoon", "night"] as const).map((time, ti) => {
                  const tp = timeProgress[ti];
                  return (
                    <div key={time} className="bg-white/5 p-7 rounded-[3rem] border border-white/10 shadow-xl flex flex-col h-auto min-h-[400px]">
                      {/* ⑧ 時間帯別ヘッダー＋件数 */}
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] opacity-40">
                          {time === 'morning' ? 'MORNING' : time === 'afternoon' ? 'AFTERNOON' : 'NIGHT'}
                        </h2>
                        {tp.total > 0 && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${tp.done === tp.total ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                            {tp.done}/{tp.total}
                          </span>
                        )}
                      </div>
                      {/* ④ 時間帯別プログレスバー */}
                      {tp.total > 0 && (
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-4">
                          <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.round(tp.done / tp.total * 100)}%` }}></div>
                        </div>
                      )}
                      <div className="space-y-4 flex-1">
                        {tasks[time].map((task, index) => (
                          <div key={index} draggable onDragStart={(e) => onDragStart(e, time, index)} onDragOver={(e) => onDragOver(e, time, index)} onDragEnd={onDragEnd}
                            className={`flex items-center ${draggedItem?.index === index && draggedItem?.time === time ? 'opacity-30' : ''}`}>
                            <div className="cursor-grab active:cursor-grabbing mr-2 opacity-20 hover:opacity-100 font-mono text-[10px] shrink-0">::</div>
                            <button onClick={() => toggleCheck(time, index, task)}
                              className={`w-6 h-6 mr-3 rounded-lg border-2 border-white/10 flex items-center justify-center transition-all shrink-0 ${checks[`${time}_${index}`] ? "bg-emerald-500 border-none shadow-lg scale-110" : "bg-black/20"}`}>
                              {checks[`${time}_${index}`] && <span className="text-[10px] font-black">✓</span>}
                            </button>
                            {editingTask?.time === time && editingTask?.index === index ? (
                              <input autoFocus className="flex-1 bg-white/10 text-sm font-bold p-1 rounded outline-none"
                                value={editingTask.value}
                                onChange={(e) => setEditingTask({ ...editingTask, value: e.target.value })}
                                onBlur={() => updateTaskValue(time, index, editingTask.value)}
                                onKeyDown={(e) => e.key === 'Enter' && updateTaskValue(time, index, editingTask.value)} />
                            ) : (
                              <span onClick={() => setEditingTask({ time, index, value: task })}
                                className={`flex-1 text-sm font-bold cursor-text ${checks[`${time}_${index}`] ? 'opacity-20 line-through' : 'text-gray-200'}`}>
                                {task.startsWith('!') ? <span className="text-orange-400 font-black">🌟 {task.substring(1)}</span> : task}
                              </span>
                            )}
                            {/* ① 削除ボタン：常時薄く表示、タップで削除（スマホ対応） */}
                            <button onClick={() => {
                              const nl = [...tasks[time]]; nl.splice(index, 1);
                              setTasks({ ...tasks, [time]: nl });
                              saveToFirebase({ tasks: { ...tasks, [time]: nl } });
                            }} className="ml-2 text-red-500/30 hover:text-red-500 active:text-red-400 p-1 text-[12px] transition-colors shrink-0">✕</button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button onClick={() => { const val = newTasks[time] || ""; setNewTasks({ ...newTasks, [time]: val.startsWith("!") ? val.substring(1) : "!" + val }); }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 ${newTasks[time]?.startsWith("!") ? "bg-orange-500 border-orange-300" : "bg-white/5 border-white/10 opacity-40"}`}>🌟</button>
                          <input value={newTasks[time]} onChange={(e) => setNewTasks({ ...newTasks, [time]: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && addTask(time)}
                            className="flex-1 bg-black/40 text-[11px] p-3 rounded-xl border border-white/5 outline-none" placeholder="習慣を入力..." />
                        </div>
                        <button onClick={() => addTask(time)} className="w-full bg-white text-black py-3 rounded-xl font-black text-[10px] shadow-lg">追加</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* ⑥ Achievement Log：アイコンをphotoURL/emojiIcon/カラーで表示 */}
              <section>
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Achievement Log</p>
                </div>
                <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-6 shadow-2xl">
                  <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                    {timeline.map((log) => (
                      <div key={log.id} className="flex gap-4 items-start bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden">
                          {log.photoURL
                            ? <img src={log.photoURL} alt="icon" className="w-full h-full object-cover rounded-full" />
                            : log.emojiIcon
                            ? <div className={`w-full h-full rounded-full ${CHARACTERS[log.charIndex || 0].color} flex items-center justify-center text-lg`}>{log.emojiIcon}</div>
                            : <div className={`w-full h-full rounded-full ${CHARACTERS[log.charIndex || 0].color} flex items-center justify-center text-[10px]`}>✨</div>
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-gray-400">{log.displayName} <span className="text-gray-600 font-bold ml-1">@{log.shortId}</span></span>
                            <span className="text-[8px] text-gray-700 font-black">{log.timestamp?.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-200">{log.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Friends */}
              <section>
                <div className="flex items-center gap-3 mb-4 px-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Friends</p>
                </div>
                <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex gap-2 mb-6">
                  <input value={friendIdInput} onChange={(e) => setFriendIdInput(e.target.value)}
                    className="flex-1 bg-black/40 text-[11px] p-4 rounded-xl border border-white/5 outline-none font-bold" placeholder="友達の8桁IDを入力..." />
                  <button onClick={async () => {
                    const id = friendIdInput.trim();
                    if (!id || id === myDisplayId) return;
                    const q = query(collection(db, "users"), where("shortId", "==", id));
                    const snap = await getDocs(q);
                    if (snap.empty) { showToast("見つかりません", "err"); }
                    else {
                      const target = snap.docs[0];
                      const nl = [...friendsList, id];
                      setFriendsList(nl); await saveToFirebase({ friendsList: nl });
                      await updateDoc(doc(db, "users", target.id), { friends: arrayUnion(myDisplayId) });
                      setFriendIdInput("");
                      showToast("友達を追加しました！");
                    }
                  }} className="bg-white text-black px-6 rounded-xl font-black text-[10px]">追加</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friendsData.map((f, i) => {
                    const isOnline = f.lastActive && (Date.now() - f.lastActive < 120000);
                    const unread = userMessages.filter(m => m.chatId === [myDisplayId, f.shortId].sort().join("_") && m.fromId !== myDisplayId && !m.read).length;
                    const friendRank = RANK_LIST.find(r => (f.avg || 0) >= r.min) || RANK_LIST[4];
                    const friendAward = DAILY_AWARDS.find(a => (f.percent || 0) >= a.min) || DAILY_AWARDS[4];
                    const charColor = CHARACTERS[f.charIndex || 0];
                    return (
                      <div key={i} className="bg-white/5 p-6 rounded-[3rem] border border-white/10 relative shadow-2xl transition-transform hover:scale-[1.02] overflow-hidden">
                        <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${charColor.accent} opacity-80`}></div>
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full ${charColor.color} flex items-center justify-center shadow-lg relative overflow-hidden shrink-0`}>
                            {f.photoURL ? <img src={f.photoURL} alt="icon" className="w-full h-full object-cover" />
                              : f.emojiIcon ? <span className="text-2xl">{f.emojiIcon}</span>
                              : <div className="flex gap-1.5"><div className="w-2 h-2 bg-white rounded-full" /><div className="w-2 h-2 bg-white rounded-full" /></div>}
                            {isOnline && <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}
                            {unread > 0 && <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-black animate-pulse">{unread}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black truncate">{f.displayName}</h3>
                            <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                              <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${friendRank.bg} ${friendRank.color}`}>RANK: {friendRank.name}</span>
                              <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${friendAward.bg} ${friendAward.color}`}>称号: {friendAward.name}</span>
                              <span className="text-[10px] font-black text-orange-400">🔥 {f.streak || 0}日</span>
                            </div>
                            <div className="flex items-end gap-3 mt-1">
                              <span className="text-3xl font-black">{f.percent || 0}%</span>
                              <span className="text-[8px] font-black text-gray-500 mb-1">AVG: {f.avg || 0}%</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <button onClick={() => setSelectedChatFriend(f)} className="bg-white text-black w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-xl">💬</button>
                            <button onClick={async () => {
                              const nl = friendsList.filter(id => id !== f.shortId);
                              setFriendsList(nl); await saveToFirebase({ friendsList: nl });
                              await updateDoc(doc(db, "users", f.uid), { friends: arrayRemove(myDisplayId) });
                              showToast("友達を削除しました");
                            }} className="bg-red-500/20 text-red-500 w-10 h-10 rounded-xl text-xs flex items-center justify-center">✕</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* ② チャット画面：インライン入力欄 + クイック返信 */}
      {selectedChatFriend && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
          <header className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
            <button onClick={() => setSelectedChatFriend(null)} className="text-xl">←</button>
            <div className="text-center">
              <span className="font-black block">{selectedChatFriend.displayName}</span>
              {selectedChatFriend.lastActive && (Date.now() - selectedChatFriend.lastActive < 120000) && (
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">● Active Now</span>
              )}
            </div>
            <div className="w-6"></div>
          </header>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {userMessages.filter(m => m.chatId === [myDisplayId, selectedChatFriend.shortId].sort().join("_")).map((m, i) => (
              <div key={i} className={`flex ${m.fromId === myDisplayId ? 'justify-end' : 'justify-start'}`}>
                <div className="group relative max-w-[75%]">
                  <div className={`p-4 rounded-[1.8rem] text-sm font-bold shadow-md ${m.fromId === myDisplayId ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-zinc-800 text-gray-200 rounded-tl-none'}`}>
                    {m.text}
                    <p className={`text-[7px] mt-1 opacity-40`}>{m.time}</p>
                  </div>
                  {m.fromId === myDisplayId && (
                    <button onClick={() => deleteMessage(m)} className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-400">🗑️</button>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef}></div>
          </div>
          <footer className="p-4 border-t border-white/10 bg-black/40 shrink-0">
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {["🔥 お疲れ様！", "👏 すごい！", "💪 頑張れ！", "😊 いいね！"].map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="shrink-0 bg-white/5 border border-white/10 text-gray-300 px-4 py-2 rounded-xl font-black text-[10px] whitespace-nowrap hover:bg-white/20">{q}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="メッセージを入力..."
                className="flex-1 bg-white/10 text-sm font-bold p-3 rounded-2xl border border-white/10 outline-none placeholder:text-gray-600" />
              <button onClick={() => sendMessage()} className="bg-white text-black px-5 rounded-2xl font-black text-[10px] shrink-0">送信</button>
            </div>
          </footer>
        </div>
      )}

      {/* Settings */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-zinc-900 w-full max-w-md rounded-[3rem] border border-white/10 p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-6 right-6 text-gray-500">✕</button>
            <h2 className="text-xl font-black italic mb-8 uppercase tracking-widest">Settings</h2>
            <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
              <section>
                <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-4">Name</p>
                <div className="flex gap-2">
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="flex-1 bg-black/40 text-[11px] p-4 rounded-xl border border-white/5 outline-none font-bold" />
                  <button onClick={async () => {
                    if (!user || !displayName.trim()) return;
                    await updateProfile(auth.currentUser, { displayName: displayName.trim() });
                    await saveToFirebase({ displayName: displayName.trim() });
                    showToast("名前を更新しました");
                  }} className="bg-white text-black px-6 rounded-xl font-black text-[10px]">保存</button>
                </div>
              </section>
              <section>
                <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-4">Your ID</p>
                <div className="bg-black/40 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                  <span className="font-mono font-black tracking-wider text-blue-400">{myDisplayId}</span>
                  <button onClick={() => { navigator.clipboard.writeText(myDisplayId); showToast("IDをコピーしました"); }} className="text-[10px] font-black bg-white/5 px-3 py-1 rounded-lg">COPY</button>
                </div>
              </section>
              <section>
                <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-4">Icon</p>
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-16 h-16 rounded-full ${CHARACTERS[charIndex].color} flex items-center justify-center overflow-hidden shadow-lg shrink-0`}>
                    {photoURL ? <img src={photoURL} alt="icon" className="w-full h-full object-cover" />
                      : emojiIcon ? <span className="text-2xl">{emojiIcon}</span>
                      : <div className="flex gap-1.5"><div className="w-2 h-2 bg-white rounded-full" /><div className="w-2 h-2 bg-white rounded-full" /></div>}
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-gray-500 mb-2 uppercase tracking-widest">現在のアイコン</p>
                    {(photoURL || emojiIcon) && (
                      <button onClick={() => { setPhotoURL(""); setEmojiIcon(""); saveToFirebase({ photoURL: "", emojiIcon: "" }); showToast("リセットしました"); }}
                        className="text-[8px] font-black bg-red-500/20 text-red-400 px-3 py-1 rounded-lg">リセット</button>
                    )}
                  </div>
                </div>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">📷 写真を使う</p>
                <input ref={iconFileRef} type="file" accept="image/*" className="hidden" onChange={handleIconPhotoUpload} />
                <button onClick={() => iconFileRef.current?.click()} className="w-full bg-white/5 border border-white/10 py-3 rounded-xl font-black text-[10px] mb-5 hover:bg-white hover:text-black transition-all">カメラロールから選択</button>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">😊 絵文字アイコン</p>
                <div className="grid grid-cols-8 gap-1.5 mb-5">
                  {EMOJI_ICONS.map((emoji) => (
                    <button key={emoji} onClick={() => { setEmojiIcon(emoji); setPhotoURL(""); saveToFirebase({ emojiIcon: emoji, photoURL: "" }); showToast("アイコンを変更しました"); }}
                      className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${emojiIcon === emoji && !photoURL ? 'bg-white scale-110 shadow-lg' : 'bg-white/5 hover:bg-white/20'}`}>{emoji}</button>
                  ))}
                </div>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">🎨 カラーキャラクター</p>
                <div className="grid grid-cols-6 gap-2">
                  {CHARACTERS.map((c, i) => (
                    <button key={c.id} onClick={() => { setCharIndex(i); setPhotoURL(""); setEmojiIcon(""); saveToFirebase({ charIndex: i, photoURL: "", emojiIcon: "" }); }}
                      className={`aspect-square rounded-full ${c.color} border-2 transition-all ${charIndex === i && !photoURL && !emojiIcon ? 'border-white scale-110' : 'border-transparent opacity-40'}`}></button>
                  ))}
                </div>
              </section>
              {/* ⑦ テーマ：名前ラベル付き */}
              <section>
                <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-2">Theme</p>
                <p className="text-[9px] font-black text-gray-400 mb-3 h-4">{hoveredTheme !== null ? THEMES[hoveredTheme].name : themeIndex !== null ? THEMES[themeIndex].name : ""}</p>
                <div className="grid grid-cols-7 gap-2">
                  {THEMES.map((t, i) => (
                    <button key={i}
                      onClick={() => { setThemeIndex(i); saveToFirebase({ themeIndex: i }); }}
                      onMouseEnter={() => setHoveredTheme(i)}
                      onMouseLeave={() => setHoveredTheme(null)}
                      onTouchStart={() => setHoveredTheme(i)}
                      onTouchEnd={() => setHoveredTheme(null)}
                      className={`aspect-square rounded-lg ${t.bg} border-2 transition-all relative ${themeIndex === i ? 'border-white scale-110' : 'border-transparent opacity-40'}`}>
                      {themeIndex === i && <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-black drop-shadow">✓</span>}
                    </button>
                  ))}
                </div>
              </section>
              <button onClick={() => signOut(auth)} className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl font-black text-[11px] uppercase border border-red-500/20">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* タイマー完了モーダル */}
      {timerFinished && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="bg-white text-black p-8 rounded-[3rem] max-w-xs w-full shadow-2xl text-center">
            <span className="text-6xl mb-4 block animate-bounce">⏰</span>
            <h2 className="text-2xl font-black mb-2 italic tracking-tighter">時間です！</h2>
            <p className="text-[11px] font-black text-gray-400 mb-8 uppercase tracking-widest">タイマーが終了しました</p>
            <button onClick={() => { setTimerFinished(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } }}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] shadow-xl">OK</button>
          </div>
        </div>
      )}

      {/* チュートリアル */}
      {showTutorial && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="bg-white text-black p-8 rounded-[3rem] max-w-sm w-full shadow-2xl animate-bounce-rich">
            <button onClick={closeTutorial} className="absolute top-6 right-8 text-2xl font-black text-gray-300 hover:text-black">✕</button>
            <div className="text-center">
              <span className="text-5xl mb-6 block">🚀</span>
              <h2 className="text-2xl font-black mb-4 italic tracking-tighter">ROUTINE MASTERへようこそ！</h2>
              <div className="space-y-4 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest mb-8 border-y border-gray-100 py-6">
                <p className="flex items-center gap-3"><span className="text-blue-500">01</span> タスクを追加してチェックしよう</p>
                <p className="flex items-center gap-3"><span className="text-blue-500">02</span> キャラクターがあなたの頑張りを応援</p>
                <p className="flex items-center gap-3"><span className="text-blue-500">03</span> 友達をフォローして競い合おう</p>
              </div>
              <button onClick={closeTutorial} className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl">START TRAINING</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
