<!-- Recommend VSCode plugin 
Name: Markdown Preview Mermaid Support
Id: bierner.markdown-mermaid
Description: Adds Mermaid diagram and flowchart support to VS Code's builtin markdown preview
Version: 1.1.2
Publisher: Matt Bierner
VS Marketplace Link: https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid -->
<!-- also vscode-mermaid-syntax-highlight  -->
# Redux diagrams (current state)
as of commit 1947c682f74648ee162459314827bb9e24ca1fb1
### Methodology
In the TTT app, there are five independent parts of the `SiteState`, each reduced with its own reducer. Where these subreducers switch their behaviour on the name/type of a *state*, this can be nicely presented in a flowchart. Things are not so natural when there are a low number of state names (perhaps one) and reducers tend to switch entirely on the *actions* themselves (often updating fields independently of the current state).

Flowcharts are most useful when the flow is mostly a linear progression.


### Key: 
```mermaid
  graph LR
  linkStyle default interpolate basis
    State--> |ACTION| AnotherState
    :AllSuchStates --> |ACTION| AnotherState
    !AnyStateBut --> |ACTION| AnotherState
```
# Top level
## loginReducer
[`/packages/rps/src/redux/login/reducer.ts`](../src/redux/login/reducer.ts)
```mermaid
  graph TD
  linkStyle default interpolate basis
    loadingFALSE --> |LOGIN_REQUEST| loadingTRUE
    loadingFALSE --> |LOGOUT_REQUEST| loadingTRUE
```
<!-- etc -- doesn't fit in a flowchart so nicely. -->
## gameReducer
[`/packages/rps/src/redux/game/reducer.ts`](../src/redux/game/reducer.ts)
This flowchart is made by constructing nodes from the *gamestate types*, otherwise known as *gamestate names*, from the relevant file in `/packages/rps/src/redux/game/state.ts` directory, and then constructing edges from the relationships defined in the game reducer `/packages/rps/src/redux/game/reducer.ts` directory. Edges are labelled with the *action types* from the `actions.ts` in the game subdirectory. The flowcharts suppress information about conditional checks that are performed by the reducers. Where useful, reducers have had their sub-reducers unpacked -- making for a fewer number of more complicated flowcharts. When a reducer returns the same state as the result of conditional checks failing, these loops are also suppressed. Globally handled actions are also sometimes suppressed.

At the start of each mermaid diagram, *all* relevant state names from the `/state.ts` file are included. This way we can easily track unused state names. 


```mermaid
  graph TD
  linkStyle default interpolate basis
  NoName
  Lobby
  CreatingOpenGame
  WaitingRoom
  WaitForGameConfirmationA
  ConfirmGameB
  DeclineGame
  WaitForFunding
  WaitForPostFundSetup
  OsPickMove
  XsPickMove
  OsWaitForOpponentToPickMove
  XsWaitForOpponentToPickMove
  WaitToPlayAgain
  PlayAgain
  WaitToResign
  OpponentResigned
  WaitForResignationAcknowledgement
  WaitForWithdrawal
  XsPickChallengeMove
  OsPickChallengeMove
  PlayAgainChallengeMove

    NoName -->|UPDATE_PROFILE| Lobby

    Lobby -->|NEW_OPEN_GAME| CreatingOpenGame
    Lobby -->|JOIN_OPEN_GAME| WaitForGameConfirmationA

    CreatingOpenGame -->|CREATE_OPEN_GAME| WaitingRoom
    CreatingOpenGame -->|CANCEL_OPEN_GAME| Lobby

    WaitingRoom  -->|INITIAL_COMMITMENT_RECEIVED| ConfirmGameB
    WaitingRoom  -->|CANCEL_OPEN_GAME| Lobby

    WaitForGameConfirmationA -->|POSITION_RECEIVED| WaitForFunding

    ConfirmGameB -->|CONFIRM_GAME| WaitForFunding
    ConfirmGameB -->|ANYTHING_ELSE| Lobby

    WaitForFunding -->|FUNDING_FAILURE| Lobby
    WaitForFunding -->|FUNDING_SUCCESS| XsPickMove
    WaitForFunding -->|FUNDING_SUCCESS| OsWaitForOpponentToPickMove
    
    XsPickMove -->|MARKS_MADE| WaitToPlayAgain
    XsPickMove -->|MARKS_MADE| XsWaitForOpponentToPickMove

    XsPickChallengeMove -->|MARKS_MADE| WaitToPlayAgain
    XsPickChallengeMove -->|MARKS_MADE| XsWaitForOpponentToPickMove

    OsPickMove -->|MARKS_MADE| WaitToPlayAgain
    OsPickMove -->|MARKS_MADE| OsWaitForOpponentToPickMove

    OsPickChallengeMove -->|MARKS_MADE| WaitToPlayAgain
    OsPickChallengeMove -->|MARKS_MADE| OsWaitForOpponentToPickMove

    XsWaitForOpponentToPickMove -->|POSITION_RECEIVED| XsPickMove
    XsWaitForOpponentToPickMove -->|POSITION_RECEIVED| PlayAgain

    OsWaitForOpponentToPickMove -->|POSITION_RECEIVED| OsPickMove
    OsWaitForOpponentToPickMove -->|POSITION_RECEIVED| PlayAgain


    PlayAgain -->|PLAY_AGAIN| OsWaitForOpponentToPickMove
    PlayAgain -->|PLAY_AGAIN| WaitToPlayAgain

    PlayAgainChallengeMove -->|PLAY_AGAIN| OsWaitForOpponentToPickMove
    PlayAgainChallengeMove -->|PLAY_AGAIN| WaitToPlayAgain

    WaitToPlayAgain -->|POSITION_RECEIVED| XsPickMove
    WaitToPlayAgain -->|POSITION_RECEIVED| PlayAgain

    GameOver -->|RESIGN| WaitForWithdrawal

    WaitForWithdrawal -->|RESIGN| Lobby

    !NoName-->|EXIT_TO_LOBBY| Lobby
    OsPickMove -->|CHALLENGE_RESPONSE_REQUESTED| OsPickChallengeMove
    XsPickMove -->|CHALLENGE_RESPONSE_REQUESTED| XsPickChallengeMove
    PlayAgain -->|CHALLENGE_RESPONSE_REQUESTED| PlayAgainChallengeMove
    
    subgraph resignationReducer
      :PlayingState -->|RESIGN| *CONCLUDE_REQUESTED*
    end

    subgraph challengeReducer
      :PlayingState -->|CREATE_CHALLENGE| *CHALLENGE_REQUESTED*
    end

```
