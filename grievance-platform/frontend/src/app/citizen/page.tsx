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
import { Star } from 'lucide-react';
import { officersApi } from '@/lib/api';
import { useState } from 'react';

export default function CitizenDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'citizen')) router.push('/');
  }, [user, authLoading, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', 'citizen'],
    queryFn: () => complaintsApi.list(),
    enabled: !!user,
  });

  const { data: topData } = useQuery({
  queryKey: ['top-officers'],
  queryFn: () => officersApi.topPerformers(),
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
        {/* 🔥 Top Performers Footer */}
<div className="mt-10">
  <h3 className="font-semibold text-gray-800 mb-3">🏆 Top Performing Officers (This Week)</h3>

  <div className="flex gap-4 overflow-x-auto pb-2">
    {(topData?.data?.officers || []).map((o: any, i: number) => (
      <div
  key={o.id}
  onClick={() => setSelectedOfficer(o)}
  className="min-w-[220px] card p-4 flex-shrink-0 text-center hover:scale-105 transition-transform"
>
        <div className={`text-lg font-bold ${
  i === 0 ? 'text-yellow-500' :
  i === 1 ? 'text-gray-400' :
  i === 2 ? 'text-orange-500' :
  'text-blue-700'
}`}>
          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
        </div>
        <div className="mt-2 font-semibold text-gray-800">
  {o.name}
  {i === 0 && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Top Performer</span>}
</div>
        <div className="text-xs text-gray-500">{o.designation}</div>

        <div className="flex justify-center items-center gap-1 mt-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm">{parseFloat(o.rating).toFixed(1)}</span>
        </div>

        <div className="text-xs text-gray-500 mt-1">
          {o.total_resolved || 0} total resolved
        </div>
      </div>
    ))}
  </div>
</div>
      </main>
      {selectedOfficer && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg relative">

      {/* Close Button */}
      <button
        onClick={() => setSelectedOfficer(null)}
        className="absolute top-2 right-3 text-gray-500 text-lg"
      >
        ✕
      </button>

      {/* Officer Info */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">{selectedOfficer.name}</h2>
        <p className="text-sm text-gray-500">{selectedOfficer.designation}</p>

        <div className="flex justify-center items-center gap-1 mt-2">
          ⭐ <span>{parseFloat(selectedOfficer.rating).toFixed(1)}</span>
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {(selectedOfficer.reviews?.length ? selectedOfficer.reviews : [
          { rating: 5, review: "Very helpful and quick response!", citizen_name: "User A" },
          { rating: 4, review: "Resolved my issue smoothly.", citizen_name: "User B" },
        ]).map((r: any, i: number) => (
          <div key={i} className="border-b pb-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{r.citizen_name}</span>
              <span>⭐ {r.rating}</span>
            </div>
            {r.review && <p className="text-gray-600">{r.review}</p>}
          </div>
        ))}
      </div>

    </div>
  </div>
)}
    </div>
  );
}
