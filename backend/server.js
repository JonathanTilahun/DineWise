const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();
const { getRestaurantDetails } = require('./GetRestaurantDetails');
const { getRestaurantData, saveRestaurantData } = require('./db');

const app = express();
const PORT = 2000;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

app.post('/getRestaurant', async (req, res) => {
    const { restaurant: placeId } = req.body; // The frontend sends a placeId

    try {
        const existing = await getRestaurantData(placeId);
        if (existing) {
            // If it exists, we can just return it
            return res.json({
                message: "Success (from DB)",
                results: existing,
            });
        }

        // If not in DB, fetch details from external APIs
        const details = await getRestaurantDetails(placeId); 
        const summary = await summarizeReviews(details.reviews);

        // ADDED: Save to DynamoDB
        await saveRestaurantData(placeId, details, summary);

        res.json({
            message: "Success (newly fetched)",
            results: {
                name: details.name,
                address: details.address,
                rating: details.rating,
                reviewsCount: details.reviewsCount,
                reviews: details.reviews,
                photos: details.photos,
                summary: summary,
            },
        });
    } catch (error) {
        console.error("Error in /getRestaurant:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// Function to summarize reviews using OpenAI
async function summarizeReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        return "No reviews available to summarize.";
    }

    const reviewTexts = reviews.map((review) => `${review.author} (${review.rating}★): ${review.text}`).join("\n");

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes restaurant reviews.",
                },
                {
                    role: "user",
                    content: `You are an assistant that summarizes customer reviews for restaurants. Based on the following reviews, provide a clear, concise, and overall summary of the restaurant's performance, including key themes, common feedback, strengths, and weaknesses. Do not summarize each review individually, but rather provide a holistic view of what customers are saying overall:
                    ${reviewTexts}`,
                },
            ],
            temperature: 0.7,
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error calling OpenAI API:", error.status, error.body || error.message);
        return "Unable to generate a summary at this time.";
    }
}

// Autocomplete endpoint (no changes needed, just left as is)
app.post('/autocomplete', async (req, res) => {
    const { input, location, types } = req.body;
    if (!input || !location || !location.lat || !location.lng) {
        return res.status(400).json({ message: 'Invalid input or location data' });
    }

    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
    )}&location=${location.lat},${location.lng}&radius=50000&key=${GOOGLE_API_KEY}${
        types ? `&types=${types}` : ''
    }`;
    try {
        const response = await fetch(autocompleteUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.predictions.length > 0) {
            const suggestions = data.predictions.map((prediction) => ({
                description: prediction.description,
                place_id: prediction.place_id,
            }));
            res.json({ message: 'Success', suggestions });
        } else {
            res.status(404).json({ message: 'No suggestions found' });
        }
    } catch (error) {
        console.error('Error fetching autocomplete data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/compare-restaurants', async (req, res) => {
    const { placeId1, placeId2 } = req.body;

    try {
        // For comparing, we can retrieve from DB if already fetched before
        let details1 = await getRestaurantData(placeId1);
        let details2 = await getRestaurantData(placeId2);

        // If not in DB, fetch and store them
        if (!details1) {
            const fetched1 = await getRestaurantDetails(placeId1);
            const sum1 = await summarizeReviews(fetched1.reviews);
            await saveRestaurantData(placeId1, fetched1, sum1);
            details1 = { ...fetched1, summary: sum1 };
        }

        if (!details2) {
            const fetched2 = await getRestaurantDetails(placeId2);
            const sum2 = await summarizeReviews(fetched2.reviews);
            await saveRestaurantData(placeId2, fetched2, sum2);
            details2 = { ...fetched2, summary: sum2 };
        }

        const combinedReviews = `Restaurant 1 (${details1.name}):\n${details1.reviews.map((r) => r.text).join("\n")}\n\nRestaurant 2 (${details2.name}):\n${details2.reviews.map((r) => r.text).join("\n")}`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are an assistant that compares restaurant reviews." },
                { role: "user", content: `Compare these two restaurants based on customer feedback. Give a recommendation to the user based on them. Give plain text without any formatting because this is displayed in my application:\n\n${combinedReviews}` },
            ],
        });

        res.json({ comparison: response.choices[0].message.content.trim() });
    } catch (error) {
        console.error("Error in /compare-restaurants:", error.message);
        res.status(400).json({ message: error.message });
    }
});

app.post('/analyze-more', async (req, res) => {
    const { reviews } = req.body;

    if (!reviews || reviews.length === 0) {
        return res.status(400).json({ message: 'No reviews provided to analyze.' });
    }

    const reviewTexts = reviews.map(
        (review) => `${review.author} (${review.rating}★): ${review.text}`
    ).join("\n");

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that analyzes restaurant reviews in detail.",
                },
                {
                    role: "user",
                    content: `Here are some reviews for a restaurant. Please analyze them in greater detail, highlighting the most common themes, strengths, weaknesses, and any notable patterns. Keep it as plain text without any special formatting:
                    \n\n${reviewTexts}`,
                },
            ],
            temperature: 0.7,
        });

        res.json({
            detailedSummary: response.choices[0].message.content.trim(),
        });
    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        res.status(500).json({ message: "Unable to generate a detailed analysis at this time." });
    }
});

// Test route
app.get('/', (req, res) => {
    res.send('Server is running!');
});

module.exports = app;
