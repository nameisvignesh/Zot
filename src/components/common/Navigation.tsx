import React from 'react';
import { 
  LayoutDashboard, 
  GitBranch, 
  Sparkles, 
  Cpu, 
  LineChart, 
  Settings, 
  UserCircle
} from 'lucide-react';
import { NavigationTab, useZot } from '../../context/ZotContext';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'routing', label: 'Prompt Router', icon: GitBranch, badge: 'Nodes' },
  { id: 'refinement', label: 'Prompt Refinement', icon: Sparkles },
  { id: 'models', label: 'Models', icon: Cpu, badge: '100% Free' },
  { id: 'analytics', label: 'Analytics', icon: LineChart, badge: 'Live' },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'accounts', label: 'Accounts', icon: UserCircle, badge: 'Clerk' }
];

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useZot();

  return (
    <nav className="border-b border-[#2E2910] bg-[#12110c]">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#FF9100] text-black shadow-md font-bold'
                    : 'text-stone-300 hover:text-white hover:bg-[#1f1b13] border border-transparent hover:border-[#2E2910]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#FF9100]'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isActive
                        ? 'bg-black text-[#FF9100] font-bold'
                        : 'bg-[#2E2910] text-[#FF9100]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
