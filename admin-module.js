// app.js - MÓDULO PRINCIPAL FINAL (Catálogo y Lógica de Carga)

// =================================================================
// 1. FUNCIONES PÚBLICAS ESENCIALES Y VARIABLES GLOBALES
// =================================================================
let allProgramas = []; 
let isDragging = false; 
let startX;
let scrollLeft;
const DRAG_THRESHOLD = 5; 

// Variables para la carga dinámica de Admin
let adminModule = null; 
let adminLoading = false; 

// --- FUNCIONES DEL CATÁLOGO Y GALERÍA (Restauradas) ---

function cargarProgramas() {
    const container = document.getElementById('programas-container');
    container.innerHTML = '<p class="text-center text-muted">Cargando programas...</p>';
    
    db.collection('programas').where('estado', '==', 'Activo').get()
        .then(snapshot => {
            allProgramas = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            filtrarProgramas();
        })
        .catch(error => {
            console.error("Error al cargar programas:", error);
            container.innerHTML = '<p class="text-center text-danger">Error al cargar el catálogo.</p>';
        });
}

function filtrarProgramas() {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const categoria = document.getElementById('filtroCategoria').value;

    let programasFiltrados = allProgramas.filter(programa => {
        const matchCategoria = !categoria || programa.categoria === categoria;
        const matchBusqueda = programa.titulo.toLowerCase().includes(busqueda) ||
                              programa.descripcionCorta.toLowerCase().includes(busqueda) ||
                              (programa.tags && programa.tags.toLowerCase().includes(busqueda));

        return matchCategoria && matchBusqueda;
    });

    renderizarProgramas(programasFiltrados);
}

function crearCardPrograma(programa) {
    const shortDesc = programa.descripcionCorta && programa.descripcionCorta.length > 100 
                      ? programa.descripcionCorta.substring(0, 100) + '...'
                      : programa.descripcionCorta || '';

    return `
        <div class="card-wrapper p-3">
            <div class="card card-programa h-100 shadow-sm" onclick="mostrarDetalle('${programa.id}')" data-id="${programa.id}">
                <img src="${programa.imagenUrl || 'images/default-placeholder.jpg'}" class="card-img-top" alt="Imagen de ${programa.titulo}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title text-truncate">${programa.titulo}</h5>
                    <p class="card-text text-muted small mb-1">${shortDesc}</p>
                    <div class="mt-auto pt-2">
                        <span class="badge bg-acento me-2">${programa.categoria}</span>
                        ${programa.duracion ? `<span class="badge bg-secondary">${programa.duracion}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderizarProgramas(programas) {
    const container = document.getElementById('programas-container');
    
    if (programas.length === 0) {
        container.innerHTML = '<p class="text-center text-muted w-100 py-4">No se encontraron programas que coincidan con los criterios de búsqueda.</p>';
        return;
    }

    container.innerHTML = programas.map(crearCardPrograma).join('');
}

function mostrarDetalle(id) {
    const programa = allProgramas.find(p => p.id === id);
    if (!programa) return;

    // ... (Lógica completa para llenar el modal de detalle) ...
    const modalTitle = document.getElementById('detalleModalLabel');
    const modalBody = document.getElementById('detalle-contenido');
    const modalFooter = document.getElementById('detalle-footer');
    
    modalTitle.textContent = programa.titulo;

    const contenidoLista = (programa.contenido || '')
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => `<li>${item}</li>`)
        .join('');

    const perfilEgresadoHTML = programa.perfilEgresado ? `<p class="mt-3"><strong>Perfil del Egresado:</strong> ${programa.perfilEgresado}</p>` : '';
    const requisitosHTML = programa.requisitos ? `<p><strong>Requisitos:</strong> ${programa.requisitos}</p>` : '';
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-5">
                <img src="${programa.imagenUrl || 'images/default-placeholder.jpg'}" class="img-fluid rounded mb-3" alt="Imagen de ${programa.titulo}">
                <p><strong>Categoría:</strong> <span class="badge bg-acento">${programa.categoria}</span></p>
                ${programa.duracion ? `<p><strong>Duración:</strong> ${programa.duracion}</p>` : ''}
                ${programa.modalidad ? `<p><strong>Modalidad:</strong> ${programa.modalidad}</p>` : ''}
            </div>
            <div class="col-md-7">
                <p class="lead">${programa.descripcionDetallada || programa.descripcionCorta || ''}</p>
                <hr>
                <h4>Contenido/Temario</h4>
                <ul class="list-unstyled">
                    ${contenidoLista || '<p class="text-muted">Temario no disponible.</p>'}
                </ul>
                ${perfilEgresadoHTML}
                ${requisitosHTML}
            </div>
        </div>
    `;

    modalFooter.innerHTML = `
        <button type="button" class="btn btn-dark" data-bs-dismiss="modal">Cerrar</button>
        <a href="#contacto" onclick="showSection('contacto'); document.getElementById('programaInteres').value = '${programa.titulo}';" class="btn btn-acento" data-bs-dismiss="modal">
            Solicitar Información
        </a>
    `;

    const detalleModal = new bootstrap.Modal(document.getElementById('detalleModal'));
    detalleModal.show();
}

function scrollGallery(direction) {
    const gallery = document.getElementById('programas-container');
    const scrollAmount = 350; 
    gallery.scrollLeft += direction * scrollAmount;
}

function initGalleryDrag() {
    const gallery = document.getElementById('programas-container');
    if (!gallery) return;

    gallery.addEventListener('mousedown', (e) => {
        isDragging = true;
        gallery.classList.add('active');
        startX = e.pageX - gallery.offsetLeft;
        scrollLeft = gallery.scrollLeft;
        e.preventDefault(); 
    });

    gallery.addEventListener('mouseleave', () => {
        isDragging = false;
        gallery.classList.remove('active');
    });

    gallery.addEventListener('mouseup', () => {
        isDragging = false;
        gallery.classList.remove('active');
    });

    gallery.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault(); 
        
        const x = e.pageX - gallery.offsetLeft;
        const walk = (x - startX) * 1.5; 
        gallery.scrollLeft = scrollLeft - walk;
    });

    gallery.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX - gallery.offsetLeft;
        scrollLeft = gallery.scrollLeft;
    });

    gallery.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const x = e.touches[0].clientX - gallery.offsetLeft;
        const walk = (x - startX) * 1.5;
        gallery.scrollLeft = scrollLeft - walk;
    });

    gallery.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// =================================================================
// 2. MANEJO DE VISTAS (SPA)
// =================================================================
function showSection(sectionId, isNew = false) {
    document.querySelectorAll('.spa-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';

    if (sectionId === 'admin-form') {
        if (isNew) {
            document.getElementById('adminFormTitle').innerHTML = 'Crear Nuevo Programa <span class="text-acento"></span>';
            document.getElementById('adminForm').reset();
        }
    }
    
    // ⬇️ Lógica de Carga Dinámica (Admin)
    if (sectionId === 'admin-dashboard') {
        loadAdminModule().then(() => {
             if (adminModule) adminModule.loadAdminList();
        });
    }
    if (sectionId === 'catalogo') {
        cargarProgramas();
    }
}


// =================================================================
// 3. LÓGICA DE CARGA DINÁMICA DE ADMIN Y WRAPPERS
// =================================================================

// FUNCIÓN DE CALLBACK GLOBAL
window.updatePublicCatalog = function() {
    cargarProgramas();
};

async function loadAdminModule() {
    if (adminModule || adminLoading) return;
    
    adminLoading = true;
    try {
        adminModule = await import('./admin-module.js'); 
        console.log("Módulo de administración cargado dinámicamente.");
    } catch (error) {
        console.error("Error al cargar el módulo de administración:", error);
    } finally {
        adminLoading = false;
    }
}

function handleAdminAuth() {
    loadAdminModule().then(() => {
        if (auth.currentUser) {
            showSection('admin-dashboard');
        } else {
            showSection('login');
        }
    });
}

function loginAdmin() {
    if (adminModule) {
        adminModule.loginAdmin();
    }
}

// ⚠️ handler auth.onAuthStateChanged
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


// =================================================================
// 4. INICIALIZACIÓN
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