import React from 'react';
import { ExclamationTriangleIcon, XCircleIcon } from './icons/Icons';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-950/80 border border-red-700/60 text-red-400 rounded-xl">
              <ExclamationTriangleIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Reset & Start New Script?
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Clear all current progress and data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 text-sm text-slate-300 leading-relaxed">
          Are you sure you want to start a new music video script? This will clear your current storyboard, scene breakdowns, prompt customizations, and cached timeline data.
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 border border-red-500 transition-all flex items-center justify-center gap-2"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>Yes, Reset Everything</span>
          </button>
        </div>
      </div>
    </div>
  );
};
