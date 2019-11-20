import _ from "lodash";

// Creates a promise that resolves when window.parent.postMessage is called with the expected message.
// Returns all messages sent to window.parent.postMessage since the promise was created
export function createParentPostMessagePromise(
  window: any,
  messageToWaitFor: {id: number} | {method: string}
) {
  // Reset the stub to if it's already defined
  if (typeof window.parent.postMessage.restore === "function") {
    window.parent.postMessage.restore();
  }

  const messages = [];

  return new Cypress.Promise(resolve => {
    cy.stub(window.parent, "postMessage").callsFake(postMessage => {
      messages.push(postMessage);
      if (_.isMatch(postMessage, messageToWaitFor)) {
        resolve(messages);
      }
    });
  });
}
