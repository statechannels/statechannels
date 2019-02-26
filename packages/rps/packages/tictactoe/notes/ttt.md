# Building Tic Tac Toe on ForceMove

The [ForceMove protocol](https://magmo.com/force-move-games.pdf) is designed to support general purpose, n-party state channel applications. It has a few restrictions, but is certainly general enough to allow for payments and many types of game. 

Rock Paper Scissors (henceforth RPS) was the first example of such a game, and is [live on the ropsten test net](https://demo.magmo.com). The code is [open source](https://github.com/magmo/rps-poc), and will be the starting point for developing a second game: Tic Tac Toe (henceforth TTT). 
        
We are going to work through the building of TTT, using ForceMove as a library and using RPS as an inspiration. We will start with smart contract code and then move on to building up the overall behaviour of the application itself. 

* [Channel Logic](./channel_logic.md)
* [App Logic](./app_logic.md)