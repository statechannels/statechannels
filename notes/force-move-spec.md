# Force Move Spec

To serve as a succinct specification of the ForceMove protocol.
Everthing required for getting to an outcome.

Things have changed since the original paper.
Names have changed. Optimizations have been added.
This should serve as the definitive version over time.

Not a concrete specification.
Abstract notion of "the state of the channel".
Don't specify formats.
In methods, we provide the minimal required parameters.
In a concrete implementation, the parameters might change - for example it can be more efficient

## Off-chain state

| **Field**      | **Data type**          | **Definition / Explanation**                                                                         |
| :------------- | :--------------------- | :--------------------------------------------------------------------------------------------------- |
| ChainID        | `bytes32`              | e.g. ropsten / mainnet                                                                               |
| Participants   | `address[]`            | addresses of participants. Determines keys used to sign updates                                      |
| ChannelNonce   | `uint256`              | unique, to prevent replay attacks                                                                    |
| TurnNum        | `uint256`              | turn number                                                                                          |
| DefaultOutcome | `[address, uint256][]` | tracks the amounts paid out to each of a list of addresses if the channel is finalized in this state |
| isFinal        | `boolean`              |                                                                                                      |
| AppDefinition  | `address`              | on-chain address of library defining custom application rules                                        |
| AppData        | `bytes`                | application-specific data                                                                            |

### `turnNumRecord`

`turNumRecord` is the highest turn number that has been established on chain. Established here means being the turnNum of a state submitted to the chain in a transaction and either

- featuring in a valid n-chain (i.e. an ordered list of n states each signed by their respective participants, and such that each state in the list is a valid transition from its predecessor), or

- being the turn number of a single state signed by all `n` participants.

Note that a new valid n-chain may be implied by a single, signed state that is a validTransition from the final state of a previously established n-chain: and hence the `turnNumRecord` can be incremented by a `respond` transaction.

## On-chain state

- `turnNumRecord`
- `storedState`
- `finalizesAt`
- `challengerAddress`

### Channel Modes

- **Open** if `finalizesAt` is null
  - implies that `stateHash` and `challengerAddress` are also null
  - `turnNumRecord` could be null but might not be
- **Challenge** if `finalizesAt < currentTime`
  - implies that all other fields are not null
- **Finalized** if `finalizesAt >= currentTime`
  - implies that all other fields are not null

## Method behaviours

### ForceMove

Call:

`forceMove(State[] states, Signatures[] signatures, challengerSig)`

Notes:

Determine the channel from the `challengeState` (the final state in the array).

Requirements:

- States form a chain of valid transitions
- Channel is in the Open mode
- Signatures are valid for the states
- ChallengerSig is valid
- ChallengeTurnNum is greater than turnNumRecord

Effects:

- Sets turnNumRecord to the challengeTurnNum
- Sets finalizesAt to currentTime + challengeInterval
- Sets stateHash
- Sets challengerAddress

### Respond

Call:

`respond(State challengeState, State nextState, Signature nextStateSig)`

Notes:

Determine the channel from the `nextState`.

Requirements:

- challengeState matches stateHash
- challengeState to nextState is a valid transition
- channel is in Challenge mode

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)
- Increases the turnNumRecord by 1

### RespondFromAlternative

Call:

`respondFromAlternative(State[] states, Signatures[] signatures)`

Notes:

Determine the channel from the `responseState` (the final state in the array).

Requirements:

- States form a chain of valid transitions
- Channel is in the Challenge mode
- Signatures are valid for the states
- The responseState turnNum > turnNumRecord

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)
- Sets turnNumRecord to the turnNum of the responseState

### Refute

Call

`refute(State refutationState, Signature sig)`

Notes:

Determine the channel from the `refutationState` (the final state in the array).

Requirements:

- Channel is in the Challenge mode
- The refutationState's turnNum is greater than the turnNumRecord
- Sig is the challenger's signature on the refutationState

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)

### Conclude

Call

`conclude(States states, Signatures sigs)`

Notes:

Determine the channel from the `concludeState` (the first state in the array).

Requirements:

- Channel is in the Open mode or the Challenge mode
- First state is a conclude state
- States form a chain of valid transitions
- Signatures are valid for states

Effects:

- Sets finalizesAt to current time
- Sets challengeHash to the hash of the concludeState
- [Optionally] Clears turnNumRecord
- [Optionally] Clears challengerAddress

### SignaturesValid

Internal call

`_signaturesValid(States states, Signatures sigs)`

Requirements:

- There is a signature for each participant:
  - either on the state for which they are a mover
  - or on a state that appears after that state in the array

Some examples:

In the following examples, we will let `n` be the number of participants in the channel.
We format the signatures `sigs` as an array of arrays of signatures, where `sigs[i]` are signatures for states `states[i]`.
Use the notation that `si` represents a state with `turnNum = i` and `xi` is a signature of participant `i` on the corresponding state.

Example 1: Suppose that `n = 3`, `states = [s4, s5]` and `sigs = [[x1], [x0, x2]]`.

In order for signatures to be valid, we need that:

- Participant 2 has signed `s5`
- Participant 1 has signed `s4` or `s5`
- Participant 0 has signed `s4` or `s5` (as `s3` hasn't been provided)

So the signatures are valid in this case

### ValidTransition

Internal call

`validTransition(State a, State b)`

Requirements:

- b.turnNum == a.turnNum + 1
- b.participants == a.participants
- b.appDefinition == a.appDefinition
- if b.isFinal
  - b.defaultOutcome == a.defaultOutcome
- else if b.turnNum <= 2n
  - a.isFinal == False
  - b.defaultOutcome == a.defaultOutcome
  - b.appData == a.appData
- else
  - a.isFinal == False
  - b.app.validTransition(a, b)
