class ChatService {
    constructor(chatModel) {
      this.chatModel = chatModel
    }
  
    joinRoom(socketId, userData) {
      const { username, room = this.chatModel.DEFAULT_ROOM } = userData
      
      this.chatModel.addUser(socketId, { username, room })
      this.chatModel.addUserToRoom(socketId, room)
  
      const roomUsers = this.chatModel.getRoomUsers(room)
      const roomMessages = this.chatModel.getMessages(room)
  
      return {
        room,
        users: roomUsers,
        messages: roomMessages,
        username,
        userCount: roomUsers.length
      }
    }
  
    sendMessage(socketId, messageData) {
      const user = this.chatModel.getUser(socketId)
      if (!user) return null
  
      const message = {
        id: Date.now().toString(),
        username: user.username,
        text: messageData.text,
        room: user.room,
        timestamp: new Date().toISOString(),
        type: messageData.type || "text",
      }
  
      this.chatModel.addMessage(user.room, message)
      return message
    }
  
    startTyping(socketId) {
      const user = this.chatModel.getUser(socketId)
      if (!user) return null
  
      this.chatModel.addTypingUser(user.room, user.username)
      return { username: user.username, room: user.room }
    }
  
    stopTyping(socketId) {
      const user = this.chatModel.getUser(socketId)
      if (!user) return null
  
      this.chatModel.removeTypingUser(user.room, user.username)
      return { username: user.username, room: user.room }
    }
  
    switchRoom(socketId, newRoom) {
      const user = this.chatModel.getUser(socketId)
      if (!user) return null
  
      const roomSwitch = this.chatModel.switchUserRoom(socketId, newRoom)
      if (!roomSwitch) return null
  
      const roomUsers = this.chatModel.getRoomUsers(newRoom)
      const roomMessages = this.chatModel.getMessages(newRoom)
      const oldRoomUsers = this.chatModel.getRoomUsers(roomSwitch.oldRoom)
  
      return {
        oldRoom: roomSwitch.oldRoom,
        newRoom: roomSwitch.newRoom,
        username: user.username,
        newRoomUsers: roomUsers,
        newRoomMessages: roomMessages,
        oldRoomUserCount: oldRoomUsers.length,
        newRoomUserCount: roomUsers.length
      }
    }
  
    sendPrivateMessage(socketId, messageData) {
      const sender = this.chatModel.getUser(socketId)
      if (!sender) return null
  
      const { targetUsername, text } = messageData
      const targetUser = this.chatModel.findUserByUsername(targetUsername)
  
      if (!targetUser) {
        return { error: "User not found" }
      }
  
      const privateMessage = {
        id: Date.now().toString(),
        from: sender.username,
        to: targetUsername,
        text,
        timestamp: new Date().toISOString(),
        type: "private",
      }
  
      return { message: privateMessage, targetUser }
    }
  
    getOnlineUsers(socketId) {
      const user = this.chatModel.getUser(socketId)
      if (!user) return null
  
      return this.chatModel.getRoomUsers(user.room)
    }
  
    handleDisconnect(socketId) {
      const user = this.chatModel.removeUser(socketId)
      if (!user) return null
  
      const remainingUsers = this.chatModel.getRoomUsers(user.room)
      
      return {
        username: user.username,
        room: user.room,
        userCount: remainingUsers.length
      }
    }
  }
  
  module.exports = ChatService
  