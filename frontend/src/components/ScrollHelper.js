import React, { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function ScrollHelper() {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const main = document.querySelector('main.page-scroll') || window;
    
    const handleScroll = () => {
      const el = main === window ? document.documentElement : main;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      const scrollPercent = scrollTop / (scrollHeight - clientHeight);

      setShowTop(scrollTop > 300);
      setShowBottom(scrollPercent < 0.85 && scrollHeight > clientHeight + 300);
      setAtBottom(scrollPercent >= 0.85);
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (direction) => {
    const main = document.querySelector('main.page-scroll') || window;
    const options = { behavior: 'smooth' };
    if (direction === 'top') {
      main === window ? window.scrollTo({ top: 0, ...options }) : main.scrollTo({ top: 0, ...options });
    } else {
      const el = main === window ? document.documentElement : main;
      main === window ? window.scrollTo({ top: el.scrollHeight, ...options }) : main.scrollTo({ top: main.scrollHeight, ...options });
    }
  };

  if (!showTop && !showBottom && !atBottom) return null;

  return (
    <div className="fixed bottom-6 left-6 flex flex-col gap-2 z-40" dir="ltr">
      {showTop && (
        <button
          onClick={() => scrollTo('top')}
          className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-110 group"
          title="الذهاب للأعلى"
        >
          <ChevronUpIcon className="h-5 w-5 text-gray-600 dark:text-gray-300 group-hover:text-emerald-600" />
        </button>
      )}
      {showBottom && (
        <button
          onClick={() => scrollTo('bottom')}
          className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-110 group"
          title="الذهاب للأسفل"
        >
          <ChevronDownIcon className="h-5 w-5 text-gray-600 dark:text-gray-300 group-hover:text-emerald-600" />
        </button>
      )}
    </div>
  );
}
