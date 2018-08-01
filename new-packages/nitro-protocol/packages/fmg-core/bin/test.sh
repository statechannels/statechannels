set -e
set -o pipefail

cd built

truffle test
