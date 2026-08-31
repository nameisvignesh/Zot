import React from 'react';
import { ZotProvider, useZot } from './context/ZotContext';
import { Header } from './components/common/Header';
import { Navigation } from './components/common/Navigation';
import { Logo } from './components/common/Logo';
import { DashboardView } from './components/dashboard/DashboardView';
import { RoutingView } from './components/routing/RoutingView';
import { RefinementView } from './components/refinement/RefinementView';
import { ModelsView } from './components/models/ModelsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { AccountsView } from './components/accounts/AccountsView';
import { ClerkAuthModal } from './components/auth/ClerkAuthModal';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab } = useZot();

  return (
    <div className="min-h-screen bg-[#12110c] text-stone-100 flex flex-col font-sans selection:bg-[#FF9100]/30 selection:text-[#FF9100]">
      <Header />
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'routing' && <RoutingView />}
        {activeTab === 'refinement' && <RefinementView />}
        {activeTab === 'models' && <ModelsView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'accounts' && <AccountsView />}
      </main>

      {/* Global Clerk Authentication Modal */}
      <ClerkAuthModal />

      {/* Clean Footer */}
      <footer className="border-t border-[#2E2910] bg-[#14120d] py-6 px-4 lg:px-8 mt-12 text-xs text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <div>
              <span className="font-bold text-white">ZOT — Zero-Shot Prompt Routing System</span>
              <p className="text-[11px] text-stone-400">Categorize • Refine • Route Free Models • Live Telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-stone-300">
            <button onClick={() => setActiveTab('routing')} className="hover:text-[#FF9100] transition-colors cursor-pointer">
              Prompt Router
            </button>
            <button onClick={() => setActiveTab('refinement')} className="hover:text-[#FF9100] transition-colors cursor-pointer">
              Refinement
            </button>
            <button onClick={() => setActiveTab('models')} className="hover:text-[#FF9100] transition-colors cursor-pointer">
              Free Models
            </button>
            <button onClick={() => setActiveTab('accounts')} className="hover:text-[#FF9100] transition-colors cursor-pointer">
              Clerk Account
            </button>
          </div>

          <div className="text-[11px] text-stone-500 font-mono">
            Zero-Shot Invariant Routing • 100% Free Inference
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ZotProvider>
      <MainContent />
    </ZotProvider>
  );
}
