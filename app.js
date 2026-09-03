// ==============================
// Staff Docs – simple localStorage app
// Access code: PMB123
// ==============================

const ACCESS_CODE = 'PMB123';
const STORAGE_KEY = 'staff_docs_v1';
const AUTH_KEY = 'staff_docs_auth';

// ---------- State ----------
let docs = [];
let currentId = null;
let isEditing = false;
let isLoggedIn = false;
let draft = null; // { title, content } while editing

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const loginBtn = $('#loginBtn');
const logoutBtn = $('#logoutBtn');
const newDocBtn = $('#newDocBtn');
const docList = $('#docList');
const emptyState = $('#emptyState');
const welcomeView = $('#welcomeView');
const docView = $('#docView');
const docTitle = $('#docTitle');
const docMeta = $('#docMeta');
const docContent = $('#docContent');
const editBtn = $('#editBtn');
const saveBtn = $('#saveBtn');
const cancelBtn = $('#cancelBtn');
const deleteBtn = $('#deleteBtn');
const loginModal = $('#loginModal');
const codeInput = $('#codeInput');
const loginError = $('#loginError');
const submitLoginBtn = $('#submitLoginBtn');
const cancelLoginBtn = $('#cancelLoginBtn');
const deleteModal = $('#deleteModal');
const confirmDeleteBtn = $('#confirmDeleteBtn');
const cancelDeleteBtn = $('#cancelDeleteBtn');

// ---------- Storage ----------
function loadDocs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    docs = raw ? JSON.parse(raw) : [];
  } catch {
    docs = [];
  }
}

function saveDocs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

function loadAuth() {
  isLoggedIn = localStorage.getItem(AUTH_KEY) === '1';
}

function setAuth(value) {
  isLoggedIn = value;
  if (value) {
    localStorage.setItem(AUTH_KEY, '1');
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

// ---------- Helpers ----------
function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function generateId() {
  return 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getCurrentDoc() {
  return docs.find((d) => d.id === currentId) || null;
}

// ---------- Render ----------
function renderAuth() {
  if (isLoggedIn) {
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    newDocBtn.classList.remove('hidden');
  } else {
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    newDocBtn.classList.add('hidden');
  }
  // Update action buttons visibility based on current view + auth
  updateActionButtons();
}

function updateActionButtons() {
  const hasDoc = !!currentId;
  if (!hasDoc || isEditing) {
    editBtn.classList.add('hidden');
    deleteBtn.classList.add('hidden');
  } else {
    if (isLoggedIn) {
      editBtn.classList.remove('hidden');
      deleteBtn.classList.remove('hidden');
    } else {
      editBtn.classList.add('hidden');
      deleteBtn.classList.add('hidden');
    }
  }

  if (isEditing) {
    saveBtn.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');
  } else {
    saveBtn.classList.add('hidden');
    cancelBtn.classList.add('hidden');
  }
}

function renderList() {
  docList.innerHTML = '';
  if (docs.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Sort newest first
  const sorted = [...docs].sort((a, b) => b.updatedAt - a.updatedAt);

  sorted.forEach((doc) => {
    const item = document.createElement('div');
    item.className = 'doc-item' + (doc.id === currentId ? ' active' : '');
    item.dataset.id = doc.id;
    item.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span class="doc-item-title">${escapeHtml(doc.title || 'Untitled')}</span>
    `;
    item.addEventListener('click', () => selectDoc(doc.id));
    docList.appendChild(item);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderDoc() {
  const doc = getCurrentDoc();
  if (!doc) {
    welcomeView.classList.remove('hidden');
    docView.classList.add('hidden');
    return;
  }

  welcomeView.classList.add('hidden');
  docView.classList.remove('hidden');

  if (isEditing && draft) {
    docTitle.value = draft.title;
    docContent.innerHTML = draft.content;
    docTitle.removeAttribute('readonly');
    docContent.contentEditable = 'true';
  } else {
    docTitle.value = doc.title || 'Untitled';
    docContent.innerHTML = doc.content || '';
    docTitle.setAttribute('readonly', 'true');
    docContent.contentEditable = 'false';
  }

  docMeta.textContent = `Last updated: ${formatDate(doc.updatedAt)}`;
  updateActionButtons();
}

// ---------- Actions ----------
function selectDoc(id) {
  if (isEditing) {
    // Simple: cancel edit if switching
    cancelEdit();
  }
  currentId = id;
  renderList();
  renderDoc();
}

function startEdit() {
  const doc = getCurrentDoc();
  if (!doc || !isLoggedIn) return;
  isEditing = true;
  draft = {
    title: doc.title,
    content: doc.content,
  };
  renderDoc();
  docTitle.focus();
}

function cancelEdit() {
  isEditing = false;
  draft = null;
  renderDoc();
}

function saveEdit() {
  const doc = getCurrentDoc();
  if (!doc || !isLoggedIn) return;

  const title = docTitle.value.trim() || 'Untitled';
  const content = docContent.innerHTML;

  doc.title = title;
  doc.content = content;
  doc.updatedAt = Date.now();

  saveDocs();
  isEditing = false;
  draft = null;
  renderList();
  renderDoc();
}

function createDoc() {
  if (!isLoggedIn) return;

  const newDoc = {
    id: generateId(),
    title: 'New Document',
    content: '<p></p>',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  docs.push(newDoc);
  saveDocs();
  currentId = newDoc.id;
  isEditing = true;
  draft = { title: newDoc.title, content: newDoc.content };
  renderList();
  renderDoc();
  docTitle.focus();
  docTitle.select();
}

function deleteCurrentDoc() {
  if (!currentId || !isLoggedIn) return;
  docs = docs.filter((d) => d.id !== currentId);
  saveDocs();
  currentId = null;
  isEditing = false;
  draft = null;
  renderList();
  renderDoc();
  closeDeleteModal();
}

// ---------- Login ----------
function openLoginModal() {
  loginModal.classList.remove('hidden');
  loginError.classList.add('hidden');
  codeInput.value = '';
  setTimeout(() => codeInput.focus(), 50);
}

function closeLoginModal() {
  loginModal.classList.add('hidden');
}

function submitLogin() {
  const code = codeInput.value.trim();
  if (code === ACCESS_CODE) {
    setAuth(true);
    closeLoginModal();
    renderAuth();
    renderList();
    renderDoc();
  } else {
    loginError.classList.remove('hidden');
    codeInput.select();
  }
}

function logout() {
  setAuth(false);
  if (isEditing) cancelEdit();
  renderAuth();
  renderList();
  renderDoc();
}

// ---------- Delete modal ----------
function openDeleteModal() {
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
}

// ---------- Event listeners ----------
loginBtn.addEventListener('click', openLoginModal);
logoutBtn.addEventListener('click', logout);
newDocBtn.addEventListener('click', createDoc);
editBtn.addEventListener('click', startEdit);
saveBtn.addEventListener('click', saveEdit);
cancelBtn.addEventListener('click', cancelEdit);
deleteBtn.addEventListener('click', openDeleteModal);

submitLoginBtn.addEventListener('click', submitLogin);
cancelLoginBtn.addEventListener('click', closeLoginModal);
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitLogin();
});

confirmDeleteBtn.addEventListener('click', deleteCurrentDoc);
cancelDeleteBtn.addEventListener('click', closeDeleteModal);

// Close modals on backdrop click
document.querySelectorAll('.modal-backdrop').forEach((el) => {
  el.addEventListener('click', () => {
    closeLoginModal();
    closeDeleteModal();
  });
});

// Keyboard shortcut: Ctrl/Cmd + S to save while editing
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditing) {
    e.preventDefault();
    saveEdit();
  }
});

// ---------- Init ----------
function init() {
  loadDocs();
  loadAuth();
  renderAuth();
  renderList();
  renderDoc();

  // Seed a sample document if none exist (first visit)
  if (docs.length === 0) {
    const sample = {
      id: generateId(),
      title: 'Welcome – Staff Handbook',
      content: `
        <h1>Staff Handbook</h1>
        <p>Welcome to the staff documents portal.</p>
        <h2>How to use this site</h2>
        <ul>
          <li>Everyone can <strong>view</strong> documents.</li>
          <li>Staff members log in with the access code to create, edit or delete documents.</li>
          <li>Click a document on the left to open it.</li>
        </ul>
        <h2>Getting started</h2>
        <p>Log in using the button in the top right, then click the <strong>+</strong> button to create your first real handbook or policy document.</p>
        <p><em>You can safely delete this sample document once you are ready.</em></p>
      `,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    docs.push(sample);
    saveDocs();
    renderList();
  }
}

init();
