const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Uploads folder setup
const upload = multer({ dest: 'uploads/' });

// AI Analysis API Endpoint
app.post('/api/analyze', upload.single('eeg_file'), (req, res) => {
    // 1. Check if file exists
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const filePath = path.resolve(req.file.path);
    console.log([INFO] Received file: ${req.file.originalname}. Processing...);

    // 2. Spawn the Python AI Engine
    // Make sure 'python' command works in your terminal. If it's 'python3', change it here.
    const pythonProcess = spawn('python', ['./ai_engine/analyzer.py', filePath]);

    let resultData = '';
    let errorData = '';

    // Capture output from Python
    pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
    });

    // Capture errors from Python
    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    // 3. Handle process completion
    pythonProcess.on('close', (code) => {
        // CLEANUP: Delete the temporary CSV file to save disk space
        fs.unlink(filePath, (err) => {
            if (err) console.error("[ERROR] Failed to delete temp file:", err);
        });

        if (code !== 0) {
            console.error([ERROR] Python script crashed:\n${errorData});
            return res.status(500).json({ status: 'error', message: 'AI Engine failed.' });
        }

        try {
            // Send results back to Frontend
            const parsedResult = JSON.parse(resultData);
            res.json(parsedResult);
            console.log([SUCCESS] Analysis complete for ${req.file.originalname});
        } catch (parseError) {
            console.error("[ERROR] Parsing output:", resultData);
            res.status(500).json({ status: 'error', message: 'Invalid AI response.' });
        }
    });
});

app.listen(PORT, () => {
    console.log(🚀 NEURO-SCAN Backend running on http://localhost:${PORT});
});