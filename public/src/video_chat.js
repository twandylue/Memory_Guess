function setVideoChat (socket) {
    let peer = null;
    let cacheStream = null;
    // const candidateTemplates = [];
    // cacheStream.getVideoTracks.forEach((track) => { track.enbled = false; }); // 關閉視頻

    const offerOptions = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    };

    const mediaConstraints = {
        audio: true, // 開關聲音
        video: {
            aspectRatio: {
                ideal: 1.333333 // 3:2 aspect is preferred
            }
        }
    };

    // Media config
    socket.on("offer", async (desc) => { // B方
        // console.log("收到遠方的offer");
        try {
            if (!peer) {
                createPeerConnection(); // create RTCPeerConnection instance
            }

            // console.log(" = 設定 remote description = ");
            await peer.setRemoteDescription(desc);
            if (!cacheStream) {
                await addStreamProcess(); // getUserMedia & addTrack
            }
            await createAnswer();
        } catch (error) {
            console.log(`Error ${error.name}: ${error.message}`);
        }
    });

    socket.on("answer", async (desc) => { // A方
        // console.log("*** 遠端接受我們的offer並發送answer回來");
        try {
            // console.log("setRemoteDescription ...");
            await peer.setRemoteDescription(desc);
        } catch (error) {
            console.log(`Error ${error.name}: ${error.message}`);
        }
    });

    socket.on("icecandidate", async (candidate) => { // A方 Ｂ方
        // console.log(`*** 加入新取得的 ICE candidate: ${JSON.stringify(candidate)}`);
        try {
            // candidateTemplates.push(candidate);
            await peer.addIceCandidate(candidate); // 注意先後順序 after setRemoteDescription
        } catch (error) {
            console.log(`Failed to add ICE: ${error.toString()}`);
        }
    });

    async function getUserStream () {
        // console.log("getUserMedia ...");
        if ("mediaDevices" in navigator) {
            const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            cacheStream = stream;

            const localVideo = document.getElementById("localVideo");
            localVideo.srcObject = cacheStream;
        }
    }

    async function addStreamProcess () {
        try {
            await getUserStream();
        } catch (error) {
            const errMsg = "getUserStream error ===> " + error.toString();
            throw new Error(errMsg);
        }

        try {
            cacheStream
                .getTracks()
                .forEach((track) => peer.addTrack(track, cacheStream));
        } catch (error) {
            const errMsg = "Peer addTransceiver error ===> " + error.toString();
            throw new Error(errMsg);
        }
    }

    function createPeerConnection () {
        // console.log("create peer connection ...");
        peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                },
                {
                    urls: "turn:192.158.29.39:3478?transport=udp",
                    credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
                    username: "28224511:1379330808"
                },
                {
                    urls: "turn:192.158.29.39:3478?transport=tcp",
                    credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
                    username: "28224511:1379330808"
                }
            ]
        });
        peer.onicecandidate = handleIceCandidate;// 有新的ICE candidate 時觸發 我方找到
        peer.ontrack = handleRemoteStream; // connection中發現“對方”新的 MediaStreamTrack時觸發
        peer.onnegotiationneeded = handleNegotiationNeeded; // offer
    }

    function handleIceCandidate (event) {
        socket.emit("icecandidate", event.candidate);
    }

    function handleRemoteStream (event) {
        const remoteVideo = document.getElementById("remoteVideo"); // 有問題
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    }

    async function handleNegotiationNeeded () {
        // console.log("*** handleNegotiationNeeded fired!");
        try {
            // console.log("start createOffer ...");
            await peer.setLocalDescription(await peer.createOffer(offerOptions));
            socket.emit("offer", peer.localDescription);
        } catch (error) {
            console.log(`Error ${error.name}: ${error.message}`);
        }
    }

    async function createAnswer () {
        try {
            // console.log("createAnswer ...");
            const answer = await peer.createAnswer();
            // console.log("setLocalDescription ...");
            await peer.setLocalDescription(answer);
            // console.log("signaling answer ...");
            socket.emit("answer", answer);
        } catch (error) {
            const errMsg = "Create Answer error ===> " + error.toString();
            throw new Error(errMsg);
        }
    }

    async function calling () { // offer
        try {
            if (peer) {
                Swal.fire({
                    icon: "warning",
                    title: "已經建立連線囉！",
                    text: "已連線",
                    confirmButtonText: "確認"
                });
            } else {
                createPeerConnection(); // 建立 RTCPeerConnection
                await addStreamProcess(); // 加入多媒體數據到RTCPeerConnection instance
            }
        } catch (error) {
            console.log(`Error ${error.name}: ${error.message}`);
        }
    }

    function closing () {
        // console.log("Closing connection call");
        if (!peer) return; // 防呆機制

        // 1. 移除事件監聽
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.onnegotiationneeded = null;

        // 2. 停止所有在connection中的多媒體信息
        peer.getSenders().forEach((sender) => {
            peer.removeTrack(sender);
        });

        // 3. 暫停video播放，並將儲存在src裡的 MediaStreamTracks 依序停止
        const localVideo = document.getElementById("localVideo");
        if (localVideo.srcObject) {
            localVideo.pause();
            localVideo.srcObject.getTracks().forEach((track) => {
                track.stop();
            });
        }

        // 4. cleanup： 關閉RTCPeerConnection連線並釋放記憶體
        peer.close();
        peer = null;
        cacheStream = null;
    }

    async function closevideo () {
        closing(); // close p2p

        Swal.fire({
            icon: "warning",
            title: "結束視訊通話",
            text: "想聊天的話可以用文字聊天室",
            confirmButtonText: "確認"
        });

        const videoMasks = document.querySelectorAll(".video-mask");
        videoMasks[0].remove(); // user
        videoMasks[1].remove(); // oppo
        // const uservideo = document.querySelector("#localVideo");
        // uservideo.remove();

        // for user
        const userPhoto = document.createElement("img");
        userPhoto.id = "user_photo_left";
        userPhoto.className = "user_photo";
        userPhoto.src = "https://memoryguess.s3.ap-northeast-1.amazonaws.com/profile.jpeg";
        userPhoto.alt = "user_photo";
        const userContainer = document.querySelector("#user_container");
        userContainer.insertBefore(userPhoto, userContainer.firstChild);
        const userInfo = await getUserPhoto();
        document.querySelector("#user_photo_left").src = userInfo.data.picture;

        // for oppo
        const oppoPhoto = document.createElement("img");
        oppoPhoto.id = "user_photo_right";
        oppoPhoto.className = "user_photo";
        const oppoPhotoSrc = localStorage.getItem("oppoPhoto");
        oppoPhoto.src = oppoPhotoSrc;
        oppoPhoto.alt = "user_photo";
        const oppoContainer = document.querySelector("#opposite_user_container");
        oppoContainer.insertBefore(oppoPhoto, oppoContainer.firstChild);

        socket.emit("close video chat", "close video chat");
    }

    const video = document.querySelector("#camera");
    video.addEventListener("click", () => {
        socket.emit("want to video chat", "want to video chat");
        Swal.fire({
            icon: "warning",
            title: "已送出視訊聊天請求",
            text: "等待回覆中...",
            confirmButtonText: "確認"
        });
    });

    socket.on("oppo want to video chat", () => {
        Swal.fire({
            icon: "warning",
            title: "對手想要與你視訊聊天",
            text: "想不想視訊聊天呢？",
            showDenyButton: true,
            confirmButtonText: "好哇",
            denyButtonText: "不了"
        }).then((result) => {
            if (result.isConfirmed) {
                // for user
                const camera = document.querySelector("#camera");
                camera.remove();
                const userPhoto = document.querySelector("#user_photo_left");
                userPhoto.remove();
                const videoMask = document.createElement("div");
                videoMask.className = "video-mask";

                const videoCont = "<video autoplay muted class = \"video-cont\" id = \"localVideo\"></video>";

                const userContainer = document.querySelector("#user_container");
                videoMask.insertAdjacentHTML("afterbegin", videoCont);
                userContainer.insertBefore(videoMask, userContainer.firstChild);

                // for oppo
                const oppoPhoto = document.querySelector("#user_photo_right");
                oppoPhoto.remove();
                const oppovideoMask = document.createElement("div");
                oppovideoMask.className = "video-mask";
                const oppovideo = document.createElement("video");
                oppovideo.id = "remoteVideo";
                oppovideo.autoplay = true;
                oppovideo.className = "video-cont";
                const oppouserContainer = document.querySelector("#opposite_user_container");
                oppovideoMask.append(oppovideo);
                oppouserContainer.insertBefore(oppovideoMask, oppouserContainer.firstChild);

                const stop = document.querySelector("#localVideo");
                stop.addEventListener("click", () => {
                    closevideo();
                });

                socket.emit("vedio chat comfirmed", "vedio chat comfirmed");
            }

            if (result.isDenied) {
                socket.emit("vedio chat denide", "oppo dont want to chat");
            }
        });
    });

    socket.on("oppo comfirmed vedio chat", () => {
        // for user
        const camera = document.querySelector("#camera");
        camera.remove();
        const userPhoto = document.querySelector("#user_photo_left");
        userPhoto.remove();
        const videoMask = document.createElement("div");
        videoMask.className = "video-mask";

        const videoCont = "<video autoplay muted class = \"video-cont\" id = \"localVideo\"></video>";

        const userContainer = document.querySelector("#user_container");
        videoMask.insertAdjacentHTML("afterbegin", videoCont);
        userContainer.insertBefore(videoMask, userContainer.firstChild);

        // for oppo
        const oppoPhoto = document.querySelector("#user_photo_right");
        oppoPhoto.remove();
        const oppovideoMask = document.createElement("div");
        oppovideoMask.className = "video-mask";
        const oppovideo = document.createElement("video");
        oppovideo.id = "remoteVideo";
        oppovideo.autoplay = true;
        oppovideo.className = "video-cont";
        const oppouserContainer = document.querySelector("#opposite_user_container");
        oppovideoMask.append(oppovideo);
        oppouserContainer.insertBefore(oppovideoMask, oppouserContainer.firstChild);

        calling(); // start p2p

        const stop = document.querySelector("#localVideo");
        stop.addEventListener("click", () => {
            closevideo();
        });
    });

    socket.on("oppo denied vedio chat", () => {
        Swal.fire({
            icon: "warning",
            title: "對手不想拒絕視訊聊天",
            text: "幫ＱＱ",
            confirmButtonText: "確認"
        });
    });

    socket.on("oppo close video chat", async (picture) => {
        closing(); // close p2p

        Swal.fire({
            icon: "warning",
            position: "top-end",
            title: "對手結束通話",
            text: "還有文字聊天室可以使用唷",
            confirmButtonText: "確認"
        });

        const videoMasks = document.querySelectorAll(".video-mask");
        videoMasks[0].remove(); // user
        videoMasks[1].remove(); // oppo

        // for user
        const userPhoto = document.createElement("img");
        userPhoto.id = "user_photo_left";
        userPhoto.className = "user_photo";
        userPhoto.src = "https://memoryguess.s3.ap-northeast-1.amazonaws.com/profile.jpeg";
        userPhoto.alt = "user_photo";
        const userContainer = document.querySelector("#user_container");
        userContainer.insertBefore(userPhoto, userContainer.firstChild);
        const userInfo = await getUserPhoto();
        document.querySelector("#user_photo_left").src = userInfo.data.picture;

        // for oppo
        const oppoPhoto = document.createElement("img");
        oppoPhoto.id = "user_photo_right";
        oppoPhoto.className = "user_photo";
        const oppoPhotoSrc = localStorage.getItem("oppoPhoto");
        oppoPhoto.src = oppoPhotoSrc;
        oppoPhoto.alt = "user_photo";
        const oppoContainer = document.querySelector("#opposite_user_container");
        oppoContainer.insertBefore(oppoPhoto, oppoContainer.firstChild);
    });

    async function getUserPhoto () {
        const accessToken = localStorage.getItem("access_token");
        const response = await fetch("api/1.0/user/profile", {
            method: "GET",
            headers: new Headers({
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            })
        });
        return await response.json();
    }
}

export { setVideoChat };
