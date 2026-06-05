import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQuestionImageSrc } from '@/lib/questionImageAttachment';
import type { QuestionImageAttachment } from '@/types/questionImage.types';

type QuestionImageDisplayProps = {
  image?: QuestionImageAttachment | null;
  editable?: boolean;
  onReplace?: () => void;
  onRemove?: () => void;
};

export function QuestionImageDisplay({
  image,
  editable = false,
  onReplace,
  onRemove,
}: QuestionImageDisplayProps) {
  const src = getQuestionImageSrc(image);
  if (!src) return null;

  return (
    <div className="mt-3">
      <img
        src={src}
        alt={image?.imageName?.trim() || 'Question image'}
        className="max-h-64 max-w-full rounded-md border border-[#E5E7EB] object-contain"
      />
      {editable ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onReplace}
          >
            <ImageIcon className="mr-1 size-3.5" />
            Replace image
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[#EF4444] hover:text-[#DC2626]"
            onClick={onRemove}
          >
            <Trash2 className="mr-1 size-3.5" />
            Remove image
          </Button>
          {image?.imageName ? (
            <span className="text-[11px] text-[#6B7280]">{image.imageName}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
