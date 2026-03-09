export default function LoadingSpinner({ size = 'md' }) {
  const sz = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size] ?? 'h-8 w-8';
  return (
    <div className="flex justify-center items-center p-8">
      <div className={`${sz} border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin`} />
    </div>
  );
}
