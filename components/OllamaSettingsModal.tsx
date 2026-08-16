import React, { useState, useEffect } from 'react';
import { OllamaConfig, OllamaModelInfo, LlmProvider } from '../types';
import {
  testOllamaConnection,
  testOpenCodeConnection,
  POPULAR_OLLAMA_MODELS,
  saveOllamaConfig,
} from '../services/ollamaService';
import {
  ServerIcon,
  CpuIcon,
  CommandLineIcon,
  CodeBracketIcon,
  CheckIcon,
  ClipboardIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  XCircleIcon,
  SparklesIcon,
  CheckCircle2Icon,
  SlidersIcon,
  BoltIcon
} from './icons/Icons';
import Loader from './Loader';

interface OllamaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OllamaConfig;
  activeProvider: LlmProvider;
  onSaveConfig: (newConfig: OllamaConfig, provider?: LlmProvider) => void;
  onSelectProvider?: (provider: LlmProvider) => void;
}

export const OllamaSettingsModal: React.FC<OllamaSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  activeProvider,
  onSaveConfig,
  onSelectProvider,
}) => {
  const [activeTab, setActiveTab] = useState<'ollama' | 'opencode' | 'test'>('ollama');
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider>(activeProvider);
  const [formConfig, setFormConfig] = useState<OllamaConfig>(config);

  // Connection testing states
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ connected: boolean; message: string; count?: number; isMixedContent?: boolean } | null>(null);
  const [installedModels, setInstalledModels] = useState<OllamaModelInfo[]>([]);

  const [isTestingOpenCode, setIsTestingOpenCode] = useState(false);
  const [openCodeStatus, setOpenCodeStatus] = useState<{ connected: boolean; message: string; models?: string[]; isMixedContent?: boolean } | null>(null);

  // Playground test state
  const [testPrompt, setTestPrompt] = useState('Create a 1-sentence surreal music video scene with neon lights and rain.');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);

  // Copy feedback state
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormConfig(config);
      setSelectedProvider(activeProvider);
      setOllamaStatus(null);
      setOpenCodeStatus(null);
      setTestResponse(null);
    }
  }, [isOpen, config, activeProvider]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleLoadDemoModels = () => {
    const demoModels: OllamaModelInfo[] = [
      { name: 'llama3.2:latest', model: 'llama3.2', size: 2000000000, modified_at: new Date().toISOString(), details: { parameter_size: '3.2B', quantization_level: 'Q4_K_M' } },
      { name: 'qwen2.5-coder:7b', model: 'qwen2.5-coder:7b', size: 4700000000, modified_at: new Date().toISOString(), details: { parameter_size: '7B', quantization_level: 'Q4_K_M' } },
      { name: 'deepseek-r1:8b', model: 'deepseek-r1:8b', size: 4900000000, modified_at: new Date().toISOString(), details: { parameter_size: '8B', quantization_level: 'Q4_K_M' } },
      { name: 'mistral:7b', model: 'mistral:7b', size: 4100000000, modified_at: new Date().toISOString(), details: { parameter_size: '7B', quantization_level: 'Q4_0' } },
    ];
    setInstalledModels(demoModels);
    setOllamaStatus({
      connected: true,
      message: 'Demo Models Loaded! You can explore presets and configure prompts. To connect your live local Ollama server over HTTPS, see the Tunnel Guide below.',
      count: demoModels.length,
    });
    setFormConfig(p => ({ ...p, model: 'llama3.2:latest' }));
  };

  const handleTestOllama = async (endpointToTest?: string) => {
    const target = endpointToTest || formConfig.endpoint;
    setIsTestingOllama(true);
    setOllamaStatus(null);

    const result = await testOllamaConnection(target);
    setIsTestingOllama(false);

    if (result.success) {
      setInstalledModels(result.models);
      setOllamaStatus({
        connected: true,
        message: `Connected! Found ${result.models.length} installed model(s).`,
        count: result.models.length,
        isMixedContent: false,
      });

      // If current model is not set or not in list, pick first available if exists
      if (result.models.length > 0 && !result.models.some(m => m.name === formConfig.model || m.model === formConfig.model)) {
        setFormConfig(prev => ({ ...prev, model: result.models[0].name }));
      }
    } else {
      setOllamaStatus({
        connected: false,
        message: result.error || 'Failed to connect to Ollama.',
        isMixedContent: result.isMixedContent,
      });
    }
  };

  const handleTestOpenCode = async () => {
    setIsTestingOpenCode(true);
    setOpenCodeStatus(null);

    const result = await testOpenCodeConnection(
      formConfig.openCodeEndpoint || 'http://localhost:1234/v1',
      formConfig.openCodeApiKey
    );
    setIsTestingOpenCode(false);

    if (result.success) {
      setOpenCodeStatus({
        connected: true,
        message: `Connected! Found ${result.models.length} models on local endpoint.`,
        models: result.models,
      });
      if (result.models.length > 0 && !formConfig.openCodeModel) {
        setFormConfig(prev => ({ ...prev, openCodeModel: result.models[0] }));
      }
    } else {
      setOpenCodeStatus({
        connected: false,
        message: result.error || 'Failed to reach Open Code / LM Studio endpoint.',
      });
    }
  };

  const handleRunTestPrompt = async () => {
    setIsTestingPrompt(true);
    setTestResponse(null);

    try {
      if (formConfig.isOpenCodeMode || selectedProvider === 'opencode') {
        const cleanEndpoint = (formConfig.openCodeEndpoint || 'http://localhost:1234/v1').replace(/\/+$/, '');
        const res = await fetch(`${cleanEndpoint}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: formConfig.openCodeModel || 'qwen2.5-coder-7b-instruct',
            messages: [{ role: 'user', content: testPrompt }],
            temperature: formConfig.temperature,
          }),
        });
        const data = await res.json();
        setTestResponse(data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2));
      } else {
        const cleanEndpoint = formConfig.endpoint.replace(/\/+$/, '');
        const res = await fetch(`${cleanEndpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: formConfig.model || 'llama3.2',
            prompt: testPrompt,
            stream: false,
            options: { temperature: formConfig.temperature },
          }),
        });
        const data = await res.json();
        setTestResponse(data.response || JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setTestResponse(`Error: ${err?.message || 'Failed to complete test prompt.'}`);
    } finally {
      setIsTestingPrompt(false);
    }
  };

  const handleSaveAndApply = () => {
    saveOllamaConfig(formConfig);
    if (onSelectProvider) {
      onSelectProvider(selectedProvider);
    }
    onSaveConfig(formConfig, selectedProvider);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <CpuIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Ollama & Open Code Engine
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Local AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Run song analysis, cinematic scriptwriting, and scene prompts with local open-source LLMs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Provider Switcher Bar */}
        <div className="px-6 pt-4 pb-2 bg-slate-950/60 border-b border-slate-800">
          <label className="text-xs font-semibold text-slate-400 block mb-2">
            Active Script Generation Provider:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setSelectedProvider('gemini');
                setFormConfig(p => ({ ...p, isOpenCodeMode: false }));
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedProvider === 'gemini'
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4" />
                  Google Gemini
                </span>
                {selectedProvider === 'gemini' && <CheckCircle2Icon className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400">Gemini 2.5 Pro & Flash Cloud AI</p>
            </button>

            <button
              onClick={() => {
                setSelectedProvider('ollama');
                setFormConfig(p => ({ ...p, isOpenCodeMode: false }));
                setActiveTab('ollama');
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedProvider === 'ollama'
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <CpuIcon className="w-4 h-4" />
                  Local Ollama
                </span>
                {selectedProvider === 'ollama' && <CheckCircle2Icon className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400">Llama 3.2, DeepSeek, Qwen Local</p>
            </button>

            <button
              onClick={() => {
                setSelectedProvider('opencode');
                setFormConfig(p => ({ ...p, isOpenCodeMode: true }));
                setActiveTab('opencode');
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedProvider === 'opencode'
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CodeBracketIcon className="w-4 h-4" />
                  Open Code / LM Studio
                </span>
                {selectedProvider === 'opencode' && <CheckCircle2Icon className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400">OpenAI-Compatible Local API</p>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('ollama')}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'ollama'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ServerIcon className="w-4 h-4" />
            Ollama Configuration
          </button>
          <button
            onClick={() => setActiveTab('opencode')}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'opencode'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CodeBracketIcon className="w-4 h-4" />
            Open Code / LM Studio Server
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'test'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CommandLineIcon className="w-4 h-4" />
            Live Inference Test
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-sm">
          {/* TAB 1: OLLAMA CONFIG */}
          {activeTab === 'ollama' && (
            <div className="space-y-6">
              {/* Endpoint Input and Test Button */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ollama REST API Endpoint URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formConfig.endpoint}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                    placeholder="http://localhost:11434"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleTestOllama()}
                    disabled={isTestingOllama}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow"
                  >
                    {isTestingOllama ? (
                      <>
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4" />
                        <span>Test & Scan Models</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Connection Status Box */}
                {ollamaStatus && (
                  <div
                    className={`mt-3 p-3.5 rounded-xl border text-xs flex flex-col gap-2.5 ${
                      ollamaStatus.connected
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                        : 'bg-slate-950 border-amber-600/70 text-slate-200 shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {ollamaStatus.connected ? (
                        <CheckCircle2Icon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <InformationCircleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-slate-100 flex items-center justify-between">
                          <span>{ollamaStatus.connected ? 'Ollama Server Online' : 'Ollama Connection Diagnostics'}</span>
                          {ollamaStatus.isMixedContent && (
                            <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono">
                              HTTPS Mixed Content
                            </span>
                          )}
                        </p>
                        <p className="mt-1 leading-relaxed text-slate-300 whitespace-pre-wrap">{ollamaStatus.message}</p>
                      </div>
                    </div>

                    {!ollamaStatus.connected && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProvider('gemini');
                            setOllamaStatus({ connected: true, message: 'Switched to Google Gemini Cloud AI. You can generate scripts immediately.' });
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                        >
                          <SparklesIcon className="w-3.5 h-3.5 text-amber-300" />
                          <span>Switch to Gemini Cloud</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleLoadDemoModels}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                        >
                          <CpuIcon className="w-3.5 h-3.5" />
                          <span>Explore Demo Models</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy('ngrok http 11434', 'ngrok-cmd')}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs transition-all flex items-center gap-1"
                          title="Copy command to expose Ollama via secure HTTPS URL"
                        >
                          {copiedCmd === 'ngrok-cmd' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
                          <span>{copiedCmd === 'ngrok-cmd' ? 'Copied ngrok command!' : 'Copy: ngrok http 11434'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Selected Ollama Model:
                </label>
                {installedModels.length > 0 ? (
                  <select
                    value={formConfig.model}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500"
                  >
                    {installedModels.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} {m.details?.parameter_size ? `(${m.details.parameter_size})` : ''} {m.details?.quantization_level ? `[${m.details.quantization_level}]` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formConfig.model}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="llama3.2"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500"
                  />
                )}
              </div>

              {/* Popular Model Quick Picks */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Popular Model Quick Presets & Terminal Run Commands:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POPULAR_OLLAMA_MODELS.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.pullCmd}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setFormConfig(prev => ({ ...prev, model: item.id }))}
                          className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                          title="Select this model"
                        >
                          Select
                        </button>
                        <button
                          onClick={() => handleCopy(item.pullCmd, item.id)}
                          className="p-1 text-slate-400 hover:text-cyan-300 rounded-md transition-colors"
                          title="Copy terminal command"
                        >
                          {copiedCmd === item.id ? (
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ClipboardIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal CORS Guide */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <CommandLineIcon className="w-4 h-4 text-yellow-400" />
                    How to enable Browser CORS for Ollama:
                  </span>
                  <button
                    onClick={() => handleCopy('OLLAMA_ORIGINS="*" ollama serve', 'cors-cmd')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedCmd === 'cors-cmd' ? <CheckIcon className="w-3.5 h-3.5" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'cors-cmd' ? 'Copied!' : 'Copy Command'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto">
                  OLLAMA_ORIGINS="*" ollama serve
                </pre>
                <p className="text-[11px] text-slate-400">
                  On Windows (Command Prompt): <code className="text-slate-300">set OLLAMA_ORIGINS=* && ollama serve</code>
                </p>
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Temperature ({formConfig.temperature}):
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={formConfig.temperature}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Precise (0.1)</span>
                    <span>Creative (1.5)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Context Length (tokens):
                  </label>
                  <select
                    value={formConfig.contextLength}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, contextLength: parseInt(e.target.value, 10) }))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs"
                  >
                    <option value={4096}>4,096 tokens (Fast)</option>
                    <option value={8192}>8,192 tokens (Recommended)</option>
                    <option value={16384}>16,384 tokens (Full Song + Lyrics)</option>
                    <option value={32768}>32,768 tokens (Long Form)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPEN CODE / LM STUDIO / LOCALAI */}
          {activeTab === 'opencode' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Open Code / OpenAI-Compatible Endpoint URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formConfig.openCodeEndpoint || 'http://localhost:1234/v1'}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, openCodeEndpoint: e.target.value }))}
                    placeholder="http://localhost:1234/v1"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleTestOpenCode}
                    disabled={isTestingOpenCode}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow"
                  >
                    {isTestingOpenCode ? (
                      <>
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>
                </div>

                {openCodeStatus && (
                  <div
                    className={`mt-3 p-3.5 rounded-xl border text-xs flex flex-col gap-2.5 ${
                      openCodeStatus.connected
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                        : 'bg-slate-950 border-amber-600/70 text-slate-200 shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {openCodeStatus.connected ? (
                        <CheckCircle2Icon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <InformationCircleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-slate-100 flex items-center justify-between">
                          <span>{openCodeStatus.connected ? 'Endpoint Reachable' : 'Open Code Connection Diagnostics'}</span>
                          {openCodeStatus.isMixedContent && (
                            <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono">
                              HTTPS Mixed Content
                            </span>
                          )}
                        </p>
                        <p className="mt-1 leading-relaxed text-slate-300 whitespace-pre-wrap">{openCodeStatus.message}</p>
                      </div>
                    </div>

                    {!openCodeStatus.connected && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProvider('gemini');
                            setOpenCodeStatus({ connected: true, message: 'Switched to Google Gemini Cloud AI.' });
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                        >
                          <SparklesIcon className="w-3.5 h-3.5 text-amber-300" />
                          <span>Switch to Gemini Cloud</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy('ngrok http 1234', 'ngrok-lm-cmd')}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs transition-all flex items-center gap-1"
                        >
                          {copiedCmd === 'ngrok-lm-cmd' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
                          <span>Copy: ngrok http 1234</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Model Identifier:
                  </label>
                  <input
                    type="text"
                    value={formConfig.openCodeModel || 'qwen2.5-coder-7b-instruct'}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, openCodeModel: e.target.value }))}
                    placeholder="e.g. qwen2.5-coder-7b-instruct or deepseek-r1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    API Key (Optional):
                  </label>
                  <input
                    type="password"
                    value={formConfig.openCodeApiKey || ''}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, openCodeApiKey: e.target.value }))}
                    placeholder="Leave blank for local servers"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                <h4 className="font-bold text-slate-200 flex items-center gap-2">
                  <CodeBracketIcon className="w-4 h-4 text-emerald-400" />
                  Compatible Open Code Server Runtimes:
                </h4>
                <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                  <li><strong className="text-slate-200">LM Studio</strong>: Launch Local Server on port <code className="text-emerald-300">1234</code> with CORS enabled.</li>
                  <li><strong className="text-slate-200">LocalAI</strong>: Run <code className="text-emerald-300">docker run -p 8080:8080 localai/localai</code>.</li>
                  <li><strong className="text-slate-200">vLLM / TextGen</strong>: Start OpenAI-compatible API server on port <code className="text-emerald-300">8000</code>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: TEST SANDBOX */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Test Prompt (Sent to active {formConfig.isOpenCodeMode ? 'Open Code' : 'Ollama'} model):
                </label>
                <textarea
                  rows={3}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 font-sans"
                />
              </div>

              <button
                onClick={handleRunTestPrompt}
                disabled={isTestingPrompt}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow"
              >
                {isTestingPrompt ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Generating completion...</span>
                  </>
                ) : (
                  <>
                    <BoltIcon className="w-4 h-4 text-yellow-400" />
                    <span>Run Inference Test</span>
                  </>
                )}
              </button>

              {testResponse && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-300">Local LLM Output:</span>
                    <button
                      onClick={() => handleCopy(testResponse, 'test-resp')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedCmd === 'test-resp' ? <CheckIcon className="w-3 h-3 text-emerald-400" /> : <ClipboardIcon className="w-3 h-3" />}
                      <span>{copiedCmd === 'test-resp' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {testResponse}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Provider:</span>
            <span className="font-bold text-white font-mono capitalize">
              {selectedProvider === 'gemini' ? 'Google Gemini Cloud' : selectedProvider === 'ollama' ? `Ollama (${formConfig.model})` : `Open Code (${formConfig.openCodeModel})`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1.5 transition-all"
            >
              <CheckIcon className="w-4 h-4" />
              <span>Apply & Save Engine</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
