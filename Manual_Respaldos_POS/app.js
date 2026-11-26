(function () {
  "use strict";

  var backupNodes = [
    {
      id: "ultimo",
      name: "llanomio_ULTIMO.db / pos_ULTIMO.db",
      badge: "Copia Maestra",
      isFolder: false,
      typeLabel: "Archivo Maestro SQLite",
      fullPath: "C:\\POS_BACKUPS\\llanomio_ULTIMO.db",
      description:
        "Contiene siempre la copia exacta del último respaldo exitoso del servidor. Es el primer archivo al que debes acudir si necesitas recuperar todo el sistema al estado más reciente.",
      format: "Base de datos SQLite 3 íntegra",
      retention: "Permanente (Inmune a purga automática)"
    },
    {
      id: "emergencia",
      name: "pos_EMERGENCIA_PRE_RESTAURACION.db",
      badge: "Salvaguarda",
      isFolder: false,
      typeLabel: "Respaldo de Rescate Automático",
      fullPath: "C:\\POS_BACKUPS\\pos_EMERGENCIA_PRE_RESTAURACION.db",
      description:
        "Se crea automáticamente un instante antes de restaurar cualquier otra base de datos o ejecutar un formateo de fábrica, permitiendo deshacer una restauración equivocada.",
      format: "Base de datos SQLite 3 íntegra",
      retention: "Permanente (Inmune a purga automática)"
    },
    {
      id: "historial",
      name: "historial\\",
      badge: "Últimos 15 .db",
      isFolder: true,
      typeLabel: "Subcarpeta de Historial Completo",
      fullPath: "C:\\POS_BACKUPS\\historial\\",
      description:
        "Guarda los respaldos completos fechados por cierre de turno, cierre de sesión, respaldo manual gerencial o apagado del servidor Windows.",
      format: "Archivos .db fechados al milisegundo",
      retention: "Rotación automática de las últimas 15 copias"
    },
    {
      id: "inventario",
      name: "inventario\\",
      badge: "JSON Legible",
      isFolder: true,
      typeLabel: "Auditoría de Catálogo y Stock",
      fullPath: "C:\\POS_BACKUPS\\inventario\\inventario_ULTIMO.json",
      description:
        "Exportación legible en texto estructurado JSON con todos los productos, códigos, precios de venta/alquiler, tallas y cantidades en stock.",
      format: "JSON UTF-8 (inventario_ULTIMO.json + histórico)",
      retention: "Archivo ULTIMO fijo + últimas 15 copias"
    },
    {
      id: "clientes",
      name: "clientes\\",
      badge: "JSON Legible",
      isFolder: true,
      typeLabel: "Auditoría de Directorio y Cartera",
      fullPath: "C:\\POS_BACKUPS\\clientes\\clientes_ULTIMO.json",
      description:
        "Contiene el listado completo de clientes registrados, teléfonos, datos tributarios DIAN y cupos de crédito aprobados.",
      format: "JSON UTF-8 (clientes_ULTIMO.json + histórico)",
      retention: "Archivo ULTIMO fijo + últimas 15 copias"
    },
    {
      id: "facturas",
      name: "historial_facturas\\",
      badge: "JSON Legible",
      isFolder: true,
      typeLabel: "Auditoría de Operaciones y Abonos",
      fullPath: "C:\\POS_BACKUPS\\historial_facturas\\facturas_ULTIMO.json",
      description:
        "Resguardo estructurado de las últimas 500 facturas emitidas incluyendo sus prendas/ítems, depósitos en garantía y abonos recibidos.",
      format: "JSON UTF-8 (facturas_ULTIMO.json + histórico)",
      retention: "Archivo ULTIMO fijo + últimas 15 copias"
    },
    {
      id: "caja",
      name: "movimientos_caja\\",
      badge: "JSON Legible",
      isFolder: true,
      typeLabel: "Auditoría de Turnos y Arqueos",
      fullPath: "C:\\POS_BACKUPS\\movimientos_caja\\movimientos_caja_ULTIMO.json",
      description:
        "Conserva los últimos 100 turnos de cajeros y cierres consolidados con el desglose por efectivo, Nequi, Bancolombia, Daviplata y transferencias.",
      format: "JSON UTF-8 (movimientos_caja_ULTIMO.json + histórico)",
      retention: "Archivo ULTIMO fijo + últimas 15 copias"
    },
    {
      id: "gastos",
      name: "gastos_operativos\\",
      badge: "JSON Legible",
      isFolder: true,
      typeLabel: "Auditoría de Gastos y Nómina",
      fullPath: "C:\\POS_BACKUPS\\gastos_operativos\\gastos_ULTIMO.json",
      description:
        "Respalda las últimas 500 salidas operativas, pagos de nómina, empleados y categorías contables configuradas.",
      format: "JSON UTF-8 (gastos_ULTIMO.json + histórico)",
      retention: "Archivo ULTIMO fijo + últimas 15 copias"
    }
  ];

  var folderSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
  var fileSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';

  var treeEl = document.getElementById("folderTree");
  var inspType = document.getElementById("inspType");
  var inspTitle = document.getElementById("inspTitle");
  var inspPath = document.getElementById("inspPath");
  var inspDesc = document.getElementById("inspDesc");
  var inspFormat = document.getElementById("inspFormat");
  var inspRetention = document.getElementById("inspRetention");

  function selectNode(nodeId) {
    var selected = backupNodes[0];
    for (var i = 0; i < backupNodes.length; i++) {
      if (backupNodes[i].id === nodeId) {
        selected = backupNodes[i];
        break;
      }
    }

    inspType.textContent = selected.typeLabel;
    inspTitle.textContent = selected.name;
    inspPath.textContent = selected.fullPath;
    inspDesc.textContent = selected.description;
    inspFormat.textContent = selected.format;
    inspRetention.textContent = selected.retention;

    var items = treeEl.querySelectorAll(".tree-item");
    for (var j = 0; j < items.length; j++) {
      items[j].classList.toggle("selected", items[j].getAttribute("data-id") === selected.id);
    }
  }

  function renderTree(filterText) {
    var query = (filterText || "").toLowerCase().trim();
    treeEl.innerHTML = "";

    for (var i = 0; i < backupNodes.length; i++) {
      var n = backupNodes[i];
      var haystack = (n.name + " " + n.description + " " + n.fullPath).toLowerCase();
      if (query && haystack.indexOf(query) === -1) continue;

      var li = document.createElement("li");
      li.className = "tree-item";
      li.setAttribute("data-id", n.id);
      li.innerHTML =
        '<div class="tree-item-left">' +
        (n.isFolder ? folderSvg : fileSvg) +
        "<span>" +
        n.name +
        "</span></div>" +
        '<span class="tree-badge">' +
        n.badge +
        "</span>";

      li.addEventListener("click", (function (id) {
        return function () {
          selectNode(id);
        };
      })(n.id));

      treeEl.appendChild(li);
    }

    var firstVisible = treeEl.querySelector(".tree-item");
    if (firstVisible) {
      selectNode(firstVisible.getAttribute("data-id"));
    }
  }

  // Navegación por pestañas
  var tabButtons = document.querySelectorAll(".tab-btn");
  var tabPanels = document.querySelectorAll(".tab-panel");

  function activateTab(tabName) {
    for (var i = 0; i < tabButtons.length; i++) {
      var isTarget = tabButtons[i].getAttribute("data-tab") === tabName;
      tabButtons[i].classList.toggle("active", isTarget);
      tabButtons[i].setAttribute("aria-selected", isTarget ? "true" : "false");
    }
    for (var j = 0; j < tabPanels.length; j++) {
      tabPanels[j].classList.toggle("active", tabPanels[j].id === "tab-" + tabName);
    }
  }

  for (var k = 0; k < tabButtons.length; k++) {
    tabButtons[k].addEventListener("click", function () {
      activateTab(this.getAttribute("data-tab"));
    });
  }

  // Buscador global instantáneo
  var searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", function () {
    var q = this.value.toLowerCase().trim();
    renderTree(q);

    if (!q) return;
    for (var i = 0; i < tabPanels.length; i++) {
      if (tabPanels[i].textContent.toLowerCase().indexOf(q) !== -1) {
        activateTab(tabPanels[i].id.replace("tab-", ""));
        break;
      }
    }
  });

  // Botones de copiado de ruta
  var toast = document.getElementById("toast");
  var toastTimer = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("visible");
    }, 2200);
  }

  var copyButtons = document.querySelectorAll(".copy-btn");
  for (var c = 0; c < copyButtons.length; c++) {
    copyButtons[c].addEventListener("click", function () {
      var text = this.getAttribute("data-copy") || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showToast("Copiado: " + text);
        });
      } else {
        var temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        showToast("Copiado: " + text);
      }
    });
  }

  renderTree("");
})();
