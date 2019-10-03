import debug from 'debug';
import {JsonRPCResponse} from 'web3/providers';

const log = debug('wallet:dispatch');

const allocate = (requestId: number, result: {[key: string]: string | number | boolean}) => {
  const message: JsonRPCResponse = {jsonrpc: '2.0', id: requestId, result};
  log('Sending: %o', message);
  window.parent.postMessage(message, '*');
};

export {allocate};
