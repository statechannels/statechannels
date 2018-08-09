
export function * applicationControllerSaga(walletAddress: string) {
  // [if storage] rehdrate and start game sagas for each game in the store
  
  // const runningGames = {};

   // subscribe to messages sent to my wallet address
      // subscribing to messageReceived (for my address)

  // when messages arrive
    // if there is an openChannel with that Id
      // emit messageRouted(channelId)

    // if not
      // spawn a game controller with that channelId and the message
      // openChannels[channelId] = yield fork(gameSaga, channelId, message);

  // [if storage] store the list of open channels?
}

// export function * walletSign(wallet: ChannelWallet, channelId: string, pledge: Pledge) {
  // fetch down the latest state from firebase for that channel

  // fetch bytecode down from blockchain / cache
  // check that oldState -> newState is a validTransition, by emulating solidity

  // sign it with the private key

  // put it in firebase (with uniqueness constraint, in case latest state has changed since line 25)

  // return signed state to the user
// }

// export function * walletReceive(channelId: string, message: Message) {
  // fetch down the latest state from firebase for the channel (if it exists?)

  // check that message is signed by the sender

  // fetch bytecode down from blockchain / cache
  // check that oldState -> newState is a validTransition, by emulating solidity

  // put it in firebase (with uniqueness constraint, in case latest state has changed since line 25)

  // return the pledge
// }
