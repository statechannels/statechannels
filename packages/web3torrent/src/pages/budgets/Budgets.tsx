import React, {useContext} from 'react';
import {SiteBudgetTable} from '../../components/site-budget-table/SiteBudgetTable';
import {Web3TorrentContext} from '../../clients/web3torrent-client';
import _ from 'lodash';
import {Spinner} from '../../components/form/spinner/Spinner';
import {FormButton} from '../../components/form';
import {useBudget} from '../../hooks/use-budget';

interface Props {
  ready: boolean;
}

export const Budgets: React.FC<Props> = props => {
  return (
    <div>
      <section className="section fill download">
        <h1>What are budgets?</h1>
        <p>
          <strong>How do I pay for the download?</strong>
          <br />
          When you click "Start Download", you'll be asked to allocate an amount of ETH so
          Web3Torrent can collect payments on your behalf and transfer those funds to peers who have
          pieces of the file . Unlike other systems, the payment is not upfront; instead, you pay as
          you download.
        </p>
        <p>
          <strong>Is it safe?</strong>
          <br />
          Web3Torrent operates with budgets; therefore, the app will <b>never</b> use any funds
          outside whatever amount you allocate when starting the download. Also, Web3Torrent is
          powered by{' '}
          <a href="http://statechannels.org" target="_blank" rel="noopener noreferrer">
            State Channels
          </a>
          , a technique that reduces fees for blockchain users, allowing them to transact with each
          other on faster-than-on-chain operating times. This technology enables a private,
          efficient and secure environment for transactions.
        </p>
      </section>
      <CurrentBudget ready={props.ready} />
    </div>
  );
};

const CurrentBudget: React.FC<Props> = props => {
  const web3Torrent = useContext(Web3TorrentContext);

  const {channelCache, mySigningAddress: me} = web3Torrent.paymentChannelClient;
  const {budget, fetching, createBudget} = useBudget();
  const budgetExists = !!budget && !_.isEmpty(budget);

  return (
    <section className="section fill download">
      <h1>Your current budget</h1>
      {fetching && <Spinner visible color="orange" content="Fetching your budget"></Spinner>}
      {!fetching && budgetExists && (
        <SiteBudgetTable budgetCache={budget} channelCache={channelCache} mySigningAddress={me} />
      )}
      {!fetching && !budgetExists && (
        <div>
          <div>You don't have a budget yet!</div>
          <FormButton name="create-budget" disabled={!props.ready} onClick={createBudget}>
            Create a budget
          </FormButton>
        </div>
      )}
    </section>
  );
};
