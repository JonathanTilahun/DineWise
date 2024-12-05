import React, { useState, useEffect } from "react";

function GetRestaurantReview() {
  const [searchQuery, setSearchQuery] = useState(""); // User input
  const [suggestions, setSuggestions] = useState([]); // Autocomplete suggestions
  const [selectedPlaceId, setSelectedPlaceId] = useState(null); // Selected place ID
  const [restaurantData, setRestaurantData] = useState(null); // Fetched restaurant data
  const [errorMessage, setErrorMessage] = useState(""); // Error handling
  const [userLocation, setUserLocation] = useState(null); // User's geolocation
  const [isAnalyzingMore, setIsAnalyzingMore] = useState(false); // State for "Analyze More" button

  // Fetch user's location on page load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setErrorMessage("Unable to access your location. Using default location.");
          setUserLocation({ lat: 36.1627, lng: -86.7816 }); // Default: Nashville
        }
      );
    } else {
      setErrorMessage("Geolocation is not supported by your browser.");
    }
  }, []);

  // Fetch autocomplete suggestions
  const handleInputChange = async (e) => {
    const input = e.target.value;
    setSearchQuery(input);

    if (input.trim() === "") {
      setSuggestions([]);
      return;
    }

    if (!userLocation) {
      setErrorMessage("Location not available yet. Please try again later.");
      return;
    }

    try {
      const response = await fetch("http://localhost:2000/autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          location: userLocation,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuggestions(data.suggestions || []); // Show autocomplete suggestions
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching autocomplete suggestions:", error);
      setSuggestions([]);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = async (description, place_id) => {
    setSearchQuery(description); // Set search query to selected description
    setSuggestions([]); // Clear suggestions
    setSelectedPlaceId(place_id); // Save the selected place ID

    // Fetch place details using the selected place_id
    try {
      const response = await fetch("http://localhost:2000/getRestaurant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restaurant: place_id }), // Send place_id
      });

      const data = await response.json();

      if (response.ok) {
        setRestaurantData(data.results); // Show restaurant details
        setErrorMessage(""); // Clear errors
        setIsAnalyzingMore(false); // Reset "Analyze More" state
      } else {
        setRestaurantData(null);
        setErrorMessage(data.message || "Error fetching details.");
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      setErrorMessage("Unable to fetch data. Please try again.");
    }
  };

  // Handle "Analyze More" button
  const handleAnalyzeMore = async () => {
    if (!restaurantData || !restaurantData.reviews) {
      setErrorMessage("No reviews available to analyze.");
      return;
    }

    setIsAnalyzingMore(true); // Show loading state

    try {
      const response = await fetch("http://localhost:2000/analyze-more", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviews: restaurantData.reviews }), // Send reviews to backend
      });

      const data = await response.json();

      if (response.ok) {
        setRestaurantData((prev) => ({
          ...prev,
          summary: data.detailedSummary, // Update the summary with the detailed response
        }));
        setErrorMessage("");
      } else {
        setErrorMessage(data.message || "Error analyzing more.");
      }
    } catch (error) {
      console.error("Error analyzing more:", error);
      setErrorMessage("Unable to analyze more. Please try again.");
    } finally {
      setIsAnalyzingMore(false); // Reset loading state
    }
  };

  return (
    <div className="container">
      <h1 className="title">Get a Restaurant Review</h1>
      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder="Search for a restaurant..."
          className="search-input"
        />
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() =>
                  handleSuggestionClick(
                    suggestion.description,
                    suggestion.place_id
                  )
                }
                className="suggestion-item"
              >
                {suggestion.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      {errorMessage && <p className="error">{errorMessage}</p>}

      {restaurantData && (
        <div className="result-container">
          <h2>{restaurantData.name}</h2>
          <p>Address: {restaurantData.address}</p>
          <p>Rating: {restaurantData.rating}</p>
          <h3>Summary</h3>
          <p>{restaurantData.summary}</p>

          <button
            onClick={handleAnalyzeMore}
            className="analyze-more-btn"
            disabled={isAnalyzingMore}
          >
            {isAnalyzingMore ? "Analyzing..." : "Analyze More"}
          </button>

          {/* Display Photos */}
          {restaurantData.photos && restaurantData.photos.length > 0 && (
            <div className="photos-container">
              {restaurantData.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo.url}
                  alt={`${restaurantData.name || "Restaurant"} Photo ${index + 1}`}
                  className="restaurant-photo"
                />
              ))}
            </div>
          )}
        </div>
      )}
      {!errorMessage && !restaurantData && (
        <p className="instructions">Enter a search above to see details!</p>
      )}
    </div>
  );
}

export default GetRestaurantReview;
