require("dotenv").config();
const mysql = require("mysql2/promise");
const env = process.env.NODE_ENV || "production";
const multipleStatements = (process.env.NODE_ENV === "test");
const { DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_DATABASE_TEST } = process.env;

const mysqlConfig = {
    development: {
        host: DB_HOST,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_DATABASE
    },
    test: { // for automation testing (command: npm run test)
        host: DB_HOST,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_DATABASE_TEST
    }
};

const mysqlEnv = mysqlConfig[env];
mysqlEnv.waitForConnections = true; // 無可用連線時是否等待pool連線釋放(預設為true)
mysqlEnv.connectionLimit = 60; // 連線池可建立的總連線數上限(預設最多為66個連線數)

const pool = mysql.createPool(mysqlEnv, { multipleStatements });

pool.getConnection((err, conn) => {
    if (err) throw err;
    console.log("mysql(pool) connecting...");
    pool.releaseConnection(conn);
});

module.exports = {
    mysql,
    pool
};
