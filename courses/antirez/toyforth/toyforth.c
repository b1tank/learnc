#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define TOYFORTH_TYPE_INT 0
#define TOYFORTH_TYPE_STR 1
#define TOYFORTH_TYPE_BOOL 2
#define TOYFORTH_TYPE_LIST 3
#define TOYFORTH_TYPE_SYMBOL 4

/*================== Data structure ==================*/
typedef struct tfobj
{
    int ref_count;
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

void *xrealloc(void *ptr, size_t size)
{
    ptr = realloc(ptr, size);
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
    obj->ref_count = 1;
    return obj;
}

tfobj *createIntObject(int val)
{
    tfobj *obj = createObject(TOYFORTH_TYPE_INT);
    obj->val = val;
    return obj;
}

tfobj *createBoolObject(int val)
{
    tfobj *obj = createIntObject(val);
    obj->type = TOYFORTH_TYPE_BOOL;
    return obj;
}

tfobj *createStrObject(char *ptr)
{
    tfobj *obj = createObject(TOYFORTH_TYPE_STR);
    obj->str.ptr = ptr;
    obj->str.len = strlen(ptr);
    return obj;
}

tfobj *createSymbolObject(char *ptr)
{
    tfobj *obj = createStrObject(ptr);
    obj->type = TOYFORTH_TYPE_SYMBOL;
    return obj;
}

tfobj *createListObject()
{
    tfobj *obj = createObject(TOYFORTH_TYPE_LIST);
    obj->list.ele = NULL;
    obj->list.len = 0;
    return obj;
}

void freeObject(tfobj *o) {
    switch (o->type) {
        case TOYFORTH_TYPE_STR:
        case TOYFORTH_TYPE_SYMBOL:
            free(o->str.ptr);
            break;
        case TOYFORTH_TYPE_LIST:
            for (size_t i=0; i<o->list.len; i++) {
                freeObject(o->list.ele[i]);
            }
            free(o->list.ele);
            break;
        default:
            break;
    }
}

void release(tfobj *o) {
    o->ref_count--;
    if (!o->ref_count) freeObject(o);
}

void retain(tfobj *o) {
    o->ref_count++;
}

/* ================ Parse Library ============== */

#define MAX_WORD_LEN 128

tfobj* parseObject(char *cur, int type) {
    char *buf = xmalloc(MAX_WORD_LEN);
    int count = 0;
    while (cur && !isspace(*cur)) {
        if (count >= MAX_WORD_LEN) {
            perror("Word out of range\n");
            exit(1);
        }
        buf[count] = *cur;
        cur++;
        count++;
    }
    switch (type) {
        case TOYFORTH_TYPE_INT:
            return createIntObject(atoi(buf));
        case TOYFORTH_TYPE_BOOL:
            return createBoolObject(atoi(buf));
        case TOYFORTH_TYPE_SYMBOL:
            return createSymbolObject(buf);
        case TOYFORTH_TYPE_STR: {
            if (buf[0] != '\'' || buf[count-1] != '\'') {
                perror("Syntax error: str must be wrapped by single quote!\n");
                exit(1);
            }
            char *buf_unquoted = xmalloc(sizeof(count-2));
            memcpy(buf_unquoted, buf+1, count-2);
            return createStrObject(buf_unquoted);
        }
        default:
            perror("Unsupported word type!\n");
            exit(1);
    }
}

tfobj *listPop(tfobj *l) {
    tfobj *popped = l->list.ele[l->list.len-1];
    // release(popped); // intentionally commented out for ownership transfer to the list
    return popped;
}

void listPush(tfobj *l, tfobj* o) {
    l = xrealloc(l, l->list.len+1);
    *(l->list.ele+1) = o;
    // retain(o); // intentionally commented out for ownership transfer to the list
    l->list.len++;
}

tfobj* parseListObject(char *cur) {
    tfobj *list = xmalloc(sizeof(tfobj*));
    while (cur) {
        if (isspace(*cur)) {
            cur++;
            continue;
        }
        if (*cur == '[') {
            listPush(list, parseListObject(cur));
        } else if (isdigit(*cur) || (*cur == '-' && isdigit(*(cur+1)))) {
            listPush(list, parseObject(cur, TOYFORTH_TYPE_INT));
        } else if (isalpha(*cur)) {
            listPush(list, parseObject(cur, TOYFORTH_TYPE_SYMBOL));
        } else if (*cur == '\'' || *cur == '"') {
            listPush(list, parseObject(cur, TOYFORTH_TYPE_STR));
        }
    }
    return list;
}

typedef struct parser {
    tfobj *parsed;
    tfobj *cur;
} parser;

void parse(parser *par, char *buf) {
    char *cur = buf;
    tfobj *root_list = parseListObject(cur);
    listPush(par->parsed, root_list);
    return;
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
    fclose(fp);

    // parse the objects
    parser *prog = xmalloc(sizeof(parser*));
    parse(prog, buf);
    
    //exec(prog);

    // final cleanup
    free(buf);

    return 0;
}
