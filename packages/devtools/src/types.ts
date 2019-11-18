export interface Account {
  privateKey: string;
  amount?: string;
}

export interface Deployment {
  artifact: any;
  arguments?: (deployedArtifacts: DeployedArtifacts, opts: any[]) => any[];
}

export interface DeployedArtifact {
  address: string;
  abi: string;
}

export interface DeployedArtifacts {
  [artifactName: string]: DeployedArtifact;
}
