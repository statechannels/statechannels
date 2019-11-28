import puppeteer from "puppeteer";
import * as dappeteer from "dappeteer";
import Emittery from "emittery";

(async () => {
  // Unfortunately we need to use two separate windows
  // as otherwise the javascript gets paused on the non-selected tab
  const browserA = await dappeteer.launch(puppeteer, {
    headless: false,
    devtools: true,
    ignoreDefaultArgs: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding"
    ]
  });
  const browserB = await dappeteer.launch(puppeteer, {
    headless: false,
    devtools: true,
    ignoreDefaultArgs: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding"
    ]
  });

  const walletA = await browserA.newPage();
  const walletB = await browserB.newPage();

  const walletMessages = new Emittery();
  await loadWallet(walletA, m => messageHandler(walletMessages, "A", m));
  await loadWallet(walletB, m => messageHandler(walletMessages, "B", m));

  // Automatically deliver messageQueued message to opponent's wallet
  walletMessages.on("playerA-message", async message => {
    console.log("Delivering message from player A's wallet to player B's wallet");
    await pushMessage(walletB, (message as any).params);
  });
  walletMessages.on("playerB-message", async message => {
    console.log("Delivering message from player B's wallet to player A's wallet");
    await pushMessage(walletA, (message as any).params);
  });

  const playerAAddressPromise: Promise<any> = walletMessages.once("playerA-result");
  const playerBAddressPromise: Promise<any> = walletMessages.once("playerB-result");
  await sendGetAddress(walletA);
  await sendGetAddress(walletB);
  const playerAAddress = (await playerAAddressPromise).result;
  const playerBAddress = (await playerBAddressPromise).result;
  console.log("Player A address is ", playerAAddress);
  console.log("Player B address is ", playerBAddress);

  const createChannelPromise: Promise<any> = walletMessages.once("playerA-result");
  await sendCreateChannel(walletA, playerAAddress, playerBAddress);
  const channelId = (await createChannelPromise).result.channelId;
  console.log(`Player A has created channel ${channelId}`);

  const joinChannelPromise: Promise<any> = walletMessages.once("playerB-result");
  await sendJoinChannel(walletB, channelId);
  await joinChannelPromise;
  console.log(`Player B has joined channel ${channelId}`);

  await walletA.waitFor("button");
  await walletA.click("button");

  await walletB.waitFor("button");
  await walletB.click("button");
})();

function messageHandler(emitter: Emittery, player: "A" | "B", message) {
  const playerPrefix = `player${player}-`;
  if (message.id) {
    emitter.emit(`${playerPrefix}result`, message);
  } else if (message.method === "MessageQueued") {
    console.log(message);
    emitter.emit(`${playerPrefix}message`, message);
  } else {
    emitter.emit(`${playerPrefix}notification`, message);
  }
}
async function sendJoinChannel(page: puppeteer.Page, channelId: string) {
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

async function sendCreateChannel(page: puppeteer.Page, playerAAddress, playerBAddress) {
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

async function pushMessage(page: puppeteer.Page, message: any) {
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

async function sendGetAddress(page: puppeteer.Page) {
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

async function loadWallet(page: puppeteer.Page, messageListener: (message) => void) {
  await page.goto("http://localhost:3055/");
  await page.waitFor(3000); // Delay lets things load
  // interceptMessage gets called in puppeteer's context
  await page.exposeFunction("interceptMessage", message => {
    messageListener(message);
  });
  await page.evaluate(() => {
    // We override window.parent.postMessage with our interceptMesage
    (window as any).parent = {...window.parent, postMessage: (window as any).interceptMessage};
  });
  // Focus on our wallet page (since metamask grabs focus)
  await page.bringToFront();
}
