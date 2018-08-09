declare class Channel {
    channelType: string;
    channelNonce: number;
    participants: string[];
    constructor(channelType: any, channelNonce: any, participants: any);
    readonly numberOfParticipants: number;
    readonly id: any;
    toHex(): string;
}
export { Channel };
