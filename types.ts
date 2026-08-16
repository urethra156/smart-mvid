export type MoodPreset = 
  // Core
  'Cinematic' | 'Abstract' | 'Documentary' | 'High Energy' |
  // Genres
  'Pop' | 'Rock' | 'Hip Hop' | 'Electronic' | 'Folk/Acoustic' |
  // Moods
  'Romantic' | 'Melancholic' | 'Psychedelic' |
  // Artistic Styles
  'Film Noir' | 'Vaporwave' | 'Anime' | 'Wes Anderson' | 'Minimalist' | 'Gothic' | 'Surrealist' |
  'Horror' | 'Thriller' | 'Cyberpunk' | 'Steampunk';

export interface LyricLine {
  text: string;
  timestampSeconds: number;
}

export interface Scene {
  sceneNumber: number;
  description: string;
  veoPrompt: string;
  correspondingLyrics: LyricLine[] | string;
  transition?: string;
  cameraAngle?: string;
  startTimeSeconds?: number;
  endTimeSeconds?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  thumbnailPrompt?: string;
}

export interface ColorSuggestion {
    hex: string;
    reason: string;
}

export interface SongAnalysis {
    bpm: number;
    musicalKey: string;
    instrumentation: string[];
    dynamics: string;
    lyricalThemes: string[];
    suggestedColorPalette: ColorSuggestion[];
}

export interface ConsistentElement {
    name: string;
    description: string;
}

// This type is for the UI state, including the uploaded image data.
export interface ElementWithImage extends ConsistentElement {
    type: 'character' | 'prop';
    imageDataUrl?: string; // base64 data URL for previews
}

export interface ConsistentElements {
    characters: ConsistentElement[];
    props: ConsistentElement[];
}

export type StyleCategory = 
  | 'Aesthetic / Art Style'
  | 'Camera & Film Stock'
  | 'Lighting & Atmosphere'
  | 'Genre & Mood'
  | 'Custom';

export type StyleApplyMode = 'append' | 'prepend' | 'replace';

export interface PromptStylePreset {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  category: StyleCategory;
  promptSnippet: string;
  negativePrompt?: string;
  cameraNotes?: string;
  lightingNotes?: string;
  colorPaletteHints?: string[];
  isCustom?: boolean;
  isFavorite?: boolean;
  createdAt?: number;
}

export type LlmProvider = 'gemini' | 'ollama' | 'opencode' | 'local';

export interface OllamaModelInfo {
  name: string;
  model: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaConfig {
  endpoint: string;             // e.g. 'http://localhost:11434'
  model: string;                // e.g. 'llama3.2', 'qwen2.5:7b', 'deepseek-r1:8b', 'opencode'
  temperature: number;          // e.g. 0.7
  contextLength: number;        // e.g. 8192
  isOpenCodeMode?: boolean;     // true if using OpenAI-compatible Open Code / LocalAI / LM Studio
  openCodeEndpoint?: string;    // e.g. 'http://localhost:1234/v1' or 'http://localhost:8000/v1'
  openCodeModel?: string;       // e.g. 'qwen2.5-coder-7b-instruct'
  openCodeApiKey?: string;      // optional token
  systemPromptExtra?: string;   // optional system instruction override
}

export interface VideoScript {
  title: string;
  overallMood: string;
  scenes: Scene[];
  analysis?: SongAnalysis;
  consistentElements?: ConsistentElements;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey?: () => Promise<boolean>;
      openSelectKey?: () => Promise<void>;
    };
  }
}