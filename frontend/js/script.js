const socket = io()

const joinSection = document.getElementById('join-section')
const chatSection = document.getElementById('chat-section')
const formJoin = document.getElementById('form-join')
const usernameInput = document.getElementById('username-input')
const roomInput = document.getElementById('room-input')
const currentRoomDisplay = document.getElementById('current-room-display')

const formChat = document.getElementById('form-chat')
const messageInput = document.getElementById('message-input')
const messages = document.getElementById('messages')
const usersList = document.getElementById('users-list')
const changeRoomBtn = document.getElementById('change-room-btn')
const roomsButtonsContainer = document.getElementById('rooms-buttons-container')

let currentUsername = ''
let currentRoom = ''

function switchRoom(newRoom) {
  if (!currentUsername) {
    alert("Veuillez d'abord définir votre pseudo.")
    return
  }

  if (newRoom === currentRoom) {
    return
  }

  const oldRoom = currentRoom
  currentRoom = newRoom
  currentRoomDisplay.textContent = currentRoom

  roomInput.value = currentRoom

  socket.emit('join room', {
    username: currentUsername,
    newRoom: currentRoom,
    oldRoom: oldRoom,
  })

  messages.innerHTML = ''
  usersList.innerHTML = ''

  joinSection.classList.add('hidden')
  chatSection.classList.remove('hidden')

  console.log(`Changement de salon vers : ${newRoom}`)
}

// Gérer la soumission du formulaire de connexion
formJoin.addEventListener('submit', (e) => {
  e.preventDefault()
  if (usernameInput.value && roomInput.value) {
    currentUsername = usernameInput.value

    switchRoom(roomInput.value)
  }
})

changeRoomBtn.addEventListener('click', () => {
  chatSection.classList.add('hidden')
  joinSection.classList.remove('hidden')
  usernameInput.value = currentUsername
  roomInput.value = currentRoom
})

// Gérer la soumission du formulaire de chat
formChat.addEventListener('submit', (e) => {
  e.preventDefault()
  if (messageInput.value) {
    socket.emit('chat message', {
      username: currentUsername,
      room: currentRoom,
      message: messageInput.value,
    })
    messageInput.value = ''
  }
})

// Écouter les messages entrants du serveur
socket.on('chat message', (data) => {
  const item = document.createElement('li')
  item.innerHTML = `<strong>${data.username}</strong> (${data.room}) : ${data.message}`
  messages.appendChild(item)
  messages.scrollTop = messages.scrollHeight
})

// Écouter les notifications de connexion/déconnexion dans le salon
socket.on('room message', (data) => {
  const item = document.createElement('li')
  item.style.fontStyle = 'italic'
  item.style.color = '#666'
  item.textContent = data.message
  messages.appendChild(item)
  messages.scrollTop = messages.scrollHeight
})

socket.on('room users', (users) => {
  usersList.innerHTML = ''

  users.forEach((username) => {
    const item = document.createElement('li')

    // Mettre en évidence l'utilisateur actuel
    if (username === currentUsername) {
      item.innerHTML = `👤 <strong>${username} (vous)</strong>`
    } else {
      item.textContent = `👤 ${username}`
    }
    usersList.appendChild(item)
  })
})

socket.on('rooms list', (rooms) => {
  roomsButtonsContainer.innerHTML = ''

  rooms.forEach((roomName) => {
    if (roomName.startsWith('/')) return

    const button = document.createElement('button')
    button.textContent = roomName

    if (roomName === currentRoom) {
      button.classList.add('active-room')
    } else {
      button.classList.remove('active-room')
    }

    button.addEventListener('click', () => {
      switchRoom(roomName)
    })

    roomsButtonsContainer.appendChild(button)
  })
})

socket.on('connect', () => {
  console.log('Connecté au serveur Socket.IO')
})

socket.on('disconnect', () => {
  console.log('Déconnecté du serveur Socket.IO')
})
