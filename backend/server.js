const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { OpenAI } = require('openai');
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

    if (!restaurant) {
        return res.status(400).json({ message: 'Invalid restaurant data' });
    }

    const isPlaceId = restaurant.startsWith("ChIJ");

    let apiUrl;
    if (isPlaceId) {
        apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            restaurant
        )}&fields=name,formatted_address,rating,user_ratings_total,reviews,photos&key=${GOOGLE_API_KEY}`;
    } else {
        apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            restaurant
        )}&key=${GOOGLE_API_KEY}`;
    }

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === "OK") {
            if (isPlaceId && data.result) {
                const place = data.result;
                const reviews = place.reviews
                    ? place.reviews.slice(0, 10).map((review) => ({
                          author: review.author_name,
                          text: review.text,
                          rating: review.rating,
                      }))
                    : [];

                // Get photos from Google API
                const photos = place.photos
                    ? place.photos.slice(0, 5).map((photo) => ({
                          url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`,
                      }))
                    : [];

                const summary = await summarizeReviews(reviews);

                res.json({
                    message: "Success",
                    results: {
                        name: place.name,
                        address: place.formatted_address,
                        rating: place.rating || "No rating available",
                        reviewsCount: place.user_ratings_total || "No reviews",
                        reviews,
                        summary,
                        photos, // Include photos in the response
                    },
                });
            } else if (data.results && data.results.length > 0) {
                const place = data.results[0];
                res.json({
                    message: "Success",
                    results: {
                        name: place.name,
                        address: place.formatted_address,
                        rating: place.rating || "No rating available",
                        reviewsCount: place.user_ratings_total || "No reviews",
                        reviews: [],
                        summary: "No reviews available to summarize",
                        photos: [], // Text Search API may not return photos
                    },
                });
            } else {
                res.status(404).json({ message: "Restaurant not found" });
            }
        } else {
            res.status(404).json({ message: "Restaurant not found" });
        }
    } catch (error) {
        console.error("Error fetching restaurant data:", error);
        res.status(500).json({ message: "Internal server error" });
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
    const { input, location } = req.body;

    if (!input || !location || !location.lat || !location.lng) {
        return res.status(400).json({ message: 'Invalid input or location data' });
    }

    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
    )}&location=${location.lat},${location.lng}&radius=50000&key=${GOOGLE_API_KEY}`;

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

    if (!placeId1 || !placeId2) {
        return res.status(400).json({ message: 'Both restaurant IDs are required for comparison.' });
    }

    try {
        // Fetch details for the first restaurant
        const response1 = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId1}&fields=name,reviews&key=${GOOGLE_API_KEY}`);
        const data1 = await response1.json();
        const reviews1 = data1.result.reviews.map((review) => review.text).join("\n");

        // Fetch details for the second restaurant
        const response2 = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId2}&fields=name,reviews&key=${GOOGLE_API_KEY}`);
        const data2 = await response2.json();
        const reviews2 = data2.result.reviews.map((review) => review.text).join("\n");

        // Combine reviews into one prompt
        const combinedReviews = `Restaurant 1 (${data1.result.name}):\n${reviews1}\n\nRestaurant 2 (${data2.result.name}):\n${reviews2}`;

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
        console.error("Error comparing restaurants:", error);
        res.status(500).json({ message: "Unable to compare restaurants at this time." });
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
                    content: `Here are some reviews for a restaurant. Please analyze them in greater detail, highlighting the most common themes, strengths, weaknesses, and any notable patterns. Keep it as plane text without any titles or bodling adn stuff because I am not formatting them in browser:
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
