// WebAuthn Service for Biometric Authentication
// Supports fingerprint and face recognition

const WEBAUTHN_API = `${process.env.REACT_APP_BACKEND_URL}/api/webauthn`;

// Check if WebAuthn is supported
export const isWebAuthnSupported = () => {
  return window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function';
};

// Check if platform authenticator is available (fingerprint/face)
export const isPlatformAuthenticatorAvailable = async () => {
  if (!isWebAuthnSupported()) return false;
  
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Error checking platform authenticator:', error);
    return false;
  }
};

// Convert base64 to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = window.atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Convert ArrayBuffer to base64
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// Register biometric credential for a user
export const registerBiometric = async (userId, username) => {
  try {
    // Get registration options from server
    const optionsResponse = await fetch(`${WEBAUTHN_API}/register/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ user_id: userId, username })
    });
    
    if (!optionsResponse.ok) {
      throw new Error('Failed to get registration options');
    }
    
    const options = await optionsResponse.json();
    
    // Convert challenge and user.id from base64 to ArrayBuffer
    const publicKeyCredentialCreationOptions = {
      challenge: base64ToArrayBuffer(options.challenge),
      rp: {
        name: options.rp.name,
        id: options.rp.id || window.location.hostname
      },
      user: {
        id: base64ToArrayBuffer(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName
      },
      pubKeyCredParams: options.pubKeyCredParams || [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Use device's built-in authenticator
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    };
    
    // Create credential using biometric
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });
    
    // Send credential to server for verification
    const verifyResponse = await fetch(`${WEBAUTHN_API}/register/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        user_id: userId,
        credential_id: arrayBufferToBase64(credential.rawId),
        client_data_json: arrayBufferToBase64(credential.response.clientDataJSON),
        attestation_object: arrayBufferToBase64(credential.response.attestationObject)
      })
    });
    
    if (!verifyResponse.ok) {
      throw new Error('Failed to verify registration');
    }
    
    return { success: true, message: 'تم تسجيل البصمة بنجاح' };
  } catch (error) {
    console.error('Biometric registration error:', error);
    return { success: false, error: error.message };
  }
};

// Authenticate using biometric
export const authenticateWithBiometric = async (username) => {
  try {
    // Get authentication options from server
    const optionsResponse = await fetch(`${WEBAUTHN_API}/login/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      throw new Error(error.detail || 'Failed to get authentication options');
    }
    
    const options = await optionsResponse.json();
    
    // Convert challenge and allowCredentials from base64
    const publicKeyCredentialRequestOptions = {
      challenge: base64ToArrayBuffer(options.challenge),
      rpId: options.rpId || window.location.hostname,
      allowCredentials: options.allowCredentials?.map(cred => ({
        id: base64ToArrayBuffer(cred.id),
        type: 'public-key',
        transports: ['internal']
      })) || [],
      userVerification: 'required',
      timeout: 60000
    };
    
    // Get credential using biometric
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });
    
    // Send credential to server for verification
    const verifyResponse = await fetch(`${WEBAUTHN_API}/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        credential_id: arrayBufferToBase64(credential.rawId),
        client_data_json: arrayBufferToBase64(credential.response.clientDataJSON),
        authenticator_data: arrayBufferToBase64(credential.response.authenticatorData),
        signature: arrayBufferToBase64(credential.response.signature)
      })
    });
    
    if (!verifyResponse.ok) {
      throw new Error('Failed to verify authentication');
    }
    
    const result = await verifyResponse.json();
    return { success: true, ...result };
  } catch (error) {
    console.error('Biometric authentication error:', error);
    
    // Handle specific errors
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'تم إلغاء المصادقة بالبصمة' };
    }
    if (error.name === 'SecurityError') {
      return { success: false, error: 'خطأ أمني. تأكد من استخدام HTTPS' };
    }
    
    return { success: false, error: error.message };
  }
};

// Check if user has registered biometric
export const hasBiometricRegistered = async (username) => {
  try {
    const response = await fetch(`${WEBAUTHN_API}/check/${username}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.has_biometric;
  } catch (error) {
    return false;
  }
};

// Remove biometric credential
export const removeBiometric = async (userId) => {
  try {
    const response = await fetch(`${WEBAUTHN_API}/remove`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ user_id: userId })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error removing biometric:', error);
    return false;
  }
};

export default {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerBiometric,
  authenticateWithBiometric,
  hasBiometricRegistered,
  removeBiometric
};
