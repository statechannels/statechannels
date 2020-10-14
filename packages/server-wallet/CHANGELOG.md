# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
