'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { officersApi } from '@/lib/api';

export default function OfficerProfile() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data, isLoading } = useQuery({
    queryKey: ['officer', id],
    queryFn: () => officersApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) return <div>Loading...</div>;

  const officer = data?.data?.officer;
  const reviews = data?.data?.reviews || [];
  const stats = data?.data?.stats;

  if (!officer) return <div>No officer found</div>;

  return (
    <div className="p-6 max-w-xl mx-auto">

      {/* BASIC INFO */}
      <h1 className="text-xl font-bold">{officer.name}</h1>
      <p className="text-gray-600">{officer.designation}</p>
      <p className="text-sm text-gray-500">{officer.email}</p>

      {/* STATS */}
      <div className="mt-4 text-sm text-gray-700">
        <p>⭐ Rating: {officer.rating || 'N/A'}</p>
        <p>✅ Resolved: {stats?.resolved}</p>
        <p>⏳ In Progress: {stats?.in_progress}</p>
      </div>

      {/* REVIEWS */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Reviews</h3>

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet</p>
        ) : (
          reviews.map((r: any, i: number) => (
            <div key={i} className="border-b py-2 text-sm">
              <div className="flex justify-between">
                <span>{r.citizen_name}</span>
                <span>⭐ {r.rating}</span>
              </div>
              <p className="text-gray-600">{r.review}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}