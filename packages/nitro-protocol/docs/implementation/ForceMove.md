---
id: ForceMove
title: ForceMove
---

The ForceMove contract allows state channels to be adjudicated and finalized.

***
## Functions:
- [`getData`](#getData)
- [`forceMove`](#forceMove)
- [`respond`](#respond)
- [`refute`](#refute)
- [`checkpoint`](#checkpoint)
- [`conclude`](#conclude)
- [`_requireThatChallengerIsParticipant`](#_requireThatChallengerIsParticipant)
- [`_isAddressInArray`](#_isAddressInArray)
- [`_validSignatures`](#_validSignatures)
- [`_acceptableWhoSignedWhat`](#_acceptableWhoSignedWhat)
- [`_recoverSigner`](#_recoverSigner)
- [`_requireStateSupportedBy`](#_requireStateSupportedBy)
- [`_requireValidTransition`](#_requireValidTransition)
- [`_requireValidTransition`](#_requireValidTransition)
- [`_bytesEqual`](#_bytesEqual)
- [`_clearChallenge`](#_clearChallenge)
- [`_requireChannelOpen`](#_requireChannelOpen)
- [`_requireMatchingStorage`](#_requireMatchingStorage)
- [`_requireIncreasedTurnNumber`](#_requireIncreasedTurnNumber)
- [`_requireNonDecreasedTurnNumber`](#_requireNonDecreasedTurnNumber)
- [`_requireSpecificChallenge`](#_requireSpecificChallenge)
- [`_requireOngoingChallenge`](#_requireOngoingChallenge)
- [`_requireChannelNotFinalized`](#_requireChannelNotFinalized)
- [`_hashChannelStorage`](#_hashChannelStorage)
- [`_getData`](#_getData)
- [`_matchesHash`](#_matchesHash)
- [`_hashState`](#_hashState)
- [`_hashOutcome`](#_hashOutcome)
- [`_getChannelId`](#_getChannelId)
***
<a id=getData />
## `getData`

Retrieves data stored against a channelId, parses it into `finalizesAt`, `turnNumRecord` and `fingerprint`. Calls internal method _getData.

#### Parameters:
- `channelId`: Unique identifier for a state channel


#### Returns:
- `uint48 finalizesAt, uint48 turnNumRecord, uint160 fingerprint`

<a id=forceMove />
## `forceMove`

Registers a challenge against a state channel. A challenge will either prompt another participant into clearing the challenge (via one of the other methods), or cause the channel to finalize at a specific time.

#### Parameters:
- `fixedPart`: Data describing properties of the state channel that do not change with state updates.

- `largestTurnNum`: The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.

- `variableParts`: An ordered array of structs, each decribing the properties of the state channel that may change with each state update.

- `isFinalCount`: Describes how many of the submitted states have the `isFinal` property set to `true`. It is implied that the rightmost `isFinalCount` states are final, and the rest are not final.

- `sigs`: An array of signatures that support the state with the `largestTurnNum`.

- `whoSignedWhat`: An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.

- `challengerSig`: The signature of a participant on the keccak256 of the abi.encode of (supportedStateHash, 'forceMove').


<a id=respond />
## `respond`

Repsonds to an ongoing challenge registered against a state channel.

#### Parameters:
- `challenger`: The address of the participant whom registered the challenge.

- `isFinalAB`: An pair of booleans describing if the challenge state and/or the response state have the `isFinal` property set to `true`.

- `fixedPart`: Data describing properties of the state channel that do not change with state updates.

- `variablePartAB`: An pair of structs, each decribing the properties of the state channel that may change with each state update (for the challenge state and for the response state).

- `sig`: The responder's signature on the `responseStateHash`.


<a id=refute />
## `refute`

Clears an ongoing challenge by proving the challenger signed a later state (henceforth refutation state).

#### Parameters:
- `refutationStateTurnNum`: The turn number of the refutation state.

- `challenger`: The address of the participant whom registered the challenge.

- `isFinalAB`: An pair of booleans describing if the challenge state and/or the response state have the `isFinal` property set to `true`.

- `fixedPart`: Data describing properties of the state channel that do not change with state updates.

- `variablePartAB`: An pair of structs, each decribing the properties of the state channel that may change with each state update (for the challenge state and for the refutation state).

- `refutationStateSig`: The refuter's signature on the `responseStateHash`.


<a id=checkpoint />
## `checkpoint`

Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.

#### Parameters:
- `fixedPart`: Data describing properties of the state channel that do not change with state updates.

- `largestTurnNum`: The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.

- `variableParts`: An ordered array of structs, each decribing the properties of the state channel that may change with each state update.

- `isFinalCount`: Describes how many of the submitted states have the `isFinal` property set to `true`. It is implied that the rightmost `isFinalCount` states are final, and the rest are not final.

- `sigs`: An array of signatures that support the state with the `largestTurnNum`.

- `whoSignedWhat`: An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.


<a id=conclude />
## `conclude`

Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.

#### Parameters:
- `largestTurnNum`: The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.

- `fixedPart`: Data describing properties of the state channel that do not change with state updates.

- `appPartHash`: The keccak256 of the abi.encode of `(challengeDuration, appDefinition, appData)`. Applies to all states in the finalization proof.

- `outcomeHash`: The keccak256 of the abi.encode of the `outcome`. Applies to all stats in the finalization proof.

- `whoSignedWhat`: An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.

- `sigs`: An array of signatures that support the state with the `largestTurnNum`.


<a id=_requireThatChallengerIsParticipant />
## `_requireThatChallengerIsParticipant`

No description


#### Returns:
- `address challenger`

<a id=_isAddressInArray />
## `_isAddressInArray`

No description


#### Returns:
- `bool`

<a id=_validSignatures />
## `_validSignatures`

No description


#### Returns:
- `bool`

<a id=_acceptableWhoSignedWhat />
## `_acceptableWhoSignedWhat`

No description


#### Returns:
- `bool`

<a id=_recoverSigner />
## `_recoverSigner`

No description


#### Returns:
- `address`

<a id=_requireStateSupportedBy />
## `_requireStateSupportedBy`

No description


#### Returns:
- `bytes32`

<a id=_requireValidTransition />
## `_requireValidTransition`

No description


#### Returns:
- `bytes32[]`

<a id=_requireValidTransition />
## `_requireValidTransition`

No description


#### Returns:
- `bool`

<a id=_bytesEqual />
## `_bytesEqual`

No description


#### Returns:
- `bool`

<a id=_clearChallenge />
## `_clearChallenge`

No description



<a id=_requireChannelOpen />
## `_requireChannelOpen`

No description



<a id=_requireMatchingStorage />
## `_requireMatchingStorage`

No description



<a id=_requireIncreasedTurnNumber />
## `_requireIncreasedTurnNumber`

No description



<a id=_requireNonDecreasedTurnNumber />
## `_requireNonDecreasedTurnNumber`

No description



<a id=_requireSpecificChallenge />
## `_requireSpecificChallenge`

No description



<a id=_requireOngoingChallenge />
## `_requireOngoingChallenge`

No description



<a id=_requireChannelNotFinalized />
## `_requireChannelNotFinalized`

No description



<a id=_hashChannelStorage />
## `_hashChannelStorage`

No description


#### Returns:
- `bytes32 newHash`

<a id=_getData />
## `_getData`

No description


#### Returns:
- `uint48 turnNumRecord, uint48 finalizesAt, uint160 fingerprint`

<a id=_matchesHash />
## `_matchesHash`

No description


#### Returns:
- `bool`

<a id=_hashState />
## `_hashState`

No description


#### Returns:
- `bytes32`

<a id=_hashOutcome />
## `_hashOutcome`

No description


#### Returns:
- `bytes32`

<a id=_getChannelId />
## `_getChannelId`

No description


#### Returns:
- `bytes32 channelId`


***
## Events:
- [`ChallengeRegistered`](#ChallengeRegistered)
- [`ChallengeCleared`](#ChallengeCleared)
- [`Concluded`](#Concluded)
***
<a id=ChallengeRegistered />
## `ChallengeRegistered`
Indicates that a challenge has been registered against `channelId`.

#### Parameters:
- `channelId`: Unique identifier for a state channel.

- `turnNumRecord`: A turnNum that (the adjudicator knows) is supported by a signature from each participant.

- `finalizesAt`: The unix timestamp when `channelId` will finalize.

- `challenger`: The address of the participant whom registered the challenge.

- `isFinal`: Boolean denoting whether the challenge state is final.

- `fixedPart`: Data describing properties of the state channel that do not change with state updates.

- `variableParts`: An ordered array of structs, each decribing the properties of the state channel that may change with each state update.

<a id=ChallengeCleared />
## `ChallengeCleared`
Indicates that a challenge, previously registered against `channelId`, has been cleared.

#### Parameters:
- `channelId`: Unique identifier for a state channel.

- `newTurnNumRecord`: A turnNum that (the adjudicator knows) is supported by a signature from each participant.

<a id=Concluded />
## `Concluded`
Indicates that a challenge has been registered against `channelId`.

#### Parameters:
- `channelId`: Unique identifier for a state channel.

