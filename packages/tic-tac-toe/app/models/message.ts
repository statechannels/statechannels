import DS from 'ember-data';

const {Model, attr} = DS;

export default class MessageModel extends Model {
  @attr() recipient!: string;
  @attr() sender!: string;
  @attr() data!: unknown;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your models.
declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    message: MessageModel;
  }
}
