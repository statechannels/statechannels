---
id: TESTForceMove
title: TESTForceMove.sol
---

View Source: [contracts/test/TESTForceMove.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/test/TESTForceMove.sol)

**↗ Extends: [ForceMove](ForceMove.md)**

This contract extends the ForceMove contract to enable it to be more easily unit-tested. It exposes public or external functions that set storage variables or wrap otherwise internal functions. It should not be deployed in a production environment.

---

## Functions

- [isAddressInArray](#isaddressinarray)
- [validSignatures](#validsignatures)
- [acceptableWhoSignedWhat](#acceptablewhosignedwhat)
- [recoverSigner](#recoversigner)
- [setChannelStorage](#setchannelstorage)
- [setChannelStorageHash](#setchannelstoragehash)
- [hashChannelStorage](#hashchannelstorage)
- [matchesHash](#matcheshash)
- [requireChannelOpen](#requirechannelopen)

---

### isAddressInArray

Wrapper for otherwise internal function. Tests whether a given address is in a given array of addresses.

```solidity
function isAddressInArray(address suspect, address[] addresses) public pure
returns(bool)
```

**Returns**

true if the address is in the array, false otherwise

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| suspect | address | A single address of interest. | 
| addresses | address[] | A line-up of possible perpetrators. | 

### validSignatures

Wrapper for otherwise internal function. Given an array of state hashes, checks the validity of the supplied signatures. Valid means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.

```solidity
function validSignatures(uint256 largestTurnNum, address[] participants, bytes32[] stateHashes, struct IForceMove.Signature[] sigs, uint8[] whoSignedWhat) public pure
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

### acceptableWhoSignedWhat

Wrapper for otherwise internal function. Given a declaration of which state in the support proof was signed by which participant, check if this declaration is acceptable. Acceptable means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.

```solidity
function acceptableWhoSignedWhat(uint8[] whoSignedWhat, uint256 largestTurnNum, uint256 nParticipants, uint256 nStates) public pure
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

### recoverSigner

Wrapper for otherwise internal function. Given a digest and digital signature, recover the signer

```solidity
function recoverSigner(bytes32 _d, struct IForceMove.Signature sig) public pure
returns(address)
```

**Returns**

signer

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _d | bytes32 | message digest | 
| sig | struct IForceMove.Signature | ethereum digital signature | 

### setChannelStorage

Manually set the channelStorageHash for a given channelId.  Shortcuts the public methods (ONLY USE IN A TESTING ENVIRONMENT).

```solidity
function setChannelStorage(bytes32 channelId, struct IForceMove.ChannelStorage channelStorage) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| channelStorage | struct IForceMove.ChannelStorage | The channelStorage to be hashed and stored against the channelId | 

### setChannelStorageHash

Manually set the channelStorageHash for a given channelId.  Shortcuts the public methods (ONLY USE IN A TESTING ENVIRONMENT).

```solidity
function setChannelStorageHash(bytes32 channelId, bytes32 h) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| h | bytes32 | The channelStorageHash to store against the channelId | 

### hashChannelStorage

Wrapper for otherwise internal function. Hashes the input data and formats it for on chain storage.

```solidity
function hashChannelStorage(struct IForceMove.ChannelStorage channelStorage) public pure
returns(newHash bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelStorage | struct IForceMove.ChannelStorage | ChannelStorage data. | 

### matchesHash

Wrapper for otherwise internal function. Checks that a given ChannelStorage struct matches a supplied bytes32 when formatted for storage.

```solidity
function matchesHash(struct IForceMove.ChannelStorage cs, bytes32 h) public pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| cs | struct IForceMove.ChannelStorage | A given ChannelStorage data structure. | 
| h | bytes32 | Some data in on-chain storage format. | 

### requireChannelOpen

Wrapper for otherwise internal function. Checks that a given channel is in the Challenge mode.

```solidity
function requireChannelOpen(bytes32 channelId) public view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a channel. | 

