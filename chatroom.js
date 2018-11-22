//登入按鈕
$(function () {
    var currentUser;
    var chatRef = db.collection("chatroom").doc("chatroom");
    //登入供應商
    var provider = new firebase.auth.GoogleAuthProvider();
    //登入按鈕
    $("#login-btn").click(function () {
        firebase.auth().signInWithPopup(provider).then(function (result) {
            // This gives you a Google Access Token. You can use it to access the Google API.
            var token = result.credential.accessToken;
            // The signed-in user info.
            var user = result.user;

        }).catch(function (error) {
            console.log(error);
        });
    });

    //登出按鈕
    $("#logout-btn").click(function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
            alert("已登出");
            chatRef.collection("users").doc(currentUser.uid)
                .delete().then(function () {
                    location.reload();
                });
        }).catch(function (error) {
            // An error happened.
        });
    });
    chatRef.collection("users").onSnapshot(function (docs) {
        docs.docChanges().forEach(function (change) {
            var user = change.doc.data();
            var html = `<img class="chat-user-photo" src="./alarm.png">`;

            //有使用者登入
            if (change.type == "added") {
                html += `${user.displayName}上線囉!`;
                $("<li>").html(html).appendTo($("#chats"));
            }
            //使用者登出
            if (change.type == "removed") {
                html += `${user.displayName}離開囉!`;
                $("<li>").html(html).appendTo($("#chats"));
            }
        });
    });
    //登入登出狀態監測
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            console.log(user);
            currentUser = {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL
            };
            //將登入者的資料存到資料庫
            chatRef.collection("users").doc(currentUser.uid).set(currentUser);
            $("#login-btn").addClass("hidden");
            $("#logout-btn").removeClass("hidden");
            $("#user-photo").attr("src", user.photoURL);
            $("#user-name").text(user.displayName);
            //監控input框有沒有人在打字
            $("#message-input").on("input", function () {
                if ($("#message-input").val() != "") {
                    //輸入框上面有字
                    chatRef.update({
                        typing: true
                    });
                } else {
                    chatRef.update({
                        typing: false
                    });
                }

            });
            //游標離開input框
            $("#message-input").focusout(function () {
                chatRef.update({
                    typing: false
                });
            });
            //即時監控資料庫的typing欄位
            chatRef.onSnapshot(function (doc) {
                var chatroom = doc.data();
                if (chatroom.typing) {
                    $("#typing").removeClass("hidden");
                } else {
                    $("#typing").addClass("hidden");
                }
            });

            //按Enter鍵送訊息
            $("#message-input").keyup(function (event) {
                if (event.keyCode == 13) {
                    uploadTextMessage(imgFile);
                }
            });
            //按送出按鈕傳訊息
            $("#send-btn").click(function () {
                uploadTextMessage(imgFile);
            });
            //把聊天紀錄繪製到網頁上
            chatRef.collection("chats").orderBy("time", "asc")
                .onSnapshot(function (docs) {
                    docs.docChanges().forEach(function (change) {
                        if (change.type == "added") {
                            var chat = change.doc.data();
                            console.log(chat.message);
                            console.log(chat.user.displayName);
                            //大頭貼
                            var html = `<img src="${chat.user.photoURL}" class="chat-user-photo" alt="${chat.user.displayName}">`;
                            //加上聊天內容
                            if (chat.contentType == "text") {
                                //文字訊息:直接串上文字
                                html += chat.message;
                            } else {
                                //圖片訊息:先套img標籤
                                html += `<img src = "${chat.message}" width = "150px">`;
                            }
                            //新增li標籤,將模板設定到li裡面,再append到網頁上
                            $("<li>").html(html).appendTo($("#chats"));
                            //讓scroll bar置底
                            //取得ul的高度
                            var chatsUlHeight = $("#chats").prop("scrollHeight");
                            //移動scroll bar
                            $("#chats").scrollTop(chatsUlHeight);
                        }
                    });
                });
            var imgFile;
            //監控是否有img到input框
            $("#img-input").change(function (event) {
                console.log(event);
                imgFile = event.target.files[0];
                $(".custom-file-label").text(imgFile.name);
            });
            //
            $("#chat-window").on("drag dragstart dragend dragover dragleave drop", function (event) {
                event.preventDefault();
            }).on("dragenter dragover ", function () {
                //東西拖進來改變背景顏色
                $(this).css("background-color", "#ffe4e1");
            }).on("dragleave dragend drop", function () {
                $(this).css("background-color", "#eeeeee");
            }).on("drop", function (event) {
                var imgFiles = event.originalEvent.dataTransfer.files;
                Object.keys(imgFiles).forEach(function (key) {
                    var imgFile = imgFiles[key];
                    uploadImgMessage(imgFile);
                });
            });

        } else {
            //No user is signed in .
            console.log(user);
            $("#login-btn").removeClass("hidden");
            $("#logout-btn").addClass("hidden");
            $("#user-photo").attr("src", "");
            $("#user-name").text("");
        }
    });
    //上傳文字訊息
    function uploadTextMessage(imgFile) {
        //輸入框有文字,上傳完文字,再檢查是否有圖片
        var msg = $("#message-input").val();
        if (msg != "") {
            //把文字內容,訊息型態,上傳時間,時間
            var data = {
                message: msg,
                contentType: "text",
                user: currentUser,
                time: new Date().getTime()
            };
            //把聊天紀錄存到資料庫
            chatRef.collection("chats").add(data);
            //文字框清除
            $("#message-input").val("");
            //把打字狀態更新為false
            chatRef.update({
                typing: false
            });
            //上傳文字後,再檢查img-input有沒有圖片
            if ($("#img-input").val() != "") {
                uploadImgMessage(imgFile);
            }
        }
        //如果文字框沒有文字,但圖片框有圖片,幫他執行上傳
        if (msg == "" && $("#img-input".val() != "")) {
            uploadImgMessage(imgFile);
        }
    }
    //上傳圖片
    function uploadImgMessage(imgFile) {
        //避免圖片檔名重複
        var time = new Date().getTime();
        var fileName = imgFile.name + time;
        //指定圖片儲存庫的路徑
        var storageRef = storage.ref();
        //指定圖片在儲存庫的路徑(在儲存庫裡存圖片)
        var imgRef = storageRef.child(fileName);
        //將圖片上傳
        imgRef.put(imgFile).then(function (img) {
            //圖片上傳完成後,取得那張圖片的下載連結
            imgRef.getDownloadURL().then(function (url) {
                //新增一筆聊天訊息
                //圖片url,訊息類型,上傳者資訊,上傳時間
                var data = {
                    message: url,
                    contentType: "image",
                    user: currentUser,
                    time: time
                };
                //將資料存到chats集合中
                chatRef.collection("chats").add(data);
                //將label還原,將圖片資訊從輸入框移除
                $(".custom-file-label").text("Choose file");
                $("#img-input").val("");
            });
        });
    }
});