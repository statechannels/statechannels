import React, {useContext} from 'react';
import {DomainBudget as DomainBudgetType} from '@statechannels/client-api-schema';
import {ChannelState} from '../../clients/payment-channel-client';
import {utils} from 'ethers';
import {Web3TorrentClientContext} from '../../clients/web3torrent-client';
import './DomainBudget.scss';
import {track} from '../../analytics';
import {
  Avatar,
  Tooltip,
  LinearProgress,
  Box,
  Typography,
  LinearProgressProps
} from '@material-ui/core';
import {Blockie} from 'rimble-ui';
import {PieChart} from 'react-minimal-pie-chart';
import {prettyPrintWei} from '../../utils/calculateWei';
import {BigNumber} from 'ethers/utils';
import bigDecimal from 'js-big-decimal';

const bigNumberify = utils.bigNumberify;

export type DomainBudgetProps = {
  channelCache: Record<string, ChannelState>;
  budgetCache: DomainBudgetType;
  mySigningAddress: string;
  withdraw: () => void;
};

export const DomainBudget: React.FC<DomainBudgetProps> = props => {
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
    return budgetCache.budgets[0].channels.find(
      channelBudget => channelBudget.channelId === channelId
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

  const colors = ['#ea692b', '#ea692b', '#d5dbe3', '#d5dbe3'];
  return (
    <table>
      <tbody>
        <tr>
          <td>
            <div className="pie-chart-and-identity-container">
              <PieChart
                className="budget-pie-chart"
                animate
                lineWidth={18}
                labelStyle={index => ({
                  fill: colors[index],
                  fontSize: '10px',
                  fontFamily: 'sans-serif'
                })}
                radius={42}
                labelPosition={112} // outer labels
                data={[
                  {
                    title: prettyPrintWei(myBalanceFree),
                    value: myBalanceFreePercentage,
                    color: '#ea692b'
                  },
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
              <div className="identity">
                <Tooltip
                  title={web3torrent.paymentChannelClient.myEthereumSelectedAddress}
                  interactive
                  arrow
                  placement="top"
                >
                  <Avatar variant="square">
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
                </Tooltip>
              </div>
            </div>
          </td>
          <td className="budget-progress-bars">
            <span>Available receive capacity</span>
            <LinearProgressWithLabel
              variant="determinate"
              value={hubBalanceFreePercentage}
              label={prettyPrintWei(hubBalanceFree)}
              className={'bar hub'}
            />
            <span>Locked receive capacity </span>
            <LinearProgressWithLabel
              variant="determinate"
              value={hubBalanceLockedPercentage}
              label={prettyPrintWei(hubBalanceLocked)}
              className={'bar locked-hub'}
            />
            <span>Locked spend capacity </span>
            <LinearProgressWithLabel
              variant="determinate"
              value={myBalanceLockedPercentage}
              label={prettyPrintWei(myBalanceLocked)}
              className={'bar locked-me'}
            />
            <span>Available spend capacity</span>
            <LinearProgressWithLabel
              variant="determinate"
              value={myBalanceFreePercentage}
              label={prettyPrintWei(myBalanceFree)}
              className={'bar me'}
            />
          </td>
        </tr>
        <tr>
          <td className="budget-button-container" colSpan={1}>
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
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

function LinearProgressWithLabel(props: LinearProgressProps & {value: number; label: string}) {
  return (
    <Box display="flex" alignItems="center">
      <Box width="100%" mr={1}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box minWidth={100} maxWidth={100}>
        <Typography variant="caption" color="textSecondary">
          {props.label}
        </Typography>
      </Box>
    </Box>
  );
}
