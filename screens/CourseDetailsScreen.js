import React, { useLayoutEffect, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 
import { data } from '../data/data';
import axios from 'axios';

const { width } = Dimensions.get('window');

const CourseDetailScreen = ({ navigation, route }) => {
  const { courseId, courseTitle } = route.params;
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  
  // State for backend data
  const [courseStats, setCourseStats] = useState({
    studentsCount: 0,
    quizzesCount: 0,
    loading: true,
    error: null
  });
  const [refreshing, setRefreshing] = useState(false);

  console.log('====================================');
  console.log(courseId, courseTitle);
  console.log('====================================');

  // Function to fetch course statistics from backend
  const fetchCourseStats = async (showLoader = true) => {
    try {
      if (showLoader) {
        setCourseStats(prev => ({ ...prev, loading: true, error: null }));
      }

      // Fetch both students and quizzes data using your API endpoints
      const [studentsResponse, quizzesResponse] = await Promise.all([
        axios.get(`${data.url}/api/admin/course/${courseId}/students`, {
          timeout: 10000
        }),
        axios.get(`${data.url}/api/admin/course/${courseId}/quizzes`, {
          timeout: 10000
        })
      ]);

      // Extract counts from the responses based on your API structure
      const studentsCount = studentsResponse.data?.students 
        ? studentsResponse.data.students.length 
        : (Array.isArray(studentsResponse.data) 
            ? studentsResponse.data.length 
            : studentsResponse.data?.count || studentsResponse.data?.total || 0);

      const quizzesCount = quizzesResponse.data?.quizzes 
        ? quizzesResponse.data.quizzes.length 
        : (Array.isArray(quizzesResponse.data) 
            ? quizzesResponse.data.length 
            : quizzesResponse.data?.count || quizzesResponse.data?.total || 0);

      setCourseStats({
        studentsCount,
        quizzesCount,
        loading: false,
        error: null
      });

      console.log('Course stats loaded:', { studentsCount, quizzesCount });

    } catch (error) {
      console.error('Error fetching course stats:', error);
      
      let errorMessage = 'Failed to load course statistics';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      } else if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection.';
      }

      setCourseStats(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };

  // Animation on mount
  useEffect(() => {
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

  // Fetch course stats on component mount
  useEffect(() => {
    if (courseId) {
      fetchCourseStats();
    }
  }, [courseId]);

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourseStats(false);
    setRefreshing(false);
  };

  // Set up the header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Course Details',
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '600',
      },
      headerStyle: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => fetchCourseStats()}
          style={styles.refreshButton}
          disabled={courseStats.loading}
        >
          {courseStats.loading ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <Ionicons name="refresh" size={24} color="#4A90E2" />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, courseStats.loading]);

  const navigateToStudents = () => {
    navigation.navigate('StudentsScreen', { courseId });
  };

  const navigateToQuizzes = () => {
    navigation.navigate('QuizzesScreen', { courseId });
  };

  // Helper function to format numbers
  const formatCount = (count) => {
    if (courseStats.loading) return '--';
    if (courseStats.error) return 'Error';
    return count.toString();
  };

  const MenuCard = ({ title, icon, onPress, color, count }) => (
    <Animated.View 
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <TouchableOpacity 
        style={[styles.card, { borderLeftColor: color }]} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={32} color={color} />
          </View>
          <View style={styles.cardTextContainer}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{title}</Text>
              {count !== undefined && (
                <View style={[styles.countBadge, { backgroundColor: color }]}>
                  {courseStats.loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.countBadgeText}>
                      {formatCount(count)}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle}>Manage and view {title.toLowerCase()}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </View>
        </View>
        <View style={[styles.cardFooter, { backgroundColor: color + '08' }]}>
          <Text style={[styles.cardFooterText, { color: color }]}>
            Tap to access
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Loading state for stats
  const StatItem = ({ icon, count, label, color }) => (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={24} color={color} />
      {courseStats.loading ? (
        <ActivityIndicator 
          size="small" 
          color={color} 
          style={styles.statLoader}
        />
      ) : (
        <Text style={styles.statNumber}>
          {formatCount(count)}
        </Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
      >
        {/* Course Header */}
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.courseIconContainer}>
            <Ionicons name="book" size={40} color="#4A90E2" />
          </View>
          <Text style={styles.courseTitle} numberOfLines={3}>
            {courseTitle}
          </Text>
          <Text style={styles.courseId}>Course ID: {courseId}</Text>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View 
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <StatItem
            icon="people"
            count={courseStats.studentsCount}
            label="Students"
            color="#4A90E2"
          />
          <View style={styles.statDivider} />
          <StatItem
            icon="help-circle"
            count={courseStats.quizzesCount}
            label="Quizzes"
            color="#FF6B6B"
          />
        </Animated.View>

        {/* Error Message */}
        {courseStats.error && (
          <Animated.View 
            style={[
              styles.errorContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.errorCard}>
              <Ionicons name="warning" size={20} color="#FF6B6B" />
              <Text style={styles.errorText}>{courseStats.error}</Text>
              <TouchableOpacity 
                onPress={() => fetchCourseStats()}
                style={styles.retryButton}
                disabled={courseStats.loading}
              >
                {courseStats.loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.retryButtonText}>Retry</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Menu Cards */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Course Management</Text>
          
          <MenuCard
            title="Students"
            icon="people"
            onPress={navigateToStudents}
            color="#4A90E2"
            count={courseStats.studentsCount}
          />
          
          <MenuCard
            title="Quizzes"
            icon="help-circle"
            onPress={navigateToQuizzes}
            color="#FF6B6B"
            count={courseStats.quizzesCount}
          />
        </View>

        {/* Additional Info */}
        <Animated.View 
          style={[
            styles.infoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#4A90E2" />
            <Text style={styles.infoText}>
              Select an option above to manage your course content and view detailed information about students and quizzes.
              {courseStats.loading && ' Statistics are being loaded...'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header Button
  refreshButton: {
    marginRight: 16,
    padding: 4,
  },

  // Header Styles
  headerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  courseIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2' + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  courseId: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statLoader: {
    marginTop: 8,
    marginBottom: 4,
    height: 32,
  },

  // Error Styles
  errorContainer: {
    marginBottom: 20,
  },
  errorCard: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#c62828',
    lineHeight: 20,
    marginLeft: 12,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Menu Section Styles
  menuContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginLeft: 4,
  },

  // Card Styles
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  countBadge: {
    minWidth: 32,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  cardFooter: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cardFooterText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Info Section Styles
  infoContainer: {
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
    marginLeft: 12,
  },
});

export default CourseDetailScreen;