import {JsonRpcProvider} from "ethers/providers";
import {call, delay} from "redux-saga/effects";

import {getProvider} from "../../utils/contract-utils";

export function* ganacheMiner() {
  const provider: JsonRpcProvider = yield call(getProvider);
  const DELAY_TIME = 30000; // 30 seconds
  while (true) {
    const timeStamp = Math.round(Date.now() / 1000);
    yield provider.send("evm_mine", timeStamp);
    yield delay(DELAY_TIME);
  }
}
