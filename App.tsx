import React, { useState, useCallback, useEffect } from 'react';
import { generateVideoScript, validateApiKey } from './services/geminiService';
import { VideoScript, MoodPreset, Scene, LyricLine, ElementWithImage, ConsistentElement } from './types';
import LyricsInput from './components/LyricsInput';
import ElementUploader from './components/ElementUploader';
import VideoScriptDisplay from './components/VideoScriptDisplay';
import Loader from './components/Loader';
import { FilmIcon, KeyIcon } from './components/icons/Icons';

const LOCAL_STORAGE_KEY = 'ai-music-video-script';

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
  const [error, setError] = useState<string | null>(null);
  const [moodPreset, setMoodPreset] = useState<MoodPreset>('Cinematic');
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState<boolean>(true);


  // Effect to check and validate API key on mount
  useEffect(() => {
    const checkAndValidateKey = async () => {
      setIsCheckingApiKey(true);
      setError(null);
      try {
        const keyIsSelected = await window.aistudio.hasSelectedApiKey();
        if (keyIsSelected) {
          // A key is selected, now we must validate it with a test call
          const keyIsValid = await validateApiKey();
          if (keyIsValid) {
            setIsApiKeySelected(true);
          } else {
            // Key is selected but invalid (e.g., permissions, quota)
            setIsApiKeySelected(false);
            setError("Your selected API key appears to be invalid or lacks the necessary permissions. Please select a valid key to continue.");
          }
        } else {
          // No key has been selected yet
          setIsApiKeySelected(false);
        }
      } catch (e) {
        console.error("Error during API key check/validation:", e);
        setIsApiKeySelected(false);
        setError("An error occurred while verifying your API key. Please try selecting one again.");
      } finally {
        setIsCheckingApiKey(false);
      }
    };
    checkAndValidateKey();
  }, []); // Run only on mount

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
    setError(null);
    setVideoScript(null);

    try {
      const rawScript = await generateVideoScript({ lyrics, audioFile }, totalSeconds, moodPreset);
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
    }
  }, [lyrics, audioFile, totalSeconds, moodPreset]);

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

  const handleStartNew = useCallback(() => {
    if (window.confirm("Are you sure you want to start a new script? Your current work will be cleared and cannot be recovered.")) {
        setVideoScript(null);
        setLyrics('');
        setAudioFile(null);
        setSongLength({ minutes: '03', seconds: '30' });
        setMoodPreset('Cinematic');
        setError(null);
        setElementsWithImages([]);
        setAppStep('input');
    }
  }, []);

  const renderContent = () => {
    if (isLoading) {
       return (
         <div className="flex flex-col items-center justify-center text-center p-8">
           <Loader />
           <p className="mt-4 text-lg text-slate-300 animate-pulse">
             Analyzing your song and storyboarding your vision...
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
                        elementsWithImages={elementsWithImages} 
                        onUpdateScenes={handleUpdateScenes}
                        onSaveScript={handleSaveScript}
                        onStartNew={handleStartNew}
                        onApiKeyError={handleApiKeyError}
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

  if (isCheckingApiKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isApiKeySelected) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="max-w-xl mx-auto text-center bg-slate-800/50 rounded-lg shadow-2xl p-8 border border-slate-700">
          <div className="flex items-center justify-center gap-4 mb-4">
              <KeyIcon className="w-10 h-10 text-indigo-400" />
              <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                API Key Required
              </h1>
          </div>
          <p className="text-slate-400 text-lg mb-6">
            To generate videos with the VEO model, you must select a Google AI Studio API key.
          </p>
          <button
            onClick={handleSelectKey}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all duration-200 group"
          >
            <KeyIcon className="w-5 h-5 mr-2 -ml-1" />
            Select Your API Key
          </button>
          <p className="text-xs text-slate-500 mt-4">
             By proceeding, you acknowledge that video generation may incur costs.
             Please review the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-400">billing documentation</a> for details.
          </p>
          {error && (
            <div className="mt-4 text-sm text-red-400 p-3 bg-red-900/30 border border-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <FilmIcon className="w-10 h-10 text-indigo-400" />
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              AI Music Video Director
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            Deeply analyze any song and generate a complete, cinematic music video script.
          </p>
        </header>

        <main>
          {renderContent()}

          {error && !isLoading && appStep === 'input' && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg relative mt-4" role="alert">
              <div className="flex">
                <div className="py-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-red-300">Analysis Failed</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;