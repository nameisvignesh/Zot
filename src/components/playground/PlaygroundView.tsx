import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Send, Trash2 } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { ChatTurn, requestModelChat } from '../../lib/modelClient';

interface ChatMessage { role: 'user' | 'assistant' | 'system'; text: string; }

export const PlaygroundView: React.FC = () => {
  const { models, settings, runInference, isExecuting, reportConnectionStatus, t } = useZot();
  const enabledModels = useMemo(() => models.filter(model => model.enabled), [models]);
  const [modelId, setModelId] = useState('auto');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'system', text: t('playground.welcome') }]);

  useEffect(() => {
    const welcome = t('playground.welcome');
    if (messages.length === 1 && messages[0].role === 'system' && messages[0].text !== welcome) setMessages([{ role: 'system', text: welcome }]);
  }, [settings.language, messages.length]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim() || isExecuting || isSending || enabledModels.length === 0) return;
    const outgoing = message.trim();
    setMessage('');
    setIsSending(true);
    setMessages(current => [...current, { role: 'user', text: outgoing }]);

    try {
      const result = await runInference({ prompt: outgoing, refine: false, preferredModelId: modelId === 'auto' ? undefined : modelId });
      const target = models.find(model => model.id === result.model_id);
      setMessages(current => [...current, { role: 'system', text: t('playground.routed', { model: result.model_name, task: result.task_type, confidence: Math.round(result.routing_decision.task_confidence * 100) }) }]);
      if (!target) throw new Error('No model was selected.');

      const history: ChatTurn[] = [...messages.filter(item => item.role !== 'system').map(item => ({ role: item.role, content: item.text } as ChatTurn)), { role: 'user', content: outgoing }];
      const response = await requestModelChat(target, history, settings.request_timeout_ms);
      reportConnectionStatus('ready');
      setMessages(current => [...current, { role: 'assistant', text: response.text }]);
    } catch (error) {
      reportConnectionStatus('error');
      const code = error instanceof Error ? error.message : '';
      const fallback = code === 'LOCAL_RUNTIME_REQUIRED'
        ? t('playground.noLocalRuntime')
        : code === 'API_KEY_REQUIRED'
          ? t('playground.noApiKey', { model: models.find(model => model.id === modelId)?.name || 'the selected model' })
          : code || 'The selected model could not answer this message.';
      setMessages(current => [...current, { role: 'system', text: fallback }]);
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = () => {
    setMessage('');
    setMessages([{ role: 'system', text: t('playground.welcome') }]);
  };

  return (
    <div className="space-y-6">
      <div className="page-heading"><div><div className="eyebrow">{t('playground.eyebrow')}</div><h1>{t('playground.title')}</h1><p>{t('playground.description')}</p></div><div className="field min-w-[230px]"><label htmlFor="chat-model">{t('playground.model')}</label><select id="chat-model" className="select" value={modelId} onChange={event => setModelId(event.target.value)}><option value="auto">{t('playground.auto')}</option>{enabledModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></div></div>
      <div className="panel chat"><div className="panel-header"><div className="panel-title flex items-center gap-2"><Bot size={15} className="accent" /> {t('playground.chat')}</div><div className="flex items-center gap-2"><span className="badge">{modelId === 'auto' ? t('playground.auto') : models.find(model => model.id === modelId)?.name}</span><button type="button" className="button" onClick={clearChat} aria-label={t('playground.clear')} title={t('playground.clear')}><Trash2 size={14} /><span className="hidden sm:inline">{t('playground.clear')}</span></button></div></div><div className="chat-messages">{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`chat-message ${item.role}`}>{item.text}</div>)}</div><form className="chat-input" onSubmit={send}><input className="input" value={message} onChange={event => setMessage(event.target.value)} placeholder={t('playground.placeholder')} /><button className="button primary" type="submit" disabled={!message.trim() || isExecuting || isSending || enabledModels.length === 0}><Send size={15} /> {isSending ? t('playground.sending') : t('playground.send')}</button></form></div>
    </div>
  );
};
