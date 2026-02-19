import { useState, useMemo, useEffect } from 'react';
import Tabs from './components/Tabs';
import CourseCard from './components/CourseCard';
import SkeletonCard from './components/SkeletonCard';
import type { Course, TabType } from './types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface AppProps {
  searchQuery?: string;
}

function App({ searchQuery = '' }: AppProps) {
  const [activeTab, setActiveTab] = useState<TabType>('nptel');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        let dbType: string = activeTab;
        let moduleCategory = 'NPTEL';

        if (activeTab === 'srm') {
          dbType = 'srmist';
          moduleCategory = 'SRMIST';
        } else if (activeTab === 'gate') {
          dbType = 'gate';
          moduleCategory = 'GATE';
        } else if (activeTab === 'nptel') {
          dbType = 'nptel';
          moduleCategory = 'NPTEL';
        } else if (activeTab === 'placement') {
          dbType = 'placement';
          moduleCategory = 'PLACEMENT';
        } else if (activeTab === 'global') {
          dbType = 'global';
          moduleCategory = 'Global';
        } else if (activeTab === 'course') {
          dbType = 'course';
          moduleCategory = 'COURSE';
        }

        // Optimized Select: Only fetch necessary fields
        const [modulesRes, quizzesRes] = await Promise.all([
          supabase.from('modules').select('id, title, image_url, created_by, created_at').eq('category', moduleCategory),
          supabase.from('quizzes').select('id, title, image_url, created_by, created_at').eq('type', dbType).is('module_id', null).order('created_at', { ascending: false })
        ]);

        const modules = modulesRes.data || [];
        const quizzes = quizzesRes.data || [];

        // Collect all distinct created_by IDs
        const userIds = new Set<string>();
        modules.forEach((m: any) => { if (m.created_by) userIds.add(m.created_by); });
        quizzes.forEach((q: any) => { if (q.created_by) userIds.add(q.created_by); });

        // Fetch profiles for these users
        let userMap = new Map<string, { role: string, username: string, avatar_url: string | null }>(); // id -> profile data
        if (userIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role, username, avatar_url')
            .in('id', Array.from(userIds));

          if (profiles) {
            profiles.forEach((p: any) => userMap.set(p.id, {
              role: p.role,
              username: p.username,
              avatar_url: p.avatar_url
            }));
          }
        }

        const getAuthorDetails = (uid: string) => {
          const profile = userMap.get(uid);
          if (!profile) return { name: 'Faculty', avatar: undefined };
          if (profile.role === 'admin') return { name: 'Proble', avatar: undefined };
          return {
            name: profile.username || 'Faculty',
            avatar: profile.avatar_url || undefined
          };
        };

        const mappedModules: Course[] = modules.map((m: any) => {
          const authorDetails = m.created_by ? getAuthorDetails(m.created_by) : { name: 'Faculty', avatar: undefined };
          return {
            id: m.id,
            title: m.title,
            author: authorDetails.name,
            author_avatar_url: authorDetails.avatar,
            date: new Date(m.created_at).toLocaleDateString(),
            image: m.image_url || `https://ui-avatars.com/api/?name=${m.title}&background=random&size=400`,
            type: 'module'
          };
        });

        const mappedQuizzes: Course[] = quizzes.map((q: any) => {
          const authorDetails = q.created_by ? getAuthorDetails(q.created_by) : { name: 'Faculty', avatar: undefined };
          return {
            id: q.id,
            title: q.title,
            author: authorDetails.name,
            author_avatar_url: authorDetails.avatar,
            date: new Date(q.created_at).toLocaleDateString(),
            image: q.image_url || `https://ui-avatars.com/api/?name=${q.title}&background=random&size=400`,
            type: 'quiz'
          };
        });

        setCourses([...mappedModules, ...mappedQuizzes]);
      } catch (err) {
        console.error('Error fetching data:', err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [activeTab]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setJoining(true);

    try {
      const { data } = await supabase
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
    let list = courses;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    return list;
  }, [courses, searchQuery]);

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'nptel': return 'NPTEL';
      case 'gate': return 'GATE';
      case 'srm': return 'SRMIST';
      case 'placement': return 'Placement Preparation';
      case 'global': return 'Global Challenges';
      case 'course': return 'Course Modules';
      default: return 'NPTEL';
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text transition-colors duration-200">

      {/* Join Code Section */}
      <div className="bg-gradient-to-r from-primary to-primary-600 py-8 px-5 text-white">
        <div className="max-w-[95%] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold mb-2">Have a Quiz Code?</h2>
            <p className="text-blue-100">Enter the code shared by your faculty to access private assessments.</p>
          </div>
          <form onSubmit={handleJoin} className="flex w-full md:w-auto bg-white p-1 rounded-lg shadow-lg items-center overflow-hidden">
            <input
              type="text"
              placeholder="Enter Code"
              className="flex-1 min-w-0 px-3 py-2 text-gray-900 outline-none rounded-l-md text-left text-sm md:text-base"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              disabled={joining}
              className="bg-primary text-white px-4 md:px-6 py-2 rounded-md font-bold hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap text-sm md:text-base"
            >
              {joining ? '...' : 'Join'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-[95%] mx-auto my-5 px-5">
        <div className="flex justify-between mb-4 items-center">
          <h2 className="text-xl font-bold m-0">{getTabLabel(activeTab)}</h2>
          <span className="text-sm text-muted">Showing {filteredCourses.length} results</span>
        </div>

        {loading ? (
          <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : activeTab === 'global' && filteredCourses.length === 0 ? (
          <div className="text-center py-12 text-muted">No global challenges active properly at the moment. Check back later!</div>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 justify-items-center">
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

      <footer className="p-5 text-muted mt-10 border-t border-gray-100 dark:border-white/5 flex flex-row items-center justify-center gap-6">
        <p>© 2026 Proble</p>
        <button onClick={() => navigate('/about')} className="text-sm hover:text-primary transition-colors">
          About Us
        </button>
      </footer>
    </div>
  );
}

export default App;
