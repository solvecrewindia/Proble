import { useState, useMemo, useEffect } from 'react';
import Tabss from './components/Tabs'; // Rename import to match usage (Tabs was default export?)
import Tabs from './components/Tabs';
import CourseCard from './components/CourseCard';
import type { Course, TabType } from './types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';

import pythonBanner from '../assets/python_banner.png';
import dbmsBanner from '../assets/dbms_banner.png';
import osBanner from '../assets/os_banner.png';
import mlBanner from '../assets/ml_banner.png';

const sampleCourses: Course[] = [
  {
    id: 1,
    title: "Programming, Data Structures and Algorithms Using Python",
    author: "Proble",
    date: "Dec 10",
    image: pythonBanner
  },
  {
    id: 2,
    title: "Database Management System",
    author: "Proble",
    date: "Dec 11",
    image: dbmsBanner
  },
  {
    id: 3,
    title: "Operating System Fundamentals",
    author: "Proble",
    date: "Dec 12",
    image: osBanner
  },
  {
    id: 4,
    title: "Machine Learning by IIT Madras",
    author: "Proble",
    date: "Dec 13",
    image: mlBanner
  }
];

interface AppProps {
  searchQuery?: string;
}

function App({ searchQuery = '' }: AppProps) {
  const [activeTab, setActiveTab] = useState<TabType>('nptel');
  const [globalQuizzes, setGlobalQuizzes] = useState<Course[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  // Fetch Global Quizzes
  useEffect(() => {
    const fetchGlobal = async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('*')
        .eq('type', 'global')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const mapped: Course[] = data.map((q: any) => ({
          id: q.id, // Keep string ID if CourseCard supports it (it expects number/string collision, let's type hack if needed)
          title: q.title,
          author: 'Faculty', // Or fetch author name
          date: new Date(q.created_at).toLocaleDateString(),
          image: `https://ui-avatars.com/api/?name=${q.title}&background=random&size=400` // Placeholder
        }));
        setGlobalQuizzes(mapped);
      }
    };
    fetchGlobal();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setJoining(true);

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id')
        .eq('code', joinCode)
        .eq('type', 'master')
        .single();

      if (data) {
        navigate(`/course/${data.id}`);
      } else {
        alert('Invalid code or quiz not found.');
      }
    } catch (err) {
      console.error(err);
      alert('Error joining quiz.');
    } finally {
      setJoining(false);
    }
  };

  const filteredCourses = useMemo(() => {
    let list = sampleCourses;

    // Tab filtering logic
    if (activeTab === 'nptel') list = sampleCourses.slice(0, 4);
    else if (activeTab === 'gate') list = sampleCourses.slice(2, 6);
    else if (activeTab === 'srm') list = sampleCourses.slice(1, 5);
    else if (activeTab === 'global') list = globalQuizzes; // Use fetched data

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }

    return list;
  }, [activeTab, searchQuery, globalQuizzes]);

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'nptel': return 'NPTEL';
      case 'gate': return 'GATE';
      case 'srm': return 'SRMIST';
      case 'global': return 'Global Challenges';
      default: return 'NPTEL';
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text transition-colors duration-200">

      {/* Join Code Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-8 px-5 text-white">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Have a Quiz Code?</h2>
            <p className="text-blue-100">Enter the code shared by your faculty to access private assessments.</p>
          </div>
          <form onSubmit={handleJoin} className="flex w-full md:w-auto bg-white p-1 rounded-lg shadow-lg">
            <input
              type="text"
              placeholder="Enter Code (e.g. AB12CD)"
              className="flex-1 px-4 py-2 text-gray-900 outline-none rounded-l-md"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              disabled={joining}
              className="bg-primary text-white px-6 py-2 rounded-md font-bold hover:bg-blue-700 transition flex items-center gap-2"
            >
              {joining ? 'Checking...' : 'Join'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-[1200px] mx-auto my-5 px-5">
        <div className="flex justify-between mb-4 items-center">
          <h2 className="text-xl font-bold m-0">{getTabLabel(activeTab)}</h2>
          <span className="text-sm text-muted">Showing {filteredCourses.length} results</span>
        </div>

        {activeTab === 'global' && filteredCourses.length === 0 ? (
          <div className="text-center py-12 text-muted">No global challenges active properly at the moment. Check back later!</div>
        ) : (
          <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                showDate={activeTab === 'global'}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="text-center p-5 text-muted mt-10">
        © 2025 Proble
      </footer>
    </div>
  );
}

export default App;
