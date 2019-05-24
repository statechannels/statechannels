# Application Protocol

**[Home](../../../../notes/index.md)**

The purpose of this protocol is to manage the application's commitments.

It should be triggered by the `INITIALIZE_CHANNEL` event from the app.
This prepares an address to be used to sign application commitments.

It should never fail.

## State machine

The protocol is implemented with the following state machine.

```mermaid
graph TD
linkStyle default interpolate basis
  S((start)) --> AK(AddressKnown)
  AK-->|WALLET.APPLICATION.COMMITMENT_RECEIVED|O(Ongoing)
  O-->|WALLET.APPLICATION.COMMITMENT_RECEIVED|O(Ongoing)
  AK-->|WALLET.APPLICATION.CONCLUDE_REQUESTED|Su((success))
  O-->|WALLET.APPLICATION.CONCLUDE_REQUESTED|Su((success))
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S logic;
  class Su Success;
  class F Failure;
  class C WaitForChildProtocol;
```

Notes:

- `COMMITMENT_RECEIVED` is shorthand for either `OWN_COMMITMENT_RECEIVED` or `OPPONENT_COMMITMENT_RECEIVED`
- `CONCLUDE_REQUESTED` should get triggered when a conclude is requested. This means that the application protocol no longer needs to listen for commitments from the app.
- The application protocol is responsible for sending out signature and validation messages.
