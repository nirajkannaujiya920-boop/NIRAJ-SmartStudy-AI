import React, { useState, useRef, useEffect } from 'react';
import { Send, BrainCircuit, Sparkles, RefreshCw, User, GraduationCap, ArrowLeft, Camera, Image as ImageIcon, X, Save, Check, Volume2 } from 'lucide-react';
import { askDoubtTeacherStyle } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SmartMic } from './SmartMic';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !image) || loading) return;
    if (!navigator.onLine) {
      alert("AI Teacher requires an internet connection.");
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
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-white dark:bg-[#1e1e1e] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
      <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
            <GraduationCap size={24} />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-widest">AI Teacher Mode</h3>
            <p className="text-[10px] text-blue-100 opacity-80">"Explain like teacher" style</p>
          </div>
        </div>
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm relative group ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-50 dark:bg-gray-900/50 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-800'
              }`}>
                <div className="flex items-center gap-2 mb-2 opacity-50 text-[10px] font-black uppercase tracking-widest">
                  {msg.role === 'user' ? <User size={12} /> : <BrainCircuit size={12} />}
                  {msg.role === 'user' ? 'Aap' : 'AI Teacher'}
                </div>
                {msg.image && (
                  <img src={msg.image} alt="User upload" className="w-full h-32 object-cover rounded-xl mb-2" />
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
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
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin text-blue-600" />
              <span className="text-xs font-bold text-gray-400">AI Teacher is typing...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 space-y-4">
        <AnimatePresence>
          {image && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-500"
            >
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => setImage(null)}
                className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-all"
          >
            <Camera size={24} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your doubt or send photo..."
            className="flex-1 px-6 py-4 bg-white dark:bg-[#1e1e1e] border-2 border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
          <SmartMic onResult={(text) => setInput(prev => prev + ' ' + text)} />
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !image) || loading}
            className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
