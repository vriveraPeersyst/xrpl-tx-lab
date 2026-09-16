---
title: HardenedValidations
summary: Endurece el formato de los mensajes de validación de los validadores UNL, añadiendo campos de diagnóstico y protecciones de red.
xrplDocs: https://xrpl.org/resources/known-amendments#hardenedvalidations
---

## Qué cambia

Los validadores de la red publican mensajes de "validation" para cada ledger propuesto, y esos mensajes son la base del consenso: cuando suficientes validadores del UNL de un nodo validan el mismo ledger, ese nodo lo considera final. HardenedValidations amplía el formato de esos mensajes con campos adicionales de diagnóstico, entre ellos un `Cookie` (un identificador que ayuda a detectar si un validador está corriendo varias instancias con la misma clave, algo indebido) y el `ServerVersion` del software que emite la validación, útil para monitorizar qué versiones de rippled corre la red.

El amendment también endurece las reglas de validación de esos mensajes en sí mismos: campos con formato incorrecto o inconsistencias que antes se toleraban pasan a rechazarse, reduciendo la superficie para mensajes de validación malformados o manipulados que pudieran usarse para confundir al mecanismo de consenso.

## Transacciones y objetos afectados

No afecta a ninguna transacción de usuario ni a objetos del ledger. Es un cambio en el protocolo peer-to-peer de mensajes de validación entre nodos validadores, invisible para quien construye o envía transacciones en XRPL.

## Estado y contexto

Se introdujo como parte del esfuerzo continuo de hardening de la capa de consenso de rippled: cuantos más campos de diagnóstico lleve una validation, más fácil es para los operadores de validadores y para herramientas de monitorización detectar configuraciones erróneas (como una misma clave de validador corriendo en dos servidores a la vez) antes de que afecten a la seguridad de la red. Al ser puramente interno al protocolo de consenso entre servidores, no cambia el formato de ninguna transacción ni el comportamiento visible desde una aplicación cliente.
