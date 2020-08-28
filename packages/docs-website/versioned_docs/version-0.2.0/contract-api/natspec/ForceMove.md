---
id: ForceMove
title: ForceMove.sol
original_id: ForceMove
---

View Source: [contracts/ForceMove.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/ForceMove.sol)

**↗ Extends: [IForceMove](IForceMove.md)**
**↘ Derived Contracts: [NitroAdjudicator](NitroAdjudicator.md), [TESTForceMove](TESTForceMove.md)**

An implementation of ForceMove protocol, which allows state channels to be adjudicated and finalized.

---

## Contract Members
**Constants & Variables**

```solidity
//public members
mapping(bytes32 => bytes32) public channelStorageHashes;

//internal members
bytes internal constant prefix;

```

## Events

```solidity
event ChallengeRegistered(bytes32 indexed channelId, uint256  turnNumRecord, uint256  finalizesAt, address  challenger, bool  isFinal, struct IForceMove.FixedPart  fixedPart, struct ForceMoveApp.VariablePart[]  variableParts, struct IForceMove.Signature[]  sigs, uint8[]  whoSignedWhat);
event ChallengeCleared(bytes32 indexed channelId, uint256  newTurnNumRecord);
event Concluded(bytes32 indexed channelId);
```

## Functions

- [getData](#getdata)
- [forceMove](#forcemove)
- [respond](#respond)
- [checkpoint](#checkpoint)
- [conclude](#conclude)
- [_requireChallengerIsParticipant](#_requirechallengerisparticipant)
- [_isAddressInArray](#_isaddressinarray)
- [_validSignatures](#_validsignatures)
- [_acceptableWhoSignedWhat](#_acceptablewhosignedwhat)
- [_recoverSigner](#_recoversigner)
- [_requireStateSupportedBy](#_requirestatesupportedby)
- [_requireValidTransitionChain](#_requirevalidtransitionchain)
- [_requireValidTransition](#_requirevalidtransition)
- [_bytesEqual](#_bytesequal)
- [_clearChallenge](#_clearchallenge)
- [_requireIncreasedTurnNumber](#_requireincreasedturnnumber)
- [_requireNonDecreasedTurnNumber](#_requirenondecreasedturnnumber)
- [_requireSpecificChallenge](#_requirespecificchallenge)
- [_requireOngoingChallenge](#_requireongoingchallenge)
- [_requireChannelNotFinalized](#_requirechannelnotfinalized)
- [_requireChannelFinalized](#_requirechannelfinalized)
- [_requireChannelOpen](#_requirechannelopen)
- [_requireMatchingStorage](#_requirematchingstorage)
- [_mode](#_mode)
- [_hashChannelStorage](#_hashchannelstorage)
- [_getData](#_getdata)
- [_matchesHash](#_matcheshash)
- [_hashState](#_hashstate)
- [_hashOutcome](#_hashoutcome)
- [_getChannelId](#_getchannelid)

---

### getData

Unpacks turnNumRecord, finalizesAt and fingerprint from the channelStorageHash of a particular channel.

```solidity
function getData(bytes32 channelId) public view
returns(turnNumRecord uint48, finalizesAt uint48, fingerprint uint160)
```

**Returns**

turnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 

### forceMove

Registers a challenge against a state channel. A challenge will either prompt another participant into clearing the challenge (via one of the other methods), or cause the channel to finalize at a specific time.

```solidity
function forceMove(struct IForceMove.FixedPart fixedPart, uint48 largestTurnNum, struct ForceMoveApp.VariablePart[] variableParts, uint8 isFinalCount, struct IForceMove.Signature[] sigs, uint8[] whoSignedWhat, struct IForceMove.Signature challengerSig) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| largestTurnNum | uint48 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| variableParts | struct ForceMoveApp.VariablePart[] | An ordered array of structs, each decribing the properties of the state channel that may change with each state update. | 
| isFinalCount | uint8 | Describes how many of the submitted states have the `isFinal` property set to `true`. It is implied that the rightmost `isFinalCount` states are final, and the rest are not final. | 
| sigs | struct IForceMove.Signature[] | An array of signatures that support the state with the `largestTurnNum`. | 
| whoSignedWhat | uint8[] | An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`. | 
| challengerSig | struct IForceMove.Signature | The signature of a participant on the keccak256 of the abi.encode of (supportedStateHash, 'forceMove'). | 

### respond

Repsonds to an ongoing challenge registered against a state channel.

```solidity
function respond(address challenger, bool[2] isFinalAB, struct IForceMove.FixedPart fixedPart, struct ForceMoveApp.VariablePart[2] variablePartAB, struct IForceMove.Signature sig) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| challenger | address | The address of the participant whom registered the challenge. | 
| isFinalAB | bool[2] | An pair of booleans describing if the challenge state and/or the response state have the `isFinal` property set to `true`. | 
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| variablePartAB | struct ForceMoveApp.VariablePart[2] | An pair of structs, each decribing the properties of the state channel that may change with each state update (for the challenge state and for the response state). | 
| sig | struct IForceMove.Signature | The responder's signature on the `responseStateHash`. | 

### checkpoint

Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.

```solidity
function checkpoint(struct IForceMove.FixedPart fixedPart, uint48 largestTurnNum, struct ForceMoveApp.VariablePart[] variableParts, uint8 isFinalCount, struct IForceMove.Signature[] sigs, uint8[] whoSignedWhat) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| largestTurnNum | uint48 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| variableParts | struct ForceMoveApp.VariablePart[] | An ordered array of structs, each decribing the properties of the state channel that may change with each state update. | 
| isFinalCount | uint8 | Describes how many of the submitted states have the `isFinal` property set to `true`. It is implied that the rightmost `isFinalCount` states are final, and the rest are not final. | 
| sigs | struct IForceMove.Signature[] | An array of signatures that support the state with the `largestTurnNum`. | 
| whoSignedWhat | uint8[] | An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`. | 

### conclude

Finalizes a channel by providing a finalization proof.

```solidity
function conclude(uint48 largestTurnNum, struct IForceMove.FixedPart fixedPart, bytes32 appPartHash, bytes32 outcomeHash, uint8 numStates, uint8[] whoSignedWhat, struct IForceMove.Signature[] sigs) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| largestTurnNum | uint48 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| appPartHash | bytes32 | The keccak256 of the abi.encode of `(challengeDuration, appDefinition, appData)`. Applies to all states in the finalization proof. | 
| outcomeHash | bytes32 | The keccak256 of the abi.encode of the `outcome`. Applies to all stats in the finalization proof. | 
| numStates | uint8 | The number of states in the finalization proof. | 
| whoSignedWhat | uint8[] | An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`. | 
| sigs | struct IForceMove.Signature[] | An array of signatures that support the state with the `largestTurnNum`. | 

### _requireChallengerIsParticipant

Checks that the challengerSignature was created by one of the supplied participants.

```solidity
function _requireChallengerIsParticipant(bytes32 supportedStateHash, address[] participants, struct IForceMove.Signature challengerSignature) internal pure
returns(challenger address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| supportedStateHash | bytes32 | Forms part of the digest to be signed, along with the string 'forceMove'. | 
| participants | address[] | A list of addresses representing the participants of a channel. | 
| challengerSignature | struct IForceMove.Signature | The signature of a participant on the keccak256 of the abi.encode of (supportedStateHash, 'forceMove'). | 

### _isAddressInArray

Tests whether a given address is in a given array of addresses.

```solidity
function _isAddressInArray(address suspect, address[] addresses) internal pure
returns(bool)
```

**Returns**

true if the address is in the array, false otherwise

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| suspect | address | A single address of interest. | 
| addresses | address[] | A line-up of possible perpetrators. | 

### _validSignatures

Given an array of state hashes, checks the validity of the supplied signatures. Valid means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.

```solidity
function _validSignatures(uint256 largestTurnNum, address[] participants, bytes32[] stateHashes, struct IForceMove.Signature[] sigs, uint8[] whoSignedWhat) internal pure
returns(bool)
```

**Returns**

true if the signatures are valid, false otherwise

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| largestTurnNum | uint256 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| participants | address[] | A list of addresses representing the participants of a channel. | 
| stateHashes | bytes32[] | Array of keccak256(State) submitted in support of a state, | 
| sigs | struct IForceMove.Signature[] | Array of Signatures, one for each participant | 
| whoSignedWhat | uint8[] | participant[i] signed stateHashes[whoSignedWhat[i]] | 

### _acceptableWhoSignedWhat

Given a declaration of which state in the support proof was signed by which participant, check if this declaration is acceptable. Acceptable means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.

```solidity
function _acceptableWhoSignedWhat(uint8[] whoSignedWhat, uint256 largestTurnNum, uint256 nParticipants, uint256 nStates) internal pure
returns(bool)
```

**Returns**

true if whoSignedWhat is acceptable, false otherwise

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| whoSignedWhat | uint8[] | participant[i] signed stateHashes[whoSignedWhat[i]] | 
| largestTurnNum | uint256 | Largest turnNum of the support proof | 
| nParticipants | uint256 | Number of participants in the channel | 
| nStates | uint256 | Number of states in the support proof | 

### _recoverSigner

Given a digest and ethereum digital signature, recover the signer

```solidity
function _recoverSigner(bytes32 _d, struct IForceMove.Signature sig) internal pure
returns(address)
```

**Returns**

signer

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _d | bytes32 | message digest | 
| sig | struct IForceMove.Signature | ethereum digital signature | 

### _requireStateSupportedBy

Check that the submitted data constitute a support proof.

```solidity
function _requireStateSupportedBy(uint256 largestTurnNum, struct ForceMoveApp.VariablePart[] variableParts, uint8 isFinalCount, bytes32 channelId, struct IForceMove.FixedPart fixedPart, struct IForceMove.Signature[] sigs, uint8[] whoSignedWhat) internal pure
returns(bytes32)
```

**Returns**

The hash of the latest state in the proof, if supported, else reverts.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| largestTurnNum | uint256 | Largest turnNum of the support proof | 
| variableParts | struct ForceMoveApp.VariablePart[] | Variable parts of the states in the support proof | 
| isFinalCount | uint8 | How many of the states are final? The final isFinalCount states are implied final, the remainder are implied not final. | 
| channelId | bytes32 | Unique identifier for a channel. | 
| fixedPart | struct IForceMove.FixedPart | Fixed Part of the states in the support proof | 
| sigs | struct IForceMove.Signature[] | A signature from each participant. | 
| whoSignedWhat | uint8[] | participant[i] signed stateHashes[whoSignedWhat[i]] | 

### _requireValidTransitionChain

Check that the submitted states form a chain of valid transitions

```solidity
function _requireValidTransitionChain(uint256 largestTurnNum, struct ForceMoveApp.VariablePart[] variableParts, uint8 isFinalCount, bytes32 channelId, struct IForceMove.FixedPart fixedPart) internal pure
returns(bytes32[])
```

**Returns**

true if every state is a validTransition from its predecessor, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| largestTurnNum | uint256 | Largest turnNum of the support proof | 
| variableParts | struct ForceMoveApp.VariablePart[] | Variable parts of the states in the support proof | 
| isFinalCount | uint8 | How many of the states are final? The final isFinalCount states are implied final, the remainder are implied not final. | 
| channelId | bytes32 | Unique identifier for a channel. | 
| fixedPart | struct IForceMove.FixedPart | Fixed Part of the states in the support proof | 

### _requireValidTransition

Check that the submitted pair of states form a valid transition

```solidity
function _requireValidTransition(uint256 nParticipants, bool[2] isFinalAB, struct ForceMoveApp.VariablePart[2] ab, uint256 turnNumB, address appDefinition) internal pure
returns(bool)
```

**Returns**

true if the later state is a validTransition from its predecessor, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| nParticipants | uint256 | Number of participants in the channel.
transition | 
| isFinalAB | bool[2] | Pair of booleans denoting whether the first and second state (resp.) are final. | 
| ab | struct ForceMoveApp.VariablePart[2] | Variable parts of each of the pair of states | 
| turnNumB | uint256 | turnNum of the later state of the pair. | 
| appDefinition | address | Address of deployed contract containing application-specific validTransition function. | 

### _bytesEqual

Check for equality of two byte strings

```solidity
function _bytesEqual(bytes left, bytes right) internal pure
returns(bool)
```

**Returns**

true if the bytes are identical, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| left | bytes | One bytes string | 
| right | bytes | The other bytes string | 

### _clearChallenge

Clears a challenge by updating the turnNumRecord and resetting the remaining channel storage fields, and emits a ChallengeCleared event.

```solidity
function _clearChallenge(bytes32 channelId, uint256 newTurnNumRecord) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 
| newTurnNumRecord | uint256 | New turnNumRecord to overwrite existing value | 

### _requireIncreasedTurnNumber

Checks that the submitted turnNumRecord is strictly greater than the turnNumRecord stored on chain.

```solidity
function _requireIncreasedTurnNumber(bytes32 channelId, uint48 newTurnNumRecord) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 
| newTurnNumRecord | uint48 | New turnNumRecord intended to overwrite existing value | 

### _requireNonDecreasedTurnNumber

Checks that the submitted turnNumRecord is greater than or equal to the turnNumRecord stored on chain.

```solidity
function _requireNonDecreasedTurnNumber(bytes32 channelId, uint48 newTurnNumRecord) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 
| newTurnNumRecord | uint48 | New turnNumRecord intended to overwrite existing value | 

### _requireSpecificChallenge

Checks that a given ChannelStorage struct matches the challenge stored on chain, and that the channel is in Challenge mode.

```solidity
function _requireSpecificChallenge(struct IForceMove.ChannelStorage cs, bytes32 channelId) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| cs | struct IForceMove.ChannelStorage | A given ChannelStorage data structure. | 
| channelId | bytes32 | Unique identifier for a channel. | 

### _requireOngoingChallenge

Checks that a given channel is in the Challenge mode.

```solidity
function _requireOngoingChallenge(bytes32 channelId) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 

### _requireChannelNotFinalized

Checks that a given channel is NOT in the Finalized mode.

```solidity
function _requireChannelNotFinalized(bytes32 channelId) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 

### _requireChannelFinalized

Checks that a given channel is in the Finalized mode.

```solidity
function _requireChannelFinalized(bytes32 channelId) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 

### _requireChannelOpen

Checks that a given channel is in the Open mode.

```solidity
function _requireChannelOpen(bytes32 channelId) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 

### _requireMatchingStorage

Checks that a given ChannelStorage struct matches the challenge stored on chain.

```solidity
function _requireMatchingStorage(struct IForceMove.ChannelStorage cs, bytes32 channelId) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| cs | struct IForceMove.ChannelStorage | A given ChannelStorage data structure. | 
| channelId | bytes32 | Unique identifier for a channel. | 

### _mode

Computes the ChannelMode for a given channelId.

```solidity
function _mode(bytes32 channelId) internal view
returns(enum IForceMove.ChannelMode)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 

### _hashChannelStorage

Hashes the input data and formats it for on chain storage.

```solidity
function _hashChannelStorage(struct IForceMove.ChannelStorage channelStorage) internal pure
returns(newHash bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelStorage | struct IForceMove.ChannelStorage | ChannelStorage data. | 

### _getData

Unpacks turnNumRecord, finalizesAt and fingerprint from the channelStorageHash of a particular channel.

```solidity
function _getData(bytes32 channelId) internal view
returns(turnNumRecord uint48, finalizesAt uint48, fingerprint uint160)
```

**Returns**

turnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 

### _matchesHash

Checks that a given ChannelStorage struct matches a supplied bytes32 when formatted for storage.

```solidity
function _matchesHash(struct IForceMove.ChannelStorage cs, bytes32 h) internal pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| cs | struct IForceMove.ChannelStorage | A given ChannelStorage data structure. | 
| h | bytes32 | Some data in on-chain storage format. | 

### _hashState

Computes the hash of the state corresponding to the input data.

```solidity
function _hashState(uint256 turnNum, bool isFinal, bytes32 channelId, struct IForceMove.FixedPart fixedPart, bytes appData, bytes32 outcomeHash) internal pure
returns(bytes32)
```

**Returns**

The stateHash

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| turnNum | uint256 | Turn number | 
| isFinal | bool | Is the state final? | 
| channelId | bytes32 | Unique identifier for the channel | 
| fixedPart | struct IForceMove.FixedPart | Part of the state that does not change | 
| appData | bytes | Application specific date | 
| outcomeHash | bytes32 | Hash of the outcome. | 

### _hashOutcome

Computes the hash of a given outcome.

```solidity
function _hashOutcome(bytes outcome) internal pure
returns(bytes32)
```

**Returns**

The outcomeHash

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| outcome | bytes | An outcome | 

### _getChannelId

Computes the unique id of a channel.

```solidity
function _getChannelId(struct IForceMove.FixedPart fixedPart) internal pure
returns(channelId bytes32)
```

**Returns**

channelId

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| fixedPart | struct IForceMove.FixedPart | Part of the state that does not change | 

