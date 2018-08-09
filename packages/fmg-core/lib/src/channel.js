"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var web3_utils_1 = require("web3-utils");
var Channel = /** @class */ (function () {
    function Channel(channelType, channelNonce, participants) {
        this.channelType = channelType;
        this.channelNonce = channelNonce;
        this.participants = participants;
    }
    Object.defineProperty(Channel.prototype, "numberOfParticipants", {
        get: function () {
            return this.participants.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Channel.prototype, "id", {
        get: function () {
            return web3_utils_1.soliditySha3({ type: 'address', value: this.channelType }, { type: 'uint256', value: this.channelNonce }, { type: 'address[]', value: this.participants });
        },
        enumerable: true,
        configurable: true
    });
    Channel.prototype.toHex = function () {
        return (utils_1.padBytes32(this.channelType) +
            utils_1.toHex32(this.channelNonce).substr(2) +
            utils_1.toHex32(this.numberOfParticipants).substr(2) +
            this.participants.map(function (x) { return utils_1.padBytes32(x).substr(2); }).join(""));
    };
    return Channel;
}());
exports.Channel = Channel;
