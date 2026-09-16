---
title: LendingProtocol
summary: Sienta las bases internas del protocolo de préstamos de XRPL (rounding e invariantes compartidas con la Single Asset Vault) sobre las que se construyen las transacciones de Loan y LoanBroker.
xrplDocs: https://xrpl.org/resources/known-amendments#lendingprotocol
---

## Qué cambia

LendingProtocol es la primera pieza del protocolo de préstamos nativo de XRPL: un sistema en el que una [Vault](/objects/Vault) (introducida por [SingleAssetVault](/amendments/SingleAssetVault)) actúa como fuente de liquidez que un `LoanBroker` presta a terceros mediante objetos `Loan`, cobrando intereses que retornan a los depositantes de la vault.

Este amendment concreto no habilita todavía las transacciones de `Loan`/`LoanBroker` —eso lo hace [LendingProtocolV1_1](/amendments/LendingProtocolV1_1)—, sino que ajusta el comportamiento interno que esas transacciones necesitan para funcionar correctamente: reglas de redondeo en `STAmount` y en los helpers de `AccountRoot`, `RippleState` y MPT que la vault y los préstamos comparten, y varios invariantes de ledger (comprobados en `InvariantCheck` y `MPTInvariant`) que empiezan a aplicarse en modo de refuerzo (enforcement), no solo de detección, cuando el amendment está activo.

## Transacciones y objetos afectados

No introduce transacciones ni objetos propios. Prepara el terreno para [VaultCreate](/tx/VaultCreate), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultDelete](/tx/VaultDelete) y para las transacciones que sí llegan con LendingProtocolV1_1, como `LoanSet`, `LoanDelete`, `LoanBrokerSet` y `LoanBrokerDelete`. También interactúa con [MPTokensV1](/amendments/MPTokensV1), ya que el activo depositado en una vault suele representarse como MPT.

## Estado y contexto

Es un amendment de infraestructura: introduce las correcciones de redondeo y los invariantes de contabilidad que un sistema de préstamos con intereses necesita para no perder ni generar valor por error de precisión, antes de exponer la superficie de transacciones que un usuario final usaría. Forma pareja con [SingleAssetVault](/amendments/SingleAssetVault) y es prerrequisito de [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), que añade las transacciones concretas de préstamo.
