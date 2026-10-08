import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get Google GenAI client
function getGenAIClient(customKey?: string) {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 1200): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const is503 =
        err?.message?.includes('503') ||
        err?.status === 503 ||
        String(err).includes('UNAVAILABLE') ||
        String(err).includes('high demand');
      if (is503 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// System prompts for different Ivan AI modes
function getSystemPrompt(mode: string, contextInfo?: string): string {
  let basePrompt = `You are "Ivan AI", the intelligent, highly capable digital assistant inside "IVAN WORKSPACE" (Tagline: "Organize. Work. Learn. Build.").
You assist Ivan with university studies, teaching, school administration, academic research, software development, business management, documents, notes, tasks, and productivity.

Core Guidelines:
1. Provide thoughtful, well-structured, precise answers formatted in Markdown. Use headings, lists, bold text, tables, and code blocks with syntax highlighting where relevant.
2. For mathematics, STEM, or logic, show clear step-by-step reasoning and use LaTeX math notation ($...$ or $$...$$).
3. Ground your answers strictly in the user's workspace documents, notes, and context when provided. If context is provided, clearly reference the relevant files and never fabricate facts that contradict the sources.
4. If a question cannot be answered from the provided workspace files or context, clearly state what information is missing.
5. Offer practical follow-up actions (e.g., creating tasks, summarizing sections, drafting lesson plans, writing code).`;

  let modeSpecific = '';
  switch (mode) {
    case 'study':
      modeSpecific = `\nMode: STUDY ASSISTANT
Focus on University coursework, Mathematics, Computer Science, Education, ICT, assignments, exams, and conceptual revision. Break down complex theorems, provide intuitive examples, generate practice questions with solutions, and help Ivan achieve academic excellence.`;
      break;
    case 'teaching':
      modeSpecific = `\nMode: TEACHING ASSISTANT
Focus on pedagogy, curriculum, lesson plans, schemes of work, learner-centered activities, assessments, marking guides, rubrics, and educational ICT resources. Make materials engaging, structured, practical for classroom delivery, and aligned with educational standards.`;
      break;
    case 'research':
      modeSpecific = `\nMode: RESEARCH ASSISTANT
Focus on academic research proposals, literature reviews, methodology, data interpretation, qualitative/quantitative analysis, academic writing, formal citations/references, and chapter structuring. Adhere to rigorous scholarly standards.`;
      break;
    case 'project':
      modeSpecific = `\nMode: PROJECT ASSISTANT
Focus on project management, scope definition, task breakdowns (WBS), milestones, risk analysis, resource allocation, sprint planning, and architectural/technical documentation.`;
      break;
    case 'business':
      modeSpecific = `\nMode: BUSINESS ASSISTANT
Focus on business proposals, client communications, contracts, invoicing, budgeting, marketing strategies, SWOT analysis, and operational efficiency. Maintain an executive, polished, professional tone.`;
      break;
    default:
      modeSpecific = `\nMode: GENERAL ASSISTANT
Provide comprehensive ChatGPT-style assistance across all workspace domains with high agility and clarity.`;
  }

  let finalPrompt = basePrompt + modeSpecific;
  if (contextInfo) {
    finalPrompt += `\n\n=== RELEVANT WORKSPACE CONTEXT ===\n${contextInfo}\n=== END OF CONTEXT ===\nWhen referencing this context, acknowledge the specific source files or notes used.`;
  }

  return finalPrompt;
}

// Health check & AI provider status
app.get('/api/health', (req: Request, res: Response) => {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    appName: 'IVAN WORKSPACE',
    hasOpenAI,
    hasGemini,
    defaultProvider: hasGemini ? 'gemini' : hasOpenAI ? 'openai' : 'gemini',
    availableOpenAIModels: [
      { id: 'gpt-4o', name: 'GPT-4o (Omni Flagship)', provider: 'openai' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Smart)', provider: 'openai' },
      { id: 'o3-mini', name: 'o3-mini (STEM Reasoning)', provider: 'openai' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
    ],
    availableGeminiModels: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest, Fast & Built-in - Recommended)', provider: 'gemini' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Deep STEM Reasoning)', provider: 'gemini' },
    ],
  });
});

// Primary Chat Completion Endpoint (Supports Streaming & Multi-Turn)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      mode = 'general',
      context = {},
      provider = 'auto',
      model = '',
      temperature = 0.7,
      stream = true,
      userApiKey = '',
      userGeminiApiKey = '',
    } = req.body;

    const authHeader = req.headers['x-openai-api-key'] as string;
    const geminiAuthHeader = req.headers['x-gemini-api-key'] as string;
    const openAIApiKey = userApiKey || authHeader || process.env.OPENAI_API_KEY;
    const geminiApiKey = userGeminiApiKey || geminiAuthHeader || process.env.GEMINI_API_KEY;

    // Determine target provider
    let targetProvider = provider;
    if (targetProvider === 'auto') {
      if (geminiApiKey) {
        targetProvider = 'gemini';
      } else if (openAIApiKey) {
        targetProvider = 'openai';
      } else {
        targetProvider = 'gemini';
      }
    }

    // Format context from attached files and notes
    let contextString = '';
    const sourcesUsed: string[] = [];

    if (context.files && Array.isArray(context.files) && context.files.length > 0) {
      contextString += 'ATTACHED FILES:\n';
      context.files.forEach((f: { name: string; content: string; type?: string }) => {
        sourcesUsed.push(f.name);
        contextString += `\n--- File: ${f.name} ---\n${f.content ? f.content.slice(0, 20000) : '[Binary or empty content]'}\n`;
      });
    }

    if (context.notes && Array.isArray(context.notes) && context.notes.length > 0) {
      contextString += '\nATTACHED NOTES:\n';
      context.notes.forEach((n: { title: string; content: string }) => {
        sourcesUsed.push(`Note: ${n.title}`);
        contextString += `\n--- Note: ${n.title} ---\n${n.content ? n.content.slice(0, 10000) : ''}\n`;
      });
    }

    if (context.project) {
      sourcesUsed.push(`Project: ${context.project.title || context.project.name}`);
      contextString += `\n--- Active Project: ${context.project.title || context.project.name} ---\nStatus: ${context.project.status}\nCategory: ${context.project.category}\nDescription: ${context.project.description || ''}\n`;
    }

    const systemPrompt = getSystemPrompt(mode, contextString);

    // 1. OPENAI PROVIDER
    if (targetProvider === 'openai') {
      if (!openAIApiKey) {
        // If no OpenAI key is configured yet but Gemini key is available, fail gracefully or suggest switching
        if (geminiApiKey) {
          return res.status(400).json({
            error: 'OpenAI API key not configured. You can either enter your OpenAI API key in AI Settings, or switch provider to Gemini which is active.',
            canFallbackToGemini: true,
          });
        }
        return res.status(400).json({
          error: 'No OpenAI API key provided. Please configure your OpenAI API Key in Settings or set OPENAI_API_KEY.',
        });
      }

      const chosenModel = model || 'gpt-4o';
      const openAiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      ];

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send sources header event
        res.write(`data: ${JSON.stringify({ sources: sourcesUsed })}\n\n`);

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openAIApiKey}`,
            },
            body: JSON.stringify({
              model: chosenModel,
              messages: openAiMessages,
              temperature: Math.max(0, Math.min(2, Number(temperature) || 0.7)),
              stream: true,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            res.write(`data: ${JSON.stringify({ error: `OpenAI API error (${response.status}): ${errText}` })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
          }

          if (!response.body) {
            throw new Error('No readable response body from OpenAI');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

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
                res.write('data: [DONE]\n\n');
                return res.end();
              }
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
                }
              } catch {
                // Ignore parse errors on raw tokens
              }
            }
          }

          res.write('data: [DONE]\n\n');
          return res.end();
        } catch (err: any) {
          res.write(`data: ${JSON.stringify({ error: err.message || 'Error communicating with OpenAI' })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        }
      } else {
        // Non-streaming response
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAIApiKey}`,
          },
          body: JSON.stringify({
            model: chosenModel,
            messages: openAiMessages,
            temperature: Number(temperature) || 0.7,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({ error: data.error?.message || 'OpenAI error' });
        }

        const reply = data.choices?.[0]?.message?.content || '';
        return res.json({ text: reply, sources: sourcesUsed, model: chosenModel, provider: 'openai' });
      }
    }

    // 2. GEMINI PROVIDER
    if (targetProvider === 'gemini') {
      const ai = getGenAIClient(geminiApiKey);
      if (!ai) {
        return res.status(400).json({
          error: 'Gemini API key is not configured. Please check GEMINI_API_KEY environment variable or enter your Google Gemini API key in Settings.',
        });
      }

      const chosenModel =
        model === 'gemini-3.1-pro-preview'
          ? 'gemini-3.1-pro-preview'
          : 'gemini-3.8-flash';

      // Build simplified prompt content for guaranteed compatibility
      let conversationTranscript = '';
      for (const m of messages) {
        conversationTranscript += `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}\n\n`;
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({ sources: sourcesUsed })}\n\n`);

        try {
          const responseStream: any = await withRetry(async () => {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('AI request timeout (35s)')), 35000)
            );
            const streamPromise = ai.models.generateContentStream({
              model: chosenModel,
              contents: conversationTranscript || 'Hello Ivan AI',
              config: {
                systemInstruction: systemPrompt,
                temperature: Number(temperature) || 0.7,
              },
            });
            return await Promise.race([streamPromise, timeoutPromise]);
          });

          for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
              res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }
          }

          res.write('data: [DONE]\n\n');
          return res.end();
        } catch (streamErr: any) {
          console.warn('Gemini stream interrupted, falling back to generateContent:', streamErr.message);
          try {
            const fallbackResponse: any = await withRetry(async () => {
              return await ai.models.generateContent({
                model: chosenModel,
                contents: conversationTranscript || 'Hello Ivan AI',
                config: {
                  systemInstruction: systemPrompt,
                  temperature: Number(temperature) || 0.7,
                },
              });
            });
            const text = fallbackResponse.text || '';
            const words = text.split(' ');
            for (let i = 0; i < words.length; i += 4) {
              const slice = words.slice(i, i + 4).join(' ') + ' ';
              res.write(`data: ${JSON.stringify({ text: slice })}\n\n`);
              await new Promise((r) => setTimeout(r, 20));
            }
            res.write('data: [DONE]\n\n');
            return res.end();
          } catch (err: any) {
            console.error('Gemini fallback failed:', err);
            let displayError = err.message || 'Error communicating with Gemini';
            try {
              const parsed = JSON.parse(displayError);
              if (parsed?.error?.message) {
                try {
                  const inner = JSON.parse(parsed.error.message);
                  if (inner?.error?.message) displayError = inner.error.message;
                } catch {
                  displayError = parsed.error.message;
                }
              }
            } catch {}
            res.write(`data: ${JSON.stringify({ error: displayError })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
          }
        }
      } else {
        const response: any = await withRetry(async () => {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timeout (35s)')), 35000)
          );
          const genPromise = ai.models.generateContent({
            model: chosenModel,
            contents: conversationTranscript || 'Hello Ivan AI',
            config: {
              systemInstruction: systemPrompt,
              temperature: Number(temperature) || 0.7,
            },
          });
          return await Promise.race([genPromise, timeoutPromise]);
        });

        return res.json({
          text: response.text || '',
          sources: sourcesUsed,
          model: chosenModel,
          provider: 'gemini',
        });
      }
    }

    return res.status(400).json({ error: `Unsupported AI provider: ${targetProvider}` });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error in AI chat endpoint' });
  }
});

// Quick Document Analysis endpoint
app.post('/api/ai/analyze-document', async (req: Request, res: Response) => {
  try {
    const {
      action = 'summarize',
      documentTitle = 'Document',
      documentContent = '',
      category = 'General',
      customPrompt = '',
      userApiKey = '',
    } = req.body;

    const authHeader = req.headers['x-openai-api-key'] as string;
    const openAIApiKey = userApiKey || authHeader || process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    let promptAction = '';
    switch (action) {
      case 'summarize':
        promptAction = 'Provide a comprehensive yet structured summary of this document. Include an Executive Summary, Key Takeaways (bullet points), and Major Sections breakdown.';
        break;
      case 'explain':
        promptAction = 'Explain the core ideas and concepts in this document in clear, accessible terms as if explaining to a university student or colleague. Clarify difficult terminology.';
        break;
      case 'quiz':
        promptAction = 'Create a thorough revision quiz based on this document. Generate: 1) 5 Multiple-Choice Questions with answers and explanations, 2) 3 Short-Answer Questions with model answers, and 3) 2 Deep-Thinking/Discussion Questions.';
        break;
      case 'extract_points':
        promptAction = 'Extract all key points, crucial facts, important deadlines/dates, tasks, formulas, and actionable items from this document into structured tables or categorized lists.';
        break;
      case 'improve':
        promptAction = 'Critique and improve the writing, clarity, academic/business tone, and structure of this document. Identify weaknesses and provide polished alternative formulations.';
        break;
      case 'study_guide':
        promptAction = 'Transform this document into an in-depth Study Guide with learning objectives, key definitions, core concepts, formulas/theorems, and revision checklist.';
        break;
      case 'custom':
        promptAction = customPrompt || 'Analyze this document thoroughly.';
        break;
      default:
        promptAction = 'Summarize and extract key insights from this document.';
    }

    const fullPrompt = `${promptAction}\n\nDocument Title: ${documentTitle}\nCategory: ${category}\n\n=== DOCUMENT TEXT ===\n${documentContent.slice(0, 30000)}\n=== END DOCUMENT TEXT ===`;

    if (openAIApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are Ivan AI, an expert academic and business document analyst. Format with pristine markdown.',
            },
            { role: 'user', content: fullPrompt },
          ],
          temperature: 0.5,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'OpenAI analysis error');
      }
      return res.json({ result: data.choices?.[0]?.message?.content, provider: 'openai' });
    } else if (geminiApiKey) {
      const ai = getGenAIClient(geminiApiKey);
      if (!ai) throw new Error('Gemini client not initialized');
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: {
          systemInstruction: 'You are Ivan AI, an expert academic and business document analyst. Format with pristine markdown.',
          temperature: 0.5,
        },
      });
      return res.json({ result: response.text || '', provider: 'gemini' });
    } else {
      return res.status(400).json({
        error: 'No AI key configured. Please add your OpenAI API Key in Settings or set OPENAI_API_KEY / GEMINI_API_KEY.',
      });
    }
  } catch (err: any) {
    console.error('Document analysis error:', err);
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// Natural Language Workspace Search endpoint
app.post('/api/ai/search', async (req: Request, res: Response) => {
  try {
    const { query = '', documents = [], userApiKey = '' } = req.body;
    if (!query) {
      return res.json({ matchedDocIds: [], rationale: 'Empty query' });
    }

    const authHeader = req.headers['x-openai-api-key'] as string;
    const openAIApiKey = userApiKey || authHeader || process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    const docCatalog = documents.map((d: any) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      tags: d.tags,
      snippet: (d.extractedText || '').slice(0, 500),
    }));

    const searchPrompt = `Given the user's natural language search query: "${query}"
Evaluate which of the following catalog documents are relevant.
Return ONLY valid JSON in this format:
{
  "matches": [
    { "id": "document_id", "relevanceScore": 0.95, "reason": "Brief 1-sentence reason why this matches" }
  ],
  "summary": "Brief 1-sentence summary of findings"
}

Document Catalog:
${JSON.stringify(docCatalog, null, 2)}`;

    let answerJsonStr = '';

    if (openAIApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a precise search relevance engine. Output pure JSON only.' },
            { role: 'user', content: searchPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      const data = await response.json();
      answerJsonStr = data.choices?.[0]?.message?.content || '{}';
    } else if (geminiApiKey) {
      const ai = getGenAIClient(geminiApiKey);
      if (!ai) throw new Error('Gemini not ready');
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
        config: {
          systemInstruction: 'You are a precise search relevance engine. Output pure JSON only.',
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      answerJsonStr = response.text || '{}';
    } else {
      // Local fallback matching
      const qLower = query.toLowerCase();
      const matched = docCatalog
        .filter((d: any) =>
          d.name.toLowerCase().includes(qLower) ||
          d.category?.toLowerCase().includes(qLower) ||
          (d.tags && d.tags.some((t: string) => t.toLowerCase().includes(qLower))) ||
          (d.snippet && d.snippet.toLowerCase().includes(qLower))
        )
        .map((d: any) => ({ id: d.id, relevanceScore: 0.8, reason: 'Matched keywords locally' }));
      return res.json({ matches: matched, summary: `Found ${matched.length} keyword match(es)` });
    }

    try {
      const parsed = JSON.parse(answerJsonStr);
      return res.json(parsed);
    } catch {
      return res.json({ matches: [], summary: 'Could not parse AI search results' });
    }
  } catch (err: any) {
    console.error('AI search error:', err);
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// Setup Vite dev server or static file serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`IVAN WORKSPACE server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
