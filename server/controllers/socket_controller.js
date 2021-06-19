require("dotenv").config();
const { STANDBYTIME, BREAKTIME, ROUNDTIME, ROBOTSTEP, FLIPINTERVAL } = process.env;
const { POINTS } = process.env;
const { TOKEN_SECRET } = process.env;
console.log({ STANDBYTIME, ROUNDTIME, POINTS });

const jwt = require("jsonwebtoken");
const Game = require("../models/game_model");
const Room = require("../models/room_model");
const { genMultiCardsNumber } = require("../models/card_model");
const { saveUserPhoto } = require("../models/user_model");
const { client, getCache, getCardNumberInCache } = require("../models/cache_model");

function socket (io) {
    io.use((socket, next) => { // socket middleware
        const { token } = socket.handshake.auth;
        if (token === null) {
            const err = new Error("尚未登入");
            next(err);
        } else {
            jwt.verify(token, TOKEN_SECRET, (err, result) => {
                if (err) {
                    const err = new Error("登入失敗");
                    next(err);
                } else {
                    socket.info = result;
                    next();
                }
            });
        }
    });

    io.on("connection", async (socket) => {
        console.log(`user: ${socket.info.email} connected`);
        updateOnlineNumbers(socket, io);
        getUserInfo(socket, io);
        updateRoomLobbyInfo(socket, io);
        matchRoom(socket, io);
        processInRoom(socket, io);
        clickCardInGame(socket, io);
        chat(socket, io);
        vedioChat(socket, io);
        choosePhoto(socket, io);
        socket.on("disconnect", async () => {
            disconnection(socket, io);
        });
    });
}

const updateOnlineNumbers = async function (socket, io) {
    const onlineNumbers = socket.adapter.sids.size;
    client.set("online_number", onlineNumbers);
    io.emit("update online number", onlineNumbers);
};

const getUserInfo = function (socket, io) {
    socket.on("get user info", () => {
        socket.emit("show my info", { name: socket.info.name, email: socket.info.email });
    });

    socket.on("get user room", () => {
        const { roomID } = socket.info;
        io.to(roomID).emit("show roomID", { roomID: socket.info.roomID });
    });
};

const updateRoomLobbyInfo = function (socket, io) {
    socket.on("update room info", async () => {
        const roomInfo = await Room.getRoomLobbyInfo();
        io.emit("room info", roomInfo);
    });
};

const matchRoom = function (socket, io) {
    socket.on("join room", async (info) => {
        try {
            const pass = await Room.joinRoom(info.roomID, socket.info.email); // 檢查是否有超過上限制人數
            if (pass) {
                console.log(`join room: ${info.roomID}`);
                const accessToken = jwt.sign({ provider: socket.info.provider, name: socket.info.name, email: socket.info.email, picture: socket.info.picture, roomID: info.roomID, status: 2 }, TOKEN_SECRET); // status: 2 play with opponent
                socket.emit("join success", { token: accessToken, roomID: info.roomID }); // 此token第一次帶有roomID
            } else {
                socket.emit("join failed", { error: "Forbidden" });
            }
        } catch (err) {
            console.log(`error in join room ${err}`);
            socket.emit("join failed", { error: "Forbidden" });
        }
        const roomInfo = await Room.getRoomLobbyInfo();
        io.emit("room info", roomInfo); // update rooms info on lobby
    });

    socket.on("in room", async () => { // 這邊可能出問題 有時候會來不及建立on
        try {
            // check 有沒有在房間內
            const user = socket.info; // token中應該已帶有roomID資訊
            const { roomID } = user;
            socket.join(roomID);
            console.log(`in the room: ${roomID}`);
            socket.emit("fill name", user.name);
            const members = await Room.findRoomMember(roomID);
            // console.log("members:");
            // console.log(members);
            let isInRoom = false;
            for (const i in members) {
                if (members[i].email === user.email) {
                    socket.emit("fill name", members[i].name);
                    socket.to(roomID).emit("fill opponent info", { name: members[i].name, picture: members[i].photo_src });
                    isInRoom = true;
                } else {
                    socket.emit("fill opponent info", { name: members[i].name, picture: members[i].photo_src });
                }
            }

            if (!isInRoom) {
                io.to(roomID).emit("opponent leave room", "oppo leave the room"); // 重新整理頁面後 自己不會在房間內 db已刪除紀錄 故把自己踢掉
                return;
            }

            if (members.length === 1) {
                console.log(`wait for opponen in ${roomID}`);
                socket.emit("wait for opponent", "wait for opponent");
            } else if (members.length === 2) { // 一個房間內只能有2人
                const rules = await Game.getRandomRules(); // 隨機產生遊戲規則
                const gameRules = { type: rules.type, number: rules.card_number, rounds: rules.rounds, targets: rules.targets };
                const gameID = await Game.saveGameRules(roomID, members, gameRules); // gameID 第一次出現
                await Room.bindGameIDinRoom(gameID, roomID); // save gameID with room 此時room是唯一的 能綁定gameID
                console.log(`play with oppo in room: ${roomID}`);
                io.to(roomID).emit("both of you in ready", { rules: gameRules, gameID: gameID }); // 讓雙方都能看到規則 and 讓前端能點選開始鈕 此處第一次出現gameID
            }
        } catch (err) {
            console.log(`error in in room: ${err}`);
            socket.emit("join failed", { error: "Forbidden" });
        }
    });

    socket.on("watcher join room", async (info) => { // 觀戰系統 未完工 待改
        try {
            console.log(`watch room: ${info.roomID}`);
            await Room.watcherJoinRoom(info.roomID);
            const accessToken = jwt.sign({ provider: socket.info.provider, name: socket.info.name, email: socket.info.email, picture: socket.info.picture, roomID: info.roomID, status: 3 }, TOKEN_SECRET); // status: 3 watcher
            socket.emit("watcher join room success", { token: accessToken, roomID: info.roomID }); // 此token第一次帶有roomID
        } catch (err) {
            console.log(`err when watch room: ${err}`);
            socket.emit("join failed", { error: "Forbidden" });
        }
        const roomInfo = await Room.getRoomLobbyInfo();
        io.emit("room info", roomInfo); // update rooms info on lobby
    });

    socket.on("watcher in room", async () => {
        // join room
        // 雙方姓名 怎麼色塊
        // 右下角規則說明
        // gameID 拿該room裡面最新的 如果還沒產生roomID怎麼辦？
        // 為了畫面同步 記錄畫面狀態 combine with gameID 等待畫面 配對成功畫面 ready倒數畫面 start倒數畫面 統計畫面
        // 為了翻牌同步

    });

    socket.on("join room with robot", async () => {
        // const roomID = "robot_" + socket.info.email;
        const roomID = `${socket.info.name}_robot_room`; // 要用name? 待確認 待改
        await Room.joinRoomWithRobot(roomID, socket.info.email); // 加入房間 和robot一起
        const accessToken = jwt.sign({ provider: socket.info.provider, name: socket.info.name, email: socket.info.email, picture: socket.info.picture, roomID: roomID, status: 1 }, TOKEN_SECRET); // status: 1 single mode
        socket.emit("join room with robot success", { token: accessToken, roomID: roomID }); // 此token第一次帶有roomID 單人模式
    });

    socket.on("in room with robot", async () => {
        const user = socket.info; // token中應該已帶有roomID資訊
        const { roomID } = user;
        socket.join(roomID); // 單人模式下 重新整理頁面後 隨即加入到roomID
        const isJoinRoom = await Room.findRoom(user.email); // 重新整理頁面 會回傳false mysql中的資料已被刪除
        if (isJoinRoom) {
            const members = [{ email: `${user.name}_robot` }, { email: user.email }];
            const rules = await Game.getRandomRules(); // 隨機產生遊戲規則
            const gameRules = { type: rules.type, number: rules.card_number, rounds: rules.rounds, targets: rules.targets };
            const gameID = await Game.saveGameRules(roomID, members, gameRules); // gameID 第一次出現
            await Room.bindGameIDinRoom(gameID, roomID); // save gameID with room 此時room是唯一的 能綁定gameID
            console.log(`play with robot in room: ${roomID}`);
            io.to(roomID).emit("ready in single mode", { rules: gameRules, gameID: gameID }); // 讓雙方都能看到規則 and 讓前端能點選開始鈕 此處第一次出現gameID
        } else {
            io.to(roomID).emit("robot leave room", "robot leave the room"); // 房號出問題
        }
    });
};

const processInRoom = async function (socket, io) {
    socket.on("I am ready", async (info) => { // 兩方都點選alert後才開始
        const user = socket.info;
        const { roomID } = socket.info;
        console.log(`${user.email} in room: ${roomID}`);

        const { rules, gameID } = info; // rules, gameID 從前端來
        console.log(`Start GameID: ${gameID}`);
        const isPlayerReady = await Room.isPlayerReady(gameID);
        if (isPlayerReady) { // 因為room內只能有2人 記得disable前端按鈕
            console.log("both player click start button");
            io.to(roomID).emit("go", "both player click start button");
            // 待改 此處可以await find room members 就當參數傳入gameLoop 因此不用每次回合結束都await一次 find members
            gameLoop(gameID, rules, roomID, socket, io); // 開始遊戲
        } else {
            console.log("wait for opponent to click start button");
            socket.emit("wait for opponent to click start button", "wait for opponent");
        }
    });

    socket.on("want to play again", async (info) => {
        const user = socket.info;
        const { roomID } = socket.info;
        const { gameID } = info;
        const isPlayedAgain = await Room.isPlayedAgain(gameID);
        if (isPlayedAgain) {
            console.log(`AGAIN: DEL ${info.gameID}`);
            client.del(info.gameID);// 初始化cache cardSetting by old gameID
            const rules = await Game.getRandomRules(); // 隨機產生遊戲規則
            const gameRules = { type: rules.type, number: rules.card_number, rounds: rules.rounds, targets: rules.targets };
            const gameID = await Game.saveGameRules(roomID, user.email, gameRules);
            await Room.bindGameIDinRoom(gameID, roomID); // room table中 也要更新gameID
            console.log(`New GameID: ${gameID}`);
            console.log("both player click again button");
            io.to(roomID).emit("again", { rules: gameRules, gameID: gameID });
        } else {
            console.log("wait for opponent to click again button");
            socket.emit("wait for opponent to click again button", "wait for opponent");
        }
    });

    socket.on("I am ready in single mode", async (info) => {
        const user = socket.info;
        const { roomID } = socket.info;
        const { rules, gameID, diffculty } = info; // rules, gameID 從前端來
        console.log(`${user.email} in room: ${roomID}`);
        console.log(`robot is ready too. Start game: ${gameID}`);
        console.log(`difficulty: ${diffculty}`);
        const members = [{ email: `robot_${gameID}`, name: `robot_${gameID}` }, { email: user.email, name: user.name }];
        gameLoopWithRobot(gameID, rules, roomID, members, diffculty, socket, io); // 開始遊戲 單人模式
    });

    socket.on("want to play again in single mode", async (info) => {
        const user = socket.info;
        const { roomID } = socket.info;
        console.log(`AGAIN: DEL ${info.gameID}`);
        client.del(info.gameID);// 初始化cache cardSetting by old gameID
        const rules = await Game.getRandomRules(); // 隨機產生遊戲規則
        const gameRules = { type: rules.type, number: rules.card_number, rounds: rules.rounds, targets: rules.targets };
        const gameID = await Game.saveGameRules(roomID, user.email, gameRules);
        await Room.bindGameIDinRoom(gameID, roomID); // room table中 也要更新gameID
        console.log(`New GameID: ${gameID}`);
        console.log("player want to play again with robot");
        io.to(roomID).emit("again", { rules: gameRules, gameID: gameID });
    });
};

const gameLoopWithRobot = async function (gameID, rules, roomID, members, diffculty, socket, io) {
    client.set(roomID, "working"); // 表示房間現在正在被使用
    for (let i = 0; i < rules.rounds; i++) {
        const matchNumberList = []; // 用來記錄配對成功的cardID
        client.set(`matchNumberList_${gameID}`, JSON.stringify({ list: matchNumberList })); // 每回合初始化

        const round = i + 1; // init
        const target = rules.targets[i];
        rules.state = "in ready";
        const cardsSetting = genMultiCardsNumber(target, rules.number); // 需要await 考量非同步的延遲 // 搭配cache使用 先存後取
        await Game.saveCardsSetting(gameID, roomID, cardsSetting, round); // 一回合存一次 如果有cache 或許不用await 待改
        const cardSettingInCache = {}; // 一份存cache
        cardSettingInCache[round] = cardsSetting;
        client.set(gameID, JSON.stringify(cardSettingInCache)); // 儲存卡片編號和對應數字

        const info = {
            round: round,
            target: target,
            rules: rules,
            cardsSetting: cardsSetting
        };
        if (round === 1) {
            io.to(roomID).emit("execute rules", info);
        } else {
            io.to(roomID).emit("next round execute rules", info);
        }

        const isContinueInReady = await countdownTimer("countdown in ready", io, roomID, parseInt(STANDBYTIME));
        if (!isContinueInReady) {
            return;
        }

        const startGameInfo = {
            msg: "start",
            round: round,
            target: target
        };
        io.to(roomID).emit("start game", startGameInfo);

        client.set(`switch_${gameID}`, 1); // 開啟robotClicker
        robotClicker(rules.number, gameID, roomID, members[0].email, members[1].email, target, round, 0, diffculty, io); // robot

        const isContinueInGame = await countdownTimer("countdown in game", io, roomID, parseInt(ROUNDTIME));
        if (!isContinueInGame) {
            return;
        }

        client.del(`switch_${gameID}`); // 關閉robotClicker
        // round結束
        for (const i in members) { // 每回合結束時 初始化cahce 去除上回合點擊過的卡片 包含機器人和玩家
            client.del(members[i].email);
        }

        if (round < rules.rounds) { // 遊戲結束 跳過break time
            const breakTime = parseInt(BREAKTIME);
            io.to(roomID).emit("break", { breakTime: breakTime, nextRound: round + 1 });

            await countdownTimer("countdown in break", io, roomID, parseInt(BREAKTIME));
        }
    }
    console.log("========game over========");
    const rounds = rules.rounds;
    const gameStat = await Game.statRecordSingle(gameID, roomID, rounds, members, 1);
    client.del(`matchNumberList_${gameID}`); // 在遊戲結束後 初始化_matchNumberList
    io.to(roomID).emit("game over", gameStat);
};

const gameLoop = async function (gameID, rules, room, socket, io) {
    client.set(room, "working"); // 表示房間現在正在被使用
    for (let i = 0; i < rules.rounds; i++) {
        const round = i + 1; // init
        const target = rules.targets[i];
        rules.state = "in ready";
        const cardsSetting = genMultiCardsNumber(target, rules.number); // 需要await 考量非同步的延遲 // 搭配cache使用 先存後取
        await Game.saveCardsSetting(gameID, room, cardsSetting, round); // 一回合存一次 如果有cache 或許不用await 待改
        const cardSettingInCache = {}; // 一份存cache
        cardSettingInCache[round] = cardsSetting;
        // const CardSettinginCache = JSON.stringify(cardSettingInCache);
        client.set(gameID, JSON.stringify(cardSettingInCache)); // 斷線時會初始化 注意 重新開始時應當要初始化

        const info = {
            round: round,
            target: target,
            rules: rules,
            cardsSetting: cardsSetting
        };
        if (round === 1) {
            io.to(room).emit("execute rules", info);
        } else {
            io.to(room).emit("next round execute rules", info);
        }

        const isContinueInReady = await countdownTimer("countdown in ready", io, room, parseInt(STANDBYTIME));
        if (!isContinueInReady) {
            return;
        }

        const startGameInfo = {
            msg: "start",
            round: round,
            target: target
        };
        io.to(room).emit("start game", startGameInfo);

        const isContinueInGame = await countdownTimer("countdown in game", io, room, parseInt(ROUNDTIME));
        if (!isContinueInGame) {
            return;
        }

        // round結束
        const members = await Room.findRoomMember(room); // 找出房內所有人 用於cache初始化 待改 不用每次回合結束後都await一次
        for (const i in members) { // 每回合結束時 初始化cahce 去除上回合點擊過的卡片
            client.del(members[i].email);
        }

        if (round < rules.rounds) { // 遊戲結束 跳過break time
            const breakTime = parseInt(BREAKTIME);
            io.to(room).emit("break", { breakTime: breakTime, nextRound: round + 1 });
            await countdownTimer("countdown in break", io, room, parseInt(BREAKTIME));
        }
    }
    console.log("========game over========");
    const rounds = rules.rounds;
    const gameStat = await Game.statRecord(gameID, room, rounds, 2);
    io.to(room).emit("game over", gameStat);
};

const clickCardInGame = function (socket, io) {
    // 等等將socketid用email代替 並配合sql可以得知房內email 以此可以初始化cache
    // 回合轉換後 應該初始化redis
    // 要設置點擊頻率 用redis記錄點擊時間 單人模式也要注意

    socket.on("click card", async (info) => { // race condition
        // select card value from cahce and check if they are in pair.
        try {
            const { gameID, source, cardID, round, target, time } = info; // for record time: countdown time // 此處token中已有roomID gameID資訊
            const user = socket.info;
            const room = user.roomID;
            const oppoInfo = { source: source, cardID: cardID };
            socket.to(room).emit("opposite click card", oppoInfo); // 對其他人 此處效能待改 送出卡片和數字分離了 如是用cache 就沒啥差 因為cache很快
            const number = await getCardNumberInCache(gameID, info.round, info.cardID); // use cache
            const cardFilledInfo = { cardID: cardID, number: number };
            io.to(room).emit("fill card number", cardFilledInfo);

            const utsOrder = new Date().getTime();
            const stepInfo = { gameID: gameID, room: room, round: round, source: source, email: user.email, cardID: parseInt(cardID), number: number, addPoints: 0, time: parseInt(time), utsOrder: utsOrder, status: socket.info.status };

            // use cache
            const selectedHis = JSON.parse(await getCache(user.email));
            if (selectedHis !== null) {
                const numberSelected = selectedHis.number;
                const doubleFlipHis = JSON.parse(await getCache(`clickLock_${user.email}`));
                let lastdoubleFlipTime;
                if (doubleFlipHis === null) { // first time in double flip
                    lastdoubleFlipTime = 0;
                } else {
                    lastdoubleFlipTime = doubleFlipHis.doubleFlipTime;
                }
                const ans = number * numberSelected;
                const matchInfo = { selecterID: socket.id, cardIDs: [selectedHis.cardID, info.cardID] }; // 點擊兩次後送出的資料封包

                // console.log(`utsOrder: ${utsOrder}`);
                // console.log(`lastdoubleFlipTime: ${parseInt(lastdoubleFlipTime)}`);
                // console.log(`(utsOrder - parseInt(lastdoubleFlipTime)): ${(utsOrder - parseInt(lastdoubleFlipTime))}`);
                if ((utsOrder - parseInt(lastdoubleFlipTime)) < parseInt(FLIPINTERVAL)) { // 為前端選取兩張後翻牌的時間差 點擊鎖
                    io.to(room).emit("card number not match", matchInfo);
                    client.del(user.email); // redis delete 翻兩張牌後初始化
                    return;
                }

                if (parseInt(target) === ans) {
                    io.to(room).emit("card number match", matchInfo);
                    io.to(room).emit("update points", { playerID: socket.id, point: parseInt(POINTS) }); // 讓前端計分 配對成功 +分
                    stepInfo.addPoints = parseInt(POINTS); // 得分
                } else {
                    io.to(room).emit("card number not match", matchInfo);
                }
                client.del(user.email); // redis delete 翻兩張牌後初始化
                client.set(`clickLock_${user.email}`, JSON.stringify({ doubleFlipTime: utsOrder })); // for click lock
            } else {
                client.set(user.email, JSON.stringify({ cardID: cardID, number: number, gameID: gameID, clickTime: utsOrder })); // gameID for cache init after each round over
            }
            await Game.recordEveryStep(stepInfo); // 可否改為遊戲結束後一次insert? 待改
        } catch (err) {
            console.log(`error in click card ${err}`);
            socket.emit("join failed", { err: "join failed" });
        }
    });

    socket.on("click card in single mode", async (info) => {
        const { gameID, source, cardID, round, target, time } = info; // for record time: countdown time // 此處token中已有roomID gameID資訊
        const user = socket.info;
        const room = user.roomID;
        const oppoInfo = { source: source, cardID: cardID };
        socket.to(room).emit("opposite click card", oppoInfo); // 對其他人 此處效能待改 送出卡片和數字分離了 如是用cache 就沒啥差 因為cache很快

        const number = await getCardNumberInCache(gameID, info.round, info.cardID); // use cache
        const cardFilledInfo = { cardID: cardID, number: number };
        io.to(room).emit("fill card number", cardFilledInfo);

        const utsOrder = new Date().getTime();
        const stepInfo = { gameID: gameID, room: room, round: round, source: source, email: user.email, cardID: parseInt(cardID), number: number, addPoints: 0, time: parseInt(time), utsOrder: utsOrder, status: socket.info.status };

        // use cache
        const selectedHis = JSON.parse(await getCache(user.email));
        if (selectedHis !== null) {
            const numberSelected = selectedHis.number[0];
            const doubleFlipHis = JSON.parse(await getCache(`clickLock_${user.email}`));
            let lastdoubleFlipTime;
            if (doubleFlipHis === null) { // first time in double flip
                lastdoubleFlipTime = 0;
            } else {
                lastdoubleFlipTime = doubleFlipHis.doubleFlipTime;
            }
            const ans = number * numberSelected;
            const matchInfo = { selecterID: socket.id, cardIDs: [selectedHis.cardIDs[0], info.cardID] }; // 點擊兩次後送出的資料封包

            // console.log(`utsOrder: ${utsOrder}`);
            // console.log(`lastdoubleFlipTime: ${parseInt(lastdoubleFlipTime)}`);
            // console.log(`(utsOrder - parseInt(lastdoubleFlipTime)): ${(utsOrder - parseInt(lastdoubleFlipTime))}`);
            if ((utsOrder - parseInt(lastdoubleFlipTime)) < parseInt(FLIPINTERVAL)) { // 為前端選取兩張後翻牌的時間差 點擊鎖
                io.to(room).emit("card number not match", matchInfo);
                client.del(user.email); // redis delete 翻兩張牌後初始化
                return;
            }

            if (parseInt(target) === ans) {
                // 記錄配對成功的卡片
                const matchNumber = JSON.parse(await getCache(`matchNumberList_${gameID}`));
                const matchNumberList = matchNumber.list.map((ele) => {
                    return ele;
                });
                for (const i in matchInfo.cardIDs) {
                    matchNumberList.push(matchInfo.cardIDs[i]);
                }
                client.set(`matchNumberList_${gameID}`, JSON.stringify({ list: matchNumberList }));

                io.to(room).emit("card number match", matchInfo);
                io.to(room).emit("update points", { playerID: socket.id, point: parseInt(POINTS) }); // 讓前端計分 配對成功 +10分
                stepInfo.addPoints = parseInt(POINTS); // 得分
                client.del(user.email); // redis delete 如果有配對成功 可以立刻刪除
            } else {
                io.to(room).emit("card number not match", matchInfo);
                client.set(user.email, JSON.stringify({ cardIDs: [selectedHis.cardIDs[0], info.cardID], number: number, gameID: gameID, clickTime: utsOrder })); // 沒有配對成功 點擊鎖 後刪除
                await delay(parseInt(FLIPINTERVAL)); // 點擊鎖 後刪除
                client.del(user.email); // redis delete 應該配合點擊鎖後才能刪除 配合前端規則
            }
            client.set(`clickLock_${user.email}`, JSON.stringify({ doubleFlipTime: utsOrder })); // for click lock
        } else {
            client.set(user.email, JSON.stringify({ cardIDs: [cardID], number: [number], gameID: gameID, clickTime: utsOrder })); // gameID for cache init after each round over
        }
        await Game.recordEveryStep(stepInfo); // 可否改為遊戲結束後一次insert? 待改
    });
};

const robotClicker = async function (cardNumber, gameID, roomID, robotName, player, target, round, time, diffculty, io) { // 機器人
    let cardClickNumber = 0;
    // const isCardAllMatch = false;
    while (true) {
        const switchStatus = await getCache(`switch_${gameID}`);
        if (switchStatus === null) { // 關閉robotClicker
            console.log("robotClicker dead");
            return; // 關閉robotClicker
        }

        let playerHisCardID = null; // 玩家點擊過的卡片
        const playerClickedCard = JSON.parse(await getCache(player)); // 玩家點擊過的卡片
        if (playerClickedCard !== null) {
            playerHisCardID = playerClickedCard.cardIDs.map((ele) => {
                return (parseInt(ele));
            }); // arr
            // console.log("======================playerHisCardIDs: " + playerHisCardID);
        }

        let robotHisCardID = null; // robot點擊過的卡片
        const robotHis = JSON.parse(await getCache(robotName));
        if (robotHis !== null) {
            robotHisCardID = robotHis.cardIDs.map((ele) => {
                return (parseInt(ele));
            }); // arr
            // console.log("======================robotHisCardID: " + robotHisCardID);
        }

        const matchNumber = JSON.parse(await getCache(`matchNumberList_${gameID}`)); // 已經配對成功的卡片
        const matchNumberList = matchNumber.list.map((ele) => {
            return parseInt(ele);
        });

        // let cardID;
        // let isCardIDAllowed;
        // while (true) {
        //     const allCardID = [];
        //     for (let i = 0; i < cardNumber; i++) {
        //         allCardID.push(i);
        //     }

        //     let playerHisCardIDArr = [];
        //     let robotHisCardIDArr = [];
        //     if (playerHisCardID !== null) {
        //         playerHisCardIDArr = playerHisCardID;
        //     }

        //     if (robotHisCardID !== null) {
        //         robotHisCardIDArr = robotHisCardID;
        //     }

        //     const unionHis = playerHisCardIDArr.concat(robotHisCardIDArr.filter((e) => {
        //         return playerHisCardIDArr.indexOf(e) === -1;
        //     })); // union

        //     const union = matchNumberList.concat(unionHis.filter((e) => {
        //         return matchNumberList.indexOf(e) === -1;
        //     })); // union

        //     const allowNumberArr = allCardID.filter((e) => {
        //         return union.indexOf(e) === -1;
        //     }).concat(union.filter((f) => {
        //         return allCardID.indexOf(f) === -1;
        //     })); // 可以選擇的數字(arr) 差集

        //     const cardIDArr = randomNumberForArrayIndex(cardNumber, 1); // return array e.g. [3] 隨機選卡
        //     isCardIDAllowed = !playerHisCardIDArr.includes(cardIDArr[0]) && !robotHisCardIDArr.includes(cardIDArr[0]) && !matchNumberList.includes(cardIDArr[0]);

        //     // console.log(`cardID: ${cardIDArr[0]}`);
        //     // console.log("matchNumberList: ");
        //     // console.log(matchNumberList);
        //     // console.log("allowNumberArr: ");
        //     // console.log(allowNumberArr);
        //     // console.log(`!playerHisCardIDArr.includes(cardIDArr[0]): ${playerHisCardIDArr.includes(cardIDArr[0])}`);
        //     // console.log(`!robotHisCardIDArr.includes(cardIDArr[0]): ${!robotHisCardIDArr.includes(cardIDArr[0])}`);
        //     // console.log(`matchNumberList.includes[cardIDArr[0]]: ${matchNumberList.includes(cardIDArr[0])}`);
        //     // console.log(`isCardIDAllowed: ${isCardIDAllowed}`);

        //     // console.log(`cardNumber: ${cardNumber}`);
        //     // console.log(`matchNumberList.length: ${matchNumberList.length}`);
        //     // console.log(`allowNumberArr.length: ${allowNumberArr.length}`);

        //     if (allowNumberArr.length === 0) {
        //         console.log("======================All card match======================");
        //         // isCardAllMatch = true;
        //         return;
        //     }

        //     if (isCardIDAllowed) {
        //         cardID = cardIDArr[0];
        //         // console.log("======================robot choose CardID: " + cardID);
        //         break;
        //     }
        // }
        const allCardID = [];
        for (let i = 0; i < cardNumber; i++) {
            allCardID.push(i);
        }

        let playerHisCardIDArr = [];
        let robotHisCardIDArr = [];
        if (playerHisCardID !== null) {
            playerHisCardIDArr = playerHisCardID;
        }

        if (robotHisCardID !== null) {
            robotHisCardIDArr = robotHisCardID;
        }

        const unionHis = playerHisCardIDArr.concat(robotHisCardIDArr.filter((e) => {
            return playerHisCardIDArr.indexOf(e) === -1;
        })); // union

        const union = matchNumberList.concat(unionHis.filter((e) => {
            return matchNumberList.indexOf(e) === -1;
        })); // union

        const allowNumberArr = allCardID.filter((e) => {
            return union.indexOf(e) === -1;
        }).concat(union.filter((f) => {
            return allCardID.indexOf(f) === -1;
        })); // 可以選擇的數字(arr) 差集

        if (allowNumberArr.length === 0) {
            console.log("======================All card match======================");
            return;
        }

        const [cardIDSelected] = randomNumberForArrayIndex(allowNumberArr.length, 1); // 隨機選卡
        let cardID = allowNumberArr[cardIDSelected];

        console.log(`robotHisCardID: ${robotHisCardID}`);
        console.log(`diffculty: ${diffculty}`);
        let isHit;
        if (diffculty === "easy") { // 難度選擇
            isHit = Math.floor(Math.random() * 10 + 1) % 10 === 0; // 調整命中率 10%
        } else if (diffculty === "middle") {
            isHit = Math.floor(Math.random() * 5 + 1) % 3 === 0; // 調整命中率 33%
        } else if (diffculty === "hard") {
            isHit = Math.floor(Math.random() * 2 + 1) % 2 === 0; // 調整命中率 50%
        } else {
            isHit = true; // 調整命中率 100%
        }
        if (robotHisCardID && isHit) { // 提升命中率
            const numberHis = await getCardNumberInCache(gameID, round, robotHisCardID);
            const targetAns = parseInt(target);
            for (const i in allowNumberArr) {
                const numberSelected = await getCardNumberInCache(gameID, round, allowNumberArr[i]);
                if (targetAns === numberHis * numberSelected) {
                    cardID = allowNumberArr[i]; // 成對率１００%
                    break;
                }
            }
        }

        const number = await getCardNumberInCache(gameID, round, cardID);
        console.log(`Robot in room: ${roomID} click: CardID ${cardID} Number ${number}`);
        const oppoInfo = { source: "robot", cardID: cardID };
        io.to(roomID).emit("opposite click card", oppoInfo);
        const cardFilledInfo = { cardID: cardID, number: number };
        io.to(roomID).emit("fill card number", cardFilledInfo);

        const utsOrder = new Date().getTime();
        const stepInfo = { gameID: gameID, room: roomID, round: round, source: `robot_${gameID}`, email: `robot_${gameID}`, cardID: parseInt(cardID), number: number, addPoints: 0, time: parseInt(time), utsOrder: utsOrder, status: 1 };

        const selectedHis = JSON.parse(await getCache(robotName)); // robot + _gameID
        if (selectedHis !== null) {
            const numberSelected = selectedHis.number;
            const ans = number * numberSelected;
            const matchInfo = { selecterID: "robot", cardIDs: [selectedHis.cardIDs, cardID] };
            if (parseInt(target) === ans) {
                // 記錄配對成功的卡片
                const matchNumber = JSON.parse(await getCache(`matchNumberList_${gameID}`));
                const matchNumberList = matchNumber.list.map((ele) => {
                    return ele;
                });
                for (const i in matchInfo.cardIDs) {
                    matchNumberList.push(matchInfo.cardIDs[i]);
                }
                client.set(`matchNumberList_${gameID}`, JSON.stringify({ list: matchNumberList }));

                io.to(roomID).emit("card number match", matchInfo);
                io.to(roomID).emit("update points", { playerID: robotName, point: parseInt(POINTS) }); // 讓前端計分
                stepInfo.addPoints = parseInt(POINTS); // 得分
                client.del(robotName); // redis delete 配對成功
            } else {
                io.to(roomID).emit("card number not match", matchInfo);
                client.set(robotName, JSON.stringify({ cardIDs: [selectedHis.cardIDs, cardID], number: number, gameID: gameID })); // 沒有配對成功 點擊鎖 後刪除
                await delay(parseInt(FLIPINTERVAL));
                client.del(robotName); // redis delete 配對成功
            }
        } else {
            client.set(robotName, JSON.stringify({ cardIDs: [cardID], number: number, gameID: gameID })); // gameID for cache init after each round over 第一次點擊
        }
        await Game.recordEveryStep(stepInfo); // 可否改為遊戲結束後一次insert? 機器人的記錄

        cardClickNumber += 1; // robotClicker點擊次數
        if (cardClickNumber === 2) {
            await delay(parseInt(FLIPINTERVAL)); // double flip 後 才能選下一張牌
            cardClickNumber = 0;
        } else {
            await delay(ROBOTSTEP);
        }
    }
};

const chat = function (socket, io) {
    socket.on("chat message", (msg) => {
        console.log(`FROM ${socket.info.email} | message ${msg}`);
        // const room = [];
        // for (const i of io.sockets.adapter.sids.get(socket.id)) { // room[1]: room
        //     room.push(i);
        // }
        const newMsg = socket.info.name + msg;
        io.to(socket.info.roomID).emit("chat message", newMsg);
    });

    socket.on("chat lobby message", (msg) => {
        console.log(`FROM ${socket.info.email} | message ${msg}`);
        const newMsg = socket.info.name + msg;
        console.log(newMsg);
        io.emit("chat in lobby message", newMsg);
    });
};

const vedioChat = function (socket, io) { // 已經在房內 已經join room
    socket.on("want to video chat", (msg) => {
        const { roomID } = socket.info;
        socket.to(roomID).emit("oppo want to video chat", msg);
    });

    socket.on("vedio chat comfirmed", (msg) => {
        const { roomID } = socket.info;
        socket.to(roomID).emit("oppo comfirmed vedio chat", msg);
    });

    socket.on("vedio chat denide", (msg) => {
        const { roomID } = socket.info;
        socket.to(roomID).emit("oppo denied vedio chat", msg);
    });

    socket.on("close video chat", (msg) => {
        const { roomID, picture } = socket.info;
        socket.to(roomID).emit("oppo close video chat", picture);
    });

    socket.on("offer", (offer) => {
        const { roomID } = socket.info;
        socket.to(roomID).emit("offer", offer);
    });

    socket.on("answer", (answer) => {
        const { roomID } = socket.info;
        socket.to(roomID).emit("answer", answer);
    });

    socket.on("icecandidate", (event) => {
        const { roomID } = socket.info;
        socket.to(roomID).emit("icecandidate", event);
    });
};

const choosePhoto = function (socket, io) {
    socket.on("select user photo", async (src) => {
        const user = socket.info;
        await saveUserPhoto(user.email, src);
        const accessToken = jwt.sign({
            provider: user.provider,
            name: user.name,
            email: user.email,
            picture: src
        }, TOKEN_SECRET);
        socket.emit("update user photo", { src: src, token: accessToken });
    });
};

const disconnection = async (socket, io) => {
    try {
        const user = socket.info;
        console.log(`user: ${user.email} disconnected`);
        client.del(user.email); // 中途離開時初始化cache 該使用者點擊過的卡片
        client.del(`clickLock_${user.email}`); // 初始化點擊鎖
        const gameID = await Room.findGameID(user.email);
        if (gameID) {
            console.log(`gameID: ${gameID} is over`);
            client.del(user.roomID); // 中途離開時 或遊戲結束時 初始化cache 該房間的倒數計器 和 memberList
            client.del(gameID); // 斷線時 初始化cache 該gameID的cardSstting
            client.del(`switch_${gameID}`); // 單人模式中有使用 停止robot運作 關機
            client.del(`matchNumberList_${gameID}`); // 單人模式中有使用 初始化已配對卡片清單
            client.del(`robot_${gameID}`); // 單人模式中使用 玩家中途離開時初始化cache 該遊戲中機器人點擊過的卡片
        }

        if (user.status === 1) {
            const state = await Room.leaveRoomWithRobot(user.email);
            if (state) {
                console.log("leave room: " + user.roomID);
                io.to(user.roomID).emit("robot leave room", "robot leave the room");
            }
        } else if (user.status === 2) {
            const roomID = await Room.leaveRoom(user.email);
            if (roomID) {
                socket.to(roomID).emit("opponent leave room", "oppo leave the room");
            }
        }
        const roomInfo = await Room.getRoomLobbyInfo();
        io.emit("room info", roomInfo); // 更新大廳資訊
    } catch (err) {
        console.log(`disconnect err: ${err}`);
    }
};

const randomNumberForArrayIndex = (range, count) => { // 0
    const randomNumberArr = [];
    for (let i = 0; i < count; i++) {
        const randomNumber = Math.floor(Math.random() * range);
        randomNumberArr.push(randomNumber);
    }
    return randomNumberArr;
};

const randomNumber = (range, count) => {
    return Math.floor(Math.random() * range + 1);
};

async function countdownTimer (event, io, roomID, inputTime) {
    let time = inputTime;
    while (time >= 0) {
        io.to(roomID).emit(event, time);
        await delay(1000);
        time--;
        const status = await getCache(roomID); // 倒數計時器終止 如果有人中離
        if (status !== "working") {
            return false; // 終止
        }
    }
    return true;
};

function delay (delayTime) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve("delay"); }, delayTime);
    });
};

module.exports = {
    socket
};
