'use client';
import ChatPage from '@/components/ChatPage';

<<<<<<< Updated upstream
export default function OfficerChatPage() {
  return <ChatPage backHref="/officer" />;
}
=======
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

interface OfficerStats {
  total: number;
  resolved: number;
  pending: number;
  in_progress: number;
  escalated: number;
  avg_days: number | null;
  resolved_this_month: number;
}

interface TrendPoint {
  month: string;
  assigned: number;
  resolved: number;
}

interface Complaint {
  id: string;
  category: string;
  description: string;
  status: string;
  urgency: string;
  submitted_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  resolved: 'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-gray-100 text-gray-600',
  escalated: 'bg-red-100 text-red-600',
};

const URGENCY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export default function OfficerDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const ministryId = params.get('ministryId');

  const { data, isLoading, error } = useQuery({
    queryKey: ['officer', id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/officers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch officer');
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading officer profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-400">Failed to load officer. Please go back and try again.</p>
      </div>
    );
  }

  const { officer, stats, trend, recentComplaints, reviews } = data as {
    officer: any;
    stats: OfficerStats;
    trend: TrendPoint[];
    recentComplaints: Complaint[];
    reviews: any[];
  };

  const resolutionRate =
    stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  // Simple bar chart values normalised to max
  const maxTrendVal = Math.max(...(trend || []).map(t => Math.max(t.assigned, t.resolved)), 1);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Back */}
      <button
        onClick={() => router.push(`/ministry/officers?ministryId=${ministryId}`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        ← Back to Officers
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl flex-shrink-0">
          {officer.name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{officer.name}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              officer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {officer.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{officer.designation}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
            <span>✉ {officer.email}</span>
            {officer.phone && <span>📞 {officer.phone}</span>}
            <span>🏛 {officer.ministry_name}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {officer.rating && (
            <p className="text-2xl font-bold text-amber-500">★ {Number(officer.rating).toFixed(1)}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            Joined {new Date(officer.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Assigned', value: stats?.total ?? 0, color: 'text-gray-900' },
          { label: 'Resolved', value: stats?.resolved ?? 0, color: 'text-green-600' },
          { label: 'Pending', value: (stats?.pending ?? 0) + (stats?.in_progress ?? 0), color: 'text-orange-500' },
          { label: 'Escalated', value: stats?.escalated ?? 0, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Resolution Rate</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{resolutionRate}%</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Avg. Resolution Time</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">
            {stats?.avg_days != null ? `${stats.avg_days}d` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Resolved This Month</p>
          <p className="text-3xl font-bold text-teal-600 mt-1">{stats?.resolved_this_month ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trend (Last 6 Months)</h2>
          {trend && trend.length > 0 ? (
            <div className="flex items-end gap-3 h-32">
              {trend.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: '96px' }}>
                    <div
                      className="flex-1 bg-blue-200 rounded-t"
                      style={{ height: `${(t.assigned / maxTrendVal) * 96}px` }}
                      title={`Assigned: ${t.assigned}`}
                    />
                    <div
                      className="flex-1 bg-green-400 rounded-t"
                      style={{ height: `${(t.resolved / maxTrendVal) * 96}px` }}
                      title={`Resolved: ${t.resolved}`}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{t.month}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No data available yet</p>
          )}
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 rounded-sm inline-block" /> Assigned</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-sm inline-block" /> Resolved</span>
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Complaints</h2>
          {recentComplaints && recentComplaints.length > 0 ? (
            <div className="space-y-3">
              {recentComplaints.map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{c.id}</span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${URGENCY_COLORS[c.urgency] || 'bg-gray-100 text-gray-600'}`}>
                        {c.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate">{c.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.category} · {new Date(c.submitted_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No complaints assigned yet</p>
          )}
        </div>
      </div>

      {/* Citizen Reviews */}
      {reviews && reviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Citizen Reviews</h2>
          <div className="space-y-3">
            {reviews.map((r, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{r.citizen_name}</span>
                  <span className="text-amber-500 text-sm">{'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}</span>
                </div>
                {r.review && <p className="text-xs text-gray-500">{r.review}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
>>>>>>> Stashed changes
