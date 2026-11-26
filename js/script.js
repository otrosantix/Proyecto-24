// Clave de almacenamiento y duracion de vida de cada historia
const STORAGE_KEY = "stories";
const DAY_MS = 24 * 60 * 60 * 1000;

// Dimensiones maximas permitidas para las imagenes
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;

// Distancia minima en pixeles para considerar un gesto de deslizar
const SWIPE_DISTANCE = 50;

const $ = function (id) { return document.getElementById(id); };

let stories = load();
let current = 0;
let startX = null;

// Lee las historias guardadas y descarta las que ya pasaron 24 horas
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return data.filter(function (s) { return Date.now() - s.createdAt < DAY_MS; });
  } catch (e) {
    return [];
  }
}

// Guarda las historias y devuelve false si el almacenamiento esta lleno
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    return true;
  } catch (e) {
    return false;
  }
}

// Dibuja la lista de historias junto al boton para agregar
function renderList() {
  const list = $("story-list");
  while (list.children.length > 1) list.removeChild(list.lastChild);
  stories.forEach(function (story, i) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "story";
    btn.setAttribute("aria-label", "Ver historia " + (i + 1));
    const img = document.createElement("img");
    img.src = story.src;
    img.alt = "";
    btn.appendChild(img);
    btn.addEventListener("click", function () { openViewer(i); });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

// Elimina las historias vencidas y actualiza la pantalla
function removeExpired() {
  const fresh = stories.filter(function (s) { return Date.now() - s.createdAt < DAY_MS; });
  if (fresh.length === stories.length) return;
  stories = fresh;
  save();
  renderList();
  if (!$("viewer").hidden) closeViewer();
}

// Reduce la imagen al tamano maximo y la convierte a base64
function resizeImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      const scale = Math.min(1, MAX_WIDTH / img.width, MAX_HEIGHT / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function addStory(file) {
  resizeImage(file, function (src) {
    stories.push({ src: src, createdAt: Date.now() });
    if (!save()) {
      stories.pop();
      alert("No hay espacio suficiente para guardar la imagen.");
      return;
    }
    renderList();
  });
}

// Muestra la historia actual con una barra de progreso por cada historia
function renderViewer() {
  $("viewer-img").src = stories[current].src;
  const bars = $("bars");
  bars.innerHTML = "";
  stories.forEach(function (s, i) {
    const track = document.createElement("div");
    track.className = "track" + (i < current ? " done" : i === current ? " active" : "");
    const fill = document.createElement("div");
    fill.className = "fill";
    if (i === current) fill.addEventListener("animationend", next);
    track.appendChild(fill);
    bars.appendChild(track);
  });
}

function openViewer(index) {
  current = index;
  $("viewer").hidden = false;
  renderViewer();
  $("close").focus();
}

function closeViewer() {
  $("viewer").hidden = true;
}

function next() {
  if (current < stories.length - 1) {
    current += 1;
    renderViewer();
  } else {
    closeViewer();
  }
}

function prev() {
  if (current > 0) current -= 1;
  renderViewer();
}

$("add").addEventListener("click", function () { $("file").click(); });

$("file").addEventListener("change", function () {
  const file = $("file").files[0];
  if (file) addStory(file);
  $("file").value = "";
});

$("close").addEventListener("click", closeViewer);

// Deslizar a la izquierda avanza y a la derecha retrocede
$("viewer").addEventListener("pointerdown", function (e) {
  startX = e.target.closest("button") ? null : e.clientX;
});

$("viewer").addEventListener("pointerup", function (e) {
  if (startX === null) return;
  const dx = e.clientX - startX;
  startX = null;
  if (dx <= -SWIPE_DISTANCE) next();
  else if (dx >= SWIPE_DISTANCE) prev();
});

document.addEventListener("keydown", function (e) {
  if ($("viewer").hidden) return;
  if (e.key === "ArrowRight") next();
  else if (e.key === "ArrowLeft") prev();
  else if (e.key === "Escape") closeViewer();
});

// Revisa cada minuto si alguna historia ya vencio
setInterval(removeExpired, 60000);

renderList();
