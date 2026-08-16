import { ComfyUIConfig } from './comfyuiService';

export interface AIModelSetupResult {
  config: ComfyUIConfig;
  recommendedVomPromptStyle: string;
  moodCategory: string;
  presetName: string;
  reasoning: string[];
  recommendedGpuVram: string;
}

/**
 * AI Intelligence model setup engine.
 * Automatically analyzes song mood, title, and duration to optimize
 * local ComfyUI GPU pipeline parameters and Google VEO camera prompt styles.
 */
export function autoSetupModelsForScript(mood: string, title: string = '', durationSeconds: number = 60): AIModelSetupResult {
  const lowerMood = mood.toLowerCase();
  const lowerTitle = title.toLowerCase();

  let workflowType: ComfyUIConfig['workflowType'] = 'animate_diff';
  let checkpoint = 'v1-5-pruned-emaonly.safetensors';
  let steps = 25;
  let cfg = 7.5;
  let samplerName = 'euler_ancestral';
  let scheduler = 'karras';
  let width = 768;
  let height = 432;
  let frameCount = 16;
  let presetName = 'Cinematic Balanced Standard';
  let moodCategory = 'Cinematic';
  let recommendedGpuVram = '8 GB VRAM';

  let negativePrompt = 'blurry, low quality, distorted anatomy, bad hands, watermark, logo, text, cropped, ugly';
  let recommendedVomPromptStyle = 'Cinematic 35mm lens, volumetric lighting, motion blur';
  const reasoning: string[] = [];

  if (
    lowerMood.includes('cyberpunk') ||
    lowerMood.includes('futuristic') ||
    lowerMood.includes('synthwave') ||
    lowerTitle.includes('neon') ||
    lowerTitle.includes('cyber')
  ) {
    presetName = 'Wan 2.1 Cyberpunk Ultra-Realistic';
    moodCategory = 'Cyberpunk / Sci-Fi';
    workflowType = 'wan2_1';
    checkpoint = 'wan2.1_t2v_1.3B_bf16.safetensors';
    steps = 30;
    cfg = 6.0;
    samplerName = 'uni_pc';
    scheduler = 'simple';
    width = 832;
    height = 480;
    frameCount = 24;
    negativePrompt = 'bright daylight, cartoon, 3d render, lowres, noise, blur, watermark, text, signature';
    recommendedVomPromptStyle = 'Neon lighting, 8k raytracing reflections, anamorphic lens flare, high detail';
    recommendedGpuVram = '12 GB VRAM (Bfloat16 precision)';
    reasoning.push('Selected Wan 2.1 T2V model architecture for high-fidelity ray-traced reflections and cyberpunk neon aesthetics.');
    reasoning.push('Increased resolution to 832x480 widescreen for ultra-sharp terminal text and city light refraction.');
    reasoning.push('Configured CFG 6.0 with UniPC sampler for smooth temporal motion consistency without flickering.');
  } else if (
    lowerMood.includes('rock') ||
    lowerMood.includes('metal') ||
    lowerMood.includes('intense') ||
    lowerMood.includes('aggressive') ||
    lowerMood.includes('fast') ||
    lowerMood.includes('energetic')
  ) {
    presetName = 'HunyuanVideo High-Action Motion Engine';
    moodCategory = 'High Motion / Rock & Energy';
    workflowType = 'hunyuan_video';
    checkpoint = 'hunyuan_video_t2v_720p.safetensors';
    steps = 28;
    cfg = 7.0;
    samplerName = 'dpmpp_2m';
    scheduler = 'karras';
    width = 768;
    height = 432;
    frameCount = 24;
    negativePrompt = 'static image, slow motion, boring background, blurry, low resolution, bad hands, watermark';
    recommendedVomPromptStyle = 'Fast dynamic camera tracking, high contrast lighting, energetic motion blur, film grain';
    recommendedGpuVram = '16 GB VRAM';
    reasoning.push('Selected HunyuanVideo engine to process high-frequency camera movements and energetic band performances.');
    reasoning.push('Applied DPM++ 2M Karras sampler to capture fast motion blur without spatial distortion.');
    reasoning.push('Configured 24-frame batch sizes to synchronize with fast BPM drum transients.');
  } else if (
    lowerMood.includes('anime') ||
    lowerMood.includes('electronic') ||
    lowerMood.includes('pop') ||
    lowerMood.includes('vibrant') ||
    lowerMood.includes('joyful') ||
    lowerMood.includes('upbeat')
  ) {
    presetName = 'AnimateDiff SDXL Stylized Anime / Pop';
    moodCategory = 'Vibrant / Pop / Electronic';
    workflowType = 'animate_diff';
    checkpoint = 'sdxl_anime_v2.safetensors';
    steps = 22;
    cfg = 8.0;
    samplerName = 'euler_ancestral';
    scheduler = 'karras';
    width = 768;
    height = 512;
    frameCount = 16;
    negativePrompt = 'photorealistic, dark, gloomy, monochrome, ugly faces, bad eyes, text, watermark';
    recommendedVomPromptStyle = 'Vibrant anime art style, saturated color palette, cel shading, lens flare, dynamic pose';
    recommendedGpuVram = '8 GB VRAM';
    reasoning.push('Selected AnimateDiff with SDXL anime weights for vivid color saturation and expressive line art.');
    reasoning.push('Set CFG to 8.0 for high prompt adherence to saturated pop visual concepts.');
    reasoning.push('Configured 768x512 aspect ratio optimized for animated characters.');
  } else {
    // Default Melancholic / Ambient / Indie / Cinematic
    presetName = 'AnimateDiff DreamShaper 8 Cinematic';
    moodCategory = 'Cinematic / Ambient / Narrative';
    workflowType = 'animate_diff';
    checkpoint = 'dreamshaper_8.safetensors';
    steps = 25;
    cfg = 7.5;
    samplerName = 'euler_ancestral';
    scheduler = 'karras';
    width = 768;
    height = 432;
    frameCount = 16;
    negativePrompt = 'overexposed, garish colors, 3d render, cartoon, low quality, bad anatomy, watermark, signature';
    recommendedVomPromptStyle = 'Atmospheric golden hour lighting, 35mm film grain, shallow depth of field, slow dolly pan';
    recommendedGpuVram = '8 GB VRAM';
    reasoning.push('Selected DreamShaper 8 photorealistic checkpoint with AnimateDiff motion module v1.5.');
    reasoning.push('Optimized Euler Ancestral sampler with Karras noise schedule for smooth cinematic camera pans.');
    reasoning.push('Set default 16-frame motion window for balanced VRAM efficiency and fluid motion.');
  }

  return {
    config: {
      serverUrl: 'http://127.0.0.1:8188',
      workflowType,
      checkpoint,
      negativePrompt,
      steps,
      cfg,
      samplerName,
      scheduler,
      width,
      height,
      frameCount,
      seed: -1,
    },
    moodCategory,
    presetName,
    recommendedVomPromptStyle,
    reasoning,
    recommendedGpuVram,
  };
}
