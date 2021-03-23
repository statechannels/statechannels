export function injectOriginToBlankPostMessages(window: Window, origin: string): void {
  // workaround for https://github.com/jsdom/jsdom/issues/2745
  // if no origin exists, replace with the wallet url
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin === '') {
      event.stopImmediatePropagation();
      const eventWithOrigin: MessageEvent = new MessageEvent('message', {
        data: event.data,
        origin
      });
      window.dispatchEvent(eventWithOrigin);
    }
  });
}
