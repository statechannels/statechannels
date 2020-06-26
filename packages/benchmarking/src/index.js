require('@statechannels/channel-provider');
window.createChannel = function() {
  var request = { // TODO this is mocked out...
    "jsonrpc": "2.0",
    "method": "CreateChannel",
    "id": 1,
    "params": {
      "participants": [
        {
          "participantId": "user123",
          "signingAddress": "0x...",
          "destination": "0xa..."
        },
        {
          "participantId": "user456",
          "signingAddress": "0x...",
          "destination": "0xb..."
        }
      ],
      "allocations": [
        {
          "token": "0x...", // 0x0 for ETH
          "allocationItems": [
            {"destination": "0xa...", "amount": "0x1a"},
            {"destination": "0xb...", "amount": "0x1a"}
          ]
        }
      ],
      "appDefinition": "0x...",
      "appData": "0x...."
    }
  };
  window.channelProvider.send(JSON.stringify(request));
  // TODO use the channel client to make this easier. Then measure time taken to get response. 
  document.getElementById('create-channel-time').innerText = '200ms'; // TODO echo correct delay
}
