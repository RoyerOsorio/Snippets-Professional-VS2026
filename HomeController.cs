using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
//using Vitamedica.Multiportal.Application.Interfaces;
using Vitamedica.Multiportal.UI.Models;
using Vitamedica.Multiportal.UI.Models.ActiveDirectory;
using Vitamedica.Multiportal.UI.Models.ViewModels;
using Vitamedica.Multiportal.UI.Services;

namespace Vitamedica.Multiportal.UI.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private readonly MultiportalApiClient _multiportalApiClient;
        public HomeController(MultiportalApiClient multiportalApiClient)
        {
            _multiportalApiClient = multiportalApiClient;
        }
        public async Task<IActionResult> Index()
        {
            if (User != null && User.Identity != null && User.Identity.IsAuthenticated)
            {
                try
                {
                    string name = User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;

                    var _user = await _multiportalApiClient.GetUserProfile(name);
                    if(_user != null)
                        return View(new UserProfile
                        {
                            ApellidoMaterno = _user.ApellidoMaterno,
                            ApellidoPaterno = _user.ApellidoPaterno,
                            Clave = _user.Clave,
                            CorreoElectronico = _user.CorreoElectronico,
                            GrgrCk = _user.GrgrCk,
                            MemeCk = _user.MemeCk,
                            Nombre = _user.Nombre,
                            NombreCompleto = _user.NombreCompleto,
                            NombreORazonSocial = _user.NombreORazonSocial,
                            NombreUsuario = _user.NombreUsuario,
                            NominaEmpleado = _user.NominaEmpleado,
                            PrprId = _user.PrprId,
                            RFC = _user.RFC,
                            TipoUsuario = _user.TipoUsuario,
                            TipoUsuarioDescripcion = _user.TipoUsuarioDescripcion
                        });

                    //var _user = _activeDirectoryApplication.GetUser(name);
                    //if (_user != null)
                    //    return View(new UserProfile
                    //    {
                    //        ApellidoMaterno = _user.ApellidoMaterno,
                    //        ApellidoPaterno = _user.ApellidoPaterno,
                    //        Clave = _user.Clave,
                    //        CorreoElectronico = _user.CorreoElectronico,
                    //        GrgrCk = _user.GrgrCk,
                    //        MemeCk = _user.MemeCk,
                    //        Nombre = _user.Nombre,
                    //        NombreCompleto = _user.NombreCompleto,
                    //        NombreORazonSocial = _user.NombreORazonSocial,
                    //        NombreUsuario = _user.NombreUsuario,
                    //        NominaEmpleado = _user.NominaEmpleado,
                    //        PrprId = _user.PrprId,
                    //        RFC = _user.RFC,
                    //        TipoUsuario = (ActiveDirectory.Model.ViewModels.TipoUsuario)_user.TipoUsuario,
                    //        TipoUsuarioDescripcion = _user.TipoUsuarioDescripcion
                    //    });
                }
                catch (Exception ex)
                {

                }
            }
            return View(new UserProfile());
        }

        public IActionResult ReembolsoSolicitud()
        {
            if (User != null && User.Identity != null && User.Identity.IsAuthenticated)
            {
                try
                {
                    return View();
                }
                catch (Exception ex)
                {

                }
            }
            return View(new UserProfile());
        }

        public IActionResult DetalleSolicitud()
        {
            if (User != null && User.Identity != null && User.Identity.IsAuthenticated)
            {
                try
                {
                    return View();
                }
                catch (Exception ex)
                {

                }
            }
            return View(new UserProfile());
        }

        public IActionResult PagoSolicitud()
        {
            if (User != null && User.Identity != null && User.Identity.IsAuthenticated)
            {
                try
                {
                    return View();
                }
                catch (Exception ex)
                {

                }
            }
            return View(new UserProfile());
        }

        public IActionResult Configuracion()
        {
            if (User != null && User.Identity != null && User.Identity.IsAuthenticated)
            {
                try
                {
                    return View();
                }
                catch (Exception ex)
                {

                }
            }
            return View(new UserProfile());
        }

        // Listado de Clientes (Patrón UI-001 CRUD Maestro). Fase sin persistencia:
        // datos hardcodeados, sin servicio ni repositorio.
        public IActionResult Clientes()
        {
            var clientes = new List<ClienteViewModel>
            {
                new ClienteViewModel
                {
                    Id = 1,
                    NombreORazonSocial = "Grupo Modelo",
                    Rfc = "GMO850101AB1",
                    Telefono = "3336012000",
                    NombreContacto = "Laura Fuentes",
                    DescripcionCorta = "GRPMOD",
                    Estatus = "Activo"
                },
                new ClienteViewModel
                {
                    Id = 2,
                    NombreORazonSocial = "Smurfit Kappa",
                    Rfc = "SKP970615C22",
                    Telefono = "5555230000",
                    NombreContacto = "Roberto Díaz",
                    DescripcionCorta = "SMURFIT",
                    Estatus = "Activo"
                },
                new ClienteViewModel
                {
                    Id = 3,
                    NombreORazonSocial = "Cliente Demo Inactivo",
                    Rfc = "CDI010101X11",
                    Telefono = "5511112222",
                    NombreContacto = "Ana Torres",
                    DescripcionCorta = "DEMOINA",
                    Estatus = "Inactivo"
                }
            };

            return View(clientes);
        }

        // Alta de Cliente — formulario compartido con DetalleCliente vía
        // Views/Shared/Partials/_ClienteForm.cshtml. Modelo vacío.
        public IActionResult CreacionCliente()
        {
            return View(new ClienteViewModel());
        }

        // Edición de Cliente — mismo formulario que CreacionCliente, precargado
        // con datos de ejemplo. Fase sin persistencia: no consulta ningún origen
        // de datos real, "id" solo identifica cuál registro demo mostrar.
        public IActionResult DetalleCliente(int id)
        {
            var cliente = new ClienteViewModel
            {
                Id = id,
                NombreORazonSocial = "Grupo Modelo",
                Rfc = "GMO850101AB1",
                Direccion = "Av. Revolución 1000, Guadalajara, Jalisco",
                Telefono = "3336012000",
                NombreContacto = "Laura Fuentes",
                TelefonoContacto = "3336012001",
                TelefonoInterior = "102",
                TelefonoAtencion = "018001234567",
                DescripcionCorta = "GRPMOD",
                FechaCorte = "25/07/2026",
                FechaDiaHabil = "05/08/2026",
                PrestadorServicio = "Bupa México",
                ImprimeCredencial = true,
                Estatus = "Activo",
                Filiales = new List<FilialViewModel>
                {
                    new FilialViewModel
                    {
                        Id = 1,
                        NombreORazonSocial = "Grupo Modelo — Planta Guadalajara",
                        Rfc = "GMO850101AB2",
                        Telefono = "3336012050",
                        NombreContacto = "Mario Solís",
                        DescripcionCorta = "GDL"
                    }
                },
                ModulosSeleccionados = new List<string> { "Reembolsos", "Pagos" },
                CoberturasSeleccionadas = new List<string> { "Consultas", "Medicamentos" },
                DocumentosSeleccionados = new List<string> { "Receta Médica", "Factura XML / PDF" }
            };

            return View(cliente);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
