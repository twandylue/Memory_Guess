function showBreakTimeInfo (nextRound) {
    const middle = document.querySelector("#middle");
    while (middle.firstChild) { // 移除middle下 每個項目
        middle.removeChild(middle.lastChild);
    };
    middle.className = "middle-breakTime";
    const status = document.createElement("div");
    status.id = "status";
    status.className = "game_status";
    status.innerHTML = `第 ${nextRound - 1} 回合 結束`;
    const goal = document.createElement("div");
    goal.id = "goal";
    goal.className = "game_status";
    goal.innerHTML = `休息一下吧！ 第${nextRound}回合準備開始`;
    const countdown = document.createElement("div");
    countdown.id = "countdown-break";
    countdown.className = "game_status";
    countdown.innerHTML = "中場休息倒數時間: ... s"; // 待改

    middle.append(status, goal, countdown);
}

export { showBreakTimeInfo };
