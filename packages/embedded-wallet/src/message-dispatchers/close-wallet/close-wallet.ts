const closeWallet = () => {
  window.parent.postMessage("ui:wallet:close", "*");
};

export { closeWallet };
