import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Wallet, Image as ImageIcon, CheckSquare, Map, Plus, X, Heart, Package, ShoppingCart, BookOpen, Check, Trash2 } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { GroupTrip, User, ChatMessage, Expense } from '../types/index';
import { groupTripAPI } from '../services/api';

// ── localStorage helpers ──────────────────────────────────────────────────────
function lsGet<T>(key: string, def: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch { return def; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Types ────────────────────────────────────────────────────────────────────
interface TripPhoto {
  id: string;
  uploaderId: string;
  uploaderName: string;
  url: string;
  caption?: string;
  likes: string[];
  timestamp: number;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  assigneeId?: string;
  category: 'pack' | 'buy' | 'book';
}

type TripTab = 'chat' | 'budget' | 'photos' | 'checklist' | 'plan';

const CATEGORY_CONFIG = {
  pack:  { label: 'احزم',   icon: <Package className="w-3.5 h-3.5" />,      color: 'bg-blue-50 text-blue-600' },
  buy:   { label: 'اشتري',  icon: <ShoppingCart className="w-3.5 h-3.5" />, color: 'bg-amber-50 text-amber-600' },
  book:  { label: 'احجز',   icon: <BookOpen className="w-3.5 h-3.5" />,     color: 'bg-purple-50 text-purple-600' },
};

export const GroupTripScreen = ({ trip, currentUser, onBack, onUpdateTrip, t }: {
  trip: GroupTrip;
  currentUser: User;
  onBack: () => void;
  onUpdateTrip: (t: GroupTrip) => void;
  t: any;
}) => {
  const [activeTab, setActiveTab] = useState<TripTab>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', payerId: currentUser.id });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Photos state
  const [photos, setPhotos] = useState<TripPhoto[]>(() => lsGet(`tripo_gtrip_photos_${trip.id}`, []));
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState<TripPhoto | null>(null);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => lsGet(`tripo_gtrip_checklist_${trip.id}`, []));
  const [newItemText, setNewItemText] = useState('');
  const [newItemCat, setNewItemCat] = useState<ChecklistItem['category']>('pack');
  const [checklistFilter, setChecklistFilter] = useState<'all' | ChecklistItem['category']>('all');

  // Plan state
  const [planNotes, setPlanNotes] = useState(() => lsGet<string>(`tripo_gtrip_notes_${trip.id}`, ''));

  // Persist
  useEffect(() => { lsSet(`tripo_gtrip_photos_${trip.id}`, photos); }, [photos, trip.id]);
  useEffect(() => { lsSet(`tripo_gtrip_checklist_${trip.id}`, checklist); }, [checklist, trip.id]);
  useEffect(() => { lsSet(`tripo_gtrip_notes_${trip.id}`, planNotes); }, [planNotes, trip.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trip.chatMessages, activeTab]);

  useEffect(() => {
    if (!trip.backendId) return;
    const load = async () => {
      try {
        const [msgs, exps] = await Promise.all([
          groupTripAPI.getMessages(trip.backendId!),
          groupTripAPI.getExpenses(trip.backendId!),
        ]);
        onUpdateTrip({ ...trip, chatMessages: msgs, expenses: exps });
      } catch (e) { console.warn('Failed to load group trip data:', e); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.backendId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const optimisticMsg: ChatMessage = { id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name, text: newMessage, timestamp: Date.now() };
    onUpdateTrip({ ...trip, chatMessages: [...trip.chatMessages, optimisticMsg] });
    const sentText = newMessage;
    setNewMessage('');
    if (trip.backendId) {
      try {
        const saved = await groupTripAPI.sendMessage(trip.backendId, sentText);
        onUpdateTrip(prev => ({ ...prev, chatMessages: prev.chatMessages.map(m => m.id === optimisticMsg.id ? saved : m) }) as any);
      } catch (e) { console.warn('Message not persisted:', e); }
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.desc || !newExpense.amount) return;
    const optimisticExpense: Expense = { id: Date.now().toString(), description: newExpense.desc, amount: parseFloat(newExpense.amount), payerId: newExpense.payerId, timestamp: Date.now() };
    onUpdateTrip({ ...trip, expenses: [...trip.expenses, optimisticExpense] });
    setIsExpenseModalOpen(false);
    const { desc, amount, payerId } = newExpense;
    setNewExpense({ desc: '', amount: '', payerId: currentUser.id });
    if (trip.backendId) {
      try {
        const saved = await groupTripAPI.addExpense(trip.backendId, desc, parseFloat(amount), payerId, trip.members.map(m => m.id));
        onUpdateTrip(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === optimisticExpense.id ? saved : e) }) as any);
      } catch (e) { console.warn('Expense not persisted:', e); }
    }
  };

  // Budget calculations
  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson = totalExpenses / (trip.members.length || 1);
  const balances = trip.members.map(member => {
    const paid = trip.expenses.filter(e => e.payerId === member.id).reduce((sum, e) => sum + e.amount, 0);
    return { member, paid, balance: paid - sharePerPerson };
  });

  // Photo helpers
  const addPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    const p: TripPhoto = { id: Date.now().toString(), uploaderId: currentUser.id, uploaderName: currentUser.name, url: newPhotoUrl.trim(), caption: newPhotoCaption.trim() || undefined, likes: [], timestamp: Date.now() };
    setPhotos(prev => [p, ...prev]);
    setNewPhotoUrl(''); setNewPhotoCaption(''); setShowAddPhoto(false);
  };
  const togglePhotoLike = (photoId: string) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? {
      ...p, likes: p.likes.includes(currentUser.id) ? p.likes.filter(id => id !== currentUser.id) : [...p.likes, currentUser.id]
    } : p));
  };

  // Checklist helpers
  const addChecklistItem = () => {
    if (!newItemText.trim()) return;
    const item: ChecklistItem = { id: Date.now().toString(), text: newItemText.trim(), done: false, category: newItemCat };
    setChecklist(prev => [...prev, item]);
    setNewItemText('');
  };
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(it => it.id === id ? { ...it, done: !it.done } : it));
  };
  const removeChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(it => it.id !== id));
  };

  const TABS: { id: TripTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat',      label: 'المحادثة', icon: <Send className="w-3.5 h-3.5" /> },
    { id: 'budget',    label: 'التكاليف', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'photos',    label: 'الصور',    icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'checklist', label: 'قائمة',    icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'plan',      label: 'الخطة',    icon: <Map className="w-3.5 h-3.5" /> },
  ];

  const filteredChecklist = checklistFilter === 'all'
    ? checklist
    : checklist.filter(it => it.category === checklistFilter);
  const doneCount = checklist.filter(it => it.done).length;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}><ChevronLeft className="w-6 h-6 text-slate-600 rtl:rotate-180" /></button>
          <div>
            <h2 className="font-bold text-slate-900 leading-tight text-sm">{trip.itinerary.title}</h2>
            <p className="text-xs text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {trip.members.length} {t.active}</p>
          </div>
        </div>
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {trip.members.map(m => (
            <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
              {m.name?.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 overflow-x-auto no-scrollbar relative z-10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-3 text-[11px] font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">

        {/* ── CHAT ─────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-center my-4">
                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase">{t.tripStarted}</span>
              </div>
              {trip.chatMessages.map(msg => {
                const isMe = msg.userId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 shadow-sm rounded-tl-none'}`}>
                      {!isMe && <p className="text-[10px] opacity-70 mb-0.5 font-bold">{msg.userName}</p>}
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder={t.typeMessage}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform">
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
          </div>
        )}

        {/* ── BUDGET ───────────────────────────────────────────────── */}
        {activeTab === 'budget' && (
          <div className="h-full overflow-y-auto p-4 pb-24">
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg mb-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">{t.totalTripCost}</p>
                  <p className="text-3xl font-bold" style={{ direction: 'ltr' }}>{totalExpenses} <span className="text-sm font-normal text-emerald-400">SAR</span></p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">{t.yourShare}</p>
                  <p className="text-xl font-bold" style={{ direction: 'ltr' }}>{sharePerPerson.toFixed(0)} <span className="text-sm font-normal">SAR</span></p>
                </div>
              </div>
              <div className="space-y-2">
                {balances.map(b => (
                  <div key={b.member.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-[9px] font-bold">{b.member.name?.charAt(0).toUpperCase()}</div>
                      <span className="text-slate-300">{b.member.name.split(' ')[0]}</span>
                    </div>
                    <span className={`font-bold ${b.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {b.balance >= 0 ? `${t.gets} ${b.balance.toFixed(0)}` : `${t.owes} ${Math.abs(b.balance).toFixed(0)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">{t.recentExpenses}</h3>
              <button onClick={() => setIsExpenseModalOpen(true)} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">{t.addExpense}</button>
            </div>
            <div className="space-y-3">
              {trip.expenses.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">{t.noExpenses}</div>}
              {trip.expenses.map(e => (
                <div key={e.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Wallet className="w-5 h-5 text-slate-400" /></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{e.description}</p>
                      <p className="text-xs text-slate-500">{t.paidBy} {trip.members.find(m => m.id === e.payerId)?.name.split(' ')[0]}</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">{e.amount} SAR</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PHOTOS ───────────────────────────────────────────────── */}
        {activeTab === 'photos' && (
          <div className="h-full overflow-y-auto p-4 pb-24">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-slate-800 text-sm">{photos.length} صورة</p>
              <button
                onClick={() => setShowAddPhoto(true)}
                className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-black px-3 py-2 rounded-xl active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" /> أضف صورة
              </button>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-16">
                <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-bold text-sm">لا توجد صور بعد</p>
                <p className="text-slate-300 text-xs mt-1">شارك لحظات رحلتكم!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {photos.map(photo => (
                  <div key={photo.id} className="relative rounded-2xl overflow-hidden bg-slate-100 shadow-sm cursor-pointer" onClick={() => setLightboxPhoto(photo)}>
                    <img src={photo.url} alt={photo.caption} className="w-full h-36 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    <div className="p-2">
                      {photo.caption && <p className="text-[10px] text-slate-600 font-bold truncate">{photo.caption}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-slate-400">{photo.uploaderName.split(' ')[0]}</span>
                        <button
                          onClick={e => { e.stopPropagation(); togglePhotoLike(photo.id); }}
                          className="flex items-center gap-0.5 active:scale-90 transition-transform"
                        >
                          <Heart className={`w-3.5 h-3.5 ${photo.likes.includes(currentUser.id) ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`} />
                          {photo.likes.length > 0 && <span className="text-[9px] text-slate-400">{photo.likes.length}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add photo sheet */}
            {showAddPhoto && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                <div className="bg-white w-full rounded-t-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900">أضف صورة</h3>
                    <button onClick={() => setShowAddPhoto(false)} className="p-2 bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <input
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="رابط الصورة..."
                    value={newPhotoUrl}
                    onChange={e => setNewPhotoUrl(e.target.value)}
                  />
                  <input
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="وصف (اختياري)..."
                    value={newPhotoCaption}
                    onChange={e => setNewPhotoCaption(e.target.value)}
                  />
                  <button onClick={addPhoto} className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-2xl active:scale-95 transition-transform">
                    إضافة الصورة
                  </button>
                </div>
              </div>
            )}

            {/* Lightbox */}
            {lightboxPhoto && (
              <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={() => setLightboxPhoto(null)}>
                <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full z-10" onClick={() => setLightboxPhoto(null)}>
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                  <img src={lightboxPhoto.url} alt={lightboxPhoto.caption} className="max-w-full max-h-full rounded-xl object-contain" />
                </div>
                {lightboxPhoto.caption && (
                  <div className="p-4 bg-black/60 text-white text-sm font-bold text-center">
                    {lightboxPhoto.caption}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CHECKLIST ────────────────────────────────────────────── */}
        {activeTab === 'checklist' && (
          <div className="h-full overflow-y-auto p-4 pb-24">
            {/* Progress */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>التقدم</span>
                <span>{doneCount}/{checklist.length}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: checklist.length ? `${(doneCount / checklist.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
              {(['all', 'pack', 'buy', 'book'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setChecklistFilter(cat)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all active:scale-95 ${checklistFilter === cat ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                >
                  {cat === 'all' ? 'الكل' : CATEGORY_CONFIG[cat].label}
                </button>
              ))}
            </div>

            {/* Add item */}
            <div className="flex gap-2 mb-4">
              <div className="flex gap-1">
                {(['pack', 'buy', 'book'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setNewItemCat(cat)}
                    className={`p-2.5 rounded-xl transition-all active:scale-95 ${newItemCat === cat ? CATEGORY_CONFIG[cat].color : 'bg-slate-100 text-slate-400'}`}
                  >
                    {CATEGORY_CONFIG[cat].icon}
                  </button>
                ))}
              </div>
              <input
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="أضف عنصراً..."
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
              />
              <button onClick={addChecklistItem} className="p-2.5 bg-emerald-600 text-white rounded-2xl active:scale-95 transition-transform">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {filteredChecklist.length === 0 ? (
                <div className="text-center py-12 text-slate-300">
                  <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold text-slate-400">القائمة فارغة</p>
                </div>
              ) : filteredChecklist.map(item => {
                const catConfig = CATEGORY_CONFIG[item.category];
                return (
                  <div key={item.id} className={`flex items-center gap-3 p-4 bg-white rounded-2xl border transition-all ${item.done ? 'border-emerald-100 opacity-60' : 'border-slate-100'}`}>
                    <button
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 ${item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}
                    >
                      {item.done && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <span className={`flex-1 text-sm font-bold ${item.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.text}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-1 ${catConfig.color}`}>
                      {catConfig.icon}{catConfig.label}
                    </span>
                    <button onClick={() => removeChecklistItem(item.id)} className="p-1 text-slate-200 hover:text-red-400 transition-colors active:scale-90">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLAN ─────────────────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="h-full overflow-y-auto p-4 pb-24 space-y-4">
            {/* Trip info */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-black text-slate-800 text-sm mb-3">معلومات الرحلة</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">الوجهة</span>
                  <span className="font-bold text-slate-800">{trip.itinerary.city || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">المدة المقدرة</span>
                  <span className="font-bold text-slate-800">{trip.itinerary.estimatedDuration ? `${trip.itinerary.estimatedDuration} دقيقة` : '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">التكلفة المقدرة</span>
                  <span className="font-bold text-slate-800">{trip.itinerary.estimatedCost ? `${trip.itinerary.estimatedCost} ر.س` : '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">الأعضاء</span>
                  <span className="font-bold text-slate-800">{trip.members.length} شخص</span>
                </div>
              </div>
            </div>

            {/* Stops */}
            {trip.itinerary.places && trip.itinerary.places.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h3 className="font-black text-slate-800 text-sm mb-3">المحطات ({trip.itinerary.places.length})</h3>
                <div className="space-y-3">
                  {trip.itinerary.places.map((stop: any, idx: number) => {
                    const name = typeof stop.placeId === 'object' ? stop.placeId?.name : (stop.placeName || `محطة ${idx + 1}`);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-bold text-slate-800 flex-1">{name}</p>
                        {stop.timeSlot && <span className="text-[10px] text-slate-400">{stop.timeSlot}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-black text-slate-800 text-sm mb-3">ملاحظات الرحلة</h3>
              <textarea
                className="w-full h-32 bg-slate-50 rounded-xl border border-slate-100 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-slate-700"
                placeholder="أضف ملاحظات للمجموعة..."
                value={planNotes}
                onChange={e => setPlanNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200">
            <h3 className="font-bold text-lg mb-4">{t.addExpense}</h3>
            <div className="space-y-4">
              <Input label="Description" placeholder="e.g. Dinner at Al Baik" value={newExpense.desc} onChange={(e: any) => setNewExpense({ ...newExpense, desc: e.target.value })} />
              <Input label="Amount (SAR)" type="number" placeholder="0.00" value={newExpense.amount} onChange={(e: any) => setNewExpense({ ...newExpense, amount: e.target.value })} />
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{t.paidBy}</label>
                <div className="flex gap-2">
                  {trip.members.map(m => (
                    <button key={m.id} onClick={() => setNewExpense({ ...newExpense, payerId: m.id })} className={`px-3 py-2 rounded-lg text-sm font-medium border ${newExpense.payerId === m.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200'}`}>
                      {m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setIsExpenseModalOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddExpense}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
