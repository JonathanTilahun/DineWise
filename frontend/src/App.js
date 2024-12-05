import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css"; // Import CSS file
import GetRestaurantReview from "./GetRestaurantReview";
import CompareRestaurants from "./CompareRestaurants";

function App() {
  return (
    <Router>
      <div className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/get-restaurant-review" element={<GetRestaurantReview />} />
          <Route path="/compare-restaurants" element={<CompareRestaurants />} />
        </Routes>
      </div>
    </Router>
  );
}

function HomePage() {
  return (
    <div className="home-page">
      <h1>DineWise! 🍽️</h1>
      <div className="button-container">
        <Link to="/get-restaurant-review">
          <button>Get a Restaurant Review</button>
        </Link>
        <Link to="/compare-restaurants">
          <button>Compare Two Restaurants</button>
        </Link>
      </div>
    </div>
  );
}

export default App;
