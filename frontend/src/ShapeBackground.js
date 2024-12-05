// ShapeBackground.js
import React from 'react';
import './App.css'; // Ensure styles are applied

function ShapeBackground() {
  return (
    <div className="shape-container">
      <div className="shape small"></div>
      <div className="shape medium"></div>
      <div className="shape large"></div>
      {/* Add more shapes if you like */}
    </div>
  );
}

export default ShapeBackground;
