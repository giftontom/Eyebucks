import { ArrowUp } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export const BackToTop: React.FC<{ bottomNavVisible?: boolean }> = ({ bottomNavVisible = false }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className={`fixed ${bottomNavVisible ? 'bottom-above-nav' : 'bottom-6'} lg:bottom-8 right-4 z-40 w-11 h-11 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 flex items-center justify-center transition-all duration-300 hover:bg-brand-500 hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 outline-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ArrowUp size={20} />
    </button>
  );
};

BackToTop.displayName = 'BackToTop';
