import { AIMessage, AIMode, AISettings, WorkspaceFile, WorkspaceNote, WorkspaceProject } from '../types';

export interface ChatRequestOptions {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  mode: AIMode;
  contextFiles?: WorkspaceFile[];
  contextNotes?: WorkspaceNote[];
  activeProject?: WorkspaceProject;
  settings: AISettings;
  onChunk: (text: string) => void;
  onSources?: (sources: string[]) => void;
  onError?: (err: string) => void;
  signal?: AbortSignal;
}

export interface HealthCheckResult {
  hasOpenAI: boolean;
  hasGemini: boolean;
  defaultProvider: string;
  availableOpenAIModels: Array<{ id: string; name: string }>;
  availableGeminiModels: Array<{ id: string; name: string }>;
}

export async function checkAIHealth(): Promise<HealthCheckResult> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check non-ok');
    return await res.json();
  } catch {
    return {
      hasOpenAI: false,
      hasGemini: false,
      defaultProvider: 'openai',
      availableOpenAIModels: [
        { id: 'gpt-4o', name: 'GPT-4o (Omni Flagship)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Smart)' },
        { id: 'o3-mini', name: 'o3-mini (Reasoning)' },
      ],
      availableGeminiModels: [
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
        { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
      ],
    };
  }
}

export async function sendStreamingChat(options: ChatRequestOptions): Promise<string> {
  const {
    messages,
    mode,
    contextFiles = [],
    contextNotes = [],
    activeProject,
    settings,
    onChunk,
    onSources,
    onError,
    signal,
  } = options;

  const context = {
    files: contextFiles.map((f) => ({
      name: f.name,
      content: f.extractedText || `[File ${f.name}, type: ${f.mimeType}]`,
      type: f.mimeType,
    })),
    notes: contextNotes.map((n) => ({
      title: n.title,
      content: n.content,
    })),
    project: activeProject
      ? {
          title: activeProject.name,
          category: activeProject.category,
          status: activeProject.status,
          description: activeProject.description,
        }
      : undefined,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (settings.openAIApiKey) {
    headers['x-openai-api-key'] = settings.openAIApiKey;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      messages,
      mode,
      context,
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature,
      stream: true,
      userApiKey: settings.openAIApiKey || '',
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
    const msg = errorJson.error || `HTTP error ${response.status}`;
    if (onError) onError(msg);
    throw new Error(msg);
  }

  if (!response.body) {
    throw new Error('No streaming body received');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);

        if (dataStr === '[DONE]') {
          return accumulated;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            if (onError) onError(parsed.error);
            throw new Error(parsed.error);
          }
          if (parsed.sources && onSources) {
            onSources(parsed.sources);
          }
          if (parsed.text) {
            accumulated += parsed.text;
            onChunk(parsed.text);
          }
        } catch (e: any) {
          if (e.message && e.message !== 'Unexpected token') {
            // Re-throw genuine errors
            if (onError) onError(e.message);
          }
        }
      }
    }
  } catch (err: any) {
    if (signal?.aborted) {
      return accumulated;
    }
    throw err;
  }

  return accumulated;
}

export async function analyzeDocumentAction(params: {
  action: 'summarize' | 'explain' | 'quiz' | 'extract_points' | 'improve' | 'study_guide' | 'custom';
  documentTitle: string;
  documentContent: string;
  category?: string;
  customPrompt?: string;
  apiKey?: string;
}): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (params.apiKey) {
    headers['x-openai-api-key'] = params.apiKey;
  }

  const res = await fetch('/api/ai/analyze-document', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(err.error || 'Document analysis failed');
  }

  const data = await res.json();
  return data.result || '';
}

export async function naturalLanguageSearch(
  query: string,
  documents: WorkspaceFile[],
  apiKey?: string
): Promise<{ matches: Array<{ id: string; relevanceScore: number; reason: string }>; summary: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['x-openai-api-key'] = apiKey;
  }

  const res = await fetch('/api/ai/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, documents, userApiKey: apiKey }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(err.error || 'AI Search failed');
  }

  return await res.json();
}
