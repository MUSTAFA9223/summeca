'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2, Maximize2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function StoreAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m the SUMMECA assistant. I can help you find the right product, answer questions, and guide your purchase. What are you looking for?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, minimized]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/store-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'I\'m having trouble right now. Please try again or contact our support team.',
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please check your internet and try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div
          className={`fixed bottom-20 right-4 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-200 ${
            minimized ? 'h-14' : 'h-[480px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border rounded-t-2xl bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <Bot size={14} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-700 text-foreground">SUMMECA Assistant</p>
                <p className="text-xs text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(p => !p)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'assistant' ? 'bg-primary/10' : 'bg-secondary'
                    }`}>
                      {msg.role === 'assistant'
                        ? <Bot size={12} className="text-primary" />
                        : <User size={12} className="text-muted-foreground" />
                      }
                    </div>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'assistant' ?'bg-secondary/60 text-foreground rounded-tl-sm' :'bg-primary text-primary-foreground rounded-tr-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot size={12} className="text-primary" />
                    </div>
                    <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-3 py-2">
                      <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about our products..."
                    disabled={loading}
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 max-h-24"
                    style={{ minHeight: '38px' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 text-center">
                  Powered by SUMMECA AI
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => { setOpen(p => !p); setMinimized(false); }}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105"
        aria-label="Open AI assistant"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
