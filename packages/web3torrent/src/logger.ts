import pino from 'pino';
import {LOG_DESTINATION, ADD_LOGS, LOG_LEVEL, VERSION} from './constants';
import _ from 'lodash';

// TODO: Is there a better way to determine if we're in a browser context?
const IS_BROWSER_CONTEXT = process.env.NODE_ENV !== 'test';
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
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (_, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }

    return value;
  };
};
class LogBlob {
  private parts = [];
  private _blob?: Blob;

  append(part) {
    this.parts.push(part);
    this._blob = undefined;
  }

  get blob() {
    if (!this._blob) this._blob = new Blob(this.parts, {type: 'text/plain'});

    return this._blob;
  }
}

const logBlob = new LogBlob();

const serializeLogEvent = o => JSON.stringify({...o, name}, getCircularReplacer());

let browser: any = IS_BROWSER_CONTEXT
  ? {
      transmit: {
        send: (_logEvent, logEvent) =>
          logBlob.append(
            serializeLogEvent({
              // For some reason, the shape of logEvent and the shape that pino normally prints are different:
              // - there is a `ts` property instead of a `timestamp` property
              // - The `level` property is of shape {label: string, value: number}
              ..._.omit(logEvent, 'ts'),
              level: logEvent.level.value,
              time: logEvent.ts
            }) + '\n'
          )
      }
    }
  : undefined;

if (browser && LOG_TO_FILE) {
  // TODO: Use the logBlob instead of writing to the browser logs
  browser = {...browser, write: o => console.log(serializeLogEvent(o))};
}

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const level = LOG_LEVEL;
const opts = {name, prettyPrint, browser, level};

export const logger = destination ? pino(opts, destination) : pino(opts);

if (IS_BROWSER_CONTEXT) {
  (window as any).saveWeb3torrentLogs = function saveLogs() {
    // Ref: https://stackoverflow.com/a/33542499
    const filename = `web3torrent.${new Date(Date.now()).toUTCString()}.${VERSION}.pino.log`;
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
