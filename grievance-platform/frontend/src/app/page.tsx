'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Building2, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import GovHeader from '@/components/GovHeader';
import Link from 'next/link';

<Link href="/ministry/signup">
  <p style={{ color: 'blue', cursor: 'pointer', marginTop: '10px' }}>
    New Ministry? Sign up here
  </p>
</Link>

type Tab = 'citizen' | 'officer' | 'ministry';
type CitizenMode = 'login' | 'signup';

export default function LandingPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>('citizen');
  const [citizenMode, setCitizenMode] = useState<CitizenMode>('login');
  const [loading, setLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (tab === 'citizen' && citizenMode === 'signup') {
        res = await authApi.register({ name, email, password, phone, role: 'citizen' });
      } else {
        res = await authApi.login(email, password);
        // Enforce role match
        const role = res.data.user.role;
        if (tab === 'officer' && role !== 'officer') { toast.error('Not an officer account'); return; }
        if (tab === 'ministry' && role !== 'ministry') { toast.error('Not a ministry account'); return; }
      }
      login(res.data.token, res.data.user);
      toast.success('Welcome!');
      const role = res.data.user.role;
      if (role === 'officer') router.push('/officer');
      else if (role === 'ministry') router.push('/ministry');
      else router.push('/citizen');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'citizen', label: 'Citizen', icon: <User className="w-4 h-4" /> },
    { id: 'officer', label: 'Officer', icon: <Shield className="w-4 h-4" /> },
    { id: 'ministry', label: 'Ministry', icon: <Building2 className="w-4 h-4" /> },
  ];

  const stats = [
    { value: '2.5 Cr+', label: 'Grievances Resolved', color: 'text-green-600', border: 'border-green-500' },
    { value: '87%', label: 'Resolution Rate', color: 'text-blue-600', border: 'border-blue-500' },
    { value: '15 Days', label: 'Avg Resolution Time', color: 'text-purple-600', border: 'border-purple-500' },
    { value: '24 Hrs', label: 'Officer Assignment', color: 'text-orange-600', border: 'border-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <GovHeader showUser={false} />

      {/* Hero */}
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full mb-4 text-sm font-medium">
            <Shield className="w-4 h-4" />
            Trusted by 50+ Crore Citizens
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Your Voice Matters</h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            A secure, transparent platform for citizens to register grievances and track resolution in real-time.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-4xl mx-auto">
          {stats.map(s => (
            <div key={s.label} className={`card text-center p-4 border-t-4 ${s.border}`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Auth Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="max-w-md mx-auto">
          {/* Role tabs */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6 bg-white shadow-sm">
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setEmail(''); setPassword(''); setName(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
                  ${tab === t.id ? 'bg-blue-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="card p-6">
            {tab === 'citizen' && (
              <div className="flex gap-2 mb-5">
                {(['login', 'signup'] as CitizenMode[]).map(m => (
                  <button key={m} onClick={() => setCitizenMode(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                      ${citizenMode === m ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {m === 'login' ? 'Login' : 'Sign Up'}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'citizen' && citizenMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input className="input" placeholder="As per Aadhaar" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input className="input" type="tel" placeholder="10-digit mobile" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tab === 'officer' ? 'Official Email (@gov.in)' : 'Email Address'} *
                </label>
                <input className="input" type="email"
                  placeholder={tab === 'officer' ? 'officer@gov.in' : 'your@email.com'}
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input className="input" type="password" placeholder="Enter password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? 'Please wait...' : (
                  <>
                    {tab === 'citizen' && citizenMode === 'signup' ? 'Create Account' : 'Login'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            {tab === 'ministry' && (
              <div className="mt-4 text-center">
                <Link href="/ministry/signup" className="text-blue-600 hover:underline text-sm">
                  New Ministry? Sign up here
                </Link>
              </div>
            )}

            {/* Demo credentials hint */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <strong>Demo:</strong> arjun.mehta@email.com / citizen123 &nbsp;|&nbsp; rajesh.kumar@gov.in / officer123
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-white py-12 mt-8 border-t">
        <div className="container mx-auto px-4">
          <h3 className="text-xl font-bold text-center text-gray-800 mb-8">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: <Shield className="w-7 h-7 text-blue-600" />, bg: 'bg-blue-100', title: 'Secure & Transparent', desc: 'JWT-authenticated grievance tracking with complete audit trail' },
              { icon: <CheckCircle className="w-7 h-7 text-green-600" />, bg: 'bg-green-100', title: 'Real-time Tracking', desc: 'Live status updates from Submitted → Assigned → In Progress → Resolved' },
              { icon: <User className="w-7 h-7 text-purple-600" />, bg: 'bg-purple-100', title: 'Direct Communication', desc: 'Built-in chat system between citizens and assigned officers' },
            ].map(f => (
              <div key={f.title} className="text-center">
                <div className={`w-14 h-14 ${f.bg} rounded-full flex items-center justify-center mx-auto mb-3`}>{f.icon}</div>
                <h4 className="font-semibold text-gray-800 mb-1">{f.title}</h4>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-6 text-center text-xs text-gray-400">
        <p>© 2026 Government of India. All Rights Reserved. | National Informatics Centre (NIC)</p>
        <p className="mt-1 opacity-50">Best viewed in Chrome, Firefox, Safari</p>
      </footer>
    </div>
  );
}
