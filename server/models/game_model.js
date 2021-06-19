const { pool } = require("../models/mysqlcon");
const Room = require("./room_model");

const saveGameRules = async (room, members, rules) => {
    const conn = await pool.getConnection();
    const data = [room, rules.type, rules.number, rules.rounds];
    for (let i = 0; i < 3; i++) {
        data.push(rules.targets[i]);
    }
    data.push(0, 0); // init ready_number and again_number
    data.push(members[0].email, members[1].email); // players in the game
    const sql = "INSERT INTO game_setting_info (room_id, type, number, rounds, targets_1, targets_2, targets_3, ready_number, again_number, player_1, player_2) VALUES ?";

    const result = await conn.query(sql, [[data]]);
    await conn.release();
    return (result[0].insertId);
};

const getGameRules = async (socket, io) => {
    const room = [];
    for (const i of io.sockets.adapter.sids.get(socket.id)) { // room[1]: room
        room.push(i);
    }

    const sql = "SELECT * FROM game_setting_info WHERE room_id = ?";
    const result = await pool.query(sql, room[1]);
    const rawTargets = [result[0][0].targets_1, result[0][0].targets_2, result[0][0].targets_3];
    const targets = [];
    for (const i in rawTargets) {
        if (rawTargets[i] !== null) {
            targets.push(rawTargets[i]);
        }
    }

    const rules = {
        type: result[0][0].type,
        number: result[0][0].number,
        rounds: result[0][0].rounds,
        targets: targets
    };

    return (rules);
};

const getRandomRules = async () => {
    const conn = await pool.getConnection();
    const result = await conn.query("SELECT COUNT(*) FROM game_rules_random;");
    const totalRows = result[0][0]["COUNT(*)"];
    const randomNumber = Math.floor(Math.random() * totalRows);
    const row = await conn.query("SELECT * FROM game_rules_random WHERE id = ?", randomNumber);
    const rule = {
        type: row[0][0].type,
        card_number: row[0][0].card_number,
        rounds: row[0][0].rounds,
        targets: [row[0][0].target_1, row[0][0].target_2, row[0][0].target_3]
    };
    return rule;
};

const saveCardsSetting = async (gameID, room, cardsSetting, round) => {
    const cardIds = Object.keys(cardsSetting);
    const data = [];
    for (const id in cardIds) {
        data.push([gameID, room, round, id, cardsSetting[id]]);
    }
    const conn = await pool.getConnection();
    const sql = "INSERT INTO cards_setting_info (game_id, room_id, round, card_ID, number) VALUES ?";
    await conn.query(sql, [data]);
    await conn.release();
};

const recordEveryStep = async (info) => {
    const conn = await pool.getConnection();
    try {
        const sql = "INSERT INTO game_history (game_id, room_id, round, player_ID, player_email, card_ID, number, points, time, uts_order, status) VALUES ?";
        const inserts = [info.gameID, info.room, info.round, info.source, info.email, info.cardID, info.number, info.addPoints, info.time, info.utsOrder, info.status];
        await conn.query(sql, [[inserts]]);
    } catch (err) {
        console.log(`error in recordEveryStep: ${err}`);
    } finally {
        await conn.release();
    }
};

const statRecord = async (gameID, roomID, rounds, status) => {
    const conn = await pool.getConnection();

    const roomMembers = await Room.findRoomMember(roomID); // 前方已可知道roomber 此處不需要再await一次 待改
    const members = [];
    for (const i in roomMembers) {
        members.push(roomMembers[i].email);
    };

    const names = await conn.query("SELECT email, name FROM user WHERE email in ?", [[members]]);
    const emailtoNameObj = {};
    for (const i in names[0]) {
        emailtoNameObj[names[0][i].email] = names[0][i].name;
    }

    const stat = [];
    const winner = [];
    for (const i in members) { // gameID and player_email
        const resultTest = await conn.query("SELECT player_ID, player_email, round, SUM(points), COUNT(*) FROM game_history WHERE game_id = ? AND player_email = ? GROUP BY round;", [gameID, members[i]]);
        if (resultTest[0].length !== 0) { // 有點擊記錄
            let totalPoints = 0;
            let totalClick = 0;
            const roundsPoints = [];
            for (let i = 0; i < rounds; i++) {
                if (resultTest[0][i]) {
                    roundsPoints.push(parseInt(resultTest[0][i]["SUM(points)"]));
                    totalPoints += parseInt(resultTest[0][i]["SUM(points)"]);
                    totalClick += parseInt(resultTest[0][i]["COUNT(*)"]);
                    continue;
                }
                roundsPoints.push(0);
            }

            // 統計命中率 hit rate
            let hitRate;
            if (totalClick !== 0) {
                hitRate = (totalPoints * 2 / 10) / totalClick;
            } else {
                hitRate = 0;
            }

            stat.push({ player_email: members[i], hitRate: hitRate, roundsPoints: roundsPoints, totalPoints: totalPoints });
        } else {
            const hitRate = 0;
            const roundsPoints = [];
            const totalPoints = 0;
            for (let i = 0; i < rounds; i++) {
                roundsPoints.push(0);
            }
            stat.push({ player_email: members[i], hitRate: hitRate, roundsPoints: roundsPoints, totalPoints: totalPoints });
        }
    }
    console.log(stat);
    if (stat[0].totalPoints > stat[1].totalPoints) {
        winner.push({ email: stat[0].player_email, name: emailtoNameObj[stat[0].player_email] });
    } else if (stat[0].totalPoints < stat[1].totalPoints) {
        winner.push({ email: stat[1].player_email, name: emailtoNameObj[stat[1].player_email] });
    } else {
        winner.push({ email: "Tie", name: "Tie" });
    }

    const inserts = [];
    for (const i in stat) {
        inserts.push([gameID, stat[i].player_email, stat[i].roundsPoints[0], stat[i].roundsPoints[1], stat[i].roundsPoints[2], stat[i].totalPoints, stat[i].hitRate, winner[0].email, status]);
    }
    await conn.query("INSERT INTO game_results (game_id, player_email, round1_points, round2_points, round3_points, total_points, hit_rate, winner_email, status) VALUES ?", [inserts]);
    await conn.release();

    console.log("record summry: ");
    console.log({ results: stat, winner: winner });
    return ({ results: stat, winner: winner });
};

const statRecordSingle = async (gameID, roomID, rounds, members, status) => {
    const conn = await pool.getConnection();
    try {
        const emailtoNameObj = {};
        for (const i in members) {
            emailtoNameObj[members[i].email] = members[i].name;
        }

        const stat = [];
        const winner = [];
        for (const i in members) { // gameID and player_email
            const resultTest = await conn.query("SELECT player_ID, player_email, round, SUM(points), COUNT(*) FROM game_history WHERE game_id = ? AND player_email = ? GROUP BY round;", [gameID, members[i].email]);
            if (resultTest[0].length !== 0) { // 有點擊記錄
                let totalPoints = 0;
                let totalClick = 0;
                const roundsPoints = [];
                for (let i = 0; i < rounds; i++) {
                    if (resultTest[0][i]) {
                        roundsPoints.push(parseInt(resultTest[0][i]["SUM(points)"]));
                        totalPoints += parseInt(resultTest[0][i]["SUM(points)"]);
                        totalClick += parseInt(resultTest[0][i]["COUNT(*)"]);
                        continue;
                    }
                    roundsPoints.push(0);
                }

                // 統計命中率 hit rate
                let hitRate;
                if (totalClick !== 0) {
                    hitRate = (totalPoints * 2 / 10) / totalClick;
                } else {
                    hitRate = 0;
                }

                stat.push({ player_email: members[i].email, hitRate: hitRate, roundsPoints: roundsPoints, totalPoints: totalPoints });
            } else {
                const hitRate = 0;
                const roundsPoints = [];
                const totalPoints = 0;
                for (let i = 0; i < rounds; i++) {
                    roundsPoints.push(0);
                }
                stat.push({ player_email: members[i].email, hitRate: hitRate, roundsPoints: roundsPoints, totalPoints: totalPoints });
            }
        }

        if (stat[0].totalPoints > stat[1].totalPoints) {
            winner.push({ email: stat[0].player_email, name: emailtoNameObj[stat[0].player_email] });
        } else if (stat[0].totalPoints < stat[1].totalPoints) {
            winner.push({ email: stat[1].player_email, name: emailtoNameObj[stat[1].player_email] });
        } else {
            winner.push({ email: "Tie", name: "Tie" });
        }

        const inserts = [];
        for (const i in stat) {
            inserts.push([gameID, stat[i].player_email, stat[i].roundsPoints[0], stat[i].roundsPoints[1], stat[i].roundsPoints[2], stat[i].totalPoints, stat[i].hitRate, winner[0].email, status]);
        }
        await conn.query("INSERT INTO game_results (game_id, player_email, round1_points, round2_points, round3_points, total_points, hit_rate, winner_email, status) VALUES ?", [inserts]);
        await conn.release();

        console.log("record summry: ");
        console.log({ results: stat, winner: winner });
        return ({ results: stat, winner: winner });
    } catch (err) {
        console.log(`error in ${err}`);
    } finally {
        await conn.release();
    }
};

const getReplay = async (gameID) => {
    const conn = await pool.getConnection();
    try {
        let stepHis, members, rules, cardsSetting, gameStat, stat;
        const status = await conn.query("SELECT status FROM game_history WHERE game_id = ?", gameID);
        if (status[0].length === 0) {
            return 0; // 有配對 但沒有對戰
        }
        if (status[0][0].status === 1) { // 或許只提供真人對戰重播 待改
            stepHis = await conn.query("SELECT game_setting_info.type, game_setting_info.number AS cards_number, game_history.game_id, game_history.room_id, game_history.round, game_history.player_email, game_history.card_ID, game_history.number, game_history.points, game_history.time, game_history.uts_order FROM game_history INNER JOIN game_setting_info ON game_setting_info.id = game_history.game_id WHERE game_id = ? ORDER BY uts_order ASC", [gameID]);
        } else {
            rules = await conn.query("SELECT room_id, type, number, rounds, targets_1, targets_2, targets_3 FROM game_setting_info WHERE id = ?;", [gameID]);
            members = await conn.query("SELECT user.name, user.photo_src, game_results.player_email FROM game_results INNER JOIN user ON user.email = game_results.player_email WHERE game_id = ?", [gameID]);
            stepHis = await conn.query("SELECT user.name, game_setting_info.type, game_setting_info.number AS cards_number, game_history.game_id, game_history.room_id, game_history.round, game_history.player_email, game_history.card_ID, game_history.number, game_history.points, game_history.time, game_history.uts_order FROM game_history INNER JOIN user ON user.email = game_history.player_email INNER JOIN game_setting_info ON game_setting_info.id = game_history.game_id WHERE game_id = ? ORDER BY uts_order ASC", [gameID]);
            cardsSetting = await conn.query("SELECT game_id, room_id, round, card_ID, number, selecter FROM cards_setting_info WHERE game_id = ?", [gameID]);
            gameStat = await conn.query("SELECT user.name AS winnerName, game_results.game_id, game_results.player_email, game_results.round1_points, game_results.round2_points, game_results.round3_points, game_results.total_points, game_results.hit_rate, game_results.winner_email FROM game_results INNER JOIN user ON user.email = game_results.winner_email WHERE game_id = ?;", [gameID]);

            if (gameStat[0].length === 0) { // 中途離開 沒有贏家 平手 tie 也會有問題
                stat = 0;
            } else {
                stat = gameStat[0];
            }
        }
        return ({ stepList: stepHis[0], members: members[0], rules: rules[0][0], cardsSetting: cardsSetting[0], gameStatData: stat });
    } catch (err) {
        console.log(`err in getReplay: ${err}`);
    } finally {
        await conn.release();
    }
};

module.exports = {
    saveGameRules,
    getGameRules,
    getRandomRules,
    saveCardsSetting,
    recordEveryStep,
    statRecord,
    statRecordSingle,
    getReplay
};
