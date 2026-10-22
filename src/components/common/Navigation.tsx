import React from 'react';
import { BarChart3, Bot, Gauge, Home, KeyRound, ListChecks, MessageSquare, Settings2 } from 'lucide-react';
import { NavigationTab, useZot } from '../../context/ZotContext';

const NAV_ITEMS: Array<{ id: NavigationTab; key: string; icon: React.ElementType }> = [
  { id: 'dashboard', key: 'nav.dashboard', icon: Home },
  { id: 'routing', key: 'nav.routing', icon: ListChecks },
  { id: 'refinement', key: 'nav.refinement', icon: KeyRound },
  { id: 'models', key: 'nav.models', icon: Bot },
  { id: 'analytics', key: 'nav.analytics', icon: BarChart3 },
  { id: 'cost-analytics', key: 'nav.cost', icon: Gauge },
  { id: 'playground', key: 'nav.playground', icon: MessageSquare },
  { id: 'settings', key: 'nav.settings', icon: Settings2 },
];

export const Navigation: React.FC = () => {
  const { activeTab, requestNavigation, t } = useZot();

  return (
    <nav className="nav-strip" aria-label="Primary navigation">
      <div className="nav-inner">
        {NAV_ITEMS.map(({ id, key, icon: Icon }) => (
          <button key={id} onClick={() => requestNavigation(id)} className={activeTab === id ? 'nav-item active' : 'nav-item'}>
            <Icon size={15} />
            <span>{t(key)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
