const API_URL = 'http://localhost:3000/users';

function init() {
  createForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = extractDataFromForm(e);
    await user.create(data);
  };

  getUserBtn.onclick = async () => {
    const id = getUserId.value.trim();
    if (!id) return showStatus(getUserStatus, '❌ Введите ID пользователя', true);
    await user.getById(id);
  };

  deleteUserBtn.onclick = async () => {
    const id = deleteUserId.value.trim();
    if (!id) return showStatus(deleteStatus, '❌ Введите ID пользователя', true);
    await user.deleteById(id);
  };

  getAllUsersBtn.onclick = async () => await render();

  // Дописать внутрь функции init():
  usersList.onclick = async (e) => {
    // Проверяем клик сквозь границы Shadow DOM
    const path = e.composedPath();
    const button = path.find(el => el.tagName === 'BUTTON' && el.hasAttribute('data-id'));

    if (!button) return;

    const id = button.dataset.id;

    if (button.classList.contains('view-btn')) {
      await user.getById(id);
    } else if (button.classList.contains('delete-btn')) {
      await user.deleteById(id);
    }
  };

  window.onload = render;
}

// Чистый API-клиент (только запросы к серверу, никакого DOM)
const userApi = {
  async create(data) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/${id}`);
    if (response.status === 404) throw new Error('Пользователь не найден');
    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    return response.json();
  },

  async deleteById(id) {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (response.status === 404) throw new Error('Пользователь не найден');
    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    return true;
  },

  async getAll() {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    return response.json();
  }
};

// Логика UI (управление элементами страницы)
const user = {
  async create(data) {
    try {
      const result = await userApi.create(data);
      showStatus(createStatus, `✅ Пользователь создан! ID: ${result.id}`, false);
      createForm.reset();
      await render();
    } catch (error) {
      showStatus(createStatus, `❌ ${error.message}`, true);
      console.error('Ошибка создания:', error);
    }
  },

  async getById(id) {
    getUserResult.style.display = 'block';
    getUserData.textContent = 'Загрузка...';
    try {
      const userData = await userApi.getById(id); // Исправлено имя переменной
      getUserData.textContent = JSON.stringify(userData, null, 2);
      showStatus(getUserStatus, `✅ Пользователь найден`, false);
    } catch (error) {
      getUserData.textContent = `Ошибка: ${error.message}`;
      showStatus(getUserStatus, `❌ ${error.message}`, true);
      console.error('Ошибка получения:', error);
    }
  },

  async deleteById(id) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя с ID ${id}?`)) return;
    try {
      await userApi.deleteById(id);
      showStatus(deleteStatus, `✅ Пользователь ID ${id} удален`, false);
      deleteUserId.value = '';
      await render();
    } catch (error) {
      showStatus(deleteStatus, `❌ ${error.message}`, true);
      console.error('Ошибка удаления:', error);
    }
  }
};

function extractDataFromForm(e) {
  return Object.fromEntries(new FormData(e.currentTarget));
}

// Вспомогательная функция для отображения статуса
function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.className = `status ${isError ? 'error' : 'success'}`;
  setTimeout(() => {
    element.style.display = 'none';
    setTimeout(() => {
      element.className = 'status';
      element.textContent = '';
    }, 300);
  }, 3000);
  element.style.display = 'block';
}

async function render() {
  // Для статусных сообщений (загрузка/пусто) пока оставим текстовое заполнение
  usersList.textContent = '';

  const loader = document.createElement('div');
  loader.className = 'loading';
  loader.style.cssText = 'display: block; margin: 20px auto;';
  usersList.appendChild(loader);

  try {
    const users = await userApi.getAll();
    loader.remove(); // Удаляем индикатор загрузки

    if (users.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.style.cssText = 'color: #999; text-align: center;';
      emptyMsg.textContent = '📭 Пользователей пока нет';
      usersList.appendChild(emptyMsg);
      return;
    }

    // Создаем фрагмент в памяти для быстрой вставки (оптимизация производительности)
    const fragment = document.createDocumentFragment();

    users.forEach(userData => {
      // Создаем наш кастомный элемент
      const card = document.createElement('user-card');

      // Передаем данные через атрибуты
      card.setAttribute('name', userData.name);
      card.setAttribute('email', userData.email);
      card.setAttribute('user-id', userData.id);

      fragment.appendChild(card);
    });

    // Вставляем всё дерево разом — браузер перерисует страницу всего 1 раз
    usersList.appendChild(fragment);

    showStatus(allUsersStatus, `✅ Загружено ${users.length} пользователей`, false);
  } catch (error) {
    usersList.textContent = '';
    const errorMsg = document.createElement('p');
    errorMsg.style.cssText = 'color: #e53e3e; text-align: center;';
    errorMsg.textContent = '❌ Ошибка загрузки пользователей';
    usersList.appendChild(errorMsg);

    showStatus(allUsersStatus, `❌ Ошибка: ${error.message}`, true);
    console.error('Ошибка получения списка:', error);
  }
}

class UserCard extends HTMLElement {
  constructor() {
    super();
    // Создаем Shadow DOM для изоляции стилей и разметки
    this.attachShadow({ mode: 'open' });

    // Шаблон компонента
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .user-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #eee;
        }
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
      </div>
    `;
  }

  // Заполняем компонент данными, когда он появляется на странице
  connectedCallback() {
    const name = this.getAttribute('name');
    const email = this.getAttribute('email');
    const id = this.getAttribute('user-id');

    // Безопасное заполнение через textContent (XSS защита "из коробки")
    this.shadowRoot.querySelector('.user-name').textContent = name;
    this.shadowRoot.querySelector('.user-email').textContent = `📧 ${email}`;
    this.shadowRoot.querySelector('.user-id').textContent = `🆔 ID: ${id}`;

    // Пробрасываем ID в data-атрибуты самих кнопок внутри Shadow DOM
    this.shadowRoot.querySelector('.view-btn').dataset.id = id;
    this.shadowRoot.querySelector('.delete-btn').dataset.id = id;
  }
}

customElements.define('user-card', UserCard);
init();