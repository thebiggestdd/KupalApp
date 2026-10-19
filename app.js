const { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, MAX_MB } = window.KUPAL_CONFIG;
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const nameInput = $("username"), fileInput = $("fileInput"), fileStatus = $("fileStatus");
const uploadBtn = $("uploadBtn"), gallery = $("gallery"), empty = $("empty"), msg = $("message");

let me = null; // anonymous user id, used to decide who can delete what

function say(text, isError = false) {
  msg.textContent = text;
  msg.style.color = isError ? "#fff3a8" : "#fff";
}

async function init() {
  // Anonymous sign-in gives each browser its own identity so people can only delete their own photos.
  let { data: { session } } = await db.auth.getSession();
  if (!session) {
    const { data, error } = await db.auth.signInAnonymously();
    if (error) { say("Couldn't start a session. Is anonymous sign-in enabled in Supabase?", true); return; }
    session = data.session;
  }
  me = session.user.id;
  nameInput.value = localStorage.getItem("kupal_name") || "";
  await loadPhotos();
}

$("chooseBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  fileStatus.textContent = fileInput.files[0] ? fileInput.files[0].name : "No file selected";
});

uploadBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const file = fileInput.files[0];
  if (!name) return say("Type your name or username first.", true);
  if (!file) return say("Choose a picture to upload.", true);
  if (!file.type.startsWith("image/")) return say("That file isn't an image.", true);
  if (file.size > MAX_MB * 1024 * 1024) return say(`Pictures must be under ${MAX_MB} MB.`, true);

  uploadBtn.disabled = true;
  say("Uploading...");
  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${me}/${crypto.randomUUID()}.${ext}`;

    const up = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (up.error) throw up.error;

    const ins = await db.from("photos").insert({ username: name, path });
    if (ins.error) {
      await db.storage.from(BUCKET).remove([path]); // don't leave an orphan file
      throw ins.error;
    }

    localStorage.setItem("kupal_name", name);
    fileInput.value = "";
    fileStatus.textContent = "No file selected";
    say("Uploaded!");
    await loadPhotos();
  } catch (e) {
    say(`Upload failed: ${e.message}`, true);
  } finally {
    uploadBtn.disabled = false;
  }
});

async function loadPhotos() {
  const { data, error } = await db.from("photos").select("*").order("created_at", { ascending: false });
  if (error) return say(`Couldn't load photos: ${error.message}`, true);

  gallery.replaceChildren();
  empty.hidden = data.length > 0;

  for (const p of data) {
    const url = db.storage.from(BUCKET).getPublicUrl(p.path).data.publicUrl;

    const card = document.createElement("article");
    card.className = "card";

    const photo = document.createElement("div");
    photo.className = "photo";
    const img = document.createElement("img");
    img.src = url; img.loading = "lazy"; img.alt = `Photo uploaded by ${p.username}`;
    photo.append(img);

    const meta = document.createElement("div");
    meta.className = "meta";
    const text = document.createElement("div");
    const who = document.createElement("div"); who.className = "who"; who.textContent = p.username;
    const when = document.createElement("div"); when.className = "when";
    when.textContent = new Date(p.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    text.append(who, when);
    meta.append(text);

    if (p.owner === me) {
      const del = document.createElement("button");
      del.className = "pill delete"; del.type = "button"; del.textContent = "Delete";
      del.addEventListener("click", () => removePhoto(p, del));
      meta.append(del);
    }

    card.append(photo, meta);
    gallery.append(card);
  }
}

async function removePhoto(p, btn) {
  if (!confirm("Delete this photo?")) return;
  btn.disabled = true;
  const r1 = await db.from("photos").delete().eq("id", p.id);
  if (r1.error) { btn.disabled = false; return say(`Delete failed: ${r1.error.message}`, true); }
  await db.storage.from(BUCKET).remove([p.path]);
  say("Deleted.");
  await loadPhotos();
}

init();
