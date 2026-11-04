import { Model } from '../types';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelRequestResult {
  text: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface DiscoveredModel {
  id: string;
  name: string;
}

export const discoverProviderModels = async (provider: string, endpoint: string, apiKey: string, timeoutMs = 15000): Promise<DiscoveredModel[]> => {
  const cleanProvider = provider.toLowerCase();
  let url: string;
  let headers: Record<string, string> = { Accept: 'application/json' };
  if (cleanProvider.includes('google') || cleanProvider.includes('gemini')) {
    url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  } else if (cleanProvider.includes('anthropic') || cleanProvider.includes('claude')) {
    url = 'https://api.anthropic.com/v1/models';
    headers = { ...headers, 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  } else {
    const base = endpoint.trim().replace(/\/+$/, '')
      .replace(/\/(?:chat\/completions|responses|messages)$/, '')
      .replace(/\/v1beta\/openai$/, '/v1beta/openai')
      .replace(/\/v1$/, '');
    url = `${base}/v1/models`;
    headers = { ...headers, Authorization: `Bearer ${apiKey}` };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(await errorMessage(response));
    const payload = await response.json();
    const entries = Array.isArray(payload?.models) ? payload.models : Array.isArray(payload?.data) ? payload.data : [];
    const models = entries
      .filter((item: any) => !item.supportedGenerationMethods || item.supportedGenerationMethods.includes('generateContent'))
      .map((item: any) => {
        const id = String(item.id || item.name || '').replace(/^models\//, '');
        return id ? { id, name: String(item.displayName || item.name || id).replace(/^models\//, '') } : null;
      })
      .filter((item: DiscoveredModel | null): item is DiscoveredModel => Boolean(item));
    if (models.length === 0) throw new Error('The provider accepted the key but returned no models for this endpoint. Confirm the provider endpoint and model access.');
    return models;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Model discovery timed out.');
    if (error instanceof TypeError) throw new Error('Could not reach the provider model list. Check the endpoint and browser CORS access.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

const extractTextContent = (value: any): string => {
  if (typeof value === 'string') return value.trim();
  if (!Array.isArray(value)) return '';
  return value
    .map(part => typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim();
};

const extractText = (payload: any): string => {
  const choice = payload?.choices?.[0];
  const parts = payload?.candidates?.[0]?.content?.parts;
  const responseParts = Array.isArray(payload?.output)
    ? payload.output
      .filter((item: any) => item?.type === 'message')
      .flatMap((item: any) => Array.isArray(item?.content)
        ? item.content.filter((part: any) => part?.type === 'output_text' || part?.type === 'text')
        : [])
    : undefined;
  const candidates = [
    choice?.message?.content,
    choice?.text,
    payload?.output_text,
    payload?.response,
    payload?.message?.content,
    Array.isArray(payload) ? payload[0]?.generated_text : undefined,
    parts,
    payload?.content,
    responseParts,
  ];
  return candidates.map(extractTextContent).find(value => value.length > 0) || '';
};

const errorMessage = async (response: Response) => {
  try {
    const raw = await response.text();
    let body: any;
    try { body = JSON.parse(raw); } catch { body = undefined; }
    const detail = body?.error?.message || body?.error?.details?.[0]?.message || body?.message || body?.detail || (typeof body?.error === 'string' ? body.error : '') || raw;
    if (typeof detail === 'string' && detail.trim()) {
      if (/(insufficient|exhausted|quota|billing|credit balance|payment required)/i.test(detail)) {
        return `Provider quota or credits are unavailable (${response.status}). Check the API key's billing, credits, and usage limits. ${detail}`;
      }
      return `${response.status}: ${detail}`;
    }
    return `${response.status}: ${response.statusText || 'The provider rejected the request. Check the model ID and endpoint.'}`;
  } catch {
    return `${response.status}: ${response.statusText || 'The provider rejected the request. Check the model ID and endpoint.'}`;
  }
};

export const normalizeModelEndpoint = (endpoint: string) => endpoint.trim();

const resolveModelRequestEndpoint = (endpoint: string, provider: string) => {
  const clean = normalizeModelEndpoint(endpoint).replace(/\/+$/, '');
  const providerName = provider.toLowerCase();
  if (
    /\/(?:chat\/completions|responses|messages|api\/chat|api\/generate)$/.test(clean)
    || (/\/models\/[^/]+$/.test(clean) && /api-inference\.huggingface\.co/i.test(clean))
  ) return clean;
  if (providerName.includes('anthropic') || providerName.includes('claude')) return `${clean}/messages`;
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1):11434$/i.test(clean)) return `${clean}/api/chat`;
  if (clean.endsWith('/v1') || clean.endsWith('/v1beta/openai')) return `${clean}/chat/completions`;
  return clean;
};

const normalizeModelId = (model: Model) => {
  const provider = model.provider.toLowerCase();
  if (provider.includes('google') || provider.includes('gemini')) {
    const aliases: Record<string, string> = { 'gemini-flash': 'gemini-2.5-flash', 'gemini-pro': 'gemini-2.5-pro' };
    return aliases[model.id.toLowerCase()] || model.id.replace(/^(gemini)-(\d+)-(\d+)(-.+)?$/, '$1-$2.$3$4');
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
  const effectiveTimeoutMs = model.type === 'local' ? Math.max(timeoutMs, 180000) : timeoutMs;
  const timer = window.setTimeout(() => controller.abort(), effectiveTimeoutMs);
  const started = performance.now();
  const provider = model.provider.toLowerCase();
  const isAnthropic = provider.includes('anthropic') || provider.includes('claude');
  const isGoogle = provider.includes('google') || provider.includes('gemini');
  const endpoint = normalizeModelEndpoint(model.endpoint);
  const useGoogleNativeApi = isGoogle && endpoint.includes('generativelanguage.googleapis.com') && !endpoint.includes('/openai/');
  const isHuggingFaceInference = /api-inference\.huggingface\.co/i.test(endpoint) && /\/models\//.test(endpoint);
  const isOllamaChat = /\/api\/chat$/.test(endpoint);
  const isOllamaGenerate = /\/api\/generate$/.test(endpoint);
  const isRefinement = messages.some(message => /return only the refined prompt/i.test(message.content));
  const isOpenAIResponses = /\/responses$/.test(endpoint);
  const isGoogleOpenAiCompat = isGoogle && endpoint.includes('generativelanguage.googleapis.com') && endpoint.includes('/openai/');
  const googleModelId = normalizeModelId(model);
  const requestModelId = model.id.startsWith('public:') ? model.id.slice('public:'.length) : model.id;
  const googleBase = endpoint.includes('/v1beta') ? `${endpoint.split('/v1beta')[0]}/v1beta` : endpoint;
  const requestEndpoint = useGoogleNativeApi
    ? `${googleBase}/models/${googleModelId}:generateContent?key=${encodeURIComponent(model.api_key)}`
    : resolveModelRequestEndpoint(endpoint, model.provider);
  const contextLength = isOllamaChat || isOllamaGenerate
    ? Math.min(model.context_length || 4096, 4096)
    : model.context_length || 16384;
  const estimatedPromptTokens = Math.ceil(messages.reduce((total, message) => total + message.content.length, 0) / 4) + messages.length * 4;
  const remainingContextTokens = Math.max(1, contextLength - estimatedPromptTokens - 128);
  const maxOutputTokens = Math.max(1, Math.min(4096, Math.floor(contextLength / 2), remainingContextTokens));

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(!useGoogleNativeApi && isAnthropic
        ? { 'x-api-key': model.api_key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        : isGoogleOpenAiCompat && model.api_key
          ? { Authorization: `Bearer ${model.api_key}` }
          : !useGoogleNativeApi && !isGoogleOpenAiCompat && model.api_key ? { Authorization: `Bearer ${model.api_key}` } : {}),
    };
    const ollamaRefinementFormat = {
      type: 'object',
      properties: { refined_prompt: { type: 'string' } },
      required: ['refined_prompt'],
      additionalProperties: false,
    };
    const ollamaNumPredict = isRefinement
      ? Math.min(maxOutputTokens, Math.min(768, Math.max(512, Math.ceil(messages.reduce((total, message) => total + message.content.length, 0) / 4))))
      : maxOutputTokens;
    const body = useGoogleNativeApi
      ? {
          contents: messages.filter(message => message.role !== 'system').map(message => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
          ...(messages.find(message => message.role === 'system') ? { systemInstruction: { parts: [{ text: messages.find(message => message.role === 'system')?.content }] } } : {}),
          generationConfig: { maxOutputTokens, temperature: 0.2 },
        }
      : isAnthropic
      ? {
          model: requestModelId,
          max_tokens: maxOutputTokens,
          messages: messages.filter(message => message.role !== 'system'),
          system: messages.find(message => message.role === 'system')?.content,
        }
      : isHuggingFaceInference
      ? { inputs: messages.map(message => `${message.role}: ${message.content}`).join('\n'), parameters: { max_new_tokens: maxOutputTokens, temperature: 0.2 }, options: { wait_for_model: true } }
      : isOllamaChat
      ? { model: requestModelId, messages: toOllamaMessages(messages), stream: false, ...(isRefinement ? { think: false, format: ollamaRefinementFormat } : {}), keep_alive: '2m', options: { temperature: 0.1, num_predict: ollamaNumPredict, num_ctx: contextLength, num_batch: 64, ...(isRefinement ? { repeat_penalty: 1.1, top_k: 50 } : {}) } }
      : isOllamaGenerate
      ? { model: requestModelId, prompt: toOllamaPrompt(messages), stream: false, ...(isRefinement ? { think: false, format: ollamaRefinementFormat } : {}), keep_alive: '2m', options: { temperature: 0.1, num_predict: ollamaNumPredict, num_ctx: contextLength, num_batch: 64, ...(isRefinement ? { repeat_penalty: 1.1, top_k: 50 } : {}) } }
      : isOpenAIResponses
      ? { model: requestModelId, input: messages.map(message => ({ role: message.role, content: [{ type: 'input_text', text: message.content }] })), max_output_tokens: maxOutputTokens, temperature: 0.2 }
      : { model: requestModelId, messages, max_tokens: maxOutputTokens, temperature: 0.2, stream: false };

    const fetchWithBody = (requestBody: unknown) => fetch(requestEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    let activeBody: Record<string, any> = body as Record<string, any>;
    let response = await fetchWithBody(activeBody);
    if (!response.ok) {
      const detail = await errorMessage(response);
      if ((isOllamaChat || isOllamaGenerate) && isRefinement && /\bthink(?:ing)?\b.*(?:unsupported|not supported|invalid|unknown)|(?:unsupported|not supported|invalid|unknown).*\bthink(?:ing)?\b/i.test(detail)) {
        const compatibilityBody = { ...activeBody };
        delete compatibilityBody.think;
        activeBody = compatibilityBody;
        response = await fetchWithBody(compatibilityBody);
        if (!response.ok) throw new Error(await errorMessage(response));
      } else {
        throw new Error(detail);
      }
    }
    let payload = await response.json();
    const getResponseText = (value: any) => {
      let result = isOllamaGenerate && typeof value?.response === 'string' ? value.response.trim() : extractText(value);
      if (isOllamaChat || isOllamaGenerate) {
        const thinkEnd = result.lastIndexOf('</think>');
        if (thinkEnd >= 0) result = result.slice(thinkEnd + '</think>'.length).trim();
        else if (/<think>/i.test(result)) result = '';
        result = result.replace(/^<think>[\s\S]*?<\/think>/i, '').trim();
        if (isRefinement) {
          try {
            const structured = JSON.parse(result);
            if (typeof structured?.refined_prompt === 'string') result = structured.refined_prompt.trim();
          } catch { /* Older Ollama versions or model templates may return plain text. */ }
        }
      }
      return result;
    };
    let text = getResponseText(payload);
    const outputLimitReached = (value: any) => value?.choices?.[0]?.finish_reason === 'length'
      || value?.candidates?.[0]?.finishReason === 'MAX_TOKENS'
      || value?.stop_reason === 'max_tokens'
      || value?.incomplete_details?.reason === 'max_output_tokens'
      || value?.done_reason === 'length';
    const hasOutputLimitReached = outputLimitReached(payload);
    const reportedInputTokens = Number(payload?.usage?.prompt_tokens ?? payload?.usage?.input_tokens ?? payload?.usageMetadata?.promptTokenCount ?? payload?.prompt_eval_count);
    const estimatedInputTokens = Number.isFinite(reportedInputTokens) && reportedInputTokens > 0
      ? reportedInputTokens
      : estimatedPromptTokens;
    const retryMaxOutputTokens = Math.max(0, Math.min(8192, contextLength - estimatedInputTokens - 128));
    if (hasOutputLimitReached && retryMaxOutputTokens > maxOutputTokens) {
      const retryBody = { ...activeBody };
      if (useGoogleNativeApi) {
        retryBody.generationConfig = { ...(activeBody.generationConfig || {}), maxOutputTokens: retryMaxOutputTokens };
      } else if (isAnthropic) {
        retryBody.max_tokens = retryMaxOutputTokens;
      } else if (isHuggingFaceInference) {
        retryBody.parameters = { ...(activeBody.parameters || {}), max_new_tokens: retryMaxOutputTokens };
      } else if (isOllamaChat || isOllamaGenerate) {
        retryBody.options = { ...(activeBody.options || {}), num_predict: retryMaxOutputTokens };
      } else if (isOpenAIResponses) {
        retryBody.max_output_tokens = retryMaxOutputTokens;
      } else {
        retryBody.max_tokens = retryMaxOutputTokens;
      }
      response = await fetchWithBody(retryBody);
      if (!response.ok) throw new Error(await errorMessage(response));
      payload = await response.json();
      text = getResponseText(payload);
    } else if (hasOutputLimitReached) {
      throw new Error(`The response from “${model.id}” reached its output limit. Shorten the prompt or use a model with a larger context window.`);
    }
    if (outputLimitReached(payload)) {
      throw new Error(`The response from “${model.id}” was still incomplete after retrying with a larger output limit. Try a shorter prompt or a model with a larger context window.`);
    }
    if (!text && isRefinement && (isOllamaChat || isOllamaGenerate)) {
      // Thinking models can spend the initial token budget on their private trace before emitting the answer.
      // Retry once with more generation room instead of surfacing an empty-answer error.
      const currentNumPredict = Number(activeBody.options?.num_predict) || 0;
      const retryNumPredict = Math.min(retryMaxOutputTokens, Math.max(1024, currentNumPredict));
      if (retryNumPredict > currentNumPredict) {
        const retryBody = { ...activeBody, options: { ...(activeBody.options || {}), num_predict: retryNumPredict } };
        response = await fetchWithBody(retryBody);
        if (!response.ok) throw new Error(await errorMessage(response));
        payload = await response.json();
        text = getResponseText(payload);
        if (outputLimitReached(payload)) {
          throw new Error(`The response from “${model.id}” was still incomplete after retrying with a larger output limit. Try a shorter prompt or a model with a larger context window.`);
        }
      }
    }
    if (!text) {
      if (isOllamaChat || isOllamaGenerate) {
        const message = payload?.message;
        const available = message && typeof message === 'object' ? Object.keys(message).join(', ') : Object.keys(payload || {}).join(', ');
        const reason = payload?.done_reason ? ` Ollama stopped because of “${payload.done_reason}”.` : '';
        throw new Error(`Ollama did not return a final answer for “${model.id}”.${reason}${available ? ` Response fields: ${available}.` : ''} Check that the model is available and supports chat.`);
      }
      const blockReason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason;
      const choice = payload?.choices?.[0];
      const finishReason = choice?.finish_reason || blockReason || payload?.stop_reason;
      const message = choice?.message || payload?.message;
      const responseFields = message && typeof message === 'object' ? Object.keys(message).join(', ') : '';
      const details = [
        finishReason ? `finish reason: ${finishReason}` : '',
        responseFields ? `message fields: ${responseFields}` : '',
      ].filter(Boolean).join('; ');
      throw new Error(`The provider returned a successful response without user-facing text for “${model.id}”${details ? ` (${details})` : ''}. Check that the selected model and endpoint return text in the configured response format.`);
    }
    const inputTokens = Number(payload?.usage?.prompt_tokens ?? payload?.usage?.input_tokens ?? payload?.usageMetadata?.promptTokenCount ?? payload?.prompt_eval_count);
    const outputTokens = Number(payload?.usage?.completion_tokens ?? payload?.usage?.output_tokens ?? payload?.usageMetadata?.candidatesTokenCount ?? payload?.eval_count);
    return { text, latencyMs: Math.round(performance.now() - started), ...(Number.isFinite(inputTokens) && inputTokens > 0 ? { inputTokens } : {}), ...(Number.isFinite(outputTokens) && outputTokens > 0 ? { outputTokens } : {}) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error(model.type === 'local' ? 'The local model did not finish within 3 minutes. On low-memory devices, try a smaller quantized model, reduce the prompt length, and close other memory-heavy apps.' : 'The model request timed out. Check the provider status and try again.');
    if (error instanceof TypeError) {
      if (provider.includes('nvidia')) {
        throw new Error('NVIDIA NIM blocks this browser-origin request (CORS). The endpoint is reachable, but this static app needs a trusted server-side proxy to call it.');
      }
      throw new Error('The browser could not reach the model endpoint. This may be caused by provider CORS restrictions or a network/endpoint issue. Check that the provider allows requests from this browser origin.');
    }
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
      const supported = (payload.models || []).some((item: any) => String(item.name || '').replace(/^models\//, '').replace(/-latest$/, '') === configuredModel && (item.supportedGenerationMethods || []).includes('generateContent'));
      if (!supported) {
        try {
          const live = await requestModelChat(model, [{ role: 'user', content: 'Reply with OK.' }], timeoutMs);
          return { ok: true, message: `Google accepted the configured model request in ${live.latencyMs}ms. The model is available even though its catalog entry did not exactly match the configured ID.` };
        } catch (error) {
          return { ok: false, message: error instanceof Error ? error.message : `The key is valid, but Google did not list or accept model “${model.id}”.` };
        }
      }
      const result = await requestModelChat(model, [{ role: 'user', content: 'Reply with OK.' }], timeoutMs);
      return { ok: true, message: `Google model access verified with a live response in ${result.latencyMs}ms.` };
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
