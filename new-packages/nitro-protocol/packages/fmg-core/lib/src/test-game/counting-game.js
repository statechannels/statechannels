"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var src_1 = require("../../src");
var CountingGame = /** @class */ (function () {
    function CountingGame() {
    }
    CountingGame.preFundSetupState = function (opts) { return new PreFundSetupState(opts); };
    CountingGame.PostFundSetupState = function (opts) { return new PostFundSetupState(opts); };
    CountingGame.gameState = function (opts) { return new GameState(opts); };
    CountingGame.concludeState = function (opts) { return new ConcludeState(opts); };
    return CountingGame;
}());
exports.CountingGame = CountingGame;
var CountingBaseState = /** @class */ (function (_super) {
    __extends(CountingBaseState, _super);
    function CountingBaseState(_a) {
        var channel = _a.channel, turnNum = _a.turnNum, stateCount = _a.stateCount, resolution = _a.resolution, gameCounter = _a.gameCounter;
        var _this = _super.call(this, { channel: channel, turnNum: turnNum, stateCount: stateCount, resolution: resolution, stateType: undefined }) || this;
        _this.gameCounter = gameCounter;
        _this.initialize();
        return _this;
    }
    CountingBaseState.prototype.initialize = function () { };
    CountingBaseState.prototype.toHex = function () {
        return _super.prototype.toHex.call(this) + src_1.toHex32(this.gameCounter).substr(2);
    };
    return CountingBaseState;
}(src_1.State));
var PreFundSetupState = /** @class */ (function (_super) {
    __extends(PreFundSetupState, _super);
    function PreFundSetupState() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PreFundSetupState.prototype.initialize = function () { this.stateType = src_1.State.StateType.PreFundSetup; };
    return PreFundSetupState;
}(CountingBaseState));
var PostFundSetupState = /** @class */ (function (_super) {
    __extends(PostFundSetupState, _super);
    function PostFundSetupState() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PostFundSetupState.prototype.initialize = function () { this.stateType = src_1.State.StateType.PostFundSetup; };
    return PostFundSetupState;
}(CountingBaseState));
var GameState = /** @class */ (function (_super) {
    __extends(GameState, _super);
    function GameState() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GameState.prototype.initialize = function () { this.stateType = src_1.State.StateType.Game; };
    return GameState;
}(CountingBaseState));
var ConcludeState = /** @class */ (function (_super) {
    __extends(ConcludeState, _super);
    function ConcludeState() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ConcludeState.prototype.initialize = function () { this.stateType = src_1.State.StateType.Conclude; };
    return ConcludeState;
}(CountingBaseState));
