import BN from "bn.js";
// import { Move } from './moves';
// import { Result } from './results';
import * as positions from "./positions";
// import { randomHex } from "../utils/randomHex";
import bnToHex from "../utils/bnToHex";
import { Channel } from "fmg-core";

const libraryAddress = "0x" + "1".repeat(40);
const channelNonce = 4;
const asPrivateKey =
  "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d";
const asAddress = "0x" + "a".repeat(40);
const bsPrivateKey =
  "0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72";
const bsAddress = "0x" + "b".repeat(40);
const participants: [string, string] = [asAddress, bsAddress];
export const roundBuyIn = bnToHex(new BN(1));
export const fiveFive = [new BN(5), new BN(5)].map(bnToHex) as [string, string];
const sixFour = [new BN(6), new BN(4)].map(bnToHex) as [string, string];
const fourSix = [new BN(4), new BN(6)].map(bnToHex) as [string, string];
const twoFour = [new BN(2), new BN(4)].map(bnToHex) as [string, string];
const zeroSix = [new BN(0), new BN(6)].map(bnToHex) as [string, string];
const fourTwo = [new BN(4), new BN(2)].map(bnToHex) as [string, string];
const sixZero = [new BN(6), new BN(0)].map(bnToHex) as [string, string];

const channelId = new Channel(libraryAddress, channelNonce, participants).id;

const base = {
  channelId,
  libraryAddress,
  channelNonce,
  participants,
  roundBuyIn,
};

export const shared = {
  ...base,
  asAddress,
  twitterHandle: "twtr",
  bsAddress,
  myName: "Tom",
  opponentName: "Alex",
  asPrivateKey,
  bsPrivateKey,
};

export const standard = {
  ...shared,
  preFundSetupA: positions.preFundSetupA({
    ...base,
    turnNum: 0,
    balances: fiveFive,
    stateCount: 0,
  }),
  preFundSetupB: positions.preFundSetupB({
    ...base,
    turnNum: 1,
    balances: fiveFive,
    stateCount: 1,
  }),
  postFundSetupA: positions.postFundSetupA({
    ...base,
    turnNum: 2,
    balances: fiveFive,
    stateCount: 0,
  }),
  postFundSetupB: positions.postFundSetupB({
    ...base,
    turnNum: 3,
    balances: fiveFive,
    stateCount: 1,
  }),
  playing1: positions.xPlaying({
    ...base,
    turnNum: 4,
    noughts: 0b000000000,
    crosses: 0b100000000,
    balances: sixFour,
  }),
  playing2: positions.oPlaying({
    ...base,
    turnNum: 5,
    noughts: 0b000010000,
    crosses: 0b100000000,
    balances: fourSix,
  }),
  playing3: positions.xPlaying({
    ...base,
    turnNum: 6,
    noughts: 0b000010000,
    crosses: 0b100000001,
    balances: sixFour,
  }),
  playing4: positions.oPlaying({
    ...base,
    turnNum: 7,
    noughts: 0b000011000,
    crosses: 0b100000001,
    balances: fourSix,
  }),
  playing5: positions.xPlaying({
    ...base,
    turnNum: 8,
    noughts: 0b000011000,
    crosses: 0b100100001,
    balances: sixFour,
  }),
  playing6: positions.oPlaying({
    ...base,
    turnNum: 9,
    noughts: 0b000011100,
    crosses: 0b100100001,
    balances: fourSix,
  }),
  playing7: positions.xPlaying({
    ...base,
    turnNum: 10,
    noughts: 0b000011100,
    crosses: 0b101100001,
    balances: sixFour,
  }),
  playing8: positions.oPlaying({
    ...base,
    turnNum: 11,
    noughts: 0b010011100,
    crosses: 0b101100001,
    balances: fourSix,
  }),
  draw: positions.draw({
    ...base,
    turnNum: 12,
    noughts: 0b010011100,
    crosses: 0b101100011,
    balances: fiveFive,
  }),
  againMF: positions.playAgainMeFirst({ ...base, turnNum: 13, balances: fiveFive }),
  conclude: positions.conclude({ ...base, turnNum: 14, balances: fiveFive }),

  preFundSetupAHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000000" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000000" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000005" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001",  // [GameAttributes: roundBuyIn]


  preFundSetupBHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000000" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000001" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000001" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000005" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001",  // [GameAttributes: roundBuyIn]

  postFundSetupAHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000001" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000002" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000005" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001",  // [GameAttributes: roundBuyIn]

  postFundSetupBHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000001" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000003" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000001" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000005" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001",  // [GameAttributes: roundBuyIn]

  playing1Hex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000004" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000006" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000004" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000000" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "0000000000000000000000000000000000000000000000000000000000000000" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000100",  // [GameAttributes: crosses]

  playing2Hex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000005" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000004" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000006" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "0000000000000000000000000000000000000000000000000000000000000010" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000100",  // [GameAttributes: crosses]

  playing3Hex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000006" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000006" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000004" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000000" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "0000000000000000000000000000000000000000000000000000000000000010" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000101", // [GameAttributes: crosses]

  playing4Hex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000007" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000004" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000006" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "0000000000000000000000000000000000000000000000000000000000000018" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000101", // [GameAttributes: crosses]

  playing5Hex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000008" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000006" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000004" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000000" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "0000000000000000000000000000000000000000000000000000000000000018" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000121", // [GameAttributes: crosses]

  playing6Hex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000009" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000004" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000006" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "000000000000000000000000000000000000000000000000000000000000001c" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000121", // [GameAttributes: crosses]

  playing7Hex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "000000000000000000000000000000000000000000000000000000000000000a" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000006" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000004" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000000" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "000000000000000000000000000000000000000000000000000000000000001c" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000161", // [GameAttributes: crosses]

  playing8Hex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "000000000000000000000000000000000000000000000000000000000000000b" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000004" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000006" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "000000000000000000000000000000000000000000000000000000000000009c" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000161", // [GameAttributes: crosses]

  drawHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "000000000000000000000000000000000000000000000000000000000000000c" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000005" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000003" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "000000000000000000000000000000000000000000000000000000000000009c" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000163", // [GameAttributes: crosses]

  againMFHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "000000000000000000000000000000000000000000000000000000000000000d" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000005" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000005" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000004" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001", // [GameAttributes: roundBuyIn]
  
    concludeHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000003" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "000000000000000000000000000000000000000000000000000000000000000d" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000005" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000005",  // bResolution
};

export const aResignsAfterOneRound = {
  ...standard,
  conclude: positions.conclude({ ...base, turnNum: 8, balances: fourSix }),
  concludeHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000003" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "0000000000000000000000000000000000000000000000000000000000000008" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000004" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000006", // bResolution
};

export const noughtsVictory = {
  ...standard,
  playing1: positions.xPlaying({
    ...base,
    turnNum: 7,
    noughts: 0b000000000,
    crosses: 0b000010000,
    balances: sixFour,
  }),
  playing2: positions.oPlaying({
    ...base,
    turnNum: 8,
    noughts: 0b100000000,
    crosses: 0b000010000,
    balances: fourSix,
  }),
  playing3: positions.xPlaying({
    ...base,
    turnNum: 9,
    noughts: 0b100000000,
    crosses: 0b000010100,
    balances: sixFour,
  }),
  playing4: positions.oPlaying({
    ...base,
    turnNum: 10,
    noughts: 0b110000000,
    crosses: 0b000010100,
    balances: fourSix,
  }),
  playing5: positions.xPlaying({
    ...base,
    turnNum: 11,
    noughts: 0b110000000,
    crosses: 0b000010101,
    balances: sixFour,
  }),
  playing5closetoempty: positions.xPlaying({
    ...base,
    turnNum: 11,
    noughts: 0b110000000,
    crosses: 0b000010101,
    balances: twoFour,
  }),
  victory: positions.victory({
    ...base,
    turnNum: 12,
    noughts: 0b111000000,
    crosses: 0b000010101,
    balances: fourSix,
  }),
  absolutevictory: positions.victory({
    ...base,
    turnNum: 12,
    noughts: 0b111000000,
    crosses: 0b000010101,
    balances: zeroSix,
  }),
  conclude: positions.conclude({
    ...base,
    turnNum: 12,
    balances: zeroSix,
  }),
  victoryHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "000000000000000000000000000000000000000000000000000000000000000c" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000004" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000006" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000002" + // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "00000000000000000000000000000000000000000000000000000000000001c0" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000015", // [GameAttributes: crosses]
};

export const crossesVictory = {
  ...standard,
  playing1: positions.xPlaying({
    ...base,
    turnNum: 7,
    noughts: 0b000000000,
    crosses: 0b000000001,
    balances: sixFour,
  }),
  playing2: positions.oPlaying({
    ...base,
    turnNum: 8,
    noughts: 0b100000000,
    crosses: 0b000001001,
    balances: fourSix,
  }),
  playing3: positions.xPlaying({
    ...base,
    turnNum: 9,
    noughts: 0b100000000,
    crosses: 0b000001001,
    balances: sixFour,
  }),
  playing4: positions.oPlaying({
    ...base,
    turnNum: 10,
    noughts: 0b100010000,
    crosses: 0b000001001,
    balances: fourSix,
  }),
  playing4closetoempty: positions.oPlaying({
    ...base,
    turnNum: 10,
    noughts: 0b100010000,
    crosses: 0b000001001,
    balances: fourTwo,
  }),
  victory: positions.victory({
    ...base,
    turnNum: 11,
    noughts: 0b100010000,
    crosses: 0b001001001,
    balances: sixFour,
  }),
  absolutevictory: positions.victory({
    ...base,
    turnNum: 11,
    noughts: 0b100010000,
    crosses: 0b001001001,
    balances: sixZero,
  }),
  victoryHex:
    "0x" +
    "0000000000000000000000001111111111111111111111111111111111111111" + // libraryAdress
    "0000000000000000000000000000000000000000000000000000000000000004" + // channelNonce
    "0000000000000000000000000000000000000000000000000000000000000002" + // number of participants
    "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + // asAddress
    "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" + // bsAddress
    "0000000000000000000000000000000000000000000000000000000000000002" + // StateType (PreFundSetup, PostFundSetup, Game, Conclude)
    "000000000000000000000000000000000000000000000000000000000000000c" + // turnNum
    "0000000000000000000000000000000000000000000000000000000000000000" + // stateCount ?
    "0000000000000000000000000000000000000000000000000000000000000006" + // aResolution
    "0000000000000000000000000000000000000000000000000000000000000004" + // bResolution
    "0000000000000000000000000000000000000000000000000000000000000002" + // // [GameAttributes: GamePositionType = {xPlaying, oPlaying, Victory, Draw, PlayAgainMeFirst, PlayAgainMeSecond}
    "0000000000000000000000000000000000000000000000000000000000000001" + // [GameAttributes: roundBuyIn]
    "0000000000000000000000000000000000000000000000000000000000000140" + // [GameAttributes: noughts
    "0000000000000000000000000000000000000000000000000000000000000049", // [GameAttributes: crosses]
};

export const swapRoles = {
  ...standard,
  againMS: positions.playAgainMeSecond({
    ...base,
    turnNum: 14,
    balances: fiveFive,
  }),
  r2playing1: positions.xPlaying({
    ...base,
    turnNum: 15,
    noughts: 0b000000000,
    crosses: 0b100000000,
    balances: fourSix,
  }),

};

export function build(
  customLibraryAddress: string,
  customAsAddress: string,
  customBsAddress: string
) {
  const customParticipants: [string, string] = [
    customAsAddress,
    customBsAddress
  ];
  const customBase = {
    libraryAddress: customLibraryAddress,
    channelNonce,
    participants: customParticipants,
    roundBuyIn,
  };

  const customShared = {
    ...customBase,
    asAddress: customAsAddress,
    bsAddress: customBsAddress,
    myName: "Tom",
    opponentName: "Alex",
  };

  return {
    ...customShared,
    preFundSetupA: positions.preFundSetupA({
      ...base,
      turnNum: 0,
      balances: fiveFive,
      stateCount: 0,
    }),
    preFundSetupB: positions.preFundSetupB({
      ...base,
      turnNum: 1,
      balances: fiveFive,
      stateCount: 1,
    }),
    postFundSetupA: positions.postFundSetupA({
      ...base,
      turnNum: 2,
      balances: fiveFive,
      stateCount: 0,
    }),
    postFundSetupB: positions.postFundSetupB({
      ...base,
      turnNum: 3,
      balances: fiveFive,
      stateCount: 1,
    }),
    // aResult: Result.YouWin,
    // bResult: Result.YouLose,
    playing1: positions.xPlaying({
      ...base,
      turnNum: 4,
      noughts: 0b000000000,
      crosses: 0b100000000,
      balances: sixFour,
    }),
    playing2: positions.oPlaying({
      ...base,
      turnNum: 5,
      noughts: 0b000010000,
      crosses: 0b100000000,
      balances: fourSix,
    }),
  };
}
