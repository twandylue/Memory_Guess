function addGameInfo (type, number, rounds, targets) {
    const gameInfo = document.createElement("div");
    gameInfo.id = "game_info";
    const infoTitle = document.createElement("div");
    infoTitle.className = "info info-title";
    infoTitle.innerHTML = "規則提醒";
    const infoType = document.createElement("div");
    infoType.className = "info";
    if (type === "multi") {
        infoType.innerHTML = "類型:  乘法";
    }
    const infoAmount = document.createElement("div");
    infoAmount.className = "info";
    infoAmount.innerHTML = `總數:  ${number} 張`;
    const infoTotal = document.createElement("div");
    infoTotal.className = "info";
    infoTotal.innerHTML = `總回合數:  ${rounds} 回合`;
    const infoTargets = document.createElement("div");
    infoTargets.className = "info";
    const pureArr = [];
    for (let i = 0; i < targets.length; i++) {
        if (targets[i] !== null) {
            pureArr.push(targets[i]);
        }
    }
    let str = "目標數字: ";
    for (let i = 0; i < pureArr.length; i++) {
        if (i === pureArr.length - 1) {
            str += `${targets[i]}`;
            break;
        }
        str += `${targets[i]}/`;
    }
    infoTargets.innerHTML = str;
    gameInfo.append(infoTitle, infoType, infoAmount, infoTotal, infoTargets);
    const right = document.querySelector("#right");
    right.append(gameInfo);
}

export { addGameInfo };
