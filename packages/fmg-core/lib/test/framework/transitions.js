"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
var assert_revert_1 = __importDefault(require("../helpers/assert-revert"));
var counting_game_1 = require("../test-game/src/counting-game");
var src_1 = require("../../src");
var StateLib = artifacts.require("./State.sol");
var Rules = artifacts.require("./Rules.sol");
var CountingStateContract = artifacts.require("../test-game/contracts/CountingState.sol");
var CountingGameContract = artifacts.require("../test-game/contracts/CountingGame.sol");
contract('Rules', function (accounts) {
    var channel, otherChannel, defaults, framework;
    var resolution = [12, 13];
    var otherResolution = [10, 15];
    var fromState, toState;
    before(function () { return __awaiter(_this, void 0, void 0, function () {
        var stateContract, gameContract, challengeeBal, challengerBal;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Rules.deployed()];
                case 1:
                    framework = _a.sent();
                    CountingStateContract.link(StateLib);
                    return [4 /*yield*/, CountingStateContract.new()];
                case 2:
                    stateContract = _a.sent();
                    CountingGameContract.link("CountingState", stateContract.address);
                    return [4 /*yield*/, CountingGameContract.new()];
                case 3:
                    gameContract = _a.sent();
                    channel = new src_1.Channel(gameContract.address, 0, [accounts[0], accounts[1]]);
                    otherChannel = new src_1.Channel(gameContract.address, 1, [accounts[0], accounts[1]]);
                    challengeeBal = Number(web3.toWei(6, "ether"));
                    challengerBal = Number(web3.toWei(4, "ether"));
                    defaults = { channel: channel, resolution: resolution, gameCounter: 0 };
                    return [2 /*return*/];
            }
        });
    }); });
    var validTransition = function (state1, state2) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, framework.validTransition(state1.toHex(), state2.toHex())];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    describe("preFundSetup -> preFundSetup", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.preFundSetupState(__assign({}, defaults, { turnNum: 0, stateCount: 0 }));
            toState = counting_game_1.CountingGame.preFundSetupState(__assign({}, defaults, { turnNum: 1, stateCount: 1 }));
        });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the balances changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.resolution = otherResolution;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the count doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.stateCount = fromState.stateCount;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the game attributes changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.gameCounter = 45;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("preFundSetup -> PostFundSetup", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.preFundSetupState(__assign({}, defaults, { turnNum: 1, stateCount: 1 }));
            toState = counting_game_1.CountingGame.PostFundSetupState(__assign({}, defaults, { turnNum: 2, stateCount: 0 }));
        });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition not from the last preFundSetup state", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fromState.stateCount = 0;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the balances changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.resolution = otherResolution;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the count doesn't reset", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.stateCount = 2;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the position changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.gameCounter = 45;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("preFundSetup -> conclude", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.preFundSetupState(__assign({}, defaults, { turnNum: 1, stateCount: 1 }));
            toState = counting_game_1.CountingGame.concludeState(__assign({}, defaults, { turnNum: 2 }));
        });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the balances changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.resolution = otherResolution;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition not from the last preFundSetup state", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fromState.stateCount = 0;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("PostFundSetup -> PostFundSetup", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.PostFundSetupState(__assign({}, defaults, { turnNum: 1, stateCount: 0 }));
            toState = counting_game_1.CountingGame.PostFundSetupState(__assign({}, defaults, { turnNum: 2, stateCount: 1 }));
        });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the balances changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.resolution = otherResolution;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the count doesn't reset", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.stateCount = 2;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition from the last PostFundSetup state", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fromState.stateCount = 1;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("PostFundSetup -> conclude", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.PostFundSetupState(__assign({}, defaults, { turnNum: 1, stateCount: 0 }));
            toState = counting_game_1.CountingGame.concludeState(__assign({}, defaults, { turnNum: 2 }));
        });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the balances changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.resolution = otherResolution;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition from the last PostFundSetup state", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fromState.stateCount = 1;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("PostFundSetup -> game", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.PostFundSetupState(__assign({}, defaults, { turnNum: 1, stateCount: 1, gameCounter: 3 }));
            toState = counting_game_1.CountingGame.gameState(__assign({}, defaults, { turnNum: 2, gameCounter: 4 }));
        });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition not from the last PostFundSetup state", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fromState.stateCount = 0;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the game rules are broken", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.gameCounter = 2; // game specifies that counter must increment
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("game -> game", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.gameState(__assign({}, defaults, { turnNum: 1, gameCounter: 3 }));
            toState = counting_game_1.CountingGame.gameState(__assign({}, defaults, { turnNum: 2, gameCounter: 4 }));
        });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the game rules are broken", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.gameCounter = 2; // game specifies that counter must increment
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("game -> conclude", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.gameState(__assign({}, defaults, { turnNum: 1, gameCounter: 3 }));
            toState = counting_game_1.CountingGame.concludeState(__assign({}, defaults, { turnNum: 2 }));
        });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the balances changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.resolution = otherResolution;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("conclude -> conclude", function () {
        beforeEach(function () {
            fromState = counting_game_1.CountingGame.concludeState(__assign({}, defaults, { turnNum: 1 }));
            toState = counting_game_1.CountingGame.concludeState(__assign({}, defaults, { turnNum: 2 }));
        });
        it("allows a valid transition", function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = assert;
                        return [4 /*yield*/, validTransition(fromState, toState)];
                    case 1:
                        _a.apply(void 0, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the turnNum doesn't increment", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.turnNum = fromState.turnNum;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects any transition where the channel changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.channel = otherChannel;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it("rejects a transition where the balances changes", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toState.resolution = otherResolution;
                        return [4 /*yield*/, assert_revert_1.default(validTransition(fromState, toState))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
