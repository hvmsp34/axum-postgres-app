Пример Axum + Tokio + PostgreSQL без миграций, с прямыми SQL-запросами:

```bash
# Развернуть проект
git clone https://github.com/hvmsp34/axum-postgres-app.git
cd ./axum-postgres-app
cargo run

# Для получения бинарника
cargo build --relise
```

# Зависимости

## OpenSSL

Ошибка возникает из-за отсутствия OpenSSL в системе. SQLx использует `native-tls` для подключения к PostgreSQL, а он требует OpenSSL. Есть два решения:

### Решение 1: Установить OpenSSL (рекомендуется)

```bash
# Установка dev-пакетов OpenSSL
sudo apt update
sudo apt install libssl-dev pkg-config

# После установки перезапустить сборку
cargo clean
cargo run
```

### Решение 2: Использовать rustls вместо OpenSSL

Изменить `Cargo.toml`:

```toml
[package]
name = "axum-postgres-app"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
# Заменить native-tls на rustls
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower-http = { version = "0.5", features = ["cors"] }
```

После изменения:
```bash
cargo clean
cargo run
```

### Проверка после установки OpenSSL (вариант 1)

Убедиться что всё работает:
```bash
# Проверить что PostgreSQL запущен
sudo systemctl status postgresql

# Если не запущен - запустить
sudo systemctl start postgresql

# Создать базу данных (если ещё не создана)
sudo -u postgres createdb myapp

# Установить пароль для пользователя postgres (если не установлен)
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password';"
```

## PostgreSQL

Варианта 2: Docker и без. Выбирайте сами под свои задачи.

### внутри Docker

```bash
docker run --name postgres-axum \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  -d postgres:16
```

### без Docker

#### Linux (Ubuntu/Debian)

##### Установка
```bash
# Установка PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Проверить статус
sudo systemctl status postgresql
```

##### Первоначальная настройка
```bash
# Переключиться на пользователя postgres
sudo -i -u postgres

# Создать базу данных
createdb myapp

# Войти в psql и установить пароль
psql
```

В psql выполнить:
```sql
ALTER USER postgres WITH PASSWORD 'password';
\q
```

Затем выйти из пользователя postgres:
```bash
exit
```

##### Управление службой
```bash
# Запуск
sudo systemctl start postgresql

# Остановка
sudo systemctl stop postgresql

# Перезапуск
sudo systemctl restart postgresql

# Автозапуск при загрузке
sudo systemctl enable postgresql
```

#### Linux (Arch/Manjaro)

```bash
# Установка
sudo pacman -S postgresql

# Инициализация кластера (первый запуск)
sudo -u postgres initdb --locale en_US.UTF-8 -D /var/lib/postgres/data

# Запуск и включение автозапуска
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание базы
sudo -u postgres createdb myapp

# Установка пароля
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password';"
```

#### macOS

##### Через Homebrew
```bash
# Установка
brew install postgresql@16

# Запуск службы
brew services start postgresql@16

# Создание базы
createdb myapp

# Установка пароля
psql -d myapp -c "ALTER USER postgres WITH PASSWORD 'password';"
```

##### Через официальный установщик
1. Скачать с [postgresql.org](https://www.postgresql.org/download/macosx/)
2. Установить как обычное приложение
3. Использовать pgAdmin для управления или командную строку

#### Windows

##### Через официальный установщик
1. Скачать с [postgresql.org](https://www.postgresql.org/download/windows/)
2. Запустить установщик
3. При установке:
   - Задать пароль для `postgres`
   - Оставить порт `5432`
   - Выбрать локаль `Russian, Russia`

##### Запуск службы
```cmd
# Через PowerShell (от администратора)
net start postgresql-x64-16

# Или через Services (Win+R -> services.msc)
# Найти "postgresql-x64-16" -> Правой кнопкой -> Start
```

##### Создание базы через командную строку
```cmd
# Добавить в PATH: C:\Program Files\PostgreSQL\16\bin
cd C:\Program Files\PostgreSQL\16\bin

# Создать базу
createdb -U postgres myapp

# Войти в psql
psql -U postgres
```

#### Проверка подключения

После установки проверить, что PostgreSQL работает:
```bash
# Linux/macOS
pg_isready -h localhost -p 5432

# Windows
pg_isready.exe -h localhost -p 5432
```

#### Изменение конфигурации (если нужно)

Файл `postgresql.conf` (Linux: `/etc/postgresql/16/main/`, macOS: `/usr/local/var/postgres/`):

```
# Разрешить подключения не только с localhost (опционально)
listen_addresses = 'localhost'  # или '*' для всех интерфейсов
```

Файл `pg_hba.conf` (там же):

```
# Разрешить парольную аутентификацию
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

После изменений перезапустить PostgreSQL:
```bash
sudo systemctl restart postgresql  # Linux
brew services restart postgresql   # macOS
```

#### Строка подключения для Rust

Теперь в коде использовать:
```rust
let database_url = "postgres://postgres:password@localhost:5432/myapp";
```

# Тестирование API

```bash
# Создать пользователя
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Иван","email":"ivan@example.com"}'

# Получить всех
curl http://localhost:3000/users

# Получить одного
curl http://localhost:3000/users/1

# Удалить
curl -X DELETE http://localhost:3000/users/1
```

**Особенности:**
- Таблица создаётся автоматически при старте приложения
- Нет миграций — работа с БД напрямую через SQL
- Все запросы пишутся вручную
- Обработка ошибок простая, но понятная
