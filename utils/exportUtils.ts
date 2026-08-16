import { VideoScript, Scene, LyricLine } from '../types';

export type ExportFormat = 'txt' | 'json' | 'csv' | 'davinci_csv' | 'premiere_csv' | 'cmx_edl' | 'webhook';

export interface FrameRateConfig {
  fps: number; // e.g., 24, 25, 29.97, 30, 60
}

/**
 * Converts seconds to a standard NLE Timecode format (HH:MM:SS:FF)
 */
export const secondsToTimecode = (totalSeconds: number, fps: number = 24): string => {
  if (totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00:00:00';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds % 1) * fps);

  const pad = (num: number, size: number = 2) => String(num).padStart(size, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
};

/**
 * Format MM:SS for human readability
 */
export const formatTimeMMSS = (totalSeconds: number | undefined): string => {
  if (totalSeconds === undefined || isNaN(totalSeconds)) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Formats lyrics into a clean string representation
 */
const formatLyricsText = (lyrics: LyricLine[] | string): string => {
  if (typeof lyrics === 'string') return lyrics;
  if (!Array.isArray(lyrics) || lyrics.length === 0) return '(Instrumental / No lyrics)';
  return lyrics.map(l => `[${formatTimeMMSS(l.timestampSeconds)}] ${l.text}`).join(' | ');
};

/**
 * Generate Plain Text (.txt) format
 */
export const generateTxtExport = (script: VideoScript): string => {
  let content = `========================================\n`;
  content += `MUSIC VIDEO SCRIPT: ${script.title.toUpperCase()}\n`;
  content += `Mood: ${script.overallMood}\n`;
  content += `========================================\n\n`;

  if (script.analysis) {
    content += `----------------------------------------\n`;
    content += `SONG ANALYSIS\n`;
    content += `----------------------------------------\n`;
    content += `Tempo: ${script.analysis.bpm} BPM\n`;
    content += `Musical Key: ${script.analysis.musicalKey}\n`;
    content += `Dynamics: ${script.analysis.dynamics}\n`;
    content += `Instrumentation: ${script.analysis.instrumentation.join(', ')}\n`;
    content += `Lyrical Themes: ${script.analysis.lyricalThemes.join(', ')}\n`;
    content += `Suggested Colors: ${script.analysis.suggestedColorPalette.map(c => `${c.hex} (${c.reason})`).join(', ')}\n\n`;
  }

  if (script.consistentElements) {
    const { characters, props } = script.consistentElements;
    if (characters.length > 0 || props.length > 0) {
      content += `----------------------------------------\n`;
      content += `CONSISTENT VISUAL ELEMENTS\n`;
      content += `----------------------------------------\n`;
      if (characters.length > 0) {
        content += `Characters:\n`;
        characters.forEach(c => { content += `- ${c.name}: ${c.description}\n`; });
      }
      if (props.length > 0) {
        content += `Props:\n`;
        props.forEach(p => { content += `- ${p.name}: ${p.description}\n`; });
      }
      content += `\n`;
    }
  }

  content += `========================================\n`;
  content += `SCENE SHOT LIST & PROMPTS\n`;
  content += `========================================\n\n`;

  script.scenes.forEach(scene => {
    const startSec = scene.startTimeSeconds ?? 0;
    const endSec = scene.endTimeSeconds ?? 0;
    content += `SCENE ${scene.sceneNumber} [${formatTimeMMSS(startSec)} - ${formatTimeMMSS(endSec)}]\n`;
    if (scene.transition) content += `Transition: ${scene.transition}\n`;
    if (scene.cameraAngle) content += `Camera Angle: ${scene.cameraAngle}\n`;
    content += `Description: ${scene.description}\n`;
    content += `Lyrics: ${formatLyricsText(scene.correspondingLyrics)}\n`;
    content += `VEO / ComfyUI Prompt:\n${scene.veoPrompt}\n`;
    content += `----------------------------------------\n\n`;
  });

  return content;
};

/**
 * Generate Standard CSV format for spreadsheets and data tools
 */
export const generateStandardCsvExport = (script: VideoScript): string => {
  const headers = [
    'Scene Number',
    'Start Time (MM:SS)',
    'End Time (MM:SS)',
    'Duration (Seconds)',
    'Camera Angle',
    'Transition',
    'Scene Description',
    'Lyrics',
    'Prompt / Directive'
  ];

  const escapeCsv = (val: string | number | undefined): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [headers.join(',')];

  script.scenes.forEach((scene) => {
    const startSec = scene.startTimeSeconds ?? 0;
    const endSec = scene.endTimeSeconds ?? 0;
    const duration = Math.max(0, endSec - startSec);

    const row = [
      escapeCsv(scene.sceneNumber),
      escapeCsv(formatTimeMMSS(startSec)),
      escapeCsv(formatTimeMMSS(endSec)),
      escapeCsv(duration.toFixed(2)),
      escapeCsv(scene.cameraAngle || 'Standard'),
      escapeCsv(scene.transition || 'Cut'),
      escapeCsv(scene.description),
      escapeCsv(formatLyricsText(scene.correspondingLyrics)),
      escapeCsv(scene.veoPrompt)
    ];

    rows.push(row.join(','));
  });

  return rows.join('\n');
};

/**
 * Generate DaVinci Resolve Markers & Shotlist CSV format
 * Specifically structured for import into DaVinci Resolve Timelines/Media Pool as Markers or Shot list
 */
export const generateDaVinciCsvExport = (script: VideoScript, fps: number = 24): string => {
  // CSV Headers compatible with DaVinci Resolve Marker CSV & NLE Shot List
  const headers = [
    'Scene Number',
    'Marker Name',
    'Source In',
    'Source Out',
    'Duration (Sec)',
    'Camera Angle',
    'Transition',
    'Clip Description',
    'Lyrics',
    'VEO Prompt / Generation Directive',
    'Color'
  ];

  const escapeCsv = (val: string | number | undefined): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [];
  rows.push(headers.join(','));

  // Define marker colors for DaVinci Resolve
  const colors = ['Blue', 'Cyan', 'Green', 'Yellow', 'Red', 'Pink', 'Purple', 'Fuchsia'];

  script.scenes.forEach((scene, index) => {
    const startSec = scene.startTimeSeconds ?? index * 8;
    const endSec = scene.endTimeSeconds ?? (index + 1) * 8;
    const duration = Math.max(0, endSec - startSec);
    const tcIn = secondsToTimecode(startSec, fps);
    const tcOut = secondsToTimecode(endSec, fps);
    const color = colors[index % colors.length];

    const row = [
      escapeCsv(scene.sceneNumber),
      escapeCsv(`SC_${String(scene.sceneNumber).padStart(2, '0')} - ${scene.cameraAngle || 'Shot'}`),
      escapeCsv(tcIn),
      escapeCsv(tcOut),
      escapeCsv(duration.toFixed(2)),
      escapeCsv(scene.cameraAngle || 'Standard'),
      escapeCsv(scene.transition || 'Cut'),
      escapeCsv(scene.description),
      escapeCsv(formatLyricsText(scene.correspondingLyrics)),
      escapeCsv(scene.veoPrompt),
      escapeCsv(color)
    ];

    rows.push(row.join(','));
  });

  return rows.join('\n');
};

/**
 * Generate Adobe Premiere Pro Markers CSV format
 * Formatted specifically for Adobe Premiere Pro timeline marker import
 */
export const generatePremiereCsvExport = (script: VideoScript, fps: number = 24): string => {
  const headers = [
    'Marker Name',
    'Description',
    'In',
    'Out',
    'Duration',
    'Marker Type',
    'Log Note',
    'Comments'
  ];

  const escapeCsv = (val: string | number | undefined): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [];
  rows.push(headers.join(','));

  script.scenes.forEach((scene, index) => {
    const startSec = scene.startTimeSeconds ?? index * 8;
    const endSec = scene.endTimeSeconds ?? (index + 1) * 8;
    const durationSec = Math.max(0, endSec - startSec);

    const tcIn = secondsToTimecode(startSec, fps);
    const tcOut = secondsToTimecode(endSec, fps);
    const tcDuration = secondsToTimecode(durationSec, fps);

    const markerName = `Scene ${scene.sceneNumber}: ${scene.cameraAngle || 'Shot'}`;
    const description = `${scene.description} | Prompt: ${scene.veoPrompt}`;
    const logNote = `Lyrics: ${formatLyricsText(scene.correspondingLyrics)}`;
    const comments = `Transition: ${scene.transition || 'Cut'} | Key: ${script.analysis?.musicalKey || 'N/A'}`;

    const row = [
      escapeCsv(markerName),
      escapeCsv(description),
      escapeCsv(tcIn),
      escapeCsv(tcOut),
      escapeCsv(tcDuration),
      escapeCsv('Comment'),
      escapeCsv(logNote),
      escapeCsv(comments)
    ];

    rows.push(row.join(','));
  });

  return rows.join('\n');
};

/**
 * Generate CMX 3600 EDL (Edit Decision List) for NLE Timeline Import
 * Standard format supported by Premiere, Resolve, Final Cut Pro, Lightworks, Avid
 */
export const generateCmxEdlExport = (script: VideoScript, fps: number = 24): string => {
  let edl = `TITLE: ${script.title.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}\n`;
  edl += `FCM: NON-DROP FRAME\n\n`;

  let recTimeAccumulator = 0;

  script.scenes.forEach((scene, index) => {
    const eventNum = String(index + 1).padStart(3, '0');
    const startSec = scene.startTimeSeconds ?? index * 8;
    const endSec = scene.endTimeSeconds ?? (index + 1) * 8;
    const duration = Math.max(0, endSec - startSec);

    const srcIn = secondsToTimecode(0, fps);
    const srcOut = secondsToTimecode(duration, fps);
    const recIn = secondsToTimecode(recTimeAccumulator, fps);
    recTimeAccumulator += duration;
    const recOut = secondsToTimecode(recTimeAccumulator, fps);

    const reelName = `AX_${String(scene.sceneNumber).padStart(2, '0')}`;
    const transitionCode = (scene.transition && scene.transition.toLowerCase().includes('dissolve')) ? 'D  024' : 'C    ';

    edl += `${eventNum}  ${reelName} V     ${transitionCode} ${srcIn} ${srcOut} ${recIn} ${recOut}\n`;
    edl += `* FROM CLIP: SCENE_${scene.sceneNumber}\n`;
    edl += `* COMMENT: ${scene.description.slice(0, 100)}\n`;
    edl += `* VEO_PROMPT: ${scene.veoPrompt.slice(0, 120)}\n\n`;
  });

  return edl;
};

/**
 * Generate Structured JSON format with rich NLE metadata
 */
export const generateJsonExport = (script: VideoScript, fps: number = 24): string => {
  const exportData = {
    $schema: 'https://ai-music-video-director/schema/v1.json',
    generator: 'AI Music Video Director - NLE Export Engine',
    exportedAt: new Date().toISOString(),
    fps: fps,
    project: {
      title: script.title,
      overallMood: script.overallMood,
      totalScenes: script.scenes.length,
      estimatedDurationSeconds: script.scenes.length > 0 ? (script.scenes[script.scenes.length - 1].endTimeSeconds ?? 0) : 0,
    },
    songAnalysis: script.analysis || null,
    consistentElements: script.consistentElements || null,
    nleTimeline: {
      format: 'NLE Markers & Shot Sequence',
      scenes: script.scenes.map(scene => {
        const startSec = scene.startTimeSeconds ?? 0;
        const endSec = scene.endTimeSeconds ?? 0;
        return {
          sceneNumber: scene.sceneNumber,
          timing: {
            startSeconds: startSec,
            endSeconds: endSec,
            durationSeconds: Math.max(0, endSec - startSec),
            timecodeIn: secondsToTimecode(startSec, fps),
            timecodeOut: secondsToTimecode(endSec, fps),
            frameIn: Math.floor(startSec * fps),
            frameOut: Math.floor(endSec * fps),
          },
          transition: scene.transition || 'Cut',
          cameraAngle: scene.cameraAngle || 'Standard',
          description: scene.description,
          lyrics: scene.correspondingLyrics,
          prompts: {
            veo: scene.veoPrompt,
            comfyuiPositive: scene.veoPrompt,
            comfyuiNegative: 'blurry, low quality, distorted, bad anatomy, ugly, oversaturated, watermark, text',
          },
          videoUrl: scene.videoUrl || null,
        };
      })
    }
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Generate Remote API Webhook Payload
 */
export const generateWebhookExport = (script: VideoScript, webhookUrl: string = 'http://127.0.0.1:8188/prompt'): string => {
  const webhookData = {
    event: 'remote_generation_task_created',
    timestamp: new Date().toISOString(),
    targetEndpoint: webhookUrl,
    scriptInfo: {
      title: script.title,
      overallMood: script.overallMood,
      totalScenes: script.scenes.length,
      bpm: script.analysis?.bpm || 120,
      musicalKey: script.analysis?.musicalKey || 'Unknown',
    },
    batchGenerationTasks: script.scenes.map(scene => ({
      sceneNumber: scene.sceneNumber,
      timecode: {
        startSeconds: scene.startTimeSeconds ?? 0,
        endSeconds: scene.endTimeSeconds ?? 0,
        durationSeconds: (scene.endTimeSeconds ?? 0) - (scene.startTimeSeconds ?? 0),
      },
      camera: {
        angle: scene.cameraAngle || 'Standard',
        transition: scene.transition || 'Cut',
      },
      visuals: {
        description: scene.description,
        veoPrompt: scene.veoPrompt,
        comfyuiNodePrompt: scene.veoPrompt,
      },
      lyrics: typeof scene.correspondingLyrics === 'string'
        ? scene.correspondingLyrics
        : (scene.correspondingLyrics || []).map(l => l.text).join(' '),
    }))
  };

  return JSON.stringify(webhookData, null, 2);
};

/**
 * Generate ready-to-use cURL command for external API post
 */
export const generateCurlCommand = (script: VideoScript, webhookUrl: string = 'http://127.0.0.1:8188/webhook'): string => {
  const payload = generateWebhookExport(script, webhookUrl);
  // Escaping single quotes in JSON for bash shell
  const singleLineJson = JSON.stringify(JSON.parse(payload));
  return `curl -X POST "${webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "User-Agent: AIMusicVideoDirector/1.0" \\\n  -d '${singleLineJson}'`;
};

/**
 * Helper to trigger browser file download for exports
 */
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
