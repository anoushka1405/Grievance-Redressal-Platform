'use client';
import { useAuth } from '@/context/AuthContext';
import { ministryApi } from '@/lib/api';
import { ministriesApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import GovHeader from '@/components/GovHeader';
import { PageLoader, StatusBadge, UrgencyBadge } from '@/components/ui';
import { Complaint, Officer, CreatedOfficer } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { UserPlus, ClipboardList, Eye, X } from 'lucide-react';

export default function MinistryDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'complaints' | 'officers' | 'create-officer'>('complaints');
  const [assignModal, setAssignModal] = useState<string | null>(null); // complaintId
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create officer form
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', designation: '' });
  const [createdOfficer, setCreatedOfficer] = useState<CreatedOfficer | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ministry')) router.push('/');
  }, [user, authLoading, router]);

  const ministryId = user?.ministryId || '';

  const { data: complaintsData, isLoading: complaintsLoading } = useQuery({
    queryKey: ['ministry-complaints', ministryId, statusFilter],
    queryFn: () => ministryApi.getComplaints(ministryId, statusFilter !== 'all' ? { status: statusFilter } : {}),
    enabled: !!ministryId,
  });

  const { data: ministryData } = useQuery({
    queryKey: ['ministry', ministryId],
    queryFn: () => ministriesApi.get(ministryId),
    enabled: !!ministryId,
  });

  const assignMutation = useMutation({
    mutationFn: () => ministryApi.assignOfficer(ministryId, assignModal!, selectedOfficer),
    onSuccess: () => {
      toast.success('Officer assigned successfully');
      setAssignModal(null);
      setSelectedOfficer('');
      qc.invalidateQueries({ queryKey: ['ministry-complaints'] });
    },
    onError: () => toast.error('Failed to assign officer'),
  });

  const createOfficerMutation = useMutation({
    mutationFn: () => ministryApi.createOfficer(form),
    onSuccess: (res) => {
      setCreatedOfficer(res.data.officer);
      setForm({ name: '', email: '', password: '', phone: '', designation: '' });
      toast.success('Officer account created!');
      qc.invalidateQueries({ queryKey: ['ministry', ministryId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create officer'),
  });

  if (authLoading || !user) return <PageLoader />;

  const complaints: Complaint[] = complaintsData?.data?.complaints || [];
  const officers: Officer[] = ministryData?.data?.officers || [];

  const stats = {
    total: complaintsData?.data?.total || 0,
    unassigned: complaints.filter(c => c.status === 'submitted').length,
    inProgress: complaints.filter(c => c.status === 'in-progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Ministry Dashboard" subtitle="Complaint Management" />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Complaints', value: stats.total, color: 'text-blue-600 bg-blue-50' },
            { label: 'Unassigned', value: stats.unassigned, color: 'text-red-600 bg-red-50' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-600 bg-green-50' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'complaints', label: 'Complaints', icon: <ClipboardList className="w-4 h-4" /> },
            { key: 'officers', label: 'Our Officers', icon: <Eye className="w-4 h-4" /> },
            { key: 'create-officer', label: 'Add Officer', icon: <UserPlus className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* COMPLAINTS TAB */}
        {tab === 'complaints' && (
          <div className="card">
            <div className="p-4 border-b flex items-center gap-3">
              <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            {complaintsLoading ? <PageLoader /> : (
              <div className="divide-y divide-gray-100">
                {complaints.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No complaints found</div>
                ) : complaints.map(c => (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-blue-700 font-semibold">{c.id}</span>
                        <StatusBadge status={c.status} />
                        <UrgencyBadge urgency={c.urgency} />
                      </div>
                      <p className="text-sm font-medium text-gray-800">{c.category}</p>
                      <p className="text-xs text-gray-500 truncate">{c.description}</p>
                      <div className="text-xs text-gray-400 mt-1">
                        {c.citizen_name} · {formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}
                        {c.officer_name && <span className="ml-2 text-green-600">→ {c.officer_name}</span>}
                      </div>
                    </div>
                    {c.status === 'submitted' && (
                      <button onClick={() => setAssignModal(c.id)}
                        className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap">
                        Assign Officer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OFFICERS TAB */}
        {tab === 'officers' && (
          <div className="card divide-y divide-gray-100">
            {officers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No officers yet. Add officers from the "Add Officer" tab.</div>
            ) : officers.map(o => (
              <div key={o.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {o.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{o.name}</div>
                  <div className="text-xs text-gray-500">{o.designation} · {o.email}</div>
                  <div className="text-xs text-gray-400">⭐ {parseFloat(String(o.rating)).toFixed(1)} · {o.total_resolved} resolved</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE OFFICER TAB */}
        {tab === 'create-officer' && (
          <div className="max-w-md">
            {createdOfficer ? (
              <div className="card p-6 border-2 border-green-400">
                <h3 className="font-bold text-green-700 text-lg mb-2">✅ Officer Account Created!</h3>
                <p className="text-sm text-gray-600 mb-4">Share these credentials with the officer:</p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
                  <div><span className="text-gray-500">Name:</span> <strong>{createdOfficer.name}</strong></div>
                  <div><span className="text-gray-500">Email:</span> <strong>{createdOfficer.email}</strong></div>
                  <div><span className="text-gray-500">Password:</span> <strong className="text-blue-700">{createdOfficer.password}</strong></div>
                  <div><span className="text-gray-500">Role:</span> <strong>Officer</strong></div>
                </div>
                <p className="text-xs text-red-500 mt-3">⚠️ Save this password now — it won't be shown again.</p>
                <button onClick={() => setCreatedOfficer(null)}
                  className="mt-4 btn-secondary w-full">Create Another Officer</button>
              </div>
            ) : (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" /> Create Officer Account
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'name', label: 'Full Name', placeholder: 'Officer Name' },
                    { key: 'email', label: 'Email (Login ID)', placeholder: 'officer@gov.in' },
                    { key: 'password', label: 'Password', placeholder: 'Min 6 characters', type: 'password' },
                    { key: 'phone', label: 'Phone (optional)', placeholder: '9XXXXXXXXX' },
                    { key: 'designation', label: 'Designation', placeholder: 'e.g. Section Officer' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label}</label>
                      <input className="input" type={f.type || 'text'} placeholder={f.placeholder}
                        value={form[f.key as keyof typeof form]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                  <button onClick={() => createOfficerMutation.mutate()}
                    disabled={createOfficerMutation.isPending || !form.name || !form.email || !form.password}
                    className="btn-primary w-full mt-2">
                    {createOfficerMutation.isPending ? 'Creating...' : 'Create Officer Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Assign Officer Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Assign Officer</h3>
              <button onClick={() => setAssignModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Complaint: <strong>{assignModal}</strong></p>
            <select className="input mb-4" value={selectedOfficer} onChange={e => setSelectedOfficer(e.target.value)}>
              <option value="">Select an officer</option>
              {officers.map(o => (
                <option key={o.id} value={o.id}>{o.name} — {o.designation} (⭐{parseFloat(String(o.rating)).toFixed(1)})</option>
              ))}
            </select>
            <button onClick={() => assignMutation.mutate()}
              disabled={!selectedOfficer || assignMutation.isPending}
              className="btn-primary w-full">
              {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}