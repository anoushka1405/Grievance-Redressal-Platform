'use client';
import { useAuth } from '@/context/AuthContext';
import { complaintsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import GovHeader from '@/components/GovHeader';
import { StatusBadge, UrgencyBadge, PageLoader, EmptyState } from '@/components/ui';
import { Complaint } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { officersApi, messagesApi } from '@/lib/api';

export default function CitizenDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);

  const { data: topData, refetch: refetchTop } = useQuery({
    queryKey: ['top-officers'],
    queryFn: () => officersApi.topPerformers(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', 'citizen', user?.id],
    queryFn: () => complaintsApi.list(),
    enabled: !!user,
  });

  // ✅ DEFINE complaints FIRST (FIX)
  const complaints: Complaint[] = (data as any)?.data?.complaints || [];

  // ✅ UNREAD STATE
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // ✅ FETCH UNREAD (NOW CORRECT)
  useEffect(() => {
    if (!complaints.length) return;

    const fetchUnread = async () => {
      const map: Record<string, number> = {};

      for (let c of complaints) {
        try {
          const res = await messagesApi.list(c.id);
          const msgs = res.data.messages;

          const unread = msgs.filter(
            (m: any) => !m.is_read && m.sender_role !== 'citizen'
          ).length;

          if (unread > 0) map[c.id] = unread;
        } catch (e) {
          console.log(e);
        }
      }

      setUnreadMap(map);
    };

    fetchUnread();
  }, [complaints]);

  // 🔁 CHAT AUTO REFRESH
  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('messageSent', handler);
    return () => window.removeEventListener('messageSent', handler);
  }, []);

  // 🔁 AUTH CHECK
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'citizen')) router.push('/');
  }, [user, authLoading, router]);

  // 🔁 REFRESH TOP PERFORMERS
  useEffect(() => {
    const handler = () => refetchTop();
    window.addEventListener('ratingSubmitted', handler);
    return () => window.removeEventListener('ratingSubmitted', handler);
  }, [refetchTop]);

  if (authLoading || !user) return <PageLoader />;

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

        {/* Welcome */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Welcome, {user.name}</h2>
            <p className="text-sm text-gray-500">Track and manage your grievances</p>
          </div>
          <Link href="/citizen/register" className="btn-primary flex items-center gap-2">
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
            <motion.div key={s.label} className="card p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}>{s.icon}</div>
              <div>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Complaints */}
        <div className="card">
          <div className="p-4 border-b flex justify-between">
            <h3 className="font-semibold">My Grievances</h3>
            <span className="text-xs">{complaints.length} total</span>
          </div>

          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin w-8 h-8 border-t-blue-600 border-2 rounded-full" />
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState title="No grievances yet" desc="Register your first grievance" icon={<FileText />} />
          ) : (
            <div className="divide-y divide-gray-100">
  {complaints.map(c => (
    <Link
      key={c.id}
      href={`/citizen/track/${c.id}`}
      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group border-l-4 
      ${c.urgency === 'high' ? 'border-l-red-500' :
        c.urgency === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-400'}"
    >
      <div className="flex-1 min-w-0">
        
        {/* TOP LINE */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">

          {/* 💬 Chat Badge */}
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            💬 Chat Available
          </span>

          {/* ID */}
          <span className="font-mono text-xs text-blue-700 font-semibold">
            {c.id}
          </span>

          <StatusBadge status={c.status} />
          <UrgencyBadge urgency={c.urgency} />

          {/* 🔴 Unread */}
          {unreadMap[c.id] && (
            <span className="text-xs text-red-500 font-semibold">
              🔴 {unreadMap[c.id]}
            </span>
          )}
        </div>

        {/* TITLE */}
        <p className="text-sm font-medium text-gray-800 truncate">
          {c.category} — {c.ministry_name}
        </p>

        {/* DESCRIPTION */}
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {c.description}
        </p>

        {/* BOTTOM INFO */}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span>{c.officer_name || 'Not Assigned'}</span>
          <span>·</span>
          <span>{c.location}</span>
          <span>·</span>
          <span>
            {formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}
          </span>
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