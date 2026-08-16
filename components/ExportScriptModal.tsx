import React, { useState } from 'react';
import { VideoScript } from '../types';
import {
  ExportFormat,
  generateTxtExport,
  generateStandardCsvExport,
  generateDaVinciCsvExport,
  generatePremiereCsvExport,
  generateCmxEdlExport,
  generateJsonExport,
  generateWebhookExport,
  generateCurlCommand,
  downloadFile
} from '../utils/exportUtils';
import { XCircleIcon, DownloadIcon, CheckIcon, FilmIcon, SparklesIcon, ArrowPathIcon } from './icons/Icons';

interface ExportScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: VideoScript;
}

export const ExportScriptModal: React.FC<ExportScriptModalProps> = ({
  isOpen,
  onClose,
  script,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('davinci_csv');
  const [fps, setFps] = useState<number>(24);
  const [copied, setCopied] = useState(false);

  // Webhook external API state
  const [webhookUrl, setWebhookUrl] = useState('http://127.0.0.1:8188/prompt');
  const [webhookMode, setWebhookMode] = useState<'json' | 'curl'>('json');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    statusText: string;
    responseBody: string;
    timestamp: string;
    simulated?: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const handleDispatchWebhook = async (forceSimulate = false) => {
    setIsDispatching(true);
    setDispatchResult(null);

    const payloadString = generateWebhookExport(script, webhookUrl);

    if (forceSimulate) {
      await new Promise(r => setTimeout(r, 800));
      setDispatchResult({
        success: true,
        statusText: '202 Accepted (Simulated Remote Webhook)',
        timestamp: new Date().toLocaleTimeString(),
        simulated: true,
        responseBody: JSON.stringify({
          status: 'success',
          event: 'remote_generation_task_received',
          batch_id: `batch_comfy_${Math.random().toString(36).substring(2, 9)}`,
          scenes_queued: script.scenes.length,
          endpoint: webhookUrl,
          message: 'All generated scene descriptions successfully dispatched to remote model pipeline.',
        }, null, 2),
      });
      setIsDispatching(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AIMusicVideoDirector/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      }).catch((err) => {
        throw new Error(`Fetch error: ${err.message || 'CORS restriction or network unreachable'}`);
      });

      clearTimeout(timeoutId);

      const resText = await res.text().catch(() => '');
      setDispatchResult({
        success: res.ok,
        statusText: `${res.status} ${res.statusText}`,
        timestamp: new Date().toLocaleTimeString(),
        responseBody: resText || (res.ok ? '{"status": "ok"}' : 'No response body'),
      });
    } catch (err: any) {
      setDispatchResult({
        success: false,
        statusText: 'Webhook Dispatch Error / CORS Blocked',
        timestamp: new Date().toLocaleTimeString(),
        responseBody: JSON.stringify({
          error: err.message || 'Network error',
          hint: 'If ComfyUI or your webhook runs on localhost, browser security blocks direct cross-origin posts without CORS headers. You can click "Simulate Remote Webhook" or copy the cURL command below to run in terminal.',
        }, null, 2),
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const getExportContentAndFilename = () => {
    const safeTitle = script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    switch (selectedFormat) {
      case 'webhook':
        return {
          content: webhookMode === 'curl' 
            ? generateCurlCommand(script, webhookUrl)
            : generateWebhookExport(script, webhookUrl),
          filename: `${safeTitle}_remote_api_webhook.${webhookMode === 'curl' ? 'sh' : 'json'}`,
          mimeType: webhookMode === 'curl' ? 'text/plain' : 'application/json',
          label: 'Remote Webhook API Payload',
          extension: webhookMode === 'curl' ? '.sh' : '.json'
        };
      case 'csv':
        return {
          content: generateStandardCsvExport(script),
          filename: `${safeTitle}_shotlist.csv`,
          mimeType: 'text/csv',
          label: 'Standard Scene Shotlist CSV',
          extension: '.csv'
        };
      case 'davinci_csv':
        return {
          content: generateDaVinciCsvExport(script, fps),
          filename: `${safeTitle}_davinci_resolve_markers.csv`,
          mimeType: 'text/csv',
          label: 'DaVinci Resolve Markers & Shotlist CSV',
          extension: '.csv'
        };
      case 'premiere_csv':
        return {
          content: generatePremiereCsvExport(script, fps),
          filename: `${safeTitle}_premiere_pro_markers.csv`,
          mimeType: 'text/csv',
          label: 'Adobe Premiere Pro Markers CSV',
          extension: '.csv'
        };
      case 'cmx_edl':
        return {
          content: generateCmxEdlExport(script, fps),
          filename: `${safeTitle}_timeline.edl`,
          mimeType: 'text/plain',
          label: 'CMX 3600 Edit Decision List (EDL)',
          extension: '.edl'
        };
      case 'json':
        return {
          content: generateJsonExport(script, fps),
          filename: `${safeTitle}_nle_project.json`,
          mimeType: 'application/json',
          label: 'Structured NLE Project JSON',
          extension: '.json'
        };
      case 'txt':
      default:
        return {
          content: generateTxtExport(script),
          filename: `${safeTitle}_script.txt`,
          mimeType: 'text/plain',
          label: 'Formatted Plain Text Script',
          extension: '.txt'
        };
    }
  };

  const { content, filename, mimeType, label, extension } = getExportContentAndFilename();

  const handleDownload = () => {
    downloadFile(content, filename, mimeType);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full p-6 text-slate-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close export modal"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-600/20 rounded-xl text-indigo-400 border border-indigo-500/30">
            <FilmIcon className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
              Export Script for Professional NLEs
            </h2>
            <p className="text-xs text-slate-400">
              Export your storyboard shotlist and timecodes formatted for Adobe Premiere Pro, DaVinci Resolve, or pipeline tools.
            </p>
          </div>
        </div>

        {/* Format Selector Grid */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Export Format & Target Tool
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* DaVinci Resolve */}
            <button
              onClick={() => setSelectedFormat('davinci_csv')}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                selectedFormat === 'davinci_csv'
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-cyan-300">DaVinci Resolve</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">.CSV</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Timeline markers & shot list with source/record timecodes & prompt metadata.
                </p>
              </div>
            </button>

            {/* Adobe Premiere Pro */}
            <button
              onClick={() => setSelectedFormat('premiere_csv')}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                selectedFormat === 'premiere_csv'
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-300">Adobe Premiere Pro</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">.CSV</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Premiere marker import format with scene durations, log notes & VEO prompts.
                </p>
              </div>
            </button>

            {/* CMX 3600 EDL */}
            <button
              onClick={() => setSelectedFormat('cmx_edl')}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                selectedFormat === 'cmx_edl'
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-amber-300">CMX 3600 EDL</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">.EDL</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Universal Edit Decision List for NLE timeline track reconstruction.
                </p>
              </div>
            </button>

            {/* Structured JSON */}
            <button
              onClick={() => setSelectedFormat('json')}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                selectedFormat === 'json'
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-300">NLE Project JSON</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">.JSON</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Full metadata, analysis, scene timings, frame counts & prompts JSON.
                </p>
              </div>
            </button>

            {/* Standard Scene Shotlist CSV */}
            <button
              onClick={() => setSelectedFormat('csv')}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                selectedFormat === 'csv'
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-teal-300">Standard Shotlist CSV</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800">.CSV</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Universal spreadsheet CSV with timestamps, camera angles, lyrics & prompts.
                </p>
              </div>
            </button>

            {/* Remote Webhook API Export */}
            <button
              onClick={() => setSelectedFormat('webhook')}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                selectedFormat === 'webhook'
                  ? 'bg-cyan-950/80 border-cyan-500 ring-2 ring-cyan-500/40 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-cyan-400" /> Remote API / Webhook
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">POST</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Trigger remote model generation pipeline via REST Webhook or cURL.
                </p>
              </div>
            </button>

            {/* Plain Text */}
            <button
              onClick={() => setSelectedFormat('txt')}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                selectedFormat === 'txt'
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">Plain Text Script</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">.TXT</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Formatted human-readable script breakdown for director notes & reading.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Webhook API Dispatcher Control Panel */}
        {selectedFormat === 'webhook' && (
          <div className="mb-6 p-4 bg-slate-900/90 rounded-xl border border-cyan-800/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-cyan-400" /> Remote Pipeline Webhook Dispatcher
                </h4>
                <p className="text-xs text-slate-400">
                  Directly dispatch all {script.scenes.length} scene prompts and timing parameters to your remote GPU runner or automation workflow.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setWebhookMode('json')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${
                    webhookMode === 'json' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  JSON Payload
                </button>
                <button
                  onClick={() => setWebhookMode('curl')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${
                    webhookMode === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  cURL Command
                </button>
              </div>
            </div>

            {/* URL Input & Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Target Webhook Endpoint URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="http://127.0.0.1:8188/prompt or https://your-server.com/webhook"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={() => handleDispatchWebhook(false)}
                  disabled={isDispatching}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  {isDispatching ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4 text-amber-300" />
                      <span>Post to Webhook</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDispatchWebhook(true)}
                  disabled={isDispatching}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
                  title="Simulate dispatch without sending HTTP request to bypass local CORS limits"
                >
                  Simulate Webhook
                </button>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
                <span>Presets:</span>
                <button
                  onClick={() => setWebhookUrl('http://127.0.0.1:8188/prompt')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-mono text-cyan-400 border border-slate-700"
                >
                  ComfyUI Local API (/prompt)
                </button>
                <button
                  onClick={() => setWebhookUrl('http://127.0.0.1:8000/api/v1/generate-batch')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-mono text-indigo-400 border border-slate-700"
                >
                  FastAPI Batch Runner
                </button>
                <button
                  onClick={() => setWebhookUrl('https://hooks.n8n.cloud/webhook/ai-video-gen')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-mono text-emerald-400 border border-slate-700"
                >
                  n8n Automation Hook
                </button>
              </div>
            </div>

            {/* Dispatch Result Feedback Box */}
            {dispatchResult && (
              <div className={`p-3.5 rounded-lg border text-xs font-mono space-y-2 ${
                dispatchResult.success
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                  : 'bg-red-950/70 border-red-700 text-red-200'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold flex items-center gap-1.5">
                    {dispatchResult.success ? (
                      <CheckIcon className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-red-400" />
                    )}
                    Response: {dispatchResult.statusText}
                  </span>
                  <span className="text-[10px] text-slate-400">{dispatchResult.timestamp}</span>
                </div>
                <pre className="p-2 bg-slate-950/90 rounded border border-slate-800 overflow-x-auto max-h-36 text-[11px] leading-relaxed whitespace-pre text-slate-300">
                  {dispatchResult.responseBody}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* NLE Timeline Frame Rate Settings */}
        {selectedFormat !== 'txt' && selectedFormat !== 'webhook' && (
          <div className="mb-6 p-4 bg-slate-900/80 rounded-lg border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-300">Timeline Frame Rate (FPS)</span>
              <p className="text-[11px] text-slate-400">Match this to your NLE timeline settings for precise timecode sync.</p>
            </div>
            <select
              value={fps}
              onChange={e => setFps(parseFloat(e.target.value))}
              className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm text-cyan-300 font-mono font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value={24}>24 fps (Cinema Film)</option>
              <option value={25}>25 fps (PAL Video)</option>
              <option value={29.97}>29.97 fps (NTSC Drop)</option>
              <option value={30}>30 fps (HD Digital)</option>
              <option value={60}>60 fps (High Motion)</option>
            </select>
          </div>
        )}

        {/* Export Code Preview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              File Preview ({extension}): <span className="text-cyan-400 font-mono">{filename}</span>
            </span>
            <button
              onClick={handleCopyClipboard}
              className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-green-400" /> Copied
                </>
              ) : (
                'Copy Raw Code'
              )}
            </button>
          </div>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto max-h-48 whitespace-pre leading-relaxed select-all">
            {content.slice(0, 1500)}
            {content.length > 1500 ? '\n... [Remaining content omitted in preview]' : ''}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
          >
            <DownloadIcon className="w-4 h-4" />
            Download {label}
          </button>
        </div>
      </div>
    </div>
  );
};
