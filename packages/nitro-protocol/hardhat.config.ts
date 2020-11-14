/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import 'hardhat-deploy';
import 'hardhat-deploy-ethers';

const infuraToken = process.env.INFURA_TOKEN;
const rinkebyDeployerPK = process.env.RINKEBY_DEPLOYER_PK;
if (!infuraToken) {
  throw new Error(`Invalid infura token ${infuraToken}`);
}

if (!rinkebyDeployerPK) {
  throw new Error(`Invalid deploy private key ${rinkebyDeployerPK}`);
}

module.exports = {
  solidity: '0.6.12',
  namedAccounts: {
    deployer: {
      rinkeby: 0,
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
