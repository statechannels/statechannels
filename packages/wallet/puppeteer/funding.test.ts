import {loadWallet, setUpBrowser, pushMessage, sendGetAddress} from "./utils";
import Emittery from "emittery";
jest.setTimeout(60000);

describe("Funding", () => {
  let browserA;
  let browserB;
  let walletA;
  let walletB;
  let walletMessages;
  beforeAll(async () => {
    browserA = await setUpBrowser();
    browserB = await setUpBrowser();

    walletA = await browserA.newPage();
    walletB = await browserB.newPage();
    walletMessages = new Emittery();
    await loadWallet(walletA, m => messageHandler(walletMessages, "A", m));
    await loadWallet(walletB, m => messageHandler(walletMessages, "B", m));
    // Automatically deliver messageQueued message to opponent's wallet
    walletMessages.on("playerA-message", async message => {
      await pushMessage(walletB, (message as any).params);
    });
    walletMessages.on("playerB-message", async message => {
      await pushMessage(walletA, (message as any).params);
    });
  });

  afterAll(() => {
    if (browserA) {
      browserA.close();
    }
    if (browserB) {
      browserB.close();
    }
  });

  let playerAAddress;
  it("gets As address", async () => {
    const getAddressPromise: Promise<any> = walletMessages.once("playerA-result");
    await sendGetAddress(walletA);
    playerAAddress = (await getAddressPromise).result;
    expect(playerAAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  let playerBAddress;
  it("gets Bs address", async () => {
    const getAddressPromise: Promise<any> = walletMessages.once("playerB-result");
    await sendGetAddress(walletA);
    playerBAddress = (await getAddressPromise).result;
    expect(playerBAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

function messageHandler(emitter: Emittery, player: "A" | "B", message) {
  const playerPrefix = `player${player}-`;
  if (message.id) {
    emitter.emit(`${playerPrefix}result`, message);
  } else if (message.method === "MessageQueued") {
    emitter.emit(`${playerPrefix}message`, message);
  } else {
    emitter.emit(`${playerPrefix}notification`, message);
  }
}
