import React, { useLayoutEffect, useState, useEffect, useContext } from 'react';
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
  Alert,
  RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../store/auth_context';
import { data } from '../data/data';

const { width } = Dimensions.get('window');

const StudentCourseDetailsScreen = ({ navigation, route }) => {
  const { courseId, courseTitle, courseCode } = route.params;
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    completedQuizzes: 0,
    gradedQuizzes: 0,
    completionPercentage: 0,
    averageScorePercentage: 0,
    bestScorePercentage: 0,
    totalMarksObtained: 0,
    totalPossibleMarks: 0
  });

  // Get authentication context
  const { logout } = useContext(AuthContext);

  console.log('====================================');
  console.log('Course ID:', courseId, 'Course Title:', courseTitle, 'Course Code:', courseCode);
  console.log('API Base URL:', data.url);
  console.log('====================================');

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
    
    fetchQuizzes();
  }, []);

  // Set up the header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Course Details',
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
      },
      headerStyle: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      headerTintColor: '#333',
      headerBackTitleVisible: false,
    });
  }, [navigation]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert(
          'Authentication Required', 
          'Please log in to view course details.',
          [{ 
            text: 'OK', 
            onPress: () => {
              logout();
            }
          }]
        );
        return;
      }

      console.log('Fetching quizzes for course:', courseId);
      console.log('Using token:', token ? 'Token present' : 'No token');

      // Create axios instance with default config
      const apiClient = axios.create({
        baseURL: data.url,
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch quiz data
      const response = await apiClient.get(`/api/course/${courseId}/quizzes`);

      console.log('API Response status:', response.status);
      console.log('API Response data:', JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        const { quizzes: quizzesData, stats: statsData } = response.data;
        
        // Update quizzes
        setQuizzes(quizzesData || []);
        
        // Update stats with your backend structure
        setStats({
          totalQuizzes: statsData?.total_quizzes || 0,
          completedQuizzes: statsData?.completed_quizzes || 0,
          gradedQuizzes: statsData?.graded_quizzes || 0,
          completionPercentage: statsData?.completion_percentage || 0,
          averageScorePercentage: statsData?.average_score_percentage || 0,
          bestScorePercentage: statsData?.best_score_percentage || 0,
          totalMarksObtained: statsData?.total_marks_obtained || 0,
          totalPossibleMarks: statsData?.total_possible_marks || 0
        });

        console.log('Successfully loaded quizzes:', quizzesData?.length || 0);
        console.log('Stats:', statsData);
        
      } else {
        console.error('API returned success: false', response.data.message);
        Alert.alert('Error', response.data.message || 'Failed to fetch quiz data');
        setFallbackData();
      }

    } catch (error) {
      console.error('Error fetching quizzes:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
        
        if (error.response.status === 401) {
          Alert.alert(
            'Session Expired', 
            'Your session has expired. Please log in again.',
            [{ 
              text: 'OK', 
              onPress: async () => {
                await AsyncStorage.multiRemove(['access_token', 'role']);
                logout();
              }
            }]
          );
          return;
        } else if (error.response.status === 403) {
          Alert.alert('Access Denied', 'You are not enrolled in this course or do not have access.');
          navigation.goBack();
        } else if (error.response.status === 404) {
          Alert.alert('Not Found', 'Course not found.');
          navigation.goBack();
        } else {
          Alert.alert('Server Error', `Server returned ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        console.error('Network error:', error.request);
        Alert.alert(
          'Network Error', 
          'Unable to connect to server. Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: () => fetchQuizzes() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        console.error('Other error:', error.message);
        Alert.alert('Error', 'An unexpected error occurred: ' + error.message);
      }
      
      // Set fallback data for development/testing
      setFallbackData();
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setFallbackData = () => {
    console.log('Setting fallback data...');
    const mockQuizzes = [
      {
        id: 1,
        title: 'Quiz 1: Introduction',
        description: 'Basic concepts and fundamentals',
        total_marks: 10,
        isSubmitted: true,
        is_graded: true,
        marksObtained: 8,
        submission_date: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Quiz 2: Advanced Topics',
        description: 'More complex concepts and applications',
        total_marks: 15,
        isSubmitted: false,
        is_graded: false,
        marksObtained: 0,
        submission_date: null
      },
      {
        id: 3,
        title: 'Quiz 3: Practical Applications',
        description: 'Real-world problem solving',
        total_marks: 20,
        isSubmitted: true,
        is_graded: false,
        marksObtained: 0,
        submission_date: new Date().toISOString()
      }
    ];
    
    setQuizzes(mockQuizzes);
    setStats({
      totalQuizzes: 3,
      completedQuizzes: 2,
      gradedQuizzes: 1,
      completionPercentage: 66.7,
      averageScorePercentage: 80.0,
      bestScorePercentage: 80.0,
      totalMarksObtained: 8,
      totalPossibleMarks: 10
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuizzes();
  };

  const navigateToQuizzes = () => {
    try {
      // Check if StudentQuizzesScreen exists in navigation
      const state = navigation.getState();
      const routeNames = state?.routeNames || [];
      
      if (routeNames.includes('StudentQuizzesScreen')) {
        navigation.navigate('StudentQuizzesScreen', { courseId, courseTitle, courseCode });
      } else {
        Alert.alert('Coming Soon', 'Quiz details screen will be available soon.');
      }
    } catch (navigationError) {
      console.error('Navigation error:', navigationError);
      Alert.alert('Navigation Error', 'Unable to open quizzes. Please try again.');
    }
  };

  // Enhanced navigation function that checks for existing quiz state
  const navigateToQuizDetail = async (quiz) => {
    try {
      console.log('🎯 Navigating to quiz:', quiz.id);
      
      // Check if there's existing quiz state for this quiz
      const quizStateKey = `quiz_${quiz.id}_${courseId}_state`;
      console.log('🔍 Checking for existing state with key:', quizStateKey);
      
      let existingState = null;
      try {
        const savedState = await AsyncStorage.getItem(quizStateKey);
        if (savedState) {
          existingState = JSON.parse(savedState);
          console.log('📁 Found existing quiz state:', existingState);
          
          // Calculate if quiz is still valid (not expired)
          if (existingState.quizStartTime) {
            const now = Date.now();
            const elapsed = Math.floor((now - existingState.quizStartTime) / 1000);
            const timeRemaining = Math.max(0, 600 - elapsed); // 10 minutes = 600 seconds
            
            console.log('⏰ Time check:', {
              elapsed: elapsed + ' seconds',
              remaining: timeRemaining + ' seconds',
              expired: timeRemaining <= 0
            });
            
            if (timeRemaining <= 0) {
              console.log('⏰ Quiz time expired, clearing old state');
              await AsyncStorage.removeItem(quizStateKey);
              existingState = null;
            } else {
              // Update the existing state with calculated time
              existingState.timeRemaining = timeRemaining;
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking existing state:', error);
      }
      
      // Navigate to quiz with appropriate parameters
      const state = navigation.getState();
      const routeNames = state?.routeNames || [];
      
      if (routeNames.includes('StudentQuizDetailsScreen')) {
        const navigationParams = {
          quizId: quiz.id,
          courseId: courseId,
          isSubmitted: quiz.isSubmitted || false,
          quiz: quiz,
          questions: quiz.questions || [],
          courseTitle: courseTitle,
          courseCode: courseCode
        };
        
        console.log('🚀 Navigating with params:', navigationParams);
        
        if (existingState && !quiz.isSubmitted) {
          // Show alert about continuing existing quiz
          const answeredCount = Object.keys(existingState.selectedOptions || {}).length;
          const timeMinutes = Math.floor(existingState.timeRemaining / 60);
          const timeSeconds = existingState.timeRemaining % 60;
          
          Alert.alert(
            'Continue Quiz?',
            `You have an unfinished quiz attempt. Would you like to continue where you left off?\n\nProgress: ${answeredCount} questions answered\nTime remaining: ${timeMinutes}:${String(timeSeconds).padStart(2, '0')}`,
            [
              {
                text: 'Start Fresh',
                style: 'destructive',
                onPress: async () => {
                  // Clear existing state and start fresh
                  await AsyncStorage.removeItem(quizStateKey);
                  console.log('🗑️ Cleared existing state, starting fresh');
                  navigation.navigate('StudentQuizDetailsScreen', navigationParams);
                }
              },
              {
                text: 'Continue',
                onPress: () => {
                  console.log('▶️ Continuing existing quiz');
                  navigation.navigate('StudentQuizDetailsScreen', navigationParams);
                }
              }
            ]
          );
        } else {
          // No existing state or quiz is submitted, navigate normally
          navigation.navigate('StudentQuizDetailsScreen', navigationParams);
        }
      } else {
        Alert.alert('Error', 'Quiz screen not available. Please check your navigation setup.');
      }
    } catch (navigationError) {
      console.error('❌ Navigation error:', navigationError);
      Alert.alert('Navigation Error', 'Unable to open quiz details. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not submitted';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getQuizStatusColor = (quiz) => {
    if (!quiz.isSubmitted) return '#FF9800';
    if (!quiz.is_graded) return '#2196F3';
    return '#4CAF50';
  };

  const getQuizStatusText = (quiz) => {
    if (!quiz.isSubmitted) return 'Available';
    if (!quiz.is_graded) return 'Submitted';
    return 'Graded';
  };

  const getQuizStatusIcon = (quiz) => {
    if (!quiz.isSubmitted) return 'play-circle';
    if (!quiz.is_graded) return 'time';
    return 'checkmark-circle';
  };

  // Helper function to get quiz status info
  const getQuizStatusInfo = (quiz) => {
    if (quiz.isSubmitted) {
      return {
        canTake: false,
        statusText: quiz.is_graded ? 'Completed & Graded' : 'Submitted (Pending Grade)',
        statusColor: quiz.is_graded ? '#4CAF50' : '#2196F3',
        description: quiz.is_graded 
          ? `Score: ${quiz.marksObtained}/${quiz.total_marks} (${Math.round((quiz.marksObtained / quiz.total_marks) * 100)}%)`
          : 'Waiting for instructor to grade'
      };
    } else {
      return {
        canTake: true,
        statusText: 'Available',
        statusColor: '#FF9800',
        description: `Take this quiz • ${quiz.total_marks} marks`
      };
    }
  };

  const QuizCard = ({ quiz }) => {
    const statusInfo = getQuizStatusInfo(quiz);
    
    return (
      <TouchableOpacity 
        style={[
          styles.quizCard,
          !statusInfo.canTake && styles.quizCardDisabled
        ]}
        onPress={() => statusInfo.canTake ? navigateToQuizDetail(quiz) : null}
        activeOpacity={statusInfo.canTake ? 0.7 : 1}
      >
        <View style={styles.quizHeader}>
          <View style={[
            styles.quizStatusIcon, 
            { backgroundColor: statusInfo.statusColor }
          ]}>
            <Ionicons 
              name={getQuizStatusIcon(quiz)} 
              size={20} 
              color="white" 
            />
          </View>
          <View style={styles.quizInfo}>
            <Text style={styles.quizTitle}>{quiz.title}</Text>
            <Text style={styles.quizDescription}>{quiz.description}</Text>
            <Text style={[styles.quizStatusDescription, { color: statusInfo.statusColor }]}>
              {statusInfo.description}
            </Text>
            {quiz.isSubmitted && quiz.submission_date && (
              <Text style={styles.submissionDate}>
                Submitted: {formatDate(quiz.submission_date)}
              </Text>
            )}
          </View>
          <View style={styles.quizStats}>
            <Text style={[styles.quizStatus, { color: statusInfo.statusColor }]}>
              {statusInfo.statusText}
            </Text>
            {statusInfo.canTake && (
              <View style={styles.takeQuizButton}>
                <Text style={styles.takeQuizButtonText}>Take Quiz</Text>
              </View>
            )}
            {statusInfo.canTake && (
              <Ionicons name="chevron-forward" size={16} color="#ccc" style={styles.chevronIcon} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const MenuCard = ({ title, icon, onPress, color, description, disabled = false }) => (
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
        style={[
          styles.card, 
          { borderLeftColor: color },
          disabled && styles.cardDisabled
        ]} 
        onPress={disabled ? null : onPress}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={32} color={disabled ? '#ccc' : color} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={[styles.cardTitle, disabled && styles.cardTitleDisabled]}>
              {title}
            </Text>
            <Text style={[styles.cardSubtitle, disabled && styles.cardSubtitleDisabled]}>
              {description}
            </Text>
          </View>
          <View style={styles.arrowContainer}>
            {disabled ? (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            )}
          </View>
        </View>
        <View style={[
          styles.cardFooter, 
          { backgroundColor: disabled ? '#f5f5f5' : color + '08' }
        ]}>
          <Text style={[
            styles.cardFooterText, 
            { color: disabled ? '#999' : color }
          ]}>
            {disabled ? 'Feature coming soon' : 'Tap to access'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading course details...</Text>
        <Text style={styles.loadingSubtext}>Please wait while we fetch your data</Text>
      </View>
    );
  }

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
            title="Pull to refresh"
            titleColor="#666"
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
            <Ionicons name="school" size={40} color="#4A90E2" />
          </View>
          <Text style={styles.courseTitle} numberOfLines={3}>
            {courseTitle}
          </Text>
          {courseCode && (
            <Text style={styles.courseCode}>Course Code: {courseCode}</Text>
          )}
          <Text style={styles.courseId}>Course ID: {courseId}</Text>
          
          {/* Student Role Badge */}
          <View style={styles.roleBadge}>
            <Ionicons name="person" size={16} color="#4A90E2" />
            <Text style={styles.roleText}>Student Access</Text>
          </View>
        </Animated.View>

        {/* Quiz Stats */}
        <Animated.View 
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.statItem}>
            <Ionicons name="help-circle" size={24} color="#FF6B6B" />
            <Text style={styles.statNumber}>{stats.totalQuizzes}</Text>
            <Text style={styles.statLabel}>Total Quizzes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{stats.completedQuizzes}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={24} color="#4A90E2" />
            <Text style={styles.statNumber}>{stats.completionPercentage}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </Animated.View>

        {/* Quiz List */}
        <Animated.View 
          style={[
            styles.quizListContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Quizzes</Text>
            {quizzes.length > 0 && (
              <TouchableOpacity onPress={navigateToQuizzes} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
              </TouchableOpacity>
            )}
          </View>
          
          {quizzes.length > 0 ? (
            <>
              {quizzes.slice(0, 3).map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
              {quizzes.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewMoreButton}
                  onPress={navigateToQuizzes}
                >
                  <Text style={styles.viewMoreText}>
                    View {quizzes.length - 3} more quiz{quizzes.length - 3 !== 1 ? 'es' : ''}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#4A90E2" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.noQuizzesContainer}>
              <Ionicons name="document-text" size={48} color="#ccc" />
              <Text style={styles.noQuizzesText}>No quizzes available</Text>
              <Text style={styles.noQuizzesSubtext}>
                Quizzes will appear here when they are added to the course.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Course Activities */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Course Activities</Text>
          
          {/* Active Quiz Card */}
          <MenuCard
            title="View All Quizzes"
            icon="help-circle"
            onPress={navigateToQuizzes}
            color="#FF6B6B"
            description="Take quizzes and view your results"
          />

          {/* Disabled Features for Future */}
          <MenuCard
            title="Assignments"
            icon="document-text"
            color="#4CAF50"
            description="Complete course assignments"
            disabled={true}
          />

          <MenuCard
            title="Course Materials"
            icon="library"
            color="#9C27B0"
            description="Access study materials and resources"
            disabled={true}
          />

          <MenuCard
            title="Discussion Forum"
            icon="chatbubbles"
            color="#FF9800"
            description="Participate in course discussions"
            disabled={true}
          />
        </View>

        {/* Student Progress Section */}
        <Animated.View 
          style={[
            styles.progressSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Ionicons name="trending-up" size={24} color="#4A90E2" />
              <Text style={styles.progressTitle}>Your Progress</Text>
            </View>
            <Text style={styles.progressDescription}>
              You have completed {stats.completedQuizzes} out of {stats.totalQuizzes} quizzes. 
              {stats.gradedQuizzes > 0 && ` Your average score is ${stats.averageScorePercentage.toFixed(1)}%.`}
            </Text>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <View style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(stats.completionPercentage, 100)}%` }
                ]} />
              </View>
              <Text style={styles.progressPercentage}>
                {stats.completionPercentage}% Complete
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Performance Summary */}
        {stats.gradedQuizzes > 0 && (
          <Animated.View 
            style={[
              styles.performanceSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="trophy" size={24} color="#FFB347" />
                <Text style={styles.performanceTitle}>Performance Summary</Text>
              </View>
              
              <View style={styles.performanceStats}>
                <View style={styles.performanceStatItem}>
                  <Text style={styles.performanceStatValue}>
                    {stats.averageScorePercentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.performanceStatLabel}>Average Score</Text>
                </View>
                <View style={styles.performanceStatDivider} />
                <View style={styles.performanceStatItem}>
                  <Text style={styles.performanceStatValue}>
                    {stats.bestScorePercentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.performanceStatLabel}>Best Score</Text>
                </View>
                <View style={styles.performanceStatDivider} />
                <View style={styles.performanceStatItem}>
                  <Text style={styles.performanceStatValue}>
                    {stats.totalMarksObtained}/{stats.totalPossibleMarks}
                  </Text>
                  <Text style={styles.performanceStatLabel}>Total Marks</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

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
              {stats.totalQuizzes === 0 
                ? "No quizzes are available for this course yet. Check back later for new content."
                : stats.completedQuizzes === 0
                ? "Start taking quizzes to track your progress and see your performance statistics."
                : stats.gradedQuizzes === 0
                ? "Your submitted quizzes are being graded. Results will appear here once grading is complete."
                : "Keep up the great work! Complete remaining quizzes to master this course."
              }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  courseCode: {
    fontSize: 14,
    color: '#4A90E2',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    fontWeight: '600',
  },
  courseId: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
    marginHorizontal: 15,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Quiz List Styles
  quizListContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 4,
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quizCardDisabled: {
    opacity: 0.7,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quizInfo: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  quizDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  quizStatusDescription: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  submissionDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  quizStats: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  quizStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  takeQuizButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  takeQuizButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  quizScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  quizPercentage: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  quizPending: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    marginTop: 2,
  },
  chevronIcon: {
    marginTop: 8,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 8,
  },
  noQuizzesContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  noQuizzesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  noQuizzesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Menu Section Styles
  menuContainer: {
    marginBottom: 24,
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
  cardDisabled: {
    opacity: 0.7,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardTitleDisabled: {
    color: '#999',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardSubtitleDisabled: {
    color: '#bbb',
  },
  arrowContainer: {
    marginLeft: 12,
  },
  comingSoonBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
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

  // Progress Section
  progressSection: {
    marginBottom: 24,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  progressDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
    minWidth: 2, // Ensure visibility even at 0%
  },
  progressPercentage: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Performance Section
  performanceSection: {
    marginBottom: 24,
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  performanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 15,
  },
  performanceStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  performanceStatLabel: {
    fontSize: 12,
    color: '#666',
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

export default StudentCourseDetailsScreen;