// app.js

// ⚠️ Variables Globales
let programas = []; 
let userIsAdmin = false; // Estado de autenticación

// ---------------------------------------------------
// --- 1. LÓGICA DE CARGA Y AUTENTICACIÓN ---
// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    cargarProgramas();

    // Inicializa Tooltips de Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Escuchar el estado de autenticación (Firebase Auth)
    auth.onAuthStateChanged(user => {
        const authButton = document.getElementById('adminAuthButton');
        if (user) {
            // USUARIO AUTENTICADO
            userIsAdmin = true;
            authButton.textContent = 'Salir (Admin)';
            authButton.classList.remove('btn-dark');
            authButton.classList.add('btn-danger');
            
            // Si estaba en la vista de login, redirige al dashboard
            if (document.getElementById('login').classList.contains('active')) {
                showSection('admin-dashboard');
            }
        } else {
            // USUARIO NO AUTENTICADO
            userIsAdmin = false;
            authButton.textContent = 'Admin CTTC';
            authButton.classList.remove('btn-danger');
            authButton.classList.add('btn-dark');
            
            // Si estaba en una vista admin, redirige al catálogo
            if (document.getElementById('admin-dashboard').classList.contains('active') || document.getElementById('admin-form').classList.contains('active')) {
                showSection('catalogo');
            }
        }
    });
});


/**
 * Carga los programas desde Firestore, actualiza la variable global 'programas', y renderiza la UI.
 */
async function cargarProgramas() {
    const container = document.getElementById('programas-container');
    const containerAdminList = document.getElementById('admin-list-container');
    
    // Muestra spinner en ambas áreas (catálogo público y lista admin)
    const spinnerHtml = `<div class="col-12 text-center p-5"><div class="spinner-border text-acento" role="status"></div><p>Cargando programas...</p></div>`;
    container.innerHTML = spinnerHtml;
    if (containerAdminList) containerAdminList.innerHTML = spinnerHtml;

    try {
        const snapshot = await db.collection('programas').get();
        
        programas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderizarProgramas(programas);
        
        // Si el admin está logueado y en la vista de dashboard, actualiza la lista
        if (userIsAdmin && containerAdminList && document.getElementById('admin-dashboard').classList.contains('active')) {
            renderAdminDashboard(programas);
        }
    } catch (error) {
        console.error("❌ Error al cargar programas desde Firebase:", error);
        container.innerHTML = `
            <div class="col-12 alert alert-danger" role="alert">
                <h4 class="alert-heading">Error de Conexión</h4>
                <p>Verifique su conexión y las reglas de seguridad de Firestore.</p>
            </div>
        `;
        if (containerAdminList) containerAdminList.innerHTML = `<p class="alert alert-danger">Error al cargar datos de administración.</p>`;
    }
}

// ---------------------------------------------------
// --- 2. FUNCIONES DE AUTENTICACIÓN ---
// ---------------------------------------------------

/**
 * Maneja el clic en el botón "Admin CTTC" (Login/Logout).
 */
function handleAdminAuth() {
    if (userIsAdmin) {
        logoutAdmin();
    } else {
        // Al hacer clic, si no está logueado, va a la pantalla de login
        showSection('login'); 
    }
}

/**
 * Intenta iniciar sesión con Firebase Auth.
 */
async function loginAdmin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const authMessage = document.getElementById('authMessage');

    authMessage.style.display = 'none';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged se encargará de showSection('admin-dashboard')
    } catch (error) {
        console.error("Error de inicio de sesión:", error.message);
        authMessage.textContent = "Error: Credenciales inválidas o cuenta no registrada.";
        authMessage.style.display = 'block';
    }
}

/**
 * Cierra la sesión del administrador.
 */
function logoutAdmin() {
    auth.signOut()
        .then(() => {
            // onAuthStateChanged se encargará de la redirección
        })
        .catch(error => {
            console.error("Error al cerrar sesión:", error.message);
        });
}

// ---------------------------------------------------
// --- 3. LÓGICA DE LA SPA (Mostrar/Ocultar Secciones) ---
// ---------------------------------------------------

/**
 * Maneja el cambio entre las secciones de la SPA.
 */
function showSection(sectionId, clearForm = false) {
    // 1. Ocultar todas las secciones
    document.querySelectorAll('.spa-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    // 2. Verificar permisos para secciones de administración
    if (['admin-dashboard', 'admin-form'].includes(sectionId) && !userIsAdmin) {
        document.getElementById('login').style.display = 'block';
        document.getElementById('login').classList.add('active');
        return; // Detiene la ejecución, evita mostrar secciones protegidas
    }

    // 3. Mostrar la sección destino
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        
        // Lógica específica al entrar
        if (sectionId === 'catalogo') {
            filtrarProgramas();
        }
        if (sectionId === 'admin-dashboard') {
            cargarProgramas(); // Recarga y renderiza el dashboard
        }
        if (sectionId === 'admin-form' && clearForm) {
            // Modo "Crear Nuevo Programa"
            document.getElementById('adminForm').reset();
            document.getElementById('adminForm').removeAttribute('data-programa-id');
            document.getElementById('adminFormTitle').innerHTML = 'Crear Nuevo Programa <span class="text-acento"></span>';
            document.querySelector('#adminForm button').textContent = "Guardar Programa"; // Restaura texto del botón
        }
    }
}

// ---------------------------------------------------
// --- 4. RENDERIZADO DEL DASHBOARD ADMIN ---
// ---------------------------------------------------

/**
 * Renderiza la lista resumida para el panel de administración.
 */
function renderAdminDashboard(listaProgramas) {
    const container = document.getElementById('admin-list-container');
    if (!container) return; 

    if (listaProgramas.length === 0) {
        container.innerHTML = '<p class="text-center p-3">No hay programas registrados.</p>';
        return;
    }

    let tableHtml = `
        <table class="table table-hover align-middle">
            <thead>
                <tr>
                    <th>Título</th>
                    <th>Categoría</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    listaProgramas.forEach(programa => {
        const estadoClass = programa.estado === 'Activo' ? 'badge bg-success' : 'badge bg-secondary';
        tableHtml += `
            <tr>
                <td class="fw-bold">${programa.titulo}</td>
                <td>${programa.categoria}</td>
                <td><span class="${estadoClass}">${programa.estado || 'Activo'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary me-2" onclick="cargarFormularioEdicion('${programa.id}')">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarPrograma('${programa.id}')">
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;
    container.innerHTML = tableHtml;
}


// ---------------------------------------------------
// --- 5. FUNCIONES DE CATÁLOGO PÚBLICO ---
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
                            <i class="bi bi-clock me-1 text-acento"></i> Duración: <strong>${programa.duracion || 'N/A'}</strong>
                        </p>
                        <p class="mb-3 small">
                            <i class="bi bi-geo-alt me-1 text-acento"></i> Modalidad: <strong>${programa.modalidad || 'N/A'}</strong>
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

/**
 * Filtra los programas.
 */
function filtrarProgramas() {
    const textoBusqueda = document.getElementById('buscador').value.toLowerCase();
    const categoriaSeleccionada = document.getElementById('filtroCategoria').value;

    const programasFiltrados = programas.filter(programa => {
        const coincideBusqueda = 
            programa.titulo.toLowerCase().includes(textoBusqueda) ||
            programa.descripcionCorta.toLowerCase().includes(textoBusqueda);

        const coincideCategoria = 
            !categoriaSeleccionada || programa.categoria === categoriaSeleccionada;

        return coincideBusqueda && coincideCategoria;
    });

    renderizarProgramas(programasFiltrados);
}

/**
 * Muestra el modal con la información detallada del programa.
 */
function mostrarDetalle(id) {
    const programa = programas.find(p => p.id === id);
    if (!programa) return;

    // --- 1. INYECCIÓN DEL CONTENIDO PRINCIPAL ---
    document.getElementById('detalleModalLabel').textContent = programa.titulo;
    const contenidoModal = document.getElementById('detalle-contenido');
    
    const contenidoArray = programa.contenido && Array.isArray(programa.contenido) ? programa.contenido : (programa.contenido ? programa.contenido.split('\n') : []);
    const temarioList = contenidoArray.map(item => `<li class="list-group-item"><i class="bi bi-check-circle-fill text-acento me-2"></i>${item.trim()}</li>`).join('');

    contenidoModal.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-6">
                <img src="${programa.imagenUrl}" class="img-fluid rounded shadow-sm" alt="${programa.titulo}">
            </div>
            <div class="col-md-6">
                <p class="lead fw-bold">${programa.descripcionCorta}</p>
                <p>${programa.descripcionDetallada || 'No hay descripción detallada.'}</p>
                <div class="mb-2">
                    <span class="badge bg-dark me-2"><i class="bi bi-clock"></i> ${programa.duracion || 'A Definir'}</span>
                    <span class="badge bg-dark"><i class="bi bi-geo-alt"></i> ${programa.modalidad || 'A Definir'}</span>
                </div>
            </div>
        </div>
        
        <h4 class="text-acento mt-3">Contenido y Temario</h4>
        <ul class="list-group list-group-flush mb-4">
            ${temarioList.length > 0 ? temarioList : '<li class="list-group-item">Contenido no especificado.</li>'}
        </ul>
    `;
    
    // --- 2. INYECCIÓN DEL FOOTER Y BOTONES (CRUD) ---
    let footerContent = `
        <a href="https://wa.me/51999999999" class="btn btn-lg btn-acento" target="_blank">
            <i class="bi bi-whatsapp me-1"></i> Solicitar Inscripción
        </a>
    `;

    // Solo inyectar botones de CRUD si el usuario es Admin
    if (userIsAdmin) {
        footerContent += `
            <button class="btn btn-outline-secondary me-2" onclick="cargarFormularioEdicion('${programa.id}')">
                <i class="bi bi-pencil"></i> Editar (Admin)
            </button>
            <button class="btn btn-outline-danger" onclick="eliminarPrograma('${programa.id}')">
                <i class="bi bi-trash"></i> Eliminar (Admin)
            </button>
        `;
    }
    document.getElementById('detalle-footer').innerHTML = footerContent;

    // --- 3. APERTURA FINAL DEL MODAL ---
    const detalleModalElement = document.getElementById('detalleModal');
    let detalleModal = bootstrap.Modal.getInstance(detalleModalElement);
    if (!detalleModal) {
        detalleModal = new bootstrap.Modal(detalleModalElement);
    }
    detalleModal.show();
}

// ---------------------------------------------------
// --- 7. FUNCIONES CRUD DE ADMINISTRACIÓN ---
// ---------------------------------------------------

/**
 * Elimina un documento (programa) de la colección de Firestore.
 */
async function eliminarPrograma(id) {
    if (!userIsAdmin) {
        alert("Operación denegada. Se requiere inicio de sesión.");
        return;
    }
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
        alert(`Error al eliminar: ${error.message}. Revise sus reglas de seguridad en Firebase.`);
    }
}

/**
 * Carga los datos de un programa existente en el formulario de administración para su edición.
 */
function cargarFormularioEdicion(id) {
    if (!userIsAdmin) {
        alert("Operación denegada. Se requiere inicio de sesión.");
        return;
    }

    // Ocultar modal si está abierto
    const detalleModal = bootstrap.Modal.getInstance(document.getElementById('detalleModal'));
    if (detalleModal) {
        detalleModal.hide();
    }
    
    showSection('admin-form'); // Mostrar la sección del formulario

    const programa = programas.find(p => p.id === id);
    if (!programa) {
        alert("Programa no encontrado para edición.");
        return;
    }

    // 1. Configurar la interfaz para Edición
    document.getElementById('adminFormTitle').innerHTML = `Editar Programa <span class="text-acento">${programa.titulo}</span>`;
    document.getElementById('adminForm').setAttribute('data-programa-id', id);

    // 2. Llenar los campos del formulario
    document.getElementById('adminTitulo').value = programa.titulo;
    document.getElementById('adminCategoria').value = programa.categoria;
    document.getElementById('adminEstado').value = programa.estado || 'Activo';
    document.getElementById('adminImagenUrl').value = programa.imagenUrl;
    document.getElementById('adminDescripcion').value = programa.descripcionCorta;
    
    const contenidoTexto = programa.contenido && Array.isArray(programa.contenido) ? programa.contenido.join('\n') : '';
    document.getElementById('adminContenido').value = contenidoTexto;

    // 3. Configurar el botón de acción
    document.querySelector('#adminForm button').textContent = "Guardar Cambios";
}

/**
 * Maneja la Creación (Add) y la Edición (Update) de programas.
 */
async function guardarCambiosEdicion() {
    if (!userIsAdmin) {
        alert("Operación denegada. Se requiere inicio de sesión.");
        return;
    }
    
    const form = document.getElementById('adminForm');
    const id = form.getAttribute('data-programa-id');

    // Procesar contenido del textarea (separado por saltos de línea)
    const contenidoLimpio = document.getElementById('adminContenido').value
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    // Recoger datos del formulario
    const datosGuardar = {
        titulo: document.getElementById('adminTitulo').value,
        categoria: document.getElementById('adminCategoria').value,
        estado: document.getElementById('adminEstado').value,
        descripcionCorta: document.getElementById('adminDescripcion').value,
        imagenUrl: document.getElementById('adminImagenUrl').value,
        
        // Datos procesados
        contenido: contenidoLimpio,
        tags: document.getElementById('adminTitulo').value.toLowerCase().split(' '),
        
        // Campos por defecto (solo se incluyen en el ADD, no se tocan en el UPDATE)
        descripcionDetallada: "Descripción detallada del programa. Edite esto para más información.",
        duracion: "A Definir",
        modalidad: "A Definir",
        perfilEgresado: "Egresado listo para el mercado laboral.",
        requisitos: "Sin requisitos.",
    };
    
    if (!datosGuardar.titulo) {
        alert('Fallo de Validación: El programa debe tener un Título.');
        return;
    }

    try {
        if (id) {
            // Modo EDICIÓN (UPDATE): Solo enviamos los campos que queremos actualizar
            await db.collection('programas').doc(id).update(datosGuardar);
            alert(`✅ Edición Exitosa: Programa "${datosGuardar.titulo}" actualizado.`);
        } else {
            // Modo CREACIÓN (ADD): Enviamos todos los datos (incluyendo los por defecto)
            await db.collection('programas').add(datosGuardar);
            alert(`✅ ¡Carga Exitosa! Programa "${datosGuardar.titulo}" creado en Firebase.`);
        }

        // Limpiar y recargar UI
        form.reset();
        form.removeAttribute('data-programa-id');
        cargarProgramas(); 
        showSection('admin-dashboard');
        
        // Restaurar el botón/título para el siguiente ADD
        document.getElementById('adminFormTitle').innerHTML = 'Gestión de Programa <span class="text-acento"></span>';
        document.querySelector('#adminForm button').textContent = "Guardar Programa";
        
    } catch (error) {
        console.error("❌ Error al guardar/actualizar programa:", error);
        alert(`Error al guardar: ${error.message}. Revise sus reglas de seguridad en Firebase.`);
    }
}