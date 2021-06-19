const { pool } = require("./mysqlcon");

const joinRoom = async (roomID, email) => {
    const conn = await pool.getConnection();
    try {
        await conn.query("START TRANSACTION");
        let sql = "UPDATE lobby_table SET player = player + 1 WHERE room_id = ?";
        let insert = roomID;
        await conn.query(sql, insert);

        sql = "SELECT room_id, player, player_limit, watcher FROM lobby_table WHERE room_id = ?;";
        insert = roomID;
        const result = await conn.query(sql, [insert]);
        if (result[0][0].player > result[0][0].player_limit) { // 房間數超過上限時
            const err = new Error("too many people");
            throw (err);
        }
        sql = "INSERT INTO room (room_id, email, count) VALUES ?;";
        insert = [roomID, email, 1];
        await conn.query(sql, [[insert]]);
        await conn.query("COMMIT");
        return true;
    } catch (err) {
        console.log(`error in join room model ${err}`);
        await conn.query("ROLLBACK");
        return false;
    } finally {
        await conn.release();
    }
};

const joinRoomWithRobot = async (roomID, email) => {
    try {
        const conn = await pool.getConnection();
        const inserts = [roomID, email, 1];
        await conn.query("INSERT INTO room (room_id, email, count) VALUES ?;", [[inserts]]);
        await conn.release();
        return true;
    } catch (err) {
        console.log(`error in joinRoomwithRobot: ${err}`);
        return false;
    }
};

const leaveRoomWithRobot = async (email) => {
    const conn = await pool.getConnection();
    try {
        const result = await conn.query("SELECT room_id, count FROM room WHERE email = ?", email);
        if (result[0].length === 0) {
            console.log("not in any room");
            return (false);
        }
        if (result[0][0].count <= 1) {
            console.log(email + " 第一次斷線 不算離開房間");
            await conn.query("UPDATE room SET count = count + 1 WHERE email = ?", email);
            return (false);
        }
        await conn.query("DELETE FROM room WHERE email = ?;", email);
        console.log(email + " 第一次之後的斷線 算離開房間");
        return (true);
    } catch (err) {
        console.log(`error in leaveRoomwithRobot ${err}`);
        await conn.query("ROLLBACK");
    } finally {
        await conn.release();
    }
};

const leaveRoom = async (email) => {
    const conn = await pool.getConnection();
    try {
        const result = await conn.query("SELECT room_id, count FROM room WHERE email = ?", email);
        if (result[0].length === 0) {
            console.log("not in any room");
            return (false);
        }
        if (result[0][0].count <= 1) {
            console.log(email + " 第一次斷線 不算離開房間");
            await conn.query("UPDATE room SET count = count + 1 WHERE email = ?", email);
            return (false);
        }

        const roomID = result[0][0].room_id;
        await conn.query("START TRANSACTION");
        await conn.query("UPDATE lobby_table SET player = 0 WHERE room_id = ?", roomID);
        await conn.query("DELETE FROM room WHERE room_id = ?", roomID);

        await conn.query("COMMIT");
        console.log(email + " 第一次之後的斷線 算離開房間");
        return (roomID);
    } catch (err) {
        console.log(`error in leaveRoom: ${err}`);
        await conn.query("ROLLBACK");
    } finally {
        await conn.release();
    }
};

const watcherJoinRoom = async (roomID) => {
    const conn = await pool.getConnection();
    try {
        await conn.query("UPDATE lobby_table SET watcher = watcher + 1 WHERE room_id = ?", [roomID]); // wathcer 沒有上限
    } catch (err) {
        console.log(`error in watcherJoinRoom ${err}`);
    } finally {
        await conn.release();
    }
};

const watcherLeaveRoom = async (roomID) => {
    const conn = await pool.getConnection();
    try {

    } catch (err) {

    }
    const sql = "UPDATE lobby_table SET watcher = watcher - 1 WHERE room_id = ?";
    const insert = roomID;
    await pool.query(sql, insert);
};

const findGameID = async (email) => {
    try {
        const conn = await pool.getConnection();
        const result = await conn.query("SELECT game_id FROM room WHERE email = ?", [email]);
        await conn.release();
        if (result[0].length === 0) {
            return (false);
        }
        return (result[0][0].game_id);
    } catch (err) {
        console.log(`error in findGameID: ${err}`);
    }
};

const findRoom = async (email) => {
    const conn = await pool.getConnection();
    const sql = "SELECT room.room_id, room.email, user.name FROM room INNER JOIN user ON room.email = user.email WHERE room.email = ?;";
    const insert = [[email]];
    const result = await conn.query(sql, insert);
    await conn.release();
    if (result[0].length !== 0) {
        return result[0];
    } else {
        return false;
    }
};

const findRoomMember = async (roomID) => {
    const conn = await pool.getConnection();
    try {
        const result = await conn.query("SELECT user.name, room.email, user.photo_src FROM room INNER JOIN user ON room.email = user.email WHERE room_id = ?", roomID);
        return (result[0]);
    } catch (err) {
        console.log(`error in findRoomMember: ${findRoomMember}`);
    } finally {
        await conn.release();
    }
};

const getRoomLobbyInfo = async () => {
    const conn = await pool.getConnection();
    let sql = "SELECT room_id, player, player_limit, watcher FROM lobby_table;";
    const basicInfo = await conn.query(sql);
    sql = "SELECT user.name, room.room_id FROM room INNER JOIN user ON user.email = room.email;";
    const members = await conn.query(sql);

    const membersMap = new Map();
    if (members[0].length !== 0) {
        for (const i in members[0]) {
            if (!membersMap.has(members[0][i].room_id)) {
                membersMap.set(members[0][i].room_id, [members[0][i]]);
            } else {
                const arr = membersMap.get(members[0][i].room_id);
                arr.push(members[0][i]);
                membersMap.set(members[0][i].room_id, arr);
            }
        }
    }

    const obj = {};
    for (const [key, value] of membersMap) {
        obj[key] = value;
    }
    const list = [];
    for (const i of Object.keys(obj)) {
        list.push({ room_id: i, memberlist: obj[i] });
    }
    await conn.release();
    return { basicInfo: basicInfo[0], members: list };
};

const isPlayerReady = async (gameID) => {
    const conn = await pool.getConnection();
    try {
        await conn.query("START TRANSACTION");
        await conn.query("UPDATE game_setting_info SET ready_number = ready_number + 1 WHERE id = ?", gameID);
        const result = await conn.query("SELECT ready_number FROM game_setting_info WHERE id = ?", gameID);
        const readyNumber = result[0][0].ready_number; //
        console.log("===readyNumber===");
        console.log(readyNumber);
        if (readyNumber >= 2) { // 遊戲中只有兩人 2人遊戲
            await conn.query("ROLLBACK");
            return (true);
        }
        const err = "opponent is not ready";
        throw err;
    } catch (err) {
        console.log(`error in isPlayerReady: ${err}`);
        await conn.query("COMMIT");
        return (false);
    } finally {
        await conn.release();
    }
};

const isPlayedAgain = async (gameID) => {
    const conn = await pool.getConnection();
    try {
        await conn.query("START TRANSACTION");
        await conn.query("UPDATE game_setting_info SET again_number = again_number + 1 WHERE id = ?", gameID);
        const result = await conn.query("SELECT again_number FROM game_setting_info WHERE id = ?", gameID);
        const againNumber = result[0][0].again_number;
        if (againNumber >= 2) { // 遊戲中只有兩人 2人遊戲
            await conn.query("ROLLBACK");
            return (true);
        }
        const err = "opponent has not click again yet";
        throw err;
    } catch (err) {
        console.log(`error in isAgainNumberOK: ${err}}`);
        await conn.query("COMMIT");
        return (false);
    } finally {
        await conn.release();
    }
};

const bindGameIDinRoom = async (gameID, roomID) => {
    const conn = await pool.getConnection();
    try {
        conn.query("START TRANSACTION");
        await conn.query("UPDATE room SET game_id = ? WHERE room_id = ?;", [gameID, roomID]);
        conn.query("COMMIT");
    } catch (err) {
        console.log(`error in bindGameIDinRoom: ${err}`);
        conn.query("ROLLBACK");
    } finally {
        await conn.release();
    }
};

module.exports = {
    joinRoom,
    joinRoomWithRobot,
    leaveRoomWithRobot,
    leaveRoom,
    watcherJoinRoom,
    watcherLeaveRoom,
    findGameID,
    findRoom,
    findRoomMember,
    getRoomLobbyInfo,
    isPlayerReady,
    isPlayedAgain,
    bindGameIDinRoom
};
