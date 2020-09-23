import {instantiateSecp256k1, Secp256k1, RecoveryId} from '@bitauth/libauth';
import {utils, Wallet} from 'ethers';
import {State, StateWithHash} from '@statechannels/wallet-core';

let secp256k1: Secp256k1;
export const initialized: Promise<any> = instantiateSecp256k1().then(m => (secp256k1 = m));

const knownWallets: Record<string, string> = {};
const cachedAddress = (privateKey: string): string =>
  knownWallets[privateKey] || (knownWallets[privateKey] = new Wallet(privateKey).address);

export async function fastSignState(
  state: StateWithHash,
  privateKey: string
): Promise<{state: State; signature: string}> {
  const address = cachedAddress(privateKey);
  if (state.participants.map(p => p.signingAddress).indexOf(address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }

  const {stateHash} = state;

  const signature = await fastSignData(stateHash, privateKey);
  return {state, signature};
}

export function fastRecoverAddress(signature: string, stateHash: string): string {
  const recover = Number.parseInt('0x' + signature.slice(-2)) - 27;

  const digest = Buffer.from(hashMessage(stateHash).substr(2), 'hex');
  const recoveredAddress = utils.computeAddress(
    secp256k1.recoverPublicKeyCompressed(
      Buffer.from(signature.slice(2, -2), 'hex'),
      recover as RecoveryId,
      digest
    )
  );

  return recoveredAddress;
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
