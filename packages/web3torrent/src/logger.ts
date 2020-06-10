import pino from 'pino';
import {LOG_DESTINATION, ADD_LOGS, LOG_LEVEL, VERSION} from './constants';
import _ from 'lodash';
import {PaidStreamingWire, SerializedPaidStreamingWire, isPaidStreamingWire} from './library/types';
import {Torrent} from 'webtorrent';

const IS_BROWSER_CONTEXT = process.env.JEST_WORKER_ID === undefined;
const LOG_TO_CONSOLE = LOG_DESTINATION === 'console';
const LOG_TO_FILE = ADD_LOGS && !LOG_TO_CONSOLE;

const name = 'web3torrent';

const destination =
  LOG_TO_FILE && !IS_BROWSER_CONTEXT ? pino.destination(LOG_DESTINATION) : undefined;

/*
 * web3torrent logs lots of BIG classes.
 * These serializers makes them more reasonable to log.
 *
 ****** WARNING ********
 * Due to circular import bugs, making the serializers type safe is difficult or impossible.
 * Even worse, the types defined by web3torrent are not faithful to the values passed to the logger.
 * EG. a PaidStreamingExtensionWire does not always have a paidStreamingExtension property
 */

const isObject = (obj: any): obj is Record<string, any> => obj !== null && typeof obj === 'object';

/*
 * Some things which are typed as "string" are actually things like Buffer.from('some string').toJson()
 * EXAMPLE (from my clipboard)
 * ❯ pbpaste | head -n 1 | jq -c '.torrent.wires[].peerExtendedHandshake'
 * {"m":{"paidStreamingExtension":2,"ut_metadata":1},"metadata_size":723,"outcomeAddress":{"type":"Buffer","data":[48,120,68,57,57,57,53,66,65,69,49,50,70,69,101,51,50,55,50,53,54,70,70,101,99,49,101,51,49,56,52,100,52,57,50,98,68,57,52,67,51,49]},"pseAccount":{"type":"Buffer","data":[48,120,57,51,99,102,48,50,97,57,50,100,65,56,52,57,50,66,49,57,68,68,51,52,65,52,54,66,99,67,98,57,50,56,70,48,57,54,55,49,50,54]}}
 *
 * After running serializeBuffer, it looks like:
 * ❯ pbpaste | head -n 1 | jq -c '.torrent.wires[].peerExtendedHandshake'
 * {"m":{"paidStreamingExtension":2,"ut_metadata":1},"metadata_size":723,"outcomeAddress":"0xD9995BAE12FEe327256FFec1e3184d492bD94C31","pseAccount":"0xEF9b144621dE6a0a994197062FDCf204a23a93f4"}
 */

type Bufferish = Buffer | {type: 'Buffer'; data: any};
const isBuffer = (obj: any): obj is Bufferish =>
  Buffer.isBuffer(obj) || (isObject(obj) && obj.type === 'Buffer');
const serializeBuffer = (b: Bufferish) => Buffer.from(b).toString();

// This type "guard" is unfortunately not type safe, since that leads to circular module references
const isPaidStreamingExtension = (obj: any) =>
  isObject(obj) && '_isPaidStreamingExtension' in obj && obj._isPaidStreamingExtension;

const serializePaidStreamingExtension = ({
  pseAccount,
  pseAddress,
  seedingChannelId,
  peerAccount,
  peerOutcomeAddress,
  leechingChannelId,
  isForceChoking,
  isBeingChoked,
  blockedRequests
}: any) => ({
  pseAccount,
  pseAddress,
  seedingChannelId,
  peerAccount,
  peerOutcomeAddress,
  leechingChannelId,
  isForceChoking,
  isBeingChoked,
  blockedRequests
});

const serializePaidStreamingWire = ({
  peerId,
  amChoking,
  amInterested,
  peerChoking,
  peerInterested,
  paidStreamingExtension,
  peerExtendedHandshake,
  extendedHandshake
}: PaidStreamingWire): SerializedPaidStreamingWire => ({
  peerId,
  amChoking,
  amInterested,
  peerChoking,
  peerInterested,
  paidStreamingExtension,
  peerExtendedHandshake,
  extendedHandshake
});

// TODO: Should we even log torrents?
const isTorrent = (obj: any): obj is Torrent =>
  isObject(obj) && 'infoHash' in obj && 'magnetURI' in obj && 'torrentFile' in obj;

const serializeTorrent = o => ({
  created: o.created,
  createdBy: o.createdBy,
  destroyed: o.destroyed,
  done: o.done,
  files: o.files,
  infoHash: o.infoHash,
  lastPieceLength: o.lastPieceLength,
  length: o.length,
  magnetURI: o.magnetURI,
  maxWebConns: o.maxWebConns,
  name: o.name,
  paused: o.paused,
  pieceLength: o.pieceLength,
  ready: o.ready,
  received: o.received,
  strategy: o.strategy,
  uploaded: o.uploaded,
  urlList: o.urlList,
  usingPaidStreaming: o.usingPaidStreaming,
  wires: o.wires
});

// If we are in a browser, but we want to LOG_TO_FILE, we assume that the
// log statements are meant to be stored as JSON objects
// So, we log serialized objects, appending the name (which the pino browser-api appears to remove?)

// Since WebTorrentPaidStreamingClient contains circular references, we use
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#Examples
const serializer = () => {
  const seen = new WeakSet();
  return (_, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }

    if (isBuffer(value)) {
      return serializeBuffer(value);
    } else if (isPaidStreamingWire(value)) {
      return serializePaidStreamingWire(value);
    } else if (isPaidStreamingExtension(value)) {
      return serializePaidStreamingExtension(value);
    } else if (isTorrent(value)) {
      return serializeTorrent(value);
    } else {
      return value;
    }
  };
};

const serializeLogObject = (o: any): string => {
  try {
    return JSON.stringify(o, serializer()) + '\n';
  } catch (error) {
    // In case the above code does not work.
    console.error(error);
    console.error('Failed to serialize a log object');
    return typeof o;
  }
};

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
        // Firefox & chrome automatically expand trace calls, which is pretty annoying.
        // So, we direct trace calls to console.debug instead.
        trace: appendAndCallToConsoleFn(console.debug)
      }
    }
  : undefined;

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const level = window.localStorage.LOG_LEVEL ?? LOG_LEVEL;
const opts = {prettyPrint, browser, level};

export const logger = destination ? pino(opts, destination) : pino(opts);

function saveLogs() {
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
}
function setLogLevel(level: string) {
  const key = 'LOG_LEVEL';
  const iFrame = document.querySelector('#channelProviderUi');
  if (!level) {
    console.log(`web3torrent: level CLEARED from ${logger.level} to ${LOG_LEVEL}`);
    localStorage.removeItem(key);
    logger.level = LOG_LEVEL;
    (iFrame as any).contentWindow.postMessage({type: 'CLEAR_LOG_LEVEL'}, '*');
    return;
  }

  if (pino.levels.values[level]) {
    console.log(`web3torrent: level CHANGED from ${logger.level} to ${level}`);
    localStorage.setItem(key, level);
    logger.level = level;

    (iFrame as any).contentWindow.postMessage({type: 'SET_LOG_LEVEL', level}, '*');
  } else {
    throw Error(`Invalid log level ${level}`);
  }
}

if (IS_BROWSER_CONTEXT) {
  (window as any).saveWeb3torrentLogs = saveLogs;
  (window as any).setLogLevel = setLogLevel;

  window.addEventListener(
    'message',
    event => event.data === 'SAVE_WEB3_TORRENT_LOGS' && saveLogs()
  );
}
