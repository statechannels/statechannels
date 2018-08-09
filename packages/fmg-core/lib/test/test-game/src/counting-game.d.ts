import { State } from '../../../src';
declare class CountingGame {
    static preFundSetupState(opts: any): PreFundSetupState;
    static PostFundSetupState(opts: any): PostFundSetupState;
    static gameState(opts: any): GameState;
    static concludeState(opts: any): ConcludeState;
}
declare class CountingBaseState extends State {
    gameCounter: number;
    constructor({ channel, turnNum, stateCount, resolution, gameCounter }: {
        channel: any;
        turnNum: any;
        stateCount: any;
        resolution: any;
        gameCounter: any;
    });
    initialize(): void;
    toHex(): string;
}
declare class PreFundSetupState extends CountingBaseState {
    initialize(): void;
}
declare class PostFundSetupState extends CountingBaseState {
    initialize(): void;
}
declare class GameState extends CountingBaseState {
    initialize(): void;
}
declare class ConcludeState extends CountingBaseState {
    initialize(): void;
}
export { CountingGame };
