---
id: value-calculations
title: Value Calculations
sidebar_label: Value Calculations
---

Channels may be **funded, underfunded** or **overfunded.**

- A channel is funded if it has exactly enough funding to cover all of its outcomes, when they are paid out in priority order.
- It is underfunded if it has insufficient funds to pay out all of its outcomes.
- It is overfunded if it has more than sufficient funds to pay out all its outcomes.

A channel **affords** `x` coins for `destination` if `x` is less than the return value of this function:

```javascript
        function affords(address recipient, Outcome memory outcome, uint funding) internal pure returns (uint256) {
        uint result = 0;

        for (uint i = 0; i < outcome.destination.length; i++) {
            if (funding <= 0) {
                break;
            }

            if (outcome.destination[i] == recipient) {
                // It is technically allowed for a recipient to be listed in the
                // outcome multiple times, so we must iterate through the entire
                // array.
                result =result.add(min(outcome.allocation[i], funding));
            }
            if (funding > outcome.allocation[i]){
                funding = funding.sub(outcome.allocation[i]);
            }else{
                funding = 0;
            }
        }

        return result;
    }
```
