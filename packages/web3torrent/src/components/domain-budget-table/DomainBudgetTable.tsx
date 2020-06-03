import React, {useContext, Fragment} from 'react';
import {DomainBudget} from '@statechannels/client-api-schema';
import {ChannelState} from '../../clients/payment-channel-client';
import {utils} from 'ethers';
import {Web3TorrentClientContext} from '../../clients/web3torrent-client';
import './DomainBudgetTable.scss';
import {track} from '../../analytics';
import {Avatar, Badge} from '@material-ui/core';
import {Blockie, Tooltip} from 'rimble-ui';
import {PieChart} from 'react-minimal-pie-chart';
import {prettyPrintWei} from '../../utils/calculateWei';

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

  const total = spendBudget
    .add(receiveBudget)
    .add(spent)
    .add(received); // this should be constant

  const spendBudgetPercentage = spendBudget.gt(0) ? 100 / total.div(spendBudget).toNumber() : 0;
  const receiveBudgetPercentage = receiveBudget.gt(0)
    ? 100 / total.div(receiveBudget).toNumber()
    : 0;
  const spentPercentage = spent.gt(0) ? 100 / total.div(spent).toNumber() : 0;
  const receivedPercentage = received.gt(0) ? 100 / total.div(received).toNumber() : 0;

  console.log([
    spendBudgetPercentage,
    receiveBudgetPercentage,
    spentPercentage,
    receivedPercentage
  ]);
  return (
    <Fragment>
      <button
        className={'budget-button'}
        id="budget-withdraw"
        onClick={() => {
          track('Withdraw Initiated', {spent, received, spendBudget, receiveBudget});
          withdraw();
        }}
      >
        Withdraw
      </button>
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
      <PieChart
        data={[
          {title: prettyPrintWei(spendBudget), value: spendBudgetPercentage, color: '#ea692b'}, // spendBudget
          {title: prettyPrintWei(receiveBudget), value: receiveBudgetPercentage, color: '#d5dbe3'}, // receiveBudget
          {title: prettyPrintWei(received), value: receivedPercentage, color: '#006dff'}, // received
          {title: prettyPrintWei(spent), value: spentPercentage, color: '#1ec51b'} // spent
        ]}
      />
    </Fragment>
  );
};
