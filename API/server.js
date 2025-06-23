const { Server } = require("socket.io")
const express = require("express")
const http = require("http")
const app = express()

const server = http.createServer(app)

app.use(express.json())
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
})

const users = new Map() 
const rooms = new Map() 
const messages = new Map() 
const typingUsers = new Map() 

const DEFAULT_ROOM = "general"
rooms.set(DEFAULT_ROOM, new Set())
messages.set(DEFAULT_ROOM, [])
typingUsers.set(DEFAULT_ROOM, new Set())

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)
  
  socket.on("join-chat", (data) => {
    const { username, room = DEFAULT_ROOM } = data

    users.set(socket.id, {
      id: socket.id,
      username,
      room,
      joinedAt: new Date().toISOString(),
    })

    socket.join(room)

    if (!rooms.has(room)) {
      rooms.set(room, new Set())
      messages.set(room, [])
      typingUsers.set(room, new Set())
    }
    rooms.get(room).add(socket.id)

    const roomUsers = getRoomUsers(room)
    const roomMessages = messages.get(room) || []

    socket.emit("joined-room", {
      room,
      users: roomUsers,
      messages: roomMessages.slice(-50),
    })

    socket.to(room).emit("user-joined", {
      username,
      timestamp: new Date().toISOString(),
      userCount: roomUsers.length,
    })

    console.log(`${username} joined room: ${room}`)
  })

  socket.on("send-message", (data) => {
    const user = users.get(socket.id)
    if (!user) return

    const message = {
      id: Date.now().toString(),
      username: user.username,
      text: data.text,
      room: user.room,
      timestamp: new Date().toISOString(),
      type: data.type || "text",
    }

    if (!messages.has(user.room)) {
      messages.set(user.room, [])
    }
    messages.get(user.room).push(message)

    io.to(user.room).emit("new-message", message)

    console.log(`Message in ${user.room} from ${user.username}: ${data.text}`)
  })

  socket.on("typing-start", () => {
    const user = users.get(socket.id)
    if (!user) return

    typingUsers.get(user.room).add(user.username)

    socket.to(user.room).emit("user-typing", {
      username: user.username,
      isTyping: true,
    })
  })

  socket.on("typing-stop", () => {
    const user = users.get(socket.id)
    if (!user) return

    typingUsers.get(user.room).delete(user.username)
    socket.to(user.room).emit("user-typing", {
      username: user.username,
      isTyping: false,
    })
  })

  socket.on("switch-room", (newRoom) => {
    const user = users.get(socket.id)
    if (!user || user.room === newRoom) return

    const oldRoom = user.room

    socket.leave(oldRoom)
    rooms.get(oldRoom).delete(socket.id)
    typingUsers.get(oldRoom).delete(user.username)

    socket.join(newRoom)
    user.room = newRoom

    if (!rooms.has(newRoom)) {
      rooms.set(newRoom, new Set())
      messages.set(newRoom, [])
      typingUsers.set(newRoom, new Set())
    }
    rooms.get(newRoom).add(socket.id)

    socket.to(oldRoom).emit("user-left", {
      username: user.username,
      userCount: getRoomUsers(oldRoom).length,
    })

    const roomUsers = getRoomUsers(newRoom)
    const roomMessages = messages.get(newRoom) || []

    socket.emit("joined-room", {
      room: newRoom,
      users: roomUsers,
      messages: roomMessages.slice(-50),
    })

    socket.to(newRoom).emit("user-joined", {
      username: user.username,
      timestamp: new Date().toISOString(),
      userCount: roomUsers.length,
    })
  })

  socket.on("send-private-message", (data) => {
    const sender = users.get(socket.id)
    if (!sender) return

    const { targetUsername, text } = data
    const targetUser = findUserByUsername(targetUsername)

    if (targetUser) {
      const privateMessage = {
        id: Date.now().toString(),
        from: sender.username,
        to: targetUsername,
        text,
        timestamp: new Date().toISOString(),
        type: "private",
      }

      io.to(targetUser.id).emit("private-message", privateMessage)
      socket.emit("private-message-sent", privateMessage)
    } else {
      socket.emit("error", { message: "User not found" })
    }
  })

  socket.on("get-online-users", () => {
    const user = users.get(socket.id)
    if (!user) return

    const roomUsers = getRoomUsers(user.room)
    socket.emit("online-users", roomUsers)
  })

  socket.on("disconnect", () => {
    const user = users.get(socket.id)
    if (user) {
      rooms.get(user.room)?.delete(socket.id)
      typingUsers.get(user.room)?.delete(user.username)

      socket.to(user.room).emit("user-left", {
        username: user.username,
        timestamp: new Date().toISOString(),
        userCount: getRoomUsers(user.room).length,
      })

      users.delete(socket.id)
      console.log(`${user.username} disconnected`)
    }
  })
})

function getRoomUsers(roomId) {
  const socketIds = Array.from(rooms.get(roomId) || [])
  return socketIds
    .map((id) => {
      const user = users.get(id)
      return user
        ? {
            id: user.id,
            username: user.username,
            joinedAt: user.joinedAt,
          }
        : null
    })
    .filter(Boolean)
}

function findUserByUsername(username) {
  for (const user of users.values()) {
    if (user.username === username) {
      return user
    }
  }
  return null
}

server.listen(3000, () => {
  console.log("Server is running on port 3000")
})