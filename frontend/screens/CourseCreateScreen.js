
import React, { useState, useCallback, useLayoutEffect } from 'react';
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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { data } from '../data/data';

const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#10b981',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  error: '#ef4444',
  success: '#10b981',
  border: '#e5e7eb',
  shadow: 'rgba(0, 0, 0, 0.1)',
  inputBackground: '#f9fafb',
};

const InputField = React.memo(({ icon, label, placeholder, value, onChangeText, multiline = false, hasError, errorMessage, required = false }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
    <View style={[styles.inputWrapper, hasError && styles.inputError]}>
      <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        autoCorrect={false}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
    {hasError && errorMessage && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    )}
  </View>
));

const CreateCourseScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({ title: '', secret: '', code: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Create Course',
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: '#fff',
    });
  }, [navigation]);

  const validateField = useCallback((field, value) => {
    switch (field) {
      case 'code': return !value.trim() ? 'Course code is required' : '';
      case 'title': return !value.trim() ? 'Course title is required' : '';
      case 'secret': return !value.trim() ? 'Secret code is required' : '';
      default: return '';
    }
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
    }
  }, [touched, validateField]);

  const handleFieldBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, formData[field]) }));
  }, [formData, validateField]);

  const validateAllFields = useCallback(() => {
    const newErrors = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  const handleSubmit = async () => {
    if (!validateAllFields()) {
      Alert.alert('Validation Error', 'Please fix all errors');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.post(`${data.url}/api/admin/create_course`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 201) {
        Alert.alert('Success', 'Course created successfully');
        setFormData({ title: '', secret: '', code: '' });
        setErrors({});
        setTouched({});
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create course');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'position'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Ionicons name="school" size={48} color={COLORS.primary} />
            <Text style={styles.title}>Create New Course</Text>
          </View>

          <InputField icon="code-outline" label="Course Code" placeholder="e.g., CS101" value={formData.code} onChangeText={value => handleFieldChange('code', value)} hasError={!!errors.code} errorMessage={errors.code} required />

          <InputField icon="book-outline" label="Course Title" placeholder="Course title" value={formData.title} onChangeText={value => handleFieldChange('title', value)} hasError={!!errors.title} errorMessage={errors.title} required />

          <InputField icon="key-outline" label="Secret Code" placeholder="Secret access code" value={formData.secret} onChangeText={value => handleFieldChange('secret', value)} hasError={!!errors.secret} errorMessage={errors.secret} required />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submitButton, isLoading && styles.buttonDisabled]} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.submitButtonText}>Create Course</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContainer: { padding: 20, paddingBottom: 160 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 12 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  required: { color: COLORS.error },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, backgroundColor: COLORS.surface },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 12 },
  multilineInput: { height: 100 },
  inputError: { borderColor: COLORS.error },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  errorText: { marginLeft: 6, color: COLORS.error },
  actionContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, position: 'absolute', bottom: 0, width: '100%' },
  cancelButton: { flex: 1, marginRight: 8, padding: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: COLORS.textSecondary, fontSize: 16 },
  submitButton: { flex: 2, padding: 14, backgroundColor: COLORS.primary, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
});

export default CreateCourseScreen;
