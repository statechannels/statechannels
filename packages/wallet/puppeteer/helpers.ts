import puppeteer from "puppeteer";

import fs from "fs";
import path from "path";
import Emittery from "emittery";

export const enum MessageType {
  PlayerAMessage = "playerA-message",
  PlayerBMessage = "playerB-message",
  PlayerAResult = "playerA-result",
  PlayerBResult = "playerB-result",
  PlayerANotification = "playerA-notification",
  PlayerBNotification = "playerB-notification"
}
export type MessageEventTypes = {
  [MessageType.PlayerAMessage]: any;
  [MessageType.PlayerBMessage]: any;
  [MessageType.PlayerAResult]: any;
  [MessageType.PlayerBResult]: any;
  [MessageType.PlayerANotification]: any;
  [MessageType.PlayerBNotification]: any;
};

export function createMessageHandler(
  emitter: Emittery.Typed<MessageEventTypes>,
  player: "A" | "B"
) {
  return message => {
    if (message.id) {
      emitter.emit(player === "A" ? MessageType.PlayerAResult : MessageType.PlayerBResult, message);
    } else if (message.method === "MessageQueued") {
      emitter.emit(
        player === "A" ? MessageType.PlayerAMessage : MessageType.PlayerBMessage,
        message
      );
    } else {
      emitter.emit(
        player === "A" ? MessageType.PlayerANotification : MessageType.PlayerBNotification,
        message
      );
    }
  };
}

export async function loadWallet(page: puppeteer.Page, messageListener: (message) => void) {
  // TODO: This is kinda ugly but it works
  // We need to instantiate a web3 for the wallet so we import the web 3 script
  // and then assign it on the window
  const port = process.env.GANACHE_PORT || 8560;
  console.log(port);
  const web3JsFile = fs.readFileSync(path.resolve(__dirname, "web3/web3.min.js"), "utf8");
  await page.evaluateOnNewDocument(web3JsFile);
  await page.evaluateOnNewDocument(`window.web3 = new Web3("http://localhost:${port}")`);
  await page.goto("http://localhost:3055/");

  await page.waitFor(500); // Delay lets things load
  // interceptMessage gets called in puppeteer's context
  await page.exposeFunction("interceptMessage", message => {
    messageListener(message);
  });
  await page.evaluate(() => {
    // We override window.parent.postMessage with our interceptMesage
    (window as any).parent = {...window.parent, postMessage: (window as any).interceptMessage};
  });
}

export async function setUpBrowser(headless: boolean): Promise<puppeteer.Browser> {
  const browser = await puppeteer.launch({
    headless,
    devtools: headless,
    // Needed to allow both windows to execute JS at the same time
    ignoreDefaultArgs: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding"
    ]
  });

  return browser;
}

export async function sendJoinChannel(page: puppeteer.Page, channelId: string) {
  await page.evaluate(cId => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "JoinChannel",
        id: 4,
        params: {
          channelId: cId
        }
      },
      "*"
    );
  }, channelId);
}

export async function sendCreateChannel(page: puppeteer.Page, playerAAddress, playerBAddress) {
  await page.evaluate(
    (a, b) => {
      const participants = [
        {
          participantId: "user-a",
          signingAddress: a,
          destination: a
        },
        {
          participantId: "user-b",
          signingAddress: b,
          destination: b
        }
      ];
      const allocations = [
        {
          token: "0x0",
          allocationItems: [{destination: a, amount: "0x1"}, {destination: b, amount: "0x1"}]
        }
      ];
      window.postMessage(
        {
          jsonrpc: "2.0",
          method: "CreateChannel",
          id: 2,
          params: {
            participants,
            allocations,
            appDefinition: "0x0000000000000000000000000000000000000000",
            appData: "0x0"
          }
        },
        "*"
      );
    },
    playerAAddress,
    playerBAddress
  );
}

export async function sendGetAddress(page: puppeteer.Page) {
  await page.evaluate(() => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "GetAddress",
        id: 1,
        params: {}
      },
      "*"
    );
  });
}

export async function pushMessage(page: puppeteer.Page, message: any) {
  await page.evaluate(m => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "PushMessage",
        id: 10,
        params: m
      },
      "*"
    );
  }, message);
}
