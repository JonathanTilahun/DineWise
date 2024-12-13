const AWS = require('aws-sdk');

AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'Restaurants'; 

// Check if restaurant data already exists in DynamoDB
async function getRestaurantData(placeId) {
    const params = {
        TableName: TABLE_NAME,
        Key: { placeId },
    };
    const result = await dynamoDB.get(params).promise();
    return result.Item;
}

// Save new restaurant details to DynamoDB
async function saveRestaurantData(placeId, details, summary) {
    const params = {
        TableName: TABLE_NAME,
        Item: {
            placeId: placeId,
            name: details.name,
            address: details.address,
            rating: details.rating,
            reviewsCount: details.reviewsCount,
            reviews: details.reviews,  // Array of reviews
            photos: details.photos,     // Array of photo URLs
            summary: summary            // The AI generated summary
        },
    };
    await dynamoDB.put(params).promise();
}

module.exports = {
    getRestaurantData,
    saveRestaurantData,
};
