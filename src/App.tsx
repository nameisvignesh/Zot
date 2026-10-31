import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { ZotProvider, useZot } from './context/ZotContext';
import { Header } from './components/common/Header';
import { Navigation } from './components/common/Navigation';
import { DashboardView } from './components/dashboard/DashboardView';
import { RoutingView } from './components/routing/RoutingView';
import { RefinementView } from './components/refinement/RefinementView';
import { ModelsView } from './components/models/ModelsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { CostAnalyticsView } from './components/analytics/CostAnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { PlaygroundView } from './components/playground/PlaygroundView';

const MainContent: React.FC = () => {
  const { activeTab, settings } = useZot();
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  useEffect(() => {
    const updateScroll = () => setAtBottom(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 32);
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    updateScroll();
    return () => { window.removeEventListener('scroll', updateScroll); window.removeEventListener('resize', updateScroll); };
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#090909] text-[#f4f4f5] font-sans selection:bg-[#f5a524]/30">
      <Header />
      <Navigation />
      <main className="app-shell">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'routing' && <RoutingView />}
        {activeTab === 'refinement' && <RefinementView />}
        {activeTab === 'models' && <ModelsView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'cost-analytics' && <CostAnalyticsView />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'playground' && <PlaygroundView />}
      </main>
      <footer className="app-footer"><div><strong>ZOT · Zero-Shot Prompt Routing System</strong><span>Developed by Vignesh and Chat:) · Open source project</span></div><div className="app-footer-links"><a href="https://github.com/nameisvignesh/Zot" target="_blank" rel="noreferrer">GitHub</a><a href="https://github.com/nameisvignesh/Zot/blob/main/README.md" target="_blank" rel="noreferrer">README</a><a href="https://github.com/nameisvignesh/Zot/blob/main/LICENSE" target="_blank" rel="noreferrer">License</a></div></footer>
      <button className="page-jump" aria-label={atBottom ? 'Scroll to top' : 'Scroll to bottom'} title={atBottom ? 'Scroll to top' : 'Scroll to bottom'} onClick={() => window.scrollTo({ top: atBottom ? 0 : document.documentElement.scrollHeight, behavior: 'smooth' })}>{atBottom ? <ArrowUp size={18} /> : <ArrowDown size={18} />}</button>
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
