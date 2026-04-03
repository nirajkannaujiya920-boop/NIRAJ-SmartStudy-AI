import React, { useState } from 'react';
import { Volume2, Play, Pause, SkipBack, SkipForward, BookOpen, Music, Sparkles, RefreshCw, Languages, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateVoiceExplanation } from '../lib/gemini';
import { useNavigate } from 'react-router-dom';

export const VoiceLearning: React.FC = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNote, setCurrentNote] = useState(0);
  const [topicInput, setTopicInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'hindi' | 'english'>('hindi');

  const [notes, setNotes] = useState([
    { title: "Photosynthesis Basics", content: "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water." },
    { title: "Newton's First Law", content: "An object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force." },
    { title: "Chemical Bonding", content: "A chemical bond is a lasting attraction between atoms, ions or molecules that enables the formation of chemical compounds." }
  ]);

  const togglePlay = (text?: string) => {
    const contentToSpeak = text || notes[currentNote].content;
    if (!isPlaying) {
      const utterance = new SpeechSynthesisUtterance(contentToSpeak);
      utterance.lang = voiceLang === 'hindi' ? 'hi-IN' : 'en-US';
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } else {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const handleExplainTopic = async () => {
    if (!topicInput.trim() || loading) return;
    setLoading(true);
    try {
      const explanation = await generateVoiceExplanation(topicInput, voiceLang);
      const newNote = { title: topicInput, content: explanation };
      setNotes(prev => [newNote, ...prev]);
      setCurrentNote(0);
      setTopicInput('');
      // Automatically play the new explanation
      const utterance = new SpeechSynthesisUtterance(explanation);
      utterance.lang = voiceLang === 'hindi' ? 'hi-IN' : 'en-US';
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to generate explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 text-center pr-10">
          <h2 className="text-3xl font-black mb-2">Voice Learning Mode</h2>
          <p className="text-gray-500 dark:text-gray-400">Walking ya sone se pehle padhai (Listen to your notes)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" /> Explain Any Topic
          </h4>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setVoiceLang('hindi')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${voiceLang === 'hindi' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
              HINDI
            </button>
            <button 
              onClick={() => setVoiceLang('english')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${voiceLang === 'english' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
              ENGLISH
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Enter topic (e.g. Gravity, Cell, History...)"
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button 
            onClick={handleExplainTopic}
            disabled={!topicInput.trim() || loading}
            className="px-6 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
            Explain
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-8 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
            <Music size={40} className="animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black">{notes[currentNote].title}</h3>
            <p className="text-blue-100 text-sm opacity-80">Playing your smart notes...</p>
          </div>

          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              animate={{ x: isPlaying ? ['0%', '100%'] : '0%' }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-1/3 h-full bg-white"
            />
          </div>

          <div className="flex items-center gap-8">
            <button 
              onClick={() => setCurrentNote(prev => (prev > 0 ? prev - 1 : prev))}
              className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"
            >
              <SkipBack size={24} />
            </button>
            <button 
              onClick={() => togglePlay()}
              className="w-20 h-20 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all active:scale-95"
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button 
              onClick={() => setCurrentNote(prev => (prev < notes.length - 1 ? prev + 1 : prev))}
              className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"
            >
              <SkipForward size={24} />
            </button>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl" />
      </div>

      <div className="space-y-4">
        <h4 className="font-black text-lg flex items-center gap-2">
          <BookOpen size={20} className="text-blue-600" /> Your Playlist
        </h4>
        <div className="grid gap-3">
          {notes.map((note, idx) => (
            <button
              key={idx}
              onClick={() => { setCurrentNote(idx); window.speechSynthesis.cancel(); setIsPlaying(false); }}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                currentNote === idx ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              <span className="font-bold">{note.title}</span>
              {currentNote === idx && isPlaying && <Volume2 size={18} className="animate-pulse" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
