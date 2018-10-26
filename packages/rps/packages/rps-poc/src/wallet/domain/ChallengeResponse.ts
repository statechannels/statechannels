import { Signature, ConclusionProof } from ".";

export type ChallengeResponse = RespondWithMove | RespondWithExistingMove | RespondWithAlternativeMove | Refute | Conclude;

export class RespondWithMove {
}

export class RespondWithExistingMove {
  response: string;

  constructor({ response }: { response: string }) {
    this.response = response;
  }
}

export class RespondWithAlternativeMove {
  theirPosition: string;
  theirSignature: Signature;
  myPosition: string;
  mySignature: Signature;

  constructor({ theirPosition, theirSignature, myPosition, mySignature }: { theirPosition: string, theirSignature: Signature, myPosition: string, mySignature: Signature, }) {
    this.theirPosition = theirPosition;
    this.theirSignature = theirSignature;
    this.myPosition = myPosition;
    this.mySignature = mySignature;
  }
}

export class Refute {
  theirPosition: string;
  theirSignature: Signature;

  constructor({ theirPosition, theirSignature }: { theirPosition: string, theirSignature: Signature }) {
    this.theirPosition = theirPosition;
    this.theirSignature = theirSignature;
  }
}

export class Conclude {
  conclusionProof: ConclusionProof;

  constructor({ conclusionProof }: { conclusionProof: ConclusionProof }) {
    this.conclusionProof = conclusionProof;
  }
}
