const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Uploads folder setup
const upload = multer({ dest: 'uploads/' });

// Basic Route for testing
app.get('/', (req, res) => {
    res.send("NEURO-SCAN AI Backend is running!");
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});