/* ============================================================================
   reembolso-solicitud.js — Interacciones exclusivas de la vista Solicitud de
   Reembolso. Sin lógica de negocio ni llamadas a datos reales: simula la
   búsqueda de Derechohabiente con un único registro hardcodeado, para
   demostrar el patrón de interacción de alta fidelidad.
   ============================================================================ */
(function () {
    "use strict";

    // ---- Datos simulados (reemplazar por llamada real al backend) ----
    var DERECHOHABIENTE_DEMO = {
        numeroEmpleado: "38602287",
        nombre: "ESNER VALENCIA VALENCIA",
        grupo: "17000003",
        fechaInicioVigencia: "03/01/2026",
        fechaFinVigencia: "31/12/2199",
        miembroDesde: "01/03/2026",
        beneficiarios: [
            { id: "titular", nombre: "ESNER VALENCIA VALENCIA", parentesco: "Titular" },
            { id: "conyuge", nombre: "MARÍA JOSÉ PÉREZ DE VALENCIA", parentesco: "Cónyuge" },
            { id: "hijo1", nombre: "DIEGO VALENCIA PÉREZ", parentesco: "Hijo(a)" }
        ]
    };

    var MUNICIPIOS_POR_ESTADO = {
        "Puebla": ["Chilchotla", "Puebla de Zaragoza", "Tehuacán"],
        "Ciudad de México": ["Miguel Hidalgo", "Coyoacán", "Benito Juárez"],
        "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque"]
    };

    document.addEventListener("DOMContentLoaded", function () {
        initDerechohabienteModal();
        initEstadoMunicipio();
        initBeneficiarioSelect();
        initCategoryTabs();
        initSolicitarGates();
        initDocBlocks();
        initFacturaGenerators();
        initFacturaLineas();
        initCancelConfirm();
        if (window.VM && typeof window.VM.refreshIcons === "function") {
            window.VM.refreshIcons();
        }
    });

    // ---- 1. Modal Derechohabiente: búsqueda + autocompletado ----
    function initDerechohabienteModal() {
        var modalEl = document.getElementById("modalDerechohabiente");
        if (!modalEl) return;

        // Fiel a la referencia: el modal se muestra automáticamente al entrar,
        // ya que es el punto de partida obligatorio del flujo.
        if (modalEl.hasAttribute("data-autoshow")) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }

        var form = modalEl.querySelector("[data-buscar-form]");
        var resultsWrap = modalEl.querySelector("[data-buscar-resultados]");

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var input = form.querySelector("input[name='numeroEmpleado']");
            var valor = (input.value || "").trim();

            // Demo: solo el número de empleado de ejemplo devuelve resultado.
            if (valor === DERECHOHABIENTE_DEMO.numeroEmpleado) {
                resultsWrap.innerHTML =
                    '<table class="table table-sm align-middle mb-0" role="table">' +
                    '<thead><tr><th>Número de Empleado</th><th>Nombre Completo</th><th>Grupo</th><th></th></tr></thead>' +
                    '<tbody><tr class="derechohabiente-row" style="cursor:pointer" tabindex="0" role="button">' +
                    "<td>" + DERECHOHABIENTE_DEMO.numeroEmpleado + "</td>" +
                    "<td>" + DERECHOHABIENTE_DEMO.nombre + "</td>" +
                    "<td>" + DERECHOHABIENTE_DEMO.grupo + "</td>" +
                    '<td><span class="btn-text-vm" style="padding:4px 8px">Seleccionar</span></td>' +
                    "</tr></tbody></table>";
                resultsWrap.hidden = false;

                var row = resultsWrap.querySelector(".derechohabiente-row");
                var seleccionar = function () {
                    aplicarDerechohabiente(DERECHOHABIENTE_DEMO);
                    var bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
                    bsModal.hide();
                };
                row.addEventListener("click", seleccionar);
                row.addEventListener("keydown", function (ev) {
                    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); seleccionar(); }
                });
            } else {
                resultsWrap.innerHTML =
                    '<div class="solicitar-hint"><i data-lucide="search-x" aria-hidden="true"></i>' +
                    "No se encontró ningún derechohabiente con ese número de empleado.</div>";
                resultsWrap.hidden = false;
                if (window.VM) window.VM.refreshIcons();
            }
        });
    }

    function aplicarDerechohabiente(data) {
        setFieldText("campoNumeroEmpleado", data.numeroEmpleado);
        setFieldText("campoNombreTitular", data.nombre);
        setFieldText("campoFechaInicioVigencia", data.fechaInicioVigencia);
        setFieldText("campoFechaFinVigencia", data.fechaFinVigencia);
        setFieldText("campoMiembroDesde", data.miembroDesde);

        var resumen = document.getElementById("resumenAsegurado");
        if (resumen) resumen.textContent = data.nombre + " · Núm. " + data.numeroEmpleado;

        var select = document.getElementById("selectBeneficiario");
        if (select) {
            select.innerHTML = '<option value="">-- Seleccionar Beneficiario --</option>';
            data.beneficiarios.forEach(function (b) {
                var opt = document.createElement("option");
                opt.value = b.id;
                opt.textContent = b.nombre + " (" + b.parentesco + ")";
                opt.setAttribute("data-parentesco", b.parentesco);
                select.appendChild(opt);
            });
            select.disabled = false;
        }
    }

    function setFieldText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // ---- 2. Cascada Estado -> Municipio (demo) ----
    function initEstadoMunicipio() {
        var estado = document.getElementById("selectEstado");
        var municipio = document.getElementById("selectMunicipio");
        if (!estado || !municipio) return;

        estado.addEventListener("change", function () {
            var lista = MUNICIPIOS_POR_ESTADO[estado.value] || [];
            municipio.innerHTML = "";
            if (lista.length === 0) {
                municipio.innerHTML = '<option value="">-- Seleccionar Estado primero --</option>';
                municipio.disabled = true;
                return;
            }
            municipio.disabled = false;
            municipio.innerHTML = '<option value="">-- Seleccionar Municipio --</option>' +
                lista.map(function (m) { return "<option>" + m + "</option>"; }).join("");
        });
    }

    // ---- 3. Beneficiario -> Parentesco autocompletado ----
    function initBeneficiarioSelect() {
        var select = document.getElementById("selectBeneficiario");
        var parentesco = document.getElementById("campoParentesco");
        if (!select || !parentesco) return;

        select.addEventListener("change", function () {
            var opt = select.options[select.selectedIndex];
            parentesco.textContent = opt ? (opt.getAttribute("data-parentesco") || "—") : "—";
        });
    }

    // ---- 4. Selector de categorías (tabs verticales accesibles) ----
    function initCategoryTabs() {
        var nav = document.querySelector("[data-category-nav]");
        if (!nav) return;
        var buttons = Array.prototype.slice.call(nav.querySelectorAll(".category-nav-btn"));

        function activate(btn) {
            buttons.forEach(function (b) {
                var selected = b === btn;
                b.setAttribute("aria-selected", String(selected));
                var panel = document.getElementById(b.getAttribute("aria-controls"));
                if (panel) panel.classList.toggle("is-active", selected);
            });
            btn.focus();
        }

        buttons.forEach(function (btn, idx) {
            btn.addEventListener("click", function () { activate(btn); });
            btn.addEventListener("keydown", function (e) {
                if (e.key === "ArrowDown") { e.preventDefault(); activate(buttons[(idx + 1) % buttons.length]); }
                if (e.key === "ArrowUp") { e.preventDefault(); activate(buttons[(idx - 1 + buttons.length) % buttons.length]); }
            });
        });
    }

    // ---- 5. Checkbox "Solicitar" habilita/oculta los datos de la categoría ----
    function initSolicitarGates() {
        var checks = document.querySelectorAll("[data-solicitar-check]");
        checks.forEach(function (check) {
            var targetId = check.getAttribute("data-solicitar-check");
            var target = document.getElementById(targetId);
            var hint = document.querySelector("[data-solicitar-hint='" + targetId + "']");
            if (!target) return;

            function sync() {
                target.hidden = !check.checked;
                if (hint) hint.hidden = check.checked;
            }
            check.addEventListener("change", sync);
            sync();
        });
    }

    // ---- 6. Bloques de documento (acordeón interno + agregar/quitar filas) ----
    function initDocBlocks() {
        document.querySelectorAll("[data-doc-toggle]").forEach(function (header) {
            var body = document.getElementById(header.getAttribute("aria-controls"));
            header.addEventListener("click", function () {
                var expanded = header.getAttribute("aria-expanded") === "true";
                header.setAttribute("aria-expanded", String(!expanded));
                if (body) body.hidden = expanded;
            });
        });

        document.querySelectorAll("[data-doc-add]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var list = document.getElementById(btn.getAttribute("data-doc-add"));
                if (!list) return;
                var template = list.querySelector(".doc-file-row");
                if (!template) return;
                var clone = template.cloneNode(true);
                clone.querySelectorAll("input[type=text]").forEach(function (i) { i.value = ""; });
                list.appendChild(clone);
                wireRemoveButton(clone.querySelector(".doc-file-remove"));
                if (window.VM) window.VM.refreshIcons();
            });
        });

        document.querySelectorAll(".doc-file-remove").forEach(wireRemoveButton);
    }

    function wireRemoveButton(btn) {
        if (!btn || btn.dataset.wired) return;
        btn.dataset.wired = "1";
        btn.addEventListener("click", function () {
            var row = btn.closest(".doc-file-row");
            var list = row ? row.parentElement : null;
            if (list && list.querySelectorAll(".doc-file-row").length > 1) {
                row.remove();
            }
        });
    }

    // ---- 7. Generador de Factura (Cargar PDF / Cargar XML / Generar XML / Limpiar) ----
    function initFacturaGenerators() {
        document.querySelectorAll("[data-factura-generator]").forEach(function (gen) {
            var empty = gen.querySelector("[data-factura-empty]");
            var loaded = gen.querySelector("[data-factura-loaded]");
            var totalEl = gen.querySelector("[data-factura-total]");
            var montoEl = gen.querySelector("[data-factura-monto]");

            gen.querySelectorAll("[data-factura-action]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var action = btn.getAttribute("data-factura-action");
                    if (action === "limpiar") {
                        if (empty) empty.hidden = false;
                        if (loaded) loaded.hidden = true;
                        if (totalEl) totalEl.textContent = "0";
                        if (montoEl) montoEl.textContent = "$ 0.00";
                        return;
                    }
                    if (empty) empty.hidden = true;
                    if (loaded) loaded.hidden = false;
                    if (totalEl) totalEl.textContent = "1";
                    if (montoEl) montoEl.textContent = "$ 1,250.00";
                });
            });
        });
    }

    // ---- 8. Gastos en el Extranjero: líneas de factura con Moneda/Fecha/Monto ----
    function initFacturaLineas() {
        document.querySelectorAll("[data-factura-lineas-add]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var list = document.getElementById(btn.getAttribute("data-factura-lineas-add"));
                if (!list) return;
                var template = list.querySelector(".factura-line");
                if (!template) return;
                var clone = template.cloneNode(true);
                clone.querySelectorAll("input").forEach(function (i) { i.value = ""; });
                clone.querySelectorAll("select").forEach(function (s) { s.selectedIndex = 0; });
                list.appendChild(clone);
                wireRemoveButton(clone.querySelector(".doc-file-remove"));
                // Date Picker de la fila clonada: components/date-picker.js (ES module) no es
                // importable desde este script clásico, por lo que se inicializa aquí
                // directamente sobre window.flatpickr (mismo vendor, mismas opciones —
                // ver JavaScript_Architecture_Guide_v1.1.md §16.1 y §7.3).
                clone.querySelectorAll('[data-component="date-picker"]').forEach(function (input) {
                    if (window.flatpickr && !input._flatpickr) {
                        window.flatpickr(input, { dateFormat: "d/m/Y", locale: "es", allowInput: true, disableMobile: true });
                    }
                });
                if (window.VM) window.VM.refreshIcons();
            });
        });
    }

    // ---- 9. Confirmación al cancelar ----
    function initCancelConfirm() {
        var cancelBtn = document.querySelector("[data-cancelar-solicitud]");
        var modalEl = document.getElementById("modalConfirmarCancelar");
        if (!cancelBtn || !modalEl) return;
        cancelBtn.addEventListener("click", function () {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });
        var confirmBtn = modalEl.querySelector("[data-confirmar-cancelar]");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", function () {
                window.location.href = confirmBtn.getAttribute("data-href") || "/";
            });
        }
    }
})();
