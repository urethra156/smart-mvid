import React, { useState, useEffect } from 'react';
import { ComfyUIConfig, checkComfyUiStatus, ComfyUIStatus } from '../services/comfyuiService';
import { autoSetupModelsForScript, AIModelSetupResult } from '../services/aiModelSetupService';
import { XCircleIcon, CheckIcon, ArrowPathIcon, InformationCircleIcon, SparklesIcon } from './icons/Icons';

interface ComfyUISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ComfyUIConfig;
  scriptMood?: string;
  scriptTitle?: string;
  onSaveConfig: (newConfig: ComfyUIConfig) => void;
}

export const ComfyUISettingsModal: React.FC<ComfyUISettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  scriptMood = 'Cinematic',
  scriptTitle = '',
  onSaveConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<ComfyUIConfig>(config);
  const [status, setStatus] = useState<ComfyUIStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [aiSetupResult, setAiSetupResult] = useState<AIModelSetupResult | null>(null);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  const handleAiAutoSetup = () => {
    const result = autoSetupModelsForScript(scriptMood, scriptTitle);
    setLocalConfig(result.config);
    setAiSetupResult(result);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-slate-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 rounded-lg text-indigo-400 border border-indigo-500/30">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                ComfyUI Local Server Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure your local ComfyUI REST API instance and GPU model parameters.
              </p>
            </div>
          </div>

          <button
            onClick={handleAiAutoSetup}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all border border-indigo-400/30 whitespace-nowrap self-start sm:self-auto"
          >
            <SparklesIcon className="w-4 h-4 text-amber-300" />
            <span>AI Auto-Setup Models</span>
          </button>
        </div>

        {/* AI Setup Intelligence Banner */}
        {aiSetupResult && (
          <div className="mb-6 p-4 bg-indigo-950/60 border border-indigo-700/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-indigo-300 flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-amber-300" />
                AI Model Optimization Strategy ({aiSetupResult.moodCategory})
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-900 text-indigo-200 border border-indigo-700">
                {aiSetupResult.recommendedGpuVram}
              </span>
            </div>
            <p className="text-xs font-medium text-white">
              Configured Preset: <strong className="text-cyan-300">{aiSetupResult.presetName}</strong>
            </p>
            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
              {aiSetupResult.reasoning.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Server Status Ping Bar */}
        <div className="mb-6 p-4 bg-slate-900/90 rounded-lg border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">ComfyUI Endpoint</div>
            <div className="text-sm font-mono text-cyan-300 flex items-center gap-2">
              <span>{localConfig.serverUrl}</span>
              {status?.online && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/60 text-green-300 border border-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse"></span>
                  Online ({status.vramFree || 'GPU Ready'})
                </span>
              )}
            </div>
            {status && !status.online && (
              <p className="text-xs text-amber-400 mt-1">{status.message}</p>
            )}
          </div>
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <ArrowPathIcon className="w-4 h-4 text-cyan-400" />
            )}
            Test Connection
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">ComfyUI Server URL</label>
            <input
              type="text"
              value={localConfig.serverUrl}
              onChange={e => setLocalConfig({ ...localConfig, serverUrl: e.target.value })}
              placeholder="http://127.0.0.1:8188"
              className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-md font-mono text-sm text-cyan-300 focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Start ComfyUI locally with <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded">python main.py --enable-cors-header "*"</code>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Workflow Architecture</label>
              <select
                value={localConfig.workflowType}
                onChange={e => setLocalConfig({ ...localConfig, workflowType: e.target.value as any })}
                className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="animate_diff">AnimateDiff (SD 1.5 / SDXL)</option>
                <option value="wan2_1">Wan 2.1 Video (Text-to-Video)</option>
                <option value="hunyuan_video">HunyuanVideo Model</option>
                <option value="svd">Stable Video Diffusion (SVD)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Model Checkpoint</label>
              <input
                type="text"
                value={localConfig.checkpoint}
                onChange={e => setLocalConfig({ ...localConfig, checkpoint: e.target.value })}
                placeholder="v1-5-pruned-emaonly.safetensors"
                className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-md text-sm font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Default Negative Prompt</label>
            <textarea
              rows={2}
              value={localConfig.negativePrompt}
              onChange={e => setLocalConfig({ ...localConfig, negativePrompt: e.target.value })}
              className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-md text-xs text-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Steps</label>
              <input
                type="number"
                value={localConfig.steps}
                onChange={e => setLocalConfig({ ...localConfig, steps: parseInt(e.target.value, 10) || 20 })}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CFG Scale</label>
              <input
                type="number"
                step="0.5"
                value={localConfig.cfg}
                onChange={e => setLocalConfig({ ...localConfig, cfg: parseFloat(e.target.value) || 7.5 })}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Width (px)</label>
              <input
                type="number"
                step="64"
                value={localConfig.width}
                onChange={e => setLocalConfig({ ...localConfig, width: parseInt(e.target.value, 10) || 768 })}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Height (px)</label>
              <input
                type="number"
                step="64"
                value={localConfig.height}
                onChange={e => setLocalConfig({ ...localConfig, height: parseInt(e.target.value, 10) || 432 })}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Sampler Name</label>
              <input
                type="text"
                value={localConfig.samplerName}
                onChange={e => setLocalConfig({ ...localConfig, samplerName: e.target.value })}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduler</label>
              <input
                type="text"
                value={localConfig.scheduler}
                onChange={e => setLocalConfig({ ...localConfig, scheduler: e.target.value })}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-lg flex items-start gap-2.5 text-xs text-indigo-300">
            <InformationCircleIcon className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-indigo-200">Local Workflow Download Available:</span>
              Even if your local ComfyUI server is offline or lacks CORS setup, you can still export formatted ComfyUI Prompt JSON and API Workflows per scene to drag and drop straight into your ComfyUI desktop GUI!
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
          >
            <CheckIcon className="w-4 h-4" />
            Save ComfyUI Settings
          </button>
        </div>
      </div>
    </div>
  );
};
