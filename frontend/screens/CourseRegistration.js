import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { data } from '../data/data';

const { width } = Dimensions.get('window');

const CourseRegistration = ({ navigation }) => {
  const [courseId, setCourseId] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [courseDetails, setCourseDetails] = useState(null);
  const [validatingCourse, setValidatingCourse] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Focus refs
  const courseIdRef = useRef(null);
  const secretCodeRef = useRef(null);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Real-time validation
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'courseId':
        if (!value.trim()) {
          newErrors.courseId = 'Course ID is required';
        } else if (value.length < 3) {
          newErrors.courseId = 'Course ID must be at least 3 characters';
        } else {
          delete newErrors.courseId;
        }
        break;
      case 'secretCode':
        if (!value.trim()) {
          newErrors.secretCode = 'Secret code is required';
        } else if (value.length < 4) {
          newErrors.secretCode = 'Secret code must be at least 4 characters';
        } else {
          delete newErrors.secretCode;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Course ID validation with debounced API call
  const handleCourseIdChange = async (value) => {
    setCourseId(value);
    validateField('courseId', value);
    setCourseDetails(null);

    if (value.trim().length >= 3) {
      setValidatingCourse(true);
      
      // Debounce API call
      setTimeout(async () => {
        try {
          const token = await AsyncStorage.getItem('access_token');
          if (token && value === courseId) { // Check if value hasn't changed
            const response = await axios.get(
              `${data.url}/api/course/${value}`,
              { 
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000 
              }
            );
            setCourseDetails(response.data);
          }
        } catch (error) {
          console.log('Course validation error:', error.message);
          // Don't show error for course lookup, just don't show details
        } finally {
          setValidatingCourse(false);
        }
      }, 500);
    }
  };

  const handleSecretCodeChange = (value) => {
    setSecretCode(value);
    validateField('secretCode', value);
  };

  const handleRegister = async () => {
    // Validate all fields
    validateField('courseId', courseId);
    validateField('secretCode', secretCode);

    if (!courseId.trim() || !secretCode.trim()) {
      Alert.alert(
        'Missing Information', 
        'Please fill out all fields before registering.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (Object.keys(errors).length > 0) {
      Alert.alert(
        'Validation Error', 
        'Please fix the errors before submitting.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setLoading(true);

    try {
      // Retrieve the JWT token from AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert(
          'Authentication Required', 
          'You are not logged in. Please log in first.',
          [{ text: 'Login', onPress: () => navigation.replace('LoginScreen') }]
        );
        return;
      }

      // Send course registration request to the backend
      const response = await axios.post(
        `${data.url}/api/register_course`,
        { 
          course_id: courseId.trim(), 
          secret_code: secretCode.trim() 
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000 
        }
      );

      // Success animation and feedback
      Alert.alert(
        'Registration Successful! 🎉', 
        response.data.message || 'You have successfully registered for the course.',
        [
          { 
            text: 'View My Courses', 
            onPress: () => navigation.goBack(),
            style: 'default'
          },
          { 
            text: 'Register Another', 
            onPress: () => {
              setCourseId('');
              setSecretCode('');
              setCourseDetails(null);
              setErrors({});
            },
            style: 'cancel'
          }
        ]
      );

    } catch (error) {
      console.error('Registration error:', error);
      
      let errorTitle = 'Registration Failed';
      let errorMessage = 'Failed to register for the course.';
      
      if (error.response?.status === 401) {
        errorTitle = 'Session Expired';
        errorMessage = 'Your session has expired. Please log in again.';
        Alert.alert(errorTitle, errorMessage, [
          { text: 'Login', onPress: () => navigation.replace('LoginScreen') }
        ]);
        return;
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid course ID or secret code.';
      } else if (error.response?.status === 409) {
        errorMessage = 'You are already registered for this course.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.response?.data?.message || errorMessage;
      }
      
      Alert.alert(errorTitle, errorMessage, [
        { text: 'Try Again', style: 'default' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderCourseDetails = () => {
    if (!courseDetails) return null;

    return (
      <Animated.View style={[styles.courseDetailsContainer, { opacity: fadeAnim }]}>
        <View style={styles.courseDetailsHeader}>
          <Ionicons name="information-circle" size={20} color="#007bff" />
          <Text style={styles.courseDetailsTitle}>Course Information</Text>
        </View>
        <Text style={styles.courseTitle}>{courseDetails.title}</Text>
        {courseDetails.instructor && (
          <Text style={styles.courseInstructor}>
            Instructor: {courseDetails.instructor}
          </Text>
        )}
        {courseDetails.credits && (
          <Text style={styles.courseCredits}>
            Credits: {courseDetails.credits}
          </Text>
        )}
        {courseDetails.description && (
          <Text style={styles.courseDescription} numberOfLines={3}>
            {courseDetails.description}
          </Text>
        )}
      </Animated.View>
    );
  };

  const renderInputField = (
    value,
    onChangeText,
    placeholder,
    fieldName,
    icon,
    isSecure = false,
    ref = null
  ) => {
    const hasError = errors[fieldName];
    
    return (
      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, hasError && styles.inputError]}>
          <Ionicons name={icon} size={20} color={hasError ? '#ff6b6b' : '#666'} style={styles.inputIcon} />
          <TextInput
            ref={ref}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#999"
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={isSecure && !showSecretCode}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType={fieldName === 'courseId' ? 'next' : 'done'}
            onSubmitEditing={() => {
              if (fieldName === 'courseId') {
                secretCodeRef.current?.focus();
              } else {
                handleRegister();
              }
            }}
            blurOnSubmit={fieldName !== 'courseId'}
          />
          {isSecure && (
            <TouchableOpacity
              onPress={() => setShowSecretCode(!showSecretCode)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showSecretCode ? 'eye-off' : 'eye'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          )}
          {fieldName === 'courseId' && validatingCourse && (
            <ActivityIndicator size="small" color="#007bff" style={styles.validatingIcon} />
          )}
        </View>
        {hasError && (
          <Text style={styles.errorText}>{hasError}</Text>
        )}
      </View>
    );
  };

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
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="school" size={32} color="#007bff" />
            </View>
            <Text style={styles.title}>Register for Course</Text>
            <Text style={styles.subtitle}>
              Enter your course ID and secret code to join a course
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {renderInputField(
              courseId,
              handleCourseIdChange,
              'Enter Course ID',
              'courseId',
              'bookmark-outline',
              false,
              courseIdRef
            )}

            {renderCourseDetails()}

            {renderInputField(
              secretCode,
              handleSecretCodeChange,
              'Enter Secret Code',
              'secretCode',
              'key-outline',
              true,
              secretCodeRef
            )}

            {/* Register Button */}
            <TouchableOpacity 
              style={[
                styles.registerButton,
                (loading || Object.keys(errors).length > 0) && styles.registerButtonDisabled
              ]} 
              onPress={handleRegister}
              disabled={loading || Object.keys(errors).length > 0}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingText}>Registering...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.registerButtonText}>Register for Course</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Help Section */}
            <View style={styles.helpSection}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>
                • Course ID is provided by your instructor{'\n'}
                • Secret code is shared during class or via email{'\n'}
                • Contact your instructor if you don't have these details
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },

  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form Styles
  form: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  validatingIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginTop: 8,
    marginLeft: 16,
  },

  // Course Details Styles
  courseDetailsContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  courseDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginLeft: 8,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  courseInstructor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  courseCredits: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },

  // Button Styles
  registerButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },

  // Help Section Styles
  helpSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default CourseRegistration;

