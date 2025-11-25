// app.js

//programas = [];

// --- 1. LÓGICA DE CARGA DE DATOS (al inicio) ---

document.addEventListener('DOMContentLoaded', () => {
    // 1.1 Carga de datos del JSON
    cargarProgramas();

    // 1.2 Inicializa Tooltips de Bootstrap (para WhatsApp)
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
});

/**
 * Carga los datos de programas.json y renderiza el catálogo inicial.
 */
async function cargarProgramas() {
    // app.js

    // Nota: db ya está inicializado en la sección <script> de index.html

    let programas = []; // Mantenemos la variable global para el filtrado

    document.addEventListener('DOMContentLoaded', () => {
    // La inicialización de Firebase ya ocurre en index.html
    cargarProgramas();
    // ... (Inicializa Tooltips)
})};


/**
 * Carga los programas directamente desde Firestore.
 */
async function cargarProgramas() {
    const container = document.getElementById('programas-container');
    container.innerHTML = `<div class="col-12 text-center p-5"><div class="spinner-border text-acento" role="status"></div><p>Cargando programas...</p></div>`;

    try {
        // Obtenemos todos los documentos de la colección 'programas'
        const snapshot = await db.collection('programas').get();
        
        programas = snapshot.docs.map(doc => ({
            id: doc.id, // Usamos el ID de Firestore como ID único
            ...doc.data()
        }));

        renderizarProgramas(programas);
    } catch (error) {
        console.error("Error al cargar programas desde Firebase:", error);
        container.innerHTML = `
            <div class="col-12 alert alert-danger" role="alert">
                <h4 class="alert-heading">Error de Conexión a Base de Datos</h4>
                <p>No se pudieron cargar los programas. Verifique su conexión a internet y las credenciales de Firebase.</p>
            </div>
        `;
    }
}

    // *** El resto de funciones (crearCardPrograma, renderizarProgramas, filtrarProgramas, mostrarDetalle) permanece IGUAL,
    //     ya que trabajan con la variable global 'programas' que acabamos de llenar. ***

// --- 2. LÓGICA DE RENDERIZADO DEL CATÁLOGO ---

/**
 * Genera la tarjeta HTML para un programa específico.
 * @param {object} programa - Objeto con los datos del programa.
 * @returns {string} - HTML de la tarjeta.
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
 * @param {Array<object>} listaProgramas - La lista de programas a mostrar.
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

// --- 3. FUNCIONALIDAD DE FILTRADO Y BÚSQUEDA ---

/**
 * Filtra los programas basándose en la barra de búsqueda y el selector de categoría.
 */
function filtrarProgramas() {
    const textoBusqueda = document.getElementById('buscador').value.toLowerCase();
    const categoriaSeleccionada = document.getElementById('filtroCategoria').value;

    const programasFiltrados = programas.filter(programa => {
        // 1. Filtrar por texto (título, descripción o tags)
        const coincideBusqueda = 
            programa.titulo.toLowerCase().includes(textoBusqueda) ||
            programa.descripcionCorta.toLowerCase().includes(textoBusqueda) ||
            programa.descripcionDetallada.toLowerCase().includes(textoBusqueda) ||
            programa.tags.some(tag => tag.toLowerCase().includes(textoBusqueda));

        // 2. Filtrar por categoría
        const coincideCategoria = 
            !categoriaSeleccionada || programa.categoria === categoriaSeleccionada;

        return coincideBusqueda && coincideCategoria;
    });

    renderizarProgramas(programasFiltrados);
}


// --- 4. LÓGICA DEL DETALLE (MODAL) ---

/**
 * Muestra el modal con la información detallada del programa.
 * @param {number} id - El ID del programa.
 */
function mostrarDetalle(id) {
    console.log("Intentando mostrar detalle para ID:", id);
    const programa = programas.find(p => p.id === id);

    if (!programa){
        console.error("Programa no encontrado con ID:", id);
        return;}

    // Actualizar el contenido del Modal
    document.getElementById('detalleModalLabel').textContent = programa.titulo;
    const contenidoModal = document.getElementById('detalle-contenido');
    
    // Lista de contenido/temario
    const temarioList = programa.contenido.map(item => `<li class="list-group-item"><i class="bi bi-check-circle-fill text-acento me-2"></i>${item}</li>`).join('');

    contenidoModal.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-6">
                <img src="${programa.imagenUrl}" class="img-fluid rounded shadow-sm" alt="${programa.titulo}">
            </div>
            <div class="col-md-6">
                <p class="lead fw-bold">${programa.descripcionCorta}</p>
                <p>${programa.descripcionDetallada}</p>
                <div class="mb-2">
                    <span class="badge bg-dark me-2"><i class="bi bi-clock"></i> ${programa.duracion}</span>
                    <span class="badge bg-dark"><i class="bi bi-geo-alt"></i> ${programa.modalidad}</span>
                </div>
            </div>
        </div>
        
        <h4 class="text-acento mt-3">Contenido y Temario</h4>
        <ul class="list-group list-group-flush mb-4">
            ${temarioList}
        </ul>
        
        <h4 class="text-acento">Perfil del Egresado</h4>
        <p>${programa.perfilEgresado}</p>

        <h4 class="text-acento">Requisitos</h4>
        <p>${programa.requisitos}</p>
    `;

    // Mostrar el modal
    const detalleModal = new bootstrap.Modal(document.getElementById('detalleModal'));
    detalleModal.show();
}

// --- 5. LÓGICA DE LA SPA (Mostrar/Ocultar Secciones) ---

/**
 * Maneja el cambio entre las secciones de la SPA.
 * @param {string} sectionId - ID de la sección a mostrar ('catalogo', 'contacto', 'admin').
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
        // Asegurarse de que el catálogo se refresque si volvemos a él
        if (sectionId === 'catalogo') {
            filtrarProgramas();
        }
    }
}

// --- 6. SIMULACIÓN DE CÁRGA ADMIN ---

/**
 * Simula el proceso de guardar un nuevo programa desde la interfaz de administración.
 */
async function simularCargaAdmin() {
    const titulo = document.getElementById('adminTitulo').value;
    const categoria = document.getElementById('adminCategoria').value;
    const estado = document.getElementById('adminEstado').value;
    const descripcion = document.getElementById('adminDescripcion').value;
    const imagenUrl = document.getElementById('adminImagenUrl').value;
    const contenidoTexto = document.getElementById('adminContenido').value;

    if (!titulo || estado === 'Inactivo') {
        alert('Simulación FALLIDA:\nEl programa debe tener un Título y estar Activo para la carga.');
        return;
    }

    try {
        // Crear el objeto del nuevo programa
        const nuevoPrograma = {
            titulo,
            categoria,
            estado,
            descripcionCorta: descripcion,
            descripcionDetallada: "Descripción detallada por defecto...", // Puedes expandir esto
            imagenUrl: imagenUrl || "https://picsum.photos/400/250?random=10",
            duracion: "A definir",
            modalidad: "A definir",
            tags: titulo.toLowerCase().split(' '),
            contenido: contenidoTexto.split(/[\n,-]/).map(s => s.trim()).filter(s => s.length > 0), // Convierte texto plano a array
            perfilEgresado: "Egresado listo para el mercado laboral.",
            requisitos: "Sin requisitos."
        };

        // Guardar el nuevo programa en la colección 'programas'
        await db.collection('programas').add(nuevoPrograma);

        alert(`
            ✅ ¡Carga Exitosa! (Guardado en Firebase)
            
            Programa: "${titulo}"
            Estado: ${estado}
        `);

        // Recargar el catálogo después de añadir el nuevo programa
        document.getElementById('adminForm').reset();
        cargarProgramas(); // Refresca el listado para ver el nuevo item
        showSection('catalogo'); // Vuelve al catálogo
        
    } catch (error) {
        console.error("Error al guardar programa en Firebase:", error);
        alert(`❌ Error al guardar: ${error.message}`);
    }
}