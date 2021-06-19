const { pool } = require("./mysqlcon");

const getCardNumber = async (gameID, room, round, cardID) => {
    const conn = await pool.getConnection();
    const sql = "SELECT number FROM cards_setting_info WHERE game_id = ? AND room_id = ? AND card_ID = ? AND round = ?";
    const inserts = [gameID, room, cardID, round];
    const result = await conn.query(sql, inserts);
    await conn.release();
    return result[0][0].number;
};

const genMultiCardsNumber = (target, totalCards) => {
    const multiPairs = getMultiPairs(target);
    const isGenPiarsEnough = multiPairs.length >= totalCards / 2;
    const randomPairs = [];
    let randomUniqueList;
    let randomList;
    if (isGenPiarsEnough) {
        randomUniqueList = randomUniqueforArrayIndex(multiPairs.length, totalCards / 2);
        for (const i in randomUniqueList) {
            randomPairs.push(multiPairs[randomUniqueList[i]]);
        }
    } else {
        randomList = randomNumberForArrayIndex(multiPairs.length, totalCards / 2);
        for (const i in randomList) {
            randomPairs.push(multiPairs[randomList[i]]);
        }
    }

    const randomPairsArr = [];
    for (const i in randomPairs) {
        for (const j in randomPairs[i]) {
            randomPairsArr.push(randomPairs[i][j]);
        }
    }

    const remainNumberList = randomUniqueforArrayIndex(totalCards, totalCards);

    const cardsObj = {};
    for (let i = 0; i < remainNumberList.length; i++) {
        cardsObj[i] = randomPairsArr[remainNumberList[i]];
    }
    return cardsObj;
};

const getFactors = (number) => {
    const factors = [];
    let i = 2;
    while (number > 1) {
        if (number % i === 0) {
            factors.push(i);
            number = number / i;
            continue;
        }
        i++;
    }
    return factors;
};

const getMultiPairs = (target) => { // target 必須為>1的正整數
    const factors = getFactors(target);
    const obj = count(factors);
    const obj2 = {};
    const arr = [];
    for (const i in obj) {
        const base = i;
        const numbers = [];
        for (let j = 0; j <= obj[i]; j++) {
            numbers.push(Math.pow(base, j));
        }
        obj2[base] = numbers; // 測試使用
        arr.push(numbers);
    }

    const results = [];
    function combination (curArr, combi) {
        const nextArr = arr.shift();

        for (let i = 0; i < curArr.length; i++) {
            let temp = [];
            temp = combi.map((element) => {
                return element;
            });
            temp.push(curArr[i]);

            if (nextArr) {
                combination(nextArr, temp);
            } else {
                results.push(temp);
            }
        }
        if (nextArr) {
            arr.push(nextArr);
        }
    }
    combination(arr.shift(), []);

    const pairs = [];
    for (let i = 0; i < parseInt(results.length); i++) {
        let pair1 = 1;
        for (const j in results[i]) {
            pair1 = pair1 * results[i][j];
        }
        const pair2 = target / pair1;
        pairs.push([pair1, pair2]);
    }

    return pairs;
};

function count (input) {
    const ans = {};
    for (let i = 0; i < input.length; i++) {
        if (ans[input[i]] >= 1) {
            ans[input[i]] += 1;
            continue;
        } else {
            ans[input[i]] = 1;
        }
    }
    return (ans);
};

const randomNumber = (range, count) => { // 不含0
    const randomNumberArr = [];
    for (let i = 0; i < count; i++) {
        const randomNumber = Math.floor(Math.random() * range) + 1;
        randomNumberArr.push(randomNumber);
    }
    return randomNumberArr;
};

const randomNumberForArrayIndex = (range, count) => { // 0
    const randomNumberArr = [];
    for (let i = 0; i < count; i++) {
        const randomNumber = Math.floor(Math.random() * range);
        randomNumberArr.push(randomNumber);
    }
    return randomNumberArr;
};

const randomUnique = (range, count) => { // 不含0
    if (range < count) {
        return null;
    }
    const nums = new Set();
    while (nums.size < count) {
        nums.add(Math.floor(Math.random() * range) + 1);
    }
    return [...nums];
};

const randomUniqueforArrayIndex = (range, count) => { // 包含0
    if (range < count) {
        return null;
    }
    const nums = new Set();
    while (nums.size < count) {
        nums.add(Math.floor(Math.random() * range));
    }
    return [...nums];
};

module.exports = {
    getCardNumber,
    genMultiCardsNumber
};
