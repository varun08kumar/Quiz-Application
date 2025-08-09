import React, { useState, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { data } from '../data/data';
import { AuthContext } from '../store/auth_context';

const { width } = Dimensions.get('window');

// Theme colors matching your main app
const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#10b981',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  error: '#ef4444',
  success: '#10b981',
  border: '#e5e7eb',
  inputBackground: '#f9fafb',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Move InputField component outside to prevent re-creation
const InputField = React.memo(({ 
  icon, 
  placeholder, 
  value, 
  onChangeText,
  secureTextEntry, 
  keyboardType, 
  autoCapitalize,
  hasError,
  errorMessage,
  showPasswordToggle,
  onPasswordToggle,
  onBlur,
  returnKeyType,
  onSubmitEditing,
  textContentType
}) => (
  <View style={styles.inputContainer}>
    <View style={[styles.inputWrapper, hasError && styles.inputError]}>
      <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
        textContentType={textContentType}
      />
      {showPasswordToggle && (
        <TouchableOpacity
          onPress={onPasswordToggle}
          style={styles.eyeIcon}
        >
          <Ionicons 
            name={secureTextEntry ? "eye-off" : "eye"} 
            size={20} 
            color={COLORS.textSecondary} 
          />
        </TouchableOpacity>
      )}
    </View>
    {hasError && errorMessage && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    )}
  </View>
));

const SignupScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: '',  // Changed from 'name' to 'username'
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const { authenticate } = useContext(AuthContext);

  // Validation function
  const validateField = useCallback((field, value, allData = formData) => {
    switch (field) {
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.trim().length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) return 'Username can only contain letters, numbers, and underscores';
        return '';

      case 'email':
        if (!value) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email';
        return '';

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Password must contain uppercase, lowercase, and number';
        }
        return '';

      case 'confirmPassword':
        if (!value) return 'Please confirm password';
        if (value !== allData.password) return 'Passwords do not match';
        return '';

      default:
        return '';
    }
  }, [formData]);

  // Handle field changes
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle field blur (when user leaves the field)
  const handleFieldBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, [formData, validateField]);

  // Memoized handlers for each field
  const handleUsernameChange = useCallback((value) => handleFieldChange('username', value), [handleFieldChange]);
  const handleEmailChange = useCallback((value) => handleFieldChange('email', value), [handleFieldChange]);
  const handlePasswordChange = useCallback((value) => handleFieldChange('password', value), [handleFieldChange]);
  const handleConfirmPasswordChange = useCallback((value) => handleFieldChange('confirmPassword', value), [handleFieldChange]);

  // Field blur handlers
  const handleUsernameBlur = useCallback(() => handleFieldBlur('username'), [handleFieldBlur]);
  const handleEmailBlur = useCallback(() => handleFieldBlur('email'), [handleFieldBlur]);
  const handlePasswordBlur = useCallback(() => handleFieldBlur('password'), [handleFieldBlur]);
  const handleConfirmPasswordBlur = useCallback(() => handleFieldBlur('confirmPassword'), [handleFieldBlur]);

  // Password toggle handlers
  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);
  const toggleConfirmPassword = useCallback(() => setShowConfirmPassword(prev => !prev), []);

  // Validate all fields
  const validateAllFields = useCallback(() => {
    const newErrors = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true
    });
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  const handleSignup = async () => {
    if (!validateAllFields()) {
      Alert.alert('Error', 'Please fix all errors before continuing');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Sending signup data:', {
        username: formData.username.trim(),
        email: formData.email.toLowerCase().trim(),
        password: '***' // Don't log actual password
      });

      const response = await axios.post(`${data.url}/api/register`, {
        username: formData.username.trim(),  // Now correctly using username field
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
      });

      console.log('Signup response:', response.data);

      const { access_token, message, role } = response.data;

      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('role', role);

      authenticate(access_token, role);

      Alert.alert(
        'Success! 🎉', 
        message || 'Account created successfully!',
        [{ text: 'Continue', style: 'default' }]
      );

      // Clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setErrors({});
      setTouched({});

    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.message || 'Something went wrong. Please try again.';
      
      Alert.alert(
        'Registration Failed',
        errorMessage,
        [{ text: 'Try Again', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize password strength calculation
  const passwordStrength = useMemo(() => {
    if (formData.password.length === 0) return null;
    
    return {
      length: formData.password.length >= 6,
      cases: /(?=.*[a-z])(?=.*[A-Z])/.test(formData.password),
      number: /(?=.*\d)/.test(formData.password)
    };
  }, [formData.password]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="person-add" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join our learning community today</Text>
        </View>

        {/* Form Section */}
        <View style={styles.form}>
          <InputField
            icon="person-outline"
            placeholder="Username"
            value={formData.username}
            onChangeText={handleUsernameChange}
            onBlur={handleUsernameBlur}
            autoCapitalize="none"
            hasError={!!errors.username}
            errorMessage={errors.username}
            returnKeyType="next"
            textContentType="username"
          />

          <InputField
            icon="mail-outline"
            placeholder="Email Address"
            value={formData.email}
            onChangeText={handleEmailChange}
            onBlur={handleEmailBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            hasError={!!errors.email}
            errorMessage={errors.email}
            returnKeyType="next"
            textContentType="emailAddress"
          />

          <InputField
            icon="lock-closed-outline"
            placeholder="Password"
            value={formData.password}
            onChangeText={handlePasswordChange}
            onBlur={handlePasswordBlur}
            secureTextEntry={!showPassword}
            hasError={!!errors.password}
            errorMessage={errors.password}
            showPasswordToggle={true}
            onPasswordToggle={togglePassword}
            returnKeyType="next"
            textContentType="newPassword"
          />

          <InputField
            icon="lock-closed-outline"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            onBlur={handleConfirmPasswordBlur}
            secureTextEntry={!showConfirmPassword}
            hasError={!!errors.confirmPassword}
            errorMessage={errors.confirmPassword}
            showPasswordToggle={true}
            onPasswordToggle={toggleConfirmPassword}
            returnKeyType="done"
            onSubmitEditing={handleSignup}
            textContentType="newPassword"
          />

          {/* Password Strength Indicator */}
          {passwordStrength && (
            <View style={styles.passwordStrength}>
              <Text style={styles.passwordStrengthTitle}>Password Strength:</Text>
              <View style={styles.strengthIndicator}>
                <View style={[
                  styles.strengthBar,
                  { backgroundColor: passwordStrength.length ? COLORS.success : COLORS.error }
                ]} />
                <View style={[
                  styles.strengthBar,
                  { backgroundColor: passwordStrength.cases ? COLORS.success : COLORS.border }
                ]} />
                <View style={[
                  styles.strengthBar,
                  { backgroundColor: passwordStrength.number ? COLORS.success : COLORS.border }
                ]} />
              </View>
              <View style={styles.strengthLabels}>
                <Text style={[styles.strengthLabel, { color: passwordStrength.length ? COLORS.success : COLORS.error }]}>
                  6+ characters
                </Text>
                <Text style={[styles.strengthLabel, { color: passwordStrength.cases ? COLORS.success : COLORS.textSecondary }]}>
                  Upper & lowercase
                </Text>
                <Text style={[styles.strengthLabel, { color: passwordStrength.number ? COLORS.success : COLORS.textSecondary }]}>
                  Number
                </Text>
              </View>
            </View>
          )}

          {/* Sign Up Button */}
          <TouchableOpacity 
            style={[styles.signupButton, isLoading && styles.buttonDisabled]} 
            onPress={handleSignup}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.buttonText}>Creating Account...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </View>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Privacy */}
          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  form: {
    flex: 1,
  },

  inputContainer: {
    marginBottom: 20,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  inputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
  },

  eyeIcon: {
    padding: 4,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 16,
  },

  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },

  passwordStrength: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },

  passwordStrengthTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  strengthIndicator: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },

  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },

  strengthLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  signupButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },

  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  loginText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  loginLink: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },

  termsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default SignupScreen;