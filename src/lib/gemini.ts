type OpenRouterTask = 'extract' | 'translate' | 'analyze';

async function callOpenRouterProxy(task: OpenRouterTask, payload: Record<string, unknown>) {
  const response = await fetch('/api/openrouter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task,
      ...payload,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter proxy error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

export async function extractPoemFromUrl(url: string): Promise<string> {
  const data = await callOpenRouterProxy('extract', { url });
  return typeof data.text === 'string' ? data.text : '';
}

export async function translatePoetry(text: string, toSomali: boolean = false): Promise<string> {
  const data = await callOpenRouterProxy('translate', { text, toSomali });
  return typeof data.text === 'string' ? data.text : '';
}

export async function analyzePoetry(text: string): Promise<{ themes: string[]; summary: string }> {
  const data = await callOpenRouterProxy('analyze', { text });
  return {
    themes: Array.isArray(data.themes) ? data.themes : [],
    summary: typeof data.summary === 'string' ? data.summary : '',
  };
}
