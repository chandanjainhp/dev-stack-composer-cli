import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">PROJECT_NAME</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A modern MERN stack application built with React, Node.js, Express, and MongoDB.
            Generated with MERN AI CLI for rapid development.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">
              Get Started
            </button>
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition duration-300">
              Learn More
            </button>
          </div>
        </div>
      </div>

      <div className="features-section py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Fast Development</h3>
              <p className="text-gray-600">
                Built with modern tools and best practices for rapid development and deployment.
              </p>
            </div>
            <div className="feature-card bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-3">Secure by Default</h3>
              <p className="text-gray-600">
                Includes authentication, input validation, and security headers out of the box.
              </p>
            </div>
            <div className="feature-card bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-3">Responsive Design</h3>
              <p className="text-gray-600">
                Mobile-first design with Tailwind CSS for beautiful, responsive interfaces.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="cta-section py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Build Something Amazing?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Start developing your next great application with our modern MERN stack foundation.
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300">
            Start Building
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
