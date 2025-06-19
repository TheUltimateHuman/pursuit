
import React from 'react';

const ApiKeyMissingBanner: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 text-center z-50 shadow-lg">
      <h2 className="text-xl font-bold mb-2">API Key Configuration Required</h2>
      <p>
        The <code>API_KEY</code> for Gemini services is missing or not configured for this deployment.
      </p>
      <p className="mt-1 text-sm">
        For web applications like this one, the API key is typically set as an environment variable (e.g., <code>API_KEY=your_actual_key</code>) on the hosting platform (like Netlify, Vercel, GitHub Pages, etc.).
      </p>
      <p className="mt-1 text-sm">
        This key is then embedded into the application during the build process. Please ensure it is correctly configured in your deployment environment.
      </p>
      <p className="mt-1 text-sm">
        API-dependent features will not function until this is resolved. The application does not support entering the API key directly in the browser.
      </p>
    </div>
  );
};

export default ApiKeyMissingBanner;
