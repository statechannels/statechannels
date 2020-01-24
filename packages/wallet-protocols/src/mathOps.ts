import { bigNumberify } from 'ethers/utils';
// This stuff should be replaced with some big number logic
type numberish = string | number | undefined;
type MathOp = (a: numberish, b: numberish) => string;
export const add: MathOp = (a: numberish, b: numberish) =>
  bigNumberify(a || 0)
    .add(b || 0)
    .toHexString();
export const subtract: MathOp = (a: numberish, b: numberish) => {
  const numA = bigNumberify(a || 0);
  const numB = bigNumberify(b || 0);
  if (numB.gt(numA)) {
    throw new Error('Unsafe subtraction');
  }
  return numA.sub(numB).toHexString();
};
export const max: MathOp = (a: numberish, b: numberish) =>
  Math.max(Number(a), Number(b)).toString();
export const gt = (a: numberish, b: numberish) => Number(a) > Number(b);
export const eq = (a: numberish, b: numberish) => Number(a) === Number(b);
