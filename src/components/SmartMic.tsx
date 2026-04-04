import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Languages, RefreshCw, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translateText } from '../lib/gemini';

interface SmartMicProps {
  onResult: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export const SmartMic: React.FC<SmartMicProps> = ({ onResult, placeholder, className }) => {
  const [isListening, setIsListening] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [targetLang, setTargetLang] = useState('Hindi');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const languages = [
    'Hindi', 'English', 'Sanskrit', 'French', 'German', 'Spanish', 'Japanese', 'Korean', 'Arabic', 'Russian'
  ];

  useEffect(() => {
    let recognition: any = null;

    if (isListening) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

        recognition.onresult = (event: any) => {
          let final = '';
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (final) setTranscript(prev => prev + ' ' + final);
          setInterimTranscript(interim);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'not-allowed') {
            setError('Mic permission denied. Please allow mic access.');
          } else {
            setError(`Error: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          if (isListening) {
            try {
              recognition.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
            }
          }
        };

        try {
          recognition.start();
          setError(null);
        } catch (e) {
          console.error("Failed to start recognition:", e);
          setError("Failed to start mic.");
          setIsListening(false);
        }
      } else {
        setError('Speech recognition not supported in this browser.');
        setIsListening(false);
      }
    }

    return () => {
      if (recognition) {
        recognition.onend = null;
        recognition.stop();
      }
    };
  }, [isListening]);

  const handleTranslate = async () => {
    if (!transcript || isTranslating) return;
    setIsTranslating(true);
    try {
      const translated = await translateText(transcript, targetLang);
      setTranscript(translated || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleConfirm = () => {
    onResult(transcript);
    setTranscript('');
    setIsListening(false);
    setShowTranslate(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsListening(!isListening)}
        className={`p-3 rounded-2xl transition-all shadow-lg ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title="Smart Mic"
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      <AnimatePresence>
        {(isListening || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-full mb-4 right-0 w-80 bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4 z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Smart Mic Active</span>
              <button onClick={() => { setIsListening(false); setTranscript(''); }} className="text-gray-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>

            <div className="min-h-[60px] p-3 bg-gray-50 dark:bg-gray-900 rounded-xl mb-3 text-sm font-medium relative">
              <div className="text-gray-800 dark:text-gray-200">
                {transcript}
                <span className="text-gray-400">{interimTranscript}</span>
              </div>
              {!transcript && !interimTranscript && (
                <div className="text-gray-400 italic">
                  {isListening ? 'Listening...' : 'Speak now...'}
                </div>
              )}
              {isListening && (
                <div className="absolute top-2 right-2 flex gap-0.5">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 12, 4] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 bg-blue-500 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] rounded-lg border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setShowTranslate(!showTranslate)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition-all"
              >
                <Languages size={12} />
                Translate
              </button>
              {transcript && (
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] font-bold hover:bg-green-600 transition-all ml-auto"
                >
                  <Check size={12} />
                  Use Text
                </button>
              )}
            </div>

            <AnimatePresence>
              {showTranslate && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800"
                >
                  <div className="flex flex-wrap gap-1">
                    {languages.map(l => (
                      <button
                        key={l}
                        onClick={() => setTargetLang(l)}
                        className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                          targetLang === l ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !transcript}
                    className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isTranslating ? <RefreshCw size={12} className="animate-spin" /> : <Languages size={12} />}
                    Translate to {targetLang}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
