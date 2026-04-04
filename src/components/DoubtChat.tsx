import React, { useState, useRef, useEffect } from 'react';
import { Send, BrainCircuit, Sparkles, RefreshCw, User, GraduationCap, ArrowLeft, Camera, Image as ImageIcon, X, Save, Check, Volume2, ShieldCheck, Trash2, ChevronDown } from 'lucide-react';
import { NIRAJ_PHOTO_URL } from '../constants';
import { askDoubtTeacherStyle } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Logo } from './Logo';
import { SmartMic } from './SmartMic';
import { ImagePicker } from './ImagePicker';

export const DoubtChat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, image?: string }[]>([
    { role: 'ai', text: "Namaste! Ji han, main NIRAJ AI hoon. Main aapka personal AI Teacher hoon. Aap mujhse koi bhi doubt pooch sakte hain, ya photo bhej kar bhi sawal pooch sakte hain. Main aapko ek teacher ki tarah simple language mein samjhaunga. 😊" }
  ]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [lang, setLang] = useState<'hindi' | 'english' | 'hinglish'>('hinglish');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
      }
    };
    const current = scrollRef.current;
    current?.addEventListener('scroll', handleScroll);
    return () => current?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([{ role: 'ai', text: "Namaste! Ji han, main NIRAJ AI hoon. Main aapka personal AI Teacher hoon. Aap mujhse koi bhi doubt pooch sakte hain, ya photo bhej kar bhi sawal pooch sakte hain. Main aapko ek teacher ki tarah simple language mein samjhaunga. 😊" }]);
    }
  };

  useEffect(() => {
    if (scrollRef.current && !showScrollBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showScrollBottom]);

  const [cameraPermission, setCameraPermission] = useState<PermissionState | 'prompt'>('prompt');

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as any });
        setCameraPermission(result.state);
        result.onchange = () => setCameraPermission(result.state);
      } catch (e) {
        console.error("Camera permission check failed", e);
      }
    };
    checkPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      return true;
    } catch (e) {
      setCameraPermission('denied');
      return false;
    }
  };

  const handleImageSelect = (base64: string) => {
    setImage(base64);
  };

  const handleSend = async () => {
    if ((!input.trim() && !image) || loading) return;
    if (!navigator.onLine) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "⚠️ **Offline Error:** AI Teacher requires an internet connection. Please check your network and try again.",
        isError: true 
      }]);
      return;
    }
    const userMsg = { role: 'user' as const, text: input, image: image || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setImage(null);
    setLoading(true);
    try {
      const base64 = userMsg.image ? userMsg.image.split(',')[1] : undefined;
      const res = await askDoubtTeacherStyle(userMsg.text, base64, lang);
      setMessages(prev => [...prev, { role: 'ai', text: res }]);
      
      // Auto-speak if enabled
      const autoSpeak = JSON.parse(localStorage.getItem('autoSpeak') || 'false');
      if (autoSpeak) {
        handleSpeak(res);
      }
      
      // Automatic save to notes
      if (auth.currentUser) {
        await addDoc(collection(db, 'notes'), {
          userId: auth.currentUser.uid,
          title: `AI Teacher: ${userMsg.text.substring(0, 20) || 'Doubt'}...`,
          content: res,
          createdAt: serverTimestamp(),
          tags: ['AI Teacher', 'Auto-Saved']
        });
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "AI Teacher is currently busy. Please try again later.";
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: `⚠️ **Error:** ${errorMessage}\n\n[Click here to retry last message]`,
        isError: true 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const retryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      setMessages(prev => prev.filter((m, i) => i !== prev.length - 1)); // Remove error message
      setInput(lastUserMsg.text);
      setImage(lastUserMsg.image || null);
      setMessages(prev => prev.filter((m, i) => i !== prev.length - 1)); // Remove last user message (it will be re-added)
      handleSend();
    }
  };

  const handleSpeak = (t: string) => {
    if (!t) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(t.replace(/[#*`_]/g, ''));
    if (lang === 'hindi') utterance.lang = 'hi-IN';
    else if (lang === 'english') utterance.lang = 'en-US';
    else utterance.lang = 'hi-IN'; // Default for hinglish
    window.speechSynthesis.speak(utterance);
  };

  const saveToNotes = async (text: string, index: number) => {
    if (!auth.currentUser) return;
    setSaving(index);
    try {
      await addDoc(collection(db, 'notes'), {
        userId: auth.currentUser.uid,
        title: `AI Doubt: ${text.substring(0, 20)}...`,
        content: text,
        createdAt: serverTimestamp(),
        tags: ['AI Doubt', 'Study']
      });
      setTimeout(() => setSaving(null), 2000);
    } catch (err) {
      console.error(err);
      setSaving(null);
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] flex flex-col bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
      <div className="p-3 bg-blue-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
            <GraduationCap size={20} />
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest">AI Teacher</h3>
            <p className="text-[8px] text-blue-100 opacity-80">Explain like teacher</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearChat}
            className="p-2 text-blue-100 hover:text-white transition-colors"
            title="Clear Chat"
          >
            <Trash2 size={20} />
          </button>
          <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md">
          {(['hindi', 'english', 'hinglish'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${
                lang === l 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              {l === 'hinglish' ? 'Mix' : l}
            </button>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Online
        </div>
      </div>
    </div>

    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth relative">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-xl shadow-sm relative group ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-50 dark:bg-gray-900/50 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-800'
              }`}>
                <div className="flex items-center gap-2 mb-1.5 opacity-50 text-[8px] font-black uppercase tracking-widest">
                  {msg.role === 'user' ? (
                    <User size={10} />
                  ) : (
                    <Logo size="sm" className="w-3 h-3" rounded="rounded-full" />
                  )}
                  {msg.role === 'user' ? 'Aap' : 'NIRAJ AI'}
                </div>
                {msg.image && (
                  <img 
                    src={msg.image} 
                    alt="User upload" 
                    referrerPolicy="no-referrer"
                    className="w-full h-32 object-cover rounded-lg mb-2 border border-gray-100 dark:border-gray-800" 
                  />
                )}
                <div className="prose prose-xs dark:prose-invert max-w-none">
                  <Markdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {msg.text}
                  </Markdown>
                </div>
                {msg.role === 'ai' && (msg as any).isError && (
                  <button 
                    onClick={retryLastMessage}
                    className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 underline"
                  >
                    Retry Now
                  </button>
                )}
                {msg.role === 'ai' && idx > 0 && !(msg as any).isError && (
                  <div className="absolute -right-10 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleSpeak(msg.text)}
                      className="p-2 text-gray-400 hover:text-blue-500"
                      title="Listen"
                    >
                      <Volume2 size={16} />
                    </button>
                    <button 
                      onClick={() => saveToNotes(msg.text, idx)}
                      className="p-2 text-gray-400 hover:text-blue-500"
                      title="Save to Notes"
                    >
                      {saving === idx ? <Check size={16} className="text-green-500" /> : <Save size={16} />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 w-10 h-10 bg-white dark:bg-gray-800 text-blue-600 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center z-10"
            >
              <ChevronDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin text-blue-600" />
              <span className="text-xs font-bold text-gray-400">AI Teacher is typing...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 space-y-3">
        <AnimatePresence>
          {image && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-blue-500"
            >
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => setImage(null)}
                className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full"
              >
                <X size={10} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <ImagePicker onImageSelect={handleImageSelect} className="mb-1" />
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask doubt..."
                className="flex-1 px-4 py-3 bg-white dark:bg-[#1e1e1e] border-2 border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm text-sm"
              />
              <SmartMic onResult={(text) => setInput(prev => prev + ' ' + text)} />
            </div>
          </div>
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !image) || loading}
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              loading 
                ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' 
                : 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-blue-500/20 hover:scale-105'
            }`}
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <div className="flex flex-col items-center"><Send size={16} /><span className="text-[7px] font-black uppercase">Send</span></div>}
          </button>
        </div>
      </div>
    </div>
  );
};
