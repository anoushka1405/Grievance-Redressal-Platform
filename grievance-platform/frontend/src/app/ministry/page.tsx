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
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
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
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Ministry Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />

                <button
                  className="btn-primary"
                  disabled={!newName.trim()}
                  onClick={async () => {
                    await ministriesApi.create({
                      name: newName,
                      jurisdiction: 'National',
                      categories: [],
                      contact: '',
                      escalation_level: 1,
                    });

                    setNewName('');
                    setShowAdd(false);
                    queryClient.invalidateQueries({ queryKey: ['ministries'] });// simple refresh
                  }}
                >
                  Save
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
                  <button className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : m.id)}>
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
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/ministry/officers?ministryId=${m.id}`);
                            }}
                            className="text-xs text-blue-600 hover:underline cursor-pointer"
                          >
                            Manage
                          </span>
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
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="border-t border-gray-100 overflow-hidden">
                        <div className="p-5">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Officers ({ministryOfficers.length})</h4>
                          {ministryOfficers.length === 0 ? (
                            <p className="text-sm text-gray-400">No officers listed</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {ministryOfficers.map(o => (
                                <div
                                  key={o.id}
                                  onClick={() => router.push(`/officer/${o.id}`)}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                                >
                                  {o.photo_url ? (
                                    <img src={o.photo_url} alt={o.name} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                                      {o.name.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-gray-800">{o.name}</div>
                                    <div className="text-xs text-gray-500">{o.designation}</div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                      <span className="text-xs text-gray-500">{parseFloat(String(o.rating)).toFixed(1)} · {o.total_resolved} resolved</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
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
      </main>
    </div>
  );
}
