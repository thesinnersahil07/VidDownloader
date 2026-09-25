import { useState } from 'react';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-indigo-500/10" style={{ borderRadius: 0 }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group">
          <span className="text-2xl">📡</span>
          <span className="text-xl font-bold gradient-text tracking-tight">STREAMFETCH</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#home" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Home</a>
          <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">How It Works</a>
          <a href="#formats" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Supported Formats</a>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-gray-300 hover:text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden px-4 pb-4 animate-fade-in">
          <div className="flex flex-col gap-3">
            <a href="#home" onClick={() => setMobileOpen(false)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium py-2">Home</a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium py-2">How It Works</a>
            <a href="#formats" onClick={() => setMobileOpen(false)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium py-2">Supported Formats</a>
          </div>
        </nav>
      )}
    </header>
  );
}
