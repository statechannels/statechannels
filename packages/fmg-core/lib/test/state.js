"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var channel_1 = require("../src/channel");
var state_1 = require("../src/state");
var assert_revert_1 = __importDefault(require("./helpers/assert-revert"));
var counting_game_1 = require("../src/test-game/counting-game");
var StateLib = artifacts.require("./State.sol");
contract('State', function (accounts) {
    var stateLib;
    var channelNonce = 12;
    var turnNum = 15;
    var channelType = accounts[0]; // just get a valid address
    var participants = [accounts[1], accounts[2]];
    var resolution = [5, 4];
    var channel = new channel_1.Channel(channelType, channelNonce, participants);
    var stateType = state_1.State.StateType.Game;
    var state = new state_1.State({
        channel: channel, stateType: stateType, turnNum: turnNum, resolution: resolution, stateCount: 0
    });
    var statePacket = state.toHex();
    before(function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, StateLib.deployed()];
                case 1:
                    stateLib = _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("extracts the channelType", function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.channelType.call(statePacket)];
                case 1:
                    result = _a.sent();
                    assert.equal(channelType, result);
                    return [2 /*return*/];
            }
        });
    }); });
    it("extracts the channelNonce", function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.channelNonce.call(statePacket)];
                case 1:
                    result = _a.sent();
                    assert.equal(channelNonce, result);
                    return [2 /*return*/];
            }
        });
    }); });
    it("extracts the turnNum", function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.turnNum.call(statePacket)];
                case 1:
                    result = _a.sent();
                    assert.equal(turnNum, result);
                    return [2 /*return*/];
            }
        });
    }); });
    it("extracts the number of participants", function () { return __awaiter(_this, void 0, void 0, function () {
        var n;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.numberOfParticipants.call(statePacket)];
                case 1:
                    n = _a.sent();
                    assert.equal(n, 2);
                    return [2 /*return*/];
            }
        });
    }); });
    it("extracts the participants", function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.participants.call(statePacket)];
                case 1:
                    result = _a.sent();
                    assert.deepEqual(participants, result);
                    return [2 /*return*/];
            }
        });
    }); });
    it("extracts the resolution", function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.resolution.call(statePacket)];
                case 1:
                    result = _a.sent();
                    assert.equal(resolution[0], result[0]);
                    assert.equal(resolution[1], result[1]);
                    return [2 /*return*/];
            }
        });
    }); });
    it("identifies the mover based on the turnNum", function () { return __awaiter(_this, void 0, void 0, function () {
        var mover;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.mover.call(statePacket)];
                case 1:
                    mover = _a.sent();
                    // our state nonce is 15, which is odd, so it should be participant[1]
                    assert.equal(mover, participants[1]);
                    return [2 /*return*/];
            }
        });
    }); });
    it("identifies the indexOfMover based on the turnNum", function () { return __awaiter(_this, void 0, void 0, function () {
        var index;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.indexOfMover.call(statePacket)];
                case 1:
                    index = _a.sent();
                    // our state nonce is 15, which is odd, so it should be participant 1
                    assert.equal(index, 1);
                    return [2 /*return*/];
            }
        });
    }); });
    it("can calculate the channelId", function () { return __awaiter(_this, void 0, void 0, function () {
        var chainId, localId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.channelId.call(statePacket)];
                case 1:
                    chainId = _a.sent();
                    localId = channel.id;
                    assert.equal(chainId, localId);
                    return [2 /*return*/];
            }
        });
    }); });
    it("can check if a state is signed", function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, r, s, v;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = state.sign(participants[1]), r = _a[0], s = _a[1], v = _a[2];
                    return [4 /*yield*/, stateLib.requireSignature.call(statePacket, v, r, s)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("will revert if the wrong party signed", function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, r, s, v;
        return __generator(this, function (_b) {
            _a = state.sign(participants[0]), r = _a[0], s = _a[1], v = _a[2];
            assert_revert_1.default(stateLib.requireSignature.call(statePacket, v, r, s));
            return [2 /*return*/];
        });
    }); });
    it("can check if the state is fully signed", function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, r0, s0, v0, _b, r1, s1, v1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = state.sign(participants[0]), r0 = _a[0], s0 = _a[1], v0 = _a[2];
                    _b = state.sign(participants[1]), r1 = _b[0], s1 = _b[1], v1 = _b[2];
                    return [4 /*yield*/, stateLib.requireFullySigned.call(statePacket, [v0, v1], [r0, r1], [s0, s1])];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("calculates the offset for the gameState", function () { return __awaiter(_this, void 0, void 0, function () {
        var offset;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stateLib.gameStateOffset.call(statePacket)];
                case 1:
                    offset = _a.sent();
                    // should be 128 + 2 * 64 + 96 = 352
                    // TODO find better way to test this
                    assert.equal(offset, 352);
                    return [2 /*return*/];
            }
        });
    }); });
    it("can test if the gameAttributes are equal", function () { return __awaiter(_this, void 0, void 0, function () {
        var state1, state2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    state1 = counting_game_1.CountingGame.preFundSetupState({ channel: channel, resolution: resolution, turnNum: turnNum, gameCounter: 0 });
                    state2 = counting_game_1.CountingGame.preFundSetupState({ channel: channel, resolution: resolution, turnNum: turnNum, gameCounter: 1 });
                    return [4 /*yield*/, assert_revert_1.default(stateLib.gameAttributesEqual.call(state1.toHex(), state2.toHex()))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
