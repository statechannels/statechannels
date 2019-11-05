# Set this environment variable as appropriate in netlify UI config
case $TARGET_PACKAGE in

    web3torrent)
        echo "Checking for changes across web3torrent, embedded-wallet and channel-provider packages..."
        git diff --quiet HEAD^ HEAD ./packages/web3torrent ./packages/embedded-wallet ./packages/channel-provider 
        ;;

    embedded-wallet)
        echo "Checking for changes across web3torrent, embedded-wallet and channel-provider packages..."
        git diff --quiet HEAD^ HEAD ./packages/web3torrent ./packages/embedded-wallet ./packages/channel-provider
        ;;

    nitro-protocol)
        echo "Checking for changes in nitro-protocol package..."
        git diff --quiet HEAD^ HEAD ./packages/nitro-protocol
        ;;

esac
status=$?
[ $status eq 0 ] || echo "No changes detected" && exit 0
[ $status -eq 0 ] || echo "Changes detected" && exit 1