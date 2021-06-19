const token = localStorage.getItem("access_token");
const socket = io({
    auth: { token: token },
    reconnect: true
});

socket.on("connect", () => {
    // console.log("socketID: " + socket.id);
    main();
    socket.on("update user photo", (info) => {
        document.querySelector("#user-photo").src = info.src;
        document.querySelector("#user_photo").src = info.src;
        localStorage.setItem("access_token", info.token); // update photo
    });
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
            main();
            socket.emit("update room info", "need to update room info"); // 後端沒建立on時 會導致沒有觸發此事件 待改 改成用api的形式
        });
    }
});

async function main () {
    const userInfo = await checkLogin();
    const userRecord = await getUserRecord();
    const leaderboardObj = await getLeaderBoard();
    const leaderboardList = leaderboardObj.data;

    let totalPoints, hitRate;
    if (userRecord.data.totalPoints === null) {
        totalPoints = 0;
    } else {
        totalPoints = userRecord.data.totalPoints;
    }

    if (userRecord.data.hitRate === null) {
        hitRate = 0;
    } else {
        hitRate = userRecord.data.hitRate;
    }

    document.querySelector("#user-name-header").innerHTML = `Hi! ${userInfo.data.name}`;
    document.querySelector("#user-name-main").innerHTML = `Hi! ${userInfo.data.name}`;
    document.querySelector("#user-email-main").innerHTML = `Email: ${userInfo.data.email}`;
    document.querySelector("#user_photo").src = userInfo.data.picture;
    document.querySelector("#user-photo").src = userInfo.data.picture;
    document.querySelector("#total-points").innerHTML = `生涯總得分: ${totalPoints} 分`;
    document.querySelector("#correct-rate").innerHTML = `生涯命中率: ${(hitRate * 100).toFixed(2)} %`;
    const gameHistory = document.querySelector("#game-history");
    const { gameHis } = userRecord.data;
    for (let i = 0; i < gameHis.length; i++) {
        const gameItem = document.createElement("option");
        gameItem.id = gameHis[i].game_id;
        // 以下加入 勝負 and 對手
        const str = `第 ${i + 1} 場 | room: ${gameHis[i].room_id} | 類型: ${gameHis[i].type} | 卡片數量: ${gameHis[i].number} | 總回合數: ${gameHis[i].rounds} | 總分: ${gameHis[i].total_points} | 命中率: ${(gameHis[i].hit_rate * 100).toFixed(2)} %`;
        gameItem.innerHTML = str;
        gameItem.dataset.index = i + 1;
        gameHistory.append(gameItem);
    }

    const leaderboard = document.querySelector("#leaderboard");
    for (let i = 0; i < leaderboardList.length; i++) {
        const leaderboardItem = document.createElement("li");
        leaderboardItem.innerHTML = `排行${i + 1} | ${leaderboardList[i].name} | 總得分: ${leaderboardList[i].totalPoints} | 平均得分(/場): ${(leaderboardList[i].avgPoints).toFixed(2)} 分 | 生涯命中率: ${(leaderboardList[i].avgHitRate * 100).toFixed(2)} %`;
        leaderboard.append(leaderboardItem);
    }
}

const submit = document.querySelector("#submit");
submit.addEventListener("click", () => {
    // 重播使用
    const item = document.querySelector("#game-history");
    const gameID = item[item.selectedIndex].id; // get id of selected option
    const index = item[item.selectedIndex].dataset.index;
    window.location.href = `/replay.html?gameID=${gameID}&&index=${index}`;
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

const photo = document.querySelector("#user-photo");
photo.addEventListener("click", () => {
    let userPhoto;
    Swal.fire({
        title: "請選擇大頭貼",
        icon: "info",
        html:
          "<img id = \"logo\" class = \"user-photo-option\" style = \"cursor: pointer\" src = \"https://memoryguess.s3.ap-northeast-1.amazonaws.com/userphoto_1.png\" alt = \"logo\">" +
          "<img id = \"logo\" class = \"user-photo-option\" style = \"cursor: pointer\" src = \"https://memoryguess.s3.ap-northeast-1.amazonaws.com/userphoto_3.png\" alt = \"logo\">" +
          "<img id = \"logo\" class = \"user-photo-option\" style = \"cursor: pointer\" src = \"https://memoryguess.s3.ap-northeast-1.amazonaws.com/userphoto_4.png\" alt = \"logo\">" +
          "<img id = \"logo\" class = \"user-photo-option\" style = \"cursor: pointer\" src = \"https://memoryguess.s3.ap-northeast-1.amazonaws.com/userphoto_5.jpeg\" alt = \"logo\">",
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "確認",
        cancelButtonText: "取消",
        didOpen: () => {
            const photoChooseds = document.querySelectorAll(".user-photo-option");
            photoChooseds.forEach(photoChoosed => photoChoosed.addEventListener("click", (event) => {
                for (let i = 0; i < photoChooseds.length; i++) {
                    photoChooseds[i].classList.remove("user-photo-choose");
                }
                event.target.className = "user-photo-choose";
                userPhoto = event.target.src;
            }));
        }
    }).then((result) => {
        if (result.isConfirmed) {
            socket.emit("select user photo", userPhoto);
        }
    });
});

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

async function getUserRecord () {
    const accessToken = localStorage.getItem("access_token");
    const response = await fetch("api/1.0/user/record", {
        method: "GET",
        headers: new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        })
    });
    return await response.json();
}

async function getLeaderBoard () {
    const accessToken = localStorage.getItem("access_token");
    const response = await fetch("api/1.0/user/leaderboard", {
        method: "GET",
        headers: new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        })
    });
    return await response.json();
}
