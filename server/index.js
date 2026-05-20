
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const dns = require("node:dns");

// DNS FIX
dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

const app = express();

app.use(cors());
app.use(express.json());

// IMAGE FOLDER ACCESS
app.use(
  "/uploads",
  express.static("uploads")
);

// MONGODB
mongoose.connect(
  
  "mongodb+srv://chatapp:chat123@cluster0.qnhqrzb.mongodb.net/?appName=Cluster0"
)
.then(() => {

  console.log(
    "MongoDB Connected"
  );
})
.catch((err) => {

  console.log(err);
});

// USER SCHEMA
const UserSchema =
  new mongoose.Schema({

    username: String,

    mobile: String,

    password: String,
  });

const User =
  mongoose.model(
    "User",
    UserSchema
  );

// MESSAGE SCHEMA
const MessageSchema =
  new mongoose.Schema({

    sender: String,

    receiver: String,

    message: String,

    image: String,

    time: {

      type: Date,

      default: Date.now,
    },
  });

const Message =
  mongoose.model(
    "Message",
    MessageSchema
  );

// MULTER IMAGE STORAGE
const storage =
  multer.diskStorage({

    destination:
      (req, file, cb) => {

        cb(
          null,
          "uploads/"
        );
      },

    filename:
      (req, file, cb) => {

        cb(

          null,

          Date.now() +
            path.extname(
              file.originalname
            )
        );
      },
  });

const upload =
  multer({
    storage,
  });

// SERVER
const server =
  http.createServer(app);

const io =
  new Server(server, {

    cors: {
      origin: "*",
    },
  });

let onlineUsers = {};

// GET USERS
app.get(
  "/users",

  async (req, res) => {

    try {

      const users =
        await User.find().select(
          "-password"
        );

      res.json(users);

    } catch (err) {

      res.status(500).json({

        message:
          "Server Error",
      });
    }
  }
);

// GET MESSAGES
app.get(
  "/messages/:sender/:receiver",

  async (req, res) => {

    try {

      const {
        sender,
        receiver,
      } = req.params;

      const messages =
        await Message.find({

          $or: [

            {
              sender,
              receiver,
            },

            {
              sender: receiver,

              receiver: sender,
            },
          ],
        });

      res.json(

        messages.sort(
          (a, b) =>

            new Date(a.time) -

            new Date(b.time)
        )
      );

    } catch (err) {

      res.status(500).json({

        message:
          "Server Error",
      });
    }
  }
);

// SIGNUP
app.post(
  "/signup",

  async (req, res) => {

    try {

      const {
        username,
        mobile,
        password,
      } = req.body;

      const existingUsername =
        await User.findOne({
          username,
        });

      if (existingUsername) {

        return res.json({

          message:
            "Username already exists",
        });
      }

      const existingMobile =
        await User.findOne({
          mobile,
        });

      if (existingMobile) {

        return res.json({

          message:
            "Mobile number already exists",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        new User({

          username,

          mobile,

          password:
            hashedPassword,
        });

      await user.save();

      res.json({

        message:
          "User Created",
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Server Error",
      });
    }
  }
);

// LOGIN
app.post(
  "/login",

  async (req, res) => {

    try {

      const {
        username,
        password,
      } = req.body;

      const user =
        await User.findOne({
          username,
        });

      if (!user) {

        return res.json({

          message:
            "User not found",
        });
      }

      const isMatch =
        await bcrypt.compare(

          password,

          user.password
        );

      if (!isMatch) {

        return res.json({

          message:
            "Wrong password",
        });
      }

      res.json({

        message:
          "Login Successful",

        username:
          user.username,
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Server Error",
      });
    }
  }
);

// IMAGE UPLOAD
app.post(
  "/upload",

  upload.single("image"),

  (req, res) => {

    try {

      res.json({

        imageUrl:

          `http://localhost:5000/uploads/${req.file.filename}`,
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Upload Error",
      });
    }
  }
);

// SOCKET
io.on(
  "connection",

  (socket) => {

    console.log(
      "User Connected:",
      socket.id
    );

    // ONLINE
    socket.on(
      "user_online",

      (username) => {

        onlineUsers[username] =
          socket.id;

        io.emit(

          "online_users",

          Object.keys(
            onlineUsers
          )
        );
      }
    );

    // OFFLINE
    socket.on(
      "user_offline",

      (username) => {

        delete onlineUsers[
          username
        ];

        io.emit(

          "online_users",

          Object.keys(
            onlineUsers
          )
        );
      }
    );

    // SEND MESSAGE
    socket.on(
      "send_message",

      async (data) => {

        try {

          const newMessage =
            new Message({

              sender:
                data.sender,

              receiver:
                data.receiver,

              message:
                data.message || "",

              image:
                data.image || "",

              time:
                data.time,
            });

          await newMessage.save();

          io.emit(
            "receive_message",
            data
          );

        } catch (err) {

          console.log(err);
        }
      }
    );

    // DISCONNECT
    socket.on(
      "disconnect",

      () => {

        for (
          let user in onlineUsers
        ) {

          if (

            onlineUsers[user] ===
            socket.id

          ) {

            delete onlineUsers[
              user
            ];
          }
        }

        io.emit(

          "online_users",

          Object.keys(
            onlineUsers
          )
        );

        console.log(
          "User Disconnected:",
          socket.id
        );
      }
    );
  }
);

// START SERVER
server.listen(
  5000,

  () => {

    console.log(
      "Server running on port 5000"
    );
  }
);