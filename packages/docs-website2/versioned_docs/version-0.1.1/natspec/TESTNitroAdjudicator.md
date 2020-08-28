---
id: TESTNitroAdjudicator
title: TESTNitroAdjudicator.sol
---

View Source: [contracts/test/TESTNitroAdjudicator.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/test/TESTNitroAdjudicator.sol)

**↗ Extends: [NitroAdjudicator](NitroAdjudicator.md)**

This contract extends the NitroAdjudicator contract to enable it to be more easily unit-tested. It exposes public or external functions that set storage variables or wrap otherwise internal functions. It should not be deployed in a production environment.

---

## Functions

- [isAddressInArray](#isaddressinarray)
- [validSignatures](#validsignatures)
- [acceptableWhoSignedWhat](#acceptablewhosignedwhat)
- [recoverSigner](#recoversigner)
- [setChannelStorage](#setchannelstorage)
- [setChannelStorageHash](#setchannelstoragehash)

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
function validSignatures(uint48 largestTurnNum, address[] participants, bytes32[] stateHashes, struct IForceMove.Signature[] sigs, uint8[] whoSignedWhat) public pure
returns(bool)
```

**Returns**

true if the signatures are valid, false otherwise

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| largestTurnNum | uint48 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| participants | address[] | A list of addresses representing the participants of a channel. | 
| stateHashes | bytes32[] | Array of keccak256(State) submitted in support of a state, | 
| sigs | struct IForceMove.Signature[] | Array of Signatures, one for each participant | 
| whoSignedWhat | uint8[] | participant[i] signed stateHashes[whoSignedWhat[i]] | 

### acceptableWhoSignedWhat

Wrapper for otherwise internal function. Given a declaration of which state in the support proof was signed by which participant, check if this declaration is acceptable. Acceptable means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.

```solidity
function acceptableWhoSignedWhat(uint8[] whoSignedWhat, uint48 largestTurnNum, uint256 nParticipants, uint256 nStates) public pure
returns(bool)
```

**Returns**

true if whoSignedWhat is acceptable, false otherwise

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| whoSignedWhat | uint8[] | participant[i] signed stateHashes[whoSignedWhat[i]] | 
| largestTurnNum | uint48 | Largest turnNum of the support proof | 
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

Manually set the channelStorageHashes for a given channelId.  Shortcuts the public methods (ONLY USE IN A TESTING ENVIRONMENT).

```solidity
function setChannelStorage(bytes32 channelId, struct IForceMove.ChannelData channelData) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| channelData | struct IForceMove.ChannelData | The channelData to be hashed and stored against the channelId | 

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

