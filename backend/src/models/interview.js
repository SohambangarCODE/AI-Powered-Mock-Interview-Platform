const mongoose = require('mongoose');

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Chat transcript entry. `kind` is what lets us tell a question apart from the
// feedback that follows it — both are role: 'ai', so without it a resumed
// session can't work out which message is the pending question.
const messageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'ai'], required: true },
    kind: {
        type: String,
        enum: ['question', 'answer', 'feedback', 'nudge', 'system'],
        required: true,
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    difficulty: { type: String, enum: DIFFICULTIES },
    topic: { type: String },
    skipped: { type: Boolean, default: false },
    score: { type: Number, min: 0, max: 10, default: null },
});

// One question/answer exchange. This is the source of truth for the report —
// `messages` is only the chat log.
//
// A turn is created when the question is asked (question/topic/difficulty/askedAt)
// and completed when it's answered (answer/score/feedback/answeredAt). The turn
// with no `answeredAt` is the "open" turn, i.e. the question awaiting an answer.
const turnSchema = new mongoose.Schema({
    index: { type: Number, required: true },          // 1-based
    topic: { type: String, default: 'General' },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },
    question: { type: String, required: true },
    answer: { type: String, default: '' },
    // null for skipped or unanswered turns — a skip is an abstention, not a zero,
    // so it must not drag the average down.
    score: { type: Number, min: 0, max: 10, default: null },
    feedback: { type: String, default: '' },
    skipped: { type: Boolean, default: false },
    askedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date, default: null },
}, { _id: false });

const interviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: String, required: true },
    score: { type: Number, default: 0 },              // overall, 0-100
    duration: { type: Number, default: 0 },           // minutes
    messages: [messageSchema],
    createdAt: { type: Date, default: Date.now },
    questionsAnswered: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    isComplete: { type: Boolean, default: false },

    // ── Adaptive Engine fields ──────────────────────────────
    turns: [turnSchema],
    currentDifficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },
    askedTopics: { type: [String], default: [] },
    skippedCount: { type: Number, default: 0 },
    endReason: { type: String, default: '' },
    report: { type: mongoose.Schema.Types.Mixed, default: null },
    lastActivityAt: { type: Date, default: Date.now },
});

// Powers the "continue where you left off" lookup.
interviewSchema.index({ userId: 1, isComplete: 1, lastActivityAt: -1 });

// The question currently awaiting an answer, or null if the last turn is done.
interviewSchema.methods.openTurn = function () {
    const last = this.turns[this.turns.length - 1];
    return last && !last.answeredAt ? last : null;
};

// Every answer the candidate has given so far — used for repeat detection.
interviewSchema.methods.previousAnswers = function () {
    return this.turns
        .filter((t) => !t.skipped && t.answer)
        .map((t) => t.answer);
};

interviewSchema.methods.askedQuestions = function () {
    return this.turns.map((t) => t.question).filter(Boolean);
};

module.exports = mongoose.model('Interview', interviewSchema);
module.exports.DIFFICULTIES = DIFFICULTIES;
