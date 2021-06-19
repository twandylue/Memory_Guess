function showGameRules (rules) {
    const type = document.querySelector("#type > .setting-details-content");
    const numberofCards = document.querySelector("#number_of_cards > .setting-details-content");
    const rounds = document.querySelector("#rounds > .setting-details-content");
    const target = document.querySelector("#target > .setting-details-content");

    if (type) {
        if (rules.type === "multi") {
            type.innerHTML = "乘法";
            type.className = "setting-details-content-show";
        }
    }
    if (numberofCards) {
        numberofCards.className = "setting-details-content-show";
        numberofCards.innerHTML = rules.number;
    }
    if (rounds) {
        rounds.className = "setting-details-content-show";
        rounds.innerHTML = rules.rounds;
    }

    if (target) {
        const pureArr = [];
        for (let i = 0; i < rules.targets.length; i++) {
            if (rules.targets[i] !== null) {
                pureArr.push(rules.targets[i]);
            }
        }
        let str = "";
        for (let i = 0; i < pureArr.length; i++) {
            if (i === pureArr.length - 1) {
                str += `${rules.targets[i]}`;
                break;
            }
            str += `${rules.targets[i]}/`;
        }
        target.className = "setting-details-content-show";
        target.innerHTML = str;
    }
}

export { showGameRules };
