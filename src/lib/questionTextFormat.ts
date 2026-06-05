export type QuestionTextFormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'unordered-list'
  | 'ordered-list';

type FormatResult = {
  nextValue: string;
  selectionStart: number;
  selectionEnd: number;
};

function wrapInline(tag: string, selected: string): string {
  return selected ? `<${tag}>${selected}</${tag}>` : `<${tag}></${tag}>`;
}

function wrapList(tag: 'ul' | 'ol', selected: string): string {
  if (!selected.trim()) {
    return `<${tag}><li></li></${tag}>`;
  }
  const items = selected
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<li>${line}</li>`)
    .join('');
  return `<${tag}>${items}</${tag}>`;
}

/** Apply HTML formatting to a plain textarea selection (stored in questionHtml). */
export function applyFormatToQuestionText(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: QuestionTextFormatAction,
): FormatResult {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const selected = value.slice(start, end);

  let insert = '';
  switch (action) {
    case 'bold':
      insert = wrapInline('b', selected);
      break;
    case 'italic':
      insert = wrapInline('i', selected);
      break;
    case 'underline':
      insert = wrapInline('u', selected);
      break;
    case 'unordered-list':
      insert = wrapList('ul', selected);
      break;
    case 'ordered-list':
      insert = wrapList('ol', selected);
      break;
    default:
      return { nextValue: value, selectionStart: start, selectionEnd: end };
  }

  const nextValue = value.slice(0, start) + insert + value.slice(end);
  const cursorStart = selected
    ? start + insert.length
    : start + insert.indexOf('>') + 1;
  const cursorEnd = selected ? cursorStart : cursorStart;

  return {
    nextValue,
    selectionStart: cursorStart,
    selectionEnd: cursorEnd,
  };
}
