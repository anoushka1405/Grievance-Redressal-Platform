'use client';
import { useAuth } from '@/context/AuthContext';
import { complaintsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import GovHeader from '@/components/GovHeader';
import { StatusBadge, UrgencyBadge, PageLoader, EmptyState } from '@/components/ui';
import { Complaint } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function CitizenDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'citizen')) router.push('/');
  }, [user, authLoading, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', 'citizen'],
    queryFn: () => complaintsApi.list(),
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

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Citizen Dashboard" subtitle="National Grievance Portal" />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome + CTA */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Welcome, {user.name}</h2>
            <p className="text-sm text-gray-500">Track and manage your grievances</p>
          </div>
          <Link href="/citizen/register"
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Register Grievance
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {/* Complaints List */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">My Grievances</h3>
            <span className="text-xs text-gray-400">{complaints.length} total</span>
          </div>

          {isLoading ? (
            <div className="p-8 flex justify-center"><div className="animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 w-8 h-8" /></div>
          ) : complaints.length === 0 ? (
            <EmptyState
              title="No grievances yet"
              desc="Register your first grievance to get started"
              icon={<FileText className="w-12 h-12" />}
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {complaints.map(c => (
                <Link key={c.id} href={`/citizen/track/${c.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-blue-700 font-semibold">{c.id}</span>
                      <StatusBadge status={c.status} />
                      <UrgencyBadge urgency={c.urgency} />
                    </div>
                    <p className="text-sm text-gray-800 font-medium truncate">{c.category} — {c.ministry_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })} · {c.location}
                    </p>
                    {c.officer_name && (
                      <p className="text-xs text-blue-600 mt-0.5">Assigned to: {c.officer_name}</p>
                    )}
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
