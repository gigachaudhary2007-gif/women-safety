import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  Shield,
  PlusCircle,
  Building,
  RotateCw,
  Search,
  ExternalLink,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { NEARBY_SAFE_PLACES } from '../../data/mockData';
import { SafePlace } from '../../types';
import { createMapBeaconUrl } from '../../utils/geolocation';
import { soundManager } from '../../utils/audio';

export const SafetyMapScreen: React.FC = () => {
  const { currentLocation, refreshLocation, activeJourney, setActiveTab, showToast } = useSafety();

  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<SafePlace | null>(NEARBY_SAFE_PLACES[0]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const filteredPlaces = NEARBY_SAFE_PLACES.filter((place) => {
    const matchesType = selectedType === 'all' || place.type === selectedType;
    const matchesSearch =
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleRefresh = async () => {
    soundManager.triggerHaptic(20);
    setIsRefreshing(true);
    await refreshLocation();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('GPS coordinates recalibrated');
    }, 600);
  };

  const getIconForType = (type: SafePlace['type']) => {
    switch (type) {
      case 'police':
        return <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'hospital':
        return <PlusCircle className="w-4 h-4 text-red-600" />;
      case 'pharmacy':
        return <PlusCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Building className="w-4 h-4 text-amber-600" />;
    }
  };

  const mapBeaconUrl = createMapBeaconUrl(currentLocation.lat, currentLocation.lng);

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="h-10 px-4 rounded-2xl glass-panel flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-indigo-600" />
            <span>Dashboard</span>
          </button>
          <div>
            <h1 className="text-base lg:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Verified Safe Havens & Radar Map
            </h1>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">
              Continuous GPS geolocation radar active
            </span>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-10 px-4 rounded-2xl glass-panel text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Recalibrate GPS</span>
        </button>
      </div>

      {/* Responsive 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================= MAP CANVAS (col-span-12 lg:col-span-8) ================= */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel rounded-[32px] p-4 lg:p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50 relative overflow-hidden">
            {/* Search Input */}
            <div className="relative mb-3 z-10">
              <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search police stations, hospitals, 24/7 care..."
                className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Map Canvas */}
            <div className="w-full h-72 sm:h-96 rounded-3xl bg-slate-100 dark:bg-slate-900 relative overflow-hidden border border-slate-300 dark:border-indigo-900/40 shadow-inner flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full opacity-40 dark:opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-map" width="36" height="36" patternUnits="userSpaceOnUse">
                    <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#6366F1" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-map)" />
                <path d="M 0 160 Q 200 90 700 200" stroke="#4F46E5" strokeWidth="8" strokeOpacity="0.3" fill="none" />
                <path d="M 220 0 L 380 400" stroke="#3B82F6" strokeWidth="6" strokeOpacity="0.3" fill="none" />
              </svg>

              {/* Planned Route Line if active */}
              {activeJourney && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M 240 180 Q 320 120 460 100"
                    stroke="#4F46E5"
                    strokeWidth="5"
                    strokeDasharray="8,5"
                    fill="none"
                  />
                </svg>
              )}

              {/* User Location Radar Pin */}
              <div className="absolute left-[45%] top-[50%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-2xl ring-8 ring-indigo-500/30 animate-pulse">
                  <Navigation className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-indigo-950 dark:text-indigo-200 bg-white/95 dark:bg-slate-900 px-3 py-0.5 rounded-full shadow-md mt-1.5 border border-indigo-200 dark:border-indigo-800">
                  Your Location
                </span>
              </div>

              {/* Safe Place Pins */}
              {filteredPlaces.map((place, idx) => {
                const positions = [
                  { left: '22%', top: '28%' },
                  { left: '75%', top: '22%' },
                  { left: '30%', top: '78%' },
                  { left: '78%', top: '72%' },
                ];
                const pos = positions[idx % positions.length];
                const isSelected = selectedPlace?.id === place.id;

                return (
                  <button
                    key={place.id}
                    onClick={() => {
                      setSelectedPlace(place);
                      soundManager.triggerHaptic(15);
                    }}
                    style={{ left: pos.left, top: pos.top }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 p-2.5 rounded-2xl shadow-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white ring-4 ring-amber-400 scale-125'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:scale-110 border border-slate-200 dark:border-slate-700'
                    }`}
                    title={place.name}
                  >
                    {getIconForType(place.type)}
                  </button>
                );
              })}

              {/* Map Footer Links */}
              <div className="absolute bottom-3 left-3 z-10 text-[11px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-xl text-slate-800 dark:text-slate-200 font-mono font-bold border border-slate-300 dark:border-indigo-900/40">
                {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </div>

              <a
                href={mapBeaconUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-3 right-3 z-10 text-xs bg-indigo-600 text-white px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 font-black shadow-md hover:bg-indigo-700 transition"
              >
                <span>Google Maps View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Selected Place Detail Box */}
            {selectedPlace && (
              <div className="mt-4 p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-indigo-900/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 flex items-center justify-center shrink-0">
                    {getIconForType(selectedPlace.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {selectedPlace.name}
                    </h4>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{selectedPlace.address}</p>
                    <div className="flex items-center gap-2 text-[11px] text-indigo-700 dark:text-indigo-400 font-black mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>24/7 Verified Emergency Responder</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-600/15 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                    {selectedPlace.distance}
                  </span>
                  <a
                    href={`tel:${selectedPlace.phone}`}
                    className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 hover:bg-indigo-700 transition cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call {selectedPlace.phone}</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= DIRECTORY LIST (col-span-12 lg:col-span-4) ================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Havens' },
              { id: 'police', label: 'Police' },
              { id: 'hospital', label: 'Hospitals' },
              { id: 'pharmacy', label: '24/7 Care' },
              { id: 'safe_spot', label: 'Transit Hubs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedType === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'glass-panel text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-indigo-900/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List Cards */}
          <div className="glass-panel rounded-[32px] p-5 shadow-sm border border-slate-200 dark:border-indigo-900/50 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-indigo-900/40">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Safe Havens ({filteredPlaces.length})
              </h3>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Within 1.5 km</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredPlaces.map((place) => {
                const isSelected = selectedPlace?.id === place.id;
                return (
                  <div
                    key={place.id}
                    onClick={() => setSelectedPlace(place)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 border-indigo-600 shadow-md ring-1 ring-indigo-500'
                        : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-indigo-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        {getIconForType(place.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {place.name}
                        </h4>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block truncate">
                          {place.distance} away · 24/7 Verified
                        </span>
                      </div>
                    </div>

                    <a
                      href={`tel:${place.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-400 flex items-center justify-center transition shrink-0 cursor-pointer"
                      title="Direct Dial"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
