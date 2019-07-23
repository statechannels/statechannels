---
id: introduction
title: Introduction
sidebar_label: Introduction
---

Welcome to the **Nitro** state channel protocol specification. This document outlines the technical specifications required by developers who wish to implement or build on top of Nitro. It is intended to complement the Nitro [whitepaper](https://eprint.iacr.org/2019/219).

Nitro protocol subsumes ForceMove protocol \(previously known as Force-Move-Games\).

Because this document is a work in progress, the white paper is to take precedence in the case of any conflict.

State channels and state channel networks are defined by both on-chain and off-chain behaviour. In the case of Nitro, on-chain behaviour is instantiated by a single smart contract with 9 public methods, and off-chain behaviour by cryptographically signed ‘commitment' messages exchanged by channel participants and conforming to a fixed format.

The below schematic shows a typical scenario involving both on and off chain behaviour, as an interaction between state channel participants Alice and Bob and the Nitro adjudicator (deployed to a blockchain).

<div class="mermaid">
sequenceDiagram
    participant Alice
    participant Bob
    participant Nitro
        Alice->>Bob: PreFundSetup [A:5 , B:5 ]
        Bob->>Alice: PreFundSetup [A:5, B:5 ]
        Alice->>Nitro: deposit(Alice,RPS,5 )
        Bob->>Nitro: deposit(Bob, RPS, 5)
    loop RPS runs
        Alice->>Bob: RPS Commitment
        Bob->>Alice: RPS Commitment
    end
        Alice->>Bob: Conclude [A:1 , B:9 ]
        Bob->>Alice: Conclude [A:1 , B:9 ]
        Alice->>Nitro: transfer(RPS,Alice,1 )
        Alice->>Nitro: withdraw(Alice,1 )
        Bob->>Nitro: transfer(RPS,Bob, 9 )
        Bob->>Nitro: withdraw(Bob, 9 )
</div>
