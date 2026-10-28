const API = "/api";
const state = { user: null, isRegister: false, submissions: [] };
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
const prettyStatus = value => ({submitted:"Submitted",under_review:"Under review",in_progress:"In progress",resolved:"Resolved",rejected:"Closed"}[value] || value);
const prettyType = value => value === "compliment" ? "Compliment" : "Grievance";

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Something went wrong. Please try again.");
  return payload;
}
function toast(message) {
  const element = $("#toast"); element.textContent = message; element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 3000);
}
function setMessage(element, message, isError = false) {
  element.textContent = message; element.classList.toggle("error", isError);
}
function updateTypeCards() {
  document.querySelectorAll(".type-option").forEach(card => {
    card.classList.toggle("selected", card.querySelector("input").checked);
  });
}
document.querySelectorAll('input[name="type"]').forEach(input => input.addEventListener("change", updateTypeCards));

function showAuth(register = false) {
  state.isRegister = register;
  $("#authTitle").textContent = register ? "Create account" : "Sign in";
  $("#authDescription").textContent = register ? "Create an account to submit and track campus feedback." : "Sign in to submit feedback and track progress.";
  $("#authSubmit").textContent = register ? "Create account" : "Sign in";
  $("#authPassword").autocomplete = register ? "new-password" : "current-password";
  $("#registerNameWrap").hidden = !register;
  $("#authName").required = register;
  $("#authSwitchText").textContent = register ? "Already registered?" : "New here?";
  $("#toggleAuthMode").textContent = register ? "Sign in" : "Create an account";
  setMessage($("#authError"), "");
  $("#authDialog").showModal();
}
$("#openAuth").addEventListener("click", () => showAuth(false));
$("#closeAuth").addEventListener("click", () => $("#authDialog").close());
$("#toggleAuthMode").addEventListener("click", () => showAuth(!state.isRegister));
$("#authDialog").addEventListener("click", event => {
  if (event.target === $("#authDialog")) $("#authDialog").close();
});

$("#authForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("#authSubmit"); button.disabled = true; setMessage($("#authError"), "");
  try {
    const body = { email: $("#authEmail").value.trim(), password: $("#authPassword").value };
    let result;
    if (state.isRegister) {
      body.name = $("#authName").value.trim();
      result = await api("/auth/register", { method: "POST", body: JSON.stringify(body) });
    } else {
      result = await api("/auth/login", { method: "POST", body: JSON.stringify(body) });
    }
    state.user = result.user;
    $("#authDialog").close(); $("#authForm").reset(); renderAccount(); await loadSubmissions();
    toast(state.isRegister ? "Account created successfully." : "Welcome back.");
  } catch (error) { setMessage($("#authError"), error.message, true); }
  finally { button.disabled = false; }
});

async function logout() {
  try { await api("/auth/logout", { method: "POST", body: "{}" }); state.user = null; renderAccount(); await loadSubmissions(); toast("You have signed out."); }
  catch (error) { toast(error.message); }
}
function renderAccount() {
  const area = $("#accountArea");
  if (!state.user) {
    area.innerHTML = '<button class="btn btn-outline" id="openAuthAgain">Sign in</button>';
    $("#openAuthAgain").addEventListener("click", () => showAuth(false));
    $("#authHint").textContent = "Sign in or create an account to submit feedback and track your own submissions.";
  } else {
    area.innerHTML = `<span class="account-name">${escapeHtml(state.user.name)}${state.user.role === "admin" ? " · Admin" : ""}</span> <button class="btn btn-outline" id="logoutBtn">Sign out</button>`;
    $("#logoutBtn").addEventListener("click", logout);
    $("#authHint").textContent = state.user.role === "admin" ? "Administrator access: you can review submissions and update their status." : "You are signed in. Your submissions are private to you and authorized administrators.";
  }
}

$("#feedbackForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!state.user) { showAuth(false); setMessage($("#formMessage"), "Please sign in before submitting feedback.", true); return; }
  const button = $("#submitBtn"); button.disabled = true; button.textContent = "Submitting…";
  const body = {
    type: document.querySelector('input[name="type"]:checked').value,
    title: $("#title").value.trim(), category: $("#category").value,
    description: $("#description").value.trim()
  };
  try {
    await api("/submissions", { method: "POST", body: JSON.stringify(body) });
    $("#feedbackForm").reset(); updateTypeCards(); setMessage($("#formMessage"), "Your feedback has been submitted successfully.");
    await loadSubmissions(); toast("Feedback submitted.");
  } catch (error) { setMessage($("#formMessage"), error.message, true); }
  finally { button.disabled = false; button.innerHTML = 'Submit feedback <span>↗</span>'; }
});

async function loadSubmissions() {
  try {
    const [stats, result] = await Promise.all([api("/stats"), state.user ? api("/submissions") : Promise.resolve({ submissions: [] })]);
    $("#statTotal").textContent = stats.total;
    $("#statCompliments").textContent = stats.compliments;
    $("#statOpen").textContent = stats.openGrievances;
    $("#statResolved").textContent = stats.resolved;
    state.submissions = result.submissions || [];
    renderSubmissions();
  } catch (error) {
    $("#submissionsList").innerHTML = `<div class="empty-state"><strong>Could not load data</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}
function renderSubmissions() {
  const type = $("#filterType").value, status = $("#filterStatus").value;
  const items = state.submissions.filter(item => (!type || item.type === type) && (!status || item.status === status));
  const container = $("#submissionsList");
  if (!state.user) {
    container.innerHTML = '<div class="empty-state"><span>☷</span><strong>Sign in to see submissions</strong><p>Your feedback history and status updates will appear here.</p></div>'; return;
  }
  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><span>☷</span><strong>No submissions found</strong><p>Submit feedback or change the filters to see records.</p></div>'; return;
  }
  container.innerHTML = items.map(item => `
    <article class="submission">
      <div><h3>${escapeHtml(item.title)}</h3>
        <div class="submission-meta"><span class="badge badge-${item.type}">${prettyType(item.type)}</span><span>${escapeHtml(item.category)}</span><span>${new Date(item.created_at).toLocaleDateString()}</span></div>
        <p>${escapeHtml(item.description)}</p>
        ${item.admin_note ? `<p><strong>Admin update:</strong> ${escapeHtml(item.admin_note)}</p>` : ""}
        ${state.user.role === "admin" ? `<div class="admin-tools"><select aria-label="Update status for ${escapeHtml(item.title)}" data-status-id="${item.id}">${["submitted","under_review","in_progress","resolved","rejected"].map(s => `<option value="${s}" ${s === item.status ? "selected" : ""}>${prettyStatus(s)}</option>`).join("")}</select><input aria-label="Admin note for ${escapeHtml(item.title)}" placeholder="Optional update note" maxlength="1000" data-note-id="${item.id}"><button class="btn btn-primary" data-save-id="${item.id}">Save update</button></div>` : ""}
      </div><div class="submission-actions"><span class="badge status-${item.status}">${prettyStatus(item.status)}</span></div>
    </article>`).join("");
  container.querySelectorAll("[data-save-id]").forEach(button => button.addEventListener("click", async () => {
    const id = button.dataset.saveId;
    const status = container.querySelector(`[data-status-id="${id}"]`).value;
    const admin_note = container.querySelector(`[data-note-id="${id}"]`).value.trim();
    button.disabled = true;
    try { await api(`/submissions/${id}/status`, { method:"PATCH", body:JSON.stringify({status, admin_note}) }); toast("Submission updated."); await loadSubmissions(); }
    catch (error) { toast(error.message); button.disabled = false; }
  }));
}
$("#filterType").addEventListener("change", renderSubmissions);
$("#filterStatus").addEventListener("change", renderSubmissions);
async function init() {
  $("#year").textContent = new Date().getFullYear();
  try { const result = await api("/auth/me"); state.user = result.user; } catch (_) { state.user = null; }
  renderAccount(); await loadSubmissions();
}
init();
