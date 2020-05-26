---
id: CounterfactualApp
title: CounterfactualApp.sol
---

View Source: [@counterfactual/cf-adjudicator-contracts/contracts/interfaces/CounterfactualApp.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/@counterfactual/cf-adjudicator-contracts/contracts/interfaces/CounterfactualApp.sol)

---

## Functions

- [isStateTerminal](#isstateterminal)
- [getTurnTaker](#getturntaker)
- [applyAction](#applyaction)
- [computeOutcome](#computeoutcome)

---

### isStateTerminal

```solidity
function isStateTerminal(bytes ) public pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
|  | bytes |  | 

### getTurnTaker

```solidity
function getTurnTaker(bytes , address[] ) public pure
returns(address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
|  | bytes |  | 
|  | address[] |  | 

### applyAction

```solidity
function applyAction(bytes , bytes ) public pure
returns(bytes)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
|  | bytes |  | 
|  | bytes |  | 

### computeOutcome

```solidity
function computeOutcome(bytes ) public pure
returns(bytes)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
|  | bytes |  | 

