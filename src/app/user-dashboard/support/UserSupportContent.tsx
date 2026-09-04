'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import {
  Plus, MessageSquare, Clock, CheckCircle, XCircle, ChevronRight,
  Send, Bot, User, Loader2, AlertCircle, Ticket, X, Sparkles,
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

function statusBadge(status: string) {
  switch (status) {
    case 'open':     return 'bg-teal-50 text-teal-700 border border-teal-200';
    case 'pending':  return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'resolved': return 'bg-green-50 text-green-700 border border-green-200';
    case 'closed':   return 'bg-gray-100 text-gray-500 border border-gray-200';
    default:         return 'bg-gray-100 text-gray-500 border border-gray-200';
  }
}

function priorityBadge(priority: string) {
  switch (priority) {
    case 'urgent': return 'bg-red-50 text-red-600 border border-red-200';
    case 'high':   return 'bg-orange-50 text-orange-600 border border-orange-200';
    case 'normal': return 'bg-blue-50 text-blue-600 border border-blue-200';
    case 'low':    return 'bg-gray-50 text-gray-500 border border-gray-200';
    default:       return 'bg-gray-50 text-gray-500 border border-gray-200';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'open':     return <Clock size={13} className="text-teal-600" />;
    case 'pending':  return <Clock size={13} className="text-amber-600" />;
    case 'resolved': return <CheckCircle size={13} className="text-green-600" />;
    case 'closed':   return <XCircle size={13} className="text-gray-400" />;
    default:         return <Clock size={13} />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function UserSupportContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTicketId = searchParams.get('ticket');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [view, setView] = useState<'list' | 'new' | 'conversation'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [closing, setClosing] = useState(false);

  // New ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [firstMessage, setFirstMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // AI assistant
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (initialTicketId && tickets.length > 0) {
      const t = tickets.find(tk => tk.id === initialTicketId);
      if (t) openTicket(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTicketId, tickets.length]);

  useEffect(() => {
    if (aiEndRef.current) aiEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  useEffect(() => {
    if (msgEndRef.current) msgEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openTicket = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    setView('conversation');
    setMsgLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } finally {
      setMsgLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !firstMessage.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, priority, message: firstMessage, order_id: orderId || null }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'Failed to create ticket'); return; }
      setSubject(''); setCategory('general'); setPriority('normal'); setFirstMessage(''); setOrderId('');
      await fetchTickets();
      openTicket(data.ticket);
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setReplyText('');
      }
    } finally {
      setReplySending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
      }
    } finally {
      setClosing(false);
    }
  };

  const handleAiSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;
    const userMsg: AiMessage = { role: 'user', content: aiInput.trim() };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/support-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...aiMessages, userMsg] }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again or create a support ticket.' }]);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';

  return (
    <DashboardLayout activeRoute="support">
      <div className="min-h-screen bg-gray-50/50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-700 text-gray-900">Support Center</h1>
              <p className="text-sm text-gray-500 mt-0.5">Get help with your orders, subscriptions, and more</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAi(!showAi)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 transition-all duration-200 ${
                  showAi
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                }`}
              >
                <Sparkles size={15} />
                AI Assistant
              </button>
              <button
                onClick={() => { setView('new'); setActiveTicket(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700 transition-all duration-200 shadow-sm"
              >
                <Plus size={15} />
                New Ticket
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-140px)]">
          {/* Left panel: ticket list */}
          <div className={`flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${view === 'conversation' ? 'w-80 hidden lg:flex' : 'flex-1 lg:w-80 lg:flex-none'}`}>
            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-3 border-b border-gray-100 overflow-x-auto">
              {['all', 'open', 'pending', 'resolved', 'closed'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-600 whitespace-nowrap transition-all duration-150 ${
                    statusFilter === s
                      ? 'bg-teal-600 text-white' :'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Ticket list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={20} className="animate-spin text-teal-600" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-3">
                    <Ticket size={22} className="text-teal-600" />
                  </div>
                  <p className="text-sm font-600 text-gray-700">No tickets yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create a ticket to get help from our team</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {tickets.map(ticket => (
                    <li key={ticket.id}>
                      <button
                        onClick={() => openTicket(ticket)}
                        className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors duration-150 ${
                          activeTicket?.id === ticket.id ? 'bg-teal-50/60 border-l-2 border-teal-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-sm font-600 text-gray-800 truncate flex-1">{ticket.subject}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-600 flex-shrink-0 flex items-center gap-1 ${statusBadge(ticket.status)}`}>
                            {statusIcon(ticket.status)}
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 capitalize">{ticket.category}</span>
                          <span className="text-gray-200">·</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-600 ${priorityBadge(ticket.priority)}`}>{ticket.priority}</span>
                          <span className="text-gray-200 ml-auto">·</span>
                          <span className="text-xs text-gray-400">{timeAgo(ticket.updated_at)}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* New ticket form */}
            {view === 'new' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X size={18} />
                    </button>
                    <h2 className="text-lg font-700 text-gray-900">Create Support Ticket</h2>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <form onSubmit={handleCreateTicket} className="space-y-5">
                      <div>
                        <label className="block text-sm font-600 text-gray-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                          placeholder="Brief description of your issue"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-600 text-gray-700 mb-1.5">Category</label>
                          <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all bg-white capitalize"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-600 text-gray-700 mb-1.5">Priority</label>
                          <select
                            value={priority}
                            onChange={e => setPriority(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all bg-white capitalize"
                          >
                            {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-600 text-gray-700 mb-1.5">Order Reference <span className="text-gray-400 font-400">(optional)</span></label>
                        <input
                          type="text"
                          value={orderId}
                          onChange={e => setOrderId(e.target.value)}
                          placeholder="Order ID if related to a specific order"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-600 text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
                        <textarea
                          value={firstMessage}
                          onChange={e => setFirstMessage(e.target.value)}
                          placeholder="Describe your issue in detail..."
                          rows={5}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all resize-none"
                          required
                        />
                      </div>

                      {createError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600 border border-red-100">
                          <AlertCircle size={15} />
                          {createError}
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="submit"
                          disabled={creating || !subject.trim() || !firstMessage.trim()}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                        >
                          {creating ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                          Submit Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => setView('list')}
                          className="px-4 py-2.5 rounded-xl text-sm font-600 text-gray-500 hover:bg-gray-100 transition-all duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation view */}
            {view === 'conversation' && activeTicket && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Ticket header */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setView('list')}
                      className="lg:hidden mt-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronRight size={18} className="rotate-180" />
                    </button>
                    <div>
                      <h2 className="text-base font-700 text-gray-900">{activeTicket.subject}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-600 flex items-center gap-1 ${statusBadge(activeTicket.status)}`}>
                          {statusIcon(activeTicket.status)}
                          {activeTicket.status}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-600 ${priorityBadge(activeTicket.priority)}`}>{activeTicket.priority}</span>
                        <span className="text-xs text-gray-400 capitalize">{activeTicket.category}</span>
                      </div>
                    </div>
                  </div>
                  {activeTicket.status !== 'closed' && (
                    <button
                      onClick={handleCloseTicket}
                      disabled={closing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 text-gray-500 hover:bg-gray-100 border border-gray-200 transition-all duration-150 disabled:opacity-50"
                    >
                      {closing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Close Ticket
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {msgLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 size={20} className="animate-spin text-teal-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 py-8">No messages yet</div>
                  ) : (
                    messages.map(msg => {
                      const isUser = msg.sender_type === 'user';
                      return (
                        <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-teal-600' : 'bg-gray-100'}`}>
                            {isUser
                              ? <User size={14} className="text-white" />
                              : <MessageSquare size={14} className="text-gray-500" />
                            }
                          </div>
                          <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                              isUser
                                ? 'bg-teal-600 text-white rounded-tr-sm' :'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                            }`}>
                              {msg.message}
                            </div>
                            <span className="text-xs text-gray-400 px-1">
                              {isUser ? displayName : 'Support Team'} · {timeAgo(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={msgEndRef} />
                </div>

                {/* Reply box */}
                {activeTicket.status !== 'closed' ? (
                  <div className="bg-white border-t border-gray-100 p-4">
                    <form onSubmit={handleReply} className="flex items-end gap-3">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        rows={2}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all resize-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (replyText.trim()) handleReply(e as unknown as React.FormEvent);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={replySending || !replyText.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm flex-shrink-0"
                      >
                        {replySending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        Send
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-gray-50 border-t border-gray-100 p-4 text-center text-sm text-gray-400">
                    This ticket is closed. <button onClick={() => setView('new')} className="text-teal-600 font-600 hover:underline">Open a new ticket</button>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {view === 'list' && (
              <div className="flex-1 hidden lg:flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                  <MessageSquare size={28} className="text-teal-600" />
                </div>
                <h3 className="text-base font-700 text-gray-800 mb-1">Select a ticket</h3>
                <p className="text-sm text-gray-400 max-w-xs">Choose a ticket from the list to view the conversation, or create a new one.</p>
              </div>
            )}
          </div>

          {/* AI Assistant panel */}
          {showAi && (
            <div className="w-80 flex-shrink-0 flex flex-col bg-white border-l border-gray-100">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-700 text-gray-800">AI Assistant</p>
                    <p className="text-xs text-teal-600">Online</p>
                  </div>
                </div>
                <button onClick={() => setShowAi(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiMessages.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={18} className="text-teal-600" />
                    </div>
                    <p className="text-xs font-600 text-gray-700 mb-1">How can I help you?</p>
                    <p className="text-xs text-gray-400">Ask me about orders, subscriptions, products, or any issue you are facing.</p>
                    <div className="mt-4 space-y-2">
                      {['How do I request a refund?', 'Where are my downloads?', 'How to cancel subscription?'].map(q => (
                        <button
                          key={q}
                          onClick={() => setAiInput(q)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-teal-50 hover:text-teal-700 transition-colors border border-gray-100"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-teal-600' : 'bg-gray-100'}`}>
                      {msg.role === 'user'
                        ? <User size={11} className="text-white" />
                        : <Bot size={11} className="text-gray-500" />
                      }
                    </div>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user' ?'bg-teal-600 text-white rounded-tr-sm' :'bg-gray-50 text-gray-700 border border-gray-100 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Bot size={11} className="text-gray-500" />
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 rounded-tl-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              <div className="border-t border-gray-100 p-3">
                <form onSubmit={handleAiSend} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !aiInput.trim()}
                    className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 transition-all duration-200"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
