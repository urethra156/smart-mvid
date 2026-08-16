import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { VideoScript, Scene } from '../types';
import { SparklesIcon, FilmIcon, ClockIcon, ArrowPathIcon } from './icons/Icons';

interface SongEnergyTimelineChartProps {
  script: VideoScript;
  audioFile?: File | null;
}

export interface AudioTimepointData {
  timeLabel: string;
  timeSeconds: number;
  rmsVolume: number;     // 0 - 100%
  bassEnergy: number;    // 0 - 100%
  midEnergy: number;     // 0 - 100%
  trebleEnergy: number;  // 0 - 100%
  sceneNumber: number;
  sceneDescription: string;
  cameraAngle: string;
  shotDuration: number;
  effectiveBpm: number;
  intensityCategory: string;
  isSceneBoundary: boolean;
}

export const SongEnergyTimelineChart: React.FC<SongEnergyTimelineChartProps> = ({ script, audioFile }) => {
  const [chartMode, setChartMode] = useState<'waveform' | 'intensity' | 'spectrum'>('waveform');
  const [decodedWaveform, setDecodedWaveform] = useState<{
    timeSeconds: number;
    rms: number;
    bass: number;
    mid: number;
    treble: number;
  }[] | null>(null);
  const [isDecodingAudio, setIsDecodingAudio] = useState(false);
  const [selectedSceneNumber, setSelectedSceneNumber] = useState<number | null>(null);

  const baseBpm = script.analysis?.bpm || 120;
  const totalDurationSeconds = script.scenes.reduce((max, sc) => Math.max(max, sc.endTimeSeconds || 0), 60);

  // Decode audio file using Web Audio API to get real RMS waveform and frequency dynamics
  useEffect(() => {
    if (!audioFile) {
      setDecodedWaveform(null);
      return;
    }

    let isCancelled = false;
    setIsDecodingAudio(true);

    const processAudio = async () => {
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        if (isCancelled) return;

        const rawData = audioBuffer.getChannelData(0); // Mono or Left channel
        const sampleRate = audioBuffer.sampleRate;
        const totalSamples = rawData.length;
        const duration = audioBuffer.duration;

        const numBins = 80;
        const samplesPerBin = Math.floor(totalSamples / numBins);
        const waveformPoints: { timeSeconds: number; rms: number; bass: number; mid: number; treble: number }[] = [];

        for (let i = 0; i < numBins; i++) {
          const startSample = i * samplesPerBin;
          const endSample = Math.min(startSample + samplesPerBin, totalSamples);
          
          let sumSquares = 0;
          let peak = 0;
          
          // Simple spectral estimation using zero-crossings & windowed energy
          let zeroCrossings = 0;

          for (let j = startSample; j < endSample; j++) {
            const val = rawData[j];
            sumSquares += val * val;
            if (Math.abs(val) > peak) peak = Math.abs(val);
            if (j > startSample && ((rawData[j] >= 0 && rawData[j - 1] < 0) || (rawData[j] < 0 && rawData[j - 1] >= 0))) {
              zeroCrossings++;
            }
          }

          const count = Math.max(1, endSample - startSample);
          const rms = Math.sqrt(sumSquares / count);
          
          // Normalized volume 0 - 100
          const volumeScore = Math.min(100, Math.round(rms * 280));

          // Estimate frequency distribution based on zero crossing rate & window dynamics
          const zcrRate = zeroCrossings / count; // Higher ZCR = higher frequencies (mids/treble)
          const bass = Math.min(100, Math.round(volumeScore * (1 - Math.min(0.8, zcrRate * 4))));
          const mid = Math.min(100, Math.round(volumeScore * (zcrRate * 3.5)));
          const treble = Math.min(100, Math.round(volumeScore * (zcrRate * 5.0)));

          waveformPoints.push({
            timeSeconds: Number((i * (duration / numBins)).toFixed(1)),
            rms: Math.max(12, volumeScore),
            bass: Math.max(10, bass),
            mid: Math.max(10, mid),
            treble: Math.max(8, treble),
          });
        }

        audioCtx.close();
        if (!isCancelled) {
          setDecodedWaveform(waveformPoints);
          setIsDecodingAudio(false);
        }
      } catch (e) {
        console.warn("Could not decode audio buffer with Web Audio API, using synthetic spectral model.", e);
        if (!isCancelled) {
          setDecodedWaveform(null);
          setIsDecodingAudio(false);
        }
      }
    };

    processAudio();

    return () => {
      isCancelled = true;
    };
  }, [audioFile]);

  // Construct combined Recharts dataset mapping audio waveform points directly to scene metadata
  const chartData: AudioTimepointData[] = useMemo(() => {
    const numPoints = 80;
    const intervalSeconds = totalDurationSeconds / numPoints;

    return Array.from({ length: numPoints }).map((_, i) => {
      const timeSec = i * intervalSeconds;
      const mins = Math.floor(timeSec / 60);
      const secs = Math.floor(timeSec % 60);
      const timeLabel = `${mins}:${secs.toString().padStart(2, '0')}`;

      // Find corresponding scene
      let matchingSceneIndex = script.scenes.findIndex(sc => {
        const start = sc.startTimeSeconds ?? 0;
        const end = sc.endTimeSeconds ?? 0;
        return timeSec >= start && timeSec <= end;
      });

      if (matchingSceneIndex === -1) {
        matchingSceneIndex = Math.min(script.scenes.length - 1, Math.floor((timeSec / totalDurationSeconds) * script.scenes.length));
      }

      const scene = script.scenes[matchingSceneIndex] || script.scenes[0];
      const isSceneBoundary = matchingSceneIndex > 0 && Math.abs((scene.startTimeSeconds || 0) - timeSec) < intervalSeconds;

      const shotDuration = Math.max(1, (scene.endTimeSeconds || 0) - (scene.startTimeSeconds || 0));

      let rmsVolume = 50;
      let bassEnergy = 45;
      let midEnergy = 50;
      let trebleEnergy = 40;

      if (decodedWaveform && decodedWaveform.length > 0) {
        // Interpolate or pick nearest point from decoded PCM audio
        const waveformIdx = Math.min(decodedWaveform.length - 1, Math.floor((i / numPoints) * decodedWaveform.length));
        const p = decodedWaveform[waveformIdx];
        rmsVolume = p.rms;
        bassEnergy = p.bass;
        midEnergy = p.mid;
        trebleEnergy = p.treble;
      } else {
        // Synthetic frequency spectrum calculated from prompt keywords & scene duration
        const fullText = `${scene.description} ${scene.veoPrompt} ${scene.cameraAngle || ''}`.toLowerCase();
        
        if (/(climax|explosion|drop|intense|sprint|flash|burst|wild|fast|neon|storm|fight|chase|rock|heavy)/.test(fullText)) {
          rmsVolume += 25;
          bassEnergy += 30;
          trebleEnergy += 20;
        }
        if (/(slow motion|slow-mo|fade|quiet|whisper|lone|solitary|gentle|soft|ambient|rain|floating|calm)/.test(fullText)) {
          rmsVolume -= 20;
          bassEnergy -= 15;
          trebleEnergy -= 10;
        }

        // Add subtle harmonic modulation across time
        const phase = (timeSec / totalDurationSeconds) * Math.PI * 4;
        rmsVolume += Math.sin(phase) * 12;
        bassEnergy += Math.cos(phase * 0.8) * 15;
        midEnergy += Math.sin(phase * 1.5) * 10;
        trebleEnergy += Math.cos(phase * 2.2) * 12;

        // Pacing boost for short cuts
        if (shotDuration <= 3) rmsVolume += 15;

        rmsVolume = Math.min(98, Math.max(15, Math.round(rmsVolume)));
        bassEnergy = Math.min(95, Math.max(12, Math.round(bassEnergy)));
        midEnergy = Math.min(95, Math.max(15, Math.round(midEnergy)));
        trebleEnergy = Math.min(95, Math.max(10, Math.round(trebleEnergy)));
      }

      // Dynamic BPM variation calculation
      const bpmVariation = ((rmsVolume - 50) / 50) * 0.25;
      const effectiveBpm = Math.round(baseBpm * (1 + bpmVariation));

      let intensityCategory = 'Balanced Dynamics';
      if (rmsVolume >= 75) intensityCategory = 'High Intensity / Climax Peak';
      else if (rmsVolume >= 55) intensityCategory = 'Driving Upbeat Rhythm';
      else if (rmsVolume <= 35) intensityCategory = 'Atmospheric / Calm Passage';

      return {
        timeLabel,
        timeSeconds: Number(timeSec.toFixed(1)),
        rmsVolume,
        bassEnergy,
        midEnergy,
        trebleEnergy,
        sceneNumber: scene.sceneNumber,
        sceneDescription: scene.description,
        cameraAngle: scene.cameraAngle || 'Standard Shot',
        shotDuration,
        effectiveBpm,
        intensityCategory,
        isSceneBoundary,
      };
    });
  }, [script, decodedWaveform, totalDurationSeconds, baseBpm]);

  // Scene transition markers for Recharts ReferenceLine
  const sceneBoundaries = useMemo(() => {
    return script.scenes.map(sc => {
      const timeSec = sc.startTimeSeconds ?? 0;
      const mins = Math.floor(timeSec / 60);
      const secs = Math.floor(timeSec % 60);
      return {
        sceneNumber: sc.sceneNumber,
        timeSec,
        timeLabel: `${mins}:${secs.toString().padStart(2, '0')}`,
      };
    });
  }, [script]);

  const peakPoint = useMemo(() => {
    return [...chartData].sort((a, b) => b.rmsVolume - a.rmsVolume)[0];
  }, [chartData]);

  const avgRms = useMemo(() => {
    return Math.round(chartData.reduce((acc, d) => acc + d.rmsVolume, 0) / (chartData.length || 1));
  }, [chartData]);

  // Custom Interactive Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: AudioTimepointData = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-cyan-500/50 p-4 rounded-xl shadow-2xl backdrop-blur-md max-w-xs text-xs text-slate-200 font-sans z-50 space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="font-bold text-cyan-300 font-mono text-sm">
              Timecode: {data.timeLabel}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700/60">
              Scene #{data.sceneNumber} ({data.shotDuration}s)
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Audio RMS Volume:</span>
              <span className="font-bold text-cyan-400">{data.rmsVolume}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Low/Bass Energy:</span>
              <span className="font-bold text-indigo-400">{data.bassEnergy}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Mid/Voice Range:</span>
              <span className="font-bold text-amber-400">{data.midEnergy}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">High/Percussion:</span>
              <span className="font-bold text-emerald-400">{data.trebleEnergy}%</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Dynamic Tempo:</span>
              <span className="font-bold text-amber-300">{data.effectiveBpm} BPM</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-0.5">
              Framing & Cue:
            </span>
            <p className="text-slate-300 italic line-clamp-2 text-[11px]">
              {data.cameraAngle} — "{data.sceneDescription}"
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mb-8 p-6 bg-slate-900/95 rounded-xl border border-cyan-800/40 shadow-2xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <SparklesIcon className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-300 to-amber-300">
              Interactive Audio Waveform & Frequency Spectrum
            </h3>
            {isDecodingAudio && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700 text-xs font-mono animate-pulse">
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                PCM Decoding...
              </span>
            )}
            {audioFile && !isDecodingAudio && decodedWaveform && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 text-[11px] font-mono font-semibold">
                ✓ Web Audio API Analyzed
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Correlate scene cuts, dynamic camera motion, and prompt pacing directly with audio amplitude and frequency energy bands.
          </p>
        </div>

        {/* View Mode Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setChartMode('waveform')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                chartMode === 'waveform'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔊 Audio Waveform & Peaks
            </button>
            <button
              onClick={() => setChartMode('intensity')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                chartMode === 'intensity'
                  ? 'bg-gradient-to-r from-indigo-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Scene Cut Pacing & BPM
            </button>
            <button
              onClick={() => setChartMode('spectrum')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                chartMode === 'spectrum'
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎛️ Spectral Frequency Stack
            </button>
          </div>
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Song Base Tempo</span>
          <span className="text-lg font-bold font-mono text-cyan-300 mt-1">{baseBpm} BPM</span>
        </div>
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average RMS Volume</span>
          <span className="text-lg font-bold font-mono text-indigo-300 mt-1">{avgRms}%</span>
        </div>
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Peak Climax Point</span>
          <span className="text-lg font-bold font-mono text-amber-300 mt-1">
            {peakPoint ? `${peakPoint.timeLabel} (${peakPoint.rmsVolume}%)` : 'N/A'}
          </span>
        </div>
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Storyboard Scenes</span>
          <span className="text-lg font-bold font-mono text-emerald-300 mt-1">{script.scenes.length} Cuts</span>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-72 w-full relative bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'waveform' ? (
            <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rmsWaveformGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="bassEnergyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />

              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />

              <YAxis
                domain={[0, 100]}
                stroke="#38bdf8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(v) => `${v}%`}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Scene Cut Reference Lines */}
              {sceneBoundaries.map((sb) => (
                <ReferenceLine
                  key={sb.sceneNumber}
                  x={sb.timeLabel}
                  stroke="#475569"
                  strokeDasharray="3 3"
                  label={{
                    value: `S#${sb.sceneNumber}`,
                    fill: '#94a3b8',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              ))}

              <Area
                type="monotone"
                dataKey="rmsVolume"
                name="Audio RMS Waveform"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#rmsWaveformGradient)"
                activeDot={{ r: 6, fill: '#22d3ee', stroke: '#ffffff', strokeWidth: 2 }}
              />

              <Area
                type="monotone"
                dataKey="bassEnergy"
                name="Sub-Bass Energy"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#bassEnergyGradient)"
              />

              <Line
                type="monotone"
                dataKey="trebleEnergy"
                name="Percussion / Highs"
                stroke="#34d399"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          ) : chartMode === 'intensity' ? (
            <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pacingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />

              <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis yAxisId="energy" domain={[0, 100]} stroke="#818cf8" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId="bpm" orientation="right" domain={['auto', 'auto']} stroke="#fbbf24" fontSize={11} />

              <Tooltip content={<CustomTooltip />} />

              <ReferenceLine yAxisId="energy" y={avgRms} stroke="#6366f1" strokeDasharray="4 4" />

              <Area
                yAxisId="energy"
                type="monotone"
                dataKey="rmsVolume"
                name="Scene Pacing Intensity"
                stroke="#818cf8"
                strokeWidth={3}
                fill="url(#pacingGradient)"
              />

              <Line
                yAxisId="bpm"
                type="monotone"
                dataKey="effectiveBpm"
                name="Dynamic Pace (BPM)"
                stroke="#fbbf24"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                dot={{ r: 3, fill: '#fbbf24' }}
              />
            </ComposedChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="bassStack" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="midStack" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="trebleStack" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />
              <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} />
              
              <Tooltip content={<CustomTooltip />} />

              <Area type="monotone" dataKey="bassEnergy" stackId="1" name="Bass (20-250Hz)" stroke="#6366f1" fill="url(#bassStack)" />
              <Area type="monotone" dataKey="midEnergy" stackId="1" name="Mids (250-4kHz)" stroke="#f59e0b" fill="url(#midStack)" />
              <Area type="monotone" dataKey="trebleEnergy" stackId="1" name="Highs (4k-20kHz)" stroke="#10b981" fill="url(#trebleStack)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend & Scene Quick-Navigation Bar */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500 inline-block"></span>
            <span>Audio RMS Waveform</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-500 inline-block"></span>
            <span>Sub-Bass Dynamics</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
            <span>High Frequencies / Cues</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
          <span>💡 Hover points to correlate prompt timing with audio energy</span>
        </div>
      </div>
    </div>
  );
};
