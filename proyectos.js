// ===============================
// 🔗 Conexión a Supabase
// ===============================
const { createClient } = supabase;
const supabaseUrl = "https://rkqiciysmzklxqjdncjz.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcWljaXlzbXprbHhxamRuY2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTQzNTcsImV4cCI6MjA3Mzk5MDM1N30.XVu__catYF0JMy2qMEORh2wxUOfWZ6Y9FrwiFFuOZXY";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// ==================
// Estado
// ==================
let loggedIn = false;
let currentSemana = null;
let currentIndex = 0;

// ==================
// Elementos
// ==================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const openUploadBtn = document.getElementById("openUploadBtn");

const loginModal = document.getElementById("loginModal");
const cerrarLoginModal = document.getElementById("cerrarLoginModal");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

const uploadModal = document.getElementById("uploadModal");
const cerrarUploadModal = document.getElementById("cerrarUploadModal");
const uploadForm = document.getElementById("uploadForm");
const uploadStatus = document.getElementById("uploadStatus");
const weekSelect = document.getElementById("weekSelect");
const fileInput = document.getElementById("fileInput");

const modalCarrusel = document.getElementById("modalCarrusel");
const cerrarModal = document.getElementById("cerrarModal");
const carruselProyectos = document.getElementById("carruselProyectos");
const tituloProyecto = document.getElementById("titulo-proyecto");
const prevProyecto = document.getElementById("prevProyecto");
const nextProyecto = document.getElementById("nextProyecto");

// ==================
// Login
// ==================
loginBtn.addEventListener("click", () => {
  loginModal.style.display = "flex";
});

cerrarLoginModal.addEventListener("click", () => {
  loginModal.style.display = "none";
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  // 🔑 Validar con Supabase Auth
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    loginStatus.textContent = "❌ Credenciales inválidas.";
    console.error("Error login:", error);
    return;
  }

  // ✅ Si pasó
  loggedIn = true;
  loginModal.style.display = "none";
  loginBtn.style.display = "none";
  logoutBtn.style.display = "inline-block";
  openUploadBtn.style.display = "inline-block";
  loginStatus.textContent = "";
  alert("✅ Bienvenido " + data.user.email);
});

logoutBtn.addEventListener("click", () => {
  loggedIn = false;
  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";
  openUploadBtn.style.display = "none";
  alert("🔒 Sesión cerrada.");
});

// ==================
// Subir archivos a Supabase
// ==================
openUploadBtn.addEventListener("click", () => {
  uploadModal.style.display = "flex";
});

cerrarUploadModal.addEventListener("click", () => {
  uploadModal.style.display = "none";
});

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const semana = weekSelect.value;
  const archivo = fileInput.files[0];

  if (!semana || !archivo) {
    uploadStatus.textContent = "⚠️ Selecciona una semana y un archivo.";
    return;
  }

  // ✅ Nombre limpio
  const safeName = archivo.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  const filePath = `semana_${semana}/${Date.now()}_${safeName}`;

  // 1. Subir al bucket
  let { error: uploadError } = await supabaseClient
    .storage
    .from("proyectos")
    .upload(filePath, archivo, { upsert: true });

  if (uploadError) {
    uploadStatus.textContent = "❌ Error al subir: " + uploadError.message;
    return;
  }

  // 2. Obtener URL pública
  const { data } = supabaseClient
    .storage
    .from("proyectos")
    .getPublicUrl(filePath);

  const publicUrl = data.publicUrl;

  // 3. Guardar metadata
  let { error: insertError } = await supabaseClient
    .from("proyectos")
    .insert([{ nombre: safeName, semana: `semana_${semana}`, url: publicUrl }]);

  if (insertError) {
    uploadStatus.textContent = "❌ Error al guardar en BD: " + insertError.message;
    return;
  }

  uploadStatus.textContent = "✅ Archivo subido correctamente.";
  fileInput.value = "";
  setTimeout(() => {
    uploadModal.style.display = "none";
    uploadStatus.textContent = "";
    cargarProyectos(semana);
  }, 1200);
});

// ==================
// Cargar proyectos desde Supabase
// ==================
async function cargarProyectos(semana) {
  tituloProyecto.textContent = "Semana " + semana;
  carruselProyectos.innerHTML = "<p>Cargando...</p>";

  let { data, error } = await supabaseClient
    .from("proyectos")
    .select("*")
    .eq("semana", `semana_${semana}`);

  if (error) {
    carruselProyectos.innerHTML = "<p>❌ Error al cargar proyectos</p>";
    return;
  }

  if (!data || data.length === 0) {
    carruselProyectos.innerHTML = "<p>No hay proyectos aún.</p>";
    return;
  }

  currentIndex = 0;
  mostrarProyecto(data, semana);
}

function mostrarProyecto(lista, semana) {
  carruselProyectos.innerHTML = "";

  const proyecto = lista[currentIndex];
  const div = document.createElement("div");
  div.classList.add("proyecto");
  div.innerHTML = `
    <h4>${proyecto.nombre}</h4>
    <div class="acciones">
      <button class="btn-ver">👁 Ver</button>
      <a href="${proyecto.url}" download class="btn-descargar">⬇ Descargar</a>
      ${loggedIn ? `<button class="btn-borrar">🗑 Borrar</button>` : ""}
    </div>
  `;
  carruselProyectos.appendChild(div);

  // ✅ Botón de previsualización
  div.querySelector(".btn-ver").onclick = () => abrirPreview(proyecto);

  // ✅ Botón de borrado (solo si está logueado)
  if (loggedIn) {
    div.querySelector(".btn-borrar").onclick = async () => {
      if (!confirm("¿Seguro que deseas eliminar este archivo?")) return;

      // 1. Borrar de storage
      const filePath = proyecto.url.split("/").slice(-2).join("/"); 
      let { error: delError } = await supabaseClient
        .storage
        .from("proyectos")
        .remove([filePath]);

      if (delError) {
        alert("❌ Error al borrar del storage: " + delError.message);
        return;
      }

      // 2. Borrar de la BD
      let { error: dbError } = await supabaseClient
        .from("proyectos")
        .delete()
        .eq("id", proyecto.id);

      if (dbError) {
        alert("❌ Error al borrar de BD: " + dbError.message);
        return;
      }

      alert("✅ Archivo eliminado correctamente.");
      cargarProyectos(semana);
    };
  }

  // Navegación carrusel
  prevProyecto.onclick = () => {
    currentIndex = (currentIndex - 1 + lista.length) % lista.length;
    mostrarProyecto(lista, semana);
  };
  nextProyecto.onclick = () => {
    currentIndex = (currentIndex + 1) % lista.length;
    mostrarProyecto(lista, semana);
  };
}

// ==================
// Eventos para abrir carrusel
// ==================
document.querySelectorAll(".card-semana").forEach((card) => {
  card.addEventListener("click", () => {
    const semana = card.dataset.semana;
    currentSemana = semana;
    modalCarrusel.style.display = "flex";
    cargarProyectos(semana);
  });
});

cerrarModal.addEventListener("click", () => {
  modalCarrusel.style.display = "none";
});

// ==================
// Modal de Previsualización
// ==================
const modalPreview = document.getElementById("modal-preview");
const cerrarPreview = document.getElementById("cerrarPreview");
const previewContainer2 = document.getElementById("preview-container");

function abrirPreview(proyecto) {
  previewContainer2.innerHTML = "";

  const extension = proyecto.nombre.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    const img = new Image();
    img.src = proyecto.url;
    img.className = "w-full h-full object-contain";
    previewContainer2.appendChild(img);
  } 
  else if (extension === "pdf") {
    const iframe = document.createElement("iframe");
    iframe.src = proyecto.url;
    iframe.className = "w-full h-full";
    previewContainer2.appendChild(iframe);
  } 
  else if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(extension)) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(proyecto.url)}`;
    iframe.className = "w-full h-full";
    previewContainer2.appendChild(iframe);
  } 
  else {
    const p = document.createElement("p");
    p.textContent = "📄 No se puede previsualizar este tipo de archivo. Descárgalo.";
    previewContainer2.appendChild(p);
  }

  modalPreview.style.display = "flex";
}

cerrarPreview.addEventListener("click", () => {
  modalPreview.style.display = "none";
});
