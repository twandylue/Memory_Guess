import { updateLobby } from "./update_lobby.js";

const token = localStorage.getItem("access_token");
localStorage.removeItem("oppoPhoto");

const socket = io({
    auth: { token: token },
    reconnect: true
});

socket.on("connect", () => {
    socket.on("connect_error", (err) => {
        if (err.message) {
            Swal.fire({
                icon: "warning",
                title: "你斷線囉",
                text: err.message,
                confirmButtonText: "確認"
            }).then(() => {
                main();
                socket.emit("update room info", "need to update room info");
            });
        }
    });

    socket.on("update online number", (numbers) => {
        document.querySelector("#online-members").innerHTML = `在線人數: ${numbers} 人`;
    });

    socket.on("room info", (roomInfo) => {
        updateLobby(roomInfo);
    });

    socket.on("join success", (info) => {
        localStorage.setItem("access_token", info.token);
        window.location.href = `/match.html?roomID=${info.roomID}`;
    });

    socket.on("join room with robot success", info => {
        localStorage.setItem("access_token", info.token);
        window.location.href = `/match_robot.html?roomID=${info.roomID}`;
    });

    socket.on("join failed", () => {
        Swal.fire({
            icon: "error",
            title: "加入房間失敗",
            text: "請重新加入房間!",
            confirmButtonText: "好的"
        });
    });
});

const joinButtons = document.querySelectorAll(".join");
joinButtons.forEach(joinButton => joinButton.addEventListener("click", joinRoom));
async function joinRoom () {
    const result = await checkLogin();
    if (result) {
        const button = this;
        let roomID = button.parentElement.parentElement.parentElement.id;
        roomID = roomID.split("_")[1];
        const info = { roomID: roomID };
        socket.emit("join room", info);
    }
}

const singleButton = document.querySelector("#single");
singleButton.addEventListener("click", async () => {
    const result = await checkLogin();
    if (result) {
        Swal.fire({
            icon: "question",
            title: "單人模式",
            text: "要跟機器人一起遊玩嗎？",
            showCancelButton: true,
            confirmButtonText: "確定",
            cancelButtonText: "取消"
        }).then((result) => {
            if (result.isConfirmed) {
                socket.emit("join room with robot", "want to play with robot");
            }
        });
    }
});

const profile = document.querySelector("#user_profile");
profile.addEventListener("click", async () => {
    const result = await checkLogin();
    if (result) {
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
    }
});

const logo = document.querySelector("#logo-container-header");
logo.addEventListener("click", () => {
    window.location.href = "/";
});

async function main () {
    const userInfo = await checkLogin();
    if (userInfo) {
        document.querySelector("#user_photo").src = userInfo.data.picture;
        document.querySelector("#user_name").innerHTML = `Hi! ${userInfo.data.name}`;
    }
    const lobbyInfo = await getLobbyInfo();
    updateLobby(lobbyInfo);
}
main();

async function checkLogin () {
    const accessToken = localStorage.getItem("access_token");
    const response = await fetch("api/1.0/user/profile", {
        method: "GET",
        headers: new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        })
    });
    if (response.status === 200) {
        return await response.json();
    }
    if (response.status !== 200) {
        document.querySelector("#user_photo").src = "https://memoryguess.s3.ap-northeast-1.amazonaws.com/enter.png";
        document.querySelector("#user_name").innerHTML = "SIGN IN";
        Swal.fire({
            icon: "error",
            title: "請先登入",
            text: "還沒登入不給玩喔!",
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: "註冊",
            denyButtonText: "登入",
            cancelButtonText: "離開"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const formValues = await Swal.fire({
                    title: "註冊表單",
                    html: `<input type="text" id="name" class="swal2-input" placeholder="請輸入代號">
                    <input type="text" id="email" class="swal2-input" placeholder="請輸入email">
                    <input type="password" id="password" class="swal2-input" placeholder="請輸入密碼">`,
                    confirmButtonText: "註冊 Sign up",
                    focusConfirm: false,
                    preConfirm: () => {
                        const name = Swal.getPopup().querySelector("#name").value;
                        const email = Swal.getPopup().querySelector("#email").value;
                        const password = Swal.getPopup().querySelector("#password").value;
                        if (!name || !email || !password) {
                            Swal.showValidationMessage("請輸入代號/信箱/密碼");
                            return false;
                        }
                        return { name: name, email: email, password: password };
                    }
                });

                if (formValues) {
                    const data = JSON.stringify(formValues.value);
                    const response = await fetch("api/1.0/user/signup", {
                        body: data,
                        method: "POST",
                        headers: new Headers({
                            "Content-Type": "application/json"
                        })
                    });
                    if (response.status === 400) {
                        Swal.fire({
                            icon: "error",
                            title: "註冊資料格式不符",
                            text: "請重新註冊",
                            confirmButtonText: "好的"
                        }).then(() => {
                            main();
                        });
                        return false;
                    } else if (response.status === 403) {
                        const msg = await response.json();
                        Swal.fire({
                            icon: "error",
                            title: msg.error,
                            text: "請重新註冊",
                            confirmButtonText: "好的"
                        }).then(() => {
                            main();
                        });
                        return false;
                    } else if (response.status === 200) {
                        Swal.fire({
                            icon: "success",
                            title: "註冊成功！",
                            text: "可以開始玩囉!",
                            confirmButtonText: "好的"
                        }).then(async () => {
                            const info = await response.json();
                            localStorage.setItem("access_token", info.data.access_token);
                            socket.emit("update room info", "need to update room info");
                            window.location.href = "/";
                        });
                    }
                }
            }

            if (result.isDenied) {
                const formValues = await Swal.fire({
                    title: "登入",
                    html: `<input type="text" id="email" class="swal2-input" placeholder="請輸入email">
                    <input type="password" id="password" class="swal2-input" placeholder="請輸入密碼">`,
                    confirmButtonText: "登入 Sign in",
                    focusConfirm: false,
                    preConfirm: () => {
                        const email = Swal.getPopup().querySelector("#email").value;
                        const password = Swal.getPopup().querySelector("#password").value;
                        if (!email || !password) {
                            Swal.showValidationMessage("請輸入信箱/密碼");
                            return false;
                        }
                        return { email: email, password: password };
                    }
                });

                if (formValues) {
                    const data = JSON.stringify(formValues.value);
                    const response = await fetch("api/1.0/user/signin", {
                        body: data,
                        method: "POST",
                        headers: new Headers({
                            "Content-Type": "application/json"
                        })
                    });

                    if (response.status !== 200) {
                        Swal.fire({
                            icon: "error",
                            title: "Eamil或密碼錯誤！",
                            text: "回想一下再試試看吧!",
                            confirmButtonText: "好的"
                        }).then(() => {
                            main();
                        });
                        return false;
                    }

                    Swal.fire({
                        icon: "success",
                        title: "登入成功！",
                        text: "可以開始玩囉!",
                        confirmButtonText: "好的"
                    }).then(async () => {
                        const info = await response.json();
                        localStorage.setItem("access_token", info.data.access_token);
                        socket.emit("update room info", "need to update room info");
                        window.location.href = "/";
                    });
                }
            }
        });
    }
}

async function getLobbyInfo () {
    const accessToken = localStorage.getItem("access_token");
    const response = await fetch("api/1.0/lobbyinfo", {
        method: "GET",
        headers: new Headers({
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        })
    });
    return await response.json();
}

// for chat room in lobby
const inputEnter = document.querySelector("#sendmsg #input");
const sendMsg = document.querySelector("#send");
const chatroom = document.querySelector("#messages");

sendMsg.addEventListener("click", async () => {
    const result = await checkLogin();
    if (result) {
        if (inputEnter.value) {
            socket.emit("chat lobby message", ": " + inputEnter.value);
            inputEnter.value = "";
        }
    }
});

inputEnter.addEventListener("keyup", (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        sendMsg.click();
    }
});

socket.on("chat in lobby message", (msg) => {
    const item = document.createElement("li");
    item.innerHTML = msg;
    chatroom.appendChild(item);
    chatroom.scrollTo(0, chatroom.scrollHeight);
});
