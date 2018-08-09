"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var State = /** @class */ (function () {
    function State(_a) {
        var channel = _a.channel, stateType = _a.stateType, turnNum = _a.turnNum, resolution = _a.resolution, _b = _a.stateCount, stateCount = _b === void 0 ? 0 : _b;
        this.channel = channel;
        this.stateType = stateType;
        this.turnNum = turnNum;
        this.resolution = resolution;
        this.stateCount = stateCount || 0;
    }
    State.prototype.toHex = function () {
        return (this.channel.toHex() +
            utils_1.toHex32(this.stateType).substr(2) +
            utils_1.toHex32(this.turnNum).substr(2) +
            utils_1.toHex32(this.stateCount).substr(2) +
            this.resolution.map(function (x) { return utils_1.toHex32(x).substr(2); }).join(""));
    };
    State.prototype.sign = function (account) {
        var digest = web3.sha3(this.toHex(), { encoding: 'hex' }).substr(2);
        var sig = web3.eth.sign(account, digest).slice(2);
        var r = "0x" + sig.slice(0, 64);
        var s = "0x" + sig.slice(64, 128);
        var v = web3.toDecimal(sig.slice(128, 130)) + 27;
        return [r, s, v];
    };
    Object.defineProperty(State.prototype, "numberOfParticipants", {
        get: function () {
            return this.channel.numberOfParticipants;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(State.prototype, "mover", {
        get: function () {
            return this.channel.participants[this.turnNum % this.numberOfParticipants];
        },
        enumerable: true,
        configurable: true
    });
    return State;
}());
exports.State = State;
(function (State) {
    var StateType;
    (function (StateType) {
        StateType[StateType["PreFundSetup"] = 0] = "PreFundSetup";
        StateType[StateType["PostFundSetup"] = 1] = "PostFundSetup";
        StateType[StateType["Game"] = 2] = "Game";
        StateType[StateType["Conclude"] = 3] = "Conclude";
    })(StateType = State.StateType || (State.StateType = {}));
})(State || (State = {}));
exports.State = State;
