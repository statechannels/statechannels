import {
  convertAddressToBytes32,
  GuaranteeAssetOutcome,
  Outcome
} from '@statechannels/nitro-protocol';
import {ethers} from 'ethers';
import {bigNumberify} from 'ethers/utils';
import {Address, Uint256} from '../types';
import {HUB_ADDRESS} from '../constants';
import {AllocationItem} from '@statechannels/client-api-schema';

export const PARTICIPANT_1_PRIVATE_KEY =
  '0xa205281c09d630f6639c3505b63d57013996ba037bdbe4d2979eb8bd5bed5b1b';
export const PARTICIPANT_1_ADDRESS = '0xffff6147243897776F085aBF5F45F24FC2943669';

export const PARTICIPANT_2_PRIVATE_KEY =
  '0xc19d583e30a7ab6ab346505c216491ac74dd988cf833a7c29cbf2e57ab41e20c';
export const PARTICIPANT_2_ADDRESS = '0xd274673B5128F7E745Dc4ee16799721D2D835f1A';

export const DUMMY_RULES_ADDRESS = '0xabcd10b5ea16F12f5bEFc45d511978CFF2780568';
export const UNKNOWN_RULES_ADDRESS = '0x92b5b042047731FF882423cB555554F11F632Bd6';

export const DUMMY_ASSET_HOLDER_ADDRESS = '0xabcd10b5ea16F12f5bEFc45d511978CFF2780568';

export const UNFUNDED_NONCE = '2';

export const FUNDED_NONCE = '3';
export const FUNDED_NONCE_3 = '33';
export const FUNDED_CHANNEL_HOLDINGS = '0x00';

export const FUNDED_GUARANTOR_NONCE = '31';

export const BEGINNING_APP_NONCE = '44';
export const BEGINNING_APP_CHANNEL_HOLDINGS = '0x05';

export const ONGOING_APP_NONCE = '5';
export const ONGOING_APP_CHANNEL_HOLDINGS = '0x08';

// Just choose big numbers that won't be hit in seeding
export const NONCE = '1000';

export const DUMMY_CHAIN_ID = '8888';

export const STAKE: Uint256 = ethers.utils.parseEther('0.01').toHexString();
export const PARTICIPANTS: Address[] = [PARTICIPANT_1_ADDRESS, HUB_ADDRESS];

export const PARTICIPANTS_3: Address[] = [
  PARTICIPANT_1_ADDRESS,
  PARTICIPANT_2_ADDRESS,
  HUB_ADDRESS
];

const hex5 = bigNumberify(5).toHexString();

export const allocation: AllocationItem[] = [
  {destination: convertAddressToBytes32(PARTICIPANT_1_ADDRESS), amount: hex5},
  {destination: convertAddressToBytes32(PARTICIPANT_2_ADDRESS), amount: hex5},
  {destination: convertAddressToBytes32(HUB_ADDRESS), amount: hex5}
];
export const allocationOutcome2: Outcome = [
  {
    assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
    allocationItems: allocation.slice(0, 2)
  }
];

export const allocationOutcome3: Outcome = [
  {
    assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
    allocationItems: allocation.slice(0, 3)
  }
];

export const guaranteeOutcome2: GuaranteeAssetOutcome[] = [
  {
    assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
    guarantee: {targetChannelId: '1234', destinations: PARTICIPANTS}
  }
];

export const holdings2 = bigNumberify(10).toHexString();
export const holdings3 = bigNumberify(15).toHexString();
