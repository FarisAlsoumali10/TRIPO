import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, Send, Wallet, MessageCircle,
  ArrowRight, Plus, X, Users, Receipt, CheckCircle2, Copy, Smartphone,
  Camera, Image as ImageIcon,
} from 'lucide-react';
import { Button, Input } from '../components/ui';
import { PrivateTrip, User, ChatMessage, Expense } from '../types/index';
import { privateTripAPI } from '../services/api';
import { showToast } from '../components/Toast';

// ==========================================
// Settlement algorithm (minimize transactions)
// ==========================================
interface Settlement {
  from: User;
  to: User;
  amount: number;
}

function calculateSettlements(members: User[], expenses: Expense[]): {
  balances: { member: User; paid: number; balance: number }[];
  settlements: Settlement[];
} {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson = totalExpenses / (members.length || 1);

  const balances = members.map(m => {
    const paid = expenses
      .filter(e => e.payerId === m.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return { member: m, paid, balance: paid - sharePerPerson };
  });

  const debtors = balances
    .filter(b => b.balance < -0.01)
    .map(b => ({ member: b.member, amount: Math.abs(b.balance) }));
  const creditors = balances
    .filter(b => b.balance > 0.01)
    .map(b => ({ member: b.member, amount: b.balance }));

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.5) {
      settlements.push({
        from: debtors[i].member,
        to: creditors[j].member,
        amount: Math.round(transfer),
      });
    }
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return { balances, settlements };
}

// ==========================================
// Trip photo type
// ==========================================
interface TripPhoto {
  id: string;
  uploaderId: string;
  uploaderName: string;
  dataUrl: string;
  timestamp: number;
}

// ==========================================
// Component
// ==========================================
type Tab = 'chat' | 'expenses' | 'photos';

export const PrivateTripScreen = ({
  trip,
  currentUser,
  onBack,
  onUpdateTrip,
}: {
  trip: PrivateTrip;
  currentUser: User;
  onBack: () => void;
  onUpdateTrip: (t: PrivateTrip) => void;
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [settledKeys, setSettledKeys] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`tripo_settled_${trip.id}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  // Photos state
  const [tripPhotos, setTripPhotos] = useState<TripPhoto[]>(() => {
    try {
      const raw = localStorage.getItem(`tripo_photos_${trip.id}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [selectedPhoto, setSelectedPhoto] = useState<TripPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveTripPhotos = (photos: TripPhoto[]) => {
    try {
      localStorage.setItem(`tripo_photos_${trip.id}`, JSON.stringify(photos));
    } catch {
      showToast('Storage full — some photos may not be saved', 'warning');
    }
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
        newPhotos.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          uploaderId: currentUser.id,
          uploaderName: currentUser.name,
          dataUrl,
          timestamp: Date.now(),
        });
      } catch { /* skip */ }
    }
    if (newPhotos.length) {
      const updated = [...tripPhotos, ...newPhotos];
      setTripPhotos(updated);
      saveTripPhotos(updated);
      showToast(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added!`, 'success');
    }
    e.target.value = '';
  };

  const markSettled = (key: string) => {
    setSettledKeys(prev => {
      const next = new Set(prev).add(key);
      localStorage.setItem(`tripo_settled_${trip.id}`, JSON.stringify([...next]));
      return next;
    });
    showToast('Marked as paid!', 'success');
  };

  const [stcPaySheet, setStcPaySheet] = useState<Settlement | null>(null);

  const openStcPay = (s: Settlement) => setStcPaySheet(s);

  const copyAmount = (amount: number) => {
    navigator.clipboard.writeText(String(amount)).then(() => {
      showToast('Amount copied!', 'success');
    });
  };

  const [newExpense, setNewExpense] = useState({
    desc: '',
    amount: '',
    payerId: currentUser.id,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trip.chatMessages, activeTab]);

  useEffect(() => {
    if (!trip.backendId) return;
    const load = async () => {
      try {
        const [msgs, exps] = await Promise.all([
          privateTripAPI.getMessages(trip.backendId!),
          privateTripAPI.getExpenses(trip.backendId!),
        ]);
        onUpdateTrip({ ...trip, chatMessages: msgs, expenses: exps });
      } catch { /* silently fallback */ }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.backendId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const optimistic: ChatMessage = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      text: newMessage,
      timestamp: Date.now(),
    };
    onUpdateTrip({ ...trip, chatMessages: [...trip.chatMessages, optimistic] });
    const text = newMessage;
    setNewMessage('');

    if (trip.backendId) {
      try {
        const saved = await privateTripAPI.sendMessage(trip.backendId, text);
        onUpdateTrip(prev => ({
          ...prev,
          chatMessages: prev.chatMessages.map(m => m.id === optimistic.id ? saved : m),
        }) as any);
      } catch { /* message stays optimistic */ }
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.desc.trim() || !newExpense.amount) return;

    const optimistic: Expense = {
      id: Date.now().toString(),
      description: newExpense.desc,
      amount: parseFloat(newExpense.amount),
      payerId: newExpense.payerId,
      timestamp: Date.now(),
    };

    onUpdateTrip({ ...trip, expenses: [...trip.expenses, optimistic] });
    setShowAddExpense(false);
    const { desc, amount, payerId } = newExpense;
    setNewExpense({ desc: '', amount: '', payerId: currentUser.id });

    if (trip.backendId) {
      try {
        const memberIds = trip.members.map(m => m.id);
        const saved = await privateTripAPI.addExpense(
          trip.backendId, desc, parseFloat(amount), payerId, memberIds
        );
        onUpdateTrip(prev => ({
          ...prev,
          expenses: prev.expenses.map(e => e.id === optimistic.id ? saved : e),
        }) as any);
      } catch {
        showToast('Expense saved locally only', 'warning');
      }
    }
  };

  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const { balances, settlements } = calculateSettlements(trip.members, trip.expenses);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}>
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="font-bold text-slate-900 leading-tight">{trip.title}</h2>
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {trip.members.length} members · Private Trip
            </p>
          </div>
        </div>
        <div className="flex -space-x-2">
          {trip.members.slice(0, 4).map(m => (
            <div
              key={m.id}
              className="w-8 h-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0"
            >
              {m.name?.charAt(0).toUpperCase()}
            </div>
          ))}
          {trip.members.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
              +{trip.members.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 relative z-10">
        {([
          { id: 'chat',     label: 'Chat',     icon: MessageCircle },
          { id: 'expenses', label: 'Expenses', icon: Receipt },
          { id: 'photos',   label: 'Photos',   icon: Camera },
        ] as const).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-center my-2">
                <span className="bg-slate-200 text-slate-600 text-[10px] px-3 py-1 rounded-full font-bold uppercase">
                  Private Trip Started
                </span>
              </div>
              {trip.chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No messages yet</p>
                  <p className="text-slate-300 text-xs mt-1">Say hi to your travel crew!</p>
                </div>
              )}
              {trip.chatMessages.map(msg => {
                const isMe = msg.userId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 shadow-sm rounded-tl-none'
                    }`}>
                      {!isMe && (
                        <p className="text-[10px] opacity-70 mb-0.5 font-bold">{msg.userName}</p>
                      )}
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t border-slate-100 flex gap-2"
            >
              <input
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
              <button
                type="submit"
                className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="h-full overflow-y-auto p-4 pb-24 space-y-4">

            {/* Summary Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-end mb-5">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Total Spent</p>
                  <p className="text-3xl font-bold">
                    {totalExpenses.toFixed(0)} <span className="text-sm font-normal text-emerald-400">SAR</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Per Person</p>
                  <p className="text-xl font-bold">
                    {(totalExpenses / (trip.members.length || 1)).toFixed(0)} SAR
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {balances.map(b => (
                  <div key={b.member.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {b.member.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-300 text-sm">{b.member.name.split(' ')[0]}</span>
                      <span className="text-slate-500 text-xs">paid {b.paid.toFixed(0)}</span>
                    </div>
                    <span className={`text-sm font-bold ${b.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {b.balance >= 0
                        ? `gets back ${b.balance.toFixed(0)}`
                        : `owes ${Math.abs(b.balance).toFixed(0)}`}
                    </span>
                  </div>
                ))}
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
                            <button
                              onClick={() => openStcPay(s)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#6B1D8A] hover:bg-[#5a1875] text-white text-xs font-bold rounded-xl transition-colors"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              Pay via STC Pay
                            </button>
                            <button
                              onClick={() => markSettled(key)}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Paid
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
                  <p className="font-bold text-emerald-800 text-sm">All settled up!</p>
                  <p className="text-xs text-emerald-600">Everyone has paid their fair share.</p>
                </div>
              </div>
            )}

            {/* Expense List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">Expenses</h3>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              {trip.expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-100">
                  <Wallet className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No expenses yet</p>
                  <p className="text-slate-300 text-xs mt-1">Add your first expense to start tracking</p>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition"
                  >
                    Add First Expense
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {trip.expenses.map(e => {
                    const payer = trip.members.find(m => m.id === e.payerId);
                    return (
                      <div key={e.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{e.description}</p>
                            <p className="text-xs text-slate-500">
                              Paid by {payer?.name.split(' ')[0] || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900">{e.amount} SAR</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="h-full overflow-y-auto">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Sub-header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
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
                <Camera className="w-4 h-4" />
                Add Photo
              </button>
            </div>

            {tripPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                  <ImageIcon className="w-9 h-9 text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-700 text-base mb-1">Share your trip moments</h3>
                <p className="text-slate-400 text-sm max-w-xs">
                  Upload photos so your whole crew can relive the memories together.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Upload First Photo
                </button>
              </div>
            ) : (
              <div className="px-4 pb-24 grid grid-cols-2 gap-2">
                {tripPhotos.map(photo => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhoto(photo)}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 active:scale-95 transition-transform"
                  >
                    <img
                      src={photo.dataUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {/* Uploader badge */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-8">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                          {photo.uploaderName?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white text-[10px] font-semibold truncate">
                          {photo.uploaderName.split(' ')[0]}
                        </span>
                      </div>
                    </div>
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

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="absolute inset-0 bg-black z-50 flex flex-col"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="flex justify-end p-4" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center px-4"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.dataUrl}
              alt=""
              className="max-w-full max-h-full object-contain rounded-2xl"
            />
          </div>

          <div className="p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {selectedPhoto.uploaderName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{selectedPhoto.uploaderName}</p>
                <p className="text-white/50 text-xs">
                  {new Date(selectedPhoto.timestamp).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STC Pay Sheet */}
      {stcPaySheet && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end" onClick={() => setStcPaySheet(null)}>
          <div
            className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
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
                  <div className="w-6 h-6 rounded-full bg-[#6B1D8A]/10 text-[#6B1D8A] flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5">
                    {step}
                  </div>
                  <p className="text-slate-700 text-sm">{text}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyAmount(stcPaySheet.amount)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Amount
              </button>
              <button
                onClick={() => {
                  const key = `${stcPaySheet.from.id}-${stcPaySheet.to.id}-${stcPaySheet.amount}`;
                  markSettled(key);
                  setStcPaySheet(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Bottom Sheet */}
      {showAddExpense && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Add Expense</h3>
              <button onClick={() => setShowAddExpense(false)} className="p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
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
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Paid by
                </label>
                <div className="flex gap-2 flex-wrap">
                  {trip.members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setNewExpense({ ...newExpense, payerId: m.id })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        newExpense.payerId === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white border-slate-200 text-slate-700'
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
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddExpense(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddExpense}>
                  Add Expense
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
