import React, { useState, useEffect } from "react";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function GetRestaurantReview() {
  const [searchQuery, setSearchQuery] = useState(""); 
  const [suggestions, setSuggestions] = useState([]); 
  const [selectedPlaceId, setSelectedPlaceId] = useState(null); 
  const [restaurantData, setRestaurantData] = useState(null); 
  const [errorMessage, setErrorMessage] = useState(""); 
  const [userLocation, setUserLocation] = useState(null); 
  const [isAnalyzingMore, setIsAnalyzingMore] = useState(false); 
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  function addRecentSearch(restaurantName, placeId) {
    const saved = JSON.parse(localStorage.getItem("recentSearches")) || [];
    const updated = [{ name: restaurantName, place_id: placeId }, ...saved.filter(r => r.place_id !== placeId)];
    const limited = updated.slice(0, 10);
    localStorage.setItem("recentSearches", JSON.stringify(limited));
    setRecentSearches(limited);
  }

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
          setUserLocation({ lat: 36.1627, lng: -86.7816 }); 
        }
      );
    } else {
      setErrorMessage("Geolocation is not supported by your browser.");
    }

    const saved = JSON.parse(localStorage.getItem("recentSearches")) || [];
    setRecentSearches(saved);
  }, []);

  const handleInputChange = async (e) => {
    const input = e.target.value;
    setSearchQuery(input);
    setShowDropdown(true);

    if (input.trim() === "") {
      setSuggestions([]);
      return;
    }

    if (!userLocation) {
      setErrorMessage("Location not available yet. Please try again later.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/autocomplete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          location: userLocation,
          types: "bakery|bar|cafe|restaurant|store"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuggestions(data.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = async (description, place_id) => {
    setSearchQuery(description);
    setSuggestions([]);
    setSelectedPlaceId(place_id);
    addRecentSearch(description, place_id);
    setShowDropdown(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/getRestaurant`, {
          method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant: place_id }),
      });

      const data = await response.json();
      setLoading(false);
      if (response.ok) {
        setRestaurantData(data.results);
        setErrorMessage("");
        setIsAnalyzingMore(false);
      } else {
        setRestaurantData(null);
        setErrorMessage(data.message || "Error fetching details.");
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      setLoading(false);
      setErrorMessage("Unable to fetch data. Please try again.");
    }
  };

  const handleAnalyzeMore = async () => {
    if (!restaurantData || !restaurantData.reviews) {
      setErrorMessage("No reviews available to analyze.");
      return;
    }

    setIsAnalyzingMore(true);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze-more`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: restaurantData.reviews }),
      });

      const data = await response.json();

      if (response.ok) {
        setRestaurantData((prev) => ({
          ...prev,
          summary: data.detailedSummary,
        }));
        setErrorMessage("");
      } else {
        setErrorMessage(data.message || "Error analyzing more.");
      }
    } catch (error) {
      console.error("Error analyzing more:", error);
      setErrorMessage("Unable to analyze more. Please try again.");
    } finally {
      setIsAnalyzingMore(false);
    }
  };

  const handleRecentSearchClick = (item) => {
    handleSuggestionClick(item.name, item.place_id);
  };

  return (
    <div className="container">
      {/* Fixed-position sidebar on the far left */}
      <div className="sidebar">
        <h3>Recent Searches</h3>
        <ul className="recent-searches">
          {recentSearches.map((item, index) => (
            <li
              key={index}
              className="recent-search-item"
              onClick={() => handleRecentSearchClick(item)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="main-content">
        <h1 className="title">Get a Restaurant Review</h1>
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search for a restaurant..."
            className="search-input"
          />
          {showDropdown && searchQuery.trim() !== "" && suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() =>
                    handleSuggestionClick(suggestion.description, suggestion.place_id)
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

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
          </div>
        )}

        {!loading && restaurantData && (
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
        {!loading && !errorMessage && !restaurantData && (
          <p className="instructions">Enter a search above to see details!</p>
        )}
      </div>
    </div>
  );
}

export default GetRestaurantReview;
