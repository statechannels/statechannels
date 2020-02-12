import {bigNumberify, BigNumber} from 'ethers/utils';
// This stuff should be replaced with some big number logic
type numberish = string | number | BigNumber;
type MathOp = (a: numberish, b: numberish) => BigNumber;
export const add: MathOp = (a: numberish, b: numberish) => bigNumberify(a || 0).add(b || 0);

export const subtract: MathOp = (a: numberish, b: numberish) => {
  const numA = bigNumberify(a || 0);
  const numB = bigNumberify(b || 0);
  if (numB.gt(numA)) {
    throw new Error('Unsafe subtraction');
  }
  return numA.sub(numB);
};
export const max: MathOp = (a: numberish, b: numberish) =>
  bigNumberify(a).gt(b) ? bigNumberify(a) : bigNumberify(b);

export const gt = (a: numberish, b: numberish) => Number(a) > Number(b);
export const eq = (a: numberish, b: numberish) => Number(a) === Number(b);
