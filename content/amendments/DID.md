---
title: DID
summary: Añade identificadores descentralizados (W3C DID) al ledger: cada cuenta puede publicar y actualizar un documento DID.
xls: XLS-0040
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0040-decentralized-identity
xrplDocs: https://xrpl.org/resources/known-amendments#did
introducedIn: 2.0.0
---

## Qué cambia

Añade el objeto `DID`, uno como máximo por cuenta, que representa el identificador `did:xrpl:1:<dirección>`. `DIDSet` lo crea o actualiza con hasta tres campos opcionales en hexadecimal: `DIDDocument` (el documento DID embebido), `URI` (dónde encontrarlo fuera de cadena) y `Data` (atestaciones u otros datos). Al menos uno debe quedar con contenido; una `DIDSet` que dejaría el objeto vacío se rechaza con `tecEMPTY_DID`, comportamiento reforzado después por `fixEmptyDID`. `DIDDelete` elimina el objeto y libera su reserva.

## Transacciones y objetos afectados

- Nuevas: [DIDSet](/tx/DIDSet) y [DIDDelete](/tx/DIDDelete).
- Nuevo objeto [DID](/objects/DID), que consume una unidad de owner reserve y aparece en el directorio de la cuenta.
- Una cuenta con un DID no puede borrarse con [AccountDelete](/tx/AccountDelete) hasta eliminarlo.

## Estado y contexto

Los DID del W3C permiten identificar a una persona, organización o dispositivo sin depender de una autoridad central: el sujeto controla el identificador y las claves asociadas. Anclar el documento DID a una cuenta del XRPL da una raíz de confianza verificable para credenciales verificables y flujos de identidad. La XLS-40 se propuso como pieza de identidad de bajo nivel; [Credentials](/amendments/Credentials) llegó después para expresar afirmaciones concretas sobre una cuenta y vincularlas a la autorización de depósito.
