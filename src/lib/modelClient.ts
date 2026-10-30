import { Model } from '../types';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelRequestResult {
  text: string;
  latencyMs: number;
}

const extractText = (payload: any): string => {
  const choice = payload?.choices?.[0];
  const parts = payload?.candidates?.[0]?.content?.parts;
  const anthropicParts = payload?.content;
  const candidates = [
    choice?.message?.content,
    choice?.text,
    payload?.output_text,
    payload?.response,
    payload?.message?.content,
    Array.isArray(payload) ? payload[0]?.generated_text : undefined,
    Array.isArray(parts) ? parts.map(part => part?.text || '').join('') : undefined,
    Array.isArray(anthropicParts) ? anthropicParts.map(part => part?.text || '').join('') : undefined,
  ];
  return candidates.find(value => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
};

const errorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    const detail = body?.error?.message || body?.error?.details?.[0]?.message || body?.message || body?.detail || body?.error;
    if (typeof detail === 'string' && detail.trim()) return `${response.status}: ${detail}`;
    return `${response.status}: ${response.statusText || 'The provider rejected the request. Check the model ID and endpoint.'}`;
  } catch {
    return `${response.status}: ${response.statusText || 'The provider rejected the request. Check the model ID and endpoint.'}`;
  }
};

export const normalizeModelEndpoint = (endpoint: string, provider = '') => {
  const clean = endpoint.trim().replace(/\/+$/, '');
  const providerName = provider.toLowerCase();
  if (providerName.includes('anthropic') || providerName.includes('claude')) {
    return clean.endsWith('/messages') ? clean : `${clean}/messages`;
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1):11434\/?$/i.test(clean)) return `${clean}/api/chat`;
  if (/\/models\/[^/]+$/.test(clean) && /api-inference\.huggingface\.co/i.test(clean)) return clean;
  if (clean.endsWith('/api/chat')) return clean;
  if (clean.endsWith('/api/generate')) return clean;
  if (clean.endsWith('/responses')) return clean;
  if (clean.endsWith('/chat/completions')) return clean;
  if (clean.endsWith('/openai')) return `${clean}/chat/completions`;
  if (clean.endsWith('/v1beta/openai')) return `${clean}/chat/completions`;
  if (clean.endsWith('/v1beta/openai/chat/completions')) return clean;
  if (clean.endsWith('/v1beta')) return `${clean}/openai/chat/completions`;
  if (clean.endsWith('/v1')) return `${clean}/chat/completions`;
  return clean;
};

const normalizeModelId = (model: Model) => {
  const provider = model.provider.toLowerCase();
  if (provider.includes('google') || provider.includes('gemini')) {
    return model.id.replace(/^(gemini)-(\d+)-(\d+)(-.+)?$/, '$1-$2.$3$4');
  }
  if (provider.includes('openai') || provider.includes('chatgpt')) {
    return model.id.replace(/^(gpt)-(\d+)-(\d+)(-.+)?$/, '$1-$2.$3$4');
  }
  return model.id;
};

const toChatMessages = (messages: ChatTurn[]) => messages.map(({ role, content }) => ({ role, content }));

const toOllamaMessages = (messages: ChatTurn[]) => {
  const turns = toChatMessages(messages);
  const outputOnlyInstruction = 'Return only the final user-facing answer. Do not include analysis, private reasoning, drafts, or <think> tags.';
  const systemTurn = turns.find(turn => turn.role === 'system');
  if (systemTurn) systemTurn.content = `${systemTurn.content}\n\n${outputOnlyInstruction}`;
  else turns.unshift({ role: 'system', content: outputOnlyInstruction });
  return turns;
};

const toOllamaPrompt = (messages: ChatTurn[]) => [
  'System: Return only the final user-facing answer. Do not include analysis, private reasoning, drafts, or <think> tags.',
  ...messages.map(message => `${message.role}: ${message.content}`),
].join('\n\n');

export const requestModelChat = async (
  model: Model,
  messages: ChatTurn[],
  timeoutMs = 30000,
): Promise<ModelRequestResult> => {
  if (model.type === 'local' && model.endpoint.startsWith('local://')) {
    throw new Error('LOCAL_RUNTIME_REQUIRED');
  }
  if (!model.api_key && !/\/api\/(?:chat|generate)$/.test(model.endpoint)) throw new Error('API_KEY_REQUIRED');

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  const provider = model.provider.toLowerCase();
  const isAnthropic = provider.includes('anthropic') || provider.includes('claude');
  const isGoogle = provider.includes('google') || provider.includes('gemini');
  const endpoint = normalizeModelEndpoint(model.endpoint, model.provider);
  const useGoogleNativeApi = isGoogle && endpoint.includes('generativelanguage.googleapis.com') && !endpoint.includes('/openai/');
  const isHuggingFaceInference = /api-inference\.huggingface\.co/i.test(endpoint) && /\/models\//.test(endpoint);
  const isOllamaChat = /\/api\/chat$/.test(endpoint);
  const isOllamaGenerate = /\/api\/generate$/.test(endpoint);
  const isOpenAIResponses = /\/responses$/.test(endpoint);
  const isGoogleOpenAiCompat = isGoogle && endpoint.includes('generativelanguage.googleapis.com') && endpoint.includes('/openai/');
  const googleModelId = normalizeModelId(model);
  const requestModelId = model.id.startsWith('public:') ? model.id.slice('public:'.length) : model.id;
  const googleBase = endpoint.includes('/v1beta') ? `${endpoint.split('/v1beta')[0]}/v1beta` : endpoint;
  const requestEndpoint = useGoogleNativeApi
    ? `${googleBase}/models/${googleModelId}:generateContent?key=${encodeURIComponent(model.api_key)}`
    : isGoogleOpenAiCompat
      ? `${endpoint}?key=${encodeURIComponent(model.api_key)}`
      : endpoint;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(!useGoogleNativeApi && isAnthropic
        ? { 'x-api-key': model.api_key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        : !useGoogleNativeApi && !isGoogleOpenAiCompat && model.api_key ? { Authorization: `Bearer ${model.api_key}` } : {}),
    };
    const body = useGoogleNativeApi
      ? {
          contents: messages.filter(message => message.role !== 'system').map(message => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
          ...(messages.find(message => message.role === 'system') ? { systemInstruction: { parts: [{ text: messages.find(message => message.role === 'system')?.content }] } } : {}),
          generationConfig: { maxOutputTokens: 512, temperature: 0.2 },
        }
      : isAnthropic
      ? {
          model: requestModelId,
          max_tokens: 512,
          messages: messages.filter(message => message.role !== 'system'),
          system: messages.find(message => message.role === 'system')?.content,
        }
      : isHuggingFaceInference
      ? { inputs: messages.map(message => `${message.role}: ${message.content}`).join('\n'), parameters: { max_new_tokens: 512, temperature: 0.2 }, options: { wait_for_model: true } }
      : isOllamaChat
      ? { model: requestModelId, messages: toOllamaMessages(messages), stream: false, think: false, options: { temperature: 0.2, num_predict: 512 } }
      : isOllamaGenerate
      ? { model: requestModelId, prompt: toOllamaPrompt(messages), stream: false, think: false, options: { temperature: 0.2, num_predict: 512 } }
      : isOpenAIResponses
      ? { model: requestModelId, input: messages.map(message => ({ role: message.role, content: [{ type: 'input_text', text: message.content }] })), max_output_tokens: 512, temperature: 0.2 }
      : { model: requestModelId, messages, max_tokens: 512, temperature: 0.2, stream: false };

    const response = await fetch(requestEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    const payload = await response.json();
    let text = isOllamaGenerate && typeof payload?.response === 'string' ? payload.response.trim() : extractText(payload);
    if (isOllamaChat || isOllamaGenerate) {
      const thinkEnd = text.lastIndexOf('</think>');
      if (thinkEnd >= 0) text = text.slice(thinkEnd + '</think>'.length).trim();
      else if (/<think>/i.test(text)) text = '';
      text = text.replace(/^<think>[\s\S]*?<\/think>/i, '').trim();
    }
    if (!text) {
      if (isOllamaChat || isOllamaGenerate) {
        const message = payload?.message;
        const available = message && typeof message === 'object' ? Object.keys(message).join(', ') : Object.keys(payload || {}).join(', ');
        throw new Error(`Ollama returned no displayable text for “${model.id}”${available ? ` (response fields: ${available})` : ''}. Check that this model supports chat and try its Ollama tag as the Model ID.`);
      }
      const blockReason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason;
      throw new Error(blockReason ? `The provider returned no text (${blockReason}).` : 'The provider returned a successful response without any text. Check the selected model and its response format.');
    }
    return { text, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('The model request timed out.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

export const testModelConnection = async (model: Model, timeoutMs = 10000) => {
  if (model.type === 'local' && model.endpoint.startsWith('local://')) {
    return { ok: false, message: 'This local checkpoint needs a configured inference runtime endpoint.' };
  }
  if (!model.api_key && !/\/api\/(?:chat|generate)$/.test(model.endpoint)) {
    return { ok: false, message: 'Add an API key for this hosted API model.' };
  }
  const provider = model.provider.toLowerCase();
  if ((provider.includes('google') || provider.includes('gemini')) && model.api_key) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(model.api_key)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new Error(await errorMessage(response));
      const payload = await response.json();
      const configuredModel = normalizeModelId(model).replace(/-latest$/, '');
      const supported = (payload.models || []).some((item: any) => String(item.name || '').replace(/^models\//, '') === configuredModel && (item.supportedGenerationMethods || []).includes('generateContent'));
      return supported
        ? { ok: true, message: 'Google API key and model access verified.' }
        : { ok: false, message: `Key is valid, but the configured model (${model.id}) was not listed with generateContent access.` };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Google API validation failed.' };
    } finally {
      window.clearTimeout(timer);
    }
  }
  try {
    const result = await requestModelChat(model, [{ role: 'user', content: 'Reply with OK.' }], timeoutMs);
    return { ok: true, message: `Connected in ${result.latencyMs}ms.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'The provider request failed.' };
  }
};
