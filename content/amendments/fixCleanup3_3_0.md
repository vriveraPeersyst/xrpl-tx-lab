---
title: fixCleanup3_3_0
summary: Agrupa en un único amendment el conjunto de correcciones de comportamiento acumuladas para la versión 3.3.0 de rippled.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_3_0
introducedIn: 3.3.0
---

## Qué cambia

Continúa la serie iniciada por [fixCleanup3_2_0](/amendments/fixCleanup3_2_0): un solo amendment activa a la vez varias correcciones no relacionadas entre sí introducidas de cara a rippled 3.3.0. Entre ellas: una nueva escala de precisión para `Number` (`MantissaScale::Large330`, que sustituye a `Large320`), el bloqueo de que una pseudo-cuenta (por ejemplo, la de un `Vault` o un `LoanBroker`) pueda firmar transacciones en `Transactor::checkSign`, y ajustes adicionales en `AMMWithdraw`, `AMMDeposit`, `AMMClawback`, `VaultDeposit`/`VaultWithdraw`, `CheckCash`/`CheckCancel`, `CredentialCreate`, `DepositPreauth` y en el enrutamiento de pagos (`BookStep`, `OfferStream`).

## Transacciones y objetos afectados

[AMMWithdraw](/tx/AMMWithdraw), [AMMDeposit](/tx/AMMDeposit), [AMMClawback](/tx/AMMClawback), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [CheckCash](/tx/CheckCash), [CheckCancel](/tx/CheckCancel), [CredentialCreate](/tx/CredentialCreate), [DepositPreauth](/tx/DepositPreauth) y objetos pseudo-cuenta como [Vault](/objects/Vault) y `LoanBroker`.

## Estado y contexto

Igual que el resto de la serie `fixCleanupX_Y_Z`, no es una propuesta funcional única sino el mecanismo con el que rippled empaqueta, por versión, todas las correcciones de bugs de comportamiento que de otro modo requerirían un amendment votable cada una. El código comprueba `rules.enabled(fixCleanup3_3_0)` de forma independiente en cada uno de estos puntos, así que activar el amendment activa a la vez todo el lote de correcciones de la 3.3.0.
