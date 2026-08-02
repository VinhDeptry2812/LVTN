import React from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface UploadProgress {
  total: number;
  completed: number;
  failed?: number;
  percent: number;
  currentFileName?: string;
  isError?: boolean;
}

interface UploadProgressWidgetProps {
  progress: UploadProgress | null;
  positionClass?: string;
}

export default function UploadProgressWidget({
  progress,
  positionClass = 'top-20 right-6',
}: UploadProgressWidgetProps) {
  if (!progress) return null;

  const hasFailed = (progress.failed || 0) > 0 || progress.isError;
  const isFinished = progress.completed >= progress.total;

  return (
    <div className={`fixed ${positionClass} bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl p-4 w-80 z-50 rounded-none animate-slide-up space-y-2.5 transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasFailed ? (
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
          ) : isFinished ? (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          ) : (
            <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />
          )}
          <span className={`text-xs font-bold ${hasFailed ? 'text-rose-600' : 'text-slate-800'}`}>
            {hasFailed
              ? `Tải lên có lỗi (${progress.failed || 1}/${progress.total} thất bại)`
              : isFinished
              ? `Tải lên thành công (${progress.completed}/${progress.total})`
              : `Đang tải ảnh (${progress.completed}/${progress.total})`}
          </span>
        </div>
        <span className={`text-xs font-mono font-bold ${hasFailed ? 'text-rose-600' : 'text-blue-600'}`}>
          {progress.percent}%
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            hasFailed
              ? 'bg-gradient-to-r from-rose-500 to-red-600'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {progress.currentFileName && (
        <p className="text-[10px] text-slate-400 font-mono truncate">
          {hasFailed ? 'Lỗi tại file:' : 'Đang xử lý:'} {progress.currentFileName}
        </p>
      )}
    </div>
  );
}
