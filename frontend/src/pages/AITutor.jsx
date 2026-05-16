import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, Paperclip, Brain, User, Sparkles,
  BookOpen, HelpCircle, FileText, Trash2, RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Button from '../components/Button';
import { tutorService } from '../services/index';
import toast from 'react-hot-toast';

const INITIAL_MESSAGES = [
  {
    id: 1, sender: 'ai',
    text: "Hello! I'm your **AI Memory Twin** 🧠 — your personal academic assistant.\n\nI can help you with:\n- Doubt clarification and concept explanations\n- Quiz generation for exam prep\n- Note summarization\n- Coding explanations\n\nWhat would you like to explore today?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

const SUGGESTED_PROMPTS = [
  { icon: HelpCircle, text: 'Explain neural networks simply' },
  { icon: FileText, text: 'Summarize OS scheduling algorithms' },
  { icon: BookOpen, text: 'Generate 5 quiz questions on SQL' },
  { icon: Sparkles, text: 'Help me with my study plan' },
];

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
      <Brain className="w-4 h-4" />
    </div>
    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-lg">
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.div key={i} className="w-2 h-2 bg-purple-400 rounded-full"
          animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay }} />
      ))}
    </div>
  </motion.div>
);

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  const isUser = msg.sender === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow ${
        isUser ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
      </div>
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`p-4 rounded-2xl shadow-lg ${
          isUser
            ? 'bg-blue-600/20 border border-blue-500/30 text-blue-50 rounded-tr-sm'
            : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
        }`}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{msg.text}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:leading-relaxed prose-p:my-1
              prose-headings:text-slate-200 prose-headings:font-bold
              prose-strong:text-slate-100 prose-strong:font-semibold
              prose-li:text-slate-300 prose-li:my-0.5
              prose-code:bg-black/40 prose-code:text-purple-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
          )}
        </div>
        <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
      </div>
    </motion.div>
  );
};

const AITutor = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const sendMessage = async (text) => {
    if (!text?.trim() || isTyping) return;
    const userMsg = {
      id: Date.now(), sender: 'user', text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    inputRef.current?.focus();

    try {
      const res = await tutorService.chat(text, sessionId);
      const aiMsg = {
        id: Date.now() + 1, sender: 'ai',
        text: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const timedOut = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      const fallbackMsg = {
        id: Date.now() + 1, sender: 'ai',
        text: timedOut
          ? "The AI tutor is still generating your answer (Llama 3 can take up to a few minutes on CPU). Please wait a moment and try again — the engine may still be warming up."
          : "I couldn't reach the backend API. Confirm Docker is running and the backend is healthy at `/health/ai`, then try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
      toast.error(timedOut ? 'AI response timed out — try a shorter question.' : 'Could not reach the tutor API.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    toast.success('Conversation cleared');
  };

  const showSuggestions = messages.length <= 1 && !isTyping;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">

        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 via-transparent to-blue-900/5 pointer-events-none" />

        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-black/20 backdrop-blur-md z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-200">Memory Twin AI</h2>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                {isTyping ? 'Thinking...' : 'Online'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={clearChat}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Clear conversation">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar z-10">
          <AnimatePresence initial={false}>
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            {isTyping && <TypingIndicator key="typing" />}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-6 pb-3 flex gap-2 overflow-x-auto custom-scrollbar z-10 flex-wrap">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => sendMessage(prompt.text)}
                  className="whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-sm text-slate-300 transition-all"
                >
                  <prompt.icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  {prompt.text}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md z-10">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <button type="button" className="p-2 text-slate-400 hover:text-purple-400 transition-colors hidden sm:block">
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
              placeholder="Ask your AI tutor anything..."
              disabled={isTyping}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 transition-all text-sm"
            />
            <button type="button" className="p-2 text-slate-400 hover:text-purple-400 transition-colors hidden sm:block">
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-600 mt-2 text-center">Powered by Llama 3 via Ollama</p>
        </div>
      </div>
    </div>
  );
};

export default AITutor;
