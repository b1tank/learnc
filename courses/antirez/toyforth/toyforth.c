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
    free(o);
}

void release(tfobj *o) {
    o->ref_count--;
    if (!o->ref_count) freeObject(o);
}

void retain(tfobj *o) {
    o->ref_count++;
}

/* ================ Parse Library ============== */

#define MAX_WORD_LEN 28

typedef struct parser {
    tfobj *parsed;
    char *cur;
} parser;

void freeParser(parser *par) {
    freeObject(par->parsed);
    free(par);
}

tfobj* parseObject(parser *par, int type) {
    char *buf_tmp = xmalloc(MAX_WORD_LEN);
    int count = 0;
    while (par->cur != NULL && *par->cur != '\0' && !isspace(*par->cur)) {
        if (count >= MAX_WORD_LEN) {
            perror("Word out of range\n");
            exit(EXIT_FAILURE);
        }
        buf_tmp[count] = *par->cur;
        par->cur++;
        count++;
    }
    buf_tmp[count] = '\0';
    printf("Parsing word: %s\n", buf_tmp);
    switch (type) {
        case TOYFORTH_TYPE_INT:
            {
                int val = atoi(buf_tmp);
                free(buf_tmp);
                return createIntObject(val);
            }
        case TOYFORTH_TYPE_BOOL:
            {
                int val = atoi(buf_tmp);
                free(buf_tmp);
                return createBoolObject(val);
            }
        case TOYFORTH_TYPE_SYMBOL:
            return createSymbolObject(buf_tmp);
        case TOYFORTH_TYPE_STR: {
            if (buf_tmp[0] != '\'' || buf_tmp[count-1] != '\'') {
                perror("Syntax error: str must be wrapped by single quote!\n");
                exit(EXIT_FAILURE);
            }
            char *buf_unquoted = xmalloc(count-1); // +1 reserves a position to \0
            memcpy(buf_unquoted, buf_tmp+1, count-2);
            free(buf_tmp);
            buf_unquoted[count-2] = '\0';
            return createStrObject(buf_unquoted);
        }
        default:
            perror("Unsupported word type!\n");
            exit(EXIT_FAILURE);
    }
}

tfobj *listPop(tfobj *l) {
    tfobj *popped = l->list.ele[l->list.len-1];
    // release(popped); // intentionally commented out for ownership transfer to the list
    return popped;
}

void listPush(tfobj *l, tfobj* o) {
    l->list.ele = xrealloc(l->list.ele, sizeof(tfobj*) * (l->list.len+1));
    l->list.ele[l->list.len] = o;
    // retain(o); // intentionally commented out for ownership transfer to the list
    l->list.len++;
}

void listPrint(tfobj *l) {
    printf("[");
    for (size_t i=0; i<l->list.len; i++) {
        tfobj *o = l->list.ele[i];
        switch (o->type) {
            case TOYFORTH_TYPE_INT:
                printf("%d", o->val);
                break;
            case TOYFORTH_TYPE_BOOL:
                printf("%s", o->val ? "true" : "false");
                break;
            case TOYFORTH_TYPE_STR:
                printf("'%s'", o->str.ptr);
                break;
            case TOYFORTH_TYPE_SYMBOL:
                printf("%s", o->str.ptr);
                break;
            case TOYFORTH_TYPE_LIST:
                listPrint(o);
                break;
            default:
                perror("Unsupported object type!\n");
                exit(EXIT_FAILURE);
        }
        if (i != l->list.len-1) {
            printf(", ");
        }
    }
    printf("]\n");
}

tfobj* parseListObject(parser *par, char *buf) {
    printf("Parsing list object: %s\n", par->cur);
    tfobj *list = createListObject();
    while (par->cur) {
        if (*par->cur == '\0') {
            break;
        }
        if (*par->cur == ']') {
            par->cur++;
            break;
        }
        if (isspace(*par->cur)) {
            par->cur++;
            continue;
        }
        if (*par->cur == '[') {
            par->cur++;
            listPush(list, parseListObject(par, buf));
        } else if (isdigit(*par->cur) || (*par->cur == '-' && isdigit(*(par->cur+1)))) {
            listPush(list, parseObject(par, TOYFORTH_TYPE_INT));
        } else if (isalpha(*par->cur) || strchr("+-*/%", *par->cur)) {
            listPush(list, parseObject(par, TOYFORTH_TYPE_SYMBOL));
        } else if (*par->cur == '\'' || *par->cur == '"') {
            listPush(list, parseObject(par, TOYFORTH_TYPE_STR));
        }
        listPrint(list);
    }
    return list;
}

void parse(parser *par, char *buf) {
    printf("---------- Parser starts ----------\n");
    par->cur = buf;
    par->parsed = parseListObject(par, buf);
    printf("---------- Parser ends   ----------\n");
    return;
}


int main(int argc, char **argv)
{
    if (argc < 2)
    {
        fprintf(stderr, "Usage: %s <filename>\n", argv[0]);
        exit(EXIT_FAILURE);
    }

    printf("========== Program starts ==========\n");
    printf("Program file: %s\n", argv[1]);

    // get program length via file IO
    FILE *fp = fopen(argv[1], "r"); // open a file
    fseek(fp, 0, SEEK_END);         // seek to the end
    size_t len = ftell(fp);           // save current location
    rewind(fp);                     // back to the beginning
    // read file into the buffer
    char *buf = xmalloc(len + 1); // +1 reserves a position to \0
    size_t ret = fread(buf, 1, len, fp);
    if (ret != len) {
        fprintf(stderr, "Error reading file: %s\n", argv[1]);
        exit(EXIT_FAILURE);
    }
    buf[len] = '\0'; // null-terminate the buffer
    printf("Program body (length %zu): %s\n", len, buf);
    fclose(fp);

    // parse the objects
    parser *prog = xmalloc(sizeof(parser));
    parse(prog, buf);
    
    //exec(prog);

    // final cleanup
    free(buf);
    freeParser(prog);

    printf("========== Program ends   ==========\n");

    return 0;
}
