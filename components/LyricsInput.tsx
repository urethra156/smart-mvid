import React, { useState } from 'react';
import { 
  SparklesIcon, 
  UploadIcon, 
  AudioWaveIcon, 
  XCircleIcon, 
  CpuIcon, 
  CodeBracketIcon, 
  SlidersIcon, 
  FilmIcon,
  BoltIcon,
  ServerIcon,
  CheckCircle2Icon
} from './icons/Icons';
import { MoodPreset, LlmProvider, OllamaConfig } from '../types';
import { ComfyUIConfig, ComfyUIStatus } from '../services/comfyuiService';
import { COMFYUI_ARCHITECTURES, GpuTier } from '../services/aiComfyWorkflowService';

interface LyricsInputProps {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  songLength: { minutes: string; seconds: string };
  setSongLength: (length: { minutes: string; seconds: string }) => void;
  selectedMood: MoodPreset;
  setSelectedMood: (mood: MoodPreset) => void;
  onSubmit: () => void;
  isLoading: boolean;
  llmProvider?: LlmProvider;
  onSelectProvider?: (provider: LlmProvider) => void;
  ollamaConfig?: OllamaConfig;
  onOpenOllamaSettings?: () => void;
  comfyConfig?: ComfyUIConfig;
  onUpdateComfyConfig?: (config: ComfyUIConfig) => void;
  onOpenComfySettings?: () => void;
  comfyStatus?: ComfyUIStatus | null;
  videoTarget?: 'comfyui' | 'veo';
  setVideoTarget?: (target: 'comfyui' | 'veo') => void;
}

const visualStyles: MoodPreset[] = [
    'Cinematic', 'Abstract', 'Documentary', 'High Energy', 'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Folk/Acoustic',
    'Romantic', 'Melancholic', 'Psychedelic', 'Film Noir', 'Vaporwave', 'Anime', 'Wes Anderson', 'Minimalist', 'Gothic', 'Surrealist',
    'Horror', 'Thriller', 'Cyberpunk', 'Steampunk'
];

const StyleButton: React.FC<{
  preset: MoodPreset;
  selectedMood: MoodPreset;
  onClick: (mood: MoodPreset) => void;
  disabled: boolean;
}> = ({ preset, selectedMood, onClick, disabled }) => (
  <button
    key={preset}
    type="button"
    role="radio"
    aria-checked={selectedMood === preset}
    onClick={() => onClick(preset)}
    disabled={disabled}
    className={`w-full px-4 py-2.5 text-sm font-semibold text-center rounded-lg transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500
      ${selectedMood === preset
        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
      }
      disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {preset}
  </button>
);


const LyricsInput: React.FC<LyricsInputProps> = ({ 
  lyrics, setLyrics, audioFile, setAudioFile, songLength, setSongLength, 
  selectedMood, setSelectedMood, onSubmit, isLoading,
  llmProvider = 'gemini',
  onSelectProvider,
  ollamaConfig,
  onOpenOllamaSettings,
  comfyConfig,
  onUpdateComfyConfig,
  onOpenComfySettings,
  comfyStatus,
  videoTarget = 'comfyui',
  setVideoTarget,
}) => {
  const [activeGpuTier, setActiveGpuTier] = useState<GpuTier>('mid_12gb');

  const handleTimeChange = (part: 'minutes' | 'seconds', value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 2);
    setSongLength({ ...songLength, [part]: sanitizedValue });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAudioFile(file);

      // Create an audio object to read metadata
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src); // Clean up
        const duration = audio.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        setSongLength({
          minutes: String(minutes).padStart(2, '0'),
          seconds: String(seconds).padStart(2, '0')
        });
      };
      
      audio.onerror = () => {
          console.error("Error loading audio file metadata.");
      };
      
      audio.src = window.URL.createObjectURL(file);
    }
  };

  const currentArchKey = comfyConfig?.workflowType || 'wan2_1';
  const currentArch = COMFYUI_ARCHITECTURES[currentArchKey] || COMFYUI_ARCHITECTURES.wan2_1;

  const handleSelectArchitecture = (archKey: keyof typeof COMFYUI_ARCHITECTURES) => {
    if (!onUpdateComfyConfig || !comfyConfig) return;
    const arch = COMFYUI_ARCHITECTURES[archKey];
    if (arch) {
      onUpdateComfyConfig({
        ...comfyConfig,
        workflowType: archKey as any,
        checkpoint: arch.recommendedCheckpoints[0]?.filename || comfyConfig.checkpoint,
        steps: arch.defaultSettings.steps || comfyConfig.steps,
        cfg: arch.defaultSettings.cfg || comfyConfig.cfg,
        samplerName: arch.defaultSettings.samplerName || comfyConfig.samplerName,
        scheduler: arch.defaultSettings.scheduler || comfyConfig.scheduler,
      });
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Composing Script & Auto-Tuning Video Workflows...';
    if (videoTarget === 'comfyui') {
      return `⚡ Generate Script & Auto-Setup ComfyUI (${currentArch.name})`;
    }
    if (llmProvider === 'ollama') return `Generate Script with Ollama (${ollamaConfig?.model || 'llama3.2'})`;
    if (llmProvider === 'opencode') return `Generate Script with Open Code (${ollamaConfig?.openCodeModel || 'Local'})`;
    return 'Create VEO Script with AI';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Engine Configuration: Script LLM & ComfyUI Video Generator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. Scriptwriter LLM Engine */}
        <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl flex flex-col justify-between gap-2 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">1. Scriptwriter LLM:</span>
            {onOpenOllamaSettings && (
              <button
                type="button"
                onClick={onOpenOllamaSettings}
                disabled={isLoading}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                title="Configure Ollama / Open Code endpoints"
              >
                <SlidersIcon className="w-3 h-3" />
                <span>Config</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onSelectProvider?.('gemini')}
              disabled={isLoading}
              className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                llmProvider === 'gemini'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SparklesIcon className="w-3 h-3 text-amber-300" />
              <span>Gemini</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectProvider?.('ollama')}
              disabled={isLoading}
              className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                llmProvider === 'ollama'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CpuIcon className="w-3 h-3 text-cyan-200" />
              <span>Ollama</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectProvider?.('opencode')}
              disabled={isLoading}
              className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                llmProvider === 'opencode'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CodeBracketIcon className="w-3 h-3 text-emerald-200" />
              <span>Open Code</span>
            </button>
          </div>
        </div>

        {/* 2. Video Generator Pipeline (ComfyUI Models vs Cloud VEO) */}
        <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl flex flex-col justify-between gap-2 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">2. Video Generator Engine:</span>
              <span className={`w-2 h-2 rounded-full ${comfyStatus?.online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
            </div>
            {onOpenComfySettings && (
              <button
                type="button"
                onClick={onOpenComfySettings}
                className="text-[11px] text-cyan-300 hover:text-white flex items-center gap-1"
                title="Open ComfyUI Model Architect & Settings"
              >
                <SlidersIcon className="w-3 h-3" />
                <span>ComfyUI Studio</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setVideoTarget?.('comfyui')}
              disabled={isLoading}
              className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                videoTarget === 'comfyui'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CpuIcon className="w-3.5 h-3.5 text-cyan-200" />
              <span>ComfyUI Local Models</span>
            </button>
            <button
              type="button"
              onClick={() => setVideoTarget?.('veo')}
              disabled={isLoading}
              className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                videoTarget === 'veo'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FilmIcon className="w-3.5 h-3.5 text-amber-300" />
              <span>Google VEO Cloud</span>
            </button>
          </div>
        </div>
      </div>

      {/* ComfyUI Model Architecture Quick Selector on Landing Page */}
      {videoTarget === 'comfyui' && (
        <div className="p-4 bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 border border-cyan-500/30 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-200">
                Target ComfyUI Video Architecture:
              </span>
              <p className="text-[11px] text-slate-400">
                Auto-generates ready-to-run ComfyUI Canvas Graphs & API JSONs tailored to your model weights.
              </p>
            </div>
            {onOpenComfySettings && (
              <button
                type="button"
                onClick={onOpenComfySettings}
                className="text-xs text-indigo-300 hover:text-indigo-200 underline font-medium self-start sm:self-auto"
              >
                Model Architect & Downloads →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['wan2_1', 'hunyuan_video', 'animate_diff', 'ltx_video'] as const).map((archKey) => {
              const arch = COMFYUI_ARCHITECTURES[archKey];
              const isSelected = currentArchKey === archKey;
              return (
                <button
                  key={archKey}
                  type="button"
                  onClick={() => handleSelectArchitecture(archKey)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-950/80 border-cyan-400 shadow-md shadow-cyan-900/20'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-cyan-200' : 'text-slate-200'}`}>
                      {arch.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                    {arch.badge} • {arch.recommendedVram}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span>Server:</span>
              <code className="text-cyan-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {comfyConfig?.serverUrl || 'http://127.0.0.1:8188'}
              </code>
              <span className={`text-[10px] ${comfyStatus?.online ? 'text-emerald-400' : 'text-amber-400'}`}>
                {comfyStatus?.online ? '● Online' : '○ Standby'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Aspect:</span>
              <span className="font-mono text-slate-300 font-semibold">
                {comfyConfig?.width || 768}x{comfyConfig?.height || 432} ({comfyConfig?.frameCount || 16}f)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notice when local LLM engine selected on HTTPS */}
      {llmProvider !== 'gemini' && typeof window !== 'undefined' && window.location.protocol === 'https:' && (ollamaConfig?.endpoint?.startsWith('http://') || ollamaConfig?.openCodeEndpoint?.startsWith('http://')) && (
        <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs flex items-center justify-between gap-3 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>
              Connected to HTTPS app: Use an HTTPS tunnel (e.g. <code className="text-cyan-300 font-mono bg-slate-950 px-1 py-0.5 rounded">ngrok http 11434</code>) in settings for local Ollama, or use <strong>Gemini Cloud</strong> for 1-click cloud generation.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectProvider?.('gemini')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline whitespace-nowrap"
          >
            Switch to Gemini
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
         <div>
            <h2 className="text-lg font-semibold text-slate-300">
                Provide Your Song
            </h2>
             <p className="text-sm text-slate-400 mt-1">Upload an audio file and/or provide lyrics below.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <label htmlFor="minutes" className="text-sm font-medium text-slate-400 whitespace-nowrap">Song Length:</label>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    id="minutes"
                    name="minutes"
                    value={songLength.minutes}
                    onChange={(e) => handleTimeChange('minutes', e.target.value)}
                    onBlur={(e) => setSongLength({...songLength, minutes: e.target.value.padStart(2, '0')})}
                    disabled={isLoading || !!audioFile}
                    className="w-14 bg-slate-900 border border-slate-600 rounded-md text-slate-200 text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-1.5 px-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="MM"
                    aria-label="Song length in minutes"
                    min="0"
                    max="99"
                />
                <span className="text-slate-400 font-bold">:</span>
                <input
                    type="number"
                    id="seconds"
                    name="seconds"
                    value={songLength.seconds}
                    onChange={(e) => handleTimeChange('seconds', e.target.value)}
                    onBlur={(e) => setSongLength({...songLength, seconds: e.target.value.padStart(2, '0')})}
                    disabled={isLoading || !!audioFile}
                    className="w-14 bg-slate-900 border border-slate-600 rounded-md text-slate-200 text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-1.5 px-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="SS"
                    aria-label="Song length in seconds"
                    min="0"
                    max="59"
                />
            </div>
        </div>
      </div>

      <div>
        {!audioFile ? (
          <>
            <input 
              type="file" 
              id="audio-upload" 
              className="hidden" 
              onChange={handleFileChange} 
              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/flac,audio/aac" 
              disabled={isLoading}
            />
            <label 
              htmlFor="audio-upload"
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 border-2 border-dashed border-slate-600 text-slate-300
                ${isLoading 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer hover:bg-slate-700/50 hover:border-indigo-500 hover:text-white'
                }`
              }
            >
              <UploadIcon className="w-5 h-5"/>
              Upload Song File (MP3, WAV, etc.)
            </label>
          </>
        ) : (
          <div className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-slate-900/80 border-2 border-indigo-500 text-slate-200">
            <div className="flex items-center gap-2 overflow-hidden">
                <AudioWaveIcon className="w-5 h-5 text-indigo-400 flex-shrink-0"/>
                <span className="truncate" title={audioFile.name}>{audioFile.name}</span>
            </div>
            <button 
              onClick={() => setAudioFile(null)} 
              disabled={isLoading}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
              aria-label="Remove audio file"
            >
                <XCircleIcon className="w-5 h-5"/>
            </button>
          </div>
        )}
      </div>
      
      <textarea
        id="lyrics"
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        placeholder={
            audioFile 
              ? "Optional: Paste lyrics here to guide the AI, or leave blank to transcribe from audio." 
              : `e.g.,\n\n[Verse 1]\nHello from the other side\nI must've called a thousand times\n\n[Chorus]\nTo tell you I'm sorry...\n\n[Instrumental]\n...\n`
          }
        className="w-full h-48 p-4 bg-slate-900 border border-slate-600 rounded-md resize-y text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-40 disabled:bg-slate-800"
        disabled={isLoading}
        aria-label="Song lyrics input"
      />

      <fieldset>
        <legend className="text-lg font-semibold text-slate-300 mb-3">Choose a Visual Style</legend>
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visualStyles.map((preset) => (
              <StyleButton
                key={preset}
                preset={preset}
                selectedMood={selectedMood}
                onClick={setSelectedMood}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>
      </fieldset>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className={`inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-bold rounded-lg shadow-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed transition-all duration-200 group mt-2 ${
          videoTarget === 'comfyui'
            ? 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600'
            : llmProvider === 'ollama'
            ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-850'
            : llmProvider === 'opencode'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-850'
            : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900'
        }`}
      >
        {videoTarget === 'comfyui' ? (
          <BoltIcon className="w-5 h-5 mr-2 -ml-1 text-cyan-200 transition-transform duration-300 group-hover:scale-110" />
        ) : llmProvider === 'ollama' ? (
          <CpuIcon className="w-5 h-5 mr-2 -ml-1 text-cyan-200 transition-transform duration-300 group-hover:rotate-12" />
        ) : llmProvider === 'opencode' ? (
          <CodeBracketIcon className="w-5 h-5 mr-2 -ml-1 text-emerald-200 transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <SparklesIcon className="w-5 h-5 mr-2 -ml-1 transition-transform duration-300 group-hover:rotate-12" />
        )}
        {getButtonText()}
      </button>
    </div>
  );
};

export default LyricsInput;