import React, { useEffect, useState } from 'react';
import { Sponsor, SponsorDisplayMode } from '../types';

interface SponsorDisplayProps {
  sponsors: Sponsor[];
  activeSponsorId: string;
  displayMode: SponsorDisplayMode;
  carouselSpeed: number; // in seconds
  themeBgColor?: string;
  className?: string;
}

export const SponsorDisplay: React.FC<SponsorDisplayProps> = ({
  sponsors,
  activeSponsorId,
  displayMode,
  carouselSpeed,
  className = '',
}) => {
  const activeSponsors = sponsors.filter(s => s.enabled);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Rotate carousel
  useEffect(() => {
    if (displayMode !== 'carousel' || activeSponsors.length <= 1) return;

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activeSponsors.length);
        setFade(true);
      }, 300); // fade out duration
    }, Math.max(3, carouselSpeed) * 1000);

    return () => clearInterval(interval);
  }, [displayMode, activeSponsors.length, carouselSpeed]);

  if (activeSponsors.length === 0) {
    return null;
  }

  // Multi-logo band
  if (displayMode === 'grid') {
    return (
      <div className={`flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-white/40 ${className}`}>
        {activeSponsors.map((sponsor) => (
          <div key={sponsor.id} className="flex items-center justify-center p-1 max-h-16">
            <img
              src={sponsor.logoUrl}
              alt={sponsor.name}
              className="max-h-12 max-w-[140px] object-contain"
              onError={(e) => {
                // fallback text if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  // Single or Carousel
  const currentSponsor = displayMode === 'carousel'
    ? activeSponsors[currentIndex % activeSponsors.length]
    : activeSponsors.find(s => s.id === activeSponsorId) || activeSponsors[0];

  if (!currentSponsor) return null;

  return (
    <div
      className={`relative overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl p-2.5 px-4 shadow-2xl border border-white/50 transition-all duration-300 transform hover:scale-105 ${className}`}
      title={currentSponsor.name}
    >
      <div
        className={`flex items-center justify-center transition-opacity duration-300 min-h-[56px] min-w-[170px] max-w-[260px] ${
          fade ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <img
          src={currentSponsor.logoUrl}
          alt={currentSponsor.name}
          className="max-h-14 max-w-[240px] object-contain drop-shadow-sm"
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = 'none';
            if (el.nextElementSibling) {
              (el.nextElementSibling as HTMLElement).style.display = 'block';
            }
          }}
        />
        <span className="hidden font-bold text-slate-800 text-sm tracking-wide text-center">
          {currentSponsor.name}
        </span>
      </div>

      {displayMode === 'carousel' && activeSponsors.length > 1 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
          {activeSponsors.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex % activeSponsors.length
                  ? 'w-3 bg-purple-600'
                  : 'w-1 bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
