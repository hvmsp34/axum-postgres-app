const API_URL = 'http://localhost:3000/users';

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

// CREATE: Создание пользователя
async function createUser(name, email) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    showStatus(document.getElementById('createStatus'), `✅ Пользователь создан! ID: ${data.id}`, false);
    document.getElementById('createForm').reset();
    getAllUsers(); // Обновляем список
    return data;
  } catch (error) {
    showStatus(document.getElementById('createStatus'), `❌ Ошибка: ${error.message}`, true);
    console.error('Ошибка создания:', error);
  }
}

// READ ALL: Получение всех пользователей
async function getAllUsers() {
  const usersListDiv = document.getElementById('usersList');
  usersListDiv.innerHTML = '<div class="loading" style="display: block; margin: 20px auto;"></div>';

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const users = await response.json();

    if (users.length === 0) {
      usersListDiv.innerHTML = '<p style="color: #999; text-align: center;">📭 Пользователей пока нет</p>';
      return;
    }

    usersListDiv.innerHTML = users.map(user => `
                    <div class="user-item">
                        <div class="user-info">
                            <div class="user-name">${escapeHtml(user.name)}</div>
                            <div class="user-email">📧 ${escapeHtml(user.email)}</div>
                            <div class="user-id">🆔 ID: ${user.id}</div>
                        </div>
                        <div class="user-actions">
                            <button onclick="getUserById(${user.id})" style="background: #48bb78;">Просмотр</button>
                            <button onclick="deleteUserById(${user.id})" class="delete-btn">Удалить</button>
                        </div>
                    </div>
                `).join('');

    showStatus(document.getElementById('allUsersStatus'), `✅ Загружено ${users.length} пользователей`, false);
  } catch (error) {
    usersListDiv.innerHTML = '<p style="color: #e53e3e; text-align: center;">❌ Ошибка загрузки пользователей</p>';
    showStatus(document.getElementById('allUsersStatus'), `❌ Ошибка: ${error.message}`, true);
    console.error('Ошибка получения списка:', error);
  }
}

// READ ONE: Получение одного пользователя
async function getUserById(id) {
  const resultDiv = document.getElementById('getUserResult');
  const dataPre = document.getElementById('getUserData');

  resultDiv.style.display = 'block';
  dataPre.textContent = 'Загрузка...';

  try {
    const response = await fetch(`${API_URL}/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Пользователь не найден');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const user = await response.json();
    dataPre.textContent = JSON.stringify(user, null, 2);
    showStatus(document.getElementById('getUserStatus'), `✅ Пользователь найден`, false);
  } catch (error) {
    dataPre.textContent = `Ошибка: ${error.message}`;
    showStatus(document.getElementById('getUserStatus'), `❌ ${error.message}`, true);
    console.error('Ошибка получения пользователя:', error);
  }
}

// DELETE: Удаление пользователя
async function deleteUserById(id) {
  if (!confirm(`Вы уверены, что хотите удалить пользователя с ID ${id}?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Пользователь не найден');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    showStatus(document.getElementById('deleteStatus'), `✅ Пользователь ID ${id} удален`, false);
    getAllUsers(); // Обновляем список

    // Очищаем поле ввода ID для удаления
    document.getElementById('deleteUserId').value = '';
  } catch (error) {
    showStatus(document.getElementById('deleteStatus'), `❌ Ошибка: ${error.message}`, true);
    console.error('Ошибка удаления:', error);
  }
}

// Вспомогательная функция для защиты от XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Обработчики событий
createForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('createName').value;
  const email = document.getElementById('createEmail').value;
  await createUser(name, email);
};

getUserBtn.onclick = async () => {
  const id = document.getElementById('getUserId').value;
  if (!id) {
    showStatus(document.getElementById('getUserStatus'), '❌ Введите ID пользователя', true);
    return;
  }
  await getUserById(parseInt(id));
};

deleteUserBtn.onclick = async () => {
  const id = document.getElementById('deleteUserId').value;
  if (!id) {
    showStatus(document.getElementById('deleteStatus'), '❌ Введите ID пользователя', true);
    return;
  }
  await deleteUserById(parseInt(id));
};

getAllUsersBtn.onclick = async () => {
  await getAllUsers();
};

// Автоматическая загрузка списка при открытии страницы
window.addEventListener('load', getAllUsers);