import debug from 'debug';

const log = debug('wallet:dispatch');

const closeWallet = () => {
  log('Sending: %o', 'ui:wallet:close');
  window.parent.postMessage('ui:wallet:close', '*');
};

export {closeWallet};
