'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Bot,
  CheckCircle,
  ChevronLeft,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Ticket,
  User,
  X,
  XCircle,
} from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CATEGORIES = ['general', 'billing', 'technical', 'orders', 'subscriptions', 'refunds', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const STATUS_FILTERS = ['all', 'open', 'pending', 'resolved', 'closed'];

async function readJsonSafely<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'open': return 'bg-teal-50 text-teal-700 border border-teal-200';
    case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'resolved': return 'bg-green-50 text-green-700 border border-green-200';
    case 'closed': return 'bg-gray-100 text-gray-500 border border-gray-200';
    default: return 'bg-gray-100 text-gray-500 border border-gray-200';
  }
}

function priorityBadge(priority: string) {
  switch (priority) {
    case 'urgent': return 'bg-red-50 text-red-600 border border-red-200';
    case 'high': return 'bg-orange-50 text-orange-600 border border-orange-200';
    case 'normal': return 'bg-blue-50 text-blue-600 border border-blue-200';
    default: return 'bg-gray-50 text-gray-500 border border-gray-200';
  }
}

function statusIcon(status: string) {
  if (status === 'resolved') return <CheckCircle size={13} />;
  if (status === 'closed') return <XCircle size={13} />;
  return <Clock size={13} />;
}

function timeAgo(dateStr: string): string {
  const timestamp = new Date(dateStr).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function UserSupportContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTicketId = searchParams.get('ticket');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [view, setView] = useState<'list' | 'new' | 'conversation'>('list');
  const [pageError, setPageError] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [closing, setClosing] = useState(false);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [firstMessage, setFirstMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [showAi, setShowAi] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const res = await fetch(`/api/support/tickets?status=${encodeURIComponent(statusFilter)}`, { cache: 'no-store' });
      const data = await readJsonSafely<{ tickets?: SupportTicket[]; error?: string }>(res);
      if (!res.ok || !data) throw new Error(data?.error || 'Could not load support tickets.');
      setTickets(data.tickets || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not load support tickets.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const openTicket = useCallback(async (ticket: SupportTicket) => {
    setMsgLoading(true);
    setPageError('');
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`, { cache: 'no-store' });
      const data = await readJsonSafely<{ ticket?: SupportTicket; messages?: TicketMessage[]; error?: string }>(res);
      if (!res.ok || !data?.ticket) throw new Error(data?.error || 'Could not open this ticket.');
      setActiveTicket(data.ticket);
      setMessages(data.messages || []);
      setView('conversation');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not open this ticket.');
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (!initialTicketId || tickets.length === 0) return;
    const ticket = tickets.find((item) => item.id === initialTicketId);
    if (ticket) void openTicket(ticket);
  }, [initialTicketId, openTicket, tickets]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  const handleCreateTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !firstMessage.trim() || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          message: firstMessage.trim(),
          order_id: orderId.trim() || null,
        }),
      });
      const data = await readJsonSafely<{ ticket?: SupportTicket; error?: string }>(res);
      if (!res.ok || !data?.ticket) throw new Error(data?.error || 'Could not create support ticket.');

      setSubject('');
      setCategory('general');
      setPriority('normal');
      setFirstMessage('');
      setOrderId('');
      await fetchTickets();
      await openTicket(data.ticket);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create support ticket.');
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeTicket || !replyText.trim() || replySending) return;
    setReplySending(true);
    setPageError('');
    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await readJsonSafely<{ message?: TicketMessage; error?: string }>(res);
      if (!res.ok || !data?.message) throw new Error(data?.error || 'Could not send reply.');
      setMessages((prev) => [...prev, data.message as TicketMessage]);
      setReplyText('');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not send reply.');
    } finally {
      setReplySending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket || closing) return;
    setClosing(true);
    setPageError('');
    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const data = await readJsonSafely<{ ticket?: SupportTicket; error?: string }>(res);
      if (!res.ok || !data?.ticket) throw new Error(data?.error || 'Could not close ticket.');
      setActiveTicket(data.ticket);
      setTickets((prev) => prev.map((ticket) => ticket.id === data.ticket?.id ? data.ticket as SupportTicket : ticket));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not close ticket.');
    } finally {
      setClosing(false);
    }
  };

  const handleAiSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!aiInput.trim() || aiLoading) return;
    const userMessage: AiMessage = { role: 'user', content: aiInput.trim() };
    const nextMessages = [...aiMessages, userMessage];
    setAiMessages(nextMessages);
    setAiInput('');
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/support-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await readJsonSafely<{ message?: string; error?: string }>(res);
      if (!res.ok || typeof data?.message !== 'string') throw new Error(data?.error || 'AI support is unavailable.');
      setAiMessages((prev) => [...prev, { role: 'assistant', content: data.message as string }]);
    } catch {
      setAiMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'I could not reach the AI assistant. You can retry or create a support ticket for the support team.',
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';

  return (
    <DashboardLayout activeRoute="support">
      <div className="min-h-screen bg-gray-50/50">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-700 text-gray-900">Support Center</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage support tickets and get help with your SUMMECA account.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAi((value) => !value)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-600 bg-teal-50 text-teal-700 border border-teal-200">
                <Sparkles size={15} /> AI Assistant
              </button>
              <button onClick={() => { setView('new'); setActiveTicket(null); setCreateError(''); }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700">
                <Plus size={15} /> New Ticket
              </button>
            </div>
          </div>
        </div>

        {pageError && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span className="flex-1">{pageError}</span>
            <button onClick={() => { setPageError(''); void fetchTickets(); }} className="font-600 underline">Retry</button>
          </div>
        )}

        <div className="flex min-h-[calc(100vh-170px)]">
          <aside className={`${view === 'conversation' ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-col bg-white border-r border-gray-100`}>
            <div className="flex gap-1 p-3 border-b border-gray-100 overflow-x-auto">
              {STATUS_FILTERS.map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-lg text-xs font-600 whitespace-nowrap ${statusFilter === status ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-14"><Loader2 size={20} className="animate-spin text-teal-600" /></div>
              ) : tickets.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <Ticket size={28} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-600 text-gray-700">No tickets found</p>
                  <p className="text-xs text-gray-400 mt-1">Create a ticket when you need help.</p>
                </div>
              ) : tickets.map((ticket) => (
                <button key={ticket.id} onClick={() => void openTicket(ticket)} className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 ${activeTicket?.id === ticket.id ? 'bg-teal-50/60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-600 text-gray-800 truncate">{ticket.subject}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusBadge(ticket.status)}`}>{statusIcon(ticket.status)} {ticket.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="capitalize">{ticket.category}</span>
                    <span className={`px-1.5 py-0.5 rounded ${priorityBadge(ticket.priority)}`}>{ticket.priority}</span>
                    <span className="ml-auto">{timeAgo(ticket.updated_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main className="flex-1 min-w-0 flex flex-col">
            {view === 'new' ? (
              <div className="p-4 sm:p-6 overflow-y-auto">
                <div className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-600"><ChevronLeft size={18} /></button>
                    <h2 className="text-lg font-700 text-gray-900">Create Support Ticket</h2>
                  </div>
                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                      <label className="block text-sm font-600 text-gray-700 mb-1.5">Subject</label>
                      <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-600 text-gray-700 mb-1.5">Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white capitalize">{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                      </div>
                      <div>
                        <label className="block text-sm font-600 text-gray-700 mb-1.5">Priority</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white capitalize">{PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-600 text-gray-700 mb-1.5">Order ID <span className="font-400 text-gray-400">(optional)</span></label>
                      <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Paste the exact order UUID" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-600 text-gray-700 mb-1.5">Message</label>
                      <textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} maxLength={5000} rows={6} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    {createError && <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700"><AlertCircle size={15} className="mt-0.5" />{createError}</div>}
                    <div className="flex gap-3">
                      <button type="submit" disabled={creating || !subject.trim() || !firstMessage.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-600 disabled:opacity-50">
                        {creating ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Submit Ticket
                      </button>
                      <button type="button" onClick={() => setView('list')} className="px-4 py-2.5 rounded-xl text-sm font-600 text-gray-500 hover:bg-gray-100">Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            ) : view === 'conversation' && activeTicket ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
                  <div className="flex gap-2 min-w-0">
                    <button onClick={() => setView('list')} className="lg:hidden text-gray-400"><ChevronLeft size={18} /></button>
                    <div className="min-w-0">
                      <h2 className="font-700 text-gray-900 truncate">{activeTicket.subject}</h2>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusBadge(activeTicket.status)}`}>{statusIcon(activeTicket.status)} {activeTicket.status}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${priorityBadge(activeTicket.priority)}`}>{activeTicket.priority}</span>
                      </div>
                    </div>
                  </div>
                  {activeTicket.status !== 'closed' && (
                    <button onClick={() => void handleCloseTicket()} disabled={closing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 text-gray-600 border border-gray-200 disabled:opacity-50">
                      {closing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Close Ticket
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {msgLoading ? (
                    <div className="flex justify-center py-14"><Loader2 size={20} className="animate-spin text-teal-600" /></div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 py-10">No messages are available for this ticket.</div>
                  ) : messages.map((message) => {
                    const isUser = message.sender_type === 'user';
                    return (
                      <div key={message.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{isUser ? <User size={14} /> : <MessageSquare size={14} />}</div>
                        <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
                          <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${isUser ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm'}`}>{message.message}</div>
                          <p className="text-xs text-gray-400 mt-1">{isUser ? displayName : 'Support Team'} · {timeAgo(message.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={msgEndRef} />
                </div>

                {activeTicket.status !== 'closed' ? (
                  <form onSubmit={handleReply} className="bg-white border-t border-gray-100 p-4 flex gap-3 items-end">
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={5000} rows={2} placeholder="Type your reply..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    <button type="submit" disabled={replySending || !replyText.trim()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-600 disabled:opacity-50">{replySending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send</button>
                  </form>
                ) : (
                  <div className="bg-gray-50 border-t border-gray-100 p-4 text-center text-sm text-gray-500">This ticket is closed. Create a new ticket for a new issue.</div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center px-8">
                <MessageSquare size={32} className="text-teal-500 mb-3" />
                <h3 className="font-700 text-gray-800">Select a ticket</h3>
                <p className="text-sm text-gray-400 mt-1">Choose a ticket to view its conversation.</p>
              </div>
            )}
          </main>

          {showAi && (
            <aside className="hidden xl:flex w-80 flex-col bg-white border-l border-gray-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2"><Bot size={16} className="text-teal-600" /><span className="text-sm font-700">AI Assistant</span></div>
                <button onClick={() => setShowAi(false)} className="text-gray-400"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiMessages.length === 0 && <p className="text-xs text-gray-500">Ask about orders, refunds, downloads, or account features. For account-specific changes, use a support ticket.</p>}
                {aiMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap ${message.role === 'user' ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-700 border border-gray-100'}`}>{message.content}</div>
                  </div>
                ))}
                {aiLoading && <Loader2 size={16} className="animate-spin text-teal-600" />}
                <div ref={aiEndRef} />
              </div>
              <form onSubmit={handleAiSend} className="p-3 border-t border-gray-100 flex gap-2">
                <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs" placeholder="Ask a question..." />
                <button type="submit" disabled={aiLoading || !aiInput.trim()} className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center disabled:opacity-50"><Send size={13} /></button>
              </form>
            </aside>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
