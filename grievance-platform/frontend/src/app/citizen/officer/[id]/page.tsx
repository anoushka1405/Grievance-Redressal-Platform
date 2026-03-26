'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { officersApi } from '@/lib/api';
import GovHeader from '@/components/GovHeader';
import { PageLoader } from '@/components/ui';
import { Star, CheckCircle2, Clock, Award, User } from 'lucide-react';

export default function OfficerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['officer', id],
    queryFn: () => officersApi.getById(id),
  });

  if (isLoading) return <PageLoader />;
  const { officer, reviews = [], stats } = data?.data || {};
  if (!officer) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Officer Profile" backHref="/citizen" />
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-5">
        {/* Profile card */}
        <div className="card p-6 flex items-center gap-5">
          {officer.photo_url ? (
            <img src={officer.photo_url} alt={officer.name} className="w-20 h-20 rounded-full object-cover border-4 border-blue-100" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-10 h-10 text-blue-600" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-800">{officer.name}</h2>
            <p className="text-sm text-gray-500">{officer.designation}</p>
            <p className="text-sm text-blue-700 mt-0.5">{officer.ministry_name}</p>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className={`w-4 h-4 ${n <= Math.round(officer.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-sm text-gray-600 ml-1">{parseFloat(officer.rating).toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, label: 'Resolved', value: officer.total_resolved, bg: 'bg-green-50' },
            { icon: <Clock className="w-5 h-5 text-purple-600" />, label: 'In Progress', value: stats?.in_progress || 0, bg: 'bg-purple-50' },
            { icon: <Award className="w-5 h-5 text-blue-600" />, label: 'Avg Days', value: stats?.avg_days ? parseFloat(stats.avg_days).toFixed(1) : 'N/A', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 text-center ${s.bg}`}>
              <div className="flex justify-center mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Reviews */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Citizen Reviews</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: { rating: number; review: string; citizen_name: string; created_at: string }, i: number) => (
                <div key={i} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{r.citizen_name}</span>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  {r.review && <p className="text-sm text-gray-600">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}