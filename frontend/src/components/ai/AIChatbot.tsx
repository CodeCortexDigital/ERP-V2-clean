import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, HelpCircle } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  source?: string;
}

const SUGGESTIONS = [
  "What is the school attendance policy?",
  "How can I check my outstanding fee balance?",
  "Where can I view the class timetable?",
  "When are the final exams scheduled?"
];

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am your School ERP AI Assistant. How can I help you today? Feel free to ask about attendance rules, fee balances, timetables, or exam schedules.",
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await api.post('/ai/chat/', { query: textToSend });
      const data = response.data || {};
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.response || "I couldn't process that query. Please try again.",
        source: data.source
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "Sorry, I am having trouble connecting to the AI service. Please make sure the backend is active."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-96 h-[500px] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-center justify-between text-white shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">ERP AI Assistant</h3>
                <span className="text-xs text-blue-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Box */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 bg-indigo-900/50 border border-indigo-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                <div className="max-w-[75%] flex flex-col">
                  <div className={`p-3 rounded-2xl text-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-800/80 text-slate-100 border border-slate-700/50 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.source && (
                    <span className="text-[10px] text-slate-500 mt-1 self-start px-1 font-mono">
                      Source: {msg.source}
                    </span>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 bg-blue-900/50 border border-blue-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 bg-indigo-900/50 border border-indigo-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-slate-800/50">
              <p className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5" /> Suggested Queries
              </p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s)}
                    className="text-left text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300 p-2 rounded-xl transition-all hover:border-slate-500 truncate"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask anything..."
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <Button
              onClick={() => handleSendMessage(inputText)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-2 h-10 w-10 flex items-center justify-center flex-shrink-0"
              disabled={!inputText.trim() || isTyping}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Toggle Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border border-white/10"
        title="AI Help Chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
