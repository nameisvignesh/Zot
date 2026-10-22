import React from 'react';
import { Github } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  const { requestNavigation, gatewayStatus, t } = useZot();

  return (
    <header className="topbar">
      <button className="brand" onClick={() => requestNavigation('dashboard')} aria-label="Open dashboard">
        <Logo size={30} />
        <span>ZOT</span>
      </button>
      <div className="topbar-actions">
        <span className="status-dot" data-status={gatewayStatus} />
        <span className="topbar-status">{t('header.localRouter')}</span>
        <a href="https://github.com/nameisvignesh/Zot" target="_blank" rel="noreferrer" aria-label="Open GitHub">
          <Github size={17} />
        </a>
      </div>
    </header>
  );
};
