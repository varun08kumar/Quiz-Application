import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
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
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { data } from '../data/data';
import { AuthContext } from '../store/auth_context';
import { useNavigation } from '@react-navigation/native';

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

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Refs for TextInputs
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  
  const { authenticate } = useContext(AuthContext);
  const navigation = useNavigation();

  // Validation function - only validate on blur, not on every keystroke
  const validateField = useCallback((field, value) => {
    let newErrors = { ...errors };

    switch (field) {
      case 'username':
        if (!value.trim()) {
          newErrors.username = 'Username or email is required';
        } else if (value.trim().length < 3) {
          newErrors.username = 'Must be at least 3 characters';
        } else {
          delete newErrors.username;
        }
        break;

      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        } else {
          delete newErrors.password;
        }
        break;
    }

    setErrors(newErrors);
  }, [errors]);

  const handleLogin = async () => {
    // Dismiss keyboard first
    usernameRef.current?.blur();
    passwordRef.current?.blur();

    // Validate fields
    validateField('username', username);
    validateField('password', password);

    if (!username.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (Object.keys(errors).length > 0) {
      Alert.alert('Error', 'Please fix all errors before continuing');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Sending login data:', {
        username: username.trim(),
        password: '***' // Don't log actual password
      });

      const response = await axios.post(`${data.url}/api/login`, {
        username: username.trim(),
        password: password,
      });

      console.log('Login response:', response.data);

      const { access_token, role, message } = response.data;

      // Store credentials
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('role', role);
      
      if (rememberMe) {
        await AsyncStorage.setItem('remembered_username', username.trim());
      } else {
        await AsyncStorage.removeItem('remembered_username');
      }

      // Authenticate user
      authenticate(access_token, role);

      Alert.alert(
        'Welcome Back! 👋',
        message || `Successfully logged in as ${role}`,
        [{ text: 'Continue', style: 'default' }]
      );

    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Invalid credentials. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid username or password. Please check your credentials and try again.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      Alert.alert(
        'Login Failed',
        errorMessage,
        [{ text: 'Try Again', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Please contact your administrator to reset your password.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  // Load remembered username on component mount
  useEffect(() => {
    const loadRememberedUsername = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('remembered_username');
        if (savedUsername) {
          setUsername(savedUsername);
          setRememberMe(true);
        }
      } catch (error) {
        console.log('No saved username found');
      }
    };
    loadRememberedUsername();
  }, []);

  const handleUsernameChange = (text) => {
    setUsername(text);
    // Clear username error when user starts typing
    if (errors.username) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.username;
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    // Clear password error when user starts typing
    if (errors.password) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    }
  };

  const focusPasswordInput = () => {
    passwordRef.current?.focus();
  };

  const setQuickLoginCredentials = (userType) => {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else if (userType === 'student') {
      setUsername('student');
      setPassword('student123');
    }
    // Clear any existing errors
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="school" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue learning</Text>
        </View>

        {/* Form Section */}
        <View style={styles.form}>
          {/* Username Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                ref={usernameRef}
                style={styles.input}
                placeholder="Username or Email"
                placeholderTextColor={COLORS.textSecondary}
                value={username}
                onChangeText={handleUsernameChange}
                onBlur={() => validateField('username', username)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={focusPasswordInput}
                keyboardType="email-address"
                textContentType="username"
                blurOnSubmit={false}
              />
            </View>
            {errors.username && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{errors.username}</Text>
              </View>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={handlePasswordChange}
                onBlur={() => validateField('password', password)}
                secureTextEntry={!showPassword}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                textContentType="password"
                blurOnSubmit={true}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            )}
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMe}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.buttonText}>Signing in...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Quick Login Options */}
          <View style={styles.quickLoginContainer}>
            <Text style={styles.quickLoginTitle}>Quick Login (Demo)</Text>
            <View style={styles.quickLoginButtons}>
              <TouchableOpacity
                style={styles.quickLoginButton}
                onPress={() => setQuickLoginCredentials('admin')}
                activeOpacity={0.7}
              >
                <Ionicons name="person" size={20} color={COLORS.primary} />
                <Text style={styles.quickLoginText}>Admin Demo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickLoginButton}
                onPress={() => setQuickLoginCredentials('student')}
                activeOpacity={0.7}
              >
                <Ionicons name="school" size={20} color={COLORS.secondary} />
                <Text style={styles.quickLoginText}>Student Demo</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.demoNote}>
              These are demo accounts for testing purposes
            </Text>
          </View>

          {/* Signup Link */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.replace('Signup')}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>
              Learning Management System v1.0
            </Text>
          </View>
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
    paddingVertical: 0, // Remove default padding that can cause issues
  },

  eyeIcon: {
    padding: 8,
    marginRight: -4,
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

  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },

  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  rememberText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  forgotText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },

  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
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

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  quickLoginContainer: {
    marginBottom: 32,
  },

  quickLoginTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },

  quickLoginButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },

  quickLoginButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  quickLoginText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },

  demoNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },

  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  signupText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  signupLink: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },

  appInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  appInfoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
});

export default LoginScreen;