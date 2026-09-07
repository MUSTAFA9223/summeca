'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Minimize2,
  Maximize2,
  Sparkles,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ServiceStatus = 'ready' | 'error';

const QUICK_PROMPTS = [
  'ساعدني أختار المنتج المناسب',
  'قارن لي الخطط والأسعار',
  'ما هو أرخص خيار مناسب لي؟',
];

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\/products\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+)/g);

  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('/products/') ? (
          <a
            key={`${part}-${index}`}
            href={part}
            className="font-700 text-primary underline underline-offset-2 hover:opacity-80"
          >
            عرض المنتج
          </a>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

export default function StoreAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('ready');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'مرحبًا! أنا موظف مبيعات SUMMECA الذكي. أخبرني ماذا تريد أن تنجز وسأساعدك في اختيار المنتج والخطة الأنسب من منتجاتنا الفعلية.',
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

  const sendMessage = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const res = await fetch('/api/ai/store-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const rawBody = await res.text();
      let data: { reply?: string; error?: string } = {};
      if (rawBody) {
        try {
          data = JSON.parse(rawBody) as { reply?: string; error?: string };
        } catch {
          // A proxy/runtime error can occasionally return HTML or plain text.
          // Treat it as a server failure rather than mislabeling it as a
          // customer network problem.
        }
      }

      if (!res.ok || data.error || !data.reply) {
        setServiceStatus('error');
        const message =
          res.status === 429
            ? 'تم الوصول إلى الحد المؤقت للمحادثات. انتظر قليلًا ثم حاول مرة أخرى.'
            : 'موظف المبيعات غير متاح مؤقتًا من جهة الخادم. حاول مرة أخرى بعد قليل.';
        setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
      } else {
        setServiceStatus('ready');
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply! }]);
      }
    } catch {
      setServiceStatus('error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'تعذر الوصول إلى SUMMECA من جهازك الآن. تحقق من الاتصال ثم حاول مرة أخرى.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      {open && (
        <div
          className={`fixed bottom-20 right-3 z-50 flex w-[calc(100vw-24px)] max-w-96 flex-col rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200 sm:right-4 ${
            minimized ? 'h-14' : 'h-[min(520px,72vh)]'
          }`}
          dir="auto"
        >
          <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <Bot size={15} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-700 text-foreground">SUMMECA Sales AI</p>
                <p
                  className={`flex items-center gap-1 text-xs ${
                    serviceStatus === 'ready' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      serviceStatus === 'ready' ? 'bg-success' : 'bg-destructive'
                    }`}
                  />
                  {serviceStatus === 'ready'
                    ? 'موظف مبيعات ذكي · جاهز للمساعدة'
                    : 'الخدمة غير متاحة مؤقتًا'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((previous) => !previous)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                aria-label={minimized ? 'تكبير المحادثة' : 'تصغير المحادثة'}
              >
                {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                aria-label="إغلاق المحادثة"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                        message.role === 'assistant' ? 'bg-primary/10' : 'bg-secondary'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <Bot size={12} className="text-primary" />
                      ) : (
                        <User size={12} className="text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        message.role === 'assistant'
                          ? 'rounded-tl-sm bg-secondary/60 text-foreground'
                          : 'rounded-tr-sm bg-primary text-primary-foreground'
                      }`}
                    >
                      <MessageContent content={message.content} />
                    </div>
                  </div>
                ))}

                {messages.length === 1 && !loading && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => void sendMessage(prompt)}
                        className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-600 text-primary transition-colors hover:bg-primary/10"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot size={12} className="text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-secondary/60 px-3 py-2">
                      <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ما الذي تبحث عنه؟"
                    disabled={loading}
                    maxLength={1000}
                    className="max-h-24 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                    style={{ minHeight: '38px' }}
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={loading || !input.trim()}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    aria-label="إرسال"
                  >
                    <Send size={14} />
                  </button>
                </div>
                <p className="mt-1.5 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                  <Sparkles size={11} /> Cloudflare Workers AI · يعتمد على منتجات SUMMECA الفعلية
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => {
          setOpen((previous) => !previous);
          setMinimized(false);
        }}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:bg-primary/90"
        aria-label="فتح موظف مبيعات SUMMECA"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
