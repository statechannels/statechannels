/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import baseconfig from './hardhat.config';

const infuraToken = process.env.INFURA_TOKEN;
const rinkebyDeployerPK = process.env.RINKEBY_DEPLOYER_PK;
if (!infuraToken) {
  throw new Error(`Invalid infura token ${infuraToken}`);
}

if (!rinkebyDeployerPK) {
  throw new Error(`Invalid deploy private key ${rinkebyDeployerPK}`);
}

export default {
  ...baseconfig,
  namedAccounts: {
    deployer: {
      // Address used for the initial deploy of the contracts.
      // Ask @kerzhner for the private key if you would like to deploy from the same address
      // Otherwise uncomment the line below
      //rinkeby: 0,
      rinkeby: '0x87612aAD373586A38062c29F833A2AbC72038591',
    },
  },
  networks: {
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/' + infuraToken,
      accounts: [rinkebyDeployerPK],
    },
  },
  paths: {
    sources: 'contracts',
    deploy: 'hardhat-deploy',
    deployments: 'hardhat-deployments',
  },
};
