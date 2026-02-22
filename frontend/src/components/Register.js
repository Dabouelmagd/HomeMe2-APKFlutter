import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const Register = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'resident',
    compound_id: '',
    full_name: '',
    phone: '',
    unit_number: '',
    subscription_code: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const result = await register(registerData);
      
      if (result.success) {
        toast.success('Registration successful! Redirecting to login...');
        // Redirect to login page so user can login with their new credentials
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-logo">
          <img 
            src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
            alt="HomeMe Logo"
            className="h-48 w-auto mx-auto mb-6"
          />
          <p>Join your compound community</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="full_name" className="form-label">
                {t('full_name')}
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="form-input"
                required
                placeholder={t('enter_full_name', 'Enter your full name')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                {t('username')}
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="form-input"
                required
                placeholder={t('choose_username', 'Choose a username')}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              {t('email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
              placeholder={t('enter_email', 'Enter your email')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                {t('password')}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                required
                placeholder={t('enter_password', 'Enter password')}
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                {t('confirm_password')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                required
                placeholder={t('confirm_password', 'Confirm password')}
                minLength="6"
              />
            </div>
          </div>

          {/* Subscription Code Field */}
          <div className="form-group">
            <label htmlFor="subscription_code" className="form-label">
              {t('subscription_code_optional')}
            </label>
            <input
              type="text"
              id="subscription_code"
              name="subscription_code"
              value={formData.subscription_code}
              onChange={handleChange}
              className="form-input"
              placeholder={t('enter_subscription_code_placeholder')}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('subscription_code_register_hint')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="role" className="form-label">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="resident">Resident</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                {t('phone')}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="compound_id" className="form-label">
                Compound ID (Optional)
              </label>
              <input
                type="text"
                id="compound_id"
                name="compound_id"
                value={formData.compound_id}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter compound ID (optional)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="unit_number" className="form-label">
                Unit Number
              </label>
              <input
                type="text"
                id="unit_number"
                name="unit_number"
                value={formData.unit_number}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter unit number"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;