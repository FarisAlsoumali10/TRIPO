import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft, Send, Wallet, MessageCircle,
  ArrowRight, Plus, X, Users, Receipt, CheckCircle2, Copy, Smartphone,
  Camera, Image as ImageIcon, Smile, Share2, Download,
} from 'lucide-react';
import { Button, Input } from '../components/ui';
import { PrivateTrip, User, ChatMessage, Expense } from '../types/index';
import { privateTripAPI } from '../services/api';
import { showToast } from '../components/Toast';

// ─── Settlement algorithm ──────────────────────────────────────────────────────
interface Settlement { from: User; to: User; amount: number; }

function calculateSettlements(members: User[], expenses: Expense[]): {
  balances: { member: User; paid: number; balance: number }[];
  settlements: Settlement[];
} {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson = totalExpenses / (members.length || 1);
  const balances = members.map(m => {
    const paid = expenses.filter(e => e.payerId === m.id).reduce((s, e) => s + e.amount, 0);
    return { member: m, paid, balance: paid - sharePerPerson };
  });
  const debtors   = balances.filter(b => b.balance < -0.01).map(b => ({ member: b.member, amount: Math.abs(b.balance) }));
  const creditors = balances.filter(b => b.balance >  0.01).map(b => ({ member: b.member, amount: b.balance }));
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const settlements: Settlement[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.5) settlements.push({ from: debtors[i].member, to: creditors[j].member, amount: Math.round(transfer) });
    debtors[i].amount -= transfer; creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return { balances, settlements };
}

// ─── Types & constants ─────────────────────────────────────────────────────────
interface TripPhoto {
  id: string; uploaderId: string; uploaderName: string; dataUrl: string; timestamp: number;
}

type Tab = 'chat' | 'expenses' | 'photos';

const EXPENSE_CATEGORIES = [
  { id: 'food',      emoji: '🍔', label: 'Food',       bg: 'bg-orange-100', text: 'text-orange-600' },
  { id: 'transport', emoji: '🚗', label: 'Transport',  bg: 'bg-blue-100',   text: 'text-blue-600'   },
  { id: 'hotel',     emoji: '🏨', label: 'Hotel',      bg: 'bg-purple-100', text: 'text-purple-600' },
  { id: 'activity',  emoji: '🎡', label: 'Activities', bg: 'bg-pink-100',   text: 'text-pink-600'   },
  { id: 'shopping',  emoji: '🛒', label: 'Shopping',   bg: 'bg-cyan-100',   text: 'text-cyan-600'   },
  { id: 'other',     emoji: '✈️', label: 'Other',      bg: 'bg-slate-100',  text: 'text-slate-600'  },
];

const QUICK_EMOJIS = ['😂', '❤️', '👍', '🔥', '😍', '🙏'];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatMsgDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupMessages(msgs: ChatMessage[]): { date: string; messages: ChatMessage[] }[] {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  for (const msg of msgs) {
    const label = formatMsgDate(msg.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.date === label) last.messages.push(msg);
    else groups.push({ date: label, messages: [msg] });
  }
  return groups;
}

function msgTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function countdownDays(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86400000) : null;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const PrivateTripScreen = ({
  trip, currentUser, onBack, onUpdateTrip,
}: {
  trip: PrivateTrip; currentUser: User; onBack: () => void; onUpdateTrip: (t: PrivateTrip) => void;
}) => {
  const [activeTab,       setActiveTab]       = useState<Tab>('chat');
  const [newMessage,      setNewMessage]       = useState('');
  const [showEmojiBar,    setShowEmojiBar]     = useState(false);
  const [showAddExpense,  setShowAddExpense]   = useState(false);
  const [stcPaySheet,     setStcPaySheet]      = useState<Settlement | null>(null);
  const [selectedPhoto,   setSelectedPhoto]    = useState<TripPhoto | null>(null);
  const [shareTarget,     setShareTarget]      = useState<TripPhoto | null>(null);
  const [showMembers,     setShowMembers]      = useState(false);

  const [settledKeys, setSettledKeys] = useState<Set<string>>(() => {
    try { const r = localStorage.getItem(`tripo_settled_${trip.id}`); return r ? new Set(JSON.parse(r)) : new Set(); }
    catch { return new Set(); }
  });

  const [tripPhotos, setTripPhotos] = useState<TripPhoto[]>(() => {
    try { const r = localStorage.getItem(`tripo_photos_${trip.id}`); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });

  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', payerId: currentUser.id, category: 'food' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trip.chatMessages, activeTab]);

  useEffect(() => {
    if (!trip.backendId) return;
    (async () => {
      try {
        const [msgs, exps] = await Promise.all([
          privateTripAPI.getMessages(trip.backendId!),
          privateTripAPI.getExpenses(trip.backendId!),
        ]);
        onUpdateTrip({ ...trip, chatMessages: msgs, expenses: exps });
      } catch { /* fallback */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.backendId]);

  // ── Photo helpers ─────────────────────────────────────────────────────────────
  const saveTripPhotos = (photos: TripPhoto[]) => {
    try { localStorage.setItem(`tripo_photos_${trip.id}`, JSON.stringify(photos)); }
    catch { showToast('Storage full — some photos may not be saved', 'warning'); }
  };

  const compressImage = (file: File): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 900;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = (height * MAX) / width; width = MAX; }
            else { width = (width * MAX) / height; height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPhotos: TripPhoto[] = [];
    for (const file of files.slice(0, 10)) {
      try {
        const dataUrl = await compressImage(file);
        newPhotos.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, uploaderId: currentUser.id, uploaderName: currentUser.name, dataUrl, timestamp: Date.now() });
      } catch { /* skip */ }
    }
    if (newPhotos.length) {
      const updated = [...tripPhotos, ...newPhotos];
      setTripPhotos(updated); saveTripPhotos(updated);
      showToast(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added!`, 'success');
    }
    e.target.value = '';
  };

  // ── Expense helpers ───────────────────────────────────────────────────────────
  const markSettled = (key: string) => {
    setSettledKeys(prev => {
      const next = new Set(prev).add(key);
      localStorage.setItem(`tripo_settled_${trip.id}`, JSON.stringify([...next]));
      return next;
    });
    showToast('Marked as paid!', 'success');
  };

  const copyAmount = (amount: number) => {
    navigator.clipboard.writeText(String(amount)).then(() => showToast('Amount copied!', 'success'));
  };

  const handleSharePhoto = async (photo: TripPhoto) => {
    try {
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${trip.title.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: trip.title } as any);
        return;
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // user cancelled
    }
    // Fallback: show share sheet
    setShareTarget(photo);
  };

  const downloadPhoto = (photo: TripPhoto) => {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `${trip.title.replace(/\s+/g, '_')}_photo.jpg`;
    a.click();
    showToast('Photo saved!', 'success');
  };

  const handleAddExpense = async () => {
    if (!newExpense.desc.trim() || !newExpense.amount) return;
    const optimistic: Expense = {
      id: Date.now().toString(), description: newExpense.desc, amount: parseFloat(newExpense.amount),
      payerId: newExpense.payerId, timestamp: Date.now(), category: newExpense.category,
    };
    onUpdateTrip({ ...trip, expenses: [...trip.expenses, optimistic] });
    setShowAddExpense(false);
    const { desc, amount, payerId, category } = newExpense;
    setNewExpense({ desc: '', amount: '', payerId: currentUser.id, category: 'food' });
    if (trip.backendId) {
      try {
        const saved = await privateTripAPI.addExpense(trip.backendId, desc, parseFloat(amount), payerId, trip.members.map(m => m.id));
        onUpdateTrip(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === optimistic.id ? { ...saved, category } : e) }) as any);
      } catch { showToast('Expense saved locally only', 'warning'); }
    }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const optimistic: ChatMessage = { id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name, text: newMessage, timestamp: Date.now() };
    onUpdateTrip({ ...trip, chatMessages: [...trip.chatMessages, optimistic] });
    const text = newMessage;
    setNewMessage(''); setShowEmojiBar(false);
    if (trip.backendId) {
      try {
        const saved = await privateTripAPI.sendMessage(trip.backendId, text);
        onUpdateTrip(prev => ({ ...prev, chatMessages: prev.chatMessages.map(m => m.id === optimistic.id ? saved : m) }) as any);
      } catch { /* stays optimistic */ }
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────────────
  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const { balances, settlements } = useMemo(() => calculateSettlements(trip.members, trip.expenses), [trip.members, trip.expenses]);
  const messageGroups = useMemo(() => groupMessages(trip.chatMessages), [trip.chatMessages]);
  const daysUntil = countdownDays(trip.startDate);
  const catMap = useMemo(() => Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c])), []);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 relative">

      {/* ── Hero Header ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600 px-5 pt-10 pb-4 relative overflow-hidden flex-shrink-0">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        {/* Back + member avatars row */}
        <div className="relative flex items-center justify-between mb-3">
          <button type="button" onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Stacked avatars */}
          <button
            type="button"
            onClick={() => setShowMembers(v => !v)}
            className="flex items-center gap-2"
          >
            <div className="flex -space-x-2">
              {trip.members.slice(0, 4).map(m => (
                <div key={m.id} className="w-8 h-8 rounded-full border-2 border-teal-600 bg-emerald-300 flex items-center justify-center text-emerald-900 text-xs font-bold flex-shrink-0">
                  {m.name?.charAt(0).toUpperCase()}
                </div>
              ))}
              {trip.members.length > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-teal-600 bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                  +{trip.members.length - 4}
                </div>
              )}
            </div>
            <span className="text-white/80 text-xs font-semibold">{trip.members.length} members</span>
          </button>
        </div>

        {/* Trip title & date */}
        <div className="relative mb-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-white text-xl font-extrabold leading-tight flex-1">{trip.title}</h1>
            {daysUntil !== null && (
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-2.5 py-1.5 flex-shrink-0 text-center">
                <p className="text-white text-lg font-extrabold leading-none">{daysUntil}</p>
                <p className="text-white/70 text-[9px] font-bold uppercase">days</p>
              </div>
            )}
          </div>
          {(trip.startDate || trip.endDate) && (
            <p className="text-emerald-100 text-xs mt-1">
              {trip.startDate && new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {trip.startDate && trip.endDate && ' → '}
              {trip.endDate && new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Overview stats pills */}
        <div className="relative flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-white text-xs font-semibold">{trip.chatMessages.length} messages</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-white text-xs font-semibold">{totalExpenses.toFixed(0)} SAR</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-white text-xs font-semibold">{tripPhotos.length} photos</span>
          </div>
        </div>

        {/* Members dropdown */}
        {showMembers && (
          <div className="absolute top-full left-0 right-0 mt-2 mx-4 bg-white rounded-2xl shadow-xl z-30 p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Members</p>
            <div className="space-y-2">
              {trip.members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                    {m.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{m.name}</p>
                    {m.id === trip.organizerId && (
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Organizer</p>
                    )}
                  </div>
                  {m.id === currentUser.id && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Pill Tab Bar ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-1 flex gap-1">
          {([
            { id: 'chat',     label: 'Chat',     icon: MessageCircle },
            { id: 'expenses', label: 'Expenses', icon: Receipt },
            { id: 'photos',   label: 'Photos',   icon: Camera },
          ] as const).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative min-h-0">

        {/* ── Chat Tab ────────────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-4">
              {trip.chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mb-3">
                    <MessageCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-slate-600 font-semibold text-sm">No messages yet</p>
                  <p className="text-slate-400 text-xs mt-1">Say hi to your travel crew! 👋</p>
                </div>
              )}

              {messageGroups.map(group => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.date}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  <div className="space-y-1.5">
                    {group.messages.map((msg, idx) => {
                      const isMe = msg.userId === currentUser.id;
                      const prevMsg = group.messages[idx - 1];
                      const showSender = !isMe && (!prevMsg || prevMsg.userId !== msg.userId);
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                          {/* Avatar (others only, on last in sequence) */}
                          {!isMe && (
                            <div className={`w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-[10px] font-bold flex-shrink-0 mb-0.5 ${
                              group.messages[idx + 1]?.userId === msg.userId ? 'opacity-0' : ''
                            }`}>
                              {msg.userName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            {showSender && (
                              <p className="text-[10px] text-slate-400 font-bold mb-0.5 ml-1">{msg.userName.split(' ')[0]}</p>
                            )}
                            <div className={`px-4 py-2.5 text-sm leading-relaxed ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md shadow-sm shadow-emerald-200'
                                : 'bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-sm border border-slate-100'
                            }`}>
                              {msg.text}
                            </div>
                            <p className={`text-[9px] mt-0.5 px-1 ${isMe ? 'text-slate-400 text-right' : 'text-slate-400'}`}>
                              {msgTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick emoji bar */}
            {showEmojiBar && (
              <div className="flex gap-2 px-4 py-2 bg-white border-t border-slate-50">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewMessage(m => m + emoji)}
                    className="text-2xl active:scale-90 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <form onSubmit={handleSendMessage} className="px-3 py-2.5 bg-white border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiBar(v => !v)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${showEmojiBar ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <Smile className="w-5 h-5" />
              </button>
              <input
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Message your crew..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        )}

        {/* ── Expenses Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'expenses' && (
          <div className="h-full overflow-y-auto px-4 pt-3 pb-28 space-y-4">

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-end mb-5">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Total Spent</p>
                  <p className="text-3xl font-extrabold">
                    {totalExpenses.toFixed(0)} <span className="text-sm font-normal text-emerald-400">SAR</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Per Person</p>
                  <p className="text-xl font-bold">{(totalExpenses / (trip.members.length || 1)).toFixed(0)} SAR</p>
                </div>
              </div>

              {/* Member balances with progress bars */}
              <div className="space-y-3">
                {balances.map(b => {
                  const pct = totalExpenses > 0 ? Math.min((b.paid / totalExpenses) * 100, 100) : 0;
                  return (
                    <div key={b.member.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {b.member.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-200 text-sm">{b.member.name.split(' ')[0]}</span>
                          <span className="text-slate-500 text-xs">· {b.paid.toFixed(0)} SAR</span>
                        </div>
                        <span className={`text-xs font-bold ${b.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {b.balance >= 0 ? `+${b.balance.toFixed(0)}` : b.balance.toFixed(0)}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${b.balance >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggested Payments */}
            {settlements.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50">
                  <h3 className="font-bold text-slate-900 text-sm">Suggested Payments</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Minimum transactions to settle up</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {settlements.map((s, i) => {
                    const key = `${s.from.id}-${s.to.id}-${s.amount}`;
                    const settled = settledKeys.has(key);
                    return (
                      <div key={i} className={`px-4 py-3 transition-opacity ${settled ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3 mb-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold flex-shrink-0">
                            {s.from.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${settled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {s.from.name.split(' ')[0]}
                              <ArrowRight className="w-3.5 h-3.5 inline mx-1 text-slate-400" />
                              {s.to.name.split(' ')[0]}
                            </p>
                            <p className="text-xs text-slate-500">{s.amount} SAR</p>
                          </div>
                          {settled ? (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="text-xs font-bold">Paid</span>
                            </div>
                          ) : (
                            <span className="font-bold text-slate-900 flex-shrink-0">{s.amount} SAR</span>
                          )}
                        </div>
                        {!settled && (
                          <div className="flex gap-2 ml-11">
                            <button onClick={() => setStcPaySheet(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#6B1D8A] hover:bg-[#5a1875] text-white text-xs font-bold rounded-xl transition-colors">
                              <Smartphone className="w-3.5 h-3.5" /> Pay via STC Pay
                            </button>
                            <button onClick={() => markSettled(key)} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {settlements.length === 0 && totalExpenses > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800 text-sm">All settled up! 🎉</p>
                  <p className="text-xs text-emerald-600">Everyone has paid their fair share.</p>
                </div>
              </div>
            )}

            {/* Expense List */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3">All Expenses</h3>
              {trip.expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-100">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                    <Wallet className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">No expenses yet</p>
                  <p className="text-slate-400 text-xs mt-1">Add your first expense to start tracking</p>
                  <button onClick={() => setShowAddExpense(true)} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition">
                    Add First Expense
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {trip.expenses.map(e => {
                    const payer = trip.members.find(m => m.id === e.payerId);
                    const cat = catMap[e.category || 'other'] || catMap['other'];
                    return (
                      <div key={e.id} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center gap-3 shadow-sm">
                        <div className={`w-11 h-11 rounded-xl ${cat.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                          {cat.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{e.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {cat.label} · Paid by {payer?.name.split(' ')[0] || 'Unknown'}
                          </p>
                        </div>
                        <span className="font-extrabold text-slate-900 flex-shrink-0">{e.amount} <span className="text-xs font-normal text-slate-400">SAR</span></span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Photos Tab ───────────────────────────────────────────────────────── */}
        {activeTab === 'photos' && (
          <div className="h-full overflow-y-auto">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />

            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Trip Photos</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tripPhotos.length === 0 ? 'No photos yet' : `${tripPhotos.length} photo${tripPhotos.length > 1 ? 's' : ''} shared`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-emerald-200"
              >
                <Camera className="w-4 h-4" /> Add Photo
              </button>
            </div>

            {tripPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                  <ImageIcon className="w-9 h-9 text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-700 text-base mb-1">Share your trip moments</h3>
                <p className="text-slate-400 text-sm max-w-xs">Upload photos so your whole crew can relive the memories together.</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-6 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors">
                  <Camera className="w-4 h-4" /> Upload First Photo
                </button>
              </div>
            ) : (
              <div className="px-4 pb-24">
                {/* Hero first photo */}
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(tripPhotos[0])}
                  className="relative w-full h-56 rounded-2xl overflow-hidden mb-2 active:scale-[0.99] transition-transform"
                >
                  <img src={tripPhotos[0].dataUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[9px] font-bold">
                      {tripPhotos[0].uploaderName?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-xs font-semibold">{tripPhotos[0].uploaderName.split(' ')[0]}</span>
                  </div>
                  {tripPhotos.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                      1 of {tripPhotos.length}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleSharePhoto(tripPhotos[0]); }}
                    className="absolute top-3 left-3 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <Share2 className="w-4 h-4 text-white" />
                  </button>
                </button>

                {/* 2-col grid for the rest */}
                {tripPhotos.length > 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    {tripPhotos.slice(1).map(photo => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setSelectedPhoto(photo)}
                        className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 active:scale-95 transition-transform"
                      >
                        <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-8">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[8px] font-bold">
                              {photo.uploaderName?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white text-[10px] font-semibold truncate">{photo.uploaderName.split(' ')[0]}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleSharePhoto(photo); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
                        >
                          <Share2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </button>
                    ))}
                    {/* Add more tile */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                    >
                      <Camera className="w-7 h-7 text-slate-300" />
                      <span className="text-xs text-slate-400 font-medium">Add Photo</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Expenses FAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <button
          onClick={() => setShowAddExpense(true)}
          className="absolute bottom-6 right-5 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl shadow-emerald-300 flex items-center justify-center active:scale-95 transition-all z-20"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ── Photo Lightbox ────────────────────────────────────────────────────── */}
      {selectedPhoto && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col" onClick={() => setSelectedPhoto(null)}>
          <div className="flex justify-between items-center p-4" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => handleSharePhoto(selectedPhoto)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30">
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button type="button" onClick={() => setSelectedPhoto(null)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4" onClick={e => e.stopPropagation()}>
            <img src={selectedPhoto.dataUrl} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
          </div>
          <div className="p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {selectedPhoto.uploaderName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{selectedPhoto.uploaderName}</p>
                <p className="text-white/50 text-xs">
                  {new Date(selectedPhoto.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STC Pay Sheet ────────────────────────────────────────────────────── */}
      {stcPaySheet && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end" onClick={() => setStcPaySheet(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#6B1D8A] flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">STC Pay</p>
                  <p className="text-xs text-slate-400">Instant transfer</p>
                </div>
              </div>
              <button onClick={() => setStcPaySheet(null)} className="p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="bg-[#6B1D8A] rounded-2xl p-5 mb-5 text-white text-center">
              <p className="text-white/70 text-xs mb-1 uppercase font-bold tracking-wide">Amount to Send</p>
              <p className="text-4xl font-extrabold mb-0.5">{stcPaySheet.amount}</p>
              <p className="text-white/70 text-sm">SAR</p>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-center items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full border border-white/40 bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                  {stcPaySheet.from.name?.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold">{stcPaySheet.from.name.split(' ')[0]}</span>
                <ArrowRight className="w-4 h-4 text-white/60" />
                <div className="w-6 h-6 rounded-full border border-white/40 bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                  {stcPaySheet.to.name?.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold">{stcPaySheet.to.name.split(' ')[0]}</span>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              {[
                { step: '1', text: `Open the STC Pay app on your phone` },
                { step: '2', text: `Tap "Send Money" → search for ${stcPaySheet.to.name.split(' ')[0]}` },
                { step: '3', text: `Enter ${stcPaySheet.amount} SAR and confirm` },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#6B1D8A]/10 text-[#6B1D8A] flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5">{step}</div>
                  <p className="text-slate-700 text-sm">{text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => copyAmount(stcPaySheet.amount)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-colors">
                <Copy className="w-4 h-4" /> Copy Amount
              </button>
              <button
                onClick={() => { const key = `${stcPaySheet.from.id}-${stcPaySheet.to.id}-${stcPaySheet.amount}`; markSettled(key); setStcPaySheet(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Photo Sheet ────────────────────────────────────────────────── */}
      {shareTarget && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShareTarget(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Share Photo</h3>
                <p className="text-xs text-slate-400 mt-0.5">Save it first, then share from the app</p>
              </div>
              <button onClick={() => setShareTarget(null)} className="p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Photo preview */}
            <div className="w-full h-40 rounded-2xl overflow-hidden mb-5 bg-slate-100">
              <img src={shareTarget.dataUrl} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Save to device */}
            <button
              onClick={() => { downloadPhoto(shareTarget); setShareTarget(null); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl mb-4 transition-colors shadow-sm shadow-emerald-200"
            >
              <Download className="w-4 h-4" />
              Save to Device
            </button>

            {/* App shortcuts */}
            <p className="text-[11px] text-slate-400 text-center font-medium mb-3 uppercase tracking-wider">Then open to share</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'WhatsApp',  emoji: '💬', color: 'bg-green-50  border-green-100',  textColor: 'text-green-700',  href: 'whatsapp://' },
                { name: 'Instagram', emoji: '📸', color: 'bg-pink-50   border-pink-100',   textColor: 'text-pink-700',   href: 'instagram://' },
                { name: 'Snapchat',  emoji: '👻', color: 'bg-yellow-50 border-yellow-100', textColor: 'text-yellow-700', href: 'snapchat://' },
                { name: 'Facebook',  emoji: '📘', color: 'bg-blue-50   border-blue-100',   textColor: 'text-blue-700',   href: 'fb://' },
              ].map(app => (
                <a
                  key={app.name}
                  href={app.href}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border ${app.color} active:scale-95 transition-transform`}
                >
                  <span className="text-2xl">{app.emoji}</span>
                  <span className={`text-[10px] font-bold ${app.textColor}`}>{app.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Expense Sheet ─────────────────────────────────────────────────── */}
      {showAddExpense && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Add Expense</h3>
              <button onClick={() => setShowAddExpense(false)} className="p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category picker */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewExpense(p => ({ ...p, category: cat.id }))}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 transition-all ${
                        newExpense.category === cat.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className={`text-[10px] font-bold ${newExpense.category === cat.id ? 'text-emerald-700' : 'text-slate-500'}`}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Description"
                placeholder="e.g. Dinner at Al Baik"
                value={newExpense.desc}
                onChange={(e: any) => setNewExpense({ ...newExpense, desc: e.target.value })}
              />
              <Input
                label="Amount (SAR)"
                type="number"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e: any) => setNewExpense({ ...newExpense, amount: e.target.value })}
              />

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paid by</label>
                <div className="flex gap-2 flex-wrap">
                  {trip.members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setNewExpense({ ...newExpense, payerId: m.id })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                        newExpense.payerId === m.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${newExpense.payerId === m.id ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        {m.name?.charAt(0).toUpperCase()}
                      </div>
                      {m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddExpense(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddExpense}>Add Expense</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
