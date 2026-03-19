import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Mic, MicOff, X, Send, Bot } from 'lucide-react';
import { Button } from './ui';
import { User } from '../types/index';

interface AIAssistantProps {
  user: User;
  t: any;
  lang: 'en' | 'ar';
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const AIAssistant = ({ user, t, lang }: AIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'init',
        role: 'model',
        text: t.aiWelcome || "يا هلا والله! أنا مساعد تريبو الذكي. طفشان أو تدور فعالية بالرياض؟ آمرني!"
      }]);
      initializeGemini();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeGemini = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const systemInstruction = `
        You are 'Tripo AI', a friendly local city guide for Riyadh, Saudi Arabia.
        Tone: Very hospitable, warm, and professional (Saudi culture).
        Language: Friendly Saudi/Gulf dialect when speaking Arabic.
        Culture: Use terms like 'Shella', 'Asriya', 'Faza'a', 'Karam', and 'Majlis'.
        Your mission is to find the user a perfect "micro-escape" in Riyadh.
        
        Rules:
        1. Keep responses very short (max 35 words).
        2. Suggest REAL places in Riyadh (cafes, parks, boulevards, hidden gems).
        3. If it's afternoon, suggest an "Asriya" spot.
        4. Current user is ${user?.name || 'Guest'}. They prefer a ${user?.smartProfile?.preferredBudget || 'medium'} budget.
      `;

      chatSessionRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
        },
      });
    } catch (e) {
      console.error("Failed to init AI", e);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) await initializeGemini();

      const result = await chatSessionRef.current.sendMessage(textToSend);

      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: result.text };
      setMessages(prev => [...prev, modelMsg]);
      speak(result.text);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "عذراً يا غالي، يبدو أن هناك مشكلة في الاتصال بمرشدنا المحلي حالياً." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => handleSend(event.results[0][0].transcript);
      recognition.onend = () => setIsListening(false);
      recognition.start();
      recognitionRef.current = recognition;
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full shadow-2xl flex items-center justify-center text-white z-40 animate-bounce-slow hover:scale-110 transition-transform">
      <Sparkles className="w-7 h-7" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-md sm:max-w-md sm:mx-auto">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Bot className="w-5 h-5" /></div>
          <h2 className="font-bold text-slate-900">{t.aiChatTitle || "Tripo AI"}</h2>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none rtl:rounded-tl-none rtl:rounded-tr-2xl' : 'bg-white text-slate-800 shadow-sm border border-slate-200 rounded-tl-none rtl:rounded-tr-none rtl:rounded-tl-2xl'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl animate-pulse flex gap-1 shadow-sm border border-slate-200"><span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></span><span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></span></div></div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
        <button onClick={isListening ? stopListening : startListening} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>{isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button>
        <input className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" placeholder={t.aiInputPlaceholder || "اكتب رسالتك هنا..."} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
        <button onClick={() => handleSend()} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center text-white shadow-md transition-colors rtl:rotate-180"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
};