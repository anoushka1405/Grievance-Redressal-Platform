'use client';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/lib/api';
import GovHeader from '@/components/GovHeader';
import { StatusBadge, UrgencyBadge, PageLoader, Spinner } from '@/components/ui';
import { Complaint } from '@/lib/types';
import { MessageSquare, Upload, CheckCircle2, Clock, FileText, AlertCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';

const STATUS_OPTIONS = [
  { value: 'in-progress', label: 'Mark In Progress' },
  { value: 'resolved', label: 'Mark Resolved' },
  { value: 'rejected', label: 'Reject Complaint' },
];

const TIMELINE_STEPS = ['submitted', 'assigned', 'in-progress', 'resolved'] as const;

function stepIndex(status: string) {
  const i = TIMELINE_STEPS.indexOf(status as typeof TIMELINE_STEPS[number]);
  return i === -1 ? 0 : i;
}

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.get(id),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('status', newStatus);
      if (note) fd.append('note', note);
      if (resolutionNotes) fd.append('resolutionNotes', resolutionNotes);
      if (proofFile) fd.append('proofDocument', proofFile);
      return complaintsApi.updateStatus(id, fd);
    },
    onSuccess: () => {
      toast.success('Status updated successfully');
      setNewStatus(''); setNote(''); setResolutionNotes(''); setProofFile(null);
      qc.invalidateQueries({ queryKey: ['complaint', id] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) return <PageLoader />;
  const complaint: Complaint | undefined = data?.data;
  if (!complaint) return null;

  const currentStep = stepIndex(complaint.status);

  const canUpdate = !['resolved', 'rejected'].includes(complaint.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Complaint Detail" subtitle={id} backHref="/officer" />

      <div className="container mx-auto px-4 py-8 max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main detail */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
            <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
              <div>
                <div className="font-mono text-blue-700 font-bold text-lg">{complaint.id}</div>
                <div className="text-sm text-gray-600">{complaint.category} · {complaint.ministry_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <UrgencyBadge urgency={complaint.urgency} />
                <StatusBadge status={complaint.status} />
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{complaint.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <span>📍 {complaint.location}</span>
              <span>📅 Submitted {format(new Date(complaint.submitted_at), 'dd MMM yyyy')}</span>
            </div>
          </motion.div>

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-5">Status Timeline</h3>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" />
              <div className="absolute top-4 left-0 h-0.5 bg-blue-600 z-0 transition-all"
                style={{ width: `${(currentStep / (TIMELINE_STEPS.length - 1)) * 100}%` }} />
              {TIMELINE_STEPS.map((step, i) => {
                const done = i <= currentStep;
                const label = step.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div key={step} className="flex flex-col items-center z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                      ${done ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-300'}`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${done ? 'text-blue-700' : 'text-gray-400'}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Documents */}
          {complaint.documents && complaint.documents.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Attachments</h3>
              {complaint.documents.map(d => (
                <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 mb-2 text-sm text-blue-700">
                  <FileText className="w-4 h-4" /> {d.file_name}
                </a>
              ))}
            </div>
          )}

          {/* Audit trail */}
          {complaint.history && complaint.history.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Audit Trail</h3>
              <div className="space-y-3">
                {complaint.history.map(h => (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">{h.new_status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      {h.note && <span className="text-gray-500"> — {h.note}</span>}
                      <div className="text-xs text-gray-400 mt-0.5">
                        By {h.changed_by_name} · {format(new Date(h.created_at), 'dd MMM yyyy, h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — actions sidebar */}
        <div className="space-y-5">
          {/* Citizen info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Citizen</h3>
            <div className="text-sm space-y-1">
              <div className="font-medium text-gray-800">{complaint.citizen_name}</div>
              <div className="text-gray-500">{complaint.citizen_email}</div>
              <div className="text-gray-500">{complaint.citizen_phone}</div>
            </div>
            <Link href={`/officer/chat/${id}`}
              className="mt-4 btn-primary w-full flex items-center justify-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4" /> Chat with Citizen
            </Link>
          </div>

          {/* Status Update */}
          {canUpdate && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Update Status</h3>
              <div className="space-y-3">
                <select className="input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="">Select new status</option>
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {newStatus && (
                  <>
                    <textarea className="input" rows={2} placeholder="Add a note (optional)" value={note} onChange={e => setNote(e.target.value)} />
                    {newStatus === 'resolved' && (
                      <textarea className="input" rows={3} placeholder="Resolution notes (what was done)" value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} />
                    )}
                    {newStatus === 'resolved' && (
                      <div>
                        <button onClick={() => fileRef.current?.click()}
                          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                          <Upload className="w-4 h-4" />
                          {proofFile ? proofFile.name : 'Upload Proof Document'}
                        </button>
                        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => setProofFile(e.target.files?.[0] || null)} />
                      </div>
                    )}
                    <button className="btn-primary w-full flex items-center justify-center gap-2"
                      onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <><Spinner size="sm" /> Updating...</> : 'Confirm Update'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {complaint.resolution_notes && (
            <div className="card p-5 border-l-4 border-green-500">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Resolution Notes</h3>
              <p className="text-sm text-gray-600">{complaint.resolution_notes}</p>
            </div>
          )}

          {complaint.citizen_rating && (
            <div className="card p-4 bg-yellow-50 border-yellow-200">
              <div className="text-sm font-medium text-yellow-800">Citizen Rating: {complaint.citizen_rating}/5 ⭐</div>
              {complaint.citizen_review && <p className="text-xs text-yellow-700 mt-1">{complaint.citizen_review}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
