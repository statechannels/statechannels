type Proof = SignedState[];
type EmbeddedSupportProof = any;

type Peer = 'Alice' | 'Bob' | 'Irene';
type SignedState = {
  signedby(...peers: Peer[]): boolean;
  type: 'None' | 'A' | 'B' | 'AB';
  supportProof?: EmbeddedSupportProof;
};

/**
 * @param proof support proof of 1, 2 or 3 signed states
 * @returns boolean
 *
 * This is an implementation of a joint channel between three peers,
 * - Alice
 * - Bob
 * - Irene, the intermediary
 *
 * This allows these state transitions:
 *      AB
 *      ^^
 *     /  \
 *   A      B
 *   ^      ^
 *    \    /
 *     None
 *
 * In the happy path, peers doubly sign None states, which sets up an embedded app
 * channel X. Irene does not need to know anything about X.
 *
 * In the sad path, Alice & Bob can force a transition, providing a support proof for
 * the embedded app X. Alice does so by moving to an A state; Bob by moving to a B
 * state. The other peer is then allowed to force a transition to an AB state, allowing
 * them to provide a superior support proof for X.
 *
 * The support proof for X from the last state provided is used to update Alice & Bob's
 * outcome in the joint channel. Irene's balance should be invariant.
 */
export function validTransition(first: SignedState, second: SignedState): boolean {
  requireThat(first.type === 'None' || first.type === 'A' || first.type === 'B');
  if (first.type === 'None') {
    //
    requireThat(second.type === 'A' || second.type === 'B');
    if (second.type === 'A') {
      requireThat(first.signedby('Bob', 'Irene'));
      requireThat(second.signedby('Alice'));
    } else {
      requireThat(first.signedby('Alice', 'Irene'));
      requireThat(second.signedby('Bob'));
    }
  } else if (first.type === 'A') {
    // In this case, and the case below, we are unable to validate that Irene has signed _any_ state.
    // Therefore, the adjudicator needs to run some additional logic to validate that Irene signed _some_
    // state. Otherwise, Alice & Bob can collude to take Irene's money.

    // Even with the additional signature checking, validTransition seems less clear than validSupport.
    // Suppose we want to argue that disputes can last at most 3 challenges.
    // - With validTransition, we have to combine knowledge about signature checking and multiple invocations of
    //   validTransition to convince ourselves that
    //     - at most 3 disputes are possible
    //     - Irene must have signed off on _some_ state that recently preceded the most recently known state
    // - validSupport lays out the possible cases of signatures-on-states in the code itself
    requireThat(second.type === 'AB');
    requireThat(first.signedby('Alice'));
    requireThat(second.signedby('Bob'));
  } else if (first.type === 'B') {
    requireThat(second.type === 'AB');
    requireThat(first.signedby('Bob'));
    requireThat(second.signedby('Alice'));
  } else {
    revert('Unexpected type on first');
  }

  requireThat(validAppTransition(first, second));

  return true;
}

function validAppTransition(_first: SignedState, _second: SignedState): boolean {
  // Check that
  // - the embedded app's support proof is valid for both states
  // - the embeddeded turn number is larger in _second than in _first
  // - Irene's funds are invariant
  // - The channel's total funds are invariant.
  // - Alice & Bob's funds are updated according to outcome

  return true;
}

function requireThat(predicate: boolean): void {
  if (!predicate) revert('Revert');
}

function revert(reason: string): void {
  throw new Error(reason);
}
