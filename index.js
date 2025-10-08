const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const activeRooms = new Map()

app.use(express.static(path.join(__dirname, 'frontend')))

// Servir le fichier index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'))
})

// Fonction pour mettre à jour la liste des utilisateurs dans un salon
async function updateRoomUsers(room) {
  const socketIdsInRoom = await io.in(room).allSockets()
  const users = Array.from(socketIdsInRoom)
    .map((socketId) => {
      const socket = io.sockets.sockets.get(socketId)
      return socket ? socket.data.username : null
    })
    .filter((username) => username)

  if (users.length > 0) {
    activeRooms.set(room, users.length)
  } else {
    activeRooms.delete(room)
  }

  io.to(room).emit('room users', users)
  console.log(
    `Liste des utilisateurs de ${room} mise à jour: ${users.join(', ')}`
  )

  updateRoomsList()
}

function updateRoomsList() {
  const rooms = Array.from(activeRooms.keys())
  io.emit('rooms list', rooms)
  console.log(`Liste des salons actifs diffusée: ${rooms.join(', ')}`)
}

// Écoute des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté')

  updateRoomsList()

  socket.on('join room', (data) => {
    const { username, oldRoom, newRoom } = data

    if (oldRoom && oldRoom !== newRoom) {
      socket.leave(oldRoom)

      socket.to(oldRoom).emit('room message', {
        message: `${username} a quitté le salon ${oldRoom}.`,
      })

      setTimeout(() => updateRoomUsers(oldRoom), 50)
    }

    socket.join(newRoom) // Ajoute le socket au salon
    socket.data.username = username // Stocke le pseudo
    socket.data.room = newRoom // Stocke le salon actuel

    // Notifie tous les membres du salon (y compris le nouveau)
    io.to(newRoom).emit('room message', {
      message: `${username} a rejoint le salon ${newRoom}.`,
    })
    console.log(`${username} a rejoint le salon ${newRoom}`)

    updateRoomUsers(newRoom)
  })

  socket.on('chat message', (data) => {
    // Émet le message uniquement aux clients du salon spécifié
    io.to(data.room).emit('chat message', {
      username: data.username,
      room: data.room,
      message: data.message,
    })
    console.log(`[${data.room}] ${data.username}: ${data.message}`)
  })

  socket.on('disconnect', () => {
    console.log('Un utilisateur est déconnecté')
    const username = socket.data.username
    const room = socket.data.room

    if (username && room) {
      // Notifie les autres membres du salon que l'utilisateur est parti
      socket.to(room).emit('room message', {
        message: `${username} a quitté le salon ${room}.`,
      })
      console.log(`${username} a quitté le salon ${room}`)

      setTimeout(() => {
        updateRoomUsers(room)
      }, 50)
    }
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`)
})
