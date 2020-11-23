import createTimer, { Timer } from 'unitimer';
import Table from 'cli-table3';

export interface TimingResult {
  maxPayment: number;
  minPayment: number;
  meanPayment: number;
  maxConsecutivePayment: number;
  minConsecutivePayment: number;
  meanConsecutivePayment: number;
  paymentCalls: number;
  channels: number;
}
export class PerformanceTimer {
  private channelTimers: Record<string, Timer> = {};
  constructor(channelIds: string[], private paymentCalls: number) {
    this.channelTimers = channelIds.reduce((result, c) => {
      result[c] = createTimer(c);

      return result;
    }, {} as Record<string, Timer>);
  }
  start(channelId: string): void {
    this.channelTimers[channelId].start();
  }

  stop(channelId: string): void {
    this.channelTimers[channelId].stop();
  }
  calculateResults(): TimingResult {
    const maxPayment = Math.max(
      ...Object.keys(this.channelTimers).map(k => this.channelTimers[k].max())
    );
    const minPayment = Math.min(
      ...Object.keys(this.channelTimers).map(k => this.channelTimers[k].min())
    );
    const arrayOfMeans = Object.keys(this.channelTimers).map(k => this.channelTimers[k].mean());
    const meanPayment = arrayOfMeans.reduce((a, b) => a + b, 0) / arrayOfMeans.length;
    const arrayOfTotals = Object.keys(this.channelTimers).map(
      k => this.channelTimers[k].stats().total
    );
    const maxConsecutivePayment = Math.max(...arrayOfTotals);
    const minConsecutivePayment = Math.min(...arrayOfTotals);
    const meanConsecutivePayment = arrayOfTotals.reduce((a, b) => a + b, 0) / arrayOfTotals.length;
    return {
      meanPayment,
      minPayment,
      maxPayment,
      maxConsecutivePayment,
      minConsecutivePayment,
      meanConsecutivePayment,
      paymentCalls: this.paymentCalls,
      channels: Object.keys(this.channelTimers).length,
    };
  }

  static formatResults(results: TimingResult): string {
    const table = new Table({ head: ['Action', 'Min (MS)', 'Max (MS)', 'Avg (MS)'] });

    table.push(
      ['Individual makePayment call', results.minPayment, results.maxPayment, results.meanPayment],
      [
        `${results.paymentCalls} consecutive calls of makePayment`,
        results.minConsecutivePayment,
        results.maxConsecutivePayment,
        results.meanConsecutivePayment,
      ]
    );
    return table.toString();
  }
}
