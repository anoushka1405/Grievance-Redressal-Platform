'use client';
import { useAuth } from '@/context/AuthContext';
import { ministriesApi, officersApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import GovHeader from '@/components/GovHeader';
import { PageLoader, EmptyState } from '@/components/ui';
import { Ministry, Officer } from '@/lib/types';
import { Search, Building2, Phone, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

export default function MinistryRegistry() {
  const [managingId, setManagingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newMinistry, setNewMinistry] = useState({
  name: '',
  contact: '',
  jurisdiction: 'National',
  categories: '',
  escalation_level: 1,
});
  const [showAdd, setShowAdd] = useState(false);
  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading, router]);

  const { data: minData, isLoading } = useQuery({
    queryKey: ['ministries'],
    queryFn: () => ministriesApi.list(),
  });

  const { data: officerData } = useQuery({
    queryKey: ['officers'],
    queryFn: () => officersApi.list(),
  });
  // Inside MinistryRegistry function, near other useQuery calls
  const { data: topData } = useQuery({
    queryKey: ['top-officers'],
    queryFn: () => officersApi.list(),
    refetchInterval: 10000, // <--- Add this! (10000ms = 10 seconds)
    refetchOnWindowFocus: true, // Refetch when you switch back to this tab
  });

  if (authLoading) return <PageLoader />;

  const ministries: Ministry[] = minData?.data?.ministries || [];
  const officers: Officer[] = officerData?.data?.officers || [];

  const filtered = ministries.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.categories || []).some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  const getOfficers = (ministryId: string) =>
    officers.filter(o => o.ministry_id === ministryId);

  const escalationLabel = (n: number) =>
    n === 1 ? 'Ministry Level' : n === 2 ? 'Department Level' : 'Commission Level';
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this officer?")) return;
    try {
      // Note: Make sure process.env.NEXT_PUBLIC_API_URL is set in your .env
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/officers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      // Refreshes the list immediately
      queryClient.invalidateQueries({ queryKey: ['officers'] });
    } catch (err) {
      alert("Failed to remove officer");
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader title="Ministry Registry" subtitle="Central Government Directory" />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Government Ministries & Departments</h2>
            <p className="text-sm text-gray-500">{ministries.length} ministries registered</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input className="input pl-9 bg-white shadow-sm" placeholder="Search by ministry name or category..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {user?.role === 'ministry' && (
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Add Ministry</h3>
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="text-blue-600 text-sm"
              >
                {showAdd ? 'Cancel' : 'Add New'}
              </button>
            </div>


            {showAdd && (
  <div className="space-y-3">
    <input
      className="input"
      placeholder="Ministry Name"
      value={newMinistry.name}
      onChange={(e) => setNewMinistry({ ...newMinistry, name: e.target.value })}
    />

    <input
      className="input"
      placeholder="Contact Number"
      value={newMinistry.contact}
      onChange={(e) => setNewMinistry({ ...newMinistry, contact: e.target.value })}
    />

    <input
      className="input"
      placeholder="Jurisdiction (e.g. National)"
      value={newMinistry.jurisdiction}
      onChange={(e) => setNewMinistry({ ...newMinistry, jurisdiction: e.target.value })}
    />

    <input
      className="input"
      placeholder="Categories (comma separated)"
      value={newMinistry.categories}
      onChange={(e) => setNewMinistry({ ...newMinistry, categories: e.target.value })}
    />

    <select
      className="input"
      value={newMinistry.escalation_level}
      onChange={(e) => setNewMinistry({ ...newMinistry, escalation_level: Number(e.target.value) })}
    >
      <option value={1}>Ministry Level</option>
      <option value={2}>Department Level</option>
      <option value={3}>Commission Level</option>
    </select>

    <button
      className="btn-primary w-full"
      disabled={!newMinistry.name.trim()}
      onClick={async () => {
        await ministriesApi.create({
          ...newMinistry,
          categories: newMinistry.categories.split(',').map(c => c.trim())
        });

        setNewMinistry({
          name: '',
          contact: '',
          jurisdiction: 'National',
          categories: '',
          escalation_level: 1,
        });

        setShowAdd(false);
        queryClient.invalidateQueries({ queryKey: ['ministries'] });
      }}
    >
      Save Ministry
    </button>
  </div>
)}
          </div>
        )}

        {isLoading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState title="No results" desc="No ministries match your search" icon={<Building2 className="w-12 h-12" />} />
        ) : (
          <div className="space-y-3">
            {filtered.map((m, i) => {
              const ministryOfficers = getOfficers(m.id);
              const isOpen = expanded === m.id;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="card overflow-hidden">
                  <div
                    className="w-full text-left p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : m.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold text-gray-800">{m.name}</h3>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {escalationLabel(m.escalation_level)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                          <Phone className="w-3.5 h-3.5" />
                          <span>Helpline: {m.contact}</span>
                          <span className="text-gray-300">·</span>
                          <span>{m.jurisdiction}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(m.categories || []).map(c => (
                            <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {user?.role === 'ministry' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpanded(m.id); // Ensure it's open
                              setManagingId(managingId === m.id ? null : m.id); // Toggle management mode
                            }}
                            className={`text-xs px-2 py-1 rounded font-bold transition-colors ${managingId === m.id ? 'bg-gray-800 text-white' : 'text-blue-600 hover:bg-blue-50'
                              }`}
                          >
                            {managingId === m.id ? '← Done' : '⚙ Manage Officers'}
                          </button>
                        )}

                        <span className="text-xs text-gray-400">
                          {ministryOfficers.length} officers
                        </span>

                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-100 overflow-hidden"
                      >
                        <div className="p-5">
                          {managingId === m.id ? (
                            /* --- THE ADMIN LIST --- */
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold text-blue-800 uppercase tracking-tight">Officer Administration</h4>
                                <button
                                  onClick={() => router.push(`/ministry/officers?ministryId=${m.id}`)}
                                  className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow-sm"
                                >
                                  + Add New
                                </button>
                              </div>

                              <div className="border rounded-lg bg-white divide-y shadow-sm">
                                {ministryOfficers.length === 0 ? (
                                  <p className="p-4 text-xs text-gray-400 text-center italic">No officers to manage</p>
                                ) : (
                                  ministryOfficers.map(o => (
                                    <div key={o.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">{o.name}</span>
                                        <p className="text-[10px] text-gray-400">{o.designation}</p>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(o.id); }}
                                        className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ) : (
                            /* --- THE NORMAL CARDS VIEW --- */
                            <>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Officers Registry ({ministryOfficers.length})</h4>
                              {ministryOfficers.length === 0 ? (
                                <p className="text-sm text-gray-400">No officers listed</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {ministryOfficers.map(o => (
                                    <div
                                      key={o.id}
                                      onClick={() => router.push(`/ministry/officers/${o.id}`)}
                                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all shadow-sm"
                                    >
                                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                                        {o.name.charAt(0)}
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-800">{o.name}</div>
                                        <div className="text-xs text-gray-500">{o.designation}</div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                          <span className="text-[10px] text-gray-500">
                                            {parseFloat(String(o.rating || 0)).toFixed(1)} · {o.total_resolved || 0} resolved
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
          
        )}
        {/* 🔥 Top Performers Footer */}
        <div className="mt-10 border-t pt-8">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🏆 Top Performing Officers (This Week)
          </h3>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {(topData?.data?.officers || []).slice(0, 5).map((o: any, i: number) => (
              <div
                key={o.id}
                onClick={() => router.push(`/ministry/officers/${o.id}`)}
                className="min-w-[220px] bg-white border rounded-xl p-4 flex-shrink-0 text-center hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className={`text-2xl mb-1 ${i === 0 ? 'text-yellow-500' :
                  i === 1 ? 'text-gray-400' :
                    i === 2 ? 'text-orange-400' : 'text-blue-200'
                  }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>

                <div className="mt-1 font-bold text-gray-800 truncate">
                  {o.name}
                </div>

                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                  {o.designation}
                </div>

                <div className="flex justify-center items-center gap-1.5 bg-gray-50 rounded-full py-1 px-3 w-fit mx-auto mb-2">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-gray-700">
                    {parseFloat(o.rating || '0').toFixed(1)}
                  </span>
                </div>

                <div className="text-[10px] text-green-600 font-medium bg-green-50 rounded px-2 py-0.5 w-fit mx-auto">
                  {o.total_resolved || 0} resolved
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>

  );
}
