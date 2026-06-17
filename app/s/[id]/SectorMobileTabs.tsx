'use client';

import { useState } from 'react';

type MobileTab = 'videos' | 'about';

export default function SectorMobileTabs({ videosContent, sidebarContent }: {
    videosContent: React.ReactNode;
    sidebarContent: React.ReactNode;
}) {
    const [activeTab, setActiveTab] = useState<MobileTab>('videos');

    return (
        <div className="lg:hidden flex flex-col gap-6">
            {/* Tab bar */}
            <div className="flex gap-6 border-b border-border -mb-2">
                {(['videos', 'about'] as MobileTab[]).map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`relative pb-2 text-sm transition-all ${
                            activeTab === tab
                                ? 'font-bold text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary'
                                : 'font-thin text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            <div className={activeTab === 'videos' ? 'block' : 'hidden'}>
                {videosContent}
            </div>
            <div className={activeTab === 'about' ? 'block' : 'hidden'}>
                {sidebarContent}
            </div>
        </div>
    );
}
