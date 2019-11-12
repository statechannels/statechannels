export interface Account {
  privateKey: string;
  amount?: string;
}

export interface Deployment {
  artifact: any;
  arguments?: any[];
}

export interface DeployedArtifact {
  address: string;
  abi: string;
}

export interface DeployedArtifacts {
  [artifactName: string]: {
    address: string;
    abi: string;
  };
}
