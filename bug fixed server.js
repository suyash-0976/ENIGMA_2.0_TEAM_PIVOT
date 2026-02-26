const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Upload setup - 'uploads' folder mein file save hogi
const upload = multer({ dest: 'uploads/' });

// 'upload.any()' se frontend kisi bhi naam (file ya eeg_file) se bheje, ye accept kar lega
app.post('/api/analyze', upload.any(), (req, res) => {
    
    // File check
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
    
    if (!uploadedFile) {
        return res.status(400).json({ error: 'File upload nahi hui. Frontend check karo.' });
    }

    // Python script ka exact rasta
    const scriptPath = path.join(__dirname, 'ai_engine', 'analyzer.py');

    // Python process ko file path ke sath start karo
    const pythonProcess = spawn('python', [scriptPath, uploadedFile.path]);

    let resultData = '';
    let errorData = '';

    // Data receive karna
    pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
    });

    // Error receive karna
    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    // Process khatam hone par
    pythonProcess.on('close', (code) => {
        // Kaam hone ke baad temporary file delete kar do
        if (fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path);
        }

        if (code !== 0) {
            console.error("🔴 Python Error:", errorData);
            return res.status(500).json({ error: 'Python Crash', details: errorData });
        }

        try {
            const jsonData = JSON.parse(resultData);
            res.json(jsonData);
        } catch (e) {
            console.error("🔴 JSON Parse Error:", resultData);
            res.status(500).json({ error: 'Python ne galat format diya', output: resultData });
        }
    });
});

app.listen(PORT, () => {
    console.log(🚀 NEURO-SCAN Backend running on http://localhost:${PORT});
});