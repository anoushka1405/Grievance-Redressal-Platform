'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '@/lib/api';
import GovHeader from '@/components/GovHeader';
import { StatusBadge, UrgencyBadge, PageLoader } from '@/components/ui';
import { Complaint } from '@/lib/types';
import { MessageSquare, Star, User, Clock, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
const TIMELINE_STEPS = ['submitted', 'assigned', 'in-progress', 'resolved'] as const;

function stepIndex(status: string) {
  const i = TIMELINE_STEPS.indexOf(status as typeof TIMELINE_STEPS[number]);
  return i === -1 ? 0 : i;
}

export default function TrackComplaint() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.get(id),
  });

  const complaint: Complaint | undefined = data?.data;

  const handleRate = async () => {
    if (!rating) { toast.error('Please select a rating'); return; }
    setRatingLoading(true);
    try {
      await complaintsApi.rate(id, rating, review);

// 🔥 ADD THIS LINE (VERY IMPORTANT)
window.dispatchEvent(new Event('ratingSubmitted'));
      toast.success('Rating submitted!');
      refetch();
    } catch { toast.error('Failed to submit rating'); }
    finally { setRatingLoading(false); }
  };

  const handleAppeal = async (type: 'same' | 'new') => {
  try {
    await complaintsApi.appeal(id, type);

    toast.success('Appeal submitted!');
    setShowAppeal(false);
    refetch();
  } catch (err) {
    toast.error('Appeal failed');
  }
};

  if (isLoading) return <PageLoader />;
  if (!complaint) return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Track Complaint" backHref="/citizen" />
      <div className="container mx-auto px-4 py-16 text-center text-gray-500">Complaint not found.</div>
    </div>
  );

  const currentStep = stepIndex(complaint.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Track Complaint" subtitle={complaint.id} backHref="/citizen" />

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Header card */}
        <div className="card p-5">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="font-mono text-blue-700 font-bold text-lg">{complaint.id}</div>
              <div className="text-sm text-gray-600 mt-0.5">{complaint.category} · {complaint.ministry_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{complaint.location}</div>
            </div>
            <div className="flex items-center gap-2">
              <UrgencyBadge urgency={complaint.urgency} />
              <StatusBadge status={complaint.status} />
            </div>
          </div>
          <p className="text-sm text-gray-700 mt-3 leading-relaxed">{complaint.description}</p>
          <div className="flex gap-3 mt-4">
            {complaint.officer_id && (
              <Link href={`/citizen/chat/${id}`} className="btn-primary flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4" /> Chat with Officer
              </Link>
            )}
            {complaint.officer_id && (
              <Link href={`/citizen/officer/${complaint.officer_id}`} className="btn-secondary flex items-center gap-2 text-sm">
                <User className="w-4 h-4" /> View Officer Profile
              </Link>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-5">Status Timeline</h3>
          <div className="flex items-center justify-between relative">
            {/* connector line */}
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

        {/* Assigned Officer */}
        {complaint.officer_name && (
          <div className="card p-5 flex items-center gap-4">
            {complaint.officer_photo ? (
              <img src={complaint.officer_photo} alt={complaint.officer_name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <div className="flex-1">
              <div className="font-medium text-gray-800">{complaint.officer_name}</div>
              <div className="text-xs text-gray-500">{complaint.officer_designation} · {complaint.ministry_name}</div>
              {complaint.officer_rating && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-400" />
                  <span className="text-xs text-gray-600">{Number(complaint.officer_rating || 0).toFixed(1)} · {complaint.officer_total_resolved} resolved</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resolution notes */}
        {complaint.resolution_notes && (
          <div className="card p-5 border-l-4 border-green-500">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Resolution Notes</h3>
            <p className="text-sm text-gray-700">{complaint.resolution_notes}</p>
          </div>
        )}

        {/* Appeal Section */}
{complaint.status === 'resolved' && (
  <div className="card p-5 border border-yellow-300 bg-yellow-50">
    <p className="text-sm text-yellow-800 mb-3">
      Not satisfied with the resolution?
    </p>

    <button
      onClick={() => setShowAppeal(true)}
      className="btn-primary text-sm"
    >
      Appeal
    </button>
  </div>
)}

        {/* Rate officer (only if resolved + not yet rated) */}
        {complaint.status === 'resolved' && !complaint.citizen_rating && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Rate the Officer</h3>
            <div className="flex items-center gap-2 mb-3">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={`w-7 h-7 transition-colors ${n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <textarea className="input mb-3" rows={3} placeholder="Write a review (optional)" value={review} onChange={e => setReview(e.target.value)} />
            <button className="btn-primary" onClick={handleRate} disabled={ratingLoading}>
              {ratingLoading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        )}

        {complaint.citizen_rating && (
          <div className="card p-4 flex items-center gap-2 bg-green-50 border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">You rated this complaint {complaint.citizen_rating}/5</span>
          </div>
        )}

        {/* Documents */}
        {complaint.documents && complaint.documents.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Documents</h3>
            <div className="space-y-2">
              {complaint.documents.map(d => (
                <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 hover:underline">{d.file_name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* History */}
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
        {showAppeal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">
      
      <h2 className="font-bold text-lg">Appeal Options</h2>

      <button
        onClick={() => handleAppeal('same')}
        className="w-full btn-secondary"
      >
        Appeal to Same Officer
      </button>

      <button
        onClick={() => handleAppeal('new')}
        className="w-full btn-primary"
      >
        Appeal to Another Officer
      </button>

      <button
        onClick={() => setShowAppeal(false)}
        className="w-full text-sm text-gray-500"
      >
        Cancel
      </button>
    </div>
  </div>
)}
      </div>
    </div>
  );
}
