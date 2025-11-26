// app.js - CÓDIGO FINAL CON LÓGICA DE ARRASTRE, CORRECCIÓN DE TIPOS Y NAVEGACIÓN CON FLECHAS

let currentEditId = null;
let allProgramas = []; 

// Variables para la lógica de arrastre
let isDragging = false;
let startPos = 0;
let scrollLeft = 0;
let dragThreshold = 5; 

// =================================================================
// 1. MANEJO DE VISTAS (SPA)
// =================================================================
function showSection(sectionId, isNew = false) {
    document.querySelectorAll('.spa-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';

    if (sectionId === 'admin-form') {
        if (isNew) {
            currentEditId = null;
            document.getElementById('adminFormTitle').innerHTML = 'Crear Nuevo Programa <span class="text-acento"></span>';
            document.getElementById('adminForm').reset();
        }
    }
    if (sectionId === 'admin-dashboard') {
        loadAdminList();
    }
    if (sectionId === 'catalogo') {
        cargarProgramas();
    }
}

// =================================================================
// 2. LÓGICA DE AUTENTICACIÓN (ADMIN)
// =================================================================
function handleAdminAuth() {
    if (auth.currentUser) {
        showSection('admin-dashboard');
    } else {
        showSection('login');
    }
}

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

auth.onAuthStateChanged(user => {
    const adminAuthButton = document.getElementById('adminAuthButton');
    if (user) {
        adminAuthButton.innerHTML = '<i class="bi bi-gear-fill me-1"></i> Admin CTTC';
        adminAuthButton.onclick = () => showSection('admin-dashboard');
    } else {
        adminAuthButton.innerHTML = '<i class="bi bi-person-circle me-1"></i> Admin CTTC';
        adminAuthButton.onclick = handleAdminAuth;
        if (document.getElementById('admin-dashboard').style.display === 'block' || document.getElementById('admin-form').style.display === 'block') {
             showSection('catalogo');
        }
    }
});

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
 * Función para desplazar la galería usando los botones de flecha.
 */
function scrollGallery(direction) {
    const gallery = document.getElementById('programas-container');
    if (!gallery) return;

    // Calcula el ancho de una tarjeta más el margen (aprox. 315px para desktop)
    const scrollAmount = gallery.querySelector('.card-wrapper') 
        ? gallery.querySelector('.card-wrapper').offsetWidth 
        : 315; 
    
    // Desplaza el scroll en la dirección indicada
    gallery.scrollLeft += direction * scrollAmount;
}


/**
 * Maneja el clic en una tarjeta, evitando que se dispare si fue un arrastre.
 */
function handleCardClick(event, id) {
    if (Math.abs(startPos - event.clientX) < dragThreshold) {
        mostrarDetalle(id);
    }
}


function crearCardPrograma(programa) {
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

function renderizarProgramas(programas) {
    allProgramas = programas;
    filtrarProgramas();
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

        const isActive = programa.estado === 'Activo';

        return matchesText && matchesCategory && isActive;
    });

    if (programasFiltrados.length === 0) {
        container.innerHTML = `<div class="alert alert-info w-100 mt-4">No se encontraron programas que coincidan con su búsqueda.</div>`;
        return;
    }

    container.innerHTML = programasFiltrados.map(crearCardPrograma).join('');
}


function mostrarDetalle(id) {
    db.collection('programas').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const programa = { id: doc.id, ...doc.data() };
                const modalTitle = document.getElementById('detalleModalLabel');
                const modalBody = document.getElementById('detalle-contenido');
                const modalFooter = document.getElementById('detalle-footer');
                
                modalTitle.textContent = programa.titulo;

                const contenidoRaw = String(programa.contenido || '').trim();
                const contenidoLista = contenidoRaw.split('\n')
                    .filter(item => item !== '')
                    .map(item => `<li>${item.trim()}</li>`)
                    .join('');

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

                let footerHtml = `
                    <a href="https://wa.me/51954622231?text=Hola,%20estoy%20interesado%20en%20el%20programa:%20${encodeURIComponent(programa.titulo)}" target="_blank" class="btn btn-lg btn-acento">
                        <i class="bi bi-whatsapp me-2"></i>Inscribirse por WhatsApp
                    </a>
                `;

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
            alert('Error al obtener datos del programa. Revisa la consola para más detalles.');
        });
}


// =================================================================
// 4. LÓGICA DE ADMINISTRACIÓN (CRUD) (SIN CAMBIOS)
// =================================================================

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

function cargarProgramaParaEdicion(id) {
    db.collection('programas').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const programa = doc.data();
                currentEditId = id;

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
        contenido: String(document.getElementById('adminContenido').value || ''),
        duracion: document.getElementById('adminDuracion').value,
        modalidad: document.getElementById('adminModalidad').value,
        perfilEgresado: document.getElementById('adminPerfilEgresado').value,
        requisitos: document.getElementById('adminRequisitos').value,
        tags: document.getElementById('adminTags').value.toLowerCase(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    let promise;
    if (currentEditId) {
        promise = db.collection('programas').doc(currentEditId).update(data);
    } else {
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

function eliminarPrograma(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este programa permanentemente?')) {
        db.collection('programas').doc(id).delete()
            .then(() => {
                alert('Programa eliminado con éxito.');
                loadAdminList();
                cargarProgramas();
            })
            .catch(error => {
                console.error("Error al eliminar programa:", error);
                alert('Error al eliminar el programa.');
            });
    }
}


// =================================================================
// 5. LÓGICA DE ARRASTRE DE GALERÍA Y NAVEGACIÓN (RESTORED)
// =================================================================

function initGalleryDrag() {
    const gallery = document.getElementById('programas-container');
    if (!gallery) return; 

    gallery.addEventListener('mousedown', (e) => {
        isDragging = true;
        gallery.classList.add('active'); 
        startPos = e.clientX;
        scrollLeft = gallery.scrollLeft;
        e.preventDefault(); 
    });

    gallery.addEventListener('mouseleave', () => {
        isDragging = false;
        gallery.classList.remove('active');
    });

    gallery.addEventListener('mouseup', (e) => {
        isDragging = false;
        gallery.classList.remove('active');
    });

    gallery.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault(); 

        const x = e.clientX - startPos; 
        gallery.scrollLeft = scrollLeft - x;
    });

    // Manejo de eventos táctiles
    gallery.addEventListener('touchstart', (e) => {
        startPos = e.touches[0].clientX;
        scrollLeft = gallery.scrollLeft;
        isDragging = false;
    });

    gallery.addEventListener('touchmove', () => {
        isDragging = false; 
    });

    gallery.addEventListener('touchend', () => {
        isDragging = false;
    });
}


// =================================================================
// 6. INICIALIZACIÓN
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    cargarProgramas();
    initGalleryDrag(); 

    // Inicializar tooltips de Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    })
});