import pino from 'pino';

// eslint-disable-next-line no-undef
const LOG_TO_CONSOLE = process.env.LOG_DESTINATION === 'console';
// eslint-disable-next-line no-undef
const LOG_TO_FILE = process.env.LOG_DESTINATION && !LOG_TO_CONSOLE;
// eslint-disable-next-line no-undef
const IS_BROWSER_CONTEXT = process.env.NODE_ENV !== 'test';

const name = 'channel-provider';

const serializeLogEvent = (o: any) => JSON.stringify({...o, name});

let browser: any = IS_BROWSER_CONTEXT
  ? {
      transmit: {
        send: (_: any, logEvent: any) =>
          window.postMessage(
            {type: 'PINO_LOG', logEvent: JSON.parse(JSON.stringify({...logEvent, name}))},
            '*'
          )
      }
    }
  : undefined;

if (browser && LOG_TO_FILE) {
  // TODO: Use the logBlob instead of writing to the browser logs
  browser = {...browser, write: (o: any) => console.log(serializeLogEvent(o))};
}

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const opts = {name, prettyPrint, browser};
export const logger = pino(opts);
