import { GoogleGenAI, Type, Part } from "@google/genai";
import { VideoScript, MoodPreset } from '../types';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A creative and fitting title for the music video concept.",
    },
    overallMood: {
        type: Type.STRING,
        description: "A short description of the video's overall mood and aesthetic (e.g., 'somber and melancholic', 'energetic and vibrant', 'dreamy and surreal')."
    },
    analysis: {
        type: Type.OBJECT,
        description: "A detailed analysis of the song's musical and lyrical characteristics.",
        properties: {
            bpm: {
                type: Type.INTEGER,
                description: "The song's estimated beats per minute (BPM)."
            },
            musicalKey: {
                type: Type.STRING,
                description: "The musical key of the song, which MUST be in the format 'NOTE MODE' (e.g., 'C Minor', 'G Major')."
            },
            instrumentation: {
                type: Type.ARRAY,
                description: "A list of the dominant instruments identified in the song.",
                items: { type: Type.STRING }
            },
            dynamics: {
                type: Type.STRING,
                description: "A description of the song's dynamic arc (e.g., 'Starts soft, builds to a loud chorus, then fades')."
            },
            lyricalThemes: {
                type: Type.ARRAY,
                description: "A list of the primary lyrical themes or motifs.",
                items: { type: Type.STRING }
            },
            suggestedColorPalette: {
                type: Type.ARRAY,
                description: "A suggested color palette with hex codes and reasons.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        hex: { type: Type.STRING, description: "The hex color code (e.g., '#FFFFFF')." },
                        reason: { type: Type.STRING, description: "The reason this color fits the mood." }
                    },
                    required: ["hex", "reason"]
                }
            }
        },
        required: ["bpm", "musicalKey", "instrumentation", "dynamics", "lyricalThemes", "suggestedColorPalette"]
    },
    consistentElements: {
        type: Type.OBJECT,
        description: "An object containing lists of characters and props that should remain visually consistent across scenes.",
        properties: {
            characters: {
                type: Type.ARRAY,
                description: "A list of recurring characters in the music video.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A short, descriptive name for the character (e.g., 'The Wanderer', 'The Lover'). This exact name MUST be used in VEO prompts to reference this character." },
                        description: { type: Type.STRING, description: "A brief description of the character's appearance, role, and emotion." }
                    },
                    required: ["name", "description"]
                }
            },
            props: {
                type: Type.ARRAY,
                description: "A list of recurring, important props or visual elements.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A short, descriptive name for the prop (e.g., 'The Glowing Orb', 'The Vintage Car'). This exact name MUST be used in VEO prompts to reference this prop." },
                        description: { type: Type.STRING, description: "A brief description of the prop's appearance and significance." }
                    },
                    required: ["name", "description"]
                }
            }
        },
        required: ["characters", "props"]
    },
    scenes: {
      type: Type.ARRAY,
      description: "An array of scenes that make up the music video script.",
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: {
            type: Type.INTEGER,
            description: "The sequential number of the scene.",
          },
          startTimeSeconds: {
            type: Type.INTEGER,
            description: "The estimated start time of this scene in total seconds from the beginning of the song (e.g., 90 for 1:30)."
          },
          endTimeSeconds: {
            type: Type.INTEGER,
            description: "The estimated end time of this scene in total seconds from the beginning of the song (e.g., 120 for 2:00)."
          },
          transition: {
            type: Type.STRING,
            description: "A suggested transition from the previous scene to this one (e.g., 'Cut to:', 'Dissolve to:', 'Fade in:'). This should be omitted or null for the first scene."
          },
          cameraAngle: {
            type: Type.STRING,
            description: "A specific, relevant camera angle for the scene (e.g., 'low angle shot', 'overhead shot', 'eye-level shot'). This can be omitted if a standard shot is best."
          },
          description: {
            type: Type.STRING,
            description: "A detailed description of the scene's setting, action, characters, and atmosphere.",
          },
          veoPrompt: {
            type: Type.STRING,
            description: "A direct, concise, and cinematic VEO prompt for a video generation model. It must be a single, impactful command. The prompt should be varied across scenes and combine elements like subject, action, setting, camera angles/movement (e.g., 'low angle tracking shot'), lighting (e.g., 'golden hour'), and visual effects (e.g., 'slow motion', 'film grain', 'double exposure') to create a visually rich and specific instruction. Avoid narrative explanations; focus on direct visual commands.",
          },
          correspondingLyrics: {
            type: Type.ARRAY,
            description: "An array of lyric objects for this scene. Each object contains the lyric text and its precise timestamp in seconds from the start of the song. For instrumental sections, provide a single entry like `[{ \"text\": \"Instrumental\", \"timestampSeconds\": 16 }]`.",
            items: {
                type: Type.OBJECT,
                properties: {
                    text: {
                        type: Type.STRING,
                        description: "The line of lyric text."
                    },
                    timestampSeconds: {
                        type: Type.INTEGER,
                        description: "The precise time in total seconds when this lyric line is sung."
                    }
                },
                required: ["text", "timestampSeconds"]
            }
          },
        },
        required: ["sceneNumber", "description", "veoPrompt", "correspondingLyrics", "startTimeSeconds", "endTimeSeconds"],
      },
    },
  },
  required: ["title", "overallMood", "scenes", "analysis", "consistentElements"],
};

const getSceneCountInstruction = (totalSeconds: number): string => {
    // Each scene should be 8 seconds long to match VEO's typical generation length.
    const sceneCount = Math.ceil(totalSeconds / 8);
    return `The song is ${Math.floor(totalSeconds / 60)} minutes and ${totalSeconds % 60} seconds long. You must generate exactly ${sceneCount} scenes to cover this duration.`;
};


const getMoodInstruction = (mood: MoodPreset): string => {
    switch (mood) {
        // Core
        case 'Cinematic':
            return "The desired visual style is **Cinematic**. Focus on narrative storytelling, character emotion, and classic film techniques. VEO prompts should feature smooth camera movements (dollies, pans, tracking shots), dramatic lighting (chiaroscuro, golden hour), and a clear, story-driven visual arc. Aim for a polished, film-like quality.";
        case 'Abstract':
            return "The desired visual style is **Abstract**. Deconstruct the lyrics into symbolic and metaphorical visuals. Focus on textures, colors, and non-linear concepts. VEO prompts should be experimental, using techniques like double exposure, surreal imagery, distorted perspectives, and unconventional compositions. Emotion should be conveyed through color and form, not narrative.";
        case 'Documentary':
            return "The desired visual style is **Documentary**. Adopt a grounded, realistic, 'fly-on-the-wall' style. Focus on candid moments and authentic environments. VEO prompts should favor handheld camera work, natural lighting, and observational shots. Avoid overly stylized effects and maintain a sense of realism and immediacy.";
        case 'High Energy':
            return "The desired visual style is **High Energy**. Create a fast-paced, dynamic, and vibrant video. VEO prompts should emphasize rapid cuts, energetic camera movements (whip pans, crash zooms, shaky cam), and vibrant, pulsating lighting (neons, strobes). Focus on motion, impact, and a strong rhythmic connection to the music.";
        // Genres
        case 'Pop':
            return "The desired visual style is **Pop**. Aim for bright, clean, and highly polished visuals. VEO prompts should include vibrant color palettes, choreographed dance sequences, high-fashion aesthetics, and charismatic performance shots. Think glossy, energetic, and visually captivating.";
        case 'Rock':
            return "The desired visual style is **Rock**. Capture a raw, gritty, and energetic essence. VEO prompts should focus on performance-driven shots, dramatic and high-contrast lighting (stage lights, silhouettes), lens flares, film grain, and quick, impactful cuts. Convey the raw power of the music.";
        case 'Hip Hop':
            return "The desired visual style is **Hip Hop**. Emphasize narrative storytelling, street culture, and confident swagger. VEO prompts should use bold, stylish visuals, low-angle shots to convey power, urban environments, and a strong focus on the artist's persona and performance.";
        case 'Electronic':
            return "The desired visual style is **Electronic**. Create a futuristic, digital, or psychedelic aesthetic. VEO prompts should heavily feature rhythmic visuals, neon lighting, strobes, abstract CGI patterns, futuristic landscapes, and a seamless connection to technology and surrealism.";
        case 'Folk/Acoustic':
            return "The desired visual style is **Folk/Acoustic**. Evoke an intimate, organic, and natural feeling. VEO prompts should focus on scenic landscapes (forests, fields, coastlines), natural light (golden hour, overcast days), handheld camera work, and an authentic, storytelling atmosphere.";
        // Moods
        case 'Romantic':
            return "The desired visual style is **Romantic**. Create a soft, dreamy, and warm atmosphere. VEO prompts should utilize soft focus, golden hour lighting, slow motion, intimate close-ups, and visuals that evoke feelings of love, connection, and tenderness.";
        case 'Melancholic':
            return "The desired visual style is **Melancholic**. Convey a somber, reflective, and poignant mood. VEO prompts should use muted color palettes (blues, greys), slow and deliberate camera movements, and imagery like rain, shadows, empty spaces, and expressive, introspective close-ups.";
        case 'Psychedelic':
            return "The desired visual style is **Psychedelic**. Aim for a surreal, distorted, and mind-bending experience. VEO prompts should include vibrant, shifting color palettes, kaleidoscopic effects, morphing shapes, double exposures, and dreamlike, disorienting visuals that challenge perception.";
        // Artistic Styles
        case 'Film Noir':
            return "The desired visual style is **Film Noir**. Emphasize high-contrast, black-and-white visuals. Use low-key lighting to create deep shadows and dramatic silhouettes (chiaroscuro). VEO prompts should focus on rain-slicked city streets, Venetian blinds casting shadows, smoke-filled rooms, and a pervasive sense of mystery and moral ambiguity.";
        case 'Vaporwave':
            return "The desired visual style is **Vaporwave**. Create a retro-futuristic, surreal aesthetic inspired by 80s and 90s internet culture. VEO prompts should feature pastel and neon color palettes, glitch art, Roman busts, Japanese characters, and dreamlike, nostalgic landscapes. Use VHS effects and a sense of detached irony.";
        case 'Anime':
            return "The desired visual style is **Anime**. Adopt a vibrant, dynamic, and expressive aesthetic. VEO prompts should call for cel-shaded visuals, dramatic action lines, expressive character close-ups with exaggerated emotions, and highly stylized, energetic camera angles. Think fluid animation and rich, saturated colors.";
        case 'Wes Anderson':
            return "The desired visual style is **Wes Anderson**. Focus on perfectly symmetrical compositions, flat space camera movements (whip pans, tracking shots), and a distinct, limited color palette (e.g., pastel pinks and blues). VEO prompts should describe quirky, detailed sets, deadpan expressions, and a whimsical, storybook feel.";
        case 'Minimalist':
            return "The desired visual style is **Minimalist**. Emphasize clean lines, simplicity, and negative space. VEO prompts should use a monochrome or very limited color palette, uncluttered compositions, and a focus on geometric shapes and textures. The mood should be calm, contemplative, and focused.";
        case 'Gothic':
            return "The desired visual style is **Gothic**. Create a dark, mysterious, and romantic atmosphere. VEO prompts should feature ancient architecture (castles, cathedrals), deep shadows, dramatic and somber lighting, and themes of tragedy and romance. Use a dark, desaturated color palette with occasional flashes of deep red or purple.";
        case 'Surrealist':
            return "The desired visual style is **Surrealist**. Create dream-like, bizarre, and illogical scenes. VEO prompts should juxtapose unrelated objects, distort reality, and draw from the subconscious. Think melting clocks, floating objects, and environments that defy the laws of physics.";
        case 'Horror':
            return "The desired visual style is **Horror**. Create a sense of dread, suspense, and fear. VEO prompts should use claustrophobic framing, unsettling imagery, dark and shadowy lighting (e.g., flashlight beams), and quick, jarring cuts for jump scares. Focus on creepy environments like abandoned houses or dark forests, and build psychological tension.";
        case 'Thriller':
            return "The desired visual style is **Thriller**. Focus on suspense, tension, and psychological drama. VEO prompts should include voyeuristic camera angles, close-ups on anxious expressions, shadowy figures, and a sense of being watched. The mood should be paranoid and mysterious, with a constant feeling of impending danger.";
        case 'Cyberpunk':
            return "The desired visual style is **Cyberpunk**. Create a high-tech, low-life, dystopian future. VEO prompts should feature neon-drenched, rain-slicked cityscapes, towering skyscrapers, holographic advertisements, and cybernetic enhancements. Use a dark, moody color palette contrasted with vibrant neon lights.";
        case 'Steampunk':
            return "The desired visual style is **Steampunk**. Create a retro-futuristic world inspired by 19th-century steam power. VEO prompts should include intricate brass and copper machinery, airships, characters in Victorian-era attire with goggles and gadgets, and a color palette of sepia, brass, and deep browns. Emphasize gears, cogs, and the grandeur of invention.";
        default:
            return "";
    }
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // result is "data:audio/mpeg;base64,..." - we only want the part after the comma
            const result = reader.result as string;
            if (result) {
                resolve(result.split(',')[1]);
            } else {
                reject(new Error("Failed to read file as a data URL."));
            }
        };
        reader.onerror = error => reject(error);
    });
};

const getBasePrompt = (totalSeconds: number, mood: MoodPreset) => {
  const sceneInstruction = getSceneCountInstruction(totalSeconds);
  const moodInstruction = getMoodInstruction(mood);
  
  return `
    Your goal is to be a music video creative director. You will generate a detailed analysis of a song and then create a compelling music video script based on that analysis, including identifying key consistent visual elements.

    **Step 1: Song Analysis (MANDATORY)**
    First, you MUST analyze the song with the precision of a professional musicologist and audio engineer. Provide the following details in the 'analysis' object:
    - 'bpm': As an expert audio engineer, perform a rigorous rhythmic analysis to determine the song's primary beats per minute (BPM). If analyzing an audio file, be precise. If only lyrics are provided, estimate the BPM based on common tempos for the implied genre and lyrical cadence. The result must be a single integer.
    - 'musicalKey': Perform a thorough harmonic analysis to determine the musical key. Identify the tonic and mode. If analyzing audio, base this on the chord progressions and melody. If analyzing lyrics, infer the key from the emotional tone. The result MUST be a string strictly following the format 'NOTE MODE' where NOTE is one of A-G (optionally followed by '#' or 'b') and MODE is either 'Major' or 'Minor'. Examples of valid formats: 'C Minor', 'G# Major', 'F Major'.
    - 'instrumentation': List the dominant instruments.
    - 'dynamics': Describe the song's energy arc from beginning to end.
    - 'lyricalThemes': Identify 3-5 core lyrical themes or motifs.
    - 'suggestedColorPalette': Propose a palette of 3-5 colors with hex codes and a brief reason for each color, tying it to the song's mood.

    **Step 2: Identify Consistent Elements (MANDATORY)**
    After the analysis and before the script, identify any characters or key visual elements (props) that should appear consistently throughout the video.
    - List them in the 'consistentElements' object, under either 'characters' or 'props'.
    - Give each a short, unique 'name' (e.g., 'The Time Traveler', 'The Silver Locket') and a 'description'.
    - **CRUCIAL:** When you later write the 'veoPrompt' for a scene that includes one of these elements, you MUST use the exact 'name' you defined here to refer to it. This allows for visual consistency. For example, if you define a character named 'The Wanderer', a VEO prompt must say '...a shot of The Wanderer...' not '...a shot of the wanderer...'. If no consistent elements are obvious, return empty arrays for 'characters' and 'props'.

    **Step 3: Script Generation**
    Finally, generate the music video script.
    The total song length is ${totalSeconds} seconds.
    ${moodInstruction}
    ${sceneInstruction}

    **Timeline and Pacing Rules (MANDATORY):**
    Your primary task is to create a precise timeline that reflects the song's emotional and structural changes. Adhere strictly to these rules:

    1.  **Fixed 8-Second Scenes:** Each scene MUST represent an 8-second video clip. The visuals and actions described in the 'veoPrompt' must be completable within this 8-second timeframe.

    2.  **Strict Timeline:** The timeline is rigid and based on these 8-second intervals.
        -   The 'startTimeSeconds' of the first scene must be 0.
        -   The 'startTimeSeconds' for any scene 'N' must be exactly '(N-1) * 8'.
        -   The 'endTimeSeconds' for any scene 'N' before the final one must be exactly 'N * 8'.
        -   **Exception for the final scene:** The 'endTimeSeconds' of the very last scene MUST be exactly ${totalSeconds} to perfectly match the song's length. This means the final scene may be shorter than 8 seconds.

    **Handling Instrumental Sections:**
    When you encounter an instrumental section (e.g., marked as [Instrumental] or [Guitar Solo]), it is crucial to create engaging visuals that fill that time and reflect the music's mood.
    - **Visuals:** The 'description' and 'veoPrompt' for these scenes should be particularly creative, describing actions, environments, or abstract visuals that match the energy of the instrumental.
    - **Lyrics Field:** For the 'correspondingLyrics' field during an instrumental, you MUST provide a single-element array containing a descriptive placeholder and a representative timestamp for when the section begins. For example: \`[{ "text": "Instrumental Section", "timestampSeconds": 64 }]\` or \`[{ "text": "Intense Guitar Solo", "timestampSeconds": 128 }]\`. Do not leave this field empty or use a plain string.

    For each scene, provide:
    1. 'startTimeSeconds' and 'endTimeSeconds': The estimated start and end time for the scene in seconds, following the pacing rules above.
    2. 'transition': For every scene after the first one, you MUST provide a cinematic transition suggestion (e.g., 'Cut to:', 'Dissolve to:', 'Fade in:', 'Match cut to:'). The very first scene must have a null or omitted transition.
    3. A detailed description of the visuals, actions, and atmosphere, consistent with the chosen visual style and the song's structure.
    4. 'cameraAngle': A specific, relevant camera angle for the scene (e.g., 'low angle shot', 'overhead shot', 'eye-level shot'). This can be omitted if a standard shot is best, but providing it is highly encouraged for cinematic quality.
    5. A direct and cinematic VEO prompt for a video generation model, tailored to the chosen style. This prompt must be a single, impactful sentence or two. It should command the AI to create a specific visual. Focus on concrete visual elements and *vary the cinematic techniques used across different scenes*.
      - **Subject/Action/Setting**: Clearly define who/what is in the scene, what they are doing, and where it's happening.
      - **Camera**: Be highly specific and varied. You MUST frequently include a specific camera movement type (e.g., 'slow push-in', 'dynamic tracking shot', 'whip pan', 'dolly zoom', 'crane shot', 'handheld shaky cam') and explicitly state a lens type (e.g., 'wide-angle lens', 'telephoto lens', 'macro shot', 'fishey' lens') where it enhances the shot. Also specify shot type (e.g., 'extreme close-up') and camera angle (e.g., 'low angle shot' - this MUST align with the value provided in the 'cameraAngle' field).
      - **Lighting**: Describe the lighting style (e.g., 'ominous silhouette lighting', 'soft golden hour light', 'harsh neon backlighting').
      - **Visual Effects**: Add effects where appropriate (e.g., 'slow motion', 'lens flare', 'time-lapse', 'film grain', 'double exposure').
    
    Avoid generic storytelling. Instead, *show* emotion through precise visual direction.
    
    **Examples of effective prompts:**
    - **For an emotional scene:** 'Extreme close-up on a single tear rolling down a cheek using a macro lens, shallow depth of field, cool blue tones, slow motion.'
    - **For an energetic scene:** 'Dynamic tracking shot of a dancer leaping through a neon-lit alley, fast-paced motion blur, vibrant light streaks, wide-angle lens, low angle shot.'
    - **For a dreamy scene:** 'Overhead crane shot looking down on a person floating in a starry nebula, ethereal glow, slow-motion particles drifting, double exposure with a forest silhouette.'
    - **For a dramatic reveal:** 'Dolly zoom focusing on a character's shocked face, telephoto lens compressing the chaotic background, dramatic backlighting.'
    6. The 'correspondingLyrics'. This MUST be an array of lyric objects. Each object must contain the lyric 'text' and its precise 'timestampSeconds' when it's sung in the song.

    The final output must be a JSON object that strictly adheres to the provided schema.
  `;
}

export const generateVideoScript = async (input: { lyrics: string; audioFile: File | null }, totalSeconds: number, mood: MoodPreset): Promise<VideoScript> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const basePrompt = getBasePrompt(totalSeconds, mood);
  const parts: Part[] = [];
  let textPrompt = '';

  if (input.audioFile && input.lyrics.trim()) {
    // Case 1: Both Audio and Lyrics provided.
    // Instruct the AI to use the audio for structure/mood and lyrics for the text.
    textPrompt = `
      Use the provided audio file to understand the song's structure, mood, and pacing. The provided lyrics are the definitive source for the words.
      Align the provided lyrics with the audio's structure (verses, chorus, etc.) and then ${basePrompt}
      
      Here are the lyrics:
      ---
      ${input.lyrics}
      ---
    `;
  } else if (input.audioFile) {
    // Case 2: Audio Only.
    // Instruct the AI to transcribe the lyrics first.
    textPrompt = `
      First, transcribe the lyrics and identify the structure (verses, chorus, etc.) from the provided audio file.
      Then, using the transcribed lyrics and your analysis of the audio's feel, ${basePrompt}
    `;
  } else if (input.lyrics.trim()) {
    // Case 3: Lyrics Only.
    // Instruct the AI to analyze the provided text.
    textPrompt = `
      Analyze the following song lyrics, which include structural markers like [Verse], [Chorus], [Bridge], and potentially instrumental sections like [Instrumental] or [Guitar Solo], to ${basePrompt}
      
      Here are the lyrics:
      ---
      ${input.lyrics}
      ---
    `;
  } else {
    // This case should be prevented by UI validation.
    throw new Error("Please provide either lyrics or an audio file.");
  }

  parts.push({ text: textPrompt });

  if (input.audioFile) {
    const audioBase64 = await fileToBase64(input.audioFile);
    const audioPart: Part = {
      inlineData: {
        mimeType: input.audioFile.type,
        data: audioBase64,
      },
    };
    parts.push(audioPart);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (response.promptFeedback?.blockReason) {
      console.error("Request blocked by safety settings:", response.promptFeedback);
      throw new Error(`Your request was blocked due to safety concerns (${response.promptFeedback.blockReason}). Please modify your input.`);
    }

    const jsonText = response.text.trim();

    if (!jsonText) {
      console.error("AI returned an empty response text.");
      throw new Error("The AI returned an empty response. Please try modifying your input or try again.");
    }

    try {
      const parsedJson = JSON.parse(jsonText);
      return parsedJson as VideoScript;
    } catch (e) {
      console.error("Failed to parse JSON from AI response:", jsonText);
      throw new Error("The AI returned a response in an invalid format. Please try your request again.");
    }
  } catch (error) {
    console.error("Error in generateVideoScript:", error);
    if (error instanceof Error && (
      error.message.includes("blocked due to safety concerns") ||
      error.message.includes("empty response") ||
      error.message.includes("invalid format")
    )) {
      throw error; // Re-throw our specific, user-friendly errors
    }
    // Throw a generic error for other cases (e.g., network issues)
    throw new Error("An unexpected error occurred communicating with the AI. Please check your network and try again.");
  }
};


/**
 * Generates a new, cinematic VEO prompt based on scene details.
 * @param details - An object containing the scene's description, camera angle, and the overall video mood.
 * @returns A string containing the generated VEO prompt.
 */
export const generateVeoPrompt = async (details: {
  description: string;
  cameraAngle?: string;
  overallMood: string;
}): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { description, cameraAngle, overallMood } = details;

  const prompt = `
    You are an expert cinematic director specializing in creating prompts for AI video generation models like VEO.
    Your task is to take a scene description and transform it into a single, powerful, and highly specific VEO prompt, using the provided context intelligently.

    **Overall Mood:** ${overallMood}
    **Scene Description:** ${description}
    **Suggested Camera Angle:** ${cameraAngle || 'Not specified'}

    **Instructions (Follow Strictly):**
    1.  **Synthesize, Don't Just Copy:** Do not just rephrase the description. Enhance it with cinematic details inspired by the description and overall mood.
    2.  **Single Command:** The output MUST be a single, direct command. Start immediately with the visual description. Do not use conversational phrases like "The prompt is:" or "Here is a prompt:".
    3.  **Context-Aware Camera Direction:**
        *   **If 'Suggested Camera Angle' is provided:** Use it as the primary inspiration for the camera shot and angle in your prompt. Enhance it with specific movement. For example, if the angle is 'low angle shot', you could create 'dynamic low angle tracking shot moving upwards'.
        *   **If 'Suggested Camera Angle' is 'Not specified':** You MUST invent a creative and dynamic camera angle and movement that fits the scene's description and the overall mood. Do not default to a static or simple shot.
    4.  **Mood-Driven Stylistic Elements:** You MUST incorporate specific visual effects or stylistic choices that directly reflect the **Overall Mood**. For a '${overallMood}' mood, consider appropriate effects (e.g., for 'Melancholic', suggest 'slow motion, film grain'; for 'Cyberpunk', suggest 'neon glows, glitch effects').
    5.  **Be Specific and Cinematic (The Final Prompt):** Combine all of the following elements into a single, flowing, and descriptive sentence.
        *   **Subject & Action:** What is happening and who/what is doing it?
        *   **Camera Shot & Angle:** Derived from your logic in step 3.
        *   **CRITICAL - Dynamic Camera Movement:** It is mandatory to include a specific, dynamic camera movement. Examples: 'dolly zoom', 'whip pan', 'orbital shot'.
        *   **CRITICAL - Lens Specification:** It is mandatory to specify a lens type. Examples: 'wide-angle lens', 'telephoto lens', 'macro lens'.
        *   **Lighting:** Describe the lighting with evocative terms (e.g., 'ominous silhouette lighting', 'soft golden hour light').
        *   **Visual Effects & Style:** Derived from your logic in step 4.

    **Example Input 1:**
    - Overall Mood: Melancholic
    - Scene Description: A person stands alone on a rainy street at night, looking at their reflection in a puddle.
    - Suggested Camera Angle: high angle shot

    **Example Output 1:**
    Overhead crane shot slowly descending towards a lone figure on a rain-slicked street at night, telephoto lens compressing the scene, their face reflected in a neon-lit puddle, slow motion, cinematic film grain.
    
    **Example Input 2:**
    - Overall Mood: Cyberpunk
    - Scene Description: A hacker works furiously at a glowing terminal in a cluttered room.
    - Suggested Camera Angle: Not specified
    
    **Example Output 2:**
    Tight orbital shot around a hacker's face, illuminated only by cascading green code on their terminal, wide-angle lens capturing the cluttered room, subtle digital glitch effects and neon light reflections on their glasses.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating VEO prompt:", error);
    throw new Error("Failed to generate an updated VEO prompt. Please try again.");
  }
};

/**
 * Generates a video from a VEO prompt and provides progress updates.
 * @param prompt The VEO prompt string.
 * @param referenceImage An optional reference image to guide the generation.
 * @param onProgress A callback function to receive status updates.
 * @returns A promise that resolves to a local URL for the generated video blob.
 */
export const generateVideoFromPrompt = async (
  prompt: string,
  referenceImage: { imageBytes: string; mimeType: string; } | null,
  onProgress: (status: string) => void
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    onProgress('Initiating video generation request...');
    
    const generationConfig = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9',
      },
      ...(referenceImage && { image: referenceImage }), // Conditionally add the image
    };

    let operation = await ai.models.generateVideos(generationConfig);

    onProgress('Request sent. Waiting for video generation... This can take several minutes.');

    const pollInterval = 10000; // 10 seconds
    let pollCount = 0;

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;
      onProgress(`Polling for result (attempt ${pollCount})... Please remain patient.`);
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
        throw operation.error;
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error('Video generation completed, but no download link was provided.');
    }

    onProgress('Generation complete! Downloading video file...');

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error(`Failed to download video file. Status: ${response.statusText}`);
    }

    const blob = await response.blob();
    const videoUrl = URL.createObjectURL(blob);
    onProgress('Video ready.');
    return videoUrl;

  } catch (error: any) {
    console.error("Error in generateVideoFromPrompt:", error);
    
    const errorMessage = error?.error?.message || error?.message || 'An unknown error occurred.';
    const errorStatus = error?.error?.status;
    
    // Handle invalid/missing API key error first
    if (errorMessage.includes("Requested entity was not found")) {
      throw new Error('API_KEY_NOT_FOUND');
    }

    // Handle Quota Exceeded error specifically
    if (errorStatus === 'RESOURCE_EXHAUSTED' || errorMessage.includes('quota')) {
        const billingUrl = "https://ai.google.dev/gemini-api/docs/billing";
        const quotaUrl = "https://ai.google.dev/gemini-api/docs/rate-limits";
        
        const userFriendlyMessage = `You have exceeded your API quota. Please check your plan and billing details. For more information, see the [billing documentation](${billingUrl}) and [rate limits guide](${quotaUrl}).`;
        throw new Error(userFriendlyMessage);
    }
    
    // Generic fallback for other errors
    throw new Error(`Video Generation Failed: ${errorMessage}`);
  }
};

/**
 * Validates the currently selected API key by making a lightweight test call.
 * @returns A promise that resolves to `true` if the key is valid, `false` otherwise.
 */
export const validateApiKey = async (): Promise<boolean> => {
  if (!process.env.API_KEY) {
    // This case might happen if no key is selected yet.
    return false;
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // A minimal, low-cost call to verify the key's validity and permissions.
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "test", // A simple, harmless prompt.
    });
    return true; // The call succeeded, so the key is valid.
  } catch (error) {
    console.warn("API key validation failed:", error);
    // Any API error during this check (e.g., permission denied, invalid key, quota exceeded)
    // indicates the key is not usable for the application's purposes.
    return false;
  }
};