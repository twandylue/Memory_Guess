require("dotenv").config();
const mysql = require("mysql2/promise");
const env = process.env.NODE_ENV || "production";
const { DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE } = process.env;

const mysqlConfig = {
    production: { // for EC2 machine
        host: DB_HOST,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_DATABASE,
        waitForConnections: true, // 無可用連線時是否等待pool連線釋放(預設為true)
        connectionLimit: 60 // 連線池可建立的總連線數上限(預設最多為60個連線數)
    },
    development: { // for localhost development
        host: DB_HOST,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_DATABASE,
        waitForConnections: true, // 無可用連線時是否等待pool連線釋放(預設為true)
        connectionLimit: 60 // 連線池可建立的總連線數上限(預設最多為60個連線數)
    }
};

const pool = mysql.createPool(mysqlConfig[env]);
pool.getConnection((err, conn) => {
    if (err) throw err;
    console.log("mysql(pool) connecting...");
    pool.releaseConnection(conn);
});

module.exports = {
    mysql,
    pool
};
