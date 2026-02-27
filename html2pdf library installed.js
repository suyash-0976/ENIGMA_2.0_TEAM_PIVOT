const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5005; 

app.use(cors()); 
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: uploadDir });

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running perfectly on port 5005!' });
});

app.post('/api/analyze', upload.any(), (req, res) => {
    console.log("📥 Frontend se request aayi!"); 

    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
    
    const patientId = req.body.patientId || 'UNKNOWN';
    const patientAge = req.body.patientAge || 'N/A';
    const patientGender = req.body.patientGender || 'N/A';
    
    if (!uploadedFile) {
        return res.status(400).json({ error: 'File upload nahi hui.' });
    }

    const scriptPath = path.join(__dirname, 'ai_engine', 'analyzer.py');
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
        if (fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path); 
        }

        if (code !== 0) {
            console.error("💥 Python Crash:", errorData);
            return res.status(500).json({ error: 'Python Crash', details: errorData });
        }

        try {
            // 🔥 HACKATHON FIX: Extract EXACTLY the JSON part, ignoring any hidden Python text/warnings
            const startIndex = resultData.indexOf('{');
            const endIndex = resultData.lastIndexOf('}');
            
            if (startIndex === -1 || endIndex === -1) {
                throw new Error("No JSON object found in Python output");
            }

            const cleanJsonString = resultData.substring(startIndex, endIndex + 1);
            const jsonData = JSON.parse(cleanJsonString);
            
            // 🔥 THE RESEARCH DATASET PIPELINE 🔥
            const dbPath = path.join(__dirname, 'research_database.csv');
            
            if (!fs.existsSync(dbPath)) {
                fs.writeFileSync(dbPath, "Timestamp,PatientID,Age,Gender,RiskScore_Percent,GammaAlpha_Ratio\n");
            }

            const timestamp = new Date().toISOString();
            const csvLine = `${timestamp},${patientId},${patientAge},${patientGender},${jsonData.risk_score},${jsonData.metrics.gamma_alpha_ratio}\n`;
            
            fs.appendFileSync(dbPath, csvLine);
            console.log("💾 Pipeline Triggered: Clean Anonymized Data added to Research Database!");

            res.json(jsonData);
        } catch (e) {
            console.error("⚠️ Real Parse Error Details:", e.message);
            res.status(500).json({ error: 'Python output parsing error.', details: e.message });
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running smoothly on http://localhost:${PORT}`);
});