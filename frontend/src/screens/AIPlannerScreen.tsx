import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Trash2, Mic, MicOff, Copy, ThumbsUp, ThumbsDown, Bookmark, RefreshCw, Check, X, RotateCcw, BookOpen } from 'lucide-react';
import { aiAPI } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  isError?: boolean;
  isStreaming?: boolean;
  rating?: 'up' | 'down';
  saved?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAT_HISTORY_KEY = 'tripo_ai_planner_history';
const SAVED_PLANS_KEY = 'tripo_saved_plans';

const PLANNER_MODES = [
  { id: 'micro', label: '⚡ Micro', hint: 'Quick 2–4h outing', color: 'bg-violet-600' },
  { id: 'budget', label: '🪙 Budget', hint: 'Under 100 SAR', color: 'bg-amber-500' },
  { id: 'family', label: '👨‍👩‍👧 Family', hint: 'Kid-friendly', color: 'bg-blue-600' },
  { id: 'date', label: '🌙 Date', hint: 'Romantic evening', color: 'bg-rose-600' },
  { id: 'solo', label: '🎒 Solo', hint: 'Solo adventure', color: 'bg-orange-500' },
  { id: 'weekend', label: '🏕 Weekend', hint: 'Full weekend getaway', color: 'bg-teal-600' },
] as const;

type PlannerModeId = typeof PLANNER_MODES[number]['id'];

const CITIES = ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'AlUla', 'Abha', 'Dammam', 'Taif'];

const BUDGETS = [
  { id: 'free', label: 'Free' },
  { id: 'low', label: '< 50 SAR' },
  { id: 'medium', label: '50–200 SAR' },
  { id: 'high', label: '200+ SAR' },
];

const FOLLOW_UP_CHIPS: Record<PlannerModeId, string[]> = {
  micro: ['Make it even shorter', 'Under 50 SAR', 'More outdoor options', 'Add a coffee stop'],
  budget: ['Completely free version', 'Add one splurge spot', 'Best value pick only', 'Under 30 SAR'],
  family: ['Ages 5–10 friendly', 'Add a food stop', 'Shorter version', 'More active options'],
  date: ['More romantic atmosphere', 'Earlier in the day', 'Add a dinner spot', 'Outdoor version'],
  solo: ['Off the beaten path', 'Good for meeting people', 'Best photo spots', 'Add a café'],
  weekend: ['Friday only version', 'Include hotel suggestion', 'Budget weekend', 'More adventure'],
};

const SUGGESTED_PROMPTS: Record<PlannerModeId, string[]> = {
  micro: ['Free Saturday under 100 SAR for 2', 'Best outdoor spots this weekend', 'Quick morning escape in the city'],
  budget: ['Best free spots in the city', 'Full day under 50 SAR', 'Free family activities nearby'],
  family: ['Family day out with kids under 10', 'Weekend fun for the whole family', 'Kid-friendly outdoor activities'],
  date: ['Romantic evening for two', 'Sunset date ideas', 'Unique date night under 200 SAR'],
  solo: ['Best solo day out in the city', 'Hidden gems for a solo explorer', 'Where to go alone on a Friday'],
  weekend: ['Full weekend getaway plan', 'Best spots for a 2-day trip', 'Weekend escape from the city'],
};

function buildSystemPrompt(mode: PlannerModeId, city: string, budget: string): string {
  const modeHints: Record<PlannerModeId, string> = {
    micro: 'Focus on quick 2–4 hour outings. Minimise travel time between spots.',
    budget: `Keep total costs within the user's budget. Prioritise free or low-cost options.`,
    family: 'Suggest family-friendly activities suitable for children. Include facilities notes.',
    date: 'Suggest romantic, atmospheric spots. Consider ambiance, timing, and intimacy.',
    solo: 'Tailor for a solo traveller. Include social venues, self-paced activities, and safety notes.',
    weekend: 'Plan a full 1–2 day itinerary. Include meals and, where relevant, accommodation tips.',
  };
  return `You are Tripo AI, an expert travel planning assistant for Saudi Arabia.
The user is currently in ${city}. Budget preference: ${budget}.
${modeHints[mode]}

Response format rules:
- Use **bold** for place names
- Use bullet points (- item) for details under each place
- Keep each place entry to 2–3 lines max
- Include: estimated duration ⏱, cost in SAR 💰, and a one-line reason to go
- Respond in the same language the user writes in
- Be friendly, concise, and practical`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const yest = new Date(now.getTime() - 86400000);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p))
          return <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
        if (/^\*[^*]+\*$/.test(p))
          return <em key={i} className="italic">{p.slice(1, -1)}</em>;
        return p || null;
      })}
    </>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const output: React.ReactNode[] = [];
  const pending: { type: 'ul' | 'ol'; content: string }[] = [];

  const flushList = (k: string) => {
    if (!pending.length) return;
    const type = pending[0].type;
    const items = [...pending]; pending.length = 0;
    output.push(
      type === 'ul'
        ? <ul key={k} className="space-y-1 my-1.5">
          {items.map((it, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
              <span className="text-emerald-500 mt-0.5 flex-shrink-0 font-bold">•</span>
              <span>{renderInline(it.content)}</span>
            </li>
          ))}
        </ul>
        : <ol key={k} className="space-y-1 my-1.5">
          {items.map((it, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
              <span className="text-emerald-600 font-bold flex-shrink-0 w-4">{j + 1}.</span>
              <span>{renderInline(it.content)}</span>
            </li>
          ))}
        </ol>
    );
  };

  lines.forEach((line, i) => {
    const h3 = line.match(/^###\s(.+)/);
    const h2 = line.match(/^##\s(.+)/);
    const h1 = line.match(/^#\s(.+)/);
    const ul = line.match(/^[-*]\s(.+)/);
    const ol = line.match(/^\d+\.\s(.+)/);

    if (h3) { flushList(`l${i}`); output.push(<p key={i} className="font-bold text-slate-800 text-sm mt-2.5 mb-0.5">{renderInline(h3[1])}</p>); }
    else if (h2) { flushList(`l${i}`); output.push(<p key={i} className="font-bold text-slate-900 text-base mt-3 mb-1">{renderInline(h2[1])}</p>); }
    else if (h1) { flushList(`l${i}`); output.push(<p key={i} className="font-extrabold text-slate-900 text-lg mt-3 mb-1">{renderInline(h1[1])}</p>); }
    else if (ul) { pending.push({ type: 'ul', content: ul[1] }); }
    else if (ol) { pending.push({ type: 'ol', content: ol[1] }); }
    else if (line.trim() === '') { flushList(`l${i}`); if (output.length) output.push(<div key={`sp${i}`} className="h-1" />); }
    else { flushList(`l${i}`); output.push(<p key={i} className="text-sm text-slate-700 leading-relaxed">{renderInline(line)}</p>); }
  });
  flushList('end');

  return <div className="space-y-0.5">{output}</div>;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-4">
    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
      <Sparkles className="w-4 h-4 text-white" />
    </div>
    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        {[0, 150, 300].map(d => (
          <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  msg: ChatMessage;
  isLast: boolean;
  plannerMode: PlannerModeId;
  onRate: (id: string, r: 'up' | 'down') => void;
  onSave: (id: string) => void;
  onRetry: () => void;
  onRegenerate: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFollowUp: (text: string) => any;
  copiedId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCopy: (id: string, text: string) => any;
}

const MessageBubble: React.FC<BubbleProps> = ({ msg, isLast, plannerMode, onRate, onSave, onRetry, onRegenerate, onFollowUp, copiedId, onCopy }) => {
  const isUser = msg.role === 'user';
  const chips = FOLLOW_UP_CHIPS[plannerMode];

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[78%]">
          <div className="bg-emerald-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          </div>
          <p className="text-[10px] text-slate-400 text-right mt-1 pr-1">{formatTimestamp(msg.timestamp)}</p>
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 max-w-[82%]">
        <div className={`bg-white border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm ${msg.isError ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
          {msg.isError ? (
            <p className="text-sm text-red-600">{msg.text}</p>
          ) : msg.text ? (
            <>
              {renderMarkdown(msg.text)}
              {msg.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-slate-500 animate-pulse ml-0.5 -mb-0.5" />
              )}
            </>
          ) : (
            <span className="inline-block w-0.5 h-4 bg-slate-400 animate-pulse" />
          )}
        </div>

        {/* Timestamp + actions */}
        {!msg.isStreaming && (
          <div className="flex items-center gap-2 mt-1.5 pl-1">
            <span className="text-[10px] text-slate-400">{formatTimestamp(msg.timestamp)}</span>

            {!msg.isError && (
              <>
                {/* Copy */}
                <button onClick={() => onCopy(msg.id, msg.text)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                  title="Copy">
                  {copiedId === msg.id
                    ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                    : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Thumbs up */}
                <button onClick={() => onRate(msg.id, 'up')}
                  className={`p-1 rounded-lg transition-colors ${msg.rating === 'up' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                  title="Helpful">
                  <ThumbsUp className={`w-3.5 h-3.5 ${msg.rating === 'up' ? 'fill-emerald-500' : ''}`} />
                </button>

                {/* Thumbs down */}
                <button onClick={() => onRate(msg.id, 'down')}
                  className={`p-1 rounded-lg transition-colors ${msg.rating === 'down' ? 'text-red-400' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                  title="Not helpful">
                  <ThumbsDown className={`w-3.5 h-3.5 ${msg.rating === 'down' ? 'fill-red-400' : ''}`} />
                </button>

                {/* Save / bookmark */}
                <button onClick={() => onSave(msg.id)}
                  className={`p-1 rounded-lg transition-colors ${msg.saved ? 'text-amber-500' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-100'}`}
                  title={msg.saved ? 'Unsave plan' : 'Save plan'}>
                  <Bookmark className={`w-3.5 h-3.5 ${msg.saved ? 'fill-amber-400' : ''}`} />
                </button>

                {/* Regenerate (last AI message only) */}
                {isLast && (
                  <button onClick={onRegenerate}
                    className="p-1 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-slate-100 transition-colors"
                    title="Regenerate">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}

            {/* Retry on error */}
            {msg.isError && (
              <button onClick={onRetry}
                className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        )}

        {/* Follow-up chips (last AI message, not streaming, no error) */}
        {isLast && !msg.isStreaming && !msg.isError && chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 pl-1">
            {chips.map(chip => (
              <button key={chip} onClick={() => onFollowUp(chip)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-full text-xs font-medium text-slate-600 transition-all active:scale-95">
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Saved Plans View ─────────────────────────────────────────────────────────

const SavedPlansView = ({ onClose, onDelete, lang = 'ar' }: { onClose: () => void; onDelete: (id: string) => void; lang?: 'en' | 'ar' }) => {
  const [plans, setPlans] = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_PLANS_KEY) || '[]'); } catch { return []; }
  });

  const remove = (id: string) => {
    const updated = plans.filter(p => p.id !== id);
    setPlans(updated);
    localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(updated));
    onDelete(id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span className="font-bold text-slate-800 text-sm">{lang === 'ar' ? `الخطط المحفوظة (${plans.length})` : `Saved Plans (${plans.length})`}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bookmark className="w-10 h-10 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-500 text-sm">{lang === 'ar' ? 'لا توجد خطط محفوظة بعد' : 'No saved plans yet'}</p>
            <p className="text-slate-400 text-xs mt-1">{lang === 'ar' ? 'اضغط أيقونة الحفظ على أي رد لحفظه هنا' : 'Tap the bookmark icon on any AI response to save it here'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => (
              <div key={plan.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] text-slate-400">{formatTimestamp(plan.timestamp)}</span>
                  <button onClick={() => remove(plan.id)}
                    className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-sm">{renderMarkdown(plan.text)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AIPlannerScreen: React.FC<{ user?: any; lang?: 'en' | 'ar' }> = ({ lang = 'ar' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { const raw = localStorage.getItem(CHAT_HISTORY_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [plannerMode, setPlannerMode] = useState<PlannerModeId>('micro');
  const [city, setCity] = useState('Riyadh');
  const [budget, setBudget] = useState('medium');
  const [isListening, setIsListening] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(SAVED_PLANS_KEY) || '[]') as ChatMessage[]).length; } catch { return 0; }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<any>(null);
  const voiceRef = useRef<any>(null);
  const lastUserMsgRef = useRef<string>('');

  const ar = lang === 'ar';

  const localizedModes = ar ? [
    { id: 'micro' as const,   label: '⚡ سريع',     hint: 'خروجة ٢–٤ ساعات',          color: 'bg-violet-600' },
    { id: 'budget' as const,  label: '🪙 اقتصادي',  hint: 'أقل من ١٠٠ ريال',            color: 'bg-amber-500' },
    { id: 'family' as const,  label: '👨‍👩‍👧 عائلي',   hint: 'مناسب للأطفال',             color: 'bg-blue-600' },
    { id: 'date' as const,    label: '🌙 رومانسي',  hint: 'سهرة رومانسية',              color: 'bg-rose-600' },
    { id: 'solo' as const,    label: '🎒 منفرد',    hint: 'مغامرة فردية',               color: 'bg-orange-500' },
    { id: 'weekend' as const, label: '🏕 عطلة',     hint: 'إجازة نهاية الأسبوع',        color: 'bg-teal-600' },
  ] : PLANNER_MODES;

  const localizedBudgets = ar ? [
    { id: 'free',   label: 'مجاني' },
    { id: 'low',    label: '< ٥٠ ريال' },
    { id: 'medium', label: '٥٠–٢٠٠ ريال' },
    { id: 'high',   label: '٢٠٠+ ريال' },
  ] : BUDGETS;

  const localizedSuggestedPrompts: Record<PlannerModeId, string[]> = ar ? {
    micro:   ['سبت مجاني لشخصين', 'أفضل الأماكن الخارجية هذا الأسبوع', 'خروجة صباحية سريعة في المدينة'],
    budget:  ['أفضل الأماكن المجانية', 'يوم كامل بأقل من ٥٠ ريال', 'أنشطة عائلية مجانية قريبة'],
    family:  ['يوم عائلي مع أطفال دون العاشرة', 'أنشطة ترفيهية لعطلة نهاية الأسبوع', 'أنشطة خارجية مناسبة للعائلة'],
    date:    ['سهرة رومانسية لشخصين', 'أفكار لموعد عند غروب الشمس', 'موعد مميز بأقل من ٢٠٠ ريال'],
    solo:    ['أفضل يوم منفرد في المدينة', 'أماكن خفية للمستكشف الفردي', 'أين أذهب وحيداً يوم الجمعة؟'],
    weekend: ['خطة عطلة نهاية الأسبوع الكاملة', 'أفضل أماكن لرحلة يومين', 'الهروب من المدينة للعطلة'],
  } : SUGGESTED_PROMPTS;

  // Clear context reference on changes
  useEffect(() => { /* handled statelessly by passing prompt context */ }, [plannerMode, city, budget]);

  // Persist history (last 60 messages)
  useEffect(() => {
    if (messages.length > 0)
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-60)));
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    lastUserMsgRef.current = trimmed;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: trimmed, timestamp: Date.now() };
    const newContext = [...messages, userMsg];

    setMessages(newContext);
    setInputValue('');
    setIsTyping(true);

    const streamId = (Date.now() + 1).toString();

    try {
      const historyContext = newContext.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n\n');
      const promptText = `Chat History:\n${historyContext}\n\nPlease respond to the final User constraint.`;

      const systemInstruction = buildSystemPrompt(plannerMode, city, budget);

      const result = await aiAPI.generateContent(promptText, systemInstruction);

      setIsTyping(false);

      // The backend proxy might return a text string directly, or an object containing .text
      const aiResponseText = typeof result === 'string' ? result : (result?.text || '');

      setMessages(prev => [...prev, { id: streamId, role: 'ai', text: aiResponseText, timestamp: Date.now() }]);
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: streamId, role: 'ai', timestamp: Date.now(),
        text: "Sorry, I couldn't connect right now. Please check your connection and try again. 🙏",
        isError: true,
      }]);
    }
  };

  const handleRegenerate = () => {
    // Remove last AI message and resend last user message
    const lastUserText = lastUserMsgRef.current;
    if (!lastUserText) return;

    setMessages(prev => {
      let i = prev.length - 1;
      while (i >= 0 && prev[i].role === 'ai') i--;
      return prev.slice(0, i + 1);
    });

    setTimeout(() => sendMessage(lastUserText), 50);
  };

  const handleRate = (id: string, rating: 'up' | 'down') => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, rating: m.rating === rating ? undefined : rating } : m));
  };

  const handleSave = (id: string) => {
    setMessages(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, saved: !m.saved } : m);
      // Sync to saved plans store
      const msg = updated.find(m => m.id === id);
      if (msg) {
        const stored: ChatMessage[] = JSON.parse(localStorage.getItem(SAVED_PLANS_KEY) || '[]');
        const newStored = msg.saved
          ? [msg, ...stored.filter(s => s.id !== id)]
          : stored.filter(s => s.id !== id);
        localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(newStored));
        setSavedCount(newStored.length);
      }
      return updated;
    });
  };

  const handleDeleteSaved = (id: string) => {
    setSavedCount(c => Math.max(0, c - 1));
    setMessages(prev => prev.map(m => m.id === id ? { ...m, saved: false } : m));
  };

  const handleCopy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch { }
  };

  const handleRetry = () => {
    setMessages(prev => prev.filter(m => !m.isError));
    if (lastUserMsgRef.current) sendMessage(lastUserMsgRef.current);
  };

  const handleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { voiceRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => { setInputValue(e.results[0][0].transcript); setIsListening(false); };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.start();
    voiceRef.current = rec;
  };

  const clearHistory = () => {
    setMessages([]);
    chatRef.current = null;
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  const isEmpty = messages.length === 0;
  const currentMode = localizedModes.find(m => m.id === plannerMode) || localizedModes[0];
  const currentBudget = localizedBudgets.find(b => b.id === budget) || localizedBudgets[2];

  // Find the last AI message index for regenerate / follow-up chips
  const lastAiIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'ai') return i;
    }
    return -1;
  })();

  if (showSaved) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <SavedPlansView onClose={() => setShowSaved(false)} onDelete={handleDeleteSaved} lang={lang as 'en' | 'ar'} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className={`w-9 h-9 ${currentMode.color} rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 transition-colors duration-300`}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 text-base leading-tight">{ar ? 'منظم الرحلات الذكي' : 'AI Trip Planner'}</h1>
            <p className="text-xs text-slate-500 truncate">Gemini · {city} · {currentBudget.label}</p>
          </div>
          <div className="flex items-center gap-1">
            {savedCount > 0 && (
              <button onClick={() => setShowSaved(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors">
                <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
                {savedCount}
              </button>
            )}
            {!savedCount && (
              <button onClick={() => setShowSaved(true)} title="Saved plans"
                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-colors">
                <BookOpen className="w-4 h-4" />
              </button>
            )}
            {messages.length > 0 && (
              <button onClick={clearHistory} title="Clear history"
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Planner mode selector */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-3">
          {localizedModes.map(mode => (
            <button key={mode.id}
              onClick={() => setPlannerMode(mode.id)}
              title={mode.hint}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${plannerMode === mode.id
                ? `${mode.color} text-white border-transparent shadow-sm`
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
              {mode.label}
            </button>
          ))}
        </div>

        {/* Context bar (city + budget) */}
        <div className="px-4 pb-3">
          <button onClick={() => setShowContext(v => !v)}
            className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left hover:border-emerald-300 transition-colors">
            <span className="text-xs text-slate-500 flex-1">
              📍 <span className="font-semibold text-slate-700">{city}</span>
              <span className="mx-2 text-slate-300">·</span>
              💰 <span className="font-semibold text-slate-700">{currentBudget.label}</span>
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">{showContext ? (ar ? '▲ إخفاء' : '▲ hide') : (ar ? '▼ تغيير' : '▼ change')}</span>
          </button>

          {showContext && (
            <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{ar ? 'المدينة' : 'City'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CITIES.map(c => (
                    <button key={c} onClick={() => setCity(c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${c === city ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{ar ? 'الميزانية' : 'Budget'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {localizedBudgets.map(b => (
                    <button key={b.id} onClick={() => setBudget(b.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${b.id === budget ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-5 pb-4">
            <div className="text-center">
              <div className={`w-16 h-16 ${currentMode.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transition-colors duration-300`}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">{ar ? 'خطط لرحلتك القادمة' : 'Plan your next escape'}</h2>
              <p className="text-sm text-slate-500 max-w-xs">
                {currentMode.hint} · {city} · {currentBudget.label}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {localizedSuggestedPrompts[plannerMode].map(prompt => (
                <button key={prompt} onClick={() => sendMessage(prompt)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 font-medium hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm active:scale-95">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggested prompts strip (when conversation is active) */}
        {!isEmpty && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {localizedSuggestedPrompts[plannerMode].map(p => (
              <button key={p} onClick={() => sendMessage(p)} disabled={isTyping}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 font-medium hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm active:scale-95 disabled:opacity-40">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Message thread */}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isLast={msg.role === 'ai' && idx === lastAiIdx}
            plannerMode={plannerMode}
            onRate={handleRate}
            onSave={handleSave}
            onRetry={handleRetry}
            onRegenerate={handleRegenerate}
            onFollowUp={sendMessage}
            copiedId={copiedId}
            onCopy={handleCopy}
          />
        ))}

        {/* Typing indicator (non-streaming) */}
        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        {/* Voice button */}
        <button onClick={handleVoice}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isListening
            ? 'bg-red-100 text-red-600 animate-pulse'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          title={isListening ? 'Stop recording' : 'Voice input'}>
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); } }}
          placeholder={ar ? 'ما نوع الخروجة التي تخطط لها؟' : 'What kind of escape are you planning?'}
          disabled={isTyping}
          className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition disabled:opacity-50"
        />

        <button
          onClick={() => sendMessage(inputValue)}
          disabled={!inputValue.trim() || isTyping}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all flex-shrink-0 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${currentMode.color}`}>
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};