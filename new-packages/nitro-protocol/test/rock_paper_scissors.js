
var RPS = artifacts.require("./RockPaperScissors.sol");

contract('ChannelManager', function(accounts) {
  it("should put 10000 MetaCoin in the first account", function() {
    return RPS.deployed().then(function(instance) {
      debugger;



      assert(instance.unpack.call());
    });
  });
});

function padBytes32(data){
  let l = 66-data.length
  let x = data.substr(2, data.length)

  for(var i=0; i<l; i++) {
    x = 0 + x
  }
  return '0x' + x
}
