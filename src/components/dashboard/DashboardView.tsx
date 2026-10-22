import React from 'react';
import { ArrowRight, Github, ListChecks } from 'lucide-react';
import { useZot } from '../../context/ZotContext';

export const DashboardView: React.FC = () => {
  const { requestNavigation, t } = useZot();

  return (
    <div>
      <section className="hero">
        <div className="eyebrow">{t('dashboard.eyebrow')}</div>
        <h1>{t('dashboard.titleStart')} <span>{t('dashboard.titleHighlight')}</span></h1>
        <p>{t('dashboard.description')}</p>
        <div className="hero-actions">
          <button className="button primary" onClick={() => requestNavigation('routing')}>
            <ListChecks size={15} /> {t('dashboard.openRouter')} <ArrowRight size={15} />
          </button>
          <a className="button ghost" href="https://github.com/nameisvignesh/Zot" target="_blank" rel="noreferrer">
            <Github size={15} /> {t('dashboard.viewGithub')}
          </a>
        </div>
      </section>

      <section className="dashboard-footer">
        <div>
          <div className="eyebrow">{t('dashboard.builtBy')}</div>
          <p>{t('dashboard.footer')}</p>
        </div>
        <div className="dashboard-footer-links">
          <a className="button" href="https://github.com/nameisvignesh/Zot" target="_blank" rel="noreferrer">{t('dashboard.rate')}</a>
          <a className="button primary" href="https://github.com/nameisvignesh/Zot" target="_blank" rel="noreferrer">{t('dashboard.contribute')}</a>
        </div>
      </section>

      <section className="dashboard-learn">
        <div className="eyebrow">{t('dashboard.learnEyebrow')}</div>
        <h2>{t('dashboard.learnTitle')}</h2>
        <p className="dashboard-learn-intro">{t('dashboard.learnDescription')}</p>
        <div className="learn-grid">
          <article><strong>{t('dashboard.learnRouting')}</strong><p>{t('dashboard.learnRoutingText')}</p></article>
          <article><strong>{t('dashboard.learnLocal')}</strong><p>{t('dashboard.learnLocalText')}</p></article>
          <article><strong>{t('dashboard.learnProviders')}</strong><p>{t('dashboard.learnProvidersText')}</p></article>
        </div>
      </section>
    </div>
  );
};
