# Сборник лекций

1. Скачайте репозиторий.
2. Откройте `index.html` двойным кликом.
3. Выберите нужную лекцию.

Для просмотра ничего устанавливать не нужно.

## Локальный сервер для проверки

Из корня репозитория:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Открыть `http://127.0.0.1:8000/`. Остановка сервера — Ctrl+C.
После правки слайдов сначала собрать источники через `python3 build.py`.
Сервер нужен только для проверки; просмотр через `file://` остаётся основным режимом.

Для HTTPS в Python 3.14+ можно использовать встроенный TLS. Создать локальный
самоподписанный сертификат командой OpenSSL (файлы остаются вне репозитория):

```sh
openssl req -x509 -newkey rsa:2048 -sha256 -days 7 -nodes \
  -keyout /tmp/course-exe-key.pem -out /tmp/course-exe-cert.pem \
  -subj '/CN=localhost' \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'
python3 -m http.server 8443 --bind 127.0.0.1 \
  --tls-cert /tmp/course-exe-cert.pem --tls-key /tmp/course-exe-key.pem
```

Открыть `https://localhost:8443/`. Доверие к самоподписанному сертификату
настраивает пользователь; для обычной проверки слайдов достаточно HTTP.
