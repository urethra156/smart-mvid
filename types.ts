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

export interface VideoScript {
  title: string;
  overallMood: string;
  scenes: Scene[];
  analysis?: SongAnalysis;
  consistentElements?: ConsistentElements;
}