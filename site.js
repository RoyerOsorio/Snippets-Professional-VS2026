/* ============================================================================
   site.js — Punto de entrada único de JavaScript.
   Fase: Fase 3-B.2 — Refactorización interna del JavaScript del Layout
   (Frontend_Refactoring_and_Migration_Plan_Addendum_v1.1.md).

   Nota de origen: este archivo existía en el repositorio como el placeholder
   por defecto del scaffold de ASP.NET Core MVC (comentarios de bundling,
   sin ninguna lógica real, sin estar referenciado por _Layout.cshtml). No
   se trata de una modificación de comportamiento legado — es la primera
   vez que este archivo, ya reservado por JavaScript_Architecture_Guide_v1.0.md
   §4/§6.1 como punto de entrada único, se puebla con contenido real.

   Responsabilidad: registro de inicializadores, orquestando core/ y
   components/ tras DOMContentLoaded (JavaScript_Architecture_Guide_v1.0.md
   §5, §10.2). Reemplaza, junto con core/ y components/sidebar.js, la
   responsabilidad hoy cubierta por wwwroot/js/layout.js + sidebar.js +
   header.js (legado), que permanecen físicamente en el proyecto — su
   retiro físico es exclusivo de la Fase 3-C
   (Frontend_Refactoring_and_Migration_Plan_Addendum_v1.1.md, Fase 3-B.2:
   "no debe eliminar todavía ningún archivo legado").

   Depende de: core/dom-ready.js, core/density-preference.js,
   components/sidebar.js

   Mecanismo: ES Modules nativos (D-07, Migration_Technical_Decisions_Register).
   Migration Phase: Fase 3-B.2
   Estado: Nuevo. Cargado como <script type="module"> en _Layout.cshtml,
   en sustitución de la referencia a layout.js/sidebar.js/header.js
   (retirada únicamente su referencia, no los archivos — ver diff de
   _Layout.cshtml de esta misma fase).
   ============================================================================ */

import { onReady } from './core/dom-ready.js';
import { initDensityPreference } from './core/density-preference.js';
import { initSidebar } from './components/sidebar.js';
import { initDatePicker } from './components/date-picker.js';

// Refresco de íconos Lucide: no se extrajo a core/icons.js (descartado en el
// análisis de la Fase 3-B.2 — sus dos únicos puntos de uso residen en este
// mismo archivo, no en dos módulos distintos, por lo que no cumple el
// criterio de extracción de JavaScript_Architecture_Guide_v1.0.md §11.1).
function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
}

onReady(() => {
    initSidebar();
    initDensityPreference();
    initDatePicker();

    // Pintado inicial de íconos (equivalente a layout.js legado en DOMContentLoaded).
    refreshIcons();

    // Refresco al abrir el menú de usuario (equivalente a header.js legado).
    const userMenu = document.querySelector(".user-menu");
    if (userMenu) {
        userMenu.addEventListener("shown.bs.dropdown", refreshIcons);
    }
});
