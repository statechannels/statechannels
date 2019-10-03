import {delay} from "redux-saga/effects";
import {JsonRpcProvider} from "ethers/providers";

export function* ganacheMiner() {
  const provider: JsonRpcProvider = new JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);
  const DELAY_TIME = 30000; // 30 seconds
  while (true) {
    const timeStamp = Math.round(Date.now() / 1000);
    yield provider.send("evm_mine", timeStamp);
    yield delay(DELAY_TIME);
  }
}
