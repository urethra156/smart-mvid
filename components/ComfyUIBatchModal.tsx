import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import {
  ComfyUIConfig,
  checkComfyUiStatus,
  ComfyUIStatus,
  queueComfyUiPrompt,
  pollComfyUiPrompt,
  interruptComfyUi,
  downloadBatchComfyUiWorkflowsJson,
  downloadBatchCurlScript,
} from '../services/comfyuiService';
import {
  XCircleIcon,
  BoltIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  CheckIcon,
  DownloadIcon,
  FilmIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  QueueListIcon,
  CheckCircle2Icon,
  DocumentDuplicateIcon,
} from './icons/Icons';

interface ComfyUIBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  songTitle: string;
  comfyConfig: ComfyUIConfig;
  onUpdateConfig: (config: ComfyUIConfig) => void;
  onUpdateScenes: (updatedScenes: Scene[]) => void;
  onOpenSettings?: () => void;
}

interface SceneItemStatus {
  status: 'idle' | 'sending' | 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  promptId?: string;
  progressMsg?: string;
  pollAttempts?: number;
  videoUrl?: string;
  errorMsg?: string;
  startedAt?: number;
  completedAt?: number;
}

interface BatchLogItem {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export const ComfyUIBatchModal: React.FC<ComfyUIBatchModalProps> = ({
  isOpen,
  onClose,
  scenes,
  songTitle,
  comfyConfig,
  onUpdateConfig,
  onUpdateScenes,
  onOpenSettings,
}) => {
  const [selectedSceneNumbers, setSelectedSceneNumbers] = useState<number[]>([]);
  const [serverStatus, setServerStatus] = useState<ComfyUIStatus | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'config' | 'logs'>('queue');

  // Execution configuration
  const [executionMode, setExecutionMode] = useState<'sequential' | 'parallel_dispatch'>('sequential');
  const [seedStrategy, setSeedStrategy] = useState<'random' | 'incremental' | 'fixed'>('random');
  const [batchPrefix, setBatchPrefix] = useState('');
  const [batchSuffix, setBatchSuffix] = useState('');
  const [customNegative, setCustomNegative] = useState(comfyConfig.negativePrompt || '');
  const [overrideSettings, setOverrideSettings] = useState({
    steps: comfyConfig.steps,
    cfg: comfyConfig.cfg,
    frameCount: comfyConfig.frameCount,
    width: comfyConfig.width,
    height: comfyConfig.height,
  });

  // Batch Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSceneNumber, setActiveSceneNumber] = useState<number | null>(null);
  const [sceneStatuses, setSceneStatuses] = useState<Record<number, SceneItemStatus>>({});
  const [batchLogs, setBatchLogs] = useState<BatchLogItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unrendered' | 'rendered' | 'selected'>('all');
  const [autoApplyResults, setAutoApplyResults] = useState(true);

  // Abort control ref
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef(false);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Initialize selected scenes and statuses on open
  useEffect(() => {
    if (isOpen) {
      // By default select unrendered scenes, or all if none are rendered
      const unrendered = scenes.filter((s) => !s.videoUrl).map((s) => s.sceneNumber);
      const initialSelected = unrendered.length > 0 ? unrendered : scenes.map((s) => s.sceneNumber);
      setSelectedSceneNumbers(initialSelected);

      // Initialize status mapping with existing videoUrls
      const initialStatusMap: Record<number, SceneItemStatus> = {};
      scenes.forEach((s) => {
        initialStatusMap[s.sceneNumber] = {
          status: s.videoUrl ? 'completed' : 'idle',
          videoUrl: s.videoUrl,
        };
      });
      setSceneStatuses(initialStatusMap);
      setCustomNegative(comfyConfig.negativePrompt);
      setOverrideSettings({
        steps: comfyConfig.steps,
        cfg: comfyConfig.cfg,
        frameCount: comfyConfig.frameCount,
        width: comfyConfig.width,
        height: comfyConfig.height,
      });

      checkStatus();
    }
  }, [isOpen, scenes]);

  const addLog = (message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setBatchLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        level,
        message,
      },
      ...prev.slice(0, 150),
    ]);
  };

  const checkStatus = async () => {
    setIsCheckingServer(true);
    try {
      const status = await checkComfyUiStatus(comfyConfig.serverUrl);
      setServerStatus(status);
      if (status.online) {
        addLog(`Connected to ComfyUI at ${comfyConfig.serverUrl} (${status.device || 'GPU'}, ${status.vramFree || 'VRAM ready'})`, 'success');
      } else {
        addLog(`ComfyUI server offline at ${comfyConfig.serverUrl}`, 'warn');
      }
    } catch (e: any) {
      setServerStatus({ online: false, message: e.message || 'Connection failed' });
      addLog(`Failed to connect to ComfyUI: ${e.message}`, 'error');
    } finally {
      setIsCheckingServer(false);
    }
  };

  if (!isOpen) return null;

  // Scene Selection Helpers
  const handleToggleScene = (sceneNum: number) => {
    if (isGenerating) return;
    setSelectedSceneNumbers((prev) =>
      prev.includes(sceneNum) ? prev.filter((id) => id !== sceneNum) : [...prev, sceneNum]
    );
  };

  const handleSelectAll = () => {
    if (isGenerating) return;
    setSelectedSceneNumbers(scenes.map((s) => s.sceneNumber));
  };

  const handleSelectUnrendered = () => {
    if (isGenerating) return;
    const unrendered = scenes.filter((s) => !sceneStatuses[s.sceneNumber]?.videoUrl && !s.videoUrl).map((s) => s.sceneNumber);
    setSelectedSceneNumbers(unrendered);
  };

  const handleDeselectAll = () => {
    if (isGenerating) return;
    setSelectedSceneNumbers([]);
  };

  const handleInvertSelection = () => {
    if (isGenerating) return;
    const inverted = scenes
      .map((s) => s.sceneNumber)
      .filter((num) => !selectedSceneNumbers.includes(num));
    setSelectedSceneNumbers(inverted);
  };

  // Helper to compile final prompt for a scene with prefix/suffix
  const getCompiledPrompt = (scene: Scene): string => {
    const raw = scene.veoPrompt || scene.description || '';
    let finalPrompt = raw.trim();
    if (batchPrefix.trim()) {
      finalPrompt = `${batchPrefix.trim()}, ${finalPrompt}`;
    }
    if (batchSuffix.trim()) {
      finalPrompt = `${finalPrompt}, ${batchSuffix.trim()}`;
    }
    return finalPrompt;
  };

  const getEffectiveConfigForScene = (sceneIndex: number): ComfyUIConfig => {
    let seed = comfyConfig.seed;
    if (seedStrategy === 'random' || seed === -1) {
      seed = Math.floor(Math.random() * 1000000000);
    } else if (seedStrategy === 'incremental') {
      seed = (comfyConfig.seed > 0 ? comfyConfig.seed : 100000) + sceneIndex;
    }

    return {
      ...comfyConfig,
      steps: overrideSettings.steps,
      cfg: overrideSettings.cfg,
      frameCount: overrideSettings.frameCount,
      width: overrideSettings.width,
      height: overrideSettings.height,
      negativePrompt: customNegative || comfyConfig.negativePrompt,
      seed,
    };
  };

  // Update scene statuses helper
  const updateSceneStatus = (sceneNum: number, update: Partial<SceneItemStatus>) => {
    setSceneStatuses((prev) => ({
      ...prev,
      [sceneNum]: {
        ...(prev[sceneNum] || { status: 'idle' }),
        ...update,
      },
    }));
  };

  // Start Batch Generation
  const handleStartBatch = async () => {
    if (selectedSceneNumbers.length === 0) {
      alert('Please select at least one scene to generate.');
      return;
    }

    // Ping check first
    addLog('Checking ComfyUI connection before launching batch...', 'info');
    const status = await checkComfyUiStatus(comfyConfig.serverUrl);
    setServerStatus(status);
    if (!status.online) {
      addLog(`Cannot start batch: ComfyUI server is offline at ${comfyConfig.serverUrl}`, 'error');
      alert(`Cannot start batch: ComfyUI is not reachable at ${comfyConfig.serverUrl}. Make sure ComfyUI is running with --enable-cors-header "*".`);
      return;
    }

    setIsGenerating(true);
    setIsPaused(false);
    abortControllerRef.current = new AbortController();

    addLog(`🚀 Starting Batch Generation for ${selectedSceneNumbers.length} scene(s) [Mode: ${executionMode}]...`, 'info');

    const scenesToProcess = scenes.filter((s) => selectedSceneNumbers.includes(s.sceneNumber));

    // Reset status for selected scenes to pending/idle
    scenesToProcess.forEach((s) => {
      updateSceneStatus(s.sceneNumber, {
        status: 'sending',
        progressMsg: 'Queuing for generation...',
        errorMsg: undefined,
      });
    });

    if (executionMode === 'sequential') {
      await runSequentialBatch(scenesToProcess);
    } else {
      await runParallelDispatchBatch(scenesToProcess);
    }

    setIsGenerating(false);
    setActiveSceneNumber(null);
    abortControllerRef.current = null;
    addLog('🏁 Batch Generation run finished.', 'success');
  };

  // Sequential Execution: Queue 1 by 1, wait for render, then next
  const runSequentialBatch = async (scenesToProcess: Scene[]) => {
    const updatedScenesList = [...scenes];

    for (let i = 0; i < scenesToProcess.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        addLog('Batch cancelled by user.', 'warn');
        break;
      }

      // Handle pause loop
      while (isPausedRef.current) {
        addLog('Batch generation is paused. Waiting for resume...', 'info');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (abortControllerRef.current?.signal.aborted) break;
      }

      if (abortControllerRef.current?.signal.aborted) break;

      const scene = scenesToProcess[i];
      setActiveSceneNumber(scene.sceneNumber);
      const prompt = getCompiledPrompt(scene);
      const sceneConfig = getEffectiveConfigForScene(i);

      addLog(`[${i + 1}/${scenesToProcess.length}] Sending Scene ${scene.sceneNumber} to ComfyUI...`, 'info');
      updateSceneStatus(scene.sceneNumber, {
        status: 'sending',
        progressMsg: `Sending prompt to ComfyUI API (${sceneConfig.workflowType})...`,
        startedAt: Date.now(),
      });

      try {
        // Step 1: Queue prompt
        const promptId = await queueComfyUiPrompt(prompt, sceneConfig);
        addLog(`Scene ${scene.sceneNumber}: Queued with Prompt ID: ${promptId}`, 'info');
        updateSceneStatus(scene.sceneNumber, {
          status: 'queued',
          promptId,
          progressMsg: `Queued (ID: ${promptId.slice(0, 8)}...). Waiting for GPU...`,
        });

        // Step 2: Poll until complete
        updateSceneStatus(scene.sceneNumber, {
          status: 'rendering',
          progressMsg: 'Rendering frames on local GPU...',
        });

        const videoUrl = await pollComfyUiPrompt(
          sceneConfig.serverUrl,
          promptId,
          (msg, attempt) => {
            updateSceneStatus(scene.sceneNumber, {
              status: 'rendering',
              progressMsg: msg,
              pollAttempts: attempt,
            });
          },
          abortControllerRef.current?.signal,
          80,
          2500
        );

        addLog(`✅ Scene ${scene.sceneNumber}: Render completed successfully!`, 'success');
        updateSceneStatus(scene.sceneNumber, {
          status: 'completed',
          videoUrl,
          progressMsg: 'Completed!',
          completedAt: Date.now(),
        });

        // Update in project
        const sceneIndexInMaster = updatedScenesList.findIndex((s) => s.sceneNumber === scene.sceneNumber);
        if (sceneIndexInMaster !== -1) {
          updatedScenesList[sceneIndexInMaster] = {
            ...updatedScenesList[sceneIndexInMaster],
            videoUrl,
          };
          if (autoApplyResults) {
            onUpdateScenes([...updatedScenesList]);
          }
        }
      } catch (err: any) {
        if (abortControllerRef.current?.signal.aborted) {
          addLog(`Scene ${scene.sceneNumber}: Cancelled`, 'warn');
          updateSceneStatus(scene.sceneNumber, {
            status: 'cancelled',
            progressMsg: 'Cancelled',
          });
          break;
        }

        const errMsg = err.message || 'Unknown generation error';
        addLog(`❌ Scene ${scene.sceneNumber} failed: ${errMsg}`, 'error');
        updateSceneStatus(scene.sceneNumber, {
          status: 'failed',
          errorMsg: errMsg,
          progressMsg: `Failed: ${errMsg}`,
        });
      }
    }
  };

  // Parallel Dispatch: Post all prompt payloads into ComfyUI queue at once, then poll concurrently
  const runParallelDispatchBatch = async (scenesToProcess: Scene[]) => {
    addLog(`⚡ Bulk dispatching ${scenesToProcess.length} prompts to ComfyUI queue...`, 'info');
    const promptIdMap: { scene: Scene; promptId: string; config: ComfyUIConfig }[] = [];
    const updatedScenesList = [...scenes];

    // Step 1: Send all to ComfyUI prompt endpoint
    for (let i = 0; i < scenesToProcess.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;

      const scene = scenesToProcess[i];
      const prompt = getCompiledPrompt(scene);
      const sceneConfig = getEffectiveConfigForScene(i);

      updateSceneStatus(scene.sceneNumber, {
        status: 'sending',
        progressMsg: `Queueing in ComfyUI (${i + 1}/${scenesToProcess.length})...`,
        startedAt: Date.now(),
      });

      try {
        const promptId = await queueComfyUiPrompt(prompt, sceneConfig);
        promptIdMap.push({ scene, promptId, config: sceneConfig });
        addLog(`Scene ${scene.sceneNumber}: Queued (Prompt ID: ${promptId})`, 'info');
        updateSceneStatus(scene.sceneNumber, {
          status: 'queued',
          promptId,
          progressMsg: `In ComfyUI Queue (#${i + 1}). Waiting for worker...`,
        });
      } catch (err: any) {
        addLog(`❌ Failed to queue Scene ${scene.sceneNumber}: ${err.message}`, 'error');
        updateSceneStatus(scene.sceneNumber, {
          status: 'failed',
          errorMsg: err.message,
        });
      }

      // Minor pause between queue posts
      await new Promise((r) => setTimeout(r, 400));
    }

    addLog(`✨ Dispatched ${promptIdMap.length} prompts to ComfyUI. Now monitoring renders...`, 'info');

    // Step 2: Poll all items until all finish
    const pollPromises = promptIdMap.map(async ({ scene, promptId, config }) => {
      try {
        updateSceneStatus(scene.sceneNumber, {
          status: 'rendering',
          progressMsg: 'Queued / Processing on GPU...',
        });

        const videoUrl = await pollComfyUiPrompt(
          config.serverUrl,
          promptId,
          (msg, attempt) => {
            updateSceneStatus(scene.sceneNumber, {
              status: 'rendering',
              progressMsg: msg,
              pollAttempts: attempt,
            });
          },
          abortControllerRef.current?.signal,
          100,
          3000
        );

        addLog(`✅ Scene ${scene.sceneNumber}: Render completed!`, 'success');
        updateSceneStatus(scene.sceneNumber, {
          status: 'completed',
          videoUrl,
          progressMsg: 'Completed!',
          completedAt: Date.now(),
        });

        const sceneIdx = updatedScenesList.findIndex((s) => s.sceneNumber === scene.sceneNumber);
        if (sceneIdx !== -1) {
          updatedScenesList[sceneIdx] = {
            ...updatedScenesList[sceneIdx],
            videoUrl,
          };
          if (autoApplyResults) {
            onUpdateScenes([...updatedScenesList]);
          }
        }
      } catch (err: any) {
        if (!abortControllerRef.current?.signal.aborted) {
          addLog(`❌ Scene ${scene.sceneNumber} failed: ${err.message}`, 'error');
          updateSceneStatus(scene.sceneNumber, {
            status: 'failed',
            errorMsg: err.message,
            progressMsg: 'Failed to render',
          });
        }
      }
    });

    await Promise.allSettled(pollPromises);
  };

  // Pause / Resume
  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      addLog(next ? '⏸️ Batch execution paused.' : '▶️ Batch execution resumed.', 'info');
      return next;
    });
  };

  // Cancel / Interrupt
  const handleCancelBatch = async () => {
    if (!isGenerating) return;
    if (confirm('Are you sure you want to stop the batch? Any active GPU render in ComfyUI will be interrupted.')) {
      addLog('Stopping batch generation and sending interrupt signal to ComfyUI...', 'warn');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      setIsPaused(false);
      setActiveSceneNumber(null);
      await interruptComfyUi(comfyConfig.serverUrl);
      addLog('Batch stopped.', 'warn');
    }
  };

  // Retry a single scene
  const handleRetrySingle = async (sceneNumber: number) => {
    if (isGenerating) return;
    const scene = scenes.find((s) => s.sceneNumber === sceneNumber);
    if (!scene) return;

    addLog(`Retrying Scene ${sceneNumber}...`, 'info');
    updateSceneStatus(sceneNumber, {
      status: 'sending',
      progressMsg: 'Sending to ComfyUI...',
      errorMsg: undefined,
    });

    try {
      const prompt = getCompiledPrompt(scene);
      const sceneConfig = getEffectiveConfigForScene(0);
      const promptId = await queueComfyUiPrompt(prompt, sceneConfig);
      updateSceneStatus(sceneNumber, {
        status: 'rendering',
        promptId,
        progressMsg: 'Rendering on GPU...',
      });

      const videoUrl = await pollComfyUiPrompt(sceneConfig.serverUrl, promptId, (msg, att) => {
        updateSceneStatus(sceneNumber, { progressMsg: msg, pollAttempts: att });
      });

      updateSceneStatus(sceneNumber, {
        status: 'completed',
        videoUrl,
        progressMsg: 'Completed!',
      });
      addLog(`✅ Scene ${sceneNumber} retry succeeded!`, 'success');

      // Update script
      const updated = scenes.map((s) => (s.sceneNumber === sceneNumber ? { ...s, videoUrl } : s));
      onUpdateScenes(updated);
    } catch (e: any) {
      updateSceneStatus(sceneNumber, {
        status: 'failed',
        errorMsg: e.message,
      });
      addLog(`❌ Scene ${sceneNumber} retry failed: ${e.message}`, 'error');
    }
  };

  // Apply all completed outputs back to script
  const handleApplyAllCompleted = () => {
    const updated = scenes.map((s) => {
      const statusObj = sceneStatuses[s.sceneNumber];
      if (statusObj?.videoUrl) {
        return { ...s, videoUrl: statusObj.videoUrl };
      }
      return s;
    });
    onUpdateScenes(updated);
    addLog('Applied all generated video URLs to your music video project scenes.', 'success');
    alert('All rendered videos have been synchronized into your project scenes!');
  };

  // Download Batch Workflow JSON
  const handleExportWorkflows = () => {
    const selectedScenes = scenes
      .filter((s) => selectedSceneNumbers.includes(s.sceneNumber))
      .map((s) => ({
        sceneNumber: s.sceneNumber,
        prompt: getCompiledPrompt(s),
      }));

    downloadBatchComfyUiWorkflowsJson(selectedScenes, comfyConfig, songTitle);
    addLog(`Exported Batch Workflow JSON for ${selectedScenes.length} scenes.`, 'success');
  };

  // Download Shell Script
  const handleExportShellScript = () => {
    const selectedScenes = scenes
      .filter((s) => selectedSceneNumbers.includes(s.sceneNumber))
      .map((s) => ({
        sceneNumber: s.sceneNumber,
        prompt: getCompiledPrompt(s),
      }));

    downloadBatchCurlScript(selectedScenes, comfyConfig, songTitle);
    addLog(`Exported cURL Batch Script (.sh) for ${selectedScenes.length} scenes.`, 'success');
  };

  // Filtered scenes list
  const filteredScenes = scenes.filter((s) => {
    const statusObj = sceneStatuses[s.sceneNumber];
    const isSelected = selectedSceneNumbers.includes(s.sceneNumber);
    const hasVideo = !!statusObj?.videoUrl || !!s.videoUrl;

    if (filterMode === 'selected' && !isSelected) return false;
    if (filterMode === 'unrendered' && hasVideo) return false;
    if (filterMode === 'rendered' && !hasVideo) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchNum = `scene ${s.sceneNumber}`.includes(q) || `${s.sceneNumber}` === q;
      const matchPrompt = s.veoPrompt?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
      if (!matchNum && !matchPrompt) return false;
    }

    return true;
  });

  // Calculate Batch Progress Statistics
  const totalSelected = selectedSceneNumbers.length;
  const completedSelected = selectedSceneNumbers.filter(
    (num) => sceneStatuses[num]?.status === 'completed' && !!sceneStatuses[num]?.videoUrl
  ).length;
  const failedSelected = selectedSceneNumbers.filter(
    (num) => sceneStatuses[num]?.status === 'failed'
  ).length;
  const progressPercent = totalSelected > 0 ? Math.round((completedSelected / totalSelected) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <BoltIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  ComfyUI Batch Video Generation
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Batch Queue
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Queue and render multiple scenes simultaneously or in sequence to your local ComfyUI GPU backend.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Server Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                serverStatus?.online
                  ? 'bg-emerald-950/80 border-emerald-600/40 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-600/40 text-rose-300'
              }`}
              title={serverStatus?.message || 'ComfyUI Server'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  serverStatus?.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="font-semibold">{serverStatus?.online ? 'Online' : 'Offline'}</span>
              {serverStatus?.vramFree && (
                <span className="text-emerald-400/80 font-mono hidden md:inline">
                  ({serverStatus.vramFree} free)
                </span>
              )}
              <button
                type="button"
                onClick={checkStatus}
                disabled={isCheckingServer}
                className="ml-1 text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
                title="Ping ComfyUI Server"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${isCheckingServer ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 hover:text-white transition-colors"
                title="Configure ComfyUI models & IP"
              >
                Settings
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isGenerating}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Close Batch Modal"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PROGRESS / ACTIVE RUN BANNER */}
        {isGenerating && (
          <div className="bg-slate-950 px-5 py-3 border-b border-amber-500/30 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-semibold text-amber-300">
                  {isPaused ? 'Batch Paused' : 'Batch Generating on Local GPU...'}
                </span>
                {activeSceneNumber && (
                  <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
                    Active: Scene {activeSceneNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-medium">
                  {completedSelected} / {totalSelected} Finished ({progressPercent}%)
                </span>
                {failedSelected > 0 && (
                  <span className="text-rose-400 font-medium">({failedSelected} failed)</span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 bg-slate-950/40 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'queue'
                  ? 'border-amber-500 text-amber-400 bg-slate-800/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <QueueListIcon className="w-4 h-4" />
              <span>Scene Selection & Queue</span>
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {selectedSceneNumbers.length}/{scenes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'border-amber-500 text-amber-400 bg-slate-800/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BoltIcon className="w-4 h-4" />
              <span>Batch Options & Prompts</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'border-amber-500 text-amber-400 bg-slate-800/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              <span>Activity Log</span>
              {batchLogs.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {batchLogs.length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <span>Workflow: <strong className="text-slate-200 uppercase">{comfyConfig.workflowType}</strong></span>
            <span>•</span>
            <span>Res: <strong className="text-slate-200">{overrideSettings.width}x{overrideSettings.height}</strong></span>
          </div>
        </div>

        {/* TAB 1: SCENE SELECTION & QUEUE */}
        {activeTab === 'queue' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              {/* Selection action pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400 mr-1">Select:</span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                >
                  All ({scenes.length})
                </button>
                <button
                  type="button"
                  onClick={handleSelectUnrendered}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                >
                  Unrendered Only
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                >
                  Invert
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter scenes..."
                    className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
                  />
                </div>

                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-2.5 py-1 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Show All</option>
                  <option value="selected">Selected ({selectedSceneNumbers.length})</option>
                  <option value="unrendered">Unrendered</option>
                  <option value="rendered">Completed</option>
                </select>
              </div>
            </div>

            {/* Scene List Table / Cards */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-slate-800/40">
              {filteredScenes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No scenes match the active filter criteria.
                </div>
              ) : (
                filteredScenes.map((scene) => {
                  const isSelected = selectedSceneNumbers.includes(scene.sceneNumber);
                  const status = sceneStatuses[scene.sceneNumber] || { status: 'idle' };
                  const promptPreview = getCompiledPrompt(scene);
                  const isCurrentActive = activeSceneNumber === scene.sceneNumber;

                  return (
                    <div
                      key={scene.sceneNumber}
                      className={`p-3 rounded-xl border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isCurrentActive
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                          : isSelected
                          ? 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
                          : 'bg-slate-900/30 border-slate-800/60 opacity-60 hover:opacity-80'
                      }`}
                    >
                      {/* Left: Checkbox + Scene Number + Prompt */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isGenerating}
                          onChange={() => handleToggleScene(scene.sceneNumber)}
                          className="mt-1 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700 cursor-pointer"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-xs sm:text-sm text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                              Scene {scene.sceneNumber}
                            </span>

                            {scene.startTimeSeconds !== undefined && scene.endTimeSeconds !== undefined && (
                              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <ClockIcon className="w-3 h-3 text-slate-500" />
                                {scene.startTimeSeconds}s - {scene.endTimeSeconds}s
                              </span>
                            )}

                            {/* Status Pill */}
                            {status.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                                <CheckCircle2Icon className="w-3 h-3 text-emerald-400" />
                                Done
                              </span>
                            )}
                            {status.status === 'rendering' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-600/50 px-2 py-0.5 rounded-full animate-pulse">
                                <ArrowPathIcon className="w-3 h-3 text-amber-400 animate-spin" />
                                Rendering ({status.pollAttempts || 1})
                              </span>
                            )}
                            {status.status === 'queued' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-700/50 px-2 py-0.5 rounded-full">
                                <QueueListIcon className="w-3 h-3 text-cyan-400" />
                                Queued
                              </span>
                            )}
                            {status.status === 'sending' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 rounded-full">
                                Sending...
                              </span>
                            )}
                            {status.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-950/80 border border-rose-700/50 px-2 py-0.5 rounded-full">
                                <ExclamationTriangleIcon className="w-3 h-3 text-rose-400" />
                                Failed
                              </span>
                            )}
                          </div>

                          {/* Prompt preview */}
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {promptPreview || scene.description}
                          </p>

                          {status.errorMsg && (
                            <p className="text-[11px] text-rose-400 mt-1 font-mono">
                              Error: {status.errorMsg}
                            </p>
                          )}
                          {status.progressMsg && status.status !== 'completed' && status.status !== 'failed' && (
                            <p className="text-[11px] text-amber-300/80 mt-1">
                              {status.progressMsg}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Output preview / Action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                        {status.videoUrl ? (
                          <div className="flex items-center gap-2">
                            {/* Video / GIF thumbnail button */}
                            <a
                              href={status.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Open rendered video in new tab"
                            >
                              <FilmIcon className="w-3.5 h-3.5 text-emerald-400" />
                              <span>View Video</span>
                            </a>
                            <a
                              href={status.videoUrl}
                              download={`scene_${scene.sceneNumber}_comfyui.mp4`}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                              title="Download video file"
                            >
                              <DownloadIcon className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : null}

                        {status.status === 'failed' && !isGenerating && (
                          <button
                            type="button"
                            onClick={() => handleRetrySingle(scene.sceneNumber)}
                            className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <ArrowPathIcon className="w-3 h-3 text-rose-300" />
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BATCH OPTIONS & PROMPT OVERRIDES */}
        {activeTab === 'config' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-900/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Queue Mode & Seed */}
              <div className="space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BoltIcon className="w-4 h-4 text-amber-400" />
                  Queue Execution Engine
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Batch Execution Strategy
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setExecutionMode('sequential')}
                      className={`p-3 rounded-lg border text-left text-xs transition-all ${
                        executionMode === 'sequential'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200 ring-1 ring-amber-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-white mb-0.5">Sequential Queue (Recommended)</div>
                      <div className="text-[11px] opacity-80">
                        Sends scenes one by one, monitors progress on GPU, and auto-retries. Ideal for single GPU setups.
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setExecutionMode('parallel_dispatch')}
                      className={`p-3 rounded-lg border text-left text-xs transition-all ${
                        executionMode === 'parallel_dispatch'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200 ring-1 ring-amber-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-white mb-0.5">Immediate Bulk Dispatch</div>
                      <div className="text-[11px] opacity-80">
                        Posts all selected prompts to ComfyUI's internal queue at once, then monitors all prompt IDs concurrently.
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Seed Strategy
                  </label>
                  <select
                    value={seedStrategy}
                    disabled={isGenerating}
                    onChange={(e) => setSeedStrategy(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="random">Randomize Seed Per Scene (Varied aesthetics)</option>
                    <option value="incremental">Incremental Seed (Scene 1: N, Scene 2: N+1, ...)</option>
                    <option value="fixed">Fixed Seed (Consistent seed across scenes)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="checkbox"
                    id="autoApply"
                    checked={autoApplyResults}
                    onChange={(e) => setAutoApplyResults(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-950 border-slate-700"
                  />
                  <label htmlFor="autoApply" className="text-xs text-slate-300 cursor-pointer">
                    Automatically sync generated videos into project scenes as they complete
                  </label>
                </div>
              </div>

              {/* Generation Parameters Override */}
              <div className="space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FilmIcon className="w-4 h-4 text-cyan-400" />
                  Generation Parameters Override
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Steps ({overrideSettings.steps})
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={60}
                      disabled={isGenerating}
                      value={overrideSettings.steps}
                      onChange={(e) =>
                        setOverrideSettings({ ...overrideSettings, steps: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      CFG Scale ({overrideSettings.cfg})
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={1}
                      max={20}
                      disabled={isGenerating}
                      value={overrideSettings.cfg}
                      onChange={(e) =>
                        setOverrideSettings({ ...overrideSettings, cfg: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Frame Count ({overrideSettings.frameCount} frames)
                    </label>
                    <input
                      type="number"
                      min={8}
                      max={64}
                      disabled={isGenerating}
                      value={overrideSettings.frameCount}
                      onChange={(e) =>
                        setOverrideSettings({ ...overrideSettings, frameCount: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Resolution
                    </label>
                    <select
                      value={`${overrideSettings.width}x${overrideSettings.height}`}
                      disabled={isGenerating}
                      onChange={(e) => {
                        const [w, h] = e.target.value.split('x').map(Number);
                        setOverrideSettings({ ...overrideSettings, width: w, height: h });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="768x432">768 x 432 (16:9 Fast)</option>
                      <option value="832x480">832 x 480 (16:9 Standard)</option>
                      <option value="1024x576">1024 x 576 (16:9 HD)</option>
                      <option value="512x512">512 x 512 (1:1 Square)</option>
                      <option value="432x768">432 x 768 (9:16 Vertical)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Batch Negative Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={customNegative}
                    disabled={isGenerating}
                    onChange={(e) => setCustomNegative(e.target.value)}
                    placeholder="blurry, low quality, bad hands, distortion..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Prompt Prefix & Suffix Customizer */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DocumentDuplicateIcon className="w-4 h-4 text-emerald-400" />
                Universal Prompt Modifiers (Prefix & Suffix)
              </h3>
              <p className="text-xs text-slate-400">
                Optionally inject style tags, lighting cues, or camera lenses across all selected scenes in this batch run.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Batch Prefix (Appended to START of each scene prompt)
                  </label>
                  <input
                    type="text"
                    value={batchPrefix}
                    disabled={isGenerating}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="e.g. Masterpiece, 35mm film photography, cinematic lighting, "
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Batch Suffix (Appended to END of each scene prompt)
                  </label>
                  <input
                    type="text"
                    value={batchSuffix}
                    disabled={isGenerating}
                    onChange={(e) => setBatchSuffix(e.target.value)}
                    placeholder="e.g. , 8k uhd, octane render, anamorphic flares"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVITY & LOGS */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Real-time Batch Execution Log:</span>
              <button
                type="button"
                onClick={() => setBatchLogs([])}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear Log
              </button>
            </div>

            <div className="flex-1 bg-black/80 rounded-xl p-3 font-mono text-xs overflow-y-auto border border-slate-800 space-y-1.5 select-text">
              {batchLogs.length === 0 ? (
                <div className="text-slate-600 italic py-6 text-center">
                  No activity logged yet. Click "Start Batch Generation" to begin.
                </div>
              ) : (
                batchLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 ${
                      log.level === 'error'
                        ? 'text-rose-400'
                        : log.level === 'warn'
                        ? 'text-amber-300'
                        : log.level === 'success'
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          {/* Left Export Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportWorkflows}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Download API JSON batch payload for ComfyUI Desktop"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Batch JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportShellScript}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors hidden sm:flex"
              title="Download Bash .sh script for headless cURL batching"
            >
              <DocumentDuplicateIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>cURL Script (.sh)</span>
            </button>

            {completedSelected > 0 && !isGenerating && (
              <button
                type="button"
                onClick={handleApplyAllCompleted}
                className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 rounded-lg text-xs font-semibold border border-emerald-700/50 flex items-center gap-1.5 transition-colors"
                title="Apply all finished videos into your main script scenes"
              >
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Apply All to Script</span>
              </button>
            )}
          </div>

          {/* Right Execution Buttons */}
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {isPaused ? <PlayIcon className="w-4 h-4 text-emerald-400" /> : <PauseIcon className="w-4 h-4 text-amber-400" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelBatch}
                  className="px-3.5 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-700/60 flex items-center gap-1.5 transition-colors"
                >
                  <StopIcon className="w-4 h-4 text-rose-400" />
                  <span>Stop Batch</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleStartBatch}
                  disabled={selectedSceneNumbers.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-lg shadow-amber-900/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <BoltIcon className="w-4 h-4 text-amber-200 group-hover:scale-110 transition-transform" />
                  <span>
                    Generate Batch ({selectedSceneNumbers.length} {selectedSceneNumbers.length === 1 ? 'Scene' : 'Scenes'})
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
