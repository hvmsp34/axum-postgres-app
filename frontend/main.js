const API_URL = 'http://localhost:3000/users';

function init() {
  customElements.define('user-card', UserCard);
  renderList();

  createForm.onsubmit = (e) => {
    e.preventDefault();
    safeExecute(userActions.create, createStatus)(e);
  };

  getUserBtn.onclick = () => {
    const id = getUserId.value.trim();
    id ? safeExecute(userActions.getById, getUserStatus)(id) : showStatus(getUserStatus, '❌ Введите ID', true);
  };

  deleteUserBtn.onclick = () => {
    const id = deleteUserId.value.trim();
    id ? safeExecute(userActions.deleteById, deleteStatus)(id) : showStatus(deleteStatus, '❌ Введите ID', true);
  };

  getAllUsersBtn.onclick = () => renderList();

  usersList.onclick = (e) => {
    const btn = e.composedPath().find(el => el.tagName === 'BUTTON' && el.hasAttribute('data-id'));
    if (!btn) return;

    const action = btn.classList.contains('view-btn') ? userActions.getById : userActions.deleteById;
    const status = btn.classList.contains('view-btn') ? getUserStatus : deleteStatus;

    safeExecute(action, status)(btn.dataset.id);
  };
}

// --- СЛОЙ ДАННЫХ И СЕТИ (API CLIENT) ---
const userApi = {
  async _request(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 404) throw new Error('Пользователь не найден');
    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    return response.status !== 204 ? response.json() : true;
  },
  create: (data) => userApi._request(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  getById: (id) => userApi._request(`${API_URL}/${id}`),
  deleteById: (id) => userApi._request(`${API_URL}/${id}`, { method: 'DELETE' }),
  getAll: () => userApi._request(API_URL)
};

// --- КОНТРОЛЛЕР UI И ДЕЙСТВИЙ ---
const userActions = {
  async create(e) {
    const data = Object.fromEntries(new FormData(e.target));
    const result = await userApi.create(data);
    showStatus(createStatus, `✅ Создан пользователь ID: ${result.id}`);
    createForm.reset();
    await renderList();
  },

  async getById(id) {
    getUserResult.style.display = 'block';
    // getUserData.textContent = 'Загрузка...';
    const data = await userApi.getById(id);
    getUserData.textContent = JSON.stringify(data, null, 2);
    showStatus(getUserStatus, `✅ Пользователь найден`);
  },

  async deleteById(id) {
    if (!confirm(`Вы уверены, что хотите удалить ID ${id}?`)) return;
    await userApi.deleteById(id);
    showStatus(deleteStatus, `✅ Пользователь ID ${id} удален`);
    deleteUserId.value = '';
    await renderList();
  }
};

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И РЕНДЕРИНГ ---
const timers = new Map();

function showStatus(element, message, isError = false) {
  if (timers.has(element)) clearTimeout(timers.get(element));

  element.textContent = message;
  element.className = `status ${isError ? 'error' : 'success'}`;
  element.style.display = 'block';

  timers.set(element, setTimeout(() => {
    element.style.display = 'none';
    element.className = 'status';
    element.textContent = '';
    timers.delete(element);
  }, 3000));
}

// Обертка для безопасного перехвата ошибок во всех асинхронных действиях
const safeExecute = (actionFn, statusElement) => async (...args) => {
  try {
    await actionFn(...args);
  } catch (error) {
    if (statusElement) showStatus(statusElement, `❌ ${error.message}`, true);
    console.error(error);
  }
};

async function renderList() {
  usersList.innerHTML = '<div class="loading" style="display:block; margin:20px auto;"></div>';
  showStatus(allUsersStatus, '');

  try {
    const users = await userApi.getAll();
    usersList.textContent = users.length ? '' : '📭 Пользователей пока нет';
    if (!users.length) return;

    const fragment = document.createDocumentFragment();
    users.forEach(({ name, email, id }) => {
      const card = document.createElement('user-card');
      Object.entries({ name, email, 'user-id': id }).forEach(([k, v]) => card.setAttribute(k, v));
      fragment.appendChild(card);
    });
    usersList.appendChild(fragment);
    showStatus(allUsersStatus, `✅ Загружено пользователей: ${users.length}`);
  } catch (error) {
    usersList.textContent = '❌ Ошибка загрузки';
    showStatus(allUsersStatus, `❌ ${error.message}`, true);
  }
}

// --- ВЕБ-КОМПОНЕНТ ---
class UserCard extends HTMLElement {
  constructor() {
    super().attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; }
        .user-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
        .user-name { font-weight: bold; }
        .user-email, .user-id { color: #666; font-size: 0.9em; }
        .user-actions { display: flex; gap: 8px; }
        button { border: none; padding: 6px 12px; color: white; cursor: pointer; border-radius: 4px; }
        .view-btn { background: #48bb78; }
        .delete-btn { background: #e53e3e; }
      </style>
      <div class="user-item">
        <div class="user-info">
          <div class="user-name"></div>
          <div class="user-email"></div>
          <div class="user-id"></div>
        </div>
        <div class="user-actions">
          <button class="view-btn">Просмотр</button>
          <button class="delete-btn">Удалить</button>
        </div>
      </div>`;
  }

  connectedCallback() {
    const [name, email, id] = ['name', 'email', 'user-id'].map(attr => this.getAttribute(attr));

    this.shadowRoot.querySelector('.user-name').textContent = name;
    this.shadowRoot.querySelector('.user-email').textContent = `📧 ${email}`;
    this.shadowRoot.querySelector('.user-id').textContent = `🆔 ID: ${id}`;

    this.shadowRoot.querySelectorAll('button').forEach(btn => btn.dataset.id = id);
  }
}

init();
