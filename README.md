Пример Axum + Tokio + PostgreSQL без миграций, с прямыми SQL-запросами:

# Команды

```shell
# Установка и первоначальная настройка с Docker (если нужно без Docker, то смотри в отдельной главе)
cargo setup
```
```shell
# Сбросить БД
cargo reset
```
```shell
# Удалить docker контейнер с БД
cargo remove
```
```shell
# Последующий запуск стандартно
cargo run
```

## Получение бинарника
```bash
cargo build --relise
```
# OpenSSL

Может возникать ошибка из-за отсутствия OpenSSL в системе. SQLx использует `native-tls` для подключения к PostgreSQL, а он требует OpenSSL. Есть два решения:

## Решение 1: Установить OpenSSL (рекомендуется)

```bash
# Установка dev-пакетов OpenSSL
sudo apt update
sudo apt install libssl-dev pkg-config

# После установки перезапустить сборку
cargo clean
cargo run
```

Проверка после установки:
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

## Решение 2: Использовать rustls вместо OpenSSL

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




# Необязательное

## PostgreSQL без Docker

### Linux (Ubuntu/Debian)

```bash
# Установка
sudo apt update
sudo apt install postgresql postgresql-contrib

# Проверить статус
sudo systemctl status postgresql
```

Первоначальная настройка
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
Управление службой
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

### Linux (Arch/Manjaro)

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

### macOS

```bash
# Установка
brew install postgresql

# Запуск службы
brew services start postgresql

# Создание базы
createdb myapp

# Установка пароля
psql -d myapp -c "ALTER USER postgres WITH PASSWORD 'password';"
```

Или через официальный установщик
1. Скачать с [postgresql.org](https://www.postgresql.org/download/macosx/)
2. Установить как обычное приложение
3. Использовать pgAdmin для управления или командную строку

### Windows

1. Скачать с [postgresql.org](https://www.postgresql.org/download/windows/)
2. Запустить установщик
3. При установке:
   - Задать пароль для `postgres`
   - Оставить порт `5432`
   - Выбрать локаль `Russian, Russia`

```ps1
# Запуск службы через PowerShell (от администратора)
net start postgresql-x64-16

# Или через Services (Win+R -> services.msc)
# Найти "postgresql-x64-16" -> Правой кнопкой -> Start
```

```ps1
# Создание базы через командную строку
# Добавить в PATH: C:\Program Files\PostgreSQL\16\bin
cd C:\Program Files\PostgreSQL\16\bin

# Создать базу
createdb -U postgres myapp

# Войти в psql
psql -U postgres
```

### Проверка подключения

После установки проверить, что PostgreSQL работает:
```bash
# Linux/macOS
pg_isready -h localhost -p 5432

# Windows
pg_isready.exe -h localhost -p 5432
```

## Изменение конфигурации PostgreSQL (если нужно)

Linux: 
```bash
cd $(ls -d /etc/postgresql/*/main/ | sort -V | tail -n 1)
```
macOS: 
```zsh
cd /usr/local/var/postgres/
```

Скорректировать файлы в директории
```postgresql.conf
# Разрешить подключения не только с localhost (опционально)
listen_addresses = 'localhost'  # или '*' для всех интерфейсов
```
```pg_hba.conf
# Разрешить парольную аутентификацию
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

После изменений перезапустить PostgreSQL
Linux: 
```bash
sudo systemctl restart postgresql
```
macOS: 
```zsh
brew services restart postgresql
```
