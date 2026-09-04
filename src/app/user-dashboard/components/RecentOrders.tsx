'use client';

import React, { useState } from 'react';
import { ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';

interface Order {
  id: string;
  orderId: string;
  product: string;
  productType: 'ai' | 'saas' | 'digital';
  plan: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  provider: string;
  date: string;
}

const orders: Order[] = [
  { id: 'order-001', orderId: 'SMC-2026-0891', product: 'AI Content Generator', productType: 'ai', plan: 'Pro Monthly', amount: '$39.00', status: 'paid', provider: 'Lemon Squeezy', date: 'Aug 14, 2026' },
  { id: 'order-002', orderId: 'SMC-2026-0847', product: 'Business Dashboard', productType: 'saas', plan: 'Pro Monthly', amount: '$49.00', status: 'paid', provider: 'Lemon Squeezy', date: 'Jul 28, 2026' },
  { id: 'order-003', orderId: 'SMC-2026-0812', product: 'Teacher Planner 2026', productType: 'digital', plan: 'One-time', amount: '$12.00', status: 'paid', provider: 'Lemon Squeezy', date: 'Jul 15, 2026' },
  { id: 'order-004', orderId: 'SMC-2026-0798', product: 'AI Content Generator', productType: 'ai', plan: 'Pro Monthly', amount: '$39.00', status: 'paid', provider: 'Lemon Squeezy', date: 'Jul 14, 2026' },
  { id: 'order-005', orderId: 'SMC-2026-0763', product: 'Business Dashboard', productType: 'saas', plan: 'Pro Monthly', amount: '$49.00', status: 'paid', provider: 'Lemon Squeezy', date: 'Jun 28, 2026' },
  { id: 'order-006', orderId: 'SMC-2026-0741', product: 'AI PDF Analyzer', productType: 'ai', plan: 'Pro Monthly', amount: '$19.00', status: 'refunded', provider: 'Lemon Squeezy', date: 'Jun 20, 2026' },
  { id: 'order-007', orderId: 'SMC-2026-0712', product: 'AI Content Generator', productType: 'ai', plan: 'Pro Monthly', amount: '$39.00', status: 'paid', provider: 'Lemon Squeezy', date: 'Jun 14, 2026' },
  { id: 'order-008', orderId: 'SMC-2026-0689', product: 'Business Template Pack', productType: 'digital', plan: 'One-time', amount: '$24.00', status: 'paid', provider: 'Lemon Squeezy', date: 'Jun 3, 2026' },
];

const statusStyles: Record<Order['status'], string> = {
  paid: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  failed: 'bg-danger/10 text-danger',
  refunded: 'bg-secondary text-muted-foreground',
};

const typeStyles: Record<Order['productType'], string> = {
  ai: 'bg-primary/10 text-primary',
  saas: 'bg-success/10 text-success',
  digital: 'bg-warning/10 text-warning',
};

type SortField = 'date' | 'amount' | 'product';
type SortDir = 'asc' | 'desc';

export default function RecentOrders() {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-muted-foreground opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />;
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-sm font-700 text-foreground">Recent Orders</h3>
        <span className="text-xs text-primary font-600 cursor-pointer hover:text-primary/80 transition-colors">
          View all →
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-5 py-2.5 text-xs font-600 text-muted-foreground whitespace-nowrap">Order ID</th>
              <th
                className="text-left px-3 py-2.5 text-xs font-600 text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort('product')}
              >
                <span className="flex items-center gap-1">Product <SortIcon field="product" /></span>
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-600 text-muted-foreground whitespace-nowrap">Plan</th>
              <th
                className="text-left px-3 py-2.5 text-xs font-600 text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort('amount')}
              >
                <span className="flex items-center gap-1">Amount <SortIcon field="amount" /></span>
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-600 text-muted-foreground whitespace-nowrap">Status</th>
              <th
                className="text-left px-3 py-2.5 text-xs font-600 text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort('date')}
              >
                <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
              </th>
              <th className="px-3 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => (
              <tr
                key={order.id}
                className={`border-b border-border last:border-0 hover:bg-secondary/40 transition-colors duration-100 ${
                  i % 2 === 0 ? '' : 'bg-secondary/20'
                }`}
              >
                <td className="px-5 py-3 whitespace-nowrap">
                  <span className="text-xs font-mono font-600 text-muted-foreground">{order.orderId}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-600 px-1.5 py-0.5 rounded-full ${typeStyles[order.productType]}`}>
                      {order.productType.toUpperCase()}
                    </span>
                    <span className="text-xs font-600 text-foreground whitespace-nowrap">{order.product}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs text-secondary-foreground whitespace-nowrap">{order.plan}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs font-700 tabular-nums text-foreground">{order.amount}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs font-600 px-2 py-0.5 rounded-full capitalize ${statusStyles[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{order.date}</span>
                </td>
                <td className="px-3 py-3">
                  <button
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-150"
                    aria-label="View invoice"
                  >
                    <ExternalLink size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}