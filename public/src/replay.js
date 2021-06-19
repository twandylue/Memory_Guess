import { addGameInfo } from "./add_game_info.js";
import { showGameStatInReplay } from "./game_stat_replay.js";

async function main () {
    let userName, userEmail, oppoName, oppoEmail, oppoPhoto;
    const userInfo = await checkLogin(); // 前端把關
    document.querySelector("#user_photo").src = userInfo.data.picture;
    document.querySelector("#user_photo_left").src = userInfo.data.picture;
    document.querySelector("#name").innerHTML = userInfo.data.name;
    document.querySelector("#user-name-header").innerHTML = userInfo.data.name;
    const urlParams = new URLSearchParams(window.location.search);
    const gameID = urlParams.get("gameID");
    const index = urlParams.get("index");
    document.querySelector("#roomID").innerHTML = `重播場次: 第${index}場`;

    if (gameID == null) {
        Swal.fire({
            icon: "warning",
            title: "出事啦",
            text: "請重新選擇重播場次",
            confirmButtonText: "確認"
        }).then(() => {
            window.location.href = "./user_profile.html";
        });
        return;
    }

    const replayData = await getReplayData(gameID);
    if (replayData.data === 0) {
        Swal.fire({
            icon: "warning",
            title: "與對手配對成功，但沒有遊玩記錄",
            text: "請重新選擇重播場次",
            confirmButtonText: "確認"
        }).then(() => {
            window.location.href = "./user_profile.html";
        });
        return;
    }
    const { members, rules, stepList, cardsSetting, gameStatData } = replayData.data;
    const roundStepList = [];
    const cardsSettingList = [];
    const stepRound1 = [];
    const stepRound2 = [];
    const stepRound3 = [];
    const cardsSettingRound1 = [];
    const cardsSettingRound2 = [];
    const cardsSettingRound3 = [];

    console.log(stepList);

    for (const i in stepList) {
        if (stepList[i].round === 1) {
            stepRound1.push(stepList[i]);
        } else if (stepList[i].round === 2) {
            stepRound2.push(stepList[i]);
        } else if (stepList[i].round === 3) {
            stepRound3.push(stepList[i]);
        }
    }
    if (stepRound1.length !== 0) {
        roundStepList.push(stepRound1);
    }
    if (stepRound2.length !== 0) {
        roundStepList.push(stepRound2);
    }
    if (stepRound3.length !== 0) {
        roundStepList.push(stepRound3);
    }

    for (const i in cardsSetting) {
        if (cardsSetting[i].round === 1) {
            cardsSettingRound1.push(cardsSetting[i]);
        } else if (cardsSetting[i].round === 2) {
            cardsSettingRound2.push(cardsSetting[i]);
        } else if (cardsSetting[i].round === 3) {
            cardsSettingRound3.push(cardsSetting[i]);
        }
    }

    if (cardsSettingRound1.length !== 0) {
        cardsSettingList.push(cardsSettingRound1);
    }
    if (cardsSettingRound2.length !== 0) {
        cardsSettingList.push(cardsSettingRound2);
    }
    if (cardsSettingRound3.length !== 0) {
        cardsSettingList.push(cardsSettingRound3);
    }

    for (const i in members) {
        if (members[i].player_email === userInfo.data.email) {
            userName = members[i].name;
            userEmail = members[i].player_email;
        } else {
            oppoName = members[i].name;
            oppoEmail = members[i].player_email;
            oppoPhoto = members[i].photo_src;
        }
    }

    document.querySelector("#opposite_user_name").innerHTML = oppoName; // 填寫user name
    document.querySelector("#user_photo_right").src = oppoPhoto; // 填上對手照片

    const targets = [rules.targets_1, rules.targets_2, rules.targets_3];
    addGameInfo(rules.type, rules.number, rules.rounds, targets);// 填寫規則提醒

    let nowRound;
    for (let i = 0; i < roundStepList.length; i++) { // cardSetting 也要放入
        let readyTime = 5;
        const roundTime = 10;
        nowRound = i + 1;
        addGameStatusReplayInit(nowRound, targets[i], readyTime); // 上方資訊
        showCardsinReplay(rules.number, "in ready", cardsSettingList[i]); // 掀牌
        while (readyTime >= 0) { // countdown in game
            document.querySelector("#countdown").innerHTML = `準備倒數時間: ${readyTime}`;
            await delay(1000);
            readyTime--;
        }
        hideCardsinReplay(nowRound, roundTime);

        await replayinPage(roundStepList[i], userName, oppoName);
        Swal.fire({
            icon: "success",
            title: "此回合結束囉",
            text: "讓我們繼續看下去",
            confirmButtonText: "確認"
        });
    }
    // 遊戲結束 顯示統計結果
    let hitRate, totalPointsNumber, winnerStatus;
    const roundsPoints = [];
    if (gameStatData === 0) {
        showGameStatInReplay("None", "None", "None", "中途結束 無勝負");
    } else {
        for (const i in gameStatData) {
            if (gameStatData[i].player_email === userEmail) {
                hitRate = gameStatData[i].hit_rate;
                totalPointsNumber = gameStatData[i].total_points;
                // roundsPoints =gameStatData[i]
                const points = [gameStatData[i].round1_points, gameStatData[i].round2_points, gameStatData[i].round3_points];
                for (const i in points) {
                    if (points[i] !== null) {
                        roundsPoints.push(points[i]);
                    }
                }
                if (gameStatData[i].winner_email === userEmail) {
                    winnerStatus = userName;
                } else if (gameStatData[i].winner_email === oppoEmail) {
                    winnerStatus = oppoName;
                } else {
                    winnerStatus = "Tie";
                }
            }
        }
        showGameStatInReplay(parseFloat(hitRate), totalPointsNumber, roundsPoints, winnerStatus);
    }
    document.querySelector("#replay_title").innerHTML = "重播結束囉！";
    document.querySelector("#replay_title").style = "cursor:auto; color:#fbfef9; background-color: #0D1F2D;";
    Swal.fire({
        icon: "success",
        title: "遊戲重播結束囉",
        text: "請查看遊戲統計成績",
        confirmButtonText: "確認"
    }).then(() => {
        const again = document.querySelector("#again");
        again.addEventListener("click", () => {
            window.location.reload();
        });
        const goodbye = document.querySelector("#goodbye");
        goodbye.addEventListener("click", () => {
            window.location.href = "./user_profile.html";
        });
    });
}
main();

async function replayinPage (stepList, userName, oppoName) {
    countdownTimeinReplay(stepList[0].time); // 更新倒數計時數字 不同步 獨立

    const user = { his: [] };
    const oppo = { his: [] };
    const cards = document.querySelectorAll(".memory-card");
    const cardFrontFaces = document.querySelectorAll(".front-face");

    for (let i = 0; i < stepList.length; i++) {
        let deltaTime = 10;
        if (i < stepList.length - 1) {
            deltaTime = stepList[i + 1].uts_order - stepList[i].uts_order; // 每次翻牌的延遲時間
            // console.log(deltaTime);
        }

        // console.log(`round: ${stepList[i].round}`);
        // console.log(`time: ${stepList[i].time}`);
        // console.log(`-------------------------index: ${i}`);

        if (userName === stepList[i].name) {
            cards[stepList[i].card_ID].classList.add("flip", "card-color"); // card flipped by local 翻牌
            user.his.push(stepList[i].card_ID);
            // console.log("========user");
            // console.log("user.his");
            // console.log(user.his);
        } else if (oppoName === stepList[i].name) {
            cards[stepList[i].card_ID].classList.add("flip", "card-color-opponent");
            oppo.his.push(stepList[i].card_ID);
            // console.log("========oppo");
            // console.log("oppo.his");
            // console.log(oppo.his);
        }
        cardFrontFaces[stepList[i].card_ID].innerHTML = stepList[i].number;

        await delay(deltaTime);

        if (user.his.length > 1) { // 點擊兩次
            if (stepList[i].points !== 0) { // 卡片配對
                // console.log("==================================user match!!!!!!!!!");
                const player = document.querySelector("#player_points");
                const userPoints = parseInt((player.innerHTML).split(" ")[1]);
                const newPoints = userPoints + stepList[i].points;
                player.innerHTML = `目前得分: ${newPoints}`;
            } else {
                for (const j in user.his) {
                    cards[user.his[j]].classList.remove("flip", "card-color");
                }
            }
            while (user.his.length) {
                user.his.pop();
            }
        }

        if (oppo.his.length > 1) { // 點擊兩次
            if (stepList[i].points !== 0) { // 卡片配對
                // console.log("==================================oppo match!!!!!!!!!");
                const oppo = document.querySelector("#oppo_player_points");
                const oppoPoints = parseInt((oppo.innerHTML).split(" ")[1]);
                const newPoints = oppoPoints + stepList[i].points;
                oppo.innerHTML = `目前得分: ${newPoints}`;
            } else {
                for (const j in oppo.his) {
                    cards[oppo.his[j]].classList.remove("flip", "card-color-opponent"); // 卡片沒配對 翻回問號
                }
            }
            while (oppo.his.length) {
                oppo.his.pop();
            }
        }
    }
    // 初始化
    while (user.his.length) {
        user.his.pop();
    }
    while (oppo.his.length) {
        oppo.his.pop();
    }
}

function delay (delayTime) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve("delay"); }, delayTime);
    });
}

async function checkLogin () {
    const accessToken = localStorage.getItem("access_token");
    const response = await fetch("api/1.0/user/profile", {
        method: "GET",
        headers: new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        })
    });
    if (response.status !== 200) {
        Swal.fire({
            icon: "warning",
            title: "出事啦",
            text: "請重新登入",
            confirmButtonText: "確認"
        }).then(() => {
            window.location.href = "/";
        });
    }
    return await response.json();
}

async function getReplayData (gameID) { // 從url中拿資料
    const accessToken = localStorage.getItem("access_token");
    const data = JSON.stringify({ data: gameID });
    const response = await fetch("/api/1.0/replayreocrd", {
        body: data,
        method: "POST",
        headers: new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        })
    });
    if (response.status !== 200) {
        Swal.fire({
            icon: "warning",
            title: "出事啦",
            text: "請重新選擇重播場次",
            confirmButtonText: "確認"
        }).then(() => {
            window.location.href = "./user_profile.html";
        });
    }
    if (response.status === 400) {
        Swal.fire({
            icon: "warning",
            title: "沒有權限觀看",
            text: "請重新選擇重播場次",
            confirmButtonText: "確認"
        }).then(() => {
            window.location.href = "./user_profile.html";
        });
    }
    return await response.json();
}

async function countdownTimeinReplay (time) {
    while (time >= 0) { // countdown in game
        const item = document.querySelector("#countdown");
        if (item) {
            item.innerHTML = `遊戲倒數時間: ${time}`;
        }
        await delay(1000);
        time--;
    }
}

function addGameStatusReplayInit (round, target, time) {
    const middle = document.querySelector("#middle");
    while (middle.firstChild) { // 移除middle下 每個項目
        middle.removeChild(middle.lastChild);
    };
    const status = document.createElement("div");
    status.id = "status";
    status.className = "game_status";
    status.innerHTML = `第 ${round} 回合 Replay: Standby`;
    const goal = document.createElement("div");
    goal.id = "goal";
    goal.className = "game_status";
    goal.innerHTML = `目標: 卡片1數字 x 卡片2數字 = ${target}`;
    const countdown = document.createElement("div");
    countdown.id = "countdown";
    countdown.className = "game_status";
    countdown.innerHTML = `準備倒數時間: ${time} s`;
    middle.append(status, goal, countdown);
}

function showCardsinReplay (number, state, cardsSetting) {
    const middle = document.querySelector("#middle");
    const memoryGame = document.createElement("section");
    memoryGame.className = "memory-game";
    for (let i = 0; i < number; i++) {
        const card = document.createElement("div");
        card.classList.add("memory-card", `double${number}`);
        card.id = `cardID_${i}`;
        card.dataset.framework = `card_${i}`;
        const frontFace = document.createElement("div");
        frontFace.id = `${i}`;
        frontFace.innerHTML = `${cardsSetting[i].number}`;
        const backFace = document.createElement("img");

        if (state === "in ready") {
            frontFace.className = "front-face";
            backFace.classList.add("back-face", "back-face_ready");
        }

        backFace.src = "https://memoryguess.s3.ap-northeast-1.amazonaws.com/question_mark.svg";
        backFace.alt = "Memory Card";
        card.append(frontFace, backFace);
        memoryGame.append(card);
    }
    middle.append(memoryGame);
}

function hideCardsinReplay (round, roundTime) {
    const cardFrontFaces = document.querySelectorAll(".front-face");
    const cardBackFaces = document.querySelectorAll(".back-face");
    const status = document.querySelector("#status");
    status.innerHTML = `第 ${round} 回合 Replay: Start！`;
    document.querySelector("#countdown").innerHTML = `遊戲倒數時間: ${roundTime}`;
    for (let i = 0; i < cardFrontFaces.length; i++) {
        cardFrontFaces[i].innerHTML = "";
        cardFrontFaces[i].classList.add("front-face_start");
        cardBackFaces[i].classList.remove("back-face_ready");
    }
}

const profile = document.querySelector("#user_profile");
profile.addEventListener("click", () => {
    Swal.fire({
        icon: "question",
        title: "請選擇功能",
        text: "想做啥?",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "我的檔案",
        denyButtonText: "登出",
        cancelButtonText: "取消"
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "/user_profile.html";
        } else if (result.isDenied) {
            localStorage.removeItem("access_token");
            window.location.href = "/";
        }
    });
});

const logo = document.querySelector("#logo-container-header");
logo.addEventListener("click", () => {
    window.location.href = "/";
});
