import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { askVoiceAssistant } from '../lib/gemini';
import { NIRAJ_PHOTO_URL } from '../constants';
import { Logo } from './Logo';
import { PermissionManager } from './PermissionManager';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Brain, ArrowLeft, RefreshCw, Send, User, Bot, Zap, ShieldCheck, X } from 'lucide-react';

export const VoiceAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Namaste! Main NIRAJ AI hoon. Main aapka powerful AI Assistant hoon. Aap mujhse live baat kar sakte hain. Main duniya bhar ka knowledge rakhta hoon. Poochiye, main aapki kaise madad kar sakta hoon?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPermissionManager, setShowPermissionManager] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [permissionStatus, setPermissionStatus] = useState<PermissionState | 'prompt'>('prompt');

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as any });
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      } catch (e) {
        console.error("Permission check failed", e);
      }
    };
    checkPermission();
  }, []);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      return true;
    } catch (e) {
      setPermissionStatus('denied');
      return false;
    }
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'hi-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSend(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          setPermissionStatus('denied');
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_]/g, ''));
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    
    const userMsg = { role: 'user' as const, text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const aiText = await askVoiceAssistant(text);
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
      speak(aiText);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsLive(false);
    } else {
      if (permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      recognitionRef.current?.start();
      setIsListening(true);
      setIsLive(true);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate('/')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black flex items-center gap-2">
            <Zap size={18} className="text-yellow-500" /> AI Assistant
          </h2>
          <div className="flex items-center gap-2">
            <p className="text-gray-500 text-[10px]">Live Talk & Knowledge</p>
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase rounded-full border border-blue-200 dark:border-blue-800">
              Gemini 3.1
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 p-3 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-inner relative">
        {isLive && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-500/20">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            Live Session
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-xl flex gap-2 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700'
              }`}>
                <div className="mt-0.5">
                  {msg.role === 'user' ? (
                    <User size={14} />
                  ) : (
                    <Logo size="sm" className="w-4 h-4" rounded="rounded-full" />
                  )}
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin text-blue-500" />
              <span className="text-xs font-bold text-gray-400">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        {isListening && (
          <div className="flex items-end gap-1 h-8 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <motion.div
                key={i}
                animate={{ height: [8, 32, 8] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }}
                className="w-1.5 bg-blue-500 rounded-full"
              />
            ))}
          </div>
        )}
        {permissionStatus === 'denied' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1e1e1e] border border-blue-100 dark:border-blue-900/20 p-3 rounded-2xl shadow-lg flex flex-col items-center text-center gap-2 mb-2 w-full relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
            <div className="flex items-center gap-3 w-full px-2">
              <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="text-left">
                <h4 className="font-black text-xs">Microphone Access Required</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Enable mic in settings to talk with NIRAJ AI.
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <button 
                onClick={requestPermission}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all active:scale-95"
              >
                Grant Access
              </button>
              <button 
                onClick={() => setShowPermissionManager(true)}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                How to Fix?
              </button>
            </div>
          </motion.div>
        )}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask anything..."
              className="w-full px-4 py-3 bg-white dark:bg-[#1e1e1e] border-2 border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-md text-sm"
            />
          </div>
          
          <button 
            onClick={() => handleSend(input)}
            disabled={!input.trim() || loading}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 active:scale-95"
          >
            <Send size={20} />
          </button>

          <button 
            onClick={toggleListening}
            className={`p-3 rounded-xl shadow-md transition-all active:scale-90 ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>
        
        {isSpeaking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest"
          >
            <Volume2 size={16} className="animate-bounce" />
            AI is speaking...
          </motion.div>
        )}
      </div>

      {/* Permission Manager Modal */}
      <AnimatePresence>
        {showPermissionManager && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPermissionManager(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-[32px] p-6 shadow-2xl relative z-10"
            >
              <PermissionManager onClose={() => setShowPermissionManager(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
