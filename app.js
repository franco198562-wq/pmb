// ==============================
// Staff Documentation Portal
// Access code: PMB123
// ==============================

const ACCESS_CODE = 'PMB123';
const STORAGE_KEY = 'staff_portal_v2';
const AUTH_KEY = 'staff_portal_auth';
const AUTO_SAVE_DELAY = 1500;

// ---------- State ----------
let data = { departments: [], books: [] };
let currentDeptId = null;
let currentBookId = null;
let isEditing = false;
let isLoggedIn = false;
let autoSaveTimer = null;
let lastSavedSnapshot = null;
let pendingDelete = null;
let editingDeptId = null;
let editingBookId = null;
let tempDeptImage = null;
let tempBookCover = null;

// ---------- DOM ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const loginBtn = $('#loginBtn');
const logoutBtn = $('#logoutBtn');
const newDeptBtn = $('#newDeptBtn');
const newBookBtn = $('#newBookBtn');
const editDeptBtn = $('#editDeptBtn');
const deleteDeptBtn = $('#deleteDeptBtn');
const editBookBtn = $('#editBookBtn');
const deleteBookBtn = $('#deleteBookBtn');
const backToDepts = $('#backToDepts');
const backToDept = $('#backToDept');
const logoBtn = $('#logoBtn');

const viewDepartments = $('#viewDepartments');
const viewDeptDetail = $('#viewDeptDetail');
const viewBook = $('#viewBook');
const deptGrid = $('#deptGrid');
const bookGrid = $('#bookGrid');
const deptEmpty = $('#deptEmpty');
const bookEmpty = $('#bookEmpty');
const deptTitle = $('#deptTitle');
const deptDesc = $('#deptDesc');
const deptBreadcrumb = $('#deptBreadcrumb');
const bookBreadcrumb = $('#bookBreadcrumb');
const bookTitleInput = $('#bookTitleInput');
const bookDescDisplay = $('#bookDescDisplay');
const bookContent = $('#bookContent');
const formatBar = $('#formatBar');
const saveStatus = $('#saveStatus');
const metaBox = $('#metaBox');
const metaContent = $('#metaContent');

const sidebarHome = $('#sidebarHome');
const sidebarDept = $('#sidebarDept');
const sidebarBook = $('#sidebarBook');

const globalSearch = $('#globalSearch');
const searchResults = $('#searchResults');

const loginModal = $('#loginModal');
const codeInput = $('#codeInput');
const loginError = $('#loginError');
const deptModal = $('#deptModal');
const deptModalTitle = $('#deptModalTitle');
const deptNameInput = $('#deptNameInput');
const deptDescInput = $('#deptDescInput');
const deptImageInput = $('#deptImageInput');
const deptImagePreview = $('#deptImagePreview');
const bookModal = $('#bookModal');
const bookModalTitle = $('#bookModalTitle');
const bookNameInput = $('#bookNameInput');
const bookDescInput = $('#bookDescInput');
const bookCoverInput = $('#bookCoverInput');
const bookCoverPreview = $('#bookCoverPreview');
const deleteModal = $('#deleteModal');
const deleteMessage = $('#deleteMessage');
const imageInput = $('#imageInput');

// ---------- Shared Storage ----------
const API_BASE = '/api';

async function loadData() {
  try {
    const response = await fetch(`${API_BASE}/data`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Load failed: ${response.status}`);
    const remoteData = await response.json();
    data = remoteData && typeof remoteData === 'object' ? remoteData : {};
    if (!Array.isArray(data.departments)) data.departments = [];
    if (!Array.isArray(data.books)) data.books = [];
  } catch (error) {
    console.error('Shared data load failed:', error);
    data = { departments: [], books: [] };
    alert('Unable to load shared data. Check that the Cloudflare Worker is deployed and /api is routed to it.');
  }
}

async function saveData() {
  try {
    const response = await fetch(`${API_BASE}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Save failed: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Shared data save failed:', error);
    alert('Unable to save shared data. Check that the Cloudflare Worker is deployed and /api is routed to it.');
    return false;
  }
}

function loadAuth() {
  isLoggedIn = localStorage.getItem(AUTH_KEY) === '1';
}

function setAuth(v) {
  isLoggedIn = v;
  if (v) localStorage.setItem(AUTH_KEY, '1');
  else localStorage.removeItem(AUTH_KEY);
}

// ---------- Helpers ----------
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function getDept(id) {
  return data.departments.find(d => d.id === id);
}

function getBook(id) {
  return data.books.find(b => b.id === id);
}

function booksInDept(deptId) {
  return data.books.filter(b => b.departmentId === deptId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function isAdmin() {
  return isLoggedIn;
}

function markDirty() {
  saveStatus.textContent = 'Unsaved changes';
  saveStatus.classList.remove('saved');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    await saveData();
    saveStatus.textContent = 'Saved';
    saveStatus.classList.add('saved');
  }, AUTO_SAVE_DELAY);
}

function snapshot() {
  return JSON.stringify(data);
}

function showView(view) {
  viewDepartments.classList.add('hidden');
  viewDeptDetail.classList.add('hidden');
  viewBook.classList.add('hidden');

  if (view === 'departments') {
    viewDepartments.classList.remove('hidden');
    currentDeptId = null;
    currentBookId = null;
    renderDepartments();
  }

  if (view === 'dept') {
    viewDeptDetail.classList.remove('hidden');
    renderDeptDetail();
  }

  if (view === 'book') {
    viewBook.classList.remove('hidden');
    renderBook();
  }

  updateSidebar();
}

function updateSidebar() {
  sidebarHome.classList.toggle('active', !currentDeptId && !currentBookId);
  sidebarDept.classList.toggle('active', !!currentDeptId && !currentBookId);
  sidebarBook.classList.toggle('active', !!currentBookId);
}

function renderAuth() {
  loginBtn.classList.toggle('hidden', isLoggedIn);
  logoutBtn.classList.toggle('hidden', !isLoggedIn);
  newDeptBtn.classList.toggle('hidden', !isAdmin());
  newBookBtn.classList.toggle('hidden', !isAdmin());
  editDeptBtn.classList.toggle('hidden', !isAdmin());
  deleteDeptBtn.classList.toggle('hidden', !isAdmin());
  editBookBtn.classList.toggle('hidden', !isAdmin());
  deleteBookBtn.classList.toggle('hidden', !isAdmin());
}

// ---------- Rendering ----------
function renderDepartments() {
  deptGrid.innerHTML = '';

  const departments = [...data.departments].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  );

  deptEmpty.classList.toggle('hidden', departments.length > 0);

  departments.forEach(dept => {
    const card = document.createElement('button');
    card.className = 'dept-card';
    card.type = 'button';

    const cover = dept.image
      ? `<img src="${escapeHtml(dept.image)}" alt="">`
      : `<div class="dept-placeholder"><span>▦</span></div>`;

    card.innerHTML = `
      <div class="dept-card-image">${cover}</div>
      <div class="dept-card-body">
        <h3>${escapeHtml(dept.name)}</h3>
        <p>${escapeHtml(dept.description || '')}</p>
        <span>${booksInDept(dept.id).length} ${booksInDept(dept.id).length === 1 ? 'book' : 'books'}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      currentDeptId = dept.id;
      showView('dept');
    });

    deptGrid.appendChild(card);
  });
}

function renderDeptDetail() {
  const dept = getDept(currentDeptId);
  if (!dept) {
    showView('departments');
    return;
  }

  deptTitle.textContent = dept.name;
  deptDesc.textContent = dept.description || '';
  deptBreadcrumb.textContent = dept.name;

  const books = booksInDept(dept.id);
  bookGrid.innerHTML = '';
  bookEmpty.classList.toggle('hidden', books.length > 0);

  books.forEach(book => {
    const card = document.createElement('button');
    card.className = 'book-card';
    card.type = 'button';

    const cover = book.cover
      ? `<img src="${escapeHtml(book.cover)}" alt="">`
      : `<div class="book-placeholder"><span>▤</span></div>`;

    card.innerHTML = `
      <div class="book-card-cover">${cover}</div>
      <div class="book-card-body">
        <h3>${escapeHtml(book.name)}</h3>
        <p>${escapeHtml(book.description || '')}</p>
        <span>Updated ${formatDate(book.updatedAt)}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      currentBookId = book.id;
      showView('book');
    });

    bookGrid.appendChild(card);
  });
}

function renderBook() {
  const book = getBook(currentBookId);
  if (!book) {
    showView('departments');
    return;
  }

  const dept = getDept(book.departmentId);
  bookBreadcrumb.textContent = dept ? dept.name : 'Department';
  bookTitleInput.value = book.name || '';
  bookDescDisplay.textContent = book.description || '';
  bookContent.innerHTML = book.content || '';

  metaContent.innerHTML = `
    <div><strong>Created:</strong> ${formatDate(book.createdAt)}</div>
    <div><strong>Updated:</strong> ${formatDate(book.updatedAt)}</div>
  `;

  setEditing(false);
}

function setEditing(v) {
  isEditing = v;

  bookTitleInput.readOnly = !v;
  bookContent.contentEditable = v ? 'true' : 'false';
  bookDescDisplay.classList.toggle('hidden', v);
  formatBar.classList.toggle('hidden', !v);
  metaBox.classList.toggle('hidden', v);

  if (v) {
    bookTitleInput.focus();
  }
}

function refreshCurrentBook() {
  const book = getBook(currentBookId);
  if (!book) return;

  book.name = bookTitleInput.value.trim() || 'Untitled Book';
  book.content = bookContent.innerHTML;
  book.updatedAt = Date.now();

  markDirty();
}

function renderSearchResults(query) {
  searchResults.innerHTML = '';

  if (!query.trim()) {
    searchResults.classList.add('hidden');
    return;
  }

  const q = query.toLowerCase();
  const results = [];

  data.departments.forEach(dept => {
    if ((dept.name || '').toLowerCase().includes(q) ||
        (dept.description || '').toLowerCase().includes(q)) {
      results.push({
        type: 'Department',
        name: dept.name,
        id: dept.id
      });
    }
  });

  data.books.forEach(book => {
    if ((book.name || '').toLowerCase().includes(q) ||
        (book.description || '').toLowerCase().includes(q)) {
      results.push({
        type: 'Book',
        name: book.name,
        id: book.id
      });
    }
  });

  if (!results.length) {
    searchResults.innerHTML = '<div class="search-empty">No results found</div>';
  } else {
    results.slice(0, 10).forEach(result => {
      const item = document.createElement('button');
      item.className = 'search-result';
      item.type = 'button';
      item.innerHTML = `
        <span class="search-result-type">${result.type}</span>
        <strong>${escapeHtml(result.name)}</strong>
      `;

      item.addEventListener('click', () => {
        if (result.type === 'Department') {
          currentDeptId = result.id;
          showView('dept');
        } else {
          const book = getBook(result.id);
          if (book) {
            currentDeptId = book.departmentId;
            currentBookId = book.id;
            showView('book');
          }
        }
        searchResults.classList.add('hidden');
        globalSearch.value = '';
      });

      searchResults.appendChild(item);
    });
  }

  searchResults.classList.remove('hidden');
}

// ---------- Login ----------
loginBtn.addEventListener('click', () => {
  loginModal.classList.remove('hidden');
  codeInput.value = '';
  loginError.textContent = '';
  codeInput.focus();
});

logoutBtn.addEventListener('click', () => {
  setAuth(false);
  renderAuth();
  setEditing(false);
});

$('#loginSubmit').addEventListener('click', () => {
  if (codeInput.value === ACCESS_CODE) {
    setAuth(true);
    loginModal.classList.add('hidden');
    renderAuth();
  } else {
    loginError.textContent = 'Incorrect access code.';
  }
});

codeInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#loginSubmit').click();
});

// ---------- Navigation ----------
logoBtn.addEventListener('click', () => showView('departments'));
backToDepts.addEventListener('click', () => showView('departments'));
backToDept.addEventListener('click', () => showView('dept'));

sidebarHome.addEventListener('click', () => showView('departments'));
sidebarDept.addEventListener('click', () => {
  if (currentDeptId) showView('dept');
});
sidebarBook.addEventListener('click', () => {
  if (currentBookId) showView('book');
});

// ---------- Department Modals ----------
function openDeptModal(dept = null) {
  editingDeptId = dept ? dept.id : null;
  deptModalTitle.textContent = dept ? 'Edit Department' : 'New Department';
  deptNameInput.value = dept ? dept.name : '';
  deptDescInput.value = dept ? dept.description : '';
  tempDeptImage = dept ? dept.image : null;

  deptImagePreview.innerHTML = tempDeptImage
    ? `<img src="${escapeHtml(tempDeptImage)}" alt="">`
    : '';

  deptModal.classList.remove('hidden');
  deptNameInput.focus();
}

newDeptBtn.addEventListener('click', () => openDeptModal());

editDeptBtn.addEventListener('click', () => {
  const dept = getDept(currentDeptId);
  if (dept) openDeptModal(dept);
});

deptImageInput.addEventListener('change', () => {
  const file = deptImageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    tempDeptImage = e.target.result;
    deptImagePreview.innerHTML = `<img src="${escapeHtml(tempDeptImage)}" alt="">`;
  };
  reader.readAsDataURL(file);
});

$('#deptSave').addEventListener('click', async () => {
  const name = deptNameInput.value.trim();
  if (!name) return;

  if (editingDeptId) {
    const dept = getDept(editingDeptId);
    if (dept) {
      dept.name = name;
      dept.description = deptDescInput.value.trim();
      dept.image = tempDeptImage;
      dept.updatedAt = Date.now();
    }
  } else {
    data.departments.push({
      id: uid(),
      name,
      description: deptDescInput.value.trim(),
      image: tempDeptImage,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  await saveData();
  deptModal.classList.add('hidden');
  renderDepartments();

  if (currentDeptId) renderDeptDetail();
});

$('#deptCancel').addEventListener('click', () => {
  deptModal.classList.add('hidden');
});

// ---------- Book Modals ----------
function openBookModal(book = null) {
  editingBookId = book ? book.id : null;
  bookModalTitle.textContent = book ? 'Edit Book' : 'New Book';
  bookNameInput.value = book ? book.name : '';
  bookDescInput.value = book ? book.description : '';
  tempBookCover = book ? book.cover : null;

  bookCoverPreview.innerHTML = tempBookCover
    ? `<img src="${escapeHtml(tempBookCover)}" alt="">`
    : '';

  bookModal.classList.remove('hidden');
  bookNameInput.focus();
}

newBookBtn.addEventListener('click', () => {
  if (!currentDeptId) return;
  openBookModal();
});

editBookBtn.addEventListener('click', () => {
  const book = getBook(currentBookId);
  if (book) openBookModal(book);
});

bookCoverInput.addEventListener('change', () => {
  const file = bookCoverInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    tempBookCover = e.target.result;
    bookCoverPreview.innerHTML = `<img src="${escapeHtml(tempBookCover)}" alt="">`;
  };
  reader.readAsDataURL(file);
});

$('#bookSave').addEventListener('click', async () => {
  const name = bookNameInput.value.trim();
  if (!name || !currentDeptId) return;

  if (editingBookId) {
    const book = getBook(editingBookId);
    if (book) {
      book.name = name;
      book.description = bookDescInput.value.trim();
      book.cover = tempBookCover;
      book.updatedAt = Date.now();
    }
  } else {
    const newBook = {
      id: uid(),
      departmentId: currentDeptId,
      name,
      description: bookDescInput.value.trim(),
      cover: tempBookCover,
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    data.books.push(newBook);
    currentBookId = newBook.id;
  }

  await saveData();
  bookModal.classList.add('hidden');
  renderDeptDetail();

  if (currentBookId) showView('book');
});

$('#bookCancel').addEventListener('click', () => {
  bookModal.classList.add('hidden');
});

// ---------- Delete ----------
function openDeleteModal(type, id) {
  pendingDelete = { type, id };

  const item = type === 'department'
    ? getDept(id)
    : getBook(id);

  deleteMessage.textContent = `Are you sure you want to delete "${item ? item.name : ''}"?`;
  deleteModal.classList.remove('hidden');
}

deleteDeptBtn.addEventListener('click', () => {
  if (currentDeptId) openDeleteModal('department', currentDeptId);
});

deleteBookBtn.addEventListener('click', () => {
  if (currentBookId) openDeleteModal('book', currentBookId);
});

$('#deleteConfirm').addEventListener('click', async () => {
  if (!pendingDelete) return;

  if (pendingDelete.type === 'department') {
    data.departments = data.departments.filter(d => d.id !== pendingDelete.id);
    data.books = data.books.filter(b => b.departmentId !== pendingDelete.id);
    currentDeptId = null;
    currentBookId = null;
    showView('departments');
  } else {
    data.books = data.books.filter(b => b.id !== pendingDelete.id);
    currentBookId = null;
    showView('dept');
  }

  await saveData();
  deleteModal.classList.add('hidden');
  pendingDelete = null;
});

$('#deleteCancel').addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  pendingDelete = null;
});

// ---------- Book Editing ----------
editBookBtn.addEventListener('click', () => {
  const book = getBook(currentBookId);
  if (book) openBookModal(book);
});

$('#bookEdit').addEventListener('click', () => {
  if (!isAdmin()) return;
  setEditing(true);
});

$('#bookSaveContent').addEventListener('click', async () => {
  if (!currentBookId) return;

  const book = getBook(currentBookId);
  if (!book) return;

  book.name = bookTitleInput.value.trim() || 'Untitled Book';
  book.content = bookContent.innerHTML;
  book.updatedAt = Date.now();

  await saveData();
  setEditing(false);
  renderBook();
});

bookTitleInput.addEventListener('input', () => {
  if (isEditing) refreshCurrentBook();
});

bookContent.addEventListener('input', () => {
  if (isEditing) refreshCurrentBook();
});

// ---------- Formatting ----------
function execFormat(command, value = null) {
  if (!isEditing) return;
  document.execCommand(command, false, value);
  bookContent.focus();
  refreshCurrentBook();
}

formatBar.querySelectorAll('[data-command]').forEach(btn => {
  btn.addEventListener('click', () => {
    execFormat(btn.dataset.command, btn.dataset.value || null);
  });
});

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    execFormat('insertImage', e.target.result);
  };
  reader.readAsDataURL(file);
});

document.addEventListener('keydown', e => {
  if (!isEditing) return;

  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'b') { e.preventDefault(); execFormat('bold'); }
  if (mod && e.key === 'i') { e.preventDefault(); execFormat('italic'); }
  if (mod && e.key === 'u') { e.preventDefault(); execFormat('underline'); }
});

// ---------- Search ----------
globalSearch.addEventListener('input', () => renderSearchResults(globalSearch.value));
globalSearch.addEventListener('focus', () => {
  if (globalSearch.value.trim()) renderSearchResults(globalSearch.value);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchResults.classList.add('hidden');
});

// ---------- Modal Backdrops ----------
$$('.modal-backdrop').forEach(el => {
  el.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    deptModal.classList.add('hidden');
    bookModal.classList.add('hidden');
    deleteModal.classList.add('hidden');
  });
});

// ---------- Init ----------
async function init() {
  await loadData();
  loadAuth();
  renderAuth();
  showView('departments');
}

init();
