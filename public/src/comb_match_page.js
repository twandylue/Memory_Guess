function combineMatchPageForAgain () {
    const gameInfo = document.querySelector("#game_info");
    gameInfo.remove(); // game-info 初始化

    // points 初始化
    const userPoints = document.querySelector("#player_points");
    userPoints.innerHTML = "目前得分: 0";
    const oppoPoints = document.querySelector("#oppo_player_points");
    oppoPoints.innerHTML = "對手得分: 0";

    const middle = document.querySelector("#middle");
    while (middle.firstChild) { // 移除middle下 每個項目
        middle.removeChild(middle.lastChild);
    };
    const ruleSetting = document.createElement("div");
    ruleSetting.id = "rule_setting";
    ruleSetting.innerHTML = "遊戲規則";
    const settingDetails = document.createElement("div");
    settingDetails.id = "setting_details";
    const type = document.createElement("div");
    type.id = "type";
    type.className = "details";
    const typeTitle = document.createElement("div");
    typeTitle.className = "setting-details-title";
    typeTitle.innerHTML = "類型:";
    const typeContent = document.createElement("div");
    typeContent.className = "setting-details-content";
    typeContent.innerHTML = "Waiting...";
    type.append(typeTitle, typeContent);

    const numberofCards = document.createElement("div");
    numberofCards.id = "number_of_cards";
    numberofCards.className = "details";
    const numberofCardsTitle = document.createElement("div");
    numberofCardsTitle.className = "setting-details-title";
    numberofCardsTitle.innerHTML = "總數:";
    const numberofCardsContent = document.createElement("div");
    numberofCardsContent.className = "setting-details-content";
    numberofCardsContent.innerHTML = "Waiting...";
    numberofCards.append(numberofCardsTitle, numberofCardsContent);

    const rounds = document.createElement("div");
    rounds.id = "rounds";
    rounds.className = "details";
    const roundsTitle = document.createElement("div");
    roundsTitle.className = "setting-details-title";
    roundsTitle.innerHTML = "總回合數:";
    const roundsContent = document.createElement("div");
    roundsContent.className = "setting-details-content";
    roundsContent.innerHTML = "Waiting...";
    rounds.append(roundsTitle, roundsContent);

    const target = document.createElement("div");
    target.id = "target";
    target.className = "details";
    const targetTitle = document.createElement("div");
    targetTitle.className = "setting-details-title";
    targetTitle.innerHTML = "目標數字(/每回合):";
    const targetContent = document.createElement("div");
    targetContent.className = "setting-details-content";
    targetContent.innerHTML = "Waiting...";
    target.append(targetTitle, targetContent);

    settingDetails.append(type, numberofCards, rounds, target);

    const buttonList = document.createElement("div");
    buttonList.id = "button-list";

    const startButton = document.createElement("button");
    startButton.id = "start";
    startButton.className = "button";
    startButton.innerHTML = "我準備好了！";
    startButton.style = "cursor: pointer";

    const leaveButton = document.createElement("button");
    leaveButton.id = "leave";
    leaveButton.className = "button";
    leaveButton.innerHTML = "離開房間";
    leaveButton.style = "cursor: pointer";
    buttonList.append(startButton, leaveButton);

    middle.append(ruleSetting, settingDetails, buttonList);
}

export { combineMatchPageForAgain };
