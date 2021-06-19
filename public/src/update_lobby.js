function updateLobby (roomInfo) {
    const rooms = document.querySelectorAll(".room");
    for (let i = 0; i < rooms.length; i++) {
        rooms[i].id = `room_${roomInfo.basicInfo[i].room_id}`;
    }
    const roomNames = document.querySelectorAll(".room-name");
    for (let i = 0; i < roomNames.length; i++) {
        roomNames[i].innerHTML = `Room ${roomInfo.basicInfo[i].room_id}`;
    }
    const roomStates = document.querySelectorAll(".room-state");
    for (let i = 0; i < roomNames.length; i++) {
        const str = `現在人數: ${roomInfo.basicInfo[i].player}/上限人數: ${roomInfo.basicInfo[i].player_limit}/觀戰人數: ${roomInfo.basicInfo[i].watcher}`;
        roomStates[i].innerHTML = str;
    }
    // const roomName = document.querySelector("#room1 .room-name");
    const joinButtons = document.querySelectorAll(".join"); // 房間人數超過上限時，disable button
    for (let i = 0; i < joinButtons.length; i++) {
        if (roomInfo.basicInfo[i].player >= roomInfo.basicInfo[i].player_limit) {
            joinButtons[i].disabled = "disabled";
        }
    }

    const allRoom = document.querySelectorAll(".members-list");
    for (let i = 0; i < allRoom.length; i++) {
        allRoom[i].innerHTML = "";
    }

    for (const i in roomInfo.members) {
        const room = document.querySelectorAll(`#room_${roomInfo.members[i].room_id}` + " .room-right" + " .members-list");
        for (let j = 0; j < room.length; j++) {
            if (roomInfo.members[i].memberlist[j]) {
                room[j].innerHTML = roomInfo.members[i].memberlist[j].name;
            } else {
                room[j].innerHTML = "";
            }
        }
    }

    if (roomInfo.members.length === 0) {
        const allRoom = document.querySelectorAll(".members-list");
        for (let i = 0; i < allRoom.length; i++) {
            allRoom[i].innerHTML = "";
        }
    }
}

export { updateLobby };
