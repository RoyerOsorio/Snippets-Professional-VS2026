/* ============================================================================
   detalle-solicitud.js — Interacciones exclusivas de Views/Reembolsos/Detalle.
   Los comportamientos genéricos (abrir/cerrar doc-block, agregar/quitar filas
   de evidencia) ya viven en reembolso-solicitud.js y se reutilizan tal cual
   desde esta vista (ver @section Scripts). Aquí solo se resuelve lo propio de
   Detalle: modal ICD/CPT, modal Histórico ICD y el switch "Procedente".
   Sin lógica de negocio ni llamadas a datos reales.
   ============================================================================ */
(function () {
    "use strict";

    var HISTORICO_ICD_DEMO = [
        { folio: "0100326135", motivo: "Consulta médica", concepto: "GASTOS EN EL EXTRANJERO", dx: "Z71.9" },
        { folio: "0098214410", motivo: "Revisión anual", concepto: "CONSULTAS", dx: "Z00.0" }
    ];

    document.addEventListener("DOMContentLoaded", function () {
        initIcdModal();
        initHistoricoIcdModal();
        initProcedenteSwitches();
        initAgregarNota();
        if (window.VM && typeof window.VM.refreshIcons === "function") {
            window.VM.refreshIcons();
        }
    });

    // ---- Modal ICD/CPT (botón de cabecera y badge por partida) ----
    function initIcdModal() {
        var modalEl = document.getElementById("modalIcd");
        if (!modalEl) return;

        var icdInput = modalEl.querySelector("#icdCodigo");
        var icdDesc = modalEl.querySelector("#icdDescripcion");
        var cptInput = modalEl.querySelector("#cptCodigo");
        var cptDesc = modalEl.querySelector("#cptDescripcion");

        document.querySelectorAll("[data-icd-open]").forEach(function (trigger) {
            trigger.addEventListener("click", function () {
                var prefill = trigger.getAttribute("data-icd-prefill") === "true";
                if (prefill) {
                    icdInput.value = "Z719";
                    icdDesc.value = "CONSULTA, NO ESPECIFICADA";
                    cptInput.value = "L7999FE";
                    cptDesc.value = "Alergenos a Medicamentos";
                } else {
                    [icdInput, icdDesc, cptInput, cptDesc].forEach(function (el) { el.value = ""; });
                }
                bootstrap.Modal.getOrCreateInstance(modalEl).show();
            });
        });

        var limpiarBtn = modalEl.querySelector("[data-icd-limpiar]");
        if (limpiarBtn) {
            limpiarBtn.addEventListener("click", function () {
                [icdInput, icdDesc, cptInput, cptDesc].forEach(function (el) { el.value = ""; });
            });
        }
    }

    // ---- Modal Histórico ICD ----
    function initHistoricoIcdModal() {
        var modalEl = document.getElementById("modalHistoricoIcd");
        if (!modalEl) return;
        var tbody = modalEl.querySelector("[data-historico-body]");

        var trigger = document.querySelector("[data-historico-icd-open]");
        if (trigger) {
            trigger.addEventListener("click", function () {
                tbody.innerHTML = HISTORICO_ICD_DEMO.map(function (r) {
                    return "<tr><td>" + r.folio + "</td><td>" + r.motivo + "</td><td>" + r.concepto + "</td><td>" + r.dx + "</td></tr>";
                }).join("");
                bootstrap.Modal.getOrCreateInstance(modalEl).show();
            });
        }
    }

    // ---- Switch "Procedente": habilita Observaciones solo cuando NO procede ----
    function initProcedenteSwitches() {
        document.querySelectorAll("[data-procedente-switch]").forEach(function (sw) {
            var obsId = sw.getAttribute("data-procedente-switch");
            var obs = document.getElementById(obsId);
            if (!obs) return;

            function sync() { obs.disabled = sw.checked; if (sw.checked) obs.value = ""; }
            sw.addEventListener("change", sync);
            sync();
        });
    }

    // ---- Aside Notas del trámite: alta de nota nueva (front-end únicamente, sin backend) ----
    // Inserta la nota al inicio del note-timeline ya existente y refleja el
    // conteo en notes-panel-badge. Reutiliza las clases .note-item/.note-icon/
    // .note-body/.note-text/.note-meta ya definidas para las notas estáticas.
    // El panel ya no es un modal: está siempre visible junto al contenido.
    function initAgregarNota() {
        var panelEl = document.getElementById("panelNotasDetalle");
        if (!panelEl) return;

        var input = panelEl.querySelector("#notaNuevoTexto");
        var btn = panelEl.querySelector("#btnAgregarNotaDetalle");
        var timeline = panelEl.querySelector("[data-note-timeline]");
        var badge = panelEl.querySelector(".notes-panel-badge");
        if (!input || !btn || !timeline) return;

        function agregarNota() {
            var texto = (input.value || "").trim();
            if (!texto) { input.focus(); return; }

            var li = document.createElement("li");
            li.className = "note-item";
            li.innerHTML =
                '<span class="note-icon"><i data-lucide="message-square" aria-hidden="true"></i></span>' +
                '<div class="note-body">' +
                    '<p class="note-text"></p>' +
                    '<span class="note-meta"></span>' +
                '</div>';
            li.querySelector(".note-text").textContent = texto;
            li.querySelector(".note-meta").textContent = "Dictamen administrativo · jmjimenez · " + fechaHoyCorta();
            timeline.insertBefore(li, timeline.firstChild);

            input.value = "";
            if (badge) badge.textContent = String((parseInt(badge.textContent, 10) || 0) + 1);
            if (window.VM && typeof window.VM.refreshIcons === "function") window.VM.refreshIcons();
        }

        btn.addEventListener("click", agregarNota);
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); agregarNota(); }
        });
    }

    function fechaHoyCorta() {
        var d = new Date();
        return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
    }
})();
