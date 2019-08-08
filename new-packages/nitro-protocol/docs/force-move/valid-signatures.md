---
id: valid-signatures
title: Valid Signatures
---

Every state has an associated 'mover' - the participant who had the unique ability to progress the channel at the point the state was created.
The mover can be calculated from the `turnNum` and the `particiants` as follows:

```
moverAddress = partipants[turnNum % participants.length]
```

The implication of this formula is that participants take it in turn to update the state of the channel.

As we will see in the method definitions later, in order for the chain to accept a channel state, `s`, that channel state must be _supported_ by `n` signatures (where `n = participants.length`).
The simplest way for this to accomplish this is to provide a sequence of `n` states terminating is state `s`, where each state is signed by its mover and each consecutive pair of states form a valid transition.

ForceMove also allows an optimization where a state can be supported by `n` signatures on a sequence of `m < n` states, provided each participant has provided a signature on a state later in the sequence than the state for which they were the mover.
In the extreme, this allows a single state signed by all `n` parties to be accepted by the chain.

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

---

## Implemntation

Checking signatures is likely to be a signification part of the logic. Here's a potential algorithm:

1. Let `nStates` be the number of states in the `states` array.
   - Note that we assume that it has already been determined that these states form a chain of valid transitions and therefore must have incrementing turn numbers.
2. Assume that `Signatures` takes the format of an array of length `nStates` where each element is an array of signatures on the corresponding state i.e. `sigs[i]` is an array of signatures on state `states[i]`.
   - Note that it's possible for `states[i]` to be empty for some `i`.
3. Let `nParticipants` be the number of participants.
   - Note that we should have that `nStates <= nParticipants` and that the total number of signatures provided should be equal to `nParticipants`
4. Let `hasSigned` be a boolean array of length `m` initialized to `false`.
5. Let `maxTurnNum = states[states.length - 1].turnNum`.
6. For `i = nStates - 1; i >= 0; i++`:
   1. For `j = 0; j < signatures[i].length; j++`:
      1. Determine that `signatures[i][j]` is a valid signature for some participant on state `states[i]`. Let `p` be the index of this participant in the channel's particpants array.
      1. Set the bit `hasSigned[(p - maxTurnNum - 1) % n]`.
   2. Fail unless `hasSigned[i - nStates + nParticipants]` is set.
7. Fail unless `hasSigned[0..(nParticipants - nStates - 1)]` are all set.
8. Return true

**Can we optimize this further by changing the way states / sigs are passed in?** For example passing the arrays in last-state-first might help.
