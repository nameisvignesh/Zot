import React from 'react';
import { ArrowRight, Github, ListChecks, Server, SlidersHorizontal, Sparkles } from 'lucide-react';
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
          <div className="eyebrow">Open-source project · Developed by Vignesh and Chat:)</div>
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
        <div className="mt-8"><div className="eyebrow">GET STARTED</div><h2>Set up ZOT in three steps</h2><div className="learn-grid mt-4"><button className="panel p-4 text-left" onClick={() => requestNavigation('models')}><Server size={18} className="accent" /><strong className="block mt-3">1. Configure a model</strong><p className="muted text-xs mt-2">Connect Ollama locally or add a hosted provider with your own API key.</p><span className="button mt-2">Open Models <ArrowRight size={13} /></span></button><button className="panel p-4 text-left" onClick={() => requestNavigation('settings')}><SlidersHorizontal size={18} className="accent" /><strong className="block mt-3">2. Review preferences</strong><p className="muted text-xs mt-2">Choose a default model, currency, and routing behavior.</p><span className="button mt-2">Open Settings <ArrowRight size={13} /></span></button><button className="panel p-4 text-left" onClick={() => requestNavigation('routing')}><Sparkles size={18} className="accent" /><strong className="block mt-3">3. Route a prompt</strong><p className="muted text-xs mt-2">Submit a prompt and review its measured latency, tokens, and cost.</p><span className="button mt-2">Open Prompt Router <ArrowRight size={13} /></span></button></div></div>
      </section>
    </div>
  );
};
