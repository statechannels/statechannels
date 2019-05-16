# Force-move Games: Core

This package contains the contracts and js libraries for the core of the force-move games
framework.

The core provides the format of the states that are exchanged and the rules that govern the interpretation of these states.

## Test contracts

Some contracts we use are libraries -- namely, `State`, `Rules`, and `CountingState` (in testing).
Libraries are meant to be included in contracts, and not called externally.
For reference, see [some remarks](https://github.com/ethereum/solidity/issues/3409#issuecomment-359169193) by the Solidity team.

In spite of this, Solidity compiles library contracts that return structs, and produces a proper abi for external/pure functions. (It does not, however, produce a proper abi when an enum is used in a library.)

```
struct Foo {
    uint256 bar;
    uint256 baz;
}
// an invalid function in a library. Solidity produces the correct abi
function(Foo memory foo) public pure return s(uint, uint) {
    return (foo.bar, foo.baz);
}

contract SampleContract {
    enum Foo {Bar, Baz};
    // an invalid function in a library. Solidity produces the incorrect abi, which has
    // the type "SampleContract.Foo" as the type of the input `foo`.
    function(Foo foo) public pure returns (uint8) {
        return uint8(foo);
    }
}
```

However, external calls to these functions raise a runtime error.
Therefore, to test a library `SomeLibrary` function `foo`, we define a test contract that imports `Library.sol`, and delegates `foo` to `Library`.
