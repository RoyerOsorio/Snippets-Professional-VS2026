namespace Vitamedica.Multiportal.UI.Models.Shared
{
    /// <summary>
    /// Contrato del componente Date Picker (variante fecha única).
    /// Origen: Components_Development_Guide_v1.1.md §22.4 / Biblioteca_de_Componentes_v1.0.md §5.
    /// Consumido por Views/Shared/Partials/_DatePicker.cshtml.
    /// </summary>
    public class DatePickerViewModel
    {
        /// <summary>Id del input y del &lt;label for&gt; asociado. Obligatorio.</summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>Atributo name del input, usado por model binding. Obligatorio.</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Texto del label visible. Obligatorio.</summary>
        public string Label { get; set; } = string.Empty;

        /// <summary>Valor inicial en formato dd/mm/aaaa. Opcional.</summary>
        public string? Value { get; set; }

        /// <summary>Si el campo es obligatorio en el formulario. Opcional, por defecto false.</summary>
        public bool Required { get; set; } = false;

        /// <summary>Clase CSS adicional para el contenedor .field (ej. control de ancho). Opcional.</summary>
        public string? WrapperCssClass { get; set; }
    }
}
