import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Sector } from 'recharts';
import { TrendingUp, Award, Clock, BookOpen, Zap, BarChart2, ChevronRight, Target, Calendar, Filter, Search, Sparkles, Heart, Check, RefreshCw } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { QuizResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';

import { analyzePerformance } from '../lib/gemini';

export const ProgressTracker: React.FC = () => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [tasksStats, setTasksStats] = useState({ total: 0, completed: 0 });
  const [quizData, setQuizData] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({
    avgScore: 0,
    totalQuizzes: 0,
    bestSubject: 'N/A',
    studyStreak: 5,
    totalQuestions: 0,
    correctAnswers: 0,
    healthScore: 0
  });
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // Quiz Results
    const q = query(
      collection(db, 'quizResults'), 
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    
    const unsubscribeQuizzes = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      setQuizResults(results);
      
      const chartData = [...results].reverse().slice(-7).map(r => ({
        name: r.subject.substring(0, 8),
        score: Math.round((r.score / r.total) * 100),
        fullDate: new Date(r.date).toLocaleDateString()
      }));
      setQuizData(chartData);

      if (results.length > 0) {
        const totalScore = results.reduce((acc, r) => acc + (r.score / r.total), 0);
        const avg = totalScore / results.length;
        const totalQ = results.reduce((acc, r) => acc + r.total, 0);
        const totalC = results.reduce((acc, r) => acc + r.score, 0);

        const subjects: Record<string, { total: number, score: number, count: number }> = {};
        results.forEach(r => {
          if (!subjects[r.subject]) subjects[r.subject] = { total: 0, score: 0, count: 0 };
          subjects[r.subject].total += r.total;
          subjects[r.subject].score += r.score;
          subjects[r.subject].count += 1;
        });
        
        const subChartData = Object.entries(subjects).map(([name, data]) => ({
          name,
          value: Math.round((data.score / data.total) * 100)
        }));
        setSubjectData(subChartData);

        let bestSub = 'N/A';
        let maxAvg = -1;
        Object.entries(subjects).forEach(([sub, data]) => {
          const subAvg = data.score / data.total;
          if (subAvg > maxAvg) {
            maxAvg = subAvg;
            bestSub = sub;
          }
        });

        setStats(prev => ({
          ...prev,
          avgScore: Math.round(avg * 100),
          totalQuizzes: results.length,
          bestSubject: bestSub,
          totalQuestions: totalQ,
          correctAnswers: totalC
        }));
      }
      setLoading(false);
    });

    // Notes Count
    const notesQ = query(collection(db, 'notes'), where('userId', '==', user.uid));
    const unsubscribeNotes = onSnapshot(notesQ, (snapshot) => {
      setNotesCount(snapshot.size);
    });

    // Tasks Stats
    const tasksQ = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribeTasks = onSnapshot(tasksQ, (snapshot) => {
      const total = snapshot.size;
      const completed = snapshot.docs.filter(doc => doc.data().completed).length;
      setTasksStats({ total, completed });
    });

    return () => {
      unsubscribeQuizzes();
      unsubscribeNotes();
      unsubscribeTasks();
    };
  }, [user]);

  // Calculate Health Score and trigger AI Analysis
  useEffect(() => {
    const quizWeight = stats.avgScore * 0.6;
    const taskWeight = tasksStats.total > 0 ? (tasksStats.completed / tasksStats.total) * 30 : 0;
    const noteWeight = Math.min(notesCount * 2, 10); // Max 10 points for notes
    
    const newHealth = Math.round(quizWeight + taskWeight + noteWeight);
    setStats(prev => ({
      ...prev,
      healthScore: newHealth
    }));

    // Trigger AI Analysis if data is sufficient
    if (stats.totalQuizzes > 0 && !aiAnalysis && !analyzing) {
      const runAnalysis = async () => {
        setAnalyzing(true);
        try {
          const res = await analyzePerformance(stats, quizResults, notesCount, tasksStats);
          setAiAnalysis(res);
        } catch (err) {
          console.error("Analysis failed", err);
        } finally {
          setAnalyzing(false);
        }
      };
      runAnalysis();
    }
  }, [stats.avgScore, tasksStats, notesCount, stats.totalQuizzes]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#06B6D4'];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Learning Progress</h2>
          <p className="text-gray-500 dark:text-gray-400">Deep analysis of your study performance</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-800">
          <Calendar size={18} className="text-blue-600" />
          <span className="text-sm font-bold text-blue-600">Last 30 Days</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Study Health', value: `${stats.healthScore}%`, icon: Heart, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
          { label: 'Avg Score', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
          { label: 'Best Subject', value: stats.bestSubject, icon: Award, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
          { label: 'Tasks Done', value: `${tasksStats.completed}/${tasksStats.total}`, icon: Check, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-[#1e1e1e] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
          >
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black truncate">{stat.value}</p>
            <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon size={60} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Deep Analysis Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-gray-900 to-blue-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-40 h-40 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-white/10"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={440}
                initial={{ strokeDashoffset: 440 }}
                animate={{ strokeDashoffset: 440 - (440 * stats.healthScore) / 100 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="text-blue-400"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black">{stats.healthScore}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Health Score</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={24} />
              <h3 className="text-2xl font-black">Auto Performance Analysis</h3>
              {analyzing && <RefreshCw size={16} className="animate-spin text-blue-400" />}
            </div>
            
            {aiAnalysis ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {aiAnalysis.summary}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold text-blue-300 uppercase mb-2">Key Strengths</p>
                    <ul className="text-[10px] space-y-1">
                      {aiAnalysis.strengths.map((s: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-blue-400 rounded-full" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold text-orange-300 uppercase mb-2">Focus Areas</p>
                    <ul className="text-[10px] space-y-1">
                      {aiAnalysis.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-orange-400 rounded-full" /> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <p className="text-xs font-bold text-blue-200 mb-1 flex items-center gap-2">
                    <Target size={14} /> Smart Recommendation
                  </p>
                  <p className="text-[11px] text-blue-100 italic">{aiAnalysis.recommendation}</p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-xs font-bold text-blue-300 uppercase mb-1">Consistency</p>
                  <p className="text-sm">
                    {tasksStats.total > 0 && (tasksStats.completed / tasksStats.total) > 0.7 
                      ? "Excellent! You are completing most of your tasks." 
                      : "Try to complete more daily tasks to maintain momentum."}
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-xs font-bold text-purple-300 uppercase mb-1">Retention</p>
                  <p className="text-sm">
                    {stats.avgScore > 80 
                      ? "Your memory retention is high. Keep reviewing complex topics." 
                      : "Regular revision of notes will boost your score above 80%."}
                  </p>
                </div>
              </div>
            )}
            
            {!aiAnalysis && !analyzing && (
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "Based on {stats.totalQuizzes} quizzes and {notesCount} notes, your learning speed is {stats.avgScore > 70 ? 'Fast' : 'Moderate'}. {stats.bestSubject} is your strongest area."
              </p>
            )}
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e1e1e] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black flex items-center gap-2">
              <BarChart2 size={22} className="text-blue-500" />
              Performance Trends
            </h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Score %
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            {quizData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quizData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} 
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none', 
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                    {quizData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 italic">
                <Clock size={40} className="mb-3 opacity-20" />
                <p className="text-sm">No data yet. Start learning!</p>
              </div>
            )}
          </div>
        </div>

        {/* Subject Mastery */}
        <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="font-black mb-6 flex items-center gap-2">
            <Target size={22} className="text-purple-500" />
            Subject Mastery
          </h3>
          <div className="space-y-5">
            {subjectData.length > 0 ? (
              subjectData.map((sub, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{sub.name}</span>
                    <span className="text-blue-600">{sub.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${sub.value}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className={`h-full rounded-full ${
                        sub.value > 80 ? 'bg-green-500' : sub.value > 50 ? 'bg-blue-500' : 'bg-orange-500'
                      }`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-10 italic">Take quizzes to see mastery</p>
            )}
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">AI Insight</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  {stats.avgScore > 70 
                    ? "You're doing great! Focus on advanced topics now." 
                    : "Consistent practice will help improve your scores."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz History */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-black flex items-center gap-2">
            <Clock size={22} className="text-orange-500" />
            Quiz History
          </h3>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Filter size={14} className="text-gray-400" />
            <span className="text-[10px] font-bold text-gray-500">All Results</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {quizResults.length > 0 ? (
            quizResults.map((quiz, i) => (
              <motion.button
                key={quiz.id}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.02)' }}
                onClick={() => setSelectedQuiz(quiz)}
                className="w-full p-5 flex items-center justify-between text-left transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                    (quiz.score / quiz.total) >= 0.8 ? 'bg-green-100 text-green-600' : 
                    (quiz.score / quiz.total) >= 0.5 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {Math.round((quiz.score / quiz.total) * 100)}%
                  </div>
                  <div>
                    <h4 className="font-bold text-sm group-hover:text-blue-600 transition-colors">{quiz.subject}</h4>
                    <p className="text-[10px] text-gray-400 flex items-center gap-2">
                      <Calendar size={10} />
                      {new Date(quiz.date).toLocaleDateString()} • {quiz.score}/{quiz.total} Correct
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
              </motion.button>
            ))
          ) : (
            <div className="p-10 text-center text-gray-400 italic">
              No quiz history found.
            </div>
          )}
        </div>
      </div>

      {/* Quiz Detail Modal */}
      <AnimatePresence>
        {selectedQuiz && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedQuiz(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center space-y-4">
                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl font-black shadow-xl ${
                  (selectedQuiz.score / selectedQuiz.total) >= 0.8 ? 'bg-green-500 text-white shadow-green-500/20' : 
                  (selectedQuiz.score / selectedQuiz.total) >= 0.5 ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-orange-500 text-white shadow-orange-500/20'
                }`}>
                  {Math.round((selectedQuiz.score / selectedQuiz.total) * 100)}%
                </div>
                <div>
                  <h3 className="text-2xl font-black">{selectedQuiz.subject}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Quiz Result Details</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Correct</p>
                    <p className="text-xl font-black text-green-600">{selectedQuiz.score}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total</p>
                    <p className="text-xl font-black text-blue-600">{selectedQuiz.total}</p>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => setSelectedQuiz(null)}
                    className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black shadow-xl transition-all active:scale-95"
                  >
                    Close Report
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
