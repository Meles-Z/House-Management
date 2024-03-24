// Import required modules
const express = require('express');
const { createCanvas, loadImage } = require('canvas');
const qr = require('qrcode');
const { PNG } = require('pngjs');
const seedrandom = require('seedrandom');
const fs = require('fs');
const gf256 = require('./gf256'); // Assuming this file contains gf256 module
const coding = require('./coding'); // Assuming this file contains coding module

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define routes
app.post('/generateQR', async (req, res) => {
    try {
        // Extract parameters from request body
        const { data, version, mask, scale } = req.body;

        // Create QR code
        const qrCode = await qr.toDataURL(data, {
            version: version || undefined,
            maskPattern: mask || undefined,
            scale: scale || 1
        });

        res.send(qrCode);
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).send('Error generating QR code');
    }
});

app.post('/decodeImage', async (req, res) => {
    try {
        // Assuming image data is sent in the request body as base64 string
        const imageData = req.body.imageData;

        // Decode image data
        const decodedData = await decodeImage(imageData);

        res.send(decodedData);
    } catch (error) {
        console.error('Error decoding image data:', error);
        res.status(500).send('Error decoding image data');
    }
});

// Function to decode image data
async function decodeImage(imageData) {
    // Create a new PNG object
    const png = new PNG();
    
    // Decode base64 image data
    const buffer = Buffer.from(imageData, 'base64');

    // Parse PNG buffer
    await new Promise((resolve, reject) => {
        png.parse(buffer, (error, data) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });

    // Convert PNG data to image
    const image = await createImage(png);

    return image;
}

// Function to create image from PNG data
async function createImage(png) {
    // Create a new Canvas
    const canvas = createCanvas(png.width, png.height);
    const ctx = canvas.getContext('2d');

    // Draw PNG data onto the canvas
    ctx.drawImage(png.data, 0, 0);

    // Convert canvas to base64 image
    const imageData = canvas.toDataURL();

    return imageData;
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
