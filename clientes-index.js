/* ============================================================================
   clientes-index.js — Interacciones exclusivas de Views/Home/Clientes.cshtml.
   Sin lógica de negocio ni llamadas a datos reales: filtra las filas ya
   renderizadas por Razor y simula Desactivar/Reactivar solo en el DOM
   (Patrón UI-001 CRUD Maestro — soft delete, sin eliminación física).
   ============================================================================ */
(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        initFiltros();
        initEstado();
        aplicarFiltros(); // respeta el estado inicial del select (Activo)
    });

    // ---- Filtros (texto + estado) ----
    function initFiltros() {
        var form = document.getElementById("formFiltrosClientes");
        if (!form) return;

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            aplicarFiltros();
        });

        form.addEventListener("reset", function () {
            // El reset nativo del <select>/<input> ocurre antes de este evento;
            // se difiere un turno para leer los valores ya restablecidos.
            setTimeout(function () {
                document.getElementById("fEstado").value = "todos";
                aplicarFiltros();
            }, 0);
        });
    }

    function aplicarFiltros() {
        var texto = (document.getElementById("fBuscar").value || "").trim().toLowerCase();
        var estado = document.getElementById("fEstado").value;
        var filas = document.querySelectorAll("#tablaClientes tbody tr");
        var visibles = 0;

        filas.forEach(function (fila) {
            var coincideEstado = estado === "todos" || fila.getAttribute("data-estado") === estado;
            var coincideTexto = !texto || (fila.getAttribute("data-busqueda") || "").indexOf(texto) !== -1;
            var visible = coincideEstado && coincideTexto;
            fila.hidden = !visible;
            if (visible) visibles++;
        });

        var conteo = document.getElementById("clientesConteo");
        if (conteo) conteo.textContent = visibles + " resultados";
    }

    // ---- Desactivar / Reactivar (con confirmación, sin eliminación física) ----
    var filaEnContexto = null;
    var accionEnContexto = null;

    function initEstado() {
        var modalEl = document.getElementById("modalConfirmarEstadoCliente");
        if (!modalEl) return;

        document.querySelectorAll("[data-accion-estado]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                filaEnContexto = btn.closest("tr");
                accionEnContexto = btn.getAttribute("data-accion-estado");
                var nombre = filaEnContexto ? filaEnContexto.children[1].textContent.trim() : "este cliente";

                document.getElementById("textoAccionEstado").textContent = "¿" + accionEnContexto + " a " + nombre + "?";
                document.getElementById("textoDetalleEstado").textContent = accionEnContexto === "Desactivar"
                    ? "Podrás reactivarlo cuando lo necesites."
                    : "El cliente volverá a aparecer como Activo en el listado.";

                bootstrap.Modal.getOrCreateInstance(modalEl).show();
            });
        });

        var btnConfirmar = document.getElementById("btnConfirmarEstadoCliente");
        if (btnConfirmar) {
            btnConfirmar.addEventListener("click", function () {
                if (filaEnContexto && accionEnContexto) {
                    aplicarCambioEstado(filaEnContexto, accionEnContexto);
                }
                bootstrap.Modal.getOrCreateInstance(modalEl).hide();
                filaEnContexto = null;
                accionEnContexto = null;
            });
        }
    }

    function aplicarCambioEstado(fila, accion) {
        var nuevoEstado = accion === "Desactivar" ? "Inactivo" : "Activo";
        fila.setAttribute("data-estado", nuevoEstado);

        var badge = fila.querySelector("[data-badge-estado]");
        var boton = fila.querySelector("[data-accion-estado]");

        if (nuevoEstado === "Activo") {
            badge.className = "badge-status badge-status--success";
            badge.innerHTML = '<i data-lucide="check-circle" aria-hidden="true"></i> Activo';
            boton.className = "doc-gen-btn doc-gen-btn--danger";
            boton.title = "Desactivar";
            boton.setAttribute("aria-label", "Desactivar cliente");
            boton.setAttribute("data-accion-estado", "Desactivar");
            boton.innerHTML = '<i data-lucide="ban" aria-hidden="true"></i>';
        } else {
            badge.className = "badge-status badge-status--neutral";
            badge.innerHTML = '<i data-lucide="circle-slash" aria-hidden="true"></i> Inactivo';
            boton.className = "doc-gen-btn doc-gen-btn--secondary";
            boton.title = "Reactivar";
            boton.setAttribute("aria-label", "Reactivar cliente");
            boton.setAttribute("data-accion-estado", "Reactivar");
            boton.innerHTML = '<i data-lucide="rotate-ccw" aria-hidden="true"></i>';
        }

        if (window.VM) window.VM.refreshIcons();
        aplicarFiltros(); // el cambio de estado puede sacar la fila del filtro activo
    }
})();
