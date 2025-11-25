// app.js

// ⚠️ Variable GLOBAL para almacenar el catálogo.
// NO USAR 'let' o 'const' aquí si la inicializaste en el <script> de index.html
// Si NO la inicializaste en index.html, usa:
let programas = []; 

// ---------------------------------------------------
// --- 1. LÓGICA DE CARGA DE DATOS (INICIALIZACIÓN) ---
// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1.1 Carga inicial del catálogo desde Firestore
    cargarProgramas();

    // 1.2 Inicializa Tooltips de Bootstrap (para WhatsApp)
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});


/**
 * Carga los programas directamente desde Firestore y actualiza la variable global 'programas'.
 */
async function cargarProgramas() {
    const container = document.getElementById('programas-container');
    container.innerHTML = `<div class="col-12 text-center p-5"><div class="spinner-border text-acento" role="status"></div><p>Cargando programas...</p></div>`;

    try {
        // Se asume que 'db' está inicializado globalmente en index.html
        const snapshot = await db.collection('programas').get();
        
        // 🚨 CORRECCIÓN: Llenamos la variable global 'programas' (sin 'let')
        programas = snapshot.docs.map(doc => ({
            id: doc.id, // ID de Firestore (string)
            ...doc.data()
        }));

        renderizarProgramas(programas);
    } catch (error) {
        console.error("❌ Error al cargar programas desde Firebase:", error);
        container.innerHTML = `
            <div class="col-12 alert alert-danger" role="alert">
                <h4 class="alert-heading">Error de Conexión a Base de Datos</h4>
                <p>Verifique su conexión a internet, credenciales de Firebase, y reglas de seguridad de Firestore (deben permitir la lectura).</p>
            </div>
        `;
    }
}

// ---------------------------------------------------
// --- 2. LÓGICA DE RENDERIZADO Y TARJETAS ---
// ---------------------------------------------------

/**
 * Genera la tarjeta HTML para un programa específico.
 */
function crearCardPrograma(programa) {
    return `
        <div class="col">
            <div class="card h-100 card-programa shadow-sm">
                <img src="${programa.imagenUrl}" class="card-img-top" alt="Imagen representativa de ${programa.titulo}">
                <div class="card-body d-flex flex-column">
                    <span class="badge bg-acento mb-2 align-self-start">${programa.categoria}</span>
                    <h5 class="card-title fw-bold">${programa.titulo}</h5>
                    <p class="card-text text-muted mb-3">${programa.descripcionCorta}</p>
                    <div class="mt-auto">
                        <p class="mb-2 small">
                            <i class="bi bi-clock me-1 text-acento"></i> Duración: <strong>${programa.duracion}</strong>
                        </p>
                        <p class="mb-3 small">
                            <i class="bi bi-geo-alt me-1 text-acento"></i> Modalidad: <strong>${programa.modalidad}</strong>
                        </p>
                        <button class="btn btn-sm btn-outline-dark w-100" onclick="mostrarDetalle('${programa.id}')">
                            <i class="bi bi-info-circle me-1"></i> Ver Detalles
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza el conjunto de programas en el contenedor.
 */
function renderizarProgramas(listaProgramas) {
    const container = document.getElementById('programas-container');
    container.innerHTML = '';
    
    if (listaProgramas.length === 0) {
        container.innerHTML = `
            <div class="col-12 alert alert-warning text-center" role="alert">
                No se encontraron programas que coincidan con los criterios de búsqueda.
            </div>
        `;
        return;
    }

    listaProgramas.forEach(programa => {
        container.innerHTML += crearCardPrograma(programa);
    });
}

// ---------------------------------------------------
// --- 3. FUNCIONALIDAD DE FILTRADO Y BÚSQUEDA ---
// ---------------------------------------------------

/**
 * Filtra los programas basándose en la barra de búsqueda y el selector de categoría.
 */
function filtrarProgramas() {
    const textoBusqueda = document.getElementById('buscador').value.toLowerCase();
    const categoriaSeleccionada = document.getElementById('filtroCategoria').value;

    const programasFiltrados = programas.filter(programa => {
        // 1. Filtrar por texto (título, descripción o tags)
        const tags = programa.tags && Array.isArray(programa.tags) ? programa.tags : [];
        const coincideBusqueda = 
            programa.titulo.toLowerCase().includes(textoBusqueda) ||
            programa.descripcionCorta.toLowerCase().includes(textoBusqueda) ||
            (programa.descripcionDetallada ? programa.descripcionDetallada.toLowerCase().includes(textoBusqueda) : false) ||
            tags.some(tag => tag.toLowerCase().includes(textoBusqueda));

        // 2. Filtrar por categoría
        const coincideCategoria = 
            !categoriaSeleccionada || programa.categoria === categoriaSeleccionada;

        return coincideBusqueda && coincideCategoria;
    });

    renderizarProgramas(programasFiltrados);
}

// ---------------------------------------------------
// --- 4. LÓGICA DEL DETALLE (MODAL) ---
// ---------------------------------------------------

/**
 * Muestra el modal con la información detallada del programa.
 */
function mostrarDetalle(id) {
    console.log("Intentando mostrar detalle para ID:", id);
    // 🚨 CORRECCIÓN: El operador '===' funciona bien ya que el ID de Firebase es STRING.
    const programa = programas.find(p => p.id === id);

    if (!programa){
        console.error("Programa no encontrado con ID:", id);
        return;
    }

    // --- 1. INYECCIÓN DEL CONTENIDO PRINCIPAL ---
    
    document.getElementById('detalleModalLabel').textContent = programa.titulo;
    const contenidoModal = document.getElementById('detalle-contenido');
    
    // Si 'contenido' no es un array o es undefined, usamos un array vacío para evitar errores
    const contenidoArray = programa.contenido && Array.isArray(programa.contenido) ? programa.contenido : [];
    const temarioList = contenidoArray.map(item => `<li class="list-group-item"><i class="bi bi-check-circle-fill text-acento me-2"></i>${item}</li>`).join('');

    contenidoModal.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-6">
                <img src="${programa.imagenUrl}" class="img-fluid rounded shadow-sm" alt="${programa.titulo}">
            </div>
            <div class="col-md-6">
                <p class="lead fw-bold">${programa.descripcionCorta}</p>
                <p>${programa.descripcionDetallada || 'No hay descripción detallada.'}</p>
                <div class="mb-2">
                    <span class="badge bg-dark me-2"><i class="bi bi-clock"></i> ${programa.duracion || 'N/A'}</span>
                    <span class="badge bg-dark"><i class="bi bi-geo-alt"></i> ${programa.modalidad || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <h4 class="text-acento mt-3">Contenido y Temario</h4>
        <ul class="list-group list-group-flush mb-4">
            ${temarioList.length > 0 ? temarioList : '<li class="list-group-item">Contenido no especificado.</li>'}
        </ul>
        
        <h4 class="text-acento">Perfil del Egresado</h4>
        <p>${programa.perfilEgresado || 'N/A'}</p>

        <h4 class="text-acento">Requisitos</h4>
        <p>${programa.requisitos || 'N/A'}</p>
    `;
    
    // --- 2. INYECCIÓN DEL FOOTER Y BOTONES (Edit y Delete) ---
    
    document.getElementById('detalle-footer').innerHTML = `
        <a href="#" class="btn btn-lg btn-acento" onclick="alert('Simulación: Solicitud de inscripción para ${programa.titulo}')">
            Inscríbete / Solicita Información
        </a>
        <button class="btn btn-outline-secondary me-2" onclick="cargarFormularioEdicion('${programa.id}')">
            <i class="bi bi-pencil"></i> Editar (Admin)
        </button>
        <button class="btn btn-outline-danger" onclick="eliminarPrograma('${programa.id}')">
            <i class="bi bi-trash"></i> Eliminar (Admin)
        </button>
    `;

    // --- 3. APERTURA FINAL DEL MODAL ---
    
    const detalleModalElement = document.getElementById('detalleModal');
    let detalleModal = bootstrap.Modal.getInstance(detalleModalElement);
    if (!detalleModal) {
        detalleModal = new bootstrap.Modal(detalleModalElement);
    }
    
    detalleModal.show();
}

// ---------------------------------------------------
// --- 5. LÓGICA DE LA SPA (Mostrar/Ocultar Secciones) ---
// ---------------------------------------------------

/**
 * Maneja el cambio entre las secciones de la SPA.
 */
function showSection(sectionId) {
    document.querySelectorAll('.spa-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        if (sectionId === 'catalogo') {
            filtrarProgramas();
        }
    }
}

// ---------------------------------------------------
// --- 6. FUNCIONES DE ADMINISTRACIÓN (CRUD) ---
// ---------------------------------------------------

/**
 * Elimina un documento (programa) de la colección de Firestore.
 * 🚨 CORRECCIÓN: Solo mantenemos una definición de esta función.
 */
async function eliminarPrograma(id) {
    if (!confirm("¿Está seguro de que desea ELIMINAR este programa de forma permanente?")) {
        return;
    }

    try {
        await db.collection('programas').doc(id).delete();
        
        alert(`✅ Programa con ID: ${id} eliminado correctamente.`);

        cargarProgramas();

        const detalleModal = bootstrap.Modal.getInstance(document.getElementById('detalleModal'));
        if (detalleModal) {
            detalleModal.hide();
        }

    } catch (error) {
        console.error("❌ Error al eliminar el programa:", error);
        alert(`Error al eliminar: ${error.message}`);
    }
}

/**
 * Carga los datos de un programa existente en el formulario de administración para su edición.
 */
function cargarFormularioEdicion(id) {
    showSection('admin'); 

    const programa = programas.find(p => p.id === id);
    if (!programa) {
        alert("Programa no encontrado para edición.");
        return;
    }

    // 1. Configurar la interfaz para Edición
    document.querySelector('#admin h2').innerHTML = `Editar Programa <span class="text-acento">${programa.titulo}</span>`;
    document.getElementById('adminForm').setAttribute('data-programa-id', id);

    // 2. Llenar los campos del formulario
    document.getElementById('adminTitulo').value = programa.titulo;
    document.getElementById('adminCategoria').value = programa.categoria;
    document.getElementById('adminEstado').value = programa.estado || 'Activo';
    document.getElementById('adminImagenUrl').value = programa.imagenUrl;
    document.getElementById('adminDescripcion').value = programa.descripcionCorta;
    
    // Manejar contenido (temario) si existe, uniéndolo con saltos de línea
    const contenidoTexto = programa.contenido && Array.isArray(programa.contenido) ? programa.contenido.join('\n') : '';
    document.getElementById('adminContenido').value = contenidoTexto;

    // 3. Configurar el botón de acción
    document.querySelector('#adminForm button').textContent = "Guardar Cambios";
    document.querySelector('#adminForm button').setAttribute('onclick', 'guardarCambiosEdicion()');
}

/**
 * Guarda el nuevo programa (si no hay ID) o actualiza el existente (si hay ID).
 * 🚨 REFACTORIZACIÓN: Esta función ahora maneja AMBOS casos: Creación (add) y Edición (update).
 */
async function guardarCambiosEdicion() {
    const form = document.getElementById('adminForm');
    const id = form.getAttribute('data-programa-id');

    // Recoger datos del formulario
    const datosGuardar = {
        titulo: document.getElementById('adminTitulo').value,
        categoria: document.getElementById('adminCategoria').value,
        estado: document.getElementById('adminEstado').value,
        descripcionCorta: document.getElementById('adminDescripcion').value,
        imagenUrl: document.getElementById('adminImagenUrl').value,
        
        // Procesar temario y tags
        contenido: document.getElementById('adminContenido').value.split(/[\n,-]/).map(s => s.trim()).filter(s => s.length > 0),
        tags: document.getElementById('adminTitulo').value.toLowerCase().split(' '),
    };
    
    if (!datosGuardar.titulo || datosGuardar.estado === 'Inactivo') {
        alert('Fallo de Validación:\nEl programa debe tener un Título y estar Activo.');
        return;
    }

    try {
        if (id) {
            // Modo EDICIÓN: Usamos update()
            await db.collection('programas').doc(id).update(datosGuardar);
            alert(`✅ Edición Exitosa: Programa "${datosGuardar.titulo}" actualizado.`);
        } else {
            // Modo CREACIÓN (usando la misma lógica que simularCargaAdmin original)
            await db.collection('programas').add({
                ...datosGuardar,
                // Campos adicionales necesarios para creación
                descripcionDetallada: "Descripción detallada por defecto...",
                duracion: "A definir",
                modalidad: "A definir",
                perfilEgresado: "Egresado listo para el mercado laboral.",
                requisitos: "Sin requisitos."
            });
            alert(`✅ ¡Carga Exitosa! (Guardado en Firebase)`);
        }

        // Limpiar el estado y recargar la UI
        form.reset();
        form.removeAttribute('data-programa-id');
        cargarProgramas(); 
        showSection('catalogo');
        
        // Restaurar el botón para futuras creaciones (volver al modo "Simular Carga")
        document.querySelector('#admin h2').innerHTML = 'Admin <span class="text-acento">(Simulación de Carga Ágil)</span>';
        document.querySelector('#adminForm button').textContent = "Simular Carga de Programa";
        document.querySelector('#adminForm button').setAttribute('onclick', 'guardarCambiosEdicion()'); // Mantiene la función unificada
        
    } catch (error) {
        console.error("❌ Error al guardar/actualizar programa:", error);
        alert(`Error al guardar: ${error.message}`);
    }
}