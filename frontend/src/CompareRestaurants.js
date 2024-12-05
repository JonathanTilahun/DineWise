import React, { useState, useEffect } from "react";

function CompareRestaurants() {
  const [searchQuery1, setSearchQuery1] = useState(""); // First restaurant query
  const [searchQuery2, setSearchQuery2] = useState(""); // Second restaurant query
  const [suggestions1, setSuggestions1] = useState([]); // Suggestions for first search bar
  const [suggestions2, setSuggestions2] = useState([]); // Suggestions for second search bar
  const [selectedPlaceId1, setSelectedPlaceId1] = useState(null); // Selected place ID for first restaurant
  const [selectedPlaceId2, setSelectedPlaceId2] = useState(null); // Selected place ID for second restaurant
  const [comparisonResult, setComparisonResult] = useState(null); // Comparison result
  const [photos1, setPhotos1] = useState([]); // Photos for first restaurant
  const [photos2, setPhotos2] = useState([]); // Photos for second restaurant
  const [errorMessage, setErrorMessage] = useState(""); // Error handling
  const [userLocation, setUserLocation] = useState(null); // User's geolocation

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
        (error) => {
          console.error("Error fetching geolocation:", error);
          setErrorMessage("Unable to access your location. Using default location.");
          setUserLocation({ lat: 36.1627, lng: -86.7816 }); // Default: Nashville
        }
      );
    } else {
      console.error("Geolocation not supported by this browser.");
      setErrorMessage("Geolocation is not supported by your browser.");
    }
  }, []);

  // Fetch autocomplete suggestions for a search bar
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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuggestions(data.suggestions); // Show autocomplete suggestions
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching autocomplete suggestions:", error);
      setSuggestions([]);
    }
  };

  // Fetch details and photos for restaurants
  const fetchRestaurantDetails = async (placeId, setPhotos) => {
    try {
      const response = await fetch("http://localhost:2000/getRestaurant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restaurant: placeId }), // Send place_id
      });

      const data = await response.json();

      if (response.ok && data.results) {
        setPhotos(data.results.photos || []); // Set photos if available
      } else {
        setErrorMessage(data.message || "Error fetching restaurant details.");
      }
    } catch (error) {
      console.error("Error fetching restaurant details:", error);
      setErrorMessage("Unable to fetch data. Please try again.");
    }
  };

  // Fetch comparison result and photos for both restaurants
  const handleCompare = async () => {
    if (!selectedPlaceId1 || !selectedPlaceId2) {
      setErrorMessage("Please select two restaurants to compare.");
      return;
    }

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
        setComparisonResult(data.comparison); // Set comparison result
        setErrorMessage(""); // Clear errors

        // Fetch photos for both restaurants
        fetchRestaurantDetails(selectedPlaceId1, setPhotos1);
        fetchRestaurantDetails(selectedPlaceId2, setPhotos2);
      } else {
        setComparisonResult(null);
        setErrorMessage(data.message || "Error fetching comparison.");
      }
    } catch (error) {
      console.error("Error fetching comparison:", error);
      setErrorMessage("Unable to fetch data. Please try again.");
    }
  };

  return (
    <div style={{ fontFamily: "Arial", padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>Compare Two Restaurants</h1>
      <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
        <div style={{ position: "relative", width: "300px" }}>
          <input
            type="text"
            value={searchQuery1}
            onChange={(e) => {
              setSearchQuery1(e.target.value);
              fetchSuggestions(e.target.value, setSuggestions1);
            }}
            placeholder="Search for the first restaurant..."
            style={{ padding: "10px", width: "100%" }}
          />
          {suggestions1.length > 0 && (
            <ul
              style={{
                position: "absolute",
                top: "40px",
                left: "0",
                border: "1px solid #ccc",
                width: "100%",
                marginTop: "5px",
                padding: "10px",
                listStyle: "none",
                backgroundColor: "#fff",
                zIndex: 1000,
              }}
            >
              {suggestions1.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => {
                    setSearchQuery1(suggestion.description);
                    setSuggestions1([]);
                    setSelectedPlaceId1(suggestion.place_id);
                  }}
                  style={{ cursor: "pointer", marginBottom: "5px" }}
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ position: "relative", width: "300px" }}>
          <input
            type="text"
            value={searchQuery2}
            onChange={(e) => {
              setSearchQuery2(e.target.value);
              fetchSuggestions(e.target.value, setSuggestions2);
            }}
            placeholder="Search for the second restaurant..."
            style={{ padding: "10px", width: "100%" }}
          />
          {suggestions2.length > 0 && (
            <ul
              style={{
                position: "absolute",
                top: "40px",
                left: "0",
                border: "1px solid #ccc",
                width: "100%",
                marginTop: "5px",
                padding: "10px",
                listStyle: "none",
                backgroundColor: "#fff",
                zIndex: 1000,
              }}
            >
              {suggestions2.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => {
                    setSearchQuery2(suggestion.description);
                    setSuggestions2([]);
                    setSelectedPlaceId2(suggestion.place_id);
                  }}
                  style={{ cursor: "pointer", marginBottom: "5px" }}
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

      {comparisonResult && (
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <h3>Comparison</h3>
          <p>{comparisonResult}</p>
        </div>
      )}

<div
  style={{
    marginTop: "40px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: "40px", // Add spacing between the two sections
    textAlign: "center",
  }}
>
  {/* First Restaurant Photos */}
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

  {/* Second Restaurant Photos */}
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

    </div>
  );
}

export default CompareRestaurants;

