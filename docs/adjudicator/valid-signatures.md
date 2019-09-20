---
id: valid-signatures
title: _validSignatures
---

Given an array of state hashes, checks the validity of the supplied signatures.

:::warning
Does not check the states to see if they form a chain of valid transitions.
:::

Internal call

```solidity
    function _validSignatures(
        uint256 largestTurnNum,
        address[] memory participants,
        bytes32[] memory stateHashes,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat // whoSignedWhat[i] is the index of the state in stateHashes that was signed by participants[i]
    ) internal pure returns (bool)
```

Each signature is a struct:

```solidity
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
```

### Requirements:

- There is a signature for each participant:
  - either on the hash of the state for which they are a mover
  - or on the hash of a state that appears after that state in the array

Some examples:

In the following examples, we will let `n` be the number of participants in the channel.
We format the signatures `sigs` as an array of signatures, where `sigs[i]` are signatures for states `states[i]`.

Use the notation that `si` represents a state with `turnNum = i` and `xi` is a signature of participant `i` on the corresponding state.

Example 1: Suppose that `n = 3`, `states = [s4, s5]` and `sigs = [[x1], [x0, x2]]`.

In order for signatures to be valid, we need that:

- Participant 2 has signed `s5`
- Participant 1 has signed `s4` or `s5`
- Participant 0 has signed `s4` or `s5` (as `s3` hasn't been provided)

So the signatures are valid in this case

---

## Implementation

Check the following

### 1. is `whoSignedWhat` acceptable?

- Let `m` be the number of states passed in
- Let `n` be the number of participants
- Require `whoSignedWhat.length == n` (Namely, there must be precisely one signature for each participant).
- For each `participant[i]`:
  - Calculate `offset = (largestTurnNum - i) % n`
  - If `offset >= m - 1` then they can sign any state
  - Else they should have signed state `m - 1 - offset` or higher

Example of whether `whoSignedWhat` is acceptable:

- Suppose: `m = 2`, `n = 3`, `largestTurnNum = 5`.
- `offset = [2, 1, 0]`
- so participant `[0, 1 ,2]` should have signed `[{0, 1}, {0, 1}, {1}]` respectively.
- so valid `whoSignedWhat`s are all combinations:

```
[0, 0, 1] => true
[1, 1, 1] => true
[1, 0, 1] => true
[0, 1, 1] => true
```

### 2. Did who actually sign what?

- For each i from `0 .. (n - 1)`:
  - Does `participants[i] == recoverSigner(stateHashes[whoSignedWhat[i]], sigs[i])`
