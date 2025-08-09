import React, { useState, useCallback, useMemo, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { data } from '../data/data';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../store/auth_context'; // Import AuthContext

const { width } = Dimensions.get('window');
const COURSE_CARD_WIDTH = width - 32;

const StudentDashboardScreen = ({ navigation }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get authentication context
  const { logout } = useContext(AuthContext);

  // Memoized filtered courses for search functionality
  const filteredCourses = useMemo(() => {
    // Ensure courses is always an array
    const coursesArray = Array.isArray(courses) ? courses : [];
    
    if (!searchQuery.trim()) return coursesArray;
    
    return coursesArray.filter(course => 
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  // Enhanced API call with better error handling and retry logic
  const fetchCourses = async (authToken, retryCount = 0) => {
    try {
      setError(null);
      console.log('Fetching courses with token:', authToken ? 'Token present' : 'No token');
      
      const response = await axios.get(`${data.url}/api/student/courses`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 15000, // Increased timeout
      });
      
      console.log('API Response:', response.data); // Debug log
      
      // Handle different response structures
      let coursesData = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Direct array response
          coursesData = response.data;
        } else if (response.data.courses && Array.isArray(response.data.courses)) {
          // Nested courses array
          coursesData = response.data.courses;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Nested data array
          coursesData = response.data.data;
        } else {
          // Fallback: empty array if structure is unexpected
          console.warn('Unexpected API response structure:', response.data);
          coursesData = [];
        }
      }
      
      setCourses(coursesData);
      
      // Cache courses data for offline access
      await AsyncStorage.setItem('cached_courses', JSON.stringify(coursesData));
      
    } catch (error) {
      console.error('Error fetching courses:', error);
      
      // Always ensure courses is an array on error
      setCourses([]);
      
      // Try to load cached data on network failure
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network')) {
        try {
          const cachedCourses = await AsyncStorage.getItem('cached_courses');
          if (cachedCourses) {
            const parsedCourses = JSON.parse(cachedCourses);
            setCourses(Array.isArray(parsedCourses) ? parsedCourses : []);
            setError('Showing cached data. Pull to refresh when online.');
            return;
          }
        } catch (cacheError) {
          console.warn('Failed to load cached courses:', cacheError);
        }
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch courses. Please check your connection.';
      setError(errorMessage);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ 
            text: 'OK', 
            onPress: async () => {
              await AsyncStorage.multiRemove(['access_token', 'role']);
              logout(); // Use logout from context
            }
          }]
        );
      } else if (error.response?.status === 404) {
        // No courses found - this is normal for students with no enrollments
        setCourses([]);
        setError(null);
      } else if (error.response?.status >= 500 && retryCount < 2) {
        // Retry on server errors
        setTimeout(() => fetchCourses(authToken, retryCount + 1), 2000);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  // Enhanced header with search functionality
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'My Courses',
      headerTitleStyle: {
        fontSize: 20,
        fontWeight: '600',
      },
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity
            onPress={() => {
              // Check if CourseRegistration screen exists in your navigation
              if (navigation.getState().routeNames?.includes('CourseRegistration')) {
                navigation.navigate('CourseRegistration');
              } else {
                // Fallback: navigate to a screen that definitely exists or show alert
                Alert.alert('Coming Soon', 'Course registration feature will be available soon.');
              }
            }}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={26} color="#007bff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  // Enhanced data fetching with better error recovery
  const fetchData = useCallback(async (showLoader = true, forceRefresh = false) => {
    try {
      if (showLoader) setLoading(true);
      const storedToken = await AsyncStorage.getItem('access_token'); // Changed from 'token' to 'access_token'
      
      console.log('Stored token:', storedToken ? 'Found' : 'Not found');
      
      if (storedToken) {
        await fetchCourses(storedToken);
      } else {
        Alert.alert(
          'Authentication Required',
          'Please log in to view your courses.',
          [{ 
            text: 'OK', 
            onPress: () => {
              logout(); // Use logout from context instead of direct navigation
            }
          }]
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
      setCourses([]); // Ensure courses is always an array
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  // Refresh screen when focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(false, true);
  }, [fetchData]);

  // Navigate to course details with haptic feedback
  const handleCourseClick = useCallback((courseId, courseTitle, courseCode) => {
    // Add haptic feedback on supported platforms
    if (Platform.OS === 'ios') {
      // You can add haptic feedback here if needed
    }
    
    console.log('Navigating to course details:', { courseId, courseTitle, courseCode });
    
    // Check if the screen exists before navigating
    try {
      navigation.navigate('StudentCourseDetailsScreen', { 
        courseId, 
        courseTitle,
        courseCode
      });
    } catch (navigationError) {
      console.error('Navigation error:', navigationError);
      Alert.alert('Navigation Error', 'Unable to open course details. Please try again.');
    }
  }, [navigation]);

  // Enhanced course card with more information and better visual hierarchy
  const renderCourse = useCallback(({ item, index }) => {
    const isEven = index % 2 === 0;
    const cardStyle = [
      styles.courseCard,
      { marginLeft: isEven ? 0 : 8, marginRight: isEven ? 8 : 0 }
    ];

    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={() => handleCourseClick(item.id, item.title, item.course_code)}
        activeOpacity={0.8}
      >
        <View style={styles.courseHeader}>
          <View style={styles.courseCodeContainer}>
            <Text style={styles.courseCode}>{item.course_code || 'N/A'}</Text>
          </View>
          <View style={styles.courseStatusContainer}>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#4caf50' : '#ff9800' }]} />
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </View>
        
        <Text style={styles.courseTitle} numberOfLines={2}>
          {item.title || 'Untitled Course'}
        </Text>
        
        <View style={styles.courseDetails}>
          {item.instructor && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                {item.instructor}
              </Text>
            </View>
          )}
          
          <View style={styles.bottomRow}>
            {item.credits && (
              <View style={styles.detailRow}>
                <Ionicons name="library-outline" size={14} color="#666" />
                <Text style={styles.detailText}>
                  {item.credits} Credit{item.credits !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            
            {item.schedule && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.detailText}>
                  {item.schedule}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {item.upcoming_assignment && (
          <View style={styles.upcomingContainer}>
            <Ionicons name="alert-circle-outline" size={16} color="#ff9800" />
            <Text style={styles.upcomingText}>
              Assignment due: {item.upcoming_assignment}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [handleCourseClick]);

  // Enhanced empty state with more actions
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="school-outline" size={80} color="#e0e0e0" />
      <Text style={styles.emptyTitle}>No Courses Yet</Text>
      <Text style={styles.emptyDescription}>
        You haven't registered for any courses yet.{'\n'}
        Start your learning journey today!
      </Text>
      
      <View style={styles.emptyActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            // Safe navigation check
            if (navigation.getState().routeNames?.includes('CourseRegistration')) {
              navigation.navigate('CourseRegistration');
            } else {
              Alert.alert('Coming Soon', 'Course registration feature will be available soon.');
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Register for Courses</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Enhanced error state with more recovery options
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="cloud-offline-outline" size={80} color="#ff6b6b" />
      <Text style={styles.errorTitle}>Connection Problem</Text>
      <Text style={styles.errorDescription}>{error}</Text>
      
      <View style={styles.errorActions}>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchData()}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color="#007bff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Enhanced loading state with skeleton loading
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007bff" />
      <Text style={styles.loadingText}>Loading your courses...</Text>
      <Text style={styles.loadingSubtext}>This may take a few moments</Text>
    </View>
  );

  // Course statistics header - Fixed with proper array checking
  const renderStatsHeader = () => {
    // Ensure courses is always an array before using array methods
    const coursesArray = Array.isArray(courses) ? courses : [];
    
    if (coursesArray.length === 0) return null;
    
    // Safe array operations with fallbacks
    const totalCredits = coursesArray.reduce((sum, course) => {
      const credits = Number(course.credits) || 0;
      return sum + credits;
    }, 0);
    
    const activeCourses = coursesArray.filter(course => course.status === 'active').length;
    
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{coursesArray.length}</Text>
          <Text style={styles.statLabel}>Total Courses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{activeCourses}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalCredits}</Text>
          <Text style={styles.statLabel}>Total Credits</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {loading ? (
        renderLoadingState()
      ) : error && (!Array.isArray(courses) || courses.length === 0) ? (
        renderErrorState()
      ) : (
        <>
          {renderStatsHeader()}
          <FlatList
            data={filteredCourses}
            renderItem={renderCourse}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            contentContainerStyle={[
              filteredCourses.length === 0 ? styles.flexContainer : styles.listContainer,
              { paddingBottom: 100 } // Extra padding for better scroll experience
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#007bff']}
                tintColor="#007bff"
                title="Pull to refresh"
                titleColor="#666"
              />
            }
            ListEmptyComponent={renderEmptyState}
            numColumns={1}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 180, // Approximate height of course card
              offset: 180 * index,
              index,
            })}
          />
        </>
      )}
    </View>
  );
};

// Styles remain the same as your original
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  flexContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  
  // Stats Header Styles
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007bff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  
  // Enhanced Course Card Styles
  courseCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseCodeContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  courseStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    lineHeight: 24,
  },
  courseDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upcomingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  upcomingText: {
    fontSize: 12,
    color: '#f57c00',
    fontWeight: '500',
    marginLeft: 6,
  },

  // Enhanced Loading State Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },

  // Enhanced Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  emptyActions: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Enhanced Error State Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  errorActions: {
    width: '100%',
    gap: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default StudentDashboardScreen;