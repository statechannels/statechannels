const log = window["debug"]("wallet:bridge");

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

  const iframe = document.createElement("iframe");
  iframe.setAttribute("src", "http://localhost:3000");

  iframe.addEventListener("load", () => {
    const wallet = iframe.contentWindow;
    log("Relaying message: %o", message);
    wallet.postMessage(message, "http://localhost:3000");
    log("Relayed message: %o", message);
  });

  document.body.appendChild(iframe);
  log("Instantiated iframe");
});

log("Ready");
