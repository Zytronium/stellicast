'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

interface FilterAccordionProps {
  title: string;
  children: React.ReactNode;
}

export default function FilterAccordion({ title, children }: FilterAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 hover:text-blue-500 transition-colors"
      >
        <h3 className="font-semibold text-sm">{title}</h3>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`}
        />
      </button>
      {isOpen && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}
