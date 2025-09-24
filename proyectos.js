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

  // Carpeta normalizada: semana_#
  const carpeta = `semana_${semana}`;
const filePath = `semana_${semana}/${Date.now()}_${archivo.name}`;


  // 1. Subir al bucket "proyectos"
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

  // 3. Guardar metadata en la tabla "proyectos"
  let { error: insertError } = await supabaseClient
    .from("proyectos")
    .insert([
      { nombre: archivo.name, semana: `semana_${semana}`, url: publicUrl }

    ]);

  if (insertError) {
    uploadStatus.textContent = "❌ Error al guardar en BD: " + insertError.message;
    return;
  }

  uploadStatus.textContent = "✅ Archivo subido correctamente.";
  fileInput.value = "";
  setTimeout(() => {
    uploadModal.style.display = "none";
    uploadStatus.textContent = "";
    cargarProyectos(semana); // refrescar la vista
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
      <a href="${proyecto.url}" target="_blank" class="btn-ver">👁 Ver</a>
      <a href="${proyecto.url}" download class="btn-descargar">⬇ Descargar</a>
    </div>
  `;
  carruselProyectos.appendChild(div);

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
