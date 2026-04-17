"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, onSnapshot, query, where, updateDoc, arrayUnion, writeBatch, getDocs, arrayRemove, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
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
  { name: "Passion",      color: "#ef4444", bg: "bg-red-500",      title: "text-white" },
  { name: "Soft Red",     color: "#fca5a5", bg: "bg-red-300",      title: "text-red-950" },
  { name: "Rose",         color: "#fb7185", bg: "bg-rose-400",     title: "text-white" },
  { name: "Deep Red",     color: "#7f1d1d", bg: "bg-red-950",      title: "text-white" },
  { name: "Pink",         color: "#ec4899", bg: "bg-pink-500",     title: "text-white" },
  { name: "Blush",        color: "#fbcfe8", bg: "bg-pink-200",     title: "text-pink-950" },
  { name: "Hot Pink",     color: "#db2777", bg: "bg-pink-600",     title: "text-white" },
  { name: "Deep Pink",    color: "#831843", bg: "bg-pink-950",     title: "text-white" },
  { name: "Sun",          color: "#f97316", bg: "bg-orange-500",   title: "text-white" },
  { name: "Apricot",      color: "#fdba74", bg: "bg-orange-300",   title: "text-orange-950" },
  { name: "Deep Orange",  color: "#9a3412", bg: "bg-orange-900",   title: "text-white" },
  { name: "Amber",        color: "#f59e0b", bg: "bg-amber-500",    title: "text-white" },
  { name: "Lemon",        color: "#facc15", bg: "bg-yellow-400",   title: "text-yellow-950" },
  { name: "Cream",        color: "#fef9c3", bg: "bg-yellow-100",   title: "text-yellow-950" },
  { name: "Gold",         color: "#ca8a04", bg: "bg-yellow-600",   title: "text-white" },
  { name: "Honey",        color: "#d97706", bg: "bg-amber-600",    title: "text-white" },
  { name: "Emerald",      color: "#10b981", bg: "bg-emerald-500",  title: "text-white" },
  { name: "Mint",         color: "#a7f3d0", bg: "bg-emerald-200",  title: "text-emerald-950" },
  { name: "Forest",       color: "#064e3b", bg: "bg-emerald-950",  title: "text-white" },
  { name: "Lime",         color: "#84cc16", bg: "bg-lime-500",     title: "text-white" },
  { name: "Sage",         color: "#bbf7d0", bg: "bg-green-200",    title: "text-green-950" },
  { name: "Deep Green",   color: "#14532d", bg: "bg-green-950",    title: "text-white" },
  { name: "Teal",         color: "#14b8a6", bg: "bg-teal-500",     title: "text-white" },
  { name: "Cyan",         color: "#06b6d4", bg: "bg-cyan-500",     title: "text-white" },
  { name: "Sky Blue",     color: "#3b82f6", bg: "bg-blue-500",     title: "text-white" },
  { name: "Pale Blue",    color: "#dbeafe", bg: "bg-blue-100",     title: "text-blue-950" },
  { name: "Ocean",        color: "#1e3a8a", bg: "bg-blue-900",     title: "text-white" },
  { name: "Baby Blue",    color: "#7dd3fc", bg: "bg-sky-300",      title: "text-sky-950" },
  { name: "Deep Sky",     color: "#0ea5e9", bg: "bg-sky-500",      title: "text-white" },
  { name: "Navy",         color: "#1e40af", bg: "bg-blue-800",     title: "text-white" },
  { name: "Indigo",       color: "#6366f1", bg: "bg-indigo-500",   title: "text-white" },
  { name: "Lavender",     color: "#c7d2fe", bg: "bg-indigo-200",   title: "text-indigo-950" },
  { name: "Midnight",     color: "#312e81", bg: "bg-indigo-950",   title: "text-white" },
  { name: "Grape",        color: "#a855f7", bg: "bg-purple-500",   title: "text-white" },
  { name: "Lilac",        color: "#f3e8ff", bg: "bg-purple-100",   title: "text-purple-950" },
  { name: "Dark Purple",  color: "#581c87", bg: "bg-purple-950",   title: "text-white" },
  { name: "Violet",       color: "#8b5cf6", bg: "bg-violet-500",   title: "text-white" },
  { name: "Mauve",        color: "#ddd6fe", bg: "bg-violet-200",   title: "text-violet-950" },
  { name: "Fuchsia",      color: "#d946ef", bg: "bg-fuchsia-500",  title: "text-white" },
  { name: "Ash",          color: "#6b7280", bg: "bg-gray-500",     title: "text-white" },
  { name: "Silver",       color: "#e5e7eb", bg: "bg-gray-200",     title: "text-gray-950" },
  { name: "Charcoal",     color: "#374151", bg: "bg-gray-700",     title: "text-white" },
  { name: "Obsidian",     color: "#111827", bg: "bg-gray-950",     title: "text-white" },
  { name: "Zinc",         color: "#71717a", bg: "bg-zinc-500",     title: "text-white" },
  { name: "Stone",        color: "#78716c", bg: "bg-stone-500",    title: "text-white" },
  { name: "Slate",        color: "#64748b", bg: "bg-slate-500",    title: "text-white" },
  { name: "Deep Slate",   color: "#0f172a", bg: "bg-slate-950",    title: "text-white" },
];

const ALARM_SOUNDS = [
  { id: "bell",     label: "🔔 ベル",       url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" },
  { id: "digital",  label: "⏰ デジタル",    url: "https://assets.mixkit.co/active_storage/sfx/988/988-preview.mp3" },
  { id: "marimba",  label: "🎶 マリンバ",    url: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3" },
  { id: "chime",    label: "🎵 チャイム",    url: "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3" },
  { id: "rooster",  label: "🚢 汽笛",        url: "https://assets.mixkit.co/active_storage/sfx/608/608-preview.mp3" },
  { id: "gentle",   label: "🎠 オルゴール",  url: "https://soundbible.com/grab.php?id=1619&type=mp3" },
];

const YEAR_SUBS = [
  { key: "yearMotto",     label: "モットー",  icon: "✨", desc: "今年の総合的な目標" },
  { key: "yearSpiritual", label: "霊的",      icon: "🙏", desc: "信仰・精神・内面" },
  { key: "yearIntellect", label: "知的",      icon: "📚", desc: "学習・スキルアップ" },
  { key: "yearSocial",    label: "社会的",    icon: "🤝", desc: "人間関係・貢献" },
  { key: "yearPhysical",  label: "身体的",    icon: "💪", desc: "健康・運動・体" },
];

// --- 目標入力フィールド ---
function GoalInputField({ gkey, placeholder, multiline, currentValue, onSave, onCancel }) {
  const [localVal, setLocalVal] = React.useState(currentValue || "");
  const handleSave = () => onSave(gkey, localVal);
  const commonCls = "flex-1 bg-white/10 text-sm font-semibold px-3 py-2 rounded-xl border border-white/15 outline-none placeholder:text-gray-500 focus:border-white/30 transition-colors";
  return (
    <div className="flex gap-2 mt-1 items-start">
      {multiline ? (
        <textarea autoFocus value={localVal} onChange={e => setLocalVal(e.target.value)} rows={2}
          className={commonCls + " resize-none w-full"} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Escape') onCancel(); }} />
      ) : (
        <input autoFocus value={localVal} onChange={e => setLocalVal(e.target.value)}
          className={commonCls} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }} />
      )}
      <button onMouseDown={e => { e.preventDefault(); handleSave(); }}
        className="bg-white text-black px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 hover:bg-gray-100 transition-colors">保存</button>
      <button onMouseDown={e => { e.preventDefault(); onCancel(); }}
        className="bg-white/10 text-gray-400 px-3 py-1.5 rounded-xl font-bold text-[10px] shrink-0 hover:bg-white/20 transition-colors">✕</button>
    </div>
  );
}

function GoalRow({ gkey, placeholder, multiline, goals, editingGoal, setEditingGoal, onSave, isLight, tx, txMuted }) {
  const val = goals[gkey] || "";
  if (editingGoal === gkey) {
    return <GoalInputField gkey={gkey} placeholder={placeholder} multiline={multiline}
      currentValue={val} onSave={onSave} onCancel={() => setEditingGoal(null)} />;
  }
  return (
    <p onClick={() => setEditingGoal(gkey)}
      className={`text-sm font-medium leading-snug mt-1 cursor-text rounded-lg px-2 py-1.5 -mx-2 transition-all ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/8'} ${val ? tx : (isLight ? 'text-gray-400 italic' : 'text-gray-600 italic')}`}>
      {val || `タップして${placeholder}`}
    </p>
  );
}

// --- 旅行バケットリスト セクション ---
const TRAVEL_SLOT_COLORS = ["#f97316","#3b82f6","#10b981","#a855f7","#ec4899"];
const TRAVEL_SLOT_ICONS  = ["✈️","🗺️","🏔️","🌊","🌆"];

function TravelSection({ goals, saveToFirebase, setGoals, isLight, tx, txMuted }) {
  const [editingField, setEditingField] = React.useState(null); // "place_N" | "budget_N" | "how_N" | "how_method"
  const [tempVal, setTempVal] = React.useState("");

  const get = (key) => goals[key] || "";
  const save = (key, value) => {
    const next = { ...goals, [key]: value };
    setGoals(next);
    saveToFirebase({ goals: next });
    setEditingField(null);
  };

  const startEdit = (key, currentVal) => {
    setEditingField(key);
    setTempVal(currentVal || "");
  };

  const cardBg   = isLight ? "rgba(0,0,0,0.04)"  : "rgba(255,255,255,0.04)";
  const cardBd   = isLight ? "rgba(0,0,0,0.08)"  : "rgba(255,255,255,0.1)";
  const innerBg  = isLight ? "rgba(0,0,0,0.04)"  : "rgba(0,0,0,0.2)";
  const inputCls = `w-full text-sm font-medium px-3 py-2 rounded-xl border outline-none resize-none transition-colors ${tx} ${isLight ? "bg-black/5 border-black/12 placeholder:text-gray-400 focus:border-black/25" : "bg-white/8 border-white/10 placeholder:text-gray-600 focus:border-white/25"}`;

  // 合計予算
  const totalBudget = [0,1,2,3,4].reduce((sum, i) => {
    const raw = get(`travel_budget_${i}`).replace(/[^0-9]/g, '');
    return sum + (parseInt(raw) || 0);
  }, 0);
  const fmtYen = (n) => n > 0 ? `¥${n.toLocaleString()}` : "";

  return (
    <div className="rounded-[2rem] overflow-hidden shadow-xl" style={{background: cardBg, border: `1px solid ${cardBd}`}}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-[9px] font-black uppercase tracking-widest ${txMuted}`}>✈️ BUCKET LIST TRAVEL</p>
          {totalBudget > 0 && (
            <span className="text-[9px] font-black text-amber-400">合計 {fmtYen(totalBudget)}</span>
          )}
        </div>
        <p className={`text-[8px] font-medium mb-4 ${txMuted}`}>行きたい場所トップ5・予算・稼ぎ方を記入</p>
      </div>

      {/* 場所リスト */}
      <div className="px-4 pb-4 space-y-3">
        {[0,1,2,3,4].map((i) => {
          const placeKey  = `travel_place_${i}`;
          const budgetKey = `travel_budget_${i}`;
          const howKey    = `travel_how_${i}`;
          const place  = get(placeKey);
          const budget = get(budgetKey);
          const how    = get(howKey);
          const color  = TRAVEL_SLOT_COLORS[i];
          const icon   = TRAVEL_SLOT_ICONS[i];
          const filled = place || budget || how;

          return (
            <div key={i} className="rounded-2xl overflow-hidden transition-all"
              style={{background: innerBg, border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)"}`, borderLeft: `3px solid ${color}`}}>
              {/* 行き先ヘッダー行 */}
              <div className="px-3 pt-3 pb-2 flex items-center gap-2">
                <span className="text-base shrink-0">{icon}</span>
                <span className="text-[10px] font-black shrink-0" style={{color}}>#{i+1}</span>
                {editingField === placeKey ? (
                  <input autoFocus value={tempVal} onChange={e => setTempVal(e.target.value)}
                    className={inputCls + " flex-1 text-[13px]"}
                    placeholder="行きたい場所を入力..."
                    onKeyDown={e => { if (e.key === 'Enter') save(placeKey, tempVal); if (e.key === 'Escape') setEditingField(null); }}
                    onBlur={() => save(placeKey, tempVal)} />
                ) : (
                  <p onClick={() => startEdit(placeKey, place)}
                    className={`flex-1 text-[13px] font-bold cursor-text rounded-lg px-2 py-0.5 -mx-1 transition-all ${isLight ? "hover:bg-black/5" : "hover:bg-white/5"} ${place ? tx : (isLight ? "text-gray-400 italic" : "text-gray-600 italic")}`}>
                    {place || "タップして入力..."}
                  </p>
                )}
                {filled && <span className="text-[8px] text-green-400 font-black shrink-0">✓</span>}
              </div>

              {/* 予算 + 稼ぎ方 */}
              <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                {/* 予算 */}
                <div>
                  <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${txMuted}`}>💰 予算</p>
                  {editingField === budgetKey ? (
                    <input autoFocus value={tempVal} onChange={e => setTempVal(e.target.value)}
                      className={inputCls + " text-[12px]"}
                      placeholder="例: 300000"
                      onKeyDown={e => { if (e.key === 'Enter') save(budgetKey, tempVal); if (e.key === 'Escape') setEditingField(null); }}
                      onBlur={() => save(budgetKey, tempVal)} />
                  ) : (
                    <p onClick={() => startEdit(budgetKey, budget)}
                      className={`text-[12px] font-bold cursor-text rounded px-2 py-1.5 transition-all ${isLight ? "hover:bg-black/5" : "hover:bg-white/5"} ${budget ? "text-amber-400" : (isLight ? "text-gray-400 italic" : "text-gray-600 italic")}`}>
                      {budget ? (budget.replace(/[^0-9]/g,'') ? `¥${parseInt(budget.replace(/[^0-9]/g,'')).toLocaleString()}` : budget) : "未設定"}
                    </p>
                  )}
                </div>

                {/* 稼ぎ方 */}
                <div>
                  <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${txMuted}`}>🔑 稼ぎ方</p>
                  {editingField === howKey ? (
                    <textarea autoFocus value={tempVal} onChange={e => setTempVal(e.target.value)}
                      className={inputCls + " text-[12px]"} rows={2}
                      placeholder="例: 副業・節約..."
                      onKeyDown={e => { if (e.key === 'Escape') setEditingField(null); }}
                      onBlur={() => save(howKey, tempVal)} />
                  ) : (
                    <p onClick={() => startEdit(howKey, how)}
                      className={`text-[12px] font-medium cursor-text rounded px-2 py-1.5 leading-snug transition-all ${isLight ? "hover:bg-black/5" : "hover:bg-white/5"} ${how ? tx : (isLight ? "text-gray-400 italic" : "text-gray-600 italic")}`}>
                      {how || "未設定"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 共通の稼ぎ方メモ */}
        <div className="rounded-2xl p-4 mt-1" style={{background: innerBg, border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)"}`}}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${txMuted}`}>📋 稼ぎ方・資金計画メモ</p>
          {editingField === "travel_plan" ? (
            <textarea autoFocus value={tempVal} onChange={e => setTempVal(e.target.value)}
              className={inputCls} rows={4}
              placeholder="全体的な資金計画・稼ぎ方の戦略を書こう..."
              onKeyDown={e => { if (e.key === 'Escape') setEditingField(null); }}
              onBlur={() => save("travel_plan", tempVal)} />
          ) : (
            <p onClick={() => startEdit("travel_plan", get("travel_plan"))}
              className={`text-sm font-medium cursor-text rounded-lg px-2 py-2 leading-relaxed transition-all ${isLight ? "hover:bg-black/5" : "hover:bg-white/5"} ${get("travel_plan") ? tx : (isLight ? "text-gray-400 italic" : "text-gray-600 italic")}`}>
              {get("travel_plan") || "タップして資金計画・稼ぎ方を記入..."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- 目標セクション ---
function GoalSection({ now, goals, editingGoal, setEditingGoal, yearGoalOpen, setYearGoalOpen, saveToFirebase, setGoals, isLight, tx, txMuted }) {
  const [goalTab, setGoalTab] = React.useState("routine"); // "routine" | "invest"
  const yn = now.getFullYear();
  const mn = now.getMonth();
  const dn = now.getDate();
  const yearStart  = `${yn}/01/01`;
  const yearEnd    = `${yn}/12/31`;
  const monthStart = `${yn}/${String(mn+1).padStart(2,'0')}/01`;
  const monthEnd   = `${yn}/${String(mn+1).padStart(2,'0')}/${new Date(yn,mn+1,0).getDate()}`;
  const fmt = d => `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  const dow = now.getDay();
  const weekStart = fmt(new Date(yn, mn, dn - dow));
  const weekEnd   = fmt(new Date(yn, mn, dn - dow + 6));

  const saveGoal = (key, value) => {
    const next = { ...goals, [key]: value };
    setGoals(next);
    saveToFirebase({ goals: next });
    setEditingGoal(null);
  };

  return (
    <div className="rounded-[2.5rem] p-5 shadow-xl space-y-4" style={{background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
      <div className="flex items-center justify-between">
        <p className={`text-[9px] font-black uppercase tracking-widest ${txMuted}`}>MY GOALS</p>
      </div>

      {/* メインタブ */}
      <div className="flex gap-1 bg-black/30 p-1 rounded-2xl">
        <button onClick={() => setGoalTab("routine")}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${goalTab === "routine" ? (isLight ? "bg-black/80 text-white shadow-md" : "bg-white text-black shadow-md") : (isLight ? "text-gray-600 hover:text-gray-900" : "text-gray-500 hover:text-gray-300")}`}>
          🏆 目標
        </button>
        <button onClick={() => setGoalTab("invest")}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${goalTab === "invest" ? (isLight ? "bg-black/80 text-white shadow-md" : "bg-white text-black shadow-md") : (isLight ? "text-gray-600 hover:text-gray-900" : "text-gray-500 hover:text-gray-300")}`}>
          ✈️ 旅行計画
        </button>
      </div>

      {goalTab === "routine" ? (
        <div className="space-y-3">
          {/* 今年の目標 */}
          <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.2)"}}>
            <div className="h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400"></div>
            <button onClick={() => setYearGoalOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3">
              <div className="text-left">
                <span className={`text-[9px] font-black uppercase tracking-widest ${txMuted}`}>🏆 今年の目標</span>
                <p className={`text-[8px] font-semibold mt-0.5 tabular-nums ${txMuted}`}>{yearStart} 〜 {yearEnd}</p>
              </div>
              <span className={`font-black text-xs transition-transform duration-300 ${isLight ? "text-gray-500" : "text-gray-600"} ${yearGoalOpen ? "rotate-180" : ""}`}>▲</span>
            </button>
            {yearGoalOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
                {YEAR_SUBS.map(({ key, label, icon, desc }) => (
                  <div key={key}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">{icon}</span>
                      <span className={`text-[11px] font-black ${isLight ? "text-gray-700" : "text-gray-300"}`}>{label}</span>
                      <span className={`text-[9px] font-medium ${isLight ? "text-gray-500" : "text-gray-600"}`}>— {desc}</span>
                    </div>
                    <GoalRow gkey={key} placeholder={`${label}の目標を入力`} multiline={key === "yearMotto"}
                      goals={goals} editingGoal={editingGoal} setEditingGoal={setEditingGoal} onSave={saveGoal} isLight={isLight} tx={tx} txMuted={txMuted} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 今月の目標 */}
          <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.2)"}}>
            <div className="h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400"></div>
            <div className="px-4 py-3">
              <span className={`text-[9px] font-black uppercase tracking-widest ${txMuted}`}>📅 今月の目標</span>
              <p className={`text-[8px] font-semibold mt-0.5 tabular-nums ${txMuted}`}>{monthStart} 〜 {monthEnd}</p>
              <GoalRow gkey="month" placeholder="今月の目標を入力" goals={goals} editingGoal={editingGoal} setEditingGoal={setEditingGoal} onSave={saveGoal} isLight={isLight} tx={tx} txMuted={txMuted} />
            </div>
          </div>

          {/* 今週の目標 */}
          <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.2)"}}>
            <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
            <div className="px-4 py-3">
              <span className={`text-[9px] font-black uppercase tracking-widest ${txMuted}`}>⚡ 今週の目標</span>
              <p className={`text-[8px] font-semibold mt-0.5 tabular-nums ${txMuted}`}>{weekStart} 〜 {weekEnd}</p>
              <GoalRow gkey="week" placeholder="今週の目標を入力" goals={goals} editingGoal={editingGoal} setEditingGoal={setEditingGoal} onSave={saveGoal} isLight={isLight} tx={tx} txMuted={txMuted} />
            </div>
          </div>
        </div>
      ) : (
        <TravelSection goals={goals} saveToFirebase={saveToFirebase}
          setGoals={setGoals} isLight={isLight} tx={tx} txMuted={txMuted} />
      )}
    </div>
  );
}

export default function Home() {
  const [now, setNow] = useState(new Date());
  const today = now.toISOString().split('T')[0];
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [activeTab, setActiveTab] = useState("main");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState({ morning: [], afternoon: [], night: [] });
  const [checks, setChecks] = useState({});
  const [history, setHistory] = useState([]);
  const [newTasks, setNewTasks] = useState({ morning: "", afternoon: "", night: "" });
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [themeIndex, setThemeIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState("");
  const [selectedChatFriend, setSelectedChatFriend] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsData, setFriendsData] = useState([]);
  const [userMessages, setUserMessages] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [initialTimerSeconds, setInitialTimerSeconds] = useState(0);
  const [photoURL, setPhotoURL] = useState("");
  const [emojiIcon, setEmojiIcon] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [toast, setToast] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [hoveredTheme, setHoveredTheme] = useState(null);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", startHour: "09", startMin: "00", endHour: "10", endMin: "00", color: "#3b82f6", memo: "", repeat: "none", repeatDays: [], repeatEnd: "" });
  const [editingEvent, setEditingEvent] = useState(null);
  const [goals, setGoals] = useState({ year: "", month: "", week: "", yearMotto: "", yearSpiritual: "", yearIntellect: "", yearSocial: "", yearPhysical: "" });
  const [editingGoal, setEditingGoal] = useState(null);
  const [isLogOpen, setIsLogOpen] = useState(true);
  const [yearGoalOpen, setYearGoalOpen] = useState(true);
  const [alarmSound, setAlarmSound] = useState("bell");
  const [diaryEntries, setDiaryEntries] = useState({});
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [diaryInput, setDiaryInput] = useState("");

  const endTimeRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const chatBottomRef = useRef(null);
  const iconFileRef = useRef(null);

  const showToast = (msg, type = "ok") => {
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

  const timeProgress = useMemo(() => {
    return (["morning", "afternoon", "night"]).map(t => {
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
  const currentChar = CHARACTERS[charIndex] || CHARACTERS[0];
  const currentTheme = THEMES[themeIndex] || THEMES[0];
  // ライトテーマ判定
  const isLight = currentTheme.title !== "text-white";
  const tx          = isLight ? "text-gray-900" : "text-white";
  const txMuted     = isLight ? "text-gray-600" : "text-gray-400";
  const glassBase   = isLight ? "rgba(0,0,0,0.07)"  : "rgba(255,255,255,0.06)";
  const glassBorder = isLight ? "rgba(0,0,0,0.1)"   : "rgba(255,255,255,0.1)";
  const glassDarkBg = isLight ? "rgba(0,0,0,0.12)"  : "rgba(0,0,0,0.3)";
  const glassDarkBd = isLight ? "rgba(0,0,0,0.12)"  : "rgba(255,255,255,0.08)";
  const cardBg      = isLight ? "rgba(0,0,0,0.05)"  : "rgba(255,255,255,0.05)";
  const cardBorder  = isLight ? "rgba(0,0,0,0.1)"   : "rgba(255,255,255,0.1)";
  const inputBg     = isLight ? "rgba(0,0,0,0.06)"  : "rgba(0,0,0,0.3)";
  const inputBdr    = isLight ? "rgba(0,0,0,0.15)"  : "rgba(255,255,255,0.1)";
  const divider     = isLight ? "rgba(0,0,0,0.08)"  : "rgba(255,255,255,0.08)";
  const labelCls    = isLight ? "text-gray-700"      : "text-gray-400";
  const hoverCls    = isLight ? "hover:bg-black/10"  : "hover:bg-white/15";
  const msgBubbleOther = isLight ? "bg-black/10 text-gray-900" : "bg-zinc-800 text-gray-200";

  useEffect(() => {
    if (typeof Audio !== "undefined") {
      const sound = ALARM_SOUNDS.find(s => s.id === alarmSound) || ALARM_SOUNDS[0];
      if (audioRef.current) { audioRef.current.pause(); }
      audioRef.current = new Audio(sound.url);
      audioRef.current.loop = true;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [alarmSound]);

  const taskLibrary = useMemo(() => {
    const all = [...tasks.morning, ...tasks.afternoon, ...tasks.night];
    return Array.from(new Set(all)).filter(t => t !== "");
  }, [tasks]);

  const characterMessage = useMemo(() => {
    if (totalTasks === 0) return "まずは朝・昼・夜にルーティンを追加してみよう！";
    if (percent === 0) return "さあ、これから一緒に頑張っていきましょう。";
    if (percent < 30) return "まずは一歩ずつですね。応援しています。";
    if (percent < 50) return "調子が出てきましたね。その調子です。";
    if (percent < 80) return "半分以上クリアしましたね。素晴らしいです。";
    if (percent < 100) return "あと少しです。最後まで走り抜けましょう。";
    return "パーフェクト！最高の結果を出せましたね。";
  }, [percent, totalTasks]);

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
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const record = history.find(h => h.date === dStr);
      days.push({ day: i, date: dStr, percent: record ? record.percent : null });
    }
    return days;
  }, [currentCalendarDate, history]);

  const changeMonth = (offset) => setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));

  const postToTimeline = async (message) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "timeline"), {
        uid: user.uid, displayName: displayName || user.displayName,
        charIndex, shortId: myDisplayId, photoURL, emojiIcon,
        message: `${message} (称号: ${currentAward.name})`,
        timestamp: serverTimestamp()
      });
    } catch (e) { /* Timeline post error */ }
  };

  const removeFromTimeline = async (taskName) => {
    if (!user) return;
    try {
      const q = query(collection(db, "timeline"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        if (d.data().message?.startsWith(`${taskName} を完了！`)) batch.delete(d.ref);
      });
      await batch.commit();
    } catch (e) { /* Timeline remove error */ }
  };

  const saveToFirebase = async (updatedData = {}) => {
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
    const existingIdx = nextHistory.findIndex((h) => h.date === today);
    if (existingIdx >= 0) nextHistory[existingIdx] = { date: today, percent: newPercent };
    else nextHistory.push({ date: today, percent: newPercent });

    const avg = nextHistory.slice(-7).reduce((acc, cur) => acc + (cur.percent || 0), 0) / Math.min(nextHistory.length, 7);
    const newRank = RANK_LIST.find(r => avg >= r.min)?.name || "ビギナー";
    const awardName = DAILY_AWARDS.find(a => newPercent >= a.min)?.name || "休息中";

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid, tasks: currentTasks, checks: currentChecks, lastCheckDate: today,
      history: nextHistory, displayName: currentName, shortId: myDisplayId,
      rank: newRank, percent: newPercent, award: awardName, avg: Math.round(avg),
      friends: currentFriendsList, streak: streakCount,
      photoURL: currentPhotoURL, emojiIcon: currentEmojiIcon,
      themeIndex: currentThemeIdx, charIndex: currentCharIdx, lastActive: Date.now(),
      scheduleEvents: updatedData.scheduleEvents !== undefined ? updatedData.scheduleEvents : scheduleEvents,
      goals: updatedData.goals !== undefined ? updatedData.goals : goals,
      diaryEntries: updatedData.diaryEntries !== undefined ? updatedData.diaryEntries : diaryEntries
    }, { merge: true });
  };

  const closeTutorial = async () => {
    setShowTutorial(false);
    if (user) await updateDoc(doc(db, "users", user.uid), { hasSeenTutorial: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setDisplayName(u.displayName || "");
        const docRef = doc(db, "users", u.uid);
        const unsubDoc = onSnapshot(docRef, (snap) => {
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
            const sortedMsgs = (d.messageHistory || []).sort((a, b) => a.id - b.id);
            setUserMessages(sortedMsgs);
            if (d.lastCheckDate === today) setChecks(d.checks || {});
            else setChecks({});
            setScheduleEvents(d.scheduleEvents || []);
            if (d.goals) setGoals(d.goals);
            if (d.diaryEntries) setDiaryEntries(d.diaryEntries);
            if (!d.hasSeenTutorial) setShowTutorial(true);
          } else {
            const sampleTasks = {
              morning: ["起床・水を飲む", "ストレッチ10分", "朝食を食べる", "今日の予定を確認"],
              afternoon: ["昼休みに5分散歩", "タスクの進捗確認", "水分補給"],
              night: ["日記を書く", "翌日の準備", "読書15分", "就寝前ストレッチ"]
            };
            const sampleGoals = {
              yearMotto: "健康で充実した一年にする",
              yearSpiritual: "週1回、自分と向き合う時間を作る",
              yearIntellect: "月1冊本を読む・新しいスキルを身につける",
              yearSocial: "大切な人との時間を増やす",
              yearPhysical: "毎日30分体を動かす習慣をつける",
              month: "ルーティンを毎日続けて達成率80%以上を目指す",
              week: "朝のルーティンを完璧にこなす",
              year: ""
            };
            const todayStr = new Date().toISOString().split('T')[0];
            const sampleDiary = {
              [todayStr]: { text: "今日からROUTINE MASTERを始めました！", mood: "😊", updatedAt: Date.now() }
            };
            const sampleScheduleEvents = [
              { id: "sample1", date: todayStr, title: "朝のルーティン", startHour: "07", startMin: "00", endHour: "07", endMin: "30", color: "#3b82f6", memo: "起床・ストレッチ・朝食", repeat: "daily", repeatDays: [], repeatEnd: "" },
              { id: "sample2", date: todayStr, title: "集中作業タイム", startHour: "09", startMin: "00", endHour: "11", endMin: "00", color: "#10b981", memo: "重要タスクに集中", repeat: "weekdays", repeatDays: [], repeatEnd: "" },
              { id: "sample3", date: todayStr, title: "昼休み・散歩", startHour: "12", startMin: "00", endHour: "13", endMin: "00", color: "#f97316", memo: "食事＋軽い散歩でリフレッシュ", repeat: "weekdays", repeatDays: [], repeatEnd: "" },
              { id: "sample4", date: todayStr, title: "夜のルーティン", startHour: "22", startMin: "00", endHour: "23", endMin: "00", color: "#a855f7", memo: "日記・読書・翌日準備", repeat: "daily", repeatDays: [], repeatEnd: "" },
            ];
            setTasks(sampleTasks);
            setGoals(sampleGoals);
            setDiaryEntries(sampleDiary);
            setScheduleEvents(sampleScheduleEvents);
            setShowTutorial(true);
          }
          setLoading(false);
        });
        updateDoc(doc(db, "users", u.uid), { lastActive: Date.now() }).catch(() => {});
        const activeInterval = setInterval(() => {
          updateDoc(doc(db, "users", u.uid), { lastActive: Date.now() });
        }, 60000);
        return () => { clearInterval(activeInterval); unsubDoc(); };
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [today]);

  useEffect(() => {
    if (!user) return;
    const allowedUids = [user.uid, ...friendsData.map((f) => f.uid)].slice(0, 10);
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

  const addTimerMinutes = (minutes) => {
    const addSeconds = minutes * 60;
    setTimeLeft(prev => {
      const next = prev + addSeconds;
      if (!isTimerActive) setInitialTimerSeconds(next);
      return next;
    });
    if (isTimerActive && endTimeRef.current) endTimeRef.current += addSeconds * 1000;
  };

  useEffect(() => {
    if (isTimerActive) {
      if (!endTimeRef.current) endTimeRef.current = Date.now() + timeLeft * 1000;
      timerRef.current = setInterval(() => {
        const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
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
    setDiaryInput(diaryEntries[diaryDate]?.text || "");
  }, [diaryDate]);

  useEffect(() => {
    if (selectedChatFriend && chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [userMessages, selectedChatFriend]);

  const toggleCheck = (time, index, taskName) => {
    const checkId = `${time}_${index}`;
    const isChecked = !checks[checkId];
    const nextChecks = { ...checks, [checkId]: isChecked };
    setChecks(nextChecks);
    saveToFirebase({ checks: nextChecks });
    if (isChecked) postToTimeline(`${taskName} を完了！`);
    else removeFromTimeline(taskName);
  };

  const addTask = (time) => {
    if (!newTasks[time]) return;
    const nextTasks = { ...tasks, [time]: [...tasks[time], newTasks[time]] };
    setTasks(nextTasks);
    setNewTasks({ ...newTasks, [time]: "" });
    saveToFirebase({ tasks: nextTasks });
  };

  const updateTaskValue = (time, index, newValue) => {
    const nl = [...tasks[time]]; nl[index] = newValue;
    const nextTasks = { ...tasks, [time]: nl };
    setTasks(nextTasks); saveToFirebase({ tasks: nextTasks }); setEditingTask(null);
  };

  const onDragStart = (e, time, index) => { setDraggedItem({ time, index }); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e, time, index) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.time !== time || draggedItem.index === index) return;
    const newList = [...tasks[time]];
    const item = newList[draggedItem.index];
    newList.splice(draggedItem.index, 1); newList.splice(index, 0, item);
    setTasks({ ...tasks, [time]: newList }); setDraggedItem({ time, index });
  };
  const onDragEnd = () => { saveToFirebase({ tasks }); setDraggedItem(null); };

  const sendMessage = async (customText = null) => {
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

  const deleteMessage = async (messageObj) => {
    if (!selectedChatFriend) return;
    const batch = writeBatch(db);
    batch.update(doc(db, "users", user.uid), { messageHistory: arrayRemove(messageObj) });
    batch.update(doc(db, "users", selectedChatFriend.uid), { messageHistory: arrayRemove(messageObj) });
    await batch.commit();
  };

  const handleIconPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 bg-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      <h1 className="text-7xl font-black italic tracking-tighter text-center relative z-10">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500">ROUTINE MASTER</span>
      </h1>
      <p className="mt-4 text-gray-500 text-sm font-medium relative z-10">習慣を、力に変えよう。</p>
      <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
        className="mt-12 bg-white text-black px-12 py-5 rounded-full font-black hover:bg-gray-100 transition-all active:scale-95 shadow-2xl relative z-10">
        Googleでログイン
      </button>
    </div>
  );

  const NAV_TABS = [
    { id: "main", label: "ホーム", icon: "⚡" },
    { id: "schedule", label: "スケジュール", icon: "📅" },
    { id: "social", label: "交流", icon: "👥" },
    { id: "diary", label: "日記", icon: "📝" },
  ];

  return (
    <div className={`min-h-screen transition-all duration-700 ${currentTheme.bg} ${tx} flex overflow-hidden`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
        @keyframes bounce-rich{0%,100%{transform:translateY(0) scale(1,1);}50%{transform:translateY(-15px) scale(0.95,1.05);}}
        @keyframes blink{0%,90%,100%{transform:scaleY(1);}95%{transform:scaleY(0.1);}}
        @keyframes pulse-gold{0%{box-shadow:0 0 0 0 rgba(234,179,8,.4);}70%{box-shadow:0 0 0 20px rgba(234,179,8,0);}100%{box-shadow:0 0 0 0 rgba(234,179,8,0);}}
        @keyframes toast-in{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .animate-bounce-rich{animation:bounce-rich 2s infinite ease-in-out;}
        .animate-blink{animation:blink 4s infinite;}
        .animate-gold{animation:pulse-gold 1.5s infinite;}
        .animate-toast{animation:toast-in .3s ease;}
        .scrollbar-hide::-webkit-scrollbar{display:none;}
        .glass{backdrop-filter:blur(20px);}
        .glass-dark{backdrop-filter:blur(20px);}
        .task-card{transition:all 0.2s;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1);}
        select option{background:#1a1a2e;color:white;}
      `}</style>

      {/* トースト */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[900] px-6 py-3 rounded-2xl font-bold text-[12px] shadow-2xl animate-toast pointer-events-none backdrop-blur-xl border ${toast.type === "err" ? "bg-red-500/90 text-white border-red-400/30" : "bg-white/95 text-black border-white/20"}`}>
          {toast.msg}
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* サイドバー */}
      <aside className={`fixed left-0 top-0 h-full w-80 z-[100] transition-all duration-500 ease-out p-6 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`} style={{backdropFilter:"blur(20px)", background: isLight ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.4)", borderRight: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.08)"}}>
        <div className="flex justify-between items-center mb-8">
          <p className={`text-[10px] font-black tracking-[0.3em] uppercase ${txMuted}`}>MENU</p>
          <button onClick={() => setIsSidebarOpen(false)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm ${isLight ? "bg-black/8 text-gray-600 hover:bg-black/15 hover:text-gray-900" : "bg-white/8 text-gray-400 hover:bg-white/15 hover:text-white"}`}>✕</button>
        </div>

        {/* カレンダー */}
        <section className="rounded-[2rem] p-4 mb-4 text-center" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeMonth(-1)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-sm ${isLight ? "bg-black/8 hover:bg-black/15" : "bg-white/8 hover:bg-white/15"}`}>←</button>
            <p className={`text-[10px] font-black opacity-70 ${tx}`}>{currentCalendarDate.getFullYear()}年 {currentCalendarDate.getMonth() + 1}月</p>
            <button onClick={() => changeMonth(1)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-sm ${isLight ? "bg-black/8 hover:bg-black/15" : "bg-white/8 hover:bg-white/15"}`}>→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2 text-[8px] font-black text-gray-600">
            {['日','月','火','水','木','金','土'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => (
              <div key={i} className="aspect-square flex items-center justify-center relative">
                {d && <div className={`w-full h-full rounded-lg ${d.date === today ? 'border border-white/40' : ''} ${d.percent === null ? 'bg-white/5' : d.percent >= 80 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : `bg-blue-500/${Math.max(10, d.percent)}`}`}></div>}
                {d && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black">{d.day}</span>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-3 items-center">
            <div className="flex items-center gap-1"><div className={`w-2 h-2 rounded ${isLight ? "bg-black/8 border border-black/15" : "bg-white/5 border border-white/10"}`}></div><span className={`text-[7px] ${txMuted}`}>0%</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500/40 rounded"></div><span className={`text-[7px] ${txMuted}`}>~79%</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded"></div><span className={`text-[7px] ${txMuted}`}>80%+</span></div>
          </div>
        </section>

        {/* ライブラリ */}
        <section className="mb-6 px-1 overflow-y-auto scrollbar-hide flex-1">
          <p className={`text-[9px] font-black tracking-[0.3em] mb-3 uppercase ${txMuted}`}>Library</p>
          <div className="space-y-2 mb-6">
            {taskLibrary.map((t, i) => (
              <div key={i} className="rounded-xl p-2.5 flex items-center justify-between gap-2" style={{background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.1)"}}>
                <span className={`text-[10px] font-semibold truncate flex-1 ${tx}`}>{t}</span>
                <div className="flex gap-1">
                  {['朝','昼','晩'].map((label, idx) => (
                    <button key={label} onClick={() => {
                      const timeKey = idx === 0 ? 'morning' : idx === 1 ? 'afternoon' : 'night';
                      const nextTasks = { ...tasks, [timeKey]: [...tasks[timeKey], t] };
                      setTasks(nextTasks); saveToFirebase({ tasks: nextTasks });
                    }} className="w-6 h-6 rounded-lg bg-white/8 text-[8px] font-black hover:bg-white hover:text-black transition-all">{label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className={`text-[9px] font-black tracking-[0.3em] uppercase mb-3 ${txMuted}`}>History</p>
          {history.slice(-5).reverse().map((h, i) => (
            <div key={i} className="flex justify-between items-center p-2.5 rounded-xl mb-2" style={{background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.1)"}}>
              <span className={`text-[10px] font-medium ${txMuted}`}>{h.date}</span>
              <span className={`text-[11px] font-black ${tx}`}>{h.percent}%</span>
            </div>
          ))}
        </section>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 w-full overflow-y-auto min-h-screen relative pt-20">

        {/* ヘッダー */}
        <header className="fixed top-0 left-0 right-0 z-[50] w-full px-4 py-3.5 flex justify-between items-center" style={{backdropFilter:"blur(20px)", background: isLight ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.3)", borderBottom: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)"}}>
          <button onClick={() => setIsSidebarOpen(true)} className={`px-4 py-2 rounded-xl font-black text-[10px] transition-all tracking-widest ${tx} ${isLight ? "hover:bg-black/10" : "hover:bg-white/15"}`} style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>MENU</button>
          <h1 className={`text-lg font-black italic tracking-tight ${currentTheme.title} drop-shadow-sm`}>ROUTINE MASTER</h1>
          <button onClick={() => setIsMenuOpen(true)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isLight ? "hover:bg-black/10" : "hover:bg-white/15"}`} style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>⚙️</button>
        </header>

        <div className="w-full max-w-screen-xl mx-auto px-4 pb-32">

          {/* ナビゲーションタブ */}
          <div className="flex p-1 rounded-2xl my-6 w-full gap-1" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
            {NAV_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap flex items-center justify-center gap-1.5
                  ${activeTab === tab.id ? (isLight ? "bg-black/85 text-white shadow-lg" : "bg-white text-black shadow-lg") : (isLight ? "text-gray-600 hover:text-gray-900" : "text-gray-500 hover:text-gray-300")}`}>
                <span className={activeTab === tab.id ? "" : "opacity-50"}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "main" ? (
            <div className="space-y-6">

              {/* 目標セクション */}
              <GoalSection
                now={now} goals={goals} editingGoal={editingGoal} setEditingGoal={setEditingGoal}
                yearGoalOpen={yearGoalOpen} setYearGoalOpen={setYearGoalOpen}
                saveToFirebase={saveToFirebase} setGoals={setGoals}
                isLight={isLight} tx={tx} txMuted={txMuted}
              />

              {/* PC 2カラム */}
              <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* 左カラム */}
                <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-5">

                  {/* キャラクターカード */}
                  <div className="rounded-[3rem] p-8 flex flex-col items-center justify-center relative shadow-2xl min-h-[320px] overflow-hidden" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                    {/* 背景のグロー */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                    </div>

                    {/* 称号バッジ */}
                    <div className={`absolute top-5 right-6 px-3 py-1.5 rounded-full ${currentAward.bg} shadow-lg z-20`}>
                      <p className={`text-[7px] font-black opacity-70 ${currentAward.color} tracking-widest`}>TODAY</p>
                      <p className={`text-[10px] font-black ${currentAward.color}`}>{currentAward.name}</p>
                    </div>

                    {/* 日時 */}
                    <div className="absolute top-7 left-8 text-left z-10">
                      <p className={`text-[9px] font-medium tracking-wider ${isLight ? "text-black/40" : "text-white/30"}`}>{now.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', weekday: 'short' })}</p>
                      <p className={`text-2xl font-black italic tabular-nums ${tx}`}>{now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    {/* メッセージバブル */}
                    <div className="mb-8 relative mt-14 z-10">
                      <div className="bg-white text-black px-5 py-3.5 rounded-[1.6rem] shadow-xl relative text-center max-w-[220px]">
                        <p className="text-[11px] font-semibold leading-relaxed">{characterMessage}</p>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"></div>
                      </div>
                    </div>

                    {/* キャラクター */}
                    <div className={`w-32 h-32 rounded-full ${currentChar.color} shadow-2xl flex flex-col items-center justify-center animate-bounce-rich relative transition-all duration-700 ${percent === 100 ? 'animate-gold' : ''} overflow-hidden`}>
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

                    <p className={`mt-4 text-[11px] font-semibold ${txMuted}`}>継続中 <span className="font-black text-orange-400">{streakCount}日</span> 🔥</p>
                    <p className={`text-[8px] font-medium mt-1 tracking-wide ${isLight ? "text-gray-500" : "text-gray-600"}`}>80%以上達成した日が連続するとカウント</p>
                  </div>

                  {/* タイマーカード */}
                  <div className="rounded-[2.5rem] p-6 shadow-lg" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                    <div className="flex items-center justify-around mb-4">
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-3">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                            <circle cx="40" cy="40" r="34" fill="none"
                              stroke={isTimerActive ? "#3b82f6" : "rgba(255,255,255,0.25)"}
                              strokeWidth="6"
                              strokeDasharray={`${2 * Math.PI * 34}`}
                              strokeDashoffset={`${2 * Math.PI * 34 * (1 - (initialTimerSeconds > 0 ? timeLeft / initialTimerSeconds : 0))}`}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className={`text-sm font-mono font-black tabular-nums ${tx}`}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => {
                            if (!isTimerActive && timeLeft > 0) setInitialTimerSeconds(timeLeft);
                            setIsTimerActive(!isTimerActive);
                          }} className={`px-4 py-2 text-[9px] font-black rounded-full transition-all ${isTimerActive ? "bg-red-500 hover:bg-red-400" : "bg-white text-black hover:bg-gray-100"}`}>
                            {isTimerActive ? "停止" : "開始"}
                          </button>
                          <button onClick={() => { setIsTimerActive(false); setTimeLeft(0); setInitialTimerSeconds(0); }}
                            className="px-4 py-2 text-[9px] font-black rounded-full bg-white/8 border border-white/10 hover:bg-white/15 transition-all">クリア</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1, 5, 10, 15, 20, 30].map(m => (
                          <button key={m} onClick={() => addTimerMinutes(m)}
                            className="text-[9px] font-black border border-white/10 w-9 py-2 rounded-xl hover:bg-white hover:text-black transition-all">+{m}</button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-white/8 pt-4">
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${txMuted}`}>🔔 アラーム音</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ALARM_SOUNDS.map(s => (
                          <button key={s.id} onClick={() => {
                            setAlarmSound(s.id);
                            const prev = new Audio(s.url);
                            prev.volume = 0.5;
                            prev.play().catch(()=>{});
                            setTimeout(() => prev.pause(), 2000);
                          }}
                            className={`px-2 py-2 rounded-xl text-[9px] font-bold transition-all border text-left ${alarmSound===s.id ? 'bg-white text-black border-transparent shadow-md' : isLight ? 'bg-black/5 text-gray-600 border-black/8 hover:bg-black/10' : 'bg-white/5 text-gray-400 border-white/8 hover:bg-white/10'}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右カラム */}
                <div className="flex-1 min-w-0 flex flex-col gap-5">

                  {/* ランク・グラフカード */}
                  <div className="rounded-[2.5rem] p-6 shadow-lg" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${txMuted}`}>週間ランク (直近7日平均)</p>
                        <span className={`text-[8px] font-black px-3 py-1 rounded-full ${currentRank.bg} ${currentRank.color}`}>RANK: {currentRank.name}</span>
                        <p className={`text-[10px] font-semibold mt-2 ${txMuted}`}>Week Avg: <span className={`font-black ${tx}`}>{lastWeekAvg}%</span></p>
                        <p className={`text-[8px] font-black mt-3 mb-1 uppercase tracking-widest ${txMuted}`}>今日の達成率</p>
                        <h2 className={`text-3xl font-black mt-1 ${tx}`}>Today: <span className="tabular-nums">{percent}%</span></h2>
                        <div className="mt-2.5 w-44 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                      <div className="text-[7px] font-bold space-y-0.5 text-gray-500 border-l border-white/8 pl-4">
                        <p className={`mb-1 font-black tracking-widest ${isLight ? "text-black/50" : "text-white/40"}`}>RANK</p>
                        {RANK_LIST.map(r => <div key={r.name} className={lastWeekAvg >= r.min ? (isLight ? "text-gray-800" : "text-white/80") : "opacity-25"}>{r.name}: {r.min}%+</div>)}
                      </div>
                    </div>
                    <div className="h-28 w-full rounded-2xl p-2" style={{background: isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.2)"}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="displayDate" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <YAxis hide domain={[0, 100]} />
                          <Line type="monotone" dataKey="percent" stroke="#3b82f6" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* タスク3列 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {["morning", "afternoon", "night"].map((time, ti) => {
                      const tp = timeProgress[ti];
                      const timeConfig = {
                        morning:   { label: "MORNING",   accent: "#f59e0b", dot: "bg-amber-400" },
                        afternoon: { label: "AFTERNOON", accent: "#10b981", dot: "bg-emerald-400" },
                        night:     { label: "NIGHT",     accent: "#8b5cf6", dot: "bg-violet-400" },
                      };
                      const tc = timeConfig[time];
                      return (
                        <div key={time} className="rounded-[2.5rem] p-6 shadow-xl flex flex-col h-auto min-h-[400px]" style={{background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)", transition:"all 0.2s"}}>
                          {/* ヘッダー */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${tc.dot}`}></div>
                              <h2 className={`text-[9px] font-black uppercase tracking-[0.35em] ${txMuted}`}>{tc.label}</h2>
                            </div>
                            {tp.total > 0 && (
                              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full ${tp.done === tp.total ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                                {tp.done}/{tp.total}
                              </span>
                            )}
                          </div>
                          {/* 進捗バー */}
                          {tp.total > 0 && (
                            <div className="w-full h-0.5 bg-white/8 rounded-full overflow-hidden mb-5">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(tp.done / tp.total * 100)}%`, backgroundColor: tc.accent }}></div>
                            </div>
                          )}
                          {/* タスク一覧 */}
                          <div className="space-y-3 flex-1">
                            {tasks[time].map((task, index) => (
                              <div key={index} draggable onDragStart={(e) => onDragStart(e, time, index)} onDragOver={(e) => onDragOver(e, time, index)} onDragEnd={onDragEnd}
                                className={`flex items-center group ${draggedItem?.index === index && draggedItem?.time === time ? 'opacity-30' : ''}`}>
                                <div className="cursor-grab active:cursor-grabbing mr-2 opacity-0 group-hover:opacity-30 font-mono text-[10px] shrink-0 transition-opacity">::</div>
                                <button onClick={() => toggleCheck(time, index, task)}
                                  className={`w-5 h-5 mr-3 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${checks[`${time}_${index}`] ? "border-none shadow-lg scale-110" : "border-white/20 bg-black/20"}`}
                                  style={checks[`${time}_${index}`] ? {backgroundColor: tc.accent} : {}}>
                                  {checks[`${time}_${index}`] && <span className="text-[9px] font-black text-black">✓</span>}
                                </button>
                                {editingTask?.time === time && editingTask?.index === index ? (
                                  <input autoFocus className="flex-1 bg-white/10 text-sm font-semibold p-1.5 rounded-lg outline-none border border-white/20"
                                    value={editingTask.value}
                                    onChange={(e) => setEditingTask({ ...editingTask, value: e.target.value })}
                                    onBlur={() => updateTaskValue(time, index, editingTask.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && updateTaskValue(time, index, editingTask.value)} />
                                ) : (
                                  <span onClick={() => setEditingTask({ time, index, value: task })}
                                    className={`flex-1 text-sm font-medium cursor-text leading-snug ${checks[`${time}_${index}`] ? "opacity-25 line-through" : tx}`}>
                                    {task.startsWith('!') ? <span className="text-orange-400 font-bold">🌟 {task.substring(1)}</span> : task}
                                  </span>
                                )}
                                <button onClick={() => {
                                  const nl = [...tasks[time]]; nl.splice(index, 1);
                                  setTasks({ ...tasks, [time]: nl });
                                  saveToFirebase({ tasks: { ...tasks, [time]: nl } });
                                }} className="ml-2 text-red-500/20 hover:text-red-500 active:text-red-400 p-1 text-[12px] transition-colors shrink-0 opacity-0 group-hover:opacity-100">✕</button>
                              </div>
                            ))}
                          </div>
                          {/* 追加フォーム */}
                          <div className="mt-5 flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button onClick={() => { const val = newTasks[time] || ""; setNewTasks({ ...newTasks, [time]: val.startsWith("!") ? val.substring(1) : "!" + val }); }}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 text-sm ${newTasks[time]?.startsWith("!") ? "bg-orange-500 border-orange-400" : "bg-white/5 border-white/10 opacity-40 hover:opacity-70"}`}>🌟</button>
                              <input value={newTasks[time]} onChange={(e) => setNewTasks({ ...newTasks, [time]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && addTask(time)}
                                className={`flex-1 text-[11px] font-medium p-3 rounded-xl outline-none transition-colors ${tx} ${isLight ? "bg-black/6 border border-black/12 placeholder:text-gray-400 focus:border-black/25" : "bg-black/30 border border-white/8 placeholder:text-gray-600 focus:border-white/20"}`} placeholder="習慣を入力..." />
                            </div>
                            <button onClick={() => addTask(time)} className="w-full bg-white text-black py-2.5 rounded-xl font-black text-[10px] shadow-lg hover:bg-gray-100 transition-all active:scale-95">追加</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

          ) : activeTab === "schedule" ? (
            (() => {
              const EVENT_COLORS = ["#3b82f6","#ef4444","#10b981","#f97316","#a855f7","#eab308","#06b6d4","#ec4899"];
              const HOUR_HEIGHT = 64;
              const SNAP = 15;
              const DOW_LABELS = ["日","月","火","水","木","金","土"];

              const doesRepeatOnDate = (ev, dateStr) => {
                if (!ev.repeat || ev.repeat === "none") return ev.date === dateStr;
                if (ev.repeatEnd && dateStr > ev.repeatEnd) return false;
                if (dateStr < ev.date) return false;
                const dow = new Date(dateStr + "T00:00:00").getDay();
                if (ev.repeat === "daily")    return true;
                if (ev.repeat === "weekly")   return new Date(ev.date + "T00:00:00").getDay() === dow;
                if (ev.repeat === "weekdays") return dow >= 1 && dow <= 5;
                if (ev.repeat === "weekends") return dow === 0 || dow === 6;
                if (ev.repeat === "custom")   return (ev.repeatDays || []).includes(dow);
                return false;
              };

              const todayEventsForDate = scheduleEvents
                .filter(ev => doesRepeatOnDate(ev, scheduleDate))
                .sort((a,b) => (parseInt(a.startHour)*60+parseInt(a.startMin)) - (parseInt(b.startHour)*60+parseInt(b.startMin)));

              const minsToTop  = (m) => (m / 60) * HOUR_HEIGHT;
              const topToMins  = (px) => Math.round(px / HOUR_HEIGHT * 60 / SNAP) * SNAP;
              const clamp      = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
              const minsToHM   = (m) => ({ h: Math.floor(m/60).toString().padStart(2,'0'), m: (m%60).toString().padStart(2,'0') });
              const getTop     = (ev) => minsToTop(parseInt(ev.startHour)*60+parseInt(ev.startMin));
              const getHeight  = (ev) => Math.max(minsToTop(parseInt(ev.endHour)*60+parseInt(ev.endMin)) - getTop(ev), HOUR_HEIGHT/4);

              const saveEvents = (evs) => { setScheduleEvents(evs); saveToFirebase({ scheduleEvents: evs }); };

              const REPEAT_OPTS = [
                { value:"none",     label:"繰り返しなし" },
                { value:"daily",    label:"毎日" },
                { value:"weekly",   label:"毎週同じ曜日" },
                { value:"weekdays", label:"平日（月〜金）" },
                { value:"weekends", label:"週末（土・日）" },
                { value:"custom",   label:"曜日を選択" },
              ];

              const blankEvent = () => ({ title:"", startHour:"09", startMin:"00", endHour:"10", endMin:"00", color:"#3b82f6", memo:"", repeat:"none", repeatDays:[], repeatEnd:"" });

              const addOrUpdateEvent = () => {
                const base = editingEvent
                  ? { ...editingEvent, ...newEvent, id: editingEvent.id }
                  : { ...newEvent, id: Date.now().toString(), date: scheduleDate };
                saveEvents(editingEvent
                  ? scheduleEvents.map(e => e.id === editingEvent.id ? base : e)
                  : [...scheduleEvents, base]);
                setShowEventForm(false); setEditingEvent(null); setNewEvent(blankEvent());
              };

              const deleteEvent = (id, onlyToday = false) => {
                if (onlyToday) {
                  saveEvents(scheduleEvents.map(e => e.id === id
                    ? { ...e, exceptions: [...(e.exceptions||[]), scheduleDate] }
                    : e));
                } else {
                  saveEvents(scheduleEvents.filter(e => e.id !== id));
                }
                setShowEventForm(false); setEditingEvent(null);
              };

              const openEdit = (ev) => {
                setEditingEvent(ev);
                setNewEvent({ title:ev.title, startHour:ev.startHour, startMin:ev.startMin,
                  endHour:ev.endHour, endMin:ev.endMin, color:ev.color, memo:ev.memo||"",
                  repeat:ev.repeat||"none", repeatDays:ev.repeatDays||[], repeatEnd:ev.repeatEnd||"" });
                setShowEventForm(true);
              };

              const visibleEvents = todayEventsForDate.filter(ev => !(ev.exceptions||[]).includes(scheduleDate));

              const prevDay = () => { const d=new Date(scheduleDate); d.setDate(d.getDate()-1); setScheduleDate(d.toISOString().split('T')[0]); };
              const nextDay = () => { const d=new Date(scheduleDate); d.setDate(d.getDate()+1); setScheduleDate(d.toISOString().split('T')[0]); };
              const isToday = scheduleDate === today;
              const currentNowMins = now.getHours()*60+now.getMinutes();

              const handleTimelineTap = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
                const startMins = clamp(topToMins(y), 0, 25*60);
                const endMins   = clamp(startMins+60, 0, 26*60);
                const s = minsToHM(startMins); const en = minsToHM(endMins);
                setEditingEvent(null);
                setNewEvent({ ...blankEvent(), startHour:s.h, startMin:s.m, endHour:en.h, endMin:en.m });
                setShowEventForm(true);
              };

              const handleMoveStart = (e, ev) => {
                e.stopPropagation(); e.preventDefault();
                const startY = e.touches ? e.touches[0].clientY : e.clientY;
                const origStart = parseInt(ev.startHour)*60+parseInt(ev.startMin);
                const origEnd   = parseInt(ev.endHour)*60+parseInt(ev.endMin);
                const onMove = (me) => {
                  const d = Math.round(topToMins((me.touches?me.touches[0].clientY:me.clientY)-startY)/SNAP)*SNAP;
                  const ns = clamp(origStart+d,0,25*60); const ne = clamp(origEnd+d,ns+SNAP,26*60);
                  const sh=minsToHM(ns); const eh=minsToHM(ne);
                  setScheduleEvents(prev=>prev.map(x=>x.id===ev.id?{...x,startHour:sh.h,startMin:sh.m,endHour:eh.h,endMin:eh.m}:x));
                };
                const onEnd = () => {
                  document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onEnd);
                  document.removeEventListener('touchmove',onMove); document.removeEventListener('touchend',onEnd);
                  setScheduleEvents(prev=>{saveToFirebase({scheduleEvents:prev});return prev;});
                };
                document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onEnd);
                document.addEventListener('touchmove',onMove,{passive:false}); document.addEventListener('touchend',onEnd);
              };

              const handleResizeStart = (e, ev, edge) => {
                e.stopPropagation(); e.preventDefault();
                const startY = e.touches ? e.touches[0].clientY : e.clientY;
                const origStart = parseInt(ev.startHour)*60+parseInt(ev.startMin);
                const origEnd   = parseInt(ev.endHour)*60+parseInt(ev.endMin);
                let moved = false;
                const onMove = (me) => {
                  moved = true;
                  const d = Math.round(topToMins((me.touches?me.touches[0].clientY:me.clientY)-startY)/SNAP)*SNAP;
                  const ns = edge==='top' ? clamp(origStart+d,0,origEnd-SNAP) : origStart;
                  const ne = edge==='bottom' ? clamp(origEnd+d,origStart+SNAP,26*60) : origEnd;
                  const sh=minsToHM(ns); const eh=minsToHM(ne);
                  setScheduleEvents(prev=>prev.map(x=>x.id===ev.id?{...x,startHour:sh.h,startMin:sh.m,endHour:eh.h,endMin:eh.m}:x));
                };
                const onEnd = () => {
                  document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onEnd);
                  document.removeEventListener('touchmove',onMove); document.removeEventListener('touchend',onEnd);
                  if (moved) setScheduleEvents(prev=>{saveToFirebase({scheduleEvents:prev});return prev;});
                };
                document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onEnd);
                document.addEventListener('touchmove',onMove,{passive:false}); document.addEventListener('touchend',onEnd);
              };

              const allRoutineTasks = [
                ...tasks.morning.map(t=>({t,color:'#3b82f6'})),
                ...tasks.afternoon.map(t=>({t,color:'#10b981'})),
                ...tasks.night.map(t=>({t,color:'#a855f7'}))
              ];
              const addRoutineToSchedule = (task, color) => {
                const ev = { id:Date.now().toString(), date:scheduleDate, title:task,
                  startHour:"09", startMin:"00", endHour:"10", endMin:"00", color, memo:"",
                  repeat:"none", repeatDays:[], repeatEnd:"" };
                saveEvents([...scheduleEvents, ev]);
                showToast(`「${task}」をスケジュールに追加しました`);
              };

              const repeatBadge = (ev) => {
                if (!ev.repeat || ev.repeat==="none") return null;
                if (ev.repeat==="daily")    return "毎日";
                if (ev.repeat==="weekly")   return "毎週";
                if (ev.repeat==="weekdays") return "平日";
                if (ev.repeat==="weekends") return "週末";
                if (ev.repeat==="custom")   return (ev.repeatDays||[]).map(d=>DOW_LABELS[d]).join("");
                return null;
              };

              const isRepeatEvent = (ev) => ev.repeat && ev.repeat !== "none";

              return (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* 日付ナビ */}
                  <div className="flex items-center justify-between mb-5 px-1">
                    <button onClick={prevDay} className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-lg transition-all ${tx} ${isLight ? "hover:bg-black/10" : "hover:bg-white/15"}`} style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>‹</button>
                    <div className="text-center">
                      <p className={`text-lg font-black ${tx}`}>{new Date(scheduleDate+'T00:00:00').toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'})}</p>
                      {isToday && <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">TODAY</p>}
                    </div>
                    <button onClick={nextDay} className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-lg transition-all ${tx} ${isLight ? "hover:bg-black/10" : "hover:bg-white/15"}`} style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>›</button>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* タイムライン */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[9px] font-medium text-center mb-3 tracking-wide ${txMuted}`}>タップで追加 · ドラッグで移動 · 中央↕でリサイズ</p>
                      <div className="rounded-[2.5rem] overflow-hidden shadow-2xl" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                        <div className="overflow-y-auto" style={{maxHeight:'78vh'}}>
                          <div className="relative select-none" style={{height:`${26*HOUR_HEIGHT}px`}} onClick={handleTimelineTap}>
                            {Array.from({length:27},(_,h)=>(
                              <div key={h} className="absolute w-full flex pointer-events-none" style={{top:`${h*HOUR_HEIGHT}px`,height:`${HOUR_HEIGHT}px`,borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                                <div className="w-16 shrink-0 flex items-start pt-1.5 justify-end pr-3">
                                  <span className={`text-[11px] font-bold tabular-nums ${isLight ? "text-gray-500" : "text-gray-600"}`}>{h < 24 ? h.toString().padStart(2,'0') : `+${h-24}`}:00</span>
                                </div>
                                <div className="flex-1" style={{borderLeft:'1px solid rgba(255,255,255,0.04)'}}>
                                  <div style={{marginTop:'50%',borderTop:'1px solid rgba(255,255,255,0.02)'}}></div>
                                </div>
                              </div>
                            ))}
                            {isToday && (
                              <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{top:`${minsToTop(currentNowMins)}px`}}>
                                <div className="w-16 flex justify-end pr-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div></div>
                                <div className="flex-1 h-[2px] bg-red-500/70"></div>
                              </div>
                            )}
                            <div className="absolute left-16 right-2 top-0 bottom-0">
                              {visibleEvents.map(ev => {
                                const top = getTop(ev); const height = getHeight(ev);
                                const badge = repeatBadge(ev);
                                const handleH = Math.min(10, Math.floor(height / 4));
                                return (
                                  <div key={ev.id} className="absolute left-0 right-0 rounded-xl overflow-visible shadow-lg group" style={{top:`${top}px`,height:`${height}px`,zIndex:10}}>
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 cursor-ns-resize z-30 touch-none flex items-start justify-center pt-1"
                                      style={{height:`${handleH}px`}}
                                      onMouseDown={e=>handleResizeStart(e,ev,'top')} onTouchStart={e=>handleResizeStart(e,ev,'top')}>
                                      <div className="w-6 h-1 rounded-full bg-white/40 group-hover:bg-white transition-colors"></div>
                                    </div>
                                    <div className="absolute inset-0 rounded-xl cursor-grab active:cursor-grabbing touch-none overflow-hidden"
                                      style={{backgroundColor:ev.color+'22', borderLeft:`3px solid ${ev.color}`}}
                                      onMouseDown={e=>handleMoveStart(e,ev)} onTouchStart={e=>handleMoveStart(e,ev)}
                                      onClick={e=>{e.stopPropagation(); openEdit(ev);}}>
                                      <div className="px-3 pt-2 pb-1">
                                        <div className="flex items-start gap-1.5">
                                          <p className="text-[13px] font-bold truncate flex-1 leading-tight" style={{color:ev.color}}>{ev.title}</p>
                                          {badge && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 mt-0.5" style={{backgroundColor:ev.color+'33',color:ev.color}}>🔁{badge}</span>}
                                        </div>
                                        {height > 32 && <p className="text-[11px] font-medium opacity-50 text-white tabular-nums mt-0.5">{ev.startHour}:{ev.startMin}–{ev.endHour}:{ev.endMin}</p>}
                                        {height > 52 && ev.memo && <p className="text-[10px] text-gray-400 mt-1 truncate">{ev.memo}</p>}
                                      </div>
                                    </div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 cursor-ns-resize z-30 touch-none flex items-end justify-center pb-1"
                                      style={{height:`${handleH}px`}}
                                      onMouseDown={e=>handleResizeStart(e,ev,'bottom')} onTouchStart={e=>handleResizeStart(e,ev,'bottom')}>
                                      <div className="w-6 h-1 rounded-full bg-white/40 group-hover:bg-white transition-colors"></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      {visibleEvents.length > 0 && (
                        <p className={`text-center text-[10px] font-medium mt-3 ${txMuted}`}>{visibleEvents.length} 件の予定</p>
                      )}
                    </div>

                    {/* サイドパネル */}
                    <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4">
                      <button onClick={() => { setEditingEvent(null); setNewEvent({ ...blankEvent() }); setShowEventForm(true); }}
                        className="w-full py-3.5 bg-white text-black rounded-2xl font-black text-[11px] shadow-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95">
                        <span className="text-lg leading-none">＋</span> 予定を追加
                      </button>
                      {allRoutineTasks.length > 0 && (
                        <div className="rounded-2xl p-4" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${txMuted}`}>ルーティンを追加</p>
                          <div className="flex flex-col gap-2">
                            {allRoutineTasks.map(({t,color},i) => (
                              <button key={i} onClick={() => addRoutineToSchedule(t,color)}
                                className="px-3 py-2 rounded-xl text-[11px] font-semibold border border-white/8 flex items-center gap-2 hover:scale-[1.02] transition-all text-left"
                                style={{backgroundColor:color+'18', color}}>
                                <span>＋</span><span className="truncate">{t}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {visibleEvents.length > 0 && (
                        <div className="rounded-2xl p-4" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${txMuted}`}>本日の予定</p>
                          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                            {visibleEvents.map(ev => (
                              <button key={ev.id} onClick={() => openEdit(ev)}
                                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/8 transition-colors text-left"
                                style={{borderLeft:`3px solid ${ev.color}`}}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold truncate" style={{color:ev.color}}>{ev.title}</p>
                                  <p className="text-[9px] text-gray-500 tabular-nums">{ev.startHour}:{ev.startMin}–{ev.endHour}:{ev.endMin}</p>
                                </div>
                                {repeatBadge(ev) && <span className="text-[8px] font-black shrink-0" style={{color:ev.color}}>🔁</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* イベントフォームモーダル */}
                  {showEventForm && (
                    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 backdrop-blur-md p-4" onClick={()=>{setShowEventForm(false);setEditingEvent(null);}}>
                      <div className={`backdrop-blur-2xl w-full max-w-md rounded-[2.5rem] border shadow-2xl mb-4 max-h-[92vh] overflow-y-auto scrollbar-hide ${isLight ? "bg-white/95 border-black/10 text-gray-900" : "bg-zinc-900/95 border-white/10 text-white"}`} onClick={e=>e.stopPropagation()}>
                        <div className="h-1.5 rounded-t-[2.5rem]" style={{backgroundColor: newEvent.color}}></div>
                        <div className="p-6">
                          <div className="flex justify-between items-center mb-5">
                            <h3 className="font-black text-base">{editingEvent ? "✏️ 予定を編集" : "＋ 予定を追加"}</h3>
                            <button onClick={()=>{setShowEventForm(false);setEditingEvent(null);}} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white font-black">✕</button>
                          </div>
                          <div className="space-y-4">
                            <input value={newEvent.title} onChange={e=>setNewEvent({...newEvent,title:e.target.value})}
                              className={`w-full text-base font-semibold px-4 py-3.5 rounded-2xl border outline-none transition-colors ${tx} ${isLight ? "bg-black/5 border-black/12 placeholder:text-gray-400 focus:border-black/25" : "bg-black/40 border-white/10 placeholder:text-gray-600 focus:border-white/25"}`}
                              placeholder="予定のタイトル" autoFocus />
                            <div className="bg-black/30 rounded-2xl border border-white/8 overflow-hidden">
                              {[['開始','startHour','startMin'],['終了','endHour','endMin']].map(([label,hk,mk], li)=>(
                                <div key={label} className={`flex items-center gap-3 px-4 py-3 ${li===0?'border-b border-white/5':''}`}>
                                  <span className="text-sm font-bold text-gray-400 w-10 shrink-0">{label}</span>
                                  <div className="flex items-center gap-2 flex-1">
                                    <select value={newEvent[hk]} onChange={e=>setNewEvent({...newEvent,[hk]:e.target.value})}
                                      className="flex-1 bg-white/10 text-base font-black py-2 px-2 rounded-xl border border-white/10 outline-none text-center">
                                      {Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <span className="font-black text-gray-400 text-lg">:</span>
                                    <select value={newEvent[mk]} onChange={e=>setNewEvent({...newEvent,[mk]:e.target.value})}
                                      className="flex-1 bg-white/10 text-base font-black py-2 px-2 rounded-xl border border-white/10 outline-none text-center">
                                      {["00","15","30","45"].map(m=><option key={m} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-gray-400 w-10 shrink-0">色</span>
                              <div className="flex gap-2.5 flex-wrap flex-1">
                                {EVENT_COLORS.map(c=>(
                                  <button key={c} onClick={()=>setNewEvent({...newEvent,color:c})}
                                    className={`w-9 h-9 rounded-full transition-all shadow-md ${newEvent.color===c?'scale-125 ring-2 ring-white ring-offset-1 ring-offset-zinc-900':'opacity-50 hover:opacity-80'}`}
                                    style={{backgroundColor:c}}></button>
                                ))}
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-2xl border border-white/8 p-4 space-y-3">
                              <p className="text-sm font-bold text-gray-300 flex items-center gap-2">🔁 繰り返し</p>
                              <div className="grid grid-cols-2 gap-2">
                                {REPEAT_OPTS.map(opt=>(
                                  <button key={opt.value} onClick={()=>setNewEvent({...newEvent,repeat:opt.value})}
                                    className={`py-2.5 px-3 rounded-xl text-[12px] font-bold transition-all border ${newEvent.repeat===opt.value?'bg-white text-black border-transparent shadow-lg':isLight ? 'bg-black/5 text-gray-600 border-black/8 hover:bg-black/10' : 'bg-white/5 text-gray-400 border-white/8 hover:bg-white/10'}`}>
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                              {newEvent.repeat==="custom" && (
                                <div className="flex gap-2 justify-center pt-1">
                                  {DOW_LABELS.map((d,i)=>{
                                    const active=(newEvent.repeatDays||[]).includes(i);
                                    return (
                                      <button key={i} onClick={()=>{
                                        const cur=newEvent.repeatDays||[];
                                        setNewEvent({...newEvent,repeatDays:active?cur.filter(x=>x!==i):[...cur,i].sort()});
                                      }} className={`w-10 h-10 rounded-xl text-sm font-black transition-all border ${active?'bg-white text-black border-transparent':'bg-white/5 text-gray-500 border-white/8'}`}>
                                        {d}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {newEvent.repeat && newEvent.repeat!=="none" && (
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-400 shrink-0">終了日</span>
                                  <input type="date" value={newEvent.repeatEnd||""} onChange={e=>setNewEvent({...newEvent,repeatEnd:e.target.value})}
                                    className="flex-1 bg-white/10 text-sm font-semibold p-2.5 rounded-xl border border-white/10 outline-none" />
                                  {newEvent.repeatEnd && (
                                    <button onClick={()=>setNewEvent({...newEvent,repeatEnd:""})} className="text-gray-500 font-black">✕</button>
                                  )}
                                </div>
                              )}
                            </div>
                            <textarea value={newEvent.memo} onChange={e=>setNewEvent({...newEvent,memo:e.target.value})}
                              className={`w-full text-sm font-medium px-4 py-3 rounded-2xl border outline-none resize-none h-16 transition-colors ${tx} ${isLight ? "bg-black/5 border-black/10 placeholder:text-gray-400 focus:border-black/20" : "bg-black/40 border-white/10 placeholder:text-gray-600 focus:border-white/20"}`}
                              placeholder="メモ（任意）" />
                            <button onClick={addOrUpdateEvent}
                              className="w-full py-4 rounded-2xl font-black text-base shadow-xl text-white transition-all active:scale-95 hover:opacity-90"
                              style={{backgroundColor: newEvent.color}}>
                              {editingEvent ? "更新する" : "追加する"}
                            </button>
                            {editingEvent && (
                              isRepeatEvent(editingEvent) ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <button onClick={()=>deleteEvent(editingEvent.id, true)}
                                    className="py-3.5 bg-orange-500/15 text-orange-400 rounded-2xl font-black text-sm border border-orange-500/20">この日だけ削除</button>
                                  <button onClick={()=>deleteEvent(editingEvent.id, false)}
                                    className="py-3.5 bg-red-500/15 text-red-400 rounded-2xl font-black text-sm border border-red-500/20">すべて削除</button>
                                </div>
                              ) : (
                                <button onClick={()=>deleteEvent(editingEvent.id, false)}
                                  className="w-full py-3.5 bg-red-500/15 text-red-400 rounded-2xl font-black text-sm border border-red-500/20">削除</button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()

          ) : activeTab === "social" ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Achievement Log */}
                <div className="w-full lg:w-96 shrink-0">
                  <button onClick={() => setIsLogOpen(v => !v)} className="flex items-center gap-3 mb-4 px-2 w-full group">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.25em] flex-1 text-left ${txMuted}`}>Achievement Log</p>
                    <span className={`text-gray-600 font-black text-xs transition-transform duration-300 ${isLogOpen ? 'rotate-180' : ''}`}>▲</span>
                  </button>
                  {isLogOpen && (
                    <div className="rounded-[2.5rem] p-6 shadow-2xl" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide">
                        {timeline.length === 0 && (
                          <p className={`text-center text-[10px] font-medium py-8 ${txMuted}`}>まだログがありません</p>
                        )}
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
                                <span className={`text-[10px] font-bold ${txMuted}`}>{log.displayName} <span className="text-gray-600 font-medium ml-1">@{log.shortId}</span></span>
                                <span className={`text-[8px] font-medium ${isLight ? "text-gray-500" : "text-gray-700"}`}>{log.timestamp?.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className={`text-xs font-semibold ${tx}`}>{log.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Friends */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4 px-2">
                    <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${txMuted}`}>Friends</p>
                  </div>
                  <div className="p-5 rounded-[2.5rem] flex gap-2 mb-5" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                    <input value={friendIdInput} onChange={(e) => setFriendIdInput(e.target.value)}
                      className={`flex-1 text-[11px] font-medium p-4 rounded-xl border outline-none transition-colors ${tx} ${isLight ? "bg-black/6 border-black/12 focus:border-black/25" : "bg-black/30 border-white/8 focus:border-white/20"}`} placeholder="友達の8桁IDを入力..." />
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
                    }} className="bg-white text-black px-6 rounded-xl font-black text-[10px] hover:bg-gray-100 transition-all">追加</button>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {friendsData.map((f, i) => {
                      const isOnline = f.lastActive && (Date.now() - f.lastActive < 120000);
                      const unread = userMessages.filter(m => m.chatId === [myDisplayId, f.shortId].sort().join("_") && m.fromId !== myDisplayId && !m.read).length;
                      const friendRank = RANK_LIST.find(r => (f.avg || 0) >= r.min) || RANK_LIST[4];
                      const friendAward = DAILY_AWARDS.find(a => (f.percent || 0) >= a.min) || DAILY_AWARDS[4];
                      const charColor = CHARACTERS[f.charIndex || 0];
                      return (
                        <div key={i} className="rounded-[3rem] p-6 relative shadow-2xl hover:scale-[1.02] transition-all overflow-hidden" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                          <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${charColor.accent} opacity-80`}></div>
                          <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-full ${charColor.color} flex items-center justify-center shadow-lg relative overflow-hidden shrink-0`}>
                              {f.photoURL ? <img src={f.photoURL} alt="icon" className="w-full h-full object-cover" />
                                : f.emojiIcon ? <span className="text-2xl">{f.emojiIcon}</span>
                                : <div className="flex gap-1.5"><div className="w-2 h-2 bg-white rounded-full" /><div className="w-2 h-2 bg-white rounded-full" /></div>}
                              {isOnline && <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}
                              {unread > 0 && <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-black animate-pulse">{unread}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-sm font-black truncate ${tx}`}>{f.displayName}</h3>
                              <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${friendRank.bg} ${friendRank.color}`}>RANK: {friendRank.name}</span>
                                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${friendAward.bg} ${friendAward.color}`}>称号: {friendAward.name}</span>
                                <span className="text-[10px] font-black text-orange-400">🔥 {f.streak || 0}日</span>
                              </div>
                              <div className="flex items-end gap-3 mt-1">
                                <span className="text-3xl font-black">{f.percent || 0}%</span>
                                <span className="text-[8px] font-medium text-gray-500 mb-1">AVG: {f.avg || 0}%</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <button onClick={() => setSelectedChatFriend(f)} className="bg-white text-black w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-xl hover:bg-gray-100 transition-all">💬</button>
                              <button onClick={async () => {
                                const nl = friendsList.filter(id => id !== f.shortId);
                                setFriendsList(nl); await saveToFirebase({ friendsList: nl });
                                await updateDoc(doc(db, "users", f.uid), { friends: arrayRemove(myDisplayId) });
                                showToast("友達を削除しました");
                              }} className="bg-red-500/15 text-red-500 w-10 h-10 rounded-xl text-xs flex items-center justify-center hover:bg-red-500/25 transition-all">✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

          ) : activeTab === "diary" ? (
            (() => {
              const diaryDates = Object.keys(diaryEntries).sort((a,b) => b.localeCompare(a));
              const currentEntry = diaryEntries[diaryDate] || { text: "", mood: "" };
              const MOODS = [
                { emoji: "😄", label: "最高" },
                { emoji: "😊", label: "良い" },
                { emoji: "😐", label: "普通" },
                { emoji: "😔", label: "悪い" },
                { emoji: "😞", label: "最悪" },
              ];
              const saveDiary = (text, mood) => {
                const next = { ...diaryEntries, [diaryDate]: { text, mood, updatedAt: Date.now() } };
                setDiaryEntries(next);
                saveToFirebase({ diaryEntries: next });
                showToast("日記を保存しました");
              };
              const deleteDiary = (date) => {
                const next = { ...diaryEntries };
                delete next[date];
                setDiaryEntries(next);
                saveToFirebase({ diaryEntries: next });
                showToast("削除しました");
              };
              const prevDiaryDay = () => { const d=new Date(diaryDate); d.setDate(d.getDate()-1); setDiaryDate(d.toISOString().split('T')[0]); };
              const nextDiaryDay = () => { const d=new Date(diaryDate); d.setDate(d.getDate()+1); setDiaryDate(d.toISOString().split('T')[0]); };

              return (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* 左：入力エリア */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-5 px-1">
                        <button onClick={prevDiaryDay} className="w-10 h-10 glass rounded-xl font-black flex items-center justify-center text-lg hover:bg-white/15 transition-all">‹</button>
                        <div className="text-center">
                          <p className={`text-lg font-black ${tx}`}>{new Date(diaryDate+'T00:00:00').toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'})}</p>
                          {diaryDate === today && <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">TODAY</p>}
                        </div>
                        <button onClick={nextDiaryDay} className="w-10 h-10 glass rounded-xl font-black flex items-center justify-center text-lg hover:bg-white/15 transition-all">›</button>
                      </div>
                      <div className="rounded-[2rem] p-5 mb-4" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${txMuted}`}>今日の気分</p>
                        <div className="flex gap-2 justify-around">
                          {MOODS.map(m => (
                            <button key={m.emoji} onClick={() => saveDiary(diaryInput, m.emoji)}
                              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all border ${currentEntry.mood === m.emoji ? 'bg-white/20 border-white/30 scale-110' : 'bg-white/5 border-white/5 opacity-50 hover:opacity-80'}`}>
                              <span className="text-2xl">{m.emoji}</span>
                              <span className={`text-[8px] font-bold ${txMuted}`}>{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[2rem] p-5" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${txMuted}`}>📝 日記</p>
                        <textarea
                          value={diaryInput}
                          onChange={e => setDiaryInput(e.target.value)}
                          rows={10}
                          className={`w-full text-sm font-medium px-4 py-3 rounded-2xl border outline-none resize-none leading-relaxed transition-colors ${tx} ${isLight ? "bg-black/5 border-black/10 placeholder:text-gray-400 focus:border-black/20" : "bg-black/25 border-white/8 placeholder:text-gray-700 focus:border-white/20"}`}
                          placeholder={`${new Date(diaryDate+'T00:00:00').toLocaleDateString('ja-JP',{month:'long',day:'numeric'})}の日記を書こう...`}
                        />
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => { saveDiary(diaryInput, currentEntry.mood); }}
                            className="flex-1 bg-white text-black py-3 rounded-2xl font-black text-[11px] shadow-lg hover:bg-gray-100 transition-all active:scale-95">保存</button>
                          {diaryEntries[diaryDate] && (
                            <button onClick={() => deleteDiary(diaryDate)}
                              className="bg-red-500/15 text-red-400 px-5 py-3 rounded-2xl font-black text-[11px] border border-red-500/20 hover:bg-red-500/25 transition-all">削除</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右：日記一覧 */}
                    <div className="w-full lg:w-72 xl:w-80 shrink-0">
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-4 px-1 ${txMuted}`}>過去の日記</p>
                      {diaryDates.length === 0 ? (
                        <div className="rounded-[2rem] p-8 text-center" style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)"}}>
                          <p className={`text-[10px] font-medium ${txMuted}`}>まだ日記がありません</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
                          {diaryDates.map(date => {
                            const entry = diaryEntries[date];
                            const isSelected = date === diaryDate;
                            return (
                              <button key={date} onClick={() => setDiaryDate(date)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected ? 'bg-white/15 border-white/25' : 'bg-white/5 border-white/8 hover:bg-white/8'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-[10px] font-bold ${tx}`}>{new Date(date+'T00:00:00').toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'})}</span>
                                  {entry.mood && <span className="text-lg">{entry.mood}</span>}
                                </div>
                                <p className={`text-[10px] font-medium line-clamp-2 leading-relaxed ${txMuted}`}>{entry.text || "（内容なし）"}</p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
        </div>
      </main>

      {/* チャット画面 */}
      {selectedChatFriend && (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-2xl flex flex-col animate-in fade-in duration-300">
          <header className="p-6 flex items-center justify-between border-b border-white/8 shrink-0">
            <button onClick={() => setSelectedChatFriend(null)} className="w-9 h-9 glass rounded-xl flex items-center justify-center hover:bg-white/15 transition-all">←</button>
            <div className="text-center">
              <span className="font-black block">{selectedChatFriend.displayName}</span>
              {selectedChatFriend.lastActive && (Date.now() - selectedChatFriend.lastActive < 120000) && (
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">● Active Now</span>
              )}
            </div>
            <div className="w-9"></div>
          </header>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {userMessages.filter(m => m.chatId === [myDisplayId, selectedChatFriend.shortId].sort().join("_")).map((m, i) => (
              <div key={i} className={`flex ${m.fromId === myDisplayId ? 'justify-end' : 'justify-start'}`}>
                <div className="group relative max-w-[75%]">
                  <div className={`p-4 rounded-[1.8rem] text-sm font-semibold shadow-md ${m.fromId === myDisplayId ? "bg-blue-600 text-white rounded-tr-none" : isLight ? "bg-black/15 text-gray-900 rounded-tl-none" : "bg-zinc-800 text-gray-200 rounded-tl-none"}`}>
                    {m.text}
                    <p className="text-[7px] mt-1 opacity-40">{m.time}</p>
                  </div>
                  {m.fromId === myDisplayId && (
                    <button onClick={() => deleteMessage(m)} className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-400">🗑️</button>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef}></div>
          </div>
          <footer className="p-4 border-t border-white/8 bg-black/40 shrink-0">
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {["🔥 お疲れ様！", "👏 すごい！", "💪 頑張れ！", "😊 いいね！"].map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className={`shrink-0 px-4 py-2 rounded-xl font-bold text-[10px] whitespace-nowrap transition-all ${isLight ? "text-gray-700 hover:bg-black/10" : "text-gray-300 hover:bg-white/15"}`} style={{background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)"}}>{q}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="メッセージを入力..."
                className={`flex-1 text-sm font-medium p-3 rounded-2xl border outline-none transition-colors ${tx} ${isLight ? "bg-black/6 border-black/10 placeholder:text-gray-400 focus:border-black/20" : "bg-white/8 border-white/10 placeholder:text-gray-600 focus:border-white/20"}`} />
              <button onClick={() => sendMessage()} className="bg-white text-black px-5 rounded-2xl font-black text-[10px] shrink-0 hover:bg-gray-100 transition-all">送信</button>
            </div>
          </footer>
        </div>
      )}

      {/* Settings モーダル */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsMenuOpen(false)}>
          <div className={`backdrop-blur-2xl w-full max-w-md rounded-[3rem] border p-8 shadow-2xl relative ${isLight ? "bg-white/95 border-black/10 text-gray-900" : "bg-zinc-900/95 border-white/10 text-white"}`} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/15 transition-all">✕</button>
            <h2 className={`text-xl font-black italic mb-8 uppercase tracking-widest ${tx}`}>Settings</h2>
            <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
              <section>
                <p className={`text-[9px] font-black tracking-widest uppercase mb-3 ${txMuted}`}>Name</p>
                <div className="flex gap-2">
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className={`flex-1 text-[11px] font-medium p-4 rounded-xl border outline-none transition-colors ${tx} ${isLight ? "bg-black/6 border-black/12 focus:border-black/25" : "bg-black/40 border-white/8 focus:border-white/20"}`} />
                  <button onClick={async () => {
                    if (!user || !displayName.trim()) return;
                    await updateProfile(auth.currentUser, { displayName: displayName.trim() });
                    await saveToFirebase({ displayName: displayName.trim() });
                    showToast("名前を更新しました");
                  }} className="bg-white text-black px-6 rounded-xl font-black text-[10px] hover:bg-gray-100 transition-all">保存</button>
                </div>
              </section>
              <section>
                <p className={`text-[9px] font-black tracking-widest uppercase mb-3 ${txMuted}`}>Your ID</p>
                <div className="bg-black/40 p-4 rounded-2xl flex items-center justify-between border border-white/8">
                  <span className="font-mono font-black tracking-wider text-blue-500">{myDisplayId}</span>
                  <button onClick={() => { navigator.clipboard.writeText(myDisplayId); showToast("IDをコピーしました"); }}
                    className="text-[10px] font-black bg-white/8 px-3 py-1 rounded-lg hover:bg-white/15 transition-all">COPY</button>
                </div>
              </section>
              <section>
                <p className={`text-[9px] font-black tracking-widest uppercase mb-3 ${txMuted}`}>Icon</p>
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-16 h-16 rounded-full ${(CHARACTERS[charIndex] || CHARACTERS[0]).color} flex items-center justify-center overflow-hidden shadow-lg shrink-0`}>
                    {photoURL ? <img src={photoURL} alt="icon" className="w-full h-full object-cover" />
                      : emojiIcon ? <span className="text-2xl">{emojiIcon}</span>
                      : <div className="flex gap-1.5"><div className="w-2 h-2 bg-white rounded-full" /><div className="w-2 h-2 bg-white rounded-full" /></div>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[9px] font-black mb-2 uppercase tracking-widest ${txMuted}`}>現在のアイコン</p>
                    {(photoURL || emojiIcon) && (
                      <button onClick={() => { setPhotoURL(""); setEmojiIcon(""); saveToFirebase({ photoURL: "", emojiIcon: "" }); showToast("リセットしました"); }}
                        className="text-[8px] font-black bg-red-500/15 text-red-400 px-3 py-1 rounded-lg hover:bg-red-500/25 transition-all">リセット</button>
                    )}
                  </div>
                </div>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${txMuted}`}>📷 写真を使う</p>
                <input ref={iconFileRef} type="file" accept="image/*" className="hidden" onChange={handleIconPhotoUpload} />
                <button onClick={() => iconFileRef.current?.click()} className={`w-full glass py-3 rounded-xl font-black text-[10px] mb-5 transition-all ${tx} ${isLight ? "border border-black/12 hover:bg-black/10" : "border border-white/10 hover:bg-white hover:text-black"}`}>カメラロールから選択</button>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${txMuted}`}>😊 絵文字アイコン</p>
                <div className="grid grid-cols-8 gap-1.5 mb-5">
                  {EMOJI_ICONS.map((emoji) => (
                    <button key={emoji} onClick={() => { setEmojiIcon(emoji); setPhotoURL(""); saveToFirebase({ emojiIcon: emoji, photoURL: "" }); showToast("アイコンを変更しました"); }}
                      className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${emojiIcon === emoji && !photoURL ? 'bg-white scale-110 shadow-lg' : 'bg-white/5 hover:bg-white/15'}`}>{emoji}</button>
                  ))}
                </div>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${txMuted}`}>🎨 カラーキャラクター</p>
                <div className="grid grid-cols-6 gap-2">
                  {CHARACTERS.map((c, i) => (
                    <button key={c.id} onClick={() => { setCharIndex(i); setPhotoURL(""); setEmojiIcon(""); saveToFirebase({ charIndex: i, photoURL: "", emojiIcon: "" }); }}
                      className={`aspect-square rounded-full ${c.color} border-2 transition-all ${charIndex === i && !photoURL && !emojiIcon ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-70'}`}></button>
                  ))}
                </div>
              </section>
              <section>
                <p className={`text-[9px] font-black tracking-widest uppercase mb-2 ${txMuted}`}>Theme</p>
                <p className={`text-[9px] font-medium mb-3 h-4 ${txMuted}`}>{hoveredTheme !== null ? (THEMES[hoveredTheme]?.name ?? "") : themeIndex !== null ? (THEMES[themeIndex]?.name ?? "") : ""}</p>
                <div className="grid grid-cols-8 gap-2">
                  {THEMES.map((t, i) => (
                    <button key={i}
                      onClick={() => { setThemeIndex(i); saveToFirebase({ themeIndex: i }); }}
                      onMouseEnter={() => setHoveredTheme(i)}
                      onMouseLeave={() => setHoveredTheme(null)}
                      onTouchStart={() => setHoveredTheme(i)}
                      onTouchEnd={() => setHoveredTheme(null)}
                      className={`aspect-square rounded-lg ${t.bg} border-2 transition-all relative ${themeIndex === i ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-70'}`}>
                      {themeIndex === i && <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-black drop-shadow">✓</span>}
                    </button>
                  ))}
                </div>
              </section>
              <button onClick={() => signOut(auth)} className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl font-black text-[11px] uppercase border border-red-500/20 hover:bg-red-500/20 transition-all">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* タイマー完了モーダル */}
      {timerFinished && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/85 backdrop-blur-xl p-6">
          <div className="bg-white text-black p-8 rounded-[3rem] max-w-xs w-full shadow-2xl text-center">
            <span className="text-6xl mb-4 block animate-bounce">⏰</span>
            <h2 className="text-2xl font-black mb-2 italic tracking-tighter">時間です！</h2>
            <p className="text-[11px] font-medium text-gray-400 mb-8 uppercase tracking-widest">タイマーが終了しました</p>
            <button onClick={() => { setTimerFinished(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } }}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] shadow-xl hover:bg-gray-900 transition-all">OK</button>
          </div>
        </div>
      )}

      {/* チュートリアル */}
      {showTutorial && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 backdrop-blur-xl p-6">
          <div className="bg-white text-black p-8 rounded-[3rem] max-w-sm w-full shadow-2xl relative">
            <button onClick={closeTutorial} className="absolute top-6 right-8 text-2xl font-black text-gray-300 hover:text-black transition-colors">✕</button>
            <div className="text-center">
              <span className="text-5xl mb-6 block">🚀</span>
              <h2 className="text-2xl font-black mb-4 italic tracking-tighter">ROUTINE MASTERへようこそ！</h2>
              <div className="space-y-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-widest mb-8 border-y border-gray-100 py-6">
                <p className="flex items-center gap-3"><span className="text-blue-500 font-black">01</span> タスクを追加してチェックしよう</p>
                <p className="flex items-center gap-3"><span className="text-blue-500 font-black">02</span> キャラクターがあなたの頑張りを応援</p>
                <p className="flex items-center gap-3"><span className="text-blue-500 font-black">03</span> 友達をフォローして競い合おう</p>
              </div>
              <button onClick={closeTutorial} className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl hover:bg-gray-900 transition-all">START TRAINING</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
