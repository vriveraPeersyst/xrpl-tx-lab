---
title: SmartEscrow
summary: XLS-100 Smart Escrows: an Escrow can carry a WASM FinishFunction that decides programmatically whether EscrowFinish succeeds.
xls: XLS-0100
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0100-smart-escrows
xrplDocs: https://xrpl.org/resources/known-amendments#smartescrow
---

## What changes

Adds programmability to escrows. [EscrowCreate](/tx/EscrowCreate) accepts a `FinishFunction` (WASM bytecode, exposed as `Bytecode` in newer builds) and an optional `Data` blob. When someone submits [EscrowFinish](/tx/EscrowFinish), the node runs the function inside a metered WASM VM; the finish only succeeds if the function returns true. The transaction fee grows with the gas the program may consume, and new result codes report program problems: `temBAD_WASM` (invalid bytecode), `tefNO_WASM` / `tefWASM_FIELD_NOT_INCLUDED` (missing program or fields) and `tecWASM_REJECTED` (the program said no).

Newer development builds rename and extend these fields (`Bytecode`, `Gas`, and `GasLimit` / `GasPrice` / `BytecodeSizeLimit` in [SetFee](/tx/SetFee)), so the exact JSON depends on the build running on the network you select.

## Affected transactions and objects

- [EscrowCreate](/tx/EscrowCreate), [EscrowFinish](/tx/EscrowFinish), [SetFee](/tx/SetFee).
- [Escrow](/objects/Escrow) gains the program and data fields.

## Status and context

A preview feature. It is enabled on WASM Devnet, which exists precisely to exercise the WASM VM and the XLS-100 spec; it is not on Testnet or Devnet and the rippled `develop` branch still lists it as `Supported::No`. Expect field names and fee rules to change before it reaches Mainnet voting.
