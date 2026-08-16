import { PromptStylePreset, Scene, VideoScript, StyleApplyMode } from '../types';

export const DEFAULT_PROMPT_STYLES: PromptStylePreset[] = [
  {
    id: 'cyberpunk-neon-noir',
    title: 'Cyberpunk Neon Noir',
    description: 'High-tech dystopian cityscape drenched in magenta & cyan neon, reflective rain slick, volumetric haze.',
    tags: ['Cyberpunk', 'Neon', 'Futuristic', 'Sci-Fi', 'Night', 'Reflective'],
    category: 'Aesthetic / Art Style',
    promptSnippet: 'cyberpunk aesthetic, high-tech dystopian city, glowing neon signs in magenta and cyan, rain-slicked reflective asphalt, volumetric atmospheric haze, anamorphic lens flares, 8k resolution cinematic look',
    negativePrompt: 'daylight, flat lighting, oversaturated cartoon, blurry, low contrast, bright sun',
    cameraNotes: 'Low-angle tracking shot, slow push-in, shallow depth of field, anamorphic 2.39:1',
    lightingNotes: 'High-contrast neon backlighting, cyan and magenta rim light, volumetric fog',
    colorPaletteHints: ['#ff007f', '#00f0ff', '#0d0221', '#7928ca'],
    isCustom: false,
    isFavorite: true,
  },
  {
    id: 'watercolor-dreamscape',
    title: 'Watercolor Dreamscape',
    description: 'Soft bleeding pastel pigments on textured cold-press paper with translucent washes and poetic brushstrokes.',
    tags: ['Watercolor', 'Artistic', 'Painterly', 'Soft', 'Dreamy', 'Pastel'],
    category: 'Aesthetic / Art Style',
    promptSnippet: 'fluid watercolor painting aesthetic, soft bleeding pastel pigments on textured cold-press paper, dreamy soft edges, translucent gouache washes, whimsical artistic brushstrokes, ethereal fine art composition',
    negativePrompt: 'photorealistic, hard digital lines, harsh 3D render, glossy plastic, noisy artifacts',
    cameraNotes: 'Gentle floating pan, wide soft-focus framing, poetic camera drift',
    lightingNotes: 'Diffused daylight, glowing pastel translucency, soft rim highlights',
    colorPaletteHints: ['#fbcfe8', '#bfdbfe', '#fef08a', '#e9d5ff'],
    isCustom: false,
    isFavorite: true,
  },
  {
    id: '90s-vhs-aesthetic',
    title: '90s VHS Camcorder Lo-Fi',
    description: 'Authentic 1990s analog home-video tape look with magnetic tape noise, color bleed, and timestamp overlay.',
    tags: ['VHS aesthetic', 'Retro', 'Lo-Fi', '90s', 'Analog', 'Nostalgia', 'Tape'],
    category: 'Camera & Film Stock',
    promptSnippet: 'authentic 1990s VHS camcorder tape aesthetic, scanlines, analog color bleed, chromatic aberration, subtle magnetic tape noise, CRT phosphor glow, glowing timestamp overlay in corner, nostalgic vintage home-video texture',
    negativePrompt: 'crisp 4k, modern digital HD, clean sharp vectors, 3D CGI render',
    cameraNotes: 'Handheld camcorder shake, sudden optical zoom-in, vintage 4:3 aspect ratio framing',
    lightingNotes: 'On-camera direct halogen flash, fluorescent cast, blooming hot highlights',
    colorPaletteHints: ['#00ffff', '#ff0055', '#ffe600', '#121212'],
    isCustom: false,
    isFavorite: true,
  },
  {
    id: 'cinematic-anamorphic-35mm',
    title: 'Cinematic Anamorphic 35mm',
    description: 'Panavision anamorphic lens framing with Kodak Vision3 35mm film grain, rich dynamic range, and oval bokeh.',
    tags: ['Cinematic', '35mm', 'Film Grain', 'Panavision', 'Hollywood', 'Film Stock'],
    category: 'Camera & Film Stock',
    promptSnippet: 'masterpiece cinematic shot, 35mm Kodak Vision3 film stock, subtle natural film grain, wide 2.39:1 anamorphic framing, horizontal blue streak lens flare, oval bokeh, soft roll-off highlights, deep dynamic range, Hollywood prestige cinematography',
    negativePrompt: 'cheap digital video, flat smartphone recording, overexposed, blown out, digital noise',
    cameraNotes: 'Steadicam tracking shot, slow cinematic dolly push, shallow depth of field',
    lightingNotes: 'Three-point cinema lighting, motivated practicals, rich golden hour or chiaroscuro key',
    colorPaletteHints: ['#d97706', '#1e293b', '#0284c7', '#f8fafc'],
    isCustom: false,
    isFavorite: true,
  },
  {
    id: 'retro-90s-anime-cel',
    title: 'Retro 90s Anime Cel-Shaded',
    description: 'Hand-painted cel animation with bold ink linework, film dust, and classic Studio Ghibli/Akira aesthetic.',
    tags: ['Anime', 'Cel-Shaded', 'Retro', 'Hand-Drawn', '90s OVA', 'Japanese Animation'],
    category: 'Aesthetic / Art Style',
    promptSnippet: '90s retro anime aesthetic, classic hand-painted cel animation, bold ink linework, saturated matte color palette, subtle film grain and dust, classic Studio Ghibli and Akira anime vibe, dynamic animation framing',
    negativePrompt: 'photorealistic, western 3D cartoon, plastic CGI, muddy gradients, modern flat vector',
    cameraNotes: 'Dramatic anime angle, speed-line zoom, dynamic perspective tilt',
    lightingNotes: 'Hand-painted cel shadow accents, rim highlights, cel gradient glow',
    colorPaletteHints: ['#e11d48', '#3b82f6', '#fbbf24', '#0f172a'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'vintage-super-8mm',
    title: 'Vintage Super 8mm Nostalgia',
    description: 'Warm golden color reversal film with organic gate scratches, exposure flicker, and 1970s summer memory vibe.',
    tags: ['Super 8', 'Vintage', '1970s', 'Retro', 'Film Flicker', 'Warm'],
    category: 'Camera & Film Stock',
    promptSnippet: 'authentic Super 8mm color reversal film, warm golden color grading, visible film gate frame borders, organic dust and scratches, exposure flutter, nostalgic 1970s summer memory aesthetic, soft warm vignettes',
    negativePrompt: 'modern ultra-HD, sterile digital lighting, 8k CGI, cold monochrome, modern tech',
    cameraNotes: 'Nostalgic handheld wobble, quick manual whip pan, 18fps film cadence',
    lightingNotes: 'Sun-drenched golden hour, natural lens flare, blown warm highlights',
    colorPaletteHints: ['#ea580c', '#ca8a04', '#78350f', '#fef3c7'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'synthwave-80s-outrun',
    title: 'Synthwave & Retrowave 80s',
    description: 'Wireframe grid horizon, chrome reflections, giant neon sun, electric magenta and purple outrun aura.',
    tags: ['Synthwave', 'Retrowave', '80s', 'Outrun', 'Grid', 'Neon'],
    category: 'Genre & Mood',
    promptSnippet: 'synthwave 1980s retro-futuristic aesthetic, glowing wireframe grid horizon, chrome reflections, giant segmented neon sunset, vibrant electric purple and hot magenta gradient, palm tree silhouettes, Delorean outrun aura',
    negativePrompt: 'monochrome, drab earthy colors, medieval, rustic, modern minimalism',
    cameraNotes: 'Forward tracking camera along endless neon highway grid, low angle wide shot',
    lightingNotes: 'Neon purple ambient wash, laser grid underglow, glowing vector wireframes',
    colorPaletteHints: ['#ec4899', '#8b5cf6', '#06b6d4', '#18002e'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'dark-gothic-fantasy',
    title: 'Dark Gothic & Ethereal Fantasy',
    description: 'Brooding cathedral arches, misty silver moonlight, romantic chiaroscuro shadows, and baroque grandeur.',
    tags: ['Gothic', 'Dark Fantasy', 'Moody', 'Ethereal', 'Mystical', 'Baroque'],
    category: 'Genre & Mood',
    promptSnippet: 'dark gothic aesthetic, towering cathedral arches, misty fog rolling across cobblestones, silver moonlight illumination, baroque Victorian drapery, moody chiaroscuro lighting, brooding atmospheric depth, romantic macabre fantasy',
    negativePrompt: 'bright cheerful colors, sunny daylight, modern minimalism, playful cartoon',
    cameraNotes: 'Low Dutch angle, slow ominous crane down, deep shadows',
    lightingNotes: 'Pale moonlight key light, single flickering candle practicals, heavy ambient fog',
    colorPaletteHints: ['#475569', '#1e1b4b', '#94a3b8', '#0f172a'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'wes-anderson-pastel',
    title: 'Wes Anderson Symmetrical Pastel',
    description: 'Obsessively centered symmetrical framing, whimsical warm pastel ochre & turquoise palette, diorama set.',
    tags: ['Wes Anderson', 'Pastel', 'Symmetrical', 'Quirky', 'Vintage Color', 'Arthouse'],
    category: 'Aesthetic / Art Style',
    promptSnippet: 'distinctive Wes Anderson directorial aesthetic, perfectly centered symmetrical composition, whimsical warm pastel color palette, yellow ochre and muted turquoise tones, diorama-like set design, flat orthographic framing, retro storybook charm',
    negativePrompt: 'chaotic crooked angles, gritty dark grime, harsh shadows, Dutch tilt, fast motion blur',
    cameraNotes: 'Dead-center eye-level static shot, 90-degree whip pan, crisp geometric staging',
    lightingNotes: 'Flat, high-key even lighting, pastel fill, no dark heavy shadows',
    colorPaletteHints: ['#fde047', '#5eead4', '#fca5a5', '#451a03'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'psychedelic-liquid-light',
    title: 'Psychedelic Liquid Light Show',
    description: '1960s swirling oil wheel liquid light projection, kaleidoscopic color morphing, iridescent trance.',
    tags: ['Psychedelic', 'Liquid Light', 'Trippy', 'Acid Art', '60s', 'Kaleidoscopic'],
    category: 'Lighting & Atmosphere',
    promptSnippet: '1960s psychedelic oil wheel liquid light projection, swirling marbled fluid colors, iridescent morphing fractals, kaleidoscopic double-exposure effect, vibrant luminous pigments drifting in rhythmic trance, mesmerizing optical illusion',
    negativePrompt: 'plain black and white, boring static studio, sharp rigid geometry, corporate clean',
    cameraNotes: 'Macro fluid lens zoom, slowly rotating prism effect, double-exposure dissolve',
    lightingNotes: 'Multi-colored projector backlight, pulsing prismatic luminescence',
    colorPaletteHints: ['#f43f5e', '#a855f7', '#10b981', '#facc15'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'glitch-datamosh-cyber',
    title: 'Glitch Art & Datamosh Distortion',
    description: 'Experimental digital pixel sorting, datamoshing compression artifacts, RGB split displacement, cyber static.',
    tags: ['Glitch', 'Datamosh', 'Cyberpunk', 'Experimental', 'Digital', 'VFX'],
    category: 'Lighting & Atmosphere',
    promptSnippet: 'experimental glitch art aesthetic, digital pixel sorting, datamoshing compression artifacts, RGB split chromatic displacement, CRT television static bars, hyper-stylized cybernetic video decoding error, electrifying kinetic distortion',
    negativePrompt: 'clean spotless video, traditional classical portrait, soft pastel, quiet static frame',
    cameraNotes: 'Jerky digital glitch stutter, sudden frame skipping, digital push-in',
    lightingNotes: 'Strobe RGB shifts, cyan-red color aberration bursts',
    colorPaletteHints: ['#22c55e', '#ef4444', '#06b6d4', '#09090b'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'classic-film-noir',
    title: 'Classic Film Noir Chiaroscuro',
    description: 'Monochrome black & white cinematography, dramatic slatted venetian blind shadows, cigarette smoke curls.',
    tags: ['Film Noir', 'Black & White', 'Shadows', 'Venetian Blinds', '1940s', 'Monochrome'],
    category: 'Camera & Film Stock',
    promptSnippet: 'classic 1940s film noir aesthetic, rich monochrome black and white cinematography, dramatic high-contrast chiaroscuro, venetian blind slatted shadow patterns, drifting cigarette smoke curls, wet city streets at midnight, silver screen glamour',
    negativePrompt: 'full color, bright flat daylight, modern neon glow, playful cartoon',
    cameraNotes: 'Low Dutch angle, deep focus staging, creeping shadows',
    lightingNotes: 'Hard key light through slatted blinds, deep unlit shadows, stark specular rim',
    colorPaletteHints: ['#ffffff', '#94a3b8', '#334155', '#000000'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'stop-motion-claymation',
    title: 'Stop-Motion Claymation',
    description: 'Tactile sculpted plasticine clay textures, charming staggered 12fps cadence, handcrafted miniature studio set.',
    tags: ['Claymation', 'Stop-Motion', 'Handmade', 'Tactile', 'Animation', 'Miniature'],
    category: 'Aesthetic / Art Style',
    promptSnippet: 'tactile claymation stop-motion animation aesthetic, sculpted plasticine clay textures with subtle fingerprint marks, charming 12fps staggered movement feel, miniature handcrafted studio set lighting, Aardman and Laika artisanal style',
    negativePrompt: 'smooth digital 60fps, photorealistic live action, glossy 2D vector, clinical 3D CGI',
    cameraNotes: 'Miniature macro lens perspective, subtle mechanical step-motor pan',
    lightingNotes: 'Miniature tabletop studio spotlights, warm incandescent bulbs',
    colorPaletteHints: ['#f97316', '#84cc16', '#06b6d4', '#7c2d12'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'ethereal-golden-hour',
    title: 'Ethereal Golden Hour Glow',
    description: 'Radiant magic hour amber sunlight, warm lens flares spilling across the frame, emotional dreamy warmth.',
    tags: ['Golden Hour', 'Atmospheric', 'Warm Light', 'Dreamy', 'Sun Flare', 'Cinematic'],
    category: 'Lighting & Atmosphere',
    promptSnippet: 'radiant golden hour magic hour lighting, warm amber sunlight backlighting, lens flares spilling across the frame, long cinematic shadows, dust motes floating in luminous sunbeams, dreamy emotional atmosphere, poetic slow motion',
    negativePrompt: 'harsh noon sunlight, cold fluorescent blue lighting, dull overcast, gritty dark grime',
    cameraNotes: 'Slow-motion 60fps tracking shot into the sun, shallow depth of field, golden bokeh',
    lightingNotes: 'Direct low-angle sun backlight, soft gold bounce fill, glowing rim silhouettes',
    colorPaletteHints: ['#fbbf24', '#f59e0b', '#b45309', '#451a03'],
    isCustom: false,
    isFavorite: false,
  },
  {
    id: 'hyper-realistic-ue5',
    title: 'Hyper-Realistic Unreal Engine 5',
    description: 'Photorealistic 8K render with Lumen global illumination, Ray-traced reflections, Octane Render fidelity.',
    tags: ['Hyper-Realistic', 'Unreal Engine 5', 'CGI', 'Ray-Tracing', 'Octane', '8k'],
    category: 'Aesthetic / Art Style',
    promptSnippet: 'hyper-realistic photorealistic 8k render, Unreal Engine 5 Lumen global illumination, nanite micro-geometric detail, physical cinema camera depth of field, Ray-traced reflections, Octane Render volumetric fidelity, ultra-detailed textures',
    negativePrompt: 'low polygon, flat shading, amateur drawing, blurry textures, distorted face',
    cameraNotes: 'Virtual cinema camera, smooth robotic crane sweep, perfect lens calibration',
    lightingNotes: 'Physically based rendering (PBR), realistic HDRI environment lighting',
    colorPaletteHints: ['#38bdf8', '#818cf8', '#34d399', '#0f172a'],
    isCustom: false,
    isFavorite: false,
  }
];

const STORAGE_KEY = 'ai_music_video_prompt_library_v1';

/**
 * Loads prompt styles from localStorage, merging them with default curated styles.
 */
export const getPromptLibrary = (): PromptStylePreset[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROMPT_STYLES;
    }
    const parsed: PromptStylePreset[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_PROMPT_STYLES;
    }

    // Merge: ensure all defaults exist if not deleted or overridden
    const customOrModified = parsed;
    const existingIds = new Set(customOrModified.map((p) => p.id));
    const missingDefaults = DEFAULT_PROMPT_STYLES.filter((d) => !existingIds.has(d.id));

    return [...customOrModified, ...missingDefaults];
  } catch (e) {
    console.warn('Failed to load prompt library from localStorage, using defaults.', e);
    return DEFAULT_PROMPT_STYLES;
  }
};

/**
 * Saves a prompt style preset (creates or updates).
 */
export const savePromptPreset = (preset: PromptStylePreset): PromptStylePreset[] => {
  const current = getPromptLibrary();
  const index = current.findIndex((p) => p.id === preset.id);
  let updated: PromptStylePreset[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...preset, createdAt: preset.createdAt || Date.now() };
  } else {
    updated = [{ ...preset, createdAt: Date.now() }, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save prompt library to localStorage', e);
  }

  return updated;
};

/**
 * Deletes a prompt style preset.
 */
export const deletePromptPreset = (id: string): PromptStylePreset[] => {
  const current = getPromptLibrary();
  const updated = current.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete preset from localStorage', e);
  }
  return updated;
};

/**
 * Toggles the favorite status of a preset.
 */
export const toggleFavoritePreset = (id: string): PromptStylePreset[] => {
  const current = getPromptLibrary();
  const updated = current.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to toggle favorite in localStorage', e);
  }
  return updated;
};

/**
 * Resets the library to original factory default styles.
 */
export const resetToDefaultStyles = (): PromptStylePreset[] => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear library storage', e);
  }
  return DEFAULT_PROMPT_STYLES;
};

/**
 * Exports all presets to formatted JSON string.
 */
export const exportLibraryToJson = (): string => {
  const current = getPromptLibrary();
  return JSON.stringify(current, null, 2);
};

/**
 * Imports presets from a JSON string with validation.
 */
export const importLibraryFromJson = (
  jsonString: string
): { success: boolean; count: number; error?: string; updatedList?: PromptStylePreset[] } => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'Uploaded file must be a JSON array of style presets.' };
    }

    const validPresets: PromptStylePreset[] = [];
    for (const item of parsed) {
      if (item && typeof item.title === 'string' && typeof item.promptSnippet === 'string') {
        validPresets.push({
          id: item.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: item.title,
          description: item.description || '',
          tags: Array.isArray(item.tags) ? item.tags : ['Custom'],
          category: item.category || 'Custom',
          promptSnippet: item.promptSnippet,
          negativePrompt: item.negativePrompt || '',
          cameraNotes: item.cameraNotes || '',
          lightingNotes: item.lightingNotes || '',
          colorPaletteHints: item.colorPaletteHints || [],
          isCustom: true,
          isFavorite: Boolean(item.isFavorite),
          createdAt: item.createdAt || Date.now(),
        });
      }
    }

    if (validPresets.length === 0) {
      return { success: false, count: 0, error: 'No valid style presets found in JSON.' };
    }

    const current = getPromptLibrary();
    const existingIds = new Set(current.map((p) => p.id));
    const merged = [...validPresets.filter((p) => !existingIds.has(p.id)), ...current];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return { success: true, count: validPresets.length, updatedList: merged };
  } catch (e) {
    return { success: false, count: 0, error: 'Failed to parse JSON file. Please verify syntax.' };
  }
};

/**
 * Collects all unique tags across all presets with usage counts.
 */
export const getAllTagsWithCounts = (presets: PromptStylePreset[]): { tag: string; count: number }[] => {
  const counts: Record<string, number> = {};
  presets.forEach((p) => {
    p.tags.forEach((t) => {
      const clean = t.trim();
      if (clean) {
        counts[clean] = (counts[clean] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Smartly applies a style snippet to an existing prompt string.
 */
export const applyStyleSnippetToPrompt = (
  originalPrompt: string,
  styleSnippet: string,
  mode: StyleApplyMode
): string => {
  const trimmedOrig = (originalPrompt || '').trim();
  const trimmedSnippet = (styleSnippet || '').trim();

  if (!trimmedOrig) return trimmedSnippet;
  if (!trimmedSnippet) return trimmedOrig;

  if (mode === 'replace') {
    return trimmedSnippet;
  }

  if (mode === 'prepend') {
    return `${trimmedSnippet}, ${trimmedOrig}`;
  }

  // mode === 'append' (default)
  // Avoid duplicate comma if original ends with punctuation
  const cleanEnd = trimmedOrig.replace(/[,;.]+$/, '');
  return `${cleanEnd}, ${trimmedSnippet}`;
};

/**
 * Applies a prompt style preset to a single Scene object.
 */
export const applyPresetToScene = (
  scene: Scene,
  preset: PromptStylePreset,
  mode: StyleApplyMode
): Scene => {
  const updatedVeoPrompt = applyStyleSnippetToPrompt(scene.veoPrompt || scene.description, preset.promptSnippet, mode);

  return {
    ...scene,
    veoPrompt: updatedVeoPrompt,
    cameraAngle: preset.cameraNotes && !scene.cameraAngle ? preset.cameraNotes.split(',')[0].trim() : scene.cameraAngle,
  };
};

/**
 * Applies a prompt style preset to entire VideoScript or a subset of scene numbers.
 */
export const applyPresetToScript = (
  script: VideoScript,
  preset: PromptStylePreset,
  mode: StyleApplyMode,
  targetSceneNumbers?: number[]
): { updatedScript: VideoScript; affectedCount: number } => {
  const targetSet = targetSceneNumbers && targetSceneNumbers.length > 0 ? new Set(targetSceneNumbers) : null;

  let affectedCount = 0;
  const newScenes = script.scenes.map((scene) => {
    if (!targetSet || targetSet.has(scene.sceneNumber)) {
      affectedCount++;
      return applyPresetToScene(scene, preset, mode);
    }
    return scene;
  });

  return {
    updatedScript: {
      ...script,
      overallMood: script.overallMood ? `${script.overallMood} (${preset.title})` : preset.title,
      scenes: newScenes,
    },
    affectedCount,
  };
};
