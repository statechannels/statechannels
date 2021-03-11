## More detail on responsibilities
### 1. Do not lose secrets
Store them in a database. 

### 2. Do not leak secrets
Minimise time spent in memory.

### 3. Store relevant states
Accept states from counterparties through wire messages.
In the extreme (“ideal” case), keep every state ever signed or received.
In practice, garbage collect "old" states (should only need ~`nParticipants` states per channel), by tracking `validTransition` relationships between them. 

### 4. Do not sign states or transactions without permission
Restrict ability to sign (with private keys) to responsibilities 5,8,9,10.

### 5. Exit on chain with permission
An approved `CloseChannel` objective may trigger a blockchain transactions such as `conclude`, `pushOutcome`, `transfer`, etc.

### 6. Detect challenges
The chain watcher component of the wallet will bind to a blockchain provider’s events, filter on a list of interesting channels, and inform the app of any challenges. 

Triggers objective cranking.

### 7. Detect funding changes
The chain watcher component of the wallet will bind to a blockchain provider’s events, filter on a list of interesting channels, and inform the app of any `Deposited` and `AllocationUpdated` events. A view or cache of the funding tree, which also depends on all off-chain state, should be stored in the db. 

Triggers objective cranking.

### 8. Sign updates in application channels
The API method `updateChannel` should be respected and treated as an explicit instruction. Funds may be “lost” (The App just bought a coffee).

Does not trigger objective cranking: in fact only possible if the channel is not owned by an objective.

### 9. Fund channels on chain
An approved  `OpenChannel` objective may trigger  a `deposit` blockchain transaction.

### 10. Update ledger channels
An approved objective may trigger updates to non-application channels. The implicit permission granted only covers updates that will not lose The App money.

Q: should explicit updates to ledger channels be blocked?
