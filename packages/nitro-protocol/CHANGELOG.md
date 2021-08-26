# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.17.3](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.17.2...@statechannels/nitro-protocol@0.17.3) (2021-08-26)

**Note:** Version bump only for package @statechannels/nitro-protocol





## [0.17.2](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.17.1...@statechannels/nitro-protocol@0.17.2) (2021-08-04)


### Bug Fixes

* apply challengerAdrss changes lost in rebase ([787fe77](https://github.com/statechannels/monorepo/commit/787fe7780a9dbe5b089c4f1d526e080760ae039f))
* import/export computeNewOutcome thru entry point ([#3718](https://github.com/statechannels/monorepo/issues/3718)) ([75539cc](https://github.com/statechannels/monorepo/commit/75539cc40e68ee82be6db696105d29ff04fb5cf1))
* remove unnecessary parameter from ChannelData ([6338901](https://github.com/statechannels/monorepo/commit/63389014670de5c638f8279f40ebd61d8c823601))
* typo in doccomment ([4b25c8c](https://github.com/statechannels/monorepo/commit/4b25c8c3c4958e876c62c2784f2e31a4429ff303))





## [0.17.1](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.17.0...@statechannels/nitro-protocol@0.17.1) (2021-07-28)


### Reverts

* Revert "require nonzero holdings in _transfer" ([bd71f1b](https://github.com/statechannels/monorepo/commit/bd71f1b4bcf9bd21271b4236ebc769f8d25b5448))





# [0.17.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.16.0...@statechannels/nitro-protocol@0.17.0) (2021-03-19)


### Features

* add HashLockArtifact ([f7dec32](https://github.com/statechannels/monorepo/commit/f7dec322f9833b3f071a1955648ee1789eae51d2))





# [0.16.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.11.1...@statechannels/nitro-protocol@0.16.0) (2021-02-11)


### Bug Fixes

* correct nitro-protocol dependencies ([84df179](https://github.com/statechannels/monorepo/commit/84df17933738a0c7719cf586146321a3fc34468f))
* don't use unsupported chars ([850fb50](https://github.com/statechannels/monorepo/commit/850fb509edb23a4926837bc05af0d17c7e3a3b9b))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/monorepo/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* move TokenArtifact to TestContractArtifacts ([d236f6f](https://github.com/statechannels/monorepo/commit/d236f6ff7bb44aecde2a10312cd5a2f730fa42c7))
* prevent underflow ([6522107](https://github.com/statechannels/monorepo/commit/65221077c1a9045f0efae7c1b18714b6e48ae251))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/monorepo/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* update reason strings in client and tests ([b0aa183](https://github.com/statechannels/monorepo/commit/b0aa183f1dd1ece9ca2acf11082db01c2b6d6dca))


### Features

* accept a list of indices in transfer method ([#3049](https://github.com/statechannels/monorepo/issues/3049)) ([30fdf52](https://github.com/statechannels/monorepo/commit/30fdf520b3890f4d22ef4bbb721580702192c5d0))
* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/monorepo/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add computeNewAllocationWithGuarantee() ([11f5fe7](https://github.com/statechannels/monorepo/commit/11f5fe7bd38e0be96b3e46f769c0cb2079583711))
* add requieValidProtocolTransition fn ([fdb8725](https://github.com/statechannels/monorepo/commit/fdb8725b6654b393413ebc14efd57d2036ac1bca))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/monorepo/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* claim method acceps indices array ([7137255](https://github.com/statechannels/monorepo/commit/7137255542a7438545d362a7281c0a148b388755))
* ensure all reason strings are distinct ([1c87198](https://github.com/statechannels/monorepo/commit/1c8719894de88d57012ebd7654ba6ba13e13604f))
* export CountingAppArtifact ([3758f6c](https://github.com/statechannels/monorepo/commit/3758f6ca24c49ef17073c64f8ef96598f234f45c))
* reason string if FMA.validTrans = false ([46d1503](https://github.com/statechannels/monorepo/commit/46d15035302a3ec28a24ce8d06089e41561f48b7))
* replace AssetTransferred with AllocationUpdated event ([#3074](https://github.com/statechannels/monorepo/issues/3074)) ([bef8424](https://github.com/statechannels/monorepo/commit/bef8424605e7bb956d7bdc971ac4eae1628f6bfb))


### Performance Improvements

* all reason strings 32 bytes or less ([f903269](https://github.com/statechannels/monorepo/commit/f903269957e0473bb70a957862e6841581ad8c74))
* do not rehash unecessary data ([89f5f26](https://github.com/statechannels/monorepo/commit/89f5f2629302f6c2eb5a4c112e5f1582467c889c))
* remove claimAll from AssetHolder interface ([#3108](https://github.com/statechannels/monorepo/issues/3108)) ([63c0150](https://github.com/statechannels/monorepo/commit/63c01508aec80e91a3dfff7a06e2dfd0f3a651e2))
* remove transferAll from API ([59284d9](https://github.com/statechannels/monorepo/commit/59284d92d856881913fcb7f2f49b0401cac64473))
* shorten revert-reason ([5847227](https://github.com/statechannels/monorepo/commit/5847227a5d7c7590a73446968d09ce23c3d9fd43))





# [0.15.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.11.1...@statechannels/nitro-protocol@0.15.0) (2021-02-05)


### Bug Fixes

* correct nitro-protocol dependencies ([84df179](https://github.com/statechannels/monorepo/commit/84df17933738a0c7719cf586146321a3fc34468f))
* don't use unsupported chars ([850fb50](https://github.com/statechannels/monorepo/commit/850fb509edb23a4926837bc05af0d17c7e3a3b9b))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/monorepo/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* move TokenArtifact to TestContractArtifacts ([d236f6f](https://github.com/statechannels/monorepo/commit/d236f6ff7bb44aecde2a10312cd5a2f730fa42c7))
* prevent underflow ([6522107](https://github.com/statechannels/monorepo/commit/65221077c1a9045f0efae7c1b18714b6e48ae251))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/monorepo/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* update reason strings in client and tests ([b0aa183](https://github.com/statechannels/monorepo/commit/b0aa183f1dd1ece9ca2acf11082db01c2b6d6dca))


### Features

* accept a list of indices in transfer method ([#3049](https://github.com/statechannels/monorepo/issues/3049)) ([30fdf52](https://github.com/statechannels/monorepo/commit/30fdf520b3890f4d22ef4bbb721580702192c5d0))
* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/monorepo/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add computeNewAllocationWithGuarantee() ([11f5fe7](https://github.com/statechannels/monorepo/commit/11f5fe7bd38e0be96b3e46f769c0cb2079583711))
* add requieValidProtocolTransition fn ([fdb8725](https://github.com/statechannels/monorepo/commit/fdb8725b6654b393413ebc14efd57d2036ac1bca))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/monorepo/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* claim method acceps indices array ([7137255](https://github.com/statechannels/monorepo/commit/7137255542a7438545d362a7281c0a148b388755))
* ensure all reason strings are distinct ([1c87198](https://github.com/statechannels/monorepo/commit/1c8719894de88d57012ebd7654ba6ba13e13604f))
* export CountingAppArtifact ([3758f6c](https://github.com/statechannels/monorepo/commit/3758f6ca24c49ef17073c64f8ef96598f234f45c))
* reason string if FMA.validTrans = false ([46d1503](https://github.com/statechannels/monorepo/commit/46d15035302a3ec28a24ce8d06089e41561f48b7))
* replace AssetTransferred with AllocationUpdated event ([#3074](https://github.com/statechannels/monorepo/issues/3074)) ([bef8424](https://github.com/statechannels/monorepo/commit/bef8424605e7bb956d7bdc971ac4eae1628f6bfb))


### Performance Improvements

* all reason strings 32 bytes or less ([f903269](https://github.com/statechannels/monorepo/commit/f903269957e0473bb70a957862e6841581ad8c74))
* do not rehash unecessary data ([89f5f26](https://github.com/statechannels/monorepo/commit/89f5f2629302f6c2eb5a4c112e5f1582467c889c))
* remove claimAll from AssetHolder interface ([#3108](https://github.com/statechannels/monorepo/issues/3108)) ([63c0150](https://github.com/statechannels/monorepo/commit/63c01508aec80e91a3dfff7a06e2dfd0f3a651e2))
* remove transferAll from API ([59284d9](https://github.com/statechannels/monorepo/commit/59284d92d856881913fcb7f2f49b0401cac64473))
* shorten revert-reason ([5847227](https://github.com/statechannels/monorepo/commit/5847227a5d7c7590a73446968d09ce23c3d9fd43))





# [0.14.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.11.1...@statechannels/nitro-protocol@0.14.0) (2021-01-26)


### Bug Fixes

* correct nitro-protocol dependencies ([84df179](https://github.com/statechannels/monorepo/commit/84df17933738a0c7719cf586146321a3fc34468f))
* don't use unsupported chars ([850fb50](https://github.com/statechannels/monorepo/commit/850fb509edb23a4926837bc05af0d17c7e3a3b9b))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/monorepo/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* move TokenArtifact to TestContractArtifacts ([d236f6f](https://github.com/statechannels/monorepo/commit/d236f6ff7bb44aecde2a10312cd5a2f730fa42c7))
* prevent underflow ([6522107](https://github.com/statechannels/monorepo/commit/65221077c1a9045f0efae7c1b18714b6e48ae251))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/monorepo/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* update reason strings in client and tests ([b0aa183](https://github.com/statechannels/monorepo/commit/b0aa183f1dd1ece9ca2acf11082db01c2b6d6dca))


### Features

* accept a list of indices in transfer method ([#3049](https://github.com/statechannels/monorepo/issues/3049)) ([30fdf52](https://github.com/statechannels/monorepo/commit/30fdf520b3890f4d22ef4bbb721580702192c5d0))
* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/monorepo/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add computeNewAllocationWithGuarantee() ([11f5fe7](https://github.com/statechannels/monorepo/commit/11f5fe7bd38e0be96b3e46f769c0cb2079583711))
* add requieValidProtocolTransition fn ([fdb8725](https://github.com/statechannels/monorepo/commit/fdb8725b6654b393413ebc14efd57d2036ac1bca))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/monorepo/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* claim method acceps indices array ([7137255](https://github.com/statechannels/monorepo/commit/7137255542a7438545d362a7281c0a148b388755))
* ensure all reason strings are distinct ([1c87198](https://github.com/statechannels/monorepo/commit/1c8719894de88d57012ebd7654ba6ba13e13604f))
* reason string if FMA.validTrans = false ([46d1503](https://github.com/statechannels/monorepo/commit/46d15035302a3ec28a24ce8d06089e41561f48b7))
* replace AssetTransferred with AllocationUpdated event ([#3074](https://github.com/statechannels/monorepo/issues/3074)) ([bef8424](https://github.com/statechannels/monorepo/commit/bef8424605e7bb956d7bdc971ac4eae1628f6bfb))


### Performance Improvements

* all reason strings 32 bytes or less ([f903269](https://github.com/statechannels/monorepo/commit/f903269957e0473bb70a957862e6841581ad8c74))
* do not rehash unecessary data ([89f5f26](https://github.com/statechannels/monorepo/commit/89f5f2629302f6c2eb5a4c112e5f1582467c889c))
* remove claimAll from AssetHolder interface ([#3108](https://github.com/statechannels/monorepo/issues/3108)) ([63c0150](https://github.com/statechannels/monorepo/commit/63c01508aec80e91a3dfff7a06e2dfd0f3a651e2))
* remove transferAll from API ([59284d9](https://github.com/statechannels/monorepo/commit/59284d92d856881913fcb7f2f49b0401cac64473))
* shorten revert-reason ([5847227](https://github.com/statechannels/monorepo/commit/5847227a5d7c7590a73446968d09ce23c3d9fd43))





# [0.13.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.11.1...@statechannels/nitro-protocol@0.13.0) (2021-01-20)


### Bug Fixes

* correct nitro-protocol dependencies ([84df179](https://github.com/statechannels/monorepo/commit/84df17933738a0c7719cf586146321a3fc34468f))
* don't use unsupported chars ([850fb50](https://github.com/statechannels/monorepo/commit/850fb509edb23a4926837bc05af0d17c7e3a3b9b))
* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/monorepo/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* move TokenArtifact to TestContractArtifacts ([d236f6f](https://github.com/statechannels/monorepo/commit/d236f6ff7bb44aecde2a10312cd5a2f730fa42c7))
* prevent underflow ([6522107](https://github.com/statechannels/monorepo/commit/65221077c1a9045f0efae7c1b18714b6e48ae251))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/monorepo/commit/4eb1114b9a88320153107a5acf009e929af951e1))
* update reason strings in client and tests ([b0aa183](https://github.com/statechannels/monorepo/commit/b0aa183f1dd1ece9ca2acf11082db01c2b6d6dca))


### Features

* accept a list of indices in transfer method ([#3049](https://github.com/statechannels/monorepo/issues/3049)) ([30fdf52](https://github.com/statechannels/monorepo/commit/30fdf520b3890f4d22ef4bbb721580702192c5d0))
* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/monorepo/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add computeNewAllocationWithGuarantee() ([11f5fe7](https://github.com/statechannels/monorepo/commit/11f5fe7bd38e0be96b3e46f769c0cb2079583711))
* add requieValidProtocolTransition fn ([fdb8725](https://github.com/statechannels/monorepo/commit/fdb8725b6654b393413ebc14efd57d2036ac1bca))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/monorepo/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* claim method acceps indices array ([7137255](https://github.com/statechannels/monorepo/commit/7137255542a7438545d362a7281c0a148b388755))
* ensure all reason strings are distinct ([1c87198](https://github.com/statechannels/monorepo/commit/1c8719894de88d57012ebd7654ba6ba13e13604f))
* reason string if FMA.validTrans = false ([46d1503](https://github.com/statechannels/monorepo/commit/46d15035302a3ec28a24ce8d06089e41561f48b7))
* replace AssetTransferred with AllocationUpdated event ([#3074](https://github.com/statechannels/monorepo/issues/3074)) ([bef8424](https://github.com/statechannels/monorepo/commit/bef8424605e7bb956d7bdc971ac4eae1628f6bfb))


### Performance Improvements

* all reason strings 32 bytes or less ([f903269](https://github.com/statechannels/monorepo/commit/f903269957e0473bb70a957862e6841581ad8c74))
* remove claimAll from AssetHolder interface ([#3108](https://github.com/statechannels/monorepo/issues/3108)) ([63c0150](https://github.com/statechannels/monorepo/commit/63c01508aec80e91a3dfff7a06e2dfd0f3a651e2))
* remove transferAll from API ([59284d9](https://github.com/statechannels/monorepo/commit/59284d92d856881913fcb7f2f49b0401cac64473))
* shorten revert-reason ([5847227](https://github.com/statechannels/monorepo/commit/5847227a5d7c7590a73446968d09ce23c3d9fd43))





# [0.12.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.11.1...@statechannels/nitro-protocol@0.12.0) (2020-12-15)


### Bug Fixes

* ensure isExternalDestination is exported ([af4a741](https://github.com/statechannels/monorepo/commit/af4a74137ec5925fa1d300aa6a544950bf6d3730))
* pushOutcome transaction creator should not assume challenger address ([4eb1114](https://github.com/statechannels/monorepo/commit/4eb1114b9a88320153107a5acf009e929af951e1))


### Features

* accept a list of indices in transfer method ([#3049](https://github.com/statechannels/monorepo/issues/3049)) ([30fdf52](https://github.com/statechannels/monorepo/commit/30fdf520b3890f4d22ef4bbb721580702192c5d0))
* add a mocked out chain service channelFinalized API ([2e31d92](https://github.com/statechannels/monorepo/commit/2e31d92f8e0997cf9ca9924ff6f38d2ba9530dd4))
* add requieValidProtocolTransition fn ([fdb8725](https://github.com/statechannels/monorepo/commit/fdb8725b6654b393413ebc14efd57d2036ac1bca))
* basic chain service challenging ([0f7b66f](https://github.com/statechannels/monorepo/commit/0f7b66fa97fba539cf56837c9e68fe3013b979ae))
* reason string if FMA.validTrans = false ([46d1503](https://github.com/statechannels/monorepo/commit/46d15035302a3ec28a24ce8d06089e41561f48b7))


### Performance Improvements

* shorten revert-reason ([5847227](https://github.com/statechannels/monorepo/commit/5847227a5d7c7590a73446968d09ce23c3d9fd43))





## [0.11.2](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.11.1...@statechannels/nitro-protocol@0.11.2) (2020-12-04)

**Note:** Version bump only for package @statechannels/nitro-protocol





## [0.11.1](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.11.0...@statechannels/nitro-protocol@0.11.1) (2020-12-02)

**Note:** Version bump only for package @statechannels/nitro-protocol





# [0.11.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.10.1...@statechannels/nitro-protocol@0.11.0) (2020-12-01)


### Bug Fixes

* add input validation to ForceMove functions ([1a43c65](https://github.com/statechannels/monorepo/commit/1a43c654fa0f687fe765971fa55d2239ddf911f2))
* use hexZeroPad to normalize string as bytes32 versus BigNumber.from ([#2982](https://github.com/statechannels/monorepo/issues/2982)) ([4ed1b19](https://github.com/statechannels/monorepo/commit/4ed1b195a3f2a32cf470c4c73bd7c67fd40cbf00))


### Features

* emit finalizesAt in Conclude event ([a377031](https://github.com/statechannels/monorepo/commit/a377031e34278124423ce893ee58ea64042518d0))
* make requireValidInput pubilc ([d7c0ce5](https://github.com/statechannels/monorepo/commit/d7c0ce5f90ccf02fcd531c0d95a750ff637e7011))
* pushOutcomeTransaction.channelWasConcluded ([3c630fb](https://github.com/statechannels/monorepo/commit/3c630fb0837175be5705b11e3f8dfed76485ff87))


### Performance Improvements

* enable solidity compiler optimization ([#2985](https://github.com/statechannels/monorepo/issues/2985)) ([655ee75](https://github.com/statechannels/monorepo/commit/655ee758c4a3e176238585d4cc6a7610b4a06891))
* remove unecessary abi.encode ([#2955](https://github.com/statechannels/monorepo/issues/2955)) ([4e623ee](https://github.com/statechannels/monorepo/commit/4e623ee8608d7cf021374bd8429e0cc4c44e5fab))





## [0.10.1](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.10.0...@statechannels/nitro-protocol@0.10.1) (2020-11-26)


### Performance Improvements

* convert ForceMove methods to external ([c7b02fc](https://github.com/statechannels/monorepo/commit/c7b02fc151c8110b03a1b1931833828d5befdd09))
* convert public methods to external ([2a5d3d2](https://github.com/statechannels/monorepo/commit/2a5d3d23cdf3bc672a009efac7b94efe0810e381))
* IForceMove methods external, not public ([63169a0](https://github.com/statechannels/monorepo/commit/63169a0e97e617cf6ffedaf5da8cf1886c055f13))
* make ERC20AssetHolder.deposit external ([c929f28](https://github.com/statechannels/monorepo/commit/c929f2824fdf644797be8ab11edfeaa177591763))
* make ETHAssetHolder.deposit external ([4f0158f](https://github.com/statechannels/monorepo/commit/4f0158f24400508e40cf938b2b3cc6a642049888))
* use calldata, not memory ([52c2c60](https://github.com/statechannels/monorepo/commit/52c2c601230c9076e7237aeef6b2776e537f071b))





# [0.10.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.9.1...@statechannels/nitro-protocol@0.10.0) (2020-11-25)


### Bug Fixes

* consistently break loops ([c5bc0da](https://github.com/statechannels/monorepo/commit/c5bc0da6ea46bd82caa15e9e8214b924c662883d))
* deal with single-destination guarantees ([d49832f](https://github.com/statechannels/monorepo/commit/d49832f360595fc12c0d3502f0f188a5652aeab4))
* refactor claim method ([f4d5146](https://github.com/statechannels/monorepo/commit/f4d51467be7ca690375e8cb99d1b000aab68d082))
* typo ([99da224](https://github.com/statechannels/monorepo/commit/99da224e2c01c3e926125297bd8f03b119ad49f4))


### Features

* add claim method to AssetHolder ([91923de](https://github.com/statechannels/monorepo/commit/91923de6448d74b92ed6c5645c7b3e0b532d03c0))


### Performance Improvements

* safer construction of new outcome ([8f17cb1](https://github.com/statechannels/monorepo/commit/8f17cb1df4bdad5664018da460332e02acd7f470))





## [0.9.1](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.9.0...@statechannels/nitro-protocol@0.9.1) (2020-11-21)


### Bug Fixes

* add nonzero check after ecrecover ([32503b8](https://github.com/statechannels/monorepo/commit/32503b858a4f609685c2f1c4badfaf3c9e992e58))





# [0.9.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.8.3...@statechannels/nitro-protocol@0.9.0) (2020-11-20)


### Bug Fixes

* fix artifacts path ([c1b30fa](https://github.com/statechannels/monorepo/commit/c1b30fa2b7c1bf1450154cd288c7d889663ea932))
* gitignore solcInputs ([a9e814b](https://github.com/statechannels/monorepo/commit/a9e814b152bb1563dd7a46c0f9535942f88c4eac))
* pass owner as parameter to Token.sol constructor and redeploy contracts ([9606a52](https://github.com/statechannels/monorepo/commit/9606a52fc5a140a99f317901547b1c7cf329c28f)), closes [/docs.openzeppelin.com/cli/2.8/deploying-with-create2#create2](https://github.com//docs.openzeppelin.com/cli/2.8/deploying-with-create2/issues/create2)
* use a valid address in the Token constructor ([8096e49](https://github.com/statechannels/monorepo/commit/8096e494a3fa9bac79521e661c3e53a7247ab487))


### Features

* catch external destination collisions ([db7370d](https://github.com/statechannels/monorepo/commit/db7370de0bfc07aafed504654d1b428390bab52c))
* check chainId() in adjudicator contract ([66e1c1e](https://github.com/statechannels/monorepo/commit/66e1c1eed5bebd2873d59c3f6630f1ab34eb2db1))
* emit AssetTransferred for internal transfers ([9fe3a68](https://github.com/statechannels/monorepo/commit/9fe3a68c70cac1add1470c812f4be5bab225d5f8))


### Performance Improvements

* break out of loop when balance is zero ([151c36e](https://github.com/statechannels/monorepo/commit/151c36ee74d7a3d046751180f4e3666fcbd3f13e))
* break out of outer loop if balance is zero ([18b11bb](https://github.com/statechannels/monorepo/commit/18b11bb754702e7ffa289aaa05867b6093de88d0))





## [0.8.6](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.8.3...@statechannels/nitro-protocol@0.8.6) (2020-11-19)


### Bug Fixes

* fix artifacts path ([c1b30fa](https://github.com/statechannels/monorepo/commit/c1b30fa2b7c1bf1450154cd288c7d889663ea932))
* gitignore solcInputs ([a9e814b](https://github.com/statechannels/monorepo/commit/a9e814b152bb1563dd7a46c0f9535942f88c4eac))
* pass owner as parameter to Token.sol constructor and redeploy contracts ([9606a52](https://github.com/statechannels/monorepo/commit/9606a52fc5a140a99f317901547b1c7cf329c28f)), closes [/docs.openzeppelin.com/cli/2.8/deploying-with-create2#create2](https://github.com//docs.openzeppelin.com/cli/2.8/deploying-with-create2/issues/create2)
* use a valid address in the Token constructor ([8096e49](https://github.com/statechannels/monorepo/commit/8096e494a3fa9bac79521e661c3e53a7247ab487))





## [0.8.5](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.8.3...@statechannels/nitro-protocol@0.8.5) (2020-11-19)


### Bug Fixes

* fix artifacts path ([c1b30fa](https://github.com/statechannels/monorepo/commit/c1b30fa2b7c1bf1450154cd288c7d889663ea932))
* gitignore solcInputs ([a9e814b](https://github.com/statechannels/monorepo/commit/a9e814b152bb1563dd7a46c0f9535942f88c4eac))
* pass owner as parameter to Token.sol constructor and redeploy contracts ([9606a52](https://github.com/statechannels/monorepo/commit/9606a52fc5a140a99f317901547b1c7cf329c28f)), closes [/docs.openzeppelin.com/cli/2.8/deploying-with-create2#create2](https://github.com//docs.openzeppelin.com/cli/2.8/deploying-with-create2/issues/create2)
* use a valid address in the Token constructor ([8096e49](https://github.com/statechannels/monorepo/commit/8096e494a3fa9bac79521e661c3e53a7247ab487))





## [0.8.4](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.8.3...@statechannels/nitro-protocol@0.8.4) (2020-11-17)


### Bug Fixes

* fix artifacts path ([c1b30fa](https://github.com/statechannels/monorepo/commit/c1b30fa2b7c1bf1450154cd288c7d889663ea932))





## [0.8.3](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.8.2...@statechannels/nitro-protocol@0.8.3) (2020-11-17)


### Bug Fixes

* revert version change ([ff30eed](https://github.com/statechannels/monorepo/commit/ff30eed36b25696f9a98bb97184dc7aab238401b))





## [0.8.2](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.8.0...@statechannels/nitro-protocol@0.8.2) (2020-11-17)


### Bug Fixes

* chore(release): publish [skip ci] ([caa958d](https://github.com/statechannels/monorepo/commit/caa958dcfdc6fbcf07ebb0b9001552ef41ebbc9c))
* do not redeclare events ([061824e](https://github.com/statechannels/monorepo/commit/061824e25d7ca0c533a0cadffc75fe7bdbf5da88))
* hardcode the address used for rinkeby deployments ([f7b3a4a](https://github.com/statechannels/monorepo/commit/f7b3a4aed54490fbd8a8e2bb498a78aa438dbe33))
* no need to declare visibility of constructor ([7bb89e6](https://github.com/statechannels/monorepo/commit/7bb89e61ebfc0c3fb4a61def6e86ce801494f435))
* replace now with block.timestamp ([7afb073](https://github.com/statechannels/monorepo/commit/7afb073e00a01203cdf96524402441b1185dbf93))





# [0.8.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.7.0...@statechannels/nitro-protocol@0.8.0) (2020-11-14)


### Bug Fixes

* ignore participant address case in createSignatureArguments ([e9068fa](https://github.com/statechannels/monorepo/commit/e9068fa6738fd9fc39cba1a9c9193cc36206ae2a))
* mark _transferAsset as virtual ([534a803](https://github.com/statechannels/monorepo/commit/534a803eee4e28cc0c6f7713931f77912dd8f00b))
* nitro protocol address comparison no longer case sensitive ([37b63ae](https://github.com/statechannels/monorepo/commit/37b63aea4bf289cdda22dc49f1ba98e4f1f9d767))
* redeclare SafeMath in derived contracts ([9dd07ce](https://github.com/statechannels/monorepo/commit/9dd07ce263d29cbc9577c91fcbd52a51dfda4a9d))


### Features

* assert and assume checksum addresses ([48b961b](https://github.com/statechannels/monorepo/commit/48b961b66cc877f68c02b4a818849538721f53db))





# [0.7.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.4.3...@statechannels/nitro-protocol@0.7.0) (2020-11-06)


### Bug Fixes

* add requirement to prevent underflow ([fcbed12](https://github.com/statechannels/monorepo/commit/fcbed12ac3de90b42ffe0ab274b0395355b1cdd1))
* correct function name ([89fcdd1](https://github.com/statechannels/monorepo/commit/89fcdd12ee19babd1ccae95c3f22389406ddefa1))
* prefer .call.value to .transfer ([0fbcacc](https://github.com/statechannels/monorepo/commit/0fbcacc3497c115eedbaaaed5fb97baac6954e0b))
* prevent underflow ([5d5269d](https://github.com/statechannels/monorepo/commit/5d5269d05d8df0d4f2de27fbc39c43d0947750ec))
* remove need for requirement ([beabd19](https://github.com/statechannels/monorepo/commit/beabd198615a882c14eeee046c109f90ab09a557))
* replace arithmetic operations with SafeMath ([fbda8af](https://github.com/statechannels/monorepo/commit/fbda8af3d0470d461abca090baf1293ea2bd6e73))
* typo ([227c4e0](https://github.com/statechannels/monorepo/commit/227c4e0b75461723de42ac20f0c6e0c4fd84ebca))
* use checks/effects/interactions in claimAll ([cbbe9e9](https://github.com/statechannels/monorepo/commit/cbbe9e90e45862748621c8ad367b04db527f38e4))


### Features

* add transfer method to AssetHolder ([6cd5c97](https://github.com/statechannels/monorepo/commit/6cd5c97ba1e95065a0e1e6366d6f0ff41595fecb))


### Performance Improvements

* delete guarantor storage during claimAll ([802ec40](https://github.com/statechannels/monorepo/commit/802ec40bc781956ca5c381dfee1545cc8697b8c0))
* use solidity-bytes-utils.equal ([6737a7b](https://github.com/statechannels/monorepo/commit/6737a7b9f22999136fde7446fd8a5c21a0864d89))





# [0.6.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.4.3...@statechannels/nitro-protocol@0.6.0) (2020-11-03)


### Bug Fixes

* typo ([227c4e0](https://github.com/statechannels/monorepo/commit/227c4e0b75461723de42ac20f0c6e0c4fd84ebca))


### Features

* add transfer method to AssetHolder ([6cd5c97](https://github.com/statechannels/monorepo/commit/6cd5c97ba1e95065a0e1e6366d6f0ff41595fecb))


### Performance Improvements

* use solidity-bytes-utils.equal ([6737a7b](https://github.com/statechannels/monorepo/commit/6737a7b9f22999136fde7446fd8a5c21a0864d89))





# [0.5.0](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.4.3...@statechannels/nitro-protocol@0.5.0) (2020-11-03)


### Bug Fixes

* typo ([227c4e0](https://github.com/statechannels/monorepo/commit/227c4e0b75461723de42ac20f0c6e0c4fd84ebca))


### Features

* add transfer method to AssetHolder ([6cd5c97](https://github.com/statechannels/monorepo/commit/6cd5c97ba1e95065a0e1e6366d6f0ff41595fecb))





## [0.4.3](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.4.1...@statechannels/nitro-protocol@0.4.3) (2020-11-03)

**Note:** Version bump only for package @statechannels/nitro-protocol





## [0.4.2](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.4.1...@statechannels/nitro-protocol@0.4.2) (2020-11-02)

**Note:** Version bump only for package @statechannels/nitro-protocol





## [0.4.1](https://github.com/statechannels/monorepo/compare/@statechannels/nitro-protocol@0.4.0...@statechannels/nitro-protocol@0.4.1) (2020-10-20)


### Bug Fixes

* use more robust check when converting address ([1351470](https://github.com/statechannels/monorepo/commit/1351470b5269356198e6fe5e6c4be517b0a94d26))





# 0.4.0 (2020-10-13)


### Bug Fixes

* Pin and normalize jest and ts-jest dependencies ([e9ca399](https://github.com/statechannels/monorepo/commit/e9ca3997119645fdb9f558a921361171c20d66a0))


### Features

* **nitro-protocol:** AdjdicatorAddress is public ([0c140ee](https://github.com/statechannels/monorepo/commit/0c140ee75dbb598eed06923a24b0dacbb56e401c))



## 0.3.10 (2020-10-05)


### Features

* add erc20 funding to the chain service ([1cadcdf](https://github.com/statechannels/monorepo/commit/1cadcdfe0aeb992efd0afa75f5a6cc4ef3bf9cc0))



## 0.3.10-alpha.0 (2020-10-02)



## 0.3.9-alpha.0 (2020-09-30)


### Bug Fixes

* Add jest-gas-reporter to nitro-protocol ([73ce247](https://github.com/statechannels/monorepo/commit/73ce2478f1e9017b72f6dae450099565794d32b1))
* typo ([5bb7dff](https://github.com/statechannels/monorepo/commit/5bb7dffdcbee4dc2fd68fc34a1c8bdd2b4ec94ed))



## 0.3.7 (2020-09-23)



## 0.3.6 (2020-09-09)



## 0.3.5 (2020-09-04)



## 0.3.4 (2020-08-25)


### Reverts

* Revert "Mock out hash state" ([dabcb09](https://github.com/statechannels/monorepo/commit/dabcb09ba8be57a623b5eadb3141c27e4038747d))



# 0.3.0 (2020-08-18)



# 0.2.0 (2020-08-05)


### Bug Fixes

* Add @typescript-eslint/parser to packages ([1a4b967](https://github.com/statechannels/monorepo/commit/1a4b9670e075010d347e08b2115a29c08a111df9))
* all nitro protocol tests pass again ([1411203](https://github.com/statechannels/monorepo/commit/14112038697281b63652fa60b4aaf2be1069bfeb))
* build ([d97ac56](https://github.com/statechannels/monorepo/commit/d97ac568240a1971b21eea4cc1c08624a3d7d439))
* build and lint issues ([2f4648e](https://github.com/statechannels/monorepo/commit/2f4648e9132b952692e06486bcc5ac318b720e0a))
* claimAll test passes ([fc3c7ef](https://github.com/statechannels/monorepo/commit/fc3c7ef50f9f5b7aa433f276256354e7e37f5b85))
* decouple contract deployment from contract constructor signature ([eca4c5b](https://github.com/statechannels/monorepo/commit/eca4c5b70e9d2bad442266211ce3dfed739e166c))
* forceMove test passes ([e786f24](https://github.com/statechannels/monorepo/commit/e786f24e25c2d33b2904d0b59f0077c09993a822))
* get rps tests passing again ([582aa3f](https://github.com/statechannels/monorepo/commit/582aa3fc3adbcc7413846d42a3806b86019522bb))
* Grammar - solidity -> Solidity ([#54](https://github.com/statechannels/monorepo/issues/54)) ([388bba3](https://github.com/statechannels/monorepo/commit/388bba3cd04f1cafb497475ec05e2d5b8ea4126d))
* hub tests ([96abfef](https://github.com/statechannels/monorepo/commit/96abfef21e10dc67a1d2484e5f3f4e8480b147e6))
* import ([8c8a019](https://github.com/statechannels/monorepo/commit/8c8a019b1e8ed38d0f0c1f5eb75e7ffcdd52985b))
* lint ([c687628](https://github.com/statechannels/monorepo/commit/c68762893a409624e96ca03c526d407e98184346))
* lint issues ([751ef3d](https://github.com/statechannels/monorepo/commit/751ef3df396ae1d99ad93f78763194b6536650e3))
* nitro-protocol tests ([e909361](https://github.com/statechannels/monorepo/commit/e90936162c111e23af89e0998e41cb189aca3140))
* properly import interface ([6d3b8d6](https://github.com/statechannels/monorepo/commit/6d3b8d6fa0b7dcd0e9f31c3cc66b747bceea7e3d))
* reintroduce server to detect when chain is ready in CI ([f0c1a41](https://github.com/statechannels/monorepo/commit/f0c1a4126a8ae09566e8eb8d18c5577e6715fa8e))
* server setup ([fa74645](https://github.com/statechannels/monorepo/commit/fa74645d4829f3b1aa8140d2027176a88009e85b))
* standardize place holder contract definition ([d403dd0](https://github.com/statechannels/monorepo/commit/d403dd0e1499437edab483e7affea41eba0f2199))
* throw Error if contracts are not topographically ordered upon deployment ([5f51133](https://github.com/statechannels/monorepo/commit/5f51133685a3d625f4299934e368a0239a66a3d6))


### Features

* Add requireValidREVEAL transition function ([5ee4ffe](https://github.com/statechannels/monorepo/commit/5ee4ffe956bb199a3e3ff5bccb008bbe76caf12a))
* Add test for TrivialApp NitroProtocol Contract ([6da7e56](https://github.com/statechannels/monorepo/commit/6da7e5613e73dc47363124c4ffcf5e97a80072fd))
* Add VSCode ESLint settings to packages ([30e5eee](https://github.com/statechannels/monorepo/commit/30e5eee12f54b9ba44ea6538a032b46ff354df04))
* Compiling RPSGame.sol ([adc26e7](https://github.com/statechannels/monorepo/commit/adc26e7d586ecb28b4540d3005634ce3eec69d23))
* Create initial ESLint config from TSList config ([3bacc3a](https://github.com/statechannels/monorepo/commit/3bacc3a65fe186f56d6a55af7ad00c94cb1cb882))
* decouple how and what of contract migrations between packages ([1642c9f](https://github.com/statechannels/monorepo/commit/1642c9fd74a699cab7dce1df1e2e18d7933c9da6))
* Get RockPaperScissors tests setup and first test passing ([18f5c3d](https://github.com/statechannels/monorepo/commit/18f5c3dfcac7df71ce00aaaa89516671e2d0a74e))
* include gasPrice and gasLimit in ganache constructor ([3d89ea6](https://github.com/statechannels/monorepo/commit/3d89ea637e35a82963ed89a9aeaab8ab0a3cfefa))
* Initial RPS ForceMove Game Contract ([7fbc21c](https://github.com/statechannels/monorepo/commit/7fbc21ccf5cdd9c7b2a1b8d3aef2b5c558c65adb))
* introduce env defaults via dotenv-extended ([ab36f51](https://github.com/statechannels/monorepo/commit/ab36f5197e2da8b0c54d120d116171b81c2b7905))
* introduce loglevel ([f698f78](https://github.com/statechannels/monorepo/commit/f698f789be1b619de50b91b4b558bfb28a2abde8))
* introduced network ID to network context; almost all wallet tests pass again ([1bd7531](https://github.com/statechannels/monorepo/commit/1bd753143d69bffcd4fa5c772b28b10c03509d55))
* Move TrivialApp tests into one file ([399d527](https://github.com/statechannels/monorepo/commit/399d52733fb9c7b4e48dee555f1057686122760e))


### Reverts

* Revert "Add test asset holders" ([1a9001e](https://github.com/statechannels/monorepo/commit/1a9001e0751909556713a2303dea81068abfbc1f))
