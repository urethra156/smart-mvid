import React from 'react';
import { VideoScript } from '../types';
import { FilmIcon, ClockIcon, SparklesIcon, InformationCircleIcon, BoltIcon } from './icons/Icons';

interface ScriptSummaryPanelProps {
  script: VideoScript;
  engineMode: 'veo' | 'comfyui';
  onOpenBatchGenerator?: () => void;
}

export const ScriptSummaryPanel: React.FC<ScriptSummaryPanelProps> = ({ script, engineMode, onOpenBatchGenerator }) => {
  const sceneCount = script.scenes.length;

  // Calculate total duration in seconds
  const totalDurationSeconds = script.scenes.reduce((acc, scene) => {
    if (scene.endTimeSeconds && scene.startTimeSeconds !== undefined) {
      return Math.max(acc, scene.endTimeSeconds);
    }
    return acc;
  }, 0) || (sceneCount * 5); // fallback 5 seconds per scene

  const durationMinutes = totalDurationSeconds / 60;
  const shotsPerMinute = durationMinutes > 0 ? (sceneCount / durationMinutes) : 0;
  const avgShotLength = sceneCount > 0 ? (totalDurationSeconds / sceneCount) : 0;

  // Estimated cost per scene
  // VEO: ~$0.15 / 5-second 1080p generation
  // ComfyUI: $0.00 local compute
  const veoCostPerScene = 0.15;
  const totalVeoCost = sceneCount * veoCostPerScene;

  // Format time (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine pacing label based on shots per minute
  const getPacingLabel = (spm: number) => {
    if (spm >= 20) return 'Ultra High-Energy (Rapid Edits)';
    if (spm >= 14) return 'Fast-Paced (Pop / Hip-Hop)';
    if (spm >= 8) return 'Moderate (Cinematic Storytelling)';
    return 'Slow / Ambient (Atmospheric)';
  };

  return (
    <div className="p-6 bg-slate-900/90 rounded-xl border border-slate-700/80 shadow-xl mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700/60 uppercase tracking-wide">
              Director Executive Summary
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {script.overallMood} Style Blueprint
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1">
            Production & Generation Statistics
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Generation Engine:</span>
          <span className={`px-3 py-1 rounded-md text-xs font-bold font-mono border ${
            engineMode === 'comfyui'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700/60'
              : 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
          }`}>
            {engineMode === 'comfyui' ? 'ComfyUI Local GPU ($0.00)' : `Google VEO Cloud (~$${totalVeoCost.toFixed(2)})`}
          </span>

          {onOpenBatchGenerator && (
            <button
              type="button"
              onClick={onOpenBatchGenerator}
              className="px-3 py-1 bg-gradient-to-r from-amber-600/90 to-orange-600/90 hover:from-amber-500 hover:to-orange-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ml-1"
              title="Batch generate all or selected scenes to ComfyUI"
            >
              <BoltIcon className="w-3.5 h-3.5 text-amber-200" />
              <span>Batch Generate</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        {/* Metric 1: Total Scene Count */}
        <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700/60 relative overflow-hidden group hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Scenes</span>
            <FilmIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{sceneCount}</span>
            <span className="text-xs text-slate-400">shots</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Avg ~{avgShotLength.toFixed(1)}s per shot</p>
        </div>

        {/* Metric 2: Video Length & Duration */}
        <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700/60 relative overflow-hidden group hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Duration</span>
            <ClockIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{formatTime(totalDurationSeconds)}</span>
            <span className="text-xs text-slate-400">({Math.round(totalDurationSeconds)}s)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Timeline length</p>
        </div>

        {/* Metric 3: Average Shots Per Minute */}
        <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700/60 relative overflow-hidden group hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shots / Min</span>
            <SparklesIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-300 font-mono">
              {shotsPerMinute.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">spm</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate" title={getPacingLabel(shotsPerMinute)}>
            {getPacingLabel(shotsPerMinute)}
          </p>
        </div>

        {/* Metric 4: Estimated Generation Cost */}
        <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700/60 relative overflow-hidden group hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Est. Render Cost</span>
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              {engineMode === 'comfyui' ? 'LOCAL GPU' : 'CLOUD API'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">
              {engineMode === 'comfyui' ? '$0.00' : `$${totalVeoCost.toFixed(2)}`}
            </span>
            <span className="text-xs text-slate-400">
              {engineMode === 'comfyui' ? 'free local' : `@ $${veoCostPerScene}/shot`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {engineMode === 'comfyui' ? 'Unlimited local generations' : `${sceneCount} VEO video generations`}
          </p>
        </div>
      </div>

      {/* Breakdown detail bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="w-4 h-4 text-slate-500" />
          <span>
            Estimated VEO Cloud API rate: <strong>${veoCostPerScene} USD / scene</strong> (5 sec render).
          </span>
        </div>
        <div>
          <span>Total Script Lines: <strong>{script.scenes.length} visual cuts</strong></span>
        </div>
      </div>
    </div>
  );
};
