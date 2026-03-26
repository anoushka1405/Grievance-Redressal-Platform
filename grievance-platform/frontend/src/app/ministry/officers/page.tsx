'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ministryApi } from '@/lib/api';
import { useState } from 'react';

interface Officer {
  id: string;
  name: string;
  email: string;
  designation: string;
  is_active: boolean;
  pending_complaints: number;
  resolved_complaints: number;
  total_complaints: number;
  rating?: number;
  total_resolved?: number;
  phone?: string;
}

interface Credentials {
  email: string;
  password: string;
}

export default function ManageOfficers() {
  const params = useSearchParams();
  const router = useRouter();
  const ministryId = params.get('ministryId');
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newCredentials, setNewCredentials] = useState<Credentials | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['officers', ministryId],
    queryFn: () => ministryApi.getOfficers(ministryId!),
    enabled: !!ministryId,
  });

  const officers: Officer[] = data?.data?.officers || [];

  const filtered = officers.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddOfficer = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const res = await ministryApi.createOfficer({
        name: name.trim(),
        email: email.trim(),
        designation: designation.trim() || 'Officer',
        phone: phone.trim(),
        ministry_id: ministryId!,
      });

      const { credentials } = res.data;
      setNewCredentials(credentials);
      setName(''); setEmail(''); setDesignation(''); setPhone('');
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['officers', ministryId] });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create officer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/officers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      queryClient.invalidateQueries({ queryKey: ['officers', ministryId] });
      setDeleteConfirmId(null);
    } catch {
      alert('Failed to remove officer');
    }
  };

  const totalResolved = officers.reduce((s, o) => s + Number(o.resolved_complaints || 0), 0);
  const totalPending = officers.reduce((s, o) => s + Number(o.pending_complaints || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Officers Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {officers.length} officer{officers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(''); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Officer
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Officers</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{officers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Complaints Resolved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{totalResolved}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Complaints</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{totalPending}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or designation..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Officers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading officers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {searchQuery ? 'No officers match your search.' : 'No officers added yet. Click "Add Officer" to get started.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Officer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Designation</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resolved</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/ministry/officers/${o.id}?ministryId=${ministryId}`)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                        {o.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{o.name}</p>
                        <p className="text-xs text-gray-400">{o.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{o.designation}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="font-semibold text-green-600">{o.resolved_complaints ?? 0}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="font-semibold text-orange-500">{o.pending_complaints ?? 0}</span>
                  </td>
                  <td className="px-5 py-4 text-center text-gray-700 font-medium">{o.total_complaints ?? 0}</td>
                  <td className="px-5 py-4 text-center">
                    {o.rating ? (
                      <span className="text-amber-500 font-medium">★ {Number(o.rating).toFixed(1)}</span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      o.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {o.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDeleteConfirmId(o.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors px-2 py-1 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Officer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add New Officer</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. rajesh.kumar@gov.in"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Section Officer"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              A secure login password will be auto-generated and shown once after creation.
            </p>

            {error && (
              <p className="text-xs text-red-500 mt-2 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOfficer}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Officer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal — shown once after officer creation */}
      {newCredentials && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 text-2xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Officer Created!</h2>
              <p className="text-sm text-gray-500 mt-1">Share these login credentials with the officer. They will not be shown again.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                <p className="font-mono text-sm font-semibold text-gray-800">{newCredentials.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Password</p>
                <p className="font-mono text-sm font-semibold text-gray-800">{newCredentials.password}</p>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Email: ${newCredentials.email}\nPassword: ${newCredentials.password}`
                );
              }}
              className="w-full mt-3 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Copy Credentials
            </button>

            <button
              onClick={() => setNewCredentials(null)}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-red-500 text-xl">!</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Remove Officer?</h2>
            <p className="text-sm text-gray-500 mb-5">
              The officer's account will be deactivated. Their complaint history will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
