import React, { useState } from "react";
import "./App.css";

function App() {
  const [searchQuery, setSearchQuery] = useState(""); // For search input
  const [restaurants, setRestaurants] = useState([]); // List of search results
  const [selectedRestaurant, setSelectedRestaurant] = useState(null); // The selected restaurant

  // Handle search input change
  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Fetch restaurants from the backend
  const handleSearch = async () => {
    if (!searchQuery) {
      alert("Please enter a restaurant name to search.");
      return;
    }

    try {
      const response = await fetch("http://localhost:2000/getRestaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant: searchQuery }),
      });

      const data = await response.json();
      if (data.message === "Success") {
        setRestaurants(data.results); // Store the search results
      } else {
        alert("No restaurants found!");
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      alert("Error fetching restaurants. Please try again.");
    }
  };

  // Handle selecting a restaurant
  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant); // Store the selected restaurant
  };

  return (
    <div className="App">
      <h1>Restaurant Search</h1>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder="Search for a restaurant..."
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {/* Display Search Results */}
      {restaurants.length > 0 && (
        <div className="results">
          <h2>Results:</h2>
          <ul>
            {restaurants.map((restaurant, index) => (
              <li
                key={index}
                onClick={() => handleSelectRestaurant(restaurant)}
                className="restaurant-item"
              >
                {restaurant.name} - {restaurant.address}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Display Selected Restaurant */}
      {selectedRestaurant && (
        <div className="selected-restaurant">
          <h2>Selected Restaurant:</h2>
          <p>
            <strong>Name:</strong> {selectedRestaurant.name}
          </p>
          <p>
            <strong>Address:</strong> {selectedRestaurant.address}
          </p>
          <p>
            <strong>Rating:</strong> {selectedRestaurant.rating}
          </p>
          <p>
            <strong>Total Reviews:</strong> {selectedRestaurant.reviewsCount}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
