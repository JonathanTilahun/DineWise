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
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);


  function addRecentSearch(restaurantName) {
    const saved = JSON.parse(localStorage.getItem('recentSearches')) || [];
    // Put this search at the front and remove duplicates
    const updated = [restaurantName, ...saved.filter(r => r !== restaurantName)];
    // Limit to last 3 items
    const limited = updated.slice(0, 3);
    localStorage.setItem('recentSearches', JSON.stringify(limited));
    setRecentSearches(limited);
  }



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

    const saved = JSON.parse(localStorage.getItem('recentSearches')) || [];
    setRecentSearches(saved);
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
    setShowDropdown1(true); // show dropdown when typing
  }}
  placeholder="Search for the first restaurant..."
  style={{ padding: "10px", width: "100%" }}
/>
{showDropdown1 && searchQuery1.trim() !== "" && (recentSearches.length > 0 || suggestions1.length > 0) && (
  <ul className="suggestions">
    {recentSearches.map((item, index) => (
      <li
        key={"recent1-" + index}
        className="suggestion-item"
        onClick={() => {
          setSearchQuery1(item);
          setSuggestions1([]);
          addRecentSearch(item);
          setShowDropdown1(false); // close after selection
        }}
      >
        {item} (Recent)
      </li>
    ))}

    {suggestions1.map((suggestion, index) => (
      <li
        key={index}
        className="suggestion-item"
        onClick={() => {
          setSearchQuery1(suggestion.description);
          setSuggestions1([]);
          setSelectedPlaceId1(suggestion.place_id);
          addRecentSearch(suggestion.description);
          setShowDropdown1(false); // close after selection
        }}
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
    setShowDropdown2(true); // show dropdown when typing
  }}
  placeholder="Search for the second restaurant..."
  style={{ padding: "10px", width: "100%" }}
/>
{showDropdown2 && searchQuery2.trim() !== "" && (recentSearches.length > 0 || suggestions2.length > 0) && (
  <ul className="suggestions">
    {recentSearches.map((item, index) => (
      <li
        key={"recent2-" + index}
        className="suggestion-item"
        onClick={() => {
          setSearchQuery2(item);
          setSuggestions2([]);
          addRecentSearch(item);
          setShowDropdown2(false); // close after selection
        }}
      >
        {item} (Recent)
      </li>
    ))}

    {suggestions2.map((suggestion, index) => (
      <li
        key={index}
        className="suggestion-item"
        onClick={() => {
          setSearchQuery2(suggestion.description);
          setSuggestions2([]);
          setSelectedPlaceId2(suggestion.place_id);
          addRecentSearch(suggestion.description);
          setShowDropdown2(false); // close after selection
        }}
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
    flexWrap: "wrap", // Add this to allow wrapping
    justifyContent: "center",
    alignItems: "flex-start",
    gap: "40px",
    textAlign: "center",
    maxWidth: "100%", // Ensures the container doesn't exceed screen width
    margin: "0 auto",
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

