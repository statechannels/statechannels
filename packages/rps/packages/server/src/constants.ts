import { ethers } from 'ethers';
import { Address, channelID, Uint256 } from 'fmg-core';

export const NAME = 'Neo Bot';

// This account is provided eth in magmo-devtools/utils/startGanache.js
export const HUB_SIGNER_PRIVATE_KEY =
  '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d';
export const HUB_SIGNER_ADDRESS = '0x5409ED021D9299bf6814279A6A1411A7e866A631';

export const HUB_ADDRESS = '0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C';
export const HUB_PRIVATE_KEY = '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b';

export const PARTICIPANT_PRIVATE_KEY =
  '0xa205281c09d630f6639c3505b63d57013996ba037bdbe4d2979eb8bd5bed5b1b';
export const PARTICIPANT_ADDRESS = '0xffff6147243897776F085aBF5F45F24FC2943669';

export const OTHER_PRIVATE_KEY =
  '0xc19d583e30a7ab6ab346505c216491ac74dd988cf833a7c29cbf2e57ab41e20c';
export const OTHER_ADDRESS = '0xd274673B5128F7E745Dc4ee16799721D2D835f1A';

export const DUMMY_RULES_ADDRESS = '0xabcd10b5ea16F12f5bEFc45d511978CFF2780568';
export const UNKNOWN_RULES_ADDRESS = '0x92b5b042047731FF882423cB555554F11F632Bd6';

// TODO: These should be in the seed file, but they got exported as undefined for some reason
export const FUNDED_CHANNEL_NONCE = 3;
export const FUNDED_CHANNEL_HOLDINGS = '0x00';

export const FUNDED_RPS_CHANNEL_NONCE = 33;
export const FUNDED_RPS_CHANNEL_HOLDINGS = '0x03';

export const BEGINNING_APP_CHANNEL_NONCE = 44;
export const BEGINNING_RPS_APP_CHANNEL_NONCE = 4;
export const BEGINNING_APP_CHANNEL_HOLDINGS = '0x05';

export const ONGOING_APP_CHANNEL_NONCE = 5;
export const ONGOING_RPS_APP_CHANNEL_NONCE = 55;
export const ONGOING_APP_CHANNEL_HOLDINGS = '0x08';

export const SEEDED_CHANNELS = 5;
export const SEEDED_COMMITMENTS = SEEDED_CHANNELS * 2;
export const SEEDED_ALLOCATIONS = SEEDED_COMMITMENTS * 2;
export const SEEDED_PARTICIPANTS = SEEDED_CHANNELS * 2;

// just choose big numbers that won't be hit in seeding
export const NONCE = 1000;
export const RPS_NONCE = 22222;

export const DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID = channelID({
  channelType: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_CHANNEL_NONCE,
  participants: [PARTICIPANT_ADDRESS, HUB_ADDRESS],
});
export const DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID = channelID({
  channelType: DUMMY_RULES_ADDRESS,
  nonce: BEGINNING_APP_CHANNEL_NONCE,
  participants: [PARTICIPANT_ADDRESS, HUB_ADDRESS],
});

export const DUMMY_RULES_ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID = channelID({
  channelType: DUMMY_RULES_ADDRESS,
  nonce: ONGOING_APP_CHANNEL_NONCE,
  participants: [PARTICIPANT_ADDRESS, HUB_ADDRESS],
});

export const DUMMY_RULES_FUNDED_RPS_CHANNEL_NONCE_CHANNEL_ID = channelID({
  channelType: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_RPS_CHANNEL_NONCE,
  participants: [PARTICIPANT_ADDRESS, HUB_ADDRESS],
});

export const DUMMY_RULES_BEGINNING_RPS_APP_CHANNEL_NONCE_CHANNEL_ID = channelID({
  channelType: DUMMY_RULES_ADDRESS,
  nonce: BEGINNING_RPS_APP_CHANNEL_NONCE,
  participants: [PARTICIPANT_ADDRESS, HUB_ADDRESS],
});

export const STAKE: Uint256 = ethers.utils.parseEther('0.01').toHexString();
export const ALLOCATION: Uint256[] = ['0x05', '0x05'];
export const DESTINATION: Address[] = [PARTICIPANT_ADDRESS, HUB_ADDRESS];
export const PARTICIPANTS: Address[] = [PARTICIPANT_ADDRESS, HUB_ADDRESS];
