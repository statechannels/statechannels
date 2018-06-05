// From https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/latestTime.js

export default function latestTime () {
  return web3.eth.getBlock('latest').timestamp;
}
