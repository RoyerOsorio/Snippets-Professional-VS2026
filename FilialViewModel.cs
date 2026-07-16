namespace Vitamedica.Multiportal.UI.Models.ViewModels;

/// <summary>
/// Filial de un Cliente (dbo.MTP_SBGR_SUBGRUPO). Colección dinámica dentro de
/// ClienteViewModel.Filiales — el usuario puede agregar, quitar o dejar vacía
/// esta lista (Sección 2 del formulario, ver _ClienteForm.cshtml).
/// Fase sin persistencia: sin anotaciones de base de datos, solo el contrato
/// de campos que la Sección 2 necesita capturar (imagen de referencia SubGrupo).
/// </summary>
public class FilialViewModel
{
    public int? Id { get; set; } // SBGR_NID

    public string? NombreORazonSocial { get; set; } // SBGR_DESCASEGURADORA
    public string? Rfc { get; set; } // SBGR_RFC
    public string? Telefono { get; set; } // SBGR_TELEFONO
    public string? Direccion { get; set; } // SBGR_DIRECCION
    public string? NombreContacto { get; set; } // SBGR_NOMCONTACTO
    public string? DescripcionCorta { get; set; } // SBGR_DESCRIPCION_CORTA
}
