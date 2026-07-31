import React from 'react';

interface TableLoaderProps {
  message?: string;
  minHeightClass?: string;
}

export const TableLoader: React.FC<TableLoaderProps> = ({
  message = 'Đang tải dữ liệu...',
  minHeightClass = 'py-20',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${minHeightClass} gap-3`}>
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-slate-400 font-medium">{message}</p>
    </div>
  );
};

export default TableLoader;
