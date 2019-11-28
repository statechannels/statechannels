// Usage
//

// Needs something that converts json rpc request/response into promise

// the provider should be considered part of the wallet
// as such, my fake wallet should come with a provider

// which could be the same as the provider for the other wallet - assuming I'm going
// to communicate with the wallet via push message

// Currently the messaging service

class Wallet {
  send(message) {}
  on(callback) {}
}
