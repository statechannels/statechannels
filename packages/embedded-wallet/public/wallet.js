const log = window['debug'] ? window['debug']('wallet:bridge') : console.log;

let timeoutListener = null;
let attempts = 0;
const timeoutMs = 50;
const maxRetries = 5;

class ChannelProvider {
  url = 'http://localhost:1701';

  static enable(url = undefined) {
    window.addEventListener('message', event => {
      const message = event.data;

      if (message === 'ui:wallet:close') {
        log('Close signal received: %o', message);
        document.querySelector('iframe#wallet').remove();
        document.querySelector('#walletContainer').remove();
        log('Iframe removed');
        return;
      }

      if (message === 'ui:wallet:ack') {
        log('ACK signal received');
        clearTimeout(timeoutListener);
        attempts = 0;
        return;
      }

      if (!message.jsonrpc || message.result) {
        return;
      }

      ChannelProvider.getWalletFrame().then(contentWindow =>
        ChannelProvider.relayMessage(contentWindow, message)
      );
    });

    if (url) {
      ChannelProvider.url = url;
    }
  }

  static async request(message, callback) {
    if (!message.id) {
      message.id = Date.now();
    }
    return new Promise(resolve => {
      let listener;
      if (callback) {
        listener = event => {
          if (
            event.data &&
            event.data.jsonrpc &&
            event.data.result &&
            event.data.id === message.id
          ) {
            callback(event.data);
            window.removeEventListener('message', listener);
            log('Received response: %o', event.data);
            resolve(event.data);
          }
        };
      } else {
        listener = event => {
          if (
            event.data &&
            event.data.jsonrpc &&
            event.data.result &&
            event.data.id === message.id
          ) {
            window.removeEventListener('message', listener);
            log('Received response: %o', event.data);
            resolve(event.data);
          }
        };
      }

      window.addEventListener('message', listener);
      log('Requesting: %o', message);

      ChannelProvider.getWalletFrame().then(contentWindow =>
        ChannelProvider.relayMessage(contentWindow, message)
      );
    });
  }

  static relayMessage(contentWindow, message) {
    attempts += 1;

    log('Relaying message: %o (attempt %o)', message, attempts);
    contentWindow.postMessage(message, ChannelProvider.url);
    log('Relayed message: %o', message);

    timeoutListener = setTimeout(() => {
      if (attempts < maxRetries) {
        log('Request %o timed out after %o ms, retrying', message, timeoutMs);
        ChannelProvider.relayMessage(contentWindow, message);
      } else {
        log('Request %o timed out after %o attempts; is wallet unreachable?', message, attempts);
      }
    }, timeoutMs);
  }

  static getWalletFrame() {
    return new Promise(resolve => {
      let walletIframe = document.querySelector('iframe#wallet');
      if (!walletIframe) {
        const style = document.createElement('style');
        style.innerHTML = `
        iframe#wallet {
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
  
        div#walletContainer {
          position: absolute;
          left: 0px;
          top: 0px;
          width: 100%;
          height: 100%;
          background: #000;
          opacity: 0.32;
          z-index: 0;
        }
        `;
        document.head.appendChild(style);
        const walletContainer = document.createElement('div');
        walletContainer.id = 'walletContainer';
        walletIframe = document.createElement('iframe');
        walletIframe.id = 'wallet';
        walletIframe.src = ChannelProvider.url;
        document.body.appendChild(walletIframe);
        document.body.appendChild(walletContainer);

        walletIframe.onload = () => {
          log('Iframe loaded');
          resolve(walletIframe.contentWindow);
        };
      } else {
        log('Iframe already exists');
        resolve(walletIframe.contentWindow);
      }
    });
  }
}

if (window) {
  window.channelProvider = ChannelProvider;
} else if (global) {
  global.channelProvider = ChannelProvider;
} else if (module) {
  module.exports = ChannelProvider;
}
