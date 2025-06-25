class ChatModel {
    constructor() {
      this.users = new Map()
      this.rooms = new Map()
      this.messages = new Map()
      this.typingUsers = new Map()
      this.DEFAULT_ROOM = "general"
      
      this.initializeRoom(this.DEFAULT_ROOM)
    }
  
    initializeRoom(roomId) {
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set())
        this.messages.set(roomId, [])
        this.typingUsers.set(roomId, new Set())
      }
    }
  
    addUser(socketId, userData) {
      this.users.set(socketId, {
        id: socketId,
        username: userData.username,
        room: userData.room || this.DEFAULT_ROOM,
        joinedAt: new Date().toISOString(),
      })
    }
  
    getUser(socketId) {
      return this.users.get(socketId)
    }
  
    removeUser(socketId) {
      const user = this.users.get(socketId)
      if (user) {
        this.rooms.get(user.room)?.delete(socketId)
        this.typingUsers.get(user.room)?.delete(user.username)
        this.users.delete(socketId)
      }
      return user
    }
  
    addUserToRoom(socketId, roomId) {
      this.initializeRoom(roomId)
      this.rooms.get(roomId).add(socketId)
    }
  
    removeUserFromRoom(socketId, roomId) {
      this.rooms.get(roomId)?.delete(socketId)
      const user = this.users.get(socketId)
      if (user) {
        this.typingUsers.get(roomId)?.delete(user.username)
      }
    }
  
    addMessage(roomId, message) {
      if (!this.messages.has(roomId)) {
        this.messages.set(roomId, [])
      }
      this.messages.get(roomId).push(message)
    }
  
    getMessages(roomId, limit = 50) {
      const roomMessages = this.messages.get(roomId) || []
      return roomMessages.slice(-limit)
    }
  
    getRoomUsers(roomId) {
      const socketIds = Array.from(this.rooms.get(roomId) || [])
      return socketIds
        .map((id) => {
          const user = this.users.get(id)
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
  
    findUserByUsername(username) {
      for (const user of this.users.values()) {
        if (user.username === username) {
          return user
        }
      }
      return null
    }
  
    addTypingUser(roomId, username) {
      this.typingUsers.get(roomId)?.add(username)
    }
  
    removeTypingUser(roomId, username) {
      this.typingUsers.get(roomId)?.delete(username)
    }
  
    switchUserRoom(socketId, newRoomId) {
      const user = this.users.get(socketId)
      if (!user || user.room === newRoomId) return null
  
      const oldRoom = user.room
      
      this.removeUserFromRoom(socketId, oldRoom)
      
      this.addUserToRoom(socketId, newRoomId)
      user.room = newRoomId
  
      return { oldRoom, newRoom: newRoomId }
    }
  }
  
  module.exports = ChatModel