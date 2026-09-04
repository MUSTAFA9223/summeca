'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AdminShell from '@/app/admin/components/AdminShell';
import { Ticket, Search, MessageSquare, Send, Loader2, ChevronDown, RefreshCw, User, Shield,  } from 'lucide-react';

interface SupportTicket {
  id: string;
  user_id: string;
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

interface Stats {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
}

const STATUS_OPTIONS = ['all', 'open', 'pending', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['all', 'low', 'normal', 'high', 'urgent'];

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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [priorityUpdating, setPriorityUpdating] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/support/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setStats(data.stats || null);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchTickets, 300);
    return () => clearTimeout(t);
  }, [fetchTickets]);

  const openTicket = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
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
        // Refresh ticket list to update updated_at
        fetchTickets();
      }
    } finally {
      setReplySending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeTicket) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!activeTicket) return;
    setPriorityUpdating(true);
    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
      }
    } finally {
      setPriorityUpdating(false);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-700 text-gray-900">Support Center</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage customer support tickets</p>
            </div>
            <button
              onClick={fetchTickets}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-600 text-gray-500 hover:bg-gray-100 border border-gray-200 transition-all duration-150"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-5 gap-3 mt-4">
              {[
                { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
                { label: 'Open', value: stats.open, color: 'text-teal-700', bg: 'bg-teal-50' },
                { label: 'Pending', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'Resolved', value: stats.resolved, color: 'text-green-700', bg: 'bg-green-50' },
                { label: 'Closed', value: stats.closed, color: 'text-gray-500', bg: 'bg-gray-100' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 text-center`}>
                  <div className={`text-xl font-800 ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 font-600 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Ticket list */}
          <div className="w-96 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white overflow-hidden">
            {/* Search + filters */}
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tickets..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs font-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white capitalize"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s === 'all' ? 'All Status' : s}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative flex-1">
                  <select
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                    className="w-full appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs font-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white capitalize"
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p} className="capitalize">{p === 'all' ? 'All Priority' : p}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={20} className="animate-spin text-teal-600" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                  <Ticket size={24} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No tickets found</p>
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
                          <span className={`text-xs px-2 py-0.5 rounded-full font-600 flex-shrink-0 ${statusBadge(ticket.status)}`}>
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
                        <div className="mt-1">
                          <span className="text-xs text-gray-400 font-mono">{ticket.user_id.slice(0, 8)}…</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Conversation panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTicket ? (
              <>
                {/* Ticket detail header */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-700 text-gray-900">{activeTicket.subject}</h2>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-400 capitalize">{activeTicket.category}</span>
                        {activeTicket.order_id && (
                          <span className="text-xs text-gray-400">Order: <span className="font-mono">{activeTicket.order_id.slice(0, 8)}…</span></span>
                        )}
                        <span className="text-xs text-gray-400">User: <span className="font-mono">{activeTicket.user_id.slice(0, 8)}…</span></span>
                        <span className="text-xs text-gray-400">{timeAgo(activeTicket.created_at)}</span>
                      </div>
                    </div>

                    {/* Admin actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status selector */}
                      <div className="relative">
                        <select
                          value={activeTicket.status}
                          onChange={e => handleStatusChange(e.target.value)}
                          disabled={statusUpdating}
                          className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-xs font-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white capitalize cursor-pointer ${statusBadge(activeTicket.status)}`}
                        >
                          {STATUS_OPTIONS.filter(s => s !== 'all').map(s => (
                            <option key={s} value={s} className="capitalize text-gray-700 bg-white">{s}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Priority selector */}
                      <div className="relative">
                        <select
                          value={activeTicket.priority}
                          onChange={e => handlePriorityChange(e.target.value)}
                          disabled={priorityUpdating}
                          className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-xs font-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white capitalize cursor-pointer ${priorityBadge(activeTicket.priority)}`}
                        >
                          {PRIORITY_OPTIONS.filter(p => p !== 'all').map(p => (
                            <option key={p} value={p} className="capitalize text-gray-700 bg-white">{p}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                  {msgLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 size={20} className="animate-spin text-teal-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 py-8">No messages yet</div>
                  ) : (
                    messages.map(msg => {
                      const isAdmin = msg.sender_type === 'admin';
                      return (
                        <div key={msg.id} className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-teal-600' : 'bg-gray-200'}`}>
                            {isAdmin
                              ? <Shield size={14} className="text-white" />
                              : <User size={14} className="text-gray-500" />
                            }
                          </div>
                          <div className={`max-w-[70%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                              isAdmin
                                ? 'bg-teal-600 text-white rounded-tr-sm' :'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                            }`}>
                              {msg.message}
                            </div>
                            <span className="text-xs text-gray-400 px-1">
                              {isAdmin ? 'Support Team' : 'Customer'} · {timeAgo(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply */}
                {activeTicket.status !== 'closed' ? (
                  <div className="bg-white border-t border-gray-100 p-4 flex-shrink-0">
                    <form onSubmit={handleReply} className="flex items-end gap-3">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type your reply as support agent..."
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
                        Reply
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-gray-50 border-t border-gray-100 p-4 text-center text-sm text-gray-400 flex-shrink-0">
                    This ticket is closed. Change status to reopen.
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                  <MessageSquare size={28} className="text-teal-600" />
                </div>
                <h3 className="text-base font-700 text-gray-800 mb-1">Select a ticket</h3>
                <p className="text-sm text-gray-400 max-w-xs">Choose a ticket from the list to view the conversation and reply.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
