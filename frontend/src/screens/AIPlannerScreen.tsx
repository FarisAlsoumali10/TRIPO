import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, Trash2, Mic, MicOff, Copy, ThumbsUp, ThumbsDown,
  Bookmark, RefreshCw, Check, X, RotateCcw, BookOpen, MapPin, Wallet,
  ChevronDown,
} from 'lucide-react';
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
const SAVED_PLANS_KEY  = 'tripo_saved_plans';

const PLANNER_MODES = [
  { id: 'micro',   label: '⚡ Micro',   hint: 'Quick 2–4h outing',        color: 'bg-violet-600',  ring: 'ring-violet-400/40'  },
  { id: 'budget',  label: '🪙 Budget',  hint: 'Under 100 SAR',            color: 'bg-amber-500',   ring: 'ring-amber-400/40'   },
  { id: 'family',  label: '👨👩👧 Family',  hint: 'Kid-friendly',             color: 'bg-blue-600',    ring: 'ring-blue-400/40'    },
  { id: 'date',    label: '🌙 Date',    hint: 'Romantic evening',          color: 'bg-rose-600',    ring: 'ring-rose-400/40'    },
  { id: 'solo',    label: '🎒 Solo',    hint: 'Solo adventure',            color: 'bg-orange-500',  ring: 'ring-orange-400/40'  },
  { id: 'weekend', label: '🏕 Weekend', hint: 'Full weekend getaway',      color: 'bg-teal-600',    ring: 'ring-teal-400/40'    },
] as const;

type PlannerModeId = typeof PLANNER_MODES[number]['id'];

const CITIES  = ['Riyadh','Jeddah','Mecca','Medina','AlUla','Abha','Dammam','Taif'];
const BUDGETS = [
  { id: 'free',   label: 'Free'       },
  { id: 'low',    label: '< 50 SAR'   },
  { id: 'medium', label: '50–200 SAR' },
  { id: 'high',   label: '200+ SAR'   },
];

const FOLLOW_UP_CHIPS: Record<PlannerModeId, string[]> = {
  micro:   ['Make it even shorter','Under 50 SAR','More outdoor options','Add a coffee stop'],
  budget:  ['Completely free version','Add one splurge spot','Best value pick only','Under 30 SAR'],
  family:  ['Ages 5–10 friendly','Add a food stop','Shorter version','More active options'],
  date:    ['More romantic atmosphere','Earlier in the day','Add a dinner spot','Outdoor version'],
  solo:    ['Off the beaten path','Good for meeting people','Best photo spots','Add a café'],
  weekend: ['Friday only version','Include hotel suggestion','Budget weekend','More adventure'],
};

const SUGGESTED_PROMPTS: Record<PlannerModeId, string[]> = {
  micro:   ['Free Saturday under 100 SAR for 2','Best outdoor spots this weekend','Quick morning escape in the city'],
  budget:  ['Best free spots in the city','Full day under 50 SAR','Free family activities nearby'],
  family:  ['Family day out with kids under 10','Weekend fun for the whole family','Kid-friendly outdoor activities'],
  date:    ['Romantic evening for two','Sunset date ideas','Unique date night under 200 SAR'],
  solo:    ['Best solo day out in the city','Hidden gems for a solo explorer','Where to go alone on a Friday'],
  weekend: ['Full weekend getaway plan','Best spots for a 2-day trip','Weekend escape from the city'],
};

function buildSystemPrompt(mode: PlannerModeId, city: string, budget: string): string {
  const modeHints: Record<PlannerModeId, string> = {
    micro:   'Focus on quick 2–4 hour outings. Minimise travel time between spots.',
    budget:  `Keep total costs within the user's budget. Prioritise free or low-cost options.`,
    family:  'Suggest family-friendly activities suitable for children. Include facilities notes.',
    date:    'Suggest romantic, atmospheric spots. Consider ambiance, timing, and intimacy.',
    solo:    'Tailor for a solo traveller. Include social venues, self-paced activities, and safety notes.',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  const d   = new Date(ts);
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
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{p.slice(2,-2)}</strong>;
        if (/^\*[^*]+\*$/.test(p))     return <em key={i} className="italic text-slate-700 dark:text-slate-300">{p.slice(1,-1)}</em>;
        return p || null;
      })}
    </>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines   = text.split('\n');
  const output: React.ReactNode[] = [];
  const pending: { type: 'ul' | 'ol'; content: string }[] = [];

  const flushList = (k: string) => {
    if (!pending.length) return;
    const type  = pending[0].type;
    const items = [...pending];
    pending.length = 0;
    output.push(
      type === 'ul'
        ? <ul key={k} className="space-y-1.5 my-2">
            {items.map((it, j) => (
              <li key={j} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-700 dark:text-white/65">
                <span className="text-oasis-spring mt-[3px] flex-shrink-0">•</span>
                <span>{renderInline(it.content)}</span>
              </li>
            ))}
          </ul>
        : <ol key={k} className="space-y-1.5 my-2">
            {items.map((it, j) => (
              <li key={j} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-700 dark:text-white/65">
                <span className="text-oasis-spring font-bold flex-shrink-0 w-4 tabular-nums">{j+1}.</span>
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

    if (h3)               { flushList(`l${i}`); output.push(<p key={i} className="font-semibold text-slate-800 dark:text-white/90 text-[13px] mt-3 mb-0.5 tracking-tight">{renderInline(h3[1])}</p>); }
    else if (h2)          { flushList(`l${i}`); output.push(<p key={i} className="font-bold text-slate-900 dark:text-white text-sm mt-4 mb-1 tracking-tight">{renderInline(h2[1])}</p>); }
    else if (h1)          { flushList(`l${i}`); output.push(<p key={i} className="font-extrabold text-slate-900 dark:text-white text-base mt-4 mb-1 tracking-tight">{renderInline(h1[1])}</p>); }
    else if (ul)          { pending.push({ type: 'ul', content: ul[1] }); }
    else if (ol)          { pending.push({ type: 'ol', content: ol[1] }); }
    else if (!line.trim()){ flushList(`l${i}`); if (output.length) output.push(<div key={`sp${i}`} className="h-1.5" />); }
    else                  { flushList(`l${i}`); output.push(<p key={i} className="text-[13px] text-slate-700 dark:text-white/65 leading-relaxed">{renderInline(line)}</p>); }
  });
  flushList('end');

  return <div className="space-y-0.5">{output}</div>;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-end gap-2.5 mb-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
    <div className="w-8 h-8 bg-gradient-to-br from-oasis-spring to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-oasis-spring/20">
      <Sparkles className="w-3.5 h-3.5 text-midnight" />
    </div>
    <div className="bg-white dark:bg-white/[0.06] border border-slate-100 dark:border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1">
        {[0, 160, 320].map(d => (
          <span
            key={d}
            className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/30 animate-bounce"
            style={{ animationDelay: `${d}ms`, animationDuration: '1s' }}
          />
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

const MessageBubble: React.FC<BubbleProps> = ({
  msg, isLast, plannerMode, onRate, onSave, onRetry,
  onRegenerate, onFollowUp, copiedId, onCopy,
}) => {
  const isUser = msg.role === 'user';
  const chips  = FOLLOW_UP_CHIPS[plannerMode];

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-right-2 duration-200">
        <div className="max-w-[78%]">
          <div className="bg-gradient-to-br from-oasis-spring to-teal-500 text-midnight rounded-2xl rounded-br-none px-4 py-3 shadow-md shadow-oasis-spring/15">
            <p className="text-[13px] font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-white/25 text-right mt-1 pr-1 tabular-nums">{formatTimestamp(msg.timestamp)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 mb-4 animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="w-8 h-8 bg-gradient-to-br from-oasis-spring to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-oasis-spring/20 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-midnight" />
      </div>

      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className={`
          rounded-2xl rounded-tl-none px-4 py-3.5 shadow-sm
          ${msg.isError
            ? 'bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20'
            : 'bg-white dark:bg-white/[0.06] border border-slate-100/80 dark:border-white/[0.06]'}
        `}>
          {msg.isError ? (
            <p className="text-[13px] text-red-500 dark:text-red-400 leading-relaxed">{msg.text}</p>
          ) : msg.text ? (
            <>
              {renderMarkdown(msg.text)}
              {msg.isStreaming && (
                <span className="inline-block w-0.5 h-3.5 bg-oasis-spring animate-pulse ml-0.5 -mb-0.5 rounded-full" />
              )}
            </>
          ) : (
            <span className="inline-block w-0.5 h-3.5 bg-slate-300 animate-pulse rounded-full" />
          )}
        </div>

        {!msg.isStreaming && (
          <div className="flex items-center gap-1 mt-1.5 pl-0.5">
            <span className="text-[10px] text-slate-400 dark:text-white/25 tabular-nums mr-1">{formatTimestamp(msg.timestamp)}</span>

            {!msg.isError && (
              <>
                <button
                  onClick={() => onCopy(msg.id, msg.text)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/8 transition-colors text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60"
                  title="Copy">
                  {copiedId === msg.id
                    ? <Check className="w-3 h-3 text-oasis-spring" />
                    : <Copy className="w-3 h-3" />}
                </button>

                <button
                  onClick={() => onRate(msg.id, 'up')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    msg.rating === 'up'
                      ? 'text-oasis-spring bg-oasis-spring/10'
                      : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 hover:bg-slate-100 dark:hover:bg-white/8'
                  }`}
                  title="Helpful">
                  <ThumbsUp className={`w-3 h-3 ${msg.rating === 'up' ? 'fill-oasis-spring' : ''}`} />
                </button>

                <button
                  onClick={() => onRate(msg.id, 'down')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    msg.rating === 'down'
                      ? 'text-red-400 bg-red-400/10'
                      : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 hover:bg-slate-100 dark:hover:bg-white/8'
                  }`}
                  title="Not helpful">
                  <ThumbsDown className={`w-3 h-3 ${msg.rating === 'down' ? 'fill-red-400' : ''}`} />
                </button>

                <button
                  onClick={() => onSave(msg.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    msg.saved
                      ? 'text-amber-500 bg-amber-400/10'
                      : 'text-slate-400 dark:text-white/30 hover:text-amber-400 hover:bg-amber-400/10'
                  }`}
                  title={msg.saved ? 'Unsave plan' : 'Save plan'}>
                  <Bookmark className={`w-3 h-3 ${msg.saved ? 'fill-amber-400' : ''}`} />
                </button>

                {isLast && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg text-slate-400 dark:text-white/30 hover:text-oasis-spring hover:bg-oasis-spring/10 transition-colors"
                    title="Regenerate">
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </>
            )}

            {msg.isError && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ml-1">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        )}

        {isLast && !msg.isStreaming && !msg.isError && chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pl-0.5">
            {chips.map(chip => (
              <button
                key={chip}
                onClick={() => onFollowUp(chip)}
                className="px-3 py-1.5 bg-white dark:bg-white/[0.05] hover:bg-oasis-spring/10 hover:text-oasis-spring hover:border-oasis-spring/30 border border-slate-200/70 dark:border-white/[0.08] rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 transition-all duration-150 active:scale-95">
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

const SavedPlansView = ({
  onClose, onDelete, lang = 'ar',
}: { onClose: () => void; onDelete: (id: string) => void; lang?: 'en' | 'ar' }) => {
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
    <div className="flex flex-col h-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-amber-400/15 dark:bg-amber-400/10 rounded-xl flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          </div>
          <span className="font-bold text-slate-800 dark:text-white text-sm">
            {lang === 'ar' ? `الخطط المحفوظة (${plans.length})` : `Saved Plans (${plans.length})`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/8 text-slate-400 dark:text-white/40 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-8">
            <div className="w-14 h-14 bg-slate-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-slate-300 dark:text-white/15" />
            </div>
            <div>
              <p className="font-semibold text-slate-500 dark:text-white/40 text-sm mb-1">
                {lang === 'ar' ? 'لا توجد خطط محفوظة بعد' : 'No saved plans yet'}
              </p>
              <p className="text-slate-400 dark:text-white/25 text-[11px] max-w-[200px] leading-relaxed">
                {lang === 'ar' ? 'اضغط أيقونة الحفظ على أي رد لحفظه هنا' : 'Tap the bookmark icon on any AI response to save it here'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map(plan => (
              <div key={plan.id} className="bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-100/80 dark:border-white/[0.06] shadow-sm p-4 group">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] text-slate-400 dark:text-white/25 tabular-nums">{formatTimestamp(plan.timestamp)}</span>
                  <button
                    onClick={() => remove(plan.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-300 dark:text-white/20 hover:text-red-400 transition-all flex-shrink-0">
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
  const [messages,    setMessages]    = useState<ChatMessage[]>(() => {
    try { const raw = localStorage.getItem(CHAT_HISTORY_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [inputValue,  setInputValue]  = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [plannerMode, setPlannerMode] = useState<PlannerModeId>('micro');
  const [city,        setCity]        = useState('Riyadh');
  const [budget,      setBudget]      = useState('medium');
  const [isListening, setIsListening] = useState(false);
  const [showSaved,   setShowSaved]   = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [copiedId,    setCopiedId]    = useState<string | null>(null);
  const [savedCount,  setSavedCount]  = useState(() => {
    try { return (JSON.parse(localStorage.getItem(SAVED_PLANS_KEY) || '[]') as ChatMessage[]).length; } catch { return 0; }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const voiceRef       = useRef<any>(null);
  const lastUserMsgRef = useRef<string>('');
  const ar = lang === 'ar';

  const localizedModes = ar ? [
    { id: 'micro'   as const, label: '⚡ سريع',    hint: 'خروجة ٢–٤ ساعات',        color: 'bg-violet-600', ring: 'ring-violet-400/40' },
    { id: 'budget'  as const, label: '🪙 اقتصادي', hint: 'أقل من ١٠٠ ريال',          color: 'bg-amber-500',  ring: 'ring-amber-400/40'  },
    { id: 'family'  as const, label: '👨👩👧 عائلي',  hint: 'مناسب للأطفال',           color: 'bg-blue-600',   ring: 'ring-blue-400/40'   },
    { id: 'date'    as const, label: '🌙 رومانسي', hint: 'سهرة رومانسية',            color: 'bg-rose-600',   ring: 'ring-rose-400/40'   },
    { id: 'solo'    as const, label: '🎒 منفرد',   hint: 'مغامرة فردية',             color: 'bg-orange-500', ring: 'ring-orange-400/40' },
    { id: 'weekend' as const, label: '🏕 عطلة',    hint: 'إجازة نهاية الأسبوع',      color: 'bg-teal-600',   ring: 'ring-teal-400/40'   },
  ] : PLANNER_MODES;

  const localizedBudgets = ar ? [
    { id: 'free',   label: 'مجاني'       },
    { id: 'low',    label: '< ٥٠ ريال'   },
    { id: 'medium', label: '٥٠–٢٠٠ ريال' },
    { id: 'high',   label: '٢٠٠+ ريال'   },
  ] : BUDGETS;

  const localizedSuggestedPrompts: Record<PlannerModeId, string[]> = ar ? {
    micro:   ['سبت مجاني لشخصين','أفضل الأماكن الخارجية هذا الأسبوع','خروجة صباحية سريعة في المدينة'],
    budget:  ['أفضل الأماكن المجانية','يوم كامل بأقل من ٥٠ ريال','أنشطة عائلية مجانية قريبة'],
    family:  ['يوم عائلي مع أطفال دون العاشرة','أنشطة ترفيهية لعطلة نهاية الأسبوع','أنشطة خارجية مناسبة للعائلة'],
    date:    ['سهرة رومانسية لشخصين','أفكار لموعد عند غروب الشمس','موعد مميز بأقل من ٢٠٠ ريال'],
    solo:    ['أفضل يوم منفرد في المدينة','أماكن خفية للمستكشف الفردي','أين أذهب وحيداً يوم الجمعة؟'],
    weekend: ['خطة عطلة نهاية الأسبوع الكاملة','أفضل أماكن لرحلة يومين','الهروب من المدينة للعطلة'],
  } : SUGGESTED_PROMPTS;

  useEffect(() => {
    if (messages.length > 0)
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-60)));
  }, [messages]);

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
      const promptText     = `Chat History:\n${historyContext}\n\nPlease respond to the final User constraint.`;
      const result         = await aiAPI.generateContent(promptText, buildSystemPrompt(plannerMode, city, budget));

      setIsTyping(false);
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
    const lastUserText = lastUserMsgRef.current;
    if (!lastUserText) return;
    setMessages(prev => {
      let i = prev.length - 1;
      while (i >= 0 && prev[i].role === 'ai') i--;
      return prev.slice(0, i + 1);
    });
    setTimeout(() => sendMessage(lastUserText), 50);
  };

  const handleRate = (id: string, rating: 'up' | 'down') =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, rating: m.rating === rating ? undefined : rating } : m));

  const handleSave = (id: string) => {
    setMessages(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, saved: !m.saved } : m);
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
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch {}
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
    rec.onstart  = () => setIsListening(true);
    rec.onresult = (e: any) => { setInputValue(e.results[0][0].transcript); setIsListening(false); };
    rec.onend    = () => setIsListening(false);
    rec.onerror  = () => setIsListening(false);
    rec.start();
    voiceRef.current = rec;
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  const isEmpty       = messages.length === 0;
  const currentMode   = localizedModes.find(m => m.id === plannerMode) || localizedModes[0];
  const currentBudget = localizedBudgets.find(b => b.id === budget)     || localizedBudgets[2];
  const lastAiIdx     = (() => {
    for (let i = messages.length - 1; i >= 0; i--)
      if (messages[i].role === 'ai') return i;
    return -1;
  })();

  if (showSaved) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-midnight">
        <SavedPlansView onClose={() => setShowSaved(false)} onDelete={handleDeleteSaved} lang={lang as 'en' | 'ar'} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/80 dark:bg-midnight">

      {/* ── Header ── */}
      <div className="bg-white/95 dark:bg-[#13131a]/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.06] flex-shrink-0">

        <div className="px-4 pt-4 pb-2.5 flex items-center gap-3">
          <div className={`w-9 h-9 ${currentMode.color} rounded-[10px] flex items-center justify-center shadow-md flex-shrink-0 transition-all duration-300`}>
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight tracking-tight">
              {ar ? 'منظم الرحلات الذكي' : 'AI Trip Planner'}
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-white/30 truncate mt-0.5 font-medium tracking-wider">
              Gemini · {city} · {currentBudget.label}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {savedCount > 0 ? (
              <button
                onClick={() => setShowSaved(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-400/20 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors">
                <Bookmark className="w-3 h-3 fill-current" />
                {savedCount}
              </button>
            ) : (
              <button
                onClick={() => setShowSaved(true)}
                title="Saved plans"
                className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-white/30 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-colors">
                <BookOpen className="w-4 h-4" />
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                title="Clear history"
                className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-white/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-3">
          {localizedModes.map(mode => (
            <button
              key={mode.id}
              onClick={() => setPlannerMode(mode.id)}
              title={mode.hint}
              className={`
                flex-shrink-0 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-200 active:scale-95
                ${plannerMode === mode.id
                  ? `${mode.color} text-white border-transparent shadow-md`
                  : 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 border-slate-200/60 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.1] hover:text-slate-700 dark:hover:text-white/60'}
              `}>
              {mode.label}
            </button>
          ))}
        </div>

        {/* Context bar */}
        <div className="px-4 pb-3.5">
          <button
            onClick={() => setShowContext(v => !v)}
            className="w-full flex items-center gap-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] rounded-2xl px-4 py-2.5 hover:border-oasis-spring/50 hover:bg-white dark:hover:bg-white/[0.06] transition-all duration-200 active:scale-[0.99]">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <MapPin className="w-3 h-3 text-oasis-spring flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">{city}</span>
              <span className="text-slate-300 dark:text-white/15 mx-1">·</span>
              <Wallet className="w-3 h-3 text-oasis-spring flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-900 dark:text-white">{currentBudget.label}</span>
            </div>
            <span
              className="text-oasis-spring flex-shrink-0 transition-transform duration-200"
              style={{ transform: showContext ? 'rotate(180deg)' : 'none' }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </button>

          {showContext && (
            <div className="mt-2.5 p-4 bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-100 dark:border-white/[0.06] space-y-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-2.5">
                  {ar ? 'المدينة' : 'City'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CITIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 active:scale-95 ${
                        c === city
                          ? 'bg-oasis-spring text-midnight border-transparent shadow-sm'
                          : 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 border-slate-200/60 dark:border-white/[0.06] hover:border-oasis-spring/40 hover:text-oasis-spring'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-2.5">
                  {ar ? 'الميزانية' : 'Budget'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {localizedBudgets.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setBudget(b.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 active:scale-95 ${
                        b.id === budget
                          ? 'bg-oasis-spring text-midnight border-transparent shadow-sm'
                          : 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 border-slate-200/60 dark:border-white/[0.06] hover:border-oasis-spring/40 hover:text-oasis-spring'
                      }`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 overscroll-contain">

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-4">
            <div className="text-center">
              <div className={`w-20 h-20 ${currentMode.color} rounded-[22px] flex items-center justify-center mx-auto mb-5 shadow-xl transition-all duration-300 active:scale-95`}>
                <Sparkles className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1.5 tracking-tight">
                {ar ? 'خطط لرحلتك القادمة' : 'Plan your next escape'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-widest">
                {currentMode.hint} · {city}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-xs">
              {localizedSuggestedPrompts[plannerMode].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-4 py-2.5 bg-white dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06] rounded-2xl text-[11px] text-slate-700 dark:text-white/70 font-semibold hover:border-oasis-spring/50 hover:text-oasis-spring hover:bg-oasis-spring/5 transition-all duration-150 shadow-sm active:scale-95">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isEmpty && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {localizedSuggestedPrompts[plannerMode].map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={isTyping}
                className="px-3 py-1.5 bg-white dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] rounded-full text-[10px] text-slate-600 dark:text-white/50 font-semibold hover:border-oasis-spring/50 hover:text-oasis-spring hover:bg-oasis-spring/5 transition-all duration-150 active:scale-95 disabled:opacity-40">
                {p}
              </button>
            ))}
          </div>
        )}

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

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="bg-white/95 dark:bg-[#13131a]/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-white/[0.06] px-4 pt-3 pb-8 flex items-center gap-2.5 flex-shrink-0">

        <button
          onClick={handleVoice}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
            isListening
              ? 'bg-red-500 text-white shadow-md shadow-red-500/25 animate-pulse'
              : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-white/50 active:scale-95'
          }`}
          title={isListening ? 'Stop recording' : 'Voice input'}>
          {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); } }}
          placeholder={ar ? 'ما نوع الخروجة التي تخطط لها؟' : 'What kind of escape are you planning?'}
          disabled={isTyping}
          className="flex-1 bg-slate-100 dark:bg-white/[0.06] border border-transparent rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 outline-none focus:ring-2 focus:ring-oasis-spring/40 focus:bg-white dark:focus:bg-white/[0.08] focus:border-oasis-spring/30 transition-all duration-200 disabled:opacity-50"
        />

        <button
          onClick={() => sendMessage(inputValue)}
          disabled={!inputValue.trim() || isTyping}
          className={`
            w-11 h-11 rounded-2xl flex items-center justify-center text-midnight flex-shrink-0 transition-all duration-200 active:scale-95
            ${!inputValue.trim() || isTyping
              ? 'bg-slate-200 dark:bg-white/[0.06] text-slate-400 dark:text-white/20 cursor-not-allowed'
              : `${currentMode.color} shadow-md hover:opacity-90`}
          `}>
          <Send className="w-4.5 h-4.5" />
        </button>

      </div>
    </div>
  );
};