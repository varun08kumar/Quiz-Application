import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Add this import if available
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { data } from '../data/data';

const { width } = Dimensions.get('window');

// Modern color scheme
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
  accent: '#f59e0b',
};

const AdminDashboardScreen = ({ navigation }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  
  // Get safe area insets for better spacing
  const insets = { bottom: 0 }; // Default fallback
  // If you have react-native-safe-area-context installed, uncomment the line below:
  // const insets = useSafeAreaInsets();

  // Fetch the token from AsyncStorage
  const fetchToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
        return storedToken;
      } else {
        Alert.alert(
          'Authentication Required',
          'Please log in to continue.',
          [{ text: 'OK', onPress: () => navigation.replace('LoginScreen') }]
        );
        return null;
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      Alert.alert('Error', 'Failed to retrieve authentication token.');
      return null;
    }
  };

  // Fetch courses from the backend
  const fetchCourses = async (authToken, isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await axios.get(`${data.url}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000, // 10 second timeout
      });

      setCourses(response.data || []);
      console.log('Courses fetched:', response.data);
      
    } catch (error) {
      console.error('Fetch courses error:', error);
      
      let errorMessage = 'Failed to fetch courses.';
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
        navigation.replace('LoginScreen');
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (token) {
      await fetchCourses(token, true);
    }
  }, [token]);

  // Retry function for error state
  const handleRetry = useCallback(async () => {
    if (token) {
      await fetchCourses(token);
    } else {
      const newToken = await fetchToken();
      if (newToken) {
        await fetchCourses(newToken);
      }
    }
  }, [token]);

  // Set up the header with "Add Course" button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: COLORS.primary,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerRight: () => (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateCourse')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Fetch token when the component mounts
  useEffect(() => {
    const initializeScreen = async () => {
      const authToken = await fetchToken();
      if (authToken) {
        await fetchCourses(authToken);
      }
    };
    initializeScreen();
  }, []);

  // Use this hook to refetch courses when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchCourses(token);
      }
    }, [token])
  );

  const handleCourseClick = (courseId, courseTitle) => {
    navigation.navigate('CourseDetailsScreen', { courseId, courseTitle });
  };

  const renderCourse = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { 
          transform: [{ scale: 1 }],
          opacity: 1,
        }
      ]}
      onPress={() => handleCourseClick(item.id, item.title)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.courseCodeContainer}>
          <Text style={styles.courseCode}>{item.course_code}</Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>
      
      <Text style={styles.courseTitle}>{item.title}</Text>
      
      {item.description && (
        <Text style={styles.courseDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.cardFooter}>
        <View style={styles.metaInfo}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently added'}
          </Text>
        </View>
        
        <View style={styles.actionIndicator}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={[styles.emptyContainer, { paddingBottom: Math.max(120, insets.bottom + 80) }]}>
      <Ionicons name="school-outline" size={64} color={COLORS.textLight} />
      <Text style={styles.emptyTitle}>No Courses Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start building your course catalog by adding your first course.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('CreateCourse')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>Create First Course</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={[styles.errorContainer, { paddingBottom: Math.max(120, insets.bottom + 80) }]}>
      <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && courses.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        {renderError()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.subtitle}>Manage your courses and content</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{courses.length}</Text>
          <Text style={styles.statLabel}>Total Courses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{courses.filter(c => c.status === 'active').length || courses.length}</Text>
          <Text style={styles.statLabel}>Active Courses</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Courses</Text>
          {courses.length > 0 && (
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            courses.length === 0 ? styles.emptyList : styles.list,
            { paddingBottom: Math.max(100, insets.bottom + 60) }
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },

  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  refreshButton: {
    padding: 8,
  },

  list: {
    paddingBottom: 100, // Extra bottom padding for navigation
  },

  emptyList: {
    flexGrow: 1,
    paddingBottom: 100, // Extra bottom padding for navigation
  },

  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  courseCodeContainer: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  courseCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },

  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 24,
  },

  courseDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  actionIndicator: {
    opacity: 0.5,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 120, // Add extra bottom padding to avoid navigation overlap
    marginTop: -60, // Slight upward adjustment for better centering
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },

  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 120, // Add extra bottom padding to avoid navigation overlap
    marginTop: -60, // Slight upward adjustment for better centering
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
  },

  errorSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },

  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  addButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default AdminDashboardScreen;