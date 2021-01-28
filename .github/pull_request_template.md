# Description
**Title** Clear, single line description of the pull request, written as though it was an order.

Then, following a single blank line, a summary of the change and which issue is fixed, including 
- [ ] what is the problem being solved
- [ ] why this is a good approach
- [ ] what are the shortcomings of this approach, if any

It may include
- [ ] background information, such as "Fixes #"
- [ ] benchmark results
- [ ] links to design documents
- [ ] dependencies required for this change

The summary may omit some of these details if this PR fixes a single ticket that includes these details. It is the reviewer's discretion. 

## Changes [Optional] 
Multiple changes are not recommended, so this section should normally be omitted. Unfortunately, they are sometimes unavoidable. If there are multiple logical changes, list them separately.

1. `'foo'` is replaced by `'bar'`
2. `'fizzbuzz'` is optimized for gas

## How Has This Been Tested? [Optional] 

Did you need to run manual tests to verify this change? If so, please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce. Please also list any relevant details for your test configuration

## :warning: Does this require multiple approvals? [Optional]
Please explain which reason, if any, why this requires more than one approval.
- [ ] Is it security related?
- [ ] Is it a significant process change?
- [ ] Is it a significant change to architectural, design?

---
## Checklist:

### Code quality
- [ ] I have written clear commit messages
- [ ] I have performed a self-review of my own code
- [ ] This change does not have an unduly wide scope
- [ ] I have separated logic changes from refactor changes (formatting, renames, etc.)
- [ ] I have commented my code wherever necessary (can be 0)
- [ ] I have added tests that prove my fix is effective or that my feature works, if necessary
### Project management
- [ ] I have applied the [appropriate labels](https://www.notion.so/Team-working-agreements-2a95c926bb5642e5a5c42e4b74a9dd24#b304e56734a74dfbb341b8b4b27b1c0c)
- [ ] I have linked to all relevant issues (can be 0)
- [ ] I have added all dependent tickets (can be 0)
- [ ] I have assigned myself to this PR
- [ ] I have chosen the appropriate pipeline on zenhub
