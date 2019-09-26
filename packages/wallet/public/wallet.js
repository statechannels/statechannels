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
      walletIframe = document.createElement("iframe");
      walletIframe.id = "wallet";
      walletIframe.src = "http://localhost:3000";
      document.body.appendChild(walletIframe);

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
