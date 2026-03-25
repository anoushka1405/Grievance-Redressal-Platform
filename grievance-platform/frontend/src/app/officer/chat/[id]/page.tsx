'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { officersApi } from '@/lib/api';

export default function OfficerProfile() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['officer', id],
    queryFn: () => officersApi.getById(id as string),
    enabled: !!id,
  });

  if (isLoading) return <div>Loading...</div>;

  const officer = data?.data;

  if (!officer) return <div>No officer found</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">{officer.name}</h1>
      <p>{officer.designation}</p>
      <p>Rating: {officer.rating}</p>
      <p>Total Resolved: {officer.total_resolved}</p>
    </div>
  );
}