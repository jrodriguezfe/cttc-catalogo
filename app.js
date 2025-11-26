// app.js - Lógica de la SPA, Firebase, CRUD y Galería Arrastrable
// Nota: Las variables 'db' y 'auth' se inicializan en index.html

let currentEditId = null;
let allProgramas = []; // Almacena todos los programas cargados inicialmente

// =================================================================
// 1. MANEJO DE VISTAS (SPA)
// =================================================================

/**
 * Muestra la sección deseada y oculta las demás.
 * @param {string} sectionId - El ID de la sección a mostrar ('catalogo', 'login', etc.).
 * @param {boolean} isNew - Indica si se está abriendo el formulario para un nuevo registro.
 */
function showSection(sectionId, isNew = false) {
    document.querySelectorAll('.spa-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';

    if (sectionId === 'admin-form') {
        if (isNew) {
            currentEditId = null;
            document.getElementById('adminFormTitle').innerHTML = 'Crear Nuevo Programa <span class="text-acento"></span>';
            document.getElementById('adminForm').reset(); // Limpiar formulario al crear
        }
    }
    if (sectionId === 'admin-dashboard') {
        loadAdminList(); // Recargar la lista al volver al dashboard
    }
    if (sectionId === 'catalogo') {
        cargarProgramas(); // Recargar la lista pública al volver
    }
}

// =================================================================
// 2. LÓGICA DE AUTENTICACIÓN (ADMIN)
// =================================================================

/**
 * Maneja el click del botón de Auth: Login si no está logeado, Dashboard si lo está.
 */
function handleAdminAuth() {
    if (auth.currentUser) {
        showSection('admin-dashboard');
    } else {
        showSection('login');
    }
}

/**
 * Intenta iniciar sesión.
 */
function loginAdmin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const authMessage = document.getElementById('authMessage');

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            authMessage.style.display = 'none';
            showSection('admin-dashboard');
        })
        .catch(error => {
            authMessage.textContent = 'Error: ' + error.message;
            authMessage.style.display = 'block';
        });
}

/**
 * Escucha los cambios de estado de autenticación.
 */
auth.onAuthStateChanged(user => {
    const adminAuthButton = document.getElementById('adminAuthButton');
    if (user) {
        // Usuario logeado: Cambiar botón a 'Admin CTTC'
        adminAuthButton.innerHTML = '<i class="bi bi-gear-fill me-1"></i> Admin CTTC';
        adminAuthButton.onclick = () => showSection('admin-dashboard');
    } else {
        // Usuario deslogeado: Cambiar botón a 'Iniciar Sesión'
        adminAuthButton.innerHTML = '<i class="bi bi-person-circle me-1"></i> Admin CTTC';
        adminAuthButton.onclick = handleAdminAuth;
        // Si estaba en una sección Admin, lo regresa al catálogo
        if (document.getElementById('admin-dashboard').style.display === 'block' || document.getElementById('admin-form').style.display === 'block') {
             showSection('catalogo');
        }
    }
});

/**
 * Cierra la sesión del administrador.
 */
function logoutAdmin() {
    auth.signOut().then(() => {
        showSection('catalogo');
    }).catch(error => {
        console.error("Error al cerrar sesión:", error);
    });
}


// =================================================================
// 3. LÓGICA DEL CATÁLOGO (PÚBLICA)
// =================================================================

/**
 * **NUEVO:** Maneja el clic en la tarjeta, previniendo la acción si el usuario estaba arrastrando.
 */
function handleCardClick(event, id) {
    const gallery = document.getElementById('programas-container');
    // Verifica el atributo de datos establecido por la función de arrastre
    if (gallery && gallery.dataset.dragging === 'true') {
        event.stopPropagation();
        gallery.dataset.dragging = 'false'; // Reseteamos el flag
        return;
    }
    // Si no fue arrastre, mostramos el detalle
    mostrarDetalle(id);
}


/**
 * Genera la tarjeta HTML para un programa específico.
 */
function crearCardPrograma(programa) {
    // Solo mostrar programas 'Activo' en el catálogo público
    if (programa.estado !== 'Activo') return '';

    return `
        <div class="card-wrapper"> 
            <div class="card h-100 card-programa shadow-sm" onclick="handleCardClick(event, '${programa.id}')" role="button">
                <img src="${programa.imagenUrl}" class="card-img-top" alt="Imagen representativa de ${programa.titulo}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/180x180?text=No+Image'">
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
                        <button class="btn btn-sm btn-outline-dark w-100" onclick="event.stopPropagation(); mostrarDetalle('${programa.id}')">
                            <i class="bi bi-info-circle me-1"></i> Ver Detalles
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Carga los programas desde Firebase y los renderiza en la galería.
 */
function cargarProgramas() {
    const container = document.getElementById('programas-container');
    container.innerHTML = '<div class="text-center w-100 p-5"><div class="spinner-border text-acento" role="status"><span class="visually-hidden">Cargando...</span></div></div>';

    db.collection('programas').get()
        .then(snapshot => {
            const programas = [];
            snapshot.forEach(doc => {
                programas.push({ id: doc.id, ...doc.data() });
            });
            renderizarProgramas(programas);
        })
        .catch(error => {
            console.error("Error al cargar programas:", error);
            container.innerHTML = '<div class="alert alert-danger w-100">Error al cargar el catálogo.</div>';
        });
}

/**
 * Filtra y renderiza la lista de programas.
 */
function renderizarProgramas(programas) {
    allProgramas = programas;
    filtrarProgramas(); // Aplicar filtros después de cargar todos
}

function filtrarProgramas() {
    const container = document.getElementById('programas-container');
    const filtroTexto = document.getElementById('buscador').value.toLowerCase();
    const filtroCategoria = document.getElementById('filtroCategoria').value;

    const programasFiltrados = allProgramas.filter(programa => {
        const matchesText = programa.titulo.toLowerCase().includes(filtroTexto) ||
                            programa.descripcionCorta.toLowerCase().includes(filtroTexto) ||
                            (programa.tags && programa.tags.toLowerCase().includes(filtroTexto));
        
        const matchesCategory = !filtroCategoria || programa.categoria === filtroCategoria;

        // Solo mostrar programas activos para el catálogo público
        const isActive = programa.estado === 'Activo';

        return matchesText && matchesCategory && isActive;
    });

    if (programasFiltrados.length === 0) {
        container.innerHTML = `<div class="alert alert-info w-100 mt-4">No se encontraron programas que coincidan con su búsqueda.</div>`;
        return;
    }

    container.innerHTML = programasFiltrados.map(crearCardPrograma).join('');
}

/**
 * Muestra los detalles de un programa en un modal.
 */
function mostrarDetalle(id) {
    db.collection('programas').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const programa = { id: doc.id, ...doc.data() };
                const modalTitle = document.getElementById('detalleModalLabel');
                const modalBody = document.getElementById('detalle-contenido');
                const modalFooter = document.getElementById('detalle-footer');
                
                modalTitle.textContent = programa.titulo;

                // Formatear contenido
                const contenidoLista = programa.contenido ? programa.contenido.split('\n').map(item => `<li>${item.trim()}</li>`).join('') : '';

                modalBody.innerHTML = `
                    <div class="row">
                        <div class="col-md-5 mb-3">
                            <img src="${programa.imagenUrl}" class="img-fluid rounded shadow-sm" alt="Imagen de ${programa.titulo}">
                            <div class="mt-3">
                                <p class="mb-1"><i class="bi bi-tag-fill me-2 text-acento"></i>Categoría: <strong>${programa.categoria}</strong></p>
                                <p class="mb-1"><i class="bi bi-clock me-2 text-acento"></i>Duración: <strong>${programa.duracion || 'N/A'}</strong></p>
                                <p class="mb-1"><i class="bi bi-geo-alt me-2 text-acento"></i>Modalidad: <strong>${programa.modalidad || 'N/A'}</strong></p>
                            </div>
                        </div>
                        <div class="col-md-7">
                            <h4 class="text-acento mb-3">Descripción</h4>
                            <p>${programa.descripcionDetallada || programa.descripcionCorta}</p>

                            <h4 class="text-acento mb-2 mt-4">Contenido/Temario</h4>
                            <ul class="list-unstyled">
                                ${contenidoLista || '<li>Contenido no especificado.</li>'}
                            </ul>
                            
                            <h4 class="text-acento mb-2 mt-4">Perfil del Egresado</h4>
                            <p>${programa.perfilEgresado || 'No especificado.'}</p>
                        </div>
                    </div>
                `;

                // Configurar botones del footer
                let footerHtml = `
                    <a href="https://wa.me/51999999999?text=Hola,%20estoy%20interesado%20en%20el%20programa:%20${encodeURIComponent(programa.titulo)}" target="_blank" class="btn btn-lg btn-acento">
                        <i class="bi bi-whatsapp me-2"></i>Inscribirse por WhatsApp
                    </a>
                `;

                // Agregar botones de administración si el usuario está logeado
                if (auth.currentUser) {
                    footerHtml += `
                        <div class="ms-auto">
                            <button class="btn btn-outline-dark me-2" onclick="cargarProgramaParaEdicion('${programa.id}')" data-bs-dismiss="modal">
                                <i class="bi bi-pencil me-1"></i> Editar
                            </button>
                            <button class="btn btn-outline-danger" onclick="eliminarPrograma('${programa.id}')" data-bs-dismiss="modal">
                                <i class="bi bi-trash me-1"></i> Eliminar
                            </button>
                        </div>
                    `;
                }

                modalFooter.innerHTML = footerHtml;

                const detalleModal = new bootstrap.Modal(document.getElementById('detalleModal'));
                detalleModal.show();
            } else {
                alert('Programa no encontrado.');
            }
        })
        .catch(error => {
            console.error("Error al obtener detalle:", error);
        });
}


// =================================================================
// 4. LÓGICA DE ADMINISTRACIÓN (CRUD)
// =================================================================

/**
 * Carga la lista de programas para el dashboard de administración.
 */
function loadAdminList() {
    if (!auth.currentUser) return;

    const container = document.getElementById('admin-list-container');
    container.innerHTML = '<p class="text-center">Cargando...</p>';

    db.collection('programas').get()
        .then(snapshot => {
            let html = `
                <table class="table table-hover table-striped">
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Categoría</th>
                            <th>Duración</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            snapshot.forEach(doc => {
                const p = { id: doc.id, ...doc.data() };
                const estadoClass = p.estado === 'Activo' ? 'text-success' : 'text-danger';

                html += `
                    <tr>
                        <td>${p.titulo}</td>
                        <td>${p.categoria}</td>
                        <td>${p.duracion || 'N/A'}</td>
                        <td><span class="${estadoClass} fw-bold">${p.estado}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-dark me-2" onclick="cargarProgramaParaEdicion('${p.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="eliminarPrograma('${p.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
                <button class="btn btn-danger btn-sm" onclick="logoutAdmin()">Cerrar Sesión</button>
            `;
            container.innerHTML = html;
        })
        .catch(error => {
            console.error("Error al cargar lista admin:", error);
            container.innerHTML = '<div class="alert alert-danger">Error al cargar la lista administrativa.</div>';
        });
}

/**
 * Prepara el formulario para editar un programa existente.
 */
function cargarProgramaParaEdicion(id) {
    db.collection('programas').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const programa = doc.data();
                currentEditId = id;

                // Llenar formulario
                document.getElementById('adminFormTitle').innerHTML = `Editar Programa: <span class="text-acento">${programa.titulo}</span>`;
                document.getElementById('adminTitulo').value = programa.titulo || '';
                document.getElementById('adminCategoria').value = programa.categoria || 'Diseño';
                document.getElementById('adminEstado').value = programa.estado || 'Inactivo';
                document.getElementById('adminImagenUrl').value = programa.imagenUrl || '';
                document.getElementById('adminDescripcion').value = programa.descripcionCorta || '';
                document.getElementById('adminDescripcionDetallada').value = programa.descripcionDetallada || '';
                document.getElementById('adminContenido').value = programa.contenido || '';
                document.getElementById('adminDuracion').value = programa.duracion || '';
                document.getElementById('adminModalidad').value = programa.modalidad || '';
                document.getElementById('adminPerfilEgresado').value = programa.perfilEgresado || '';
                document.getElementById('adminRequisitos').value = programa.requisitos || '';
                document.getElementById('adminTags').value = programa.tags || '';

                showSection('admin-form');
            } else {
                alert('Programa no encontrado para edición.');
            }
        })
        .catch(error => {
            console.error("Error al cargar programa para edición:", error);
        });
}

/**
 * Guarda un programa nuevo o edita uno existente.
 */
function guardarCambiosEdicion() {
    const form = document.getElementById('adminForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        titulo: document.getElementById('adminTitulo').value,
        categoria: document.getElementById('adminCategoria').value,
        estado: document.getElementById('adminEstado').value,
        imagenUrl: document.getElementById('adminImagenUrl').value,
        descripcionCorta: document.getElementById('adminDescripcion').value,
        descripcionDetallada: document.getElementById('adminDescripcionDetallada').value,
        contenido: document.getElementById('adminContenido').value,
        duracion: document.getElementById('adminDuracion').value,
        modalidad: document.getElementById('adminModalidad').value,
        perfilEgresado: document.getElementById('adminPerfilEgresado').value,
        requisitos: document.getElementById('adminRequisitos').value,
        tags: document.getElementById('adminTags').value.toLowerCase(),
        // Auditoría
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    let promise;
    if (currentEditId) {
        // Modo Edición
        promise = db.collection('programas').doc(currentEditId).update(data);
    } else {
        // Modo Creación
        promise = db.collection('programas').add(data);
    }

    promise.then(() => {
        alert('Programa guardado con éxito.');
        showSection('admin-dashboard');
    }).catch(error => {
        console.error("Error al guardar programa:", error);
        alert('Error al guardar el programa: ' + error.message);
    });
}

/**
 * Elimina un programa.
 */
function eliminarPrograma(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este programa permanentemente?')) {
        db.collection('programas').doc(id).delete()
            .then(() => {
                alert('Programa eliminado con éxito.');
                loadAdminList(); // Recargar lista administrativa
                cargarProgramas(); // Recargar catálogo público
            })
            .catch(error => {
                console.error("Error al eliminar programa:", error);
                alert('Error al eliminar el programa.');
            });
    }
}


// =================================================================
// 5. LÓGICA DE ARRASTRE DE GALERÍA (MOUSE DRAG)
// =================================================================

/**
 * Habilita la funcionalidad de arrastre con el mouse en la galería horizontal.
 */
function initGalleryDrag() {
    const slider = document.getElementById('programas-container');
    
    if (!slider) return;

    let isDown = false; 
    let startX;      
    let scrollLeft;  

    // 1. Mouse presionado (Inicio del Arrastre)
    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active'); // Para cambiar el cursor a 'grabbing' (definido en CSS)
        
        // Obtenemos la posición inicial del mouse y el scroll del contenedor
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
        
        // Inicializar el flag de arrastre
        slider.dataset.dragging = 'false'; 
    });

    // 2. Movimiento del mouse
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault(); 
        
        const x = e.pageX - slider.offsetLeft;
        // La diferencia de posición se usa para calcular el desplazamiento
        const walk = (x - startX) * 1.5; // El factor 1.5 aumenta la velocidad de arrastre
        
        slider.scrollLeft = scrollLeft - walk;
        
        // Si hay movimiento significativo, marcamos que se está arrastrando
        if (Math.abs(walk) > 5) {
            slider.dataset.dragging = 'true';
        }
    });

    // 3. Mouse liberado o fuera (Fin del Arrastre)
    const stopDrag = () => {
        isDown = false;
        slider.classList.remove('active');
    };
    
    slider.addEventListener('mouseleave', stopDrag);
    slider.addEventListener('mouseup', stopDrag);
}


// =================================================================
// 6. INICIALIZACIÓN
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    cargarProgramas();
    initGalleryDrag(); // ⬅️ Inicializar la función de arrastre del mouse

    // Inicializar tooltips de Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    })
});