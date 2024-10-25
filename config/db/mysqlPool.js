const mysql = require("mysql2/promise");
const dbConfig = require("./move.json");

const pool = mysql.createPool(dbConfig);

module.exports = pool;
