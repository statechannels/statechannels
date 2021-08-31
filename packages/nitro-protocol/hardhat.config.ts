import 'hardhat-watcher';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import {HardhatUserConfig} from 'hardhat/config';
import {getPrivateKeyWithEth} from '@statechannels/devtools';

const infuraToken = process.env.INFURA_TOKEN;
const rinkebyDeployerPK = process.env.RINKEBY_DEPLOYER_PK;
const mainnetDeployerPK = process.env.MAINNET_DEPLOYER_PK;
if (!infuraToken) {
  console.warn(`Invalid infura token ${infuraToken}`);
}
if (!rinkebyDeployerPK) {
  console.warn(`Invalid rinkeby deploy private key ${rinkebyDeployerPK}`);
}
if (!mainnetDeployerPK) {
  console.warn(`Invalid mainnet deploy private key ${mainnetDeployerPK}`);
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.7.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    overrides: {
      // This configuration is a workaround for an example contract which doesn't compile with the optimzer on.
      // The contract is not part of our core protocol.
      // It is an example of an application a third party dev might write, so it is highly nonideal that it requires this workaround.
      // See https://github.com/ethereum/solidity/issues/10930
      'contracts/examples/EmbeddedApplication.sol': {
        version: '0.7.4',
        settings: {
          optimizer: {enabled: false},
        },
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      rinkeby: 0,
      // The below address was used for the initial deploy of the contracts.
      // Ask @kerzhner for the private key if you would like to deploy from the same address
      // And swap the line above for the line below:
      // rinkeby: '0x87612aAD373586A38062c29F833A2AbC72038591',
    },
  },
  paths: {
    sources: 'contracts',
    deploy: 'hardhat-deploy',
    deployments: 'hardhat-deployments',
  },
  watcher: {
    compilation: {
      tasks: ['compile'],
      verbose: true,
    },
  },
  networks: {
    rinkeby: {
      url: infuraToken ? 'https://rinkeby.infura.io/v3/' + infuraToken : '',
      accounts: rinkebyDeployerPK ? [rinkebyDeployerPK] : undefined,
      chainId: 4,
    },
    mainnet: {
      url: infuraToken ? 'https://mainnet.infura.io/v3/' + infuraToken : '',
      accounts: mainnetDeployerPK ? [mainnetDeployerPK] : undefined,
      chainId: 1,
    },
    arbitrum_testnet_v4: {
      url: 'https://kovan4.arbitrum.io/rpc',
      accounts: [getPrivateKeyWithEth()], // just use a dummy account from devtools
      chainId: 212984383488152,
    },
    hardhat: {
      hardfork: 'london',
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
