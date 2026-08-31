import React, { useState } from 'react';
import { useZot } from '../../context/ZotContext';
import { Logo } from './Logo';
import { 
  Activity, 
  User, 
  LogOut, 
  Key, 
  ChevronDown, 
  ShieldCheck, 
  Check, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    userAccount, 
    setIsAuthModalOpen, 
    setAuthModalMode, 
    logout,
    requests,
    setActiveTab,
    gatewayStatus,
    gatewayPingMs,
    testGatewayConnection
  } = useZot();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#2E2910] bg-[#14120d]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <Logo size={34} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                ZOT
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#2E2910] text-[#FF9100] border border-[#FF9100]/30 tracking-wide">
                ZERO-SHOT ROUTER
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-sans">
              Prompt Refinement & Free Model Routing Gateway
            </p>
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3">
          {/* Telemetry Status Indicator */}
          <button
            onClick={() => setActiveTab('analytics')}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1a1710] hover:bg-[#231f16] border border-[#2E2910] rounded-xl text-xs text-stone-300 transition-colors"
            title="Real-time Telemetry Analytics"
          >
            <Activity className="w-3.5 h-3.5 text-[#FF9100]" />
            <span className="font-medium text-stone-200">Telemetry</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12110c] text-emerald-400 font-semibold">
              {requests.length} logs
            </span>
          </button>

          {/* Gateway Ping Indicator */}
          <div 
            onClick={testGatewayConnection}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#1a1710] border border-[#2E2910] rounded-xl text-xs text-stone-300 cursor-pointer hover:border-[#FF9100]/50 transition-colors"
            title="Local Neural Engine Ping"
          >
            <span className={`w-2 h-2 rounded-full ${
              gatewayStatus === 'ready' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`} />
            <span className="text-stone-400">Gateway:</span>
            <span className="font-mono text-stone-200 font-semibold">{gatewayPingMs}ms</span>
          </div>

          {/* Clerk User Profile Button */}
          {userAccount ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 bg-[#1a1710] hover:bg-[#231f16] border border-[#2E2910] rounded-xl transition-all cursor-pointer"
              >
                {userAccount.imageUrl ? (
                  <img
                    src={userAccount.imageUrl}
                    alt={`${userAccount.firstName} ${userAccount.lastName}`}
                    className="w-7 h-7 rounded-lg object-cover border border-[#FF9100]"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#231f16] border border-[#2E2910] text-[#FF9100] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <span className="text-xs font-semibold text-white hidden sm:inline-block">
                  {userAccount.firstName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {/* Clerk User Menu Popover */}
              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-[#18150f] border border-[#2E2910] rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-3 pb-3 border-b border-[#2E2910]">
                      {userAccount.imageUrl ? (
                        <img
                          src={userAccount.imageUrl}
                          alt={`${userAccount.firstName} ${userAccount.lastName}`}
                          className="w-10 h-10 rounded-xl object-cover border border-[#FF9100]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#231f16] border border-[#2E2910] text-[#FF9100] flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">
                          {userAccount.firstName} {userAccount.lastName}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate font-mono">
                          {userAccount.email}
                        </div>
                      </div>
                    </div>

                    <div className="py-2 space-y-1 text-xs">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setActiveTab('accounts');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-stone-300 hover:bg-[#2E2910]/50 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        <User className="w-4 h-4 text-[#FF9100]" />
                        <span>Manage Account & Keys</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setActiveTab('accounts');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-stone-300 hover:bg-[#2E2910]/50 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Security & MFA ({userAccount.mfaEnabled ? 'Enabled' : 'Off'})</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[#2E2910]">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left text-xs font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthModalMode('signIn');
                setIsAuthModalOpen(true);
              }}
              className="flex items-center gap-2 py-1.5 px-3.5 bg-[#FF9100] hover:bg-[#e08000] text-black font-semibold rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
