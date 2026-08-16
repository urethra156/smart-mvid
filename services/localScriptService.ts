import { VideoScript, MoodPreset, Scene, SongAnalysis, ConsistentElements } from '../types';

/**
 * Local offline script generator when running in offline or local mode.
 * Generates a full, professional music video script and analysis.
 */
export const generateLocalVideoScript = async (
  input: { lyrics: string; audioFile: File | null },
  totalSeconds: number,
  mood: MoodPreset
): Promise<VideoScript> => {
  const sceneCount = Math.ceil(totalSeconds / 8);
  const songTitle = input.audioFile
    ? input.audioFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
    : (input.lyrics.split('\n')[0]?.slice(0, 30).trim() || 'Untitled Music Video');

  // Infer genre & key based on mood preset
  const moodMap: Record<string, { key: string; bpm: number; dynamics: string; themes: string[]; colors: { hex: string; reason: string }[] }> = {
    'Cinematic': {
      key: 'D Minor',
      bpm: 110,
      dynamics: 'Building tension with orchestral swells leading to a climax.',
      themes: ['Destiny', 'Internal Struggle', 'Reflection', 'Hope'],
      colors: [{ hex: '#1E293B', reason: 'Deep cinematic shadows' }, { hex: '#F59E0B', reason: 'Warm golden key light' }, { hex: '#06B6D4', reason: 'Cool teal backlight' }]
    },
    'Cyberpunk': {
      key: 'C Minor',
      bpm: 128,
      dynamics: 'High octane electronic beats with pulsating bass drops.',
      themes: ['High-Tech Low-Life', 'Neon Rebellion', 'Digital Identity'],
      colors: [{ hex: '#EC4899', reason: 'Electric neon pink' }, { hex: '#06B6D4', reason: 'Cyber cyan glow' }, { hex: '#0F172A', reason: 'Midnight cityscape dark' }]
    },
    'Vaporwave': {
      key: 'F Major',
      bpm: 85,
      dynamics: 'Dreamy slowed tempo with lo-fi reverb and nostlagic synths.',
      themes: ['Nostalgia', 'Retro Futurism', 'Surreal Solitude'],
      colors: [{ hex: '#F472B6', reason: 'Pastel sunset magenta' }, { hex: '#818CF8', reason: 'Dreamy lavender blue' }, { hex: '#2DD4BF', reason: 'Retro mint green' }]
    },
    'Hip Hop': {
      key: 'G Minor',
      bpm: 92,
      dynamics: 'Heavy bass drums, sharp snares, and confident vocal cadence.',
      themes: ['Ambition', 'Urban Life', 'Success', 'Authenticity'],
      colors: [{ hex: '#EAB308', reason: 'Golden chains & luxury' }, { hex: '#111827', reason: 'Urban night canvas' }, { hex: '#EF4444', reason: 'High impact accent' }]
    },
    'Rock': {
      key: 'E Minor',
      bpm: 135,
      dynamics: 'Raw distorted guitars, driving drum fills, and powerful vocals.',
      themes: ['Freedom', 'Raw Emotion', 'Rebellion', 'Energy'],
      colors: [{ hex: '#DC2626', reason: 'Raw passionate red' }, { hex: '#18181B', reason: 'Stage spotlight shadow' }, { hex: '#F3F4F6', reason: 'Strobe light flashes' }]
    }
  };

  const selectedPreset = moodMap[mood] || moodMap['Cinematic'];

  const analysis: SongAnalysis = {
    bpm: selectedPreset.bpm,
    musicalKey: selectedPreset.key,
    instrumentation: ['Synthesizers', 'Dynamic Drums', 'Electric Bass', 'Atmospheric Pads'],
    dynamics: selectedPreset.dynamics,
    lyricalThemes: selectedPreset.themes,
    suggestedColorPalette: selectedPreset.colors,
  };

  const consistentElements: ConsistentElements = {
    characters: [
      { name: 'The Protagonist', description: 'A enigmatic figure wearing a dark tailored coat with expressive eyes.' }
    ],
    props: [
      { name: 'The Mysterious Relic', description: 'A glowing luminescent artifact reflecting surrounding light.' }
    ]
  };

  const cameraAngles = [
    'Low angle tracking shot',
    'High angle overhead view',
    'Eye-level close-up',
    'Wide cinematic landscape shot',
    'Dynamic whip-pan shot',
    'Slow dolly push-in',
    'Dutch angle perspective'
  ];

  const transitions = [
    'Cut to:',
    'Dissolve to:',
    'Fade in:',
    'Match cut to:',
    'Flash to:',
    'Whip pan to:'
  ];

  // Parse lyrics lines if provided
  const lyricLines = input.lyrics
    ? input.lyrics.split('\n').filter(l => l.trim() !== '')
    : [];

  const scenes: Scene[] = [];

  for (let i = 0; i < sceneCount; i++) {
    const startSec = i * 8;
    const endSec = Math.min((i + 1) * 8, totalSeconds);
    const cameraAngle = cameraAngles[i % cameraAngles.length];
    const transition = i === 0 ? undefined : transitions[(i - 1) % transitions.length];

    const currentLyrics = lyricLines.length > 0
      ? [
          {
            text: lyricLines[i % lyricLines.length] || 'Instrumental passage',
            timestampSeconds: startSec
          }
        ]
      : 'Instrumental flow';

    const veoPrompt = `${cameraAngle} of The Protagonist holding The Mysterious Relic in a ${mood.toLowerCase()} environment, ${selectedPreset.colors[0].reason}, 35mm film lens, cinematic lighting, 8k render, hyper-detailed.`;

    scenes.push({
      sceneNumber: i + 1,
      startTimeSeconds: startSec,
      endTimeSeconds: endSec,
      cameraAngle,
      transition,
      description: `Scene ${i + 1}: The camera moves with a ${cameraAngle.toLowerCase()} capturing the emotional progression during section ${formatTime(startSec)}.`,
      veoPrompt,
      correspondingLyrics: currentLyrics,
    });
  }

  return {
    title: songTitle.toUpperCase(),
    overallMood: mood,
    analysis,
    consistentElements,
    scenes,
  };
};

const formatTime = (totalSeconds: number): string => {
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.floor(totalSeconds % 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
