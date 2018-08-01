rm -rf built

tsc

cp_with_dir () {
    mkdir -p "built/$(dirname $1)"
    cp "$1" "built/$1";
}

export -f cp_with_dir

find contracts test -name '*.sol' -exec bash -c "cp_with_dir {}" \;