import React from 'react';
import { Github } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  const { requestNavigation, gatewayStatus } = useZot();

  return (
    <header className="topbar">
      <button className="brand" onClick={() => requestNavigation('dashboard')} aria-label="Open dashboard">
        <Logo size={30} />
        <span>ZOT</span>
      </button>
      <div className="topbar-actions">
        <span className="status-indicator"><span className="status-dot" data-status={gatewayStatus} title={`Super dot · ${gatewayStatus === 'ready' ? 'healthy' : gatewayStatus === 'error' ? 'error detected' : 'not configured or checking'}`} aria-label={`Super dot status: ${gatewayStatus}`} /><span className="topbar-status">Super dot</span></span>
        <a href="https://github.com/nameisvignesh/Zot" target="_blank" rel="noreferrer" aria-label="Open GitHub">
          <Github size={17} />
        </a>
      </div>
    </header>
  );
};
