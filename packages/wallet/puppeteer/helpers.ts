import fs from "fs";
import path from "path";

import puppeteer from "puppeteer";
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
  const port = process.env.GANACHE_PORT ? Number.parseInt(process.env.GANACHE_PORT) : 8560;
  // TODO: This is kinda ugly but it works
  // We need to instantiate a web3 for the wallet so we import the web 3 script
  // and then assign it on the window
  const web3JsFile = fs.readFileSync(path.resolve(__dirname, "web3/web3.min.js"), "utf8");
  await page.evaluateOnNewDocument(web3JsFile);
  await page.evaluateOnNewDocument(`window.web3 = new Web3("http://localhost:${port}")`);
  await page.evaluateOnNewDocument(`window.ethereum = window.web3.currentProvider`);
  // MetaMask has an .enable() API to unlock it / access it from the app
  await page.evaluateOnNewDocument(`window.ethereum.enable = () => new Promise(r => r())`);
  await page.evaluateOnNewDocument(
    `web3.eth.getAccounts().then(lst => {
      window.ethereum.selectedAddress = lst[0];
    });`
  );
  await page.evaluateOnNewDocument(`window.ethereum.networkVersion = 9001`);
  await page.evaluateOnNewDocument(`window.ethereum.on = () => {}`);
  await page.goto("http://localhost:3055/", {waitUntil: "load"});
  page.on("pageerror", error => {
    throw error;
  });
  page.on("console", msg => {
    if (msg.type() === "error") {
      throw new Error(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  // interceptMessage gets called in puppeteer's context
  await page.exposeFunction("interceptMessage", message => {
    messageListener(message);
  });
  await page.evaluate(() => {
    // We override window.parent.postMessage with our interceptMesage
    (window as any).parent = {
      ...window.parent,
      postMessage: (window as any).interceptMessage
    };
  });
}

export async function setUpBrowser(headless: boolean): Promise<puppeteer.Browser> {
  const browser = await puppeteer.launch({
    headless,
    devtools: !headless,
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

export async function sendCloseChannel(page: puppeteer.Page, channelId) {
  await page.evaluate(cId => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "CloseChannel",
        id: 99,
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
          allocationItems: [
            {destination: a, amount: "0x1"},
            {destination: b, amount: "0x1"}
          ]
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

export async function sendGetWalletInformation(page: puppeteer.Page) {
  await page.evaluate(() => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "GetWalletInformation",
        id: 1,
        params: {}
      },
      "*"
    );
  });
}

export async function sendUpdateState(
  page: puppeteer.Page,
  channelId: string,
  playerAAddress,
  playerBAddress
) {
  await page.evaluate(
    (a, b, cId) => {
      const allocations = [
        {
          token: "0x0",
          allocationItems: [
            {destination: a, amount: "0x1"},
            {destination: b, amount: "0x1"}
          ]
        }
      ];
      window.postMessage(
        {
          jsonrpc: "2.0",
          method: "UpdateChannel",
          id: 1,
          params: {
            channelId: cId,
            allocations,
            appData: "0x0"
          }
        },
        "*"
      );
    },
    playerAAddress,
    playerBAddress,
    channelId
  );
}

export async function pushMessage(page: puppeteer.Page, message: any) {
  if (!page.isClosed()) {
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
}

export async function completeFunding(
  walletA: puppeteer.Page,
  walletB: puppeteer.Page,
  walletMessages
): Promise<{playerAAddress: string; playerBAddress: string; channelId: string}> {
  //  Automatically deliver messageQueued message to opponent's wallet
  walletMessages.on(MessageType.PlayerAMessage, async message => {
    await pushMessage(walletB, (message as any).params);
  });
  walletMessages.on(MessageType.PlayerBMessage, async message => {
    await pushMessage(walletA, (message as any).params);
  });

  const playerAAddressPromise: Promise<any> = walletMessages.once(MessageType.PlayerAResult);
  const playerBAddressPromise: Promise<any> = walletMessages.once(MessageType.PlayerBResult);

  await sendGetWalletInformation(walletA);
  await sendGetWalletInformation(walletB);

  const playerAAddress = (await playerAAddressPromise).result;
  const playerBAddress = (await playerBAddressPromise).result;

  const createChannelPromise: Promise<any> = walletMessages.once(MessageType.PlayerAResult);
  await sendCreateChannel(walletA, playerAAddress, playerBAddress);
  const channelId = (await createChannelPromise).result.channelId;
  // Wait for the channel updated event before we attempt to join
  await walletMessages.once(MessageType.PlayerBNotification);

  const joinChannelPromise: Promise<any> = walletMessages.once(MessageType.PlayerBResult);
  await sendJoinChannel(walletB, channelId);
  await joinChannelPromise;

  await walletA.waitFor("button");
  await walletA.click("button");
  await walletB.waitFor("button");
  await walletB.click("button");

  await walletA.waitFor("button");
  await walletA.click("button");
  await walletB.waitFor("button");
  await walletB.click("button");
  return {playerAAddress, playerBAddress, channelId};
}
