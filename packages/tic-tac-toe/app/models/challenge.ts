import DS from 'ember-data';

const {Model, attr} = DS;

export default class ChallengeModel extends Model {
  @attr() address!: string;
  @attr() outcomeAddress!: string;
  @attr() name!: string;
  @attr() stake!: string;
  @attr() createdAt!: number;
  @attr() isPublic!: boolean;
  @attr() playerAName!: string;
  @attr() playerAOutcomeAddress!: string;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your models.
declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    challenge: ChallengeModel;
  }
}
