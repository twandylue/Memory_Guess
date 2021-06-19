import { addGameInfo } from "./add_game_info.js";
import { addGameStatusAndCards } from "./add_game_status_cards.js";
import { cardGame } from "./card_game.js";
import { showGameStat } from "./game_stat.js";
import { updatePoints } from "./update_points.js";
import { showGameRules } from "./show_game_rules.js";
import { combineMatchPageForAgain } from "./comb_match_page.js";
import { showBreakTimeInfo } from "./show_break_time_info.js";
import { setVideoChat } from "./video_chat.js";

let frontGameID; // 儲存遊戲ID
let frontRules; // 儲存遊戲規則

const token = localStorage.getItem("access_token");
async function main () {
    const userInfo = await getUserPhoto();
    document.querySelector("#user_photo").src = userInfo.data.picture;
    document.querySelector("#user_photo_left").src = userInfo.data.picture;
    document.querySelector("#name").innerHTML = userInfo.data.name;
    document.querySelector("#user_name").innerHTML = `Hi! ${userInfo.data.name}`;
}
main();

const socket = io({
    auth: {
        token: token
    }
});

socket.on("connect", () => {
    // console.log(socket.id);
    setVideoChat(socket);
});

socket.on("connect_error", (err) => {
    console.log(err.message);
    if (err.message) {
        Swal.fire({
            icon: "warning",
            title: "你斷線囉",
            text: err.message,
            confirmButtonText: "確認"
        }).then(() => {
            window.location.href = "./game_lobby.html";
        });
    }
});

socket.on("opponent leave room", async () => {
    Swal.fire({
        icon: "warning",
        title: "對手斷線了",
        text: "回到遊戲大廳!",
        confirmButtonText: "確認"
    }).then(() => {
        window.location.href = "./game_lobby.html";
    });
    await delay(2500); // 2.5秒後自動踢人
    window.location.href = "./game_lobby.html";
});

socket.on("join failed", (msg) => {
    Swal.fire({
        icon: "error",
        title: "加入房間失敗",
        text: "請重新加入房加!",
        confirmButtonText: "好的"
    }).then(() => {
        window.location.href = "/game_lobby.html";
    });
});

socket.emit("in room", "in the room");
socket.emit("get user room", "get my roomID");

Swal.fire({
    icon: "warning",
    title: "準備好了嗎？",
    text: "要開始了唷!",
    confirmButtonText: "確認"
});

socket.on("show roomID", (info) => {
    document.querySelector("#roomID").innerHTML = `房號: ${info.roomID}`;
});

socket.on("fill name", (name) => {
    document.querySelector("#user_container #name").innerHTML = name;
});
socket.on("fill opponent info", (oppoInfo) => {
    document.querySelector("#opposite_user_name").innerHTML = oppoInfo.name;
    document.querySelector("#user_photo_right").src = oppoInfo.picture;
    localStorage.setItem("oppoPhoto", oppoInfo.picture);
});

// for chat room
const inputEnter = document.querySelector("#sendmsg #input");
const sendMsg = document.querySelector("#send");
const chatroom = document.querySelector("#messages");

sendMsg.addEventListener("click", () => {
    if (inputEnter.value) {
        socket.emit("chat message", ": " + inputEnter.value);
        inputEnter.value = "";
    }
});

inputEnter.addEventListener("keyup", (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        sendMsg.click();
    }
});

socket.on("wait for opponent", () => { // 目前應該為等待畫面 不會顯示規則
    Swal.fire({
        icon: "warning",
        title: "尚未配對成功",
        text: "等一下對手出現",
        confirmButtonText: "確認"
    });
    const startButton = document.querySelector("#start");
    startButton.disabled = true;
    startButton.innerHTML = "等待對手中";
});

socket.on("both of you in ready", (info) => { // gameID 第一次出現 在info中
    const { rules, gameID } = info;
    frontGameID = gameID; //    第一次儲存gameID
    frontRules = Object.assign({}, rules); // 第一次儲存frontRules(game rules)
    showGameRules(frontRules); // show rules

    const startButton = document.querySelector("#start");
    if (startButton) {
        startButton.disabled = false;
        startButton.innerHTML = "我準備好了！";
    }
});

socket.on("chat message", (msg) => {
    const item = document.createElement("li");
    item.innerHTML = msg;
    chatroom.appendChild(item);
    chatroom.scrollTo(0, chatroom.scrollHeight);
});

socket.on("execute rules", (info) => {
    addGameInfo(info.rules.type, info.rules.number, info.rules.rounds, info.rules.targets);
    addGameStatusAndCards(info.round, info.rules.number, info.target, info.rules.state, info.cardsSetting);
});

socket.on("countdown in ready", (time) => {
    if (document.querySelector("#countdown") === null) {
        return;
    }
    document.querySelector("#countdown").innerHTML = `遊戲倒數時間: ${time} s`;
});

socket.on("break", (info) => {
    let timerInterval;
    Swal.fire({
        title: "此回合結束！",
        html: `休息一下吧！ <b></b> 秒後進入第${info.nextRound}回合`,
        timer: (info.breakTime) * 1000,
        timerProgressBar: true,
        didOpen: () => {
            const middle = document.querySelector("#middle");
            while (middle.firstChild) { // 移除middle下 每個項目
                middle.removeChild(middle.lastChild);
            };
            Swal.showLoading();
            timerInterval = setInterval(() => {
                const content = Swal.getHtmlContainer();
                if (content) {
                    const b = content.querySelector("b");
                    if (b) {
                        b.textContent = parseFloat(parseInt(Swal.getTimerLeft()) / 1000).toFixed(0);
                    }
                }
            }, 100);
        },
        willClose: () => {
            clearInterval(timerInterval);
        }
    }).then(() => {
        showBreakTimeInfo(info.nextRound);
    });
});

socket.on("countdown in break", (time) => {
    if (document.querySelector("#countdown-break") === null) {
        return;
    }
    document.querySelector("#countdown-break").innerHTML = `中場休息倒數時間: ${time} s`;
});

socket.on("countdown in game", (time) => {
    if (document.querySelector("#countdown") === null) {
        return;
    }
    document.querySelector("#countdown").innerHTML = `遊戲倒數時間: ${time} s`;
});

socket.on("start game", (info) => { // 翻牌(問號面)
    if (info.msg === "start") {
        const cardFrontFaces = document.querySelectorAll(".front-face");
        const cardBackFaces = document.querySelectorAll(".back-face");
        const status = document.querySelector("#status");
        status.innerHTML = `第 ${info.round} 回合 Start！`;
        for (let i = 0; i < cardFrontFaces.length; i++) {
            cardFrontFaces[i].innerHTML = "";
            cardFrontFaces[i].classList.add("front-face_start");
            cardBackFaces[i].classList.remove("back-face_ready");
        }

        cardGame(socket, frontGameID, info.round, info.target);
    }
});

socket.on("fill card number", (cardfilledInfo) => {
    const cardFrontFaces = document.querySelectorAll(".front-face");
    if (cardFrontFaces) {
        cardFrontFaces[cardfilledInfo.cardID].innerHTML = cardfilledInfo.number;
    }
});

socket.on("next round execute rules", (info) => {
    addGameStatusAndCards(info.round, info.rules.number, info.target, info.rules.state, info.cardsSetting);
});

socket.on("update points", (pointsInfo) => {
    updatePoints(socket, pointsInfo);
});

socket.on("game over", (gameStatInfo) => {
    socket.emit("get user info", "get my name");
    Swal.fire({
        icon: "success",
        title: "遊戲結束！",
        text: "看看自己的成績吧",
        confirmButtonText: "確認"
    });
    socket.on("show my info", (info) => { // 確認自己的email 用作辨認
        let hitRate, roundsPoints, totalPoints;
        for (const i in gameStatInfo.results) {
            if (gameStatInfo.results[i].player_email === info.email) {
                hitRate = gameStatInfo.results[i].hitRate;
                roundsPoints = gameStatInfo.results[i].roundsPoints.map((element) => { return element; });
                totalPoints = gameStatInfo.results[i].totalPoints;
            }
        }
        let winnerStatus;
        if (gameStatInfo.winner[0].email === info.email) {
            winnerStatus = "You Win!";
        } else if (gameStatInfo.winner[0].name === "Tie") {
            winnerStatus = "Tie!";
        } else {
            winnerStatus = "You Lose!";
        }
        showGameStat(hitRate, totalPoints, roundsPoints, winnerStatus);

        const replay = document.querySelector("#replay_title");
        replay.addEventListener("click", () => {
            Swal.fire({
                icon: "warning",
                title: "離開房間",
                text: "前往觀看遊戲重播",
                confirmButtonText: "確認",
                showDenyButton: true,
                denyButtonText: "取消"
            }).then((result) => {
                if (result.isConfirmed) {
                    const index = "none";
                    window.location.href = `/replay.html?gameID=${frontGameID}&&index=${frontGameID}`;
                }
            });
        });

        const again = document.querySelector("#again");
        again.addEventListener("click", () => {
            const info = { gameID: frontGameID };
            socket.emit("want to play again", info);
            Swal.fire({
                icon: "info",
                title: "已送出再玩一次的邀請",
                text: "請等待對手回應",
                confirmButtonText: "好的"
            }).then(() => {
                again.remove();
                const wati = document.createElement("div");
                wati.id = "wait";
                wati.innerHTML = "等待對手回應...";
                const watispan1 = document.createElement("span");
                const watispan2 = document.createElement("span");
                const watispan3 = document.createElement("span");
                const watispan4 = document.createElement("span");
                wati.append(watispan1, watispan2, watispan3, watispan4);
                const wrap = document.querySelector("#wrap");
                wrap.insertBefore(wati, wrap.firstChild);
            });
        });

        const goodbye = document.querySelector("#goodbye");
        goodbye.addEventListener("click", () => {
            Swal.fire({
                icon: "warning",
                title: "離開遊戲房間",
                text: "再見",
                confirmButtonText: "Bye"
            }).then(() => {
                window.location.href = "/game_lobby.html";
            });
        });
    });
});

socket.on("again", (info) => {
    frontGameID = info.gameID; // 更新gameID
    frontRules = Object.assign({}, info.rules); // 儲存新的frontRules
    document.querySelector("#middle").classList.remove("middle-Stat");
    combineMatchPageForAgain();
    showGameRules(info.rules);

    const startButton = document.querySelector("#start");
    startButton.addEventListener("click", () => { // 此callbackfunction 可以簡化 重複使用 start button 待改
        startButton.disabled = "disabled";
        Swal.fire({
            icon: "warning",
            title: "準備完成！",
            text: "等待對手準備...",
            confirmButtonText: "確認"
        }).then(() => {
            socket.emit("I am ready", { rules: frontRules, gameID: frontGameID });
        });
    });

    const leave = document.querySelector("#leave");
    leave.addEventListener("click", () => {
        Swal.fire({
            icon: "warning",
            title: "離開房間?",
            text: "確定要離開房間嗎?",
            showDenyButton: true,
            confirmButtonText: "確認",
            denyButtonText: "取消"
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "./game_lobby.html";
            } else if (result.isDenied) {
                Swal.fire("留在房間內", "", "info");
            }
        });
    });

    Swal.fire({
        icon: "warning",
        title: "對手也想再玩一局！",
        text: "轉跳至準備頁面",
        confirmButtonText: "確認"
    });
});

const start = document.querySelector("#start"); // 規則展示頁面確認按鈕
start.addEventListener("click", () => {
    start.disabled = "disabled";
    leave.disabled = "disabled";
    Swal.fire({
        icon: "warning",
        title: "準備完成！",
        text: "等待對手準備...",
        confirmButtonText: "確認"
    }).then(() => {
        socket.emit("I am ready", { rules: frontRules, gameID: frontGameID });
    });
});

const leave = document.querySelector("#leave");
leave.addEventListener("click", () => {
    Swal.fire({
        icon: "warning",
        title: "離開房間?",
        text: "確定要離開房間嗎?",
        showDenyButton: true,
        confirmButtonText: "確認",
        denyButtonText: "取消"
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "./game_lobby.html";
        } else if (result.isDenied) {
            Swal.fire("留在房間內", "", "info");
        }
    });
});

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

async function getUserPhoto () {
    const accessToken = localStorage.getItem("access_token");
    const response = await fetch("api/1.0/user/profile", {
        method: "GET",
        headers: new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        })
    });
    return await response.json();
}

function delay (delayTime) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve("delay"); }, delayTime);
    });
}
