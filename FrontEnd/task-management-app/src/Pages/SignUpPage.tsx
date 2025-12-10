import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Eye, 
  EyeOff, 
  CheckCircle,
  Building,
  User,
  Mail,
  Lock,
  Shield,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const SignupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user', // 'admin' or 'user'
    companyName: '',
    designation: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.role === 'admin' && !formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required for admin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      // Prepare data for API
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        companyName: formData.companyName || undefined,
        designation: formData.designation || undefined
      };

      // API call to register user
      const response = await fetch('http://localhost:9000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.success) {
        toast.success('🎉 Account created successfully!');
        
        // Show success message
        toast(
          (_) => (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Registration Successful!</p>
                <p className="text-sm text-gray-600">Please login to continue</p>
              </div>
            </div>
          ),
          { duration: 4000 }
        );

        // Redirect to login after delay
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const password = formData.password;
    if (!password) return { score: 0, color: 'bg-gray-200', text: '' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    const strength = {
      0: { color: 'bg-red-500', text: 'Very Weak' },
      1: { color: 'bg-red-400', text: 'Weak' },
      2: { color: 'bg-yellow-500', text: 'Fair' },
      3: { color: 'bg-blue-500', text: 'Good' },
      4: { color: 'bg-green-500', text: 'Strong' },
    };
    
    return { score, ...strength[score as keyof typeof strength] };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row rounded-2xl overflow-hidden shadow-2xl">
        {/* Left Side - Form */}
        <div className="lg:w-1/2 bg-white p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            {/* Logo/Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <UserPlus className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Create Account
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Join our task management platform
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    Full Name
                  </div>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.name 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    Email Address
                  </div>
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-500" />
                    Password
                  </div>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12 ${
                      errors.password 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300'
                    }`}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
                
                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Password strength:</span>
                      <span className={`font-medium ${
                        strength.score === 0 ? 'text-red-600' :
                        strength.score === 1 ? 'text-red-500' :
                        strength.score === 2 ? 'text-yellow-600' :
                        strength.score === 3 ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {strength.text}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            index <= strength.score 
                              ? strength.color 
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12 ${
                      errors.confirmPassword 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300'
                    }`}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    Select Role
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('role', 'user')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.role === 'user'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <User className={`h-6 w-6 mb-2 ${
                        formData.role === 'user' ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                      <span className={`font-medium ${
                        formData.role === 'user' ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        Regular User
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        Can view only assigned tasks
                      </span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleInputChange('role', 'admin')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.role === 'admin'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <Shield className={`h-6 w-6 mb-2 ${
                        formData.role === 'admin' ? 'text-purple-600' : 'text-gray-500'
                      }`} />
                      <span className={`font-medium ${
                        formData.role === 'admin' ? 'text-purple-700' : 'text-gray-700'
                      }`}>
                        Administrator
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        Full access to all tasks
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Fields for Admin */}
              {formData.role === 'admin' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h3 className="font-medium text-blue-800 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Admin Information
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Your company name"
                      className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.companyName 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-blue-300'
                      }`}
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Manager, Team Lead"
                      className="w-full px-4 py-3 text-sm border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={formData.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="flex items-start gap-3">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    required
                  />
                </div>
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-4 text-sm font-medium text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side - Info/Graphics */}
        <div className="lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-8 lg:p-12 text-white">
          <div className="h-full flex flex-col justify-center max-w-md mx-auto">
            <div className="mb-10">
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">
                Join Thousands of Teams
              </h2>
              <p className="text-blue-100">
                Streamline your workflow with our powerful task management platform
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Role-Based Access</h4>
                  <p className="text-blue-200 text-sm">
                    Admin sees everything, Users see only their tasks
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Real-time Collaboration</h4>
                  <p className="text-blue-200 text-sm">
                    Work together with your team seamlessly
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Advanced Analytics</h4>
                  <p className="text-blue-200 text-sm">
                    Track progress with detailed insights
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Secure & Reliable</h4>
                  <p className="text-blue-200 text-sm">
                    Enterprise-grade security for your data
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <p className="italic mb-4">
                "This platform transformed how our team manages projects. The role-based system is perfect for our hierarchy."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                <div>
                  <p className="font-semibold">Sarah Johnson</p>
                  <p className="text-blue-200 text-sm">Project Manager</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;