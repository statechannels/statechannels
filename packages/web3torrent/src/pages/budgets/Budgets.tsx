import React, {useContext} from 'react';
import {DomainBudget} from '../../components/domain-budget/DomainBudget';
import {Web3TorrentClientContext} from '../../clients/web3torrent-client';
import _ from 'lodash';
import {Spinner} from '../../components/form/spinner/Spinner';
import {FormButton} from '../../components/form';
import {useBudget} from '../../hooks/use-budget';
import {track} from '../../segment-analytics';

interface Props {
  ready: boolean;
}

export const Budgets: React.FC<Props> = props => {
  return (
    <div>
      <section className="section fill budget">
        <h1>What are budgets?</h1>
        <p>
          A budget represents the funds the application is managing on your behalf. These funds can
          be used to download files using Web3Torrent.
        </p>
      </section>
      <CurrentBudget ready={props.ready} />
    </div>
  );
};

const CurrentBudget: React.FC<Props> = props => {
  const web3TorrentClient = useContext(Web3TorrentClientContext);

  const {channelCache, mySigningAddress: me} = web3TorrentClient.paymentChannelClient;
  const {budget, loading, createBudget, closeBudget} = useBudget(props);
  const budgetExists = !!budget && !_.isEmpty(budget);

  return (
    <section className="section fill budget">
      <h1>Your current budget</h1>
      {loading && <Spinner visible color="orange" content="Fetching your budget"></Spinner>}
      {!loading && budgetExists && (
        <DomainBudget
          budgetCache={budget}
          channelCache={channelCache}
          mySigningAddress={me}
          withdraw={closeBudget}
          allowWithdrawal={true}
        />
      )}
      {!loading && !budgetExists && (
        <div>
          <div>You don't have a budget yet!</div>
          <FormButton
            name="create-budget"
            disabled={!props.ready}
            onClick={() => createBudget() && track('Budget Requested', {})}
          >
            Create a budget
          </FormButton>
        </div>
      )}
    </section>
  );
};
