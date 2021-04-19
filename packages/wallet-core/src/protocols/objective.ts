export type BaseObjective = {type: 'OpenChannel'};
// Every objective will have one channel as the target channel
export type BaseObjectiveEvent = {channelId: string; now?: number};
