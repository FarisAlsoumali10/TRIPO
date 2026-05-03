import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft, Send, Wallet, MessageCircle, ArrowRight, Plus, X, Users,
  Receipt, CheckCircle2, Copy, Smartphone, Camera, Image as ImageIcon,
  Smile, Share2, Download, Heart, Pin, MapPin, Trash2, BarChart2,
  FileText, CheckSquare, Square, Pencil, ChevronDown, ChevronUp,
  Mic, MicOff, Navigation, Play, Pause, Images, Video,
} from 'lucide-react';
import { Button, Input } from '../components/ui';
import { PrivateTrip, User, ChatMessage, Expense } from '../types/index';
import { privateTripAPI } from '../services/api';
import { showToast } from '../components/Toast';

// ─── localStorage helpers ──────────────────────────────────────────────────────
function lsGet<T>(key: string, def: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; }
  catch { return def; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── Local types ───────────────────────────────────────────────────────────────
interface TripPhoto {
  id: string; uploaderId: string; uploaderName: string;
  dataUrl: string; timestamp: number;
  caption?: string; likes?: string[];
}

interface ChecklistItem {
  id: string; text: string; done: boolean;
  assigneeId?: string; category: 'pack' | 'buy' | 'book';
}

interface Poll { question: string; options: string[]; }
interface Settlement { from: User; to: User; amount: number; }

type Tab = 'chat' | 'split' | 'memories' | 'plan' | 'checklist';
type CheckCat = 'all' | 'pack' | 'buy' | 'book';

// ─── Constants ─────────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { id: 'food',      emoji: '🍔', label: 'Food',       bg: 'bg-orange-100', text: 'text-orange-600', barColor: '#fb923c' },
  { id: 'transport', emoji: '🚗', label: 'Transport',  bg: 'bg-blue-100',   text: 'text-blue-600',   barColor: '#60a5fa' },
  { id: 'hotel',     emoji: '🏨', label: 'Hotel',      bg: 'bg-purple-100', text: 'text-purple-600', barColor: '#c084fc' },
  { id: 'activity',  emoji: '🎡', label: 'Activities', bg: 'bg-pink-100',   text: 'text-pink-600',   barColor: '#f472b6' },
  { id: 'shopping',  emoji: '🛒', label: 'Shopping',   bg: 'bg-cyan-100',   text: 'text-cyan-600',   barColor: '#22d3ee' },
  { id: 'other',     emoji: '✈️', label: 'Other',      bg: 'bg-slate-100',  text: 'text-slate-600',  barColor: '#94a3b8' },
];

const QUICK_EMOJIS    = ['😂', '❤️', '👍', '🔥', '😍', '🙏'];
const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢', '👏'];

const CHECKLIST_CATS = [
  { id: 'all',  label: 'All',     emoji: '📋' },
  { id: 'pack', label: 'To Pack', emoji: '🧳' },
  { id: 'buy',  label: 'To Buy',  emoji: '🛒' },
  { id: 'book', label: 'To Book', emoji: '📌' },
] as const;

// ─── Settlement algorithm (supports custom splits per expense) ─────────────────
function calculateSettlements(
  members: User[],
  expenses: Expense[],
  customSplitsMap: Record<string, string[]> = {},
): { balances: { member: User; paid: number; balance: number }[]; settlements: Settlement[] } {
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};
  members.forEach(m => { paid[m.id] = 0; owed[m.id] = 0; });

  for (const e of expenses) {
    if (paid[e.payerId] !== undefined) paid[e.payerId] += e.amount;
    const parts = customSplitsMap[e.id]
      ? members.filter(m => customSplitsMap[e.id].includes(m.id))
      : members;
    if (!parts.length) continue;
    const share = e.amount / parts.length;
    parts.forEach(p => { if (owed[p.id] !== undefined) owed[p.id] += share; });
  }

  const balances = members.map(m => ({
    member: m, paid: paid[m.id] || 0,
    balance: (paid[m.id] || 0) - (owed[m.id] || 0),
  }));

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

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatMsgDate(ts: number): string {
  const d = new Date(ts); const today = new Date(); const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
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

function tripStatus(start?: string, end?: string): 'upcoming' | 'ongoing' | 'past' | 'unknown' {
  if (!start) return 'unknown';
  const now = Date.now(); const s = new Date(start).getTime(); const e = end ? new Date(end).getTime() : null;
  if (now < s) return 'upcoming';
  if (e && now > e) return 'past';
  return 'ongoing';
}

function daysUntilDate(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86400000) : null;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const PrivateTripScreen = ({
  trip, currentUser, onBack, onUpdateTrip, lang,
}: {
  trip: PrivateTrip; currentUser: User; onBack: () => void; onUpdateTrip: (t: PrivateTrip) => void; lang?: 'en' | 'ar';
}) => {
  const ar = lang === 'ar';
  // ── Tab ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // ── Share ─────────────────────────────────────────────────────────────────
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!trip.backendId) { showToast('Trip not synced yet', 'warning'); return; }
    setIsSharing(true);
    try {
      const token = await privateTripAPI.getInviteToken(trip.backendId);
      const link = `${window.location.origin}?joinTrip=${token}`;
      if (navigator.share) {
        await navigator.share({ title: trip.title, text: `Join my trip "${trip.title}" on Tripo!`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        showToast('Invite link copied!', 'success');
      }
    } catch {
      showToast('Failed to get invite link', 'error');
    }
    setIsSharing(false);
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [newMessage,    setNewMessage]    = useState('');
  const [showEmojiBar,  setShowEmojiBar]  = useState(false);
  const [showPollForm,  setShowPollForm]  = useState(false);
  const [pollForm,      setPollForm]      = useState({ question: '', options: ['', ''] });
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [reactions,     setReactions]     = useState<Record<string, Record<string, string[]>>>(
    () => lsGet(`tripo_reactions_${trip.id}`, {}),
  );
  const [pinnedIds, setPinnedIds] = useState<string[]>(
    () => lsGet(`tripo_pinned_${trip.id}`, []),
  );
  const [polls,      setPolls]      = useState<Record<string, Poll>>(() => lsGet(`tripo_polls_${trip.id}`, {}));
  const [pollVotes,  setPollVotes]  = useState<Record<string, number>>(() => lsGet(`tripo_poll_votes_${trip.id}`, {}));

  // ── Expenses ──────────────────────────────────────────────────────────────
  const [showAddExpense,  setShowAddExpense]  = useState(false);
  const [stcPaySheet,     setStcPaySheet]     = useState<Settlement | null>(null);
  const [budgetCap,       setBudgetCap]       = useState<number | null>(() => lsGet(`tripo_budget_${trip.id}`, null));
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [newBudgetInput,  setNewBudgetInput]  = useState('');
  const [customSplitsMap, setCustomSplitsMap] = useState<Record<string, string[]>>(
    () => lsGet(`tripo_splits_${trip.id}`, {}),
  );
  const [newExpense, setNewExpense] = useState({
    desc: '', amount: '', payerId: currentUser.id, category: 'food',
    splitParticipants: trip.members.map(m => m.id),
  });
  const [settledKeys, setSettledKeys] = useState<Set<string>>(
    () => new Set<string>(lsGet(`tripo_settled_${trip.id}`, [])),
  );

  // ── Photos ────────────────────────────────────────────────────────────────
  const [tripPhotos,    setTripPhotos]    = useState<TripPhoto[]>(() => lsGet(`tripo_photos_${trip.id}`, []));
  const [selectedPhoto, setSelectedPhoto] = useState<TripPhoto | null>(null);
  const [shareTarget,   setShareTarget]   = useState<TripPhoto | null>(null);
  const [editCaptionId, setEditCaptionId] = useState<string | null>(null);
  const [captionInput,  setCaptionInput]  = useState('');

  // ── Plan / Notes ──────────────────────────────────────────────────────────
  const [tripNotes,      setTripNotes]      = useState<string>(() => lsGet(`tripo_notes_${trip.id}`, ''));
  const [notesExpanded,  setNotesExpanded]  = useState(false);
  const [savedTrips,     setSavedTrips]     = useState<{ id: string; name: string; placeIds: string[] }[]>(
    () => lsGet('tripo_trips', []),
  );

  // ── Checklist ─────────────────────────────────────────────────────────────
  const [checklist,       setChecklist]       = useState<ChecklistItem[]>(() => lsGet(`tripo_checklist_${trip.id}`, []));
  const [checkCat,        setCheckCat]        = useState<CheckCat>('all');
  const [newCheckText,    setNewCheckText]    = useState('');
  const [newCheckCat,     setNewCheckCat]     = useState<'pack' | 'buy' | 'book'>('pack');
  const [newCheckAssignee,setNewCheckAssignee]= useState('');

  // ── Voice recording ───────────────────────────────────────────────────────
  const [isRecording,    setIsRecording]    = useState(false);
  const [recordingTime,  setRecordingTime]  = useState(0);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Chat media ────────────────────────────────────────────────────────────
  const chatFileInputRef  = useRef<HTMLInputElement>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{src: string; type: 'image'|'video'} | null>(null);

  // ── Memories slideshow ────────────────────────────────────────────────────
  const [slideIdx,     setSlideIdx]     = useState(0);
  const [slidePlaying, setSlidePlaying] = useState(true);
  const slideTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const tripRef        = useRef(trip);
  useEffect(() => { tripRef.current = trip; }, [trip]);

  // ── Effects ───────────────────────────────────────────────────────────────
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

  // Reload savedTrips when plan tab opens
  useEffect(() => {
    if (activeTab === 'plan') setSavedTrips(lsGet('tripo_trips', []));
  }, [activeTab]);

  // Real-time polling — fetch new messages every 5s while on chat tab
  useEffect(() => {
    if (!trip.backendId) return;
    const poll = async () => {
      try {
        const msgs = await privateTripAPI.getMessages(tripRef.current.backendId!);
        onUpdateTrip({ ...tripRef.current, chatMessages: msgs });
      } catch {}
    };
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.backendId]);

  // Slideshow auto-advance
  const allSlideMedia = useMemo(() => {
    const fromChat = trip.chatMessages
      .filter(m => m.msgType === 'image' || m.msgType === 'video')
      .map(m => ({ src: m.text, type: (m.msgType as 'image' | 'video'), uploaderName: m.userName, timestamp: m.timestamp }));
    const fromPhotos = tripPhotos.map(p => ({ src: p.dataUrl, type: 'image' as const, uploaderName: p.uploaderName, timestamp: p.timestamp }));
    return [...fromPhotos, ...fromChat].sort((a, b) => a.timestamp - b.timestamp);
  }, [trip.chatMessages, tripPhotos]);

  useEffect(() => {
    if (!slidePlaying || allSlideMedia.length < 2 || activeTab !== 'memories') return;
    slideTimerRef.current = setInterval(() => {
      setSlideIdx(i => (i + 1) % allSlideMedia.length);
    }, 4000);
    return () => { if (slideTimerRef.current) clearInterval(slideTimerRef.current); };
  }, [slidePlaying, allSlideMedia.length, activeTab]);

  // Voice recording handlers
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async ev => {
          const dataUrl = ev.target!.result as string;
          await sendMediaMessage(dataUrl, 'audio');
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { showToast('Microphone access denied', 'error'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, [isRecording]);

  const sendMediaMessage = useCallback(async (dataUrl: string, type: 'image' | 'audio' | 'video') => {
    const optimistic = {
      id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name,
      text: dataUrl, msgType: type as any, timestamp: Date.now(),
    };
    onUpdateTrip({ ...tripRef.current, chatMessages: [...tripRef.current.chatMessages, optimistic] });
    if (tripRef.current.backendId) {
      try { await privateTripAPI.sendMessage(tripRef.current.backendId, dataUrl, type); } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, currentUser.name]);

  const handleChatMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target!.result as string;
      if (isVideo) {
        await sendMediaMessage(dataUrl, 'video');
      } else {
        const dataUrlCompressed = await compressImage(file);
        await sendMediaMessage(dataUrlCompressed, 'image');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) { showToast('Location not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const content = JSON.stringify({ lat, lng });
      const optimistic = {
        id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name,
        text: content, msgType: 'location' as any, timestamp: Date.now(),
      };
      onUpdateTrip({ ...tripRef.current, chatMessages: [...tripRef.current.chatMessages, optimistic] });
      if (tripRef.current.backendId) {
        try { await privateTripAPI.sendMessage(tripRef.current.backendId, content, 'location'); } catch {}
      }
    }, () => showToast('Location access denied', 'error'));
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const { balances, settlements } = useMemo(
    () => calculateSettlements(trip.members, trip.expenses, customSplitsMap),
    [trip.members, trip.expenses, customSplitsMap],
  );
  const messageGroups    = useMemo(() => groupMessages(trip.chatMessages), [trip.chatMessages]);
  const catMap           = useMemo(() => Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c])), []);
  const filteredChecklist= useMemo(
    () => checkCat === 'all' ? checklist : checklist.filter(i => i.category === checkCat),
    [checklist, checkCat],
  );
  const doneCount        = useMemo(() => checklist.filter(i => i.done).length, [checklist]);
  const status           = tripStatus(trip.startDate, trip.endDate);
  const daysUntilStart   = status === 'upcoming' ? daysUntilDate(trip.startDate) : null;
  const daysLeft         = status === 'ongoing'  ? daysUntilDate(trip.endDate)   : null;
  const budgetPct        = budgetCap ? Math.min((totalExpenses / budgetCap) * 100, 100) : null;
  const firstPinnedMsg   = useMemo(
    () => pinnedIds.length > 0 ? trip.chatMessages.find(m => m.id === pinnedIds[0]) : null,
    [pinnedIds, trip.chatMessages],
  );
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of trip.expenses) totals[e.category || 'other'] = (totals[e.category || 'other'] || 0) + e.amount;
    return EXPENSE_CATEGORIES
      .filter(c => totals[c.id])
      .map(c => ({ ...c, total: totals[c.id], pct: totalExpenses > 0 ? (totals[c.id] / totalExpenses) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [trip.expenses, totalExpenses]);

  // ── Photo helpers ─────────────────────────────────────────────────────────
  const savePhotos = (photos: TripPhoto[]) => {
    try { lsSet(`tripo_photos_${trip.id}`, photos); }
    catch { showToast('Storage full — some photos may not be saved', 'warning'); }
  };

  const compressImage = (file: File): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 900; let { width, height } = img;
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
    const files = Array.from(e.target.files ?? []) as File[];
    if (!files.length) return;
    const newPhotos: TripPhoto[] = [];
    for (const file of files.slice(0, 10)) {
      try {
        const dataUrl = await compressImage(file);
        newPhotos.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, uploaderId: currentUser.id, uploaderName: currentUser.name, dataUrl, timestamp: Date.now(), likes: [] });
      } catch { /* skip */ }
    }
    if (newPhotos.length) {
      const updated = [...tripPhotos, ...newPhotos];
      setTripPhotos(updated); savePhotos(updated);
      showToast(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added!`, 'success');
    }
    e.target.value = '';
  };

  const togglePhotoLike = (photoId: string) => {
    const updated = tripPhotos.map(p => {
      if (p.id !== photoId) return p;
      const likes = p.likes || [];
      return { ...p, likes: likes.includes(currentUser.id) ? likes.filter(id => id !== currentUser.id) : [...likes, currentUser.id] };
    });
    setTripPhotos(updated); savePhotos(updated);
    if (selectedPhoto?.id === photoId) setSelectedPhoto(updated.find(p => p.id === photoId) || null);
  };

  const saveCaption = (photoId: string, caption: string) => {
    const updated = tripPhotos.map(p => p.id === photoId ? { ...p, caption } : p);
    setTripPhotos(updated); savePhotos(updated);
    if (selectedPhoto?.id === photoId) setSelectedPhoto({ ...selectedPhoto, caption });
    setEditCaptionId(null);
    showToast('Caption saved!', 'success');
  };

  const handleSharePhoto = async (photo: TripPhoto) => {
    try {
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${trip.title.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
      if ((navigator as any).canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: trip.title } as any); return; }
    } catch (e: any) { if (e?.name === 'AbortError') return; }
    setShareTarget(photo);
  };

  const downloadPhoto = (photo: TripPhoto) => {
    const a = document.createElement('a'); a.href = photo.dataUrl;
    a.download = `${trip.title.replace(/\s+/g, '_')}_photo.jpg`; a.click();
    showToast('Photo saved!', 'success');
  };

  // ── Expense helpers ───────────────────────────────────────────────────────
  const markSettled = (key: string) => {
    setSettledKeys(prev => { const next = new Set(prev).add(key); lsSet(`tripo_settled_${trip.id}`, [...next]); return next; });
    showToast('Marked as paid!', 'success');
  };

  const copyAmount = (amount: number) =>
    navigator.clipboard.writeText(String(amount)).then(() => showToast('Amount copied!', 'success'));

  const handleAddExpense = async () => {
    const { desc, amount, payerId, category, splitParticipants } = newExpense;
    if (!desc.trim() || !amount) return;
    if (!splitParticipants.length) { showToast('Select at least one person to split with', 'warning'); return; }
    const optimistic: Expense = { id: Date.now().toString(), description: desc, amount: parseFloat(amount), payerId, timestamp: Date.now(), category };
    if (splitParticipants.length !== trip.members.length) {
      const newSplits = { ...customSplitsMap, [optimistic.id]: splitParticipants };
      setCustomSplitsMap(newSplits); lsSet(`tripo_splits_${trip.id}`, newSplits);
    }
    onUpdateTrip({ ...trip, expenses: [...trip.expenses, optimistic] });
    setShowAddExpense(false);
    setNewExpense({ desc: '', amount: '', payerId: currentUser.id, category: 'food', splitParticipants: trip.members.map(m => m.id) });
    if (trip.backendId) {
      try {
        const saved = await privateTripAPI.addExpense(trip.backendId, desc, parseFloat(amount), payerId, trip.members.map(m => m.id));
        onUpdateTrip({ ...trip, expenses: trip.expenses.map((e: any) => e.id === optimistic.id ? { ...saved, category } : e) } as any);
      } catch { showToast('Expense saved locally only', 'warning'); }
    }
  };

  const handleSetBudget = () => {
    const val = parseFloat(newBudgetInput);
    if (val > 0) { setBudgetCap(val); lsSet(`tripo_budget_${trip.id}`, val); showToast(`Budget set to ${val} SAR`, 'success'); }
    else         { setBudgetCap(null); lsSet(`tripo_budget_${trip.id}`, null); showToast('Budget removed', 'info'); }
    setShowBudgetInput(false); setNewBudgetInput('');
  };

  const handleExport = () => {
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dateStr = [trip.startDate, trip.endDate].filter(Boolean).map(d => fmt(d!)).join(' → ');
    const lines = [
      `🗺️ ${trip.title}`,
      dateStr && `📅 ${dateStr}`,
      `👥 ${trip.members.map(m => m.name.split(' ')[0]).join(', ')}`,
      '─'.repeat(28),
      `💰 Total: ${totalExpenses.toFixed(0)} SAR`,
      `👤 Per person: ${(totalExpenses / (trip.members.length || 1)).toFixed(0)} SAR`,
      budgetCap ? `🎯 Budget: ${budgetCap} SAR (${budgetPct?.toFixed(0)}% used)` : '',
      '',
      categoryBreakdown.length > 0 ? '📊 By Category:' : '',
      ...categoryBreakdown.map(c => `  ${c.emoji} ${c.label}: ${c.total.toFixed(0)} SAR (${c.pct.toFixed(0)}%)`),
      '',
      '💸 Settlements:',
      ...settlements.map(s => `  • ${s.from.name.split(' ')[0]} → ${s.to.name.split(' ')[0]}: ${s.amount} SAR`),
      settlements.length === 0 ? '  ✅ All settled up!' : '',
      '─'.repeat(28),
      'Generated by Tripo 🌍',
    ].filter(l => l !== undefined && l !== null) as string[];
    const text = lines.filter(Boolean).join('\n');
    if (navigator.share) navigator.share({ title: trip.title, text }).catch(() => {});
    else navigator.clipboard.writeText(text).then(() => showToast('Summary copied!', 'success'));
  };

  // ── Chat helpers ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const optimistic: ChatMessage = { id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name, text: newMessage, timestamp: Date.now() };
    onUpdateTrip({ ...trip, chatMessages: [...trip.chatMessages, optimistic] });
    const text = newMessage; setNewMessage(''); setShowEmojiBar(false);
    if (trip.backendId) {
      try {
        const saved = await privateTripAPI.sendMessage(trip.backendId, text);
        onUpdateTrip({ ...trip, chatMessages: trip.chatMessages.map((m: any) => m.id === optimistic.id ? saved : m) } as any);
      } catch { /* stays optimistic */ }
    }
  };

  const handleSendPoll = () => {
    const validOpts = pollForm.options.filter(o => o.trim());
    if (!pollForm.question.trim() || validOpts.length < 2) { showToast('Add a question and at least 2 options', 'warning'); return; }
    const msgId = Date.now().toString();
    const pollMsg: ChatMessage = { id: msgId, userId: currentUser.id, userName: currentUser.name, text: `📊 Poll: ${pollForm.question}`, timestamp: Date.now() };
    const newPolls = { ...polls, [msgId]: { question: pollForm.question, options: validOpts } };
    setPolls(newPolls); lsSet(`tripo_polls_${trip.id}`, newPolls);
    onUpdateTrip({ ...trip, chatMessages: [...trip.chatMessages, pollMsg] });
    setPollForm({ question: '', options: ['', ''] }); setShowPollForm(false);
  };

  const handleVotePoll = (msgId: string, optionIdx: number) => {
    if (pollVotes[msgId] !== undefined) return;
    const newVotes = { ...pollVotes, [msgId]: optionIdx };
    setPollVotes(newVotes); lsSet(`tripo_poll_votes_${trip.id}`, newVotes);
    showToast('Vote recorded!', 'success');
  };

  const handleReact = (msgId: string, emoji: string) => {
    const msgReacts = { ...(reactions[msgId] || {}) };
    const voters = msgReacts[emoji] || [];
    const newVoters = voters.includes(currentUser.id) ? voters.filter(id => id !== currentUser.id) : [...voters, currentUser.id];
    if (newVoters.length) msgReacts[emoji] = newVoters; else delete msgReacts[emoji];
    const newReactions = { ...reactions };
    if (Object.keys(msgReacts).length) newReactions[msgId] = msgReacts; else delete newReactions[msgId];
    setReactions(newReactions); lsSet(`tripo_reactions_${trip.id}`, newReactions);
    setSelectedMsgId(null);
  };

  const handlePin = (msgId: string) => {
    const isPinned = pinnedIds.includes(msgId);
    const newPinned = isPinned ? pinnedIds.filter(id => id !== msgId) : [msgId, ...pinnedIds];
    setPinnedIds(newPinned); lsSet(`tripo_pinned_${trip.id}`, newPinned);
    showToast(isPinned ? 'Unpinned' : 'Message pinned!', 'success');
    setSelectedMsgId(null);
  };

  // ── Checklist helpers ─────────────────────────────────────────────────────
  const handleAddCheckItem = () => {
    if (!newCheckText.trim()) return;
    const item: ChecklistItem = { id: Date.now().toString(), text: newCheckText.trim(), done: false, category: newCheckCat, assigneeId: newCheckAssignee || undefined };
    const updated = [...checklist, item];
    setChecklist(updated); lsSet(`tripo_checklist_${trip.id}`, updated);
    setNewCheckText('');
  };

  const handleToggleCheck = (id: string) => {
    const updated = checklist.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setChecklist(updated); lsSet(`tripo_checklist_${trip.id}`, updated);
  };

  const handleDeleteCheck = (id: string) => {
    const updated = checklist.filter(i => i.id !== id);
    setChecklist(updated); lsSet(`tripo_checklist_${trip.id}`, updated);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 relative">

      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-4 relative overflow-hidden flex-shrink-0" style={{ background: trip.coverImage ? 'transparent' : undefined }}>
        {/* Cover image or gradient */}
        {trip.coverImage ? (
          <>
            <img src={trip.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600" />
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          </>
        )}

        {/* Back + share + member avatars */}
        <div className="relative flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:bg-white/10 border border-white/30 rounded-full px-3 py-2 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-bold">{isSharing ? 'Getting link…' : 'Invite'}</span>
            </button>
          </div>
          <button type="button" onClick={() => setShowMembers(v => !v)} className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {trip.members.slice(0, 4).map(m => (
                <div key={m.id} className="w-8 h-8 rounded-full border-2 border-teal-600 bg-emerald-300 flex items-center justify-center text-emerald-900 text-xs font-bold flex-shrink-0">
                  {m.name?.charAt(0).toUpperCase()}
                </div>
              ))}
              {trip.members.length > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-teal-600 bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">+{trip.members.length - 4}</div>
              )}
            </div>
            <span className="text-white/80 text-xs font-semibold">{trip.members.length} members</span>
          </button>
        </div>

        {/* Title + countdown */}
        <div className="relative mb-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-white text-xl font-extrabold leading-tight">{trip.title}</h1>
                {status === 'ongoing' && (
                  <span className="bg-emerald-400 text-emerald-900 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">Live</span>
                )}
                {status === 'past' && (
                  <span className="bg-white/20 text-white/70 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Completed</span>
                )}
              </div>
              {trip.destination && (
                <div className="flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3 text-emerald-300 flex-shrink-0" />
                  <span className="text-emerald-200 text-xs font-semibold">{trip.destination}</span>
                </div>
              )}
              {(trip.startDate || trip.endDate) && (
                <p className="text-emerald-100 text-xs">
                  {trip.startDate && new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {trip.startDate && trip.endDate && ' → '}
                  {trip.endDate && new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
            {daysUntilStart !== null && (
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-2 text-center flex-shrink-0">
                <p className="text-white text-xl font-extrabold leading-none">{daysUntilStart}</p>
                <p className="text-white/70 text-[9px] font-bold uppercase">days to go</p>
              </div>
            )}
            {daysLeft !== null && (
              <div className="bg-emerald-400/30 backdrop-blur-sm border border-emerald-300/50 rounded-xl px-3 py-2 text-center flex-shrink-0">
                <p className="text-white text-xl font-extrabold leading-none">{daysLeft}</p>
                <p className="text-white/70 text-[9px] font-bold uppercase">days left</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats pills */}
        <div className="relative flex gap-2 flex-wrap">
          {[
            { icon: MessageCircle, val: `${trip.chatMessages.length}` },
            { icon: Wallet,        val: `${totalExpenses.toFixed(0)} SAR` },
            { icon: Camera,        val: `${tripPhotos.length}` },
          ].map(({ icon: Icon, val }) => (
            <div key={val} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
              <Icon className="w-3.5 h-3.5 text-emerald-200" />
              <span className="text-white text-xs font-semibold">{val}</span>
            </div>
          ))}
          {checklist.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-200" />
              <span className="text-white text-xs font-semibold">{doneCount}/{checklist.length}</span>
            </div>
          )}
        </div>

        {/* Budget bar (if set) */}
        {budgetCap && budgetPct !== null && (
          <div className="relative mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white/70 text-[10px] font-bold uppercase">Budget</span>
              <span className={`text-[10px] font-bold ${budgetPct >= 90 ? 'text-red-300' : budgetPct >= 70 ? 'text-yellow-300' : 'text-emerald-300'}`}>
                {totalExpenses.toFixed(0)} / {budgetCap} SAR
              </span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${budgetPct >= 90 ? 'bg-red-400' : budgetPct >= 70 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${budgetPct}%` }} />
            </div>
          </div>
        )}

        {/* Members dropdown */}
        {showMembers && (
          <div className="absolute top-full left-0 right-0 mt-2 mx-4 bg-white rounded-2xl shadow-xl z-30 p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Members</p>
            <div className="space-y-2">
              {trip.members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">{m.name?.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{m.name}</p>
                    {m.id === trip.organizerId && <p className="text-[10px] text-emerald-600 font-bold uppercase">Organizer</p>}
                  </div>
                  {m.id === currentUser.id && <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">{ar ? 'أنت' : 'You'}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 5-Tab Bar ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-1 flex gap-0.5">
          {([
            { id: 'chat',      label: ar ? 'دردشة'    : 'Chat',     Icon: MessageCircle },
            { id: 'split',     label: ar ? 'التكاليف' : 'Split',    Icon: Receipt },
            { id: 'memories',  label: ar ? 'الذكريات' : 'Memories', Icon: Images },
            { id: 'plan',      label: ar ? 'الخطة'    : 'Plan',     Icon: MapPin },
            { id: 'checklist', label: ar ? 'حقيبتي'   : 'Pack',     Icon: CheckSquare },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all ${
                activeTab === id ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative min-h-0" onClick={() => setSelectedMsgId(null)}>

        {/* ── Chat Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">

            {/* Pinned message banner */}
            {firstPinnedMsg && (
              <div className="mx-3 mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2 flex-shrink-0">
                <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-800 flex-1 truncate">{firstPinnedMsg.text.replace(/^📊 Poll: /, '')}</p>
                <button type="button" onClick={e => { e.stopPropagation(); handlePin(firstPinnedMsg.id); }} className="text-amber-400 hover:text-amber-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-4" onClick={() => setSelectedMsgId(null)}>
              {trip.chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mb-3">
                    <MessageCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-slate-600 font-semibold text-sm">{ar ? 'لا رسائل حتى الآن' : 'No messages yet'}</p>
                  <p className="text-slate-400 text-xs mt-1">{ar ? 'رحّب بفريقك! 👋' : 'Say hi to your travel crew! 👋'}</p>
                </div>
              )}

              {messageGroups.map(group => (
                <div key={group.date}>
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.date}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  <div className="space-y-1.5">
                    {group.messages.map((msg, idx) => {
                      const isMe    = msg.userId === currentUser.id;
                      const prevMsg = group.messages[idx - 1];
                      const showSender = !isMe && (!prevMsg || prevMsg.userId !== msg.userId);
                      const msgReacts  = reactions[msg.id] || {};
                      const poll       = polls[msg.id];
                      const myVote     = pollVotes[msg.id];
                      const isPinned   = pinnedIds.includes(msg.id);
                      const isSelected = selectedMsgId === msg.id;

                      return (
                        <div key={msg.id}>
                          <div
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                            onClick={e => { e.stopPropagation(); setSelectedMsgId(isSelected ? null : msg.id); }}
                          >
                            {!isMe && (
                              <div className={`w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-[10px] font-bold flex-shrink-0 mb-0.5 ${group.messages[idx + 1]?.userId === msg.userId ? 'opacity-0' : ''}`}>
                                {msg.userName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              {showSender && <p className="text-[10px] text-slate-400 font-bold mb-0.5 ml-1">{msg.userName.split(' ')[0]}</p>}
                              {isPinned && (
                                <div className="flex items-center gap-1 mb-0.5">
                                  <Pin className="w-3 h-3 text-amber-500" />
                                  <span className="text-[9px] text-amber-500 font-bold">Pinned</span>
                                </div>
                              )}

                              {/* Message content — poll / image / video / audio / location / text */}
                              {poll ? (
                                <div className={`w-full max-w-xs ${isMe ? 'bg-emerald-600' : 'bg-white border border-slate-100'} rounded-2xl p-3 shadow-sm`}>
                                  <p className={`text-xs font-bold mb-2.5 ${isMe ? 'text-white' : 'text-slate-900'}`}>📊 {poll.question}</p>
                                  <div className="space-y-1.5">
                                    {poll.options.map((opt, i) => {
                                      const voted    = myVote === i;
                                      const hasVoted = myVote !== undefined;
                                      return (
                                        <button key={i} type="button" onClick={e => { e.stopPropagation(); handleVotePoll(msg.id, i); }} disabled={hasVoted}
                                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                            voted
                                              ? (isMe ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700 border border-emerald-300')
                                              : (isMe ? 'bg-white/15 text-white/80 hover:bg-white/25' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100')
                                          }`}
                                        >
                                          {voted ? '✓ ' : ''}{opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {myVote !== undefined && <p className={`text-[10px] mt-2 ${isMe ? 'text-white/50' : 'text-slate-400'}`}>You voted</p>}
                                </div>
                              ) : msg.msgType === 'image' ? (
                                <button type="button" onClick={e => { e.stopPropagation(); setFullscreenMedia({ src: msg.text, type: 'image' }); }} className="rounded-2xl overflow-hidden shadow-sm max-w-[220px]">
                                  <img src={msg.text} alt="" className="w-full object-cover" />
                                </button>
                              ) : msg.msgType === 'video' ? (
                                <button type="button" onClick={e => { e.stopPropagation(); setFullscreenMedia({ src: msg.text, type: 'video' }); }} className="rounded-2xl overflow-hidden shadow-sm max-w-[220px] relative">
                                  <video src={msg.text} className="w-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                                    <Play className="w-10 h-10 text-white drop-shadow" />
                                  </div>
                                </button>
                              ) : msg.msgType === 'audio' ? (
                                <div className={`px-3 py-2.5 rounded-2xl shadow-sm ${isMe ? 'bg-emerald-600' : 'bg-white border border-slate-100'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Mic className={`w-4 h-4 flex-shrink-0 ${isMe ? 'text-emerald-200' : 'text-emerald-600'}`} />
                                    <span className={`text-xs font-semibold ${isMe ? 'text-white' : 'text-slate-700'}`}>Voice message</span>
                                  </div>
                                  <audio controls src={msg.text} className="max-w-[200px] h-8" style={{ filter: isMe ? 'invert(1)' : 'none' }} />
                                </div>
                              ) : msg.msgType === 'location' ? (() => {
                                try {
                                  const { lat, lng } = JSON.parse(msg.text);
                                  return (
                                    <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-sm ${isMe ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}>
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-emerald-100'}`}>
                                        <MapPin className={`w-4 h-4 ${isMe ? 'text-white' : 'text-emerald-600'}`} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold">Shared location</p>
                                        <p className={`text-[10px] ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>Tap to open in Maps</p>
                                      </div>
                                    </a>
                                  );
                                } catch { return <span className="text-xs text-slate-400">Location</span>; }
                              })() : (
                                <div className={`px-4 py-2.5 text-sm leading-relaxed ${
                                  isMe ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md shadow-sm shadow-emerald-200'
                                       : 'bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-sm border border-slate-100'
                                }`}>
                                  {msg.text}
                                </div>
                              )}

                              <p className={`text-[9px] mt-0.5 px-1 text-slate-400 ${isMe ? 'text-right' : ''}`}>{msgTime(msg.timestamp)}</p>

                              {/* Reactions */}
                              {Object.keys(msgReacts).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 px-1">
                                  {Object.entries(msgReacts).map(([emoji, votersUnknown]) => {
                                    const voters = votersUnknown as string[];
                                    return voters.length > 0 ? (
                                      <button key={emoji} type="button" onClick={e => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                                        className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-all ${
                                          voters.includes(currentUser.id) ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {emoji}<span className="text-[10px] font-bold">{voters.length}</span>
                                      </button>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action bar (react + pin) */}
                          {isSelected && (
                            <div className={`flex gap-1.5 mt-1.5 mb-1 ${isMe ? 'justify-end pr-2' : 'justify-start pl-9'}`} onClick={e => e.stopPropagation()}>
                              {REACTION_EMOJIS.map(emoji => (
                                <button key={emoji} type="button" onClick={() => handleReact(msg.id, emoji)}
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-base hover:scale-110 active:scale-90 transition-transform">
                                  {emoji}
                                </button>
                              ))}
                              <button type="button" onClick={() => handlePin(msg.id)}
                                className={`w-8 h-8 rounded-full border shadow-sm flex items-center justify-center transition-colors ${isPinned ? 'bg-amber-100 border-amber-300' : 'bg-white border-slate-200'}`}>
                                <Pin className={`w-4 h-4 ${isPinned ? 'text-amber-500' : 'text-slate-400'}`} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Emoji bar */}
            {showEmojiBar && (
              <div className="flex gap-2 px-4 py-2 bg-white border-t border-slate-50">
                {QUICK_EMOJIS.map(emoji => (
                  <button key={emoji} type="button" onClick={() => setNewMessage(m => m + emoji)} className="text-2xl active:scale-90 transition-transform">{emoji}</button>
                ))}
              </div>
            )}

            {/* Chat media input (hidden) */}
            <input ref={chatFileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleChatMediaUpload} />

            {/* Voice recording indicator */}
            {isRecording && (
              <div className="mx-3 mb-1 bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-600 text-sm font-semibold flex-1">Recording… {recordingTime}s</span>
                <button type="button" onClick={stopRecording} className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Stop</button>
              </div>
            )}

            {/* Chat input */}
            <form onSubmit={handleSendMessage} className="px-3 py-2 bg-white border-t border-slate-100">
              {/* Media action row */}
              <div className="flex items-center gap-1 mb-1.5">
                <button type="button" onClick={() => { setShowEmojiBar(v => !v); setShowPollForm(false); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmojiBar ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                  <Smile className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => chatFileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { if (chatFileInputRef.current) { chatFileInputRef.current.accept = 'video/*'; chatFileInputRef.current.click(); setTimeout(() => { if (chatFileInputRef.current) chatFileInputRef.current.accept = 'image/*,video/*'; }, 500); } }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                  <Video className="w-4 h-4" />
                </button>
                <button type="button" onClick={handleSendLocation}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                  <Navigation className="w-4 h-4" />
                </button>
                <button type="button"
                  onMouseDown={startRecording} onTouchStart={startRecording}
                  onMouseUp={stopRecording} onTouchEnd={stopRecording}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                  <Mic className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { setShowPollForm(v => !v); setShowEmojiBar(false); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showPollForm ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                  <BarChart2 className="w-4 h-4" />
                </button>
              </div>
              {/* Text row */}
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Message your crew..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" disabled={!newMessage.trim()}
                  className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0">
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Split Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'split' && (
          <div className="h-full overflow-y-auto px-4 pt-3 pb-28 space-y-4">

            {/* Summary card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Total Spent</p>
                  <p className="text-3xl font-extrabold">{totalExpenses.toFixed(0)} <span className="text-sm font-normal text-emerald-400">SAR</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-right">
                    <p className="text-slate-400 text-xs uppercase font-bold mb-1">Per Person</p>
                    <p className="text-xl font-bold">{(totalExpenses / (trip.members.length || 1)).toFixed(0)} SAR</p>
                  </div>
                  <button type="button" onClick={() => { setShowBudgetInput(true); setNewBudgetInput(budgetCap ? String(budgetCap) : ''); }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Set budget">
                    <Pencil className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                </div>
              </div>

              {/* Budget progress */}
              {budgetCap && budgetPct !== null && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-400 text-xs font-bold uppercase">Budget: {budgetCap} SAR</span>
                    <span className={`text-xs font-bold ${budgetPct >= 90 ? 'text-red-400' : budgetPct >= 70 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {budgetPct.toFixed(0)}% used{budgetPct >= 90 ? ' ⚠️' : ''}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${budgetPct >= 90 ? 'bg-red-400' : budgetPct >= 70 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${budgetPct}%` }} />
                  </div>
                </div>
              )}

              {/* Member balances */}
              <div className="space-y-3">
                {balances.map(b => {
                  const pct = totalExpenses > 0 ? Math.min((b.paid / totalExpenses) * 100, 100) : 0;
                  return (
                    <div key={b.member.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{b.member.name?.charAt(0).toUpperCase()}</div>
                          <span className="text-slate-200 text-sm">{b.member.name.split(' ')[0]}</span>
                          <span className="text-slate-500 text-xs">· {b.paid.toFixed(0)} SAR</span>
                        </div>
                        <span className={`text-xs font-bold ${b.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {b.balance >= 0 ? `+${b.balance.toFixed(0)}` : b.balance.toFixed(0)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${b.balance >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-emerald-600" /> By Category
                  </h3>
                  <button type="button" onClick={handleExport} className="flex items-center gap-1 text-xs text-emerald-600 font-bold hover:text-emerald-700">
                    <Share2 className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="space-y-2.5">
                  {categoryBreakdown.map(c => (
                    <div key={c.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.emoji}</span>
                          <span className="text-sm font-semibold text-slate-700">{c.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900">{c.total.toFixed(0)}</span>
                          <span className="text-xs text-slate-400 ml-1">SAR · {c.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, backgroundColor: c.barColor }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settlements */}
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
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold flex-shrink-0">{s.from.name?.charAt(0).toUpperCase()}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${settled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {s.from.name.split(' ')[0]}<ArrowRight className="w-3.5 h-3.5 inline mx-1 text-slate-400" />{s.to.name.split(' ')[0]}
                            </p>
                            <p className="text-xs text-slate-500">{s.amount} SAR</p>
                          </div>
                          {settled
                            ? <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-5 h-5" /><span className="text-xs font-bold">Paid</span></div>
                            : <span className="font-bold text-slate-900 flex-shrink-0">{s.amount} SAR</span>
                          }
                        </div>
                        {!settled && (
                          <div className="flex gap-2 ml-11">
                            <button onClick={() => setStcPaySheet(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#6B1D8A] hover:bg-[#5a1875] text-white text-xs font-bold rounded-xl transition-colors">
                              <Smartphone className="w-3.5 h-3.5" /> STC Pay
                            </button>
                            <button onClick={() => markSettled(key)} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Paid
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
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-emerald-600" /></div>
                <div><p className="font-bold text-emerald-800 text-sm">All settled up! 🎉</p><p className="text-xs text-emerald-600">Everyone has paid their fair share.</p></div>
              </div>
            )}

            {/* Expense list */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3">All Expenses</h3>
              {trip.expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-100">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3"><Wallet className="w-7 h-7 text-slate-300" /></div>
                  <p className="text-slate-500 font-semibold text-sm">No expenses yet</p>
                  <p className="text-slate-400 text-xs mt-1">Add your first expense to start tracking</p>
                  <button onClick={() => setShowAddExpense(true)} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition">Add First Expense</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {trip.expenses.map(e => {
                    const payer = trip.members.find(m => m.id === e.payerId);
                    const cat   = catMap[e.category || 'other'] || catMap['other'];
                    const splitParts = customSplitsMap[e.id];
                    return (
                      <div key={e.id} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center gap-3 shadow-sm">
                        <div className={`w-11 h-11 rounded-xl ${cat.bg} flex items-center justify-center text-xl flex-shrink-0`}>{cat.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{e.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {cat.label} · Paid by {payer?.name.split(' ')[0] || 'Unknown'}
                            {splitParts && ` · split ${splitParts.length}`}
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

        {/* ── Memories Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'memories' && (
          <div className="h-full flex flex-col bg-black">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />

            {allSlideMedia.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-4">
                  <Images className="w-9 h-9 text-white/40" />
                </div>
                <h3 className="font-bold text-white text-base mb-1">No memories yet</h3>
                <p className="text-white/50 text-sm max-w-xs mb-6">Send photos in the chat or upload directly to start your memory reel.</p>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                  <Camera className="w-4 h-4" /> Add Photos
                </button>
              </div>
            ) : (
              <>
                {/* Fullscreen slideshow */}
                <div className="flex-1 relative overflow-hidden">
                  {allSlideMedia[slideIdx]?.type === 'video' ? (
                    <video
                      key={slideIdx}
                      src={allSlideMedia[slideIdx].src}
                      autoPlay muted loop
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      key={slideIdx}
                      src={allSlideMedia[slideIdx]?.src}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                  {/* Top controls */}
                  <div className="absolute top-3 left-0 right-0 px-4 flex items-center justify-between">
                    <span className="text-white/70 text-xs font-bold">{slideIdx + 1} / {allSlideMedia.length}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                      <button type="button" onClick={() => setSlidePlaying(v => !v)}
                        className="w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                        {slidePlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                      </button>
                    </div>
                  </div>

                  {/* Slide progress dots */}
                  <div className="absolute top-14 left-0 right-0 px-4 flex gap-1">
                    {allSlideMedia.map((_, i) => (
                      <button key={i} type="button" onClick={() => setSlideIdx(i)}
                        className={`h-0.5 flex-1 rounded-full transition-all ${i === slideIdx ? 'bg-white' : 'bg-white/30'}`} />
                    ))}
                  </div>

                  {/* Prev / Next */}
                  <button type="button"
                    onClick={() => setSlideIdx(i => (i - 1 + allSlideMedia.length) % allSlideMedia.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button type="button"
                    onClick={() => setSlideIdx(i => (i + 1) % allSlideMedia.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5 text-white rotate-180" />
                  </button>

                  {/* Bottom overlay — uploader + date */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {allSlideMedia[slideIdx]?.uploaderName?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-semibold">{allSlideMedia[slideIdx]?.uploaderName?.split(' ')[0]}</span>
                      <span className="text-white/50 text-xs ml-auto">
                        {new Date(allSlideMedia[slideIdx]?.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thumbnail strip */}
                <div className="flex-shrink-0 bg-black py-2 px-3">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {allSlideMedia.map((item, i) => (
                      <button key={i} type="button" onClick={() => setSlideIdx(i)}
                        className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === slideIdx ? 'border-emerald-400 scale-105' : 'border-transparent opacity-60'}`}>
                        {item.type === 'video'
                          ? <video src={item.src} className="w-full h-full object-cover" />
                          : <img src={item.src} alt="" className="w-full h-full object-cover" />
                        }
                      </button>
                    ))}
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex-shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white/40" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Plan Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="h-full overflow-y-auto px-4 pt-3 pb-24 space-y-4">

            {/* Trip Notes */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button type="button" onClick={() => setNotesExpanded(v => !v)} className="w-full px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold text-slate-900 text-sm">Trip Notes</span>
                  {tripNotes && !notesExpanded && (
                    <span className="text-xs text-slate-400 truncate">{tripNotes.slice(0, 40)}{tripNotes.length > 40 ? '…' : ''}</span>
                  )}
                </div>
                {notesExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>
              {notesExpanded && (
                <div className="px-4 pb-4">
                  <textarea
                    className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none border border-slate-100"
                    rows={5}
                    placeholder="Hotel: Hilton, Floor 8 · WiFi: Trip2025 · Emergency: 911…"
                    value={tripNotes}
                    onChange={e => { setTripNotes(e.target.value); lsSet(`tripo_notes_${trip.id}`, e.target.value); }}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Auto-saved · {tripNotes.length} chars</p>
                </div>
              )}
            </div>

            {/* Saved itineraries from PlacesScreen */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" /> Saved Trip Plans
              </h3>
              {savedTrips.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-7 h-7 text-emerald-300" />
                  </div>
                  <p className="font-semibold text-slate-700 text-sm mb-1">No trip plans yet</p>
                  <p className="text-slate-400 text-xs">Save places to a trip from the Explore tab to see them here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedTrips.map(t => (
                    <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                      <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{t.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t.placeIds.length} place{t.placeIds.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 flex items-center gap-1">
                        <span className="text-xs font-bold text-emerald-700">{t.placeIds.length}</span>
                        <MapPin className="w-3 h-3 text-emerald-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Checklist Tab ────────────────────────────────────────────────── */}
        {activeTab === 'checklist' && (
          <div className="h-full flex flex-col">

            {/* Progress bar */}
            {checklist.length > 0 && (
              <div className="px-4 pt-3 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-900">Progress</span>
                    <span className="text-sm font-bold text-emerald-600">{doneCount}/{checklist.length} done</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Category filter */}
            <div className="px-4 pt-3 pb-1 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {CHECKLIST_CATS.map(cat => {
                  const catLabel = ar
                    ? ({ all: 'الكل', pack: 'للحقيبة', buy: 'للشراء', book: 'للحجز' } as Record<string, string>)[cat.id]
                    : cat.label;
                  return (
                    <button key={cat.id} type="button" onClick={() => setCheckCat(cat.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        checkCat === cat.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {cat.emoji} {catLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add item */}
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border border-slate-100"
                    placeholder="Add item..."
                    value={newCheckText}
                    onChange={e => setNewCheckText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCheckItem(); } }}
                  />
                  <button type="button" onClick={handleAddCheckItem} disabled={!newCheckText.trim()}
                    className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2 mb-2">
                  {(['pack', 'buy', 'book'] as const).map(cat => {
                    const info = CHECKLIST_CATS.find(c => c.id === cat)!;
                    return (
                      <button key={cat} type="button" onClick={() => setNewCheckCat(cat)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          newCheckCat === cat ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'
                        }`}
                      >
                        {info.emoji} {info.label}
                      </button>
                    );
                  })}
                </div>
                {trip.members.length > 1 && (
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={newCheckAssignee} onChange={e => setNewCheckAssignee(e.target.value)}>
                    <option value="">Assign to… (optional)</option>
                    {trip.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
              {filteredChecklist.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3"><CheckSquare className="w-7 h-7 text-slate-300" /></div>
                  <p className="text-slate-500 font-semibold text-sm">No items yet</p>
                  <p className="text-slate-400 text-xs mt-1">Add items above to start your packing list</p>
                </div>
              )}
              {filteredChecklist.map(item => {
                const assignee = trip.members.find(m => m.id === item.assigneeId);
                const catInfo  = CHECKLIST_CATS.find(c => c.id === item.category);
                return (
                  <div key={item.id} className={`bg-white rounded-2xl border shadow-sm p-3.5 flex items-center gap-3 transition-opacity ${item.done ? 'opacity-60 border-slate-50' : 'border-slate-100'}`}>
                    <button type="button" onClick={() => handleToggleCheck(item.id)} className="flex-shrink-0">
                      {item.done ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${item.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>{item.text}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">{catInfo?.emoji} {catInfo?.label}</span>
                        {assignee && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full">{assignee.name.split(' ')[0]}</span>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => handleDeleteCheck(item.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Expenses FAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <button onClick={() => setShowAddExpense(true)} className="absolute bottom-6 right-5 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl shadow-emerald-300 flex items-center justify-center active:scale-95 transition-all z-20">
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ── Photo Lightbox ────────────────────────────────────────────────────── */}
      {selectedPhoto && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col">
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => togglePhotoLike(selectedPhoto.id)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30">
                <Heart className={`w-5 h-5 ${selectedPhoto.likes?.includes(currentUser.id) ? 'fill-red-400 text-red-400' : 'text-white'}`} />
              </button>
              {(selectedPhoto.likes?.length || 0) > 0 && <span className="text-white text-sm font-bold">{selectedPhoto.likes!.length}</span>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditCaptionId(selectedPhoto.id); setCaptionInput(selectedPhoto.caption || ''); }} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30">
                <Pencil className="w-5 h-5 text-white" />
              </button>
              <button type="button" onClick={() => handleSharePhoto(selectedPhoto)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30">
                <Share2 className="w-5 h-5 text-white" />
              </button>
              <button type="button" onClick={() => setSelectedPhoto(null)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <img src={selectedPhoto.dataUrl} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
          </div>
          <div className="p-5 pb-8">
            {editCaptionId === selectedPhoto.id ? (
              <div className="flex gap-2">
                <input autoFocus className="flex-1 bg-white/20 text-white placeholder-white/50 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  placeholder="Add a caption..." value={captionInput} onChange={e => setCaptionInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveCaption(selectedPhoto.id, captionInput); if (e.key === 'Escape') setEditCaptionId(null); }} />
                <button onClick={() => saveCaption(selectedPhoto.id, captionInput)} className="px-4 py-2 bg-emerald-500 rounded-xl text-white text-sm font-bold">Save</button>
                <button onClick={() => setEditCaptionId(null)} className="px-3 py-2 bg-white/20 rounded-xl text-white text-sm">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{selectedPhoto.uploaderName?.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{selectedPhoto.uploaderName}</p>
                  {selectedPhoto.caption
                    ? <p className="text-white/80 text-xs mt-0.5">{selectedPhoto.caption}</p>
                    : <p className="text-white/40 text-xs mt-0.5">Tap ✏️ to add a caption</p>
                  }
                </div>
                <p className="text-white/50 text-xs flex-shrink-0">{new Date(selectedPhoto.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STC Pay Sheet ─────────────────────────────────────────────────────── */}
      {stcPaySheet && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end" onClick={() => setStcPaySheet(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#6B1D8A] flex items-center justify-center"><Smartphone className="w-5 h-5 text-white" /></div>
                <div><p className="font-bold text-slate-900 text-sm">STC Pay</p><p className="text-xs text-slate-400">Instant transfer</p></div>
              </div>
              <button onClick={() => setStcPaySheet(null)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="bg-[#6B1D8A] rounded-2xl p-5 mb-5 text-white text-center">
              <p className="text-white/70 text-xs mb-1 uppercase font-bold tracking-wide">Amount to Send</p>
              <p className="text-4xl font-extrabold mb-0.5">{stcPaySheet.amount}</p>
              <p className="text-white/70 text-sm">SAR</p>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-center items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full border border-white/40 bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">{stcPaySheet.from.name?.charAt(0).toUpperCase()}</div>
                <span className="font-semibold">{stcPaySheet.from.name.split(' ')[0]}</span>
                <ArrowRight className="w-4 h-4 text-white/60" />
                <div className="w-6 h-6 rounded-full border border-white/40 bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">{stcPaySheet.to.name?.charAt(0).toUpperCase()}</div>
                <span className="font-semibold">{stcPaySheet.to.name.split(' ')[0]}</span>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              {[
                { step: '1', text: 'Open the STC Pay app on your phone' },
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
              <button onClick={() => { const key = `${stcPaySheet.from.id}-${stcPaySheet.to.id}-${stcPaySheet.amount}`; markSettled(key); setStcPaySheet(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-colors">
                <CheckCircle2 className="w-4 h-4" /> Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Photo Sheet ─────────────────────────────────────────────────── */}
      {shareTarget && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShareTarget(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="font-bold text-slate-900 text-base">Share Photo</h3><p className="text-xs text-slate-400 mt-0.5">Save it first, then share from the app</p></div>
              <button onClick={() => setShareTarget(null)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="w-full h-40 rounded-2xl overflow-hidden mb-5 bg-slate-100"><img src={shareTarget.dataUrl} alt="" className="w-full h-full object-cover" /></div>
            <button onClick={() => { downloadPhoto(shareTarget); setShareTarget(null); }} className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl mb-4 transition-colors shadow-sm shadow-emerald-200">
              <Download className="w-4 h-4" /> Save to Device
            </button>
            <p className="text-[11px] text-slate-400 text-center font-medium mb-3 uppercase tracking-wider">Then open to share</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'WhatsApp',  emoji: '💬', color: 'bg-green-50  border-green-100',  text: 'text-green-700',  href: 'whatsapp://' },
                { name: 'Instagram', emoji: '📸', color: 'bg-pink-50   border-pink-100',   text: 'text-pink-700',   href: 'instagram://' },
                { name: 'Snapchat',  emoji: '👻', color: 'bg-yellow-50 border-yellow-100', text: 'text-yellow-700', href: 'snapchat://' },
                { name: 'Facebook',  emoji: '📘', color: 'bg-blue-50   border-blue-100',   text: 'text-blue-700',   href: 'fb://' },
              ].map(app => (
                <a key={app.name} href={app.href} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border ${app.color} active:scale-95 transition-transform`}>
                  <span className="text-2xl">{app.emoji}</span>
                  <span className={`text-[10px] font-bold ${app.text}`}>{app.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Poll Form Sheet ───────────────────────────────────────────────────── */}
      {showPollForm && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowPollForm(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg flex items-center gap-2"><BarChart2 className="w-5 h-5 text-emerald-600" /> Create Poll</h3>
              <button onClick={() => setShowPollForm(false)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Question" placeholder="e.g. Where should we eat tonight?"
                value={pollForm.question} onChange={(e: any) => setPollForm(p => ({ ...p, question: e.target.value }))} />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Options</p>
                {pollForm.options.map((opt, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder={`Option ${i + 1}`} value={opt}
                      onChange={e => { const opts = [...pollForm.options]; opts[i] = e.target.value; setPollForm(p => ({ ...p, options: opts })); }}
                    />
                    {pollForm.options.length > 2 && (
                      <button type="button" onClick={() => setPollForm(p => ({ ...p, options: p.options.filter((_, j) => j !== i) }))} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {pollForm.options.length < 4 && (
                  <button type="button" onClick={() => setPollForm(p => ({ ...p, options: [...p.options, ''] }))} className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                    <Plus className="w-4 h-4" /> Add option
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowPollForm(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSendPoll}>Send Poll</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Budget Input Sheet ────────────────────────────────────────────────── */}
      {showBudgetInput && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowBudgetInput(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Set Trip Budget</h3>
              <button onClick={() => setShowBudgetInput(false)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <Input label="Budget Cap (SAR)" type="number" placeholder="e.g. 2000" value={newBudgetInput} onChange={(e: any) => setNewBudgetInput(e.target.value)} />
            <p className="text-xs text-slate-400 mt-2 mb-5">Leave empty or set to 0 to remove the budget cap.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowBudgetInput(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSetBudget}>Save Budget</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Expense Sheet ─────────────────────────────────────────────────── */}
      {showAddExpense && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Add Expense</h3>
              <button onClick={() => setShowAddExpense(false)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              {/* Category */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setNewExpense(p => ({ ...p, category: cat.id }))}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 transition-all ${newExpense.category === cat.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                      <span className="text-xl">{cat.emoji}</span>
                      <span className={`text-[10px] font-bold ${newExpense.category === cat.id ? 'text-emerald-700' : 'text-slate-500'}`}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Description" placeholder="e.g. Dinner at Al Baik" value={newExpense.desc}
                onChange={(e: any) => setNewExpense({ ...newExpense, desc: e.target.value })} />
              <Input label="Amount (SAR)" type="number" placeholder="0.00" value={newExpense.amount}
                onChange={(e: any) => setNewExpense({ ...newExpense, amount: e.target.value })} />

              {/* Paid by */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paid by</label>
                <div className="flex gap-2 flex-wrap">
                  {trip.members.map(m => (
                    <button key={m.id} onClick={() => setNewExpense({ ...newExpense, payerId: m.id })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${newExpense.payerId === m.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${newExpense.payerId === m.id ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'}`}>{m.name?.charAt(0).toUpperCase()}</div>
                      {m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split between */}
              {trip.members.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Split between</label>
                  <div className="flex gap-2 flex-wrap">
                    {trip.members.map(m => {
                      const included = newExpense.splitParticipants.includes(m.id);
                      return (
                        <button key={m.id} type="button"
                          onClick={() => setNewExpense(p => ({ ...p, splitParticipants: included ? p.splitParticipants.filter(id => id !== m.id) : [...p.splitParticipants, m.id] }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-colors ${included ? 'bg-slate-700 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${included ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-600'}`}>{m.name?.charAt(0).toUpperCase()}</div>
                          {m.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                  {newExpense.splitParticipants.length > 0 && newExpense.amount && (
                    <p className="text-xs text-slate-400 mt-1.5">Each pays {(parseFloat(newExpense.amount) / newExpense.splitParticipants.length).toFixed(0)} SAR</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddExpense(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddExpense}>Add Expense</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen media viewer ───────────────────────────────────────────── */}
      {fullscreenMedia && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" onClick={() => setFullscreenMedia(null)}>
          <button type="button" className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center z-10">
            <X className="w-5 h-5 text-white" />
          </button>
          {fullscreenMedia.type === 'video'
            ? <video src={fullscreenMedia.src} controls autoPlay className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
            : <img src={fullscreenMedia.src} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
          }
        </div>
      )}
    </div>
  );
};
