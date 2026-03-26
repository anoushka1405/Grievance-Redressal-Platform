'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { officersApi } from '@/lib/api';
import { Star } from 'lucide-react';

export default function OfficerProfile() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['officer-profile', id],
    queryFn: () => officersApi.getById(id as string),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-10 text-center">Loading...</div>;

  const officer = data?.data?.officer;
  const reviews = data?.data?.reviews || [];
  const stats = data?.data?.stats;

  if (!officer) return <div className="p-10 text-center">Officer not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* PROFILE CARD */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700">
              {officer.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{officer.name}</h1>
              <p className="text-sm text-gray-500">{officer.designation}</p>
              <p className="text-xs text-gray-400">{officer.email}</p>
            </div>
          </div>

          <div className="flex gap-6 mt-4 text-sm">
            <div className="flex items-center gap-1">
              ⭐ <span>{parseFloat(officer.rating || 0).toFixed(1)}</span>
            </div>
            <div>{officer.total_resolved} resolved</div>
            <div>{officer.ministry_name}</div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats?.total },
            { label: 'Resolved', value: stats?.resolved },
            { label: 'In Progress', value: stats?.in_progress },
            { label: 'Assigned', value: stats?.assigned },
          ].map((s) => (
            <div key={s.label} className="bg-white p-4 rounded-xl shadow text-center">
              <div className="text-xl font-bold text-gray-800">{s.value || 0}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* REVIEWS */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold text-gray-800 mb-4">Citizen Reviews</h2>

          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400">No reviews yet</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r: any, i: number) => (
                <div key={i} className="border-b pb-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.citizen_name}</span>
                    <span>⭐ {r.rating}</span>
                  </div>
                  {r.review && <p className="text-gray-600">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}