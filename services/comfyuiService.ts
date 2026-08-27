export interface ComfyUIConfig {
  serverUrl: string; // Default: 'http://127.0.0.1:8188'
  workflowType: 'wan2_1' | 'hunyuan_video' | 'animate_diff' | 'ltx_video' | 'svd' | 'custom';
  checkpoint: string;
  negativePrompt: string;
  steps: number;
  cfg: number;
  samplerName: string;
  scheduler: string;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  denoise: number;
  seed: number;
  loraName?: string;
  loraStrengthModel?: number;
  loraStrengthClip?: number;
  vaeName?: string;
  enableInterpolation?: boolean;
  interpolationMultiplier?: number;
  enableUpscale?: boolean;
  upscaleRatio?: number;
  motionBucketId?: number; // SVD motion intensity (1-255)
  videoFormat?: 'video/h264-mp4' | 'image/gif' | 'image/webp';
}

export const DEFAULT_COMFYUI_CONFIG: ComfyUIConfig = {
  serverUrl: 'http://127.0.0.1:8188',
  workflowType: 'wan2_1',
  checkpoint: 'wan2.1_t2v_1.3B_bf16.safetensors',
  negativePrompt: 'blurry, low quality, distorted, bad anatomy, bad hands, text, watermark, logo, duplicate, cropped, ugly, flickering, artifacts',
  steps: 30,
  cfg: 6.0,
  samplerName: 'uni_pc',
  scheduler: 'simple',
  width: 832,
  height: 480,
  frameCount: 24,
  fps: 16,
  denoise: 1.0,
  seed: -1,
  loraName: '',
  loraStrengthModel: 0.8,
  loraStrengthClip: 0.8,
  vaeName: '',
  enableInterpolation: false,
  interpolationMultiplier: 2,
  enableUpscale: false,
  upscaleRatio: 1.5,
  motionBucketId: 127,
  videoFormat: 'video/h264-mp4',
};

export const COMFYUI_CONFIG_STORAGE_KEY = 'ai_music_video_comfyui_config';

export const loadComfyUiConfig = (): ComfyUIConfig => {
  try {
    const saved = localStorage.getItem(COMFYUI_CONFIG_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_COMFYUI_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load saved ComfyUI config from localStorage:', e);
  }
  return DEFAULT_COMFYUI_CONFIG;
};

export const saveComfyUiConfig = (config: ComfyUIConfig): void => {
  try {
    localStorage.setItem(COMFYUI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save ComfyUI config to localStorage:', e);
  }
};

export interface ComfyUIStatus {
  online: boolean;
  message: string;
  vramFree?: string;
  device?: string;
  queueRemaining?: number;
  installedVideoNodes?: string[];
  missingCriticalNodes?: string[];
}

/**
 * Pings the local ComfyUI server to check connectivity, system specs, and available nodes
 */
export const checkComfyUiStatus = async (serverUrl: string): Promise<ComfyUIStatus> => {
  const sanitizedUrl = serverUrl.replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const [statsRes, queueRes] = await Promise.all([
      fetch(`${sanitizedUrl}/system_stats`, { signal: controller.signal }).catch(() => null),
      fetch(`${sanitizedUrl}/queue`, { signal: controller.signal }).catch(() => null),
    ]);

    clearTimeout(timeoutId);

    if (statsRes && statsRes.ok) {
      const data = await statsRes.json().catch(() => ({}));
      const queueData = queueRes && queueRes.ok ? await queueRes.json().catch(() => ({})) : {};

      const device = data?.devices?.[0]?.name || 'GPU / CUDA Accelerator';
      const vramFree = data?.devices?.[0]?.vram_free 
        ? `${(data.devices[0].vram_free / (1024 * 1024 * 1024)).toFixed(1)} GB`
        : undefined;

      const queueRunning = queueData?.queue_running?.length || 0;
      const queuePending = queueData?.queue_pending?.length || 0;
      const queueRemaining = queueRunning + queuePending;

      return {
        online: true,
        message: `ComfyUI Server is Online! (${device})`,
        vramFree,
        device,
        queueRemaining,
      };
    }

    return {
      online: false,
      message: `Unable to reach ComfyUI at ${sanitizedUrl}. Ensure ComfyUI is running with --enable-cors-header "*".`,
    };
  } catch {
    return {
      online: false,
      message: `Connection failed. Make sure ComfyUI is launched locally at ${sanitizedUrl}.`,
    };
  }
};

/**
 * Creates a ComfyUI REST API prompt structure (Node Graph object)
 */
export const buildComfyUiApiPayload = (
  positivePrompt: string,
  config: ComfyUIConfig,
  referenceImageBase64?: string
) => {
  const seed = config.seed === -1 ? Math.floor(Math.random() * 1000000000) : config.seed;
  const fps = config.fps || 16;
  const videoFormat = config.videoFormat || 'video/h264-mp4';

  // 1. WAN 2.1 Video Pipeline (T2V & I2V)
  if (config.workflowType === 'wan2_1') {
    const promptGraph: Record<string, any> = {
      "1": {
        "inputs": {
          "ckpt_name": config.checkpoint || "wan2.1_t2v_1.3B_bf16.safetensors"
        },
        "class_type": "WanVideoModelLoader"
      },
      "2": {
        "inputs": {
          "text": positivePrompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "3": {
        "inputs": {
          "text": config.negativePrompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "4": {
        "inputs": {
          "seed": seed,
          "steps": config.steps,
          "cfg": config.cfg,
          "sampler_name": config.samplerName || "uni_pc",
          "scheduler": config.scheduler || "simple",
          "denoise": config.denoise || 1.0,
          "model": ["1", 0],
          "positive": ["2", 0],
          "negative": ["3", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "5": {
        "inputs": {
          "width": config.width,
          "height": config.height,
          "batch_size": config.frameCount
        },
        "class_type": "EmptyWanVideoLatent"
      },
      "6": {
        "inputs": {
          "samples": ["4", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEDecode"
      },
      "7": {
        "inputs": {
          "filename_prefix": "AI_Music_Video_Wan2.1",
          "fps": fps,
          "images": ["6", 0],
          "format": videoFormat
        },
        "class_type": "VHS_VideoCombine"
      }
    };

    return { prompt: promptGraph };
  }

  // 2. HUNYUAN VIDEO PIPELINE
  if (config.workflowType === 'hunyuan_video') {
    const promptGraph: Record<string, any> = {
      "1": {
        "inputs": {
          "model_name": config.checkpoint || "hunyuan_video_t2v_720p.safetensors"
        },
        "class_type": "HunyuanVideoModelLoader"
      },
      "2": {
        "inputs": {
          "text": positivePrompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "3": {
        "inputs": {
          "text": config.negativePrompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "4": {
        "inputs": {
          "seed": seed,
          "steps": config.steps,
          "cfg": config.cfg,
          "sampler_name": config.samplerName || "dpmpp_2m",
          "scheduler": config.scheduler || "karras",
          "denoise": config.denoise || 1.0,
          "model": ["1", 0],
          "positive": ["2", 0],
          "negative": ["3", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "5": {
        "inputs": {
          "width": config.width,
          "height": config.height,
          "length": config.frameCount,
          "batch_size": 1
        },
        "class_type": "HunyuanVideoEmptyLatent"
      },
      "6": {
        "inputs": {
          "samples": ["4", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEDecode"
      },
      "7": {
        "inputs": {
          "filename_prefix": "AI_Music_Video_Hunyuan",
          "fps": fps,
          "images": ["6", 0],
          "format": videoFormat
        },
        "class_type": "VHS_VideoCombine"
      }
    };

    return { prompt: promptGraph };
  }

  // 3. LTX-VIDEO PIPELINE
  if (config.workflowType === 'ltx_video') {
    const promptGraph: Record<string, any> = {
      "1": {
        "inputs": {
          "ckpt_name": config.checkpoint || "ltx-video-2b-v0.9.1.safetensors"
        },
        "class_type": "LTXVideoLoader"
      },
      "2": {
        "inputs": {
          "text": positivePrompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "3": {
        "inputs": {
          "text": config.negativePrompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "4": {
        "inputs": {
          "seed": seed,
          "steps": config.steps,
          "cfg": config.cfg,
          "sampler_name": config.samplerName || "euler",
          "scheduler": config.scheduler || "simple",
          "denoise": config.denoise || 1.0,
          "model": ["1", 0],
          "positive": ["2", 0],
          "negative": ["3", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "5": {
        "inputs": {
          "width": config.width,
          "height": config.height,
          "length": config.frameCount,
          "batch_size": 1
        },
        "class_type": "LTXEmptyLatent"
      },
      "6": {
        "inputs": {
          "samples": ["4", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEDecode"
      },
      "7": {
        "inputs": {
          "filename_prefix": "AI_Music_Video_LTX",
          "fps": fps,
          "images": ["6", 0],
          "format": videoFormat
        },
        "class_type": "VHS_VideoCombine"
      }
    };

    return { prompt: promptGraph };
  }

  // 4. STABLE VIDEO DIFFUSION (SVD / SVD-XT)
  if (config.workflowType === 'svd') {
    const promptGraph: Record<string, any> = {
      "1": {
        "inputs": {
          "ckpt_name": config.checkpoint || "svd_xt.safetensors"
        },
        "class_type": "ImageOnlyCheckpointLoader"
      },
      "2": {
        "inputs": {
          "width": config.width,
          "height": config.height,
          "video_frames": config.frameCount,
          "motion_bucket_id": config.motionBucketId || 127,
          "fps": fps,
          "augmentation_level": 0.0,
          "clip_vision": ["1", 1],
          "init_image": ["3", 0],
          "vae": ["1", 2]
        },
        "class_type": "SVD_img2vid_Conditioning"
      },
      "3": {
        "inputs": {
          "image": "reference_storyboard_shot.png",
          "upload": "image"
        },
        "class_type": "LoadImage"
      },
      "4": {
        "inputs": {
          "seed": seed,
          "steps": config.steps,
          "cfg": config.cfg || 2.5,
          "sampler_name": config.samplerName || "euler",
          "scheduler": config.scheduler || "karras",
          "denoise": 1.0,
          "model": ["1", 0],
          "positive": ["2", 0],
          "negative": ["2", 1],
          "latent_image": ["2", 2]
        },
        "class_type": "KSampler"
      },
      "5": {
        "inputs": {
          "samples": ["4", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEDecode"
      },
      "6": {
        "inputs": {
          "filename_prefix": "AI_Music_Video_SVD",
          "fps": fps,
          "images": ["5", 0],
          "format": videoFormat
        },
        "class_type": "VHS_VideoCombine"
      }
    };

    return { prompt: promptGraph };
  }

  // 5. ANIMATEDIFF & GENERAL SD1.5 / SDXL PIPELINE
  const promptGraph: Record<string, any> = {
    "1": {
      "inputs": {
        "ckpt_name": config.checkpoint || "dreamshaper_8.safetensors"
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "2": {
      "inputs": {
        "model_name": "v3_sd15_mm.ckpt",
        "beta_schedule": "sqrt_linear (AnimateDiff)",
        "model": ["1", 0]
      },
      "class_type": "AnimateDiffLoaderGen1"
    },
    "3": {
      "inputs": {
        "text": positivePrompt,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "4": {
      "inputs": {
        "text": config.negativePrompt,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "5": {
      "inputs": {
        "width": config.width,
        "height": config.height,
        "batch_size": config.frameCount
      },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": {
        "seed": seed,
        "steps": config.steps,
        "cfg": config.cfg,
        "sampler_name": config.samplerName || "euler_ancestral",
        "scheduler": config.scheduler || "karras",
        "denoise": config.denoise || 1.0,
        "model": ["2", 0],
        "positive": ["3", 0],
        "negative": ["4", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "7": {
      "inputs": {
        "samples": ["6", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode"
    },
    "8": {
      "inputs": {
        "filename_prefix": "AI_Music_Video_AnimateDiff",
        "fps": fps,
        "images": ["7", 0],
        "format": videoFormat
      },
      "class_type": "VHS_VideoCombine"
    }
  };

  return { prompt: promptGraph };
};

/**
 * Download Workflow JSON file for manual drag & drop into ComfyUI Desktop
 */
export const downloadComfyUiWorkflowJson = (
  positivePrompt: string,
  sceneNumber: number,
  config: ComfyUIConfig
) => {
  const apiPayload = buildComfyUiApiPayload(positivePrompt, config);
  const content = JSON.stringify(apiPayload, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comfyui_scene_${sceneNumber}_api_workflow.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Sends a prompt payload to ComfyUI /prompt endpoint and returns the prompt_id
 */
export const queueComfyUiPrompt = async (
  promptText: string,
  config: ComfyUIConfig,
  referenceImageBase64?: string
): Promise<string> => {
  const sanitizedUrl = config.serverUrl.replace(/\/$/, '');
  const payload = buildComfyUiApiPayload(
    promptText,
    config,
    referenceImageBase64
  );

  let response: Response;
  try {
    response = await fetch(`${sanitizedUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Failed to connect to ComfyUI at ${sanitizedUrl}. Verify ComfyUI is running with --enable-cors-header "*".`
    );
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ComfyUI API Error (${response.status}): ${errText || 'Invalid request parameters.'}`);
  }

  const data = await response.json();
  const promptId = data.prompt_id;

  if (!promptId) {
    throw new Error('ComfyUI did not return a prompt_id.');
  }

  return promptId;
};

/**
 * Polls ComfyUI /history/{promptId} until completed or timed out
 */
export const pollComfyUiPrompt = async (
  serverUrl: string,
  promptId: string,
  onProgress?: (status: string, attempt: number) => void,
  signal?: AbortSignal,
  maxAttempts: number = 90,
  pollIntervalMs: number = 2500
): Promise<string> => {
  const sanitizedUrl = serverUrl.replace(/\/$/, '');
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      throw new Error('Generation cancelled by user.');
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    attempts++;

    if (onProgress) {
      onProgress(`Rendering on GPU (step check ${attempts}/${maxAttempts})...`, attempts);
    }

    try {
      const historyRes = await fetch(`${sanitizedUrl}/history/${promptId}`, {
        signal,
      });

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const item = historyData[promptId];

        if (item && item.outputs) {
          // Extract output video / gif / image files
          let filename = '';
          let subfolder = '';
          let type = 'output';

          for (const nodeId of Object.keys(item.outputs)) {
            const output = item.outputs[nodeId];
            if (output.videos && output.videos.length > 0) {
              filename = output.videos[0].filename;
              subfolder = output.videos[0].subfolder || '';
              type = output.videos[0].type || 'output';
              break;
            } else if (output.gifs && output.gifs.length > 0) {
              filename = output.gifs[0].filename;
              subfolder = output.gifs[0].subfolder || '';
              type = output.gifs[0].type || 'output';
              break;
            } else if (output.images && output.images.length > 0) {
              filename = output.images[0].filename;
              subfolder = output.images[0].subfolder || '';
              type = output.images[0].type || 'output';
              break;
            }
          }

          if (filename) {
            const mediaUrl = `${sanitizedUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`;
            return mediaUrl;
          }
        }
      }
    } catch (e: any) {
      if (signal?.aborted) {
        throw new Error('Generation cancelled by user.');
      }
      // Continue polling on transient network hiccups
    }
  }

  throw new Error(`ComfyUI render timed out after ${maxAttempts} attempts (${(maxAttempts * pollIntervalMs) / 1000}s).`);
};

/**
 * Sends interrupt signal to ComfyUI to halt current GPU execution
 */
export const interruptComfyUi = async (serverUrl: string): Promise<boolean> => {
  const sanitizedUrl = serverUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${sanitizedUrl}/interrupt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Triggers video generation on local ComfyUI API (Single scene wrapper)
 */
export const generateVideoWithComfyUI = async (
  promptText: string,
  referenceImage: { imageBytes: string; mimeType: string } | null,
  config: ComfyUIConfig,
  onProgress: (status: string) => void
): Promise<string> => {
  const sanitizedUrl = config.serverUrl.replace(/\/$/, '');
  onProgress(`Connecting to local ComfyUI at ${sanitizedUrl}...`);

  const promptId = await queueComfyUiPrompt(promptText, config, referenceImage?.imageBytes);
  onProgress(`Queued in ComfyUI! Prompt ID: ${promptId}. Rendering frames on GPU...`);

  return await pollComfyUiPrompt(
    config.serverUrl,
    promptId,
    (msg) => onProgress(msg),
    undefined,
    80,
    3000
  );
};

/**
 * Downloads a combined Batch Workflows JSON file for all scenes
 */
export const downloadBatchComfyUiWorkflowsJson = (
  scenes: { sceneNumber: number; prompt: string }[],
  config: ComfyUIConfig,
  songTitle: string
) => {
  const batchData = {
    metadata: {
      generatedBy: 'AI Music Video Director',
      songTitle: songTitle || 'Untitled Music Video',
      timestamp: new Date().toISOString(),
      sceneCount: scenes.length,
      config,
    },
    scenes: scenes.map((s, idx) => {
      const sceneConfig = {
        ...config,
        seed: config.seed === -1 ? Math.floor(Math.random() * 1000000000) : config.seed + idx,
      };
      return {
        sceneNumber: s.sceneNumber,
        prompt: s.prompt,
        payload: buildComfyUiApiPayload(s.prompt, sceneConfig),
      };
    }),
  };

  const content = JSON.stringify(batchData, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (songTitle || 'music_video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.download = `${safeTitle}_comfyui_batch_${scenes.length}_scenes.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Downloads a bash shell script to queue all prompts using cURL
 */
export const downloadBatchCurlScript = (
  scenes: { sceneNumber: number; prompt: string }[],
  config: ComfyUIConfig,
  songTitle: string
) => {
  const sanitizedUrl = config.serverUrl.replace(/\/$/, '');
  const lines: string[] = [
    '#!/bin/bash',
    `# ComfyUI Batch Generator for "${songTitle || 'Music Video'}"`,
    `# Total Scenes: ${scenes.length}`,
    `# Server: ${sanitizedUrl}`,
    '',
    `SERVER_URL="${sanitizedUrl}"`,
    'echo "🚀 Starting ComfyUI Batch Video Generation for ' + (songTitle || 'Music Video') + '..."',
    'echo "Target Server: $SERVER_URL"',
    '',
  ];

  scenes.forEach((s, idx) => {
    const sceneConfig = {
      ...config,
      seed: config.seed === -1 ? Math.floor(Math.random() * 1000000000) : config.seed + idx,
    };
    const payloadJson = JSON.stringify(buildComfyUiApiPayload(s.prompt, sceneConfig));
    const escapedJson = payloadJson.replace(/'/g, "'\\''");

    lines.push(`echo "----------------------------------------"`);
    lines.push(`echo "[${idx + 1}/${scenes.length}] Queueing Scene ${s.sceneNumber}..."`);
    lines.push(`curl -s -X POST "$SERVER_URL/prompt" -H "Content-Type: application/json" -d '${escapedJson}'`);
    lines.push(`echo ""`);
    lines.push(`sleep 1`);
    lines.push('');
  });

  lines.push('echo "✅ All ' + scenes.length + ' scenes dispatched to ComfyUI Queue!"');

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/x-sh' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (songTitle || 'music_video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.download = `queue_comfyui_batch_${safeTitle}.sh`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
