import React, { useState, useEffect } from 'react';
import { Scene, SongAnalysis, VideoScript } from '../types';
import { 
  ComfyUIConfig, 
  checkComfyUiStatus, 
  ComfyUIStatus, 
  DEFAULT_COMFYUI_CONFIG 
} from '../services/comfyuiService';
import { 
  recommendComfyUiWorkflow, 
  optimizeSceneWorkflow, 
  GpuTier, 
  COMFYUI_ARCHITECTURES,
  AIWorkflowRecommendation
} from '../services/aiComfyWorkflowService';
import {
  SparklesIcon,
  BoltIcon,
  CpuIcon,
  ServerIcon,
  SlidersIcon,
  CheckCircle2Icon,
  ArrowPathIcon,
  CodeBracketIcon,
  CommandLineIcon,
  InformationCircleIcon
} from './icons/Icons';

interface ComfyUIWorkflowAutoSetupCardProps {
  script: VideoScript;
  comfyConfig: ComfyUIConfig;
  onUpdateConfig: (config: ComfyUIConfig) => void;
  onUpdateScenes: (updatedScenes: Scene[]) => void;
  onOpenSettings: () => void;
  onOpenBatchModal: () => void;
}

export const ComfyUIWorkflowAutoSetupCard: React.FC<ComfyUIWorkflowAutoSetupCardProps> = ({
  script,
  comfyConfig,
  onUpdateConfig,
  onUpdateScenes,
  onOpenSettings,
  onOpenBatchModal,
}) => {
  const [gpuTier, setGpuTier] = useState<GpuTier>('mid_12gb');
  const [aspectRatio, setAspectRatio] = useState<'16_9' | '9_16' | '1_1'>('16_9');
  const [recommendation, setRecommendation] = useState<AIWorkflowRecommendation | null>(null);
  const [serverStatus, setServerStatus] = useState<ComfyUIStatus | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [isApplyingAutoTune, setIsApplyingAutoTune] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [showCliSnippet, setShowCliSnippet] = useState(false);

  // Compute AI recommendation whenever mood, analysis, or GPU tier changes
  useEffect(() => {
    const rec = recommendComfyUiWorkflow(
      script.overallMood,
      script.analysis,
      gpuTier,
      aspectRatio
    );
    setRecommendation(rec);
  }, [script.overallMood, script.analysis, gpuTier, aspectRatio]);

  // Check ComfyUI server connectivity
  const checkStatus = async () => {
    setIsCheckingServer(true);
    try {
      const res = await checkComfyUiStatus(comfyConfig.serverUrl);
      setServerStatus(res);
    } catch {
      setServerStatus({
        online: false,
        message: 'Could not connect to ComfyUI server.',
      });
    } finally {
      setIsCheckingServer(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [comfyConfig.serverUrl]);

  // 1-Click AI Auto Workflow Setup: Apply optimal config and enhance all scenes
  const handleApplyAutoWorkflow = () => {
    if (!recommendation) return;

    setIsApplyingAutoTune(true);

    // 1. Update global config with AI-optimized parameters
    onUpdateConfig(recommendation.optimizedConfig);

    // 2. Enhance each scene with tailored prompt formatting, lighting tags, and camera movement
    const enhancedScenes = script.scenes.map((scene) => {
      const sceneOpt = optimizeSceneWorkflow(
        scene,
        script.overallMood,
        script.analysis,
        gpuTier,
        recommendation.optimizedConfig
      );

      return {
        ...scene,
        veoPrompt: sceneOpt.enhancedPrompt,
        cameraAngle: scene.cameraAngle || sceneOpt.cameraMovementTag,
      };
    });

    onUpdateScenes(enhancedScenes);

    setAppliedNotice(
      `AI Auto-Workflow deployed: Configured ${recommendation.architecture.name} (${recommendation.optimizedConfig.samplerName}, ${recommendation.optimizedConfig.steps} steps) and enhanced ${enhancedScenes.length} scenes!`
    );

    setTimeout(() => {
      setIsApplyingAutoTune(false);
      setTimeout(() => setAppliedNotice(null), 5000);
    }, 600);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-cyan-500/30 rounded-xl p-5 shadow-xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-cyan-950/80 rounded-xl border border-cyan-600/40 text-cyan-400 flex-shrink-0 mt-0.5">
            <CpuIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-white">
                ComfyUI AI Model Engine & Auto-Workflow Setup
              </h3>
              {recommendation && (
                <span className="px-2.5 py-0.5 bg-indigo-900/60 border border-indigo-500/50 text-indigo-300 text-[11px] font-bold rounded-full">
                  {recommendation.architecture.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automated AI pipeline tailored to song BPM ({script.analysis?.bpm || 115}), musical key ({script.analysis?.musicalKey || 'Dynamic'}), and director mood.
            </p>
          </div>
        </div>

        {/* Server Connection Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                serverStatus?.online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-mono">
              {serverStatus?.online ? 'ComfyUI Online' : 'Local ComfyUI Mode'}
            </span>
            {serverStatus?.vramFree && (
              <span className="text-[10px] text-cyan-400 font-mono">
                ({serverStatus.vramFree} Free)
              </span>
            )}
            <button
              onClick={checkStatus}
              disabled={isCheckingServer}
              className="p-1 text-slate-400 hover:text-cyan-300 transition-colors ml-1"
              title="Refresh ComfyUI Connection"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${isCheckingServer ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Configure Model Architecture & Checkpoints"
          >
            <SlidersIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Intelligence Grid */}
      {recommendation && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          {/* 1. Recommended Architecture */}
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                Recommended AI Architecture
              </span>
              <h4 className="text-sm font-bold text-slate-100 mt-1">
                {recommendation.architecture.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                {recommendation.architecture.tagline}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Checkpoint:</span>
              <span className="font-mono text-cyan-300 font-semibold truncate max-w-[130px]" title={recommendation.optimizedConfig.checkpoint}>
                {recommendation.optimizedConfig.checkpoint}
              </span>
            </div>
          </div>

          {/* 2. Hardware VRAM Selector */}
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                Hardware VRAM Target
              </span>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {(['budget_6gb', 'mid_12gb', 'high_24gb'] as GpuTier[]).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setGpuTier(tier)}
                    className={`py-1.5 px-2 rounded-md font-semibold text-[10px] transition-all text-center ${
                      gpuTier === tier
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {tier === 'budget_6gb' ? '6GB-8GB' : tier === 'mid_12gb' ? '12GB VRAM' : '24GB Max'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Aspect Ratio:</span>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                {(['16_9', '9_16', '1_1'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-1.5 py-0.5 rounded ${
                      aspectRatio === ratio ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ratio === '16_9' ? '16:9' : ratio === '9_16' ? '9:16' : '1:1'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Inference Parameters */}
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Auto-Tuned Settings
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1.5 text-[11px]">
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Sampler</span>
                  <span className="font-mono font-semibold text-slate-200">{recommendation.optimizedConfig.samplerName}</span>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Steps & CFG</span>
                  <span className="font-mono font-semibold text-slate-200">{recommendation.optimizedConfig.steps} st / {recommendation.optimizedConfig.cfg} cfg</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Resolution:</span>
              <span className="font-mono text-emerald-300 font-semibold">
                {recommendation.optimizedConfig.width}x{recommendation.optimizedConfig.height} ({recommendation.optimizedConfig.frameCount}f)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Main 1-Click AI Auto Setup Button */}
          <button
            onClick={handleApplyAutoWorkflow}
            disabled={isApplyingAutoTune}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all group"
          >
            <SparklesIcon className="w-4 h-4 text-cyan-200 group-hover:rotate-12 transition-transform" />
            <span>
              {isApplyingAutoTune ? 'Auto-Tuning All Scenes...' : '⚡ Auto-Setup & Format All Scenes'}
            </span>
          </button>

          {/* Batch Generate Modal Trigger */}
          <button
            onClick={onOpenBatchModal}
            className="px-3.5 py-2 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/40 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <BoltIcon className="w-4 h-4 text-amber-400" />
            <span>Batch Render All ({script.scenes.length} Scenes)</span>
          </button>

          {/* CLI Helper Toggle */}
          <button
            onClick={() => setShowCliSnippet(!showCliSnippet)}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
            title="View ComfyUI startup command"
          >
            <CommandLineIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Launch CLI</span>
          </button>
        </div>

        {/* AI Alignment Score */}
        {recommendation && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Model-to-Song Synergy:</span>
            <div className="flex items-center gap-1 font-mono font-bold text-cyan-300">
              <span className="text-sm">{recommendation.genreAlignmentScore}%</span>
              <span className="text-[10px] text-emerald-400">Optimal</span>
            </div>
          </div>
        )}
      </div>

      {/* CLI Launch Helper Snippet */}
      {showCliSnippet && (
        <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs animate-fadeIn">
          <div className="flex items-center justify-between mb-1.5 text-slate-300">
            <span className="font-semibold text-cyan-400">Recommended ComfyUI Launch Command:</span>
            <button
              onClick={() => {
                if (recommendation) {
                  navigator.clipboard.writeText(recommendation.customLaunchCommand);
                }
              }}
              className="text-[10px] text-indigo-300 hover:underline"
            >
              Copy Command
            </button>
          </div>
          <code className="block bg-slate-900 p-2 rounded text-emerald-400 font-mono text-[11px] overflow-x-auto">
            {recommendation?.customLaunchCommand || 'python main.py --listen 0.0.0.0 --enable-cors-header "*"'}
          </code>
          <p className="mt-2 text-[10px] text-slate-400">
            {recommendation?.vramAdvice} Run this in your local ComfyUI folder to enable web execution.
          </p>
        </div>
      )}

      {/* Success Notification */}
      {appliedNotice && (
        <div className="mt-3 p-2.5 bg-emerald-950/80 border border-emerald-600/60 rounded-lg text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}
    </div>
  );
};
