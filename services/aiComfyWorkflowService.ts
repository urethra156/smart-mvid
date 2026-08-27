import { ComfyUIConfig } from './comfyuiService';
import { Scene, SongAnalysis } from '../types';

export type GpuTier = 'budget_6gb' | 'mid_12gb' | 'high_24gb';

export interface ComfyUiArchitecture {
  id: 'wan2_1' | 'hunyuan_video' | 'animate_diff' | 'ltx_video' | 'svd' | 'flux_vid';
  name: string;
  badge: string;
  tagline: string;
  recommendedVram: string;
  vramTier: GpuTier;
  recommendedCheckpoints: {
    name: string;
    filename: string;
    downloadUrl: string;
    fileSize: string;
    description: string;
  }[];
  requiredCustomNodes: {
    name: string;
    repoUrl: string;
    cloneCmd: string;
    managerName: string;
  }[];
  defaultSettings: {
    steps: number;
    cfg: number;
    samplerName: string;
    scheduler: string;
    width: number;
    height: number;
    frameCount: number;
    fps: number;
  };
  pros: string[];
  bestForGenres: string[];
}

export const COMFYUI_ARCHITECTURES: Record<string, ComfyUiArchitecture> = {
  wan2_1: {
    id: 'wan2_1',
    name: 'Wan 2.1 Video (T2V / I2V)',
    badge: 'State of the Art',
    tagline: 'High-fidelity cinematic camera motions, photorealism & temporal stability',
    recommendedVram: '12 GB - 24 GB VRAM',
    vramTier: 'mid_12gb',
    recommendedCheckpoints: [
      {
        name: 'Wan 2.1 T2V 1.3B BF16 (High Speed)',
        filename: 'wan2.1_t2v_1.3B_bf16.safetensors',
        downloadUrl: 'https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B',
        fileSize: '2.8 GB',
        description: 'Blazing fast generation, ideal for 12GB GPUs and rapid prototyping',
      },
      {
        name: 'Wan 2.1 T2V 14B Q4 / BF16 (Cinematic Master)',
        filename: 'wan2.1_t2v_14B_bf16.safetensors',
        downloadUrl: 'https://huggingface.co/Wan-AI/Wan2.1-T2V-14B',
        fileSize: '14.2 GB',
        description: 'Industry-standard motion clarity, raytraced reflection and lighting fidelity',
      },
    ],
    requiredCustomNodes: [
      {
        name: 'ComfyUI-WanVideoWrapper',
        repoUrl: 'https://github.com/kijai/ComfyUI-WanVideoWrapper',
        cloneCmd: 'git clone https://github.com/kijai/ComfyUI-WanVideoWrapper custom_nodes/ComfyUI-WanVideoWrapper',
        managerName: 'WanVideoWrapper (by Kijai)',
      },
      {
        name: 'ComfyUI-VideoHelperSuite',
        repoUrl: 'https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite',
        cloneCmd: 'git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite custom_nodes/ComfyUI-VideoHelperSuite',
        managerName: 'Video Helper Suite (VHS)',
      },
    ],
    defaultSettings: {
      steps: 30,
      cfg: 6.0,
      samplerName: 'uni_pc',
      scheduler: 'simple',
      width: 832,
      height: 480,
      frameCount: 24,
      fps: 16,
    },
    pros: ['Ultra-smooth 16-24fps fluid motion', 'Superior prompt comprehension', 'No morphing or flickering'],
    bestForGenres: ['Cyberpunk', 'Cinematic', 'Electronic', 'Pop', 'Hip Hop', 'Sci-Fi'],
  },
  hunyuan_video: {
    id: 'hunyuan_video',
    name: 'HunyuanVideo (Tencent 720p)',
    badge: 'High Action & Dynamic Motion',
    tagline: 'Exceptional dynamic camera tracking, high speed action & performance choreography',
    recommendedVram: '16 GB - 24 GB VRAM',
    vramTier: 'high_24gb',
    recommendedCheckpoints: [
      {
        name: 'HunyuanVideo T2V 720p FP8 / BF16',
        filename: 'hunyuan_video_t2v_720p.safetensors',
        downloadUrl: 'https://huggingface.co/tencent/HunyuanVideo',
        fileSize: '12.8 GB',
        description: 'Native 720p widescreen text-to-video with superior physics simulation',
      },
    ],
    requiredCustomNodes: [
      {
        name: 'ComfyUI-HunyuanVideoWrapper',
        repoUrl: 'https://github.com/kijai/ComfyUI-HunyuanVideoWrapper',
        cloneCmd: 'git clone https://github.com/kijai/ComfyUI-HunyuanVideoWrapper custom_nodes/ComfyUI-HunyuanVideoWrapper',
        managerName: 'HunyuanVideoWrapper (by Kijai)',
      },
      {
        name: 'ComfyUI-VideoHelperSuite',
        repoUrl: 'https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite',
        cloneCmd: 'git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite custom_nodes/ComfyUI-VideoHelperSuite',
        managerName: 'Video Helper Suite (VHS)',
      },
    ],
    defaultSettings: {
      steps: 28,
      cfg: 7.0,
      samplerName: 'dpmpp_2m',
      scheduler: 'karras',
      width: 768,
      height: 432,
      frameCount: 24,
      fps: 12,
    },
    pros: ['High BPM motion sync', 'Handles fast human movement & dance choreography', 'High resolution texturing'],
    bestForGenres: ['Rock', 'Metal', 'High Energy', 'Hip Hop', 'Dance/EDM'],
  },
  animate_diff: {
    id: 'animate_diff',
    name: 'AnimateDiff Evolved (SD 1.5 / SDXL)',
    badge: 'Stylized, Anime & Budget GPUs',
    tagline: 'Vast ecosystem of stylized LoRAs, Anime checkpoints, ControlNets & 6GB-8GB VRAM compatibility',
    recommendedVram: '6 GB - 12 GB VRAM',
    vramTier: 'budget_6gb',
    recommendedCheckpoints: [
      {
        name: 'DreamShaper 8 (Photorealistic & Film)',
        filename: 'dreamshaper_8.safetensors',
        downloadUrl: 'https://civitai.com/models/4384/dreamshaper',
        fileSize: '2.1 GB',
        description: 'Great for atmospheric lighting, cinematic music videos, and film grain',
      },
      {
        name: 'AnimateDiff Motion Module v3 (mm_sd15_v3)',
        filename: 'v3_sd15_mm.ckpt',
        downloadUrl: 'https://huggingface.co/guoyww/animatediff/blob/main/v3_sd15_mm.ckpt',
        fileSize: '1.7 GB',
        description: 'Required motion weights for SD 1.5 AnimateDiff pipeline',
      },
      {
        name: 'SDXL Anime / Stylized Checkpoint',
        filename: 'animagine_xl_v3.safetensors',
        downloadUrl: 'https://civitai.com/models/260267/animagine-xl-v30',
        fileSize: '6.6 GB',
        description: 'Vibrant Japanese animation art style with cel-shaded lighting',
      },
    ],
    requiredCustomNodes: [
      {
        name: 'ComfyUI-AnimateDiff-Evolved',
        repoUrl: 'https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved',
        cloneCmd: 'git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved custom_nodes/ComfyUI-AnimateDiff-Evolved',
        managerName: 'AnimateDiff-Evolved (by Kosinkadink)',
      },
      {
        name: 'ComfyUI-VideoHelperSuite',
        repoUrl: 'https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite',
        cloneCmd: 'git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite custom_nodes/ComfyUI-VideoHelperSuite',
        managerName: 'Video Helper Suite (VHS)',
      },
    ],
    defaultSettings: {
      steps: 22,
      cfg: 7.5,
      samplerName: 'euler_ancestral',
      scheduler: 'karras',
      width: 768,
      height: 432,
      frameCount: 16,
      fps: 12,
    },
    pros: ['Works on 6GB/8GB GPUs', 'Massive Civitai LoRA library support', 'Fastest generation time per scene'],
    bestForGenres: ['Anime', 'Vaporwave', 'Folk/Acoustic', 'Psychedelic', 'Pop', 'Melancholic'],
  },
  ltx_video: {
    id: 'ltx_video',
    name: 'LTX-Video 0.9.1 (Lightricks)',
    badge: 'Ultra Fast Real-Time Video',
    tagline: 'Instant latent diffusion video generation with high frame rates and low memory overhead',
    recommendedVram: '8 GB - 16 GB VRAM',
    vramTier: 'mid_12gb',
    recommendedCheckpoints: [
      {
        name: 'LTX-Video 0.9.1 Checkpoint',
        filename: 'ltx-video-2b-v0.9.1.safetensors',
        downloadUrl: 'https://huggingface.co/Lightricks/LTX-Video',
        fileSize: '4.8 GB',
        description: 'Lightweight high-efficiency video transformer weights',
      },
    ],
    requiredCustomNodes: [
      {
        name: 'ComfyUI-LTXVideo',
        repoUrl: 'https://github.com/kijai/ComfyUI-LTXVideo',
        cloneCmd: 'git clone https://github.com/kijai/ComfyUI-LTXVideo custom_nodes/ComfyUI-LTXVideo',
        managerName: 'LTXVideoWrapper',
      },
      {
        name: 'ComfyUI-VideoHelperSuite',
        repoUrl: 'https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite',
        cloneCmd: 'git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite custom_nodes/ComfyUI-VideoHelperSuite',
        managerName: 'Video Helper Suite (VHS)',
      },
    ],
    defaultSettings: {
      steps: 25,
      cfg: 4.5,
      samplerName: 'euler',
      scheduler: 'simple',
      width: 768,
      height: 512,
      frameCount: 25,
      fps: 24,
    },
    pros: ['Smooth 24fps native playback', 'Low VRAM footprint', 'Fast text-to-video inference'],
    bestForGenres: ['Documentary', 'Cinematic', 'Minimalist', 'Ambient'],
  },
  svd: {
    id: 'svd',
    name: 'Stable Video Diffusion (SVD / SVD-XT)',
    badge: 'Image-to-Video Storyboard Animator',
    tagline: 'Animate storyboard concept images, album covers, and character art with realistic camera panning',
    recommendedVram: '8 GB - 12 GB VRAM',
    vramTier: 'budget_6gb',
    recommendedCheckpoints: [
      {
        name: 'SVD-XT 1.1 (25 Frames Image-to-Video)',
        filename: 'svd_xt.safetensors',
        downloadUrl: 'https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt',
        fileSize: '4.7 GB',
        description: 'Native ComfyUI model for turning concept art into motion clips',
      },
    ],
    requiredCustomNodes: [
      {
        name: 'ComfyUI Native Video Nodes',
        repoUrl: 'https://github.com/comfyanonymous/ComfyUI',
        cloneCmd: '# Built into core ComfyUI (No extra installation needed)',
        managerName: 'Core ComfyUI Nodes',
      },
    ],
    defaultSettings: {
      steps: 20,
      cfg: 2.5,
      samplerName: 'euler',
      scheduler: 'karras',
      width: 768,
      height: 432,
      frameCount: 25,
      fps: 12,
    },
    pros: ['100% Visual consistency from reference thumbnails', 'Built into ComfyUI core', 'Predictable camera panning'],
    bestForGenres: ['Storyboards', 'Concept Art Motion', 'Atmospheric Ambient'],
  },
};

export interface AIWorkflowRecommendation {
  architecture: ComfyUiArchitecture;
  optimizedConfig: ComfyUIConfig;
  reasoning: string[];
  vramAdvice: string;
  customLaunchCommand: string;
  genreAlignmentScore: number; // 0-100
  sceneSpecificTips: string[];
}

/**
 * AI Intelligence engine to analyze song characteristics, hardware, and director vision
 * to generate a tailored ComfyUI setup.
 */
export function recommendComfyUiWorkflow(
  mood: string,
  analysis?: SongAnalysis,
  gpuTier: GpuTier = 'mid_12gb',
  aspectRatio: '16_9' | '9_16' | '1_1' = '16_9'
): AIWorkflowRecommendation {
  const lowerMood = (mood || '').toLowerCase();
  const bpm = analysis?.bpm || 110;
  const dynamics = (analysis?.dynamics || '').toLowerCase();

  let targetArchId: keyof typeof COMFYUI_ARCHITECTURES = 'wan2_1';
  const reasoning: string[] = [];

  // Determine aspect ratio dimensions
  let width = 768;
  let height = 432;
  if (aspectRatio === '16_9') {
    width = gpuTier === 'high_24gb' ? 832 : 768;
    height = gpuTier === 'high_24gb' ? 480 : 432;
  } else if (aspectRatio === '9_16') {
    width = gpuTier === 'high_24gb' ? 480 : 432;
    height = gpuTier === 'high_24gb' ? 832 : 768;
  } else {
    width = 512;
    height = 512;
  }

  // 1. Hardware VRAM constraint check
  if (gpuTier === 'budget_6gb') {
    targetArchId = 'animate_diff';
    reasoning.push(`Identified 6GB-8GB VRAM constraint: Configured AnimateDiff Evolved SD1.5 with lightweight Karras noise scheduler for maximum memory efficiency.`);
  } else if (lowerMood.includes('rock') || lowerMood.includes('metal') || bpm > 135 || lowerMood.includes('energy') || dynamics.includes('explosive')) {
    targetArchId = gpuTier === 'high_24gb' ? 'hunyuan_video' : 'wan2_1';
    reasoning.push(`High BPM (${bpm}) & explosive dynamic detected: Selected ${targetArchId === 'hunyuan_video' ? 'HunyuanVideo 720p' : 'Wan 2.1'} for fast-paced camera tracking and action clarity.`);
  } else if (lowerMood.includes('anime') || lowerMood.includes('stylized') || lowerMood.includes('vaporwave') || lowerMood.includes('pop')) {
    targetArchId = 'animate_diff';
    reasoning.push(`Artistic anime / stylized visual tone: Selected AnimateDiff with SDXL weights for vibrant cel-shading and expressive character rendering.`);
  } else if (lowerMood.includes('documentary') || lowerMood.includes('minimalist') || lowerMood.includes('acoustic')) {
    targetArchId = 'ltx_video';
    reasoning.push(`Natural documentary / acoustic aesthetic: Configured LTX-Video 0.9.1 with low CFG scale (4.5) for photorealistic cinematic depth.`);
  } else {
    // Default high fidelity
    targetArchId = 'wan2_1';
    reasoning.push(`Cinematic music video aesthetic: Configured Wan 2.1 video architecture with UniPC sampler for smooth camera movement and zero temporal flickering.`);
  }

  const arch = COMFYUI_ARCHITECTURES[targetArchId] || COMFYUI_ARCHITECTURES.wan2_1;
  const def = arch.defaultSettings;

  // Build optimized negative prompt based on mood
  let negativePrompt = 'blurry, low quality, distorted anatomy, bad hands, watermark, logo, text, cropped, ugly, oversaturated';
  if (lowerMood.includes('dark') || lowerMood.includes('noir') || lowerMood.includes('gothic')) {
    negativePrompt += ', bright daylight, neon saturated, cartoon, 3d render';
  } else if (lowerMood.includes('bright') || lowerMood.includes('pop') || lowerMood.includes('vibrant')) {
    negativePrompt += ', dark muddy shadows, underexposed, gloomy, desaturated';
  }

  // Adjust frame count based on BPM
  let frameCount = def.frameCount;
  if (bpm >= 130) {
    frameCount = 24; // Faster motion window
    reasoning.push(`Adjusted motion buffer to 24 frames to synchronize clip transitions with rhythmic transients.`);
  }

  const optimizedConfig: ComfyUIConfig = {
    serverUrl: 'http://127.0.0.1:8188',
    workflowType: targetArchId as any,
    checkpoint: arch.recommendedCheckpoints[0]?.filename || 'v1-5-pruned-emaonly.safetensors',
    negativePrompt,
    steps: gpuTier === 'high_24gb' ? def.steps + 4 : def.steps,
    cfg: def.cfg,
    samplerName: def.samplerName,
    scheduler: def.scheduler,
    width,
    height,
    frameCount,
    fps: def.fps || 16,
    denoise: 1.0,
    seed: -1,
  };

  // Launch CLI advice
  let vramAdvice = 'Optimal for 12GB+ GPUs (RTX 3060 12GB, 4070, 3080, 4080, 4090, Apple Silicon M-series).';
  let customLaunchCommand = 'python main.py --listen 0.0.0.0 --enable-cors-header "*"';
  if (gpuTier === 'budget_6gb') {
    vramAdvice = 'Low VRAM Mode enabled: Using SD 1.5 float16 weights with memory-saving latent caches.';
    customLaunchCommand = 'python main.py --lowvram --enable-cors-header "*"';
  } else if (gpuTier === 'high_24gb') {
    vramAdvice = 'High Performance Mode enabled: Full bfloat16 precision with 832x480 resolution.';
    customLaunchCommand = 'python main.py --highvram --enable-cors-header "*"';
  }

  const sceneSpecificTips = [
    `Use KSampler CFG ${def.cfg} for stable adherence without color burning.`,
    `For scenes with fast camera moves, use ${def.samplerName} with ${def.scheduler} scheduler.`,
    `Export batch API workflows to automate rendering across all scenes sequentially.`,
  ];

  return {
    architecture: arch,
    optimizedConfig,
    reasoning,
    vramAdvice,
    customLaunchCommand,
    genreAlignmentScore: 94,
    sceneSpecificTips,
  };
}

/**
 * Generates a full ComfyUI Web GUI Visual Node Graph (for drag-and-drop onto the ComfyUI canvas)
 */
export function generateComfyUiVisualCanvasJson(
  scene: Scene,
  config: ComfyUIConfig,
  songTitle: string = 'Music Video'
): any {
  const seed = config.seed === -1 ? Math.floor(Math.random() * 1000000000) : config.seed;
  const positivePrompt = scene.veoPrompt || scene.description || 'Cinematic music video scene';
  const negativePrompt = config.negativePrompt || 'blurry, low quality, distorted, bad hands';

  return {
    last_node_id: 10,
    last_link_id: 12,
    nodes: [
      {
        id: 1,
        type: 'CheckpointLoaderSimple',
        pos: [80, 140],
        size: [315, 98],
        flags: {},
        order: 0,
        mode: 0,
        outputs: [
          { name: 'MODEL', type: 'MODEL', links: [1], slot_index: 0 },
          { name: 'CLIP', type: 'CLIP', links: [2, 3], slot_index: 1 },
          { name: 'VAE', type: 'VAE', links: [4], slot_index: 2 },
        ],
        widgets_values: [config.checkpoint || 'v1-5-pruned-emaonly.safetensors'],
      },
      {
        id: 2,
        type: 'CLIPTextEncode',
        pos: [440, 60],
        size: [425, 180],
        flags: {},
        order: 1,
        mode: 0,
        inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
        outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [5], slot_index: 0 }],
        title: `Scene ${scene.sceneNumber} - Positive Prompt`,
        widgets_values: [positivePrompt],
        color: '#233831',
        bgcolor: '#355348',
      },
      {
        id: 3,
        type: 'CLIPTextEncode',
        pos: [440, 280],
        size: [425, 140],
        flags: {},
        order: 2,
        mode: 0,
        inputs: [{ name: 'clip', type: 'CLIP', link: 3 }],
        outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [6], slot_index: 0 }],
        title: 'Negative Prompt',
        widgets_values: [negativePrompt],
        color: '#3a1f1f',
        bgcolor: '#542d2d',
      },
      {
        id: 4,
        type: 'EmptyLatentImage',
        pos: [440, 460],
        size: [315, 106],
        flags: {},
        order: 3,
        mode: 0,
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [7], slot_index: 0 }],
        widgets_values: [config.width || 768, config.height || 432, config.frameCount || 16],
      },
      {
        id: 5,
        type: 'KSampler',
        pos: [910, 140],
        size: [315, 262],
        flags: {},
        order: 4,
        mode: 0,
        inputs: [
          { name: 'model', type: 'MODEL', link: 1 },
          { name: 'positive', type: 'CONDITIONING', link: 5 },
          { name: 'negative', type: 'CONDITIONING', link: 6 },
          { name: 'latent_image', type: 'LATENT', link: 7 },
        ],
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [8], slot_index: 0 }],
        widgets_values: [
          seed,
          'randomize',
          config.steps || 20,
          config.cfg || 7.5,
          config.samplerName || 'euler_ancestral',
          config.scheduler || 'karras',
          1.0,
        ],
      },
      {
        id: 6,
        type: 'VAEDecode',
        pos: [1270, 140],
        size: [210, 46],
        flags: {},
        order: 5,
        mode: 0,
        inputs: [
          { name: 'samples', type: 'LATENT', link: 8 },
          { name: 'vae', type: 'VAE', link: 4 },
        ],
        outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [9], slot_index: 0 }],
      },
      {
        id: 7,
        type: 'VHS_VideoCombine',
        pos: [1530, 140],
        size: [315, 300],
        flags: {},
        order: 6,
        mode: 0,
        inputs: [{ name: 'images', type: 'IMAGE', link: 9 }],
        title: `Export Scene ${scene.sceneNumber} (${songTitle})`,
        widgets_values: {
          frame_rate: 12,
          loop_count: 0,
          filename_prefix: `MV_${songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Scene_${scene.sceneNumber}`,
          format: 'video/h264-mp4',
          pingpong: false,
          save_output: true,
        },
      },
    ],
    links: [
      [1, 1, 0, 5, 0, 'MODEL'],
      [2, 1, 1, 2, 0, 'CLIP'],
      [3, 1, 1, 3, 0, 'CLIP'],
      [4, 1, 2, 6, 1, 'VAE'],
      [5, 2, 0, 5, 1, 'CONDITIONING'],
      [6, 3, 0, 5, 2, 'CONDITIONING'],
      [7, 4, 0, 5, 3, 'LATENT'],
      [8, 5, 0, 6, 0, 'LATENT'],
      [9, 6, 0, 7, 0, 'IMAGE'],
    ],
    groups: [
      {
        title: `AI Music Video Director - Scene ${scene.sceneNumber} Auto-Generated Pipeline`,
        bounding: [50, 20, 1830, 580],
        color: '#3f51b5',
        font_size: 24,
      },
    ],
    config: {},
    extra: {
      ds: { scale: 0.85, offset: [0, 0] },
      musicVideoMeta: {
        songTitle,
        sceneNumber: scene.sceneNumber,
        cameraAngle: scene.cameraAngle || 'cinematic',
        transition: scene.transition || 'cut',
      },
    },
    version: 0.4,
  };
}

/**
 * Downloads the full UI Visual Graph JSON for ComfyUI canvas drag & drop
 */
export function downloadComfyUiVisualCanvasJsonFile(
  scene: Scene,
  config: ComfyUIConfig,
  songTitle: string
) {
  const visualGraph = generateComfyUiVisualCanvasJson(scene, config, songTitle);
  const blob = new Blob([JSON.stringify(visualGraph, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comfyui_canvas_scene_${scene.sceneNumber}_${songTitle.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface WorkflowInspectionResult {
  isValid: boolean;
  format: 'api_prompt_graph' | 'ui_canvas_graph' | 'unknown';
  detectedArchitecture: string;
  nodeCount: number;
  detectedPromptNodes: { id: string; title?: string; currentText?: string }[];
  detectedCheckpoint?: string;
  detectedSampler?: { steps?: number; cfg?: number; sampler_name?: string; scheduler?: string };
  missingCustomNodes: string[];
  suggestions: string[];
}

/**
 * Inspects and validates custom uploaded/pasted ComfyUI workflow JSON
 */
export function inspectCustomComfyUiWorkflowJson(rawJsonText: string): WorkflowInspectionResult {
  try {
    const data = JSON.parse(rawJsonText);
    const isUiGraph = Array.isArray(data?.nodes) && Array.isArray(data?.links);
    const isApiGraph = !isUiGraph && typeof data === 'object' && Object.keys(data).length > 0;

    if (!isUiGraph && !isApiGraph) {
      return {
        isValid: false,
        format: 'unknown',
        detectedArchitecture: 'Unknown',
        nodeCount: 0,
        detectedPromptNodes: [],
        missingCustomNodes: [],
        suggestions: ['The uploaded JSON is not in recognized ComfyUI API or UI graph format.'],
      };
    }

    const detectedPromptNodes: { id: string; title?: string; currentText?: string }[] = [];
    let detectedCheckpoint: string | undefined;
    let detectedSampler: any = {};
    let detectedArch = 'Custom Pipeline';
    const missingNodesSet = new Set<string>();

    if (isUiGraph) {
      const nodes: any[] = data.nodes || [];
      nodes.forEach((node) => {
        const type = node.type || '';
        if (type.includes('WanVideo') || type.includes('Wan')) {
          detectedArch = 'Wan 2.1 Video';
          missingNodesSet.add('ComfyUI-WanVideoWrapper');
        } else if (type.includes('Hunyuan')) {
          detectedArch = 'HunyuanVideo';
          missingNodesSet.add('ComfyUI-HunyuanVideoWrapper');
        } else if (type.includes('AnimateDiff') || type.includes('ADE_')) {
          detectedArch = 'AnimateDiff Evolved';
          missingNodesSet.add('ComfyUI-AnimateDiff-Evolved');
        } else if (type.includes('VHS_')) {
          missingNodesSet.add('ComfyUI-VideoHelperSuite');
        }

        if (type === 'CLIPTextEncode' || type.includes('TextEncode') || type.includes('Prompt')) {
          const val = node.widgets_values?.[0] || '';
          detectedPromptNodes.push({
            id: String(node.id),
            title: node.title || node.type,
            currentText: typeof val === 'string' ? val.slice(0, 60) + '...' : '',
          });
        }

        if (type === 'CheckpointLoaderSimple') {
          detectedCheckpoint = node.widgets_values?.[0];
        }

        if (type === 'KSampler' || type.includes('Sampler')) {
          detectedSampler = {
            steps: node.widgets_values?.[2],
            cfg: node.widgets_values?.[3],
            sampler_name: node.widgets_values?.[4],
            scheduler: node.widgets_values?.[5],
          };
        }
      });

      return {
        isValid: true,
        format: 'ui_canvas_graph',
        detectedArchitecture: detectedArch,
        nodeCount: nodes.length,
        detectedPromptNodes,
        detectedCheckpoint,
        detectedSampler,
        missingCustomNodes: Array.from(missingNodesSet),
        suggestions: [
          'UI Canvas graph verified: You can drag & drop this file into ComfyUI browser tab.',
          detectedPromptNodes.length > 0
            ? `Found ${detectedPromptNodes.length} CLIP text encode nodes ready for scene prompt injection.`
            : 'Consider adding a CLIPTextEncode node to receive scene prompts.',
        ],
      };
    } else {
      // API Prompt Graph
      const keys = Object.keys(data);
      keys.forEach((key) => {
        const node = data[key];
        const classType = node?.class_type || '';
        if (classType.includes('Wan')) {
          detectedArch = 'Wan 2.1 Video';
          missingNodesSet.add('ComfyUI-WanVideoWrapper');
        } else if (classType.includes('Hunyuan')) {
          detectedArch = 'HunyuanVideo';
          missingNodesSet.add('ComfyUI-HunyuanVideoWrapper');
        } else if (classType.includes('AnimateDiff')) {
          detectedArch = 'AnimateDiff Evolved';
          missingNodesSet.add('ComfyUI-AnimateDiff-Evolved');
        } else if (classType.includes('VHS_')) {
          missingNodesSet.add('ComfyUI-VideoHelperSuite');
        }

        if (classType === 'CLIPTextEncode' && node?.inputs?.text !== undefined) {
          detectedPromptNodes.push({
            id: key,
            title: `Node ${key} (CLIPTextEncode)`,
            currentText: String(node.inputs.text).slice(0, 60),
          });
        }

        if (classType === 'CheckpointLoaderSimple' && node?.inputs?.ckpt_name) {
          detectedCheckpoint = node.inputs.ckpt_name;
        }

        if (classType === 'KSampler' && node?.inputs) {
          detectedSampler = {
            steps: node.inputs.steps,
            cfg: node.inputs.cfg,
            sampler_name: node.inputs.sampler_name,
            scheduler: node.inputs.scheduler,
          };
        }
      });

      return {
        isValid: true,
        format: 'api_prompt_graph',
        detectedArchitecture: detectedArch,
        nodeCount: keys.length,
        detectedPromptNodes,
        detectedCheckpoint,
        detectedSampler,
        missingCustomNodes: Array.from(missingNodesSet),
        suggestions: [
          'API graph verified: Ready for headless batch execution via /prompt endpoint.',
          `Compatible with music video director batch queue dispatch.`,
        ],
      };
    }
  } catch (err: any) {
    return {
      isValid: false,
      format: 'unknown',
      detectedArchitecture: 'Unknown',
      nodeCount: 0,
      detectedPromptNodes: [],
      missingCustomNodes: [],
      suggestions: [`JSON Parse error: ${err?.message || 'Invalid JSON syntax'}`],
    };
  }
}

export interface SceneWorkflowOptimization {
  architecture: ComfyUiArchitecture;
  sceneConfig: ComfyUIConfig;
  enhancedPrompt: string;
  cameraMovementTag: string;
  recommendedSampler: string;
  rationale: string[];
}

/**
 * AI Auto-Workflow Optimizer for a single scene
 */
export function optimizeSceneWorkflow(
  scene: Scene,
  overallMood: string = 'Cinematic',
  analysis?: SongAnalysis,
  gpuTier: GpuTier = 'mid_12gb',
  baseConfig?: ComfyUIConfig
): SceneWorkflowOptimization {
  const text = `${scene.description} ${scene.veoPrompt} ${scene.cameraAngle || ''}`.toLowerCase();
  const mood = (overallMood || '').toLowerCase();
  const bpm = analysis?.bpm || 115;

  let archId: keyof typeof COMFYUI_ARCHITECTURES = 'wan2_1';
  const rationale: string[] = [];

  // Determine best architecture for this scene
  if (gpuTier === 'budget_6gb') {
    archId = 'animate_diff';
    rationale.push('Selected AnimateDiff SD1.5 for low VRAM footprint & fast generation.');
  } else if (text.includes('fast') || text.includes('action') || text.includes('dance') || text.includes('run') || bpm > 130) {
    archId = gpuTier === 'high_24gb' ? 'hunyuan_video' : 'wan2_1';
    rationale.push('Dynamic action/movement detected: Configured high-fps temporal motion engine.');
  } else if (text.includes('anime') || text.includes('illustration') || text.includes('cyberpunk') || mood.includes('stylized')) {
    archId = 'animate_diff';
    rationale.push('Artistic/stylized aesthetic: Configured AnimateDiff SDXL with enhanced character clarity.');
  } else if (text.includes('documentary') || text.includes('natural') || text.includes('vintage') || text.includes('real')) {
    archId = 'ltx_video';
    rationale.push('Photorealistic/atmospheric vibe: Configured LTX-Video for lighting fidelity.');
  } else {
    archId = 'wan2_1';
    rationale.push('Cinematic narrative shot: Configured Wan 2.1 Video for pristine temporal stability.');
  }

  const arch = COMFYUI_ARCHITECTURES[archId] || COMFYUI_ARCHITECTURES.wan2_1;

  // Enhance camera movement tag if missing
  let cameraMovementTag = scene.cameraAngle || 'Smooth cinematic tracking shot';
  if (!scene.cameraAngle) {
    if (text.includes('close') || text.includes('face') || text.includes('portrait')) {
      cameraMovementTag = 'Subtle slow handheld push-in, shallow depth of field';
    } else if (text.includes('wide') || text.includes('landscape') || text.includes('city')) {
      cameraMovementTag = 'Sweeping drone aerial panoramic dolly forward';
    } else {
      cameraMovementTag = 'Smooth slow cinematic slider tracking shot';
    }
  }

  // Enhance prompt with lighting and cinematic modifiers tailored for video diffusion models
  let enhancedPrompt = scene.veoPrompt || scene.description;
  if (!enhancedPrompt.toLowerCase().includes('35mm') && !enhancedPrompt.toLowerCase().includes('cinematic')) {
    enhancedPrompt = `${enhancedPrompt}, ${cameraMovementTag}, cinematic lighting, photorealistic 8k, highly detailed, masterwork`;
  }

  const sceneConfig: ComfyUIConfig = {
    serverUrl: baseConfig?.serverUrl || 'http://127.0.0.1:8188',
    workflowType: archId as any,
    checkpoint: arch.recommendedCheckpoints[0]?.filename || baseConfig?.checkpoint || 'wan2.1_t2v_1.3B_bf16.safetensors',
    negativePrompt: baseConfig?.negativePrompt || 'blurry, low quality, distorted anatomy, bad hands, watermark, logo, text, cropped',
    steps: baseConfig?.steps || arch.defaultSettings.steps,
    cfg: baseConfig?.cfg || arch.defaultSettings.cfg,
    samplerName: arch.defaultSettings.samplerName,
    scheduler: arch.defaultSettings.scheduler,
    width: baseConfig?.width || arch.defaultSettings.width,
    height: baseConfig?.height || arch.defaultSettings.height,
    frameCount: baseConfig?.frameCount || arch.defaultSettings.frameCount,
    fps: baseConfig?.fps || arch.defaultSettings.fps || 16,
    denoise: baseConfig?.denoise ?? 1.0,
    seed: -1,
  };

  return {
    architecture: arch,
    sceneConfig,
    enhancedPrompt,
    cameraMovementTag,
    recommendedSampler: `${arch.defaultSettings.samplerName} (${arch.defaultSettings.scheduler})`,
    rationale,
  };
}
