import React, { useState, useEffect } from 'react';
import { Scene, LyricLine, ElementWithImage, ConsistentElements, ColorSuggestion, LlmProvider, OllamaConfig } from '../types';
import { 
  ClipboardIcon, 
  CheckIcon, 
  CameraIcon, 
  ViewfinderIcon, 
  ClockIcon, 
  PencilIcon, 
  InformationCircleIcon, 
  FilmIcon, 
  ArrowPathIcon, 
  SwatchIcon, 
  SparklesIcon, 
  BoltIcon, 
  PlayIcon,
  PhotoIcon,
  DownloadIcon,
  CheckCircle2Icon,
  XCircleIcon,
  CpuIcon,
  CodeBracketIcon
} from './icons/Icons';
import { generateVeoPrompt, generateVideoFromPrompt } from '../services/geminiService';
import { ComfyUIConfig, generateVideoWithComfyUI, downloadComfyUiWorkflowJson, buildComfyUiApiPayload } from '../services/comfyuiService';
import { generateProceduralSceneVideo } from '../utils/motionVideoGenerator';
import { 
  generateSceneThumbnailWithImagen, 
  buildCinematicThumbnailPrompt, 
  generateProceduralStoryboardArtwork 
} from '../services/imagenService';
import { enhanceScenePromptWithOllama } from '../services/ollamaService';
import Loader from './Loader';

interface SceneCardProps {
  scene: Scene;
  isEditing: boolean;
  overallMood: string;
  elementsWithImages: ElementWithImage[];
  consistentElements?: ConsistentElements;
  colorPalette?: ColorSuggestion[];
  engineMode?: 'veo' | 'comfyui';
  comfyConfig?: ComfyUIConfig;
  llmProvider?: LlmProvider;
  ollamaConfig?: OllamaConfig;
  onEdit: () => void;
  onSave: (scene: Scene) => void;
  onCancel: () => void;
  onApiKeyError: () => void;
  onOpenPromptLibrary?: (sceneNumber: number) => void;
}

const formatTime = (totalSeconds: number | undefined): string => {
  if (totalSeconds === undefined || isNaN(totalSeconds)) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Converts a structured lyrics array into a single string for a textarea.
 * @param lyrics The array of LyricLine objects or a simple string.
 * @returns A formatted string, e.g., "[00:12] Hello world".
 */
const lyricsToStringForEditor = (lyrics: LyricLine[] | string): string => {
    if (typeof lyrics === 'string') {
        return lyrics;
    }
    if (!Array.isArray(lyrics)) return '';
    return lyrics
        .map(line => `[${formatTime(line.timestampSeconds)}] ${line.text}`)
        .join('\n');
};

/**
 * Parses a string from a textarea back into a structured lyrics array or a plain string.
 * This function is designed to be robust and handle common user input variations.
 *
 * - It detects lines with a `[MM:SS]` or `[M:S]` timestamp format, tolerating extra whitespace.
 * - If any line contains a timestamp, the function commits to a structured `LyricLine[]` output.
 *   In this mode, any lines without a valid timestamp are ignored to maintain data integrity.
 * - Timestamped lines that have no lyric text are also ignored, preventing empty entries.
 * - If no timestamps are detected in the entire input, the function returns the original text as a single trimmed string.
 *
 * @param text The string containing lyrics from the editor.
 * @returns An array of LyricLine objects, or a simple string.
 */
const stringToLyricsForSave = (text: string): LyricLine[] | string => {
    const lines = text.trim().split('\n');
    // Regex to capture timestamps like [01:05], [1:05], [ 1 : 5 ], etc.
    // It captures 1-2 digits for minutes and seconds, allowing for flexible spacing.
    const timestampRegex = /^\[\s*(\d{1,2})\s*:\s*(\d{1,2})\s*\]\s*(.*)/;
    
    const parsedLines: LyricLine[] = [];
    let hasTimestamp = false;

    for (const line of lines) {
        const match = line.trim().match(timestampRegex);
        if (match) {
            hasTimestamp = true; // We found at least one line that looks like a timestamp.
            
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const lyricText = match[3].trim();

            // IMPORTANT: Only create a lyric line if there is actual text content
            // after the timestamp. This ignores empty lines like "[01:15]".
            if (lyricText) {
                parsedLines.push({ 
                    text: lyricText, 
                    timestampSeconds: (minutes * 60) + seconds 
                });
            }
        }
    }

    // If any line in the input had a timestamp format, we return the structured
    // array. This array might be empty if all timestamped lines had no text,
    // which is valid (e.g., for an instrumental section being cleared).
    if (hasTimestamp) {
        return parsedLines;
    }

    // If no timestamps were found at all, we treat the entire input as a single
    // block of plain text (e.g., "Instrumental Break").
    return text.trim();
};

/**
 * Validates the lyrics string for correct timestamp formatting.
 * @param text The string from the lyrics textarea.
 * @returns An object with `isValid` and an `error` message string if invalid.
 */
const validateLyricsString = (text: string): { isValid: boolean; error: string | null } => {
    const lines = text.trim().split('\n');
    const timestampRegex = /^\[\s*(\d{1,2})\s*:\s*(\d{1,2})\s*\]/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const match = line.match(timestampRegex);
        if (match) {
            const minutesStr = match[1];
            const secondsStr = match[2];
            
            const minutes = parseInt(minutesStr, 10);
            const seconds = parseInt(secondsStr, 10);

            if (isNaN(minutes) || isNaN(seconds)) {
                 return { isValid: false, error: `Invalid number in timestamp on line ${i + 1}.` };
            }

            if (seconds < 0 || seconds > 59) {
                return { isValid: false, error: `Seconds must be between 0 and 59 on line ${i + 1} (found: ${secondsStr}).` };
            }
        }
    }

    return { isValid: true, error: null };
};

// FIX: Corrected types to use React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
/**
 * Renders an error message string, parsing and converting any markdown-style
 * links into clickable <a> tags.
 * @param message The error message to format.
 * @returns A JSX element containing the formatted message.
 */
const formatErrorMessage = (message: string): React.ReactNode => {
  // Regex to find markdown-style links: [text](url)
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(message)) !== null) {
    // Push the text before the link
    if (match.index > lastIndex) {
      parts.push(message.substring(lastIndex, match.index));
    }
    
    const [_fullMatch, linkText, url] = match;
    
    // Push the link as a JSX element
    parts.push(
      <a 
        key={url} 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="underline font-semibold hover:text-indigo-300 transition-colors"
      >
        {linkText}
      </a>
    );
    
    lastIndex = linkRegex.lastIndex;
  }

  // Push the remaining text after the last link
  if (lastIndex < message.length) {
    parts.push(message.substring(lastIndex));
  }

  return <>{parts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>)}</>;
};


const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  overallMood,
  elementsWithImages,
  consistentElements,
  colorPalette,
  engineMode = 'veo',
  comfyConfig,
  llmProvider = 'gemini',
  ollamaConfig,
  onApiKeyError,
  onOpenPromptLibrary,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedComfy, setCopiedComfy] = useState(false);
  const [editedScene, setEditedScene] = useState<Scene>(scene);
  const [lyricsString, setLyricsString] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // State for video generation
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // State for Imagen thumbnail generation
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [thumbnailStatus, setThumbnailStatus] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [showThumbnailLightbox, setShowThumbnailLightbox] = useState(false);
  const [previewTab, setPreviewTab] = useState<'thumbnail' | 'video'>(scene.thumbnailUrl ? 'thumbnail' : 'video');
  const [isEditingCustomThumbnailPrompt, setIsEditingCustomThumbnailPrompt] = useState(false);
  const [customThumbnailPrompt, setCustomThumbnailPrompt] = useState('');

  useEffect(() => {
    // When the component receives a new scene or the editing state changes, reset its internal state.
    setEditedScene(scene);
    setValidationError(null); // Clear validation error on state change
    if (isEditing) {
      setLyricsString(lyricsToStringForEditor(scene.correspondingLyrics));
    }
  }, [scene, isEditing]);

  const handleGenerateThumbnail = async (overridePrompt?: string) => {
    setIsGeneratingThumbnail(true);
    setThumbnailError(null);
    setThumbnailStatus('Synthesizing cinematic thumbnail with Google Imagen 3...');

    const promptToUse = overridePrompt || (
      scene.thumbnailPrompt || 
      buildCinematicThumbnailPrompt(scene, overallMood, consistentElements, colorPalette)
    );

    try {
      const thumbnailUrl = await generateSceneThumbnailWithImagen(
        promptToUse,
        (status) => setThumbnailStatus(status)
      );
      const updatedScene = { ...scene, thumbnailUrl, thumbnailPrompt: promptToUse };
      onSave(updatedScene);
      setThumbnailError(null);
      setPreviewTab('thumbnail');
    } catch (err: any) {
      console.error("Thumbnail generation error:", err);
      const errMsg = err?.message || "Failed to generate thumbnail";
      setThumbnailError(errMsg);
    } finally {
      setIsGeneratingThumbnail(false);
      setThumbnailStatus(null);
    }
  };

  const handleGenerateProceduralThumbnailArt = () => {
    try {
      const thumbnailUrl = generateProceduralStoryboardArtwork(scene, overallMood, colorPalette);
      const updatedScene = { ...scene, thumbnailUrl, thumbnailPrompt: 'Procedural Concept Art' };
      onSave(updatedScene);
      setThumbnailError(null);
      setPreviewTab('thumbnail');
    } catch (err: any) {
      console.error("Failed to generate procedural thumbnail:", err);
    }
  };

  const handleDownloadThumbnail = () => {
    if (!scene.thumbnailUrl) return;
    const a = document.createElement('a');
    a.href = scene.thumbnailUrl;
    a.download = `scene_${scene.sceneNumber}_thumbnail.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(scene.veoPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyComfyJson = () => {
    if (!comfyConfig) return;
    const payload = buildComfyUiApiPayload(scene.veoPrompt, comfyConfig);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedComfy(true);
    setTimeout(() => setCopiedComfy(false), 2000);
  };

  const handleDownloadComfyWorkflow = () => {
    if (!comfyConfig) return;
    downloadComfyUiWorkflowJson(scene.veoPrompt, scene.sceneNumber, comfyConfig);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedScene(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLyricsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLyricsString(e.target.value);
  };

  const handleGenerateMotionPreview = async () => {
    setIsGeneratingVideo(true);
    setGenerationError(null);
    setGenerationStatus('Rendering instant procedural motion video in browser...');

    try {
      const videoUrl = await generateProceduralSceneVideo(
        scene,
        overallMood,
        5,
        (status) => setGenerationStatus(status)
      );
      const updatedSceneWithVideo = { ...scene, videoUrl };
      onSave(updatedSceneWithVideo);
      setGenerationError(null);
    } catch (err: any) {
      console.error("Motion preview generator error:", err);
      setGenerationError(err?.message || "Failed to render procedural motion preview.");
    } finally {
      setIsGeneratingVideo(false);
      setGenerationStatus(null);
    }
  };

  const handleGenerateVideoClick = async () => {
    setIsGeneratingVideo(true);
    setGenerationError(null);

    let referenceImage: { imageBytes: string; mimeType: string; } | null = null;

    // Find the first matching element in the prompt that has a reference image
    for (const element of elementsWithImages) {
        if (scene.veoPrompt.includes(element.name) && element.imageDataUrl) {
            const match = element.imageDataUrl.match(/^data:(.*);base64,(.*)$/);
            if (match && match[1] && match[2]) {
                referenceImage = {
                    mimeType: match[1],
                    imageBytes: match[2],
                };
                console.log(`Using reference image for "${element.name}" in Scene ${scene.sceneNumber}`);
                break; // Use the first one found
            }
        }
    }

    try {
      let videoUrl = '';
      if (engineMode === 'comfyui' && comfyConfig) {
        videoUrl = await generateVideoWithComfyUI(
          scene.veoPrompt,
          referenceImage,
          comfyConfig,
          (status) => setGenerationStatus(status)
        );
      } else {
        videoUrl = await generateVideoFromPrompt(
          scene.veoPrompt,
          referenceImage,
          (status) => setGenerationStatus(status)
        );
      }
      // Create a new scene object with the video URL
      const updatedSceneWithVideo = { ...scene, videoUrl };
      // Call the onSave prop which will update the parent's state
      onSave(updatedSceneWithVideo);
    } catch (err: any) {
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      
      if (errMsg === 'VEO_PERMISSION_DENIED' || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('caller does not have permission') || errMsg.includes('403')) {
        setGenerationError('VEO_PERMISSION_DENIED');
      } else if (errMsg === 'API_KEY_NOT_FOUND' || errMsg.includes('API_KEY')) {
        setGenerationError("API Key is missing for cloud VEO video generation. You can use ComfyUI mode, export scene prompts, or render instant motion preview.");
      } else {
        setGenerationError(errMsg || "An unknown error occurred during video generation.");
      }
    } finally {
      setIsGeneratingVideo(false);
      setGenerationStatus(null);
    }
  };

  const handleSaveClick = async () => {
    setValidationError(null); // Reset error on new attempt
    const validationResult = validateLyricsString(lyricsString);

    if (!validationResult.isValid) {
        setValidationError(validationResult.error);
        return; // Stop the save
    }
    
    setIsGenerating(true);
    try {
        let newVeoPrompt = scene.veoPrompt;
        if ((llmProvider === 'ollama' || llmProvider === 'opencode') && ollamaConfig) {
          try {
            newVeoPrompt = await enhanceScenePromptWithOllama(editedScene, overallMood, ollamaConfig);
          } catch (localErr) {
            console.warn("Ollama prompt enhancement fallback to Gemini:", localErr);
            newVeoPrompt = await generateVeoPrompt({
              description: editedScene.description,
              cameraAngle: editedScene.cameraAngle,
              overallMood: overallMood,
            });
          }
        } else {
          newVeoPrompt = await generateVeoPrompt({
            description: editedScene.description,
            cameraAngle: editedScene.cameraAngle,
            overallMood: overallMood,
          });
        }

        const parsedLyrics = stringToLyricsForSave(lyricsString);
        // When saving edits, we preserve the existing videoUrl
        onSave({ ...editedScene, correspondingLyrics: parsedLyrics, veoPrompt: newVeoPrompt, videoUrl: scene.videoUrl });
    } catch(err) {
        if (err instanceof Error) {
            setValidationError(err.message);
        } else {
            setValidationError("An unknown error occurred while updating the prompt.");
        }
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCancelClick = () => {
    setValidationError(null);
    onCancel();
  };

  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-indigo-500/10 hover:border-slate-600">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
            <div>
                {scene.transition && !isEditing && (
                  <div className="text-sm font-medium text-cyan-400 mb-2 tracking-wider uppercase">
                    {scene.transition}
                  </div>
                )}
                <h3 className="text-xl font-bold text-indigo-400">Scene {scene.sceneNumber}</h3>
            </div>
            <div className="flex items-center gap-4">
              {(scene.startTimeSeconds !== undefined && scene.endTimeSeconds !== undefined) && (
                  <div className="flex items-center gap-2 text-sm font-semibold bg-slate-900/70 text-indigo-300 px-3 py-1.5 rounded-full mt-2 sm:mt-0">
                      <ClockIcon className="w-5 h-5" />
                      <span>{formatTime(scene.startTimeSeconds)} - {formatTime(scene.endTimeSeconds)}</span>
                  </div>
              )}
              {!isEditing && (
                <div className="flex items-center gap-1">
                  {/* Generate Thumbnail Button (Imagen 3) */}
                  <button
                    onClick={() => handleGenerateThumbnail()}
                    disabled={isGeneratingThumbnail || isGeneratingVideo}
                    className="p-2 rounded-full text-indigo-300 hover:bg-slate-700 hover:text-indigo-200 transition-colors duration-200"
                    aria-label="Generate Imagen 3 Concept Thumbnail"
                    title="Generate Scene Visual Thumbnail (Google Imagen 3)"
                  >
                    {isGeneratingThumbnail ? (
                      <div className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-indigo-400 rounded-full" />
                    ) : (
                      <PhotoIcon className="w-5 h-5 text-indigo-400" />
                    )}
                  </button>

                  {/* Instant Motion Video Generator Button (Client-Side Procedural Preview) */}
                  <button
                    onClick={handleGenerateMotionPreview}
                    disabled={isGeneratingVideo || isGeneratingThumbnail}
                    className="p-2 rounded-full text-cyan-300 hover:bg-slate-700 hover:text-cyan-200 transition-colors duration-200"
                    aria-label="Render instant procedural motion preview video"
                    title="Render Instant Motion Preview (Free in Browser)"
                  >
                    <SparklesIcon className="w-5 h-5 text-cyan-400" />
                  </button>

                  {isGeneratingVideo ? (
                    <div className="p-2 w-9 h-9 flex items-center justify-center" aria-label="Generating video...">
                      <div className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-indigo-400 rounded-full"></div>
                    </div>
                  ) : (
                    scene.videoUrl ? (
                      <button 
                        onClick={handleGenerateVideoClick}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-indigo-400 transition-colors duration-200"
                        aria-label="Regenerate video for this scene"
                        title={engineMode === 'comfyui' ? 'Regenerate Video with ComfyUI' : 'Generate Video with VEO'}
                      >
                        <ArrowPathIcon className="w-5 h-5"/>
                      </button>
                    ) : (
                      <button 
                        onClick={handleGenerateVideoClick}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-indigo-400 transition-colors duration-200"
                        aria-label="Generate video for this scene"
                        title={engineMode === 'comfyui' ? 'Generate Video with ComfyUI' : 'Generate Video with VEO'}
                      >
                        <FilmIcon className="w-5 h-5"/>
                      </button>
                    )
                  )}
                  {onOpenPromptLibrary && (
                    <button
                      onClick={() => onOpenPromptLibrary(scene.sceneNumber)}
                      className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-indigo-400 transition-colors duration-200"
                      aria-label="Open style prompt library for this scene"
                      title="Apply Style Preset from Prompt Library"
                    >
                      <SwatchIcon className="w-5 h-5"/>
                    </button>
                  )}
                  <button 
                    onClick={onEdit} 
                    disabled={isGeneratingVideo}
                    className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-indigo-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                    aria-label="Edit scene"
                  >
                    <PencilIcon className="w-5 h-5"/>
                  </button>
                </div>
              )}
            </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-6">
            {/* --- SCENE DETAILS GROUP --- */}
            <div className="space-y-4">
                <div>
                    <label htmlFor={`transition-${scene.sceneNumber}`} className="font-semibold text-slate-300 mb-1 block">Transition:</label>
                    <input
                        type="text"
                        id={`transition-${scene.sceneNumber}`}
                        name="transition"
                        value={editedScene.transition || ''}
                        onChange={handleFieldChange}
                        placeholder="e.g., Cut to:, Dissolve to:"
                        className="w-full p-3 bg-slate-900/80 border border-slate-600 rounded-md text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    />
                </div>
                <div>
                    <label htmlFor={`description-${scene.sceneNumber}`} className="font-semibold text-slate-300 mb-1 block">Scene Description:</label>
                    <textarea
                        id={`description-${scene.sceneNumber}`}
                        name="description"
                        value={editedScene.description}
                        onChange={handleFieldChange}
                        rows={4}
                        className="w-full p-3 bg-slate-900/80 border border-slate-600 rounded-md resize-y text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    />
                </div>
                 <div>
                    <label htmlFor={`cameraAngle-${scene.sceneNumber}`} className="font-semibold text-slate-300 mb-1 block">Camera Angle:</label>
                    <input
                        type="text"
                        id={`cameraAngle-${scene.sceneNumber}`}
                        name="cameraAngle"
                        value={editedScene.cameraAngle || ''}
                        onChange={handleFieldChange}
                        placeholder="e.g., Low angle shot, overhead shot"
                        className="w-full p-3 bg-slate-900/80 border border-slate-600 rounded-md text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    />
                </div>
            </div>
            
            {/* --- LYRICS GROUP --- */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <label htmlFor={`lyrics-editor-${scene.sceneNumber}`} className="font-semibold text-slate-300">Corresponding Lyrics:</label>
                    <div className="relative group flex items-center">
                        <InformationCircleIcon className="w-5 h-5 text-slate-500" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3 bg-slate-900 text-slate-300 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 border border-slate-700">
                            Use format <code className="bg-slate-700 text-cyan-400 px-1 py-0.5 rounded text-[11px]">[MM:SS] Lyric Text</code>.
                            <br />
                            Lines without timestamps will be ignored.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
                        </div>
                    </div>
                </div>
                <textarea
                    id={`lyrics-editor-${scene.sceneNumber}`}
                    name="correspondingLyrics"
                    value={lyricsString}
                    onChange={handleLyricsChange}
                    rows={4}
                    placeholder="e.g., [00:12] Hello from the other side"
                    className="w-full p-3 bg-slate-900/80 border border-slate-600 rounded-md resize-y text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 italic"
                />
            </div>

            {/* --- VEO PROMPT GROUP --- */}
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                  <CameraIcon className="w-5 h-5"/>
                  VEO Prompt (Auto-Generated on Save)
                </h4>
                {onOpenPromptLibrary && (
                  <button
                    type="button"
                    onClick={() => onOpenPromptLibrary(scene.sceneNumber)}
                    className="self-start sm:self-auto text-xs px-2.5 py-1 rounded-md bg-indigo-900/70 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
                    title="Browse and inject style presets from Prompt Library"
                  >
                    <SwatchIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Apply Style from Library</span>
                  </button>
                )}
              </div>
               <textarea
                    id={`veoPrompt-${scene.sceneNumber}`}
                    name="veoPrompt"
                    value={editedScene.veoPrompt}
                    onChange={handleFieldChange}
                    rows={4}
                    className="w-full p-3 bg-slate-900/80 border border-slate-600 rounded-md resize-y text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                />
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                    <p className="font-semibold text-slate-300">Pro Tip: The VEO prompt will be regenerated from your description when you save.</p>
                    <ul className="list-disc list-inside ml-2">
                        <li><span className="font-semibold">Subject & Action:</span> A wolf howling...</li>
                        <li><span className="font-semibold">Camera:</span> Low angle, slow zoom...</li>
                        <li><span className="font-semibold">Lighting:</span> Ominous moonlight...</li>
                        <li><span className="font-semibold">Style:</span> Film grain, cinematic...</li>
                    </ul>
                    <p className="pt-1"><span className="font-semibold text-slate-300">Example:</span> "Low angle shot of a lone wolf howling at a full moon, slow zoom in, ominous moonlight backlighting, cinematic film grain."</p>
                </div>
            </div>

            {/* --- ACTIONS AND ERRORS --- */}
            {validationError && (
              <div className="p-3 bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-md" role="alert">
                {validationError}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={handleCancelClick} className="px-4 py-2 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800 transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleSaveClick} 
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-800 transition-colors disabled:bg-indigo-900 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Updating Prompt...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Visual Media Stage (Imagen Thumbnail / Video Preview) */}
            <div className="my-4">
              {/* Media Switcher Tab Header if both or either media exists */}
              {(scene.thumbnailUrl || scene.videoUrl || isGeneratingThumbnail || isGeneratingVideo) && (
                <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewTab('thumbnail')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        previewTab === 'thumbnail'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      <PhotoIcon className="w-3.5 h-3.5" />
                      <span>Visual Concept (Imagen 3)</span>
                      {scene.thumbnailUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    </button>

                    <button
                      onClick={() => setPreviewTab('video')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        previewTab === 'video'
                          ? 'bg-cyan-600 text-white shadow-md'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      <FilmIcon className="w-3.5 h-3.5" />
                      <span>Video Simulation</span>
                      {scene.videoUrl && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                    </button>
                  </div>

                  {previewTab === 'thumbnail' && scene.thumbnailUrl && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadThumbnail}
                        className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        title="Download Scene Thumbnail"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Save Image</span>
                      </button>
                      <button
                        onClick={() => handleGenerateThumbnail()}
                        disabled={isGeneratingThumbnail}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                        title="Regenerate with Imagen 3"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Regenerate</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 1. THUMBNAIL TAB VIEW */}
              {previewTab === 'thumbnail' && (
                <div>
                  {isGeneratingThumbnail && (
                    <div className="p-6 bg-slate-900 rounded-xl border border-indigo-500/50 flex flex-col items-center justify-center text-center">
                      <Loader />
                      <p className="mt-3 text-sm font-semibold text-indigo-300 animate-pulse">
                        {thumbnailStatus || "Synthesizing cinematic thumbnail with Google Imagen 3..."}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Crafting 16:9 photorealistic visual style representation...</p>
                    </div>
                  )}

                  {thumbnailError && !isGeneratingThumbnail && (
                    <div className="p-4 bg-slate-900/95 border border-amber-500/60 text-slate-200 rounded-xl shadow-lg mb-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <InformationCircleIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <p className="font-bold text-amber-300">Imagen Thumbnail Notice</p>
                      </div>
                      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                        {thumbnailError.includes('IMAGEN_PERMISSION_DENIED') 
                          ? 'Google Imagen 3 API is available for this project. You can also generate an instant offline concept artboard with the browser canvas renderer.'
                          : formatErrorMessage(thumbnailError)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleGenerateThumbnail()}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-md shadow flex items-center gap-1.5 transition-all"
                        >
                          <ArrowPathIcon className="w-3.5 h-3.5" />
                          <span>Retry Imagen 3</span>
                        </button>
                        <button
                          onClick={handleGenerateProceduralThumbnailArt}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          <span>Generate Offline Concept Art</span>
                        </button>
                        <button
                          onClick={() => setThumbnailError(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {scene.thumbnailUrl && !isGeneratingThumbnail ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 shadow-xl group bg-black">
                      <img
                        src={scene.thumbnailUrl}
                        alt={`Scene ${scene.sceneNumber} visual style preview`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />

                      {/* Header Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-950/80 backdrop-blur-md text-cyan-300 font-bold text-xs rounded-lg border border-slate-700/80 flex items-center gap-1.5 shadow-lg">
                          <SparklesIcon className="w-3.5 h-3.5 text-yellow-400" />
                          Imagen 3 Visual Concept
                        </span>
                      </div>

                      {/* Hover Overlay Controls */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                        <div>
                          <p className="text-xs text-slate-200 font-medium line-clamp-1 mb-1">
                            {scene.thumbnailPrompt || scene.veoPrompt}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">16:9 Cinematic Still</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowThumbnailLightbox(true)}
                            className="px-3 py-1.5 bg-slate-900/90 text-white text-xs font-bold rounded-lg border border-slate-700 hover:bg-indigo-600 transition-colors shadow"
                          >
                            Enlarge
                          </button>
                          <button
                            onClick={handleDownloadThumbnail}
                            className="p-2 bg-slate-900/90 text-slate-300 hover:text-cyan-300 rounded-lg border border-slate-700 transition-colors"
                            title="Download Image"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !isGeneratingThumbnail && !thumbnailError && (
                    <div className="p-5 bg-gradient-to-r from-slate-900/90 via-indigo-950/30 to-slate-900/90 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-3 bg-indigo-950/80 rounded-xl border border-indigo-800/60 flex-shrink-0">
                          <PhotoIcon className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">
                            Scene {scene.sceneNumber} Visual Style Preview
                          </h4>
                          <p className="text-xs text-slate-400">
                            Generate a high-definition Imagen 3 concept still matching this scene's lighting, camera angle, and mood.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                        <button
                          onClick={() => handleGenerateThumbnail()}
                          disabled={isGeneratingThumbnail}
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all"
                        >
                          <SparklesIcon className="w-4 h-4 text-cyan-200" />
                          <span>Generate (Imagen 3)</span>
                        </button>
                        <button
                          onClick={handleGenerateProceduralThumbnailArt}
                          className="w-full sm:w-auto px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors"
                          title="Instant Procedural Concept Art"
                        >
                          Concept Art
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. VIDEO TAB VIEW */}
              {previewTab === 'video' && (
                <div>
                  {isGeneratingVideo && (
                    <div className="p-6 bg-slate-900 rounded-xl border border-indigo-500/50 flex flex-col items-center justify-center text-center">
                      <Loader />
                      <p className="mt-3 text-sm font-semibold text-indigo-300 animate-pulse">
                        Generating Video...
                      </p>
                      {generationStatus && (
                        <p className="mt-1 text-xs text-slate-400">{generationStatus}</p>
                      )}
                      <p className="mt-3 text-xs text-slate-500">This process can take several minutes. Please keep this tab open.</p>
                    </div>
                  )}
                  
                  {generationError && !isGeneratingVideo && (
                    <div className="p-4 bg-slate-900/95 border border-amber-500/60 text-slate-200 rounded-xl shadow-lg mb-4" role="alert">
                      <div className="flex items-center gap-2 mb-2">
                        <InformationCircleIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <p className="font-bold text-amber-300">
                          {generationError === 'VEO_PERMISSION_DENIED' ? 'Google VEO API Permission Notice' : 'Video Generation Notice'}
                        </p>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed mb-3">
                        {generationError === 'VEO_PERMISSION_DENIED'
                          ? 'Google VEO Cloud Video generation requires a paid Google Cloud / Vertex AI subscription with Video Generation permissions enabled. You can generate videos for free using the built-in Motion Simulator or local ComfyUI GPU mode.'
                          : formatErrorMessage(generationError)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={handleGenerateMotionPreview}
                          className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-md shadow flex items-center gap-1.5 transition-all"
                          title="Render a real animated procedural preview video in browser"
                        >
                          <SparklesIcon className="w-4 h-4 text-cyan-200" />
                          <span>Render Instant Motion Preview (Free)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
                          title="Copy prompt for Midjourney, Runway Gen-3, Pika, or Kling"
                        >
                          <ClipboardIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Prompt for Runway/Midjourney</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenerationError(null)}
                          className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {scene.videoUrl && !isGeneratingVideo && (
                    <div className="bg-black rounded-xl overflow-hidden border border-slate-600 shadow-xl">
                      <video
                        key={scene.videoUrl} 
                        controls
                        className="w-full h-auto"
                        aria-label={`Generated video for scene ${scene.sceneNumber}`}
                      >
                        <source src={scene.videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Thumbnail Lightbox Modal */}
            {showThumbnailLightbox && scene.thumbnailUrl && (
              <div 
                className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn"
                onClick={() => setShowThumbnailLightbox(false)}
              >
                <div 
                  className="max-w-5xl w-full flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full flex items-center justify-between mb-3 text-slate-200">
                    <div>
                      <h3 className="text-lg font-bold text-cyan-400">Scene {scene.sceneNumber} Visual Concept</h3>
                      <p className="text-xs text-slate-400">{scene.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadThumbnail}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => setShowThumbnailLightbox(false)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                      >
                        <XCircleIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
                    <img
                      src={scene.thumbnailUrl}
                      alt={`Scene ${scene.sceneNumber} Full Size`}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="font-semibold text-slate-300 mb-1">Corresponding Lyrics:</p>
                    <div className="text-slate-400 italic bg-slate-900/50 p-3 rounded-md border-l-4 border-cyan-500 h-full space-y-1">
                      {Array.isArray(scene.correspondingLyrics) ? (
                          scene.correspondingLyrics.length > 0 ? (
                            scene.correspondingLyrics.map((line, index) => (
                                <p key={index} className="flex items-baseline gap-3">
                                    <span className="font-mono text-cyan-400 text-xs">[{formatTime(line.timestampSeconds)}]</span>
                                    <span>"{line.text}"</span>
                                </p>
                            ))
                          ) : (
                            <p>(No lyrics for this scene)</p>
                          )
                      ) : (
                          <p>"{scene.correspondingLyrics}"</p>
                      )}
                    </div>
                </div>
                {scene.cameraAngle && (
                    <div>
                        <p className="font-semibold text-slate-300 mb-1 flex items-center gap-2">
                            <ViewfinderIcon className="w-5 h-5 text-indigo-400"/>
                            Camera Angle:
                        </p>
                        <p className="text-slate-300 bg-slate-900/50 p-3 rounded-md h-full">{scene.cameraAngle}</p>
                    </div>
                )}
            </div>

            <div className="mb-5">
              <p className="font-semibold text-slate-300 mb-1">Scene Description:</p>
              <p className="text-slate-300">{scene.description}</p>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                  <CameraIcon className="w-5 h-5"/>
                  {engineMode === 'comfyui' ? 'ComfyUI Model Prompt' : 'VEO Prompt'}
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center text-xs px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 mr-1 text-green-400" />
                        Copied Text!
                      </>
                    ) : (
                      <>
                        <ClipboardIcon className="w-3.5 h-3.5 mr-1" />
                        Copy Text
                      </>
                    )}
                  </button>

                  {comfyConfig && (
                    <>
                      <button
                        onClick={handleCopyComfyJson}
                        className="flex items-center text-xs px-2.5 py-1 rounded-md bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 border border-indigo-700/50 transition-colors"
                        title="Copy ComfyUI API Prompt payload JSON"
                      >
                        {copiedComfy ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5 mr-1 text-green-400" />
                            API JSON Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardIcon className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                            Copy ComfyUI API JSON
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleDownloadComfyWorkflow}
                        className="flex items-center text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800 transition-colors"
                        title="Download ComfyUI Workflow JSON file for local desktop"
                      >
                        <FilmIcon className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                        Download Workflow .json
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-slate-200 font-mono text-sm leading-relaxed">{scene.veoPrompt}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SceneCard;