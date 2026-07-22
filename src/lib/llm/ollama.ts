/**
 * Ollama client — the ONLY place in this codebase that calls an LLM.
 *
 * Design rule enforced throughout the platform: agents compute their
 * decisions with deterministic algorithms first (see src/lib/algorithms/*),
 * and only hand the already-decided, structured result to the LLM to be
 * turned into a plain-language explanation or summary. The LLM is never
 * asked to decide a number, a pass/fail, or a schedule date.
 *
 * Runs against a local Ollama instance (https://ollama.com) — free,
 * open-source, no API key. Model preference order, configurable via env:
 *   1. Qwen 2.5 Instruct   (OLLAMA_MODEL, default)
 *   2. Gemma 3 / Gemma 2
 *   3. Llama 3.2 Instruct
 *   4. Mistral Instruct
 */

const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const PRIMARY_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b-instruct';
const FALLBACKS = (process.env.OLLAMA_FALLBACK_MODELS ?? 'gemma2:9b,llama3.2:3b-instruct,mistral:7b-instruct')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const DISABLED = (process.env.LLM_DISABLED ?? 'false').toLowerCase() === 'true';

export interface LlmExplanationResult {
  text: string;
  model: string | null; // null when a deterministic fallback template was used instead of an LLM
  usedFallbackTemplate: boolean;
}

async function callOllama(model: string, prompt: string, systemPrompt: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system: systemPrompt,
      stream: false,
      options: { temperature: 0.2, num_predict: 400 },
    }),
    // Keep local inference calls from hanging the request indefinitely.
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { response?: string };
  if (!data.response) throw new Error('Ollama returned an empty response');
  return data.response.trim();
}

/**
 * Generates an explanation/summary from a deterministic algorithm's output.
 * Tries the configured model, then each fallback in order. If Ollama is not
 * running at all (common on a laptop that hasn't installed it, or in CI),
 * falls back to a deterministic, template-based explanation built directly
 * from `factsForTemplate` — so the app NEVER shows a broken or empty panel.
 */
export async function generateExplanation(
  systemPrompt: string,
  userPrompt: string,
  factsForTemplate: Record<string, unknown>,
  templateFn: (facts: Record<string, unknown>) => string
): Promise<LlmExplanationResult> {
  if (DISABLED) {
    return { text: templateFn(factsForTemplate), model: null, usedFallbackTemplate: true };
  }

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACKS];
  for (const model of modelsToTry) {
    try {
      const text = await callOllama(model, userPrompt, systemPrompt);
      return { text, model, usedFallbackTemplate: false };
    } catch {
      continue; // try next model in the preference chain
    }
  }

  // No local model available — degrade gracefully to a deterministic template
  // built from the exact same facts, so the UI stays fully functional offline.
  return { text: templateFn(factsForTemplate), model: null, usedFallbackTemplate: true };
}

export async function isOllamaAvailable(): Promise<boolean> {
  if (DISABLED) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

export const ollamaConfig = { BASE_URL, PRIMARY_MODEL, FALLBACKS, DISABLED };
