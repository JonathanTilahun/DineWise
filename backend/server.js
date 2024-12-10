const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { OpenAI } = require('openai');
const { getRestaurantDetails } = require('./GetRestaurantDetails');
const app = express();
const PORT = 2000;
require('dotenv').config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Load API key from environment
  });


// Middleware
app.use(cors());
app.use(express.json());


app.post('/getRestaurant', async (req, res) => {
    const { restaurant } = req.body;

    try {
        const details = await getRestaurantDetails(restaurant); // Handles placeId validation internally
        const summary = await summarizeReviews(details.reviews);

        res.json({
            message: "Success",
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

    // Combine reviews into a single string
    const reviewTexts = reviews.map((review) => `${review.author} (${review.rating}★): ${review.text}`).join("\n");

    try {
        // Call OpenAI API with the updated method
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Cheapest option
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

        // Extract the summary from the response
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error calling OpenAI API:", error.status, error.body || error.message);
        return "Unable to generate a summary at this time.";
    }
}


// Autocomplete endpoint
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
        // Fetch details for both restaurants
        const details1 = await getRestaurantDetails(placeId1);
        const details2 = await getRestaurantDetails(placeId2);

        // Combine reviews into one prompt
        const combinedReviews = `Restaurant 1 (${details1.name}):\n${details1.reviews.map((r) => r.text).join("\n")}\n\nRestaurant 2 (${details2.name}):\n${details2.reviews.map((r) => r.text).join("\n")}`;

        // Call OpenAI API for comparison
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


// Endpoint to handle "Analyze More"
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
                    content: `Here are some reviews for a restaurant. Please analyze them in greater detail, highlighting the most common themes, strengths, weaknesses, and any notable patterns. Keep it as plane text without any titles or bolding and stuff because I am not formatting them in browser:
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
