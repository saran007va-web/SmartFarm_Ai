import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
  auth: { token: localStorage.getItem('vaagai_token') },
  autoConnect: false,
})

export const connectSocket = (userId: string) => {
  socket.connect()
  socket.emit('join', userId)
}

export const joinFarm = (farmId: string) => {
  socket.emit('join-farm', farmId)
}

export const joinMarket = () => {
  socket.emit('join', 'market')
}

export default socket