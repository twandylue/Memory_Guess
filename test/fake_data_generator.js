require("dotenv").config();
const { NODE_ENV } = process.env;
const bcrypt = require("bcrypt");
const { users } = require("./fake_data");
const { pool } = require("../server/models/mysqlcon");
const salt = parseInt(process.env.BCRYPT_SALT);

async function _createFakeUser () {
    const encryped_users = users.map(user => {
        const encryped_user = {
            provider: "native",
            role_id: 2,
            email: user.email,
            password: user.password ? bcrypt.hashSync(user.password, salt) : null,
            name: user.name,
            photo_src: "/images/profile.jpeg",
            access_token: user.access_token,
            access_expired: user.access_expired,
            login_at: user.login_at
        };
        return encryped_user;
    });
    return await pool.query("INSERT INTO user (provider, role_id, email, password, name, photo_src, access_token, access_expired, login_at) VALUES ?", [encryped_users.map(x => Object.values(x))]);
}

async function createFakeData () {
    if (NODE_ENV !== "test") {
        console.log("Not in test env");
        return;
    }

    await _createFakeUser();
}

async function truncateFakeData () {
    if (NODE_ENV !== "test") {
        console.log("Not in test env");
        return;
    }

    const truncateTable = async (table) => {
        const conn = await pool.getConnection();
        await conn.query("START TRANSACTION");
        await conn.query("SET FOREIGN_KEY_CHECKS = ?", 0);
        await conn.query(`TRUNCATE TABLE ${table}`);
        await conn.query("SET FOREIGN_KEY_CHECKS = ?", 1);
        await conn.query("COMMIT");
        await conn.release();
    };

    const tables = ["user"];
    for (const table of tables) {
        await truncateTable(table);
    }
}

async function closeConnection () {
    return await pool.end();
}

async function main () {
    await truncateFakeData();
    await createFakeData();
    await closeConnection();
}

// execute when called directly.
if (require.main === module) {
    main();
}

module.exports = {
    createFakeData,
    truncateFakeData,
    closeConnection
};
