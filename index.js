const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

// Servir le fichier index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

// Fonction pour mettre à jour la liste des utilisateurs dans un salon
async function updateRoomUsers(room) {
  // 1. Récupère les IDs de tous les sockets dans le salon 'room'
  const socketIdsInRoom = await io.in(room).allSockets() // 2. Map les IDs pour récupérer les données (username) de chaque socket
  const users = Array.from(socketIdsInRoom)
    .map((socketId) => {
      const socket = io.sockets.sockets.get(socketId)
      return socket ? socket.data.username : null
    })
    .filter((username) => username) // Filtre les pseudos non définis // 3. Émet l'événement 'room users' à tous les clients du salon

  io.to(room).emit('room users', users)
  console.log(
    `Liste des utilisateurs de ${room} mise à jour: ${users.join(', ')}`
  )
}

// Écoute des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté')

  socket.on('join room', (data) => {
    socket.join(data.room) // Ajoute le socket au salon
    socket.data.username = data.username // Stocke le pseudo
    socket.data.room = data.room // Stocke le salon actuel

    // Notifie tous les membres du salon (y compris le nouveau)
    io.to(data.room).emit('room message', {
      message: `${data.username} a rejoint le salon ${data.room}.`,
    })
    console.log(`${data.username} a rejoint le salon ${data.room}`)

    updateRoomUsers(data.room)
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
