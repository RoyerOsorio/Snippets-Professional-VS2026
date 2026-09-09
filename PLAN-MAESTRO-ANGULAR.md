# Plan Maestro de Migración de UI — Multiportal de Reembolsos
## ASP.NET Core MVC / Razor → Angular 22

> **Naturaleza de este documento:** análisis + arquitectura + planificación.
> **Ningún archivo del proyecto (Current, Legacy o documentación) fue creado, modificado o eliminado durante su elaboración.**
> Toda la evidencia proviene de lectura directa del repositorio. Cada afirmación está etiquetada como
> **[Confirmado en código]**, **[Inferencia]** o **[No determinado]**.

---

## Context (por qué existe este plan)

El proyecto **Multiportal de Reembolsos** tiene hoy su capa de presentación construida en **ASP.NET Core MVC + Razor/CSHTML + JavaScript ES Modules vanilla** (proyecto `Vitamedica.Multiportal.UI`, .NET 10). El objetivo es **migrar únicamente la capa de UI a Angular 22**, conservando el backend actual (`Vitamedica.Multiportal.API` / `Application` / `Domain` / `Infrastructure`) y sin reconstruir el producto: se **evoluciona la tecnología de la UI**, no el sistema.

El repositorio de trabajo es `C:\Users\royer\Downloads\Vitamedica.Multiportal-Angular`, que es **byte-idéntico** (verificado con `diff -rq`, excluyendo `.vs/bin/obj`) al CURRENT canónico `C:\Users\royer\Downloads\Multiportal de Reembolsos - UI\Vitamedica.Multiportal`. **No existe todavía ningún proyecto Angular** (sin `angular.json`, `package.json`, `nx.json`). El sufijo "-Angular" del folder indica que es el workspace destinado a la migración.

El resultado esperado es un backlog técnico ejecutable por un desarrollador humano y por una IA de implementación (Gemini), sin escribir todavía el código.

---

# 1. Executive Summary

**Qué tenemos.** Una UI MVC de 6 controllers, ~14 páginas Razor + ~9 partials + chrome de layout, **17 módulos JS ES6 propios sin bundler**, y un **design system ya tokenizado y maduro** (`tokens.css` con variables `--vm-*` + `wwwroot/css/components/*.css`). Vendors: Bootstrap 5.3.3, Flatpickr 4.6.13, Lucide 1.25.0. **[Confirmado en código]**

**Estado funcional.** Todas las pantallas de negocio se sirven con **datos simulados en memoria** dentro de los controllers (`Obtener*Simulados()`). La **única integración viva** es la autenticación WCF (`AuthAgent.ValidaToken` para SSO); `AuthAgent.VerificaUsuario` es un stub que siempre devuelve el usuario ficticio "Juan Jimenez". El backend `Vitamedica.Multiportal.API` (Catálogos + Vigor + AD) está construido pero **la UI no lo consume** (2 typed `HttpClient` registrados que ningún controller llama, más una llamada comentada en `HomeController.Index`). **[Confirmado en código]**

**Contrato AJAX actual.** Las acciones `GET *Buscar` devuelven **HTML de PartialView ya renderizado por Razor** (no JSON); las mutaciones devuelven `Json(new { ok, ... })` o `BadRequest("texto plano")`. El token antiforgery viaja en el header `RequestVerificationToken`. Toda la red pasa por `wwwroot/js/core/http.js` (`getJson`/`getHtml`/`postJson`/`postForm`, clase `HttpError`; sin retry, sin timeout, sin `AbortController`, mismo origen). **[Confirmado en código]**

**Seguridad.** `Utils/CryptoBBVA.cs` tiene **clave/IV AES hardcodeados** (CRÍTICO, hallazgo transversal ya documentado, fuera del alcance de UI). No hay roles ni policies: el único claim es `ClaimTypes.Name`. `MenuItemViewModel.Permission` existe pero **no se evalúa en ningún lado**. El patrón `innerHTML` + concatenación (DEC-005 / UI-016) existe pero hoy no es explotable porque los datos son fijos. **[Confirmado en código]**

**Documentación.** 8 documentos de arquitectura de UI (`UI_Architecture_Guide.md`, `UI_Coding_Standards.md`, `CSS_Architecture_Guide.md`, `JavaScript_Architecture_Guide.md`, `UI_Component_Guide.md`, `UI_Decision_Log.md`, `UI-Master-Implementation-Plan.md`, `UI-Architecture-Implementation-Audit.md`) viven en una **tercera copia** de la solución (`C:\Users\royer\Downloads\Multiportal de Reembolsos - UI - Con Microservicios\`), **no junto al código de Current**. Fueron redactados *después* del código y con conocimiento de él. **[Confirmado en código]**

**Recomendación de alto nivel.**

1. Migración **incremental por features**, nunca big-bang. Angular servido en el **mismo origen** que el host MVC/BFF para preservar la cookie de sesión y el antiforgery sin introducir CORS (equivalente natural de **DEC-001**).
2. **El equivalente Angular de "MVC Controller como intermediario" son los mismos 6 controllers MVC actuando como BFF que devuelven JSON** — se transforma su *salida* (de PartialView HTML a JSON + ProblemDetails), no el dominio ni la API.
3. Portar el **design system tal cual** (`tokens.css` verbatim); **retirar Bootstrap JS y Lucide-classic** a favor de Angular CDK + `lucide-angular`; evaluar Flatpickr.
4. **Sin NgRx**: signals + servicios de feature. Formularios reactivos tipados. Control flow moderno (`@if`/`@for`/`@defer`). Guards e interceptores funcionales. API `resource()` / `httpResource()` para lecturas.
5. **Feature piloto en dos pasos:** (1) `Cuentas Bancarias` para probar el stack completo con bajo riesgo; (2) `Reembolsos / Crear` como prueba de fuego de complejidad (formulario progresivo, campos dinámicos, gate de "Registrar", uploads, ayuda global).

**Lo que NO se migra:** backend, dominio, infraestructura, `Vitamedica.Multiportal.API`, Legacy, la variante de microservicios, código muerto, y las funcionalidades que Current nunca implementó (ver §36).

---

# 2. Estado actual de Current

## 2.1 Solución y capas **[Confirmado en código]**

```
Vitamedica.Multiportal.slnx  (.NET 10)
├── Vitamedica.Multiportal.API            → API REST (Catalogo, Vigor, Multiportal/AD). Sin auth. Dapper + WCF.
├── Vitamedica.Multiportal.Application    → casos de uso, DTOs, AutoMapper
├── Vitamedica.Multiportal.IDomain        → entidades (csproj = Vitamedica.Multiportal.Domain)
├── Vitamedica.Multiportal.Infrastructure → repos Dapper, proxy WCF AD, DbConnectionFactory
└── Vitamedica.Multiportal.UI             → ✱ OBJETO DE LA MIGRACIÓN ✱  MVC + Razor + JS/CSS
```

## 2.2 Proyecto UI — estructura real **[Confirmado en código]**

```
Vitamedica.Multiportal.UI/
├── Program.cs                       cookie auth · antiforgery header "RequestVerificationToken" · LayoutActionFilter global
│                                    · AddHttpClient<MultiportalApiClient> · AddHttpClient<VigorApiClient> · AddScoped<AuthAgent>
│                                    · ruta default {controller=Reembolsos}/{action=Index}/{id?}
├── appsettings.json                 ExternalServices:ActiveDirectory · Apis:apiMultiportal · Apis:apiVigor · Branding
├── Agents/AuthAgent.cs              STUB — VerificaUsuario() siempre devuelve { EsAutenticado=true, "Juan Jimenez" }
├── Proxy/ActiveDirectoryProxy.cs    ~5.7k líneas autogeneradas (WCF)
├── Controllers/                     Home · Reembolsos · Clientes · CuentasBancarias · Pagos · Sesion
├── Services/
│   ├── MultiportalApiClient.cs      typed HttpClient → GET GetUser/{user}  (solo referenciado, comentado, en HomeController)
│   ├── VigorApiClient.cs            typed HttpClient → GET Asegurado / Asegurados  (ningún controller lo inyecta)
│   ├── Branding/BrandingService.cs  system name por host/claim
│   ├── Layout/LayoutViewModelFactory.cs
│   └── Navigation/  StaticNavigationProvider (árbol de menú) · NavigationService (estado activo; IGNORA Permission)
├── Infrastructure/Filters/LayoutActionFilter.cs   arma LayoutViewModel en cada request
├── Extensions/ServiceCollectionExtensions.cs      AddMultiportalUi()
├── Models/  ErrorViewModel · ActiveDirectory/* · EndPoint/* · Multiportal/* · Shared/* · ViewModels/ (20 archivos)
├── Utils/CryptoBBVA.cs              AES con clave/IV HARDCODEADOS  ← CRÍTICO (transversal, fuera de alcance UI)
├── Views/                           ver §4
└── wwwroot/                         css/ (tokens + components + página) · js/ (core + components + página) · lib/ · iconos/ · fonts/
```

## 2.3 Runtime y build **[Confirmado en código]**

- **Sin bundler / sin npm**: no hay `package.json`, `bundleconfig.json`, `libman.json`. Los assets se sirven con `app.MapStaticAssets()` (fingerprinting nativo .NET 9/10) + `asp-append-version="true"`.
- JS 100% **ES Modules nativos**. `site.js` es el único `<script type="module">` del layout; cada vista carga su propio `{pagina}.js` vía `@section Scripts`.
- **jQuery está en `lib/` pero ningún `.cshtml` lo referencia.** `jquery-validation` + `unobtrusive` se cargan sólo en `Sesion/Login.cshtml` vía `_ValidationScriptsPartial` — y **sin cargar jQuery antes**, por lo que la validación unobtrusive del login está de facto inactiva. **[Confirmado en código]**
- Vendors globales cargados antes de `site.js`: `bootstrap.bundle.min.js` (incluye Popper), `iconos/lucide.min.js` (~412 KB, expone `window.lucide`), `flatpickr.min.js` + locale `es`.

## 2.4 Configuración / ambientes **[Confirmado en código]**

| Clave | Valor base (appsettings.json) |
|---|---|
| `ExternalServices:ActiveDirectory:BaseUrl` | `http://dev-redvitamedica.bupa.com.mx/wsActiveDirectory/ActiveDirectoryService.svc` |
| `Apis:apiMultiportal:BaseUrl` | `http://dev-redvitamedica.bupa.com.mx/apiMultiPortal/` |
| `Apis:apiVigor:BaseUrl` | `http://dev-redvitamedica.bupa.com.mx/apiMultiPortal/v1/vigor` |
| `Branding:SystemName` | "Reembolsos Grupo Modelo" |

- `appsettings.Development.json` sólo cambia logging. **`TimeoutSeconds` del config no se aplica** a los `HttpClient` (sólo `BaseAddress`).
- launch: UI `http://localhost:5167` / `https://localhost:7205`; API `http://localhost:5138` / `https://localhost:7058`.
- **CORS: no configurado** ni en UI ni en API (todo es mismo origen server-rendered).
- **URLs internas y hostname `dev-*` comiteados en el archivo base, sobre HTTP** (hallazgo UI-011).

---

# 3. Estado de Legacy y su papel

**Ruta:** `C:\Users\royer\Downloads\Multiportal de Reembolsos - UI\Vitamedica.ReembolsoGModelo` — **NO MODIFICAR.**

- Monolito **ASP.NET MVC5**. `ReembolsoController.cs` ≈ **14.695 líneas / ~90 acciones**. ~50 vistas, 7 controllers. **[Confirmado en código, vía docs de análisis previos]**
- Modela **un solo dominio grande**: ciclo de vida completo de una solicitud de reembolso (registro → dictamen → aprobación → pago), más ICD/CPT, INE, odontograma, reportería, registro de usuario, recuperación de contraseña, validación de cuenta por token.
- Patrones MVC5: `Ajax.BeginForm`, `Html.Action`/`RenderAction`, recarga de página completa.

**Papel en la migración:** referencia **funcional y de negocio** únicamente. Flujo de uso:

```
Legacy → entender comportamiento/reglas → comparar con Current → definir adaptación → Angular
```

**Nunca** se copia código de Legacy ni se toma como autoridad arquitectónica. Cuando Current y Legacy difieren, **Current es la base** (p. ej. Cuentas Bancarias configurables reemplazan deliberadamente la validación por token de Legacy; el layout de pagos es CSV en vez de Excel por decisión de negocio).

**Hallazgo funcional heredado (relevante para el alcance Angular, no para corregir ahora):** según `Flujos_Funcionales_Legacy_vs_Current.md` §1/§14 (FL-04), **ninguna acción de la UI actual lleva un trámite al estado final `Aprobado`** — existen `Rechazar`, `Regresar`, `AvanzarTramite`, `DevolverTramite`, pero no `Aprobar`. Esto es un gap de producto de Current, **no** algo que la migración a Angular deba resolver; se documenta como pregunta abierta (§35).

---

# 4. Inventario de UI

## 4.1 Chrome de layout y controles transversales **[Confirmado en código]**

| Elemento | Archivo | Rol | Destino Angular |
|---|---|---|---|
| `_Layout.cshtml` | Views/Shared | Shell HTML: `<head>` con orden de CSS (tokens primero), Header, Sidebar, `@RenderBody`, Footer, backdrop, **botón flotante global "¿Necesitas ayuda?"** + **modal `#modalDocumentosAyuda`** (acordeón de 9 doc-blocks con copy hardcodeado), secciones `Styles`/`PageMessage`/`Scripts` | `AppComponent` + `layout/` (shell) |
| `_ViewStart` / `_ViewImports` | Views | `Layout="_Layout"` global; usings + TagHelpers | `app.config.ts` / rutas |
| `_Header.cshtml` | Views/Shared | logo (URL Azure Blob externa), nombre de sistema dinámico, dropdown de usuario (iniciales, rol, "Cambiar contraseña" → **controller inexistente**, toggle de densidad Cómoda/Compacta, logout POST) | `HeaderComponent` |
| `_Sidebar.cshtml` + `_SidebarItems.cshtml` | Views/Shared | `<nav>` recursivo multinivel, colapso/drawer, iconos Lucide, estado activo/abierto, badges, persistencia localStorage | `SidebarComponent` + `NavItemComponent` |
| `_Footer.cshtml` | Views/Shared | enlaces legales → **`LegalController` inexistente (404 en cada página, UI-004)**, iconos sociales, copyright/versión | `FooterComponent` |
| `_ValidationScriptsPartial` | Views/Shared | jquery-validation (login) | eliminar (Reactive Forms) |
| `Partials/_DatePicker.cshtml` | Views/Shared | input `data-component="date-picker"` + icono; init por `components/date-picker.js` (Flatpickr, dd/mm/aaaa, locale es) | `DatePickerComponent` (§10) |
| `Partials/_ClienteForm.cshtml` | Views/Shared | formulario Cliente completo, reusado por Crear+Detalle | `ClienteFormComponent` |

**Patrones repetidos inline en cada vista (no son partials hoy — cada uno será componente Angular):** page header (`.page-head`/`.page-display`/`.page-lead`), alert/PageMessage (`.alert-page --info/--warning`), panel de filtros (`.filters-panel` + fila avanzada colapsable), toolbar de tabla + **selector "Mostrar 10/25/50/100" (`.table-page-size`, `margin-left:auto` → arriba a la derecha)**, tabla (`.vm-table` + `<tbody data-estado="cargando|error|contenido|vacio">`), paginación (`.pagination-vm` con `data-pagina`), estados vacío/carga/error (`.table-state-cell` + iconos `search-x`/`loader-circle`/`alert-triangle`), modales (Bootstrap `.modal` con header azul), doc-block colapsable + subida de archivos (`.doc-file-row`/`.doc-file-picker`), timeline de estaciones (`.stage-timeline`), badges de estado (`.badge-status --success/--warning/--error/--neutral`), botones institucionales (`.btn-primary-vm`/`.btn-success-vm`/`.btn-danger-vm`/`.btn-text-vm` + familia `.doc-gen-btn`), secciones de formulario (`.form-section` numerada + colapsable), panel/timeline de notas.

## 4.2 Vistas por feature **[Confirmado en código]**

### Home / transversal
| Vista | Acción | Tipo | Propósito |
|---|---|---|---|
| `Home/Index.cshtml` | `Home.Index` GET | Página | **Placeholder** (`<h1>INDEX - HOME</h1>`). El logo y varios redirects apuntan aquí, pero el landing real es `Reembolsos/Index`. |
| `Home/Privacy.cshtml` | `Home.Privacy` GET | Página | Scaffold. |
| `Home/Asegurado.cshtml` | `Home.Asegurado(int id)` GET | Página | Portal self-service (solo lectura) de un folio: breadcrumb, timeline, datos titular/paciente, tabs de reclamación, evidencias. **Huérfano: ningún enlace de la UI lleva aquí** (FL-23). |
| `Shared/Error.cshtml` | `Home.Error` | Página | Scaffold. |

### Reembolsos (feature central; ruta default)
| Vista | Acción | Tipo | Propósito |
|---|---|---|---|
| `Reembolsos/Index.cshtml` | `Reembolsos.Index` GET | Página | Tablero de analista: saludo, 3 cards de acceso rápido, panel de filtros (rápido + "Más filtros"), tabla, selector de tamaño, paginación, `PageMessage`. Modales: `#modalNota`, `#modalConfirmarAccionTramite`, `#modalRetrocederTramite` (3 pasos). |
| `Reembolsos/Crear.cshtml` | `Reembolsos.Crear` GET | Página | **Wizard de captura** (ver §23). Form progresivo 3 secciones, tabs de categoría con doc-blocks, generador de factura (PDF/XML/Generar), líneas multi-moneda, comentarios. Modales: `#modalDerechohabiente` (`data-autoshow`), `#modalRegistroExitoso`, `#modalConfirmarCancelar`. Botón **`#btnRegistrar` arranca `disabled`**. |
| `Reembolsos/Detalle.cshtml` | `Reembolsos.Detalle(int id)` GET | Página | Dictamen: folio + timeline, secciones titular/paciente, panel lateral de notas, tablas de reclamación con switches "Procedente" + inputs "Autorizado", modal ICD/CPT + Histórico ICD, evidencias, motivo-rechazo, barra de acciones (Rechazar / Registrar). |
| `Reembolsos/Partials/_ResultadosSolicitudes.cshtml` | render por `Index` y `Buscar` | Partial `<tbody>` | filas + estado vacío + badges + acciones de fila |
| `Reembolsos/Partials/_PaginacionSolicitudes.cshtml` | render por `Index` y `Buscar` | Partial pie | conteo + pager `data-pagina` |
| `Reembolsos/Partials/_ResultadosYPaginacionSolicitudes.cshtml` | **respuesta de `Buscar`** | Partial compuesto | **cuerpo de la respuesta AJAX (HTML, no JSON)** |

### Clientes
| Vista | Acción | Tipo | Notas |
|---|---|---|---|
| `Clientes/Index.cshtml` | `Clientes.Index` GET | Página | Lista; filtrado **client-side JS puro** (sin round-trip); pager estático de 1 página; modal soft-delete. |
| `Clientes/Crear.cshtml` / `Detalle.cshtml` | GET | Página fina | renderizan `_ClienteForm`. |
| `Shared/Partials/_ClienteForm.cshtml` | compartido | Partial form | 4 secciones progresivas: Cliente / Filiales (add/remove dinámico con `<template>`) / Módulos (checkbox grid) / Coberturas (doc-block grid con Documentos anidados). Botón `#btnGuardarCliente` arranca `disabled`. |

### Cuentas Bancarias
| Vista | Acción | Tipo | Notas |
|---|---|---|---|
| `CuentasBancarias/Index.cshtml` | `.Index` GET | Página | Lista + filtros (Póliza/Banco/Estado) + selector de tamaño + paginación server-side (`Buscar` → partial HTML) + `<tbody>` de carga/error + modal confirmar. |
| `CuentasBancarias/Crear.cshtml` / `Detalle.cshtml` | GET | Página fina | renderizan `_CuentaBancariaForm`. |
| `CuentasBancarias/Partials/_CuentaBancariaForm.cshtml` | compartido | Partial form | 1 sección: Póliza, Cliente (select), Banco (select), CLABE (`pattern="[0-9]{18}"`), Titular, EsPrincipal. Botón `#btnGuardarCuentaBancaria` arranca `disabled`. |
| `CuentasBancarias/Partials/_Resultados… _Paginacion… _ResultadosYPaginacion…` | `Index`/`Buscar` | Partials | mismo patrón de swap por `<template>` |

### Pagos
| Vista | Acción | Tipo | Notas |
|---|---|---|---|
| `Pagos/Index.cshtml` | `.Index` GET | Página | Lista + cards de acción de archivo ("Layout Pagos" → descarga CSV, "Retro Grupo Modelo" → subida) + filtros (fechas, folio) + selector de tamaño + paginación + modal `#modalRetro`. |
| `Pagos/Partials/_Resultados… _Paginacion… _ResultadosYPaginacion…` | `Index`/`Buscar` | Partials | mismo patrón |

### Sesión
| Vista | Acción | Tipo | Notas |
|---|---|---|---|
| `Sesion/Login.cshtml` | `Sesion.Login` GET/POST | Página | Form Bootstrap mínimo (`User`, `Password`, antiforgery). **Fuera del design system** (UI-007). Usa `_Layout` (no hay layout de auth aparte). |

## 4.3 ViewModels / DTOs (`Models/`) **[Confirmado en código]**

- **Reembolsos/Crear (críticos):** `SolicitudReembolsoCatalogosViewModel` (Categorias[{Key,Nombre,Icono,TieneMotivo,TipoFactura,Documentos[]}], MotivosConsulta[], Monedas[]); `SolicitudReembolsoRegistroViewModel` (AseguradoTitular, Paciente{BeneficiarioId}, Reclamacion{Categorias[{Solicitado,Motivo,FacturaCargada,FacturaLineas[]}],Comentarios}); `DerechohabienteViewModel` (+ `BeneficiarioViewModel[]`).
- **Reembolsos lista/detalle:** `SolicitudReembolsoFiltroViewModel`, `SolicitudReembolsoResultadoViewModel` (paginado), `SolicitudReembolsoResumenViewModel`, `SolicitudReembolsoDetalleViewModel` (+ `EstacionDetalleViewModel`, `SaldoCoberturaViewModel`, `TitularSimuladoViewModel`).
- **Clientes:** `ClienteViewModel` (mezcla form + selección + catálogos completos — UI-012), `FilialViewModel`.
- **Cuentas Bancarias:** `CuentaBancariaFormViewModel`, `CuentaBancariaViewModel` (+ `ClabeEnmascarada`), `CuentaBancariaFiltroViewModel`, `CuentaBancariaResultadoViewModel`.
- **Pagos:** `PagoResumenViewModel`, `PagoFiltroViewModel`, `PagoResultadoViewModel`.
- **Layout/nav:** `LayoutViewModel` (Branding + CurrentUser + Sidebar), `MenuItemViewModel` (con `Permission` sin usar).
- **Shared:** `DatePickerViewModel`, `MensajeViewModel`, `ErrorViewModel`, `Login`.
- **Integración:** `UserProfile : MensajeViewModel` (usado directo como Model — UI-002), `UserResumeDto`, `GroupDto`, `TokenValidoResume`.

## 4.4 JavaScript — inventario y clasificación **[Confirmado en código]**

| Archivo | ~Tamaño | Responsabilidad → destino Angular |
|---|---|---|
| `core/http.js` | 2,7 KB | capa única fetch → **`HttpClient` + interceptores** (§12) |
| `core/storage.js` | 1,6 KB | wrapper localStorage seguro + `STORAGE_KEYS` → **servicio `PreferencesService` (signals)** |
| `core/dom-ready.js` | 0,7 KB | `onReady` idempotente → **innecesario (lifecycle Angular)** |
| `core/icons.js` | 1,6 KB | `refreshIcons()` (Lucide) → **`lucide-angular` (sin refresh manual)** |
| `core/density-preference.js` | 1,8 KB | toggle densidad + persistencia → **`ThemeDensityService` + clase en `<body>`** |
| `components/sidebar.js` | 6,8 KB | colapso/drawer/acordeón/a11y/resize/tooltip → **`SidebarComponent` + CDK a11y** |
| `components/date-picker.js` | 1,9 KB | wrapper Flatpickr auto-init → **`DatePickerComponent`** |
| `site.js` | 2,6 KB | orquestación de init → **`AppComponent` / providers** |
| `reembolsos-index.js` | 23 KB | tabla/paginación/filtros + modales + acciones fila (`postJson`) + `alert` de error → **`ReembolsosListPage` + `DataTableComponent` + `SolicitudesService`** |
| `pagos-index.js` | 12 KB | idem + subida Retro + sync href de descarga → **`PagosListPage` + `PagosService`** |
| `cuentas-bancarias-index.js` | 17 KB | idem + activar/desactivar/principal + re-render de badges (`innerHTML`) → **`CuentasListPage` + `CuentasService`** |
| `clientes-index.js` | 6,6 KB | **filtrado client-side** + cambiar estado + badges (`innerHTML` estático) → **`ClientesListPage` (filtro con signals `computed`)** |
| `reembolso-solicitud.js` | 51 KB | **el más grande.** Revelado progresivo de secciones, búsqueda de derechohabiente (`getJson`), construcción segura de filas (`createElement`/`textContent`), CP→estado/municipio, selector de categorías (roving tabindex), doc-blocks, filas dinámicas, **uploads reales (`postForm`)**, generadores de factura, líneas multi-moneda, **gate de "Registrar"** (`registroGateCompleto()`), modal de éxito + redirect → **`ReembolsoCrearPage` + subcomponentes + `ReembolsoFormService`** (§21, §23) |
| `detalle-solicitud.js` | 11 KB | modal ICD/CPT, **Histórico ICD (`innerHTML` con array demo)**, switches "Procedente", alta de nota (`li.innerHTML` + `textContent`), flujo Rechazar/Siguiente (`postJson`) → **`ReembolsoDetallePage` + subcomponentes** |
| `detalle-asegurado.js` | 2,9 KB | tabs visuales, expand/collapse de grupos → **`AseguradoPage`** |
| `cliente-form.js` | 12 KB | validación + revelado progresivo, jerarquía cobertura→documento, filiales dinámicas, `postJson` guardar → **`ClienteFormComponent` (Reactive Forms tipados)** |
| `cuenta-bancaria-form.js` | 3,9 KB | validación (CLABE regex), `postJson` guardar → **`CuentaBancariaFormComponent`** |

**Micro-patrones JS recurrentes:** confirm-modal + `postJson` + update optimista de DOM; add/remove de filas con `<template>.cloneNode` + reindexado de `name="Prefix[i].Field"`; gate de revelado progresivo ("una vez revelada, no se oculta"); token antiforgery leído siempre de `input[name='__RequestVerificationToken']`; manejo de error = `console.error("[page]", err)` + `window.alert` (**no existe componente toast**).

## 4.5 CSS / Design System **[Confirmado en código]**

- **`tokens.css`** (`:root`, ~130 líneas): fuente única de verdad. Paletas `--vm-primary-*` / `--vm-accent/success/warning/error/info-{100..600}`, neutrales, sidebar, footer, header (`--vm-header-bg:#007acc`). Tipografía: escala de 9 tamaños (`--vm-text-display:32px` … `--vm-text-micro:13px`, nada < 13px), `--vm-font-sans` Inter. Spacing base 8px (`--vm-space-1..16`). Métricas de shell (`--vm-header-h:72px`, `--vm-sidebar-w:280px`/`76px`, `--vm-control-h:44px`, `--vm-page-max-w:1400px`). Radios, sombras, z-index, `--vm-transition:200ms ease`, `--vm-focus:#1868B0`.
- **Modo densidad** (`body.density-compact` en `site-custom.css`): sobrescribe los 9 tamaños tipográficos + `--vm-control-h:40px`.
- **Breakpoints** (media queries literales, no tokens; espejadas en `sidebar.js` `BREAKPOINT`): móvil ≤767.98, tablet 768–1199.98, desktop ≥1200, wide ≥1600.
- **Componentes ya promovidos** (`wwwroot/css/components/`, barrel `site.css`): `_badge` `_button` `_table` `_table-states` `_pagination` `_filters-panel` `_modals` `_doc-block` `_help-modal` `date-picker`. Excepción compartida intencional: `form-sections.css`.
- **CSS de página** (~10 archivos, p. ej. `index.css` 12 KB, `detalle-solicitud.css` 14 KB) cargado por `@section Styles`.
- **Deuda conocida:** faltan `--vm-success-700`/`--vm-error-700` (DEC-006, `:hover` resuelto con `filter: brightness(0.88)`); `.page-head` duplicada en `index.css` + `form-sections.css` (UI-013); `<style>` embebido residual en `Index.cshtml` (UI-014); logo del header en URL absoluta externa sin versionar (UI-015).

## 4.6 Vendors **[Confirmado en código]**

| Lib | Versión | Uso real |
|---|---|---|
| Bootstrap | 5.3.3 | CSS (grid, utilidades, `.modal`, `.collapse`) + JS bundle (Modal, Collapse, Dropdown, Tooltip, Popper) |
| Flatpickr | 4.6.13 | date pickers (locale `es`, `d/m/Y`) |
| Lucide | 1.25.0 | iconos (script clásico ~412 KB, `window.lucide.createIcons()`) |
| jQuery | 3.7.1 | **cargado en `lib/` pero sin referencia real** |
| jquery-validation (+unobtrusive) | 1.21.0 / 4.0.0 | sólo `Login` (inactivo por falta de jQuery) |
| Inter (fuente) | — | `fonts/inter.css` con `src:` apuntando a `fonts.gstatic.com` (petición externa en runtime) |

---

# 5. Arquitectura actual

## 5.1 Patrón de comunicación (DEC-001) **[Confirmado en código]**

```
Browser ──HTTP──▶ MVC Controller ──(opcional)──▶ UI Service ──▶ Typed ApiClient (HttpClient) ──▶ API
```

- **Estado real:** el tramo `Controller → ApiClient → API` sólo está cableado (comentado) en `HomeController.Index`. Ninguna interacción de usuario ejercita hoy este patrón.
- **`fetch` desde JS** siempre golpea **acciones del propio controller MVC** (`/Reembolsos/Buscar`, `/Clientes/Guardar`, …), nunca la API directamente. `core/http.js` asume **un solo origen**.
- **Respuestas:** `GET *Buscar` → **PartialView (HTML)**; mutaciones → `Json(...)` / `BadRequest("string")`.
- **DEC-001 está "Recomendada — pendiente de confirmación"**; `UI-Master-Implementation-Plan.md` §4 propone confirmarla dejando abierta la puerta a BFF/Gateway.

## 5.2 Autenticación / autorización **[Confirmado en código]**

- **Cookie auth** (`CookieAuthenticationDefaults`), `LoginPath="/Sesion/Login"`, sin nombre/expiración/sliding configurados. `AccessDeniedPath` comentado.
- `[Authorize]` **desnudo** (sin roles) en Home, Reembolsos, Clientes, CuentasBancarias, Pagos. `Sesion` anónimo.
- **Sin roles, sin policies, sin `AddAuthorization(...)`.** Único claim: `ClaimTypes.Name`. `LayoutViewModelFactory` *lee* (nunca *setea*) `GivenName`/`Role`.
- Login: `POST /Sesion/Login` → `AuthAgent.VerificaUsuario` (**stub**) → `SignInAsync` cookie (`IsPersistent = RememberMe`).
- SSO: `GET /Sesion/IniciarSesion?t0=&target=` → `AuthAgent.ValidaToken(t0)` (**WCF real**) + `CryptoBBVA.Decrypt(t0)` (**clave/IV hardcodeados — CRÍTICO**) → cookie.
- Logout: `POST /Sesion/Logout` → `SignOutAsync` → redirect **hardcodeado** a `http://dev-redvitamedica.bupa.com.mx/Portal/Sesion/Logout` (UI-011).
- **Sin `UseSession`, sin `TempData`, sin CORS, sin HSTS (salvo no-dev).**

## 5.3 API backend (referencia, no se migra) **[Confirmado en código]**

- `Vitamedica.Multiportal.API`: **sin autenticación** (`UseAuthorization` sin `UseAuthentication`, ningún `[Authorize]`). `AddProblemDetails()` + `GlobalExceptionHandler`. `AddOpenApi()` (documento `/openapi`, sin Swagger UI).
- Endpoints: `MultiportalController` (`GET /Index`, `GET /GetUser/{user}`), `CatalogoController` (`GET v1/catalogo/{ServiceType|Modules|DocumentosRequeridos|FlujoReembolso|Diagnosticos|MotivoConsulta|EstatusReembolso|MotivoRechazo}`), `VigorController` (`GET v1/vigor/Asegurado`, `GET v1/vigor/Asegurados`).
- **`ObtenerListaCoberturas()` y `ObtenerListaModulos()` lanzan `NotImplementedException`** en el repo → `ServiceType` y `Modules` fallan hoy.
- `ConnectionStrings:MultiPortalDB` con **credenciales SQL en claro** en el archivo base.

---

# 6. Dependencias UI → Backend

| Feature UI (controller/acción) | Fuente de datos hoy | Endpoint API que la serviría | Estado de integración |
|---|---|---|---|
| Header perfil de usuario (`Home/Index`) | `View()` — `GetUserProfile` comentado | `GET /GetUser/{user}` (AD) | Cableado, comentado |
| `Home/Asegurado(id)` | `ObtenerFoliosAseguradoSimulados` | — (no existe) | Simulado |
| `Reembolsos/Index` + `Buscar` | `ObtenerSolicitudesSimuladas` (in-memory, filtro+paginación reales) | **no existe** (haría falta endpoint de listado) | Simulado |
| `Reembolsos/Crear` + `BuscarDerechohabiente` + `Registrar` + `SubirArchivo` | simulado; `Registrar` sólo valida | `VigorApiClient.GetInsured` → `GET v1/vigor/Asegurado`; catálogos → `GET v1/catalogo/*` | Simulado |
| `Reembolsos/Detalle(id)` | simulado determinístico por `id` | `v1/catalogo/{Diagnosticos, EstatusReembolso, MotivoRechazo, DocumentosRequeridos, FlujoReembolso}` | Simulado |
| `Reembolsos/Rechazar` `/Regresar` `/AvanzarTramite` `/DevolverTramite` `/ValidarRetroceso` `/RetrocederTramite` | simulado, `Json(new{ok,...})`; **no persiste; no existe `Aprobar`** | — | Simulado |
| `Pagos/Index` `/DescargarLayout` (CSV) `/SubirArchivoRetro` | `ObtenerPagosSimulados`; Retro sólo valida formato | — | Simulado |
| `Clientes/*` | CRUD in-memory | `v1/catalogo/{Modules, ServiceType, DocumentosRequeridos}` — **Modules/ServiceType lanzan `NotImplementedException`** | Simulado |
| `CuentasBancarias/*` | `ObtenerCuentasSimuladas` | — (net-new vs Legacy) | Simulado |
| `Sesion/Login` | `AuthAgent.VerificaUsuario` **stub** | WCF AD (comentado) | Stub |
| `Sesion/IniciarSesion` (SSO) | `AuthAgent.ValidaToken` **WCF real** + `CryptoBBVA` | `ActiveDirectoryService.svc` | **Integración viva** |

**Conclusión:** la superficie de datos que Angular necesita **no existe todavía como endpoints JSON consumibles**. La migración de UI depende de que **los 6 controllers MVC actúen como BFF y devuelvan JSON** (transformación de su capa de salida, ver §12 / DEC-A1), y — para datos reales, fase posterior — de que el backend exponga los endpoints faltantes (listado de solicitudes, persistencia de Cliente/Cuenta/Registrar, `Modules`/`ServiceType`).

---

# 7. Hallazgos y code drift

## 7.1 Code drift respecto a análisis históricos **[Confirmado en código]**

| # | Hallazgo | Evidencia | Clasificación | Impacto en migración |
|---|---|---|---|---|
| D-1 | Los endpoints `/Home/BuscarContextoAsegurado`, `/Home/IniciarReembolso`, `/Home/AprobarReclamo`, `/Home/RechazarReclamo` **no existen en Current** | grep en `Controllers/HomeController.cs` de Current: sólo `Index`, `Asegurado`, `Privacy`, `Error`. Esos 4 endpoints existen **sólo** en la variante *"Con Microservicios"* (trees #3/#4) con `ClientesApiClient`/`ReclamosApiClient`/etc. y un API Gateway | **Drift histórico ya resuelto** — Current tomó otro rumbo (6 controllers, datos simulados). | Ninguno. La variante de microservicios **está fuera de alcance** (regla del proyecto). No planear contra esos endpoints. |
| D-2 | La documentación de arquitectura (8 `.md`) **no vive junto al código de Current** | están en `C:\...\Multiportal de Reembolsos - UI - Con Microservicios\` | Riesgo de proceso | Los comentarios de código de Current citan `UI_Decision_Log.md`, `JavaScript_Architecture_Guide.md §5`, "Fase G4c", "Fase 10" — documentos que un dev de Current no tiene a mano. **Copiar/enlazar la doc vigente al workspace Angular.** |
| D-3 | Los `.md` citan `DEC-008..DEC-013` (`DetalleSolicitud` real, `BuscarContextoAsegurado`, `PagoSolicitud`, `Home/Asegurado(poliza,aseguradoId)`, `Registrar` piloto) | esos DEC describen la variante de microservicios; el `UI_Decision_Log.md` presente sólo llega a DEC-009 | Drift de documentación | Al portar la doc, **marcar DEC-008..013 como pertenecientes a la rama de microservicios (no aplican a Current/Angular)**. |
| D-4 | `Vigor`/`Asegurados`: `VigorApiClient.GetInsuredList` deserializa a `UserResumeDto?` (no a lista), y la API devuelve `AseguradoDto` | `Services/VigorApiClient.cs` vs `AseguradoDto.cs` | Bug latente de contrato | Al integrar datos reales de Vigor, **definir el DTO/Interface correcto**; no reutilizar `UserResumeDto` para asegurados. |
| D-5 | `_Header` → `Cuenta/CambiarContrasena`, `_Footer` → `Legal/*`, sidebar → rutas de la variante microservicios | controllers/acciones inexistentes en Current | Enlaces rotos (404) — UI-004 | En Angular: **decidir destino** (página placeholder propia vs enlace externo) antes de portar el chrome. |
| D-6 | `Home/Index` es placeholder; el landing real es `Reembolsos/Index` | `Views/Home/Index.cshtml` + ruta default | Inconsistencia de navegación | En Angular: **ruta raíz `''` → redirect a `/reembolsos`** o dashboard real; decidir. |

## 7.2 Hallazgos de auditoría vigentes que condicionan la migración

| ID | Severidad | Qué es | Cómo se traslada a Angular |
|---|---|---|---|
| UI-016 / DEC-005 | CRÍTICO (como patrón) | `innerHTML` + concatenación con datos (`reembolsos-index.js:371`, `detalle-solicitud.js:71`, `cuentas-bancarias-index.js`) | **Desaparece por construcción**: Angular escapa la interpolación `{{ }}` y los property bindings. Prohibir `[innerHTML]` con datos; `DomSanitizer` sólo con justificación (§14/§16). |
| UI-002 | CRÍTICO (arquitectura) | `UserProfile` (DTO) usado directo como Model | En Angular: **DTO de API ≠ modelo de vista**; mapear en el servicio de feature. |
| UI-003 | ALTO | Sidebar idéntico para autenticado/anónimo; `Permission` sin evaluar | En Angular: **guard funcional de auth** + sidebar detrás del shell autenticado; `Permission` sólo se cablea cuando exista fuente real de roles (§20). |
| UI-011 + transversales (CryptoBBVA, AD sobre HTTP) | CRÍTICO | secretos/URLs hardcodeados sobre HTTP | **Fuera del alcance de UI/Angular.** Se documenta como dependencia/riesgo (§32, §35). La cookie de sesión sigue emitida por el host .NET. |
| UI-004 | ALTO | Footer → `LegalController` inexistente | decisión previa a portar el footer (D-5). |
| UI-005 | ALTO | `_ClienteForm` sin `asp-for`/antiforgery/`method` | se resuelve al reescribir como Reactive Form + `postJson` con XSRF (§12, §15). |
| UI-006 / UI-017 | MEDIO/ALTO | vistas monolíticas (`reembolso-solicitud.js` 51 KB) y JS compartido entre vistas | oportunidad de descomposición limpia en Angular (§10, §21). |
| UI-007 | BAJO | `Login` fuera del design system | se rehace con tokens (§18). |
| UI-008 | MEDIO | skip-link comentado en `_Layout` | **incluir skip-link en el shell Angular** (§26). |
| UI-015 | MEDIO | logo en URL externa | mover a `assets/` o config (D-5). |

---

# 8. Arquitectura Angular 22 propuesta

> Todas las decisiones de esta sección son **[Propuesto]** salvo mención contraria. Se marcan **REQUERIDO** (necesario para migrar bien), **RECOMENDADO** (mejora conveniente) o **FUTURO** (posterior).

## 8.1 Fundamentos (REQUERIDO)

| Tema | Decisión | Nota vs versiones antiguas de Angular |
|---|---|---|
| Componentes | **100% standalone**, sin `NgModule` | desde Angular 19 standalone es el default (`--standalone` ya ni existe como flag) |
| Bootstrap de app | `bootstrapApplication(AppComponent, appConfig)` con `app.config.ts` (`providers`) | reemplaza `AppModule` |
| DI | **`inject()`** en funciones y campos; constructor sólo si aporta | patrón moderno; habilita guards/interceptores funcionales |
| Reactividad | **Signals** para estado local, de UI y de feature; `computed`/`effect`; `input()`/`output()`/`model()` basados en signals; `linkedSignal` para estado derivado editable | sustituye la mayoría de `@Input()/@Output()` y BehaviorSubject de UI |
| Datos del servidor (lectura) | **`httpResource()`** / **`resource()`** (estables en Angular 22) para GET con estados `value`/`error`/`isLoading` integrados; `rxResource` cuando la fuente sea un stream | patrón nuevo; reemplaza el `subscribe` manual + flags de loading |
| Control flow | **`@if` / `@for` (con `track` obligatorio) / `@switch`**; **`@defer`** para secciones pesadas (modal ICD, wizard de Crear) | reemplaza `*ngIf`/`*ngFor`; `@defer` no existía |
| Routing | **rutas standalone con `loadComponent` / `loadChildren`** (lazy por feature), `provid/RouterFeatures` (`withComponentInputBinding`, `withViewTransitions`) | `withComponentInputBinding` permite `@Input()` desde params de ruta |
| Guards / Resolvers | **funcionales** (`CanActivateFn`, `ResolveFn`) | reemplazan las clases `CanActivate` |
| Interceptores HTTP | **funcionales** (`HttpInterceptorFn`) vía `withInterceptors([...])` | reemplazan `HTTP_INTERCEPTORS` multi-provider |
| Formularios | **Reactive Forms tipados** (`FormGroup<{...}>`, `NonNullableFormBuilder`), `[disabled]` derivado del estado del form (no del template) | typed forms estables desde v14; se prohíben Template-Driven Forms |
| Change detection | **`provideZonelessChangeDetection()`** (estable en Angular 20+) si el equipo lo valida; si no, **`ChangeDetectionStrategy.OnPush` en todos los componentes** | zoneless es nuevo; OnPush es el mínimo |
| SSR | **No.** SPA pura (CSR). El host .NET sirve el `index.html` | — |
| i18n | Español único; **sin `@angular/localize`** por ahora (FUTURO si aparece 2º idioma) | — |
| Estilos | CSS (no SCSS obligatorio); tokens globales + estilos de componente `:host` | — |

## 8.2 Equivalencia conceptual de patrones actuales

| Current | Angular 22 | Acción |
|---|---|---|
| `_Layout.cshtml` + `LayoutActionFilter` + `LayoutViewModelFactory` | `AppComponent` + `layout/shell` + `LayoutStore` (signals) | Migrar |
| `_Sidebar` + `StaticNavigationProvider` + `NavigationService` | `SidebarComponent` + `NAV_CONFIG` (const tipada) + `RouterLinkActive` | Migrar |
| `_Header` (dropdown, densidad) | `HeaderComponent` + `UserMenuComponent` + `ThemeDensityService` | Migrar |
| Botón flotante "¿Necesitas ayuda?" + `#modalDocumentosAyuda` | `HelpButtonComponent` en el shell + `HelpDialogComponent` (CDK Dialog); contenido en `help-content.ts` o (FUTURO) desde API | Rediseñar (contenido único, dos disparadores) |
| Vista Razor (página) | **Page component** enrutado (`features/x/pages/...`) | Migrar |
| Partial `_ResultadosYPaginacion*` (respuesta AJAX = HTML) | **JSON** `{ items, page, pageSize, total, totalPages }` + `DataTableComponent` genérico | **Rediseñar contrato** (DEC-A1) |
| `_ClienteForm` / `_CuentaBancariaForm` (partial compartido Crear+Detalle) | `XxxFormComponent` reutilizado por `CrearPage` y `EditarPage` | Migrar |
| ViewModel de captura (`SolicitudReembolsoRegistroViewModel`) | `interface` + tipo del `FormGroup` | Adaptar |
| `core/http.js` | `HttpClient` + interceptores + `ApiService` base | Rediseñar |
| Controller MVC (orquestación + antiforgery + `[Authorize]`) | **se mantiene** como BFF: mismos endpoints, salida JSON (DEC-A1) | Replantear salida |
| `tokens.css` + `components/*.css` | `src/styles/tokens.css` (verbatim) + estilos de componente | Adaptar (portar) |
| `window.alert` para errores | `ToastService` + `<app-toast-host>` (CDK Overlay + LiveAnnouncer) | Rediseñar |
| Bootstrap Modal/Collapse/Dropdown/Tooltip | Angular **CDK** Dialog / Overlay / `@angular/cdk/a11y` + componentes propios | Rediseñar |
| Flatpickr | `DatePickerComponent` (envuelve Flatpickr **o** `<input type="date">` — decisión §10/DEC-A5) | Adaptar |
| Lucide classic + `refreshIcons()` | `lucide-angular` | Rediseñar |

## 8.3 Diagrama de despliegue objetivo (REQUERIDO)

```
┌─────────────── mismo origen (https://<host>) ───────────────┐
│  Navegador                                                  │
│    └─ Angular SPA (index.html + assets fingerprinted)       │
│         │  fetch (withCredentials, XSRF)                    │
│         ▼                                                   │
│  ASP.NET Core host (Vitamedica.Multiportal.UI evolucionado) │
│    ├─ StaticFiles → sirve /  y  fallback SPA → index.html   │
│    ├─ 6 Controllers = BFF  (JSON + ProblemDetails)          │
│    │     [Authorize] · antiforgery · cookie de sesión       │
│    └─ Typed HttpClients ──▶ Vitamedica.Multiportal.API      │
│                                   └─▶ SQL / WCF AD          │
└────────────────────────────────────────────────────────────┘
```

**Por qué mismo origen:** preserva la cookie de sesión `HttpOnly`, evita CORS, mantiene el antiforgery de .NET, y es la extensión natural de DEC-001 (el navegador nunca habla directo con la API). **[Inferencia]** basada en DEC-001 + `UI-Master-Implementation-Plan.md §4.

---

# 9. Estructura de carpetas

**[Propuesto]** — estructura feature-based, calibrada al tamaño real (5 features, ~14 pantallas). **Angular CLI simple, sin Nx** (RECOMENDADO; Nx es FUTURO sólo si se agrega una 2ª app o librerías publicables).

```
src/
├── main.ts
├── index.html
├── styles/
│   ├── tokens.css                 # PORTADO VERBATIM de wwwroot/css/tokens.css (nombres --vm-* intactos)
│   ├── reset.css                  # box-sizing, base body, skip-link, prefers-reduced-motion
│   ├── density.css                # body.density-compact (portado de site-custom.css)
│   └── utilities.css              # sólo lo de Bootstrap que se use de verdad (grid mínimo, .ta-right…)
├── app/
│   ├── app.component.ts           # <app-shell><router-outlet/></app-shell> + <app-toast-host/>
│   ├── app.config.ts              # providers: router, http (fetch+interceptors+xsrf), zoneless?, error handler
│   ├── app.routes.ts              # rutas raíz + lazy por feature + guard de auth
│   │
│   ├── core/                      # singletons transversales · SIN estado de UI · SIN componentes visuales de negocio
│   │   ├── auth/                  # authGuard (CanActivateFn), AuthService (signal currentUser), authInterceptor
│   │   ├── http/                  # ApiService base, httpErrorInterceptor, correlationIdInterceptor, loadingInterceptor
│   │   ├── errors/                # GlobalErrorHandler, ProblemDetails model, error → mensaje de usuario
│   │   ├── config/                # AppConfig (runtime, ver §25), APP_CONFIG token
│   │   ├── preferences/           # PreferencesService (localStorage seguro + signals) ← core/storage.js
│   │   └── layout/               # LayoutStore (branding, user, sidebar collapsed) ← LayoutViewModelFactory
│   │
│   ├── layout/                    # el "chrome" — SÓLO estructura de página, sin lógica de negocio
│   │   ├── shell/                 # ShellComponent (header + sidebar + main + footer + backdrop + help button)
│   │   ├── header/                # HeaderComponent, UserMenuComponent, DensityToggleComponent
│   │   ├── sidebar/               # SidebarComponent, NavItemComponent, NAV_CONFIG
│   │   ├── footer/                # FooterComponent
│   │   └── help/                  # HelpButtonComponent, HelpDialogComponent, help-content.ts
│   │
│   ├── shared/                    # reutilizable, presentacional, SIN dependencia de features · SIN llamadas HTTP
│   │   ├── ui/
│   │   │   ├── page-header/       # <app-page-header>
│   │   │   ├── data-table/        # <app-data-table> genérico (columnas, sort visual, estados, selección)
│   │   │   ├── paginator/         # <app-paginator> (data-pagina → output pageChange)
│   │   │   ├── page-size-select/  # "Mostrar 10/25/50/100" (arriba a la derecha)
│   │   │   ├── filters-panel/     # <app-filters-panel> (fila rápida + fila avanzada colapsable) + proyección
│   │   │   ├── table-state/       # loading / empty / error (search-x, loader, alert-triangle)
│   │   │   ├── badge/             # <app-badge status="success|warning|error|neutral">
│   │   │   ├── stat-card/         # cards de acceso rápido / acción de archivo
│   │   │   ├── stage-timeline/    # <app-stage-timeline>
│   │   │   ├── doc-block/         # <app-doc-block> (header colapsable + proyección de contenido) ← DEC-002
│   │   │   ├── file-upload-row/   # <app-file-upload-row> (input file oculto + validación tamaño/ext)
│   │   │   ├── confirm-dialog/    # ConfirmDialogService (CDK Dialog)
│   │   │   ├── toast/             # ToastService + ToastHostComponent
│   │   │   ├── date-picker/       # <app-date-picker> (§10)
│   │   │   ├── modal/             # DialogService wrapper sobre @angular/cdk/dialog + estilos header azul
│   │   │   └── form-field/        # <app-form-field> (label + control proyectado + error + aria-describedby)
│   │   ├── directives/            # autofocus, click-outside (si CDK no basta), trap-focus (CDK ya lo da)
│   │   ├── pipes/                 # currencyMxn, fechaCorta, clabeMask, iniciales
│   │   └── validators/            # clabe18, cpMx, rfc, notFutureDate, crossField helpers
│   │
│   └── features/
│       ├── auth/                  # LoginPage, (FUTURO: RecuperarPassword, CambiarPassword — FL-15/16)
│       ├── reembolsos/
│       │   ├── reembolsos.routes.ts
│       │   ├── data/              # SolicitudesService (HTTP), modelos, mappers DTO→VM
│       │   ├── pages/             # ListPage, CrearPage, DetallePage
│       │   ├── components/        # solicitudes-table, solicitud-filtros, categoria-tabs,
│       │   │                      # categoria-panel, factura-generator, factura-lineas,
│       │   │                      # derechohabiente-dialog, dictamen-tabla, nota-panel,
│       │   │                      # icd-cpt-dialog, retroceder-tramite-dialog
│       │   └── state/             # ReembolsoCrearStore (signals: gate, secciones reveladas, categorías)
│       ├── clientes/              # ListPage, CrearPage/EditarPage, ClienteFormComponent, filiales-editor
│       ├── cuentas-bancarias/     # ListPage, CrearPage/EditarPage, CuentaBancariaFormComponent
│       ├── pagos/                 # ListPage, layout-download, retro-upload-dialog
│       └── asegurado/             # AseguradoPage (FL-23 — sólo si se decide conservar)
│
├── assets/                        # logo (movido de la URL externa), iconos estáticos
├── environments/                  # environment.ts / .prod.ts (SÓLO flags de build; URLs → runtime §25)
└── test-setup.ts
```

**Reglas de ubicación:**

- **`core/`** = un único singleton por responsabilidad, cargado una vez, sin UI de negocio. Nunca importa de `features/`. Aquí viven: auth, http/interceptores, config, error handler, preferencias, layout store.
- **`shared/`** = presentacional y genérico, **sin HTTP, sin estado de negocio**, sin importar de `features/`. Un componente entra a `shared/` sólo cuando **se usa en 2+ features con la misma estructura** (criterio DEC-002).
- **`layout/`** = el chrome. Estructura de página, no negocio. Puede leer `LayoutStore`/`AuthService` de `core`.
- **`features/`** = todo lo de un dominio. **Una feature nunca importa de otra feature.** Si dos features necesitan lo mismo → sube a `shared/` (si es presentacional) o a `core/` (si es servicio transversal).
- **Evitar "God Services":** un servicio de `data/` por feature, orientado a los endpoints de esa feature (`SolicitudesService`, no `ReembolsosService` que hace todo). Estado de UI compleja → `*Store` con signals, separado del servicio HTTP.
- **Evitar mega-componentes:** `CrearPage` orquesta; cada sección (categoría, factura, derechohabiente) es su propio componente con su propio form control. Límite blando: si un componente pasa de ~250 líneas de TS o ~150 de template, se descompone.
- **Evitar acoplamiento entre features:** comunicación vía rutas (`/reembolsos/:id`) o vía servicios de `core`, nunca importando componentes/servicios de otra feature.

---

# 10. Estrategia de componentes

**Criterio (portado de `UI_Component_Guide.md §1):** se crea componente compartido sólo si (a) aparece en 2+ features, (b) el patrón es estable, (c) hay duplicación real (no "se parece"). Si no cumple los 3 → queda local a la feature.

| Candidato | Veredicto | Ubicación | Justificación |
|---|---|---|---|
| Shell / Header / Sidebar / Footer | Componente | `layout/` | 1 sola instancia, transversal |
| Botón "¿Necesitas ayuda?" + diálogo de documentos | Componente | `layout/help/` | global, dos disparadores, contenido único |
| Page header (`.page-head`) | Componente | `shared/ui/page-header` | en todas las páginas (resuelve UI-013) |
| Data table (columnas, estados, sort visual, selección) | Componente genérico | `shared/ui/data-table` | 4 listados idénticos en estructura |
| Paginator + Page-size select | 2 componentes | `shared/ui` | mismo patrón en Reembolsos/Cuentas/Pagos |
| Filters panel (rápido + avanzado colapsable) | Componente + content projection | `shared/ui/filters-panel` | 4 listados; los campos concretos se proyectan |
| Table state (loading/empty/error) | Componente | `shared/ui/table-state` | contrato `data-estado` de todos los listados |
| Badge de estado | Componente | `shared/ui/badge` | listados + detalle |
| Stage timeline | Componente | `shared/ui/stage-timeline` | Reembolsos/Detalle + Asegurado |
| Doc-block (header colapsable + proyección) | Componente | `shared/ui/doc-block` | **DEC-002 se resuelve aquí**: Angular sí tiene slots nativos (`ng-content`), el bloqueo de Razor desaparece |
| File upload row (validación tamaño/ext) | Componente | `shared/ui/file-upload-row` | Crear (múltiple) + Clientes + Pagos Retro |
| Confirm dialog | Servicio | `shared/ui/confirm-dialog` | patrón "confirmar + acción" en 4+ sitios |
| Toast / notification | Servicio + host | `shared/ui/toast` | **reemplaza `window.alert`** en todo el proyecto |
| Modal base (header azul, scrollable) | Servicio wrapper sobre CDK Dialog | `shared/ui/modal` | todos los modales |
| Date picker | Componente | `shared/ui/date-picker` | Crear (líneas de factura), Clientes, filtros |
| Form field (label + error + aria) | Componente | `shared/ui/form-field` | todos los formularios; centraliza a11y de validación |
| Empty/estado de "sin datos" fuera de tabla | Componente | `shared/ui/empty-state` | Asegurado, Detalle |
| Botones institucionales | **Directiva** `appBtn` + clases o componente `<app-button variant>` | `shared/ui` | `.btn-primary-vm` etc.; directiva evita wrapper innecesario. **RECOMENDADO: directiva** |
| Icono | usar `lucide-angular` directamente | — | no envolver |
| Selector de categorías (roving tabindex) | Componente | `features/reembolsos/components/categoria-tabs` | específico de Crear/Detalle, **no** subir a shared |
| Generador de factura, líneas multi-moneda | Componentes | `features/reembolsos/components` | específicos de Reembolsos |
| Filiales editor | Componente | `features/clientes/components` | específico de Clientes |

**¿Componente, directiva o servicio?**

- **Componente** cuando hay plantilla + estado visual propio (tabla, modal, timeline).
- **Directiva** cuando sólo se decora un elemento existente sin plantilla (botón institucional, autofocus, click-outside).
- **Servicio** cuando es orquestación/estado sin DOM propio (`ToastService`, `ConfirmDialogService`, `DialogService`, `SolicitudesService`).

---

# 11. Estrategia de servicios

**Capas y responsabilidades (REQUERIDO):**

| Capa | Qué hace | Qué NO hace | Ejemplo |
|---|---|---|---|
| **Page component** | orquesta la pantalla: lee params de ruta, compone subcomponentes, conecta señales a servicios | lógica de negocio compleja, llamadas HTTP directas con `fetch` | `ReembolsosListPage` |
| **Feature data service** (`data/`) | 1 por feature; métodos = endpoints del BFF de esa feature; mapea DTO→modelo de vista; devuelve `Observable`/`resource` | guardar estado de UI, conocer otras features | `SolicitudesService.buscar(filtro): Observable<Pagina<SolicitudResumen>>` |
| **Feature store** (`state/`, sólo si la UI lo requiere) | estado de UI complejo con signals (`ReembolsoCrearStore`: gate, secciones reveladas, categorías seleccionadas) | HTTP directo (delega en el data service) | `ReembolsoCrearStore` |
| **Core service** | transversal, singleton (`AuthService`, `PreferencesService`, `ConfigService`, `LayoutStore`, `ToastService`) | lógica de una feature concreta | `AuthService.currentUser: Signal<User\|null>` |
| **`ApiService` base** (`core/http`) | helpers sobre `HttpClient` (base URL relativa, tipado, unwrap de ProblemDetails) | conocer endpoints concretos | `api.get<T>(path, params)` |
| **Utility / pure functions** (`shared/`) | pipes, validators, mappers puros, formateo | efectos, estado | `clabeMask`, `sumaRemanente()` |

**Anti-patrones a evitar explícitamente:**

- ❌ Componente que hace `HttpClient` + validación + formateo + navegación (el `reembolso-solicitud.js` actual de 51 KB es el ejemplo a NO replicar).
- ❌ `MultiportalService` único que sirve a todas las features.
- ❌ "Repository" en frontend sin justificación (el data service ya es esa abstracción).
- ❌ Facade sobre facade. Un nivel de servicio por feature es suficiente; un `*Store` sólo si hay estado de UI que no cabe en el componente.

**Regla de decisión "¿store o no?":** si el estado sólo lo usa un componente y su árbol → signals en el componente. Si lo comparten componentes hermanos o sobrevive a la navegación dentro de la feature → `*Store` provisto a nivel de ruta de feature. Si es global (usuario, preferencias) → core service.

---

# 12. HTTP / API layer

## 12.1 Configuración base (REQUERIDO)

```
provideHttpClient(
  withFetch(),                        // Fetch API (mejor cancelación, streaming)
  withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),  // ver DEC-A2
  withInterceptors([
    correlationIdInterceptor,   // X-Correlation-Id: <uuid v4> por request
    authRedirectInterceptor,    // 401 → limpia sesión + redirect a /login?returnUrl=
    httpErrorInterceptor,       // normaliza ProblemDetails → AppError; loguea seguro
    loadingInterceptor,         // cuenta requests activas → LoadingService (signal)
  ])
)
```

- **`withCredentials: true`** por defecto (cookie de sesión). Como Angular y el BFF comparten origen, basta configurarlo en el `ApiService` base o un interceptor.
- **Base URL relativa** (`/api/...` o las rutas MVC actuales `/reembolsos/buscar`). Sin `BaseAddress` absoluta → sin CORS. La URL de la API real vive sólo del lado del BFF .NET.
- **Sin retry automático global.** Retry puntual sólo en GET idempotentes concretos vía `retry({ count: 2, delay: backoff })` cuando un caso lo justifique (FUTURO).
- **Timeout:** operador `timeout(30_000)` en el `ApiService` base (equivale al `TimeoutSeconds` que hoy .NET no aplica). Configurable por request.
- **Cancelación:** `resource()` / `httpResource()` cancelan solos al cambiar el input; para búsquedas con `switchMap` la request previa se aborta (Fetch API).

## 12.2 DEC-A1 — Contrato del BFF (REQUERIDO)

```
DEC-A1

Decisión:
Los 6 controllers MVC de Vitamedica.Multiportal.UI se conservan y se convierten en el
BFF de Angular. Sus acciones GET de listado (hoy `*Buscar` que devuelven PartialView HTML)
pasan a devolver JSON. Las mutaciones normalizan sus errores a ProblemDetails (RFC 7807)
en vez de `BadRequest("string plano")`. Los endpoints, verbos, [Authorize] y antiforgery
se mantienen.

Contexto:
- DEC-001 (Browser → Controller MVC → ApiClient → API) es el patrón vigente y recomendado.
- Angular no puede consumir PartialView HTML; necesita JSON.
- La API real (Vitamedica.Multiportal.API) no expone hoy los endpoints de negocio que la UI
  necesita (listado de solicitudes, persistencia de Cliente/Cuenta, etc.) y varios catálogos
  lanzan NotImplementedException.
- Los datos hoy son simulados en los controllers.

Alternativas:
A) Angular consume directamente Vitamedica.Multiportal.API → descartada: introduce CORS,
   segundo mecanismo de auth para el navegador, y esos endpoints no existen aún.
B) Nuevo proyecto BFF/Gateway → descartada por ahora: sobreingeniería; los controllers MVC
   ya SON un BFF implícito (UI-Master-Implementation-Plan §4).
C) Mantener PartialView + parsear HTML en Angular → descartada: frágil, anti-idiomático, pierde tipado.

Decisión recomendada:
Transformar la CAPA DE SALIDA de los 6 controllers a JSON + ProblemDetails, sin tocar
dominio ni API. Mientras los datos sigan simulados, el BFF devuelve los mismos objetos
simulados serializados a JSON. Cuando el backend exponga endpoints reales, el controller
cambia su fuente (de `Obtener*Simulados()` a `_apiClient....`) sin que Angular lo note.

Justificación:
Es el cambio mínimo que habilita Angular preservando cookie auth + antiforgery + mismo origen.
Es exactamente el rol que DEC-001 le asigna al controller. No es "reescribir el backend":
es cambiar `return PartialView(...)` por `return Ok(dto)` y `BadRequest(str)` por
`Problem(...)`/`ValidationProblem(...)`.

Impacto:
- Requiere trabajo en el proyecto .NET UI (no en Domain/API). Alcance: ~15 acciones GET de
  listado/detalle + normalización de errores en ~12 acciones POST.
- Los partials `_ResultadosYPaginacion*` dejan de usarse (se eliminan al migrar cada feature).
- Contrato JSON de listado estandarizado: { items: T[], page, pageSize, total, totalPages }.

Riesgo:
Bajo. Mecánico y por feature. Riesgo real: coordinar con quien mantenga el proyecto .NET UI.
Mientras una feature no esté migrada a Angular, su controller sigue devolviendo PartialView
(ambos modos coexisten por acción distinta o por content negotiation).
```

## 12.3 DEC-A2 — Antiforgery / XSRF entre Angular y .NET (REQUERIDO)

```
DEC-A2

Decisión:
El host .NET emite, además de la cookie antiforgery HttpOnly interna, una cookie legible
por JS `XSRF-TOKEN` con el request token; Angular la lee automáticamente (withXsrfConfiguration)
y la reenvía en `X-XSRF-TOKEN`. El middleware antiforgery de .NET se configura para aceptar
ese header.

Contexto:
- Hoy `Program.cs` fija `options.HeaderName = "RequestVerificationToken"` y el JS lee el token
  de un hidden `@Html.AntiForgeryToken()`. En Angular no hay Razor que renderice ese hidden.
- La cookie antiforgery de .NET por defecto es HttpOnly → Angular no puede leerla.

Alternativas:
A) Endpoint `GET /antiforgery/token` que devuelve el token; Angular lo pide al arrancar y lo
   cachea → funciona pero añade un round-trip y manejo manual.
B) Cookie `XSRF-TOKEN` no-HttpOnly + header `X-XSRF-TOKEN` (convención que Angular ya soporta
   nativamente) + `IAntiforgery` escribiendo esa cookie en un middleware/filtro.

Decisión recomendada:
Opción B. Alinear el nombre de header/cookie de .NET con la convención de Angular.

Justificación:
Cero código de token en Angular (lo hace el HttpClient). Patrón estándar y documentado.

Impacto:
Cambio pequeño en el host .NET (config de Antiforgery + un middleware que emite la cookie
tras autenticar). El JS actual que lee el hidden desaparece con cada feature migrada.

Riesgo:
Bajo. La cookie XSRF-TOKEN NO es sensible (es un request token ligado a la sesión).
```

## 12.4 Qué es global vs feature-specific

| Global (core/http) | Feature-specific |
|---|---|
| withCredentials, base URL relativa, timeout por defecto | endpoints concretos y sus DTOs |
| correlation id, XSRF, 401→login, normalización de error, loading counter | mapeo DTO→modelo de vista |
| tipos `ProblemDetails`, `AppError`, `Pagina<T>` | validaciones de negocio, retry puntual |
| `GlobalErrorHandler` | manejo de 409/422 específico de un formulario |

---

# 13. Manejo de errores

## 13.1 Estrategia por código HTTP (REQUERIDO)

| Código | Quién maneja | Qué ve el usuario | Se registra | Redirige / reintenta |
|---|---|---|---|---|
| **400** (validación general) | `httpErrorInterceptor` → feature | toast "Revisa los datos enviados" + detalle de `ProblemDetails.detail` si es seguro | sí (warn, sin body sensible) | no |
| **401** | `authRedirectInterceptor` | pantalla de login (mensaje "Tu sesión expiró") | sí (info) | → `/login?returnUrl=`; **no** reintenta |
| **403** | interceptor → toast | "No tienes permiso para esta acción" | sí (warn) | permanece en la página; oculta/deshabilita el control que falló |
| **404** (recurso) | feature | vista/inline "No encontramos el registro" | sí (info) | opción "volver al listado" |
| **409** (conflicto) | feature (formulario) | "El registro cambió mientras editabas. Recarga." | sí (warn) | ofrece recargar; no auto-reintenta |
| **422** (validación de campos) | feature (formulario) | errores **por campo** mapeados desde `ProblemDetails.errors` | sí (info) | no; permite corregir |
| **429** | interceptor | "Demasiadas solicitudes, espera un momento" | sí (warn) | reintento con backoff **sólo** si el caso lo define (FUTURO); por defecto no |
| **500 / 502 / 503** | `GlobalErrorHandler` + interceptor | página/toast de error genérico con `correlationId` visible ("Reporta este código: …") | sí (error, con correlationId) | botón "Reintentar" en GET; en POST no auto-reintenta |
| **timeout / network** | interceptor | "Problema de conexión. Verifica tu red." | sí (error) | botón "Reintentar" |
| **error inesperado JS** | `GlobalErrorHandler` | toast genérico + correlationId | sí (error) | no |

## 13.2 Qué NUNCA se muestra ni se loguea al cliente

Stack traces, SQL, nombres de servidores/hosts internos, connection strings, tokens, cookies, claves, payloads de SSO, rutas de archivos del servidor. El BFF ya debe devolver `ProblemDetails` saneado (la API tiene `AddProblemDetails` + `GlobalExceptionHandler`; el BFF debe hacer lo mismo y **no** propagar el `detail` de excepciones internas).

## 13.3 Componentes

- `GlobalErrorHandler implements ErrorHandler` (provisto en `app.config.ts`): captura lo no manejado, muestra toast, loguea.
- `httpErrorInterceptor`: convierte `HttpErrorResponse` → `AppError { kind, status, userMessage, correlationId, fieldErrors? }`.
- `ToastService`: cola de notificaciones, auto-dismiss, `aria-live` (LiveAnnouncer).
- Contrato de estados en cada pantalla con datos: `loading | empty | error | content` (portado del contrato `data-estado` actual → `@if`/`@switch` sobre el estado del `resource()`).

---

# 14. Seguridad

## 14.1 XSS (REQUERIDO)

- **Interpolación `{{ }}` y property binding**: escapado automático de Angular. Es el modo por defecto para **todo** contenido dinámico.
- **Prohibido `[innerHTML]` con datos** (traslada DEC-005 / UI-016). Si un caso real exige HTML (hoy no hay ninguno), pasa por `DomSanitizer.sanitize(SecurityContext.HTML, …)` con revisión explícita y comentario justificando.
- **`bypassSecurityTrust*`**: prohibido salvo decisión registrada (`DEC-0XX`) con el origen del HTML documentado.
- **URLs dinámicas** (`[href]`, `[src]`): Angular ya bloquea `javascript:`; validar dominio si la URL viene de datos.
- El logo del header pasa a `assets/` o a config (no URL externa arbitraria) — resuelve UI-015.
- **CSP** (RECOMENDADO): el host .NET envía `Content-Security-Policy` estricta — `default-src 'self'`; `img-src 'self' data: <blob-storage-si-aplica>`; `style-src 'self'` (Angular inyecta estilos de componente vía `<style>` con nonce/hash → usar `ngCspNonce`); `script-src 'self'`; `connect-src 'self'`; `frame-ancestors 'none'`. Sin `unsafe-inline`/`unsafe-eval` (Angular AOT no los necesita). Fuente Inter: servir local (`assets/fonts/`) en vez de `fonts.gstatic.com` para no abrir `font-src` externo.

## 14.2 Autenticación (REQUERIDO — no inventar mecanismo nuevo)

- **Se mantiene la cookie de sesión emitida por el host .NET.** Angular **no** gestiona login contra la API; hace `POST /sesion/login` (BFF) igual que hoy, recibe la cookie `HttpOnly` `Secure` `SameSite=Lax`.
- `AuthService` mantiene `currentUser: Signal<User | null>` poblado desde `GET /sesion/me` (nuevo endpoint del BFF que devuelve el usuario del `HttpContext.User` — reemplaza el `LayoutViewModel.CurrentUser`).
- **No hay tokens en el navegador.** Nada de `localStorage`/`sessionStorage` para credenciales o tokens. `localStorage` sólo para preferencias no sensibles (densidad, sidebar colapsado, filtros recordados) — ver §16.
- SSO (`IniciarSesion?t0=`): sigue siendo un endpoint del host .NET; Angular sólo maneja el redirect final. `CryptoBBVA` **no toca a Angular** (hallazgo transversal, §32).
- Logout: `POST /sesion/logout` (BFF), luego Angular navega a la URL de logout del portal (que debe venir de **config**, no hardcodeada — UI-011).

## 14.3 Autorización (REQUERIDO)

> **La autorización real vive en el backend.** La UI sólo oculta/deshabilita por UX.

- **`authGuard` (CanActivateFn)**: bloquea rutas si `currentUser()` es null → redirect a login. Es el equivalente de `[Authorize]` a nivel de navegación, **no** sustituye la validación del BFF.
- **Permisos por acción** (`Permission` de `MenuItemViewModel`): hoy **no hay fuente real de roles** (§20). Recomendación: **no cablear `Permission` a nada provisional** (traslada la regla del `UI-Master-Implementation-Plan §9`). Cuando exista, se añade:
  - `PermissionsService` con `has(permission): Signal<boolean>` poblado desde `/sesion/me`.
  - Directiva estructural `*appHasPermission="'reembolsos.aprobar'"` para ocultar controles.
  - `permissionGuard(perm)` funcional para rutas.
  - **Siempre** además: el BFF revalida. La UI ocultando un botón nunca es la barrera de seguridad.
- Sidebar y chrome sólo se renderizan dentro del shell autenticado (resuelve UI-003).

## 14.4 Cookies

- Sesión: `HttpOnly` + `Secure` + `SameSite=Lax` (config del host .NET; hoy no está configurado explícitamente — recomendación de coordinación, §32).
- `XSRF-TOKEN`: legible por JS (necesario), `Secure`, `SameSite=Lax`, **no** `HttpOnly`. No es sensible.

## 14.5 Secretos y source maps

- **Ningún secreto en Angular.** Todo lo que llega al bundle es público. API keys, connection strings, claves de cifrado → sólo del lado del host/API.
- **Source maps en producción:** generarlos pero **no** desplegarlos públicamente (subirlos sólo al servicio de error-tracking si se adopta uno). `sourceMap: { scripts: true, hidden: true }` en la config de build de producción (RECOMENDADO).
- **Config runtime** (§25): `assets/config.json` sólo con valores públicos (URL de logout del portal, feature flags, versión). Nunca secretos.

## 14.6 Dependencias / supply chain (REQUERIDO)

- `package-lock.json` commiteado; `npm ci` en CI.
- `npm audit` en el pipeline; política: sin vulnerabilidades `high`/`critical` en producción.
- Minimizar dependencias (§41). Cada dependencia nueva pasa por la plantilla de justificación.
- Renovate/Dependabot (RECOMENDADO) para Angular y CDK juntos (deben ir a la par).

---

# 15. Formularios

**REQUERIDO: Reactive Forms tipados. Template-Driven prohibido.**

| Aspecto | Enfoque Angular 22 |
|---|---|
| Definición | `FormGroup<{ ... }>` con `NonNullableFormBuilder`; interfaz del modelo separada |
| Tipado | tipos explícitos por control; `form.getRawValue()` tipado para el submit |
| `disabled` de botón submit | derivado: `submitDisabled = computed(() => form.invalid || form.pending || saving())` — **nunca** `[disabled]` cableado a mano en el template a partir de banderas sueltas |
| Validadores síncronos | `shared/validators/` — `clabe18`, `cpMx`, `rfc`, `notFutureDate`, `required` compuestos |
| Validadores async | `AsyncValidatorFn` con `debounceTime` + `switchMap` (p. ej. verificar folio/póliza contra el BFF) — con estado `pending` visible |
| Cross-field | validador a nivel de `FormGroup` (p. ej. `fechaFin >= fechaInicio`) |
| Estados | `dirty`/`pristine`/`touched`/`untouched`/`pending`/`invalid` → dirigen cuándo se muestran errores (`touched && invalid`) |
| Mensajes de error | `<app-form-field>` centraliza: `aria-describedby`, `aria-invalid`, lista de errores; mapa `errorKey → mensaje` por control |
| Doble submit | `saving` signal + `form.disable()` durante el request + botón con spinner; el BFF además es idempotente donde puede |
| Errores del backend (422) | `httpError.fieldErrors` → `form.get(campo)?.setErrors({ server: mensaje })`; se limpian al editar |
| Campos dinámicos | `FormArray` tipado (filiales, líneas de factura, filas de documento); add/remove sin reindexar strings (Angular maneja el binding) |
| Autoguardado / borrador | `localStorage` del valor del form (no sensible) restaurado al volver — RECOMENDADO para `Crear` |
| Recuperación | al fallar el submit, el form conserva su valor y foco al primer campo con error (`scrollIntoView` + `focus`) |

**Migración de los formularios existentes:**

| Form actual | Componente Angular | Notas |
|---|---|---|
| `Sesion/Login` | `LoginPage` + `FormGroup<{user,password,rememberMe}>` | rehacer con tokens (UI-007); validación real Angular (no jquery-validation) |
| `_ClienteForm` (4 secciones progresivas + filiales + módulos/coberturas/documentos) | `ClienteFormComponent` con `FormGroup` anidado + `FormArray` filiales + `FormArray`/record de checkboxes; jerarquía cobertura→documento con `computed` | resuelve UI-005 (antiforgery/asp-for) y UI-012 (separar catálogos del form: los catálogos entran como `input()`, no como parte del form value) |
| `_CuentaBancariaForm` | `CuentaBancariaFormComponent` + validador `clabe18` (`/^[0-9]{18}$/`) | simple |
| `Reembolsos/Crear` | ver §23 | el más complejo |
| Filtros (todas las listas) | `FormGroup` de filtros → `valueChanges` con `debounceTime` → dispara `resource` | hoy los filtros no tienen `name`, se leen por id; en Angular son un form real |

---

# 16. Estado

**REQUERIDO: sin librería de state management. Signals + servicios + RxJS puntual.**

| Tipo de estado | Dónde vive | Mecanismo |
|---|---|---|
| **Local de UI** (acordeón abierto, tab activa, hover) | componente | `signal()` |
| **Derivado** | componente/store | `computed()` |
| **De feature** (gate de Crear, secciones reveladas, filtros aplicados) | `*Store` provisto a nivel de ruta de feature | clase `@Injectable` con signals privados + API pública readonly |
| **De servidor** (listados, detalle, catálogos) | `resource()` / `httpResource()` en el componente o el store | recarga declarativa por cambio de input; no se "guarda" manualmente |
| **Global de sesión** (usuario, permisos) | `core/auth/AuthService` | `signal<User\|null>`, poblado al arrancar |
| **Preferencias** (densidad, sidebar colapsado, page-size preferido, borradores) | `core/preferences/PreferencesService` | signals + `localStorage` con try/catch (portado de `core/storage.js`) |
| **Navegación / URL** (página actual, filtros compartibles) | la URL (query params) | `Router` + `withComponentInputBinding`; los filtros de lista se serializan a query params (RECOMENDADO) para que la vista sea compartible/recargable |

**Cuándo se justificaría un state management formal (hoy NO):** múltiples features escribiendo el mismo estado concurrentemente, necesidad de time-travel/undo global, sincronización optimista compleja entre pestañas. Nada de esto aplica al Multiportal. Si en el futuro aplicara, la primera opción sería **`@ngrx/signals` (SignalStore)** por continuidad con signals, no NgRx clásico — y con decisión registrada.

**Regla:** el estado de servidor **no se duplica** en signals propios. `resource()` es la fuente. Para mutaciones con update optimista (patrón actual "confirmar + actualizar DOM"): mutar → `resource.reload()` o actualizar el `value` del resource vía `update`, con rollback si el POST falla.

---

# 17. Tablas / paginación

**[Confirmado en código]** Patrón actual: `_ResultadosYPaginacion*` (HTML) + selector `#pageSize` (10/25/**25 default**/50/100, `margin-left:auto`) + pager `data-pagina` + 3 `<tbody>` (`cargando`/`error`/`contenido`) + empty state server-side.

**Componente `<app-data-table>` (shared, REQUERIDO):**

```
Inputs (signals):
  columns: ColumnDef<T>[]      // { key, header, align, sortable, cellTemplate? }
  rows: T[]
  state: 'loading'|'empty'|'error'|'content'
  trackBy: (row) => string|number
  sort: { key, dir } | null
  selectable?: 'none'|'single'|'multiple'
Outputs:
  sortChange, selectionChange, rowAction
Proyección:
  toolbar (izq: título/acciones · der: <app-page-size-select>)
  row actions (via cellTemplate)
```

- **Selector "Mostrar"**: componente `<app-page-size-select>` ubicado en la zona derecha de la toolbar (`.table-panel-head`, `margin-left:auto`) — **cumple el requerimiento funcional "arriba a la derecha"**.
- **Paginación**: `<app-paginator>` server-side; `output pageChange` → el page component actualiza el input del `resource`.
- **Sorting**: hoy es **sólo visual** (iconos sin handler). Recomendación: implementar sort server-side real en el BFF al migrar cada lista (RECOMENDADO), o mantener sólo-visual y marcarlo como FUTURO por lista. No inventar sort client-side sobre datos paginados.
- **Filtering**: `FormGroup` de filtros → query params → input del `resource` → GET al BFF. **Clientes** hoy filtra client-side sobre 3 registros; al integrar datos reales pasa a server-side como las demás (marcar como cambio de comportamiento intencional).
- **Estados**: `<app-table-state>` con los mismos iconos (`search-x`, `loader-circle` spin, `alert-triangle`).
- **Selección / acciones de fila**: `cellTemplate` para la columna "Acciones"; las acciones (Detalle, Notas, Rechazar, Regresar…) emiten `rowAction` que el page component enruta.
- **Responsive**: la tabla scrollea horizontalmente dentro de su contenedor (`overflow-x:auto`); en móvil, head/foot apilados (portar CSS actual).
- **Accesibilidad**: `<table>` semántica, `<th scope>`, `aria-sort` en columnas ordenables, `caption` visualmente oculto, foco manejado tras recarga.

---

# 18. Diseño / tokens

**REQUERIDO: preservar la identidad visual. No inventar design system nuevo.**

```
Current Design System (tokens.css + components/*.css)  →  Angular (portado)
```

| Activo actual | Destino | Acción |
|---|---|---|
| `wwwroot/css/tokens.css` | `src/styles/tokens.css` | **Copiar verbatim.** Nombres `--vm-*` intactos. Es la fuente única de verdad. |
| `site-custom.css` (modo densidad, normalización de `.form-control`) | `src/styles/density.css` + estilos base | Portar; la normalización de controles Bootstrap se vuelve estilos de los componentes de formulario propios |
| `components/_badge/_button/_table/_pagination/_filters-panel/_modals/_doc-block/_help-modal/date-picker.css` | estilos de los componentes `shared/ui/*` correspondientes (`:host`) | Portar 1:1, clase por clase |
| `form-sections.css` | `shared/ui/form-section` + `shared/ui/file-upload-row` | Portar |
| `layout.css` / `header.css` / `sidebar.css` / `footer.css` | estilos de `layout/*` | Portar |
| CSS de página (`index.css`, `detalle-solicitud.css`, …) | estilos de los page components de cada feature | Portar lo que siga aplicando; descartar lo que era workaround de Bootstrap |
| Breakpoints (767.98 / 1199.98 / 1600) | **tokenizar** como custom media o constantes TS compartidas (hoy están duplicados entre CSS y `sidebar.js`) | Mejora: fuente única |
| `--vm-success-700` / `--vm-error-700` faltantes (DEC-006) | agregarlos a `tokens.css` y migrar los `:hover` de `filter:brightness` a token | RECOMENDADO (cierra DEC-006 de paso) |
| Fuente Inter desde `fonts.gstatic.com` | `assets/fonts/` local + `@font-face` | RECOMENDADO (CSP, offline, rendimiento) |

- **Colores, tipografía, spacing, radios, sombras, densidad, botones, tablas, modales, sidebar, header, footer, estados, responsive**: todo sale de `tokens.css`. Ningún componente Angular define colores/tamaños a mano.
- **Modo densidad**: `ThemeDensityService` togglea `density-compact` en `<body>` (o en `:root`); el CSS de densidad sobrescribe los tokens tipográficos. Persistido en `PreferencesService`.
- **Tema oscuro**: no existe hoy; **FUTURO**. La estructura de tokens lo permitiría (redefinir `--vm-*` bajo `prefers-color-scheme`).

---

# 19. Routing / navegación

**[Propuesto]**

```
''                          → redirect to 'reembolsos'         (decidir: ¿o un dashboard real? — D-6)
'login'                     → LoginPage                         (sin shell; canActivate: guestGuard)
'' (shell layout)           → ShellComponent  [canActivateChild: authGuard]
  ├── 'reembolsos'
  │     ├── ''              → ReembolsosListPage
  │     ├── 'crear'         → ReembolsoCrearPage
  │     └── ':id'           → ReembolsoDetallePage        (withComponentInputBinding → @Input() id)
  ├── 'clientes'
  │     ├── ''              → ClientesListPage
  │     ├── 'crear'         → ClienteCrearPage
  │     └── ':id'          → ClienteEditarPage
  ├── 'cuentas-bancarias'   → (mismo patrón list/crear/:id)
  ├── 'pagos'               → PagosListPage
  ├── 'asegurado/:id'       → AseguradoPage               (sólo si se conserva FL-23)
  ├── 'legal/:doc'          → LegalPage                   (placeholder — resuelve UI-004/D-5)
  ├── 'cuenta/cambiar-contrasena' → (FUTURO FL-16)
  └── '**'                  → NotFoundPage
```

- **Lazy loading por feature**: `loadChildren: () => import('./features/reembolsos/reembolsos.routes')`.
- **Guards funcionales**: `authGuard` (sesión), `guestGuard` (redirige a `/reembolsos` si ya hay sesión), FUTURO `permissionGuard('...')`.
- **`withComponentInputBinding()`**: params de ruta e query params → `@Input()` del page component (los `int id` de `Detalle(id)`).
- **`withViewTransitions()`** (RECOMENDADO): transiciones suaves entre rutas, degradación elegante.
- **`returnUrl`**: `authGuard` guarda la URL destino; el login redirige de vuelta.
- **Navegación del sidebar**: `NAV_CONFIG` tipada (equivalente de `StaticNavigationProvider`); `routerLinkActive` para el estado activo (equivalente de `NavigationService`). Las 2 preguntas abiertas del `UI_Decision_Log.md` (logo externo, "Clientes → Grupo Modelo apunta a ReembolsoSolicitud" ¿demo o real?) **se arrastran** y deben resolverse antes de fijar `NAV_CONFIG` (§35).
- **Títulos de página**: `TitleStrategy` propia → `"<página> · <SystemName>"` (equivalente del `<title>` actual del `_Layout`).

---

# 20. Autenticación / autorización

Cubierto en §14.2–14.3. Resumen de estado y decisiones:

| Tema | Estado | Decisión |
|---|---|---|
| Mecanismo de auth | **[Confirmado en código]** cookie de sesión emitida por el host .NET; `AuthAgent.VerificaUsuario` es stub | **Se conserva.** Angular no cambia el mecanismo. Nuevo endpoint `GET /sesion/me`. |
| Roles / permisos | **[Confirmado en código]** no existen; único claim `ClaimTypes.Name`; `Permission` sin evaluar | **No cablear nada provisional.** Diseño listo (`PermissionsService`, `*appHasPermission`, `permissionGuard`) para cuando exista fuente real. |
| Autorización efectiva | **[Confirmado]** sólo `[Authorize]` desnudo en el BFF | La UI oculta por UX; **el BFF revalida siempre**. |
| Tokens en navegador | **[Confirmado]** no hay | **No introducir.** Sin `localStorage` para credenciales. |
| SSO / CryptoBBVA | **[Confirmado]** clave hardcodeada (CRÍTICO transversal) | **Fuera de alcance Angular.** El host maneja el SSO; Angular sólo el redirect final. Dependencia/riesgo §32. |
| Logout | **[Confirmado]** URL hardcodeada (UI-011) | La URL destino viene de config runtime (§25). |

```
DEC-A3

Decisión:
No se implementa control de permisos granular en la UI Angular en la migración. Se implementa
únicamente el guard de sesión (autenticado / no autenticado).

Contexto:
No existe hoy ninguna fuente de roles/permisos en Current (ni claims, ni policies, ni tabla).
`MenuItemViewModel.Permission` nunca se evalúa. El `UI-Master-Implementation-Plan §9` prohíbe
explícitamente cablear `Permission` a algo provisional.

Alternativas:
A) Inventar roles en la UI → descartada: falsa sensación de seguridad, y el backend no los valida.
B) Esperar a que el backend exponga permisos en `/sesion/me` → recomendada.

Decisión recomendada:
Guard de sesión ahora; estructura de permisos (servicio + directiva + guard) diseñada pero
inactiva hasta que `/sesion/me` devuelva permisos reales.

Justificación:
Migrar la UI no es el momento de diseñar el modelo de autorización del producto.

Impacto:
Todas las rutas de negocio quedan tras `authGuard`. Ningún control se oculta por permiso todavía
(igual que hoy).

Riesgo:
Ninguno nuevo. El estado de autorización no empeora respecto a Current.
```

---

# 21. Testing

**REQUERIDO (mínimo por feature migrada) / RECOMENDADO (cobertura amplia).**

| Nivel | Herramienta | Qué se prueba | Qué NO se prueba |
|---|---|---|---|
| **Unit** | Jasmine + Karma (default) **o** Vitest (RECOMENDADO — Angular 22 lo soporta; más rápido) | validators, pipes, mappers DTO→VM, lógica de `*Store` (gate de Crear, revelado de secciones), servicios con `HttpTestingController`, `computed` signals | detalles de implementación privados, CSS |
| **Component** | Angular Testing Library (RECOMENDADO) sobre TestBed | render + interacción de componentes `shared/ui` (data-table estados, paginator, form-field errores, doc-block), page components con servicios mockeados | integración real con backend |
| **Integration** | TestBed + `provideHttpClientTesting` | interceptores (XSRF, 401→redirect, error→AppError), guards, routing, flujo feature con HTTP mockeado | — |
| **E2E** | **Playwright** (RECOMENDADO sobre Cypress: multi-browser, más rápido, mejor trace) | flujos críticos: login → tablero; crear reembolso (gate → registrar → folio); dictamen (rechazar/regresar); descargar layout de pagos; CRUD cuenta bancaria | cada permutación de UI; navegadores legacy |

**Flujos E2E críticos (smoke + regresión):**
1. Login (stub) → `/reembolsos` con tabla poblada.
2. `Crear`: `#btnRegistrar` disabled → buscar derechohabiente → seleccionar beneficiario → activar categoría + subir doc requerido → botón se habilita → Registrar → modal de folio.
3. `Detalle`: Rechazar con motivo → estado actualizado.
4. Filtro + cambio de "Mostrar" + paginación en un listado.
5. `Pagos`: descargar layout CSV; subir Retro (validación de formato).

**Objetivo de cobertura (RECOMENDADO):** servicios y validators ≥ 80%; `*Store` de features 100% de las reglas de negocio (el gate de Crear es la más importante); componentes `shared/ui` ≥ 70%.

**Estado actual:** **[Confirmado en código]** no existe ningún proyecto de tests en Current. La migración es la oportunidad de establecer la base.

---

# 22. Accesibilidad

**REQUERIDO: WCAG 2.1 AA.** El proyecto actual ya tiene buenas bases (roles ARIA en tabs/nav, `aria-expanded`, iconos `aria-hidden`, skip-link definido aunque comentado).

| Área | Requisito | Cómo en Angular |
|---|---|---|
| Skip link | 2.4.1 | **activarlo** en el shell (`<a class="skip-link" href="#main">`) — resuelve UI-008 |
| Navegación por teclado | 2.1.1 | CDK `FocusKeyManager` para sidebar/tabs (roving tabindex ya existe en `reembolso-solicitud.js`), `cdkTrapFocus` en diálogos |
| Focus management | 2.4.3 | al abrir modal → foco al primer control (CDK Dialog lo hace); al cerrar → devolver foco al disparador; tras navegar → foco al `<h1>` / `main[tabindex="-1"]` |
| Modales | 4.1.2 | CDK Dialog: `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape, trap focus, restore focus |
| Labels | 3.3.2 | `<app-form-field>` fuerza `label[for]` ↔ `id`; nada de placeholder-como-label |
| Errores de validación | 3.3.1 / 3.3.3 | `aria-invalid`, `aria-describedby` al mensaje, `role="alert"` en el resumen de errores, foco al primer campo inválido |
| ARIA en tablas | 1.3.1 | `<th scope>`, `aria-sort`, `caption` |
| Estados de carga | 4.1.3 | `aria-busy` en la tabla; `LiveAnnouncer` para "cargando…", "12 resultados", "error" |
| Contraste | 1.4.3 | ya cubierto por tokens (`--vm-on-header` documentado 4.51:1); validar los tokens nuevos (`-700`) |
| Controles deshabilitados | 1.4.3 / 4.1.2 | `disabled` real + explicar por qué (`aria-describedby` "Completa la sección 1"); para el botón Registrar, considerar `aria-disabled` + mensaje en vez de `disabled` puro para que sea anunciable |
| HTML semántico | 1.3.1 | `<main>`, `<nav>`, `<header>`, `<footer>`, headings jerárquicos (hoy hay `<h2 style=...>` sueltos que se corrigen) |
| Reduced motion | 2.3.3 | `@media (prefers-reduced-motion)` (ya en tokens) + `withViewTransitions` degrada solo |
| Screen readers | — | prueba manual con NVDA/VoiceOver en los 5 flujos críticos |

**Herramientas:** `@angular-eslint` + `eslint-plugin-jsx-a11y`-equivalente para templates (`@angular-eslint/template/accessibility-*` reglas), axe-core en tests de componente y en Playwright (RECOMENDADO).

---

# 23. Reembolsos → Crear (análisis específico)

**[Confirmado en código]** (`Views/Reembolsos/Crear.cshtml` + `wwwroot/js/reembolso-solicitud.js`).

## 23.1 Comportamiento actual

- Form `#formSolicitudReembolso` con **3 secciones colapsables** (Asegurado titular / Paciente / Reclamación). Secciones 2 y 3 arrancan `hidden`.
- **Revelado progresivo** (`seccionNRevelada`, regla "una vez revelada nunca se oculta"):
  - Sección 2 se revela cuando `seccion1Completa()` = `aseguradoSeleccionado && SECCION1_CAMPOS_REQUERIDOS.every(campoTieneValor)`.
  - Sección 3 se revela al seleccionar un beneficiario.
- **Búsqueda de derechohabiente**: modal `#modalDerechohabiente` (`data-autoshow` al entrar) → `getJson('/Reembolsos/BuscarDerechohabiente?numeroEmpleado=')` → llena campos readonly del titular + habilita `<select>` de beneficiarios (construido con `createElement`/`textContent` — **patrón seguro, ya corregido**).
- **CP → Estado/Municipio**: lookup demo, inputs `disabled` autollenados.
- **Selector de categorías** (`data-category-nav`): un clic selecciona **y** agrega la categoría (un gesto). Flechas = sólo mover foco (roving tabindex, no agrega). Doble clic = desactivar.
- Por categoría: `<select>` de motivo (si `TieneMotivo`), bloque **Factura** (`estandar` = tabs PDF/XML/Generar; `multimoneda` = líneas repetibles con archivo + moneda + fecha), y **doc-blocks** por documento (requerido/opcional, filas add/remove).
- **Uploads reales**: `postForm('/Reembolsos/SubirArchivo')` (valida 5 MB + extensión por contexto; descarta el contenido; devuelve monto simulado).
- **Gate de "Registrar"** (`#btnRegistrar` arranca `disabled`):
  ```
  registroGateCompleto() =
       aseguradoSeleccionado
    && beneficiarioSeleccionado()            // select habilitado + value ≠ placeholder
    && seccion3Completa()                    // ≥1 categoría con Solicitado="true"
                                             //   Y todos sus documentos requeridos completos
  ```
  `evaluarBotonRegistrar()` es el **único choke point**; lo notifican: selección/limpieza de asegurado, selección de beneficiario, activación/desactivación de categoría.
- **Submit**: `postJson('/Reembolsos/Registrar', payloadManual)` → `Json({ folio })` o `BadRequest(mensaje)`. **El servidor revalida** (`SolicitudRegistroEsValida`: titular.numeroEmpleado, paciente.beneficiarioId, ≥1 categoría solicitada).
- **Éxito**: `#modalRegistroExitoso` (backdrop static) con el folio → al aceptar, redirect a `Home/Index`.
- **Cancelar**: `#modalConfirmarCancelar` → redirect a `/`.
- Catálogos vienen del server (`SolicitudReembolsoCatalogosViewModel`): 8 categorías con sus documentos, motivos, monedas.

## 23.2 Representación en Angular 22

| Pieza | Angular |
|---|---|
| Página | `ReembolsoCrearPage` (orquesta; ~120 líneas) |
| Estado | `ReembolsoCrearStore` (signals): `aseguradoSel`, `beneficiarioSel`, `seccion2Revelada`, `seccion3Revelada`, `categorias` (record), `saving` |
| Form | `FormGroup<SolicitudReembolsoForm>` tipado: `aseguradoTitular` (group), `paciente` (group), `reclamacion` (group con `categorias: FormArray` y `comentarios`) |
| Gate | `registrarDisabled = computed(() => form.invalid \|\| !gateNegocioOk() \|\| store.saving())` donde `gateNegocioOk()` es un `computed` que replica `registroGateCompleto()` leyendo el form value + store — **una sola fuente, declarativa, sin choke points manuales** |
| Secciones colapsables | `<app-form-section [number]="1" [revealed]="...">` con `@if (store.seccion2Revelada())` para montar la sección (o `@defer` para la 3ª que es pesada) |
| Modal derechohabiente | `DerechohabienteDialogComponent` (CDK Dialog) → `SolicitudesService.buscarDerechohabiente(numEmpleado)` → al cerrar devuelve el titular + lista de beneficiarios; el store los aplica |
| Selector de categorías | `CategoriaTabsComponent` (roving tabindex con CDK `FocusKeyManager`); `output` selección/desactivación → `FormArray` |
| Panel de categoría | `CategoriaPanelComponent` por categoría: motivo (control), `FacturaGeneratorComponent` o `FacturaLineasComponent` (`FormArray`), N × `<app-doc-block>` con `<app-file-upload-row>` (`FormArray`) |
| Uploads | `SolicitudesService.subirArchivo(file, contexto)` → progreso vía `HttpClient` `reportProgress`; el archivo se referencia por nombre/id en el form (igual que hoy) |
| CP → Estado/Municipio | `computed` o `valueChanges` del CP → servicio de lookup; setea controls `disabled` |
| Submit | `form.getRawValue()` → `SolicitudesService.registrar(payload)` → maneja `{folio}` / 422 (fieldErrors) |
| Éxito | `ConfirmDialog`/`InfoDialog` con folio → `router.navigate(['/reembolsos'])` (o dashboard) |
| Cancelar | `ConfirmDialogService.confirm(...)` → navegar |
| Doble submit | `store.saving` + `form.disable()` + spinner en botón |
| Errores backend | 422 → `form` field errors; 400 → toast |
| Catálogos | `resource()` (`GET /reembolsos/crear/catalogos`) → `input()` de los subcomponentes; **no** parte del form value (evita UI-012) |
| Accesibilidad del gate | `aria-disabled` + texto "Faltan: buscar asegurado / seleccionar paciente / adjuntar documentos requeridos" (anunciable), en vez de `disabled` mudo |

**Riesgo de esta pantalla:** es el archivo JS más grande (51 KB) y el más denso en interacción. Depende de catálogos que hoy son simulados y de endpoints (`BuscarDerechohabiente`, `SubirArchivo`, `Registrar`) que no persisten. **Por eso NO es el primer piloto** (§29): se migra como segunda pantalla, una vez el stack (shell, http, tabla, formularios simples, diálogos) está probado con Cuentas Bancarias.

---

# 24. Cuentas Bancarias y Pagos (análisis específico)

## 24.1 Cuentas Bancarias **[Confirmado en código]**

- **Existente en Current**: CRUD completo simulado — `Index`/`Buscar` (filtro Póliza/Banco/Estado + paginación), `Crear`/`Detalle` (form compartido), `Guardar` (`[FromBody]`, valida CLABE 18 dígitos + banco en set conocido), `CambiarEstado` (Desactivar/Reactivar), `MarcarPrincipal`. Entrada propia en el menú. Es el flujo **más nuevo y limpio** del proyecto (FL-22, "Golden Path" ya ejecutado, 6 ciclos documentados).
- **Faltante**: persistencia real (todo `ObtenerCuentasSimuladas`), no hay endpoint de API.
- **Simulado**: 100%.
- **Dependiente del backend**: necesitará endpoints CRUD reales (no existen); por ahora el BFF sirve los simulados como JSON.
- **vs Legacy**: reemplaza deliberadamente FL-10 (validación por token) + FL-11 (consulta admin). **No** replicar el flujo de token de Legacy.

**Rol en la migración:** **feature piloto recomendada** (§29) — self-contained, sin dependencias cross-feature, sin ambigüedad de negocio, ejercita todo el stack (lista + filtros + paginación + estados + form + validación + diálogos + acciones de fila con update optimista).

## 24.2 Pagos **[Confirmado en código]**

- **Existente en Current**: `Index`/`Buscar` (filtro fechas/folio + paginación), `DescargarLayout` (genera **CSV** con BOM UTF-8 a partir del filtro, sin paginar), `SubirArchivoRetro` (valida .txt/.csv/.xlsx + 5 MB, descarta contenido).
- **Faltante**: persistencia; conciliación real del Retro; el layout real de Legacy era Excel (NPOI) — CSV es decisión de negocio confirmada.
- **Simulado**: listado (`ObtenerPagosSimulados`); `SubirArchivoRetro` valida formato real pero no concilia.
- **Dependiente del backend**: endpoint de listado de pagos; procesamiento real de Retro; generación de layout desde datos reales.
- **vs Legacy**: FL-12 (Excel→CSV, intencional), FL-13 (Retro, completo a nivel de validación).

**Rol en la migración:** segunda o tercera feature. Aporta el patrón de **descarga de archivo** (`HttpClient` `responseType: 'blob'` → `URL.createObjectURL` → `<a download>` — nota: en el navegador normal funciona; el sandbox de artifacts no aplica aquí) y **subida con validación**. Reutiliza `<app-data-table>`, filtros, `<app-file-upload-row>`.

---

# 25. Configuración y ambientes

**[Confirmado en código]** hoy: `appsettings.json` (base, con URLs `dev-*` sobre HTTP), `appsettings.Development.json` (sólo logging). Sin `.Test`/`.QA`/`.Production` visibles en el repo. Sin CORS.

**Propuesta Angular (REQUERIDO):**

| Config | Dónde | Por qué |
|---|---|---|
| **URLs de API real** | **sólo del lado del host .NET / BFF** (`appsettings.{Environment}.json`) | nunca llegan al navegador; el BFF es el único que habla con la API |
| **URL de logout del portal, feature flags, versión, nivel de telemetría** | `assets/config.json` cargado en runtime vía `APP_INITIALIZER`/`provideAppInitializer` antes del bootstrap | **runtime, no build-time**: el mismo bundle sirve para Dev/QA/Prod; se cambia el `config.json` por ambiente sin recompilar |
| **Flags de build** (producción vs no) | `environment.ts` / `environment.prod.ts` | sólo cosas de build (habilitar/deshabilitar devtools, source maps) |
| **Nada sensible** | — | todo lo del bundle es público (§14.5) |

```
DEC-A4

Decisión:
Configuración de runtime vía assets/config.json (valores públicos), cargado con
provideAppInitializer antes del bootstrap. environment.ts sólo para flags de build.
Las URLs de la API real quedan exclusivamente en la configuración del host .NET.

Contexto:
El patrón clásico de Angular (environment.ts por ambiente) obliga a un build por ambiente
y tienta a poner URLs en el bundle. Con BFF de mismo origen, Angular no necesita ninguna URL
absoluta de API.

Alternativas:
A) environment.{qa,prod}.ts con `ng build --configuration` → un artefacto por ambiente.
B) config.json runtime → un artefacto, N configs.

Decisión recomendada: B.

Justificación: "build once, deploy many"; menos superficie de error; alineado con que Angular
sólo llama rutas relativas del BFF.

Impacto: pipeline coloca el config.json correcto por ambiente; `ConfigService` expone signals.

Riesgo: bajo. El config.json debe validarse al cargar (esquema) y fallar ruidosamente si falta.
```

- **CORS**: no necesario si mismo origen. Si por despliegue el SPA quedara en otro origen (no recomendado), el host .NET necesitaría `AddCors` con origen explícito + `AllowCredentials` — y habría que resolver el envío de cookie cross-site (`SameSite=None; Secure`). **Se recomienda evitarlo manteniendo mismo origen.**
- **Variables expuestas al navegador**: sólo `config.json`. Documentar en el README qué puede y qué no puede ir ahí.

---

# 26. Deployment

**Sin modificar infraestructura.** Lo que Angular necesita para desplegarse:

```
ng build --configuration production
   ↓  dist/<app>/browser/  (index.html + *.js/*.css fingerprinted + assets/)
   ↓
Copiar a wwwroot/ del host .NET (o a un contenedor de estáticos servido por el mismo host/reverse-proxy)
   ↓
El host .NET:
   ├─ sirve /assets, /*.js, /*.css como StaticFiles
   ├─ mantiene los endpoints del BFF (/reembolsos/*, /clientes/*, /sesion/*, …)
   └─ FALLBACK SPA: cualquier ruta no-API y no-archivo → devuelve index.html
        (app.MapFallbackToFile("index.html"))  ← REQUERIDO para el routing de Angular
   ↓
API real (Vitamedica.Multiportal.API) — sin cambios de despliegue
```

**Problemas potenciales y mitigación:**

| Problema | Mitigación |
|---|---|
| Refresh directo de `/reembolsos/123` → 404 | `MapFallbackToFile("index.html")` en el host; el fallback debe ir **después** de las rutas del BFF |
| Colisión de rutas BFF vs rutas Angular | prefijar el BFF (`/api/...`) **o** mantener las rutas MVC actuales y reservar esos paths; el fallback excluye lo que empiece por los prefijos del BFF |
| Caché de `index.html` viejo apuntando a bundles nuevos | `index.html` con `Cache-Control: no-cache`; los bundles fingerprinted con `immutable, max-age=1y` |
| Versionado de assets | ya resuelto por el hashing de `ng build`; el pipeline publica atómicamente (todo o nada) |
| CORS | evitado por mismo origen (§25) |
| CSP rompe estilos de Angular | `ngCspNonce` + nonce por respuesta del host (§14.1) |
| Fuente Inter externa bloqueada por CSP | servir local (§18) |
| Service worker / PWA | **no** en la migración (FUTURO) |
| Rollback | como el artefacto es "build once", rollback = redeploy del artefacto anterior + su `config.json` |

**Pipeline (RECOMENDADO):** `npm ci` → `ng lint` → `ng test --watch=false --browsers=ChromeHeadless` (o Vitest) → `ng build --configuration production` → `npm audit` → Playwright smoke contra un entorno efímero → publicar.

---

# 27. Mapa Current → Angular

| Current | Angular 22 | Acción | Complejidad | Riesgo |
|---|---|---|---|---|
| `_Layout` + `LayoutActionFilter` + `LayoutViewModelFactory` | `AppComponent` + `layout/shell` + `LayoutStore` | Migrar | Media | Bajo |
| `_Header` (+ densidad, dropdown) | `HeaderComponent` + `ThemeDensityService` | Migrar | Media | Bajo |
| `_Sidebar` + `_SidebarItems` + `StaticNavigationProvider` + `NavigationService` | `SidebarComponent` + `NavItemComponent` + `NAV_CONFIG` + `routerLinkActive` | Migrar | Media | Medio (preguntas abiertas de nav §35) |
| `_Footer` (+ enlaces legales rotos) | `FooterComponent` + `LegalPage` placeholder | Migrar + decidir | Baja | Bajo |
| Botón "¿Necesitas ayuda?" + `#modalDocumentosAyuda` | `HelpButtonComponent` + `HelpDialogComponent` | Migrar | Baja | Bajo |
| `Sesion/Login.cshtml` + `_ValidationScriptsPartial` | `LoginPage` + Reactive Form | Migrar + rediseñar (UI-007) | Baja | Bajo |
| `Home/Index` (placeholder) | redirect a `/reembolsos` o dashboard | Decidir (D-6) | Baja | Bajo |
| `Home/Privacy` / `Shared/Error` | `LegalPage` / `NotFoundPage` / `ErrorPage` | Migrar | Baja | Bajo |
| `Home/Asegurado` (huérfano) | `AseguradoPage` **o eliminar** | Decidir (§35) | Media | Bajo |
| `Reembolsos/Index` + `Buscar` + partials + `reembolsos-index.js` | `ReembolsosListPage` + `<app-data-table>` + `SolicitudesService` | Rediseñar (contrato JSON) | Alta | Medio |
| `Reembolsos/Crear` + `reembolso-solicitud.js` (51 KB) | `ReembolsoCrearPage` + `ReembolsoCrearStore` + ~8 subcomponentes | Rediseñar | **Muy alta** | Alto |
| `Reembolsos/Detalle` + `detalle-solicitud.js` | `ReembolsoDetallePage` + subcomponentes (dictamen, notas, ICD dialog) | Rediseñar | Alta | Medio (ICD/CPT bloqueado por negocio) |
| `Clientes/*` + `_ClienteForm` + `cliente-form.js` | `ClientesListPage` + `ClienteFormComponent` (Reactive, `FormArray` filiales) | Rediseñar | Alta | Medio (UI-005, UI-012) |
| `CuentasBancarias/*` + `_CuentaBancariaForm` | `CuentasListPage` + `CuentaBancariaFormComponent` | Rediseñar | Media | Bajo — **piloto** |
| `Pagos/*` + `pagos-index.js` | `PagosListPage` + descarga blob + `RetroUploadDialog` | Rediseñar | Media | Bajo |
| `_ResultadosYPaginacion*` (HTML) | contrato JSON `Pagina<T>` + `<app-data-table>` | Rediseñar (DEC-A1) | Media | Medio (coordinación .NET) |
| `core/http.js` | `HttpClient` + 4 interceptores + `ApiService` | Rediseñar | Media | Bajo |
| `core/storage.js` | `PreferencesService` (signals + localStorage) | Migrar | Baja | Bajo |
| `core/density-preference.js` | `ThemeDensityService` | Migrar | Baja | Bajo |
| `core/icons.js` + Lucide classic | `lucide-angular` | Reemplazar | Baja | Bajo |
| `components/date-picker.js` + Flatpickr | `DatePickerComponent` (§10 / DEC-A5) | Adaptar | Media | Bajo |
| Bootstrap Modal/Collapse/Dropdown/Tooltip/Popper | Angular CDK (Dialog, Overlay, A11y) + componentes propios | Reemplazar | Media | Medio (volumen) |
| `window.alert` (errores) | `ToastService` + host | Rediseñar | Baja | Bajo |
| `tokens.css` + `components/*.css` | `src/styles/tokens.css` + estilos de componente | Portar | Media | Bajo |
| ViewModels (`Models/ViewModels/*`) | `interface`/`type` + tipos de `FormGroup` | Adaptar | Media | Bajo |
| 6 Controllers MVC | **se conservan** como BFF (salida JSON) | Replantear salida | Media | Medio (fuera del repo Angular) |
| `Program.cs` (cookie, antiforgery, HttpClients) | se conserva + config XSRF (DEC-A2) + `MapFallbackToFile` | Ajustar | Baja | Bajo |
| jQuery / jquery-validation | eliminar | Eliminar | Baja | Ninguno |

---

# 28. Plan de migración por fases

**Incremental. Sin big-bang.** Durante la transición, host .NET sirve **ambas** UIs: Razor para lo no migrado, Angular para lo migrado (por ruta). Coexistencia por path.

| Fase | Objetivo | Entregable | Depende de |
|---|---|---|---|
| **F0 — Auditoría y decisiones** | cerrar decisiones que condicionan todo | DEC-A1..A5 aprobadas; preguntas abiertas del `UI_Decision_Log` resueltas; doc de arquitectura copiada al workspace; alcance del cambio .NET (BFF) acordado con quien mantiene ese proyecto | — |
| **F1 — Fundación Angular** | proyecto Angular arrancable | `ng new` (standalone, zoneless o OnPush, sin SSR); ESLint + Prettier + `@angular-eslint` a11y; Vitest/Karma; `tokens.css` portado; `core/http` (interceptores, `ApiService`); `AuthService` + `authGuard` + `GET /sesion/me` en el BFF; `ConfigService` + `config.json`; CI mínimo | F0 |
| **F2 — App shell** | shell navegable con login | `ShellComponent` (header + sidebar + footer + help + backdrop + skip-link); `LoginPage`; `LayoutStore`; `NAV_CONFIG`; `ThemeDensityService`; `ToastService`; routing raíz + guards; `MapFallbackToFile` en el host | F1 |
| **F3 — Infraestructura compartida** | librería `shared/ui` lista | `<app-data-table>`, `<app-paginator>`, `<app-page-size-select>`, `<app-filters-panel>`, `<app-table-state>`, `<app-badge>`, `<app-form-field>`, `<app-doc-block>`, `<app-file-upload-row>`, `<app-date-picker>`, `DialogService`, `ConfirmDialogService`, pipes, validators — cada uno con test | F2 |
| **F4 — Feature piloto (Cuentas Bancarias)** | 1 feature completa end-to-end en Angular | `CuentasBancarias` list + crear + editar + acciones; BFF de Cuentas devuelve JSON (DEC-A1); ruta `/cuentas-bancarias` servida por Angular, el resto sigue en Razor | F3 |
| **F5 — Validación del piloto** | confirmar el patrón | checklist de "migrado" (§30) aplicado a Cuentas; retro del equipo; ajustes a `shared/ui` y a las guías; **decisión de continuar** | F4 |
| **F6 — Migración por features** | resto de pantallas | orden sugerido: **Pagos** → **Clientes** → **Reembolsos/Index** → **Reembolsos/Detalle** → **Reembolsos/Crear** → **Asegurado** (si se conserva). Cada feature: BFF a JSON + Angular + tests + retiro del Razor+JS correspondiente | F5 |
| **F7 — Regresión integral** | paridad funcional y visual | suite Playwright de los 5 flujos críticos; auditoría a11y (axe); comparación visual contra Current; verificación de los criterios §30 en todas las features | F6 |
| **F8 — Retiro de Razor** | host sólo Angular + BFF | eliminar `Views/`, `wwwroot/js` y `wwwroot/css` legacy, `_ValidationScriptsPartial`, jQuery, Bootstrap JS, Lucide classic; el host queda como servidor de estáticos + BFF; `Program.cs` limpio | F7 |

**Puntos de control (review) entre F4→F5, F6 por feature, y F7.** Ninguna fase avanza sin que la anterior cumpla sus criterios.

**Alternativa considerada y descartada:** big-bang (reescribir todo y cambiar de golpe). Descartada porque: 14 pantallas con complejidad muy dispar, `Reembolsos/Crear` es un riesgo alto que no debe estar en el camino crítico inicial, y la coexistencia por path es trivial con `MapFallbackToFile` + rutas del BFF. No hay ninguna evidencia en el código que obligue a un corte único.

---

# 29. Feature piloto recomendada

## 29.1 Recomendación: **piloto en dos pasos**

**Paso 1 — `Cuentas Bancarias` (probar el stack).**

| Criterio | Cuentas Bancarias |
|---|---|
| Self-contained | ✅ sin dependencias cross-feature; comparte "Póliza" como concepto, no como código |
| Cobertura del stack | ✅ lista + filtros + paginación + estados + form (Crear/Editar compartido) + validación (CLABE) + diálogos de confirmación + acciones de fila con update optimista + selector "Mostrar" |
| Ambigüedad de negocio | ✅ ninguna — es funcionalidad propia de Current (FL-22), sin equivalente 1:1 en Legacy, ya con 6 ciclos de decisión documentados |
| Calidad del código origen | ✅ el más nuevo y limpio del proyecto |
| Riesgo | Bajo — `cuenta-bancaria-form.js` son 3,9 KB; `cuentas-bancarias-index.js` 17 KB pero es el patrón de tabla estándar |
| Contrato de datos | claro (VMs bien definidos); el BFF sólo cambia `PartialView`→`Ok(json)` |

**Paso 2 — `Reembolsos / Crear` (prueba de fuego).**

Se migra como **segunda** feature (no primera), una vez `shared/ui` y el stack están validados. Es la pantalla que el enunciado señala, y con razón concentra la complejidad real: formulario progresivo, campos dinámicos, gate de "Registrar", uploads, ayuda global, `FormArray` anidados, diálogos. Migrarla **primero** pondría el mayor riesgo del proyecto en el camino crítico antes de tener componentes base probados. Migrarla **segunda** la convierte en la validación definitiva del patrón de formularios.

## 29.2 Por qué NO empezar por `Reembolsos/Crear` directamente

- Es el archivo JS más grande (51 KB) y más denso en interacción.
- Depende de catálogos hoy simulados y de 3 endpoints que no persisten (`BuscarDerechohabiente`, `SubirArchivo`, `Registrar`).
- Necesita casi toda la librería `shared/ui` (doc-block, file-upload-row, date-picker, dialog, form-field) — que no existe hasta F3.
- El gate de "Registrar" es la regla de negocio de UI más importante del proyecto: conviene reimplementarla cuando el equipo ya domina signals/forms en este código, no en el primer contacto.

## 29.3 Descartado como piloto

- **`Reembolsos/Index`**: es la ruta default y la más central → un fallo aquí es muy visible; además su contrato de datos (listado de solicitudes) es el que menos existe en el backend.
- **`Clientes`**: arrastra UI-005 (form sin antiforgery/asp-for) y UI-012 (VM que mezcla catálogos), y hoy filtra client-side — más decisiones que tomar en el primer piloto.
- **`Home/Index`**: placeholder, no ejercita nada.
- **Búsqueda de derechohabiente sola** (el piloto que proponía `UI-Master-Implementation-Plan §6` para el mundo MVC): en Angular no aísla lo suficiente — no ejercita routing, lista, ni el shell.

---

# 30. Criterios de aceptación ("cuándo una pantalla está migrada")

Una pantalla **no** está migrada sólo porque "se ve igual". Debe cumplir **las cuatro dimensiones**:

### Visual
- [ ] Layout, spacing, tipografía y densidad idénticos (mismo `tokens.css`).
- [ ] Responsive en los 3 breakpoints (767.98 / 1199.98 / 1600).
- [ ] Todos los estados: normal, hover, focus, disabled, loading, empty, error.
- [ ] Componentes visuales = los de `shared/ui` (no reimplementaciones locales).

### Funcional
- [ ] Navegación (rutas, back, refresh directo, deep-link).
- [ ] Validaciones cliente **y** revalidación servidor (BFF).
- [ ] Formularios: dirty/touched, doble-submit bloqueado, errores por campo, recuperación.
- [ ] Tablas: filtros, paginación, selector "Mostrar" (arriba a la derecha), estados.
- [ ] Acciones (crear/editar/cambiar estado/…) con update de UI correcto.
- [ ] Errores HTTP (401/403/404/409/422/5xx/timeout) manejados según §13.
- [ ] Modales: foco, Escape, restore focus, backdrop.
- [ ] Paridad funcional con la pantalla Razol equivalente (o diferencia documentada).

### Seguridad
- [ ] Ruta tras `authGuard`; BFF con `[Authorize]`.
- [ ] Sin `[innerHTML]` con datos; sin `bypassSecurityTrust*` sin decisión.
- [ ] XSRF en todas las mutaciones.
- [ ] Sin secretos/PII/stack traces en bundle, logs de cliente ni mensajes de error.
- [ ] Nada sensible en `localStorage`.

### Técnica
- [ ] Componentes `OnPush`/zoneless-safe; sin memory leaks (subscripciones cerradas / `takeUntilDestroyed`).
- [ ] `@for` con `track`.
- [ ] Tests: unit de servicio/store/validators, component test del page, e2e si es flujo crítico.
- [ ] `ng lint` (incl. reglas a11y) sin errores; `ng build --configuration production` sin warnings nuevos.
- [ ] Razor + JS + CSS legacy de esa pantalla **eliminados** (no dejados "por si acaso").
- [ ] Sin dependencia nueva de npm sin justificación registrada.

---

# 31. Riesgos

| # | Riesgo | Tipo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|---|
| R1 | El equipo que mantiene el proyecto .NET UI no puede/quiere transformar los controllers a JSON (DEC-A1) | Proyecto | Media | Alto | Acordar en F0; si se niega, alternativa: content-negotiation (misma acción devuelve HTML o JSON según `Accept`) — más trabajo pero no bloquea |
| R2 | `Reembolsos/Crear` se subestima y desborda el sprint | Técnico | Alta | Alto | No ponerla en el camino crítico (piloto en 2 pasos); descomponer en ≥8 subcomponentes; `ReembolsoCrearStore` con tests del gate antes de la UI |
| R3 | Reemplazar Bootstrap JS por CDK introduce regresiones de comportamiento (modales, collapse, tooltips) | Técnico | Media | Medio | CDK Dialog/Overlay/A11y están maduros; migrar comportamiento por comportamiento con test; mantener el CSS de Bootstrap (sólo quitar el JS) hasta F8 |
| R4 | Pérdida de comportamiento sutil no documentado (p. ej. "doble clic desactiva categoría", `data-autoshow`, roving tabindex) | Funcional | Media | Medio | Inventario de micro-interacciones por pantalla antes de migrarla (§4.4); e2e que las cubra |
| R5 | Divergencia Current vs Legacy tratada como bug de migración | Funcional | Media | Medio | Regla: Current es la base; toda diferencia con Legacy ya decidida no se "corrige" en la migración; documentar |
| R6 | Antiforgery/XSRF entre Angular y .NET mal configurado → 400 en todas las mutaciones | Seguridad/Técnico | Media | Alto | DEC-A2 explícito; probarlo en F1 con un endpoint de prueba antes de cualquier feature |
| R7 | Datos siguen simulados indefinidamente → la migración "termina" sin integración real | Proyecto | Alta | Medio | Separar explícitamente "migración de UI" (alcance de este plan) de "integración con API real" (depende del backend); el BFF permite migrar UI sobre datos simulados sin bloqueo |
| R8 | CryptoBBVA / secretos hardcodeados siguen sin resolverse | Seguridad | Alta | Alto (pero preexistente) | Fuera del alcance de UI; escalado como dependencia/riesgo (§32); Angular no lo empeora ni lo arregla |
| R9 | CSP estricta rompe estilos de componentes Angular | Técnico | Media | Bajo | `ngCspNonce` + nonce por respuesta; probar en F2 |
| R10 | Falta de fuente de roles → se cablea `Permission` a algo provisional | Arquitectura | Baja | Medio | DEC-A3 lo prohíbe explícitamente |
| R11 | Scope creep: "ya que migramos, agreguemos Aprobar / ICD-CPT / dashboard nuevo" | Proyecto | Alta | Alto | §36 lista explícita de lo que NO se migra; cualquier feature nueva es un backlog aparte |
| R12 | Bundle inicial pesado (Bootstrap CSS + Flatpickr + CDK + Lucide) | Performance | Media | Bajo | lazy por feature; `@defer`; medir en F5; quitar Bootstrap CSS en F8; evaluar drop de Flatpickr |
| R13 | `Registrar()` y `Buscar()` no comparten estado (una solicitud creada no aparece en el listado) | Funcional | Alta (hoy) | Bajo | Es limitación preexistente de los datos simulados; documentar; se resuelve solo al haber backend real |
| R14 | Deep-link / refresh directo rompe (falta `MapFallbackToFile` o mal ordenado) | Técnico | Media | Alto | Configurar y probar en F2; e2e de refresh directo en rutas profundas |
| R15 | Doc de arquitectura desactualizada guía mal la implementación | Proyecto | Media | Medio | F0 copia la doc al workspace y marca DEC-008..013 como "microservicios, no aplica"; actualizar guías tras el piloto |

---

# 32. Dependencias

**Dependencias externas al alcance de UI/Angular (bloquean *integración real*, no la *migración de UI*):**

| Dependencia | Responsable probable | Bloquea |
|---|---|---|
| Transformar los 6 controllers a salida JSON + ProblemDetails (DEC-A1) | equipo que mantiene `Vitamedica.Multiportal.UI` | cada feature (pero coexiste por acción; no bloquea empezar) |
| Config XSRF cookie/header en el host (DEC-A2) | mismo | todas las mutaciones — resolver en F1 |
| Endpoint `GET /sesion/me` (usuario + FUTURO permisos) | mismo | `AuthService` — F1 |
| `MapFallbackToFile` + orden de rutas | mismo | deep-linking — F2 |
| Endpoints de API real: listado de solicitudes, persistencia Cliente/Cuenta/Registrar, `Modules`/`ServiceType` (hoy `NotImplementedException`), catálogo ICD/CPT | equipo backend (`Application`/`Infrastructure`) | **integración con datos reales** (fase posterior a la migración de UI; NO bloquea migrar sobre simulados) |
| Gestión de secretos por ambiente (CryptoBBVA, connection strings, URLs `dev-*`) — UI-011, transversales | infraestructura / DevOps | seguridad general (preexistente; Angular no lo cambia) |
| Decisión de negocio: modelo de roles | producto | `Permission`, filtros admin-only, granularidad de acciones |
| Decisión de negocio: existencia de "Aprobar" (FL-04), vigencia de ICD/CPT, variantes de Crear, INE/Odontograma/Reportería, destino de `Home/Asegurado` | producto | alcance de features nuevas (fuera de este plan) |
| Futuro logout URL, blob storage del logo | infraestructura | chrome (menor) |

**Dependencias internas (secuenciación del plan):** ver §28. Eje: F0 (decisiones) → F1 (`core/http` + auth + XSRF) → F3 (`shared/ui`) → F4 (piloto) → F6 (resto).

**Dependencias de librerías npm:** ver §41.

---

# 33. Estimación

**No se da una cantidad de semanas** porque no hay evidencia de la velocidad del equipo, ni de cuántas personas, ni de si el trabajo del BFF (.NET) corre en paralelo. Se entrega **dimensionamiento relativo** y los factores.

## 33.1 Complejidad por feature

| Feature | Vistas | JS (KB) | Formularios | Tablas | Campos dinámicos | Diálogos | Dependencia backend | **Complejidad** |
|---|---|---|---|---|---|---|---|---|
| App shell + Login | 5 partials + Login | ~14 | 1 (login) | 0 | 0 | 1 (help) | `/sesion/me`, XSRF | **Media** |
| `shared/ui` library | — | (deriva de ~40 KB de patrones) | base de todos | `<app-data-table>` | file-upload-row, date-picker | dialog service | — | **Alta** (una vez) |
| Cuentas Bancarias | 3 + 4 partials | ~21 | 1 (compartido) | 1 | 0 | 2 confirm | JSON del BFF | **Media** — *piloto* |
| Pagos | 1 + 3 partials | ~12 | 0 (filtros) | 1 | 0 | 1 (retro) | JSON + blob download | **Media** |
| Clientes | 3 + form | ~19 | 1 (4 secciones) | 1 (filtro client-side hoy) | filiales, checkbox grids, jerarquía cobertura→doc | 2 | JSON + catálogos | **Alta** |
| Reembolsos / Index | 1 + 3 partials | ~23 | filtros (rápido+avanzado) | 1 | 0 | 3 (nota, confirmar, retroceder 3-pasos) | JSON del BFF | **Alta** |
| Reembolsos / Detalle | 1 | ~11 (+ comparte los 51 KB) | dictamen (switches, inputs autorizado) | 2-3 | notas | ICD/CPT, histórico ICD, finalizar | JSON + catálogos (ICD bloqueado) | **Alta** |
| Reembolsos / Crear | 1 | ~51 | wizard 3 secciones | 0 | categorías, facturas, líneas multi-moneda, doc-rows | derechohabiente, éxito, cancelar | JSON + catálogos + upload + registrar | **Muy alta** |
| Asegurado (FL-23) | 1 | ~3 | 0 | tablas de reclamación | tabs | "conoce tu saldo" | simulado | **Media** (o **N/A** si se elimina) |

## 33.2 Trabajo transversal (no por feature)

- Transformación BFF (.NET): ~15 acciones GET + normalización de ~12 POST a ProblemDetails. **Media**, mecánica, **en otro repo**.
- Portado de `tokens.css` + `components/*.css`: **Media**, mayormente copia.
- Reemplazo Bootstrap JS → CDK: **Media**, concentrado en `shared/ui`.
- CI/CD + config runtime + fallback SPA: **Baja-Media**.
- Suite de tests base + Playwright: **Media**.

## 33.3 Qué falta para una estimación confiable

- Tamaño y seniority del equipo Angular; si el dev de .NET participa.
- Si el BFF (DEC-A1) se hace por adelantado (todo) o feature a feature.
- Si se conserva `Home/Asegurado` y si `Reembolsos/Detalle` se migra con ICD/CPT bloqueado o se pospone.
- Nivel de paridad visual exigido (pixel-perfect vs "equivalente").
- Si Playwright/axe/CSP son requisito de la fase 1 o se difieren.

**Orden de magnitud (sólo para planificación gruesa, NO compromiso):** shell + `shared/ui` + piloto es el ~40% del esfuerzo total; Reembolsos (Index+Detalle+Crear) es otro ~35%; Clientes+Pagos+Cuentas el resto; retiro de Razor y regresión ~10%.

---

# 34. Decisiones arquitectónicas propuestas (resumen)

| ID | Decisión | Estado |
|---|---|---|
| **DEC-A1** | Los 6 controllers MVC se conservan como BFF y devuelven JSON + ProblemDetails (transformación de la capa de salida, no del dominio). Equivalente Angular de DEC-001. | **Propuesto — requiere confirmación** (§12.2) |
| **DEC-A2** | Antiforgery vía cookie `XSRF-TOKEN` legible + header `X-XSRF-TOKEN` (convención nativa de Angular); alinear el host .NET. | **Propuesto — requiere confirmación** (§12.3) |
| **DEC-A3** | Sólo guard de sesión en la migración; estructura de permisos diseñada pero inactiva hasta que exista fuente real de roles. | **Propuesto** (§20) |
| **DEC-A4** | Config de runtime vía `assets/config.json` (valores públicos) + `provideAppInitializer`; `environment.ts` sólo flags de build; URLs de API real sólo en el host. | **Propuesto** (§25) |
| **DEC-A5** | Date picker: componente propio `<app-date-picker>` que **envuelve Flatpickr** a corto plazo (reutiliza el theme CSS ya escrito), con `<input type="date">` nativo + CDK como plan B evaluado en el piloto. | **Propuesto — decidir en F4** (§10) |
| **DEC-A6** | Angular CLI simple (no Nx). Standalone + zoneless (si el equipo lo valida) o `OnPush`. Sin SSR. | **Propuesto** (§8) |
| **DEC-A7** | Mismo origen host+SPA; despliegue "build once, deploy many"; `MapFallbackToFile`. Sin CORS. | **Propuesto** (§26) |
| **DEC-A8** | Sin state management library. Signals + servicios + `resource()`. `@ngrx/signals` sólo si un caso futuro lo justifica, con decisión registrada. | **Propuesto** (§16) |
| **DEC-A9** | Reemplazar Bootstrap **JS** por Angular CDK; conservar Bootstrap **CSS** hasta F8; luego evaluar retiro. Lucide → `lucide-angular`. | **Propuesto** (§8, §41) |

**Decisiones existentes que se respetan (no se reabren):**
- **DEC-001** (Browser→Controller→ApiClient→API): se honra; DEC-A1 es su forma en Angular.
- **DEC-002** (extraer `doc-block` sólo con responsabilidad reutilizable clara): en Angular el bloqueo de Razor desaparece → `<app-doc-block>` con `ng-content` es correcto crear.
- **DEC-003** (contrato de `core/http.js`): su intención se traslada a `HttpClient` + interceptores; el contrato conceptual (una capa única, `HttpError`, sin retry por defecto) se mantiene.
- **DEC-005 / UI-016** (no `innerHTML` inseguro): se cumple por construcción con la interpolación de Angular.
- **DEC-006** (tokens `-700` faltantes): oportunidad de cerrarla al portar tokens.
- **DEC-007** (Módulo→Cobertura descartado): se respeta; sólo Cobertura→Documento.
- **DEC-008/DEC-009 del log presente** (icons.js no se extrae; hallazgos de seguridad a config por ambiente): el primero es irrelevante en Angular; el segundo es dependencia externa (§32).

---

# 35. Preguntas abiertas

| # | Pregunta | Origen | Bloquea | Recomendación provisional |
|---|---|---|---|---|
| Q1 | ¿Se aprueba DEC-A1 (controllers → JSON)? ¿Quién lo ejecuta y cuándo (todo por adelantado o feature a feature)? | este plan | toda la integración | por adelantado el contrato `Pagina<T>` + ProblemDetails; el resto feature a feature |
| Q2 | ¿El logo del header (URL Azure Blob) es intencional o se mueve a `assets/`? | `UI_Decision_Log.md` (pregunta abierta) | chrome (menor) | mover a `assets/` |
| Q3 | ¿La navegación "Clientes → Grupo Modelo" → `ReembolsoSolicitud` y "Clientes → Smurfit" → `PagoSolicitud` es intención real de producto o placeholder de demo? | `UI_Decision_Log.md` | `NAV_CONFIG` | tratar como demo hasta confirmación; `NAV_CONFIG` provisional |
| Q4 | ¿`Home/Index` debe ser un dashboard real o basta redirect a `/reembolsos`? | D-6 | ruta raíz | redirect a `/reembolsos` |
| Q5 | ¿Se conserva `Home/Asegurado` (portal self-service, hoy huérfano) o se elimina? | FL-23 | 1 feature | posponer; migrar sólo si producto confirma que se usa |
| Q6 | ¿`Reembolsos/Detalle` se migra con ICD/CPT bloqueado (como hoy) o se pospone hasta tener catálogo? | FL-08 | 1 feature | migrar con ICD/CPT como sección deshabilitada + nota, igual que hoy |
| Q7 | ¿Enlaces legales (`Legal/*`): página placeholder propia o enlace a sistema externo? | UI-004 | footer | página placeholder Angular con contenido estático |
| Q8 | ¿Nivel de paridad visual exigido: pixel-perfect o "equivalente con el mismo design system"? | este plan | criterios §30, esfuerzo §33 | "equivalente"; pixel-perfect sólo en el shell |
| Q9 | ¿Zoneless o Zone.js + OnPush para el arranque? | §8 | fundación | zoneless si el equipo hace una prueba de concepto en F1; si no, OnPush |
| Q10 | ¿Se adopta Vitest o se queda Karma? ¿Playwright o Cypress? | §21 | CI | Vitest + Playwright |
| Q11 | ¿Se mantiene Flatpickr o se va a `<input type="date">` nativo? | DEC-A5 | date-picker | decidir en F4 con datos de bundle/UX |
| Q12 | ¿Existe intención de "Aprobar" (FL-04) y modelo de roles? (afecta alcance futuro, no la migración) | `Flujos_Funcionales…` §14 | features nuevas (fuera de plan) | no incluir en la migración |
| Q13 | ¿El SPA se despliega dentro del `wwwroot` del host actual o en un contenedor de estáticos separado tras el mismo reverse-proxy? | §26 | pipeline | dentro del host (más simple, mismo origen garantizado) |

---

# 36. Recomendación final

## 36.1 Qué migrar

El **proyecto `Vitamedica.Multiportal.UI` completo a nivel de presentación**: 14 pantallas + chrome + los 17 módulos JS + el CSS. Se conserva el proyecto .NET como **host de estáticos + BFF** (los 6 controllers, con salida JSON).

## 36.2 Qué conservar tal cual

- **El design system** (`tokens.css` + vocabulario de componentes) — portado verbatim.
- **El comportamiento funcional** de cada pantalla (gate de Registrar, revelado progresivo, filtros, paginación, selector "Mostrar" arriba a la derecha, ayuda global, densidad).
- **El mecanismo de autenticación** (cookie de sesión del host; sin tokens en el navegador).
- **El patrón DEC-001** (el navegador nunca habla directo con la API; el controller/BFF es el intermediario).
- **Las decisiones de negocio ya tomadas** que separan Current de Legacy (Cuentas Bancarias configurables, CSV en vez de Excel, etc.).

## 36.3 Qué rediseñar (misma función, otra implementación)

- El contrato AJAX: **PartialView HTML → JSON + ProblemDetails**.
- La capa de red: `core/http.js` → `HttpClient` + interceptores.
- Los comportamientos de Bootstrap JS → Angular CDK.
- `window.alert` → `ToastService`.
- Los formularios → Reactive Forms tipados con gate declarativo (`computed`).
- El estado → signals + `resource()` + `*Store` por feature.
- Lucide classic → `lucide-angular`.

## 36.4 Qué **NO** migrar (explícito)

- El **backend** (`API` / `Application` / `Domain` / `Infrastructure`) — sólo se le pedirán endpoints nuevos en una fase posterior de *integración*, que **no es parte de esta migración de UI**.
- **Legacy** (`Vitamedica.ReembolsoGModelo`) — sólo referencia funcional.
- La **variante de microservicios** (`- Con Microservicios`, `Multiportal\`) y sus endpoints `/Home/BuscarContextoAsegurado`, `IniciarReembolso`, `AprobarReclamo`, `RechazarReclamo`, sus `*ApiClient` y el API Gateway — fuera de alcance por regla del proyecto.
- **Funcionalidades que Current nunca implementó**: ICD/CPT real (FL-08), formato de instrucción de reembolso (FL-09), registro de usuario (FL-15), recuperar/cambiar contraseña (FL-16), INE (FL-17), odontograma (FL-18), reportería (FL-19), y la acción **"Aprobar"** (FL-04). Son backlog de producto, no de migración.
- **Los hallazgos de seguridad transversales** (CryptoBBVA, connection strings, URLs `dev-*` sobre HTTP) — se escalan como dependencia/riesgo; Angular no los introduce ni los resuelve.
- **jQuery / jquery-validation** — se eliminan, no se migran.
- **`ActiveDirectoryProxy.cs`** y el stub `AuthAgent` — viven en el host .NET, no tocan a Angular.

## 36.5 Cómo empezar

1. **F0**: aprobar DEC-A1..A9, resolver Q1–Q13 (al menos Q1, Q2, Q3, Q4, Q7, Q9, Q10, Q13), copiar la documentación de arquitectura al workspace y marcar DEC-008..013 como "microservicios / no aplica".
2. **F1–F3**: fundación + shell + `shared/ui` (con tests).
3. **F4–F5**: piloto **Cuentas Bancarias**, validar con los criterios §30, retro.
4. **F6**: Pagos → Clientes → Reembolsos/Index → Reembolsos/Detalle → **Reembolsos/Crear** → Asegurado (si aplica).
5. **F7–F8**: regresión integral + retiro de Razor.

## 36.6 Principio rector

> **No se reconstruye el producto. Se evoluciona la tecnología de la UI.**
> Cada pantalla migrada debe ser funcional, visual, técnica y de seguridad **equivalente o mejor** que su versión Razor — nunca "sólo parecida" — y la de Razor se elimina en cuanto la de Angular pasa los criterios de §30.

---

## Verificación de este plan (autorrevisión — §45 del encargo)

- ✅ Hechos vs inferencias diferenciados con etiquetas **[Confirmado en código]** / **[Inferencia]** / **[No determinado]**.
- ✅ Contradicciones identificadas: doc de arquitectura vive en otra copia (D-2); DEC-008..013 pertenecen a la rama de microservicios (D-3); `Home/Index` placeholder vs landing real (D-6); `VigorApiClient` deserializa a tipo incorrecto (D-4).
- ✅ **No se proponen cambios de backend innecesarios**: DEC-A1 transforma la *salida* de los controllers de presentación (que ya son un BFF), no el dominio ni la API; los endpoints nuevos de datos reales se marcan como fase posterior fuera de este plan.
- ✅ **Legacy no se modifica ni conceptualmente**: sólo se usa como referencia funcional; Current es la base.
- ✅ La arquitectura propuesta es **Angular 22 real**: standalone, signals, `resource()`/`httpResource()`, control flow `@if`/`@for`/`@defer`, guards/interceptores funcionales, typed reactive forms, zoneless opcional, `withComponentInputBinding`; se señalan los cambios respecto a Angular antiguo.
- ✅ La migración **preserva la experiencia de Current**: mismo design system, mismo comportamiento, mismo mecanismo de auth, mismo patrón DEC-001.
- ✅ El plan es **incremental** (F0–F8, coexistencia por path, sin big-bang), con puntos de control.

**Ningún archivo del proyecto fue creado, modificado o eliminado. Fin del Plan Maestro de Migración.**
