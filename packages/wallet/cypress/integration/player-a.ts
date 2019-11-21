import Web3 from "web3";
import PrivateKeyProvider from "truffle-privatekey-provider";
import * as ethers from "ethers";
import {SignedState} from "@statechannels/nitro-protocol";
import _ from "lodash";
import {signState} from "@statechannels/nitro-protocol/lib/src/signatures";
import {createParentPostMessagePromise} from "../helpers";
const playerA = ethers.Wallet.createRandom();
const playerB = ethers.Wallet.createRandom();
const playerBFakeWallet = ethers.Wallet.createRandom();

// TODO: Probably a better way of referencing this
let walletWindow;

describe("Player A", () => {
  it(" should open a channel", () => {
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
        const postMessagePromise = createParentPostMessagePromise(walletWindow, {id: 1});

        const message = {
          jsonrpc: "2.0",
          method: "GetAddress",
          id: 1,
          params: {}
        };

        walletWindow.postMessage(message, "*");

        return postMessagePromise;
      })
      .then((parentMessages: any) => {
        chai.expect(parentMessages[0]).to.include({
          jsonrpc: "2.0",
          id: 1
        });
        // Make sure the resulting address is a valid address
        chai.expect(parentMessages[0].result).to.match(/^0x[a-fA-F0-9]{40}$/);
        return parentMessages[0].result;
      })
      .then(walletAddress => {
        const postMessagePromise = createParentPostMessagePromise(walletWindow, {
          method: "MessageQueued"
        });

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
          id: 2,
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
      .then((parentMessages: any[]) => {
        const resultMessage = parentMessages.find(m => m.id === 2);
        expect(resultMessage).to.not.equal(undefined);
        chai.expect(resultMessage.result).to.include({
          appData: "0x0",
          appDefinition: "0x0000000000000000000000000000000000000000",
          turnNum: 0
        });

        const notification = parentMessages.find(m => m.method === "MessageQueued");
        expect(notification).to.not.equal(undefined);

        return notification.params.data;
      })
      .then((messageData: {signedState: SignedState}) => {
        // TODO: Pass player's b state into our wallet
        const playerBState = {...messageData.signedState.state, turnNum: 1};
        const signedPlayerBState = signState(playerBState, playerBFakeWallet.privateKey);
        expect(signedPlayerBState).to.not.equal(undefined);
      });
  });
});
