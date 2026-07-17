import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot } from 'lucide-react';
import { sendAiMessage, ChatMessage } from '@/services/ai.service';

const SUGGESTIONS = [
  'How many fee defaulters do we have?',
  'Show finance summary',
  'Find student Abdullah',
  'Attendance % of Grade 10',
  'List upcoming exams',
];

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi, I'm CodeCortex — your ERP assistant. Ask me about students, fees, attendance or exams and I'll pull the live data for you.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await sendAiMessage(next.filter((m) => m.role !== 'system'));
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not reach the assistant service. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition-all"
        aria-label="Open AI Assistant"
        title="AI Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-7rem)] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white">
            <Bot className="w-5 h-5" />
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">CodeCortex Assistant</p>
              <p className="text-[10px] opacity-80">Ask about students, fees, attendance, exams</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-400 text-xs rounded-bl-sm">
                  Thinking…
                </div>
              </div>
            )}

            {/* Suggestions (only before first user message) */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[11px] px-2.5 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 text-xs h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
