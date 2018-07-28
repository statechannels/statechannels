rm -rf built

tsc

find contracts test -name '*.sol' -exec cp "{}" "built/{}" \;
