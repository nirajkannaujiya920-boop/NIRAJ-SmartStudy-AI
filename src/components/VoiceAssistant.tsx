import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, ArrowLeft, RefreshCw, BrainCircuit, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { askVoiceAssistant } from '../lib/gemini';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const VoiceAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const hasTriggeredRef = useRef(false);
  const currentTranscriptRef = useRef('');

  // Initialize Speech Recognition
  const initRecognition = () => {
    if (recognitionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        hasTriggeredRef.current = false;
        currentTranscriptRef.current = '';
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const resultTranscript = event.results[current][0].transcript;
        setTranscript(resultTranscript);
        currentTranscriptRef.current = resultTranscript;
        
        if (event.results[current].isFinal) {
          hasTriggeredRef.current = true;
          handleQuery(resultTranscript);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // If it ended without triggering isFinal (e.g. manual stop), trigger now
        if (!hasTriggeredRef.current && currentTranscriptRef.current.trim()) {
          hasTriggeredRef.current = true;
          handleQuery(currentTranscriptRef.current);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError("Microphone access denied. Please enable it in settings.");
        } else {
          setError(`Mic Error: ${event.error}`);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setError("Speech recognition is not supported in this browser.");
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    try {
      const aiResponse = await askVoiceAssistant(queryText);
      setResponse(aiResponse);
      speak(aiResponse);
    } catch (err: any) {
      setError("Failed to get response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    
    // Clean text for speech (remove markdown-like characters if any)
    const cleanText = text.replace(/[*#_~`]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Detect language for better voice selection
    const isHindi = /[\u0900-\u097F]/.test(cleanText);
    utterance.lang = isHindi ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      setIsSpeaking(false);
    };
    
    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    // Unlock TTS on first interaction
    if (!isInitialized) {
      const dummy = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(dummy);
      setIsInitialized(true);
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      initRecognition();
      setTranscript('');
      setResponse('');
      setError(null);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Failed to start recognition:", err);
        // If already started or other error, try to reset
        recognitionRef.current?.stop();
        setTimeout(() => {
          try { recognitionRef.current?.start(); } catch(e) {}
        }, 100);
      }
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 text-center pr-10">
          <h2 className="text-2xl font-black">NIRAJ AI Voice Assistant</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Bolkar sawal puchein (Ask by speaking)</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12 p-6 bg-white dark:bg-[#1e1e1e] rounded-[40px] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence>
            {isListening && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-64 h-64 bg-blue-500/10 rounded-full animate-ping" />
                <div className="absolute w-48 h-48 bg-blue-500/5 rounded-full animate-pulse" />
              </motion.div>
            )}
            {isSpeaking && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-full h-full bg-purple-500/5 backdrop-blur-[2px]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status & Visualizer */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl cursor-pointer ${
            isListening ? 'bg-red-500 shadow-red-500/40 scale-110' : 
            isSpeaking ? 'bg-purple-600 shadow-purple-500/40 scale-105' : 
            'bg-blue-600 shadow-blue-500/40'
          }`}
          onClick={toggleListening}
          >
            {isListening ? <Mic size={48} className="text-white animate-pulse" /> : 
             isSpeaking ? <Volume2 size={48} className="text-white" /> : 
             <BrainCircuit size={48} className="text-white" />}
          </div>
          
          <div className="h-20 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isListening ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-3"
              >
                <p className="text-red-500 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  Listening...
                </p>
                <button 
                  onClick={() => recognitionRef.current?.stop()}
                  className="px-4 py-1.5 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-200 transition-colors border border-red-200"
                >
                  Stop Listening
                </button>
              </motion.div>
            ) : isSpeaking ? (
                <motion.p 
                  key="speaking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-purple-600 font-bold"
                >
                  Speaking...
                </motion.p>
              ) : loading ? (
                <motion.p 
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-blue-600 font-bold flex items-center gap-2"
                >
                  <RefreshCw size={16} className="animate-spin" />
                  Thinking...
                </motion.p>
              ) : (
                <motion.p 
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-gray-400 font-medium"
                >
                  Tap the mic to ask anything
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Transcript & Response Area */}
        <div className="w-full max-w-md space-y-6 relative z-10">
          <AnimatePresence>
            {transcript && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-end"
              >
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-2xl rounded-tr-none border border-blue-100 dark:border-blue-900/30 max-w-[85%] shadow-sm">
                  <p className="text-sm font-medium">{transcript}</p>
                </div>
              </motion.div>
            )}

            {response && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-5 py-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 max-w-[90%] shadow-md relative group">
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                    <Sparkles size={12} /> NIRAJ AI
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown 
                      remarkPlugins={[remarkMath]} 
                      rehypePlugins={[rehypeKatex]}
                    >
                      {response}
                    </Markdown>
                  </div>
                  <button 
                    onClick={() => speak(response)}
                    className="absolute -right-10 top-0 p-2 text-gray-400 hover:text-purple-600 transition-all"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-center text-xs"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 relative z-10">
          <button 
            onClick={stopSpeaking}
            disabled={!isSpeaking}
            className={`p-4 rounded-full transition-all ${isSpeaking ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200' : 'text-gray-300 opacity-30'}`}
          >
            <VolumeX size={24} />
          </button>

          <button 
            onClick={toggleListening}
            disabled={loading}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all active:scale-90 shadow-xl ${
              isListening ? 'bg-red-500 ring-8 ring-red-500/20' : 'bg-blue-600 hover:bg-blue-700 ring-8 ring-blue-500/10'
            }`}
          >
            {isListening ? (
              <>
                <MicOff size={32} className="text-white" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white mt-1">Stop</span>
              </>
            ) : (
              <Mic size={40} className="text-white" />
            )}
          </button>

          <button 
            onClick={() => setResponse('')}
            className="p-4 rounded-full text-gray-300 hover:text-gray-600 transition-all"
          >
            <RefreshCw size={24} />
          </button>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Try Asking</p>
          <p className="text-xs font-medium">"2 plus 3 kitna hota hai?"</p>
        </div>
        <div className="p-3 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Try Asking</p>
          <p className="text-xs font-medium">"Newton ka pehla niyam kya hai?"</p>
        </div>
      </div>
    </div>
  );
};
