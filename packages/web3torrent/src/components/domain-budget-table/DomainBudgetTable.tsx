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
import {BigNumber} from 'ethers/utils';
import bigDecimal from 'js-big-decimal';

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

  function extractMyBalance(channelId: string) {
    return (
      (channelCache[channelId].payer.signingAddress === mySigningAddress &&
        bigNumberify(channelCache[channelId].payer.balance)) ||
      (channelCache[channelId].beneficiary.signingAddress === mySigningAddress &&
        bigNumberify(channelCache[channelId].beneficiary.balance))
    );
  }

  function extractCounterpartyBalance(channelId: string) {
    return (
      (channelCache[channelId].payer.signingAddress === mySigningAddress &&
        bigNumberify(channelCache[channelId].beneficiary.balance)) ||
      (channelCache[channelId].beneficiary.signingAddress === mySigningAddress &&
        bigNumberify(channelCache[channelId].payer.balance))
    );
  }

  function locksUpFunds(channelId: string) {
    return (
      channelCache[channelId].status === 'running' ||
      channelCache[channelId].status === 'challenging'
    );
  }

  function sum(arrayOfBigNumbers: BigNumber[]) {
    return arrayOfBigNumbers.reduce((a: BigNumber, b: BigNumber) => a.add(b), bigNumberify(0));
  }

  const myBalanceLocked = sum(
    Object.keys(channelCache)
      .filter(locksUpFunds)
      .map(extractMyBalance)
  ); // sum of my balances over unfinalized payment channels that I participate in
  const hubBalanceLocked = sum(
    Object.keys(channelCache)
      .filter(locksUpFunds)
      .map(extractCounterpartyBalance)
  ); // sum of my counterparty's balances over unfinalized payment channels that I participate in
  const myBalanceFree = bigNumberify(budgetCache.budgets[0].availableSendCapacity); // the balance allocated to me in my ledger channel with the hub
  const hubBalanceFree = bigNumberify(budgetCache.budgets[0].availableReceiveCapacity); // the balance allocated to the hub in my ledger channel with the hub

  const total = myBalanceFree
    .add(myBalanceLocked)
    .add(hubBalanceFree)
    .add(hubBalanceLocked); // this should be constant

  function percentageOfTotal(quantity: BigNumber) {
    return parseFloat(bigDecimal.divide(quantity.toString(), total.toString(), 8)) * 100;
  }

  const [
    myBalanceFreePercentage,
    myBalanceLockedPercentage,
    hubBalanceFreePercentage,
    hubBalanceLockedPercentage
  ] = [myBalanceFree, myBalanceLocked, hubBalanceFree, hubBalanceLocked].map(percentageOfTotal);

  const colors = ['#ea692b', '#ea692b60', '#d5dbe360', '#d5dbe3'];
  return (
    <Fragment>
      <PieChart
        className="budget-pie-chart"
        lineWidth={18}
        label={({dataEntry}) => dataEntry.value > 0 && dataEntry.title}
        labelStyle={index => ({
          fill: colors[index],
          fontSize: '12px',
          fontFamily: 'sans-serif'
        })}
        radius={42}
        labelPosition={112} // outer labels
        data={[
          {title: prettyPrintWei(myBalanceFree), value: myBalanceFreePercentage, color: '#ea692b'},
          {
            title: prettyPrintWei(myBalanceLocked),
            value: myBalanceLockedPercentage,
            color: '#ea692b60'
          },

          {
            title: prettyPrintWei(hubBalanceLocked),
            value: hubBalanceLockedPercentage,
            color: '#d5dbe360'
          },
          {
            title: prettyPrintWei(hubBalanceFree),
            value: hubBalanceFreePercentage,
            color: '#d5dbe3'
          }
        ]}
      />
      <button
        className={'budget-button'}
        id="budget-withdraw"
        onClick={() => {
          track('Withdraw Initiated', {
            myBalanceFree,
            myBalanceLocked,
            hubBalanceFree,
            hubBalanceLocked
          });
          withdraw();
        }}
      >
        Withdraw
      </button>{' '}
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
    </Fragment>
  );
};
