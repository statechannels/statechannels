import {ethers} from 'ethers';
// @ts-ignore
import NitroAdjudicatorArtifact from '../../build/contracts/TESTNitroAdjudicator.json';
// @ts-ignore
import ETHAssetHolderArtifact from '../../build/contracts/ETHAssetHolder.json';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../build/contracts/ERC20AssetHolder.json';

import {keccak256, defaultAbiCoder, toUtf8Bytes} from 'ethers/utils';
import {AddressZero} from 'ethers/constants';
import {setupContracts, finalizedOutcomeHash} from '../test-helpers';
import {expectRevert} from 'magmo-devtools';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
