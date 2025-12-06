'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import FilterAccordion from './FilterAccordion';
import Tooltip from './Tooltip';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const [aiContent, setAiContent] = useState('Unchanged');
    const [corporateContent, setCorporateContent] = useState('Unchanged');
    const [individualContent, setIndividualContent] = useState('Unchanged');
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

    return (
        <div className={`relative transition-all duration-300`}>
            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-white dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-gray-800 overflow-y-auto transition-all duration-300 ${
                    isOpen ? 'w-64' : 'w-0'
                }`}
            >
                <div className="p-6 space-y-6">
                    {/* AI Content Filter */}
                    <FilterAccordion title="AI Content">
                        <div className="space-y-2">
                            {['More', 'Unchanged', 'Less', 'None'].map((option) => (
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

                    {/* Corporate Content Filter */}
                    <FilterAccordion title="Corporate-made Content">
                        <div className="space-y-2">
                            {['More', 'Unchanged', 'Less', 'None'].map((option) => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="corporateContent"
                                        value={option}
                                        checked={corporateContent === option}
                                        onChange={(e) => setCorporateContent(e.target.value)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">{option}</span>
                                </label>
                            ))}
                        </div>
                    </FilterAccordion>

                    {/* Individual Content Filter */}
                    <FilterAccordion title="Individually-made Content">
                        <div className="space-y-2">
                            {['More', 'Unchanged', 'Less', 'None'].map((option) => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="individualContent"
                                        value={option}
                                        checked={individualContent === option}
                                        onChange={(e) => setIndividualContent(e.target.value)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">{option}</span>
                                </label>
                            ))}
                        </div>
                    </FilterAccordion>

                    {/* Length Filter */}
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
                                        className="w-full px-3 py-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Max time"
                                        value={customLengthMax}
                                        onChange={(e) => setCustomLengthMax(e.target.value)}
                                        className="w-full px-3 py-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    </FilterAccordion>

                    {/* Age Filter */}
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
                                        className="w-full px-3 py-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Max age"
                                        value={customAgeMax}
                                        onChange={(e) => setCustomAgeMax(e.target.value)}
                                        className="w-full px-3 py-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    </FilterAccordion>
                </div>
            </aside>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed top-20 transition-all duration-300 z-40 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 rounded-r-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-900 ${
                    isOpen ? 'left-64' : 'left-0'
                }`}
                aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
            >
                {isOpen ? (
                    <ChevronLeftIcon className="w-5 h-5" />
                ) : (
                    <ChevronRightIcon className="w-5 h-5" />
                )}
            </button>
        </div>
    );
}