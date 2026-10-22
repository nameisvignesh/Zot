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
  if (typeof choice?.message?.content === 'string') return choice.message.content;
  if (typeof choice?.text === 'string') return choice.text;
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map(part => part?.text || '').join('').trim();
  const anthropicParts = payload?.content;
  if (Array.isArray(anthropicParts)) return anthropicParts.map(part => part?.text || '').join('').trim();
  return '';
};

const errorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return body?.error?.message || body?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const normalizeModelEndpoint = (endpoint: string, provider = '') => {
  const clean = endpoint.trim().replace(/\/+$/, '');
  const providerName = provider.toLowerCase();
  if (providerName.includes('anthropic') || providerName.includes('claude')) {
    return clean.endsWith('/messages') ? clean : `${clean}/messages`;
  }
  if (clean.endsWith('/chat/completions')) return clean;
  if (clean.endsWith('/openai')) return `${clean}/chat/completions`;
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

export const requestModelChat = async (
  model: Model,
  messages: ChatTurn[],
  timeoutMs = 30000,
): Promise<ModelRequestResult> => {
  if (model.type === 'local' || model.endpoint.startsWith('local://')) {
    throw new Error('LOCAL_RUNTIME_REQUIRED');
  }
  if (!model.api_key) throw new Error('API_KEY_REQUIRED');

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  const provider = model.provider.toLowerCase();
  const isAnthropic = provider.includes('anthropic') || provider.includes('claude');
  const isGoogle = provider.includes('google') || provider.includes('gemini');
  const endpoint = normalizeModelEndpoint(model.endpoint, model.provider);
  const useGoogleNativeApi = isGoogle && endpoint.includes('generativelanguage.googleapis.com');
  const googleModelId = normalizeModelId(model);
  const googleBase = endpoint.includes('/v1beta') ? `${endpoint.split('/v1beta')[0]}/v1beta` : endpoint;
  const requestEndpoint = useGoogleNativeApi
    ? `${googleBase}/models/${googleModelId}:generateContent?key=${encodeURIComponent(model.api_key)}`
    : endpoint;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(!useGoogleNativeApi && isAnthropic
        ? { 'x-api-key': model.api_key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        : !useGoogleNativeApi ? { Authorization: `Bearer ${model.api_key}` } : {}),
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
          model: normalizeModelId(model),
          max_tokens: 512,
          messages: messages.filter(message => message.role !== 'system'),
          system: messages.find(message => message.role === 'system')?.content,
        }
      : { model: normalizeModelId(model), messages, max_tokens: 512, temperature: 0.2, stream: false };

    const response = await fetch(requestEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    const text = extractText(await response.json());
    if (!text) throw new Error('The provider returned an empty response.');
    return { text, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('The model request timed out.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

export const testModelConnection = async (model: Model, timeoutMs = 10000) => {
  if (model.type === 'local' || model.endpoint.startsWith('local://')) {
    return { ok: true, message: 'Offline checkpoint available; no API request required.' };
  }
  try {
    const result = await requestModelChat(model, [{ role: 'user', content: 'Reply with OK.' }], timeoutMs);
    return { ok: true, message: `Connected in ${result.latencyMs}ms.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'The provider request failed.' };
  }
};
