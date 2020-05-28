import React, {useContext} from 'react';
import {DomainBudget} from '@statechannels/client-api-schema';
import {ChannelState} from '../../clients/payment-channel-client';
import {utils} from 'ethers';
import {CircularProgressbar, buildStyles} from 'react-circular-progressbar';
import {Web3TorrentClientContext} from '../../clients/web3torrent-client';
import 'react-circular-progressbar/dist/styles.css';
import './DomainBudgetTable.scss';
import {track} from '../../analytics';
import {Avatar, Badge} from '@material-ui/core';
import {Blockie, Tooltip} from 'rimble-ui';

const styles = {
  ...buildStyles({
    pathColor: '#ea692b',
    textColor: '#ea692b'
  }),
  width: 40,
  marginTop: -5
};

const bigNumberify = utils.bigNumberify;

export type DomainBudgetTableProps = {
  channelCache: Record<string, ChannelState>;
  budgetCache: DomainBudget;
  mySigningAddress: string;
  withdraw: () => void;
};

export const DomainBudgetTable: React.FC<DomainBudgetTableProps> = props => {
  const web3torrent = useContext(Web3TorrentClientContext);

  const {budgetCache, channelCache, mySigningAddress, withdraw} = props;

  const myPayingChannelIds: string[] = Object.keys(channelCache).filter(
    key => channelCache[key].payer.signingAddress === mySigningAddress
  );
  const myReceivingChannelIds: string[] = Object.keys(channelCache).filter(
    key => channelCache[key].beneficiary.signingAddress === mySigningAddress
  );

  const spent = myPayingChannelIds
    .map(id => channelCache[id].beneficiary.balance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0));

  const received = myReceivingChannelIds
    .map(id => channelCache[id].beneficiary.balance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0));

  const spendBudget = bigNumberify(budgetCache.budgets[0].availableSendCapacity);

  const receiveBudget = bigNumberify(budgetCache.budgets[0].availableReceiveCapacity);

  const inverseSpentFraction = spent.gt(0) ? spendBudget.div(spent).toNumber() : undefined;
  const spentFraction = inverseSpentFraction ? 1 / inverseSpentFraction : 0;
  const inverseRecievedFraction = received.gt(0)
    ? receiveBudget.div(received).toNumber()
    : undefined;
  const receiveFraction = inverseRecievedFraction ? 1 / inverseRecievedFraction : 0;

  return (
    <>
      <table className="domain-budget-table">
        <thead>
          <tr className="budget-info">
            <td className="budget-button">Wallet Action</td>
            <td className="budget-identity">Identity</td>
            <td className="budget-number"> Spent / Budget </td>
            <td className="budget-number"> Earned / Budget </td>
          </tr>
        </thead>
        <tbody>
          <tr className="budget-info">
            <td className="budget-button">
              <button
                id="budget-withdraw"
                onClick={() => {
                  track('Withdraw Initiated', {spent, received, spendBudget, receiveBudget});
                  withdraw();
                }}
              >
                Withdraw
              </button>
            </td>
            <td className="budget-identity">
              <Tooltip message={web3torrent.paymentChannelClient.myEthereumSelectedAddress}>
                <Badge badgeContent={0} overlap={'circle'} showZero={false} max={999}>
                  <Avatar>
                    <Blockie
                      opts={{
                        seed: web3torrent.paymentChannelClient.myEthereumSelectedAddress,
                        bgcolor: '#3531ff',
                        size: 6,
                        scale: 4,
                        spotcolor: '#000'
                      }}
                    />
                  </Avatar>
                </Badge>
              </Tooltip>
            </td>
            <td className="budget-spent">
              <CircularProgressbar
                value={100 * spentFraction}
                text={`${(100 * spentFraction).toFixed(1)}%`}
                styles={styles}
              />
            </td>
            <td className="budget-received">
              <CircularProgressbar
                value={100 * receiveFraction}
                text={`${(100 * receiveFraction).toFixed(1)}%`}
                styles={styles}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
};
