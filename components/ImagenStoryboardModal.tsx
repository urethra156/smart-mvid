import React, { useState } from 'react';
import { VideoScript, Scene } from '../types';
import { 
  PhotoIcon, 
  SparklesIcon, 
  ArrowPathIcon, 
  DownloadIcon, 
  CheckIcon, 
  XCircleIcon,
  FilmIcon,
  CheckCircle2Icon,
  ViewfinderIcon,
  ClockIcon
} from './icons/Icons';
import { 
  generateSceneThumbnailWithImagen, 
  buildCinematicThumbnailPrompt, 
  generateProceduralStoryboardArtwork 
} from '../services/imagenService';
import Loader from './Loader';

interface ImagenStoryboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: VideoScript;
  onUpdateScenes: (updatedScenes: Scene[]) => void;
}

export const ImagenStoryboardModal: React.FC<ImagenStoryboardModalProps> = ({
  isOpen,
  onClose,
  script,
  onUpdateScenes,
}) => {
  const [selectedSceneIds, setSelectedSceneIds] = useState<number[]>(
    script.scenes.map(s => s.sceneNumber)
  );
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const [batchStatusText, setBatchStatusText] = useState<string>('');
  const [batchErrors, setBatchErrors] = useState<Record<number, string>>({});
  const [lightboxScene, setLightboxScene] = useState<Scene | null>(null);
  const [editingPromptSceneId, setEditingPromptSceneId] = useState<number | null>(null);
  const [customPromptText, setCustomPromptText] = useState<string>('');

  if (!isOpen) return null;

  const totalScenes = script.scenes.length;
  const scenesWithThumbnails = script.scenes.filter(s => !!s.thumbnailUrl).length;

  const handleToggleSelectAll = () => {
    if (selectedSceneIds.length === script.scenes.length) {
      setSelectedSceneIds([]);
    } else {
      setSelectedSceneIds(script.scenes.map(s => s.sceneNumber));
    }
  };

  const handleToggleSceneSelect = (sceneNumber: number) => {
    setSelectedSceneIds(prev => 
      prev.includes(sceneNumber) 
        ? prev.filter(id => id !== sceneNumber) 
        : [...prev, sceneNumber]
    );
  };

  const handleGenerateSingleThumbnail = async (scene: Scene, customPrompt?: string) => {
    setBatchErrors(prev => {
      const copy = { ...prev };
      delete copy[scene.sceneNumber];
      return copy;
    });

    const promptToUse = customPrompt || buildCinematicThumbnailPrompt(
      scene,
      script.overallMood,
      script.consistentElements,
      script.analysis?.suggestedColorPalette
    );

    try {
      const thumbnailUrl = await generateSceneThumbnailWithImagen(
        promptToUse,
        (status) => setBatchStatusText(`Scene ${scene.sceneNumber}: ${status}`)
      );

      const updatedScenes = script.scenes.map(s => 
        s.sceneNumber === scene.sceneNumber 
          ? { ...s, thumbnailUrl, thumbnailPrompt: promptToUse } 
          : s
      );
      onUpdateScenes(updatedScenes);
    } catch (err: any) {
      console.error(`Error generating thumbnail for scene ${scene.sceneNumber}:`, err);
      const errMsg = err?.message || 'Failed to generate thumbnail';
      
      // If permission or key error, provide procedural fallback option
      setBatchErrors(prev => ({
        ...prev,
        [scene.sceneNumber]: errMsg
      }));
    }
  };

  const handleGenerateProceduralFallback = (scene: Scene) => {
    const artworkUrl = generateProceduralStoryboardArtwork(
      scene,
      script.overallMood,
      script.analysis?.suggestedColorPalette
    );
    const updatedScenes = script.scenes.map(s => 
      s.sceneNumber === scene.sceneNumber 
        ? { ...s, thumbnailUrl: artworkUrl, thumbnailPrompt: 'Procedural Concept Artwork' } 
        : s
      );
    onUpdateScenes(updatedScenes);
    setBatchErrors(prev => {
      const copy = { ...prev };
      delete copy[scene.sceneNumber];
      return copy;
    });
  };

  const handleGenerateAllBatch = async () => {
    if (selectedSceneIds.length === 0) return;
    
    setIsGeneratingBatch(true);
    setCurrentProgressIndex(0);
    setBatchErrors({});

    let currentScriptScenes = [...script.scenes];
    const targetScenes = currentScriptScenes.filter(s => selectedSceneIds.includes(s.sceneNumber));

    for (let i = 0; i < targetScenes.length; i++) {
      const sc = targetScenes[i];
      setCurrentProgressIndex(i + 1);
      setBatchStatusText(`Rendering Scene ${sc.sceneNumber} (${i + 1}/${targetScenes.length}) with Google Imagen 3...`);

      const prompt = buildCinematicThumbnailPrompt(
        sc,
        script.overallMood,
        script.consistentElements,
        script.analysis?.suggestedColorPalette
      );

      try {
        const thumbnailUrl = await generateSceneThumbnailWithImagen(prompt);
        currentScriptScenes = currentScriptScenes.map(s => 
          s.sceneNumber === sc.sceneNumber 
            ? { ...s, thumbnailUrl, thumbnailPrompt: prompt } 
            : s
        );
        onUpdateScenes(currentScriptScenes);
      } catch (err: any) {
        console.warn(`Imagen batch error on scene ${sc.sceneNumber}:`, err);
        // If Imagen fails in batch (e.g. rate limit or permission), fallback to procedural artwork so director has a complete storyboard!
        try {
          const fallbackUrl = generateProceduralStoryboardArtwork(
            sc,
            script.overallMood,
            script.analysis?.suggestedColorPalette
          );
          currentScriptScenes = currentScriptScenes.map(s => 
            s.sceneNumber === sc.sceneNumber 
              ? { ...s, thumbnailUrl: fallbackUrl, thumbnailPrompt: prompt } 
              : s
          );
          onUpdateScenes(currentScriptScenes);
        } catch (fbErr) {
          setBatchErrors(prev => ({
            ...prev,
            [sc.sceneNumber]: err?.message || 'Generation failed'
          }));
        }
      }
    }

    setIsGeneratingBatch(false);
    setBatchStatusText('Batch thumbnail generation complete!');
  };

  const handleDownloadThumbnail = (scene: Scene) => {
    if (!scene.thumbnailUrl) return;
    const a = document.createElement('a');
    a.href = scene.thumbnailUrl;
    a.download = `${script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_scene_${scene.sceneNumber}_thumbnail.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-xl shadow-lg">
              <PhotoIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-white">
                Imagen 3 Visual Storyboard Suite
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Preview the visual style and cinematic lighting of each scene in <span className="text-indigo-300 font-semibold">{script.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
              {scenesWithThumbnails} / {totalScenes} Thumbnails Generated
            </span>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Action Controls & Batch Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              disabled={isGeneratingBatch}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              {selectedSceneIds.length === script.scenes.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-slate-400">
              {selectedSceneIds.length} scene{selectedSceneIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleGenerateAllBatch}
              disabled={isGeneratingBatch || selectedSceneIds.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingBatch ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Generating {currentProgressIndex}/{selectedSceneIds.length}...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4 text-cyan-200" />
                  <span>Generate Selected ({selectedSceneIds.length}) with Imagen 3</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time Generation Banner */}
        {isGeneratingBatch && (
          <div className="px-6 py-3 bg-indigo-950/70 border-b border-indigo-800/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Loader />
              <div>
                <p className="text-sm font-semibold text-indigo-200">{batchStatusText}</p>
                <p className="text-xs text-slate-400">Google Imagen 3 generates photorealistic 16:9 cinematic stills.</p>
              </div>
            </div>
            <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div 
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${(currentProgressIndex / (selectedSceneIds.length || 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Storyboard Grid Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {script.scenes.map((scene) => {
              const isSelected = selectedSceneIds.includes(scene.sceneNumber);
              const hasThumbnail = !!scene.thumbnailUrl;
              const sceneError = batchErrors[scene.sceneNumber];
              const isEditingPrompt = editingPromptSceneId === scene.sceneNumber;

              return (
                <div
                  key={scene.sceneNumber}
                  className={`bg-slate-800/70 rounded-xl border transition-all duration-200 overflow-hidden flex flex-col ${
                    isSelected ? 'border-cyan-500/60 shadow-lg shadow-cyan-950/20' : 'border-slate-700'
                  }`}
                >
                  {/* Thumbnail Image Frame (16:9) */}
                  <div className="relative aspect-video bg-slate-950 w-full overflow-hidden group">
                    {hasThumbnail ? (
                      <>
                        <img
                          src={scene.thumbnailUrl}
                          alt={`Scene ${scene.sceneNumber} Thumbnail`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                          <button
                            onClick={() => setLightboxScene(scene)}
                            className="px-2.5 py-1 bg-slate-900/90 text-slate-200 hover:text-white text-xs font-semibold rounded-md border border-slate-700 backdrop-blur-sm transition-colors"
                          >
                            Enlarge
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDownloadThumbnail(scene)}
                              className="p-1.5 bg-slate-900/90 text-slate-300 hover:text-cyan-300 rounded-md border border-slate-700 transition-colors"
                              title="Download Thumbnail Image"
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGenerateSingleThumbnail(scene)}
                              disabled={isGeneratingBatch}
                              className="p-1.5 bg-slate-900/90 text-slate-300 hover:text-indigo-300 rounded-md border border-slate-700 transition-colors"
                              title="Regenerate with Imagen 3"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-900/80 border-b border-slate-800">
                        <PhotoIcon className="w-10 h-10 text-slate-600 mb-2" />
                        <p className="text-xs text-slate-400 mb-3">No thumbnail generated</p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            onClick={() => handleGenerateSingleThumbnail(scene)}
                            disabled={isGeneratingBatch}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-md shadow flex items-center gap-1.5 transition-all"
                          >
                            <SparklesIcon className="w-3.5 h-3.5" />
                            <span>Generate (Imagen 3)</span>
                          </button>
                          <button
                            onClick={() => handleGenerateProceduralFallback(scene)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md border border-slate-700 transition-colors"
                            title="Generate Instant Procedural Storyboard Art"
                          >
                            Concept Art
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleSceneSelect(scene.sceneNumber)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-cyan-500 text-slate-950' 
                            : 'bg-slate-900/80 text-slate-400 border border-slate-600 hover:text-white'
                        }`}
                        title="Select for batch generation"
                      >
                        {isSelected && <CheckIcon className="w-4 h-4 stroke-[3]" />}
                      </button>
                      <span className="px-2 py-0.5 bg-slate-950/80 backdrop-blur-sm text-cyan-300 font-bold text-xs rounded-md border border-slate-700">
                        Scene {scene.sceneNumber}
                      </span>
                    </div>

                    {hasThumbnail && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-emerald-950/85 backdrop-blur-sm text-emerald-300 font-semibold text-[10px] rounded-md border border-emerald-800 flex items-center gap-1">
                          <CheckCircle2Icon className="w-3 h-3 text-emerald-400" />
                          Ready
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Scene Info & Meta */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-indigo-400" />
                          {scene.startTimeSeconds ?? 0}s - {scene.endTimeSeconds ?? 8}s
                        </span>
                        {scene.cameraAngle && (
                          <span className="flex items-center gap-1 text-slate-300 font-medium truncate max-w-[140px]">
                            <ViewfinderIcon className="w-3.5 h-3.5 text-cyan-400" />
                            {scene.cameraAngle}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {scene.description}
                      </p>
                    </div>

                    {/* Error Banner */}
                    {sceneError && (
                      <div className="p-2 bg-amber-950/80 border border-amber-800 text-amber-200 rounded-md text-[11px] space-y-1">
                        <p className="font-semibold">Generation notice:</p>
                        <p className="line-clamp-2">{sceneError}</p>
                        <button
                          onClick={() => handleGenerateProceduralFallback(scene)}
                          className="mt-1 underline text-cyan-300 hover:text-cyan-200"
                        >
                          Use procedural concept artwork fallback
                        </button>
                      </div>
                    )}

                    {/* Prompt Inspector / Edit Accordion */}
                    <div className="pt-2 border-t border-slate-700/60">
                      {isEditingPrompt ? (
                        <div className="space-y-2">
                          <textarea
                            value={customPromptText}
                            onChange={(e) => setCustomPromptText(e.target.value)}
                            rows={3}
                            className="w-full p-2 bg-slate-900 border border-indigo-500 rounded text-xs text-slate-200 font-mono"
                            placeholder="Custom Imagen 3 prompt..."
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingPromptSceneId(null)}
                              className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                handleGenerateSingleThumbnail(scene, customPromptText);
                                setEditingPromptSceneId(null);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded"
                            >
                              Generate with Custom Prompt
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
                            {scene.thumbnailPrompt || scene.veoPrompt || 'Auto-cinematic prompt'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingPromptSceneId(scene.sceneNumber);
                              setCustomPromptText(
                                scene.thumbnailPrompt || 
                                buildCinematicThumbnailPrompt(
                                  scene,
                                  script.overallMood,
                                  script.consistentElements,
                                  script.analysis?.suggestedColorPalette
                                )
                              );
                            }}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            Edit Prompt
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-400">
            Powered by <strong className="text-indigo-300">Google Imagen 3</strong> (16:9 Cinematic High-Definition)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Full Resolution Lightbox Modal */}
      {lightboxScene && lightboxScene.thumbnailUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxScene(null)}
        >
          <div 
            className="max-w-5xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-3 text-slate-200">
              <div>
                <h3 className="text-lg font-bold text-cyan-400">Scene {lightboxScene.sceneNumber} Storyboard Still</h3>
                <p className="text-xs text-slate-400">{lightboxScene.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadThumbnail(lightboxScene)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setLightboxScene(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
              <img
                src={lightboxScene.thumbnailUrl}
                alt={`Scene ${lightboxScene.sceneNumber} Full Size`}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
