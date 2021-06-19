require("dotenv").config();
const validator = require("validator");
const User = require("../models/user_model");

const signUp = async (req, res) => {
    let { name } = req.body;
    const { email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400).send({ error: "Request Error: name, email and password are required." });
        return;
    }

    if (!validator.isEmail(email)) {
        res.status(400).send({ error: "Request Error: Invalid email format" });
        return;
    }

    name = validator.escape(name);

    const result = await User.signUp(name, User.USER_ROLE.USER, email, password);
    if (result.error) {
        res.status(403).send({ error: result.error });
        return;
    }

    const user = result.user;
    if (!user) {
        res.status(500).send({ error: "Database Query Error" });
        return;
    }

    res.status(200).send({
        data: {
            access_token: user.access_token,
            access_expired: user.access_expired,
            login_at: user.login_at,
            user: {
                id: user.id,
                provider: user.provider,
                name: user.name,
                email: user.email,
                picture: user.picture
            }
        }
    });
};

const signIn = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return { error: "Request Error: email and password are required.", status: 400 };
    }

    try {
        const result = await User.nativeSignIn(email, password);
        if (result.error) {
            const statusCode = result.status ? result.status : 403;
            res.status(statusCode).send({ error: result.error });
            return;
        }

        const user = result.user;
        if (!user) {
            res.status(500).send({ error: "Database Query Error" });
            return;
        }

        res.status(200).send({
            data: {
                access_token: user.access_token,
                access_expired: user.access_expired,
                login_at: user.login_at,
                user: {
                    provider: user.provider,
                    name: user.name,
                    email: user.email,
                    picture: user.picture
                }
            }
        });
        return;
    } catch (error) {
        console.log(`error in singin: ${error}`);
        return { error };
    }
};

const getUserProfile = async (req, res) => {
    res.status(200).send({
        data: {
            provider: req.user.provider,
            name: req.user.name,
            email: req.user.email,
            picture: req.user.picture
        }
    });
};

const getUserRecord = async (req, res) => {
    const email = req.user.email;
    const records = await User.getRecord(email);
    res.status(200).send({ data: records });
};

const getLeaderBoard = async (req, res) => {
    const leaderList = await User.getLeaderList();
    res.status(200).send({ data: leaderList });
};

module.exports = {
    signUp,
    signIn,
    getUserProfile,
    getUserRecord,
    getLeaderBoard
};
