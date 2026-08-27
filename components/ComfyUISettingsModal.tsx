import React, { useState, useEffect } from 'react';
import { ComfyUIConfig, checkComfyUiStatus, ComfyUIStatus, buildComfyUiApiPayload } from '../services/comfyuiService';
import {
  COMFYUI_ARCHITECTURES,
  GpuTier,
  recommendComfyUiWorkflow,
  AIWorkflowRecommendation,
  generateComfyUiVisualCanvasJson,
  inspectCustomComfyUiWorkflowJson,
  WorkflowInspectionResult,
} from '../services/aiComfyWorkflowService';
import { SongAnalysis, Scene } from '../types';
import {
  XCircleIcon,
  CheckIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  SparklesIcon,
  CpuIcon,
  ServerIcon,
  CommandLineIcon,
  CodeBracketIcon,
  SlidersIcon,
  WrenchScrewdriverIcon,
  DocumentDuplicateIcon,
  DownloadIcon,
  CheckCircle2Icon,
  ExclamationTriangleIcon,
  FilmIcon,
  BoltIcon,
} from './icons/Icons';

interface ComfyUISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ComfyUIConfig;
  scriptMood?: string;
  scriptTitle?: string;
  analysis?: SongAnalysis;
  scenes?: Scene[];
  onSaveConfig: (newConfig: ComfyUIConfig) => void;
}

export const ComfyUISettingsModal: React.FC<ComfyUISettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  scriptMood = 'Cinematic',
  scriptTitle = '',
  analysis,
  scenes = [],
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'ai_smart' | 'pipeline' | 'models' | 'inspector' | 'server' | 'visual_graph'>('ai_smart');
  const [localConfig, setLocalConfig] = useState<ComfyUIConfig>(config);
  const [status, setStatus] = useState<ComfyUIStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // AI Architect State
  const [gpuTier, setGpuTier] = useState<GpuTier>('mid_12gb');
  const [aspectRatio, setAspectRatio] = useState<'16_9' | '9_16' | '1_1'>('16_9');
  const [aiRecommendation, setAiRecommendation] = useState<AIWorkflowRecommendation | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Inspector State
  const [inspectorInput, setInspectorInput] = useState('');
  const [inspectionResult, setInspectionResult] = useState<WorkflowInspectionResult | null>(null);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  // Run AI Recommendation on open or parameter change
  useEffect(() => {
    if (isOpen) {
      const rec = recommendComfyUiWorkflow(scriptMood, analysis, gpuTier, aspectRatio);
      setAiRecommendation(rec);
    }
  }, [isOpen, scriptMood, analysis, gpuTier, aspectRatio]);

  const handleApplyAiRecommendation = () => {
    if (!aiRecommendation) return;
    setLocalConfig(aiRecommendation.optimizedConfig);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const res = await checkComfyUiStatus(localConfig.serverUrl);
    setStatus(res);
    setIsTesting(false);
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleInspectJson = (jsonString: string) => {
    setInspectorInput(jsonString);
    if (!jsonString.trim()) {
      setInspectionResult(null);
      return;
    }
    const result = inspectCustomComfyUiWorkflowJson(jsonString);
    setInspectionResult(result);
  };

  const handleApplyInspectedSettings = () => {
    if (!inspectionResult || !inspectionResult.isValid) return;
    const updated: ComfyUIConfig = { ...localConfig };
    if (inspectionResult.detectedCheckpoint) {
      updated.checkpoint = inspectionResult.detectedCheckpoint;
    }
    if (inspectionResult.detectedSampler?.steps) {
      updated.steps = inspectionResult.detectedSampler.steps;
    }
    if (inspectionResult.detectedSampler?.cfg) {
      updated.cfg = inspectionResult.detectedSampler.cfg;
    }
    if (inspectionResult.detectedSampler?.sampler_name) {
      updated.samplerName = inspectionResult.detectedSampler.sampler_name;
    }
    if (inspectionResult.detectedSampler?.scheduler) {
      updated.scheduler = inspectionResult.detectedSampler.scheduler;
    }
    setLocalConfig(updated);
  };

  const currentArch = COMFYUI_ARCHITECTURES[localConfig.workflowType] || COMFYUI_ARCHITECTURES.wan2_1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full text-slate-200 relative my-6 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-xl text-indigo-400 border border-indigo-500/30 shadow-inner">
              <CpuIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-cyan-200 to-sky-300">
                  ComfyUI AI Workflow Architect & Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 rounded-full">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auto-tune GPU pipelines, generate ComfyUI canvas node graphs & inspect workflows for <span className="text-cyan-300 font-medium">{scriptTitle || 'your music video'}</span>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 py-2.5 border-b border-slate-800/80 bg-slate-900/90 overflow-x-auto scrollbar-none text-xs font-medium">
          <button
            onClick={() => setActiveTab('ai_smart')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'ai_smart'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <SparklesIcon className="w-4 h-4 text-amber-300" />
            <span>AI Smart Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <SlidersIcon className="w-4 h-4 text-indigo-400" />
            <span>Engine & Parameters</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'models'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <WrenchScrewdriverIcon className="w-4 h-4 text-cyan-400" />
            <span>Custom Nodes & Models</span>
          </button>

          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'inspector'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <CodeBracketIcon className="w-4 h-4 text-indigo-300" />
            <span>Workflow Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('visual_graph')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'visual_graph'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <FilmIcon className="w-4 h-4 text-sky-400" />
            <span>Visual Graph & Export</span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'server'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <ServerIcon className="w-4 h-4 text-emerald-400" />
            <span>Server & Tunneling</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: AI SMART SETUP */}
          {activeTab === 'ai_smart' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Hardware Selection Grid */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CpuIcon className="w-4 h-4 text-indigo-400" />
                      Select Your Local GPU Hardware Target
                    </h3>
                    <p className="text-xs text-slate-400">
                      The AI architect adapts resolution, frame buffers, and model weights to your VRAM.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setGpuTier('high_24gb')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      gpuTier === 'high_24gb'
                        ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-900/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-cyan-300">High-End GPU</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-200">
                        16-24GB+
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">RTX 4090 / 3090 / Mac Max</p>
                    <p className="text-[11px] text-slate-400 mt-1">Wan 2.1 14B & Hunyuan 720p 832x480</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGpuTier('mid_12gb')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      gpuTier === 'mid_12gb'
                        ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-900/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-cyan-300">Mid-Range GPU</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-200">
                        10-12GB
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">RTX 4070 / 3060 12GB / Mac Pro</p>
                    <p className="text-[11px] text-slate-400 mt-1">Wan 2.1 1.3B BF16 / AnimateDiff SDXL</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGpuTier('budget_6gb')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      gpuTier === 'budget_6gb'
                        ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-900/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-cyan-300">Budget / Laptop GPU</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-200">
                        6-8GB
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">RTX 4060 / 3060 6GB / 2060</p>
                    <p className="text-[11px] text-slate-400 mt-1">AnimateDiff SD1.5 FP8 & SVD-XT</p>
                  </button>
                </div>

                {/* Aspect Ratio Picker */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-300">Target Video Format:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('16_9')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        aspectRatio === '16_9'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      16:9 Cinematic Widescreen
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('9_16')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        aspectRatio === '9_16'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      9:16 Vertical (TikTok / Shorts)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('1_1')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        aspectRatio === '1_1'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1:1 Square
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Recommendation Strategy Card */}
              {aiRecommendation && (
                <div className="p-5 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-cyan-950/40 border border-indigo-500/40 rounded-2xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <SparklesIcon className="w-3.5 h-3.5 text-amber-300" />
                          Recommended Engine: {aiRecommendation.architecture.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 text-xs font-mono border border-cyan-700/50">
                          {aiRecommendation.genreAlignmentScore}% Genre Match
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 mt-1.5">
                        {aiRecommendation.architecture.tagline}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyAiRecommendation}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-cyan-600 to-sky-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all self-start sm:self-auto border border-indigo-300/30"
                    >
                      <CheckIcon className="w-4 h-4" />
                      <span>Apply AI Settings to Pipeline</span>
                    </button>
                  </div>

                  {/* AI Reasoning List */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block">
                      AI Hardware & Song Dynamics Analysis:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1.5">
                      {aiRecommendation.reasoning.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2Icon className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quick Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Checkpoint</span>
                      <span className="font-mono text-cyan-300 font-semibold truncate block mt-0.5">
                        {aiRecommendation.optimizedConfig.checkpoint.split('.')[0]}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Resolution</span>
                      <span className="font-mono text-cyan-300 font-semibold block mt-0.5">
                        {aiRecommendation.optimizedConfig.width} × {aiRecommendation.optimizedConfig.height}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Steps / CFG</span>
                      <span className="font-mono text-cyan-300 font-semibold block mt-0.5">
                        {aiRecommendation.optimizedConfig.steps} stp / {aiRecommendation.optimizedConfig.cfg} cfg
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Sampler</span>
                      <span className="font-mono text-cyan-300 font-semibold block mt-0.5">
                        {aiRecommendation.optimizedConfig.samplerName}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENGINE & PIPELINE PARAMETERS */}
          {activeTab === 'pipeline' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Workflow Architecture
                  </label>
                  <select
                    value={localConfig.workflowType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      const arch = COMFYUI_ARCHITECTURES[newType];
                      setLocalConfig({
                        ...localConfig,
                        workflowType: newType,
                        checkpoint: arch?.recommendedCheckpoints[0]?.filename || localConfig.checkpoint,
                        steps: arch?.defaultSettings.steps || localConfig.steps,
                        cfg: arch?.defaultSettings.cfg || localConfig.cfg,
                        samplerName: arch?.defaultSettings.samplerName || localConfig.samplerName,
                        scheduler: arch?.defaultSettings.scheduler || localConfig.scheduler,
                      });
                    }}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="wan2_1">Wan 2.1 Video (Text-to-Video & Image-to-Video)</option>
                    <option value="hunyuan_video">HunyuanVideo 720p (High-Speed Action)</option>
                    <option value="animate_diff">AnimateDiff Evolved (SD 1.5 / SDXL)</option>
                    <option value="ltx_video">LTX-Video 0.9.1 (Fast Real-Time)</option>
                    <option value="svd">Stable Video Diffusion (SVD-XT)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {currentArch.tagline}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Model Checkpoint File
                  </label>
                  <input
                    type="text"
                    value={localConfig.checkpoint}
                    onChange={(e) => setLocalConfig({ ...localConfig, checkpoint: e.target.value })}
                    placeholder="wan2.1_t2v_1.3B_bf16.safetensors"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 focus:ring-2 focus:ring-indigo-500"
                  />
                  {/* Quick Preset Buttons for current architecture */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {currentArch.recommendedCheckpoints.map((ckpt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLocalConfig({ ...localConfig, checkpoint: ckpt.filename })}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 truncate max-w-[200px]"
                        title={ckpt.description}
                      >
                        {ckpt.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Inference Steps: {localConfig.steps}</span>
                    <span className="text-slate-400">Quality / Speed</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={localConfig.steps}
                    onChange={(e) => setLocalConfig({ ...localConfig, steps: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>CFG Prompt Guidance: {localConfig.cfg}</span>
                    <span className="text-slate-400">Adherence</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="15.0"
                    step="0.5"
                    value={localConfig.cfg}
                    onChange={(e) => setLocalConfig({ ...localConfig, cfg: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Video Dimensions: {localConfig.width} × {localConfig.height}</span>
                    <span className="text-slate-400">Resolution</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="16"
                      value={localConfig.width}
                      onChange={(e) => setLocalConfig({ ...localConfig, width: parseInt(e.target.value, 10) || 768 })}
                      className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300"
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      step="16"
                      value={localConfig.height}
                      onChange={(e) => setLocalConfig({ ...localConfig, height: parseInt(e.target.value, 10) || 432 })}
                      className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300"
                      placeholder="Height"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Frames per Clip: {localConfig.frameCount} frames</span>
                    <span className="text-slate-400">~{(localConfig.frameCount / (localConfig.fps || 16)).toFixed(1)}s at {localConfig.fps || 16}fps</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="64"
                    step="4"
                    value={localConfig.frameCount}
                    onChange={(e) => setLocalConfig({ ...localConfig, frameCount: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Frame Rate (FPS): {localConfig.fps || 16} fps</span>
                    <span className="text-slate-400">Playback Speed</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="30"
                    step="2"
                    value={localConfig.fps || 16}
                    onChange={(e) => setLocalConfig({ ...localConfig, fps: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Denoising Strength: {localConfig.denoise ?? 1.0}</span>
                    <span className="text-slate-400">1.0 = Pure T2V</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={localConfig.denoise ?? 1.0}
                    onChange={(e) => setLocalConfig({ ...localConfig, denoise: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              {/* Sampler & Scheduler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sampler Method</label>
                  <input
                    type="text"
                    value={localConfig.samplerName}
                    onChange={(e) => setLocalConfig({ ...localConfig, samplerName: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200"
                    placeholder="uni_pc, euler_ancestral, dpmpp_2m"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Noise Scheduler</label>
                  <input
                    type="text"
                    value={localConfig.scheduler}
                    onChange={(e) => setLocalConfig({ ...localConfig, scheduler: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200"
                    placeholder="simple, karras, normal"
                  />
                </div>
              </div>

              {/* LoRA & VAE Optional Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    LoRA Weights File (Optional)
                  </label>
                  <input
                    type="text"
                    value={localConfig.loraName || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, loraName: e.target.value })}
                    placeholder="e.g. film_grain_lora.safetensors"
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Output Video Container
                  </label>
                  <select
                    value={localConfig.videoFormat || 'video/h264-mp4'}
                    onChange={(e) => setLocalConfig({ ...localConfig, videoFormat: e.target.value as any })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-200"
                  >
                    <option value="video/h264-mp4">H.264 MP4 Video (Recommended)</option>
                    <option value="image/webp">Animated WebP (Lightweight)</option>
                    <option value="image/gif">GIF Sequence</option>
                  </select>
                </div>
              </div>

              {/* Negative Prompt */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Global Negative Prompt</label>
                <textarea
                  rows={2}
                  value={localConfig.negativePrompt}
                  onChange={(e) => setLocalConfig({ ...localConfig, negativePrompt: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono"
                  placeholder="blurry, distorted, bad hands, low resolution..."
                />
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM NODES & MODELS */}
          {activeTab === 'models' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-xl flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <p className="font-semibold text-indigo-200 mb-1">
                    Requirements for {currentArch.name}:
                  </p>
                  <p>
                    Ensure you have the required custom nodes installed in your <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">ComfyUI/custom_nodes</code> directory and checkpoints placed in <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">ComfyUI/models/checkpoints</code>.
                  </p>
                </div>
              </div>

              {/* Custom Nodes Checklist */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <WrenchScrewdriverIcon className="w-4 h-4 text-cyan-400" />
                  Required Custom Nodes
                </h4>
                <div className="space-y-2.5">
                  {currentArch.requiredCustomNodes.map((node, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{node.name}</span>
                          <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                            Manager: {node.managerName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-1">{node.cloneCmd}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(node.cloneCmd, `clone_${idx}`)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                      >
                        {copiedCmd === `clone_${idx}` ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <DocumentDuplicateIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy git clone</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Checkpoint Download Links */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <DownloadIcon className="w-4 h-4 text-indigo-400" />
                  Recommended Weights & Checkpoints
                </h4>
                <div className="space-y-2.5">
                  {currentArch.recommendedCheckpoints.map((ckpt, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{ckpt.name}</span>
                          <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            {ckpt.fileSize}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{ckpt.description}</p>
                      </div>
                      <a
                        href={ckpt.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>Download Weights</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WORKFLOW INSPECTOR & JSON IMPORTER */}
          {activeTab === 'inspector' && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Paste Custom ComfyUI Workflow JSON (Canvas UI format or API format)
                </label>
                <textarea
                  rows={5}
                  value={inspectorInput}
                  onChange={(e) => handleInspectJson(e.target.value)}
                  placeholder="Paste your exported ComfyUI workflow JSON here to inspect nodes and extract parameters..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {inspectionResult && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    inspectionResult.isValid
                      ? 'bg-slate-950/80 border-cyan-600/50'
                      : 'bg-red-950/40 border-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {inspectionResult.isValid ? (
                        <CheckCircle2Icon className="w-5 h-5 text-green-400" />
                      ) : (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                      )}
                      <span className="text-sm font-bold text-white">
                        {inspectionResult.isValid
                          ? `Valid ${inspectionResult.format === 'ui_canvas_graph' ? 'ComfyUI Canvas UI' : 'REST API'} Graph Detected`
                          : 'Invalid Workflow JSON'}
                      </span>
                    </div>
                    {inspectionResult.isValid && (
                      <span className="text-xs font-mono px-2 py-0.5 bg-indigo-900/60 text-indigo-300 rounded border border-indigo-700">
                        {inspectionResult.nodeCount} Nodes
                      </span>
                    )}
                  </div>

                  {inspectionResult.isValid && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Architecture</span>
                          <span className="font-semibold text-cyan-300">{inspectionResult.detectedArchitecture}</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Checkpoint</span>
                          <span className="font-semibold text-cyan-300 truncate block">
                            {inspectionResult.detectedCheckpoint || 'Not fixed'}
                          </span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Prompt Slots</span>
                          <span className="font-semibold text-cyan-300">
                            {inspectionResult.detectedPromptNodes.length} CLIP Nodes
                          </span>
                        </div>
                      </div>

                      {inspectionResult.missingCustomNodes.length > 0 && (
                        <div className="p-2.5 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300">
                          <span className="font-bold block mb-1">Detected Custom Node Dependencies:</span>
                          <ul className="list-disc list-inside space-y-0.5">
                            {inspectionResult.missingCustomNodes.map((n, i) => (
                              <li key={i}>{n}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleApplyInspectedSettings}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5"
                        >
                          <CheckIcon className="w-4 h-4" />
                          <span>Extract & Use Detected Model & Sampler</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VISUAL GRAPH & EXPORT STUDIO */}
          {activeTab === 'visual_graph' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Interactive Node Graph Visualization */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <FilmIcon className="w-4 h-4 text-cyan-400" />
                    ComfyUI Pipeline Node Flow
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Resolution: {localConfig.width}x{localConfig.height} | {localConfig.frameCount} frames
                  </span>
                </div>

                {/* SVG Visual Flowchart */}
                <div className="overflow-x-auto py-3">
                  <div className="min-w-[650px] flex items-center justify-between gap-3 text-center text-xs">
                    <div className="p-3 bg-indigo-950/80 border border-indigo-700 rounded-xl w-36 shadow-lg">
                      <span className="text-[10px] font-bold text-indigo-300 block uppercase">Loader</span>
                      <span className="font-mono text-white text-[11px] truncate block mt-1">CheckpointLoader</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{localConfig.checkpoint}</span>
                    </div>

                    <span className="text-indigo-400 font-bold">➔</span>

                    <div className="space-y-2">
                      <div className="p-2.5 bg-emerald-950/80 border border-emerald-700 rounded-xl w-36 shadow-lg">
                        <span className="text-[10px] font-bold text-emerald-300 block uppercase">Positive Prompt</span>
                        <span className="text-[10px] text-slate-300 block mt-0.5">Scene Prompt VEO</span>
                      </div>
                      <div className="p-2.5 bg-rose-950/80 border border-rose-700 rounded-xl w-36 shadow-lg">
                        <span className="text-[10px] font-bold text-rose-300 block uppercase">Negative Prompt</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{localConfig.negativePrompt.slice(0, 16)}...</span>
                      </div>
                    </div>

                    <span className="text-indigo-400 font-bold">➔</span>

                    <div className="p-3 bg-amber-950/80 border border-amber-700 rounded-xl w-36 shadow-lg">
                      <span className="text-[10px] font-bold text-amber-300 block uppercase">KSampler Engine</span>
                      <span className="font-mono text-white text-[11px] block mt-1">{localConfig.samplerName}</span>
                      <span className="text-[10px] text-amber-400 block mt-0.5">{localConfig.steps} stp / {localConfig.cfg} cfg</span>
                    </div>

                    <span className="text-indigo-400 font-bold">➔</span>

                    <div className="p-3 bg-purple-950/80 border border-purple-700 rounded-xl w-36 shadow-lg">
                      <span className="text-[10px] font-bold text-purple-300 block uppercase">VAE & Video</span>
                      <span className="font-mono text-white text-[11px] block mt-1">VHS_VideoCombine</span>
                      <span className="text-[10px] text-purple-300 block mt-0.5">MP4 H.264 Video</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Downloadable Artifacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <DownloadIcon className="w-4 h-4 text-cyan-400" />
                      Download Visual Canvas UI Workflow (.json)
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Full drag-and-drop workflow file for the ComfyUI desktop browser canvas interface with node layout and groupings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleScene: Scene = scenes[0] || {
                        sceneNumber: 1,
                        description: 'Opening visual scene',
                        veoPrompt: 'Cinematic music video opening shot, atmospheric lighting, 35mm film',
                        correspondingLyrics: [],
                      };
                      const canvasGraph = generateComfyUiVisualCanvasJson(sampleScene, localConfig, scriptTitle);
                      const blob = new Blob([JSON.stringify(canvasGraph, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `comfyui_canvas_workflow_${(scriptTitle || 'mv').replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download Canvas UI .json</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <CodeBracketIcon className="w-4 h-4 text-indigo-400" />
                      Download Headless API Graph (.json)
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      REST API payload format ready to send via HTTP POST to your local ComfyUI <code className="text-cyan-300">/prompt</code> endpoint.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const apiGraph = buildComfyUiApiPayload(
                        scenes[0]?.veoPrompt || 'Cinematic shot',
                        localConfig
                      );
                      const blob = new Blob([JSON.stringify(apiGraph, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `comfyui_api_prompt_${(scriptTitle || 'mv').replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download API Graph .json</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SERVER & TUNNELING */}
          {activeTab === 'server' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Server Endpoint Bar */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  ComfyUI Server Endpoint URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={localConfig.serverUrl}
                    onChange={(e) => setLocalConfig({ ...localConfig, serverUrl: e.target.value })}
                    placeholder="http://127.0.0.1:8188"
                    className="flex-1 p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-cyan-300 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isTesting ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin text-cyan-300" />
                    ) : (
                      <ArrowPathIcon className="w-4 h-4 text-cyan-300" />
                    )}
                    <span>Test Connection</span>
                  </button>
                </div>

                {status && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      status.online
                        ? 'bg-green-950/60 text-green-300 border-green-700'
                        : 'bg-amber-950/60 text-amber-300 border-amber-700'
                    }`}
                  >
                    {status.online ? (
                      <>
                        <CheckCircle2Icon className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span>Connected! {status.device} — VRAM Free: {status.vramFree || 'Ready'}</span>
                      </>
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>{status.message}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Launch & Tunneling Helper */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <CommandLineIcon className="w-4 h-4 text-indigo-400" />
                  CLI Launch & Remote Tunnel Instructions
                </h4>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <span className="font-semibold text-slate-200 block">1. Standard Local Launch with CORS:</span>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-cyan-300 border border-slate-800">
                    <code>python main.py --listen 0.0.0.0 --enable-cors-header "*"</code>
                    <button
                      type="button"
                      onClick={() => handleCopyText('python main.py --listen 0.0.0.0 --enable-cors-header "*"', 'cors_cmd')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedCmd === 'cors_cmd' ? <CheckIcon className="w-4 h-4 text-green-400" /> : <DocumentDuplicateIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <span className="font-semibold text-slate-200 block">2. HTTPS Tunnel (If browser blocks mixed-content HTTP):</span>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-cyan-300 border border-slate-800">
                    <code>ngrok http 8188</code>
                    <button
                      type="button"
                      onClick={() => handleCopyText('ngrok http 8188', 'ngrok_cmd')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedCmd === 'ngrok_cmd' ? <CheckIcon className="w-4 h-4 text-green-400" /> : <DocumentDuplicateIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Active Model: <strong className="text-slate-200">{currentArch.name}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              <span>Save & Apply Pipeline</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default ComfyUISettingsModal;
