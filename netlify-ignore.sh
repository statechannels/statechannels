# Set this environment variable as appropriate in netlify UI config
status=0
git remote add origin https://github.com/statechannels/monorepo.git
git fetch origin --quiet
case $TARGET_PACKAGE in

    web3torrent)
        echo "Checking for changes across web3torrent, embedded-wallet and channel-provider packages..."
        git diff --quiet origin/master HEAD -- ./packages/web3torrent ./packages/embedded-wallet ./packages/channel-provider
        status=$?
        ;;

    embedded-wallet)
        echo "Checking for changes across web3torrent, embedded-wallet and channel-provider packages..."
        git diff --quiet origin/master HEAD -- ./packages/web3torrent ./packages/embedded-wallet ./packages/channel-provider
        status=$?
        ;;

    rps)
        echo "Checking for changes across rps package..."
        git diff --quiet origin/master HEAD -- ./packages/rps
        status=$?
        ;;

    wallet)
        echo "Checking for changes across wallet package..."
        git diff --quiet origin/master HEAD -- ./packages/wallet
        status=$?
        ;;

    xstate-wallet)
        echo "Checking for changes across xstate-wallet package..."
        git diff --quiet origin/master HEAD -- ./packages/xstate-wallet
        status=$?
        ;;

    nitro-protocol)
        echo "Checking for changes in nitro-protocol package..."
        git diff --quiet origin/master HEAD -- ./packages/nitro-protocol
        status=$?
        ;;
    
    app-wallet-interface)
        echo "Checking for changes in app-wallet-interface package..."
        git diff --quiet origin/master HEAD -- ./packages/app-wallet-interface
        status=$?
        ;;

    *)
        echo "TARGET_PACKAGE environment variable not set to valid value"

esac

# An exit-code of 1 indicates the contents have changed. An exit-code of 0 indicates that the build should return early.

case $status in 

    0)
        echo "No changes detected"
        exit 0
        ;;

    1)
        echo "Changes detected"
        exit 1
        

esac