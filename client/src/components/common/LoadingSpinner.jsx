import React from 'react';

export const LoadingSpinner = ({ size = 'md', message = 'Loading...', fullPage = false }) => {
  const content = (
    <div className={`spinner-container ${size}`}>
      <div className="spinner-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="fullpage-loader">{content}</div>;
  }

  return content;
};
