import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SendHorizontal, Sparkles, AlertCircle, Headphones, ArrowDown, RefreshCw } from 'lucide-react';
import { Message } from './types';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatBottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isTyping]);

  // Monitor scroll height to show/hide "scroll to bottom" button
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Show button if user scrolled up more than 300px from the bottom
    const isCloseToBottom = scrollHeight - scrollTop - clientHeight < 300;
    setShowScrollButton(!isCloseToBottom && messages.length > 0);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = inputText.trim();
    if (!trimmedText || isTyping) return;

    setError(null);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: trimmedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Add user message to UI
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Send message to our Express backend route /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedText,
          // Exclude ID and timestamp from history array, only send sender and text
          history: messages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server returned an error');
      }

      const data = await response.json();
      
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'agent',
        text: data.reply || 'Sorry, I could not generate a response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect with Customer Support. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div id="app_root" className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased select-none">
      {/* HEADER */}
      <header id="app_header" className="flex items-center justify-between px-6 md:px-10 py-5 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        {/* Brand/Logo Left */}
        <div id="header_brand" className="flex items-center gap-3">
          <img 
            src="https://marketing.dubaisouth.ae/wp-content/uploads/2023/10/logo.png" 
            alt="Dubai South Logo" 
            className="h-10 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="font-bold text-xl tracking-tight text-slate-800">Dubai South</span>
        </div>

        {/* Customer Support Right */}
        <div id="header_support" className="flex items-center gap-4">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-slate-400 hover:text-indigo-600 font-semibold transition-colors duration-150 flex items-center gap-1 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100"
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
              Reset
            </button>
          )}
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs md:text-sm font-semibold text-slate-500 uppercase tracking-widest">Customer Support</span>
          </div>
        </div>
      </header>

      {/* MAIN CHAT CANVAS */}
      <main 
        id="chat_canvas"
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col relative"
      >
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-end">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              // Empty State - strictly empty with no example content
              <motion.div
                key="empty_state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 select-none"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50 shadow-inner">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                  </div>
                  <p className="text-slate-400 font-medium tracking-wide">Start a new conversation below</p>
                </div>
              </motion.div>
            ) : (
              // Active Message Stack
              <div id="messages_stack" className="space-y-6 pb-6 flex flex-col justify-end min-h-full">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                    >
                      {/* Name / Role above message */}
                      <span className="text-[10px] font-bold text-slate-400 mb-1 px-2 uppercase tracking-widest">
                        {isUser ? 'You' : 'Customer Support Agent'}
                      </span>

                      <div
                        className={`text-sm md:text-base px-5 py-3.5 shadow-sm leading-relaxed max-w-[85%] sm:max-w-[75%] font-sans select-text break-words ${
                          isUser
                            ? 'bg-slate-900 text-slate-50 rounded-2xl rounded-tr-none border border-slate-950 font-medium'
                            : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-200/90 shadow-slate-100/60'
                        }`}
                      >
                        {isUser ? (
                          msg.text
                        ) : (
                          <div className="whitespace-pre-wrap break-words">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-3 last:mb-0">{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-5 my-2">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal pl-5 my-2">{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li className="mb-1">{children}</li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-bold">{children}</strong>
                                ),
                                em: ({ children }) => (
                                  <em className="italic">{children}</em>
                                ),
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline hover:text-blue-800"
                                  >
                                    {children}
                                  </a>
                                ),
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Timestamp below message */}
                      <span className="text-[9px] font-mono text-slate-400 mt-1.5 px-2 tracking-wide">
                        {msg.timestamp}
                      </span>
                    </motion.div>
                  );
                })}

                {/* Animated Typing Indicator */}
                {isTyping && (
                  <motion.div
                    key="typing_indicator"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-start"
                  >
                    <span className="text-[10px] font-bold text-slate-400 mb-1 px-2 uppercase tracking-widest">
                      Customer Support Agent
                    </span>
                    <div className="bg-white border border-slate-200 px-4.5 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}

                {/* Error Banner */}
                {error && (
                  <motion.div
                    key="error_banner"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3.5 text-rose-800 text-xs md:text-sm shadow-sm max-w-xl mx-auto w-full my-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Connection Issue</p>
                      <p className="mt-0.5 text-rose-600/95 leading-relaxed">{error}</p>
                    </div>
                    <button 
                      onClick={() => setError(null)}
                      className="text-rose-400 hover:text-rose-600 font-bold px-1 rounded transition-colors"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
          <div ref={chatBottomRef} />
        </div>

        {/* Scroll To Bottom Button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              key="scroll_down"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              onClick={() => scrollToBottom('smooth')}
              className="fixed bottom-32 right-6 p-2.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-slate-300 shadow-md cursor-pointer transition-all duration-150 z-20 hover:scale-105 active:scale-95"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
 
      {/* BOTTOM INPUT AREA */}
      <footer id="app_footer" className="w-full max-w-4xl mx-auto pb-8 md:pb-12 px-4 md:px-6 sticky bottom-0 z-10 bg-transparent">
        <form onSubmit={handleSend} className="relative group">
          {/* Subtle gradient glowing background outline */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-[22px] blur opacity-10 group-focus-within:opacity-20 transition duration-1000"></div>
          
          <div className="relative bg-white border border-slate-200 rounded-2xl flex items-center px-5 py-4 shadow-xl">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type here..."
              disabled={isTyping}
              className="flex-1 bg-transparent border-none text-slate-800 text-base md:text-lg placeholder-slate-400 focus:outline-none focus:ring-0"
            />
            
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="ml-4 p-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-150 disabled:text-slate-400 disabled:shadow-none rounded-xl text-white shadow-lg shadow-teal-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5 transform rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </div>
        </form>
 
        <div className="flex justify-center mt-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold select-none text-center">
            Agentic AI Systems &bull; Session Secure &bull; End-to-End Encryption
          </p>
        </div>
      </footer>
    </div>
  );
}
