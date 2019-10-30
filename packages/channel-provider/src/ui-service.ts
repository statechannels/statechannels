import debug from 'debug';

const log = debug('channel-provider:ui');

export enum UIElementNames {
  Styles = 'channelProviderUiStyles',
  Container = 'channelProviderUiContainer',
  IFrame = 'channelProviderUi'
}

export const cssStyles = `iframe#${UIElementNames.IFrame} {
  border: 0;
  position: absolute;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: 700px;
  height: 500px;
  top: 50%;
  margin-top: -250px;
  overflow: hidden;
  z-index: 1;
}
div#${UIElementNames.Container} {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.32);
  z-index: 0;
}`;

export class UIService {
  protected get container(): HTMLDivElement | null {
    return document.querySelector(`#${UIElementNames.Container}`);
  }

  protected get iframe(): HTMLIFrameElement | null {
    return document.querySelector(`#${UIElementNames.IFrame}`);
  }

  protected get styles(): HTMLStyleElement | null {
    return document.querySelector(`#${UIElementNames.Styles}`);
  }

  protected url: string = '';

  setUrl(url: string) {
    this.url = url;
  }

  async mount(): Promise<void> {
    return new Promise(resolve => {
      if (this.iframe) {
        resolve();
        return;
      }

      const iframe = document.createElement('iframe');
      const style = document.createElement('style');
      const container = document.createElement('div');

      style.id = UIElementNames.Styles;
      style.innerHTML = cssStyles;

      container.id = UIElementNames.Container;

      iframe.id = UIElementNames.IFrame;
      iframe.src = this.url;
      iframe.onload = () => {
        resolve();
      };

      container.appendChild(iframe);

      document.head.appendChild(style);
      document.body.appendChild(container);
    });
  }

  unmount() {
    if (this.iframe) {
      this.iframe.remove();
      log('UI IFrame removed');
    }

    if (this.container) {
      this.container.remove();
      log('UI Container removed');
    }

    if (this.styles) {
      this.styles.remove();
      log('UI Styles removed');
    }
  }

  async getTarget(): Promise<Window> {
    return new Promise(async resolve => {
      if (!this.iframe) {
        await this.mount();
      }

      const iframe = this.iframe as HTMLIFrameElement;
      resolve(iframe.contentWindow as Window);
    });
  }
}
