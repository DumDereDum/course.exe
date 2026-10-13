# Сохранённый пример SCA для блока 6

bom.json — вручную подготовленный учебный CycloneDX SBOM 1.6. Он описывает модель приложения с компонентом Conan zlib 1.2.11. Это не результат инвентаризации установленной библиотеки или собранного бинарника. Пакет zlib не устанавливается и не выполняется.

На этом SBOM реально запущен Trivy 0.73.0. Полный неизменённый JSON-отчёт находится в assets/examples/security/sca/report.json, выбранные поля одной находки — в finding.txt. Остальные находки не удалены из JSON.

Прямой запуск с обновлением базы при доступном интернете:

```sh
trivy sbom --scanners vuln \
  --format json --output report.json bom.json
```

Для сохранённого результата использован локальный снимок базы, обновлённый 11.08.2026. Команда была дополнена --skip-db-update, --offline-scan, --disable-telemetry, --skip-version-check и --cache-dir /private/tmp/rbpo-block06-trivy. Эти настройки позволяют повторять результат с тем же снимком; они не обеспечивают свежесть базы. Снимок базы не включён в материалы.

Сохранённый запуск сопоставил zlib 1.2.11 с CVE-2022-37434: FixedVersion 1.2.13, Severity CRITICAL, источник GitLab Advisory Database Community. Уязвимость применима к приложениям, использующим inflateGetHeader(); применимость к реальному продукту этим SBOM не проверена.

1.2.13 — историческая версия исправления именно этой CVE, не рекомендация актуальной версии zlib на 2026 год.

Соответствие BDU:2022-05325 подтверждено бюллетенем производителя РЕД ОС. Для РЕД ОС 7.3 он указывает пакет zlib-0:1.2.11-15.el7.x86_64. Его версию нельзя переносить на пакет Conan или другой дистрибутив. Прямой сайт БДУ при подготовке недоступен.

Источники:
- https://www.cve.org/CVERecord?id=CVE-2022-37434
- https://github.com/madler/zlib/releases/tag/v1.2.13
- https://redos.red-soft.ru/support/secure/uyazvimosti/uyazvimost-zlib-cve-2022-37434/
- https://trivy.dev/docs/latest/scanner/vulnerability/
