
class ChatApp {
    constructor() {
      this.socket = null
      this.currentUser = null
      this.currentRoom = "general"
      this.typingTimer = null
      this.isTyping = false
      this.typingUsers = new Set()
  
      this.initializeElements()
      this.setupEventListeners()
    }
  
    initializeElements() {
      // Login elements
      this.loginScreen = document.getElementById("loginScreen")
      this.usernameInput = document.getElementById("usernameInput")
      this.roomInput = document.getElementById("roomInput")
      this.joinButton = document.getElementById("joinButton")
  
      // Main chat elements
      this.currentUserEl = document.getElementById("currentUser")
      this.connectionStatus = document.getElementById("connectionStatus")
      this.currentRoomEl = document.getElementById("currentRoom")
      this.roomInfo = document.getElementById("roomInfo")
      this.messagesContainer = document.getElementById("messagesContainer")
      this.typingUsersEl = document.getElementById("typingUsers")
      this.messageForm = document.getElementById("messageForm")
      this.messageInput = document.getElementById("messageInput")
      this.sendButton = document.getElementById("sendButton")
      this.roomsList = document.getElementById("roomsList")
      this.usersList = document.getElementById("usersList")
      this.userCount = document.getElementById("userCount")
    }
  
    setupEventListeners() {
      // Login form
      this.joinButton.addEventListener("click", () => this.joinChat())
      this.usernameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.joinChat()
      })
      this.roomInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.joinChat()
      })
  
      // Message form
      this.messageForm.addEventListener("submit", (e) => {
        e.preventDefault()
        this.sendMessage()
      })
  
      // Typing indicators
      this.messageInput.addEventListener("input", () => this.handleTyping())
      this.messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          this.sendMessage()
        }
      })
  
      // Room switching
      this.roomsList.addEventListener("click", (e) => {
        if (e.target.classList.contains("room-item")) {
          const room = e.target.dataset.room
          if (room && room !== this.currentRoom) {
            this.switchRoom(room)
          }
        }
      })
    }
  
    joinChat() {
      const username = this.usernameInput.value.trim()
      const room = this.roomInput.value.trim() || "general"
  
      if (!username) {
        alert("Please enter a username")
        return
      }
  
      this.currentUser = username
      this.currentRoom = room
      this.connectToServer()
    }
  
    connectToServer() {
      this.socket = window.io("http://localhost:3000")
  
      this.socket.on("connect", () => {
        console.log("Connected to server")
        this.updateConnectionStatus(true)
        this.joinRoom()
      })
  
      this.socket.on("disconnect", () => {
        console.log("Disconnected from server")
        this.updateConnectionStatus(false)
      })
  
      this.socket.on("joined-room", (data) => {
        console.log("Joined room:", data)
        this.hideLoginScreen()
        this.updateRoomInfo(data)
        this.displayMessages(data.messages)
        this.updateUsersList(data.users)
      })
  
      this.socket.on("user-joined", (data) => {
        this.addSystemMessage(`${data.username} joined the chat`)
        this.updateUserCount(data.userCount)
      })
  
      this.socket.on("user-left", (data) => {
        this.addSystemMessage(`${data.username} left the chat`)
        this.updateUserCount(data.userCount)
        this.typingUsers.delete(data.username)
        this.updateTypingDisplay()
      })
  
      // Message events
      this.socket.on("new-message", (message) => {
        this.displayMessage(message)
        this.scrollToBottom()
      })
  
      this.socket.on("private-message", (message) => {
        this.displayPrivateMessage(message, false)
        this.scrollToBottom()
      })
  
      this.socket.on("private-message-sent", (message) => {
        this.displayPrivateMessage(message, true)
        this.scrollToBottom()
      })
  
      // User events
      this.socket.on("online-users", (users) => {
        this.updateUsersList(users)
      })
  
      this.socket.on("user-typing", (data) => {
        if (data.username !== this.currentUser) {
          if (data.isTyping) {
            this.typingUsers.add(data.username)
          } else {
            this.typingUsers.delete(data.username)
          }
          this.updateTypingDisplay()
        }
      })
  
      // Error handling
      this.socket.on("error", (error) => {
        console.error("Socket error:", error)
        alert(`Error: ${error.message}`)
      })
    }
  
    joinRoom() {
      this.socket.emit("join-chat", {
        username: this.currentUser,
        room: this.currentRoom,
      })
    }
  
    switchRoom(newRoom) {
      this.socket.emit("switch-room", newRoom)
      this.currentRoom = newRoom
      this.clearMessages()
      this.updateCurrentRoom(newRoom)
      this.updateActiveRoom(newRoom)
    }
  
    sendMessage() {
      const text = this.messageInput.value.trim()
      if (!text) return
  
      if (text.startsWith("@")) {
        const spaceIndex = text.indexOf(" ")
        if (spaceIndex > 1) {
          const targetUsername = text.substring(1, spaceIndex)
          const messageText = text.substring(spaceIndex + 1)
  
          this.socket.emit("send-private-message", {
            targetUsername,
            text: messageText,
          })
        }
      } else {
        this.socket.emit("send-message", {
          text,
          type: "text",
        })
      }
  
      this.messageInput.value = ""
      this.stopTyping()
    }
  
    handleTyping() {
      if (!this.isTyping) {
        this.isTyping = true
        this.socket.emit("typing-start")
      }
  
      clearTimeout(this.typingTimer)
      this.typingTimer = setTimeout(() => {
        this.stopTyping()
      }, 1000)
    }
  
    stopTyping() {
      if (this.isTyping) {
        this.isTyping = false
        this.socket.emit("typing-stop")
      }
      clearTimeout(this.typingTimer)
    }
  
    // UI Update Methods
    updateConnectionStatus(connected) {
      this.connectionStatus.textContent = connected ? "Connected" : "Disconnected"
      this.connectionStatus.className = `connection-status ${connected ? "connected" : "disconnected"}`
      this.sendButton.disabled = !connected
    }
  
    hideLoginScreen() {
      this.loginScreen.style.display = "none"
      this.currentUserEl.textContent = this.currentUser
    }
  
    updateRoomInfo(data) {
      this.currentRoomEl.textContent = data.room
      this.roomInfo.textContent = `${data.users.length} users online`
      this.userCount.textContent = data.users.length
    }
  
    updateCurrentRoom(room) {
      this.currentRoomEl.textContent = room
    }
  
    updateActiveRoom(room) {
      document.querySelectorAll(".room-item").forEach((item) => {
        item.classList.remove("active")
        if (item.dataset.room === room) {
          item.classList.add("active")
        }
      })
    }
  
    updateUserCount(count) {
      this.userCount.textContent = count
    }
  
    updateUsersList(users) {
      this.usersList.innerHTML = ""
      users.forEach((user) => {
        const userEl = document.createElement("div")
        userEl.className = "user-item"
        userEl.innerHTML = `
          <span>${user.username}</span>
          <span class="typing-indicator" style="display: none;">typing...</span>
        `
        this.usersList.appendChild(userEl)
      })
    }
  
    updateTypingDisplay() {
      const typingArray = Array.from(this.typingUsers)
      if (typingArray.length === 0) {
        this.typingUsersEl.textContent = ""
      } else if (typingArray.length === 1) {
        this.typingUsersEl.textContent = `${typingArray[0]} is typing...`
      } else {
        this.typingUsersEl.textContent = `${typingArray.join(", ")} are typing...`
      }
    }
  
    // Message Display Methods
    displayMessages(messages) {
      this.clearMessages()
      messages.forEach((message) => this.displayMessage(message))
      this.scrollToBottom()
    }
  
    displayMessage(message) {
      const messageEl = document.createElement("div")
      const isOwn = message.username === this.currentUser
  
      messageEl.className = `message ${isOwn ? "own" : "other"}`
  
      const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
  
      if (isOwn) {
        messageEl.innerHTML = `
          <div class="message-header">You</div>
          <div>${this.escapeHtml(message.text)}</div>
          <div class="message-time">${time}</div>
        `
      } else {
        messageEl.innerHTML = `
          <div class="message-header">${this.escapeHtml(message.username)}</div>
          <div>${this.escapeHtml(message.text)}</div>
          <div class="message-time">${time}</div>
        `
      }
  
      this.messagesContainer.appendChild(messageEl)
    }
  
    displayPrivateMessage(message, isSent) {
      const messageEl = document.createElement("div")
      messageEl.className = "message private"
  
      const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
  
      const header = isSent ? `Private to ${message.to}` : `Private from ${message.from}`
  
      messageEl.innerHTML = `
        <div class="message-header">${header}</div>
        <div>${this.escapeHtml(message.text)}</div>
        <div class="message-time">${time}</div>
      `
  
      this.messagesContainer.appendChild(messageEl)
    }
  
    addSystemMessage(text) {
      const messageEl = document.createElement("div")
      messageEl.className = "message system"
      messageEl.textContent = text
      this.messagesContainer.appendChild(messageEl)
      this.scrollToBottom()
    }
  
    clearMessages() {
      this.messagesContainer.innerHTML = ""
    }
  
    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
    }
  
    escapeHtml(text) {
      const div = document.createElement("div")
      div.textContent = text
      return div.innerHTML
    }
  }
  
  // Initialize the chat app when the page loads
  document.addEventListener("DOMContentLoaded", () => {
    new ChatApp()
  })