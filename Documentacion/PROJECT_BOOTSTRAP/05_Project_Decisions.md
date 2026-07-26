# 05_Project_Decisions.md

````markdown id="7z0m4f"
# Reimbursements Platform Blueprint

---

| Campo | Valor |
|--------|-------|
| Documento | BOOT-005 |
| Nombre | Project Decisions |
| Versión | 1.0 |
| Estado | Draft |
| Clasificación | Bootstrap |
| Autor | Architecture Office |
| Responsable | Chief Software Architect |
| Audiencia | Arquitectos, Líder Técnico, Desarrolladores, Líder de Proyecto |
| Última actualización | 2026-07-24 |

---

# 1. Propósito

Este documento registra las decisiones iniciales tomadas para la creación de la plataforma.

Su objetivo es mantener trazabilidad sobre las razones detrás de las decisiones importantes realizadas durante la fase inicial del proyecto.

Este documento representa decisiones de alto nivel.

Las decisiones arquitectónicas detalladas deberán registrarse posteriormente mediante Architecture Decision Records (ADR).

---

# 2. Principios para tomar decisiones

Todas las decisiones del proyecto deberán considerar:

- Valor para el negocio.
- Impacto arquitectónico.
- Mantenibilidad.
- Complejidad introducida.
- Costos operativos.
- Evolución futura.
- Capacidad del equipo.

Una decisión no será evaluada únicamente por si funciona actualmente.

Será evaluada por su impacto durante toda la vida útil de la plataforma.

---

# 3. Decisiones Aprobadas

---

# DEC-001

## Crear una nueva solución desde cero

### Estado

Aprobada

---

## Decisión

La nueva plataforma será desarrollada como una solución completamente nueva.

No se realizará una migración directa del sistema existente.

---

## Contexto

Inicialmente existía un proyecto desarrollado con:

- .NET 10.
- C#.
- MVC.
- Clean Architecture.
- SQL Server.

Sin embargo, el avance funcional y técnico era mínimo.

Actualmente únicamente existen:

- Módulo de usuarios.
- Algunos catálogos iniciales.

Esto permite iniciar una nueva arquitectura sin la carga de una migración compleja.

---

## Justificación

Crear una nueva solución permite:

- Diseñar correctamente los límites del dominio.
- Evitar arrastrar decisiones anteriores.
- Implementar microservicios desde el inicio.
- Definir estándares adecuados.

---

# DEC-002

## Adoptar arquitectura basada en Microservicios

### Estado

Aprobada

---

## Decisión

La plataforma será diseñada utilizando una arquitectura de microservicios.

---

## Contexto

La evolución esperada del negocio requiere:

- Diferentes capacidades empresariales.
- Evolución independiente.
- Posibles integraciones futuras.
- Separación clara de responsabilidades.

---

## Justificación

Los microservicios permitirán:

- Separación por dominios.
- Independencia de evolución.
- Escalabilidad futura.
- Mejor organización del sistema.

---

## Consideración importante

No se crearán microservicios por:

- Tablas.
- Entidades.
- CRUDs.

Los microservicios deberán surgir del análisis del dominio mediante DDD.

---

# DEC-003

## Utilizar Domain-Driven Design como estrategia de análisis

### Estado

Aprobada

---

## Decisión

El diseño de la arquitectura deberá iniciar desde el dominio del negocio.

---

## Justificación

El sistema contiene reglas complejas relacionadas con:

- Clientes.
- Pólizas.
- Coberturas.
- Reembolsos.
- Dictámenes.
- Pagos.

DDD permitirá identificar correctamente:

- Bounded Contexts.
- Agregados.
- Entidades.
- Servicios de dominio.
- Eventos.

---

# DEC-004

## Utilizar Clean Architecture dentro de cada servicio

### Estado

Aprobada

---

## Decisión

Cada microservicio deberá mantener separación clara entre:

- Dominio.
- Aplicación.
- Infraestructura.
- Interfaces externas.

---

## Justificación

Permite:

- Independencia tecnológica.
- Mayor testabilidad.
- Mejor mantenimiento.
- Separación de responsabilidades.

---

# DEC-005

## Utilizar .NET 10 y C# como plataforma principal

### Estado

Aprobada

---

## Decisión

La plataforma será desarrollada utilizando:

- .NET 10.
- C#.

---

## Justificación

El equipo cuenta con experiencia previa en el ecosistema .NET.

Esto reduce curva de aprendizaje y permite aprovechar:

- Rendimiento.
- Seguridad.
- Herramientas empresariales.
- Ecosistema maduro.

---

# DEC-006

## Utilizar SQL Server como motor inicial de persistencia

### Estado

Aprobada

---

## Decisión

SQL Server será utilizado inicialmente como tecnología de base de datos.

---

## Justificación

La organización cuenta con experiencia y conocimiento operativo en:

- SQL Server.
- Administración.
- Desarrollo.
- Respaldos.
- Mantenimiento.

---

## Consideración futura

La arquitectura deberá permitir evaluar diferentes tecnologías cuando el dominio lo requiera.

---

# DEC-007

## Infraestructura inicial basada en IIS

### Estado

Aprobada

---

## Decisión

La primera implementación será desplegada utilizando IIS.

---

## Justificación

Actualmente es la infraestructura disponible y conocida por el equipo.

---

## Consideración futura

La arquitectura deberá permitir evolucionar hacia:

- Contenedores.
- Docker.
- Plataformas cloud.
- Orquestación.

---

# DEC-008

## Utilizar Azure DevOps como plataforma de colaboración

### Estado

Aprobada

---

## Decisión

Azure DevOps será utilizado para:

- Código fuente.
- Control de versiones.
- Gestión del proyecto.
- Automatización futura.

---

# DEC-009

## Implementar documentación arquitectónica formal

### Estado

Aprobada

---

## Decisión

La documentación será considerada parte oficial del producto.

---

## Justificación

Permitirá:

- Mantener conocimiento.
- Facilitar incorporación de nuevos integrantes.
- Reducir dependencia de personas.
- Mejorar mantenimiento futuro.

---

# DEC-010

## Uso de Inteligencia Artificial como herramienta de ingeniería

### Estado

Aprobada

---

## Decisión

Se utilizarán herramientas de IA como apoyo durante todo el ciclo de desarrollo.

---

## Justificación

La IA permitirá acelerar:

- Diseño.
- Documentación.
- Implementación.
- Revisión.

---

## Restricción

La IA no reemplaza:

- Decisiones humanas.
- Validación técnica.
- Conocimiento del negocio.

---

# 4. Decisiones Pendientes

Las siguientes decisiones requieren análisis posterior.

---

## Arquitectura de comunicación

Pendiente definir:

- REST.
- gRPC.
- Eventos.
- Mensajería.

---

## Broker de mensajes

Pendiente evaluar:

- RabbitMQ.
- Azure Service Bus.
- Kafka.
- Otros.

---

## API Gateway

Pendiente decidir.

---

## Contenedores

Pendiente decidir:

- Docker.
- Kubernetes.
- Otro modelo.

---

## Estrategia de despliegue

Pendiente definir:

- CI/CD.
- Ambientes.
- Automatización.

---

## Observabilidad

Pendiente definir:

- Logs.
- Métricas.
- Tracing.

---

# 5. Decisiones Rechazadas

---

# DEC-REJ-001

## Migrar directamente el proyecto existente

### Estado

Rechazada

---

## Motivo

El avance actual es suficientemente pequeño para justificar una reconstrucción arquitectónica.

---

# DEC-REJ-002

## Crear microservicios por tabla

### Estado

Rechazada

---

## Motivo

No representa correctamente el dominio del negocio y genera fragmentación innecesaria.

---

# 6. Relación con ADR

Las decisiones registradas aquí podrán evolucionar hacia documentos ADR individuales.

Ejemplo:

```
DEC-002

↓

ADR-001

Microservices Architecture Decision
```

---

# 7. Relación con otros documentos

Documentos anteriores:

- BOOT-001 — Project Identity
- BOOT-002 — Business Context
- BOOT-003 — Architecture Vision
- BOOT-004 — AI Collaboration Model

Documentos siguientes:

- BOOT-006 — Project Roadmap

Documentos relacionados:

- ADR Series
- RPC-003 — Architecture Governance

---

# 8. Historial de Cambios

| Versión | Fecha | Descripción |
|----------|-------|-------------|
| 1.0 | 2026-07-24 | Creación inicial del registro de decisiones. |
```
````
