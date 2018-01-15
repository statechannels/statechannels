var ChannelManager = artifacts.require("./ChannelManager.sol");

contract('ChannelManager', function(accounts) {
  it("should put 10000 MetaCoin in the first account", function() {
    return ChannelManager.deployed().then(function(instance) {
      assert(instance.initiateChallenge.call(
        1, // allocation nonce
        50, // aBal
        20, // bBal
        ['abc123'], // channel ids
        [10], // channel numbers
        'asdfasdfasd',
        'asdfasdfsad',
        '0xchanneltypeaddress',
        2, // channel id
        3, // channel nonce
        10, // balance required
        'asbfasdfbasdfbasdf', // channel state
        'aSig',
        'bSig',
      ));
    });
  });
});
