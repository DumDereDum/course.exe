#include <stdlib.h>

void release_resource(int retry) {
    char *p = malloc(16);
    if (!p) return;
    free(p);
    if (retry) {
        free(p);
    }
}
