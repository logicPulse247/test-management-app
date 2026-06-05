import { Calendar, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LiveUntil, PublishMode } from '@/store/testCreation.store';

const LIVE_UNTIL_OPTIONS: { value: LiveUntil; label: string }[] = [
  // Ordered to match Figma two-column layout (row-wise in a 2-col grid)
  { value: 'always-available', label: 'Always Available' },
  { value: 'three-weeks', label: '3 Weeks' },
  { value: 'one-week', label: '1 Week' },
  { value: 'one-month', label: '1 Month' },
  { value: 'two-weeks', label: '2 Weeks' },
  { value: 'custom-duration', label: 'Custom Duration' },
];

type PublishTabMode = 'publishNow' | 'schedulePublish';

function mapStoreModeToTabMode(mode: PublishMode): PublishTabMode {
  return mode === 'schedule-publish' ? 'schedulePublish' : 'publishNow';
}

function mapTabModeToStoreMode(mode: PublishTabMode): PublishMode {
  return mode === 'schedulePublish' ? 'schedule-publish' : 'publish-now';
}

type PreviewPublishControlsProps = {
  publishMode: PublishMode;
  liveUntil: LiveUntil;
  scheduleDate: string;
  scheduleTime: string;
  customEndDate: string;
  customEndTime: string;
  isPublishing: boolean;
  onPublishModeChange: (mode: PublishMode) => void;
  onLiveUntilChange: (value: LiveUntil) => void;
  onScheduleDateChange: (value: string) => void;
  onScheduleTimeChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  onCustomEndTimeChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PreviewPublishControls({
  publishMode: storePublishMode,
  liveUntil,
  scheduleDate,
  scheduleTime,
  customEndDate,
  customEndTime,
  isPublishing,
  onPublishModeChange,
  onLiveUntilChange,
  onScheduleDateChange,
  onScheduleTimeChange,
  onCustomEndDateChange,
  onCustomEndTimeChange,
  onCancel,
  onConfirm,
}: PreviewPublishControlsProps) {
  const [publishMode, setPublishMode] = useState<PublishTabMode>(
    mapStoreModeToTabMode(storePublishMode),
  );

  useEffect(() => {
    setPublishMode(mapStoreModeToTabMode(storePublishMode));
  }, [storePublishMode]);

  const isScheduleMode = publishMode === 'schedulePublish';
  const isCustomDuration = liveUntil === 'custom-duration';

  const confirmDisabledReason = useMemo(() => {
    if (isPublishing) return 'Publishing in progress';
    if (isScheduleMode && (!scheduleDate || !scheduleTime)) {
      return 'Schedule date and time required';
    }
    if (isCustomDuration && (!customEndDate || !customEndTime)) {
      return 'End date and time required';
    }
    return null;
  }, [
    customEndDate,
    customEndTime,
    isCustomDuration,
    isPublishing,
    isScheduleMode,
    scheduleDate,
    scheduleTime,
  ]);

  const isConfirmDisabled = Boolean(confirmDisabledReason);

  return (
    <div className="mt-6 space-y-6">
      <div>
        <div className="inline-flex rounded-lg bg-[#F3F4F6] p-1">
          <button
            type="button"
            className={cn(
              'rounded-md px-4 py-2 text-[13px] font-semibold transition',
              publishMode === 'publishNow'
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#6B7280] hover:text-[#374151]',
            )}
            onClick={() => {
              setPublishMode('publishNow');
              onPublishModeChange(mapTabModeToStoreMode('publishNow'));
            }}
          >
            Publish Now
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-4 py-2 text-[13px] font-semibold transition',
              publishMode === 'schedulePublish'
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#6B7280] hover:text-[#374151]',
            )}
            onClick={() => {
              setPublishMode('schedulePublish');
              onPublishModeChange(mapTabModeToStoreMode('schedulePublish'));
            }}
          >
            Schedule Publish
          </button>
        </div>
      </div>

      {isScheduleMode ? (
        <div>
          <div className="text-[13px] font-semibold text-[#111827]">
            Select Date and Time
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                Schedule Date
              </div>
              <div className="relative">
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => onScheduleDateChange(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                Schedule Time
              </div>
              <div className="relative">
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => onScheduleTimeChange(e.target.value)}
                  className="pr-10"
                />
                <Clock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <div className="text-[13px] font-semibold text-[#111827]">Live Until</div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LIVE_UNTIL_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 text-[12px] text-[#374151]"
            >
              <input
                type="radio"
                name="live-until"
                value={opt.value}
                checked={liveUntil === opt.value}
                onChange={() => onLiveUntilChange(opt.value)}
                className="size-4 accent-[#5B7CFA]"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {isCustomDuration ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                End Date
              </div>
              <div className="relative">
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => onCustomEndDateChange(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                End Time
              </div>
              <div className="relative">
                <Input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => onCustomEndTimeChange(e.target.value)}
                  className="pr-10"
                />
                <Clock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-3 border-t border-[#E5E7EB] pt-5">
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          disabled={isConfirmDisabled}
          title={confirmDisabledReason ?? undefined}
          onClick={() => {
            if (isConfirmDisabled) return;
            onConfirm();
          }}
        >
          {isPublishing ? 'Publishing…' : 'Confirm'}
        </Button>
      </div>
    </div>
  );
}
