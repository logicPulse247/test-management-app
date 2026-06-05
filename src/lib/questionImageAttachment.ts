import type { QuestionImageAttachment } from '@/types/questionImage.types';

export const QUESTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

export const QUESTION_IMAGE_ACCEPT =
  'image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp';

export function validateQuestionImageFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeOk =
    ALLOWED_MIME_TYPES.has(file.type) ||
    (file.type === '' && ALLOWED_EXTENSIONS.has(ext));
  if (!mimeOk) {
    return 'Image must be PNG, JPG, JPEG, or WebP.';
  }
  if (file.size > QUESTION_IMAGE_MAX_BYTES) {
    return 'Image must be 5MB or smaller.';
  }
  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export async function fileToQuestionImage(
  file: File,
): Promise<QuestionImageAttachment> {
  const validationError = validateQuestionImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const comma = dataUrl.indexOf(',');
  const imageData = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const imageType =
    file.type ||
    (file.name.toLowerCase().endsWith('.png')
      ? 'image/png'
      : file.name.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg');

  return {
    imageName: file.name,
    imageType,
    imageSize: file.size,
    imageData,
  };
}

export function getQuestionImageSrc(
  image: QuestionImageAttachment | undefined | null,
): string | null {
  if (!image?.imageData?.trim()) return null;
  const type = image.imageType?.trim() || 'image/png';
  return `data:${type};base64,${image.imageData}`;
}
