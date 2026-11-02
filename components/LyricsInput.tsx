import React from 'react';
import { SparklesIcon, UploadIcon, AudioWaveIcon, XCircleIcon } from './icons/Icons';
import { MoodPreset } from '../types';

interface LyricsInputProps {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  songLength: { minutes: string; seconds: string };
  setSongLength: (length: { minutes: string; seconds: string }) => void;
  selectedMood: MoodPreset;
  setSelectedMood: (mood: MoodPreset) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const visualStyles: MoodPreset[] = [
    'Cinematic', 'Abstract', 'Documentary', 'High Energy', 'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Folk/Acoustic',
    'Romantic', 'Melancholic', 'Psychedelic', 'Film Noir', 'Vaporwave', 'Anime', 'Wes Anderson', 'Minimalist', 'Gothic', 'Surrealist',
    'Horror', 'Thriller', 'Cyberpunk', 'Steampunk'
];

const StyleButton: React.FC<{
  preset: MoodPreset;
  selectedMood: MoodPreset;
  onClick: (mood: MoodPreset) => void;
  disabled: boolean;
}> = ({ preset, selectedMood, onClick, disabled }) => (
  <button
    key={preset}
    type="button"
    role="radio"
    aria-checked={selectedMood === preset}
    onClick={() => onClick(preset)}
    disabled={disabled}
    className={`w-full px-4 py-2.5 text-sm font-semibold text-center rounded-lg transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500
      ${selectedMood === preset
        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
      }
      disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {preset}
  </button>
);


const LyricsInput: React.FC<LyricsInputProps> = ({ 
  lyrics, setLyrics, audioFile, setAudioFile, songLength, setSongLength, 
  selectedMood, setSelectedMood, onSubmit, isLoading 
}) => {
  const handleTimeChange = (part: 'minutes' | 'seconds', value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 2);
    setSongLength({ ...songLength, [part]: sanitizedValue });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAudioFile(file);

      // Create an audio object to read metadata
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src); // Clean up
        const duration = audio.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        setSongLength({
          minutes: String(minutes).padStart(2, '0'),
          seconds: String(seconds).padStart(2, '0')
        });
      };
      
      audio.onerror = () => {
          console.error("Error loading audio file metadata.");
          // Optionally, you could set an error state here to inform the user
      };
      
      audio.src = window.URL.createObjectURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
         <div>
            <h2 className="text-lg font-semibold text-slate-300">
                Provide Your Song
            </h2>
             <p className="text-sm text-slate-400 mt-1">Upload an audio file and/or provide lyrics below.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <label htmlFor="minutes" className="text-sm font-medium text-slate-400 whitespace-nowrap">Song Length:</label>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    id="minutes"
                    name="minutes"
                    value={songLength.minutes}
                    onChange={(e) => handleTimeChange('minutes', e.target.value)}
                    onBlur={(e) => setSongLength({...songLength, minutes: e.target.value.padStart(2, '0')})}
                    disabled={isLoading || !!audioFile}
                    className="w-14 bg-slate-900 border border-slate-600 rounded-md text-slate-200 text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-1.5 px-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="MM"
                    aria-label="Song length in minutes"
                    min="0"
                    max="99"
                />
                <span className="text-slate-400 font-bold">:</span>
                <input
                    type="number"
                    id="seconds"
                    name="seconds"
                    value={songLength.seconds}
                    onChange={(e) => handleTimeChange('seconds', e.target.value)}
                    onBlur={(e) => setSongLength({...songLength, seconds: e.target.value.padStart(2, '0')})}
                    disabled={isLoading || !!audioFile}
                    className="w-14 bg-slate-900 border border-slate-600 rounded-md text-slate-200 text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-1.5 px-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="SS"
                    aria-label="Song length in seconds"
                    min="0"
                    max="59"
                />
            </div>
        </div>
      </div>

      <div>
        {!audioFile ? (
          <>
            <input 
              type="file" 
              id="audio-upload" 
              className="hidden" 
              onChange={handleFileChange} 
              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/flac,audio/aac" 
              disabled={isLoading}
            />
            <label 
              htmlFor="audio-upload"
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 border-2 border-dashed border-slate-600 text-slate-300
                ${isLoading 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer hover:bg-slate-700/50 hover:border-indigo-500 hover:text-white'
                }`
              }
            >
              <UploadIcon className="w-5 h-5"/>
              Upload Song File (MP3, WAV, etc.)
            </label>
          </>
        ) : (
          <div className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-slate-900/80 border-2 border-indigo-500 text-slate-200">
            <div className="flex items-center gap-2 overflow-hidden">
                <AudioWaveIcon className="w-5 h-5 text-indigo-400 flex-shrink-0"/>
                <span className="truncate" title={audioFile.name}>{audioFile.name}</span>
            </div>
            <button 
              onClick={() => setAudioFile(null)} 
              disabled={isLoading}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
              aria-label="Remove audio file"
            >
                <XCircleIcon className="w-5 h-5"/>
            </button>
          </div>
        )}
      </div>
      
      <textarea
        id="lyrics"
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        placeholder={
            audioFile 
              ? "Optional: Paste lyrics here to guide the AI, or leave blank to transcribe from audio." 
              : `e.g.,\n\n[Verse 1]\nHello from the other side\nI must've called a thousand times\n\n[Chorus]\nTo tell you I'm sorry...\n\n[Instrumental]\n...\n`
          }
        className="w-full h-48 p-4 bg-slate-900 border border-slate-600 rounded-md resize-y text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-40 disabled:bg-slate-800"
        disabled={isLoading}
        aria-label="Song lyrics input"
      />

      <fieldset>
        <legend className="text-lg font-semibold text-slate-300 mb-3">Choose a Visual Style</legend>
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visualStyles.map((preset) => (
              <StyleButton
                key={preset}
                preset={preset}
                selectedMood={selectedMood}
                onClick={setSelectedMood}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>
      </fieldset>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:bg-indigo-900 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 group mt-2"
      >
        <SparklesIcon className="w-5 h-5 mr-2 -ml-1 transition-transform duration-300 group-hover:rotate-12" />
        {isLoading ? 'Composing...' : 'Create VEO Script'}
      </button>
    </div>
  );
};

export default LyricsInput;