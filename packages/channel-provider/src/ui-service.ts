import debug from 'debug';

const log = debug('channel-provider:ui');

export enum UIElementNames {
  Styles = 'channelProviderUiStyles',
  Container = 'channelProviderUiContainer',
  IFrame = 'channelProviderUi'
}
// TODO: Border radius shouldn't be set here it should be set in the wallet
export const cssStyles = `iframe#${UIElementNames.IFrame} {
  border: 0;
  position: fixed;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  height: 100%;
  top: 0;
  margin-top: 0;
  overflow: hidden;
  z-index: 1301;
}
div#${UIElementNames.Container} {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.32);
  z-index: 1300;
}
.hide {
  display:none;
}
`;

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

  protected url = '';

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
      this.setVisibility(false);
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

  setVisibility(visible: boolean) {
    if (!this.container) {
      throw new Error('Cannot find the wallet iFrame container.');
    }
    this.container.classList.toggle('hide', !visible);
  }

  async getTarget(): Promise<Window> {
    /* The below Promise shouldn't be an async executor according to this: 
       https://eslint.org/docs/rules/no-async-promise-executor */
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async resolve => {
      if (!this.iframe) {
        await this.mount();
      }

      const iframe = this.iframe as HTMLIFrameElement;
      resolve(iframe.contentWindow as Window);
    });
  }
}
