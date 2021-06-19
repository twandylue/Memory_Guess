require("dotenv").config();
const bcrypt = require("bcrypt");
const { pool } = require("./mysqlcon");
const salt = parseInt(process.env.BCRYPT_SALT);
const { TOKEN_EXPIRE, TOKEN_SECRET } = process.env; // 30 days by seconds
const jwt = require("jsonwebtoken");

const USER_ROLE = {
    ALL: -1,
    ADMIN: 1,
    USER: 2
};

const signUp = async (name, roleId, email, password) => {
    const conn = await pool.getConnection();
    try {
        await conn.query("START TRANSACTION");

        const emails = await conn.query("SELECT email FROM user WHERE email = ? FOR UPDATE", [email]);
        if (emails[0].length > 0) {
            await conn.query("COMMIT");
            return { error: "Email Already Exists" };
        }

        const loginAt = new Date();

        const user = {
            provider: "native",
            role_id: roleId,
            email: email,
            password: bcrypt.hashSync(password, salt),
            name: name,
            access_expired: TOKEN_EXPIRE,
            login_at: loginAt,
            photo_src: "/images/profile.jpeg" // default photo
        };
        const accessToken = jwt.sign({
            provider: user.provider,
            name: user.name,
            email: user.email,
            picture: user.photo_src
        }, TOKEN_SECRET);
        user.access_token = accessToken;

        const queryStr = "INSERT INTO user SET ?";
        const result = await conn.query(queryStr, user);

        user.id = result[0].insertId;
        await conn.query("COMMIT");
        return { user };
    } catch (error) {
        console.log(`error in sign up: ${error}`);
        await conn.query("ROLLBACK");
        return { error };
    } finally {
        await conn.release();
    }
};

const nativeSignIn = async (email, password) => {
    const conn = await pool.getConnection();
    try {
        await conn.query("START TRANSACTION");

        const users = await conn.query("SELECT * FROM user WHERE email = ?", [email]);
        const user = users[0][0];
        if (!bcrypt.compareSync(password, user.password)) {
            await conn.query("COMMIT");
            return { error: "Password is wrong" };
        }

        const loginAt = new Date();
        const accessToken = jwt.sign({
            provider: user.provider,
            name: user.name,
            email: user.email,
            picture: user.photo_src
        }, TOKEN_SECRET);

        const queryStr = "UPDATE user SET access_token = ?, access_expired = ?, login_at = ? WHERE id = ?";
        await conn.query(queryStr, [accessToken, TOKEN_EXPIRE, loginAt, user.id]);

        await conn.query("COMMIT");

        user.access_token = accessToken;
        user.login_at = loginAt;
        user.access_expired = TOKEN_EXPIRE;

        return { user };
    } catch (error) {
        console.log(`error in nativeSignIn: ${error}`);
        await conn.query("ROLLBACK");
        return { error };
    } finally {
        await conn.release();
    }
};

const getUserDetail = async (email, roleId) => {
    try {
        if (roleId) {
            const users = await pool.query("SELECT * FROM user WHERE email = ? AND role_id = ?", [email, roleId]);
            return users[0][0];
        } else {
            const users = await pool.query("SELECT * FROM user WHERE email = ?", [email]);
            return users[0][0];
        }
    } catch (e) {
        console.log(`error in getUserDetail: ${e}`);
        return null;
    }
};

const getRecord = async (email) => {
    const conn = await pool.getConnection();

    const sql = "SELECT game_results.game_id, user.name, user.email, game_setting_info.room_id, game_setting_info.type, game_setting_info.number, game_setting_info.rounds, game_setting_info.player_1, game_setting_info.player_2, game_results.round1_points, game_results.round2_points, game_results.round3_points, game_results.total_points, game_results.hit_rate, game_results.winner_email FROM game_results INNER JOIN `user` ON user.email = game_results.player_email INNER JOIN game_setting_info ON game_setting_info.id = game_results.game_id WHERE game_results.player_email = ? AND status = 2;"; // status = 2 只限雙人遊玩可以重播記錄 status = 2 => 只算入與真人對戰的成績
    const gameHis = await conn.query(sql, email);
    const personRecord = await conn.query("SELECT user.name, player_email, SUM(total_points), SUM(hit_rate), COUNT(*) FROM game_results INNER JOIN user ON user.email = game_results.player_email WHERE player_email = ? AND status = 2;", email);
    const hitRate = parseFloat(personRecord[0][0]["SUM(hit_rate)"]) / parseFloat(personRecord[0][0]["COUNT(*)"]);

    return ({ totalPoints: personRecord[0][0]["SUM(total_points)"], hitRate: hitRate, gameHis: gameHis[0] });
};

const getLeaderList = async () => {
    const conn = await pool.getConnection();
    const results = await conn.query("SELECT user.name, player_email, SUM(total_points), SUM(hit_rate), COUNT(*) FROM game_results INNER JOIN user ON user.email = game_results.player_email WHERE status = 2 GROUP BY player_email ORDER BY SUM(total_points) DESC;"); // 這裏從game_results拿取資訊 user.name會剔除機器人進入排行榜 status = 2 => 只算入與真人對戰的成績
    await conn.release();

    const leaderList = [];
    for (const i in results[0]) {
        leaderList.push({ name: results[0][i].name, player_email: results[0][i].player_email, totalPoints: parseFloat(results[0][i]["SUM(total_points)"]), avgPoints: parseFloat(results[0][i]["SUM(total_points)"]) / parseFloat(results[0][i]["COUNT(*)"]), avgHitRate: parseFloat(results[0][i]["SUM(hit_rate)"]) / parseFloat(results[0][i]["COUNT(*)"]) });
    }

    return (leaderList);
};

const saveUserPhoto = async (email, src) => {
    const conn = await pool.getConnection();
    try {
        await conn.query("UPDATE user SET photo_src = ? WHERE email =?", [src, email]);
    } catch (err) {
        console.log(`error in saveUserPhoto ${err}`);
    } finally {
        await conn.release();
    }
};

module.exports = {
    USER_ROLE,
    signUp,
    nativeSignIn,
    getUserDetail,
    getRecord,
    getLeaderList,
    saveUserPhoto
};
