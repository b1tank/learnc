#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define TOYFORTH_TYPE_INT 0
#define TOYFORTH_TYPE_STR 1
#define TOYFORTH_TYPE_BOOL 2
#define TOYFORTH_TYPE_LIST 3
#define TOYFORTH_TYPE_SYMBOL 4

/*================== Data structure ==================*/
typedef struct tfobj
{
    int refcount;
    int type;
    union
    {
        // INT | BOOL
        int val;

        // STR | SYMBOL
        struct
        {
            char *ptr;
            size_t len;
        } str;

        // LIST
        struct
        {
            struct tfobj **ele;
            size_t len;
        } list;
    };
} tfobj;

/*================= Utility library ==================*/
void *xmalloc(size_t size)
{
    void *ptr = malloc(size);
    if (ptr == NULL)
    {
        fprintf(stderr, "Out of memory\n");
        exit(1);
    }
    return ptr;
}

/*================= Object lifecycle =================*/
tfobj *createObject(int type)
{
    tfobj *obj = xmalloc(sizeof(tfobj));
    obj->type = type;
    obj->refcount = 1;
    return obj;
}

tfobj *createINTObject(int val)
{
    tfobj *obj = createObject(TOYFORTH_TYPE_INT);
    obj->val = val;
    return obj;
}

tfobj *createBOOLObject(int val)
{
    tfobj *obj = createINTObject(val);
    obj->type = TOYFORTH_TYPE_BOOL;
    return obj;
}

tfobj *createSTRObject(char *ptr)
{
    tfobj *obj = createObject(TOYFORTH_TYPE_STR);
    obj->str.ptr = ptr;
    obj->str.len = strlen(ptr);
    return obj;
}

tfobj *createSYMBOLObject(char *ptr)
{
    tfobj *obj = createSTRObject(ptr);
    obj->type = TOYFORTH_TYPE_SYMBOL;
    return obj;
}

tfobj *createLISTObject()
{
    tfobj *obj = createObject(TOYFORTH_TYPE_LIST);
    obj->list.ele = NULL;
    obj->list.len = 0;
    return obj;
}

int main(int argc, char **argv)
{
    if (argc < 2)
    {
        fprintf(stderr, "Usage: %s <filename>\n", argv[0]);
        exit(1);
    }

    printf("Input file: %s\n", argv[1]);

    // get program length via file IO
    FILE *fp = fopen(argv[1], "r"); // open a file
    fseek(fp, 0, SEEK_END);         // seek to the end
    long len = ftell(fp);           // save current location
    rewind(fp);                     // back to the beginning

    // read file into the buffer
    char *buf = xmalloc(len + 1); // +1 reserves a position to \0
    fread(buf, 1, len, fp);

    printf("Program (length %ld): %s\n", len, buf);

    return 0;
}
