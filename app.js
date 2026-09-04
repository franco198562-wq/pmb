// ==============================
// Staff Docs – localStorage app
// Access code: PMB123
// Features: formatting toolbar + auto-save
// ==============================

const ACCESS_CODE = 'PMB123';
const STORAGE_KEY = 'staff_docs_v1';
const AUTH_KEY = 'staff_docs_auth';
const AUTO_SAVE_DELAY = 1500; // ms after last change

// ---------- State ----------
let docs = [];
let currentId = null;
let isEditing = false;
let isLoggedIn = false;
let draft = null; // { title, content } while editing
let autoSaveTimer = null;
let lastSavedSnapshot = null; // to avoid unnecessary saves

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
const formatBar = $('#formatBar');
const saveStatus = $('#saveStatus');
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Auto-save ----------
function showSaveStatus(text, className = '') {
  saveStatus.textContent = text;
  saveStatus.className = 'save-status ' + className;
  saveStatus.classList.remove('hidden');
}

function hideSaveStatus() {
  saveStatus.classList.add('hidden');
}

function getCurrentSnapshot() {
  return {
    title: docTitle.value.trim() || 'Untitled',
    content: docContent.innerHTML,
  };
}

function scheduleAutoSave() {
  if (!isEditing || !isLoggedIn) return;

  clearTimeout(autoSaveTimer);
  showSaveStatus('Saving…', 'saving');

  autoSaveTimer = setTimeout(() => {
    performAutoSave();
  }, AUTO_SAVE_DELAY);
}

function performAutoSave() {
  if (!isEditing || !currentId || !isLoggedIn) return;

  const snapshot = getCurrentSnapshot();
  const snapshotStr = JSON.stringify(snapshot);

  // Skip if nothing changed
  if (snapshotStr === lastSavedSnapshot) {
    showSaveStatus('Saved', 'saved');
    setTimeout(hideSaveStatus, 2000);
    return;
  }

  const doc = getCurrentDoc();
  if (!doc) return;

  doc.title = snapshot.title;
  doc.content = snapshot.content;
  doc.updatedAt = Date.now();

  saveDocs();
  lastSavedSnapshot = snapshotStr;

  // Keep draft in sync
  draft = { ...snapshot };

  docMeta.textContent = `Last updated: ${formatDate(doc.updatedAt)}`;
  renderList(); // update title in sidebar

  showSaveStatus('Saved', 'saved');
  setTimeout(hideSaveStatus, 2500);
}

function forceSave() {
  clearTimeout(autoSaveTimer);
  performAutoSave();
}

// ---------- Formatting ----------
function execFormat(command, value = null) {
  // Focus the editor first so the command applies to the selection
  docContent.focus();
  try {
    document.execCommand(command, false, value);
  } catch (e) {
    console.warn('Format command failed:', command, e);
  }
  // Trigger auto-save after formatting
  scheduleAutoSave();
  updateFormatButtonStates();
}

function updateFormatButtonStates() {
  if (!isEditing) return;

  document.querySelectorAll('.format-btn').forEach((btn) => {
    const cmd = btn.dataset.cmd;
    let isActive = false;

    try {
      if (cmd === 'formatBlock') {
        const value = btn.dataset.value;
        const block = document.queryCommandValue('formatBlock').toLowerCase();
        isActive = block === value || block === value.toUpperCase();
      } else if (['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'].includes(cmd)) {
        isActive = document.queryCommandState(cmd);
      }
    } catch {
      // ignore
    }

    btn.classList.toggle('active', isActive);
  });
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
    formatBar.classList.remove('hidden');
  } else {
    saveBtn.classList.add('hidden');
    cancelBtn.classList.add('hidden');
    formatBar.classList.add('hidden');
    hideSaveStatus();
  }
}

function renderList() {
  docList.innerHTML = '';
  if (docs.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

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
    // Auto-save before switching
    forceSave();
    isEditing = false;
    draft = null;
    clearTimeout(autoSaveTimer);
  }
  currentId = id;
  lastSavedSnapshot = null;
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
  lastSavedSnapshot = JSON.stringify(draft);
  renderDoc();
  docTitle.focus();
}

function cancelEdit() {
  clearTimeout(autoSaveTimer);
  isEditing = false;
  draft = null;
  lastSavedSnapshot = null;
  hideSaveStatus();
  renderDoc();
}

function saveEdit() {
  // Manual save button – force immediate save and exit edit mode
  forceSave();
  isEditing = false;
  draft = null;
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
  lastSavedSnapshot = JSON.stringify(draft);
  renderList();
  renderDoc();
  docTitle.focus();
  docTitle.select();
}

function deleteCurrentDoc() {
  if (!currentId || !isLoggedIn) return;
  clearTimeout(autoSaveTimer);
  docs = docs.filter((d) => d.id !== currentId);
  saveDocs();
  currentId = null;
  isEditing = false;
  draft = null;
  lastSavedSnapshot = null;
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
  if (isEditing) {
    forceSave();
  }
  setAuth(false);
  isEditing = false;
  draft = null;
  clearTimeout(autoSaveTimer);
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

// Formatting toolbar buttons
formatBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.format-btn');
  if (!btn || !isEditing) return;

  const cmd = btn.dataset.cmd;
  const value = btn.dataset.value || null;

  if (cmd === 'formatBlock') {
    execFormat('formatBlock', value);
  } else {
    execFormat(cmd, value);
  }
});

// Update active states when selection changes
docContent.addEventListener('mouseup', updateFormatButtonStates);
docContent.addEventListener('keyup', updateFormatButtonStates);
docContent.addEventListener('focus', updateFormatButtonStates);

// Auto-save triggers
docContent.addEventListener('input', () => {
  if (isEditing) scheduleAutoSave();
});

docTitle.addEventListener('input', () => {
  if (isEditing) scheduleAutoSave();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (!isEditing) return;

  const isMod = e.ctrlKey || e.metaKey;

  // Ctrl/Cmd + S → force save (stay in edit mode)
  if (isMod && e.key === 's') {
    e.preventDefault();
    forceSave();
    return;
  }

  // Formatting shortcuts
  if (isMod && e.key === 'b') {
    e.preventDefault();
    execFormat('bold');
  } else if (isMod && e.key === 'i') {
    e.preventDefault();
    execFormat('italic');
  } else if (isMod && e.key === 'u') {
    e.preventDefault();
    execFormat('underline');
  }
});

// ---------- Init ----------
function init() {
  loadDocs();
  loadAuth();
  renderAuth();
  renderList();
  renderDoc();

  // Seed a sample document if none exist
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
        <h2>Editing features</h2>
        <p>When editing you get a full formatting toolbar:</p>
        <ul>
          <li><b>Bold</b>, <i>Italic</i>, <u>Underline</u>, <s>Strikethrough</s></li>
          <li>Headings (H1, H2, H3) and paragraph</li>
          <li>Bullet and numbered lists</li>
          <li>Text alignment</li>
          <li>Undo / Redo</li>
        </ul>
        <p>Changes are <strong>auto-saved</strong> a couple of seconds after you stop typing.</p>
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
