CC      := cc
SRC     := toyforth.c
BIN     := a.out
PROG    ?= program.tf

RELEASE_FLAGS := -Wall -W -O2
DEBUG_FLAGS   := -g -fsanitize=address -Wall -Wextra -O0

.PHONY: all debug run run-debug clean

# Optimized release build (default)
all: $(BIN)

$(BIN): $(SRC)
	$(CC) $(SRC) $(RELEASE_FLAGS) -o $(BIN)

# Debug build with AddressSanitizer
debug: $(SRC)
	$(CC) $(SRC) $(DEBUG_FLAGS) -o $(BIN)

# Build (release) and run
run: all
	./$(BIN) $(PROG)

# Build (debug) and run with ASan aborting on first error
run-debug: debug
	ASAN_OPTIONS=abort_on_error=1:halt_on_error=1 ./$(BIN) $(PROG)

clean:
	rm -f $(BIN)
	rm -rf $(BIN).dSYM
