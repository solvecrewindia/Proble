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
        { id: 'global', label: 'GLOBAL' },
    ];

    return (
        <div className="max-w-[1200px] mx-auto my-5 px-5">
            <div className="bg-surface rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.06)] transition-colors duration-200 border border-border-custom dark:shadow-none">
                <div className="flex justify-center items-center w-[97%] gap-10 py-5 mx-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`bg-none border-none text-base cursor-pointer font-medium transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-muted'
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
