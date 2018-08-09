"use strict";
// From https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/latestTime.js
Object.defineProperty(exports, "__esModule", { value: true });
function latestTime() {
    return web3.eth.getBlock('latest').timestamp;
}
exports.default = latestTime;
