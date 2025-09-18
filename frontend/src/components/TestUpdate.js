import React from 'react';

const TestUpdate = () => {
  return (
    <div className="bg-red-500 text-white p-4 rounded-lg m-4">
      <h2 className="text-2xl font-bold">🔴 FRONTEND UPDATE SUCCESSFUL!</h2>
      <p>If you can see this red banner, the frontend updates are working!</p>
      <p>Timestamp: {new Date().toLocaleString()}</p>
    </div>
  );
};

export default TestUpdate;