## What is the role of the magmo channel wallet?
 
The magmo channel wallet is a piece of software that assists communication between an application and the other player's application in a state channel. In the same way that metamask is an interface to the blockchain, the magmo channel wallet (sometimes known as 'statestash') is in some ways an interface to the state channel itself, and allows the application to conform to the ForceMove protocol (and shortly, the turbo and nitro protocols).

It is responsible for signing, verifying and storing states that *could* be submitted to an adjudicator on chain. 

Ideally: the app knows nothing about the blockchain, or about how to sign or verify states; the wallet knows nothing about how to construct the states appropriate to any particular app. 

The wallet is a general purpose state signer and verifier for any state channel supported by ForceMove. It holds information that persists across multiple apps and multiple channels. 

In RPS and TTT, there are a number of points in the user flow where the wallet is necessary. This document aims to specify where these are and how the app should interact with the wallet. 

The wallet is now its own mini-application. It has its own front end views/components, its own redux machinery (states, actions, reducers) as well as its own sagas. It is served in an iFrame of the parent app. Communication between app and wallet is achieved via pasing messages between the iframe and the parent window. 

### Signing the states
The following diagram gives an idea of how the wallet interacts with our game apps.

![Wallet connectivity](./wallet_connectivity.png)

The app talks to the wallet, which signs states and returns them to the app, which broadcasts them. In the reverse direction, the app gobbles up messages from firebase, decodes them, and passes them to the wallet to verify.




