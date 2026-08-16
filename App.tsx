import React, { useState, useCallback, useEffect } from 'react';
import { generateVideoScript, validateApiKey } from './services/geminiService';
import { generateLocalVideoScript } from './services/localScriptService';
import { generateScriptWithOllamaOrOpenCode, loadOllamaConfig, saveOllamaConfig, DEFAULT_OLLAMA_CONFIG } from './services/ollamaService';
import { VideoScript, MoodPreset, Scene, LyricLine, ElementWithImage, ConsistentElement, LlmProvider, OllamaConfig } from './types';
import LyricsInput from './components/LyricsInput';
import ElementUploader from './components/ElementUploader';
import VideoScriptDisplay from './components/VideoScriptDisplay';
import { OllamaSettingsModal } from './components/OllamaSettingsModal';
import Loader from './components/Loader';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { FilmIcon, KeyIcon, CpuIcon, CodeBracketIcon, SlidersIcon, SparklesIcon } from './components/icons/Icons';

const LOCAL_STORAGE_KEY = 'ai-music-video-script';
const LLM_PROVIDER_STORAGE_KEY = 'ai_music_video_llm_provider';

/**
 * Normalizes the timings of a generated video script to enforce 8-second intervals.
 * This function ensures each scene is a fixed length, suitable for VEO generation,
 * and that the entire script perfectly matches the total song duration.
 * @param script The raw VideoScript object from the AI.
 * @param totalSeconds The total duration of the song.
 * @returns A new VideoScript object with corrected scene timings.
 */
const normalizeScriptTimings = (script: VideoScript, totalSeconds: number): VideoScript => {
  if (!script || !script.scenes || script.scenes.length === 0) {
    return script;
  }

  const correctedScenes = script.scenes.map((scene, index) => {
    const startTime = index * 8;
    // The end time is the start time + 8, but it cannot exceed the total song length.
    const endTime = Math.min((index + 1) * 8, totalSeconds);
    return {
      ...scene,
      sceneNumber: index + 1, // Enforce correct scene numbering
      startTimeSeconds: startTime,
      endTimeSeconds: endTime,
    };
  });

  // Final check: ensure the last scene ends exactly at the total duration.
  // This handles cases where the last interval is shorter than 8 seconds.
  if (correctedScenes.length > 0) {
    correctedScenes[correctedScenes.length - 1].endTimeSeconds = totalSeconds;
  }

  return { ...script, scenes: correctedScenes };
};

const formatTime = (totalSeconds: number | undefined): string => {
  if (totalSeconds === undefined || isNaN(totalSeconds)) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Formats the VideoScript object into a human-readable string for saving as a .txt file.
 * @param script The VideoScript object.
 * @returns A formatted string representing the entire script.
 */
const formatScriptForSaving = (script: VideoScript): string => {
  let content = `Title: ${script.title}\n`;
  content += `Mood: ${script.overallMood}\n`;
  
  if (script.analysis) {
    content += `\n----------------------------------------\n`;
    content += `SONG ANALYSIS\n`;
    content += `----------------------------------------\n\n`;
    content += `Tempo: ${script.analysis.bpm} BPM\n`;
    content += `Key: ${script.analysis.musicalKey}\n`;
    content += `Dynamics: ${script.analysis.dynamics}\n`;
    content += `Instrumentation: ${script.analysis.instrumentation.join(', ')}\n`;
    content += `Lyrical Themes: ${script.analysis.lyricalThemes.join(', ')}\n\n`;
    content += `Suggested Color Palette:\n`;
    script.analysis.suggestedColorPalette.forEach(color => {
      content += `- ${color.hex.toUpperCase()}: ${color.reason}\n`;
    });
  }

  if (script.consistentElements && (script.consistentElements.characters.length > 0 || script.consistentElements.props.length > 0)) {
    content += `\n----------------------------------------\n`;
    content += `CONSISTENT ELEMENTS\n`;
    content += `----------------------------------------\n\n`;
    if(script.consistentElements.characters.length > 0) {
        content += `Characters:\n`;
        script.consistentElements.characters.forEach(char => {
            content += `- ${char.name}: ${char.description}\n`;
        });
        content += `\n`;
    }
    if(script.consistentElements.props.length > 0) {
        content += `Props:\n`;
        script.consistentElements.props.forEach(prop => {
            content += `- ${prop.name}: ${prop.description}\n`;
        });
    }
  }

  content += `\n========================================\n`;
  content += `VIDEO SCRIPT\n`;
  content += `========================================\n\n`;

  script.scenes.forEach(scene => {
    content += `SCENE ${scene.sceneNumber}\n`;
    content += `Time: ${formatTime(scene.startTimeSeconds)} - ${formatTime(scene.endTimeSeconds)}\n`;
    if (scene.transition) {
      content += `Transition: ${scene.transition}\n`;
    }
    if (scene.cameraAngle) {
      content += `Camera Angle: ${scene.cameraAngle}\n`;
    }
    
    content += `\nDescription:\n${scene.description}\n`;

    content += `\nLyrics:\n`;
    if (Array.isArray(scene.correspondingLyrics)) {
        if (scene.correspondingLyrics.length > 0) {
            scene.correspondingLyrics.forEach((line: LyricLine) => {
                content += `[${formatTime(line.timestampSeconds)}] ${line.text}\n`;
            });
        } else {
            content += `(No lyrics for this scene)\n`;
        }
    } else {
      content += `${scene.correspondingLyrics}\n`;
    }
    
    content += `\nVEO Prompt:\n${scene.veoPrompt}\n`;
    content += `\n---\n\n`;
  });

  return content;
};


const App: React.FC = () => {
  const [appStep, setAppStep] = useState<'input' | 'elements' | 'script'>('input');
  const [lyrics, setLyrics] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [songLength, setSongLength] = useState<{ minutes: string; seconds: string }>({ minutes: '03', seconds: '30' });
  const [videoScript, setVideoScript] = useState<VideoScript | null>(null);
  const [elementsWithImages, setElementsWithImages] = useState<ElementWithImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStatusText, setLoadingStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moodPreset, setMoodPreset] = useState<MoodPreset>('Cinematic');
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState<boolean>(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // LLM Provider state (Gemini Cloud vs Ollama Local vs Open Code)
  const [llmProvider, setLlmProvider] = useState<LlmProvider>(() => {
    try {
      const saved = localStorage.getItem(LLM_PROVIDER_STORAGE_KEY) as LlmProvider;
      if (saved === 'gemini' || saved === 'ollama' || saved === 'opencode') {
        return saved;
      }
    } catch (e) {}
    return 'gemini';
  });

  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(() => loadOllamaConfig());
  const [isOllamaModalOpen, setIsOllamaModalOpen] = useState<boolean>(false);

  // Save LLM provider changes
  const handleSelectProvider = (provider: LlmProvider) => {
    setLlmProvider(provider);
    try {
      localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, provider);
    } catch (e) {}
  };

  const handleSaveOllamaConfig = (newConfig: OllamaConfig) => {
    setOllamaConfig(newConfig);
    saveOllamaConfig(newConfig);
  };


  // Effect to check API key on mount without blocking app access
  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio?.hasSelectedApiKey) {
          const keyIsSelected = await window.aistudio.hasSelectedApiKey();
          setIsApiKeySelected(keyIsSelected);
        }
      } catch (e) {
        console.warn("Optional API key check failed, proceeding in local offline mode:", e);
      } finally {
        setIsCheckingApiKey(false);
      }
    };
    checkKey();
  }, []);

  // Effect to load script from localStorage on initial render
  useEffect(() => {
    try {
      const savedScriptJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedScriptJSON) {
        const savedScript = JSON.parse(savedScriptJSON);
        setVideoScript(savedScript);
        // If loaded script exists, jump straight to the script view.
        // We assume elements were handled in a previous session.
        setAppStep('script');
      }
    } catch (error) {
      console.error("Failed to load script from local storage:", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
    }
  }, []); // Empty dependency array means this runs once on mount

  // Effect to save script to localStorage whenever it changes
  useEffect(() => {
    try {
      if (videoScript && appStep === 'script') { // Only save when we are at the script step
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(videoScript));
      } else if (!videoScript) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to save script to local storage:", error);
    }
  }, [videoScript, appStep]);


  const totalSeconds = (parseInt(songLength.minutes || '0', 10) * 60) + parseInt(songLength.seconds || '0', 10);

  const handleSelectKey = useCallback(async () => {
    setError(null);
    try {
      await window.aistudio.openSelectKey();
      // Assume success to avoid race condition, as per guidelines
      setIsApiKeySelected(true);
    } catch (e) {
      console.error("Error opening API key selection:", e);
      setError("Failed to open API key selector. Please try again.");
    }
  }, []);

  const handleApiKeyError = useCallback(() => {
    // This is called from a child component when a VEO call fails due to an invalid key
    setIsApiKeySelected(false);
    setError("Your API key is invalid or has insufficient permissions for video generation. Please select a valid key.");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!lyrics.trim() && !audioFile) {
      setError('Please enter lyrics or upload an audio file.');
      return;
    }

    if (totalSeconds <= 0) {
        setError('Please enter a valid song length greater than zero.');
        return;
    }
    
    setIsLoading(true);
    setLoadingStatusText(
      llmProvider === 'ollama'
        ? `Connecting to Ollama (${ollamaConfig.model}) at ${ollamaConfig.endpoint}...`
        : llmProvider === 'opencode'
        ? `Connecting to Open Code at ${ollamaConfig.openCodeEndpoint}...`
        : 'Connecting to Google Gemini API...'
    );
    setError(null);
    setVideoScript(null);

    try {
      let rawScript: VideoScript;

      if (llmProvider === 'ollama' || llmProvider === 'opencode') {
        try {
          rawScript = await generateScriptWithOllamaOrOpenCode(
            { lyrics, audioFile },
            totalSeconds,
            moodPreset,
            ollamaConfig,
            (status) => setLoadingStatusText(status)
          );
        } catch (localLlmErr: any) {
          console.warn(`Local LLM (${llmProvider}) generation failed:`, localLlmErr);
          const errorMsg = localLlmErr?.message || 'Local LLM connection failed.';
          
          // Provide descriptive actionable error before falling back
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS') || errorMsg.includes('NetworkError')) {
            throw new Error(
              `Cannot connect to ${llmProvider === 'ollama' ? 'Ollama' : 'Open Code'} server at ${
                llmProvider === 'ollama' ? ollamaConfig.endpoint : ollamaConfig.openCodeEndpoint
              }.\n\nEnsure your local server is running with CORS enabled (e.g., OLLAMA_ORIGINS="*" ollama serve). Click "Configure Local Engines" to test connection.`
            );
          } else {
            throw localLlmErr;
          }
        }
      } else {
        try {
          rawScript = await generateVideoScript({ lyrics, audioFile }, totalSeconds, moodPreset);
        } catch (geminiError) {
          console.warn('Gemini script generation failed, falling back to Local Music Video Director Engine:', geminiError);
          setLoadingStatusText('Synthesizing script using internal cinematic director engine...');
          rawScript = await generateLocalVideoScript({ lyrics, audioFile }, totalSeconds, moodPreset);
        }
      }

      const normalizedScript = normalizeScriptTimings(rawScript, totalSeconds);
      setVideoScript(normalizedScript);

      const elements = normalizedScript.consistentElements;
      if (elements && (elements.characters.length > 0 || elements.props.length > 0)) {
        const characters: ElementWithImage[] = elements.characters.map(c => ({...c, type: 'character'}));
        const props: ElementWithImage[] = elements.props.map(p => ({...p, type: 'prop'}));
        setElementsWithImages([...characters, ...props]);
        setAppStep('elements');
      } else {
        setAppStep('script');
        setElementsWithImages([]);
      }

    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      setAppStep('input');
    } finally {
      setIsLoading(false);
      setLoadingStatusText(null);
    }
  }, [lyrics, audioFile, totalSeconds, moodPreset, llmProvider, ollamaConfig]);

  const handleElementsSubmitted = useCallback((updatedElements: ElementWithImage[]) => {
    setElementsWithImages(updatedElements);
    setAppStep('script');
  }, []);

  const handleUpdateScenes = useCallback((newScenes: Scene[]) => {
    setVideoScript(prevScript => {
      if (!prevScript) return null;
      return { ...prevScript, scenes: newScenes };
    });
  }, []);

  const handleSaveScript = useCallback(() => {
    if (!videoScript) return;

    const filename = `${videoScript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_script.txt`;
    const scriptText = formatScriptForSaving(videoScript);
    const blob = new Blob([scriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [videoScript]);

  const handleConfirmReset = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear local storage:", e);
    }
    setVideoScript(null);
    setLyrics('');
    setAudioFile(null);
    setSongLength({ minutes: '03', seconds: '30' });
    setMoodPreset('Cinematic');
    setError(null);
    setElementsWithImages([]);
    setAppStep('input');
    setIsResetModalOpen(false);
  }, []);

  const handleStartNew = useCallback(() => {
    setIsResetModalOpen(true);
  }, []);

  const renderContent = () => {
    if (isLoading) {
       return (
         <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800/40 border border-slate-700/60 rounded-2xl shadow-xl">
           <Loader />
           <p className="mt-4 text-lg font-semibold text-slate-200 animate-pulse">
             {loadingStatusText || 'Analyzing your song and storyboarding your vision...'}
           </p>
           <p className="text-xs text-slate-400 mt-2 font-mono">
             Engine: {llmProvider === 'ollama' ? `Ollama (${ollamaConfig.model})` : llmProvider === 'opencode' ? `Open Code (${ollamaConfig.openCodeModel})` : 'Google Gemini 2.5'}
           </p>
         </div>
       );
    }
    
    switch (appStep) {
        case 'input':
            return (
                <div className="bg-slate-800/50 rounded-lg shadow-2xl p-6 border border-slate-700 backdrop-blur-sm mb-8">
                    <LyricsInput
                      lyrics={lyrics}
                      setLyrics={setLyrics}
                      audioFile={audioFile}
                      setAudioFile={setAudioFile}
                      songLength={songLength}
                      setSongLength={setSongLength}
                      selectedMood={moodPreset}
                      setSelectedMood={setMoodPreset}
                      onSubmit={handleAnalyze}
                      isLoading={isLoading}
                      llmProvider={llmProvider}
                      onSelectProvider={handleSelectProvider}
                      ollamaConfig={ollamaConfig}
                      onOpenOllamaSettings={() => setIsOllamaModalOpen(true)}
                    />
                </div>
            );
        case 'elements':
            return (
                 <div className="bg-slate-800/50 rounded-lg shadow-2xl p-6 border border-slate-700 backdrop-blur-sm mb-8">
                    <ElementUploader
                        elements={elementsWithImages}
                        onSubmit={handleElementsSubmitted}
                        onBack={() => setAppStep('input')}
                    />
                </div>
            )
        case 'script':
             if (videoScript) {
                 return (
                    <div className="mt-10">
                    <VideoScriptDisplay 
                        script={videoScript}
                        audioFile={audioFile}
                        elementsWithImages={elementsWithImages} 
                        onUpdateScenes={handleUpdateScenes}
                        onSaveScript={handleSaveScript}
                        onStartNew={handleStartNew}
                        onApiKeyError={handleApiKeyError}
                        llmProvider={llmProvider}
                        ollamaConfig={ollamaConfig}
                        onOpenOllamaSettings={() => setIsOllamaModalOpen(true)}
                    />
                    </div>
                 )
             }
             // Fallback if script is null for some reason
             setAppStep('input');
             return null;
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="flex items-center justify-center gap-4 mb-2">
            <FilmIcon className="w-10 h-10 text-indigo-400" />
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              AI Music Video Director
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            Deeply analyze any song and generate a complete, cinematic music video script with Ollama, Open Code, or Gemini.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setIsOllamaModalOpen(true)}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                llmProvider === 'ollama'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700 shadow-sm'
                  : llmProvider === 'opencode'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 shadow-sm'
                  : 'bg-indigo-950/80 text-indigo-300 border-indigo-700 shadow-sm'
              }`}
              title="Click to configure Ollama, Open Code, and local endpoints"
            >
              {llmProvider === 'ollama' ? (
                <CpuIcon className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              ) : llmProvider === 'opencode' ? (
                <CodeBracketIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              ) : (
                <SparklesIcon className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              )}
              <span>
                LLM: {llmProvider === 'ollama' ? `Ollama (${ollamaConfig.model})` : llmProvider === 'opencode' ? `Open Code (${ollamaConfig.openCodeModel})` : 'Gemini Cloud'}
              </span>
              <SlidersIcon className="w-3 h-3 ml-1.5 text-slate-400 hover:text-white" />
            </button>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
              ✓ Local Offline Engine Ready
            </span>

            {window.aistudio?.openSelectKey && (
              <button
                onClick={handleSelectKey}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Connect optional Gemini API key for cloud VEO video generation"
              >
                <KeyIcon className="w-3 h-3 mr-1 text-amber-400" />
                {isApiKeySelected ? 'API Key Connected' : 'Optional: Connect API Key'}
              </button>
            )}
          </div>
        </header>

        <main>
          {renderContent()}

          {error && !isLoading && appStep === 'input' && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg relative mt-4 shadow-lg" role="alert">
              <div className="flex">
                <div className="py-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-300">Script Generation Notice</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{error}</p>
                  {(error.includes('Ollama') || error.includes('Open Code') || error.includes('CORS')) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={async () => {
                          setError(null);
                          setIsLoading(true);
                          setLoadingStatusText('Synthesizing script using internal cinematic director engine...');
                          try {
                            const rawScript = await generateLocalVideoScript({ lyrics, audioFile }, totalSeconds, moodPreset);
                            const normalizedScript = normalizeScriptTimings(rawScript, totalSeconds);
                            setVideoScript(normalizedScript);
                            const elements = normalizedScript.consistentElements;
                            if (elements && (elements.characters.length > 0 || elements.props.length > 0)) {
                              const characters: ElementWithImage[] = elements.characters.map(c => ({...c, type: 'character'}));
                              const props: ElementWithImage[] = elements.props.map(p => ({...p, type: 'prop'}));
                              setElementsWithImages([...characters, ...props]);
                              setAppStep('elements');
                            } else {
                              setAppStep('script');
                              setElementsWithImages([]);
                            }
                          } catch (e: any) {
                            setError(e?.message || 'Failed to generate script with built-in director.');
                          } finally {
                            setIsLoading(false);
                            setLoadingStatusText(null);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
                      >
                        <span>🎬 Generate with Built-in Director Engine</span>
                      </button>
                      <button
                        onClick={() => {
                          handleSelectProvider('gemini');
                          setError(null);
                        }}
                        className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Switch to Gemini Cloud
                      </button>
                      <button
                        onClick={() => setIsOllamaModalOpen(true)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                      >
                        Open Local Engine Settings
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleConfirmReset}
      />

      <OllamaSettingsModal
        isOpen={isOllamaModalOpen}
        onClose={() => setIsOllamaModalOpen(false)}
        config={ollamaConfig}
        onSaveConfig={handleSaveOllamaConfig}
        activeProvider={llmProvider}
        onSelectProvider={handleSelectProvider}
      />
    </div>
  );
};

export default App;