import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Wallet } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { GroupTrip, User, ChatMessage, Expense } from '../types/index';
import { groupTripAPI } from '../services/api';

export const GroupTripScreen = ({ trip, currentUser, onBack, onUpdateTrip, t }: { trip: GroupTrip, currentUser: User, onBack: () => void, onUpdateTrip: (t: GroupTrip) => void, t: any }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'budget'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', payerId: currentUser.id });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [trip.chatMessages, activeTab]);

  // Load persisted messages and expenses from backend on mount
  useEffect(() => {
    if (!trip.backendId) return;
    const load = async () => {
      try {
        const [msgs, exps] = await Promise.all([
          groupTripAPI.getMessages(trip.backendId!),
          groupTripAPI.getExpenses(trip.backendId!),
        ]);
        onUpdateTrip({ ...trip, chatMessages: msgs, expenses: exps });
      } catch (e) {
        console.warn('Failed to load group trip data from backend:', e);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.backendId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const optimisticMsg: ChatMessage = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      text: newMessage,
      timestamp: Date.now(),
    };

    // Optimistic update
    onUpdateTrip({ ...trip, chatMessages: [...trip.chatMessages, optimisticMsg] });
    const sentText = newMessage;
    setNewMessage('');

    if (trip.backendId) {
      try {
        const saved = await groupTripAPI.sendMessage(trip.backendId, sentText);
        // Replace optimistic message with saved one
        onUpdateTrip(prev => ({
          ...prev,
          chatMessages: prev.chatMessages.map(m => m.id === optimisticMsg.id ? saved : m)
        }) as any);
      } catch (e) {
        console.warn('Message not persisted to backend:', e);
      }
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.desc || !newExpense.amount) return;

    const optimisticExpense: Expense = {
      id: Date.now().toString(),
      description: newExpense.desc,
      amount: parseFloat(newExpense.amount),
      payerId: newExpense.payerId,
      timestamp: Date.now()
    };

    onUpdateTrip({ ...trip, expenses: [...trip.expenses, optimisticExpense] });
    setIsExpenseModalOpen(false);
    const { desc, amount, payerId } = newExpense;
    setNewExpense({ desc: '', amount: '', payerId: currentUser.id });

    if (trip.backendId) {
      try {
        const memberIds = trip.members.map(m => m.id);
        const saved = await groupTripAPI.addExpense(
          trip.backendId,
          desc,
          parseFloat(amount),
          payerId,
          memberIds
        );
        onUpdateTrip(prev => ({
          ...prev,
          expenses: prev.expenses.map(e => e.id === optimisticExpense.id ? saved : e)
        }) as any);
      } catch (e) {
        console.warn('Expense not persisted to backend:', e);
      }
    }
  };

  // Budget Calculation Logic
  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson = totalExpenses / (trip.members.length || 1);

  // Calculate balances
  const balances = trip.members.map(member => {
    const paid = trip.expenses.filter(e => e.payerId === member.id).reduce((sum, e) => sum + e.amount, 0);
    const balance = paid - sharePerPerson;
    return { member, paid, balance };
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}><ChevronLeft className="w-6 h-6 text-slate-600 rtl:rotate-180" /></button>
          <div>
            <h2 className="font-bold text-slate-900 leading-tight">{trip.itinerary.title}</h2>
            <p className="text-xs text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {trip.members.length} {t.active}</p>
          </div>
        </div>
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {trip.members.map(m => (
            <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
              {m.name?.charAt(0).toUpperCase()}
            </div>
          ))}
          <button className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400 text-xs font-bold">
            +
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 relative z-10">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chat' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
        >
          {t.tabChat}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('budget')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'budget' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
        >
          {t.tabBudget}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chat' ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-center my-4">
                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase">{t.tripStarted}</span>
              </div>
              {trip.chatMessages.map(msg => {
                const isMe = msg.userId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-emerald-600 text-white rounded-tr-none rtl:rounded-tr-2xl rtl:rounded-tl-none' : 'bg-white text-slate-800 shadow-sm rounded-tl-none rtl:rounded-tl-2xl rtl:rounded-tr-none'}`}>
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
              <button type="submit" className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform rtl:rotate-180">
                <Send className="w-5 h-5 ml-0.5 rtl:mr-0.5 rtl:ml-0" />
              </button>
            </form>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 pb-24">
            {/* Summary Card */}
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
                      <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-[9px] font-bold flex-shrink-0">
                        {b.member.name?.charAt(0).toUpperCase()}
                      </div>
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
              <button onClick={() => setIsExpenseModalOpen(true)} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                {t.addExpense}
              </button>
            </div>

            <div className="space-y-3">
              {trip.expenses.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">{t.noExpenses}</div>
              )}
              {trip.expenses.map(e => (
                <div key={e.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-slate-400" />
                    </div>
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
      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200">
            <h3 className="font-bold text-lg mb-4">{t.addExpense}</h3>
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
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{t.paidBy}</label>
                <div className="flex gap-2">
                  {trip.members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setNewExpense({ ...newExpense, payerId: m.id })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border ${newExpense.payerId === m.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200'}`}
                    >
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
