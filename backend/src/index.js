const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config(); 

const app = express();

connectDB();
app.use('/api/auth', authRoutes);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

const PORT = process.env.PORT || 5000;

app.get('/', (req, res)=>{
    res.send("backend is alive")
})

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
})




