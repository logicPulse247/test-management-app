import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

export function PageContainer({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn(' w-full max-w-[1200px] px-6 py-6', className)}>
      {children}
    </div>
  );
}

