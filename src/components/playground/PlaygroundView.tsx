import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, Download, Pencil, Send, Trash2, X } from 'lucide-react';
import { useZot } from '../../context/ZotContext';

interface ChatMessage { role: 'user' | 'assistant' | 'system'; text: string; }

const renderInlineMarkdown = (text: string) => text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
  if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
  if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
  if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
  return <React.Fragment key={index}>{part}</React.Fragment>;
});

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p-${blocks.length}`}>{renderInlineMarkdown(paragraph.join(' '))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!listType || !listItems.length) return;
    const Tag = listType;
    blocks.push(<Tag key={`list-${blocks.length}`}>{listItems.map((item, index) => <li key={index}>{renderInlineMarkdown(item)}</li>)}</Tag>);
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(heading[1].length, 3) + 1;
      const Heading = `h${level}` as 'h2' | 'h3' | 'h4';
      blocks.push(<Heading key={`h-${blocks.length}`}>{renderInlineMarkdown(heading[2])}</Heading>);
    } else if (ordered || unordered) {
      flushParagraph();
      const nextType = ordered ? 'ol' : 'ul';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((ordered || unordered)![1]);
    } else if (!line.trim()) {
      flushParagraph(); flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph(); flushList();
  return <div className="chat-markdown">{blocks}</div>;
};

export const PlaygroundView: React.FC = () => {
  const { models, runInference, isExecuting, reportConnectionStatus, t } = useZot();
  const enabledModels = useMemo(() => models.filter(model => model.enabled), [models]);
  const [modelId, setModelId] = useState('auto');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatName, setChatName] = useState(() => typeof window === 'undefined' ? 'Chat' : window.localStorage.getItem('zot_playground_chat_name') || 'Chat');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(chatName);
  const nameInput = useRef<HTMLInputElement>(null);
  const hasConversation = messages.some(item => item.role === 'user');

  useEffect(() => { if (isEditingName) nameInput.current?.focus(); }, [isEditingName]);

  const saveChatName = () => {
    const nextName = nameDraft.trim().slice(0, 15) || 'Chat';
    setChatName(nextName);
    setNameDraft(nextName);
    window.localStorage.setItem('zot_playground_chat_name', nextName);
    setIsEditingName(false);
  };

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
      setMessages(current => [...current, { role: 'system', text: t('playground.routed', { model: result.model_name, task: result.task_type }) }]);
      if (!target) throw new Error('No model was selected.');
      if (result.status === 'error') throw new Error(result.error_message || 'The selected model could not answer this message.');
      reportConnectionStatus('ready');
      setMessages(current => [...current, { role: 'assistant', text: result.response_text }]);
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
    if (!hasConversation || isSending || isExecuting) return;
    if (!window.confirm('Do you want to clear this chat?')) return;
    setMessage('');
    setMessages([]);
  };

  const downloadChat = () => {
    if (!hasConversation || isSending || isExecuting) return;
    if (!window.confirm('Do you want to download this conversation?')) return;
    const markdown = [`# ${chatName}`, '', ...messages.flatMap(item => [`### ${item.role[0].toUpperCase()}${item.role.slice(1)}`, '', item.text, ''])].join('\n');
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `zot-chat-${new Date().toISOString().slice(0, 16).replaceAll(':', '-')}.md`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="space-y-6">
    <div className="page-heading"><div><div className="eyebrow">{t('playground.eyebrow')}</div><h1>{t('playground.title')}</h1><p>{t('playground.description')}</p></div><div className="field min-w-[230px]"><label htmlFor="chat-model">{t('playground.model')}</label><select id="chat-model" className="select" value={modelId} onChange={event => setModelId(event.target.value)}><option value="auto">{t('playground.auto')}</option>{enabledModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></div></div>
    <div className="panel chat">
      <div className="panel-header">
        <div className="panel-title flex items-center gap-2">
          <Bot size={15} className="accent" />
          {isEditingName ? <><input ref={nameInput} className="input chat-name-input" value={nameDraft} maxLength={15} aria-label="Chat name (15 characters maximum)" onChange={event => setNameDraft(event.target.value.slice(0, 15))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveChatName(); } if (event.key === 'Escape') setIsEditingName(false); }} /><span className="muted text-xs">{nameDraft.length}/15</span><button type="button" className="icon-button" onClick={saveChatName} aria-label="Save chat name" title="Save"><Check size={15} /></button><button type="button" className="icon-button" onClick={() => { setNameDraft(chatName); setIsEditingName(false); }} aria-label="Cancel chat name edit" title="Cancel"><X size={15} /></button></> : <><span>{chatName}</span><button type="button" className="icon-button chat-name-edit" onClick={() => { setNameDraft(chatName); setIsEditingName(true); }} aria-label="Rename chat" title="Rename chat"><Pencil size={13} /></button></>}
        </div>
        <div className="flex items-center gap-2"><span className="badge">{modelId === 'auto' ? t('playground.auto') : models.find(model => model.id === modelId)?.name}</span><button type="button" className="button" onClick={downloadChat} disabled={!hasConversation || isSending || isExecuting} aria-label="Download conversation as Markdown" title="Download conversation as Markdown"><Download size={14} /></button><button type="button" className="button" onClick={clearChat} disabled={!hasConversation || isSending || isExecuting} aria-label={t('playground.clear')} title={t('playground.clear')}><Trash2 size={14} /><span className="hidden sm:inline">{t('playground.clear')}</span></button></div>
      </div>
      <div className="chat-messages">{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`chat-message ${item.role}`}>{item.role === 'assistant' ? <FormattedMessage text={item.text} /> : item.text}</div>)}</div>
      <form className="chat-input" onSubmit={send}><input className="input" value={message} onChange={event => setMessage(event.target.value)} placeholder={t('playground.placeholder')} /><button className="button primary" type="submit" disabled={!message.trim() || isExecuting || isSending || enabledModels.length === 0}><Send size={15} /> {isSending ? t('playground.sending') : t('playground.send')}</button></form>
    </div>
  </div>;
};
