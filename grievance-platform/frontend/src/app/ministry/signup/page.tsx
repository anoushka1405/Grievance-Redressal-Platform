'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authApi, ministriesApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Ministry } from '@/lib/types';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import GovHeader from '@/components/GovHeader';

export default function MinistrySignup() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', ministryId: '' });
  const [loading, setLoading] = useState(false);

  const { data: minData } = useQuery({
    queryKey: ['ministries'],
    queryFn: () => ministriesApi.list(),
  });
  const ministries: Ministry[] = minData?.data?.ministries || [];
  console.log("Ministry API:", minData);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.ministryId) {
      toast.error('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        role: 'ministry',
        ministryId: form.ministryId,
      });
      login(res.data.token, res.data.user);
      toast.success('Ministry account created!');
      router.push('/ministry');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Ministry Sign Up" subtitle="Create your ministry account" />
      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Ministry Registration</h2>
              <p className="text-sm text-gray-500">Link your account to a government ministry</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ministry *</label>
              <select className="input" value={form.ministryId} onChange={e => setForm(p => ({ ...p, ministryId: e.target.value }))}>
                <option value="">Select Ministry</option>
                {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            {[
              { key: 'name', label: 'Your Full Name *', placeholder: 'Ministry Representative Name' },
              { key: 'email', label: 'Official Email *', placeholder: 'name@ministry.gov.in' },
              { key: 'password', label: 'Password *', placeholder: 'Min 6 characters', type: 'password' },
              { key: 'phone', label: 'Phone (optional)', placeholder: '9XXXXXXXXX' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label}</label>
                <input className="input" type={f.type || 'text'} placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating Account...' : 'Create Ministry Account'}
            </button>
            <p className="text-center text-xs text-gray-500">
              Already have an account?{' '}
              <button onClick={() => router.push('/')} className="text-blue-600 hover:underline">Login here</button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}