import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Brain, ArrowLeft, RefreshCw, Send, User, Bot, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBC8JYIHmbtOD4MWepyc74d6nYrZNHjLv4";
const ai = new GoogleGenAI({ apiKey });

export const VoiceAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Hello! I am your powerful AI Assistant. I have knowledge of the entire world and I'm here to help you with anything. You can talk to me live!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSend(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
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
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `You are a powerful, all-knowing AI assistant. You have deep knowledge of the world, science, history, and current events. Answer the following user query in a helpful, concise, and intelligent way. User query: ${text}` }] }
        ],
      });

      const aiText = response.text || "I'm sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
      speak(aiText);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Zap className="text-yellow-500" /> Powerful AI Assistant
          </h2>
          <p className="text-gray-500 text-sm">Live Talk & Global Knowledge</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 mb-6 p-4 bg-white dark:bg-[#1e1e1e] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-inner"
      >
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700'
              }`}>
                <div className="mt-1">
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} className="text-blue-500" />}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
        <div className="flex items-center gap-4 w-full">
          <div className="relative flex-1">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask anything..."
              className="w-full px-6 py-4 bg-white dark:bg-[#1e1e1e] border-2 border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-lg"
            />
            <button 
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
              className="absolute right-2 top-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
          
          <button 
            onClick={toggleListening}
            className={`p-5 rounded-full shadow-xl transition-all active:scale-90 ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isListening ? <MicOff size={28} /> : <Mic size={28} />}
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
    </div>
  );
};
