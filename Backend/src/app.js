import express from 'express';
import cors from 'cors';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check / base route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is up and running',
    });
});

export default app;
