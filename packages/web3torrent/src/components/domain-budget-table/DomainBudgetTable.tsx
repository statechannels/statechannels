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

  const myBalanceLocked = sum([
    ...Object.keys(channelCache)
      .filter(iAmThePayer)
      .map(extractPayerBalance),
    ...Object.keys(channelCache)
      .filter(iAmTheBeneficiary)
      .map(extractBeneficiaryBalance)
  ]); // sum of my balances over payment channels that I participate in
  const hubBalanceLocked = sum([
    ...Object.keys(channelCache)
      .filter(iAmThePayer)
      .map(extractBeneficiaryBalance),
    ...Object.keys(channelCache)
      .filter(iAmTheBeneficiary)
      .map(extractPayerBalance)
  ]); // sum of my counterparty's balances over payment channels that I participate in
  const myBalanceFree = bigNumberify(budgetCache.budgets[0].availableSendCapacity); // the balance allocated to me in my ledger channel with the hub
  const hubBalanceFree = bigNumberify(budgetCache.budgets[0].availableReceiveCapacity); // the balance allocated to the hub in my ledger channel with the hub

  const total = myBalanceFree
    .add(myBalanceLocked)
    .add(hubBalanceFree)
    .add(hubBalanceLocked); // this should be constant

  function iAmThePayer(channelId: string) {
    return channelCache[channelId].payer.signingAddress === mySigningAddress;
  }
  function iAmTheBeneficiary(channelId: string) {
    return channelCache[channelId].beneficiary.signingAddress === mySigningAddress;
  }

  function extractPayerBalance(channelId: string) {
    return bigNumberify(channelCache[channelId].payer.balance);
  }
  function extractBeneficiaryBalance(channelId: string) {
    return bigNumberify(channelCache[channelId].beneficiary.balance);
  }

  function sum(arrayOfBigNumbers: BigNumber[]) {
    return arrayOfBigNumbers.reduce(
      (a, b) => bigNumberify(a).add(bigNumberify(b)),
      bigNumberify(0)
    );
  }

  function percentageOfTotal(quantity: BigNumber) {
    return parseFloat(bigDecimal.divide(quantity.toString(), total.toString(), 8)) * 100;
  }

  const [
    myBalanceFreePercentage,
    myBalanceLockedPercentage,
    hubBalanceFreePercentage,
    hubBalanceLockedPercentage
  ] = [myBalanceFree, myBalanceLocked, hubBalanceFree, hubBalanceLocked].map(percentageOfTotal);

  console.log(myBalanceFree, myBalanceLocked, hubBalanceFree, hubBalanceLocked);
  console.log(
    myBalanceFreePercentage,
    myBalanceLockedPercentage,
    hubBalanceFreePercentage,
    hubBalanceLockedPercentage
  );
  return (
    <Fragment>
      <button
        className={'budget-button'}
        id="budget-withdraw"
        onClick={() => {
          track('Withdraw Initiated', {
            myBalanceFreePercentage,
            myBalanceLockedPercentage,
            hubBalanceFreePercentage,
            hubBalanceLockedPercentage
          });
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
          {title: prettyPrintWei(myBalanceFree), value: myBalanceFreePercentage, color: '#ea692b'},
          {
            title: prettyPrintWei(hubBalanceFree),
            value: hubBalanceFreePercentage,
            color: '#d5dbe3'
          },
          {
            title: prettyPrintWei(myBalanceLocked),
            value: myBalanceLockedPercentage,
            color: '#1ec51b'
          },
          {
            title: prettyPrintWei(hubBalanceLocked),
            value: hubBalanceLockedPercentage,
            color: '#006dff'
          }
        ]}
      />
    </Fragment>
  );
};
