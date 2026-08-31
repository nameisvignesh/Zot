import { Model, RoutingDecision, TaskCategory } from '../types';
import { countTokens } from './tokenizer';

/**
 * Classifies a prompt into one of the 7 Zero-Shot task categories
 */
export function classifyPrompt(prompt: string): { task: TaskCategory; confidence: number; complexity: number } {
  if (!prompt || typeof prompt !== 'string') {
    return { task: 'General Question', confidence: 0.70, complexity: 0.20 };
  }
  const p = prompt.toLowerCase();
  
  // Coding signals
  const codingKeywords = ['function', 'code', 'python', 'javascript', 'typescript', 'react', 'sql', 'query', 'bug', 'class', 'regex', 'api', 'endpoint', 'component', 'algorithm', 'numpy', 'pytorch', 'async', 'promise'];
  const hasCodeBlock = /```|\{|\}|\(\)|=>|def\s|class\s|import\s|const\s|let\s|var\s/i.test(prompt);
  const codingMatches = codingKeywords.filter(k => p.includes(k)).length;

  // Reasoning / Math / Logic signals
  const reasoningKeywords = ['why', 'how does', 'step by step', 'evaluate', 'compare', 'analyze', 'proof', 'deduce', 'solve', 'calculate', 'probability', 'trade-off', 'consequence'];
  const reasoningMatches = reasoningKeywords.filter(k => p.includes(k)).length;

  // Summarization signals
  const summaryKeywords = ['summarize', 'summary', 'tldr', 'key takeaways', 'briefly state', 'bullet points of', 'digest', 'condense'];
  const summaryMatches = summaryKeywords.filter(k => p.includes(k)).length;

  // Extraction signals
  const extractionKeywords = ['extract', 'parse', 'json format', 'pull out', 'find all names', 'entities', 'csv', 'table of', 'attributes'];
  const extractionMatches = extractionKeywords.filter(k => p.includes(k)).length;

  // Creative writing signals
  const creativeKeywords = ['write a story', 'poem', 'essay', 'compose', 'dialogue', 'creative', 'fictional', 'tone', 'metaphor', 'script'];
  const creativeMatches = creativeKeywords.filter(k => p.includes(k)).length;

  // Classification signals
  const classKeywords = ['classify', 'sentiment', 'categorize', 'is this positive', 'label as', 'group into'];
  const classMatches = classKeywords.filter(k => p.includes(k)).length;

  // Calculate scores
  let task: TaskCategory = 'General Question';
  let maxScore = 0.35; // base threshold

  if (hasCodeBlock || codingMatches >= 1) {
    const score = 0.5 + (hasCodeBlock ? 0.3 : 0) + (codingMatches * 0.15);
    if (score > maxScore) {
      maxScore = score;
      task = 'Coding';
    }
  }

  if (summaryMatches >= 1) {
    const score = 0.6 + summaryMatches * 0.2;
    if (score > maxScore) {
      maxScore = score;
      task = 'Summarization';
    }
  }

  if (extractionMatches >= 1) {
    const score = 0.55 + extractionMatches * 0.2;
    if (score > maxScore) {
      maxScore = score;
      task = 'Extraction';
    }
  }

  if (creativeMatches >= 1) {
    const score = 0.6 + creativeMatches * 0.2;
    if (score > maxScore) {
      maxScore = score;
      task = 'Creative Writing';
    }
  }

  if (classMatches >= 1) {
    const score = 0.65 + classMatches * 0.2;
    if (score > maxScore) {
      maxScore = score;
      task = 'Classification';
    }
  }

  if (reasoningMatches >= 1 && task === 'General Question') {
    const score = 0.5 + reasoningMatches * 0.15;
    if (score > maxScore) {
      maxScore = score;
      task = 'Reasoning';
    }
  }

  const confidence = Math.min(0.98, Math.max(0.68, Number(maxScore.toFixed(2))));

  // Complexity Calculation
  // Factors: Prompt length, technical density, constraint count, syntactic nesting
  const tokenCount = countTokens(prompt);
  let complexity = 0.2; // baseline

  if (tokenCount > 200) complexity += 0.3;
  else if (tokenCount > 80) complexity += 0.2;
  else if (tokenCount > 40) complexity += 0.1;

  if (task === 'Coding' || task === 'Reasoning') complexity += 0.35;
  if (task === 'Extraction') complexity += 0.15;
  if (p.includes('do not') || p.includes('never') || p.includes('strictly')) complexity += 0.15;
  if (p.includes('step-by-step') || p.includes('detailed')) complexity += 0.1;

  complexity = Math.min(0.99, Math.max(0.12, Number(complexity.toFixed(2))));

  return { task, confidence, complexity };
}

/**
 * Route request to best model based on task, complexity, and availability
 */
export function routePrompt(
  prompt: string,
  models: Model[],
  preferredModelId?: string
): RoutingDecision {
  const { task, confidence, complexity } = classifyPrompt(prompt);
  const tokenCount = countTokens(prompt);
  const requestId = `req_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;

  const enabledModels = models.filter(m => m.enabled && m.status !== 'offline');
  
  if (enabledModels.length === 0) {
    return {
      request_id: requestId,
      task,
      task_confidence: confidence,
      complexity,
      selected_model: 'lfm-local',
      alternative_models: [],
      reason: 'fallback_no_active_models',
      estimated_cost: 0.001
    };
  }

  // If user explicitly picked a valid model, check if appropriate
  let selectedModel = enabledModels.find(m => m.id === preferredModelId);
  let reason = 'user_selected';

  if (!selectedModel) {
    // Intelligent Zero-Shot Routing Logic (Pages 16-17)
    // 1. High complexity coding/reasoning (>0.70) -> Liquid AI LFM local or high-capacity tier
    // 2. Simple tasks (<0.40) -> Lightweight local edge model (lfm-edge-1b) to save latency & compute
    // 3. Very large context (>8K tokens) -> Cloud/Extended context model
    
    if (tokenCount > 8000) {
      selectedModel = enabledModels.find(m => m.context_length >= 32000) || enabledModels[0];
      reason = 'context_window_match (high token input)';
    } else if (complexity > 0.65) {
      // Capability match for advanced reasoning/coding
      selectedModel = enabledModels.find(m => m.id === 'lfm-local') 
        || enabledModels.find(m => m.id === 'claude-3-5-sonnet')
        || enabledModels[0];
      reason = `capability_match (${task} with complexity ${complexity})`;
    } else if (complexity < 0.35) {
      // Low complexity optimization (fastest, lowest cost)
      selectedModel = enabledModels.find(m => m.id === 'lfm-edge-1b') 
        || enabledModels.find(m => m.type === 'local')
        || enabledModels[0];
      reason = 'cost_latency_optimization (low complexity task)';
    } else {
      // Balanced standard routing -> Liquid AI LFM Local default
      selectedModel = enabledModels.find(m => m.id === 'lfm-local') || enabledModels[0];
      reason = 'optimal_balanced_gateway_match';
    }
  }

  const alternativeModels = enabledModels
    .filter(m => m.id !== selectedModel!.id)
    .map(m => m.id);

  // Estimate cost
  const estimatedOutputTokens = Math.max(50, Math.round(tokenCount * 1.8));
  const inputCost = (tokenCount / 1000) * selectedModel.input_cost_per_1k;
  const outputCost = (estimatedOutputTokens / 1000) * selectedModel.output_cost_per_1k;
  const totalEstimatedCost = Number((inputCost + outputCost).toFixed(5));

  return {
    request_id: requestId,
    task,
    task_confidence: confidence,
    complexity,
    selected_model: selectedModel.id,
    alternative_models: alternativeModels,
    reason,
    estimated_cost: totalEstimatedCost,
    rule_matched: `Rule [${task} -> ${selectedModel.id} @ ${complexity}]`
  };
}
