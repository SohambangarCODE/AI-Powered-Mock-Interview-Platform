const mongoose = require('mongoose');


const messageSchema = new mongoose.Schema({
    role: {type: String, enum: ['user', 'ai'], required: true},
    content: {type: String, required: true},
    timestamp: {type: Date, default: Date.now}
})

const interviewSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    domain: {type: String, required: true},
    score: {type: Number, default: 0},
    duration: {type: Number, default: 0}, // Duration in seconds
    messages: [messageSchema],
    createdAt: {type: Date, default: Date.now},
    questionsAnswered: {type: Number, default: 0},
    feedback: {type: String, default: ''},
    isComplete: {type: Boolean, default: false}
});

module.exports = mongoose.model('Interview', interviewSchema);
