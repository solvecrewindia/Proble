import React from 'react';
import type { TabType } from '../types';

interface TabsProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
    const tabs: { id: TabType; label: string }[] = [
        { id: 'nptel', label: 'NPTEL' },
        { id: 'gate', label: 'GATE' },
        { id: 'srm', label: 'SRMIST' },
        { id: 'course', label: 'COURSE' },
        { id: 'placement', label: 'PLACEMENT' },
        { id: 'global', label: 'GLOBAL' },
    ];

    return (
        <div className="max-w-[95%] mx-auto my-5 px-5">
            <div className="bg-surface rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.06)] transition-colors duration-200 border border-neutral-300 dark:border-neutral-600 dark:shadow-none">
                <div className="flex overflow-x-auto no-scrollbar md:justify-center items-center w-full md:w-[97%] gap-6 md:gap-10 py-5 px-4 md:px-0 mx-auto whitespace-nowrap">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`bg-none border-none text-sm md:text-base cursor-pointer font-medium transition-colors flex-shrink-0 ${activeTab === tab.id ? 'text-primary' : 'text-muted'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Tabs;
