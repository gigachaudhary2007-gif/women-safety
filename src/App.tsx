import React from 'react';
import { SafetyProvider, useSafety } from './context/SafetyContext';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { JourneyScreen } from './components/screens/JourneyScreen';
import { SafetyMapScreen } from './components/screens/SafetyMapScreen';
import { ContactsScreen } from './components/screens/ContactsScreen';
import { SafetyToolsScreen } from './components/screens/SafetyToolsScreen';
import { EvidenceVaultScreen } from './components/screens/EvidenceVaultScreen';
import { ProfileSettingsScreen } from './components/screens/ProfileSettingsScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { EmergencySosScreen } from './components/screens/EmergencySosScreen';
import { CountdownDialog } from './components/common/CountdownDialog';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { Smartphone, Monitor, ShieldCheck, Wifi, Battery } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, updateUser, activeTab, toastMessage, theme, deviceView, setDeviceView } = useSafety();
  const showOnboarding = !user.onboardingCompleted;

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => updateUser({ onboardingCompleted: true })} />;
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'journey':
        return <JourneyScreen />;
      case 'map':
        return <SafetyMapScreen />;
      case 'contacts':
        return <ContactsScreen />;
      case 'tools':
        return <SafetyToolsScreen />;
      case 'evidence':
        return <EvidenceVaultScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'profile':
        return <ProfileSettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  const isDarkMode = theme === 'dark';

  return (
    <div
      className={`min-h-screen transition-colors duration-500 flex flex-col selection:bg-indigo-500/25 ${
        isDarkMode ? 'ambient-bg-dark text-slate-100 font-medium' : 'ambient-bg-light text-slate-900 font-medium'
      }`}
    >
      {/* Responsive Global Header */}
      <Header />

      {/* Main Responsive Experience */}
      {deviceView === 'mobile' ? (
        /* Mobile Simulator Mode on Desktop */
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6">
          <div className="flex items-center justify-between w-full max-w-sm mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
              <span className="text-xs font-extrabold tracking-wide text-indigo-950 dark:text-indigo-300">
                Interactive Mobile Simulator
              </span>
            </div>
            <button
              onClick={() => setDeviceView('web')}
              className="text-xs font-bold text-slate-700 hover:text-indigo-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel shadow-sm transition-all"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-600" />
              <span>Back to Web</span>
            </button>
          </div>

          {/* Smartphone Frame Container */}
          <div className="w-full max-w-[400px] h-[844px] max-h-[92vh] rounded-[48px] p-3 shadow-2xl border-4 border-slate-800 bg-slate-950 relative flex flex-col overflow-hidden">
            {/* Top Phone Speaker & Dynamic Island */}
            <div className="h-6 w-full flex items-center justify-between px-6 shrink-0 z-30 text-[10px] font-bold text-slate-300">
              <span>9:41</span>
              <div className="w-24 h-4 bg-black rounded-full mx-auto" />
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-indigo-400" />
                <Battery className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>

            {/* Inner Phone Screen Content */}
            <div
              className={`flex-1 overflow-y-auto rounded-[36px] relative flex flex-col ${
                isDarkMode ? 'ambient-bg-dark text-slate-100' : 'ambient-bg-light text-slate-900'
              }`}
            >
              <div className="p-4 pb-24 flex-1">
                {renderActiveScreen()}
              </div>

              {/* In-Frame Mobile Navigation */}
              <Navbar forceShow={true} />
            </div>

            {/* Home Indicator Bar */}
            <div className="h-4 w-full flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-slate-400/50 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        /* Full Desktop / Tablet Web Mode (Responsive down to mobile) */
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-12 transition-all">
          {renderActiveScreen()}
        </main>
      )}

      {/* Floating Bottom Navigation Bar for actual mobile viewports */}
      {deviceView === 'web' && <Navbar />}

      {/* Journey Guard 30s Proactive Deviation Countdown Modal */}
      <CountdownDialog />

      {/* Dedicated Emergency SOS Full Screen Interface */}
      <EmergencySosScreen />

      {/* Tactile Feedback Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
          <div className="glass-panel-elevated px-5 py-2.5 rounded-2xl shadow-xl border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2.5 animate-bounce">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <SafetyProvider>
      <MainApp />
    </SafetyProvider>
  );
}
