/* ============================================================================
   components/date-picker.js
   Origen: Components_Development_Guide_v1.1.md §22.5,
   JavaScript_Architecture_Guide_v1.1.md §16.1 (excepción aprobada: Flatpickr).

   Responsabilidad: envolver la librería de terceros Flatpickr (cargada como
   vendor global en _Layout.cshtml, antes de site.js — ver §7.3 de la guía)
   para el componente Date Picker, variante fecha única.

   Depende de: window.flatpickr (vendor, wwwroot/lib/flatpickr/dist/flatpickr.min.js
   + l10n/es.js), cargados antes de este módulo. Esta es la única dependencia
   global implícita permitida en el proyecto (excepción documentada, no aplica
   a módulos internos).
   Consumido por: site.js

   Contrato: se auto-inicializa sobre todo input con [data-component="date-picker"]
   presente en el DOM (JavaScript_Architecture_Guide_v1.1.md §10.1). No contiene
   lógica de negocio. Es idempotente (§10.3) y expone reinit() para el caso de
   filas de formulario agregadas dinámicamente (ej. clonado de líneas de factura).
   ============================================================================ */

const SELECTOR = '[data-component="date-picker"]';

function createInstance(input) {
    if (!window.flatpickr) return;
    // Idempotencia (§10.3): no crear una segunda instancia sobre el mismo input.
    if (input._flatpickr) return;

    window.flatpickr(input, {
        dateFormat: "d/m/Y",
        locale: "es",
        allowInput: true,
        disableMobile: true,
    });
}

export function initDatePicker(root = document) {
    root.querySelectorAll(SELECTOR).forEach(createInstance);
}

/**
 * Reinicializa el Date Picker sobre un contenedor específico — uso previsto
 * para contenido agregado dinámicamente después de la carga inicial (ej. una
 * fila de formulario clonada que incluye un input de fecha), evitando que
 * cada pantalla reimplemente su propia lógica de detección
 * (JavaScript_Architecture_Guide_v1.1.md §10.3).
 */
export function reinitDatePicker(root) {
    initDatePicker(root);
}
