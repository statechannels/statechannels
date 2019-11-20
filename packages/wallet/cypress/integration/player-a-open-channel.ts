import Web3 from "web3";
import PrivateKeyProvider from "truffle-privatekey-provider";
import * as ethers from "ethers";

const playerA = ethers.Wallet.createRandom();
const playerB = ethers.Wallet.createRandom();
const playerBFakeWallet = ethers.Wallet.createRandom();
// TODO: Probably a better way of referencing this
let walletWindow;

// Creates a promise that resolves when window.parent.postMessage is called by the wallet
function createParentPostMessagePromise(window: any) {
  // Reset the stub to if it's already defined
  if (typeof window.parent.postMessage.restore === "function") {
    window.parent.postMessage.restore();
  }

  return new Cypress.Promise(resolve => {
    cy.stub(window.parent, "postMessage").callsFake(postMessage => {
      resolve(postMessage);
    });
  });
}

describe("Open channel", () => {
  it(" shoud open a channel", () => {
    cy.visit("");
    // Inject web3 with a fake provider that just blindly signs
    cy.on("window:before:load", win => {
      const provider = new PrivateKeyProvider(playerA.privateKey.slice(2), "http://localhost:8547");
      (win as any).web3 = new Web3(provider);
    });

    cy.wait(2000) // allow time for the wallet to start
      .window()
      .then(window => {
        walletWindow = window;
      })
      .then(() => {
        const postMessagePromise = createParentPostMessagePromise(walletWindow);

        const message = {
          jsonrpc: "2.0",
          method: "GetAddress",
          id: 1,
          params: {}
        };

        walletWindow.postMessage(message, "*");

        return postMessagePromise;
      })
      .then((parentMessage: any) => {
        chai.expect(parentMessage).to.include({
          jsonrpc: "2.0",
          id: 1
        });
        // Make sure the resulting address is a valid address
        chai.expect(parentMessage.result).to.match(/^0x[a-fA-F0-9]{40}$/);
        return parentMessage.result;
      })
      .then(walletAddress => {
        const postMessagePromise = createParentPostMessagePromise(walletWindow);
        // TODO: Move this into a fixture
        const participants = [
          {
            participantId: "user-a",
            signingAddress: walletAddress,
            destination: playerA.address
          },
          {
            participantId: "user-b",
            signingAddress: playerBFakeWallet.address,
            destination: playerB.address
          }
        ];
        const allocations = [
          {
            token: "0x0",
            allocationItems: [
              {destination: playerA.address, amount: "0x1"},
              {destination: playerB.address, amount: "0x1"}
            ]
          }
        ];
        const requestMessage = {
          jsonrpc: "2.0",
          method: "CreateChannel",
          id: 1,
          params: {
            participants,
            allocations,
            appDefinition: ethers.constants.AddressZero,
            appData: "0x0"
          }
        };

        walletWindow.postMessage(requestMessage, "*");
        return postMessagePromise;
      })
      .then(postMessage => {
        chai.expect(postMessage).to.not.equal(undefined);
      });
  });
});
