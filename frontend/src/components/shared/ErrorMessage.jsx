import { AlertCircle } from 'lucide-react';

export default function ErrorMessage({ message }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
      <AlertCircle size={16} className="shrink-0" />
      <span className="text-sm">{message ?? 'Something went wrong'}</span>
    </div>
  );
}
