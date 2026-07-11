import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.get('/health', (req, res) => res.json({ ok: true, service: 'githustle-api' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
     console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});