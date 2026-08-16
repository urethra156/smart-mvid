import React, { useState, useEffect, useMemo } from 'react';
import { PromptStylePreset, Scene, VideoScript, StyleApplyMode, StyleCategory } from '../types';
import {
  SparklesIcon,
  XCircleIcon,
  TagIcon,
  BookmarkIcon,
  StarIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  SwatchIcon,
  MagnifyingGlassIcon,
  ClipboardIcon,
  CheckIcon,
  DocumentDuplicateIcon,
  CameraIcon,
  DownloadIcon,
  UploadIcon,
  ArrowPathIcon
} from './icons/Icons';
import {
  getPromptLibrary,
  savePromptPreset,
  deletePromptPreset,
  toggleFavoritePreset,
  resetToDefaultStyles,
  getAllTagsWithCounts,
  applyPresetToScript,
  exportLibraryToJson,
  importLibraryFromJson
} from '../services/promptLibraryService';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  script?: VideoScript;
  currentSceneNumber?: number | null;
  onApplyPresetToScenes: (updatedScenes: Scene[], message: string) => void;
}

const CATEGORIES: StyleCategory[] = [
  'Aesthetic / Art Style',
  'Camera & Film Stock',
  'Lighting & Atmosphere',
  'Genre & Mood',
  'Custom'
];

const SUGGESTED_QUICK_TAGS = [
  'Cyberpunk',
  'Watercolor',
  'VHS aesthetic',
  'Cinematic',
  '35mm',
  'Anime',
  'Super 8',
  'Synthwave',
  'Gothic',
  'Wes Anderson',
  'Pastel',
  'Glitch',
  'Film Noir',
  'Claymation',
  'Golden Hour',
  'Unreal Engine 5',
  'Psychedelic'
];

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  isOpen,
  onClose,
  script,
  currentSceneNumber,
  onApplyPresetToScenes
}) => {
  const [presets, setPresets] = useState<PromptStylePreset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'custom'>('all');
  
  // Selected preset for detailed inspection or application
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  
  // Application config state
  const [applyMode, setApplyMode] = useState<StyleApplyMode>('append');
  const [applyTarget, setApplyTarget] = useState<'all' | 'single' | 'custom'>('all');
  const [selectedSceneNumbers, setSelectedSceneNumbers] = useState<number[]>([]);
  
  // Creation / Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PromptStylePreset | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<StyleCategory>('Custom');
  const [formTagsString, setFormTagsString] = useState('');
  const [formPromptSnippet, setFormPromptSnippet] = useState('');
  const [formNegativePrompt, setFormNegativePrompt] = useState('');
  const [formCameraNotes, setFormCameraNotes] = useState('');
  const [formLightingNotes, setFormLightingNotes] = useState('');
  const [formColorHints, setFormColorHints] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

  // Import / Export state
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load presets on mount or when opened
  useEffect(() => {
    if (isOpen) {
      const loaded = getPromptLibrary();
      setPresets(loaded);
      
      // Default to first preset if none selected
      if (!selectedPresetId && loaded.length > 0) {
        setSelectedPresetId(loaded[0].id);
      }

      // If opened targeting a specific scene, initialize target state
      if (currentSceneNumber !== undefined && currentSceneNumber !== null) {
        setApplyTarget('single');
        setSelectedSceneNumbers([currentSceneNumber]);
      } else if (script && script.scenes.length > 0) {
        setApplyTarget('all');
        setSelectedSceneNumbers(script.scenes.map((s) => s.sceneNumber));
      }
    }
  }, [isOpen, currentSceneNumber, script]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isFormOpen && !isImportExportOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFormOpen, isImportExportOpen, onClose]);

  // Extract all tags with counts
  const allTagsWithCounts = useMemo(() => getAllTagsWithCounts(presets), [presets]);

  // Filtered presets
  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      // Tab filter
      if (activeTab === 'favorites' && !p.isFavorite) return false;
      if (activeTab === 'custom' && !p.isCustom) return false;

      // Category filter
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;

      // Tag filter
      if (selectedTag) {
        const hasTag = p.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
        if (!hasTag) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        const matchPrompt = p.promptSnippet.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchPrompt && !matchTags && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [presets, activeTab, selectedCategory, selectedTag, searchQuery]);

  const activeSelectedPreset = useMemo(() => {
    return presets.find((p) => p.id === selectedPresetId) || filteredPresets[0] || null;
  }, [presets, selectedPresetId, filteredPresets]);

  // Actions
  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = toggleFavoritePreset(id);
    setPresets(updated);
  };

  const handleDeletePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this custom style preset?')) {
      const updated = deletePromptPreset(id);
      setPresets(updated);
      if (selectedPresetId === id) {
        setSelectedPresetId(updated[0]?.id || null);
      }
    }
  };

  const handleCopyPrompt = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all styles to built-in presets? Your custom presets will be removed unless exported.')) {
      const reset = resetToDefaultStyles();
      setPresets(reset);
      setSelectedPresetId(reset[0]?.id || null);
    }
  };

  // Open Form for New Preset
  const handleOpenCreateForm = () => {
    setEditingPreset(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Custom');
    setFormTagsString(selectedTag ? selectedTag : 'Cyberpunk, Futuristic');
    setFormPromptSnippet('');
    setFormNegativePrompt('');
    setFormCameraNotes('');
    setFormLightingNotes('');
    setFormColorHints('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Form to Edit or Duplicate
  const handleOpenEditForm = (preset: PromptStylePreset, isDuplicate = false) => {
    setEditingPreset(isDuplicate ? null : preset);
    setFormTitle(isDuplicate ? `${preset.title} (Copy)` : preset.title);
    setFormDescription(preset.description || '');
    setFormCategory(preset.category);
    setFormTagsString(preset.tags.join(', '));
    setFormPromptSnippet(preset.promptSnippet);
    setFormNegativePrompt(preset.negativePrompt || '');
    setFormCameraNotes(preset.cameraNotes || '');
    setFormLightingNotes(preset.lightingNotes || '');
    setFormColorHints(preset.colorPaletteHints ? preset.colorPaletteHints.join(', ') : '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please enter a style title.');
      return;
    }
    if (!formPromptSnippet.trim()) {
      setFormError('Please provide a prompt snippet for this style.');
      return;
    }

    const tags = formTagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const colors = formColorHints
      .split(',')
      .map((c) => c.trim())
      .filter((c) => /^#?[0-9a-fA-F]{3,8}$/.test(c))
      .map((c) => (c.startsWith('#') ? c : `#${c}`));

    const newPreset: PromptStylePreset = {
      id: editingPreset ? editingPreset.id : `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: formTitle.trim(),
      description: formDescription.trim(),
      tags: tags.length > 0 ? tags : ['Custom'],
      category: formCategory,
      promptSnippet: formPromptSnippet.trim(),
      negativePrompt: formNegativePrompt.trim() || undefined,
      cameraNotes: formCameraNotes.trim() || undefined,
      lightingNotes: formLightingNotes.trim() || undefined,
      colorPaletteHints: colors.length > 0 ? colors : undefined,
      isCustom: true,
      isFavorite: editingPreset ? editingPreset.isFavorite : false,
      createdAt: editingPreset ? editingPreset.createdAt : Date.now(),
    };

    const updated = savePromptPreset(newPreset);
    setPresets(updated);
    setSelectedPresetId(newPreset.id);
    setIsFormOpen(false);
  };

  // Add tag to form tags
  const handleAddTagToForm = (tagToAdd: string) => {
    const currentTags = formTagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!currentTags.includes(tagToAdd)) {
      currentTags.push(tagToAdd);
      setFormTagsString(currentTags.join(', '));
    }
  };

  // Apply Preset to Script Scenes
  const handleApplyPreset = (presetToApply: PromptStylePreset) => {
    if (!script || !script.scenes || script.scenes.length === 0) {
      alert('No scenes found in the current script to apply style to.');
      return;
    }

    let targetScenes: number[] | undefined;
    if (applyTarget === 'single') {
      if (currentSceneNumber !== undefined && currentSceneNumber !== null) {
        targetScenes = [currentSceneNumber];
      } else {
        targetScenes = [script.scenes[0].sceneNumber];
      }
    } else if (applyTarget === 'custom') {
      if (selectedSceneNumbers.length === 0) {
        alert('Please select at least one scene to apply this style to.');
        return;
      }
      targetScenes = selectedSceneNumbers;
    } else {
      // 'all'
      targetScenes = script.scenes.map((s) => s.sceneNumber);
    }

    const { updatedScript, affectedCount } = applyPresetToScript(script, presetToApply, applyMode, targetScenes);

    const msg = `Applied style "${presetToApply.title}" to ${affectedCount} scene${affectedCount === 1 ? '' : 's'} (${applyMode} mode)`;
    onApplyPresetToScenes(updatedScript.scenes, msg);
    
    setApplyFeedback(msg);
    setTimeout(() => {
      setApplyFeedback(null);
    }, 4000);
  };

  // Import / Export Handlers
  const handleDownloadJson = () => {
    const jsonStr = exportLibraryToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_director_prompt_library_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleProcessImport = () => {
    if (!importJsonText.trim()) {
      setImportMessage({ type: 'error', text: 'Please paste JSON content or upload a file.' });
      return;
    }
    const res = importLibraryFromJson(importJsonText);
    if (res.success && res.updatedList) {
      setPresets(res.updatedList);
      setImportMessage({ type: 'success', text: `Successfully imported ${res.count} style presets!` });
      setImportJsonText('');
      setTimeout(() => {
        setIsImportExportOpen(false);
        setImportMessage(null);
      }, 1800);
    } else {
      setImportMessage({ type: 'error', text: res.error || 'Failed to import presets.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFormOpen && !isImportExportOpen) {
          onClose();
        }
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <SwatchIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Prompt & Style Library</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {presets.length} Presets
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Save, tag, and quickly apply curated styles (Cyberpunk, Watercolor, VHS, etc.) to your AI scenes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleOpenCreateForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm transition-all shadow-md hover:shadow-indigo-500/20"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Style</span>
            </button>
            <button
              onClick={() => setIsImportExportOpen(true)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-colors"
              title="Import / Export Library JSON"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-1"
              aria-label="Close Prompt Library"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {applyFeedback && (
          <div className="bg-emerald-950/90 border-b border-emerald-700 px-5 py-2.5 text-emerald-200 text-xs sm:text-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{applyFeedback}</span>
            </div>
            <button
              onClick={() => setApplyFeedback(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TOOLBAR: SEARCH, TABS & CATEGORIES */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search styles by name, prompt, tag (e.g. Cyberpunk, VHS, Watercolor, 35mm)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Tabs */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700 self-start md:self-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({presets.length})
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeTab === 'favorites'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <StarIcon className="w-3.5 h-3.5 text-amber-300" filled />
                Favorites ({presets.filter((p) => p.isFavorite).length})
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'custom'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom ({presets.filter((p) => p.isCustom).length})
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TAG CLOUD CHIPS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-slate-400 flex items-center gap-1 font-medium text-[11px] uppercase tracking-wider pl-1 pr-2 flex-shrink-0">
              <TagIcon className="w-3 h-3 text-indigo-400" />
              Tags:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                selectedTag === null
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              All Tags
            </button>
            {allTagsWithCounts.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1 ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white border border-indigo-400 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <span>{tag}</span>
                <span
                  className={`text-[10px] px-1 rounded-full ${
                    selectedTag === tag ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT AREA: TWO-COLUMN LAYOUT (STYLE CARDS LIST + ACTIVE INSPECTOR / APPLIER) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[380px]">
          {/* LEFT LIST / GRID (COL 1 to 7) */}
          <div className="lg:col-span-7 border-r border-slate-800 overflow-y-auto p-4 space-y-3 max-h-[58vh]">
            {filteredPresets.length === 0 ? (
              <div className="text-center py-12 px-4">
                <SwatchIcon className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No matching styles found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search query, clearing the active tag filter, or creating a new custom style preset.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTag(null);
                      setSelectedCategory('All');
                      setActiveTab('all');
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={handleOpenCreateForm}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium"
                  >
                    + Create Style
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPresets.map((preset) => {
                  const isSelected = activeSelectedPreset?.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                          : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        {/* Card Header: Title, Fav & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-sm text-white truncate">{preset.title}</h4>
                              {preset.isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                  Custom
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">{preset.category}</span>
                          </div>

                          <button
                            onClick={(e) => handleToggleFavorite(e, preset.id)}
                            className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                            title={preset.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <StarIcon
                              className={`w-4 h-4 ${preset.isFavorite ? 'text-amber-400' : 'text-slate-500'}`}
                              filled={preset.isFavorite}
                            />
                          </button>
                        </div>

                        {/* Description */}
                        {preset.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                            {preset.description}
                          </p>
                        )}

                        {/* Color Swatch Preview */}
                        {preset.colorPaletteHints && preset.colorPaletteHints.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2.5">
                            {preset.colorPaletteHints.map((hex, idx) => (
                              <div
                                key={idx}
                                className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
                                style={{ backgroundColor: hex }}
                                title={hex}
                              />
                            ))}
                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {preset.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag);
                              }}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900 text-slate-300 hover:bg-indigo-900/50 hover:text-indigo-200 border border-slate-700/60 transition-colors"
                            >
                              #{tag}
                            </span>
                          ))}
                          {preset.tags.length > 3 && (
                            <span className="text-[10px] text-slate-500 self-center">
                              +{preset.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Quick Actions */}
                      <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-slate-700/60">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleCopyPrompt(e, preset.promptSnippet, preset.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                            title="Copy prompt text"
                          >
                            {copiedId === preset.id ? (
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ClipboardIcon className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditForm(preset, true);
                            }}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                            title="Duplicate & tweak as new style"
                          >
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          </button>
                          {preset.isCustom && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditForm(preset, false);
                                }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-700/60 transition-colors"
                                title="Edit custom style"
                              >
                                <PencilIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeletePreset(e, preset.id)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700/60 transition-colors"
                                title="Delete style"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPresetId(preset.id);
                            handleApplyPreset(preset);
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600/90 hover:bg-indigo-600 text-white transition-colors shadow-sm flex items-center gap-1"
                        >
                          <SparklesIcon className="w-3 h-3 text-yellow-300" />
                          <span>Apply</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT INSPECTOR & APPLIER (COL 8 to 12) */}
          <div className="lg:col-span-5 bg-slate-950/40 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto max-h-[58vh]">
            {activeSelectedPreset ? (
              <div className="space-y-4">
                {/* Header detail */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase tracking-wider">
                        {activeSelectedPreset.category}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1.5">{activeSelectedPreset.title}</h3>
                    </div>
                    <button
                      onClick={(e) => handleToggleFavorite(e, activeSelectedPreset.id)}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500"
                    >
                      <StarIcon
                        className={`w-4 h-4 ${
                          activeSelectedPreset.isFavorite ? 'text-amber-400' : 'text-slate-400'
                        }`}
                        filled={activeSelectedPreset.isFavorite}
                      />
                    </button>
                  </div>
                  {activeSelectedPreset.description && (
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      {activeSelectedPreset.description}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tags:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {activeSelectedPreset.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-xs bg-slate-800 text-indigo-300 border border-slate-700 font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prompt Snippet Box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <SparklesIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Style Prompt Snippet:
                    </label>
                    <button
                      onClick={(e) =>
                        handleCopyPrompt(e, activeSelectedPreset.promptSnippet, activeSelectedPreset.id)
                      }
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                    >
                      {copiedId === activeSelectedPreset.id ? (
                        <>
                          <CheckIcon className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardIcon className="w-3 h-3" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700/80 text-xs font-mono text-slate-200 leading-relaxed max-h-28 overflow-y-auto select-all">
                    {activeSelectedPreset.promptSnippet}
                  </div>
                </div>

                {/* Optional Negative Prompt */}
                {activeSelectedPreset.negativePrompt && (
                  <div>
                    <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                      Negative Prompt Filter:
                    </label>
                    <div className="p-2 bg-slate-900/80 rounded border border-rose-950/60 text-[11px] font-mono text-rose-300">
                      {activeSelectedPreset.negativePrompt}
                    </div>
                  </div>
                )}

                {/* Camera / Lighting Notes */}
                {(activeSelectedPreset.cameraNotes || activeSelectedPreset.lightingNotes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {activeSelectedPreset.cameraNotes && (
                      <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                        <span className="font-semibold text-slate-400 block text-[10px] uppercase">Camera Hint:</span>
                        <span className="text-slate-300">{activeSelectedPreset.cameraNotes}</span>
                      </div>
                    )}
                    {activeSelectedPreset.lightingNotes && (
                      <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                        <span className="font-semibold text-slate-400 block text-[10px] uppercase">Lighting Hint:</span>
                        <span className="text-slate-300">{activeSelectedPreset.lightingNotes}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* TARGET SCENE & APPLY MODE CONTROLS */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Apply Mode: Append, Prepend, Replace */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Application Mode:
                      </label>
                      <select
                        value={applyMode}
                        onChange={(e) => setApplyMode(e.target.value as StyleApplyMode)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="append">Append (Recommended)</option>
                        <option value="prepend">Prepend (Style first)</option>
                        <option value="replace">Replace Prompt</option>
                      </select>
                    </div>

                    {/* Target Scope */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Target Scenes:
                      </label>
                      <select
                        value={applyTarget}
                        onChange={(e) => setApplyTarget(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="all">All Scenes ({script?.scenes?.length || 0})</option>
                        {currentSceneNumber && (
                          <option value="single">Current Scene #{currentSceneNumber}</option>
                        )}
                        <option value="custom">Choose Specific Scenes...</option>
                      </select>
                    </div>
                  </div>

                  {/* If custom scene picker selected */}
                  {applyTarget === 'custom' && script && script.scenes.length > 0 && (
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Select Scenes:</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedSceneNumbers(script.scenes.map((s) => s.sceneNumber))}
                            className="text-indigo-400 hover:underline"
                          >
                            Select All
                          </button>
                          <button onClick={() => setSelectedSceneNumbers([])} className="text-slate-400 hover:underline">
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {script.scenes.map((sc) => {
                          const isChecked = selectedSceneNumbers.includes(sc.sceneNumber);
                          return (
                            <button
                              key={sc.sceneNumber}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedSceneNumbers(selectedSceneNumbers.filter((n) => n !== sc.sceneNumber));
                                } else {
                                  setSelectedSceneNumbers([...selectedSceneNumbers, sc.sceneNumber]);
                                }
                              }}
                              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
                                isChecked
                                  ? 'bg-indigo-600 text-white border border-indigo-400'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              Scene {sc.sceneNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Big Apply Button */}
                  <button
                    onClick={() => handleApplyPreset(activeSelectedPreset)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <SparklesIcon className="w-4 h-4 text-yellow-300" />
                    <span>
                      Apply &ldquo;{activeSelectedPreset.title}&rdquo; to{' '}
                      {applyTarget === 'all'
                        ? 'All Scenes'
                        : applyTarget === 'single'
                        ? `Scene #${currentSceneNumber || 1}`
                        : `${selectedSceneNumbers.length} Selected Scene${selectedSceneNumbers.length === 1 ? '' : 's'}`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <SwatchIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a style preset from the list to preview details and apply to scenes.</p>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              💡 <span className="font-semibold text-slate-300">Tip:</span> Styles augment prompt lighting, camera,
              atmosphere and artistic medium.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              title="Reset prompt library to factory defaults"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              <span>Reset Factory Presets</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT PRESET MODAL SUB-VIEW */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 rounded-lg text-indigo-300">
                  {editingPreset ? <PencilIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {editingPreset ? `Edit Style: ${editingPreset.title}` : 'Create New Style Preset'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
              {formError && (
                <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-300 block mb-1">
                    Style Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Cyberpunk Neon Noir, 90s VHS Aesthetic, Pastel Watercolor"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as StyleCategory)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief summary of visual tone and atmosphere"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Tags & Quick Tag Helper */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formTagsString}
                  onChange={(e) => setFormTagsString(e.target.value)}
                  placeholder="Cyberpunk, Neon, Futuristic, Sci-Fi"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="mt-1.5 flex items-center gap-1 flex-wrap text-[11px]">
                  <span className="text-slate-400">Quick add:</span>
                  {SUGGESTED_QUICK_TAGS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleAddTagToForm(st)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:text-white transition-colors"
                    >
                      +{st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Snippet */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300 flex items-center gap-1">
                    <SparklesIcon className="w-4 h-4 text-yellow-400" />
                    Style Prompt Snippet <span className="text-red-400">*</span>
                  </label>
                  <span className="text-xs text-slate-400">Injected into scene prompts</span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={formPromptSnippet}
                  onChange={(e) => setFormPromptSnippet(e.target.value)}
                  placeholder="e.g., cyberpunk aesthetic, neon cyan and magenta rim light, rain-slicked asphalt reflections, volumetric fog, anamorphic 2.39:1 lens flare, 8k cinematic"
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
                />
              </div>

              {/* Negative Prompt */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Negative Prompt Filter (Optional)
                </label>
                <input
                  type="text"
                  value={formNegativePrompt}
                  onChange={(e) => setFormNegativePrompt(e.target.value)}
                  placeholder="e.g., blurry, bright daylight, cartoon, oversaturated, low resolution"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Camera & Lighting notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Camera Framing Notes (Optional)</label>
                  <input
                    type="text"
                    value={formCameraNotes}
                    onChange={(e) => setFormCameraNotes(e.target.value)}
                    placeholder="e.g., Low-angle tracking shot, slow push-in"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Lighting Notes (Optional)</label>
                  <input
                    type="text"
                    value={formLightingNotes}
                    onChange={(e) => setFormLightingNotes(e.target.value)}
                    placeholder="e.g., Cyan/magenta neon rim, chiaroscuro"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Color hints */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Color Palette Hints (Hex codes, comma separated)</label>
                <input
                  type="text"
                  value={formColorHints}
                  onChange={(e) => setFormColorHints(e.target.value)}
                  placeholder="#ff007f, #00f0ff, #0d0221"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md"
                >
                  {editingPreset ? 'Save Changes' : 'Create Style'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT / EXPORT MODAL SUB-VIEW */}
      {isImportExportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setIsImportExportOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 rounded-lg text-indigo-300">
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Import / Export Style Presets</h3>
              </div>
              <button
                onClick={() => setIsImportExportOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm overflow-y-auto">
              {importMessage && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    importMessage.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                      : 'bg-red-950/80 border-red-700 text-red-200'
                  }`}
                >
                  {importMessage.text}
                </div>
              )}

              {/* Export Section */}
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <DownloadIcon className="w-4 h-4 text-indigo-400" />
                  Export All Presets ({presets.length})
                </h4>
                <p className="text-xs text-slate-400">
                  Download a backup file containing all your built-in and custom style presets.
                </p>
                <button
                  onClick={handleDownloadJson}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Download Presets JSON</span>
                </button>
              </div>

              {/* Import Section */}
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <UploadIcon className="w-4 h-4 text-cyan-400" />
                  Import Presets from JSON
                </h4>
                <p className="text-xs text-slate-400">
                  Upload a <code>.json</code> file or paste preset array text to merge into your library.
                </p>

                <div>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer"
                  />
                </div>

                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Or paste JSON array here..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs placeholder-slate-600 focus:outline-none"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleProcessImport}
                    disabled={!importJsonText.trim()}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2"
                  >
                    <UploadIcon className="w-4 h-4" />
                    <span>Process & Merge Import</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsImportExportOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
