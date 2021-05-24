### Benchmarking strategy

We want to have deterministic benchmark tests that always see a consistent blockchain state and do not interfere with each other.

To achieve that, we spin up a local ganache instance once before each test file runs. We tear it down after each test file runs. Test are run with `maxConcurrency = 1`. For maximum efficiency, you should therefore run tests in a single file to prevent having to restart ganache.

After each test _case_, we revert the blockchain to a snapshot. That snapshot just contains deployed contracts, and has mined no other transactions.
