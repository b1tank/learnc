#!/bin/bash
set -e

verbose=0
[[ "$1" == "-v" ]] && { verbose=1; shift; }
[[ "$1" == "-vv" ]] && { verbose=2; shift; }

prog="${1:-program.tf}"

if [[ "$verbose" -ge 1 ]]; then
	echo "== verbose build (debug + AddressSanitizer) =="
	cc toyforth.c -g -fsanitize=address -Wall -Wextra -O0 -o a.out
else
	cc toyforth.c -Wall -W -O2 -o a.out
fi

if [[ "$verbose" -ge 2 ]]; then
	ASAN_OPTIONS=abort_on_error=1:halt_on_error=1 ./a.out "$prog"
else
	./a.out "$prog"
fi