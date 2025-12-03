import { useState, useMemo } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import CourseCard from './components/CourseCard';
import type { Course, TabType } from './types';

const sampleCourses: Course[] = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  title:
    i % 4 === 0
      ? `Move from Graphic Designer to UX DESIGNER - Class ${i + 1}`
      : i % 4 === 1
        ? "User Experience Design For Mobile Apps & Websites (UI)"
        : i % 4 === 2
          ? "How To Create a Simple Website With Bootstrap 4"
          : "Learn to make websites with Google's Material Design",
  author: "Proble",
  date: `Dec ${10 + i}`,
  image: `https://picsum.photos/seed/course${i}/800/400`,
}));

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('nptel');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    let list = sampleCourses;

    // Tab filtering logic mimicking the original script
    if (activeTab === 'nptel') list = sampleCourses.slice(0, 4);
    else if (activeTab === 'gate') list = sampleCourses.slice(2, 6);
    else if (activeTab === 'srm') list = sampleCourses.slice(1, 5);
    // 'global' returns all (default)

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }

    return list;
  }, [activeTab, searchQuery]);

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'nptel': return 'NPTEL';
      case 'gate': return 'GATE';
      case 'srm': return 'SRMIST';
      case 'global': return 'Global';
      default: return 'NPTEL';
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text transition-colors duration-200">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-[1200px] mx-auto my-5 px-5">
        <div className="flex justify-between mb-4 items-center">
          <h2 className="text-xl font-bold m-0">{getTabLabel(activeTab)}</h2>
          <span className="text-sm text-muted">Showing {filteredCourses.length} results</span>
        </div>

        <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              showDate={activeTab === 'global'}
            />
          ))}
        </div>
      </main>

      <footer className="text-center p-5 text-muted mt-10">
        © 2025 Proble
      </footer>
    </div>
  );
}

export default App;
