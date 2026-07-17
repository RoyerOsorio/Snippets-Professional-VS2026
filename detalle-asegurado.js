/* ============================================================================
   detalle-asegurado.js — Interacciones EXCLUSIVAS de Views/Home/DetalleAsegurado.
   Lo genérico (acordeón de doc-block, modal ICD/CPT, modal Histórico ICD) ya
   vive en reembolso-solicitud.js y detalle-solicitud.js y se reutiliza tal
   cual desde la vista (ver @section Scripts) — no se duplica aquí. Este
   archivo solo resuelve lo que es propio de esta pantalla:
     1) Tabs de estatus del trámite (visual, sin cambio de contenido).
     2) Fila agrupadora/fila hija dentro de la tabla de Factura.
     3) Tabs de tipo de gasto (Medicamentos / Laboratorio y gabinete): a
        diferencia de los tabs de estatus, aquí sí cambia el contenido
        visible (cada tab controla su propio panel vía aria-controls).
   Sin lógica de negocio ni llamadas a datos reales.
   ============================================================================ */
(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        initStatusTabs();
        initClaimTableGroups();
        initClaimTabs();
        if (window.VM && typeof window.VM.refreshIcons === "function") {
            window.VM.refreshIcons();
        }
    });

    // ---- 1. Tabs de estatus del trámite ----
    function initStatusTabs() {
        var tabs = document.querySelectorAll(".status-tabs .status-tab");
        if (!tabs.length) return;

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                tabs.forEach(function (t) {
                    var selected = t === tab;
                    t.classList.toggle("is-active", selected);
                    t.setAttribute("aria-selected", String(selected));
                });
            });
        });
    }

    // ---- 2. Fila agrupadora + fila hija dentro de claim-table (Factura) ----
    function initClaimTableGroups() {
        document.querySelectorAll("[data-claim-row-toggle]").forEach(function (toggle) {
            var childRow = document.getElementById(toggle.getAttribute("aria-controls"));
            if (!childRow) return;

            toggle.addEventListener("click", function () {
                var expanded = toggle.getAttribute("aria-expanded") === "true";
                toggle.setAttribute("aria-expanded", String(!expanded));
                childRow.hidden = expanded;
            });
        });
    }

    // ---- 3. Tabs de tipo de gasto (Medicamentos / Laboratorio y gabinete) ----
    function initClaimTabs() {
        var tabs = document.querySelectorAll("[data-claim-tab]");
        if (!tabs.length) return;

        function activate(tab) {
            tabs.forEach(function (t) {
                var selected = t === tab;
                t.classList.toggle("is-active", selected);
                t.setAttribute("aria-selected", String(selected));
                var panel = document.getElementById(t.getAttribute("aria-controls"));
                if (panel) panel.hidden = !selected;
            });
        }

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () { activate(tab); });
        });
    }
})();
