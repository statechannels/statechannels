import {helper} from '@ember/component/helper';

export function formatEther(params: string[] /*, hash*/): string {
  return ethers.utils.formatEther(params[0]).toString();
}

export default helper(formatEther);
