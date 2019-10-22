"use strict";
// From https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/increaseTime.js
Object.defineProperty(exports, "__esModule", {value: true});
// Increases testrpc time by the passed duration in seconds
function increaseTime(duration, provider) {
  return new Promise((resolve, reject) => {
    provider.send("evm_increaseTime", [duration]).then(() => {
      provider.send("evm_mine").then((res, err2) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
}

const DURATION = {
  seconds(val) {
    return val;
  },
  minutes(val) {
    return val * this.seconds(60);
  },
  hours(val) {
    return val * this.minutes(60);
  },
  days(val) {
    return val * this.hours(24);
  },
  weeks(val) {
    return val * this.days(7);
  },
  years(val) {
    return val * this.days(365);
  }
};

export {increaseTime, DURATION};
