class ChatController {
    constructor(io, chatService) {
      this.io = io
      this.chatService = chatService
    }
  
    handleConnection(socket) {
      console.log("A user connected:", socket.id)
  
      socket.on("join-chat", (data) => this.handleJoinChat(socket, data))
      socket.on("send-message", (data) => this.handleSendMessage(socket, data))
      socket.on("typing-start", () => this.handleTypingStart(socket))
      socket.on("typing-stop", () => this.handleTypingStop(socket))
      socket.on("switch-room", (newRoom) => this.handleSwitchRoom(socket, newRoom))
      socket.on("send-private-message", (data) => this.handlePrivateMessage(socket, data))
      socket.on("get-online-users", () => this.handleGetOnlineUsers(socket))
      socket.on("disconnect", () => this.handleDisconnect(socket))
    }
  
    handleJoinChat(socket, data) {
      const result = this.chatService.joinRoom(socket.id, data)
      if (!result) return
  
      socket.join(result.room)
  
      socket.emit("joined-room", {
        room: result.room,
        users: result.users,
        messages: result.messages,
      })
  
      socket.to(result.room).emit("user-joined", {
        username: result.username,
        timestamp: new Date().toISOString(),
        userCount: result.userCount,
      })
  
      console.log(`${result.username} joined room: ${result.room}`)
    }
  
    handleSendMessage(socket, data) {
      const message = this.chatService.sendMessage(socket.id, data)
      if (!message) return
  
      this.io.to(message.room).emit("new-message", message)
      console.log(`Message in ${message.room} from ${message.username}: ${data.text}`)
    }
  
    handleTypingStart(socket) {
      const result = this.chatService.startTyping(socket.id)
      if (!result) return
  
      socket.to(result.room).emit("user-typing", {
        username: result.username,
        isTyping: true,
      })
    }
  
    handleTypingStop(socket) {
      const result = this.chatService.stopTyping(socket.id)
      if (!result) return
  
      socket.to(result.room).emit("user-typing", {
        username: result.username,
        isTyping: false,
      })
    }
  
    handleSwitchRoom(socket, newRoom) {
      const result = this.chatService.switchRoom(socket.id, newRoom)
      if (!result) return
  
      socket.leave(result.oldRoom)
      socket.join(result.newRoom)
  
      socket.to(result.oldRoom).emit("user-left", {
        username: result.username,
        userCount: result.oldRoomUserCount,
      })
  
      socket.emit("joined-room", {
        room: result.newRoom,
        users: result.newRoomUsers,
        messages: result.newRoomMessages,
      })
  
      socket.to(result.newRoom).emit("user-joined", {
        username: result.username,
        timestamp: new Date().toISOString(),
        userCount: result.newRoomUserCount,
      })
    }
  
    handlePrivateMessage(socket, data) {
      const result = this.chatService.sendPrivateMessage(socket.id, data)
      if (!result) return
  
      if (result.error) {
        socket.emit("error", { message: result.error })
        return
      }
  
      this.io.to(result.targetUser.id).emit("private-message", result.message)
      socket.emit("private-message-sent", result.message)
    }
  
    handleGetOnlineUsers(socket) {
      const users = this.chatService.getOnlineUsers(socket.id)
      if (!users) return
  
      socket.emit("online-users", users)
    }
  
    handleDisconnect(socket) {
      const result = this.chatService.handleDisconnect(socket.id)
      if (!result) return
  
      socket.to(result.room).emit("user-left", {
        username: result.username,
        timestamp: new Date().toISOString(),
        userCount: result.userCount,
      })
  
      console.log(`${result.username} disconnected`)
    }
  }
  
  module.exports = ChatController
  