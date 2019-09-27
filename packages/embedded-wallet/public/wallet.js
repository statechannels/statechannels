const log = window["debug"]("wallet:bridge");

const relayMessage = (contentWindow, message) => {
  log("Relaying message: %o", message);
  contentWindow.postMessage(message, "http://localhost:3000");
  log("Relayed message: %o", message);
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

      walletIframe.addEventListener("load", () => resolve(walletIframe.contentWindow));
    } else {
      resolve(walletIframe.contentWindow);
    }
  });
};

window.addEventListener("message", event => {
  const message = event.data;

  if (message === "ui:wallet:close") {
    log("Close signal received: %o", message);
    document.querySelector("#walletContainer").remove();
    document.querySelector("iframe").remove();
    log("Iframe removed");
    return;
  }

  if (!message.jsonrpc) {
    return;
  }

  getWalletFrame().then(contentWindow => relayMessage(contentWindow, message));
});

log("Ready");
