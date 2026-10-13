#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int run_task(int retry) {
    char *task = malloc(32);
    if (task == NULL) return 1;
    snprintf(task, 32, "%s", "task: sample");
    puts(task);

    if (retry) {
        puts("retry scheduled");
    }
    free(task);
    return 0;
}

int main(int argc, char **argv) {
    int retry = argc == 2 && strcmp(argv[1], "retry") == 0;
    if (argc > 2 || (argc == 2 && !retry)) {
        fprintf(stderr, "usage: task [retry]\n");
        return 2;
    }
    return run_task(retry);
}
