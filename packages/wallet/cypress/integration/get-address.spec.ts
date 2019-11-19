import Web3 from "web3";
import PrivateKeyProvider from "truffle-privatekey-provider";

describe("Get Address", () => {
  it("should generate an address for the user", () => {
    cy.visit("");
    // Inject web3 with a fake provider that just blindly signs
    cy.on("window:before:load", win => {
      const provider = new PrivateKeyProvider(
        "d631de5b7e9cf451135896c833187c8b4dc230bf47756a9a2ca4ffccc161175e",
        "http://localhost:8547"
      );
      (win as any).web3 = new Web3(provider);
      win.parent.addEventListener("message", console.log);
    });

    cy.wait(2000) // allow time for the wallet to start
      .window()
      .then(window => {
        const messageSpy = cy.spy(window, "postMessage").as("postMessage");
        const parentMessageSpy = cy.spy(window.parent, "postMessage").as("parentPostMessage");

        const message = {
          jsonrpc: "2.0",
          method: "GetAddress",
          id: 1,
          params: {}
        };

        window.postMessage(message, "*");

        chai.expect(messageSpy).to.be.calledWith(message);

        cy.wait(1000) // We need to wait for the wallet to send back a response
          .then(() => {
            const parentMessage = parentMessageSpy.getCalls()[0].args[0];

            chai.expect(parentMessage).to.include({
              jsonrpc: "2.0",
              id: 1
            });
            // Make sure the resulting address is a valid address
            chai.expect(parentMessage.result).to.match(/^0x[a-fA-F0-9]{40}$/);
          });
      });
  });
});
