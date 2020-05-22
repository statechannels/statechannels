import {BigNumber} from 'ethers';

// This stuff should be replaced with some big number logic
type numberish = string | number | BigNumber;
type MathOp = (a: numberish, b: numberish) => BigNumber;
export const add: MathOp = (a: numberish, b: numberish) => BigNumber.from(a || 0).add(b || 0);

export const subtract: MathOp = (a: numberish, b: numberish) => {
  const numA = BigNumber.from(a || 0);
  const numB = BigNumber.from(b || 0);
  if (numB.gt(numA)) {
    throw new Error('Unsafe subtraction');
  }
  return numA.sub(numB);
};
export const max: MathOp = (a: numberish, b: numberish) =>
  BigNumber.from(a).gt(b) ? BigNumber.from(a) : BigNumber.from(b);

export const gt = (a: numberish, b: numberish) => Number(a) > Number(b);
export const eq = (a: numberish, b: numberish) => Number(a) === Number(b);
