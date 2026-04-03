import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Trash2, FileText, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { StudyNote } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export const NotesStorage: React.FC = () => {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notes'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyNote));
      setNotes(data);
    });
    return () => unsubscribe();
  }, [user]);

  const deleteNote = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteDoc(doc(db, 'notes', id));
        if (selectedNote?.id === id) setSelectedNote(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Smart Notes Storage</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Notes List */}
        <div className="md:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
          {filteredNotes.length > 0 ? (
            filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedNote?.id === note.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-sm' 
                    : 'bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                    {note.subject}
                  </span>
                  <span className="text-[10px] text-gray-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-sm line-clamp-1">{note.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{note.summary || note.content}</p>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 italic">No notes found</div>
          )}
        </div>

        {/* Note Detail */}
        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            {selectedNote ? (
              <motion.div
                key={selectedNote.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {selectedNote.imageUrl && (
                  <div className="w-full h-48 overflow-hidden border-b border-gray-200 dark:border-gray-800">
                    <img src={selectedNote.imageUrl} alt="Note" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{selectedNote.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(selectedNote.createdAt).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {selectedNote.subject}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteNote(selectedNote.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {selectedNote.summary && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                        <h5 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Sparkles size={12} /> AI Summary
                        </h5>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{selectedNote.summary}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={12} /> Content
                      </h5>
                      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedNote.content}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center text-gray-400">
                <BookOpen size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Select a note to view details</p>
                <p className="text-xs mt-1">Your scanned questions and summaries appear here</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
