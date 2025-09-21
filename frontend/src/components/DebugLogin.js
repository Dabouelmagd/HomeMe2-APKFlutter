import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const DebugLogin = () => {
  const [status, setStatus] = useState('');
  const [tokenInfo, setTokenInfo] = useState('');

  const testDirectLogin = async () => {
    setStatus('Testing login...');
    
    try {
      console.log('Backend URL:', BACKEND_URL);
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });
      
      console.log('Login response:', response.data);
      setStatus('✅ Login successful!');
      
      // Store the token
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setTokenInfo(`Token: ${access_token.substring(0, 50)}...`);
      
      // Force redirect
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } catch (error) {
      console.error('Login error:', error);
      setStatus(`❌ Login failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  const testBackendConnection = async () => {
    setStatus('Testing backend connection...');
    
    try {
      const response = await axios.get(`${BACKEND_URL}/`);
      setStatus(`✅ Backend connected: ${JSON.stringify(response.data)}`);
    } catch (error) {
      setStatus(`❌ Backend connection failed: ${error.message}`);
    }
  };

  const clearStorage = () => {
    localStorage.clear();
    setStatus('✅ Storage cleared');
    setTokenInfo('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>🔧 Debug Login Helper</h2>
      <p>Backend URL: <strong>{BACKEND_URL}</strong></p>
      
      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={testBackendConnection}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Backend Connection
        </button>
        
        <button 
          onClick={testDirectLogin}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Direct Login (admin/admin123)
        </button>
        
        <button 
          onClick={clearStorage}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Clear Storage
        </button>
      </div>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h4>Status:</h4>
        <p>{status}</p>
        {tokenInfo && <p><small>{tokenInfo}</small></p>}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Click "Test Backend Connection" first</li>
          <li>If that works, click "Direct Login"</li>
          <li>You should be redirected to the dashboard automatically</li>
        </ol>
      </div>
    </div>
  );
};

export default DebugLogin;