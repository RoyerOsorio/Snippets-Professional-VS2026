/* ============================================================================
   cliente-form.js — Interacciones exclusivas del formulario compartido de
   Cliente (Views/Shared/Partials/_ClienteForm.cshtml), usado tanto por
   CreacionCliente como por DetalleCliente. Sin lógica de negocio ni llamadas
   a datos reales: fase de interfaz sin persistencia.

   Flujo progresivo (aclaración de negocio — NO es el mismo mecanismo que
   ReembolsoSolicitud, que revela una sección a la vez en cascada):
     Sección 1 (Cliente) siempre visible.
     Al completarse TODOS los campos requeridos de Sección 1 -> aparecen
       Sección 2 (Filiales) y Sección 3 (Módulos) AL MISMO TIEMPO.
     Sección 2 (Filiales) es siempre opcional: nunca bloquea el flujo.
     Al marcar >=1 checkbox en Sección 3 (Módulos) -> aparece Sección 4 (Coberturas).
     Al marcar >=1 checkbox en Sección 4 (Coberturas) -> aparece Sección 5 (Documentos).
     Guardar se habilita solo cuando Sección 1 está completa Y hay >=1 selección
     en Módulos, Coberturas y Documentos (formulario completo y válido).
   ============================================================================ */
(function () {
    "use strict";

    var seccion1Revelada = false; // en este caso "revelada" = Secciones 2 y 3 ya aparecieron
    var seccion4Revelada = false;
    var seccion5Revelada = false;

    document.addEventListener("DOMContentLoaded", function () {
        initFiliales();
        initProgresion();
        initGuardado();
        if (window.VM && typeof window.VM.refreshIcons === "function") {
            window.VM.refreshIcons();
        }
    });

    // ------------------------------------------------------------------
    // Sección 1 -> gate de Secciones 2 y 3 (simultáneo, una sola vez)
    // ------------------------------------------------------------------
    var SECCION1_CAMPOS_REQUERIDOS = [
        "inputNombreORazonSocial",
        "inputRfc",
        "inputTelefono",
        "inputNombreContacto",
        "inputDescripcionCorta"
    ];

    function campoTieneValor(id) {
        var el = document.getElementById(id);
        if (!el) return false;
        return (el.value || "").trim().length > 0;
    }

    function seccion1Completa() {
        return SECCION1_CAMPOS_REQUERIDOS.every(campoTieneValor);
    }

    function grupoTieneSeleccion(nombre) {
        return document.querySelectorAll("input[name='" + nombre + "']:checked").length > 0;
    }

    function revelar(wrapperId) {
        var el = document.getElementById(wrapperId);
        if (el) el.hidden = false;
    }

    function evaluarGateSeccion1() {
        if (seccion1Revelada) return; // una vez revelada, no se vuelve a ocultar
        if (!seccion1Completa()) return;
        seccion1Revelada = true;
        revelar("seccionFilialesWrapper");
        revelar("seccionModulosWrapper");
        if (window.VM) window.VM.refreshIcons();
    }

    function evaluarGateModulos() {
        if (seccion4Revelada) return;
        if (!grupoTieneSeleccion("Cliente.ModulosSeleccionados")) return;
        seccion4Revelada = true;
        revelar("seccionCoberturasWrapper");
    }

    function evaluarGateCoberturas() {
        if (seccion5Revelada) return;
        if (!grupoTieneSeleccion("Cliente.CoberturasSeleccionadas")) return;
        seccion5Revelada = true;
        revelar("seccionDocumentosWrapper");
    }

    // Formulario completo y válido: Sección 1 + al menos una selección en
    // Módulos, Coberturas y Documentos. Se reevalúa en cada cambio relevante
    // (a diferencia del revelado de secciones, esto SÍ puede des-habilitarse).
    function evaluarGuardar() {
        var btn = document.getElementById("btnGuardarCliente");
        if (!btn) return;
        var valido = seccion1Completa()
            && grupoTieneSeleccion("Cliente.ModulosSeleccionados")
            && grupoTieneSeleccion("Cliente.CoberturasSeleccionadas")
            && grupoTieneSeleccion("Cliente.DocumentosSeleccionados");
        btn.disabled = !valido;
    }

    function evaluarTodo() {
        evaluarGateSeccion1();
        evaluarGateModulos();
        evaluarGateCoberturas();
        evaluarGuardar();
    }

    function initProgresion() {
        SECCION1_CAMPOS_REQUERIDOS.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", evaluarTodo);
            el.addEventListener("change", evaluarTodo);
        });

        ["Cliente.ModulosSeleccionados", "Cliente.CoberturasSeleccionadas", "Cliente.DocumentosSeleccionados"].forEach(function (grupo) {
            document.querySelectorAll("input[name='" + grupo + "']").forEach(function (chk) {
                chk.addEventListener("change", evaluarTodo);
            });
        });

        evaluarTodo(); // estado inicial (relevante en modo Edición, con datos precargados)
    }

    // ------------------------------------------------------------------
    // Sección 2 · Filiales dinámicas — mismo patrón de agregar/quitar filas
    // ya usado en ReembolsoSolicitud (clonar plantilla + confirmar al quitar).
    // ------------------------------------------------------------------
    var filialAEliminar = null; // referencia a la tarjeta pendiente de confirmar

    function renumerarFiliales() {
        var tarjetas = document.querySelectorAll("#listaFiliales .filial-card");
        tarjetas.forEach(function (tarjeta, index) {
            tarjeta.querySelectorAll("[data-filial-campo]").forEach(function (input) {
                input.name = "Cliente.Filiales[" + index + "]." + input.getAttribute("data-filial-campo");
            });
        });
    }

    function agregarFilial() {
        var plantilla = document.getElementById("filialTemplate");
        var lista = document.getElementById("listaFiliales");
        if (!plantilla || !lista) return;
        var nodo = plantilla.content.cloneNode(true);
        lista.appendChild(nodo);
        renumerarFiliales();
        var ultima = lista.querySelector(".filial-card:last-child [data-filial-eliminar]");
        wireEliminarFilial(ultima);
        if (window.VM) window.VM.refreshIcons();
    }

    function wireEliminarFilial(boton) {
        if (!boton || boton.dataset.wired) return;
        boton.dataset.wired = "1";
        boton.addEventListener("click", function () {
            filialAEliminar = boton.closest(".filial-card");
            bootstrap.Modal.getOrCreateInstance(document.getElementById("modalConfirmarEliminarFilial")).show();
        });
    }

    function initFiliales() {
        // Filiales ya existentes (modo Edición, renderizadas por Razor): se
        // conectan aquí; las agregadas después se conectan en agregarFilial().
        document.querySelectorAll("#listaFiliales [data-filial-eliminar]").forEach(wireEliminarFilial);

        var btnAgregar = document.getElementById("btnAgregarFilial");
        if (btnAgregar) btnAgregar.addEventListener("click", agregarFilial);

        var btnConfirmar = document.getElementById("btnConfirmarEliminarFilial");
        if (btnConfirmar) {
            btnConfirmar.addEventListener("click", function () {
                if (filialAEliminar) {
                    filialAEliminar.remove();
                    filialAEliminar = null;
                    renumerarFiliales();
                }
                bootstrap.Modal.getOrCreateInstance(document.getElementById("modalConfirmarEliminarFilial")).hide();
            });
        }
    }

    // ------------------------------------------------------------------
    // Guardado — sin persistencia: valida en cliente, muestra el modal
    // informativo y, al cerrarlo, regresa al Index de Clientes.
    // ------------------------------------------------------------------
    function initGuardado() {
        var form = document.getElementById("formCliente");
        var modalEl = document.getElementById("modalClienteGuardado");
        if (!form || !modalEl) return;

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var btn = document.getElementById("btnGuardarCliente");
            if (btn && btn.disabled) return;
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });

        var btnCerrar = document.getElementById("btnCerrarModalGuardado");
        if (btnCerrar) {
            btnCerrar.addEventListener("click", function () {
                window.location.href = btnCerrar.getAttribute("data-href") || "/";
            });
        }
    }
})();
