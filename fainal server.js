const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
// PORT 5005 kar diya hai taaki Windows par pehle se chal rahi services se conflict na ho
const PORT = 5005; 

// CORS ko empty rakha hai taaki Vite (5173, 5174 etc.) kisi ko bhi block na kare
app.use(cors()); 
app.use(express.json());

// Upload folder strictly current directory me hi banega
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer setup with absolute path
const upload = multer({ dest: uploadDir });

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running perfectly on port 5005!' });
});

// File analysis route
app.post('/api/analyze', upload.any(), (req, res) => {
    console.log("📥 Frontend se request aayi!"); 

    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
    
    if (!uploadedFile) {
        console.log("❌ File upload nahi hui!");
        return res.status(400).json({ error: 'File upload nahi hui.' });
    }

    console.log("✅ File receive hui:", uploadedFile.originalname);

    const scriptPath = path.join(__dirname, 'ai_engine', 'analyzer.py');
    console.log("🚀 Python engine start kar rahe hain...");

    const pythonProcess = spawn('python', [scriptPath, uploadedFile.path]);

    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
        // Kachra saaf (Delete uploaded file after processing)
        if (fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path); 
        }

        if (code !== 0) {
            console.error("💥 Python Crash: ", errorData);
            return res.status(500).json({ error: 'Python Crash', details: errorData });
        }

        try {
            const jsonData = JSON.parse(resultData);
            console.log("🧠 Analysis Complete! Result sent to Dashboard.");
            res.json(jsonData);
        } catch (e) {
            console.error("⚠️ JSON Error. Python script returned non-JSON format:", resultData);
            res.status(500).json({ error: 'Python output error, check console.', output: resultData });
        }
    });
});

app.listen(PORT, () => {
    console.log(🚀 Backend running smoothly on http://localhost:${PORT});
});