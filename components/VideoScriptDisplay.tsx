import React, { useState } from 'react';
import { VideoScript, Scene, SongAnalysis, ElementWithImage, LlmProvider, OllamaConfig } from '../types';
import SceneCard from './SceneCard';
import { SparklesIcon, DownloadIcon, XCircleIcon, SwatchIcon, BoltIcon, CpuIcon, SlidersIcon } from './icons/Icons';
import { ExportScriptModal } from './ExportScriptModal';
import { ComfyUISettingsModal } from './ComfyUISettingsModal';
import { PromptLibraryModal } from './PromptLibraryModal';
import { ComfyUIBatchModal } from './ComfyUIBatchModal';
import { ScriptSummaryPanel } from './ScriptSummaryPanel';
import { SongEnergyTimelineChart } from './SongEnergyTimelineChart';
import { ComfyUIWorkflowAutoSetupCard } from './ComfyUIWorkflowAutoSetupCard';
import { ComfyUIConfig, DEFAULT_COMFYUI_CONFIG, loadComfyUiConfig, saveComfyUiConfig } from '../services/comfyuiService';
import {
  generateJsonExport,
  generateStandardCsvExport,
  generateTxtExport,
  downloadFile
} from '../utils/exportUtils';

interface VideoScriptDisplayProps {
  script: VideoScript;
  audioFile?: File | null;
  elementsWithImages: ElementWithImage[];
  onUpdateScenes: (updatedScenes: Scene[]) => void;
  onSaveScript?: () => void;
  onStartNew: () => void;
  onApiKeyError: () => void;
  llmProvider?: LlmProvider;
  ollamaConfig?: OllamaConfig;
  onOpenOllamaSettings?: () => void;
}

const AnalysisItem: React.FC<{ label: string; value: React.ReactNode; }> = ({ label, value }) => (
    <div>
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{label}</h4>
        <div className="text-lg text-slate-200">{value}</div>
    </div>
);

const SongAnalysisSummary: React.FC<{ analysis: SongAnalysis }> = ({ analysis }) => (
    <div className="mb-8 p-6 bg-slate-800/60 rounded-lg border border-slate-700">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-300 mb-4">
            Song Analysis Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <AnalysisItem label="Tempo" value={<><span className="font-bold">{analysis.bpm}</span> BPM</>} />
            <AnalysisItem label="Musical Key" value={<span className="font-bold">{analysis.musicalKey}</span>} />
            <AnalysisItem label="Dynamics" value={<span className="text-base">{analysis.dynamics}</span>} />
            <div className="col-span-2 md:col-span-3">
                <AnalysisItem 
                    label="Lyrical Themes" 
                    value={
                        <div className="flex flex-wrap gap-2">
                            {analysis.lyricalThemes.map(theme => (
                                <span key={theme} className="bg-slate-700 text-slate-300 text-sm font-medium px-3 py-1 rounded-full">
                                    {theme}
                                </span>
                            ))}
                        </div>
                    } 
                />
            </div>
             <div className="col-span-2 md:col-span-3">
                <AnalysisItem 
                    label="Instrumentation" 
                    value={
                        <div className="flex flex-wrap gap-2">
                            {analysis.instrumentation.map(instrument => (
                                <span key={instrument} className="bg-slate-700 text-slate-300 text-sm font-medium px-3 py-1 rounded-full">
                                    {instrument}
                                </span>
                            ))}
                        </div>
                    } 
                />
            </div>
            <div className="col-span-2 md:col-span-3">
                <AnalysisItem 
                    label="Suggested Color Palette" 
                    value={
                        <div className="flex flex-wrap gap-4 pt-1">
                            {analysis.suggestedColorPalette.map(color => (
                                <div key={color.hex} className="flex items-center" title={color.reason}>
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-500 mr-2" style={{ backgroundColor: color.hex }}></div>
                                    <div>
                                        <p className="font-mono text-sm font-semibold text-slate-200">{color.hex.toUpperCase()}</p>
                                        <p className="text-xs text-slate-400">{color.reason}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    } 
                />
            </div>
        </div>
    </div>
);


const VideoScriptDisplay: React.FC<VideoScriptDisplayProps> = ({ 
  script, 
  audioFile, 
  elementsWithImages, 
  onUpdateScenes, 
  onSaveScript, 
  onStartNew, 
  onApiKeyError,
  llmProvider = 'gemini',
  ollamaConfig,
  onOpenOllamaSettings
}) => {
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isComfySettingsOpen, setIsComfySettingsOpen] = useState(false);
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [promptLibraryTargetScene, setPromptLibraryTargetScene] = useState<number | null>(null);
  const [engineMode, setEngineMode] = useState<'veo' | 'comfyui'>('comfyui');
  const [comfyConfig, setComfyConfig] = useState<ComfyUIConfig>(() => loadComfyUiConfig());

  const handleEdit = (sceneNumber: number) => {
    setEditingSceneId(sceneNumber);
  };

  const handleSave = (updatedScene: Scene) => {
    const newScenes = script.scenes.map(s =>
      s.sceneNumber === updatedScene.sceneNumber ? updatedScene : s
    );
    onUpdateScenes(newScenes);
    setEditingSceneId(null);
  };

  const handleCancel = () => {
    setEditingSceneId(null);
  };

  const handleOpenPromptLibraryForScene = (sceneNumber: number) => {
    setPromptLibraryTargetScene(sceneNumber);
    setIsPromptLibraryOpen(true);
  };

  const handleApplyPresetToScenes = (updatedScenes: Scene[], message: string) => {
    onUpdateScenes(updatedScenes);
    if (onSaveScript) {
      onSaveScript();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Toolbar */}
      <div className="p-6 bg-slate-800/60 rounded-lg border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                {script.title}
                </h2>
                <p className="mt-2 text-slate-400 text-lg flex items-center justify-start gap-2">
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                    Mood: <span className="font-semibold text-slate-300">{script.overallMood}</span>
                </p>
            </div>

            {/* Engine Selector & Export Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Engine Selector Toggle */}
                <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-700 flex items-center gap-1">
                  <button
                    onClick={() => setEngineMode('veo')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      engineMode === 'veo'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Google VEO
                  </button>
                  <button
                    onClick={() => setEngineMode('comfyui')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      engineMode === 'comfyui'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping"></span>
                    ComfyUI Local
                  </button>
                  {engineMode === 'comfyui' && (
                    <button
                      onClick={() => setIsComfySettingsOpen(true)}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-md transition-colors"
                      title="ComfyUI Local Server Settings"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Batch Generate (ComfyUI) Button */}
                <button
                  onClick={() => {
                    setEngineMode('comfyui');
                    setIsBatchModalOpen(true);
                  }}
                  className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-3.5 py-2 border border-amber-500/50 text-xs sm:text-sm font-bold rounded-md text-amber-200 bg-gradient-to-r from-amber-950/90 to-orange-950/90 hover:from-amber-900 hover:to-orange-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-900 transition-all duration-200 shadow-md group"
                  aria-label="Open ComfyUI Batch Video Generator"
                  title="Batch Generate multiple scenes to ComfyUI at once"
                >
                  <BoltIcon className="w-4 h-4 mr-1.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  Batch Generate
                </button>

                {/* Prompt Library Button */}
                <button
                  onClick={() => {
                    setPromptLibraryTargetScene(null);
                    setIsPromptLibraryOpen(true);
                  }}
                  className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-3.5 py-2 border border-indigo-500/40 text-xs sm:text-sm font-semibold rounded-md text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all duration-200 shadow-md group"
                  aria-label="Open Prompt & Style Library"
                  title="Open Prompt Library (Cyberpunk, Watercolor, VHS, etc.)"
                >
                  <SwatchIcon className="w-4 h-4 mr-1.5 text-indigo-400 group-hover:text-indigo-300" />
                  Prompt Library
                </button>

                 <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 hidden md:inline">Export:</span>
                    <button
                      onClick={() => {
                        const safeTitle = script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                        downloadFile(generateJsonExport(script), `${safeTitle}_script.json`, 'application/json');
                      }}
                      className="px-2.5 py-1.5 rounded-md text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 transition-colors"
                      title="Quick Download JSON Format"
                    >
                      .JSON
                    </button>
                    <button
                      onClick={() => {
                        const safeTitle = script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                        downloadFile(generateStandardCsvExport(script), `${safeTitle}_shotlist.csv`, 'text/csv');
                      }}
                      className="px-2.5 py-1.5 rounded-md text-xs font-mono font-bold text-teal-300 bg-teal-950/60 hover:bg-teal-900 border border-teal-700/60 transition-colors"
                      title="Quick Download CSV Format"
                    >
                      .CSV
                    </button>
                    <button
                      onClick={() => {
                        const safeTitle = script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                        downloadFile(generateTxtExport(script), `${safeTitle}_script.txt`, 'text/plain');
                      }}
                      className="px-2.5 py-1.5 rounded-md text-xs font-mono font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors"
                      title="Quick Download TXT Format"
                    >
                      .TXT
                    </button>
                  </div>

                 <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all duration-200 shadow-md"
                    aria-label="Export script for Premiere, Resolve, CSV, JSON, TXT"
                >
                    <DownloadIcon className="w-5 h-5 mr-2 -ml-1"/>
                    Full Export Suite
                </button>
                 <button
                    onClick={onStartNew}
                    className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-900 transition-all duration-200"
                    aria-label="Clear current script and start a new one"
                >
                    <XCircleIcon className="w-5 h-5 mr-2 -ml-1"/>
                    Start New
                </button>
            </div>
        </div>
      </div>
      
      {/* Script Production & Cost Summary Panel */}
      <ScriptSummaryPanel
        script={script}
        engineMode={engineMode}
        onOpenBatchGenerator={() => {
          setEngineMode('comfyui');
          setIsBatchModalOpen(true);
        }}
      />

      {/* ComfyUI AI Intelligence & Auto Workflow Setup Card */}
      <ComfyUIWorkflowAutoSetupCard
        script={script}
        comfyConfig={comfyConfig}
        onUpdateConfig={(newCfg) => {
          setComfyConfig(newCfg);
          saveComfyUiConfig(newCfg);
        }}
        onUpdateScenes={(newScenes) => {
          onUpdateScenes(newScenes);
          if (onSaveScript) onSaveScript();
        }}
        onOpenSettings={() => setIsComfySettingsOpen(true)}
        onOpenBatchModal={() => {
          setEngineMode('comfyui');
          setIsBatchModalOpen(true);
        }}
      />

      {/* Recharts Song Energy & Audio Waveform Dynamic Timeline */}
      <SongEnergyTimelineChart script={script} audioFile={audioFile} />

      {script.analysis && <SongAnalysisSummary analysis={script.analysis} />}

      <div className="space-y-6">
        {script.scenes.map((scene) => (
          <SceneCard 
            key={scene.sceneNumber} 
            scene={scene}
            overallMood={script.overallMood}
            elementsWithImages={elementsWithImages}
            consistentElements={script.consistentElements}
            colorPalette={script.analysis?.suggestedColorPalette}
            engineMode={engineMode}
            comfyConfig={comfyConfig}
            llmProvider={llmProvider}
            ollamaConfig={ollamaConfig}
            isEditing={editingSceneId === scene.sceneNumber}
            onEdit={() => handleEdit(scene.sceneNumber)}
            onSave={handleSave}
            onCancel={handleCancel}
            onApiKeyError={onApiKeyError}
            onOpenPromptLibrary={handleOpenPromptLibraryForScene}
          />
        ))}
      </div>

      {/* Export Script Modal for Premiere, DaVinci Resolve CSV, EDL, JSON, TXT */}
      <ExportScriptModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        script={script}
      />

      {/* ComfyUI Settings Modal */}
      <ComfyUISettingsModal
        isOpen={isComfySettingsOpen}
        onClose={() => setIsComfySettingsOpen(false)}
        config={comfyConfig}
        scriptMood={script.overallMood}
        scriptTitle={script.title}
        analysis={script.analysis}
        scenes={script.scenes}
        onSaveConfig={(newCfg) => setComfyConfig(newCfg)}
      />

      {/* Prompt & Style Library Modal */}
      <PromptLibraryModal
        isOpen={isPromptLibraryOpen}
        onClose={() => {
          setIsPromptLibraryOpen(false);
          setPromptLibraryTargetScene(null);
        }}
        script={script}
        currentSceneNumber={promptLibraryTargetScene}
        onApplyPresetToScenes={handleApplyPresetToScenes}
      />

      {/* ComfyUI Batch Video Generation Modal */}
      <ComfyUIBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        scenes={script.scenes}
        songTitle={script.title || (script as any).songTitle || 'Music Video'}
        comfyConfig={comfyConfig}
        onUpdateConfig={(newCfg) => setComfyConfig(newCfg)}
        onUpdateScenes={(updatedScenes) => {
          onUpdateScenes(updatedScenes);
          if (onSaveScript) {
            onSaveScript();
          }
        }}
        onOpenSettings={() => {
          setIsBatchModalOpen(false);
          setIsComfySettingsOpen(true);
        }}
      />
    </div>
  );
};

export default VideoScriptDisplay;