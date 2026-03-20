'use client';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi, complaintsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import GovHeader from '@/components/GovHeader';
import { PageLoader } from '@/components/ui';
import { Message, Complaint } from '@/lib/types';
import { Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { clsx } from 'clsx';

export default function ChatPage({ backHref }: { backHref: string }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: complaintData } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.get(id),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagesApi.list(id),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (msg: string) => messagesApi.send(id, msg),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', id] });
    },
    onError: () => toast.error('Failed to send message'),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  const messages: Message[] = data?.data?.messages || [];
  const complaint: Complaint | undefined = complaintData?.data;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (complaint?.status === 'resolved') { toast.error('Complaint is resolved'); return; }
    sendMutation.mutate(trimmed);
  };

  if (isLoading) return <PageLoader />;

  const otherName = user?.role === 'citizen' ? complaint?.officer_name : complaint?.citizen_name;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GovHeader title={`Chat — ${id}`} subtitle={otherName ? `With ${otherName}` : ''} backHref={backHref} />

      <div className="flex-1 container mx-auto px-4 py-4 max-w-2xl flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No messages yet. Start the conversation.</div>
          )}
          {messages.map(m => {
            const isMe = m.sender_id === user?.id;
            return (
              <div key={m.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                <div className={clsx('max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 text-sm',
                  isMe ? 'bg-blue-800 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm')}>
                  {!isMe && <div className="text-xs font-semibold mb-1 text-blue-700">{m.sender_name}</div>}
                  <p className="leading-relaxed">{m.message}</p>
                  <div className={clsx('text-xs mt-1', isMe ? 'text-blue-200' : 'text-gray-400')}>
                    {format(new Date(m.created_at), 'h:mm a')}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="card p-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder={complaint?.status === 'resolved' ? 'Complaint is resolved' : 'Type a message...'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={complaint?.status === 'resolved'}
          />
          <button onClick={handleSend} disabled={!text.trim() || sendMutation.isPending}
            className="btn-primary flex items-center gap-1.5">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
