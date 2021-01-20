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

## [Optional] Changes
Multiple changes are not recommended, so this section should normally be omitted. Unforunately, they are sometimes unavoidable. If there are multiple logical changes, list them separately.

1. `'foo'` is replaced by `'bar'`
2. `'fizzbuzz'` is optimized for gas

## Labels

Feel free to delete options that are not relevant.

- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Chore (tech debt, improved developer experience, etc)
- [ ] Performance improvement (either gas efficiency or computational efficiency)
- [ ] Requires a documentation update
- [ ] Security related (requires two sets of eyes before merging)

# [Optional] How Has This Been Tested?

Did you need to run manual tests to verify this change? If so, please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce. Please also list any relevant details for your test configuration

# Checklist:

## Code quality
- [ ] I have written clear commit messages
- [ ] I have performed a self-review of my own code
- [ ] I have scoped this change as narrowly as possible
- [ ] I have separated functional and non-functional changes
- [ ] I have commented my code wherever necessary
- [ ] I have added tests that prove my fix is effective or that my feature works
## Project management
- [ ] I have linked to relevant issues
- [ ] I have added dependent tickets
- [ ] I have assigned myself to this PR
- [ ] I have chosen the appropriate pipeline
