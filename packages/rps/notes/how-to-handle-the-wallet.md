# How to Handle the Disruptive Signing Problem?

## The Problem

In this app, and in state channels in general, it will be highly disruptive to prompt the
user to sign every state update through meta-mask. Unlike regular dapps, these updates
could happen very frequently - potentially several times a second. We call this the _disruptive
signing problem_.

In the long term, a state channel framework would need to be released with a client-side
_state channel wallet_, which would be capable of automatically signing some transactions,
according to a pre-defined set of rules. The wallet would also be responsible for storing
the signed states necessary to enforce the current position of the channel on-chain. This
storage would ideally be cross-browser and cross-device.

In the short term, we'll need a different approach.

## Ephemeral Keys

In the short term, we will solve the disruptive signing problem by generating a set of
_ephemeral keys_ for each application. The address for these keys will be used to identify
the participants in the state channel and the state updates will be signed with these keys.

These ephemeral keys will be managed in the browser. Obviously this is not super secure - 
the application has full control over the keys and therefore has complete control over the
funds in the state channel. Until proper state channel wallets exist, **don't deposit more
into a state channel than you'd be happy to lose**.

## Managing Ephemeral Keys and States in this App

When deciding how to store ephemeral keys and signed states in this app, we were faced
with a tradeoff between security and convenience. We chose convenience.

When a user is created, we generate an ephemeral key whose address becomes their identity
in the app. **We then store the ephemeral private key in firebase.** We also store the
signed states in firebase.

The advantage of this approach include:

* The user is not at risk of losing their keys or states if they clear their browser data.
* The user can log into the same account across different browsers and different devices.

The disadvantages of this approach include:

* We are relying on firebase's security to secure the private ephemeral keys of every user.
* There is a large attack surface for anyone trying to steal the ephemeral keys.

This is not a viable long-term approach, but we think it's a good tradeoff in terms of
giving a reasonable user experience on the test nets until a channel wallet exists.

