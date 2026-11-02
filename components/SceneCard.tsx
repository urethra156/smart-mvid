import React, { useState, useEffect } from 'react';
import { Scene, LyricLine, ElementWithImage } from '../types';
import { ClipboardIcon, CheckIcon, CameraIcon, ViewfinderIcon, ClockIcon, PencilIcon, InformationCircleIcon, FilmIcon, ArrowPathIcon } from './icons/Icons';
import { generateVeoPrompt, generateVideoFromPrompt } from '../services/geminiService';
import Loader from './Loader';

interface SceneCardProps {
  scene: Scene;
  isEditing: boolean;
  overallMood: string;
  elementsWithImages: ElementWithImage[];
  onEdit: () => void;
  onSave: (scene: Scene) => void;
  onCancel: () => void;
  onApiKeyError: () => void;
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


const SceneCard: React.FC<SceneCardProps> = ({ scene, isEditing, onEdit, onSave, onCancel, overallMood, elementsWithImages, onApiKeyError }) => {
  const [copied, setCopied] = useState(false);
  const [editedScene, setEditedScene] = useState<Scene>(scene);
  const [lyricsString, setLyricsString] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // State for video generation
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    // When the component receives a new scene or the editing state changes, reset its internal state.
    setEditedScene(scene);
    setValidationError(null); // Clear validation error on state change
    if (isEditing) {
      setLyricsString(lyricsToStringForEditor(scene.correspondingLyrics));
    }
  }, [scene, isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(scene.veoPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedScene(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLyricsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLyricsString(e.target.value);
  }

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
      const videoUrl = await generateVideoFromPrompt(
        scene.veoPrompt,
        referenceImage,
        (status) => setGenerationStatus(status)
      );
      // Create a new scene object with the video URL
      const updatedSceneWithVideo = { ...scene, videoUrl };
      // Call the onSave prop which will update the parent's state
      onSave(updatedSceneWithVideo);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'API_KEY_NOT_FOUND') {
          onApiKeyError();
          // Don't set a local error message, the app will re-render to the key selection screen
        } else {
          setGenerationError(err.message);
        }
      } else {
        setGenerationError("An unknown error occurred during video generation.");
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
        const newVeoPrompt = await generateVeoPrompt({
            description: editedScene.description,
            cameraAngle: editedScene.cameraAngle,
            overallMood: overallMood,
        });

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
                        title="Regenerate Video"
                      >
                        <ArrowPathIcon className="w-5 h-5"/>
                      </button>
                    ) : (
                      <button 
                        onClick={handleGenerateVideoClick}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-indigo-400 transition-colors duration-200"
                        aria-label="Generate video for this scene"
                        title="Generate Video"
                      >
                        <FilmIcon className="w-5 h-5"/>
                      </button>
                    )
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
              <h4 className="font-bold text-cyan-400 flex items-center gap-2 mb-2">
                <CameraIcon className="w-5 h-5"/>
                VEO Prompt (Auto-Generated on Save)
              </h4>
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
            {isGeneratingVideo && (
              <div className="my-4 p-4 bg-slate-900 rounded-lg border border-indigo-500/50 flex flex-col items-center justify-center text-center">
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
                <div className="my-4 p-3 bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-md" role="alert">
                    <p className="font-bold">Video Generation Failed</p>
                    <p className="leading-relaxed">{formatErrorMessage(generationError)}</p>
                </div>
            )}

            {scene.videoUrl && !isGeneratingVideo && (
                <div className="my-4 bg-black rounded-lg overflow-hidden border border-slate-600">
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
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                  <CameraIcon className="w-5 h-5"/>
                  VEO Prompt
                </h4>
                <button
                  onClick={handleCopy}
                  className="flex items-center text-xs px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-1 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </button>
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