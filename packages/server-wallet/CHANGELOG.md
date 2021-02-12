# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.22.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.21.0...@statechannels/server-wallet@1.22.0) (2021-02-12)


### Bug Fixes

* correctly wire up finalizesAt parameter for channelFinalized wallet API ([e3adc1d](https://github.com/statechannels/statechannels/commit/e3adc1d51d9c0eaa8deb7bbcc25f763f27c0e1f6))
* do not add to new objectives ([b7431e5](https://github.com/statechannels/statechannels/commit/b7431e53af7af21421b91aca98f64720d9c4c9a2))
* do not assume that a ledger channel is directly funded ([370a0a9](https://github.com/statechannels/statechannels/commit/370a0a918f86dff9f36f569b6aa2a5a3b0cba2bd))
* emit objectiveStarted on pushMessage ([51e3019](https://github.com/statechannels/statechannels/commit/51e301987a331b85552432aba8face40f5cdabd6))
* multi-threaded wallet re-emits events that worker-wallet emitted ([1bce47a](https://github.com/statechannels/statechannels/commit/1bce47af9fddec360da91005ea013b98d77cb393))
* MultiThreadedWallet errors when passed a single-threaded config ([f62221a](https://github.com/statechannels/statechannels/commit/f62221a3cd851b27ad5c7f7c3f529714644c1543))


### Features

* wallet exposes a sync objectives method ([40d1c14](https://github.com/statechannels/statechannels/commit/40d1c14961c91cd82a1c0791cf1752208bc93ae0))
* worker threads include threadId in log statements ([787f84c](https://github.com/statechannels/statechannels/commit/787f84cf3f4d0a993ed30d9c8f6012a77f86afdc))





# [1.21.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.14.1...@statechannels/server-wallet@1.21.0) (2021-02-11)


### Bug Fixes

* a finalized channel is incorrectly added back to the list after subscribers are notified ([296ad5a](https://github.com/statechannels/statechannels/commit/296ad5af9873cbf5eda7bdc44b8cab0ff7c54ce8))
* add a constraint to chain_service_requests table, fix down migraion ([7aef458](https://github.com/statechannels/statechannels/commit/7aef458328a9461ff7743011665fabd195f78abd))
* add automatic pessimistic syncing for ledger proposals and state updated ([ddaf3e3](https://github.com/statechannels/statechannels/commit/ddaf3e3ec9af83c346b0d173673f4e49edd8c44a))
* add challenge to ChainModifierInterface ([b2769b6](https://github.com/statechannels/statechannels/commit/b2769b6343f113aa773438f15fda956612580713))
* add default value of empty array to chainServiceRequests ([d68d998](https://github.com/statechannels/statechannels/commit/d68d99839f256a6ddb8c63e2654a801620256752))
* add DismissLedgerProposals action to handle case where merged outcome is no different ([ff17d55](https://github.com/statechannels/statechannels/commit/ff17d558286a2332a643aec48cc39fb0eb833d3f))
* add id column prop ([b3f6bd2](https://github.com/statechannels/statechannels/commit/b3f6bd2e7fafd05b6e4bc3f3956279b2ef1292a9))
* add missing address ([fc78143](https://github.com/statechannels/statechannels/commit/fc781432ac7b1fd037fe3231d3d0832984469b89))
* add nonce to channel proposals to handle out-of-sync / adverse network situations ([9f79bc4](https://github.com/statechannels/statechannels/commit/9f79bc4a556703f3cf40c3f44fba3f0d6c28ae8e))
* add ProposeLedger output for GetChannel calls for ledger channels ([62565db](https://github.com/statechannels/statechannels/commit/62565dbe216c7fbcdeea8a6815bbcaa926eaeb4b))
* allow empty password string ([abb67d9](https://github.com/statechannels/statechannels/commit/abb67d98ca733021e049b9f948379727c1a414e7))
* await concludeAndWithdraw transaction submission ([5758a3c](https://github.com/statechannels/statechannels/commit/5758a3ca8e09894a5dd04ad341fe7c3f772665ee))
* await fundChannel chain service request ([56ef79e](https://github.com/statechannels/statechannels/commit/56ef79ecd54a59a4fed2f4dd1b4fd65c164e15ac))
* await pushOutcomeAndWithdraw transaction sumbission ([d7252fc](https://github.com/statechannels/statechannels/commit/d7252fcd6a5caa8e8b1cc7ba89bca5a295f4963a))
* call register channel on start up ([7e19ab8](https://github.com/statechannels/statechannels/commit/7e19ab888083d772a46c93f048abc0d0eb4ce050))
* chain service correctly emits the channelFinalized event ([ce9e03f](https://github.com/statechannels/statechannels/commit/ce9e03f72245725b5436f2db7d4f37919510de4a))
* check channelNonce during state transition ([fdcb53b](https://github.com/statechannels/statechannels/commit/fdcb53b0228bb6b2a40bca404a2f3c84588e6ea9))
* check for existing chain request ([0ce7bf5](https://github.com/statechannels/statechannels/commit/0ce7bf523f7554636bec32495f8acad6219abdfc))
* clean up a race conditions with finalizing channels ([de161d0](https://github.com/statechannels/statechannels/commit/de161d02c55d9389fe4fc381554c92d7f0c78c41))
* convert ChainService constructor to accept config object ([fd1fcce](https://github.com/statechannels/statechannels/commit/fd1fcce1a581b6a60e1686e078dfb02870ba3d2b))
* disable failing expect with comment for now ([3c8feb0](https://github.com/statechannels/statechannels/commit/3c8feb079ccd1720ec572ae6587b3f549348cad0))
* do not export schema ([a06105e](https://github.com/statechannels/statechannels/commit/a06105e357fc8b037b952af9580159c6b411042e))
* do not progress close channel objective unless it does not fund any other channels ([d3d5826](https://github.com/statechannels/statechannels/commit/d3d58266e85032a0faa7ca55199af8be3a0c1a3a))
* eliminate a race condition in updateTransferredOut ([41b8c70](https://github.com/statechannels/statechannels/commit/41b8c700b9f63afdd4df7d55a3052cda129d1cf2))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/statechannels/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* ensure syncChannel works for two phase ledger commitments ([5259723](https://github.com/statechannels/statechannels/commit/525972343939b04529ff3cc4baf9be0d2922adb8))
* export everything from wallet ([b4c9429](https://github.com/statechannels/statechannels/commit/b4c94290910554807730c2c5ca576b57f1e82a1b))
* export SingleThreadedWallet class from pkg ([8d20dd8](https://github.com/statechannels/statechannels/commit/8d20dd88d2363325d6865107d4a1d8b117ff4708))
* extract didn't handle DefundChannel ([704c0b1](https://github.com/statechannels/statechannels/commit/704c0b1aa63cd1d2c899163d60977bc900a02e67))
* fix broken test ([9132f98](https://github.com/statechannels/statechannels/commit/9132f98652af593b871b678509411ae3743548e9))
* fix chain tests ([3519315](https://github.com/statechannels/statechannels/commit/35193150dced8f5c3cd2730325a6a7412eb1cda1))
* fix merge issue ([ac314ae](https://github.com/statechannels/statechannels/commit/ac314ae24555722dc430adc0868cf5c804e22f1d))
* fix table name ([1e71d25](https://github.com/statechannels/statechannels/commit/1e71d25db197fe7bee6ef9f6728fa62ff9f0915e))
* fix test failure ([95dc2cf](https://github.com/statechannels/statechannels/commit/95dc2cf5071f7b523602ddbad6d9bb821ae98036))
* make participants a required property ([86ea421](https://github.com/statechannels/statechannels/commit/86ea421552045b837906383ef04c51c76f41bbf1))
* move expect extension ([562deb4](https://github.com/statechannels/statechannels/commit/562deb4261bbdb9a7c12615e13ad87fe024fd6cf))
* move TokenArtifact to TestContractArtifacts ([d236f6f](https://github.com/statechannels/statechannels/commit/d236f6ff7bb44aecde2a10312cd5a2f730fa42c7))
* only add channel if not already in queue ([13f6bdc](https://github.com/statechannels/statechannels/commit/13f6bdc066e8443288d491f76bc03524cc7fb8d6))
* only log if a logger exists ([d6d3c77](https://github.com/statechannels/statechannels/commit/d6d3c77d6279bc7f711b0d6ecb9568881e9fb667))
* only register active channels ([06b4556](https://github.com/statechannels/statechannels/commit/06b4556e0a13a8c4c4e5af76c289ca9e761c746f))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/statechannels/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* pushOutcomeAndWithdraw to ChainModifierInterface ([a3765f3](https://github.com/statechannels/statechannels/commit/a3765f3dcaf4d0b356c459b0195695f91070e952))
* remove env vars config ([f9289bb](https://github.com/statechannels/statechannels/commit/f9289bb0cddb0e6ef72376b9961b3b154638d958))
* remove required chainServiceRequests property from Channel model and fix tests ([d20eae8](https://github.com/statechannels/statechannels/commit/d20eae80ce48dc53d013cecba95036ce6a28b846))
* remove stale comment ([139f4be](https://github.com/statechannels/statechannels/commit/139f4be77e73c8e7bda91dfc428dca1ef021ccc5))
* remove unneeded await ([c2db964](https://github.com/statechannels/statechannels/commit/c2db964993a5e49c22cda2693da99e23d2559325))
* remove unneeded type conversion ([d753b8d](https://github.com/statechannels/statechannels/commit/d753b8d3027e56a3378f7bff252b87a18c1e508d))
* return finalizesAt on challenge active ([2a878cc](https://github.com/statechannels/statechannels/commit/2a878ccdf92f84b68ec3825fcc38ec9c570a6ff6))
* set chain id ([d1877c8](https://github.com/statechannels/statechannels/commit/d1877c868d9c091b66dca8ccc35373062b720a04))
* simply logic by removing status ([3a9fdf5](https://github.com/statechannels/statechannels/commit/3a9fdf5ba2b80bc3f1772448650413a3b546fb86))
* standardize chain service public method logging ([10c4d75](https://github.com/statechannels/statechannels/commit/10c4d751fb4211d267d3f33cb445d137434f90c7))
* support fake funding in directFundingStatus ([6b1c2d7](https://github.com/statechannels/statechannels/commit/6b1c2d76960823e835971dc4f2b12c4803c47293))
* update wallet response to use queuedMessages over outbox property for queued ledger proposal ([2c6fd25](https://github.com/statechannels/statechannels/commit/2c6fd25d567938f61ad0b93461339ddfc0797350))
* use ?? instead of || for defaulting blockConfirmation ([94aaf0f](https://github.com/statechannels/statechannels/commit/94aaf0fa2b7f5bd7af4166351c614f125eff7953))
* use distinct database names ([57894fb](https://github.com/statechannels/statechannels/commit/57894fbe8c82f2d845af929a73b6a53afc3fc5b7))
* use pqueue to avoid onBlockMined race condition ([cd52339](https://github.com/statechannels/statechannels/commit/cd523397821c5e1852e02cbe946a7c8e9e259a6a))
* use raw NULL for commit column ([1bc1a77](https://github.com/statechannels/statechannels/commit/1bc1a774a55891affcccaaf3d5252a49903f324e))
* user separate address for test adjudicator ([e837eaa](https://github.com/statechannels/statechannels/commit/e837eaa661bb1c3814bd3188f3fa6753cc03d4e5))
* validate metrics ([2e6fc84](https://github.com/statechannels/statechannels/commit/2e6fc841e4a13cd4c8705e094d49bb1ad20f8f03))
* wait for all updateTransferredOut before taking actions ([e3eb6ca](https://github.com/statechannels/statechannels/commit/e3eb6caf4a39f5b0a00157537cd6d8a30be6ca21))


### Features

* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/statechannels/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add API method for fetching objective ([8db0905](https://github.com/statechannels/statechannels/commit/8db0905db4a5fcdd5445a7bb42c43266d48dd9d4))
* add chain transactions table ([4819b87](https://github.com/statechannels/statechannels/commit/4819b87667b4c05b843c0033a3b988f9cc697493))
* add pushUpdate for messages updating a single, running app channel ([1a04384](https://github.com/statechannels/statechannels/commit/1a043848c1457ff7d854bf256252c59d9515dbc1))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/statechannels/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* basic config validation ([a971ccd](https://github.com/statechannels/statechannels/commit/a971ccd492a09a5b2e29d6fb9602d4ab31c57890))
* call challenge with initial support state ([eb3c85c](https://github.com/statechannels/statechannels/commit/eb3c85cfdcb4a5df1ef91d9f8177f482ea4b327a))
* check channel finalization ([f2786ce](https://github.com/statechannels/statechannels/commit/f2786ce9afd0abf2888ea2b7a9fbaa5744ac2b37))
* defaultTestConfig is now a function ([365651b](https://github.com/statechannels/statechannels/commit/365651b0df58ae30b11e7ac07cf98d5d59473c2c))
* Defund Channel Protocol ([#3133](https://github.com/statechannels/statechannels/issues/3133)) ([8e7ba80](https://github.com/statechannels/statechannels/commit/8e7ba808578f498debeea874730846697ecf6edf))
* draft implementation of finalized event logic ([7e96d8f](https://github.com/statechannels/statechannels/commit/7e96d8fb8dd1c9d7a052cbb3268a91e1b37eeacf))
* handle finalized event ([7ff04d0](https://github.com/statechannels/statechannels/commit/7ff04d0ad3cb36d6d213ae5a0c7cd69d7f3e6dc9))
* implement challenge status ([92002ad](https://github.com/statechannels/statechannels/commit/92002ad3849a4e877dfc55dfb184a836c432f7d4))
* multi-threaded wallet offloads pushUpdate to workers ([4891263](https://github.com/statechannels/statechannels/commit/489126323ec82bab4e2f5283d76c97200aeffbe7))
* new objectives are returned in ChannelResults ([#3246](https://github.com/statechannels/statechannels/issues/3246)) ([9ca60fd](https://github.com/statechannels/statechannels/commit/9ca60fdaf99196348aec8651a89349dd22d294fa))
* remove no-op warmUpThreads method ([#3210](https://github.com/statechannels/statechannels/issues/3210)) ([5099a10](https://github.com/statechannels/statechannels/commit/5099a103047ff31fa1b4025235c1b557fab6dc13))
* replace AssetTransferred with AllocationUpdated event ([#3074](https://github.com/statechannels/statechannels/issues/3074)) ([bef8424](https://github.com/statechannels/statechannels/commit/bef8424605e7bb956d7bdc971ac4eae1628f6bfb))
* require challenge duration ([ca92e6c](https://github.com/statechannels/statechannels/commit/ca92e6c6e0b2e019686ff1caf54f452f6e096fe5))
* store challenge state ([#3127](https://github.com/statechannels/statechannels/issues/3127)) ([7268ac1](https://github.com/statechannels/statechannels/commit/7268ac1f088b0ecaba8014cc5fa467533c7bb1c5))
* use holdings to determine if pushed ([e4fc09c](https://github.com/statechannels/statechannels/commit/e4fc09c88284d15ccf8c6df224a8c001488de6cb))
* Wallet emits 'objectiveStarted' & 'objectiveSucceeded' events ([#3243](https://github.com/statechannels/statechannels/issues/3243)) ([22d9c07](https://github.com/statechannels/statechannels/commit/22d9c072d5e99c158434e5c5a9e3737c17d6a2c4)), closes [#3247](https://github.com/statechannels/statechannels/issues/3247)


### Performance Improvements

* remove O(n^2) behaviour from mergeOutgoing ([3836ed2](https://github.com/statechannels/statechannels/commit/3836ed2562d994fc2246e93beccc4e6977f2f2e8))





# [1.20.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.14.1...@statechannels/server-wallet@1.20.0) (2021-02-05)


### Bug Fixes

* a finalized channel is incorrectly added back to the list after subscribers are notified ([296ad5a](https://github.com/statechannels/statechannels/commit/296ad5af9873cbf5eda7bdc44b8cab0ff7c54ce8))
* add a constraint to chain_service_requests table, fix down migraion ([7aef458](https://github.com/statechannels/statechannels/commit/7aef458328a9461ff7743011665fabd195f78abd))
* add automatic pessimistic syncing for ledger proposals and state updated ([ddaf3e3](https://github.com/statechannels/statechannels/commit/ddaf3e3ec9af83c346b0d173673f4e49edd8c44a))
* add challenge to ChainModifierInterface ([b2769b6](https://github.com/statechannels/statechannels/commit/b2769b6343f113aa773438f15fda956612580713))
* add default value of empty array to chainServiceRequests ([d68d998](https://github.com/statechannels/statechannels/commit/d68d99839f256a6ddb8c63e2654a801620256752))
* add DismissLedgerProposals action to handle case where merged outcome is no different ([ff17d55](https://github.com/statechannels/statechannels/commit/ff17d558286a2332a643aec48cc39fb0eb833d3f))
* add id column prop ([b3f6bd2](https://github.com/statechannels/statechannels/commit/b3f6bd2e7fafd05b6e4bc3f3956279b2ef1292a9))
* add missing address ([fc78143](https://github.com/statechannels/statechannels/commit/fc781432ac7b1fd037fe3231d3d0832984469b89))
* add nonce to channel proposals to handle out-of-sync / adverse network situations ([9f79bc4](https://github.com/statechannels/statechannels/commit/9f79bc4a556703f3cf40c3f44fba3f0d6c28ae8e))
* add ProposeLedger output for GetChannel calls for ledger channels ([62565db](https://github.com/statechannels/statechannels/commit/62565dbe216c7fbcdeea8a6815bbcaa926eaeb4b))
* allow empty password string ([abb67d9](https://github.com/statechannels/statechannels/commit/abb67d98ca733021e049b9f948379727c1a414e7))
* await concludeAndWithdraw transaction submission ([5758a3c](https://github.com/statechannels/statechannels/commit/5758a3ca8e09894a5dd04ad341fe7c3f772665ee))
* await fundChannel chain service request ([56ef79e](https://github.com/statechannels/statechannels/commit/56ef79ecd54a59a4fed2f4dd1b4fd65c164e15ac))
* await pushOutcomeAndWithdraw transaction sumbission ([d7252fc](https://github.com/statechannels/statechannels/commit/d7252fcd6a5caa8e8b1cc7ba89bca5a295f4963a))
* call register channel on start up ([7e19ab8](https://github.com/statechannels/statechannels/commit/7e19ab888083d772a46c93f048abc0d0eb4ce050))
* chain service correctly emits the channelFinalized event ([ce9e03f](https://github.com/statechannels/statechannels/commit/ce9e03f72245725b5436f2db7d4f37919510de4a))
* check channelNonce during state transition ([fdcb53b](https://github.com/statechannels/statechannels/commit/fdcb53b0228bb6b2a40bca404a2f3c84588e6ea9))
* check for existing chain request ([0ce7bf5](https://github.com/statechannels/statechannels/commit/0ce7bf523f7554636bec32495f8acad6219abdfc))
* clean up a race conditions with finalizing channels ([de161d0](https://github.com/statechannels/statechannels/commit/de161d02c55d9389fe4fc381554c92d7f0c78c41))
* convert ChainService constructor to accept config object ([fd1fcce](https://github.com/statechannels/statechannels/commit/fd1fcce1a581b6a60e1686e078dfb02870ba3d2b))
* disable failing expect with comment for now ([3c8feb0](https://github.com/statechannels/statechannels/commit/3c8feb079ccd1720ec572ae6587b3f549348cad0))
* do not export schema ([a06105e](https://github.com/statechannels/statechannels/commit/a06105e357fc8b037b952af9580159c6b411042e))
* do not progress close channel objective unless it does not fund any other channels ([d3d5826](https://github.com/statechannels/statechannels/commit/d3d58266e85032a0faa7ca55199af8be3a0c1a3a))
* eliminate a race condition in updateTransferredOut ([41b8c70](https://github.com/statechannels/statechannels/commit/41b8c700b9f63afdd4df7d55a3052cda129d1cf2))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/statechannels/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* ensure syncChannel works for two phase ledger commitments ([5259723](https://github.com/statechannels/statechannels/commit/525972343939b04529ff3cc4baf9be0d2922adb8))
* export everything from wallet ([b4c9429](https://github.com/statechannels/statechannels/commit/b4c94290910554807730c2c5ca576b57f1e82a1b))
* export SingleThreadedWallet class from pkg ([8d20dd8](https://github.com/statechannels/statechannels/commit/8d20dd88d2363325d6865107d4a1d8b117ff4708))
* extract didn't handle DefundChannel ([704c0b1](https://github.com/statechannels/statechannels/commit/704c0b1aa63cd1d2c899163d60977bc900a02e67))
* fix broken test ([9132f98](https://github.com/statechannels/statechannels/commit/9132f98652af593b871b678509411ae3743548e9))
* fix chain tests ([3519315](https://github.com/statechannels/statechannels/commit/35193150dced8f5c3cd2730325a6a7412eb1cda1))
* fix merge issue ([ac314ae](https://github.com/statechannels/statechannels/commit/ac314ae24555722dc430adc0868cf5c804e22f1d))
* fix table name ([1e71d25](https://github.com/statechannels/statechannels/commit/1e71d25db197fe7bee6ef9f6728fa62ff9f0915e))
* fix test failure ([95dc2cf](https://github.com/statechannels/statechannels/commit/95dc2cf5071f7b523602ddbad6d9bb821ae98036))
* make participants a required property ([86ea421](https://github.com/statechannels/statechannels/commit/86ea421552045b837906383ef04c51c76f41bbf1))
* move expect extension ([562deb4](https://github.com/statechannels/statechannels/commit/562deb4261bbdb9a7c12615e13ad87fe024fd6cf))
* move TokenArtifact to TestContractArtifacts ([d236f6f](https://github.com/statechannels/statechannels/commit/d236f6ff7bb44aecde2a10312cd5a2f730fa42c7))
* only add channel if not already in queue ([13f6bdc](https://github.com/statechannels/statechannels/commit/13f6bdc066e8443288d491f76bc03524cc7fb8d6))
* only log if a logger exists ([d6d3c77](https://github.com/statechannels/statechannels/commit/d6d3c77d6279bc7f711b0d6ecb9568881e9fb667))
* only register active channels ([06b4556](https://github.com/statechannels/statechannels/commit/06b4556e0a13a8c4c4e5af76c289ca9e761c746f))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/statechannels/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* pushOutcomeAndWithdraw to ChainModifierInterface ([a3765f3](https://github.com/statechannels/statechannels/commit/a3765f3dcaf4d0b356c459b0195695f91070e952))
* remove env vars config ([f9289bb](https://github.com/statechannels/statechannels/commit/f9289bb0cddb0e6ef72376b9961b3b154638d958))
* remove required chainServiceRequests property from Channel model and fix tests ([d20eae8](https://github.com/statechannels/statechannels/commit/d20eae80ce48dc53d013cecba95036ce6a28b846))
* remove stale comment ([139f4be](https://github.com/statechannels/statechannels/commit/139f4be77e73c8e7bda91dfc428dca1ef021ccc5))
* remove unneeded await ([c2db964](https://github.com/statechannels/statechannels/commit/c2db964993a5e49c22cda2693da99e23d2559325))
* remove unneeded type conversion ([d753b8d](https://github.com/statechannels/statechannels/commit/d753b8d3027e56a3378f7bff252b87a18c1e508d))
* return finalizesAt on challenge active ([2a878cc](https://github.com/statechannels/statechannels/commit/2a878ccdf92f84b68ec3825fcc38ec9c570a6ff6))
* set chain id ([d1877c8](https://github.com/statechannels/statechannels/commit/d1877c868d9c091b66dca8ccc35373062b720a04))
* simply logic by removing status ([3a9fdf5](https://github.com/statechannels/statechannels/commit/3a9fdf5ba2b80bc3f1772448650413a3b546fb86))
* standardize chain service public method logging ([10c4d75](https://github.com/statechannels/statechannels/commit/10c4d751fb4211d267d3f33cb445d137434f90c7))
* support fake funding in directFundingStatus ([6b1c2d7](https://github.com/statechannels/statechannels/commit/6b1c2d76960823e835971dc4f2b12c4803c47293))
* update wallet response to use queuedMessages over outbox property for queued ledger proposal ([2c6fd25](https://github.com/statechannels/statechannels/commit/2c6fd25d567938f61ad0b93461339ddfc0797350))
* use ?? instead of || for defaulting blockConfirmation ([94aaf0f](https://github.com/statechannels/statechannels/commit/94aaf0fa2b7f5bd7af4166351c614f125eff7953))
* use distinct database names ([57894fb](https://github.com/statechannels/statechannels/commit/57894fbe8c82f2d845af929a73b6a53afc3fc5b7))
* use pqueue to avoid onBlockMined race condition ([cd52339](https://github.com/statechannels/statechannels/commit/cd523397821c5e1852e02cbe946a7c8e9e259a6a))
* use raw NULL for commit column ([1bc1a77](https://github.com/statechannels/statechannels/commit/1bc1a774a55891affcccaaf3d5252a49903f324e))
* user separate address for test adjudicator ([e837eaa](https://github.com/statechannels/statechannels/commit/e837eaa661bb1c3814bd3188f3fa6753cc03d4e5))
* validate metrics ([2e6fc84](https://github.com/statechannels/statechannels/commit/2e6fc841e4a13cd4c8705e094d49bb1ad20f8f03))
* wait for all updateTransferredOut before taking actions ([e3eb6ca](https://github.com/statechannels/statechannels/commit/e3eb6caf4a39f5b0a00157537cd6d8a30be6ca21))


### Features

* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/statechannels/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add chain transactions table ([4819b87](https://github.com/statechannels/statechannels/commit/4819b87667b4c05b843c0033a3b988f9cc697493))
* add pushUpdate for messages updating a single, running app channel ([1a04384](https://github.com/statechannels/statechannels/commit/1a043848c1457ff7d854bf256252c59d9515dbc1))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/statechannels/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* basic config validation ([a971ccd](https://github.com/statechannels/statechannels/commit/a971ccd492a09a5b2e29d6fb9602d4ab31c57890))
* call challenge with initial support state ([eb3c85c](https://github.com/statechannels/statechannels/commit/eb3c85cfdcb4a5df1ef91d9f8177f482ea4b327a))
* check channel finalization ([f2786ce](https://github.com/statechannels/statechannels/commit/f2786ce9afd0abf2888ea2b7a9fbaa5744ac2b37))
* defaultTestConfig is now a function ([365651b](https://github.com/statechannels/statechannels/commit/365651b0df58ae30b11e7ac07cf98d5d59473c2c))
* Defund Channel Protocol ([#3133](https://github.com/statechannels/statechannels/issues/3133)) ([8e7ba80](https://github.com/statechannels/statechannels/commit/8e7ba808578f498debeea874730846697ecf6edf))
* draft implementation of finalized event logic ([7e96d8f](https://github.com/statechannels/statechannels/commit/7e96d8fb8dd1c9d7a052cbb3268a91e1b37eeacf))
* handle finalized event ([7ff04d0](https://github.com/statechannels/statechannels/commit/7ff04d0ad3cb36d6d213ae5a0c7cd69d7f3e6dc9))
* implement challenge status ([92002ad](https://github.com/statechannels/statechannels/commit/92002ad3849a4e877dfc55dfb184a836c432f7d4))
* multi-threaded wallet offloads pushUpdate to workers ([4891263](https://github.com/statechannels/statechannels/commit/489126323ec82bab4e2f5283d76c97200aeffbe7))
* new objectives are returned in ChannelResults ([#3246](https://github.com/statechannels/statechannels/issues/3246)) ([9ca60fd](https://github.com/statechannels/statechannels/commit/9ca60fdaf99196348aec8651a89349dd22d294fa))
* remove no-op warmUpThreads method ([#3210](https://github.com/statechannels/statechannels/issues/3210)) ([5099a10](https://github.com/statechannels/statechannels/commit/5099a103047ff31fa1b4025235c1b557fab6dc13))
* replace AssetTransferred with AllocationUpdated event ([#3074](https://github.com/statechannels/statechannels/issues/3074)) ([bef8424](https://github.com/statechannels/statechannels/commit/bef8424605e7bb956d7bdc971ac4eae1628f6bfb))
* require challenge duration ([ca92e6c](https://github.com/statechannels/statechannels/commit/ca92e6c6e0b2e019686ff1caf54f452f6e096fe5))
* store challenge state ([#3127](https://github.com/statechannels/statechannels/issues/3127)) ([7268ac1](https://github.com/statechannels/statechannels/commit/7268ac1f088b0ecaba8014cc5fa467533c7bb1c5))
* use holdings to determine if pushed ([e4fc09c](https://github.com/statechannels/statechannels/commit/e4fc09c88284d15ccf8c6df224a8c001488de6cb))
* Wallet emits 'objectiveStarted' & 'objectiveSucceeded' events ([#3243](https://github.com/statechannels/statechannels/issues/3243)) ([22d9c07](https://github.com/statechannels/statechannels/commit/22d9c072d5e99c158434e5c5a9e3737c17d6a2c4)), closes [#3247](https://github.com/statechannels/statechannels/issues/3247)


### Performance Improvements

* remove O(n^2) behaviour from mergeOutgoing ([3836ed2](https://github.com/statechannels/statechannels/commit/3836ed2562d994fc2246e93beccc4e6977f2f2e8))





# [1.19.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.14.1...@statechannels/server-wallet@1.19.0) (2021-01-26)


### Bug Fixes

* a finalized channel is incorrectly added back to the list after subscribers are notified ([296ad5a](https://github.com/statechannels/statechannels/commit/296ad5af9873cbf5eda7bdc44b8cab0ff7c54ce8))
* add a constraint to chain_service_requests table, fix down migraion ([7aef458](https://github.com/statechannels/statechannels/commit/7aef458328a9461ff7743011665fabd195f78abd))
* add automatic pessimistic syncing for ledger proposals and state updated ([ddaf3e3](https://github.com/statechannels/statechannels/commit/ddaf3e3ec9af83c346b0d173673f4e49edd8c44a))
* add challenge to ChainModifierInterface ([b2769b6](https://github.com/statechannels/statechannels/commit/b2769b6343f113aa773438f15fda956612580713))
* add default value of empty array to chainServiceRequests ([d68d998](https://github.com/statechannels/statechannels/commit/d68d99839f256a6ddb8c63e2654a801620256752))
* add DismissLedgerProposals action to handle case where merged outcome is no different ([ff17d55](https://github.com/statechannels/statechannels/commit/ff17d558286a2332a643aec48cc39fb0eb833d3f))
* add id column prop ([b3f6bd2](https://github.com/statechannels/statechannels/commit/b3f6bd2e7fafd05b6e4bc3f3956279b2ef1292a9))
* add missing address ([fc78143](https://github.com/statechannels/statechannels/commit/fc781432ac7b1fd037fe3231d3d0832984469b89))
* add nonce to channel proposals to handle out-of-sync / adverse network situations ([9f79bc4](https://github.com/statechannels/statechannels/commit/9f79bc4a556703f3cf40c3f44fba3f0d6c28ae8e))
* add ProposeLedger output for GetChannel calls for ledger channels ([62565db](https://github.com/statechannels/statechannels/commit/62565dbe216c7fbcdeea8a6815bbcaa926eaeb4b))
* allow empty password string ([abb67d9](https://github.com/statechannels/statechannels/commit/abb67d98ca733021e049b9f948379727c1a414e7))
* await concludeAndWithdraw transaction submission ([5758a3c](https://github.com/statechannels/statechannels/commit/5758a3ca8e09894a5dd04ad341fe7c3f772665ee))
* await fundChannel chain service request ([56ef79e](https://github.com/statechannels/statechannels/commit/56ef79ecd54a59a4fed2f4dd1b4fd65c164e15ac))
* await pushOutcomeAndWithdraw transaction sumbission ([d7252fc](https://github.com/statechannels/statechannels/commit/d7252fcd6a5caa8e8b1cc7ba89bca5a295f4963a))
* call register channel on start up ([7e19ab8](https://github.com/statechannels/statechannels/commit/7e19ab888083d772a46c93f048abc0d0eb4ce050))
* chain service correctly emits the channelFinalized event ([ce9e03f](https://github.com/statechannels/statechannels/commit/ce9e03f72245725b5436f2db7d4f37919510de4a))
* check channelNonce during state transition ([fdcb53b](https://github.com/statechannels/statechannels/commit/fdcb53b0228bb6b2a40bca404a2f3c84588e6ea9))
* check for existing chain request ([0ce7bf5](https://github.com/statechannels/statechannels/commit/0ce7bf523f7554636bec32495f8acad6219abdfc))
* clean up a race conditions with finalizing channels ([de161d0](https://github.com/statechannels/statechannels/commit/de161d02c55d9389fe4fc381554c92d7f0c78c41))
* convert ChainService constructor to accept config object ([fd1fcce](https://github.com/statechannels/statechannels/commit/fd1fcce1a581b6a60e1686e078dfb02870ba3d2b))
* disable failing expect with comment for now ([3c8feb0](https://github.com/statechannels/statechannels/commit/3c8feb079ccd1720ec572ae6587b3f549348cad0))
* do not export schema ([a06105e](https://github.com/statechannels/statechannels/commit/a06105e357fc8b037b952af9580159c6b411042e))
* do not progress close channel objective unless it does not fund any other channels ([d3d5826](https://github.com/statechannels/statechannels/commit/d3d58266e85032a0faa7ca55199af8be3a0c1a3a))
* eliminate a race condition in updateTransferredOut ([41b8c70](https://github.com/statechannels/statechannels/commit/41b8c700b9f63afdd4df7d55a3052cda129d1cf2))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/statechannels/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* ensure syncChannel works for two phase ledger commitments ([5259723](https://github.com/statechannels/statechannels/commit/525972343939b04529ff3cc4baf9be0d2922adb8))
* export everything from wallet ([b4c9429](https://github.com/statechannels/statechannels/commit/b4c94290910554807730c2c5ca576b57f1e82a1b))
* export SingleThreadedWallet class from pkg ([8d20dd8](https://github.com/statechannels/statechannels/commit/8d20dd88d2363325d6865107d4a1d8b117ff4708))
* fix broken test ([9132f98](https://github.com/statechannels/statechannels/commit/9132f98652af593b871b678509411ae3743548e9))
* fix chain tests ([3519315](https://github.com/statechannels/statechannels/commit/35193150dced8f5c3cd2730325a6a7412eb1cda1))
* fix merge issue ([ac314ae](https://github.com/statechannels/statechannels/commit/ac314ae24555722dc430adc0868cf5c804e22f1d))
* fix table name ([1e71d25](https://github.com/statechannels/statechannels/commit/1e71d25db197fe7bee6ef9f6728fa62ff9f0915e))
* fix test failure ([95dc2cf](https://github.com/statechannels/statechannels/commit/95dc2cf5071f7b523602ddbad6d9bb821ae98036))
* move expect extension ([562deb4](https://github.com/statechannels/statechannels/commit/562deb4261bbdb9a7c12615e13ad87fe024fd6cf))
* move TokenArtifact to TestContractArtifacts ([d236f6f](https://github.com/statechannels/statechannels/commit/d236f6ff7bb44aecde2a10312cd5a2f730fa42c7))
* only add channel if not already in queue ([13f6bdc](https://github.com/statechannels/statechannels/commit/13f6bdc066e8443288d491f76bc03524cc7fb8d6))
* only log if a logger exists ([d6d3c77](https://github.com/statechannels/statechannels/commit/d6d3c77d6279bc7f711b0d6ecb9568881e9fb667))
* only register active channels ([06b4556](https://github.com/statechannels/statechannels/commit/06b4556e0a13a8c4c4e5af76c289ca9e761c746f))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/statechannels/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* pushOutcomeAndWithdraw to ChainModifierInterface ([a3765f3](https://github.com/statechannels/statechannels/commit/a3765f3dcaf4d0b356c459b0195695f91070e952))
* remove env vars config ([f9289bb](https://github.com/statechannels/statechannels/commit/f9289bb0cddb0e6ef72376b9961b3b154638d958))
* remove required chainServiceRequests property from Channel model and fix tests ([d20eae8](https://github.com/statechannels/statechannels/commit/d20eae80ce48dc53d013cecba95036ce6a28b846))
* remove stale comment ([139f4be](https://github.com/statechannels/statechannels/commit/139f4be77e73c8e7bda91dfc428dca1ef021ccc5))
* remove unneeded await ([c2db964](https://github.com/statechannels/statechannels/commit/c2db964993a5e49c22cda2693da99e23d2559325))
* remove unneeded type conversion ([d753b8d](https://github.com/statechannels/statechannels/commit/d753b8d3027e56a3378f7bff252b87a18c1e508d))
* return finalizesAt on challenge active ([2a878cc](https://github.com/statechannels/statechannels/commit/2a878ccdf92f84b68ec3825fcc38ec9c570a6ff6))
* set chain id ([d1877c8](https://github.com/statechannels/statechannels/commit/d1877c868d9c091b66dca8ccc35373062b720a04))
* simply logic by removing status ([3a9fdf5](https://github.com/statechannels/statechannels/commit/3a9fdf5ba2b80bc3f1772448650413a3b546fb86))
* standardize chain service public method logging ([10c4d75](https://github.com/statechannels/statechannels/commit/10c4d751fb4211d267d3f33cb445d137434f90c7))
* support fake funding in directFundingStatus ([6b1c2d7](https://github.com/statechannels/statechannels/commit/6b1c2d76960823e835971dc4f2b12c4803c47293))
* update wallet response to use queuedMessages over outbox property for queued ledger proposal ([2c6fd25](https://github.com/statechannels/statechannels/commit/2c6fd25d567938f61ad0b93461339ddfc0797350))
* use ?? instead of || for defaulting blockConfirmation ([94aaf0f](https://github.com/statechannels/statechannels/commit/94aaf0fa2b7f5bd7af4166351c614f125eff7953))
* use distinct database names ([57894fb](https://github.com/statechannels/statechannels/commit/57894fbe8c82f2d845af929a73b6a53afc3fc5b7))
* use pqueue to avoid onBlockMined race condition ([cd52339](https://github.com/statechannels/statechannels/commit/cd523397821c5e1852e02cbe946a7c8e9e259a6a))
* use raw NULL for commit column ([1bc1a77](https://github.com/statechannels/statechannels/commit/1bc1a774a55891affcccaaf3d5252a49903f324e))
* user separate address for test adjudicator ([e837eaa](https://github.com/statechannels/statechannels/commit/e837eaa661bb1c3814bd3188f3fa6753cc03d4e5))
* validate metrics ([2e6fc84](https://github.com/statechannels/statechannels/commit/2e6fc841e4a13cd4c8705e094d49bb1ad20f8f03))
* wait for all updateTransferredOut before taking actions ([e3eb6ca](https://github.com/statechannels/statechannels/commit/e3eb6caf4a39f5b0a00157537cd6d8a30be6ca21))


### Features

* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/statechannels/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add chain transactions table ([4819b87](https://github.com/statechannels/statechannels/commit/4819b87667b4c05b843c0033a3b988f9cc697493))
* add pushUpdate for messages updating a single, running app channel ([1a04384](https://github.com/statechannels/statechannels/commit/1a043848c1457ff7d854bf256252c59d9515dbc1))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/statechannels/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* basic config validation ([a971ccd](https://github.com/statechannels/statechannels/commit/a971ccd492a09a5b2e29d6fb9602d4ab31c57890))
* check channel finalization ([f2786ce](https://github.com/statechannels/statechannels/commit/f2786ce9afd0abf2888ea2b7a9fbaa5744ac2b37))
* defaultTestConfig is now a function ([365651b](https://github.com/statechannels/statechannels/commit/365651b0df58ae30b11e7ac07cf98d5d59473c2c))
* Defund Channel Protocol ([#3133](https://github.com/statechannels/statechannels/issues/3133)) ([8e7ba80](https://github.com/statechannels/statechannels/commit/8e7ba808578f498debeea874730846697ecf6edf))
* draft implementation of finalized event logic ([7e96d8f](https://github.com/statechannels/statechannels/commit/7e96d8fb8dd1c9d7a052cbb3268a91e1b37eeacf))
* handle finalized event ([7ff04d0](https://github.com/statechannels/statechannels/commit/7ff04d0ad3cb36d6d213ae5a0c7cd69d7f3e6dc9))
* implement challenge status ([92002ad](https://github.com/statechannels/statechannels/commit/92002ad3849a4e877dfc55dfb184a836c432f7d4))
* multi-threaded wallet offloads pushUpdate to workers ([4891263](https://github.com/statechannels/statechannels/commit/489126323ec82bab4e2f5283d76c97200aeffbe7))
* replace AssetTransferred with AllocationUpdated event ([#3074](https://github.com/statechannels/statechannels/issues/3074)) ([bef8424](https://github.com/statechannels/statechannels/commit/bef8424605e7bb956d7bdc971ac4eae1628f6bfb))
* require challenge duration ([ca92e6c](https://github.com/statechannels/statechannels/commit/ca92e6c6e0b2e019686ff1caf54f452f6e096fe5))
* store challenge state ([#3127](https://github.com/statechannels/statechannels/issues/3127)) ([7268ac1](https://github.com/statechannels/statechannels/commit/7268ac1f088b0ecaba8014cc5fa467533c7bb1c5))
* use holdings to determine if pushed ([e4fc09c](https://github.com/statechannels/statechannels/commit/e4fc09c88284d15ccf8c6df224a8c001488de6cb))


### Performance Improvements

* remove O(n^2) behaviour from mergeOutgoing ([3836ed2](https://github.com/statechannels/statechannels/commit/3836ed2562d994fc2246e93beccc4e6977f2f2e8))





# [1.18.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.14.1...@statechannels/server-wallet@1.18.0) (2021-01-20)


### Bug Fixes

* a finalized channel is incorrectly added back to the list after subscribers are notified ([296ad5a](https://github.com/statechannels/statechannels/commit/296ad5af9873cbf5eda7bdc44b8cab0ff7c54ce8))
* add a constraint to chain_service_requests table, fix down migraion ([7aef458](https://github.com/statechannels/statechannels/commit/7aef458328a9461ff7743011665fabd195f78abd))
* add automatic pessimistic syncing for ledger proposals and state updated ([ddaf3e3](https://github.com/statechannels/statechannels/commit/ddaf3e3ec9af83c346b0d173673f4e49edd8c44a))
* add challenge to ChainModifierInterface ([b2769b6](https://github.com/statechannels/statechannels/commit/b2769b6343f113aa773438f15fda956612580713))
* add default value of empty array to chainServiceRequests ([d68d998](https://github.com/statechannels/statechannels/commit/d68d99839f256a6ddb8c63e2654a801620256752))
* add DismissLedgerProposals action to handle case where merged outcome is no different ([ff17d55](https://github.com/statechannels/statechannels/commit/ff17d558286a2332a643aec48cc39fb0eb833d3f))
* add id column prop ([b3f6bd2](https://github.com/statechannels/statechannels/commit/b3f6bd2e7fafd05b6e4bc3f3956279b2ef1292a9))
* add missing address ([fc78143](https://github.com/statechannels/statechannels/commit/fc781432ac7b1fd037fe3231d3d0832984469b89))
* add nonce to channel proposals to handle out-of-sync / adverse network situations ([9f79bc4](https://github.com/statechannels/statechannels/commit/9f79bc4a556703f3cf40c3f44fba3f0d6c28ae8e))
* add ProposeLedger output for GetChannel calls for ledger channels ([62565db](https://github.com/statechannels/statechannels/commit/62565dbe216c7fbcdeea8a6815bbcaa926eaeb4b))
* allow empty password string ([abb67d9](https://github.com/statechannels/statechannels/commit/abb67d98ca733021e049b9f948379727c1a414e7))
* await fundChannel chain service request ([56ef79e](https://github.com/statechannels/statechannels/commit/56ef79ecd54a59a4fed2f4dd1b4fd65c164e15ac))
* chain service correctly emits the channelFinalized event ([ce9e03f](https://github.com/statechannels/statechannels/commit/ce9e03f72245725b5436f2db7d4f37919510de4a))
* check channelNonce during state transition ([fdcb53b](https://github.com/statechannels/statechannels/commit/fdcb53b0228bb6b2a40bca404a2f3c84588e6ea9))
* check for existing chain request ([0ce7bf5](https://github.com/statechannels/statechannels/commit/0ce7bf523f7554636bec32495f8acad6219abdfc))
* clean up a race conditions with finalizing channels ([de161d0](https://github.com/statechannels/statechannels/commit/de161d02c55d9389fe4fc381554c92d7f0c78c41))
* convert ChainService constructor to accept config object ([fd1fcce](https://github.com/statechannels/statechannels/commit/fd1fcce1a581b6a60e1686e078dfb02870ba3d2b))
* disable failing expect with comment for now ([3c8feb0](https://github.com/statechannels/statechannels/commit/3c8feb079ccd1720ec572ae6587b3f549348cad0))
* do not export schema ([a06105e](https://github.com/statechannels/statechannels/commit/a06105e357fc8b037b952af9580159c6b411042e))
* do not progress close channel objective unless it does not fund any other channels ([d3d5826](https://github.com/statechannels/statechannels/commit/d3d58266e85032a0faa7ca55199af8be3a0c1a3a))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/statechannels/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* ensure syncChannel works for two phase ledger commitments ([5259723](https://github.com/statechannels/statechannels/commit/525972343939b04529ff3cc4baf9be0d2922adb8))
* export everything from wallet ([b4c9429](https://github.com/statechannels/statechannels/commit/b4c94290910554807730c2c5ca576b57f1e82a1b))
* fix broken test ([9132f98](https://github.com/statechannels/statechannels/commit/9132f98652af593b871b678509411ae3743548e9))
* fix chain tests ([3519315](https://github.com/statechannels/statechannels/commit/35193150dced8f5c3cd2730325a6a7412eb1cda1))
* fix merge issue ([ac314ae](https://github.com/statechannels/statechannels/commit/ac314ae24555722dc430adc0868cf5c804e22f1d))
* fix table name ([1e71d25](https://github.com/statechannels/statechannels/commit/1e71d25db197fe7bee6ef9f6728fa62ff9f0915e))
* fix test failure ([95dc2cf](https://github.com/statechannels/statechannels/commit/95dc2cf5071f7b523602ddbad6d9bb821ae98036))
* move expect extension ([562deb4](https://github.com/statechannels/statechannels/commit/562deb4261bbdb9a7c12615e13ad87fe024fd6cf))
* move TokenArtifact to TestContractArtifacts ([d236f6f](https://github.com/statechannels/statechannels/commit/d236f6ff7bb44aecde2a10312cd5a2f730fa42c7))
* only add channel if not already in queue ([13f6bdc](https://github.com/statechannels/statechannels/commit/13f6bdc066e8443288d491f76bc03524cc7fb8d6))
* only log if a logger exists ([d6d3c77](https://github.com/statechannels/statechannels/commit/d6d3c77d6279bc7f711b0d6ecb9568881e9fb667))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/statechannels/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* pushOutcomeAndWithdraw to ChainModifierInterface ([a3765f3](https://github.com/statechannels/statechannels/commit/a3765f3dcaf4d0b356c459b0195695f91070e952))
* remove env vars config ([f9289bb](https://github.com/statechannels/statechannels/commit/f9289bb0cddb0e6ef72376b9961b3b154638d958))
* remove required chainServiceRequests property from Channel model and fix tests ([d20eae8](https://github.com/statechannels/statechannels/commit/d20eae80ce48dc53d013cecba95036ce6a28b846))
* remove stale comment ([139f4be](https://github.com/statechannels/statechannels/commit/139f4be77e73c8e7bda91dfc428dca1ef021ccc5))
* remove unneeded await ([c2db964](https://github.com/statechannels/statechannels/commit/c2db964993a5e49c22cda2693da99e23d2559325))
* remove unneeded type conversion ([d753b8d](https://github.com/statechannels/statechannels/commit/d753b8d3027e56a3378f7bff252b87a18c1e508d))
* return finalizesAt on challenge active ([2a878cc](https://github.com/statechannels/statechannels/commit/2a878ccdf92f84b68ec3825fcc38ec9c570a6ff6))
* set chain id ([d1877c8](https://github.com/statechannels/statechannels/commit/d1877c868d9c091b66dca8ccc35373062b720a04))
* simply logic by removing status ([3a9fdf5](https://github.com/statechannels/statechannels/commit/3a9fdf5ba2b80bc3f1772448650413a3b546fb86))
* standardize chain service public method logging ([10c4d75](https://github.com/statechannels/statechannels/commit/10c4d751fb4211d267d3f33cb445d137434f90c7))
* support fake funding in directFundingStatus ([6b1c2d7](https://github.com/statechannels/statechannels/commit/6b1c2d76960823e835971dc4f2b12c4803c47293))
* update wallet response to use queuedMessages over outbox property for queued ledger proposal ([2c6fd25](https://github.com/statechannels/statechannels/commit/2c6fd25d567938f61ad0b93461339ddfc0797350))
* use ?? instead of || for defaulting blockConfirmation ([94aaf0f](https://github.com/statechannels/statechannels/commit/94aaf0fa2b7f5bd7af4166351c614f125eff7953))
* use distinct database names ([57894fb](https://github.com/statechannels/statechannels/commit/57894fbe8c82f2d845af929a73b6a53afc3fc5b7))
* use pqueue to avoid onBlockMined race condition ([cd52339](https://github.com/statechannels/statechannels/commit/cd523397821c5e1852e02cbe946a7c8e9e259a6a))
* use raw NULL for commit column ([1bc1a77](https://github.com/statechannels/statechannels/commit/1bc1a774a55891affcccaaf3d5252a49903f324e))
* user separate address for test adjudicator ([e837eaa](https://github.com/statechannels/statechannels/commit/e837eaa661bb1c3814bd3188f3fa6753cc03d4e5))
* validate metrics ([2e6fc84](https://github.com/statechannels/statechannels/commit/2e6fc841e4a13cd4c8705e094d49bb1ad20f8f03))
* wait for all updateTransferredOut before taking actions ([e3eb6ca](https://github.com/statechannels/statechannels/commit/e3eb6caf4a39f5b0a00157537cd6d8a30be6ca21))


### Features

* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/statechannels/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add chain transactions table ([4819b87](https://github.com/statechannels/statechannels/commit/4819b87667b4c05b843c0033a3b988f9cc697493))
* add pushUpdate for messages updating a single, running app channel ([1a04384](https://github.com/statechannels/statechannels/commit/1a043848c1457ff7d854bf256252c59d9515dbc1))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/statechannels/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* basic config validation ([a971ccd](https://github.com/statechannels/statechannels/commit/a971ccd492a09a5b2e29d6fb9602d4ab31c57890))
* check channel finalization ([f2786ce](https://github.com/statechannels/statechannels/commit/f2786ce9afd0abf2888ea2b7a9fbaa5744ac2b37))
* defaultTestConfig is now a function ([365651b](https://github.com/statechannels/statechannels/commit/365651b0df58ae30b11e7ac07cf98d5d59473c2c))
* Defund Channel Protocol ([#3133](https://github.com/statechannels/statechannels/issues/3133)) ([8e7ba80](https://github.com/statechannels/statechannels/commit/8e7ba808578f498debeea874730846697ecf6edf))
* draft implementation of finalized event logic ([7e96d8f](https://github.com/statechannels/statechannels/commit/7e96d8fb8dd1c9d7a052cbb3268a91e1b37eeacf))
* implement challenge status ([92002ad](https://github.com/statechannels/statechannels/commit/92002ad3849a4e877dfc55dfb184a836c432f7d4))
* multi-threaded wallet offloads pushUpdate to workers ([4891263](https://github.com/statechannels/statechannels/commit/489126323ec82bab4e2f5283d76c97200aeffbe7))
* replace AssetTransferred with AllocationUpdated event ([#3074](https://github.com/statechannels/statechannels/issues/3074)) ([bef8424](https://github.com/statechannels/statechannels/commit/bef8424605e7bb956d7bdc971ac4eae1628f6bfb))
* require challenge duration ([ca92e6c](https://github.com/statechannels/statechannels/commit/ca92e6c6e0b2e019686ff1caf54f452f6e096fe5))
* store challenge state ([#3127](https://github.com/statechannels/statechannels/issues/3127)) ([7268ac1](https://github.com/statechannels/statechannels/commit/7268ac1f088b0ecaba8014cc5fa467533c7bb1c5))


### Performance Improvements

* remove O(n^2) behaviour from mergeOutgoing ([3836ed2](https://github.com/statechannels/statechannels/commit/3836ed2562d994fc2246e93beccc4e6977f2f2e8))





# [1.17.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.14.1...@statechannels/server-wallet@1.17.0) (2020-12-15)


### Bug Fixes

* add a constraint to chain_service_requests table, fix down migraion ([7aef458](https://github.com/statechannels/statechannels/commit/7aef458328a9461ff7743011665fabd195f78abd))
* add challenge to ChainModifierInterface ([b2769b6](https://github.com/statechannels/statechannels/commit/b2769b6343f113aa773438f15fda956612580713))
* add default value of empty array to chainServiceRequests ([d68d998](https://github.com/statechannels/statechannels/commit/d68d99839f256a6ddb8c63e2654a801620256752))
* add missing address ([fc78143](https://github.com/statechannels/statechannels/commit/fc781432ac7b1fd037fe3231d3d0832984469b89))
* allow empty password string ([abb67d9](https://github.com/statechannels/statechannels/commit/abb67d98ca733021e049b9f948379727c1a414e7))
* await fundChannel chain service request ([56ef79e](https://github.com/statechannels/statechannels/commit/56ef79ecd54a59a4fed2f4dd1b4fd65c164e15ac))
* chain service correctly emits the channelFinalized event ([ce9e03f](https://github.com/statechannels/statechannels/commit/ce9e03f72245725b5436f2db7d4f37919510de4a))
* check channelNonce during state transition ([fdcb53b](https://github.com/statechannels/statechannels/commit/fdcb53b0228bb6b2a40bca404a2f3c84588e6ea9))
* clean up a race conditions with finalizing channels ([de161d0](https://github.com/statechannels/statechannels/commit/de161d02c55d9389fe4fc381554c92d7f0c78c41))
* convert ChainService constructor to accept config object ([fd1fcce](https://github.com/statechannels/statechannels/commit/fd1fcce1a581b6a60e1686e078dfb02870ba3d2b))
* disable failing expect with comment for now ([3c8feb0](https://github.com/statechannels/statechannels/commit/3c8feb079ccd1720ec572ae6587b3f549348cad0))
* do not export schema ([a06105e](https://github.com/statechannels/statechannels/commit/a06105e357fc8b037b952af9580159c6b411042e))
* do not progress close channel objective unless it does not fund any other channels ([d3d5826](https://github.com/statechannels/statechannels/commit/d3d58266e85032a0faa7ca55199af8be3a0c1a3a))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/statechannels/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* export everything from wallet ([b4c9429](https://github.com/statechannels/statechannels/commit/b4c94290910554807730c2c5ca576b57f1e82a1b))
* fix chain tests ([3519315](https://github.com/statechannels/statechannels/commit/35193150dced8f5c3cd2730325a6a7412eb1cda1))
* fix test failure ([95dc2cf](https://github.com/statechannels/statechannels/commit/95dc2cf5071f7b523602ddbad6d9bb821ae98036))
* move expect extension ([562deb4](https://github.com/statechannels/statechannels/commit/562deb4261bbdb9a7c12615e13ad87fe024fd6cf))
* only add channel if not already in queue ([13f6bdc](https://github.com/statechannels/statechannels/commit/13f6bdc066e8443288d491f76bc03524cc7fb8d6))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/statechannels/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* pushOutcomeAndWithdraw to ChainModifierInterface ([a3765f3](https://github.com/statechannels/statechannels/commit/a3765f3dcaf4d0b356c459b0195695f91070e952))
* remove env vars config ([f9289bb](https://github.com/statechannels/statechannels/commit/f9289bb0cddb0e6ef72376b9961b3b154638d958))
* remove required chainServiceRequests property from Channel model and fix tests ([d20eae8](https://github.com/statechannels/statechannels/commit/d20eae80ce48dc53d013cecba95036ce6a28b846))
* remove stale comment ([139f4be](https://github.com/statechannels/statechannels/commit/139f4be77e73c8e7bda91dfc428dca1ef021ccc5))
* remove unneeded await ([c2db964](https://github.com/statechannels/statechannels/commit/c2db964993a5e49c22cda2693da99e23d2559325))
* remove unneeded type conversion ([d753b8d](https://github.com/statechannels/statechannels/commit/d753b8d3027e56a3378f7bff252b87a18c1e508d))
* set chain id ([d1877c8](https://github.com/statechannels/statechannels/commit/d1877c868d9c091b66dca8ccc35373062b720a04))
* simply logic by removing status ([3a9fdf5](https://github.com/statechannels/statechannels/commit/3a9fdf5ba2b80bc3f1772448650413a3b546fb86))
* standardize chain service public method logging ([10c4d75](https://github.com/statechannels/statechannels/commit/10c4d751fb4211d267d3f33cb445d137434f90c7))
* use ?? instead of || for defaulting blockConfirmation ([94aaf0f](https://github.com/statechannels/statechannels/commit/94aaf0fa2b7f5bd7af4166351c614f125eff7953))
* use distinct database names ([57894fb](https://github.com/statechannels/statechannels/commit/57894fbe8c82f2d845af929a73b6a53afc3fc5b7))
* use pqueue to avoid onBlockMined race condition ([cd52339](https://github.com/statechannels/statechannels/commit/cd523397821c5e1852e02cbe946a7c8e9e259a6a))
* user separate address for test adjudicator ([e837eaa](https://github.com/statechannels/statechannels/commit/e837eaa661bb1c3814bd3188f3fa6753cc03d4e5))
* validate metrics ([2e6fc84](https://github.com/statechannels/statechannels/commit/2e6fc841e4a13cd4c8705e094d49bb1ad20f8f03))


### Features

* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/statechannels/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add chain transactions table ([4819b87](https://github.com/statechannels/statechannels/commit/4819b87667b4c05b843c0033a3b988f9cc697493))
* add pushUpdate for messages updating a single, running app channel ([1a04384](https://github.com/statechannels/statechannels/commit/1a043848c1457ff7d854bf256252c59d9515dbc1))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/statechannels/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* basic config validation ([a971ccd](https://github.com/statechannels/statechannels/commit/a971ccd492a09a5b2e29d6fb9602d4ab31c57890))
* check channel finalization ([f2786ce](https://github.com/statechannels/statechannels/commit/f2786ce9afd0abf2888ea2b7a9fbaa5744ac2b37))
* defaultTestConfig is now a function ([365651b](https://github.com/statechannels/statechannels/commit/365651b0df58ae30b11e7ac07cf98d5d59473c2c))
* draft implementation of finalized event logic ([7e96d8f](https://github.com/statechannels/statechannels/commit/7e96d8fb8dd1c9d7a052cbb3268a91e1b37eeacf))
* multi-threaded wallet offloads pushUpdate to workers ([4891263](https://github.com/statechannels/statechannels/commit/489126323ec82bab4e2f5283d76c97200aeffbe7))
* require challenge duration ([ca92e6c](https://github.com/statechannels/statechannels/commit/ca92e6c6e0b2e019686ff1caf54f452f6e096fe5))


### Performance Improvements

* remove O(n^2) behaviour from mergeOutgoing ([3836ed2](https://github.com/statechannels/statechannels/commit/3836ed2562d994fc2246e93beccc4e6977f2f2e8))





# [1.16.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.14.1...@statechannels/server-wallet@1.16.0) (2020-12-04)


### Bug Fixes

* add a constraint to chain_service_requests table, fix down migraion ([7aef458](https://github.com/statechannels/statechannels/commit/7aef458328a9461ff7743011665fabd195f78abd))
* add default value of empty array to chainServiceRequests ([d68d998](https://github.com/statechannels/statechannels/commit/d68d99839f256a6ddb8c63e2654a801620256752))
* allow empty password string ([abb67d9](https://github.com/statechannels/statechannels/commit/abb67d98ca733021e049b9f948379727c1a414e7))
* await fundChannel chain service request ([56ef79e](https://github.com/statechannels/statechannels/commit/56ef79ecd54a59a4fed2f4dd1b4fd65c164e15ac))
* convert ChainService constructor to accept config object ([fd1fcce](https://github.com/statechannels/statechannels/commit/fd1fcce1a581b6a60e1686e078dfb02870ba3d2b))
* do not export schema ([a06105e](https://github.com/statechannels/statechannels/commit/a06105e357fc8b037b952af9580159c6b411042e))
* export everything from wallet ([b4c9429](https://github.com/statechannels/statechannels/commit/b4c94290910554807730c2c5ca576b57f1e82a1b))
* fix chain tests ([3519315](https://github.com/statechannels/statechannels/commit/35193150dced8f5c3cd2730325a6a7412eb1cda1))
* remove env vars config ([f9289bb](https://github.com/statechannels/statechannels/commit/f9289bb0cddb0e6ef72376b9961b3b154638d958))
* remove required chainServiceRequests property from Channel model and fix tests ([d20eae8](https://github.com/statechannels/statechannels/commit/d20eae80ce48dc53d013cecba95036ce6a28b846))
* set chain id ([d1877c8](https://github.com/statechannels/statechannels/commit/d1877c868d9c091b66dca8ccc35373062b720a04))
* use ?? instead of || for defaulting blockConfirmation ([94aaf0f](https://github.com/statechannels/statechannels/commit/94aaf0fa2b7f5bd7af4166351c614f125eff7953))
* use distinct database names ([57894fb](https://github.com/statechannels/statechannels/commit/57894fbe8c82f2d845af929a73b6a53afc3fc5b7))
* validate metrics ([2e6fc84](https://github.com/statechannels/statechannels/commit/2e6fc841e4a13cd4c8705e094d49bb1ad20f8f03))


### Features

* add chain transactions table ([4819b87](https://github.com/statechannels/statechannels/commit/4819b87667b4c05b843c0033a3b988f9cc697493))
* add pushUpdate for messages updating a single, running app channel ([1a04384](https://github.com/statechannels/statechannels/commit/1a043848c1457ff7d854bf256252c59d9515dbc1))
* basic config validation ([a971ccd](https://github.com/statechannels/statechannels/commit/a971ccd492a09a5b2e29d6fb9602d4ab31c57890))
* defaultTestConfig is now a function ([365651b](https://github.com/statechannels/statechannels/commit/365651b0df58ae30b11e7ac07cf98d5d59473c2c))
* multi-threaded wallet offloads pushUpdate to workers ([4891263](https://github.com/statechannels/statechannels/commit/489126323ec82bab4e2f5283d76c97200aeffbe7))





# [1.15.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.14.1...@statechannels/server-wallet@1.15.0) (2020-12-02)


### Bug Fixes

* export everything from wallet ([b4c9429](https://github.com/statechannels/statechannels/commit/b4c94290910554807730c2c5ca576b57f1e82a1b))
* fix chain tests ([3519315](https://github.com/statechannels/statechannels/commit/35193150dced8f5c3cd2730325a6a7412eb1cda1))
* remove env vars config ([f9289bb](https://github.com/statechannels/statechannels/commit/f9289bb0cddb0e6ef72376b9961b3b154638d958))
* set chain id ([d1877c8](https://github.com/statechannels/statechannels/commit/d1877c868d9c091b66dca8ccc35373062b720a04))
* use distinct database names ([57894fb](https://github.com/statechannels/statechannels/commit/57894fbe8c82f2d845af929a73b6a53afc3fc5b7))


### Features

* defaultTestConfig is now a function ([365651b](https://github.com/statechannels/statechannels/commit/365651b0df58ae30b11e7ac07cf98d5d59473c2c))





## [1.14.1](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.14.0...@statechannels/server-wallet@1.14.1) (2020-12-02)


### Bug Fixes

* do not do turn number check for funding or closing stage channels ([a11788a](https://github.com/statechannels/statechannels/commit/a11788a25b117048f3421de8a50f22a61e6bb57f))





# [1.14.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.13.0...@statechannels/server-wallet@1.14.0) (2020-12-01)


### Bug Fixes

* add a check inside open channel protocol for ledger channel running status ([47240ce](https://github.com/statechannels/statechannels/commit/47240ce1d70918c0760c2d948de323c7fdf4c70b))
* add error within Store when createChannel specified invalid funding ledger channel ([5b5f87d](https://github.com/statechannels/statechannels/commit/5b5f87db98d4c6a5245143a73be3013756199530))
* check for closing or closed ledger states before creating channel ([9136d74](https://github.com/statechannels/statechannels/commit/9136d741943f791a5bedd40f0e5fbc0cbd3a4dd4))
* correct import in mock-chain-service ([f17846c](https://github.com/statechannels/statechannels/commit/f17846c423f8471942dc9b670fb981ed2d950f99))
* stop open channel sending multiple deposits ([312daa2](https://github.com/statechannels/statechannels/commit/312daa20797109fbadcde7227a9b90b011190563))


### Features

* add allowanceMode to chainService; remove allowanceAlreadyIncreased option ([ae39c9a](https://github.com/statechannels/statechannels/commit/ae39c9a6c7a212845ec665e05c403c608fd16302))


### Performance Improvements

* remove unecessary abi.encode ([#2955](https://github.com/statechannels/statechannels/issues/2955)) ([4e623ee](https://github.com/statechannels/statechannels/commit/4e623ee8608d7cf021374bd8429e0cc4c44e5fab))





## [1.13.1](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.13.0...@statechannels/server-wallet@1.13.1) (2020-11-26)


### Bug Fixes

* add a check inside open channel protocol for ledger channel running status ([47240ce](https://github.com/statechannels/statechannels/commit/47240ce1d70918c0760c2d948de323c7fdf4c70b))
* add error within Store when createChannel specified invalid funding ledger channel ([5b5f87d](https://github.com/statechannels/statechannels/commit/5b5f87db98d4c6a5245143a73be3013756199530))
* check for closing or closed ledger states before creating channel ([9136d74](https://github.com/statechannels/statechannels/commit/9136d741943f791a5bedd40f0e5fbc0cbd3a4dd4))





# [1.13.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.12.1...@statechannels/server-wallet@1.13.0) (2020-11-26)


### Bug Fixes

* add conditions to ReadyToFund state ([cc43066](https://github.com/statechannels/statechannels/commit/cc43066e3c87baa98f6f2441e3f0cda2c318821a))
* directFundingStatus is defunded only when supported state is final ([dbe2291](https://github.com/statechannels/statechannels/commit/dbe229163178572b5e313c8b2efa736befd4f761))
* remove unused addresses ([bb8fa4c](https://github.com/statechannels/statechannels/commit/bb8fa4cf7405c5ae6f2a0e58fa9beb49442cedab))
* switch chain id to number ([2750f92](https://github.com/statechannels/statechannels/commit/2750f92bc9183e61a14060c19584b1733676b24a))


### Features

* add fundingStatus to ChannelResult ([fd8e64b](https://github.com/statechannels/statechannels/commit/fd8e64be2534e1e405b4d789f758359c60ebe5da))





## [1.12.1](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.12.0...@statechannels/server-wallet@1.12.1) (2020-11-25)


### Bug Fixes

* allow optional config in overwrite ([d5b9fb8](https://github.com/statechannels/statechannels/commit/d5b9fb858ae35fdb4a07033fbfc4f06ec8617023))
* default amount of worker threads ([98f17c2](https://github.com/statechannels/statechannels/commit/98f17c202c72e07dd6f03b4832a03d31f25fc830))
* default to skipEvmValidation=true ([a08cb95](https://github.com/statechannels/statechannels/commit/a08cb950214e3633f88cdb4c6528fde298ee3d5b))
* drop db only if exists ([45d2e12](https://github.com/statechannels/statechannels/commit/45d2e12ddab743e62af916a6d193aeed34df6c25))
* fix chain tests ([08d0bc4](https://github.com/statechannels/statechannels/commit/08d0bc41c54345586c6c788c74385d0ef444df7f))
* fix directly funded test ([035c4f7](https://github.com/statechannels/statechannels/commit/035c4f75850dd208cd512ab0aa585beb0dc6a3d5))
* fix incorrect ledger funding insufficient funds error string equality check ([b71c1bc](https://github.com/statechannels/statechannels/commit/b71c1bc95182d65df67c0d5362fb830da8feb83a))
* fix wallet create typing ([77f5513](https://github.com/statechannels/statechannels/commit/77f55134aa87c6b1776aa4732c44bdfa80eba750))
* get tests passing ([21bafa1](https://github.com/statechannels/statechannels/commit/21bafa187c209fb879aecb0c9c52f420fe82d295))
* move more fields  into Required ([9ff7acd](https://github.com/statechannels/statechannels/commit/9ff7acd6bb623c71e95c980b38553a170394eb81))
* overwrite with env vars to support ci ([e740762](https://github.com/statechannels/statechannels/commit/e740762f192417044036af149baecb6474a508d6))
* remove unused stateChannelPrivateKey config entry ([fd4d47a](https://github.com/statechannels/statechannels/commit/fd4d47a4ed939f26f81205210f337626b501fb61))
* respect env vars for db config ([e9e50f8](https://github.com/statechannels/statechannels/commit/e9e50f84cc72adba030b823bf928bd9b809955cc))
* set default db user ([551dd00](https://github.com/statechannels/statechannels/commit/551dd00c739b7858cc7012edc67b0662f51db535))
* typo ([85e2adc](https://github.com/statechannels/statechannels/commit/85e2adc67b4abe1eacb9b07a078e3b66cfa935ed))
* unbreak migrations ([762f9ec](https://github.com/statechannels/statechannels/commit/762f9ec0ae266c2a5d69333eb6417150a7e2b2c7))


### Performance Improvements

* add index on ledger_channel_id ([69033f4](https://github.com/statechannels/statechannels/commit/69033f4f61606b7f5f027f85802b498c4d5fda80))
* optimize queries for ledger requests on run loop ([98f7c7c](https://github.com/statechannels/statechannels/commit/98f7c7c29516ac538524b82447950f442680fe5f))





# [1.12.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.11.8...@statechannels/server-wallet@1.12.0) (2020-11-21)


### Bug Fixes

* add type to get around Error TS2794: Expected 1 arguments, but got 0 ([cd09464](https://github.com/statechannels/statechannels/commit/cd09464cba6c19ce5bcbb599c22af2d1fc09ff6a))
* insert a timeout to avoid directly-funded-channel log error ([d7f8744](https://github.com/statechannels/statechannels/commit/d7f87440bc94692fbaa632162a6e5c990ed0f728))
* remove block listener after event is confirmed ([0871514](https://github.com/statechannels/statechannels/commit/08715141d88524940b2adb7f1a0002f830c492ec))
* remove logic delaying initial holdingUpdated call ([cdadfc8](https://github.com/statechannels/statechannels/commit/cdadfc88dd91873f4865a55f207d3ac035ea8d93))
* wait for the sixth block after balance read ([22fb374](https://github.com/statechannels/statechannels/commit/22fb374eeff8aed95f1513f76f8c08776e8327dd))


### Features

* chain service waits for 6 blocks before forwarding an event ([3019b2d](https://github.com/statechannels/statechannels/commit/3019b2d69f26318ac0c43cf010e9f7765fd78790))


### Performance Improvements

* add channel_id index to objectives_channels ([22ebcf7](https://github.com/statechannels/statechannels/commit/22ebcf7159fe19193d9fde10a6977dfd99d3c7db))





## [1.11.8](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.11.4...@statechannels/server-wallet@1.11.8) (2020-11-20)


### Bug Fixes

* add missing dependency to package.json of server-wallet ([ab174e5](https://github.com/statechannels/statechannels/commit/ab174e5fb250edaa0dee8360dfd08a584b317de4))
* do not allow non variable data in the db ([be0c73c](https://github.com/statechannels/statechannels/commit/be0c73c76458fa9674411ab39fb3b43ca6064ec5))
* do not rely on revert reason in chain service ([13d9f4e](https://github.com/statechannels/statechannels/commit/13d9f4edc516629196a367fc63a034c047584b55))
* fix broken tests ([a1c0730](https://github.com/statechannels/statechannels/commit/a1c0730fef0dd11b2bfa0a15d06e900b902c3180))
* hacky way to remove one query from the critical path ([3b0955e](https://github.com/statechannels/statechannels/commit/3b0955e6be76aec28f495ea8ed9b61610630e104))
* set Token contract owner when deploying ([6f07676](https://github.com/statechannels/statechannels/commit/6f076764a59112428ca7133c2631ddcf236cf618))
* use latest block timestamp for computing channel finalization ([123d0ea](https://github.com/statechannels/statechannels/commit/123d0eaf78889fc2702270e8d1c454430167f7d2))





## [1.11.7](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.11.4...@statechannels/server-wallet@1.11.7) (2020-11-19)


### Bug Fixes

* add missing dependency to package.json of server-wallet ([ab174e5](https://github.com/statechannels/statechannels/commit/ab174e5fb250edaa0dee8360dfd08a584b317de4))
* do not allow non variable data in the db ([be0c73c](https://github.com/statechannels/statechannels/commit/be0c73c76458fa9674411ab39fb3b43ca6064ec5))
* do not rely on revert reason in chain service ([13d9f4e](https://github.com/statechannels/statechannels/commit/13d9f4edc516629196a367fc63a034c047584b55))
* fix broken tests ([a1c0730](https://github.com/statechannels/statechannels/commit/a1c0730fef0dd11b2bfa0a15d06e900b902c3180))
* set Token contract owner when deploying ([6f07676](https://github.com/statechannels/statechannels/commit/6f076764a59112428ca7133c2631ddcf236cf618))
* use latest block timestamp for computing channel finalization ([123d0ea](https://github.com/statechannels/statechannels/commit/123d0eaf78889fc2702270e8d1c454430167f7d2))





## [1.11.6](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.11.4...@statechannels/server-wallet@1.11.6) (2020-11-19)


### Bug Fixes

* do not allow non variable data in the db ([be0c73c](https://github.com/statechannels/statechannels/commit/be0c73c76458fa9674411ab39fb3b43ca6064ec5))
* do not rely on revert reason in chain service ([13d9f4e](https://github.com/statechannels/statechannels/commit/13d9f4edc516629196a367fc63a034c047584b55))
* fix broken tests ([a1c0730](https://github.com/statechannels/statechannels/commit/a1c0730fef0dd11b2bfa0a15d06e900b902c3180))
* set Token contract owner when deploying ([6f07676](https://github.com/statechannels/statechannels/commit/6f076764a59112428ca7133c2631ddcf236cf618))
* use latest block timestamp for computing channel finalization ([123d0ea](https://github.com/statechannels/statechannels/commit/123d0eaf78889fc2702270e8d1c454430167f7d2))





## [1.11.5](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.11.4...@statechannels/server-wallet@1.11.5) (2020-11-17)


### Bug Fixes

* do not rely on revert reason in chain service ([13d9f4e](https://github.com/statechannels/statechannels/commit/13d9f4edc516629196a367fc63a034c047584b55))
* use latest block timestamp for computing channel finalization ([123d0ea](https://github.com/statechannels/statechannels/commit/123d0eaf78889fc2702270e8d1c454430167f7d2))





## [1.11.4](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.11.3...@statechannels/server-wallet@1.11.4) (2020-11-17)


### Bug Fixes

* revert version change ([ff30eed](https://github.com/statechannels/statechannels/commit/ff30eed36b25696f9a98bb97184dc7aab238401b))





## [1.11.3](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.11.2...@statechannels/server-wallet@1.11.3) (2020-11-17)

**Note:** Version bump only for package @statechannels/server-wallet





# [1.11.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.10.1...@statechannels/server-wallet@1.11.0) (2020-11-14)


### Bug Fixes

* cast Addresses and Destinations for events ([8697235](https://github.com/statechannels/statechannels/commit/869723577dc5a0410be54497969c2b2dbd28071a))
* chain-service asset holder default addresses converted to Address ([7e06925](https://github.com/statechannels/statechannels/commit/7e069252cf004c0f9c18ab606067e1a4c454f68d))
* correct Address types after rebase ([3495b71](https://github.com/statechannels/statechannels/commit/3495b71fd6076238591ec377b055fc45eb0bc037))
* don't throw an error on closeChannels call with empty array ([43bed62](https://github.com/statechannels/statechannels/commit/43bed626f742bb75a45db8264ca55dd6acca0eb1))
* ensure check on closeChannel in pushMessage ([d16d0a6](https://github.com/statechannels/statechannels/commit/d16d0a6139d6c09950e4a1344882a17fc4ea2559))
* export a little more from server-wallet ([ffc7dc6](https://github.com/statechannels/statechannels/commit/ffc7dc6d2a9708e90dd2a0d867f43e50654504de))
* finish off close-not-on-turn behaviour and change tests to reflect it ([7c59fb5](https://github.com/statechannels/statechannels/commit/7c59fb5a152da7acd55fce0078ca532691802c95))
* not able to start wallet when contract addresses are undefined ([562d521](https://github.com/statechannels/statechannels/commit/562d5213806f99ffc8d9af5b2734df0433368bca))
* remove destination lower casing in close-channel protocol ([6cf2f5d](https://github.com/statechannels/statechannels/commit/6cf2f5d660b279fae5ec805a57a9aab7548f1a53))
* remove unnecessary list reversal ([43c7c77](https://github.com/statechannels/statechannels/commit/43c7c7729800e2f6e4f554075d2d65f5d800aef6))
* remove unused output objectivesToApprove ([d5d01f1](https://github.com/statechannels/statechannels/commit/d5d01f16df3540f386b972a4404a5c8e7c0dcf57))
* resolve issues with nominal Address type ([dcd071d](https://github.com/statechannels/statechannels/commit/dcd071d61229652abfb4618deef39933bab0b868))
* run yarn generate-api ([b78b4df](https://github.com/statechannels/statechannels/commit/b78b4df3851153e285657ce4980ab3028e661164))
* support variable length channels in close channel ([85fd136](https://github.com/statechannels/statechannels/commit/85fd13681aea3eeeeb1b82200b94b2b30995c815))
* type error in state-utils ([f4cf8c0](https://github.com/statechannels/statechannels/commit/f4cf8c0c671584fc09ea2ae3215557e490960ba0))


### Features

* add addSigningKey method to wallet API ([a61e979](https://github.com/statechannels/statechannels/commit/a61e97948bceaab28329b03417ef689ee53468c4))
* add lower case bytes constraints to db ([032cf9f](https://github.com/statechannels/statechannels/commit/032cf9fd46d9570867052c7febfea7c58b81cb49))
* additional constraints on bytes columns ([b818ac0](https://github.com/statechannels/statechannels/commit/b818ac055b23edafb1b87905f861fcf57bc6008f))
* allow channel closing not on your turn ([9167dfe](https://github.com/statechannels/statechannels/commit/9167dfea41f3d9e7a165b63599b4f9fca048ef80))
* assert and assume checksum addresses ([48b961b](https://github.com/statechannels/statechannels/commit/48b961b66cc877f68c02b4a818849538721f53db))
* introduce Address and PrivateKey nominal types ([4b253fc](https://github.com/statechannels/statechannels/commit/4b253fc0594af6f163f5929fd4cfbfea1d3ed457))





## [1.10.1](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.10.0...@statechannels/server-wallet@1.10.1) (2020-11-07)


### Bug Fixes

* add workaround for noisy log message ([ebe31e3](https://github.com/statechannels/statechannels/commit/ebe31e32afebbe89f6a6a9375768c0d9f2b5904d))





# [1.10.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.7.0...@statechannels/server-wallet@1.10.0) (2020-11-06)


### Bug Fixes

* add jsonSchema to the Funding table ([8910f6e](https://github.com/statechannels/statechannels/commit/8910f6e162ba1167b3c2b00d73ac33f9a0b5e997))
* change transferred out to snake case ([70448d3](https://github.com/statechannels/statechannels/commit/70448d3647ef599c6197b53aa9c6a601fb99ceda))
* directly-funded-channel test passing ([2737502](https://github.com/statechannels/statechannels/commit/2737502f3edd3b70aac43e2625c6e2a16419eb94))
* do not block runloop on chain service transaction submission ([a23d494](https://github.com/statechannels/statechannels/commit/a23d494dce0fcd548c7c473eebd0d69614c8f435))
* ignore older states when validating ([7993a5b](https://github.com/statechannels/statechannels/commit/7993a5ba2ff67474517559ceff4b53f5bdbe49fe))
* only crank channels related to those in the arguments to crankUntilIdle ([593fe68](https://github.com/statechannels/statechannels/commit/593fe68923a6a7cae767c3514a9a40bd03c4e213))
* shouldValidate should not be async ([c5b614e](https://github.com/statechannels/statechannels/commit/c5b614ebcaf6b45e51d0163eab5516b21a84cfd2))
* successfulWithdraw is no longer hardcoded to true ([e76383a](https://github.com/statechannels/statechannels/commit/e76383a4c0e7855a5c6f83349fdfb7ac4b8c38c7))
* successfulWithdraw returns true for non directly funded channels ([ff79d83](https://github.com/statechannels/statechannels/commit/ff79d83f1726fc7bfbef89d7d11f2b17c2cb2ce0))
* typo ([675ceb5](https://github.com/statechannels/statechannels/commit/675ceb54fb566295c7036be0b9e360e7ffbe7328))
* use class logger in crankUntilIdle ([3009b96](https://github.com/statechannels/statechannels/commit/3009b966f0300503b200ee55911d03db2bed0ae3))
* use isLedger from channel ([b232ec9](https://github.com/statechannels/statechannels/commit/b232ec948a84eb06e071c560e66c5f45fb610c44))
* use toLowerCase instead of toLocaleLowerCase ([24f0e1d](https://github.com/statechannels/statechannels/commit/24f0e1dc3064981be6bad58229f3d8aa8333a399))


### Features

* add asset transferred record keeping to the funding table ([8f5ada6](https://github.com/statechannels/statechannels/commit/8f5ada645981b9f1a5627965b3735ed4aafbbdd6))
* add syncChannels API method handler on server-wallet ([ff875f9](https://github.com/statechannels/statechannels/commit/ff875f99e04ff4b8fdb08736b240dee237418eb8))
* add walletVersion to Message type ([16c205c](https://github.com/statechannels/statechannels/commit/16c205c72483a7b9b3445163065c74ff88fa55f5))
* emit channelUpdate event ([a36c1e8](https://github.com/statechannels/statechannels/commit/a36c1e811622cac3173b31ed39d27b74ee2414f9))
* errors during pushMessage have version ([dc23ac1](https://github.com/statechannels/statechannels/commit/dc23ac17e1a60399f1f46cf798708e53856f6034))
* wallets own their own child logger ([73e6bfe](https://github.com/statechannels/statechannels/commit/73e6bfede7cebfa407eed1026fa42d7f60c3ee1e))





# [1.9.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.7.0...@statechannels/server-wallet@1.9.0) (2020-11-03)


### Bug Fixes

* add jsonSchema to the Funding table ([8910f6e](https://github.com/statechannels/statechannels/commit/8910f6e162ba1167b3c2b00d73ac33f9a0b5e997))
* change transferred out to snake case ([70448d3](https://github.com/statechannels/statechannels/commit/70448d3647ef599c6197b53aa9c6a601fb99ceda))
* directly-funded-channel test passing ([2737502](https://github.com/statechannels/statechannels/commit/2737502f3edd3b70aac43e2625c6e2a16419eb94))
* do not block runloop on chain service transaction submission ([a23d494](https://github.com/statechannels/statechannels/commit/a23d494dce0fcd548c7c473eebd0d69614c8f435))
* ignore older states when validating ([7993a5b](https://github.com/statechannels/statechannels/commit/7993a5ba2ff67474517559ceff4b53f5bdbe49fe))
* only crank channels related to those in the arguments to crankUntilIdle ([593fe68](https://github.com/statechannels/statechannels/commit/593fe68923a6a7cae767c3514a9a40bd03c4e213))
* shouldValidate should not be async ([c5b614e](https://github.com/statechannels/statechannels/commit/c5b614ebcaf6b45e51d0163eab5516b21a84cfd2))
* successfulWithdraw is no longer hardcoded to true ([e76383a](https://github.com/statechannels/statechannels/commit/e76383a4c0e7855a5c6f83349fdfb7ac4b8c38c7))
* successfulWithdraw returns true for non directly funded channels ([ff79d83](https://github.com/statechannels/statechannels/commit/ff79d83f1726fc7bfbef89d7d11f2b17c2cb2ce0))
* typo ([675ceb5](https://github.com/statechannels/statechannels/commit/675ceb54fb566295c7036be0b9e360e7ffbe7328))
* use class logger in crankUntilIdle ([3009b96](https://github.com/statechannels/statechannels/commit/3009b966f0300503b200ee55911d03db2bed0ae3))
* use isLedger from channel ([b232ec9](https://github.com/statechannels/statechannels/commit/b232ec948a84eb06e071c560e66c5f45fb610c44))
* use toLowerCase instead of toLocaleLowerCase ([24f0e1d](https://github.com/statechannels/statechannels/commit/24f0e1dc3064981be6bad58229f3d8aa8333a399))


### Features

* add asset transferred record keeping to the funding table ([8f5ada6](https://github.com/statechannels/statechannels/commit/8f5ada645981b9f1a5627965b3735ed4aafbbdd6))
* add walletVersion to Message type ([16c205c](https://github.com/statechannels/statechannels/commit/16c205c72483a7b9b3445163065c74ff88fa55f5))
* emit channelUpdate event ([a36c1e8](https://github.com/statechannels/statechannels/commit/a36c1e811622cac3173b31ed39d27b74ee2414f9))
* errors during pushMessage have version ([dc23ac1](https://github.com/statechannels/statechannels/commit/dc23ac17e1a60399f1f46cf798708e53856f6034))
* wallets own their own child logger ([73e6bfe](https://github.com/statechannels/statechannels/commit/73e6bfede7cebfa407eed1026fa42d7f60c3ee1e))





# [1.8.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.7.0...@statechannels/server-wallet@1.8.0) (2020-11-03)


### Bug Fixes

* ignore older states when validating ([7993a5b](https://github.com/statechannels/statechannels/commit/7993a5ba2ff67474517559ceff4b53f5bdbe49fe))
* shouldValidate should not be async ([c5b614e](https://github.com/statechannels/statechannels/commit/c5b614ebcaf6b45e51d0163eab5516b21a84cfd2))
* typo ([675ceb5](https://github.com/statechannels/statechannels/commit/675ceb54fb566295c7036be0b9e360e7ffbe7328))
* use isLedger from channel ([b232ec9](https://github.com/statechannels/statechannels/commit/b232ec948a84eb06e071c560e66c5f45fb610c44))


### Features

* add walletVersion to Message type ([16c205c](https://github.com/statechannels/statechannels/commit/16c205c72483a7b9b3445163065c74ff88fa55f5))
* errors during pushMessage have version ([dc23ac1](https://github.com/statechannels/statechannels/commit/dc23ac17e1a60399f1f46cf798708e53856f6034))
* wallets own their own child logger ([73e6bfe](https://github.com/statechannels/statechannels/commit/73e6bfede7cebfa407eed1026fa42d7f60c3ee1e))





# [1.7.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.5.1...@statechannels/server-wallet@1.7.0) (2020-11-03)


### Bug Fixes

* add simple check for re-use of previous signed outcome ([96f102d](https://github.com/statechannels/statechannels/commit/96f102dc6bbb3832f6df50fc458b029f2518a74c))
* avoid turn number checking for null app channels ([2c7d9e7](https://github.com/statechannels/statechannels/commit/2c7d9e7c84ca2a0a8931105a03d6d8ce692c4dae))
* change status of unsupported postfund to 'opening' ([31ff797](https://github.com/statechannels/statechannels/commit/31ff79775376044f3fa95f312f40f763b5328267))
* ensure pushMessage returns latest channelResults ([146e295](https://github.com/statechannels/statechannels/commit/146e295ae23f67d45c6f6aaddeab71772f9bb2d4))
* fix broken query on ledger channels in DB ([8e81d4c](https://github.com/statechannels/statechannels/commit/8e81d4ce94f7fc03def09d0a417dee67a0dc1e70))
* pull request review comment changes ([355e967](https://github.com/statechannels/statechannels/commit/355e967d9ae36640fe31e9fa0b4f3c26225d0de5))
* remove forced turn taking requirment on post-fund setup state ([fd87502](https://github.com/statechannels/statechannels/commit/fd87502296d4e159ba455784d3d08e21d7597f66))
* remove subtely introduced additional JS ecrecover call (via deserialization fn) ([9fd9e26](https://github.com/statechannels/statechannels/commit/9fd9e26a9d75abfebe7b1b37f9f1690a5c8c57f5))
* use client-api-schema Participant for public API method ([02ed25e](https://github.com/statechannels/statechannels/commit/02ed25e17586f3c52d4561efd6f28fa1af6646f8))


### Features

* add closeChannels API to server wallet ([c996dbb](https://github.com/statechannels/statechannels/commit/c996dbbcb4beb7a03528f454ce484cae3b655918))
* add register byte code method ([ce6e5b7](https://github.com/statechannels/statechannels/commit/ce6e5b72d4bf1f6791ae906912a3f812db78e4dd))





# [1.6.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.5.1...@statechannels/server-wallet@1.6.0) (2020-11-02)


### Bug Fixes

* add simple check for re-use of previous signed outcome ([96f102d](https://github.com/statechannels/statechannels/commit/96f102dc6bbb3832f6df50fc458b029f2518a74c))
* avoid turn number checking for null app channels ([2c7d9e7](https://github.com/statechannels/statechannels/commit/2c7d9e7c84ca2a0a8931105a03d6d8ce692c4dae))
* change status of unsupported postfund to 'opening' ([31ff797](https://github.com/statechannels/statechannels/commit/31ff79775376044f3fa95f312f40f763b5328267))
* fix broken query on ledger channels in DB ([8e81d4c](https://github.com/statechannels/statechannels/commit/8e81d4ce94f7fc03def09d0a417dee67a0dc1e70))
* pull request review comment changes ([355e967](https://github.com/statechannels/statechannels/commit/355e967d9ae36640fe31e9fa0b4f3c26225d0de5))
* remove forced turn taking requirment on post-fund setup state ([fd87502](https://github.com/statechannels/statechannels/commit/fd87502296d4e159ba455784d3d08e21d7597f66))
* remove subtely introduced additional JS ecrecover call (via deserialization fn) ([9fd9e26](https://github.com/statechannels/statechannels/commit/9fd9e26a9d75abfebe7b1b37f9f1690a5c8c57f5))
* use client-api-schema Participant for public API method ([02ed25e](https://github.com/statechannels/statechannels/commit/02ed25e17586f3c52d4561efd6f28fa1af6646f8))


### Features

* add closeChannels API to server wallet ([c996dbb](https://github.com/statechannels/statechannels/commit/c996dbbcb4beb7a03528f454ce484cae3b655918))





## [1.5.1](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.5.0...@statechannels/server-wallet@1.5.1) (2020-10-30)


### Bug Fixes

* perform same alreadyhavestate check ([c2d24d9](https://github.com/statechannels/statechannels/commit/c2d24d910b7b41ba70466a502be3f4f319a5d6a6))





# [1.5.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.3.0...@statechannels/server-wallet@1.5.0) (2020-10-30)


### Bug Fixes

* add missing tx objects in db queries ([00f9a60](https://github.com/statechannels/statechannels/commit/00f9a604f786061c93491467736d4b2a0c4fea2a))
* allow funding strategy optional param on createLedgerChannel ([2fbb0e8](https://github.com/statechannels/statechannels/commit/2fbb0e8436518b71151bdd40b88a2a21a4392c0c))
* check funding amount is correct in ledger outcome for funded app ([5142f00](https://github.com/statechannels/statechannels/commit/5142f007306c74464759726cd7d6f034affcd0ff))
* disable validTransition check for ledger channels ([c3aba79](https://github.com/statechannels/statechannels/commit/c3aba7948686acb4de973076579b66a91c7d18b5))
* do not evm validate final states ([8e0feb9](https://github.com/statechannels/statechannels/commit/8e0feb9ed97075f9d7dd19bfbec4497f511727c1))
* do nothing for ledger if it is not 'running' yet ([dca98f4](https://github.com/statechannels/statechannels/commit/dca98f473deae56c6d2efc6568f45b391cf66d2c))
* ensure channel is fully finalized before requesting defunding ([c66c485](https://github.com/statechannels/statechannels/commit/c66c48571d508eb039bef8c4d5f9c4ca0edc8e97))
* ensure ledger is funded before continuing with open channel protocol ([f0ec55e](https://github.com/statechannels/statechannels/commit/f0ec55ebd8c29b15d83c8b9efe746e2c6d42cb7a))
* ensure received states are processed in order of channelNonce ([4561e3b](https://github.com/statechannels/statechannels/commit/4561e3b5ee9b6af859be7ab91e0ccb33d04f26fa))
* enter run loop once for joinChannels API call ([a7ce919](https://github.com/statechannels/statechannels/commit/a7ce9198cda85e6781ce441d4678643310eb609a))
* fetchBytecode rejects when bytecode is missing ([fe76cbb](https://github.com/statechannels/statechannels/commit/fe76cbb913f1612824a6b3326e8749ee25fad42b))
* typo ([465e9db](https://github.com/statechannels/statechannels/commit/465e9dbcebe8dd572ff294dc4c61d9f86fe332c8))
* use connext version of pure evm ([754570f](https://github.com/statechannels/statechannels/commit/754570f93686a401066f986f2851bd46ea8725db))


### Features

* add defunding of channel funded via ledger upon close ([4edd44a](https://github.com/statechannels/statechannels/commit/4edd44a5361034b8d310feab536832ebdade9d70))
* add getLedgerChannels API ([c1d7dc7](https://github.com/statechannels/statechannels/commit/c1d7dc783f5befa8d8dd1be726c805893e01e389))
* enhanced getLedgerChannels API with assetHolder and participants query args ([e7030dc](https://github.com/statechannels/statechannels/commit/e7030dc9f494bb4092e5e9315ad34c71785d67dd))





# [1.4.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.3.0...@statechannels/server-wallet@1.4.0) (2020-10-29)


### Bug Fixes

* add missing tx objects in db queries ([00f9a60](https://github.com/statechannels/statechannels/commit/00f9a604f786061c93491467736d4b2a0c4fea2a))
* allow funding strategy optional param on createLedgerChannel ([2fbb0e8](https://github.com/statechannels/statechannels/commit/2fbb0e8436518b71151bdd40b88a2a21a4392c0c))
* check funding amount is correct in ledger outcome for funded app ([5142f00](https://github.com/statechannels/statechannels/commit/5142f007306c74464759726cd7d6f034affcd0ff))
* disable validTransition check for ledger channels ([c3aba79](https://github.com/statechannels/statechannels/commit/c3aba7948686acb4de973076579b66a91c7d18b5))
* do nothing for ledger if it is not 'running' yet ([dca98f4](https://github.com/statechannels/statechannels/commit/dca98f473deae56c6d2efc6568f45b391cf66d2c))
* ensure channel is fully finalized before requesting defunding ([c66c485](https://github.com/statechannels/statechannels/commit/c66c48571d508eb039bef8c4d5f9c4ca0edc8e97))
* ensure ledger is funded before continuing with open channel protocol ([f0ec55e](https://github.com/statechannels/statechannels/commit/f0ec55ebd8c29b15d83c8b9efe746e2c6d42cb7a))
* ensure received states are processed in order of channelNonce ([4561e3b](https://github.com/statechannels/statechannels/commit/4561e3b5ee9b6af859be7ab91e0ccb33d04f26fa))
* enter run loop once for joinChannels API call ([a7ce919](https://github.com/statechannels/statechannels/commit/a7ce9198cda85e6781ce441d4678643310eb609a))
* fetchBytecode rejects when bytecode is missing ([fe76cbb](https://github.com/statechannels/statechannels/commit/fe76cbb913f1612824a6b3326e8749ee25fad42b))
* typo ([465e9db](https://github.com/statechannels/statechannels/commit/465e9dbcebe8dd572ff294dc4c61d9f86fe332c8))
* use connext version of pure evm ([754570f](https://github.com/statechannels/statechannels/commit/754570f93686a401066f986f2851bd46ea8725db))


### Features

* add defunding of channel funded via ledger upon close ([4edd44a](https://github.com/statechannels/statechannels/commit/4edd44a5361034b8d310feab536832ebdade9d70))
* add getLedgerChannels API ([c1d7dc7](https://github.com/statechannels/statechannels/commit/c1d7dc783f5befa8d8dd1be726c805893e01e389))
* enhanced getLedgerChannels API with assetHolder and participants query args ([e7030dc](https://github.com/statechannels/statechannels/commit/e7030dc9f494bb4092e5e9315ad34c71785d67dd))





# [1.3.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.2.1...@statechannels/server-wallet@1.3.0) (2020-10-29)


### Bug Fixes

* Add non-null assertion for app.supported ([e4c78c4](https://github.com/statechannels/statechannels/commit/e4c78c4750f759692fbcfe0accdb72950654f0b5))
* add withdraw as a valid chain requests column value ([a1431d1](https://github.com/statechannels/statechannels/commit/a1431d1535dc0f4737c577b440bd614507f2f0af))
* all participants attempt to submit a conclude and withdraw transacton ([6085fc4](https://github.com/statechannels/statechannels/commit/6085fc4811c5c60e9216e977c5e4a05aa43335f4))
* await chain service api calls that return a transaction response ([0ae8b84](https://github.com/statechannels/statechannels/commit/0ae8b84cf538b6c461bdf2788f12b754a9f682b2))
* capture expected errors on concludeAndWithdraw ([7d5bebc](https://github.com/statechannels/statechannels/commit/7d5bebc5b90d52bcd430eb754813f9afeb5fe8e2))
* chain service constraint down migration fully reverses up migration ([1d8e6f7](https://github.com/statechannels/statechannels/commit/1d8e6f7b81c5a1b5bc76bd0fb325e91605c41cf4))
* do not modify chain service migration ([d07c5ab](https://github.com/statechannels/statechannels/commit/d07c5ab608221aef04b123148b6f08dca8a23473))
* during runloop, do not wait for chain service network requests ([3c470ab](https://github.com/statechannels/statechannels/commit/3c470ab58e89c7c5f14d36c6bed880c91da541cc))
* eliminate infinite loop in the close channels protocol ([a0fdff0](https://github.com/statechannels/statechannels/commit/a0fdff008ca59ea91b8c73ea0a0d0353a73ade7e))
* ensure prefund setup is signed if turnNum < participants.length ([7b19ae3](https://github.com/statechannels/statechannels/commit/7b19ae3ae4f898cca34c2b8cdd0fb08cdfa54aca))
* Fix  https://github.com/statechannels/statechannels/issues/2748 ([79261cd](https://github.com/statechannels/statechannels/commit/79261cd148da26591d71ebb0861484663b4025c7))
* only the first participant submits the withdraw transaction ([f4b487d](https://github.com/statechannels/statechannels/commit/f4b487ddcb0a804ed39c483c6e7e14411a4c5133))
* only validate new states ([aca257b](https://github.com/statechannels/statechannels/commit/aca257b25cbed261efa3ca309ce9bdb2ed3a9a15))
* remove unused import ([4863611](https://github.com/statechannels/statechannels/commit/48636117383dcd3de3a23c50c99ecbddd57752ed))


### Features

* wallet requests the chain service to withdraw once final conclude state is signed ([53b387d](https://github.com/statechannels/statechannels/commit/53b387dbc76b1bbf4439c96531c5a93c17c99b17))





## [1.2.1](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.2.0...@statechannels/server-wallet@1.2.1) (2020-10-24)


### Bug Fixes

* completeOpenChannel uses turn number ([d573e5a](https://github.com/statechannels/statechannels/commit/d573e5abfcce077e4ae81a0b85eac485e00e2e09))
* type error ([2e12698](https://github.com/statechannels/statechannels/commit/2e12698ea7c2cf645e55853593b296f7155a2699))





# [1.2.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.1.0...@statechannels/server-wallet@1.2.0) (2020-10-23)


### Bug Fixes

* call evm validation with correct states ([1638834](https://github.com/statechannels/statechannels/commit/16388343273bfaf9a4fd992e023ad0bddce0b14a))
* clean up garbled text ([32734a7](https://github.com/statechannels/statechannels/commit/32734a79920aa805926d94d397e63bdbb46d24af))
* db-admin truncates all tables by default ([aee8e1e](https://github.com/statechannels/statechannels/commit/aee8e1e5d9b98827b5cc6cae6d4122c8811482d3))
* log correctly ([16ccc8b](https://github.com/statechannels/statechannels/commit/16ccc8b2fd18a8ad16f7dcf3de6b935ce5b78308))
* log error on invalid state transition of received state instead of throwing ([e69aaee](https://github.com/statechannels/statechannels/commit/e69aaeedf843f45b265639780bbd231f4b724592))
* only use evm for non funding states ([4c33fa0](https://github.com/statechannels/statechannels/commit/4c33fa00e93299da7f9533f0382c2d45eecc5fb8))
* only validate transition when not same state ([4487d3f](https://github.com/statechannels/statechannels/commit/4487d3f20f77a3a908d0f0668831e5e25f5bbb4c))
* pr feedback ([0662633](https://github.com/statechannels/statechannels/commit/0662633c553aed4bb83ea52d73242ac7f0450b0f))
* throw error when invalid not valid ([e055a30](https://github.com/statechannels/statechannels/commit/e055a307808dd367579176c861b27363c43171dc))
* use isequal for comparison ([388ae94](https://github.com/statechannels/statechannels/commit/388ae941f314874222a4be43e46de3c688fdcf69))


### Features

* validate force move rules in typescript ([b463eb7](https://github.com/statechannels/statechannels/commit/b463eb7ceb6b251900ab500d0c378d236ed0a8bb))





# [1.1.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@1.0.0...@statechannels/server-wallet@1.1.0) (2020-10-22)


### Bug Fixes

* add missing CloseChannel objective outbound from wallet ([be8bb9a](https://github.com/statechannels/statechannels/commit/be8bb9acf5bcd2fbb7c4be8cb9ffb277ceda397f))
* add missing property ([08a6ff0](https://github.com/statechannels/statechannels/commit/08a6ff0937df773a04547fddd8a6d03b0aefbb75))
* add Objectives table to truncate() ([b77e04c](https://github.com/statechannels/statechannels/commit/b77e04c5a0ef6ad3d27db10fe4d1e909770a9ec1))
* assertion on turn number ([60b3b0a](https://github.com/statechannels/statechannels/commit/60b3b0a0e831055f6ca6f69dfaa9a0f2f6dc7de9))
* bandaid solution to push maximum nonce upwards on receipt of a new channel ([c3ee0ee](https://github.com/statechannels/statechannels/commit/c3ee0ee0deb1fe8868410d019912b30aa576de00))
* check objective type before approving ([236448e](https://github.com/statechannels/statechannels/commit/236448e7bc40ed515cbf1328e0f53c00f9898fbf))
* commit objective and associations in a db trx ([f1c05a2](https://github.com/statechannels/statechannels/commit/f1c05a2d4556d62034394c5af1d1bf379253c0f2))
* don't run the run loop for pending objectives ([dfde5b5](https://github.com/statechannels/statechannels/commit/dfde5b5c8a6e32f6b12f286a373e288490c73140))
* ensure Nonce gets bumped on reception of new signed states ([9d5bf6a](https://github.com/statechannels/statechannels/commit/9d5bf6ab457544a8b44b21f8df2845865a4c8dfa))
* ensure received states are processed in order of channelNonce ([171284b](https://github.com/statechannels/statechannels/commit/171284b4893859512f9c7cf7ea9ee640feaca136))
* enter run loop once for joinChannels API call ([dba768f](https://github.com/statechannels/statechannels/commit/dba768f1606d0963d0d66b247155271df82f6d15))
* extract first objective from array ([b5b4e8e](https://github.com/statechannels/statechannels/commit/b5b4e8e66945e3c276a63d965d5cf5b336e0d1e0))
* fix relation mappings to get e2e test to pass ([b364ec7](https://github.com/statechannels/statechannels/commit/b364ec792d973c26db73530ea22e6ab6a98f7efc))
* improved inference of referenced channels ([9a453b8](https://github.com/statechannels/statechannels/commit/9a453b8c263c210ce3801337f02cdb7ff2b8637f))
* join all channels ([fbb4e29](https://github.com/statechannels/statechannels/commit/fbb4e29e154ae167ddf0faef953d2766b0adae2d))
* prevent require loop ([e1ad490](https://github.com/statechannels/statechannels/commit/e1ad490aba699a0eff8003c67bd8382c340958f4))
* sign prefund setup regardless of previously signed states ([55d2aee](https://github.com/statechannels/statechannels/commit/55d2aeedac85faf7fd7bed77db845bd1bc210291))
* typo ([39d1805](https://github.com/statechannels/statechannels/commit/39d1805325113731489bc9e6467bc20cddde0275))
* typo ([2848deb](https://github.com/statechannels/statechannels/commit/2848deb0f070ac83a6e77a423d92aeb3ecff23c7))
* typos ([cc1443a](https://github.com/statechannels/statechannels/commit/cc1443a48ba2f4d19211e9395098760d096b9ac8))
* typos ([7e6a749](https://github.com/statechannels/statechannels/commit/7e6a749211a0fef0a2c0240f15e79fd832f2726e))
* use defaultTestConfig in test ([0296b50](https://github.com/statechannels/statechannels/commit/0296b5052df38abd8fe571e6a7c3e7fcbb469ada))
* use placeholder in fundingStrategy (for now) ([f7556fd](https://github.com/statechannels/statechannels/commit/f7556fd1fa0bac20cf872796c132ec8d83b30cfd))
* use symbol import instead of path ([12a4774](https://github.com/statechannels/statechannels/commit/12a4774cd7acdfc13b552b392cea26355b9baae9))
* use two queries ([2fa6617](https://github.com/statechannels/statechannels/commit/2fa6617182e1f624874c0993a5a63924fbc500a7))


### Features

* add stored objectives and approveObjective API method ([37ed94c](https://github.com/statechannels/statechannels/commit/37ed94c85ce984fdf583eef92e1250625c591565))
* some objective columns are foreign keys ([c8af6ef](https://github.com/statechannels/statechannels/commit/c8af6ef45578560c7077fe6225c9afc3b377d82e))


### Reverts

* Revert "refactor: add participants column" ([b456aee](https://github.com/statechannels/statechannels/commit/b456aeeedea10cc70a3212b639cbd7109948fa82))





# [1.0.0](https://github.com/statechannels/statechannels/compare/@statechannels/server-wallet@0.4.0...@statechannels/server-wallet@1.0.0) (2020-10-20)


### Bug Fixes

* add knex configuration to migrateDB ([4af7ade](https://github.com/statechannels/statechannels/commit/4af7ade2591a502db0d35a392485f817f20ed87f))
* add skipEvm check ([f86e365](https://github.com/statechannels/statechannels/commit/f86e3659df613a1afea9b180c08dc0521269a8ae))
* add support for 'Unfunded' funding strategy ([528e776](https://github.com/statechannels/statechannels/commit/528e77600ec54496f214f47406bdd6c22be4f82e))
* bind registerAppDefintion ([348f321](https://github.com/statechannels/statechannels/commit/348f321cb33402bfc4a8478b323d1f43aa5a4338))
* fix function name change ([69600bc](https://github.com/statechannels/statechannels/commit/69600bc0574c77cf78e4512eddb8a012beb69dd7))
* get test passing ([cbf70f5](https://github.com/statechannels/statechannels/commit/cbf70f5b23dd5aebd41ad75b560b49f52c808996))
* remove redundant destroy ([d7b0249](https://github.com/statechannels/statechannels/commit/d7b024957f3c72502f8d9e01dd1fdbe50da71f29))
* remove unnecessary import of built javascript code ([0a42993](https://github.com/statechannels/statechannels/commit/0a42993dfb736b5e6f0a4d7a0f703d740f4d549c))
* switch e2e to use test config ([02c0f28](https://github.com/statechannels/statechannels/commit/02c0f28b7cea392cda34f4995b5ad354d51146d2))
* switch insert to upsert ([8f4db93](https://github.com/statechannels/statechannels/commit/8f4db931395a5a8d6c899b431d61c8866b793787))
* update test to check for false ([8f28d32](https://github.com/statechannels/statechannels/commit/8f28d32f9aed6b1f940d6f3a9ea03cfb17c3ac32))
* update test to use default test config ([b592c01](https://github.com/statechannels/statechannels/commit/b592c01d01f9a9c0422474f6b9dcf1e1a034ea8b))
* use default test config in start.ts ([9034f49](https://github.com/statechannels/statechannels/commit/9034f49382b1d4d243f6f55d9a6f3af767577c71))


### Code Refactoring

* remove db-admin-connection.ts ([a4074a9](https://github.com/statechannels/statechannels/commit/a4074a984822ece0f8c6bca5184786a895888c07))


### Features

* Add Register App Definition ([18c34e0](https://github.com/statechannels/statechannels/commit/18c34e0a73a278226bca5e4b2ee371b9baea5a1f))
* fail validation if no bytecode ([eb14b13](https://github.com/statechannels/statechannels/commit/eb14b13fc4dbb0caa41049977d166c5c62ff04f7))
* increasing turn number for postfund setup ([9225c61](https://github.com/statechannels/statechannels/commit/9225c617ca83d99047a0f3d2ac8f77ec9f6a57dc)), closes [/www.notion.so/Server-wallet-application-Bob-Alice-communication-c0127c3196694e14bd0cf4858955fa96#032978ba91394e87a9774c94fb1222a0](https://github.com//www.notion.so/Server-wallet-application-Bob-Alice-communication-c0127c3196694e14bd0cf4858955fa96/issues/032978ba91394e87a9774c94fb1222a0)
* prefund setup for b is now turn 1 ([660cce1](https://github.com/statechannels/statechannels/commit/660cce17d7794a913775dc3052d7ff868debb0ef))
* unregisterChannel chain service api ([0b9b38d](https://github.com/statechannels/statechannels/commit/0b9b38d38e267610b7294419c549b8809068deb3))


### BREAKING CHANGES

* - Replicate node_env check in DBAdmin.truncateDB()
- Use this ^ fn instead of truncate()
- No longer use a separate "adminKnex"





# 0.4.0 (2020-10-13)


### Bug Fixes

* decrement nonce on sendTransaction failure ([8ea443a](https://github.com/statechannels/statechannels/commit/8ea443a98caace69958bc48583b5be0ec2893fe0))
* Pin and normalize jest and ts-jest dependencies ([e9ca399](https://github.com/statechannels/statechannels/commit/e9ca3997119645fdb9f558a921361171c20d66a0))


### Features

* add AssetTransferred event to chain service ([530f31c](https://github.com/statechannels/statechannels/commit/530f31c473f48c6d00b26798e0f51005e86d2b66))
* add chain service concludeAndWithdraw ([ab5b543](https://github.com/statechannels/statechannels/commit/ab5b5433d5ff01addc50e1b3f22bbc0934b4db47))
* add create/drop/truncate db to the DBAdmin ([7ff5b85](https://github.com/statechannels/statechannels/commit/7ff5b85b878e5d179998454cecc7f9d6939e5edb))
* add dbAdmin class to Wallet ([a347c68](https://github.com/statechannels/statechannels/commit/a347c68262315269eb98eb19c3889c7a35f593c8))
* chain service fundChannel optionally calls increaseAllowance ([14b3eb6](https://github.com/statechannels/statechannels/commit/14b3eb64c848e30851e2402221b544fc042a14fd)), closes [/github.com/statechannels/statechannels/pull/2645#discussion_r499715014](https://github.com//github.com/statechannels/statechannels/pull/2645/issues/discussion_r499715014)
* send a single transaction at a time. ([a0e788d](https://github.com/statechannels/statechannels/commit/a0e788de18882a394b908c67296ae05f9f0e06c4))



## 0.3.10 (2020-10-05)


### Bug Fixes

* progress toward launching chain service tests through vs code ([5afb544](https://github.com/statechannels/statechannels/commit/5afb544a01fd579dde4aa2cbfb8851d2d57c54bf))


### Features

* add erc20 funding to the chain service ([1cadcdf](https://github.com/statechannels/statechannels/commit/1cadcdfe0aeb992efd0afa75f5a6cc4ef3bf9cc0))



## 0.3.10-alpha.1 (2020-10-02)



## 0.3.10-alpha.0 (2020-10-02)


### Bug Fixes

* add channel id filtering to registerChannel ([4a47cbc](https://github.com/statechannels/statechannels/commit/4a47cbc9d976d394a952da4af555e3ba0175e6c9))
* contract listener receives an array of arguments, not an object ([4a0346e](https://github.com/statechannels/statechannels/commit/4a0346e891c893912994a2cfb3aedea15639a186))
* filter on channelId after adding the observable to addressToObservable ([d128ab1](https://github.com/statechannels/statechannels/commit/d128ab1fa5625665ea056b2bba3e69dee3c84d2f))
* properly fire the initial holdings value ([77b4eb3](https://github.com/statechannels/statechannels/commit/77b4eb374a1dd8fac836ff09fd07d9d46787edb0))


### Features

* add chain-service destructor ([c9b323b](https://github.com/statechannels/statechannels/commit/c9b323ba6575a586b6dd0b1035b39c6ca636b413))
* add ChainObserver registerChannel ([2c844da](https://github.com/statechannels/statechannels/commit/2c844da919319d63d4b5d2bde78e216d381743c9))
* add ChainService ([83e02dd](https://github.com/statechannels/statechannels/commit/83e02dd72c30e778dbdeae2b5f5384c306914c5c))
* send initial funding value to observers ([404167d](https://github.com/statechannels/statechannels/commit/404167dabbf81aa70fbd01be44b4a07241533246))
* **server-wallet:** respond to setFunding call from ChainService ([cc2c684](https://github.com/statechannels/statechannels/commit/cc2c68436d4008a87e8c1ecb959cd41b79ba670d))
* **server-wallet:** wire up wallet for funding events ([a8ed826](https://github.com/statechannels/statechannels/commit/a8ed8262b805cd4ec31e2f31c323fd101b4ad59a))



## 0.3.9 (2020-09-30)


### Performance Improvements

* modest getChannel speed up ([12bff99](https://github.com/statechannels/statechannels/commit/12bff99f7238001b4cda3bb3d8200932d99bc604))



## 0.3.9-alpha.0 (2020-09-30)


### Bug Fixes

* Replace build command with prepare command ([401087d](https://github.com/statechannels/statechannels/commit/401087db33113b401520b1c6368665c8f2ccbf27))


### Features

* Add default value to chainServiceRequests to allow migrations with existing rows ([34f8264](https://github.com/statechannels/statechannels/commit/34f82649056d88c505911277b93accc995057134))



## 0.3.8-alpha.0 (2020-09-24)


### Bug Fixes

* **server-wallet:** Insist on Store construction with Knex provided ([112011b](https://github.com/statechannels/statechannels/commit/112011bdf717c92aa8bfde4f3f8634e46fc34976))
* **server-wallet:** Rename closeDatabaseConnection to destroy ([702ab67](https://github.com/statechannels/statechannels/commit/702ab67140e9afeeda188b048858232694f6e35e))
* **server-wallet:** Restore knex as mutable property of Wallet ([e375c0c](https://github.com/statechannels/statechannels/commit/e375c0c278c2c9d75773fb596b1c70f123993156))
* **server-wallet:** Restrict outbox object type to MessageQueuedNotification ([2417953](https://github.com/statechannels/statechannels/commit/24179539643e00a277d65fd674dc5f68337afa94))


### Features

* Remove CreateChannel objective ([d87d3b6](https://github.com/statechannels/statechannels/commit/d87d3b68e9a84945b105c7883aaf130176264a42))
* Send OpenChannel objective instead of CreateChannel objective ([1f198b8](https://github.com/statechannels/statechannels/commit/1f198b857e4a1463c890f5d40041d7e0d6bf1dbc))
* stores addSignedState creates channel if one does not exist ([7389704](https://github.com/statechannels/statechannels/commit/73897047e8b03ecdff96a3a5857602c6df01481e))



## 0.3.7 (2020-09-23)


### Bug Fixes

* **server-wallet:** Destroy Knex connection in Jest tests ([af48635](https://github.com/statechannels/statechannels/commit/af486352e0933e68a393cc262986d2443f0d68d8))
* **server-wallet:** Don't re-export from client-api-schema ([2081704](https://github.com/statechannels/statechannels/commit/208170486df69eef87dc8348cb8c9bd77cc528ee))
* **server-wallet:** Use more correct up-to-date types for server wallet ([3cf3377](https://github.com/statechannels/statechannels/commit/3cf337790265a7abb9273d9e8d9b2a95bc3afe79))
* add CreateChannel objective everywhere objectives are defined ([17f5518](https://github.com/statechannels/statechannels/commit/17f5518c1d396d3d552573794422b7e6ce5c7097))
* Remove Unfunded from FundingStrategy in wire-format and client-api-schema ([1dceeff](https://github.com/statechannels/statechannels/commit/1dceeff362ea3b371c9b2bac8167acecb8b52949))
* sort out problems with serializing/deserializing CreateChannel objective ([2147a41](https://github.com/statechannels/statechannels/commit/2147a41e5a8190d185a300722d3b61203793f26b))
* switch to unknown in wallet interface too ([e02d05f](https://github.com/statechannels/statechannels/commit/e02d05fb1daac1aa0c6169dfdec3413bcf5f767f))
* **server-wallet:** remove copy/pasted comment ([5930670](https://github.com/statechannels/statechannels/commit/59306706f3e003173f10841130c13b8c4ee074be))


### Features

* **server-wallet:** add chain service requests to database ([0586a3b](https://github.com/statechannels/statechannels/commit/0586a3bc20968485f9aeef335feb07fc04ead992))
* **server-wallet:** Add closeDatabaseConnections method to Store ([4c3b51d](https://github.com/statechannels/statechannels/commit/4c3b51dcdda3de398be556daf9bca66f3667e414))
* **server-wallet:** add CreateChannel objective ([cacd9b7](https://github.com/statechannels/statechannels/commit/cacd9b7cf55c958168e3d521ad40b80e475f2705))
* **server-wallet:** Add funding strategy ([01ac241](https://github.com/statechannels/statechannels/commit/01ac241ceac7701fa525d0322496969463728ad4))
* **server-wallet:** add fundingStrategy as a required column of the Channel model ([281e9e5](https://github.com/statechannels/statechannels/commit/281e9e5341e035744afc636c0aca8bc03fe16a3b))
* **server-wallet:** chainServiceRequests column is not nullable ([96d2ada](https://github.com/statechannels/statechannels/commit/96d2ada7bcbbb10edc35f3517064eb381774df9e))
* **server-wallet:** default to Unknown funding strategy in channels table ([2938053](https://github.com/statechannels/statechannels/commit/29380531f20c385583bd2fa86bf2122bb968ec38))
* **server-wallet:** migrate from submit transaction to fundChannel ([361ed42](https://github.com/statechannels/statechannels/commit/361ed42381c101db3918e289de53df7d84e184df))
* **server-wallet:** validate chain_service_requests database constraint ([8e91764](https://github.com/statechannels/statechannels/commit/8e917646eed3d2bdda05b0011058c0b682228803)), closes [/github.com/statechannels/statechannels/pull/2561#discussion_r491507854](https://github.com//github.com/statechannels/statechannels/pull/2561/issues/discussion_r491507854)
* server-wallet uses (and validates) correct wire-format ([1039c3f](https://github.com/statechannels/statechannels/commit/1039c3f1493237ca085a531da1c6a8d84802b6bd))
* **server-wallet:** record chain service funding request in the database ([ad6c734](https://github.com/statechannels/statechannels/commit/ad6c7345ff818eef5e362408fd8b1711a43b323e))
* **server-wallet:** send CreateChannel objective on channel creation ([e1b5f77](https://github.com/statechannels/statechannels/commit/e1b5f7726058c83b060ef71c7f7aa755f277feae))
* **server-wallet:** Trigger direct funding in application protocol ([c8b7046](https://github.com/statechannels/statechannels/commit/c8b704624e45c986e2c82e2971feda4ab93b499f))



## 0.3.6 (2020-09-09)



## 0.3.5 (2020-09-04)



## 0.3.4 (2020-08-25)



# 0.3.0 (2020-08-18)



# 0.2.0 (2020-08-05)
