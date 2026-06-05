import { useGlobalLoadingStore } from '@/store/globalLoading.store';

export function GlobalLoader() {
  const showOverlay = useGlobalLoadingStore((s) => s.showOverlay);

  if (!showOverlay) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111827]/10 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="size-11 animate-spin rounded-full border-[3px] border-[#E5E7EB] border-t-[#5B7FFF] motion-reduce:animate-none"
          aria-hidden
        />
        <p className="text-[12px] font-medium text-[#6B7280]">Loading...</p>
      </div>
    </div>
  );
}
