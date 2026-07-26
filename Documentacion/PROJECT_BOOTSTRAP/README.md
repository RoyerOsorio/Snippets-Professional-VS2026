# README.md

````markdown
# 🏛 Reimbursements Platform Blueprint
## Project Bootstrap Package v1.0

---

## Información General

| Campo | Valor |
|---------|---------|
| Proyecto | Reimbursements Platform |
| Tipo | Plataforma Empresarial |
| Dominio | Gestión de Reembolsos |
| Arquitectura Objetivo | Microservicios |
| Metodología | Domain-Driven Design (DDD) + Clean Architecture |
| Tecnología Base | .NET 10 + C# + SQL Server |
| Frontend Inicial | ASP.NET Core MVC |
| Control de Versiones | Azure DevOps |
| Equipo | 3 Desarrolladores + 1 Líder Funcional |
| Estado | Fase de Descubrimiento |
| Versión | 1.0 |
| Documento | Bootstrap |
| Clasificación | Fundacional |

---

# 1. Propósito de este documento

Este documento es el punto de entrada oficial del proyecto.

Su objetivo es proporcionar a cualquier persona o inteligencia artificial el contexto necesario para comprender:

- Qué se está construyendo.
- Por qué existe el proyecto.
- Cómo debe trabajarse.
- Qué principios deben respetarse.
- Cómo se toman las decisiones.
- Qué documentos forman parte del Blueprint.

Este documento forma parte del **Project Bootstrap Package**, cuyo propósito es inicializar el contexto completo del proyecto.

---

# 2. Descripción del proyecto

Se desarrollará una plataforma empresarial para la gestión integral de reembolsos de seguros y beneficios.

La plataforma reemplazará y unificará funcionalidades provenientes de tres sistemas existentes.

El sistema permitirá administrar:

- Clientes.
- Grupos.
- Subgrupos.
- Coberturas.
- Documentos.
- Pólizas.
- Asegurados.
- Beneficiarios.
- Solicitudes de reembolso.
- Validaciones administrativas.
- Dictámenes médicos.
- Dictámenes dentales.
- Validaciones bancarias.
- Procesos de pago.
- Reportes.
- Notificaciones.
- Configuraciones.

---

# 3. Visión

Diseñar una plataforma empresarial basada en microservicios, preparada para evolucionar durante los próximos años y convertirse en el estándar tecnológico para futuros proyectos de la organización.

---

# 4. Misión

Construir una arquitectura mantenible, escalable, bien documentada y alineada con las necesidades reales del negocio mediante:

- Domain-Driven Design (DDD)
- Clean Architecture
- Microservicios
- Buenas prácticas de ingeniería
- Documentación profesional
- Gobierno arquitectónico

---

# 5. Filosofía del proyecto

Este proyecto seguirá el principio:

> "Diseñar con propósito. Construir para evolucionar."

Toda decisión deberá responder:

> ¿Esta decisión mejora la arquitectura de largo plazo o únicamente resuelve un problema inmediato?

---

# 6. Principios fundamentales

## 6.1 El negocio primero

Las decisiones tecnológicas estarán subordinadas a las necesidades del negocio.

---

## 6.2 Architecture First

No se implementará sin análisis previo.

Flujo obligatorio:

Análisis
↓
Diseño
↓
Revisión
↓
Aprobación
↓
Implementación
↓
Auditoría

---

## 6.3 Simplicidad

Se favorecerán soluciones simples.

Se evitará:

- Sobreingeniería.
- Complejidad innecesaria.
- Tecnologías sin justificación.

---

## 6.4 Evolución

Toda decisión deberá facilitar futuras modificaciones.

---

## 6.5 Documentación

La documentación es parte del producto.

---

# 7. Estado actual del proyecto

## Decisiones aprobadas

✔ Crear solución nueva.

✔ Arquitectura de microservicios.

✔ SQL Server.

✔ IIS.

✔ .NET 10.

✔ C#.

✔ Clean Architecture.

✔ DDD.

✔ ASP.NET Core Identity.

✔ JWT (evaluación futura).

✔ Azure DevOps.

✔ Bootstrap documental.

✔ Documentación profesional.

✔ ADR.

✔ Architecture Governance.

✔ Uso de Claude como implementador.

✔ Uso de ChatGPT como Chief Software Architect.

---

# 8. Estrategia de microservicios

Se utilizará una estrategia de:

> Microservicios grandes y bien definidos.

Se evitará:

- Un microservicio por tabla.
- Un microservicio por entidad.
- Fragmentación excesiva.

La definición final dependerá del análisis DDD.

---

# 9. Roles del proyecto

## Equipo Humano

- Líder funcional.
- Desarrollador 1.
- Desarrollador 2.
- Desarrollador 3.

---

## Inteligencia Artificial

### ChatGPT

Rol:

Chief Software Architect

Responsabilidades:

- Arquitectura.
- DDD.
- Revisión.
- Gobierno arquitectónico.
- Documentación.
- Auditoría.
- Prompts.

---

### Claude

Rol:

Implementation Assistant

Responsabilidades:

- Generación de propuestas.
- Diagramas.
- Código.
- Documentación.

Claude no tomará decisiones arquitectónicas.

---

# 10. Metodología

Fase 0:
Bootstrap

Fase 1:
Business Discovery

Fase 2:
Domain Discovery

Fase 3:
DDD

Fase 4:
Reference Architecture

Fase 5:
Technology Blueprint

Fase 6:
Standards

Fase 7:
Roadmap

Fase 8:
Implementación

Fase 9:
Hardening

Fase 10:
Producción

---

# 11. Estructura documental

```text
PROJECT_BOOTSTRAP/

README.md

INDEX.md

01_Project_Identity.md

02_Business_Context.md

03_Architecture_Vision.md

04_AI_Collaboration_Model.md

05_Project_Decisions.md

06_Project_Roadmap.md

07_Next_Steps.md
````

---

# 12. Blueprint futuro

```text
META/

TPL/

BOOT/

RPC/

STD/

GDE/

ADR/

CHK/

PRM/
```

---

# 13. Gobierno arquitectónico

Toda decisión importante seguirá:

Problema
↓
Análisis
↓
Alternativas
↓
Pros
↓
Contras
↓
Trade-offs
↓
Recomendación
↓
ADR
↓
Implementación

---

# 14. Single Source of Truth

El conocimiento oficial del proyecto será:

Blueprint
↓
ADR
↓
Estándares
↓
Guías
↓
Código

Nunca al revés.

---

# 15. Reglas permanentes

* No implementar sin diseño.
* No elegir tecnologías por moda.
* No crear microservicios sin DDD.
* No aceptar propuestas sin revisión.
* No generar deuda técnica innecesaria.
* No romper principios arquitectónicos.

---

# 16. Próximos pasos

Después de leer este documento se deberá continuar con:

1. INDEX.md
2. 01_Project_Identity.md
3. 02_Business_Context.md
4. 03_Architecture_Vision.md
5. 04_AI_Collaboration_Model.md
6. 05_Project_Decisions.md
7. 06_Project_Roadmap.md
8. 07_Next_Steps.md

Una vez completado el Bootstrap Package comenzará oficialmente el Blueprint mediante:

META-000 — Blueprint Information Architecture.

```
```
