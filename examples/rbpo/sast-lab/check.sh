#!/bin/sh
set -eu
mkdir -p .build
clang -std=c11 -Wall -Wextra -Werror task.c -o .build/task
lab_normal_output=$(.build/task)
lab_retry_output=$(.build/task retry)
test "$lab_normal_output" = 'task: sample'
test "$lab_retry_output" = "$(printf 'task: sample\nretry scheduled')"
printf '%s\n' 'OK: обычный режим и retry работают'
