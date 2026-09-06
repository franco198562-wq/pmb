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

// ---------- Shared storage ----------
const API_BASE = '/api';

async function loadData() {
  try {
    const response = await fetch(`${API_BASE}/data`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to load shared data');
    }

    const result = await response.json();

    data = {
      departments: Array.isArray(result.departments)
        ? result.departments
        : [],
      books: Array.isArray(result.books)
        ? result.books
        : []
    };
  } catch (error) {
    console.error('Load data error:', error);

    data = {
      departments: [],
      books: []
    };

    alert(
      'Unable to load shared data. Please check that the Cloudflare Worker is deployed correctly.'
    );
  }
}

async function saveData() {
  try {
    const response = await fetch(`${API_BASE}/data`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to save shared data');
    }

    lastSavedSnapshot = JSON.stringify(data);
  } catch (error) {
    console.error('Save data error:', error);

    alert(
      'Unable to save shared data. Please check that the Cloudflare Worker is deployed correctly.'
    );
  }
}

// ---------- Authentication ----------
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

function renderAuth() {
  const editorButtons = [
    newDeptBtn,
    newBookBtn,
    editDeptBtn,
    deleteDeptBtn,
    editBookBtn,
    deleteBookBtn
  ];

  if (isLoggedIn) {
    loginBtn?.classList.add('hidden');
    logoutBtn?.classList.remove('hidden');

    editorButtons.forEach((button) => {
      button?.classList.remove('hidden');
    });
  } else {
    loginBtn?.classList.remove('hidden');
    logoutBtn?.classList.add('hidden');

    editorButtons.forEach((button) => {
      button?.classList.add('hidden');
    });
  }
}

// ---------- Helpers ----------
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDept(id) {
  return data.departments.find((department) => department.id === id);
}

function getBook(id) {
  return data.books.find((book) => book.id === id);
}

function booksInDept(departmentId) {
  return data.books.filter(
    (book) => book.departmentId === departmentId
  );
}

function formatDate(value) {
  if (!value) return 'Unknown';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

// ---------- Views ----------
function showView(name) {
  viewDepartments?.classList.add('hidden');
  viewDeptDetail?.classList.add('hidden');
  viewBook?.classList.add('hidden');

  sidebarHome?.classList.add('hidden');
  sidebarDept?.classList.add('hidden');
  sidebarBook?.classList.add('hidden');
  metaBox?.classList.add('hidden');

  if (name === 'departments') {
    viewDepartments?.classList.remove('hidden');
    sidebarHome?.classList.remove('hidden');

    currentDeptId = null;
    currentBookId = null;
    isEditing = false;

    renderDepartments();
  }

  if (name === 'dept') {
    viewDeptDetail?.classList.remove('hidden');
    sidebarDept?.classList.remove('hidden');

    currentBookId = null;
    isEditing = false;

    renderDeptDetail();
  }

  if (name === 'book') {
    viewBook?.classList.remove('hidden');
    sidebarBook?.classList.remove('hidden');

    renderBookView();
  }

  renderAuth();
}

function renderDepartments() {
  if (!deptGrid) return;

  deptGrid.innerHTML = '';

  if (data.departments.length === 0) {
    deptEmpty?.classList.remove('hidden');
    return;
  }

  deptEmpty?.classList.add('hidden');

  const sortedDepartments = [...data.departments].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sortedDepartments.forEach((department) => {
    const count = booksInDept(department.id).length;

    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <div class="card-cover">
        ${
          department.image
            ? `<img src="${department.image}" alt="">`
            : `<span class="placeholder">📁</span>`
        }
      </div>

      <div class="card-body">
        <div class="card-title">
          ${escapeHtml(department.name)}
        </div>

        <div class="card-desc">
          ${escapeHtml(department.description || '')}
        </div>

        <div class="card-meta">
          ${count} book${count !== 1 ? 's' : ''}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      currentDeptId = department.id;
      showView('dept');
    });

    deptGrid.appendChild(card);
  });
}

function renderDeptDetail() {
  const department = getDept(currentDeptId);

  if (!department) {
    showView('departments');
    return;
  }

  deptTitle.textContent = department.name;
  deptDesc.textContent = department.description || '';

  deptBreadcrumb.innerHTML = `
    <span data-go="departments">Departments</span>
    <span class="sep">›</span>
    <span class="current">${escapeHtml(department.name)}</span>
  `;

  deptBreadcrumb
    .querySelector('[data-go="departments"]')
    ?.addEventListener('click', () => {
      showView('departments');
    });

  metaBox?.classList.remove('hidden');

  metaContent.innerHTML = `
    Created ${formatDate(department.createdAt)}<br>
    Updated ${formatDate(department.updatedAt)}
  `;

  const books = booksInDept(currentDeptId);

  bookGrid.innerHTML = '';

  if (books.length === 0) {
    bookEmpty?.classList.remove('hidden');
    return;
  }

  bookEmpty?.classList.add('hidden');

  books.forEach((book) => {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <div class="card-cover">
        ${
          book.cover
            ? `<img src="${book.cover}" alt="">`
            : `<span class="placeholder">📄</span>`
        }
      </div>

      <div class="card-body">
        <div class="card-title">
          ${escapeHtml(book.title)}
        </div>

        <div class="card-desc">
          ${escapeHtml(book.description || '')}
        </div>

        <div class="card-meta">
          Updated ${formatDate(book.updatedAt)}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      currentBookId = book.id;
      showView('book');
    });

    bookGrid.appendChild(card);
  });
}

function renderBookView() {
  const book = getBook(currentBookId);
  const department = getDept(book?.departmentId);

  if (!book || !department) {
    showView('departments');
    return;
  }

  bookBreadcrumb.innerHTML = `
    <span data-go="departments">Departments</span>
    <span class="sep">›</span>
    <span data-go="dept">${escapeHtml(department.name)}</span>
    <span class="sep">›</span>
    <span class="current">${escapeHtml(book.title)}</span>
  `;

  bookBreadcrumb.querySelectorAll('[data-go]').forEach((element) => {
    element.addEventListener('click', () => {
      if (element.dataset.go === 'departments') {
        showView('departments');
      }

      if (element.dataset.go === 'dept') {
        currentDeptId = department.id;
        showView('dept');
      }
    });
  });

  bookTitleInput.value = book.title;
  bookDescDisplay.textContent = book.description || '';
  bookContent.innerHTML = book.content || '';

  if (isEditing && isLoggedIn) {
    bookTitleInput.removeAttribute('readonly');
    bookContent.contentEditable = 'true';
    formatBar?.classList.remove('hidden');
  } else {
    bookTitleInput.setAttribute('readonly', 'true');
    bookContent.contentEditable = 'false';
    formatBar?.classList.add('hidden');
    hideSaveStatus();
  }

  metaBox?.classList.remove('hidden');

  metaContent.innerHTML = `
    Created ${formatDate(book.createdAt)}<br>
    Updated ${formatDate(book.updatedAt)}
  `;
}

// ---------- Auto-save ----------
function showSaveStatus(text, className = '') {
  saveStatus.textContent = text;
  saveStatus.className = `save-status ${className}`;
  saveStatus.classList.remove('hidden');
}

function hideSaveStatus() {
  saveStatus?.classList.add('hidden');
}

function scheduleAutoSave() {
  if (!isEditing || !isLoggedIn || !currentBookId) {
    return;
  }

  clearTimeout(autoSaveTimer);

  showSaveStatus('Saving…', 'saving');

  autoSaveTimer = setTimeout(() => {
    forceSave();
  }, AUTO_SAVE_DELAY);
}

async function forceSave() {
  if (!currentBookId) return;

  const book = getBook(currentBookId);

  if (!book) return;

  book.title = bookTitleInput.value.trim() || 'Untitled Book';
  book.content = bookContent.innerHTML;
  book.updatedAt = Date.now();

  await saveData();

  lastSavedSnapshot = JSON.stringify({
    title: book.title,
    content: book.content
  });

  showSaveStatus('Saved', 'saved');

  setTimeout(() => {
    hideSaveStatus();
  }, 2000);
}

// ---------- Department CRUD ----------
function openDeptModal(id = null) {
  editingDeptId = id;
  tempDeptImage = null;

  deptImagePreview?.classList.add('hidden');

  if (deptImagePreview) {
    deptImagePreview.innerHTML = '';
  }

  deptImageInput.value = '';

  if (id) {
    const department = getDept(id);

    if (!department) return;

    deptModalTitle.textContent = 'Edit Department';
    deptNameInput.value = department.name;
    deptDescInput.value = department.description || '';

    if (department.image) {
      tempDeptImage = department.image;
      deptImagePreview.innerHTML = `
        <img src="${department.image}" alt="">
      `;
      deptImagePreview.classList.remove('hidden');
    }
  } else {
    deptModalTitle.textContent = 'New Department';
    deptNameInput.value = '';
    deptDescInput.value = '';
  }

  deptModal.classList.remove('hidden');

  setTimeout(() => {
    deptNameInput.focus();
  }, 50);
}

async function saveDepartment() {
  const name = deptNameInput.value.trim();

  if (!name) {
    deptNameInput.focus();
    return;
  }

  if (editingDeptId) {
    const department = getDept(editingDeptId);

    if (!department) return;

    department.name = name;
    department.description = deptDescInput.value.trim();

    if (tempDeptImage !== null) {
      department.image = tempDeptImage;
    }

    department.updatedAt = Date.now();
  } else {
    data.departments.push({
      id: uid(),
      name,
      description: deptDescInput.value.trim(),
      image: tempDeptImage || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  await saveData();

  deptModal.classList.add('hidden');

  if (currentDeptId && editingDeptId === currentDeptId) {
    renderDeptDetail();
  } else {
    showView('departments');
  }
}

// ---------- Book CRUD ----------
function openBookModal(id = null) {
  editingBookId = id;
  tempBookCover = null;

  bookCoverPreview?.classList.add('hidden');

  if (bookCoverPreview) {
    bookCoverPreview.innerHTML = '';
  }

  bookCoverInput.value = '';

  if (id) {
    const book = getBook(id);

    if (!book) return;

    bookModalTitle.textContent = 'Edit Book';
    bookNameInput.value = book.title;
    bookDescInput.value = book.description || '';

    if (book.cover) {
      tempBookCover = book.cover;

      bookCoverPreview.innerHTML = `
        <img src="${book.cover}" alt="">
      `;

      bookCoverPreview.classList.remove('hidden');
    }
  } else {
    bookModalTitle.textContent = 'New Book';
    bookNameInput.value = '';
    bookDescInput.value = '';
  }

  bookModal.classList.remove('hidden');

  setTimeout(() => {
    bookNameInput.focus();
  }, 50);
}

async function saveBookMeta() {
  const title = bookNameInput.value.trim();

  if (!title) {
    bookNameInput.focus();
    return;
  }

  if (editingBookId) {
    const book = getBook(editingBookId);

    if (!book) return;

    book.title = title;
    book.description = bookDescInput.value.trim();

    if (tempBookCover !== null) {
      book.cover = tempBookCover;
    }

    book.updatedAt = Date.now();

    await saveData();

    bookModal.classList.add('hidden');

    if (currentBookId === editingBookId) {
      bookTitleInput.value = book.title;
      bookDescDisplay.textContent = book.description || '';
      renderBookView();
    } else {
      renderDeptDetail();
    }
  } else {
    const newBook = {
      id: uid(),
      departmentId: currentDeptId,
      title,
      description: bookDescInput.value.trim(),
      cover: tempBookCover || null,
      content: '<p></p>',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    data.books.push(newBook);

    await saveData();

    bookModal.classList.add('hidden');

    currentBookId = newBook.id;
    isEditing = true;

    lastSavedSnapshot = JSON.stringify({
      title: newBook.title,
      content: newBook.content
    });

    showView('book');
  }
}

function startEditBook() {
  if (!isLoggedIn || !currentBookId) return;

  const book = getBook(currentBookId);

  if (!book) return;

  isEditing = true;

  lastSavedSnapshot = JSON.stringify({
    title: book.title,
    content: book.content
  });

  renderBookView();
  bookTitleInput.focus();
}

// ---------- Delete ----------
function requestDelete(type, id) {
  pendingDelete = {
    type,
    id
  };

  if (type === 'book') {
    const book = getBook(id);

    deleteMessage.textContent =
      `Delete book "${book?.title}"? This cannot be undone.`;
  } else {
    const department = getDept(id);

    deleteMessage.textContent =
      `Delete "${department?.name}" and all its books? This cannot be undone.`;
  }

  deleteModal.classList.remove('hidden');
}

async function confirmDelete() {
  if (!pendingDelete) return;

  const { type, id } = pendingDelete;

  if (type === 'book') {
    data.books = data.books.filter((book) => book.id !== id);

    await saveData();

    currentBookId = null;
    isEditing = false;

    showView('dept');
  }

  if (type === 'dept') {
    data.books = data.books.filter(
      (book) => book.departmentId !== id
    );

    data.departments = data.departments.filter(
      (department) => department.id !== id
    );

    await saveData();

    currentDeptId = null;
    showView('departments');
  }

  pendingDelete = null;
  deleteModal.classList.add('hidden');
}

// ---------- Search ----------
function runSearch(query) {
  const search = query.trim().toLowerCase();

  if (!search) {
    searchResults.classList.add('hidden');
    return;
  }

  const results = [];

  data.departments.forEach((department) => {
    if (
      department.name.toLowerCase().includes(search) ||
      (department.description || '').toLowerCase().includes(search)
    ) {
      results.push({
        type: 'dept',
        id: department.id,
        title: department.name,
        meta: 'Department'
      });
    }
  });

  data.books.forEach((book) => {
    const department = getDept(book.departmentId);

    if (
      book.title.toLowerCase().includes(search) ||
      (book.description || '').toLowerCase().includes(search) ||
      (book.content || '').toLowerCase().includes(search)
    ) {
      results.push({
        type: 'book',
        id: book.id,
        deptId: book.departmentId,
        title: book.title,
        meta: department ? department.name : 'Book'
      });
    }
  });

  if (results.length === 0) {
    searchResults.innerHTML = `
      <div class="search-item">
        <div class="si-title">No results</div>
      </div>
    `;
  } else {
    searchResults.innerHTML = results
      .slice(0, 12)
      .map((result) => {
        return `
          <div
            class="search-item"
            data-type="${result.type}"
            data-id="${result.id}"
            data-deptid="${result.deptId || ''}"
          >
            <div class="si-title">
              ${escapeHtml(result.title)}
            </div>

            <div class="si-meta">
              ${escapeHtml(result.meta)}
            </div>
          </div>
        `;
      })
      .join('');

    searchResults
      .querySelectorAll('.search-item')
      .forEach((element) => {
        element.addEventListener('click', () => {
          searchResults.classList.add('hidden');
          globalSearch.value = '';

          if (element.dataset.type === 'dept') {
            currentDeptId = element.dataset.id;
            showView('dept');
          } else {
            currentDeptId = element.dataset.deptid;
            currentBookId = element.dataset.id;
            showView('book');
          }
        });
      });
  }

  searchResults.classList.remove('hidden');
}

// ---------- Formatting ----------
function execFormat(command, value = null) {
  document.execCommand(command, false, value);
  bookContent.focus();
  scheduleAutoSave();
}

function insertImage(file) {
  fileToBase64(file).then((image) => {
    const html = `<img src="${image}" alt="" style="max-width:100%;">`;

    document.execCommand('insertHTML', false, html);

    scheduleAutoSave();
  });
}

// ---------- Events ----------
loginBtn?.addEventListener('click', () => {
  loginError?.classList.add('hidden');
  codeInput.value = '';
  loginModal.classList.remove('hidden');

  setTimeout(() => {
    codeInput.focus();
  }, 50);
});

logoutBtn?.addEventListener('click', async () => {
  if (isEditing) {
    await forceSave();
  }

  setAuth(false);
  isEditing = false;

  renderAuth();

  if (currentBookId) {
    renderBookView();
  }
});

$('#submitLoginBtn')?.addEventListener('click', () => {
  const enteredCode = codeInput.value.trim();

  if (enteredCode === ACCESS_CODE) {
    setAuth(true);

    loginModal.classList.add('hidden');
    loginError.classList.add('hidden');

    renderAuth();
  } else {
    loginError.textContent = 'Incorrect access code.';
    loginError.classList.remove('hidden');
  }
});

$('#cancelLoginBtn')?.addEventListener('click', () => {
  loginModal.classList.add('hidden');
});

codeInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    $('#submitLoginBtn')?.click();
  }
});

logoBtn?.addEventListener('click', () => {
  showView('departments');
});

backToDepts?.addEventListener('click', () => {
  showView('departments');
});

backToDept?.addEventListener('click', async () => {
  if (isEditing) {
    await forceSave();
  }

  isEditing = false;
  showView('dept');
});

newDeptBtn?.addEventListener('click', () => {
  openDeptModal();
});

editDeptBtn?.addEventListener('click', () => {
  if (currentDeptId) {
    openDeptModal(currentDeptId);
  }
});

deleteDeptBtn?.addEventListener('click', () => {
  if (currentDeptId) {
    requestDelete('dept', currentDeptId);
  }
});

$('#saveDeptBtn')?.addEventListener('click', saveDepartment);

$('#cancelDeptBtn')?.addEventListener('click', () => {
  deptModal.classList.add('hidden');
});

deptImageInput?.addEventListener('change', async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  tempDeptImage = await fileToBase64(file);

  deptImagePreview.innerHTML = `
    <img src="${tempDeptImage}" alt="">
  `;

  deptImagePreview.classList.remove('hidden');
});

newBookBtn?.addEventListener('click', () => {
  if (currentDeptId) {
    openBookModal();
  }
});

editBookBtn?.addEventListener('click', () => {
  if (!currentBookId) return;

  if (isEditing) {
    openBookModal(currentBookId);
  } else {
    startEditBook();
  }
});

deleteBookBtn?.addEventListener('click', () => {
  if (currentBookId) {
    requestDelete('book', currentBookId);
  }
});

$('#saveBookMetaBtn')?.addEventListener('click', saveBookMeta);

$('#cancelBookBtn')?.addEventListener('click', () => {
  bookModal.classList.add('hidden');
});

bookCoverInput?.addEventListener('change', async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  tempBookCover = await fileToBase64(file);

  bookCoverPreview.innerHTML = `
    <img src="${tempBookCover}" alt="">
  `;

  bookCoverPreview.classList.remove('hidden');
});

$('#confirmDeleteBtn')?.addEventListener('click', confirmDelete);

$('#cancelDeleteBtn')?.addEventListener('click', () => {
  pendingDelete = null;
  deleteModal.classList.add('hidden');
});

formatBar?.addEventListener('click', (event) => {
  const button = event.target.closest('.format-btn');

  if (!button || !isEditing) return;

  if (button.id === 'insertImageBtn') {
    imageInput.click();
    return;
  }

  const command = button.dataset.cmd;
  const value = button.dataset.value || null;

  if (command === 'formatBlock') {
    execFormat('formatBlock', value);
  } else {
    execFormat(command);
  }
});

imageInput?.addEventListener('change', (event) => {
  const file = event.target.files[0];

  if (file) {
    insertImage(file);
  }

  imageInput.value = '';
});

bookContent?.addEventListener('input', () => {
  if (isEditing) {
    scheduleAutoSave();
  }
});

bookTitleInput?.addEventListener('input', () => {
  if (isEditing) {
    scheduleAutoSave();
  }
});

document.addEventListener('keydown', (event) => {
  if (!isEditing) return;

  const modifier = event.ctrlKey || event.metaKey;

  if (modifier && event.key.toLowerCase() === 's') {
    event.preventDefault();
    forceSave();
  }

  if (modifier && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    execFormat('bold');
  }

  if (modifier && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    execFormat('italic');
  }

  if (modifier && event.key.toLowerCase() === 'u') {
    event.preventDefault();
    execFormat('underline');
  }
});

globalSearch?.addEventListener('input', () => {
  runSearch(globalSearch.value);
});

globalSearch?.addEventListener('focus', () => {
  if (globalSearch.value.trim()) {
    runSearch(globalSearch.value);
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.search-wrap')) {
    searchResults?.classList.add('hidden');
  }
});

$$('.modal-backdrop').forEach((element) => {
  element.addEventListener('click', () => {
    loginModal?.classList.add('hidden');
    deptModal?.classList.add('hidden');
    bookModal?.classList.add('hidden');
    deleteModal?.classList.add('hidden');
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
