import { Model } from '../types';

export const PUBLIC_MODEL_CATALOG_URL = 'https://openrouter.ai/api/v1/models';

const asNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const fetchPublicModelCatalog = async (signal?: AbortSignal): Promise<Model[]> => {
  const response = await fetch(PUBLIC_MODEL_CATALOG_URL, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) throw new Error(`Catalog request failed: HTTP ${response.status}`);
  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];

  return data.map((item: any, index: number): Model => {
    const id = String(item?.id || `public-model-${index}`);
    const rawPromptPrice = asNumber(item?.pricing?.prompt);
    const rawCompletionPrice = asNumber(item?.pricing?.completion);
    const hasPricing = item?.pricing?.prompt !== undefined && item?.pricing?.completion !== undefined;
    const promptPrice = Math.max(0, rawPromptPrice) * 1000;
    const completionPrice = Math.max(0, rawCompletionPrice) * 1000;
    const contextLength = asNumber(item?.context_length);
    const isFree = hasPricing && rawPromptPrice === 0 && rawCompletionPrice === 0;
    const provider = id.includes('/') ? id.split('/')[0] : 'OpenRouter';

    return {
      id: `public:${id}`,
      name: String(item?.name || id),
      provider,
      type: 'api',
      tier: isFree ? 'free' : 'paid',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      context_length: contextLength,
      input_cost_per_1k: promptPrice,
      output_cost_per_1k: completionPrice,
      is_free: isFree,
      enabled: false,
      priority: 100 + index,
      status: 'standby',
      latency_ms_avg: 0,
      tokens_per_sec: 0,
      description: `${id} · live public catalog entry`,
      docs_url: `https://openrouter.ai/${id}`,
      created_at: new Date().toISOString(),
    };
  });
};
