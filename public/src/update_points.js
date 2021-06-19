function updatePoints (socket, pointsInfo) {
    const player = document.querySelector("#player_points");
    const oppo = document.querySelector("#oppo_player_points");
    const userPoints = parseInt((player.innerHTML).split(" ")[1]);
    const oppoPoints = parseInt((oppo.innerHTML).split(" ")[1]);

    if (pointsInfo.playerID === socket.id) { // player 加分
        const newPoints = userPoints + pointsInfo.point;
        player.innerHTML = `目前得分: ${newPoints}`;
    } else { // oppo 加分
        const newPoints = oppoPoints + pointsInfo.point;
        oppo.innerHTML = `對手得分: ${newPoints}`;
    }
}

export { updatePoints };
