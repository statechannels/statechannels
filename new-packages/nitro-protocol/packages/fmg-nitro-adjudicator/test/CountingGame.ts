import { ethers } from "ethers";
import { getWalletWithEthAndProvider, linkedByteCode, getNetworkId } from "magmo-devtools";

import StateArtifact from "../build/contracts/State.json";
import CountingStateArtifact from "../build/contracts/CountingState.json";
import CountingGameArtifact from "../build/contracts/CountingGame.json";

export async function getCountingGame() {
    const networkId = await getNetworkId();

    CountingGameArtifact.bytecode = linkedByteCode(CountingGameArtifact, StateArtifact, networkId);
    CountingGameArtifact.bytecode = linkedByteCode(CountingGameArtifact, CountingStateArtifact, networkId);

    const wallet = getWalletWithEthAndProvider();

    const address = CountingGameArtifact.networks[networkId].address;
    return ethers.ContractFactory.fromSolidity(CountingGameArtifact, wallet).attach(address);
}