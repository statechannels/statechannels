import {instantiateSecp256k1, Secp256k1} from '@bitauth/libauth';
import {Wallet, utils} from 'ethers';
import {State, hashState} from '@statechannels/wallet-core';

let secp256k1: Secp256k1;
export const initialized: Promise<any> = instantiateSecp256k1().then(m => (secp256k1 = m));

export async function fastSignState(
  state: State,
  privateKey: string
): Promise<{state: State; signature: string}> {
  const wallet = new Wallet(privateKey);
  if (state.participants.map(p => p.signingAddress).indexOf(wallet.address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }

  const hashedState = hashState(state);

  const signature = await fastSignData(hashedState, privateKey);
  return {state, signature};
}

export async function fastSignData(hashedData: string, privateKey: string): Promise<string> {
  await initialized;

  const hash = hashMessage(hashedData);
  const digest = Buffer.from(hash.substr(2), 'hex');
  const signature = secp256k1.signMessageHashRecoverableCompact(
    Buffer.from(privateKey.substr(2), 'hex'),
    digest
  );

  const v = 27 + signature.recoveryId;
  return '0x' + Buffer.from(signature.signature).toString('hex') + v.toString(16);
}

function hashMessage(hashedData: string): string {
  return utils.hashMessage(utils.arrayify(hashedData));
}
