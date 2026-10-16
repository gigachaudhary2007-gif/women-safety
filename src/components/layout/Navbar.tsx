import React from 'react';
import { Home, Compass, MapPin, Users, User, Wrench } from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { soundManager } from '../../utils/audio';

interface NavItem {
  id: 'dashboard' | 'journey' | 'map' | 'contacts' | 'tools' | 'profile';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'journey', label: 'Journey', icon: Compass },
  { id: 'map', label: 'Radar', icon: MapPin },
  { id: 'contacts', label: 'Circle', icon: Users },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'profile', label: 'Profile', icon: User },
];

export const Navbar: React.FC<{ forceShow?: boolean }> = ({ forceShow = false }) => {
  const { activeTab, setActiveTab, activeJourney } = useSafety();

  const handleTabClick = (tabId: NavItem['id']) => {
    soundManager.triggerHaptic(20);
    setActiveTab(tabId);
  };

  const containerClass = forceShow
    ? 'absolute bottom-2 left-0 right-0 z-40 px-3 pointer-events-none flex justify-center'
    : 'md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-1 pointer-events-none flex justify-center';

  return (
    <div className={containerClass}>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="pointer-events-auto w-full max-w-sm glass-nav-mobile rounded-[28px] p-1.5 shadow-2xl border border-slate-200 dark:border-indigo-900/40 transition-all duration-300"
      >
        <div className="grid grid-cols-6 items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasJourneyIndicator = item.id === 'journey' && activeJourney;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`relative flex flex-col items-center justify-center min-h-[46px] rounded-2xl transition-all duration-200 select-none cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
                aria-label={item.label}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isActive ? 'stroke-[2.5] text-white' : 'stroke-[2] text-slate-700 dark:text-slate-300'
                    }`}
                  />

                  {/* Active journey alert badge */}
                  {hasJourneyIndicator && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] font-black mt-0.5 tracking-tight truncate max-w-[44px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
