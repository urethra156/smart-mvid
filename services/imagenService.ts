import { GoogleGenAI } from "@google/genai";
import { Scene, ConsistentElements, ColorSuggestion } from "../types";

/**
 * Builds an enriched, cinematic visual prompt specifically optimized for Imagen 3
 * to render a high-aesthetic music video frame thumbnail.
 */
export function buildCinematicThumbnailPrompt(
  scene: Scene,
  overallMood: string = "Cinematic",
  consistentElements?: ConsistentElements,
  colorPalette?: ColorSuggestion[]
): string {
  const parts: string[] = [];

  // 1. Primary Scene Action & Subject
  if (scene.veoPrompt && scene.veoPrompt.trim().length > 0) {
    parts.push(scene.veoPrompt.trim());
  } else if (scene.description && scene.description.trim().length > 0) {
    parts.push(scene.description.trim());
  } else {
    parts.push("Cinematic music video master shot with dynamic subject and expressive lighting");
  }

  // 2. Camera & Composition
  if (scene.cameraAngle && scene.cameraAngle.trim().length > 0) {
    parts.push(`${scene.cameraAngle} shot`);
  } else {
    parts.push("cinematic anamorphic lens composition, 35mm film framing, wide master shot, shallow depth of field");
  }

  // 3. Overall Aesthetic & Mood
  parts.push(`mood: ${overallMood}, highly stylized music video aesthetic, cinematic atmosphere`);

  // 4. Color Palette guidance
  if (colorPalette && colorPalette.length > 0) {
    const paletteNotes = colorPalette.slice(0, 3).map(c => `${c.reason || 'toned'} (${c.hex})`).join(', ');
    parts.push(`color grading palette inspired by: ${paletteNotes}`);
  }

  // 5. Consistent Character / Prop context
  if (consistentElements) {
    const relevantChars = consistentElements.characters?.filter(c => 
      scene.description.toLowerCase().includes(c.name.toLowerCase()) || 
      scene.veoPrompt?.toLowerCase().includes(c.name.toLowerCase())
    );
    if (relevantChars && relevantChars.length > 0) {
      const charNotes = relevantChars.map(c => `${c.name}: ${c.description}`).join('; ');
      parts.push(`character styling: ${charNotes}`);
    }
  }

  // 6. Quality & Cinematography Boosters
  parts.push("cinematic still, award-winning music video cinematography, dramatic lighting, volumetric haze, 8k resolution, photorealistic masterpiece, sharp focus, filmic texture, no watermark");

  return parts.join(", ");
}

/**
 * Calls Google Imagen 3 to generate a visual thumbnail representation of a scene.
 * Falls back to gemini-3.1-flash-image if necessary.
 */
export async function generateSceneThumbnailWithImagen(
  prompt: string,
  onProgress?: (status: string) => void
): Promise<string> {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_NOT_FOUND");
  }

  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  // Attempt 1: Imagen 3 Dedicated Image Model (imagen-3.0-generate-002)
  try {
    if (onProgress) onProgress("Synthesizing visual thumbnail with Google Imagen 3...");

    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "16:9",
      },
    });

    const base64Bytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64Bytes) {
      if (onProgress) onProgress("Imagen 3 thumbnail generated successfully!");
      return `data:image/jpeg;base64,${base64Bytes}`;
    }
  } catch (imagenError: any) {
    console.warn("Imagen 3 direct call failed, attempting multimodal image fallback...", imagenError);
    
    const errText = String(imagenError?.message || imagenError || "").toLowerCase();
    if (errText.includes("api_key") || errText.includes("requested entity was not found")) {
      throw new Error("API_KEY_NOT_FOUND");
    }

    // Attempt 2: gemini-3.1-flash-image / nano banana image generation fallback
    try {
      if (onProgress) onProgress("Rendering image via Gemini 3.1 Flash Image...");
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [
            {
              text: `Generate a photorealistic 16:9 music video thumbnail still for: ${prompt}`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K",
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || "image/png";
            if (onProgress) onProgress("Thumbnail generated successfully!");
            return `data:${mime};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (fallbackError: any) {
      const rawErrorMsg = String(fallbackError?.message || imagenError?.message || fallbackError || imagenError || "Image generation service error.");
      console.warn("Cloud image generation service notification:", rawErrorMsg);
      
      if (
        rawErrorMsg.includes("RESOURCE_EXHAUSTED") ||
        rawErrorMsg.includes("429") ||
        rawErrorMsg.toLowerCase().includes("prepayment credits") ||
        rawErrorMsg.toLowerCase().includes("quota") ||
        rawErrorMsg.toLowerCase().includes("rate limit")
      ) {
        throw new Error("IMAGEN_QUOTA_EXHAUSTED");
      }

      if (
        rawErrorMsg.includes("PERMISSION_DENIED") || 
        rawErrorMsg.includes("403") ||
        rawErrorMsg.toLowerCase().includes("caller does not have permission")
      ) {
        throw new Error("IMAGEN_PERMISSION_DENIED");
      }

      if (
        rawErrorMsg.toLowerCase().includes("api_key") || 
        rawErrorMsg.toLowerCase().includes("requested entity was not found")
      ) {
        throw new Error("API_KEY_NOT_FOUND");
      }

      throw new Error(`Imagen Generation Notice: ${rawErrorMsg}`);
    }
  }

  throw new Error("No image data returned from image generation models.");
}

/**
 * Procedural Canvas Storyboard Generator (Free Offline Fallback / Stylized Artboard)
 * Generates an aesthetic 1280x720 conceptual mood storyboard image in browser canvas.
 */
export function generateProceduralStoryboardArtwork(
  scene: Scene,
  overallMood: string = "Cinematic",
  colorPalette?: ColorSuggestion[]
): string {
  const width = 1280;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Dynamic Mood Palette
  let bg1 = "#0f172a";
  let bg2 = "#1e1b4b";
  let accent = "#06b6d4";
  let gold = "#f59e0b";

  if (colorPalette && colorPalette.length >= 2) {
    bg1 = colorPalette[0].hex;
    bg2 = colorPalette[1].hex;
    accent = colorPalette[colorPalette.length - 1].hex;
  } else {
    const m = overallMood.toLowerCase();
    if (m.includes("dark") || m.includes("gothic") || m.includes("rock")) {
      bg1 = "#18181b"; bg2 = "#881337"; accent = "#e11d48";
    } else if (m.includes("neon") || m.includes("cyber") || m.includes("vapor")) {
      bg1 = "#2e0854"; bg2 = "#0369a1"; accent = "#f43f5e";
    } else if (m.includes("pop") || m.includes("energy")) {
      bg1 = "#be185d"; bg2 = "#7c3aed"; accent = "#fbbf24";
    }
  }

  // 1. Deep Gradient Background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, bg1);
  grad.addColorStop(0.5, bg2);
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Atmospheric Lighting / Volumetric Orbs
  for (let i = 0; i < 8; i++) {
    const ox = (i * 180 + 100) % width;
    const oy = ((i * 120 + 80) % height);
    const r = 160 + (i * 30);
    const radial = ctx.createRadialGradient(ox, oy, 10, ox, oy, r);
    radial.addColorStop(0, `${accent}44`);
    radial.addColorStop(0.6, `${gold}15`);
    radial.addColorStop(1, "transparent");
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Cinematic Vignette
  const vignette = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.75);
  vignette.addColorStop(0, "transparent");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.85)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // 4. Cinematic Letterbox & Crosshair Grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(50, 40, width - 100, height - 80);

  // Center Frame Guides
  ctx.strokeStyle = `${accent}66`;
  ctx.beginPath();
  // Top-left crosshair
  ctx.moveTo(70, 60); ctx.lineTo(90, 60);
  ctx.moveTo(70, 60); ctx.lineTo(70, 80);
  // Bottom-right crosshair
  ctx.moveTo(width - 70, height - 60); ctx.lineTo(width - 90, height - 60);
  ctx.moveTo(width - 70, height - 60); ctx.lineTo(width - 70, height - 80);
  ctx.stroke();

  // 5. Header Visual HUD
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fillRect(0, 0, width, 55);

  ctx.fillStyle = accent;
  ctx.font = "bold 16px monospace";
  ctx.fillText(`SCENE ${String(scene.sceneNumber).padStart(2, "0")} // CONCEPT STORYBOARD STILL`, 60, 35);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "13px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`MOOD: ${overallMood.toUpperCase()} | ${scene.cameraAngle || "CINEMATIC WIDE"}`, width - 60, 35);
  ctx.textAlign = "left";

  // 6. Central Conceptual Card
  const boxW = width - 160;
  const boxH = 200;
  const boxX = 80;
  const boxY = height / 2 - 100;

  ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
  ctx.strokeStyle = `${accent}88`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 16);
  ctx.fill();
  ctx.stroke();

  // Scene Description Title
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 24px sans-serif";
  const desc = scene.description.length > 110 ? scene.description.substring(0, 107) + "..." : scene.description;
  ctx.fillText(desc, boxX + 32, boxY + 52);

  // VEO / Imagen Prompt Subtitle
  ctx.fillStyle = "#94a3b8";
  ctx.font = "italic 15px sans-serif";
  const p = (scene.veoPrompt || scene.description).length > 140 
    ? (scene.veoPrompt || scene.description).substring(0, 137) + "..." 
    : (scene.veoPrompt || scene.description);
  ctx.fillText(`Visual Direction: "${p}"`, boxX + 32, boxY + 95);

  // Decorative Accent Bar
  ctx.fillStyle = accent;
  ctx.fillRect(boxX + 32, boxY + 125, 80, 4);

  ctx.fillStyle = gold;
  ctx.fillRect(boxX + 116, boxY + 125, 40, 4);

  // Timestamp & Transition Note
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 14px monospace";
  ctx.fillText(`TRANSITION: ${scene.transition || "Standard Cut"}  |  DURATION: ${scene.startTimeSeconds ?? 0}s - ${scene.endTimeSeconds ?? 8}s`, boxX + 32, boxY + 160);

  return canvas.toDataURL("image/jpeg", 0.92);
}
