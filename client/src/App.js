import {
  useState,
  useEffect,
  useRef,
} from "react";

import axios from "axios";
import io from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

const socket =
  io("https://chatapp-ixki.onrender.com");

function App() {

  const messagesEndRef =
    useRef(null);

  const [showEmoji, setShowEmoji] =
    useState(false);

  const [onlineUsers, setOnlineUsers] =
    useState([]);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  const [isLogin, setIsLogin] =
    useState(true);

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState("");

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [users, setUsers] =
    useState([]);

  const [showSidebar, setShowSidebar] =
    useState(
      window.innerWidth > 768
    );

  useEffect(() => {

    const savedUser =
      localStorage.getItem("user");

    if (savedUser) {

      setCurrentUser(savedUser);

      setIsAuthenticated(true);

      socket.emit(
        "user_online",
        savedUser
      );
    }

    fetchUsers();

  }, []);

  useEffect(() => {

    socket.on(
      "online_users",

      (users) => {

        setOnlineUsers(users);
      }
    );

    return () => {

      socket.off("online_users");
    };

  }, []);

  useEffect(() => {

    socket.on(
      "receive_message",

      (data) => {

        if (

          selectedUser &&

          (
            data.sender ===
              selectedUser.username ||

            data.receiver ===
              selectedUser.username
          )
        ) {

          setMessages((prev) => [
            ...prev,
            data,
          ]);
        }
      }
    );

    return () => {

      socket.off("receive_message");
    };

  }, [selectedUser]);

  useEffect(() => {

    messagesEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });

  }, [messages]);

  useEffect(() => {

    const handleResize = () => {

      if (
        window.innerWidth > 768
      ) {

        setShowSidebar(true);

      } else {

        setShowSidebar(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );

  }, []);

  const fetchUsers = async () => {

    try {

      const res = await axios.get(
        "https://chatapp-ixki.onrender.com/users"
      );

      setUsers(res.data);

    } catch (err) {

      console.log(err);
    }
  };

  const signup = async () => {

    if (mobile.length !== 10) {

      alert(
        "Mobile number must be 10 digits"
      );

      return;
    }

    const res = await axios.post(
      "https://chatapp-ixki.onrender.com/signup",
      {
        username,
        mobile,
        password,
      }
    );

    alert(res.data.message);

    if (
      res.data.message ===
      "User Created"
    ) {

      setUsername("");
      setMobile("");
      setPassword("");

      setIsLogin(true);

      fetchUsers();
    }
  };

  const login = async () => {

    try {

      const res = await axios.post(
        "https://chatapp-ixki.onrender.com/login",
        {
          username,
          password,
        }
      );

      alert(res.data.message);

      if (
        res.data.message ===
        "Login Successful"
      ) {

        setCurrentUser(
          res.data.username
        );

        setIsAuthenticated(true);

        localStorage.setItem(
          "user",
          res.data.username
        );

        socket.emit(
          "user_online",
          res.data.username
        );

        setUsername("");
        setPassword("");
      }

    } catch (err) {

      console.log(err);
    }
  };

  const logout = () => {

    socket.emit(
      "user_offline",
      currentUser
    );

    localStorage.removeItem("user");

    setCurrentUser("");

    setIsAuthenticated(false);
  };

  const sendMessage = () => {

    if (!message.trim()) return;

    if (!selectedUser) return;

    const messageData = {

      sender: currentUser,

      receiver:
        selectedUser.username,

      message,

      time: new Date(),
    };

    socket.emit(
      "send_message",
      messageData
    );

    setMessage("");
  };

  const onEmojiClick = (emojiData) => {

    setMessage(
      (prev) =>
        prev + emojiData.emoji
    );
  };

  const sendImage = (e) => {

    const file =
      e.target.files[0];

    if (!file) return;

    const imageUrl =
      URL.createObjectURL(file);

    const imageMessage = {

      sender: currentUser,

      receiver:
        selectedUser.username,

      image: imageUrl,

      time: new Date(),
    };

    socket.emit(
      "send_message",
      imageMessage
    );
  };

  return (

    <div style={styles.container}>

      {
        !isAuthenticated ? (

          <div style={styles.authBox}>

            <h1 style={styles.title}>
              {
                isLogin
                  ? "Login"
                  : "Signup"
              }
            </h1>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                )
              }
              style={styles.input}
            />

            {
              !isLogin && (

                <input
                  type="text"
                  placeholder="Mobile"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(
                      e.target.value
                    )
                  }
                  style={styles.input}
                />
              )
            }

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              style={styles.input}
            />

            <button
              onClick={
                isLogin
                  ? login
                  : signup
              }
              style={styles.button}
            >
              {
                isLogin
                  ? "Login"
                  : "Signup"
              }
            </button>

            <p
              onClick={() =>
                setIsLogin(!isLogin)
              }
              style={styles.switch}
            >
              {
                isLogin
                  ? "Create Account"
                  : "Already have account?"
              }
            </p>

          </div>

        ) : (

          <div style={styles.chatApp}>

            {
              showSidebar && (

                <div style={styles.sidebar}>

                  <div
                    style={
                      styles.sidebarHeader
                    }
                  >

                    <h2>
                      {currentUser}
                    </h2>

                  </div>

                  <div
                    style={styles.userList}
                  >

                    {
                      users
                        .filter(
                          (user) =>

                            user.username !==
                            currentUser
                        )
                        .map(
                          (
                            user,
                            index
                          ) => (

                            <div
                              key={index}
                              style={{
                                ...styles.userCard,

                                background:

                                  selectedUser?.username ===
                                  user.username

                                    ? "#d9fdd3"

                                    : "white",
                              }}
                              onClick={async () => {

                                setSelectedUser(
                                  user
                                );

                                if (
                                  window.innerWidth < 768
                                ) {

                                  setShowSidebar(
                                    false
                                  );
                                }

                                const res =
                                  await axios.get(

                                    `https://chatapp-ixki.onrender.com/messages/${currentUser}/${user.username}`
                                  );

                                setMessages(
                                  res.data
                                );
                              }}
                            >

                              <div
                                style={
                                  styles.avatar
                                }
                              >

                                {
                                  user.username
                                    .charAt(0)
                                    .toUpperCase()
                                }

                              </div>

                              <div>

                                <h4
                                  style={{
                                    margin: 0,
                                  }}
                                >
                                  {
                                    user.username
                                  }
                                </h4>

                                <p
                                  style={{
                                    margin: 0,

                                    color:

                                      onlineUsers.includes(
                                        user.username
                                      )

                                        ? "green"

                                        : "gray",
                                  }}
                                >

                                  {
                                    onlineUsers.includes(
                                      user.username
                                    )

                                      ? "Online 🟢"

                                      : "Offline ⚫"
                                  }

                                </p>

                              </div>

                            </div>
                          )
                        )
                    }

                  </div>

                  <button
                    onClick={logout}
                    style={
                      styles.logoutBtn
                    }
                  >
                    Logout
                  </button>

                </div>
              )
            }

            <div
              style={styles.chatArea}
            >

              <div
                style={styles.chatHeader}
              >

                <div
                  style={styles.menuBtn}
                  onClick={() =>
                    setShowSidebar(
                      !showSidebar
                    )
                  }
                >
                  ☰
                </div>

                <h2>

                  {
                    selectedUser
                      ? selectedUser.username
                      : "Select Chat"
                  }

                </h2>

              </div>

              <div
                style={
                  styles.chatMessages
                }
              >

                {
                  messages.map(
                    (
                      msg,
                      index
                    ) => (

                      <div
                        key={index}
                        style={{

                          ...styles.messageBubble,

                          alignSelf:

                            msg.sender ===
                            currentUser

                              ? "flex-end"

                              : "flex-start",

                          background:

                            msg.sender ===
                            currentUser

                              ? "#075e54"

                              : "white",

                          color:

                            msg.sender ===
                            currentUser

                              ? "white"

                              : "black",
                        }}
                      >

                        {
                          msg.image ? (

                            <img
                              src={msg.image}
                              alt=""
                              style={{
                                width: "200px",
                                borderRadius: "10px",
                              }}
                            />

                          ) : (

                            <div>
                              {msg.message}
                            </div>
                          )
                        }

                      </div>
                    )
                  )
                }

                <div
                  ref={messagesEndRef}
                ></div>

              </div>

              {
                showEmoji && (

                  <div
                    style={
                      styles.emojiBox
                    }
                  >

                    <EmojiPicker
                      onEmojiClick={
                        onEmojiClick
                      }
                    />

                  </div>
                )
              }

              <div
                style={
                  styles.messageInputArea
                }
              >

                <button
                  onClick={() =>
                    setShowEmoji(
                      !showEmoji
                    )
                  }
                  style={
                    styles.emojiBtn
                  }
                >
                  😀
                </button>

                <input
                  type="file"
                  id="imageInput"
                  hidden
                  accept="image/*"
                  onChange={sendImage}
                />

                <button
                  onClick={() =>

                    document
                      .getElementById(
                        "imageInput"
                      )
                      .click()
                  }
                  style={
                    styles.imageBtn
                  }
                >
                  📎
                </button>

                <input
                  type="text"
                  placeholder="Type message..."
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {

                    if (
                      e.key === "Enter"
                    ) {

                      sendMessage();
                    }
                  }}
                  style={
                    styles.messageInput
                  }
                />

                <button
                  onClick={
                    sendMessage
                  }
                  style={
                    styles.sendBtn
                  }
                >
                  Send
                </button>

              </div>

            </div>

          </div>
        )
      }

    </div>
  );
}

const styles = {

  container: {
    width: "100%",
    height: "100vh",
    background: "#ece5dd",
    fontFamily: "Arial",
  },

  authBox: {
    width: "90%",
    maxWidth: "350px",
    background: "white",
    padding: "25px",
    borderRadius: "20px",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform:
      "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  title: {
    textAlign: "center",
  },

  input: {
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #ccc",
  },

  button: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#075e54",
    color: "white",
    cursor: "pointer",
  },

  switch: {
    textAlign: "center",
    color: "#075e54",
    cursor: "pointer",
  },

  chatApp: {
    width: "100%",
    height: "100vh",
    display: "flex",
    overflow: "hidden",
  },

  sidebar: {
    width: "300px",
    background: "#f0f2f5",
    display: "flex",
    flexDirection: "column",
  },

  sidebarHeader: {
    padding: "15px",
    background: "#075e54",
    color: "white",
  },

  userList: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
  },

  userCard: {
    display: "flex",
    gap: "10px",
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "10px",
  },

  avatar: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    background: "#5b5df0",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  logoutBtn: {
    margin: "10px",
    padding: "12px",
    border: "none",
    background: "#ff4d4d",
    color: "white",
    borderRadius: "10px",
    cursor: "pointer",
  },

  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#efeae2",
    position: "relative",
  },

  chatHeader: {
    padding: "15px",
    background: "#075e54",
    color: "white",
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  menuBtn: {
    fontSize: "24px",
    cursor: "pointer",
  },

  chatMessages: {
    flex: 1,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
  },

  messageBubble: {
    maxWidth: "70%",
    padding: "12px",
    borderRadius: "15px",
    wordBreak: "break-word",
  },

  messageInputArea: {
    background: "white",
    padding: "10px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  messageInput: {
    flex: 1,
    padding: "12px",
    borderRadius: "25px",
    border: "1px solid #ccc",
    outline: "none",
  },

  sendBtn: {
    background: "#075e54",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "25px",
    cursor: "pointer",
  },

  emojiBtn: {
    border: "none",
    background: "transparent",
    fontSize: "28px",
    cursor: "pointer",
  },

  imageBtn: {
    border: "none",
    background: "transparent",
    fontSize: "24px",
    cursor: "pointer",
  },

  emojiBox: {
    position: "absolute",
    bottom: "80px",
    right: "20px",
    zIndex: 999,
  },
};

export default App;