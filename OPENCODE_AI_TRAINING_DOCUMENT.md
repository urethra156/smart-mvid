# AI Music Video Director & VEO Studio
## System Architecture, Feature Specification & OpenCode AI Training Blueprint

> **Purpose:** This document is an authoritative engineering and prompt-design specification designed to train OpenCode AI (and developer teams) on the complete architecture, data models, feature depth, and generative workflows of the **AI Music Video Director** application. It serves as a benchmark and blueprint for generating production-grade, domain-deep creative applications.

---

## 1. Executive Summary & Product Vision

The **AI Music Video Director** is an end-to-end creative suite that transforms raw audio files or lyrics into a cinema-grade, production-ready music video storyboard with direct AI video generation capabilities. 

Unlike shallow AI wrappers that simply output generic shot lists, this application operates at a **professional director, musicologist, and cinematographer level of depth**:
1. **Multimodal Musicological Analysis:** Extracts tempo (BPM), exact musical key (`[NOTE] [MODE]`), instrumentation breakdowns, dynamic narrative arcs, lyrical motifs, and a mood-grounded hex color palette.
2. **Visual Continuity & Entity Tracking:** Identifies recurring characters and props with strict capitalized entity keys and allows users to attach image reference cards used to condition video diffusion models.
3. **Paced 8-Second Temporal Grid:** Aligns scenes to exact 8-second generation intervals matching modern video models (Google VEO), automatically enforcing start/end timestamp mathematics across the entire song duration.
4. **Cinematic Shot Specification:** Synthesizes transitions, camera angles, camera motion (dolly zooms, whip pans, tracking), optical lens specifications (anamorphic, telephoto, macro), lighting designs (chiaroscuro, golden hour, neon backlight), and stylistic optical artifacts (film grain, double exposure).
5. **Direct Video Generation Engine:** Directly submits prompts and base64 reference images to Google's `veo-3.1-fast-generate-preview` model, polls long-running asynchronous operations, downloads output MP4 blobs, and embeds them into interactive scene cards.
6. **Live Iterative Direction:** Enables directors to edit scene descriptions, adjust timestamps, and dynamically regenerate specific VEO prompts using lightweight models (`gemini-2.5-flash`) without losing visual continuity.

---

## 2. Technology Stack & Environment

| Layer | Technology | Details & Versions |
| :--- | :--- | :--- |
| **Framework** | React 19 + TypeScript | Strict TypeScript typing, React hooks (`useState`, `useCallback`, `useEffect`) |
| **Build Tooling** | Vite 6 | Modern ES module bundler, zero unnecessary bloat |
| **Styling** | Tailwind CSS | Dark cinema theme (`slate-900`, `indigo-600`, `cyan-400`), responsive grid layout |
| **AI SDK** | `@google/genai` (v1.24.0+) | Official Google GenAI TypeScript SDK using unified `GoogleGenAI` client |
| **Primary LLM** | `gemini-2.5-pro` | Used for deep musicological analysis, lyric alignment, and structured JSON script output |
| **Fast LLM** | `gemini-2.5-flash` | Used for sub-second VEO prompt refinement during scene editing and API key validation |
| **Video Model** | `veo-3.1-fast-generate-preview` | State-of-the-art text-to-video and image-to-video generation (720p, 16:9, native 8-second clips) |
| **Audio Processing**| HTML5 Audio API | In-browser audio decoding for instant metadata duration calculation (`audio.onloadedmetadata`) |
| **Persistence** | Browser `localStorage` | Automatic caching of active scripts under `ai-music-video-script` for crash resilience |

---

## 3. Complete Data Architecture & TypeScript Interfaces

The application is built around strict data contracts defined in `types.ts`:

```typescript
export type MoodPreset = 
  // Core Styles
  | 'Cinematic' | 'Abstract' | 'Documentary' | 'High Energy'
  // Musical Genres
  | 'Pop' | 'Rock' | 'Hip Hop' | 'Electronic' | 'Folk/Acoustic'
  // Emotional Moods
  | 'Romantic' | 'Melancholic' | 'Psychedelic'
  // Cinematic / Auteur Styles
  | 'Film Noir' | 'Vaporwave' | 'Anime' | 'Wes Anderson' 
  | 'Minimalist' | 'Gothic' | 'Surrealist' | 'Horror' 
  | 'Thriller' | 'Cyberpunk' | 'Steampunk';

export interface LyricLine {
  text: string;
  timestampSeconds: number; // Exact second in the timeline (e.g. 74 = 01:14)
}

export interface Scene {
  sceneNumber: number;
  description: string;
  veoPrompt: string;
  correspondingLyrics: LyricLine[] | string;
  transition?: string;      // e.g., "Cut to:", "Dissolve to:", "Match cut to:"
  cameraAngle?: string;     // e.g., "Low angle shot", "Overhead Dutch angle"
  startTimeSeconds?: number;
  endTimeSeconds?: number;
  videoUrl?: string;        // Local ObjectURL blob of generated video
}

export interface ColorSuggestion {
  hex: string;              // e.g. "#1A2B3C"
  reason: string;           // Director's rationale connecting color to theme
}

export interface SongAnalysis {
  bpm: number;                              // Exact numeric BPM
  musicalKey: string;                       // Strict format: "[NOTE] [MODE]" (e.g., "C Minor")
  instrumentation: string[];                // ["808 Bass", "Analog Synth", "Distorted Guitar"]
  dynamics: string;                         // Textual description of dynamic build/release
  lyricalThemes: string[];                  // 3-5 high-level thematic motifs
  suggestedColorPalette: ColorSuggestion[]; // 3-5 evocative colors with reasoning
}

export interface ConsistentElement {
  name: string;             // Distinct entity name (e.g. "The Wanderer", "The Gold Pocketwatch")
  description: string;      // Visual description for prompt continuity
}

export interface ElementWithImage extends ConsistentElement {
  type: 'character' | 'prop';
  imageDataUrl?: string;    // Base64 data URL for image preview and VEO conditioning
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
```

---

## 4. Structured Output Engine: Gemini Schema Enforcement

To prevent hallucinated JSON or formatting anomalies, the app utilizes Gemini's native `responseSchema` validation via `Type` exports from `@google/genai`:

```typescript
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    overallMood: { type: Type.STRING },
    analysis: {
      type: Type.OBJECT,
      properties: {
        bpm: { type: Type.INTEGER },
        musicalKey: { type: Type.STRING },
        instrumentation: { type: Type.ARRAY, items: { type: Type.STRING } },
        dynamics: { type: Type.STRING },
        lyricalThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
        suggestedColorPalette: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              hex: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["hex", "reason"]
          }
        }
      },
      required: ["bpm", "musicalKey", "instrumentation", "dynamics", "lyricalThemes", "suggestedColorPalette"]
    },
    consistentElements: {
      type: Type.OBJECT,
      properties: {
        characters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name", "description"]
          }
        },
        props: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name", "description"]
          }
        }
      },
      required: ["characters", "props"]
    },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.INTEGER },
          startTimeSeconds: { type: Type.INTEGER },
          endTimeSeconds: { type: Type.INTEGER },
          transition: { type: Type.STRING },
          cameraAngle: { type: Type.STRING },
          description: { type: Type.STRING },
          veoPrompt: { type: Type.STRING },
          correspondingLyrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                timestampSeconds: { type: Type.INTEGER }
              },
              required: ["text", "timestampSeconds"]
            }
          }
        },
        required: ["sceneNumber", "description", "veoPrompt", "correspondingLyrics", "startTimeSeconds", "endTimeSeconds"]
      }
    }
  },
  required: ["title", "overallMood", "scenes", "analysis", "consistentElements"]
};
```

---

## 5. Algorithmic Principles & Prompt Engineering Formulas

### 5.1 Temporal Normalization Algorithm (`normalizeScriptTimings`)
Video diffusion models generate standardized temporal slices (8 seconds). If an LLM is left to hallucinate timestamps, intervals drift and scenes do not match song duration.

**The Golden Algorithm:**
```typescript
const normalizeScriptTimings = (script: VideoScript, totalSeconds: number): VideoScript => {
  if (!script || !script.scenes || script.scenes.length === 0) return script;

  const correctedScenes = script.scenes.map((scene, index) => {
    const startTime = index * 8;
    const endTime = Math.min((index + 1) * 8, totalSeconds);
    return {
      ...scene,
      sceneNumber: index + 1,
      startTimeSeconds: startTime,
      endTimeSeconds: endTime,
    };
  });

  if (correctedScenes.length > 0) {
    correctedScenes[correctedScenes.length - 1].endTimeSeconds = totalSeconds;
  }

  return { ...script, scenes: correctedScenes };
};
```

### 5.2 The 22-Style Cinematographic Dictionary
Each preset injects detailed photographic constraints directly into the system prompt:

- **Cinematic:** Smooth camera moves (dollies, pans, tracking), chiaroscuro, golden hour, narrative arc.
- **Abstract:** Metaphorical textures, non-linear concepts, double exposures, chromatic aberration, fluid dynamics.
- **Documentary:** Handheld camera shake, naturalistic ambient lighting, candid framing, observational angles.
- **High Energy:** Fast cuts, whip pans, crash zooms, strobes, neon streaks, motion blur.
- **Pop:** Hyper-saturated palettes, glossy surfaces, choreographed framing, high-key studio lighting.
- **Rock:** Gritty 35mm grain, lens flares, silhouetted amplifiers, high-contrast spotlighting.
- **Hip Hop:** Low-angle hero shots, wide-angle street-level perspective, bold contrast, urban architectural framing.
- **Electronic:** Cybernetic geometry, laser grids, pulse-synced strobing, glitch artifacts, surreal digital realism.
- **Folk/Acoustic:** 50mm natural prime lens, golden hour rim lighting, organic foliage, handheld intimacy.
- **Romantic:** Diffused soft focus, warm backlighting, intimate macro framing, floating dust particles.
- **Melancholic:** Desaturated cool blues and slate grays, rain reflections, negative space, slow descending push-ins.
- **Psychedelic:** Kaleidoscopic refraction, morphing volumetric clouds, solarization, warped perspectives.
- **Film Noir:** High-contrast black and white, Venetian blind shadow patterns, rainy asphalt reflections, low-key lighting.
- **Vaporwave:** Pastel lavender and cyan duotones, nostalgic VHS scanlines, classical marble statues, retro wireframes.
- **Anime:** Cel-shaded aesthetic, high dynamic action lines, exaggerated Dutch tilts, vibrant saturated skies.
- **Wes Anderson:** Dead-center bilateral symmetry, flat 90-degree whip pans, pastel yellow/pink color blocking, dollhouse framing.
- **Minimalist:** Monochromatic negative space, brutalist geometry, slow geometric tracking, clean lines.
- **Gothic:** Desaturated stone arches, candlelight, deep crimson highlights, misty atmospheric haze.
- **Surrealist:** Impossible physics, melting textures, levitating monoliths, dream logic juxtapositions.
- **Horror:** Claustrophobic framing, harsh flashlight falloff, Dutch angles, jarring jump-cut transitions.
- **Thriller:** Voyeuristic over-the-shoulder angles, telephoto compression, tight focal depths, paranoid silhouettes.
- **Cyberpunk:** Rain-slicked tarmac, volumetric neon signage, holographic reflections, anamorphic blue horizontal lens flares.
- **Steampunk:** Patinated brass and copper gears, Victorian silhouettes, steam valve plumes, warm sepia tones.

### 5.3 The VEO Prompt Synthesis Formula
Every generated VEO prompt must adhere to a strict direct-command synthesis:

$$\text{VEO Prompt} = \text{[Camera Movement \& Shot Type]} + \text{[Subject \& Immediate Action]} + \text{[Setting / Environment]} + \text{[Lens Specification]} + \text{[Lighting Design]} + \text{[Stylistic Artifacts]}$$

**Negative Constraints Enforced:**
- No conversational preambles ("Here is a prompt:").
- No vague descriptions ("A cool scene").
- Capitalized entity keys for characters/props must match the names declared in `consistentElements`.

---

## 6. End-to-End User Experience Workflow

```
[ Step 1: Input Stage ]
  ├── 1. Audio Upload (MP3, WAV, etc.) -> Auto-detects duration via Audio() element
  ├── 2. Lyrics Text Input (with structural tags: [Verse 1], [Chorus], [Instrumental])
  ├── 3. Song Duration Selector (MM:SS)
  └── 4. Visual Style Selector (22 Presets Grid)
         │
         ▼ (Analyze Action: Calls gemini-2.5-pro with multimodal payload)
[ Step 2: Consistent Elements Review ]
  ├── Character Cards (Identified recurring personas, e.g. "The Nomad")
  ├── Prop Cards (Identified key recurring objects, e.g. "The Silver Locket")
  ├── Reference Image Uploader (Dropzone / File Upload with preview)
  └── Options: "Skip for Now" or "Continue to Script"
         │
         ▼
[ Step 3: Script & Studio Stage ]
  ├── Song Analysis Panel:
  │    ├── BPM & Musical Key Badge
  │    ├── Dynamics Narrative Arc
  │    ├── Lyrical Themes Pills
  │    ├── Instrumentation Tags
  │    └── Interactive Color Swatches (Hex + Director Rationale)
  ├── Scene Storyboard Cards (Ordered 1 to N, 8-sec fixed blocks):
  │    ├── Transition Marker ("Cut to:", "Dissolve to:")
  │    ├── Scene Number + Timestamp Badge ([00:00 - 00:08])
  │    ├── Corresponding Lyrics Block with exact line timestamps
  │    ├── Camera Angle Tag
  │    ├── Visual Scene Description
  │    ├── VEO Prompt Terminal Block with 1-Click Copy
  │    ├── In-Place Scene Editor (Edit transition, description, angle, lyrics)
  │    │     └── Auto-Regenerates VEO Prompt via gemini-2.5-flash
  │    └── "Generate Video" Button:
  │          ├── Matches prompt against reference images
  │          ├── Calls veo-3.1-fast-generate-preview
  │          ├── Displays real-time polling attempts
  │          └── Renders embedded native HTML5 video player with controls
  └── Studio Actions:
       ├── "Save Script" -> Exports clean, structured .txt screenplay file
       └── "Start New" -> Confirmation dialog with complete state reset
```

---

## 7. Direct Video Generation & Polling Implementation

The application contains the complete production pattern for asynchronous video generation using Google's VEO model:

```typescript
export const generateVideoFromPrompt = async (
  prompt: string,
  referenceImage: { imageBytes: string; mimeType: string; } | null,
  onProgress: (status: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  onProgress('Initiating video generation request...');

  const generationConfig = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
    },
    ...(referenceImage && { image: referenceImage }), // Reference image conditioning
  };

  // Launch async operation
  let operation = await ai.models.generateVideos(generationConfig);
  onProgress('Request sent. Waiting for video generation...');

  const pollInterval = 10000; // 10s poll cycle
  let pollCount = 0;

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    pollCount++;
    onProgress(`Polling for result (attempt ${pollCount})...`);
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if (operation.error) throw operation.error;

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error('Video generation completed, but no download link was provided.');

  onProgress('Generation complete! Downloading video file...');

  // Fetch binary blob using API key authentication
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) throw new Error(`Failed to download video file. Status: ${response.statusText}`);

  const blob = await response.blob();
  const videoUrl = URL.createObjectURL(blob);
  onProgress('Video ready.');
  return videoUrl;
};
```

---

## 8. Detailed Features & UX Data Matrix

| Feature | Input / Trigger | Output to User | Level of Detail / Specificity |
| :--- | :--- | :--- | :--- |
| **Audio File Ingestion** | Drag-and-drop or file picker (MP3, WAV, FLAC, AAC) | Audio file card with name, wave icon, and removal trigger | Client-side metadata decoding automatically updates song duration input. |
| **BPM Analysis** | Lyrics or Audio file | Integer BPM badge (e.g. `128 BPM`) | Audio engineer rhythm analysis based on transient peaks or poetic meter. |
| **Harmonic Key Detection** | Lyrics or Audio file | Strict Key string (e.g. `F# Minor`, `Ab Major`) | Modal tonic and mode identification based on harmonic progression. |
| **Dynamic Arc Mapping** | Lyrics or Audio file | Narrative curve description | Explains the build, chorus drop, bridge tension, and outro fade. |
| **Lyrical Theme Extraction** | Lyrics or Audio file | 3–5 Pill tags (e.g., "Existential Dread", "Neon Isolation") | Deep semantic clustering of lyrical metaphors. |
| **Color Palette Suggestion** | Song mood & lyrical themes | 3–5 interactive circular swatches with Hex codes | Hex code + explicit director rationale explaining why the hue matches the emotional subtext. |
| **Entity Continuity Extraction** | Analyzed script structure | Character & Prop cards | Names entities with strict capitalization and descriptions for VEO prompt tracking. |
| **Visual Reference Cards** | User uploads image for identified entity | Base64 preview & binary payload | Encodes image into `{ imageBytes, mimeType }` for conditioning VEO's generation. |
| **Scene Breakdown** | Total duration & mood | List of cards numbered 1 to $N$ | Exactly $\lceil \text{TotalSeconds} / 8 \rceil$ scenes with zero temporal drift. |
| **Cinematic Transitions** | Scene index $> 1$ | Stylized uppercase badges | Suggests directional cuts, dissolves, match cuts, or whip transitions. |
| **Camera Angle & Lens** | Scene context | Camera angle tag & inline lens direction | Anamorphic, telephoto, macro, wide-angle, low angle, Dutch tilt. |
| **Lyric Alignment** | Parsed lyrics | Timestamped lyric blocks | Matches `[MM:SS]` lines with precision or flags `[Instrumental Section]`. |
| **VEO Prompt Generation** | Synthesized from scene elements | Monospace terminal box + copy button | Production-ready prompt with subject, camera, lighting, and film artifacts. |
| **In-place Scene Editor** | "Edit" button on SceneCard | Form with live validation | Validates timestamp syntax; triggers `gemini-2.5-flash` to regenerate VEO prompt. |
| **Direct Video Generation** | "Film" icon on SceneCard | Loading spinner + status text + HTML5 `<video>` | Renders generated MP4 with native playback and download controls. |
| **Script Export** | "Save Script" button | Downloaded `*_script.txt` file | Formatted screenplay document with metadata, analysis, and scene breakdowns. |

---

## 9. Training OpenCode AI: How to Build Apps with this Level of Detail

When prompting or instructing OpenCode AI to generate an application modeled after this architecture:

### Rule 1: Never Build "Generic" Prompts
Require the model to act as a **domain specialist** (e.g., an ASC-certified Director of Photography and Berklee-trained audio engineer), not an assistant giving suggestions. System prompts must contain concrete domain terminology (focal lengths, lighting ratios, chiaroscuro, key-mode harmony).

### Rule 2: Strictly Enforce Discrete Mathematical Intervals
When generating media for temporal models (audio, video, animation), **never allow the LLM to choose arbitrary time slices**. Hardcode the grid interval (e.g., 8 seconds for VEO) and build client-side normalization functions (`normalizeScriptTimings`) that clean up LLM output before presentation.

### Rule 3: Use Two-Stage Entity Consistency
For apps requiring visual or narrative continuity:
1. First, require the model to extract and name recurring visual tokens (`consistentElements`).
2. Require the model to use those exact tokens verbatim in downstream generative prompts.
3. Allow the user to inject visual reference ground truth (images) before scene generation.

### Rule 4: Multi-Model Orchestration
Use the right model for the right job:
- **High-reasoning / Multimodal pro models (`gemini-2.5-pro`):** Audio ingestion, structured JSON screenplay generation, music analysis.
- **Fast flash models (`gemini-2.5-flash`):** Sub-second prompt regeneration during editing, fast validation checks.
- **Dedicated generation models (`veo-3.1-fast-generate-preview`):** Long-running async generation with polling loops.

### Rule 5: Schema Strictness Over Regex Scraping
Always provide a formal `responseSchema` with `@google/genai`'s `Type` system so the output is 100% compliant with frontend TypeScript types, eliminating JSON parse failures.
