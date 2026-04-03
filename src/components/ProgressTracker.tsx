import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Award, Clock, BookOpen, Zap, BarChart2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { QuizResult } from '../types';

export const ProgressTracker: React.FC = () => {
  const [quizData, setQuizData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgScore: 0,
    totalQuizzes: 0,
    bestSubject: 'N/A',
    studyStreak: 5
  });
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'quizResults'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => doc.data() as QuizResult);
      
      // Process data for chart
      const chartData = results.slice(-7).map(r => ({
        name: r.subject.substring(0, 8),
        score: Math.round((r.score / r.total) * 100)
      }));
      setQuizData(chartData);

      // Calculate stats
      if (results.length > 0) {
        const avg = results.reduce((acc, r) => acc + (r.score / r.total), 0) / results.length;
        
        // Find best subject
        const subjects: Record<string, number[]> = {};
        results.forEach(r => {
          if (!subjects[r.subject]) subjects[r.subject] = [];
          subjects[r.subject].push(r.score / r.total);
        });
        
        let bestSub = 'N/A';
        let maxAvg = -1;
        Object.entries(subjects).forEach(([sub, scores]) => {
          const subAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (subAvg > maxAvg) {
            maxAvg = subAvg;
            bestSub = sub;
          }
        });

        setStats({
          avgScore: Math.round(avg * 100),
          totalQuizzes: results.length,
          bestSubject: bestSub,
          studyStreak: 5 // Mock streak
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Progress Tracker</h2>
        <p className="text-gray-500 dark:text-gray-400">Analyze your performance and learning trends</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-2">
            <TrendingUp size={18} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Avg Score</p>
          <p className="text-xl font-black">{stats.avgScore}%</p>
        </div>
        <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center mb-2">
            <Award size={18} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Best Subject</p>
          <p className="text-xl font-black truncate">{stats.bestSubject}</p>
        </div>
        <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center mb-2">
            <Zap size={18} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Streak</p>
          <p className="text-xl font-black">{stats.studyStreak} Days</p>
        </div>
        <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center mb-2">
            <BookOpen size={18} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Quizzes</p>
          <p className="text-xl font-black">{stats.totalQuizzes}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <BarChart2 size={20} className="text-blue-500" />
          Recent Quiz Performance
        </h3>
        <div className="h-64 w-full">
          {quizData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quizData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={30}>
                  {quizData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 italic">
              <Clock size={32} className="mb-2 opacity-20" />
              <p>Take some quizzes to see your progress!</p>
            </div>
          )}
        </div>
      </div>

      {/* Motivational Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-blue-500/20">
        <div className="space-y-1">
          <h4 className="font-bold text-lg">Keep it up! 🚀</h4>
          <p className="text-blue-100 text-sm">You've improved your score by 15% this week.</p>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
          <TrendingUp size={24} />
        </div>
      </div>
    </div>
  );
};
