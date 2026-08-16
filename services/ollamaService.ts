import { VideoScript, MoodPreset, Scene, LyricLine, OllamaConfig, OllamaModelInfo } from '../types';

export const OLLAMA_STORAGE_KEY = 'ai_music_video_ollama_config';

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  endpoint: 'http://localhost:11434',
  model: 'llama3.2',
  temperature: 0.7,
  contextLength: 8192,
  isOpenCodeMode: false,
  openCodeEndpoint: 'http://localhost:1234/v1',
  openCodeModel: 'qwen2.5-coder-7b-instruct',
  openCodeApiKey: '',
};

export const POPULAR_OLLAMA_MODELS = [
  { id: 'llama3.2', name: 'Llama 3.2 (3B)', tag: 'Fast & Lightweight', pullCmd: 'ollama run llama3.2' },
  { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder (7B)', tag: 'High-Precision JSON', pullCmd: 'ollama run qwen2.5-coder:7b' },
  { id: 'deepseek-r1:8b', name: 'DeepSeek R1 (8B)', tag: 'Reasoning & Metaphor', pullCmd: 'ollama run deepseek-r1:8b' },
  { id: 'llama3.1:8b', name: 'Llama 3.1 (8B)', tag: 'Cinematic Visuals', pullCmd: 'ollama run llama3.1' },
  { id: 'mistral:7b', name: 'Mistral (7B)', tag: 'Creative Storyteller', pullCmd: 'ollama run mistral' },
  { id: 'opencode:7b', name: 'OpenCode (7B)', tag: 'Open Code Model', pullCmd: 'ollama run opencode' },
];

/**
 * Load saved Ollama/OpenCode config from localStorage
 */
export const loadOllamaConfig = (): OllamaConfig => {
  try {
    const raw = localStorage.getItem(OLLAMA_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_OLLAMA_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("Failed to parse stored Ollama config:", e);
  }
  return DEFAULT_OLLAMA_CONFIG;
};

/**
 * Save Ollama/OpenCode config to localStorage
 */
export const saveOllamaConfig = (cfg: OllamaConfig) => {
  try {
    localStorage.setItem(OLLAMA_STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error("Failed to save Ollama config:", e);
  }
};

/**
 * Test connectivity to an Ollama server and fetch list of installed models
 */
export const testOllamaConnection = async (
  endpoint: string
): Promise<{ success: boolean; models: OllamaModelInfo[]; error?: string; raw?: any; isMixedContent?: boolean }> => {
  const cleanEndpoint = (endpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  const url = `${cleanEndpoint}/api/tags`;

  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpEndpoint = cleanEndpoint.startsWith('http://');
  const isMixedContent = isHttpsPage && isHttpEndpoint;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        models: [],
        error: `Server responded with HTTP ${response.status} (${response.statusText}). Make sure Ollama is running and model tags are accessible.`,
      };
    }

    const data = await response.json();
    const models: OllamaModelInfo[] = (data.models || []).map((m: any) => ({
      name: m.name || m.model,
      model: m.model || m.name,
      modified_at: m.modified_at,
      size: m.size,
      digest: m.digest,
      details: m.details,
    }));

    return {
      success: true,
      models,
      raw: data,
    };
  } catch (err: any) {
    console.warn("Ollama connection check:", err?.message || err);
    let rawMsg = (err?.message || String(err) || '').toLowerCase();
    let message = '';

    if (err.name === 'AbortError' || rawMsg.includes('abort') || rawMsg.includes('timeout')) {
      message = `Connection timed out (6s). Verify that Ollama is running at ${cleanEndpoint}.`;
    } else if (
      rawMsg.includes('load failed') ||
      rawMsg.includes('failed to fetch') ||
      rawMsg.includes('networkerror') ||
      rawMsg.includes('cors') ||
      rawMsg.includes('mixed content') ||
      rawMsg.includes('preflight') ||
      rawMsg.includes('typeerror')
    ) {
      if (isMixedContent) {
        message = `Browser Security (Mixed Content / CORS): The app is loaded securely via HTTPS, so browsers block unencrypted local requests to "${cleanEndpoint}".\n\nHow to connect:\n• Option A (Quick Tunnel): Run "ngrok http 11434" and paste your https://xxxx.ngrok-free.app endpoint here.\n• Option B (Enable CORS): Launch Ollama with: OLLAMA_ORIGINS="*" ollama serve\n• Option C (Switch Engine): Use Google Gemini Cloud or the Built-in Offline Director with 1 click.`;
      } else {
        message = `Cannot reach Ollama at ${cleanEndpoint}. Make sure Ollama is running with CORS enabled:\nOLLAMA_ORIGINS="*" ollama serve`;
      }
    } else {
      message = `Ollama connection error: ${err?.message || 'Server unreachable'}`;
    }

    return {
      success: false,
      models: [],
      error: message,
      isMixedContent,
    };
  }
};

/**
 * Test connection to an OpenAI-compatible Open Code / LM Studio / LocalAI endpoint
 */
export const testOpenCodeConnection = async (
  endpoint: string,
  apiKey?: string
): Promise<{ success: boolean; models: string[]; error?: string; isMixedContent?: boolean }> => {
  const cleanEndpoint = (endpoint || 'http://localhost:1234/v1').trim().replace(/\/+$/, '');
  const url = `${cleanEndpoint}/models`;

  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpEndpoint = cleanEndpoint.startsWith('http://');
  const isMixedContent = isHttpsPage && isHttpEndpoint;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        models: [],
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    let modelNames: string[] = [];

    if (Array.isArray(data.data)) {
      modelNames = data.data.map((m: any) => m.id || m.name);
    } else if (Array.isArray(data.models)) {
      modelNames = data.models.map((m: any) => m.id || m.name || m);
    }

    return {
      success: true,
      models: modelNames,
    };
  } catch (err: any) {
    console.warn("OpenCode connection check:", err?.message || err);
    let rawMsg = (err?.message || String(err) || '').toLowerCase();
    let message = '';

    if (err.name === 'AbortError' || rawMsg.includes('abort') || rawMsg.includes('timeout')) {
      message = `Connection timed out (6s). Verify that your local Open Code server is active at ${cleanEndpoint}.`;
    } else if (
      rawMsg.includes('load failed') ||
      rawMsg.includes('failed to fetch') ||
      rawMsg.includes('networkerror') ||
      rawMsg.includes('cors') ||
      rawMsg.includes('typeerror')
    ) {
      if (isMixedContent) {
        message = `Browser Security (Mixed Content / CORS): The app is loaded securely via HTTPS, so browsers block unencrypted local requests to "${cleanEndpoint}".\n\nUse an HTTPS tunnel (e.g. ngrok http 1234) or enable CORS in your server settings (e.g. LM Studio -> Enable CORS).`;
      } else {
        message = `Cannot reach Open Code server at ${cleanEndpoint}. Ensure your server (LM Studio, LocalAI, vLLM) is running with CORS enabled.`;
      }
    } else {
      message = `Open Code error: ${err?.message || 'Server unreachable'}`;
    }

    return {
      success: false,
      models: [],
      error: message,
      isMixedContent,
    };
  }
};

/**
 * Send raw prompt to Ollama with JSON formatting
 */
export const callOllamaApi = async (
  prompt: string,
  systemPrompt: string,
  config: OllamaConfig,
  onStreamChunk?: (chunk: string) => void
): Promise<string> => {
  const cleanEndpoint = (config.endpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  const url = `${cleanEndpoint}/api/generate`;

  const payload = {
    model: config.model || 'llama3.2',
    prompt,
    system: systemPrompt,
    format: 'json',
    stream: false,
    options: {
      temperature: config.temperature ?? 0.7,
      num_ctx: config.contextLength ?? 8192,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Ollama Error [HTTP ${response.status}]: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (err: any) {
    const rawMsg = (err?.message || String(err) || '').toLowerCase();
    if (rawMsg.includes('load failed') || rawMsg.includes('failed to fetch') || rawMsg.includes('networkerror') || rawMsg.includes('typeerror')) {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      if (isHttps && cleanEndpoint.startsWith('http://')) {
        throw new Error(
          `Cannot reach Ollama at "${cleanEndpoint}". Web browsers block HTTP requests from HTTPS pages (Mixed Content).\n\nRun "ngrok http 11434" to create an HTTPS tunnel, or launch Ollama with: OLLAMA_ORIGINS="*" ollama serve`
        );
      }
      throw new Error(`Cannot connect to Ollama at ${cleanEndpoint}. Please verify Ollama is running (OLLAMA_ORIGINS="*" ollama serve).`);
    }
    throw err;
  }
};

/**
 * Send prompt to OpenAI-compatible Open Code / LM Studio / LocalAI endpoint
 */
export const callOpenCodeApi = async (
  prompt: string,
  systemPrompt: string,
  config: OllamaConfig
): Promise<string> => {
  const cleanEndpoint = (config.openCodeEndpoint || 'http://localhost:1234/v1').trim().replace(/\/+$/, '');
  const url = `${cleanEndpoint}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.openCodeApiKey) {
    headers['Authorization'] = `Bearer ${config.openCodeApiKey}`;
  }

  const payload = {
    model: config.openCodeModel || 'qwen2.5-coder-7b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: config.temperature ?? 0.7,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Open Code Error [HTTP ${response.status}]: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Open Code model.");
    }
    return content;
  } catch (err: any) {
    const rawMsg = (err?.message || String(err) || '').toLowerCase();
    if (rawMsg.includes('load failed') || rawMsg.includes('failed to fetch') || rawMsg.includes('networkerror') || rawMsg.includes('typeerror')) {
      throw new Error(`Cannot connect to Open Code endpoint at ${cleanEndpoint}. Ensure LM Studio / Local server is active with CORS enabled.`);
    }
    throw err;
  }
};

/**
 * Clean & robustly parse JSON from local LLM outputs
 */
const sanitizeAndParseJson = (rawText: string): any => {
  let cleaned = rawText.trim();

  // Strip Markdown code block wrapper if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    console.warn("Direct JSON parse failed, attempting extraction...", initialErr);
  }

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      // Remove trailing commas before closing braces/brackets
      const regexFixed = jsonCandidate
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(regexFixed);
    }
  }

  throw new Error("Unable to parse valid JSON from local LLM response: " + rawText.slice(0, 200));
};

/**
 * Format total seconds into mm:ss
 */
const formatSeconds = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Generate full Music Video Script using Ollama or Open Code local models
 */
export const generateScriptWithOllamaOrOpenCode = async (
  input: { lyrics?: string; audioFile?: File | null },
  totalSeconds: number,
  moodPreset: MoodPreset,
  config: OllamaConfig,
  onStatusUpdate?: (status: string) => void
): Promise<VideoScript> => {
  const numScenes = Math.max(1, Math.ceil(totalSeconds / 8));
  const lyricsText = input.lyrics?.trim() || "(Instrumental or non-lyrical audio track)";

  onStatusUpdate?.(`Connecting to local ${config.isOpenCodeMode ? 'Open Code' : 'Ollama (' + config.model + ')'} engine...`);

  const systemPrompt = `You are a world-class Music Video Director and Creative Cinematographer.
Your job is to analyze song lyrics/audio characteristics and produce a complete, compelling music video script in STRICT JSON format.
The music video must be divided into exactly ${numScenes} sequential 8-second scenes to match a total song duration of ${totalSeconds} seconds (${formatSeconds(totalSeconds)}).

CRITICAL REQUIREMENTS:
1. Output MUST be 100% valid JSON matching the specified schema.
2. Produce exactly ${numScenes} scenes, numbered 1 to ${numScenes}.
3. Each scene MUST have:
   - "sceneNumber": integer
   - "startTimeSeconds": integer (0, 8, 16, 24, ...)
   - "endTimeSeconds": integer (8, 16, 24, 32, ..., up to ${totalSeconds})
   - "transition": string (e.g. "Cut to:", "Dissolve to:", "Fast whip-pan to:")
   - "cameraAngle": string (e.g. "Wide cinematic crane shot", "Extreme close-up macro", "Low angle tracking dolly")
   - "description": descriptive summary of the visual action and symbolism
   - "correspondingLyrics": array of objects with [{"text": string, "timestampSeconds": number}] or string
   - "veoPrompt": a dense, photorealistic, 8-second cinematic generation prompt detailing subject motion, lighting, camera movement, film stock (35mm / anamorphic), color grade, and atmosphere.

SCHEMA DEFINITION:
{
  "title": "Creative Concept Title",
  "overallMood": "Detailed mood and visual aesthetic description matching '${moodPreset}'",
  "analysis": {
    "bpm": 120,
    "musicalKey": "C Major",
    "instrumentation": ["Synthesizer", "Drums", "Electric Guitar"],
    "dynamics": "Dynamic build description",
    "lyricalThemes": ["Theme 1", "Theme 2"],
    "suggestedColorPalette": [
      { "hex": "#0D1B2A", "reason": "Deep nocturnal shadows" },
      { "hex": "#E0E1DD", "reason": "High-contrast rim lighting" },
      { "hex": "#00F5D4", "reason": "Vibrant neon accent" },
      { "hex": "#7B2CBF", "reason": "Moody atmospheric haze" }
    ]
  },
  "consistentElements": {
    "characters": [
      { "name": "The Protagonist", "description": "Visual appearance, style, and wardrobe" }
    ],
    "props": [
      { "name": "Glowing Amulet", "description": "Key visual artifact appearing throughout scenes" }
    ]
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "startTimeSeconds": 0,
      "endTimeSeconds": 8,
      "transition": "Fade in from black",
      "cameraAngle": "Slow cinematic push-in on 35mm anamorphic lens",
      "description": "Opening shot introducing the atmosphere and visual setting.",
      "correspondingLyrics": [
        { "text": "First line of lyrics", "timestampSeconds": 2 }
      ],
      "veoPrompt": "Cinematic 35mm anamorphic film still, wide establishing push-in shot, moody atmospheric volumetric fog, golden hour rim lighting, photorealistic 8k octane render."
    }
  ]
}`;

  const userPrompt = `Analyze this song and create a bespoke ${numScenes}-scene music video script.
Song Duration: ${totalSeconds} seconds (${formatSeconds(totalSeconds)})
Aesthetic / Mood Preset: ${moodPreset}
Song Lyrics / Track Info:
"""
${lyricsText}
"""

Please output the complete JSON object now with all ${numScenes} scenes.`;

  onStatusUpdate?.(`Synthesizing ${numScenes} scenes with local model ${config.isOpenCodeMode ? config.openCodeModel : config.model}...`);

  let rawOutput = '';
  if (config.isOpenCodeMode) {
    rawOutput = await callOpenCodeApi(userPrompt, systemPrompt, config);
  } else {
    rawOutput = await callOllamaApi(userPrompt, systemPrompt, config);
  }

  onStatusUpdate?.("Validating scene structure and timings...");

  const parsed = sanitizeAndParseJson(rawOutput);

  // Validate and sanitize parsed script
  const script: VideoScript = {
    title: parsed.title || `${moodPreset} Music Video`,
    overallMood: parsed.overallMood || `${moodPreset} aesthetic`,
    analysis: {
      bpm: parsed.analysis?.bpm || 120,
      musicalKey: parsed.analysis?.musicalKey || 'C Major',
      instrumentation: Array.isArray(parsed.analysis?.instrumentation) ? parsed.analysis.instrumentation : ['Synthesizer', 'Bass', 'Percussion'],
      dynamics: parsed.analysis?.dynamics || 'Dynamic crescendo building across verses into chorus.',
      lyricalThemes: Array.isArray(parsed.analysis?.lyricalThemes) ? parsed.analysis.lyricalThemes : ['Emotion', 'Journey', 'Atmosphere'],
      suggestedColorPalette: Array.isArray(parsed.analysis?.suggestedColorPalette) ? parsed.analysis.suggestedColorPalette : [
        { hex: '#0B0F19', reason: 'Deep shadow base' },
        { hex: '#00F5D4', reason: 'Vibrant highlight' },
        { hex: '#7928CA', reason: 'Cinematic mood accent' },
        { hex: '#F9FAFB', reason: 'Key light fill' },
      ],
    },
    consistentElements: {
      characters: Array.isArray(parsed.consistentElements?.characters) ? parsed.consistentElements.characters : [],
      props: Array.isArray(parsed.consistentElements?.props) ? parsed.consistentElements.props : [],
    },
    scenes: Array.isArray(parsed.scenes) ? parsed.scenes.map((s: any, idx: number) => {
      const start = idx * 8;
      const end = Math.min((idx + 1) * 8, totalSeconds);
      return {
        sceneNumber: idx + 1,
        startTimeSeconds: typeof s.startTimeSeconds === 'number' ? s.startTimeSeconds : start,
        endTimeSeconds: typeof s.endTimeSeconds === 'number' ? s.endTimeSeconds : end,
        transition: s.transition || (idx === 0 ? 'Fade in from black' : 'Cut to:'),
        cameraAngle: s.cameraAngle || 'Wide cinematic dolly shot',
        description: s.description || `Scene ${idx + 1} visual narrative.`,
        correspondingLyrics: Array.isArray(s.correspondingLyrics) ? s.correspondingLyrics : (s.correspondingLyrics ? [{ text: String(s.correspondingLyrics), timestampSeconds: start }] : []),
        veoPrompt: s.veoPrompt || `Cinematic music video scene ${idx + 1}, ${moodPreset} aesthetic, 35mm film stock, volumetric lighting, photorealistic 8k.`,
      };
    }) : [],
  };

  // If no scenes were generated, create minimum placeholder scenes
  if (script.scenes.length === 0) {
    for (let i = 0; i < numScenes; i++) {
      const start = i * 8;
      const end = Math.min((i + 1) * 8, totalSeconds);
      script.scenes.push({
        sceneNumber: i + 1,
        startTimeSeconds: start,
        endTimeSeconds: end,
        transition: i === 0 ? 'Fade in' : 'Cut to:',
        cameraAngle: 'Cinematic tracking shot',
        description: `Visual progression for scene ${i + 1}.`,
        correspondingLyrics: [],
        veoPrompt: `Cinematic 35mm film scene, ${moodPreset} style, 8-second sequence, high dynamic range, volumetric lighting, photorealistic.`,
      });
    }
  }

  return script;
};

/**
 * Enhance an existing scene prompt with Ollama
 */
export const enhanceScenePromptWithOllama = async (
  scene: Scene,
  overallMood: string,
  config: OllamaConfig
): Promise<string> => {
  const systemPrompt = `You are an expert AI Video Prompt Engineer specializing in Google VEO, ComfyUI, Runway Gen-3, and Kling.
Turn the user's scene description into an ultra-dense, photorealistic 8-second video generation prompt.
Include: Subject motion, camera framing & lens, lighting style, color grading, film texture, and atmosphere.
Output ONLY the final prompt text. Do not output markdown, prefixes, or explanations.`;

  const userPrompt = `Scene Number: ${scene.sceneNumber}
Camera Angle: ${scene.cameraAngle || 'Cinematic'}
Scene Description: ${scene.description}
Overall Aesthetic: ${overallMood}
Existing Prompt: ${scene.veoPrompt}

Generate the enhanced cinematic prompt now:`;

  if (config.isOpenCodeMode) {
    const raw = await callOpenCodeApi(userPrompt, systemPrompt, config);
    return raw.trim().replace(/^"|"$/g, '');
  } else {
    const cleanEndpoint = config.endpoint.replace(/\/+$/, '');
    const url = `${cleanEndpoint}/api/generate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'llama3.2',
        prompt: userPrompt,
        system: systemPrompt,
        stream: false,
        options: { temperature: 0.7 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama prompt enhancement failed with HTTP ${response.status}`);
    }
    const data = await response.json();
    return (data.response || scene.veoPrompt).trim().replace(/^"|"$/g, '');
  }
};
