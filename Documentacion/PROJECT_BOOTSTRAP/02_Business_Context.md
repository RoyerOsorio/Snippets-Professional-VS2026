# 02_Business_Context.md

```markdown
# Reimbursements Platform Blueprint

---

| Campo | Valor |
|--------|-------|
| Documento | BOOT-002 |
| Nombre | Business Context |
| Versión | 1.0 |
| Estado | Draft |
| Clasificación | Bootstrap |
| Autor | Architecture Office |
| Responsable | Chief Software Architect |
| Audiencia | Arquitectos, Líder Técnico, Product Owner, Desarrolladores |
| Última actualización | 2026-07-24 |

---

# 1. Propósito

Este documento describe el contexto funcional del negocio que dará origen a la plataforma.

No representa un diseño técnico.

No representa una propuesta de arquitectura.

Su único objetivo es documentar el conocimiento del dominio del negocio antes de comenzar el modelado mediante Domain-Driven Design (DDD).

Toda la arquitectura del sistema deberá derivarse del conocimiento aquí documentado.

---

# 2. Objetivo del Negocio

La plataforma tiene como objetivo administrar el ciclo completo de una solicitud de reembolso, desde su captura hasta la dispersión del pago o su rechazo definitivo.

La solución deberá consolidar procesos actualmente distribuidos en diversos sistemas, proporcionando una plataforma única, configurable y preparada para evolucionar.

---

# 3. Origen del Proyecto

Actualmente existen tres sistemas independientes relacionados con la gestión de reembolsos.

Cada uno resuelve necesidades específicas y presenta diferencias funcionales.

El nuevo proyecto busca unificar dichas capacidades bajo una sola plataforma empresarial.

Los sistemas existentes serán considerados únicamente como fuente de conocimiento funcional y no como referencia arquitectónica.

---

# 4. Problema de Negocio

Actualmente el conocimiento del negocio se encuentra distribuido entre múltiples sistemas y procesos.

Esto genera:

- Duplicidad funcional.
- Diferencias operativas entre clientes.
- Mayor complejidad para evolucionar la plataforma.
- Dependencia del conocimiento de personas específicas.
- Costos elevados de mantenimiento.

La nueva plataforma deberá eliminar estas limitaciones.

---

# 5. Actores del Negocio

Durante el análisis inicial se identifican los siguientes actores principales.

## Asegurado

Persona que registra solicitudes de reembolso y da seguimiento a sus trámites.

---

## Beneficiario

Persona para la cual se solicita el reembolso.

Puede ser el propio titular de la póliza o alguno de sus familiares.

---

## Dictaminador Administrativo

Responsable de validar la documentación presentada.

Puede:

- Aprobar.
- Solicitar correcciones.
- Rechazar documentos.
- Canalizar solicitudes.

---

## Médico Dictaminador

Responsable del análisis médico.

Puede:

- Diagnosticar.
- Autorizar montos.
- Rechazar conceptos.
- Solicitar documentación adicional.

---

## Odontólogo Dictaminador

Responsable del análisis odontológico.

Además del comportamiento médico incorpora información específica como odontograma.

---

## Validador Bancario

Responsable de validar cuentas bancarias cuando el proceso lo requiera.

---

## Operador de Pagos

Responsable de generar los procesos necesarios para realizar la dispersión de recursos.

---

## Administrador

Responsable de configurar clientes, grupos, coberturas y parámetros generales del sistema.

---

# 6. Capacidades del Negocio

A partir del análisis inicial se identifican las siguientes capacidades empresariales.

## Administración de Clientes

Permite registrar y administrar organizaciones que utilizarán la plataforma.

---

## Administración de Grupos

Cada cliente podrá definir grupos y subgrupos con configuraciones independientes.

---

## Administración de Coberturas

Cada grupo define las coberturas disponibles para sus asegurados.

---

## Configuración Documental

Cada cobertura establece los documentos obligatorios para presentar un trámite.

---

## Administración de Pólizas

Gestiona pólizas, certificados y asegurados asociados.

---

## Administración de Beneficiarios

Gestiona la relación entre titulares y familiares.

---

## Captura de Solicitudes

Permite registrar solicitudes de reembolso.

---

## Recepción de Documentos

Gestiona la carga y corrección documental.

---

## Validación Administrativa

Verifica que la documentación cumpla los requisitos establecidos.

---

## Dictamen Médico

Determina la procedencia médica del reembolso.

---

## Dictamen Dental

Determina la procedencia odontológica del reembolso.

---

## Validación Bancaria

Verifica la autenticidad de las cuentas bancarias cuando el cliente lo requiera.

---

## Gestión de Pagos

Administra la dispersión de recursos.

---

## Reportería

Permite generar reportes operativos y ejecutivos.

---

# 7. Flujo General del Negocio

De manera conceptual el negocio sigue el siguiente ciclo:

1. Configuración del cliente.
2. Configuración de grupos.
3. Configuración de coberturas.
4. Carga de asegurados.
5. Registro de solicitud.
6. Validación administrativa.
7. Dictamen especializado.
8. Validación bancaria (cuando aplique).
9. Proceso de pago.
10. Cierre del trámite.

Cada cliente podrá habilitar o deshabilitar determinadas etapas dependiendo de sus reglas de negocio.

---

# 8. Variabilidad del Negocio

El análisis inicial identifica que la plataforma deberá soportar variaciones importantes entre clientes.

Entre ellas:

- Coberturas diferentes.
- Documentación distinta.
- Flujos distintos.
- Validación bancaria opcional.
- Procesos de pago diferentes.
- Integraciones específicas.

Esto indica que la plataforma deberá ser altamente configurable.

---

# 9. Hallazgos Arquitectónicos

Durante el análisis funcional se identifican los siguientes hallazgos relevantes.

- Existen procesos reutilizables.
- Existen procesos opcionales.
- Existen procesos exclusivos de determinados clientes.
- El flujo cambia dependiendo del tipo de cobertura.
- El proceso cambia dependiendo del tipo de dictamen.
- Existen reglas específicas por cliente.

Estos hallazgos deberán considerarse durante el modelado del dominio.

---

# 10. Riesgos de Negocio

Se identifican los siguientes riesgos.

- Crecimiento constante de reglas particulares por cliente.
- Incremento de configuraciones especiales.
- Complejidad de flujos.
- Integraciones futuras con terceros.
- Cambios frecuentes en reglas operativas.

La arquitectura deberá minimizar el impacto de estos riesgos.

---

# 11. Decisiones Pendientes

En esta etapa aún no se han definido:

- Bounded Contexts.
- Microservicios.
- Eventos de dominio.
- Agregados.
- Entidades.
- APIs.
- Modelo de datos.

Estas decisiones serán resultado del proceso de Domain Discovery.

---

# 12. Relación con otros documentos

Documento previo:

- BOOT-001 — Project Identity

Documentos siguientes:

- BOOT-003 — Architecture Vision

Documentos relacionados:

- RPC-004 — Business Discovery Guide
- RPC-005 — Domain Modeling Guide

---

# 13. Historial de Cambios

| Versión | Fecha | Descripción |
|----------|-------|-------------|
| 1.0 | 2026-07-24 | Primera versión del contexto de negocio basada en el levantamiento funcional inicial. |
```
