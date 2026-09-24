import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Sparkles, Bot, AlertCircle, Mic, MicOff, Volume2, VolumeX,
  History, Plus, Square, Copy, Check, ThumbsUp, ThumbsDown, Trash2, Search,
} from 'lucide-react';
import {
  AiConversation, AiRequestError, ChatMessage, deleteConversation, getConversation,
  listConversations, sendAiMessage, sendFeedback, streamAiMessage,
} from '@/services/ai.service';
import MarkdownText from '@/components/MarkdownText';

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
    'Student profile',
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

type VoiceLang = 'en-US' | 'ur-PK';

function stopSpeaking() {
  if (speechSynthesisSupported) window.speechSynthesis.cancel();
}

function speakText(text: string, lang: VoiceLang, onEnd?: () => void) {
  if (!speechSynthesisSupported) return;
  stopSpeaking();
  const clean = text.replace(/[#*_`~\[\]()|]/g, '').slice(0, 2000);
  if (!clean.trim()) return;
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1;
  utterance.lang = lang;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function AiAssistant({ mode = 'admin' }: { mode?: ChatMode }) {
  const welcome: ChatMessage = { role: 'assistant', content: WELCOME[mode] };
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [offline, setOffline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('en-US');
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, activity]);

  // Other components can open the assistant: window.dispatchEvent(new Event('open-ai-assistant')).
  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener('open-ai-assistant', openPanel);
    return () => window.removeEventListener('open-ai-assistant', openPanel);
  }, []);

  useEffect(() => {
    if (!open) {
      stopSpeaking();
      setSpeakingMsgIdx(null);
    }
  }, [open]);

  // Update the last (in-progress) assistant message.
  const patchLast = (patch: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => [...prev.slice(0, -1), patch(prev[prev.length - 1])]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: q }, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    setActivity(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let finalReply = '';
    let gotEvent = false;
    try {
      await streamAiMessage(q, conversationId, (ev) => {
        gotEvent = true;
        if (ev.type === 'token') {
          patchLast((m) => ({ ...m, content: m.content + ev.text }));
        } else if (ev.type === 'tool_start') {
          // Text before a tool call is the model thinking aloud; the answer follows.
          setActivity(ev.label);
          patchLast((m) => ({ ...m, content: '' }));
        } else if (ev.type === 'tool_end') {
          setActivity(null);
        } else if (ev.type === 'done') {
          finalReply = ev.reply;
          setOffline(ev.offline);
          setConversationId(ev.conversation_id);
          patchLast((m) => ({ ...m, id: ev.message_id, content: ev.reply, offline: ev.offline }));
        } else if (ev.type === 'error') {
          patchLast((m) => ({ ...m, content: ev.message }));
        }
      }, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) {
        patchLast((m) => ({ ...m, content: (m.content ? `${m.content}\n\n` : '') + '_(stopped)_' }));
      } else if (err instanceof AiRequestError && err.explained) {
        patchLast((m) => ({ ...m, content: err.message }));
      } else if (!gotEvent) {
        // Streaming unavailable (e.g. a proxy blocks it) — fall back to a plain request.
        try {
          const res = await sendAiMessage(q, conversationId);
          finalReply = res.reply;
          setOffline(res.offline);
          setConversationId(res.conversation_id);
          patchLast((m) => ({ ...m, id: res.message_id, content: res.reply, offline: res.offline }));
        } catch {
          patchLast((m) => ({ ...m, content: 'Sorry, I could not reach the assistant service. Please try again.' }));
        }
      } else {
        patchLast((m) => ({ ...m, content: m.content || 'The connection was interrupted. Please try again.' }));
      }
    } finally {
      setLoading(false);
      setActivity(null);
      abortRef.current = null;
    }
    if (finalReply && voiceOutput && speechSynthesisSupported) {
      setTimeout(() => speakText(finalReply, voiceLang), 100);
    }
  };

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    stop();
    setConversationId(undefined);
    setMessages([welcome]);
    setOffline(false);
    setShowHistory(false);
  };

  const toggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (!next) return;
    try {
      setConversations(await listConversations());
    } catch {
      setConversations([]);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const conv = await getConversation(id);
      setConversationId(conv.id);
      setMessages([welcome, ...(conv.messages || [])]);
      setShowHistory(false);
    } catch { /* keep the current chat */ }
  };

  const removeConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === conversationId) newChat();
    } catch { /* ignore */ }
  };

  const rate = async (idx: number, rating: 1 | -1) => {
    const msg = messages[idx];
    if (!msg.id) return;
    const next = msg.feedback === rating ? null : rating;
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, feedback: next } : m)));
    try { await sendFeedback(msg.id, next); } catch { /* non-critical */ }
  };

  const copy = async (idx: number) => {
    try {
      await navigator.clipboard.writeText(messages[idx].content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch { /* clipboard blocked */ }
  };

  const startListening = useCallback(() => {
    if (!speechRecognitionSupported || listening) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
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
  }, [listening, send, voiceLang]);

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
      speakText(content, voiceLang, () => setSpeakingMsgIdx(null));
    }
  };

  const lastIdx = messages.length - 1;
  const pendingEmpty = loading && !messages[lastIdx]?.content;

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
          <div className="flex items-center gap-2 px-4 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight tracking-tight">CodeCortex</p>
              <p className="text-[10px] opacity-75 font-medium tracking-wide uppercase">AI Assistant · {mode}</p>
            </div>
            <button
              onClick={toggleHistory}
              className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-white/30' : 'hover:bg-white/20'}`}
              title="Chat history"
              aria-label="Chat history"
            >
              <History className="w-4 h-4" />
            </button>
            <button onClick={newChat} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="New chat" aria-label="New chat">
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVoiceLang((l) => (l === 'en-US' ? 'ur-PK' : 'en-US'))}
              className="px-1.5 py-1 rounded-lg hover:bg-white/20 transition-colors text-[10px] font-bold"
              title="Voice language (English / Urdu)"
              aria-label="Switch voice language"
            >
              {voiceLang === 'en-US' ? 'EN' : 'اردو'}
            </button>
            <button
              onClick={() => setVoiceOutput((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${voiceOutput ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
              title={voiceOutput ? 'Mute voice' : 'Enable voice'}
              aria-label={voiceOutput ? 'Mute voice output' : 'Enable voice output'}
            >
              {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          {offline && (
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 text-[10px] text-slate-500 border-b border-slate-100">
              <AlertCircle size={12} className="shrink-0" />
              <span>Quick-answer mode — try the suggested questions for best results.</span>
            </div>
          )}

          {showHistory && (
            <div className="border-b border-slate-200 bg-white max-h-56 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="px-4 py-3 text-[11px] text-slate-400">No previous chats.</p>
              ) : conversations.map((c) => (
                <div key={c.id} className={`group flex items-center gap-2 px-4 py-2 text-[11px] hover:bg-purple-50 ${c.id === conversationId ? 'bg-purple-50' : ''}`}>
                  <button className="flex-1 min-w-0 text-left" onClick={() => loadConversation(c.id)}>
                    <p className="truncate text-slate-700 font-medium">{c.title || 'Untitled chat'}</p>
                    <p className="text-[10px] text-slate-400">{new Date(c.updated_at).toLocaleString()}</p>
                  </button>
                  <button
                    onClick={() => removeConversation(c.id)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-500"
                    title="Delete chat"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/80 to-white">
            {messages.map((m, i) => {
              if (i === lastIdx && pendingEmpty && m.role === 'assistant') return null;
              const streaming = loading && i === lastIdx;
              return (
                <div
                  key={m.id || i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                >
                  <div
                    className={`relative max-w-[88%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-tr-sm shadow-sm shadow-purple-300/30'
                        : 'bg-white border border-slate-200/80 text-slate-700 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {m.role === 'assistant'
                      ? <MarkdownText text={m.content} />
                      : <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                    {m.role === 'assistant' && i > 0 && m.content && !streaming && (
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <button onClick={() => copy(i)} className="text-slate-400 hover:text-purple-500" title="Copy" aria-label="Copy answer">
                          {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                        {m.id && (
                          <>
                            <button
                              onClick={() => rate(i, 1)}
                              className={m.feedback === 1 ? 'text-green-600' : 'text-slate-400 hover:text-green-600'}
                              title="Helpful"
                              aria-label="Helpful"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => rate(i, -1)}
                              className={m.feedback === -1 ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}
                              title="Not helpful"
                              aria-label="Not helpful"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {speechSynthesisSupported && (
                          <button
                            onClick={() => handleSpeakMessage(m.content, i)}
                            className={`inline-flex items-center gap-1 text-[10px] font-medium transition-colors ${
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
                    )}
                  </div>
                </div>
              );
            })}

            {pendingEmpty && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200/80 rounded-tl-sm shadow-sm">
                  {activity ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-purple-700">
                      <Search className="w-3 h-3" /> {activity}…
                    </span>
                  ) : <SpeakingDots />}
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
                dir="auto"
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

            {loading ? (
              <button
                type="button"
                onClick={stop}
                className="w-10 h-10 shrink-0 bg-slate-700 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                title="Stop"
                aria-label="Stop generating"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && !listening}
                className="w-10 h-10 shrink-0 bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 disabled:opacity-50 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm shadow-purple-300/30"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
