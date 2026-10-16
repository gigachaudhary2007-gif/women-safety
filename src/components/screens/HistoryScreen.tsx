import React, { useState } from 'react';
import {
  Clock,
  ShieldAlert,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Send,
  Lock,
  ChevronLeft,
  Search,
  Filter,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';

export const HistoryScreen: React.FC = () => {
  const { auditList, confirmationsList, emergencyEvents, setActiveTab } = useSafety();
  const [filterType, setFilterType] = useState<'ALL' | 'EMERGENCY' | 'SAFETY_CHECK' | 'AUDIT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Combine and sort events
  const allEvents = [
    ...emergencyEvents.map((e) => ({
      id: e.id,
      type: 'EMERGENCY' as const,
      title: `SOS Alert: ${e.reason}`,
      timestamp: e.timestamp,
      details: `GPS Accuracy: ±${e.gpsAccuracy}m • Status: ${e.status} • Broadcasted to ${e.notificationAttempts.length} contacts`,
      raw: e,
    })),
    ...confirmationsList.map((c) => ({
      id: c.id,
      type: 'SAFETY_CHECK' as const,
      title: c.confirmationType === 'SAFE_CONFIRMED' ? 'Safety Verified' : 'Journey Deactivated',
      timestamp: c.timestamp,
      details: c.isDuress
        ? '⚠️ Silent Duress Triggered: Stealth protocol executed, emergency contacts alerted quietly.'
        : 'Authenticated safety check passed via secure PIN verification.',
      raw: c,
    })),
    ...auditList.map((a) => ({
      id: a.id,
      type: 'AUDIT' as const,
      title: a.eventType.replace(/_/g, ' '),
      timestamp: a.timestamp,
      details: a.details,
      raw: a,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredEvents = allEvents.filter((item) => {
    if (filterType !== 'ALL' && item.type !== filterType) return false;
    if (
      searchTerm &&
      !item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !item.details.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-indigo-950/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Audit & Security History
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-400/30">
                  Cryptographic Log
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                Tamper-evident record of safety confirmations, GPS deviations, and emergency dispatches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{allEvents.length} Recorded Events</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'EMERGENCY', label: 'Emergency SOS' },
              { id: 'SAFETY_CHECK', label: 'Confirmations' },
              { id: 'AUDIT', label: 'System Audits' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterType(btn.id as typeof filterType)}
                className={`text-xs font-black px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  filterType === btn.id
                    ? 'bg-indigo-700 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="glass-panel p-10 rounded-3xl border border-slate-200 dark:border-indigo-950/60 text-center">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">No Audit Records Found</h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-sm mx-auto mt-1">
              Events will be logged automatically as journeys are tracked, safety checks are confirmed, or emergencies are broadcast.
            </p>
          </div>
        ) : (
          filteredEvents.map((item) => {
            const isEmergency = item.type === 'EMERGENCY';
            const isSafety = item.type === 'SAFETY_CHECK';
            const isDuress = isSafety && (item.raw as any).isDuress;

            return (
              <div
                key={item.id}
                className={`glass-panel p-4 sm:p-5 rounded-2xl border transition-all ${
                  isEmergency
                    ? 'border-rose-400/50 bg-rose-50/50 dark:bg-rose-950/20'
                    : isDuress
                    ? 'border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-indigo-950/60 hover:border-indigo-300 dark:hover:border-indigo-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isEmergency
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                          : isDuress
                          ? 'bg-amber-500 text-slate-950'
                          : isSafety
                          ? 'bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-200 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {isEmergency ? (
                        <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                      ) : isDuress ? (
                        <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                      ) : isSafety ? (
                        <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <FileText className="w-5 h-5 stroke-[2.2]" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white capitalize">
                          {item.title}
                        </span>
                        {isDuress && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40">
                            Duress Protocol
                          </span>
                        )}
                        {isEmergency && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white">
                            Active Dispatch
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {item.details}
                      </p>

                      {/* If emergency, render notification dispatch badges */}
                      {isEmergency && (item.raw as any).notificationAttempts && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {(item.raw as any).notificationAttempts.map((attempt: any, idx: number) => (
                            <div
                              key={idx}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border flex items-center gap-1 ${
                                attempt.status === 'PROVIDER_UNCONFIGURED'
                                  ? 'border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <Send className="w-2.5 h-2.5 text-indigo-600" />
                              <span>{attempt.contactName}:</span>
                              <span
                                className={`font-extrabold ${
                                  attempt.status === 'PROVIDER_UNCONFIGURED'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-indigo-700 dark:text-indigo-400'
                                }`}
                              >
                                {attempt.status === 'PROVIDER_UNCONFIGURED'
                                  ? 'Provider Not Configured'
                                  : attempt.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
