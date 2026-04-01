import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHAT_HISTORY_KEY = 'tripo_ai_chat_history';

const SUGGESTED_PROMPTS = [
  'Free Saturday under 100 SAR for 2',
  'Best outdoor spots this weekend',
  'Family day out in Riyadh',
  'Hidden gems for history lovers',
];

const SYSTEM_PROMPT =
  'You are Tripo AI, a travel assistant for Saudi Arabia. The user wants help planning micro-escapes. When they describe what they want, respond with a structured trip plan: 3-5 places in Riyadh with names, estimated duration, estimated cost in SAR, and brief description. Format your response as readable text with emojis. Keep it concise and friendly.';

// ─── Typing Indicator ─────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-4">
    {/* Tripo logo */}
    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
      <span className="text-white text-xs font-bold">T</span>
    </div>
    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  </div>
);

// ─── Message Bubble ───────────────────────────────────────────────────────────

const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] bg-emerald-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-4">
      {/* Tripo logo */}
      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-white text-xs font-bold">T</span>
      </div>
      <div className="max-w-[75%] bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AIPlannerScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist history whenever messages change (keep last 60)
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-60)));
    }
  }, [messages]);

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  // Scroll to bottom whenever messages change or typing indicator appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${trimmed}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });
      const aiText = response.text || 'Sorry, I could not generate a response. Please try again.';

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: aiText,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "Sorry, I couldn't connect right now. Please check your connection and try again. 🙏",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => sendMessage(inputValue);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-slate-900 text-base leading-tight">AI Trip Planner</h1>
          <p className="text-xs text-slate-500">Powered by Gemini · Saudi Arabia micro-escapes</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Empty state: suggested prompts */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Plan your next escape</h2>
              <p className="text-sm text-slate-500 max-w-xs">
                Tell me what you're looking for and I'll craft a personalised trip just for you.
              </p>
            </div>

            {/* Suggested prompt pills */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 font-medium hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggested prompts at top when there are messages */}
        {!isEmpty && (
          <div className="flex flex-wrap gap-2 mb-4">
            {SUGGESTED_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSuggestedPrompt(prompt)}
                disabled={isTyping}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 font-medium hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Message thread */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What kind of escape are you planning?"
          disabled={isTyping}
          className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
          className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex-shrink-0 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
