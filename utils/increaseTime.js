"use strict";
// From https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/increaseTime.js
Object.defineProperty(exports, "__esModule", { value: true });
// Increases testrpc time by the passed duration in seconds
function increaseTime(duration, provider) {
    return new Promise(function (resolve, reject) {
        provider.send('evm_increaseTime', [duration]).then(function () {
            provider.send('evm_mine').then(function (res, err2) {
                return err2 ? reject(err2) : resolve(res);
            });
        });
    });
}

const DURATION = {
    seconds: function (val) {
        return val;
    },
    minutes: function (val) {
        return val * this.seconds(60);
    },
    hours: function (val) {
        return val * this.minutes(60);
    },
    days: function (val) {
        return val * this.hours(24);
    },
    weeks: function (val) {
        return val * this.days(7);
    },
    years: function (val) {
        return val * this.days(365);
    },
};

module.exports = {
    increaseTime: increaseTime,
    DURATION: DURATION
}