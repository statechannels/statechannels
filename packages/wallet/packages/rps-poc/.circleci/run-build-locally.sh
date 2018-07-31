#! /bin/sh
# usage:
# $ chmod +x run-build-locally.sh
# $ ./run-build-locally.sh $COMMITHASH $BRANCHNAME

curl --user ${CIRCLE_TOKEN}: \
    --request POST \
    --form revision=$1\
    --form config=@config.yml \
    --form notify=false \
        https://circleci.com/api/v1.1/project/github/magmo/rps-poc/tree/$2