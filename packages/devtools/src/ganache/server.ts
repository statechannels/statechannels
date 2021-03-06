import {BigNumber, ethers} from 'ethers';
import {waitUntilFree, waitUntilUsed} from 'tcp-port-used';
import ganache from 'ganache-core';

import {TEST_ACCOUNTS} from '../constants';
import {Account} from '../types';

import {logger} from './logger';
import {SHOW_VERBOSE_GANACHE_OUTPUT} from './config';

function findClosingPosition(data: string) {
  let closePos = 0;
  let depth = 1;
  while (depth > 0) {
    const char = data[++closePos];
    if (char === '{') depth++;
    else if (char === '}') depth--;
    else if (closePos === data.length - 1) return -1;
  }
  return ++closePos;
}

function clean(newData: string): string {
  newData = newData.replace(/>/g, '');
  newData = newData.replace(/</g, '');

  return newData;
}

function extractLogsFromVerboseGanacheOutput(buffer: string, newData = ''): string {
  logger.trace({buffer, newData}, 'Extracting logs');
  /*
   * Here's what newData can look like:
   **** Sometimes, it's just a string ****
   * "Available Accounts\n==================\n"
   *
   **** Sometimes, it logs an incoming request ****
   * "   > {\n   >   \"method\": \"net_version\",\n   >   \"params\": [],\n   >   \"id\": 42,\n   >   \"jsonrpc\": \"2.0\"\n   > }\n"
   **** Cleaned ****
   * '{"method":"net_version","params":[],"id":42,"jsonrpc":"2.0"}'
   *
   **** Sometimes, it logs an outgoing response (error or result) ****
   * " <   {\n <     \"id\": 44,\n <     \"jsonrpc\": \"2.0\",\n <     \"result\": \"0x0\"\n <   }\n"
   **** Cleaned ****
   * '{"id":44,"jsonrpc":"2.0","result":"0x0"}'
   *
   **** Sometimes, the request has a string at the beginning (which seems to be the method)****
   * "eth_getTransactionCount\n   > {\n   >   \"method\": \"eth_getTransactionCount\",\n   >   \"params\": [\n   >     \"0x760bf27cd45036a6c486802d30b5d90cffbe31fe\",\n   >     \"pending\"\n   >   ],\n   >   \"id\": 44,\n   >   \"jsonrpc\": \"2.0\"\n   > }\n"
   **** cleaned ****
   * 'eth_getTransactionCount{"method":"eth_getTransactionCount","params":["0x760bf27cd45036a6c486802d30b5d90cffbe31fe","pending"],"id":44,"jsonrpc":"2.0"}'
   *
   **** Sometimes, there are two requests on the same line. I think that, in this case, there is always a string in between ****
   * " <   {\n <     \"id\": 44,\n <     \"jsonrpc\": \"2.0\",\n <     \"result\": \"0x0\"\n <   }\neth_getTransactionCount\n   > {\n   >   \"method\": \"eth_getTransactionCount\",\n   >   \"params\": [\n   >     \"0x760bf27cd45036a6c486802d30b5d90cffbe31fe\",\n   >     \"pending\"\n   >   ],\n   >   \"id\": 44,\n   >   \"jsonrpc\": \"2.0\"\n   > }\n"
   **** cleaned ****
   * '{"id":44,"jsonrpc":"2.0","result":"0x0"}eth_getTransactionCount{"method":"eth_getTransactionCount","params":["0x760bf27cd45036a6c486802d30b5d90cffbe31fe","pending"],"id":44,"jsonrpc":"2.0"}'
   *
   **** Sometimes, the entire request does not fit in one print statement to STDOUT ****
   * "   > {\n   >   \"method\": \"eth_sendRawTransaction\",\n   >   \"params\": [\n   >     \"0xf91...15610"
   **** cleaned ****
   * '{"method":"eth_sendRawTransaction","params":["0xf91...15610'
   *
   **** In this case, the remainder of the request seems to come in the next print to STDOUT. ****
   * "fb057...47b4\"\n   >   ],\n   >   \"id\": 46,\n   >   \"jsonrpc\": \"2.0\"\n   > }\n"
   **** cleaned ****
   * 'fb057...47b4"],"id":46,"jsonrpc":"2.0"}'
   **** So, we have to store the current data in a buffer, and concat the next log line to that buffer****
   */
  buffer = buffer.concat(clean(newData));

  const logLineStart = buffer.indexOf('{');

  let statement = '';

  if (logLineStart === -1) {
    statement = buffer;
    buffer = '';
  } else if (logLineStart > 0) {
    statement = buffer.slice(0, logLineStart);
    buffer = buffer.slice(logLineStart);
  }

  statement = statement.trim();

  if (statement) {
    logger.info({statement}, 'NON-JSON-RPC log line:');
  }

  if (buffer.length === 0) {
    return '';
  }

  if (buffer.indexOf('}') !== -1 && buffer.indexOf('}') < logLineStart) {
    // I've never seen this, but perhaps it could happen?
    // If it does, I think the remaining data would not get logged
    logger.error({buffer, logLineStart}, 'Unexpected buffer');
    return '';
  }

  const logLineEnd = findClosingPosition(buffer);
  if (logLineEnd === -1) {
    logger.trace({buffer}, 'No end in sight...');
    return buffer;
  }

  const logLine = JSON.parse(buffer.slice(0, logLineEnd));

  if ('method' in logLine) {
    logger.info(logLine, `> REQUEST: ${logLine.method} - ${logLine.id}`);
  } else if ('error' in logLine) {
    logger.info(logLine, `< ERROR: request failed ${logLine.id}`);
  } else if ('result' in logLine) {
    logger.info(logLine, `< RESULT: request succeeded ${logLine.id}`);
  } else {
    logger.error(logLine, 'Log line is not a JSON-RPC message');
  }

  return extractLogsFromVerboseGanacheOutput(buffer.slice(logLineEnd));
}

export class GanacheServer {
  provider: ethers.providers.JsonRpcProvider;
  fundedPrivateKey: string;
  server: any;
  private buffer = '';

  constructor(
    public readonly port: number = 8545,
    public readonly chainId: number = 9001,
    accounts: Account[] = TEST_ACCOUNTS,
    public readonly timeout: number = 10_000,
    gasLimit = 1_000_000_000,
    gasPrice = 1
  ) {
    logger.info(`Starting ganache on port ${this.port} with network ID ${this.chainId}`);
    this.fundedPrivateKey = accounts[0].privateKey;

    const oneMillion = ethers.utils.parseEther('1000000').toHexString();

    // ganache core exports a very permissive object[] type for accounts
    // it should be {balance: HexString, secretKey: string}[]
    const serverOptions: ganache.IServerOptions = {
      network_id: this.chainId,
      accounts: accounts.map(a => ({balance: oneMillion, secretKey: a.privateKey})),
      gasLimit,
      gasPrice: BigNumber.from(gasPrice).toHexString(),
      verbose: SHOW_VERBOSE_GANACHE_OUTPUT,
      logger: {
        log: x => {
          SHOW_VERBOSE_GANACHE_OUTPUT
            ? extractLogsFromVerboseGanacheOutput(this.buffer, x)
            : logger.info(x);
        }
      }
    };

    this.server = ganache.server({
      ...serverOptions,
      _chainId: this.chainId,
      _chainIdRpc: this.chainId // see https://github.com/trufflesuite/ganache-core/tree/master#options
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.server.listen(this.port, () => {});
    this.provider = new ethers.providers.JsonRpcProvider(`http://localhost:${this.port}`);
  }

  static async connect(port: number): Promise<GanacheServer> {
    const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${port}`);
    try {
      await provider.getBlockNumber();
      return new GanacheServer(port);
    } catch (e) {
      return Promise.reject(`No ganache server to connect to locally on port ${port}`);
    }
  }

  async ready() {
    await waitUntilUsed(this.port, 500, this.timeout);
  }

  async close() {
    this.server.close();
    await waitUntilFree(this.port, 500, this.timeout);
  }

  onClose(listener: () => void) {
    this.server.on('close', listener);
  }
}
