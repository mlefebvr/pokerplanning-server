const { createServer } = require('http')
const socketio = require('socket.io')

const lport = process.env.LPORT || 4000

const server = createServer()
const io = socketio(server, {
    cors: {
        origin: "*"
    }
})

const users = {}
let activeStory = false
let votes = {}

io.on('connection', (socket) => {
    socket.on('submit-story', (story) => {
        activeStory = story
        io.emit('story-submitted', story)
    })
    socket.on('user-connected', (name) => {
        users[socket.id] = name
        socket.emit('story-submitted', activeStory)
        socket.broadcast.emit('user-joined', name)
    })
    socket.on('disconnect', () => {
        socket.broadcast.emit('user-disconnected', users[socket.id])
        delete users[socket.id]
    })
    socket.on('story-poke', (vote) => {
        if (users[socket.id]) {
            if (!votes.story) votes.story = activeStory
            if (!votes.votes) votes.votes = {}
            votes.votes[users[socket.id]] = vote
            if (Object.keys(votes.votes).length === Object.keys(users).length) {
                io.emit('vote-results', votes)
                votes = {}
                activeStory = false
            } else {
                const results = {
                    story: activeStory,
                    votes: Object.values(users).reduce((accumul, user) => {
                        return {
                            ...accumul,
                            [user]: votes.votes[user] ? 'Done' : 'Waiting...'
                        }
                    }, {})
                }
                io.emit('vote-results', results)
            }
        }
    })
})

io.listen(lport)