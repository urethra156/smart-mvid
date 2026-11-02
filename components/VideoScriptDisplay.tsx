import React, { useState } from 'react';
import { VideoScript, Scene, SongAnalysis, ElementWithImage } from '../types';
import SceneCard from './SceneCard';
import { SparklesIcon, DownloadIcon, XCircleIcon } from './icons/Icons';

interface VideoScriptDisplayProps {
  script: VideoScript;
  elementsWithImages: ElementWithImage[];
  onUpdateScenes: (updatedScenes: Scene[]) => void;
  onSaveScript: () => void;
  onStartNew: () => void;
  onApiKeyError: () => void;
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


const VideoScriptDisplay: React.FC<VideoScriptDisplayProps> = ({ script, elementsWithImages, onUpdateScenes, onSaveScript, onStartNew, onApiKeyError }) => {
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);

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

  return (
    <div className="space-y-8">
      <div className="p-6 bg-slate-800/60 rounded-lg border border-slate-700">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                {script.title}
                </h2>
                <p className="mt-2 text-slate-400 text-lg flex items-center justify-center sm:justify-start gap-2">
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                    Mood: <span className="font-semibold text-slate-300">{script.overallMood}</span>
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                 <button
                    onClick={onSaveScript}
                    className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all duration-200 group"
                    aria-label="Save script as JSON file"
                >
                    <DownloadIcon className="w-5 h-5 mr-2 -ml-1"/>
                    Save Script
                </button>
                 <button
                    onClick={onStartNew}
                    className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-900 transition-all duration-200 group"
                    aria-label="Clear current script and start a new one"
                >
                    <XCircleIcon className="w-5 h-5 mr-2 -ml-1"/>
                    Start New
                </button>
            </div>
        </div>
      </div>
      
      {script.analysis && <SongAnalysisSummary analysis={script.analysis} />}

      <div className="space-y-6">
        {script.scenes.map((scene) => (
          <SceneCard 
            key={scene.sceneNumber} 
            scene={scene}
            overallMood={script.overallMood}
            elementsWithImages={elementsWithImages}
            isEditing={editingSceneId === scene.sceneNumber}
            onEdit={() => handleEdit(scene.sceneNumber)}
            onSave={handleSave}
            onCancel={handleCancel}
            onApiKeyError={onApiKeyError}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoScriptDisplay;