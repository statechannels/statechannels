---
id: version-0.1.1-Migrations
title: Migrations.sol
original_id: Migrations
---

View Source: [contracts/Migrations.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/Migrations.sol)

---

## Contract Members
**Constants & Variables**

```solidity
address public owner;
uint256 public last_completed_migration;

```

## Modifiers

- [restricted](#restricted)

### restricted

```solidity
modifier restricted() internal
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

## Functions

- [](#)
- [setCompleted](#setcompleted)
- [upgrade](#upgrade)

---

### 

```solidity
function () public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### setCompleted

```solidity
function setCompleted(uint256 completed) public nonpayable restricted 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| completed | uint256 |  | 

### upgrade

```solidity
function upgrade(address new_address) public nonpayable restricted 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| new_address | address |  | 

