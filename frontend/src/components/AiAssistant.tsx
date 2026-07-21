import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, AlertCircle, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { sendAiMessage, ChatMessage } from '@/services/ai.service';

export type ChatMode = 'student' | 'teacher' | 'parent' | 'admin';

const SUGGESTIONS: Record<ChatMode, string[]> = {
  admin: [
    'Student strength in each class',
    'Fee defaulters & finance summary',
    'Attendance stats for a class or student',
    'Staff & payroll overview',
    'Exams, homework, behaviour, certificates',
    'Student profile & outstanding balance',
  ],
  teacher: [
    'My attendance',
    'My class timetable',
    'My homework',
    'Student strength in each class',
    'Search / find students',
    'Student profile & outstanding balance',
  ],
  parent: [
    'My attendance',
    'My fees & dues',
    'My exam results',
    'My certificates',
    'My timetable',
    'My notifications',
  ],
  student: [
    'My attendance',
    'My fees & dues',
    'My exam results',
    'My homework',
    'My timetable',
    'My certificates',
    'My notifications',
  ],
};

const WELCOME: Record<ChatMode, string> = {
  admin:
    "Hi, I'm CodeCortex — your ERP AI assistant. Ask me about:\n• Student strength & attendance\n• Fee defaulters & finance overview\n• Staff & payroll\n• Exams, homework, behaviour, certificates",
  teacher:
    "Hi! I'm CodeCortex. Ask me about your class:\n• My attendance\n• My timetable\n• My homework\n• Student search & profiles",
  parent:
    "Hi! I'm CodeCortex. Ask me about your child:\n• My attendance\n• My fees & dues\n• My exam results\n• My certificates",
  student:
    "Hi! I'm CodeCortex. Ask me about your data:\n• My attendance\n• My fees & dues\n• My exam results\n• My timetable",
};

function SpeakingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const speechRecognitionSupported = !!SpeechRecognition;
const speechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function stopSpeaking() {
  if (speechSynthesisSupported) window.speechSynthesis.cancel();
}

function speakText(text: string, onEnd?: () => void) {
  if (!speechSynthesisSupported) return;
  stopSpeaking();
  const clean = text.replace(/[#*_`~\[\]()]/g, '').slice(0, 2000);
  if (!clean.trim()) return;
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1;
  utterance.lang = 'en-US';
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function AiAssistant({ mode = 'admin' }: { mode?: ChatMode }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [offline, setOffline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME[mode] },
  ]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) {
      stopSpeaking();
      setSpeakingMsgIdx(null);
    }
  }, [open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await sendAiMessage(next.filter((m) => m.role !== 'system'), mode);
      setOffline(!!res.offline);
      const replyMsg: ChatMessage = { role: 'assistant', content: res.reply };
      setMessages((prev) => [...prev, replyMsg]);
      if (voiceOutput && speechSynthesisSupported) {
        setTimeout(() => speakText(res.reply), 100);
      }
    } catch {
      const fallback = 'Sorry, I could not reach the assistant service. Please try again.';
      const fallbackMsg: ChatMessage = { role: 'assistant', content: fallback };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (voiceOutput && speechSynthesisSupported) {
        setTimeout(() => speakText(fallback), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  const startListening = useCallback(() => {
    if (!speechRecognitionSupported || listening) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognitionRef.current = recognition;
      let finalTranscript = '';
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += transcript;
          else interim += transcript;
        }
        setInput(finalTranscript + interim);
      };
      recognition.onerror = () => {
        setListening(false);
      };
      recognition.onend = () => {
        setListening(false);
        if (finalTranscript.trim()) send(finalTranscript.trim());
      };
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, send]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setListening(false);
  }, []);

  const toggleListening = () => {
    if (listening) stopListening();
    else startListening();
  };

  const handleSpeakMessage = (content: string, idx: number) => {
    if (speakingMsgIdx === idx) {
      stopSpeaking();
      setSpeakingMsgIdx(null);
    } else {
      stopSpeaking();
      setSpeakingMsgIdx(idx);
      speakText(content, () => setSpeakingMsgIdx(null));
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white shadow-lg shadow-purple-300/50 hover:shadow-xl transition-all duration-200 active:scale-95"
        aria-label="Open AI Assistant"
        title="CodeCortex AI Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-7rem)] flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight tracking-tight">CodeCortex</p>
              <p className="text-[10px] opacity-75 font-medium tracking-wide uppercase">AI Assistant · {mode}</p>
            </div>
            <button
              onClick={() => setVoiceOutput((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${voiceOutput ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
              title={voiceOutput ? 'Mute voice' : 'Enable voice'}
              aria-label={voiceOutput ? 'Mute voice output' : 'Enable voice output'}
            >
              {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {offline && (
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-[11px] text-amber-700 border-b border-amber-100">
              <AlertCircle size={13} className="shrink-0" />
              <span>Offline mode — configure an AI provider key for live answers.</span>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/80 to-white">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className={`relative max-w-[88%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-tr-sm shadow-sm shadow-purple-300/30'
                      : 'bg-white border border-slate-200/80 text-slate-700 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  {m.role === 'assistant' && speechSynthesisSupported && messages.length > 1 && (
                    <button
                      onClick={() => handleSpeakMessage(m.content, i)}
                      className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium transition-colors ${
                        speakingMsgIdx === i ? 'text-purple-600' : 'text-slate-400 hover:text-purple-500'
                      }`}
                      title={speakingMsgIdx === i ? 'Stop' : 'Read aloud'}
                    >
                      {speakingMsgIdx === i ? (
                        <><VolumeX className="w-3 h-3" /> Stop</>
                      ) : (
                        <><Volume2 className="w-3 h-3" /> Listen</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200/80 rounded-tl-sm shadow-sm">
                  <SpeakingDots />
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS[mode].map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-purple-200/60 bg-purple-50/80 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-all duration-150 active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (listening) stopListening();
              send(input);
            }}
            className="flex items-end gap-2 p-4 pt-3 border-t border-slate-200/60 bg-white"
          >
            {speechRecognitionSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  listening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-300/40 animate-pulse'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                } disabled:opacity-50`}
                title={listening ? 'Stop recording' : 'Voice input'}
                aria-label={listening ? 'Stop voice recording' : 'Start voice input'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? 'Listening...' : 'Ask anything...'}
                className={`w-full text-xs h-10 px-4 rounded-xl border transition-colors focus:outline-none focus:ring-2 ${
                  listening
                    ? 'border-red-300 bg-red-50/50 focus:ring-red-300/30'
                    : 'border-slate-200 bg-slate-50/50 focus:ring-purple-300/30 focus:border-purple-300'
                }`}
              />
              {listening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <SpeakingDots />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!input.trim() && !listening)}
              className="w-10 h-10 shrink-0 bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 disabled:opacity-50 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm shadow-purple-300/30"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
