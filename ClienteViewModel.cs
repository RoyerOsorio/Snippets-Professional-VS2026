namespace Vitamedica.Multiportal.UI.Models.ViewModels;

/// <summary>
/// Cliente (dbo.MTP_GRGR_GRUPO). Alimenta el único formulario compartido
/// Views/Shared/Partials/_ClienteForm.cshtml, usado tanto por CreacionCliente
/// (modelo vacío) como por DetalleCliente (modelo precargado).
///
/// Solo se exponen los campos de negocio de la imagen de referencia Grupo.
/// Se excluyen deliberadamente los campos técnicos/de auditoría de esa misma
/// tabla (usuario y fecha de alta/actualización, proceso de alta/actualización,
/// contraseñas de biometría, clave CNSF, ck, archivo de logo, catálogo/domicilio
/// fiscal por id): son datos que el sistema gestiona por sí mismo o que
/// pertenecen a un flujo de configuración distinto, no a la captura manual de
/// un Cliente. GRGR_ESTATUS tampoco es un campo del formulario: se gestiona
/// exclusivamente desde el Index (Desactivar/Reactivar), igual que dicta el
/// patrón CRUD oficial del proyecto.
///
/// Fase sin persistencia: no hay anotaciones de validación de framework ni
/// binding real a base de datos — la validación de campos requeridos y de
/// selección mínima ocurre en cliente-form.js, tal como ya ocurre en
/// ReembolsoSolicitud.
/// </summary>
public class ClienteViewModel
{
    public int? Id { get; set; } // GRGR_NID

    public string? NombreORazonSocial { get; set; } // GRGR_DESCASEGURADORA
    public string? Rfc { get; set; } // GRGR_RFC
    public string? Direccion { get; set; } // GRGR_DIRECCION
    public string? Telefono { get; set; } // GRGR_TELEFONO
    public string? NombreContacto { get; set; } // GRGR_NOMCONTACTO
    public string? TelefonoContacto { get; set; } // GRGR_TELCONTACTO
    public string? TelefonoInterior { get; set; } // GRGR_TEL_INTERIOR
    public string? TelefonoAtencion { get; set; } // GRGR_TELATENCION
    public string? DescripcionCorta { get; set; } // GRGR_DESCRIPCION_CORTA
    public string? FechaCorte { get; set; } // GRGR_FECHA_CORTE
    public string? FechaDiaHabil { get; set; } // GRGR_FECHA_DIA_HABIL
    public string? PrestadorServicio { get; set; } // GRGR_PRESTADOR_SERVICIO
    public bool ImprimeCredencial { get; set; } // GRGR_IMPRIME_CREDENCIAL

    /// <summary>Solo lectura fuera de este formulario. Activo por defecto al crear.</summary>
    public string Estatus { get; set; } = "Activo"; // GRGR_ESTATUS

    public List<FilialViewModel> Filiales { get; set; } = new();

    public List<string> ModulosSeleccionados { get; set; } = new();
    public List<string> CoberturasSeleccionadas { get; set; } = new();
    public List<string> DocumentosSeleccionados { get; set; } = new();

    // --------------------------------------------------------------------
    // Catálogos hardcodeados de esta fase (sin persistencia, sin servicio).
    // Módulos y Coberturas reutilizan nombres ya existentes en el sistema
    // (menú de navegación y categorías de ReembolsoSolicitud) en vez de
    // inventar un vocabulario de negocio nuevo.
    // --------------------------------------------------------------------
    public static readonly IReadOnlyList<string> CatalogoModulos = new[]
    {
        "Tablero", "Reembolsos", "Pagos", "Retroceder Trámite", "Consultar Solicitudes", "Configuración"
    };

    public static readonly IReadOnlyList<string> CatalogoCoberturas = new[]
    {
        "Consultas", "Medicamentos", "Vacunas", "Laboratorio y Gabinete",
        "Cuidados Preventivos (Enfermería, Terapias)", "Exámenes de Audición", "Lentes", "Gastos en el Extranjero"
    };

    public static readonly IReadOnlyList<string> CatalogoDocumentos = new[]
    {
        "Receta Médica", "Factura XML / PDF", "Factura Hospital", "Orden Médica"
    };
}
