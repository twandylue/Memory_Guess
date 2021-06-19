function cardGame (socket, gameID, round, target) { // 第一回合有選中 第二回合會出現問題
    // let hasEmitCheckMatch = false;
    let hasEmitedTwice = false;
    let lockBoard = false;
    let firstCard, secondCard;
    let opponentFirstCard, opponentSecondCard;
    const cards = document.querySelectorAll(".memory-card");

    socket.on("opposite click card", (oppoInfo) => {
        cards[oppoInfo.cardID].classList.add("flip", "card-color-opponent");
        if (!opponentFirstCard) {
            opponentFirstCard = cards[oppoInfo.cardID];
        } else {
            opponentSecondCard = cards[oppoInfo.cardID];
        }
    });

    function flipCard () {
        if (!lockBoard && this !== firstCard) {
            if (this === opponentFirstCard || this === opponentSecondCard) { // can't flip cards which are already flipped by oppo
                return;
            }

            this.classList.add("flip", "card-color"); // card flipped by local
            if (!firstCard) {
                firstCard = this; // first flipped card
            } else {
                secondCard = this;
                lockBoard = true; // be able to flip only two card
            }

            const countdownTime = document.querySelector("#countdown").innerHTML;
            const time = countdownTime.split(" ")[1];
            const info = {
                source: socket.id,
                cardID: this.children[0].id,
                round: round,
                target: target,
                time: time,
                gameID: gameID
            };

            if (!hasEmitedTwice) {
                if (secondCard) {
                    hasEmitedTwice = true;
                }
                socket.emit("click card", info);
            }
        }
    }

    socket.on("card number match", (cardMatchInfo) => {
        if (cardMatchInfo.selecterID === socket.id) { // fliped by local
            firstCard = cards[cardMatchInfo.cardIDs[0]];
            secondCard = cards[cardMatchInfo.cardIDs[1]];
            firstCard.removeEventListener("click", flipCard);
            secondCard.removeEventListener("click", flipCard);
            resetBoard();
        } else { // filped by oppo
            const oppoFirstCard = cards[cardMatchInfo.cardIDs[0]]; // 指定element
            const oppoSecondCard = cards[cardMatchInfo.cardIDs[1]];
            oppoFirstCard.removeEventListener("click", flipCard);
            oppoSecondCard.removeEventListener("click", flipCard);
        }
    });

    socket.on("card number not match", (cardMatchInfo) => {
        if (cardMatchInfo.selecterID === socket.id) {
            firstCard = cards[cardMatchInfo.cardIDs[0]]; // 指定element
            secondCard = cards[cardMatchInfo.cardIDs[1]];
            lockBoard = true;
            setTimeout(() => {
                firstCard.classList.remove("flip", "card-color");
                secondCard.classList.remove("flip", "card-color");
                [firstCard.children[0].innerHTML, secondCard.children[0].innerHTML] = ["", ""];
                resetBoard();
            }, 400);
        } else {
            const oppoFirstCard = cards[cardMatchInfo.cardIDs[0]]; // 指定element
            const oppoSecondCard = cards[cardMatchInfo.cardIDs[1]];
            setTimeout(() => {
                oppoFirstCard.classList.remove("flip", "card-color-opponent"); //
                oppoSecondCard.classList.remove("flip", "card-color-opponent"); //
                [oppoFirstCard.children[0].innerHTML, oppoSecondCard.children[0].innerHTML] = ["", ""];
                [opponentFirstCard, opponentSecondCard] = [null, null];
            }, 400);
        }
    });

    function resetBoard () {
        [firstCard, secondCard] = [null, null];
        [hasEmitedTwice, lockBoard] = [false, false];
    }

    cards.forEach(card => card.addEventListener("click", flipCard));
}

export { cardGame };
