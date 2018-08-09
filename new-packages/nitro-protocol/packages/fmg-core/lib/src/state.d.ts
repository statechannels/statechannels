import { Channel } from './channel';
declare class State {
    channel: any;
    stateType: State.StateType;
    turnNum: number;
    resolution: number[];
    stateCount: number;
    constructor({ channel, stateType, turnNum, resolution, stateCount }: {
        channel: Channel;
        stateType: State.StateType;
        turnNum: number;
        resolution: number[];
        stateCount?: number;
    });
    toHex(): string;
    sign(account: any): any[];
    readonly numberOfParticipants: any;
    readonly mover: any;
}
declare module State {
    enum StateType {
        PreFundSetup = 0,
        PostFundSetup = 1,
        Game = 2,
        Conclude = 3
    }
}
export { State };
