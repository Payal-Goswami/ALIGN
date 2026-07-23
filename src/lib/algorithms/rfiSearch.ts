/**
 * Project Knowledge & RFI Intelligence Agent — retrieval layer.
 *
 * Implements TF-IDF weighted cosine similarity over RFI subject+question text
 * to find previously-answered RFIs that resemble a new one. This is the
 * deterministic "R" in RAG: it selects which prior RFIs are relevant context.
 * Only the final natural-language answer synthesis is handed to the LLM
 * (see src/lib/llm/ollama.ts) — which document to retrieve is not.
 */

export interface RfiDocument {
  id: string;
  number: string;
  subject: string;
  question: string;
  answerText: string | null;
  status: string;
}

export interface RfiMatch {
  document: RfiDocument;
  similarity: number; // 0..1
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'and', 'or', 'in', 'on',
  'for', 'with', 'this', 'that', 'it', 'as', 'at', 'by', 'from', 'will', 'shall', 'please',
  'confirm', 'clarify', 'what', 'which', 'per', 'we', 'our', 'has', 'have', 'not', 'if',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/**
 * Ranks `corpus` by TF-IDF cosine similarity against `query`.
 * Pure algorithm — deterministic, explainable, and free (no embeddings API).
 */
export function findSimilarRfis(query: string, corpus: RfiDocument[], topK = 5): RfiMatch[] {
  const docs = corpus.map((d) => ({
    doc: d,
    tokens: tokenize(`${d.subject} ${d.question}`),
  }));

  const queryTokens = tokenize(query);
  const allDocsForIdf = [...docs.map((d) => d.tokens), queryTokens];
  const docFreq = new Map<string, number>();
  for (const tokens of allDocsForIdf) {
    const unique = new Set(tokens);
    for (const term of unique) docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
  }
  const N = allDocsForIdf.length;
  const idf = (term: string) => Math.log((N + 1) / ((docFreq.get(term) ?? 0) + 1)) + 1;

  function vectorize(tokens: string[]): Map<string, number> {
    const tf = termFrequency(tokens);
    const vec = new Map<string, number>();
    for (const [term, freq] of tf) vec.set(term, freq * idf(term));
    return vec;
  }

  function cosine(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    for (const [term, va] of a) {
      const vb = b.get(term);
      if (vb) dot += va * vb;
    }
    const magA = Math.sqrt([...a.values()].reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt([...b.values()].reduce((s, v) => s + v * v, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  const queryVec = vectorize(queryTokens);

  const results = docs.map(({ doc, tokens }) => ({
    document: doc,
    similarity: cosine(queryVec, vectorize(tokens)),
  }));

  return results
    .filter((r) => r.similarity > 0.05)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
