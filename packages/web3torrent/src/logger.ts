import pino from 'pino';
import {LOG_DESTINATION, ADD_LOGS, LOG_LEVEL, VERSION} from './constants';
import _ from 'lodash';
import {PaidStreamingWire, SerializedPaidStreamingWire, isPaidStreamingWire} from './library/types';

const IS_BROWSER_CONTEXT = process.env.JEST_WORKER_ID === undefined;
const LOG_TO_CONSOLE = LOG_DESTINATION === 'console';
const LOG_TO_FILE = ADD_LOGS && !LOG_TO_CONSOLE;

const name = 'web3torrent';

const destination =
  LOG_TO_FILE && !IS_BROWSER_CONTEXT ? pino.destination(LOG_DESTINATION) : undefined;

// If we are in a browser, but we want to LOG_TO_FILE, we assume that the
// log statements are meant to be stored as JSON objects
// So, we log serialized objects, appending the name (which the pino browser-api appears to remove?)

// Since WebTorrentPaidStreamingClient contains circular references, we use
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#Examples

export const serializePaidStreamingWire = (wire: PaidStreamingWire): SerializedPaidStreamingWire =>
  _.pick(wire, 'peerId', 'amChoking', 'amInterested', 'peerChoking', 'peerInterested');

const torrentDataReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }

    if (isPaidStreamingWire(value)) {
      return serializePaidStreamingWire(value);
    } else {
      return value;
    }
  };
};

const serializeLogObject = o => JSON.stringify(o, torrentDataReplacer()) + '\n';
class LogBlob {
  private parts = [];
  private _blob?: Blob;
  constructor() {
    window.addEventListener('message', event => {
      if (event.data?.type === 'PINO_LOG') {
        this.append(event.data.logEvent);
      }
    });
  }

  append(part) {
    this.parts.push(part);
    this._blob = undefined;
  }

  get blob() {
    if (!this._blob)
      this._blob = new Blob(_.sortBy(this.parts, o => o.time).map(serializeLogObject), {
        type: 'text/plain'
      });

    return this._blob;
  }
}

const logBlob = new LogBlob();

const appendAndCallToConsoleFn = (consoleFn: {(message?: any, ...optionalParams: any[]): void}) => (
  o: any
) => {
  const withName = {...o, name};

  // So as to not overwrite the `name` property from xstate-wallet (and later, channel-provider),
  // we only call `addName` on objects that we know came from web3torrent.
  logBlob.append(withName);
  if (LOG_TO_FILE) consoleFn(serializeLogObject(withName));
  else consoleFn(o.msg, _.omit(o, 'msg'));
};

const browser: any = IS_BROWSER_CONTEXT
  ? {
      write: {
        error: appendAndCallToConsoleFn(console.error),
        warn: appendAndCallToConsoleFn(console.warn),
        info: appendAndCallToConsoleFn(console.info),
        debug: appendAndCallToConsoleFn(console.debug),
        trace: appendAndCallToConsoleFn(console.trace)
      }
    }
  : undefined;

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const level = LOG_LEVEL;
const opts = {prettyPrint, browser, level};

export const logger = destination ? pino(opts, destination) : pino(opts);

if (IS_BROWSER_CONTEXT) {
  (window as any).saveWeb3torrentLogs = function saveLogs() {
    // Ref: https://stackoverflow.com/a/33542499
    const filename = `web3torrent.${new Date(Date.now()).toUTCString()}.${VERSION}.${
      window.channelProvider.signingAddress
    }.pino.log`;
    const {blob} = logBlob;
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      const elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }
  };
}
