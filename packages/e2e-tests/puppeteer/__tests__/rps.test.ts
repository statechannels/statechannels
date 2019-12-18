import {setUpBrowser, loadRPSApp} from "../helpers";
import {clickThroughRPSUI} from "../scripts/rps";
import {Page, Browser} from "puppeteer";

jest.setTimeout(60000);

describe("Playing a game of RPS", () => {
  let browserA: Browser;
  let browserB: Browser;
  let rpsTabA: Page;
  let rpsTabB: Page;

  beforeAll(async () => {
    browserA = await setUpBrowser(true);
    browserB = await setUpBrowser(true);

    rpsTabA = await browserA.newPage();
    rpsTabB = await browserB.newPage();

    await loadRPSApp(rpsTabA, 0);
    await loadRPSApp(rpsTabB, 1);
  });

  afterAll(async () => {
    if (browserA) {
      await browserA.close();
    }
    if (browserB) {
      await browserB.close();
    }
  });

  it("can play a game end to end", async () => {
    await clickThroughRPSUI(rpsTabA, rpsTabB);
    expect(await (await rpsTabA.waitFor("h1.mb-5")).evaluate(el => el.textContent)).toMatch(
      "You lost"
    );
    expect(await (await rpsTabB.waitFor("h1.mb-5")).evaluate(el => el.textContent)).toMatch(
      "You won!"
    );
  });
});
