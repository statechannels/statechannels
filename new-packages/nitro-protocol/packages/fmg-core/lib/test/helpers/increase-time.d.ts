export declare function increaseTime(duration: any): Promise<{}>;
/**
 * Beware that due to the need of calling two separate testrpc methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
export declare function increaseTimeTo(target: any): Promise<{}>;
export declare const duration: {
    seconds: (val: any) => any;
    minutes: (val: any) => number;
    hours: (val: any) => number;
    days: (val: any) => number;
    weeks: (val: any) => number;
    years: (val: any) => number;
};
