import React, { useState, useEffect, useRef } from 'react';
import { Users, ChevronRight, Trophy, Star, MessageSquare, Plus, Crown, Flame, CheckCircle2, Send, X, ShieldCheck, Heart, Calendar, Clock, MapPin, Wallet as WalletIcon, TrendingUp, Award } from 'lucide-react';
import { Community, Itinerary, FazaRequest, ChatMessage, CommunityEvent, User, Place } from '../types/index';
import { Button, Input, Badge } from '../components/ui';
import { placeAPI } from '../services/api'; // 🔴 استيراد الـ API الحقيقي للأماكن

// 🟢 مستخدم افتراضي آمن لتجنب انهيار الشاشة (يجب استبداله لاحقاً ببيانات authAPI)
const SAFE_DEFAULT_USER: User = {
  id: 'current-user',
  name: 'بطل تريبو',
  email: 'user@tripo.com',
  role: 'user',
  language: 'ar',
  karamPoints: 120,
  walletBalance: 50.0,
  fazaCount: 2,
  rank: 'مستكشف',
  smartProfile: { interests: [], preferredBudget: 'medium', activityStyles: [], typicalFreeTimeWindow: 0, city: 'الرياض' }
};

export const CommunitiesScreen = ({ t, lang, onOpenItinerary }: { t: any, lang: string, onOpenItinerary: (it: Itinerary) => void }) => {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [activeTab, setActiveTab] = useState<'majlis' | 'requests' | 'events'>('majlis');
  const [showFazaModal, setShowFazaModal] = useState<FazaRequest | null>(null);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [fazaAnswer, setFazaAnswer] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 🟢 States للبيانات (فارغة افتراضياً لانتظار الـ API)
  const [communities, setCommunities] = useState<Community[]>([]);
  const [localEvents, setLocalEvents] = useState<CommunityEvent[]>([]);
  const [localFazaRequests, setLocalFazaRequests] = useState<FazaRequest[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<User>(SAFE_DEFAULT_USER);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // جلب الأماكن الحقيقية لاقتراحات المجالس
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const placesData = await placeAPI.getPlaces();
        const formattedPlaces = Array.isArray(placesData) ? placesData : (placesData.data || placesData.places || []);
        setAllPlaces(formattedPlaces);

        // TODO: هنا يمكنك لاحقاً استدعاء communityAPI.getCommunities() و fazaAPI وغيرها
        // setCommunities(await communityAPI.getCommunities());
      } catch (error) {
        console.error("Failed to load community data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Create Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: ''
  });

  // رسائل محادثة افتراضية للمجالس
  const [communityMessages, setCommunityMessages] = useState<Record<string, ChatMessage[]>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'majlis') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, communityMessages, selectedCommunity]);

  const handleFazaSubmit = () => {
    if (!fazaAnswer.trim() || !showFazaModal) return;

    const rewardPoints = showFazaModal.pointsReward;
    const cashReward = rewardPoints / 10;
    const newFazaCount = (userProfile.fazaCount || 0) + 1;
    let newRank = userProfile.rank;

    if (newFazaCount >= 10) newRank = "ماستر الفزعات";
    else if (newFazaCount >= 3) newRank = 'شهم';

    setUserProfile(prev => ({
      ...prev,
      karamPoints: (prev.karamPoints || 0) + rewardPoints,
      walletBalance: (prev.walletBalance || 0) + cashReward,
      fazaCount: newFazaCount,
      rank: newRank as any
    }));

    setLocalFazaRequests(prev => prev.filter(r => r.id !== showFazaModal.id));
    setSuccessMessage(`كفو! حصلت على ${rewardPoints} نقطة كرم و ${cashReward} ريال في محفظتك.`);

    setTimeout(() => {
      setSuccessMessage(null);
      setShowFazaModal(null);
      setFazaAnswer('');
    }, 4500);
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date || !selectedCommunity) return;

    const event: CommunityEvent = {
      id: Date.now().toString(),
      communityId: selectedCommunity.id,
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time || '20:00',
      locationName: newEvent.location || 'الرياض',
      attendeesCount: 1,
      image: selectedCommunity.image
    };

    setLocalEvents([event, ...localEvents]);
    setShowCreateEventModal(false);
    setSuccessMessage("تم نشر الفعالية بنجاح! ننتظر الجميع 🚀");
    setNewEvent({ title: '', description: '', date: '', time: '', location: '' });
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !selectedCommunity) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      userId: userProfile.id,
      userName: userProfile.name,
      text: chatInput,
      timestamp: Date.now()
    };

    setCommunityMessages({
      ...communityMessages,
      [selectedCommunity.id]: [...(communityMessages[selectedCommunity.id] || []), newMsg]
    });
    setChatInput('');
  };

  const toggleJoinEvent = (eventId: string) => {
    if (joinedEvents.includes(eventId)) {
      setJoinedEvents(joinedEvents.filter(id => id !== eventId));
      setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendeesCount: e.attendeesCount - 1 } : e));
    } else {
      setJoinedEvents([...joinedEvents, eventId]);
      setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendeesCount: e.attendeesCount + 1 } : e));
      setSuccessMessage("تم تسجيل اهتمامك بالفعالية! ننتظرك هناك 🤩");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const renderCommunityCard = (comm: Community) => (
    <div
      key={comm.id}
      onClick={() => { setSelectedCommunity(comm); setActiveTab('majlis'); }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 mb-4 active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="h-28 relative">
        <img src={comm.image} className="w-full h-full object-cover" alt={comm.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl bg-white/20 backdrop-blur-md w-10 h-10 rounded-xl flex items-center justify-center">{comm.icon}</span>
            <h3 className="text-lg font-bold">{comm.name}</h3>
          </div>
          <p className="text-[10px] font-bold opacity-90 px-2 py-1 bg-white/10 rounded-lg">{comm.memberCount} {t.commMembers || 'عضو'}</p>
        </div>
      </div>
    </div>
  );

  if (selectedCommunity) {
    const communityFaza = localFazaRequests.filter(r => r.communityId === selectedCommunity.id);
    const communityEvents = localEvents.filter(e => e.communityId === selectedCommunity.id);
    const messages = communityMessages[selectedCommunity.id] || [{
      id: 'welcome',
      userId: 'system',
      userName: 'تريبو',
      text: `أهلاً بك في مجلس ${selectedCommunity.name}! هنا تبدأ سوالفنا..`,
      timestamp: Date.now()
    }];

    // اقتراح أماكن للمجلس بناءً على تصنيف المجتمع والأماكن الحقيقية
    const suggestions = allPlaces.filter(p => {
      const placeCategory = p.categoryTags?.[0] || p.category || '';
      return placeCategory.toLowerCase().includes(selectedCommunity.category.toLowerCase());
    }).slice(0, 4);

    return (
      <div className="h-full flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
        <div className="relative h-44 shrink-0">
          <img src={selectedCommunity.image} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
          <button onClick={() => setSelectedCommunity(null)} className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white z-10 rtl:right-6 rtl:left-auto">
            <ChevronRight className="w-6 h-6 rotate-180 rtl:rotate-0" />
          </button>
          <div className="absolute bottom-4 left-6 right-6 text-white flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">{selectedCommunity.icon} {selectedCommunity.name}</h2>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">{selectedCommunity.memberCount} عضو نشط حالياً</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge color="orange" className="px-3 py-1 bg-orange-500 text-white border-none shadow-lg shadow-orange-200">
                <Award className="w-3 h-3 inline mr-1" /> {userProfile.rank}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
          {[
            { id: 'majlis', label: t.commMajlis || 'المجلس', icon: MessageSquare },
            { id: 'events', label: 'الفعاليات', icon: Calendar },
            { id: 'requests', label: t.commFazaRequests || 'الفزعات', icon: ShieldCheck }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 text-xs font-black transition-all flex flex-col items-center gap-1 border-b-2 ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'majlis' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {suggestions.length > 0 && (
                  <div className="bg-white p-4 rounded-3xl border border-slate-100 mb-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                      <h4 className="font-bold text-xs">ترشيحات المجتمع</h4>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar">
                      {suggestions.map(p => (
                        <div key={p._id || p.id} className="min-w-[100px] text-center">
                          <img src={p.photos?.[0] || p.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=200'} className="w-full h-14 rounded-xl object-cover mb-1 border border-slate-100" />
                          <p className="text-[8px] font-bold text-slate-800 line-clamp-1">{p.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.userId === userProfile.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${m.userId === userProfile.id ? 'bg-emerald-600 text-white rounded-tr-none' : m.userId === 'system' ? 'bg-slate-100 text-slate-500 mx-auto text-center rounded-2xl' : 'bg-white border border-slate-100 rounded-tl-none'}`}>
                      {m.userId !== userProfile.id && m.userId !== 'system' && <p className="text-[9px] font-bold opacity-60 mb-1">{m.userName}</p>}
                      <p className="text-sm">{m.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input className="flex-1 bg-slate-50 rounded-full px-4 py-2 text-sm outline-none" placeholder="شاركونا مقترح أو سالفة..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                <button onClick={handleSendMessage} className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform rtl:rotate-180">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="h-full overflow-y-auto p-4 space-y-6 pb-20">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                <h3 className="text-lg font-black mb-1">جدول طلعاتنا 🗓️</h3>
                <p className="text-xs opacity-90 mb-4">هنا تلقى كل الفعاليات المجدولة من قبل المشرفين والأعضاء الموثوقين.</p>
                <Button onClick={() => setShowCreateEventModal(true)} variant="secondary" className="bg-white/20 border-white/30 text-white py-2 text-xs w-fit flex items-center gap-2">
                  <Plus className="w-3 h-3" /> اقترح فعالية
                </Button>
              </div>

              <div className="space-y-4">
                {communityEvents.length === 0 ? (
                  <div className="text-center py-20 text-slate-300">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold">لا توجد فعاليات مجدولة لهذا المجتمع حالياً</p>
                  </div>
                ) : communityEvents.map(event => (
                  <div key={event.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                    <div className="h-32 relative">
                      <img src={event.image} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-white/90 px-2 py-1 rounded-lg text-xs font-bold text-emerald-600 flex items-center gap-1 rtl:right-3 rtl:left-auto">
                        <Calendar className="w-3 h-3" /> {event.date}
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded-lg text-[10px] text-white font-bold flex items-center gap-1 rtl:left-3 rtl:right-auto">
                        <Users className="w-3 h-3" /> {event.attendeesCount} خوي بيمشي
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-black text-slate-900 mb-1">{event.title}</h4>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">{event.description}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold mb-4">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.locationName}</span>
                      </div>
                      <Button
                        onClick={() => toggleJoinEvent(event.id)}
                        className={`w-full py-2.5 text-xs font-black ${joinedEvents.includes(event.id) ? 'bg-slate-100 text-slate-500 shadow-none' : ''}`}
                      >
                        {joinedEvents.includes(event.id) ? 'تم تسجيل الاهتمام ✅' : 'سجل اهتمامك'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="h-full overflow-y-auto p-4 space-y-6 pb-20">
              <section>
                {communityFaza.length === 0 ? (
                  <div className="text-center py-20 text-slate-300">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold">كل الفزعات مكتملة حالياً في هذا المجتمع!</p>
                  </div>
                ) : communityFaza.map(req => (
                  <div key={req.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={req.userAvatar} className="w-10 h-10 rounded-full border-2 border-emerald-100" />
                      <div>
                        <p className="text-xs font-black text-slate-900">{req.userName}</p>
                        <p className="text-[10px] text-slate-400">منذ ساعة</p>
                      </div>
                      <div className="ml-auto bg-orange-50 px-3 py-1 rounded-xl text-orange-600 text-xs font-black rtl:mr-auto rtl:ml-0">
                        +{req.pointsReward} كرم
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mb-5 font-medium leading-relaxed">"{req.question}"</p>
                    <Button onClick={() => setShowFazaModal(req)} className="w-full py-2.5 text-xs font-black" variant="secondary">تقديم فزعة</Button>
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>

        {/* Create Event Modal */}
        {showCreateEventModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-sm:max-w-xs p-8 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setShowCreateEventModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              <h3 className="font-black text-xl mb-4">اقترح فعالية جديدة</h3>
              <div className="space-y-4">
                <Input label="اسم الفعالية" placeholder="مثال: تجمع بادل السبت" value={newEvent.title} onChange={(e: any) => setNewEvent({ ...newEvent, title: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="التاريخ" type="date" value={newEvent.date} onChange={(e: any) => setNewEvent({ ...newEvent, date: e.target.value })} />
                  <Input label="الوقت" type="time" value={newEvent.time} onChange={(e: any) => setNewEvent({ ...newEvent, time: e.target.value })} />
                </div>
                <Input label="الموقع" placeholder="مثال: ملاعب فور بادل" value={newEvent.location} onChange={(e: any) => setNewEvent({ ...newEvent, location: e.target.value })} />
                <textarea className="w-full h-24 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="وصف الفعالية..." value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
                <Button onClick={handleCreateEvent} className="w-full py-4 font-black">نشر الفعالية</Button>
              </div>
            </div>
          </div>
        )}

        {/* Faza'a Modal */}
        {showFazaModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-sm:max-w-xs p-8 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setShowFazaModal(null)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              <h3 className="font-black text-xl mb-2">تقديم فزعة لـ {showFazaModal.userName}</h3>
              <p className="text-xs text-slate-500 mb-6">ساعد غيرك واكسب {showFazaModal.pointsReward} نقطة كرم ورصيد محفظة.</p>
              <textarea className="w-full h-32 p-4 bg-slate-50 rounded-3xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500 mb-6" placeholder="اكتب نصيحتك هنا..." value={fazaAnswer} onChange={(e) => setFazaAnswer(e.target.value)} />
              <Button onClick={handleFazaSubmit} className="w-full py-4 font-black">إرسال الفزعة</Button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>
            <span className="font-black text-sm">{successMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 pb-28 space-y-8 overflow-y-auto h-full bg-slate-50">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2">{t.tabCommunities || 'المجتمعات'}</h1>
          <p className="text-slate-500 text-sm font-medium">مجالسنا حية بالفعاليات والفزعات.. اختر جوّك!</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <WalletIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase">رصيدك</p>
            <p className="text-xs font-black text-slate-900">{(userProfile.walletBalance || 0).toFixed(2)} ريال</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[35px] p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">تقدّمك في الكرم</h3>
              <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">{userProfile.rank}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-black mb-1">
              <span>الفزعات المنجزة: {userProfile.fazaCount || 0}</span>
              <span>الهدف القادم: {(userProfile.fazaCount || 0) < 3 ? '3' : (userProfile.fazaCount || 0) < 10 ? '10' : 'ماستر'}</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, ((userProfile.fazaCount || 0) / ((userProfile.fazaCount || 0) < 3 ? 3 : 10)) * 100)}%` }} />
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-black">{userProfile.karamPoints || 0} نقطة</span>
            </div>
            <button className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-lg">سجل الفزعات</button>
          </div>
        </div>
        <Crown className="absolute -bottom-8 -right-8 w-40 h-40 text-white/5 rotate-12" />
      </div>

      <div>
        <h2 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" /> استكشف المجالس والمجتمعات
        </h2>

        {/* عرض المجتمعات أو شاشة فارغة في حال لم تكن موجودة بعد في الـ API */}
        <div className="grid gap-2">
          {communities.length > 0 ? (
            communities.map(renderCommunityCard)
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-600">لا توجد مجتمعات حالياً</h3>
              <p className="text-xs text-slate-400 mt-1">اربط الواجهة بـ communityAPI لعرض المجالس هنا.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};