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

  // ✅ FIX 1: Better translation handling
  const translateText = async (text: string, targetLang: string) => {
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
      );
      const data = await res.json();

      if (!data || !data[0]) return text;

      return data[0]
        .map((item: any) => item[0])
        .filter(Boolean)
        .join('');
    } catch (err) {
      console.error('Translation failed:', err);
      return text;
    }
  };

  const handleLanguageClick = async (text: string, lang: string) => {
  setShowPopup(true);
  setLoadingTranslate(true);

  // Translate for popup
  const translated = await translateText(text, lang);
  setTranslatedText(translated);
  setLoadingTranslate(false);

  // 🔊 Speak ONLY for English & Hindi
  if (lang === 'en' || lang === 'hi') {
    speak(text, lang);
  }
};

  // ✅ FIX 2: Proper speech with voice selection
  const speak = async (text: string, lang: string = 'en') => {
    try {
      if (lang === 'bhojpuri') lang = 'hi';

      const translated = await translateText(text, lang);

      const utterance = new SpeechSynthesisUtterance(translated);

      const langMap: Record<string, string> = {
        en: 'en-US',
        hi: 'hi-IN',
        bn: 'bn-IN',
        gu: 'gu-IN',
        pa: 'pa-IN',
        or: 'or-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        te: 'te-IN',
        ta: 'ta-IN',
      };

      const targetLang = langMap[lang] || 'en-US';
      utterance.lang = targetLang;

      // ✅ FIX 3: pick correct voice
      const voices = speechSynthesis.getVoices();
      
      const matchedVoice = voices.find(v => v.lang === targetLang);

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);

    } catch (err) {
      console.error('Speech failed:', err);
    }
  };

  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
const [showPopup, setShowPopup] = useState(false);
const [loadingTranslate, setLoadingTranslate] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // ✅ FIX 4: ensure voices load (VERY IMPORTANT)
  useEffect(() => {
    speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      speechSynthesis.getVoices();
    };
  }, []);

  useEffect(() => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  // Auto-detect language (best effort)
  recognition.lang = 'en-US';

  recognition.onresult = async (event: any) => {
    const spokenText = event.results[0][0].transcript;

    // 🔥 Translate spoken text to English
    const translated = await translateText(spokenText, 'en');

    setText(translated);
  };

  recognition.onerror = (err: any) => {
    console.error('Speech recognition error:', err);
  };

  recognitionRef.current = recognition;
}, []);
  const { data: complaintData } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.get(id),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagesApi.list(id),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  const sendMutation = useMutation({
    mutationFn: (msg: string) => messagesApi.send(id, msg),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', id] });

      window.dispatchEvent(new Event('messageSent'));
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
    if (complaint?.status === 'resolved') {
      toast.error('Complaint is resolved');
      return;
    }
    sendMutation.mutate(trimmed);
  };

  if (isLoading) return <PageLoader />;

  const otherName =
    user?.role === 'citizen'
      ? complaint?.officer_name
      : complaint?.citizen_name;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GovHeader
        title={`Chat — ${id}`}
        subtitle={otherName ? `With ${otherName}` : ''}
        backHref={backHref}
      />

      <div className="flex-1 container mx-auto px-4 py-4 max-w-2xl flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              No messages yet. Start the conversation.
            </div>
          )}

          {messages.map(m => {
            const isMe = m.sender_id === user?.id;

            return (
              <div key={m.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 text-sm',
                    isMe
                      ? 'bg-blue-800 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                  )}
                >
                  {!isMe && (
                    <div className="text-xs font-semibold mb-1 text-blue-700">
                      {m.sender_name}
                    </div>
                  )}

                  <p className="leading-relaxed">{m.message}</p>

                  {/* ✅ LANGUAGE BUTTONS */}
                  <div className="flex flex-wrap gap-2 mt-1 text-xs">
  <button onClick={() => handleLanguageClick(m.message, 'en')} className="text-blue-500">EN</button>
  <button onClick={() => handleLanguageClick(m.message, 'hi')} className="text-green-600">हिंदी</button>
  <button onClick={() => handleLanguageClick(m.message, 'bn')} className="text-purple-600">বাংলা</button>
  <button onClick={() => handleLanguageClick(m.message, 'gu')} className="text-orange-600">ગુજરાતી</button>
  <button onClick={() => handleLanguageClick(m.message, 'mr')} className="text-pink-600">मराठी</button>
  <button onClick={() => handleLanguageClick(m.message, 'pa')} className="text-yellow-600">ਪੰਜਾਬੀ</button>
  <button onClick={() => handleLanguageClick(m.message, 'kn')} className="text-indigo-600">ಕನ್ನಡ</button>
  <button onClick={() => handleLanguageClick(m.message, 'ml')} className="text-teal-600">മലയാളം</button>
  <button onClick={() => handleLanguageClick(m.message, 'te')} className="text-red-600">తెలుగు</button>
  <button onClick={() => handleLanguageClick(m.message, 'ta')} className="text-gray-700">தமிழ்</button>
</div>

                  <div className={clsx('text-xs mt-1', isMe ? 'text-blue-200' : 'text-gray-400')}>
                    {format(new Date(m.created_at), 'h:mm a')}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        <div className="card p-3 flex gap-2 items-center">
          <input
            className="input flex-1"
            placeholder={complaint?.status === 'resolved' ? 'Complaint is resolved' : 'Type a message...'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={complaint?.status === 'resolved'}
          />
          {/* 🎤 Mic Button */}
  <button
    onClick={() => recognitionRef.current?.start()}
    className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
  >
    🎤
  </button>
  {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="btn-primary flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showPopup && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-lg relative">

      {/* Close button */}
      <button
        onClick={() => setShowPopup(false)}
        className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 text-lg"
      >
        ✕
      </button>

      <h3 className="font-semibold text-gray-800 mb-2">Translated Text</h3>

      {loadingTranslate ? (
        <p className="text-sm text-gray-400">Translating...</p>
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed">
          {translatedText}
        </p>
      )}
    </div>
  </div>
)}
    </div>
  );
}