export const clipboardCopy = (text: string) => {
  const span = document.createElement('span');
  span.textContent = text;

  document.body.appendChild(span);

  const selection = window.getSelection();
  const range = window.document.createRange();
  if (selection) {
    selection.removeAllRanges();
    range.selectNode(span);
    selection.addRange(range);
  }
  let success = false;
  try {
    success = window.document.execCommand('copy');
  } catch (err) {
    console.error('error', err);
  }
  if (selection) {
    selection.removeAllRanges();
  }
  window.document.body.removeChild(span);

  return success
    ? Promise.resolve()
    : Promise.reject(new DOMException('The request is not allowed', 'NotAllowedError'));
};
