'use client';

import { useState } from 'react';
import { ChevronLeftIcon, FunnelIcon, InformationCircleIcon, BookmarkIcon, RssIcon } from '@heroicons/react/24/solid';
import FilterAccordion from './FilterAccordion';
import Tooltip from './Tooltip';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  showFilters?: boolean; // Only show filters tab on search/feed pages
}

type TabType = 'filters' | 'library' | 'following';

export default function Sidebar({ isOpen, setIsOpen, showFilters = true }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('filters');

  // Filter states
  const [aiContent, setAiContent] = useState('Less');
  const [studioContent, setStudioContent] = useState('Less');
  const [creatorContent, setCreatorContent] = useState('More');
  const [lengthType, setLengthType] = useState('Any');
  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);
  const [customLengthMin, setCustomLengthMin] = useState('');
  const [customLengthMax, setCustomLengthMax] = useState('');
  const [ageType, setAgeType] = useState('Any');
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [customAgeMin, setCustomAgeMin] = useState('');
  const [customAgeMax, setCustomAgeMax] = useState('');

  const lengthRanges = {
    Long: { label: 'Long', range: '20+ minutes' },
    Medium: { label: 'Medium', range: '5-20 minutes' },
    Short: { label: 'Short', range: 'under 5 minutes' },
  };

  const ageRanges = {
    Ancient: { label: 'Ancient', range: 'over 5 years' },
    Old: { label: 'Old', range: 'over 1 year' },
    Medium: { label: 'Medium', range: '2 weeks to 12 months' },
    New: { label: 'New', range: 'less than 1 day to 2 weeks' },
    'Brand New': { label: 'Brand New', range: 'less than 1 day' },
  };

  const toggleLength = (length: string) => {
    if (selectedLengths.includes(length)) {
      setSelectedLengths(selectedLengths.filter((l) => l !== length));
    } else {
      setSelectedLengths([...selectedLengths, length]);
    }
  };

  const toggleAge = (age: string) => {
    if (selectedAges.includes(age)) {
      setSelectedAges(selectedAges.filter((a) => a !== age));
    } else {
      setSelectedAges([...selectedAges, age]);
    }
  };

  const handleTabClick = (tab: TabType) => {
    if (activeTab === tab && isOpen) {
      setIsOpen(false);
    } else {
      setActiveTab(tab);
      setIsOpen(true);
    }
  };

  // Placeholder data
  const libraryItems = [
    { id: 1, name: 'History', count: 0 },
    { id: 2, name: 'Watch Later', count: 24 },
    { id: 3, name: 'Liked Videos', count: 156 },
    { id: 4, name: 'Starred Videos', count: 3 },
    { id: 5, name: 'My Playlist 1', count: 12 },
    { id: 6, name: 'Favorites', count: 4 },
  ];

  const following = [
    { id: 1, name: 'Tech Channel', avatar: 'T', hasNew: true },
    { id: 2, name: 'Gaming Stream', avatar: 'G', hasNew: false },
    { id: 3, name: 'Music Producer', avatar: 'M', hasNew: true },
    { id: 4, name: 'Science Explained', avatar: 'S', hasNew: false },
    { id: 5, name: 'Art & Design', avatar: 'A', hasNew: true },
  ];

  return (
    <div className={`relative transition-all duration-300 z-1`}>
      {/* Tab Buttons - Always visible */}
      <div className={`fixed top-20 transition-all duration-300 z-50 flex flex-col gap-2 ${
        isOpen ? 'left-64' : 'left-0'
      }`}>
        {showFilters && (
          <button
            onClick={() => handleTabClick('filters')}
            className={`bg-[#060c13] border border-gray-800 rounded-r-lg p-2 hover:bg-gray-900 transition-colors ${
              activeTab === 'filters' && isOpen ? 'bg-gray-900 border-l-2 border-l-blue-500' : ''
            }`}
            aria-label="Filters"
          >
            <FunnelIcon className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => handleTabClick('library')}
          className={`bg-[#060c13] border border-gray-800 rounded-r-lg p-2 hover:bg-gray-900 transition-colors ${
            activeTab === 'library' && isOpen ? 'bg-gray-900 border-l-2 border-l-blue-500' : ''
          }`}
          aria-label="Library"
        >
          <BookmarkIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleTabClick('following')}
          className={`bg-[#060c13] border border-gray-800 rounded-r-lg p-2 hover:bg-gray-900 transition-colors ${
            activeTab === 'following' && isOpen ? 'bg-gray-900 border-l-2 border-l-blue-500' : ''
          }`}
          aria-label="Following"
        >
          <RssIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Content */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-gradient-darker border-r border-gray-800 overflow-y-auto transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-0'
        }`}
      >
        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-bold mb-4">Filters</h2>

            <FilterAccordion title="AI Content">
              <div className="space-y-2">
                {['More', 'Unmodified', 'Less', 'None'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="aiContent"
                      value={option}
                      checked={aiContent === option}
                      onChange={(e) => setAiContent(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </FilterAccordion>

            <FilterAccordion title="Studio Content (Corporate)">
              <div className="space-y-2">
                {['More', 'Unmodified', 'Less', 'None'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="corporateContent"
                      value={option}
                      checked={studioContent === option}
                      onChange={(e) => setStudioContent(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </FilterAccordion>

            <FilterAccordion title="Creator Content">
              <div className="space-y-2">
                {['More', 'Unmodified', 'Less', 'None'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="individualContent"
                      value={option}
                      checked={creatorContent === option}
                      onChange={(e) => setCreatorContent(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </FilterAccordion>

            <FilterAccordion title="Length">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="lengthType"
                    value="Any"
                    checked={lengthType === 'Any'}
                    onChange={() => {
                      setLengthType('Any');
                      setSelectedLengths([]);
                      setCustomLengthMin('');
                      setCustomLengthMax('');
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Any</span>
                </label>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="radio"
                      name="lengthType"
                      value="Preset"
                      checked={lengthType === 'Preset'}
                      onChange={() => setLengthType('Preset')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Presets</span>
                  </label>
                  {lengthType === 'Preset' && (
                    <div className="ml-6 space-y-2">
                      {Object.entries(lengthRanges).map(([key, { label, range }]) => (
                        <div key={key} className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={selectedLengths.includes(key)}
                              onChange={() => toggleLength(key)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{label}</span>
                          </label>
                          <Tooltip content={range}>
                            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="lengthType"
                    value="Custom"
                    checked={lengthType === 'Custom'}
                    onChange={() => setLengthType('Custom')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Custom</span>
                </label>
                {lengthType === 'Custom' && (
                  <div className="ml-6 space-y-2">
                    <input
                      type="text"
                      placeholder="Min time"
                      value={customLengthMin}
                      onChange={(e) => setCustomLengthMin(e.target.value)}
                      className="w-full px-3 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Max time"
                      value={customLengthMax}
                      onChange={(e) => setCustomLengthMax(e.target.value)}
                      className="w-full px-3 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </FilterAccordion>

            <FilterAccordion title="Age">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ageType"
                    value="Any"
                    checked={ageType === 'Any'}
                    onChange={() => {
                      setAgeType('Any');
                      setSelectedAges([]);
                      setCustomAgeMin('');
                      setCustomAgeMax('');
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Any</span>
                </label>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="radio"
                      name="ageType"
                      value="Preset"
                      checked={ageType === 'Preset'}
                      onChange={() => setAgeType('Preset')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Presets</span>
                  </label>
                  {ageType === 'Preset' && (
                    <div className="ml-6 space-y-2">
                      {Object.entries(ageRanges).map(([key, { label, range }]) => (
                        <div key={key} className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={selectedAges.includes(key)}
                              onChange={() => toggleAge(key)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{label}</span>
                          </label>
                          <Tooltip content={range}>
                            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ageType"
                    value="Custom"
                    checked={ageType === 'Custom'}
                    onChange={() => setAgeType('Custom')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Custom</span>
                </label>
                {ageType === 'Custom' && (
                  <div className="ml-6 space-y-2">
                    <input
                      type="text"
                      placeholder="Min age"
                      value={customAgeMin}
                      onChange={(e) => setCustomAgeMin(e.target.value)}
                      className="w-full px-3 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Max age"
                      value={customAgeMax}
                      onChange={(e) => setCustomAgeMax(e.target.value)}
                      className="w-full px-3 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </FilterAccordion>
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Library</h2>
            <div className="space-y-2">
              {libraryItems.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-900 bg-gray-800/10 rounded-lg transition-colors text-left"
                >
                  <span className="text-sm">{item.name}</span>
                  {item.count > 0 && (
                    <span className="text-xs text-gray-400">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Following Tab */}
        {activeTab === 'following' && (
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Following</h2>
            <div className="space-y-2">
              {following.map((sub) => (
                <button
                  key={sub.id}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-900 rounded-lg transition-colors text-left"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">
                    {sub.avatar}
                  </div>
                  <span className="text-sm flex-1 truncate">{sub.name}</span>
                  {sub.hasNew && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}