'use client';
import { useAuth } from '@/context/AuthContext';
import { complaintsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Clock, CheckCircle2, AlertCircle, ChevronRight, Search, Filter } from 'lucide-react';
import GovHeader from '@/components/GovHeader';
import { StatusBadge, UrgencyBadge, PageLoader, EmptyState } from '@/components/ui';
import { Complaint } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function OfficerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'officer')) router.push('/');
  }, [user, authLoading, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', 'officer', statusFilter, urgencyFilter, search],
    queryFn: () => complaintsApi.list({
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(urgencyFilter !== 'all' && { urgency: urgencyFilter }),
      ...(search && { search }),
    }),
    enabled: !!user,
  });

  if (authLoading || !user) return <PageLoader />;

  const complaints: Complaint[] = data?.data?.complaints || [];

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => ['submitted', 'assigned'].includes(c.status)).length,
    inProgress: complaints.filter(c => c.status === 'in-progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const urgencyColor = (u: string) =>
    u === 'high' ? 'border-l-red-500' : u === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-400';

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Officer Dashboard" subtitle="Complaint Management System" />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">My Assigned Complaints</h2>
          <p className="text-sm text-gray-500">Sorted oldest first (FIFO priority)</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: <FileText className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
            { label: 'Pending', value: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'In Progress', value: stats.inProgress, icon: <AlertCircle className="w-5 h-5" />, color: 'text-purple-600 bg-purple-50' },
            { label: 'Resolved', value: stats.resolved, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-600 bg-green-50' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}>{s.icon}</div>
              <div>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search complaints..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select className="input w-36" value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}>
              <option value="all">All Urgency</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Complaints list */}
        <div className="card">
          {isLoading ? (
            <div className="p-8 flex justify-center"><div className="animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 w-8 h-8" /></div>
          ) : complaints.length === 0 ? (
            <EmptyState title="No complaints found" desc="No complaints match your current filters" icon={<FileText className="w-12 h-12" />} />
          ) : (
            <div className="divide-y divide-gray-100">
              {complaints.map(c => (
                <Link key={c.id} href={`/officer/complaint/${c.id}`}
                  className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group border-l-4 ${urgencyColor(c.urgency)}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-blue-700 font-semibold">{c.id}</span>
                      <StatusBadge status={c.status} />
                      <UrgencyBadge urgency={c.urgency} />
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{c.category} — {c.ministry_name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{c.citizen_name}</span>
                      <span>·</span>
                      <span>{c.location}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 ml-4" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
