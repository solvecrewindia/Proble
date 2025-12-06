import { useState, useMemo } from 'react';
import Tabs from './components/Tabs';
import CourseCard from './components/CourseCard';
import type { Course, TabType } from './types';

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
  },
  ...Array.from({ length: 4 }).map((_, i) => ({
    id: i + 5,
    title: `Advanced Topic ${i + 1}`,
    author: "Proble",
    date: `Dec ${14 + i}`,
    image: `https://picsum.photos/seed/course${i + 5}/800/400`,
  }))
];

interface AppProps {
  searchQuery?: string;
}

function App({ searchQuery = '' }: AppProps) {
  const [activeTab, setActiveTab] = useState<TabType>('nptel');

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
