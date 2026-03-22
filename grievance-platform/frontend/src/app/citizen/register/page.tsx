'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ministriesApi, complaintsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import GovHeader from '@/components/GovHeader';
import { Spinner } from '@/components/ui';
import { Ministry } from '@/lib/types';
import { CheckCircle2, Search, Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const cityList = [
  "Delhi, Delhi",
  "Mumbai, Maharashtra",
  "Pune, Maharashtra",
  "Bangalore, Karnataka",
  "Hyderabad, Telangana",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan",
  "Lucknow, Uttar Pradesh",
  "Bhopal, Madhya Pradesh",
  "Chandigarh, Chandigarh",
  "Other"
];

export default function RegisterGrievance() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState('');

  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isOther, setIsOther] = useState(false);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [documents, setDocuments] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  interface MinistriesResponse {
    ministries: Ministry[];
  }

// 1. Ensure the type is recognized
const { data: minData, isLoading, error } = useQuery<MinistriesResponse>({
  queryKey: ['ministries'],
  queryFn: () => ministriesApi.list().then(res => res.data),
});

// 2. Simplify the assignment
const ministries: Ministry[] = minData?.ministries ?? [];
const filtered = ministries.filter((m: Ministry) =>
  m.name.toLowerCase().includes(searchQuery.toLowerCase())
);
const selectedM = ministries.find((m: Ministry) => m.id === selectedMinistry);
  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocuments(prev => [...prev, ...files].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!selectedMinistry || !category || !description.trim() || !location.trim()) {
      toast.error('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('ministryId', selectedMinistry);
      fd.append('category', category);
      fd.append('description', description);
      fd.append('location', location);
      fd.append('urgency', urgency);
      documents.forEach(f => fd.append('documents', f));

      const res = await complaintsApi.create(fd);
      setGeneratedId(res.data.complaintId);
      setStep(4);
      toast.success('Grievance registered successfully!');
    } catch {
      toast.error('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Register Grievance" subtitle="National Grievance Portal" backHref="/citizen" />

      {/* Progress bar */}
      {step < 4 && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-5 max-w-2xl">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                    ${step >= s ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
                  {s < 3 && <div className={`h-1 w-24 md:w-40 mx-2 transition-colors ${step > s ? 'bg-blue-800' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2 max-w-xs mx-auto">
              <span>Ministry</span><span className="ml-8 md:ml-20">Details</span><span>Documents</span>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <AnimatePresence mode="wait">
          {/* Step 1 — Ministry */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="card p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Select Ministry / Department</h2>
              <p className="text-sm text-gray-500 mb-4">Choose the government body relevant to your grievance</p>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input className="input pl-9" placeholder="Search ministries..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filtered.map(m => (
                  <div key={m.id} onClick={() => setSelectedMinistry(m.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all
                      ${selectedMinistry === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    <div className="font-medium text-sm text-gray-800">{m.name}</div>
                    <div className="text-xs text-gray-500 mt-1">Contact: {m.contact} · Escalation Level {m.escalation_level}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.categories.slice(0, 4).map((cat: string) => (
                        <span key={cat} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{cat}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary w-full mt-4" disabled={!selectedMinistry} onClick={() => setStep(2)}>
                Continue →
              </button>
            </motion.div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="card p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Category & Details</h2>
              <p className="text-sm text-gray-500 mb-4">Provide information about your grievance</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ministry</label>
                  <div className="input bg-gray-50 text-gray-700 cursor-default">{selectedM?.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">Select category</option>
                    {selectedM?.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="relative">
  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>

  <input
    className="input"
    placeholder="Search city..."
    value={locationQuery}
    onChange={(e) => {
      setLocationQuery(e.target.value);
      setShowDropdown(true);
    }}
    onFocus={() => setShowDropdown(true)}
  />

  {showDropdown && (
    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow">
      {cityList
        .filter(city =>
          city.toLowerCase().includes(locationQuery.toLowerCase())
        )
        .map((city, i) => (
          <div
            key={i}
            onClick={() => {
              if (city === "Other") {
                setIsOther(true);
                setLocation('');
                setLocationQuery('');
              } else {
                setIsOther(false);
                setLocation(city);
                setLocationQuery(city);
              }
              setShowDropdown(false);
            }}
            className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
          >
            {city}
          </div>
        ))}
    </div>
  )}

  {isOther && (
    <input
      className="input mt-2"
      placeholder="Enter your city"
      value={location}
      onChange={(e) => setLocation(e.target.value)}
    />
  )}
</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level *</label>
                  <select className="input" value={urgency} onChange={e => setUrgency(e.target.value as typeof urgency)}>
                    <option value="low">Low — Can wait 30+ days</option>
                    <option value="medium">Medium — 15–30 days</option>
                    <option value="high">High — Immediate attention required</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea className="input" rows={5} placeholder="Describe your grievance in detail..." value={description} onChange={e => setDescription(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">{description.length} chars (min 20)</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn-primary flex-1" disabled={!category || description.length < 20 || !location} onClick={() => setStep(3)}>Continue →</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Documents */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="card p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Upload Documents</h2>
              <p className="text-sm text-gray-500 mb-4">Add supporting evidence (optional, max 5 files)</p>
              <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Click to upload photos, PDFs, or documents</p>
                <p className="text-xs text-gray-400 mt-1">Max 5MB each · PDF, JPG, PNG</p>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileAdd} />
              </label>
              {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {documents.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{f.name}</span>
                      <button onClick={() => setDocuments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-6">
                <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Spinner size="sm" /> Submitting...</> : 'Submit Grievance'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4 — Success */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="card p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Grievance Registered!</h2>
              <p className="text-gray-500 mb-6">Your complaint has been submitted to the relevant authority</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <p className="text-xs text-gray-500 mb-1">Your Complaint ID</p>
                <p className="text-3xl font-bold text-blue-700 font-mono">{generatedId}</p>
                <p className="text-xs text-gray-400 mt-1">Save this ID to track your complaint</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-sm text-yellow-800">
                ⚠️ An officer will be assigned within 24 hours. You'll receive updates via SMS and email.
              </div>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => router.push('/citizen')}>Dashboard</button>
                <button className="btn-primary flex-1" onClick={() => router.push(`/citizen/track/${generatedId}`)}>Track Complaint</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
