const users = [
    {
        email: "test1@gmail.com",
        password: "test1password",
        name: "test1",
        access_token: "test1accesstoken",
        access_expired: (60 * 60), // 1hr by second
        login_at: new Date("2020-01-01")
    },
    {
        email: "test3@gmail.com",
        password: "test3passwod",
        name: "test3",
        access_token: "test3accesstoken",
        access_expired: 0,
        login_at: new Date("2020-01-01")
    }
];

module.exports = { users };
