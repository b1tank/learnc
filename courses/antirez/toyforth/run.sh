#!/bin/bash
set -e

verbose=0
[[ "$1" == "-v" ]] && { verbose=1; shift; }
[[ "$1" == "-vv" ]] && { verbose=2; shift; }

prog="${1:-program.tf}"

if [[ "$verbose" -ge 2 ]]; then
	echo "== verbose build (debug + AddressSanitizer, abort on error) =="
	make run-debug PROG="$prog"
elif [[ "$verbose" -ge 1 ]]; then
	echo "== verbose build (debug + AddressSanitizer) =="
	make debug
	./a.out "$prog"
else
	make run PROG="$prog"
fi
