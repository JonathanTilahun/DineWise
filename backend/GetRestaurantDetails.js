const fetch = require("node-fetch");
require('dotenv').config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY
const TRIPADVISOR_API_KEY = process.env.TRIPADVISOR_API_KEY

async function getRestaurantDetails(placeId, maxReviews = 25) {
    if (!placeId || !placeId.startsWith("ChIJ")) {
        throw new Error("Invalid Place ID. Only valid Place IDs are supported.");
    }

    // Fetch Google details
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
    )}&fields=name,formatted_address,rating,user_ratings_total,photos&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(detailsUrl);
    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
        throw new Error(`Failed to fetch restaurant details for placeId: ${placeId}`);
    }

    const place = data.result;
    const combinedReviews = await getCombinedReviews(
        placeId,
        place.rating,
        place.user_ratings_total,
        place.name,
        place.formatted_address,
        maxReviews
    );

    const photos = (place.photos || []).slice(0, 5).map((photo) => ({
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`,
    }));

    return {
        name: place.name,
        address: place.formatted_address,
        rating: combinedReviews.rating,
        reviewsCount: combinedReviews.reviewsCount,
        reviews: combinedReviews.reviews,
        photos,
    };
}

async function getCombinedReviews(placeId, googleRating, googleTotalReviews, name, location, maxReviews = 25) {
    try {

        const googleReviews = await getGoogleReviews(placeId, maxReviews);
        const yelpDetails = await getYelpDetails(name, location, maxReviews);
        const tripAdvisorDetails = await getTripAdvisorDetails(name, location, maxReviews)

        const combinedReviews = [];
        googleReviews.forEach((review) => combinedReviews.push(review));
        yelpDetails.reviews.forEach((review) => combinedReviews.push(review));
        tripAdvisorDetails.reviews.forEach((review) => combinedReviews.push(review));

        const totalReviewsCount = googleTotalReviews + yelpDetails.reviewsCount + tripAdvisorDetails.reviewsCount;

        const totalGoogleRating = googleRating * (googleTotalReviews / totalReviewsCount)
        const totalYelpRating = yelpDetails.rating * (yelpDetails.reviewsCount / totalReviewsCount);
        const totalTripAdvisorRating = tripAdvisorDetails.rating * (tripAdvisorDetails.reviewsCount / totalReviewsCount)
        const finalRating = totalGoogleRating + totalYelpRating + totalTripAdvisorRating

        return {
            reviews: combinedReviews,
            rating: finalRating.toFixed(2), // Round to 2 decimal places
            reviewsCount: totalReviewsCount,
        };
    } catch (error) {
        console.error("Error combining reviews:", error.message);
        throw error;
    }
}

async function getGoogleReviews(placeId, maxReviews = 25) {
    try {
        if (!placeId || !placeId.startsWith("ChIJ")) {
            throw new Error("Invalid Place ID. Only valid Place IDs are supported.");
        }

        // Google Place Details API URL
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            placeId
        )}&fields=name,rating,reviews&key=${GOOGLE_API_KEY}`;

        // Fetch details from Google API
        const response = await fetch(detailsUrl);
        const data = await response.json();

        if (data.status !== "OK" || !data.result || !data.result.reviews) {
            throw new Error(`Failed to fetch Google reviews for placeId: ${placeId}`);
        }

        // Process and return reviews
        return data.result.reviews.slice(0, maxReviews).map((review) => ({
            platform: "Google",
            author: review.author_name,
            text: review.text,
            rating: review.rating,
        }));
    } catch (error) {
        console.error(`Error in getGoogleReviews for placeId: ${placeId}`, error.message);
        return []; // Return an empty array on error
    }
}

async function getYelpDetails(restaurantName, location, maxReviews = 25) {
    try {
        // Yelp business search endpoint
        const searchUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(
            restaurantName
        )}&location=${encodeURIComponent(location)}&limit=1`;

        const searchResponse = await fetch(searchUrl, {
            headers: {
                Authorization: `Bearer ${YELP_API_KEY}`,
            },
        });

        const searchData = await searchResponse.json();

        if (!searchData.businesses || searchData.businesses.length === 0) {
            throw new Error(`No Yelp results found for ${restaurantName} in ${location}`);
        }

        const business = searchData.businesses[0];
        const businessId = business.id;

        // Yelp reviews endpoint
        const reviewsUrl = `https://api.yelp.com/v3/businesses/${businessId}/reviews`;

        // Number of reviews is very limited in standard version
        const reviewsResponse = await fetch(reviewsUrl, {
            headers: {
                Authorization: `Bearer ${YELP_API_KEY}`,
            },
        });

        const reviewsData = await reviewsResponse.json();
        const reviews = (reviewsData.reviews || []).slice(0, maxReviews).map((review) => ({
            platform: "Yelp",
            author: review.user.name,
            text: review.text,
            rating: review.rating,
        }));
        return {
            reviews,
            rating: business.rating,
            reviewsCount: business.review_count,
        };
    } catch (error) {
        console.error(`Error in getYelpDetails for ${restaurantName}:`, error.message);
        return {
            reviews: [],
            rating: null,
            reviewsCount: 0,
        };
    }
}

async function getTripAdvisorDetails(restaurantName, location, maxReviews = 25) {
    try {
        // TripAdvisor search endpoint
        const searchUrl = `https://api.content.tripadvisor.com/api/v1/location/search?searchQuery=${encodeURIComponent(
            restaurantName
        )}&address=${encodeURIComponent(location.substring(0, 2))}&key=${TRIPADVISOR_API_KEY}`;  
        // Adress lookup is exclusive and may not line up exactly so only taking first two numbers to limit results

        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchData.data || searchData.data.length === 0) {
            console.warn(`No TripAdvisor results found for ${restaurantName}`);
            return {
                reviews: [],
                rating: null,
                reviewsCount: 0,
            };
        }

        const business = searchData.data[0];
        const businessId = business.location_id;
        const reviewsUrl = `https://api.content.tripadvisor.com/api/v1/location/${businessId}/reviews?key=${TRIPADVISOR_API_KEY}`;  
        const reviewsResponse = await fetch(reviewsUrl);
        const reviewsData = await reviewsResponse.json();
        if (!reviewsData.data || reviewsData.length === 0) {
            console.warn(`No reviews found for TripAdvisor business ID ${businessId}`);
            return {
                reviews: [],
                rating: 5.0,
                reviewsCount: business.num_reviews || 0,
            };
        }

        const reviews = reviewsData.data.slice(0, maxReviews).map((review) => ({
            platform: "TripAdvisor",
            author: review.user.name,
            text: review.text,
            rating: review.rating,
        }));
        const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${businessId}/details?key=${TRIPADVISOR_API_KEY}`;  
        const detailsReponse = await fetch(detailsUrl);
        const detailsData = await detailsReponse.json();
        return {
            reviews,
            rating: Number(detailsData['rating']) || null,
            reviewsCount: Number(detailsData['num_reviews']) || 0,
        };
    } catch (error) {
        console.error(`Error in getTripAdvisorDetails for ${restaurantName}:`, error.message);
        return {
            reviews: [],
            rating: 5.0,
            reviewsCount: 0,
        };
    }
}

async function getGoogleReviews(placeId, maxReviews = 25) {
    try {
        if (!placeId || !placeId.startsWith("ChIJ")) {
            throw new Error("Invalid Place ID. Only valid Place IDs are supported.");
        }

        // Google Place Details API URL
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            placeId
        )}&fields=name,rating,reviews&key=${GOOGLE_API_KEY}`;

        // Fetch details from Google API
        const response = await fetch(detailsUrl);
        const data = await response.json();

        if (data.status !== "OK" || !data.result || !data.result.reviews) {
            throw new Error(`Failed to fetch Google reviews for placeId: ${placeId}`);
        }

        // Process and return reviews
        return data.result.reviews.slice(0, maxReviews).map((review) => ({
            platform: "Google",
            author: review.author_name,
            text: review.text,
            rating: review.rating,
        }));
    } catch (error) {
        console.error(`Error in getGoogleReviews for placeId: ${placeId}`, error.message);
        return []; // Return an empty array on error
    }
}
module.exports = {
    getRestaurantDetails,
};