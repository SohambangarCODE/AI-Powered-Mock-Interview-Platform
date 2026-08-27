const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); 
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const resumeRoutes = require('./routes/resumeRoutes');


const app = express();

connectDB();


app.use(cors({
    origin: "*",
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/resume', resumeRoutes);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res)=>{
    res.send("backend is alive")
})

app.get("/health", (req, res) => {
  res.status(200).json({ 
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
   });    
});

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
})




