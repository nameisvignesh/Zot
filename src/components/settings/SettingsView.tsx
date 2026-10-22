import React, { useState } from 'react';
import { Check, Save, Settings2 } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { DEFAULT_SETTINGS } from '../../data/mockData';
import { ZotSettings } from '../../types';

export const SettingsView: React.FC = () => {
  const { settingsDraft: draft, updateSettingsDraft, commitSettingsDraft, models, refinerVersions, settingsDirty, t } = useZot();
  const [saved, setSaved] = useState(false);

  const change = <K extends keyof ZotSettings>(key: K, value: ZotSettings[K]) => {
    updateSettingsDraft({ [key]: value } as Partial<ZotSettings>);
    setSaved(false);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    commitSettingsDraft();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
    updateSettingsDraft({ ...DEFAULT_SETTINGS });
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('settings.eyebrow')}</div>
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.description')}</p>
        </div>
        {settingsDirty && <span className="badge warn">{t('settings.unsaved')}</span>}
      </div>

      <form className="space-y-4" onSubmit={save}>
        <div className="panel">
          <div className="panel-header"><div className="panel-title flex items-center gap-2"><Settings2 size={15} className="accent" /> {t('settings.general')}</div></div>
          <div className="panel-body grid-2">
            <div className="field"><label htmlFor="language">{t('settings.language')}</label><select id="language" className="select" value={draft.language} onChange={event => change('language', event.target.value as ZotSettings['language'])}><option value="ta">{t('settings.tamil')}</option><option value="en">{t('settings.english')}</option><option value="hi">{t('settings.hindi')}</option><option value="ru">{t('settings.russian')}</option><option value="de">{t('settings.german')}</option><option value="ja">{t('settings.japanese')}</option><option value="ko">{t('settings.korean')}</option></select></div>
            <div className="field"><label htmlFor="currency">{t('settings.currency')}</label><select id="currency" className="select" value={draft.cost_currency} onChange={event => change('cost_currency', event.target.value as ZotSettings['cost_currency'])}><option value="INR">INR · ₹</option><option value="USD">USD · $</option><option value="EUR">EUR · €</option><option value="GBP">GBP · £</option></select></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">{t('settings.runtime')}</div></div>
          <div className="panel-body grid-2">
            <div className="field"><label htmlFor="default-model">{t('settings.defaultModel')}</label><select id="default-model" className="select" value={draft.default_model} onChange={event => change('default_model', event.target.value)}>{models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></div>
            <div className="field"><label htmlFor="device">{t('settings.device')}</label><select id="device" className="select" value={draft.model_device} onChange={event => change('model_device', event.target.value as ZotSettings['model_device'])}><option value="auto">{t('settings.autoDetect')}</option><option value="cuda:0">{t('settings.cuda')}</option><option value="mps">{t('settings.metal')}</option><option value="cpu">{t('settings.cpu')}</option></select><small>{t('settings.deviceNote')}</small></div>
            <div className="field"><label htmlFor="timeout">{t('settings.timeout')}</label><input id="timeout" className="input" type="number" value={draft.request_timeout_ms} onChange={event => change('request_timeout_ms', Number(event.target.value))} /></div>
            <div className="field"><label htmlFor="refiner">{t('settings.refiner')}</label><select id="refiner" className="select" value={draft.default_refiner} onChange={event => change('default_refiner', event.target.value as ZotSettings['default_refiner'])}>{refinerVersions.map(version => <option key={version.id} value={version.id}>{version.name}</option>)}</select></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">{t('settings.behaviour')}</div></div>
          <div className="panel-body">
            <div className="switch-row"><div><strong className="text-sm">{t('settings.autoRefine')}</strong><div className="muted text-xs mt-1">{t('settings.autoRefineNote')}</div></div><button type="button" className={draft.auto_refine_on_run ? 'switch on' : 'switch'} onClick={() => change('auto_refine_on_run', !draft.auto_refine_on_run)} aria-label="Toggle auto refine" /></div>
            <div className="field mt-4"><label htmlFor="similarity">{t('settings.similarity', { value: draft.min_similarity_threshold.toFixed(2) })}</label><input id="similarity" type="range" min="0.7" max="0.98" step="0.01" value={draft.min_similarity_threshold} onChange={event => change('min_similarity_threshold', Number(event.target.value))} /></div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3"><button type="button" className="button" onClick={reset}>{t('settings.reset')}</button><button type="submit" className="button primary"><Save size={15} /> {saved ? t('settings.saved') : t('settings.save')} {saved && <Check size={15} />}</button></div>
      </form>
      <div className="muted text-xs">{settingsDirty ? t('settings.leaveNote') : t('settings.draftNote')}</div>
    </div>
  );
};
