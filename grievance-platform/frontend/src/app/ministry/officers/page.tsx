'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ministryApi } from '@/lib/api';
import { useState } from 'react';

export default function ManageOfficers() {
  const params = useSearchParams();
  const ministryId = params.get('ministryId');
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');

  const { data } = useQuery({
    queryKey: ['officers', ministryId],
    queryFn: () => ministryApi.getOfficers(ministryId!),
    enabled: !!ministryId,
  });

  const officers = data?.data?.officers || [];

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Manage Officers</h2>

      {/* ADD */}
      <div className="flex gap-2 mb-6">
        <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" placeholder="Designation" value={designation} onChange={e => setDesignation(e.target.value)} />

        <button
          className="btn-primary"
          onClick={async () => {
            await ministryApi.createOfficer({
              name,
              email,
              password: '123456',
              designation,
              ministry_id: ministryId!,
            });

            queryClient.invalidateQueries({ queryKey: ['officers', ministryId] });
          }}
        >
          Add
        </button>
      </div>

      {/* LIST + DELETE */}
      {officers.map((o: any) => (
        <div key={o.id} className="flex justify-between border p-3 mb-2">
          <div>{o.name} ({o.designation})</div>

          <button
            className="text-red-500"
            onClick={async () => {
              await fetch(`http://localhost:5001/api/officers/${o.id}`, {
                method: 'DELETE',
              });

              queryClient.invalidateQueries({ queryKey: ['officers'] });
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}