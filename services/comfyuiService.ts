export interface ComfyUIConfig {
  serverUrl: string; // Default: 'http://127.0.0.1:8188'
  workflowType: 'animate_diff' | 'wan2_1' | 'hunyuan_video' | 'svd' | 'custom';
  checkpoint: string;
  negativePrompt: string;
  steps: number;
  cfg: number;
  samplerName: string;
  scheduler: string;
  width: number;
  height: number;
  frameCount: number;
  seed: number;
}

export const DEFAULT_COMFYUI_CONFIG: ComfyUIConfig = {
  serverUrl: 'http://127.0.0.1:8188',
  workflowType: 'animate_diff',
  checkpoint: 'v1-5-pruned-emaonly.safetensors',
  negativePrompt: 'blurry, low quality, distorted, bad anatomy, bad hands, text, watermark, logo, duplicate, cropped, ugly',
  steps: 20,
  cfg: 7.5,
  samplerName: 'euler_ancestral',
  scheduler: 'karras',
  width: 768,
  height: 432,
  frameCount: 16,
  seed: -1,
};

export interface ComfyUIStatus {
  online: boolean;
  message: string;
  vramFree?: string;
  device?: string;
}

/**
 * Pings the local ComfyUI server to check connectivity
 */
export const checkComfyUiStatus = async (serverUrl: string): Promise<ComfyUIStatus> => {
  const sanitizedUrl = serverUrl.replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${sanitizedUrl}/system_stats`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const data = await response.json().catch(() => ({}));
      const device = data?.devices?.[0]?.name || 'GPU Device';
      const vramFree = data?.devices?.[0]?.vram_free 
        ? `${(data.devices[0].vram_free / (1024 * 1024 * 1024)).toFixed(1)} GB`
        : undefined;

      return {
        online: true,
        message: 'ComfyUI Server is Online and Connected!',
        vramFree,
        device,
      };
    }

    return {
      online: false,
      message: `Unable to reach ComfyUI at ${sanitizedUrl}. Ensure ComfyUI is running locally with --enable-cors-header '*'.`,
    };
  } catch (err) {
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

  if (config.workflowType === 'wan2_1') {
    return {
      prompt: {
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
            "sampler_name": config.samplerName,
            "scheduler": config.scheduler,
            "denoise": 1.0,
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
            "fps": 12,
            "images": ["6", 0]
          },
          "class_type": "VHS_VideoCombine"
        }
      }
    };
  }

  // Standard AnimateDiff / SD1.5 / SDXL ComfyUI API Graph
  return {
    prompt: {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": config.steps,
          "cfg": config.cfg,
          "sampler_name": config.samplerName,
          "scheduler": config.scheduler,
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": config.checkpoint
        },
        "class_type": "CheckpointLoaderSimple"
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
          "text": positivePrompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": config.negativePrompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "AI_Music_Video_ComfyUI",
          "fps": 12,
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    }
  };
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
  } catch (err) {
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
  maxAttempts: number = 80,
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
      onProgress(`Rendering on GPU (poll ${attempts}/${maxAttempts})...`, attempts);
    }

    try {
      const historyRes = await fetch(`${sanitizedUrl}/history/${promptId}`, {
        signal,
      });

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const item = historyData[promptId];

        if (item && item.outputs) {
          // Extract output image/video file from node output
          let filename = '';
          let subfolder = '';
          let type = 'output';

          for (const nodeId of Object.keys(item.outputs)) {
            const output = item.outputs[nodeId];
            if (output.images && output.images.length > 0) {
              filename = output.images[0].filename;
              subfolder = output.images[0].subfolder || '';
              type = output.images[0].type || 'output';
              break;
            } else if (output.gifs && output.gifs.length > 0) {
              filename = output.gifs[0].filename;
              subfolder = output.gifs[0].subfolder || '';
              type = output.gifs[0].type || 'output';
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
  } catch (err) {
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
  onProgress(`Queued in ComfyUI! Prompt ID: ${promptId}. Rendering frames...`);

  return await pollComfyUiPrompt(
    config.serverUrl,
    promptId,
    (msg) => onProgress(msg),
    undefined,
    70,
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
