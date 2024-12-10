import React, { useState, useEffect } from "react";

function CompareRestaurants() {
  const [searchQuery1, setSearchQuery1] = useState(""); 
  const [searchQuery2, setSearchQuery2] = useState(""); 
  const [suggestions1, setSuggestions1] = useState([]); 
  const [suggestions2, setSuggestions2] = useState([]); 
  const [selectedPlaceId1, setSelectedPlaceId1] = useState(null); 
  const [selectedPlaceId2, setSelectedPlaceId2] = useState(null); 
  const [comparisonResult, setComparisonResult] = useState(null);
  const [photos1, setPhotos1] = useState([]);
  const [photos2, setPhotos2] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);
  const [loading, setLoading] = useState(false);

  // Updated addRecentSearch to store objects like in GetRestaurantReview
  function addRecentSearch(restaurantName, placeId) {
    const saved = JSON.parse(localStorage.getItem("recentSearches")) || [];
    // Filter out duplicates by place_id
    const updated = [{ name: restaurantName, place_id: placeId }, ...saved.filter(r => r.place_id !== placeId)];
    const limited = updated.slice(0, 3);
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
        (error) => {
          console.error("Error fetching geolocation:", error);
          setErrorMessage("Unable to access your location. Using default location.");
          setUserLocation({ lat: 36.1627, lng: -86.7816 });
        }
      );
    } else {
      console.error("Geolocation not supported by this browser.");
      setErrorMessage("Geolocation is not supported by your browser.");
    }

    const saved = JSON.parse(localStorage.getItem("recentSearches")) || [];
    setRecentSearches(saved);
  }, []);

  const fetchSuggestions = async (input, setSuggestions) => {
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
          types: "bakery|bar|cafe|restaurant|store"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching autocomplete suggestions:", error);
      setSuggestions([]);
    }
  };

  const fetchRestaurantDetails = async (placeId, setPhotos) => {
    try {
      const response = await fetch("http://localhost:2000/getRestaurant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restaurant: placeId }),
      });

      const data = await response.json();

      if (response.ok && data.results) {
        setPhotos(data.results.photos || []);
      } else {
        setErrorMessage(data.message || "Error fetching restaurant details.");
      }
    } catch (error) {
      console.error("Error fetching restaurant details:", error);
      setErrorMessage("Unable to fetch data. Please try again.");
    }
  };

  const handleCompare = async () => {
    if (!selectedPlaceId1 || !selectedPlaceId2) {
      setErrorMessage("Please select two restaurants to compare.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:2000/compare-restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeId1: selectedPlaceId1,
          placeId2: selectedPlaceId2,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setComparisonResult(data.comparison);
        setErrorMessage("");
        // Fetch photos for both restaurants in parallel
        await Promise.all([
          fetchRestaurantDetails(selectedPlaceId1, setPhotos1),
          fetchRestaurantDetails(selectedPlaceId2, setPhotos2),
        ]);
      } else {
        setComparisonResult(null);
        setErrorMessage(data.message || "Error fetching comparison.");
      }
    } catch (error) {
      console.error("Error fetching comparison:", error);
      setErrorMessage("Unable to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSearchClickForFirst = (item) => {
    // When a recent search is clicked for the first search box
    setSearchQuery1(item.name);
    setSelectedPlaceId1(item.place_id);
    setShowDropdown1(false);
    // Also trigger addRecentSearch to update its position in the list
    addRecentSearch(item.name, item.place_id);
  };

  const handleRecentSearchClickForSecond = (item) => {
    // When a recent search is clicked for the second search box
    setSearchQuery2(item.name);
    setSelectedPlaceId2(item.place_id);
    setShowDropdown2(false);
    // Update recent search order
    addRecentSearch(item.name, item.place_id);
  };

  const handleSuggestionClickForFirst = (suggestion) => {
    setSearchQuery1(suggestion.description);
    setSuggestions1([]);
    setSelectedPlaceId1(suggestion.place_id);
    setShowDropdown1(false);
    addRecentSearch(suggestion.description, suggestion.place_id);
  };

  const handleSuggestionClickForSecond = (suggestion) => {
    setSearchQuery2(suggestion.description);
    setSuggestions2([]);
    setSelectedPlaceId2(suggestion.place_id);
    setShowDropdown2(false);
    addRecentSearch(suggestion.description, suggestion.place_id);
  };

  return (
    <div style={{ fontFamily: "Arial", padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>Compare Two Restaurants</h1>
      
      <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
        
        {/* First search box */}
        <div style={{ position: "relative", width: "300px" }}>
          <input
            type="text"
            value={searchQuery1}
            onChange={(e) => {
              setSearchQuery1(e.target.value);
              fetchSuggestions(e.target.value, setSuggestions1);
              setShowDropdown1(true);
            }}
            placeholder="Search for the first restaurant..."
            style={{ padding: "10px", width: "100%" }}
          />
          {showDropdown1 && searchQuery1.trim() !== "" && (recentSearches.length > 0 || suggestions1.length > 0) && (
            <ul className="suggestions">
              {/* Recent Searches for the first box */}
              {recentSearches.map((item, index) => (
                <li
                  key={"recent1-" + index}
                  className="suggestion-item"
                  onClick={() => handleRecentSearchClickForFirst(item)}
                >
                  {item.name} (Recent)
                </li>
              ))}

              {/* Suggestions for the first box */}
              {suggestions1.map((suggestion, index) => (
                <li
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClickForFirst(suggestion)}
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Second search box */}
        <div style={{ position: "relative", width: "300px" }}>
          <input
            type="text"
            value={searchQuery2}
            onChange={(e) => {
              setSearchQuery2(e.target.value);
              fetchSuggestions(e.target.value, setSuggestions2);
              setShowDropdown2(true);
            }}
            placeholder="Search for the second restaurant..."
            style={{ padding: "10px", width: "100%" }}
          />
          {showDropdown2 && searchQuery2.trim() !== "" && (recentSearches.length > 0 || suggestions2.length > 0) && (
            <ul className="suggestions">
              {/* Recent Searches for the second box */}
              {recentSearches.map((item, index) => (
                <li
                  key={"recent2-" + index}
                  className="suggestion-item"
                  onClick={() => handleRecentSearchClickForSecond(item)}
                >
                  {item.name} (Recent)
                </li>
              ))}

              {/* Suggestions for the second box */}
              {suggestions2.map((suggestion, index) => (
                <li
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClickForSecond(suggestion)}
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button
        onClick={handleCompare}
        style={{
          padding: "10px 20px",
          fontSize: "18px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          display: "block",
          margin: "20px auto",
        }}
      >
        Compare
      </button>

      {errorMessage && <p style={{ color: "red", marginTop: "20px", textAlign: "center" }}>{errorMessage}</p>}

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
        </div>
      )}

      {!loading && comparisonResult && (
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <h3>Comparison</h3>
          <p>{comparisonResult}</p>
        </div>
      )}

      {!loading && (
        <div
          style={{
            marginTop: "40px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "40px",
            textAlign: "center",
            maxWidth: "100%",
            margin: "0 auto",
          }}
        >
          {photos1.length > 0 && (
            <div style={{ flex: "1" }}>
              <h3>{searchQuery1 || "First Restaurant"} Photos</h3>
              <div
                style={{
                  display: "flex",
                  overflowX: "scroll",
                  gap: "10px",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  justifyContent: "center",
                }}
              >
                {photos1.map((photo, index) => (
                  <img
                    key={index}
                    src={photo.url}
                    alt={`First Restaurant Photo ${index + 1}`}
                    style={{
                      width: "150px",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "5px",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {photos2.length > 0 && (
            <div style={{ flex: "1" }}>
              <h3>{searchQuery2 || "Second Restaurant"} Photos</h3>
              <div
                style={{
                  display: "flex",
                  overflowX: "scroll",
                  gap: "10px",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  justifyContent: "center",
                }}
              >
                {photos2.map((photo, index) => (
                  <img
                    key={index}
                    src={photo.url}
                    alt={`Second Restaurant Photo ${index + 1}`}
                    style={{
                      width: "150px",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "5px",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompareRestaurants;
