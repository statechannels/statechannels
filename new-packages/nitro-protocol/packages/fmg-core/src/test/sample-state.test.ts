import { ContractFactory, ethers, Wallet } from 'ethers';
import Web3 from 'web3';
import linker from 'solc/linker';

// @ts-ignore
import StateArtifact from '../../build/contracts/SampleState.json';
import ContractArtifact from '../../build/contracts/SampleContract.json';
// import EnumArtifact from '../../build/contracts/Enum.json';
// import FunctionArtifact from '../../build/contracts/Function.json';

describe('State', () => {
  it('works with web3', async () => {
    const web3 = new Web3('');
    await new web3.eth.Contract(StateArtifact.abi);
  });

  it('works with ethers', async () => {
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const privateKey = '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d';
  const wallet = new Wallet(privateKey, provider);
  const networkId = (await provider.getNetwork()).chainId;
  const s = await ContractFactory.fromSolidity(StateArtifact, wallet).deploy();
  console.log(await s.getStatus(0));
  ContractArtifact.bytecode = linker.linkBytecode(ContractArtifact.bytecode, {
    SampleState: StateArtifact.networks[networkId].address,
  });
  const i = await ContractFactory.fromSolidity(ContractArtifact, wallet).deploy();
  console.log(await i.getStatus(0));
  // await ContractFactory.fromSolidity(EnumArtifact);
  // await ContractFactory.fromSolidity(FunctionArtifact);
  });
});