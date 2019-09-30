const log = window["debug"]("wallet:bridge");

let timeoutListener = null;
let attempts = 0;
const timeoutMs = 50;
const maxRetries = 5;

const relayMessage = (contentWindow, message) => {
  attempts += 1;

  log("Relaying message: %o (attempt %o)", message, attempts);
  contentWindow.postMessage(message, "http://localhost:3000");
  log("Relayed message: %o", message);

  timeoutListener = setTimeout(() => {
    if (attempts < maxRetries) {
      log("Request %o timed out after %o ms, retrying", message, timeoutMs);
      relayMessage(contentWindow, message);
    } else {
      log("Request %o timed out after %o attempts; is wallet unreachable?", message, attempts);
    }
  }, timeoutMs);
};

const getWalletFrame = () => {
  return new Promise(resolve => {
    let walletIframe = document.querySelector("iframe#wallet");
    if (!walletIframe) {
      const style = document.createElement("style");
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
      const walletContainer = document.createElement("div");
      walletContainer.id = "walletContainer";
      walletIframe = document.createElement("iframe");
      walletIframe.id = "wallet";
      walletIframe.src = "http://localhost:3000";
      document.body.appendChild(walletIframe);
      document.body.appendChild(walletContainer);

      walletIframe.onload = () => {
        log("Iframe loaded");
        resolve(walletIframe.contentWindow);
      };
    } else {
      log("Iframe already exists");
      resolve(walletIframe.contentWindow);
    }
  });
};

window.addEventListener("message", event => {
  const message = event.data;

  if (message === "ui:wallet:close") {
    log("Close signal received: %o", message);
    document.querySelector("iframe#wallet").remove();
    document.querySelector("#walletContainer").remove();
    log("Iframe removed");
    return;
  }

  if (message === "ui:wallet:ack") {
    log("ACK signal received");
    clearTimeout(timeoutListener);
    attempts = 0;
    return;
  }

  if (!message.jsonrpc) {
    return;
  }

  getWalletFrame().then(contentWindow => relayMessage(contentWindow, message));
});

log("Ready");
