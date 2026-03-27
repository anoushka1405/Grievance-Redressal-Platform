'use client';
import { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2, Mic, Volume2, VolumeX, Square } from 'lucide-react';
import { aiApi } from '@/lib/api';

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if bot is currently talking
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Namaste! I am your GovAssistant. I can speak in English, Hindi, Tamil, and many more languages. How can I help?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  // 🔊 Advanced Multilingual Text-to-Speech
  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis && !isMuted) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);

      // 🕵️ Multilingual Script Detection (Unicode Ranges)
      if (/[\u0B80-\u0BFF]/.test(text)) utterance.lang = 'ta-IN'; // Tamil
      else if (/[\u0900-\u097F]/.test(text)) utterance.lang = 'hi-IN'; // Hindi / Marathi
      else if (/[\u0C00-\u0C7F]/.test(text)) utterance.lang = 'te-IN'; // Telugu
      else if (/[\u0C80-\u0CFF]/.test(text)) utterance.lang = 'kn-IN'; // Kannada
      else if (/[\u0D00-\u0D7F]/.test(text)) utterance.lang = 'ml-IN'; // Malayalam
      else if (/[\u0980-\u09FF]/.test(text)) utterance.lang = 'bn-IN'; // Bengali
      else utterance.lang = 'en-IN'; // Default English

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // 🎙️ Voice Input (Speech-to-Text)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/m4a' });
        const formData = new FormData();
        formData.append('file', audioBlob);

        setIsLoading(true);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/speech-to-text`, {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.text) {
            setInput(data.text);
            handleSend(data.text);
          }
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone access is required for voice chat."); }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text: messageText }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await aiApi.chat(messageText, messages);
      const botText = res.data.response;
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
      speak(botText);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Error connecting to servers." }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="bg-blue-600 p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 group">
          <Bot className="text-white w-7 h-7" />
          <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
            How can I help you today?
          </div>
        </button>
      ) : (
        <div className="bg-white w-[360px] h-[520px] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex justify-between items-center text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><Bot size={20} /></div>
              <div>
                <p className="font-bold text-sm leading-tight">GovAssistant AI</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <p className="text-[10px] text-blue-100">Multilingual Support</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isSpeaking && (
                <button onClick={stopSpeaking} className="p-2 hover:bg-white/10 rounded-full text-red-200 transition-colors" title="Stop Speaking">
                  <Square size={16} fill="currentColor" />
                </button>
              )}
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/80 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm rounded-tl-none flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100 flex gap-2 items-center">
            <button 
              onMouseDown={startRecording} onMouseUp={stopRecording}
              className={`p-3 rounded-full transition-all shadow-sm ${isRecording ? 'bg-red-500 scale-110 text-white shadow-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="Hold to speak"
            >
              <Mic size={19} />
            </button>
            <input 
              className="flex-1 text-sm bg-gray-50 px-5 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-gray-100" 
              placeholder={isRecording ? "Listening..." : "Type or speak..."}
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={() => handleSend()} 
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-40 transition-all active:scale-95"
            >
              <Send size={19} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}