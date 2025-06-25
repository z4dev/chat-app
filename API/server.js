const { Server } = require("socket.io")
const express = require("express")
const http = require("http")

const ChatModel = require("./models/chat.model")
const ChatService = require("./services/chat.service")
const ChatController = require("./controllers/chat.controller")

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

const chatModel = new ChatModel()
const chatService = new ChatService(chatModel)
const chatController = new ChatController(io, chatService)

io.on("connection", (socket) => {
  chatController.handleConnection(socket)
})

server.listen(3000, () => {
  console.log("Server is running on port 3000")
})
