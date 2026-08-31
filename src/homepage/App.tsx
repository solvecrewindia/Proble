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
  const [activeTab, setActiveTab] = useState<TabType>('originals');
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

        if (activeTab === 'originals') {
          dbType = 'originals';
          moduleCategory = 'ORIGINALS';
        } else if (activeTab === 'srm') {
          dbType = 'srmist';
          moduleCategory = 'SRMIST';
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
          supabase.from('modules').select('id, title, image_url, created_by, created_at, slug').eq('category', moduleCategory),
          supabase.from('quizzes').select('id, title, image_url, created_by, created_at, module_id').eq('type', dbType).order('created_at', { ascending: false })
        ]);

        const modules = modulesRes.data || [];
        const allQuizzes = quizzesRes.data || [];
        
        // Filter out quizzes that are part of a module (module_id is not null/empty)
        const quizzes = allQuizzes.filter((q: any) => !q.module_id || q.module_id.trim() === '' || q.module_id === 'null');

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
          if (!profile) return { name: 'Proble', avatar: undefined };
          if (profile.role === 'admin') return { name: 'Proble', avatar: undefined };
          return {
            name: profile.username || 'Proble',
            avatar: profile.avatar_url || undefined
          };
        };

        const mappedModules: Course[] = modules.map((m: any) => {
          const authorDetails = m.created_by ? getAuthorDetails(m.created_by) : { name: 'Proble', avatar: undefined };
          return {
            id: m.slug || m.id,
            title: m.title,
            author: authorDetails.name,
            author_avatar_url: authorDetails.avatar,
            date: new Date(m.created_at).toLocaleDateString(),
            image: m.image_url || null,
            type: 'module'
          };
        });

        const mappedQuizzes: Course[] = quizzes.map((q: any) => {
          const authorDetails = q.created_by ? getAuthorDetails(q.created_by) : { name: 'Proble', avatar: undefined };
          return {
            id: q.id,
            title: q.title,
            author: authorDetails.name,
            author_avatar_url: authorDetails.avatar,
            date: new Date(q.created_at).toLocaleDateString(),
            image: q.image_url || null,
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
        navigate(`/course/details/${data.id}`);
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
      case 'originals': return 'Proble Originals';
      case 'nptel': return 'NPTEL';
      case 'srm': return 'SRMIST';
      case 'placement': return 'Placement Preparation';
      case 'global': return 'Global Challenges';
      case 'course': return 'Course Modules';
      default: return 'Proble Originals';
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text transition-colors duration-200">

      {/* Join Code Section */}
      <div className="relative py-12 px-5 text-white overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-primary z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-600 via-primary to-[#00d4ff] opacity-80 z-0"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl z-0"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-2xl z-0"></div>

        <div className="relative z-10 max-w-7xl px-5 lg:px-8 mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-display font-bold mb-3 tracking-tight">Have a Quiz Code?</h2>
            <p className="text-primary-foreground/90 text-lg max-w-md">Enter the code shared by your faculty to securely access your private assessments.</p>
          </div>
          <form onSubmit={handleJoin} className="relative flex w-full md:w-[450px] items-center mt-4 z-10 shadow-glass group">
            <input
              type="text"
              placeholder="Enter Code..."
              className="w-full h-14 pl-6 pr-[140px] bg-white/10 backdrop-blur-md rounded-xl border border-white/30 focus:border-white/60 focus:ring-4 focus:ring-white/10 outline-none text-white transition-all font-bold tracking-wide placeholder:text-white/60 placeholder:font-medium placeholder:tracking-normal"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              disabled={joining}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-6 rounded-lg bg-white text-primary font-bold hover:bg-gray-50 transition-all flex items-center gap-2 text-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {joining ? '...' : 'Join'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto my-5 px-5 lg:px-8">
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
