import React, { useState, useCallback, useLayoutEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { data } from '../data/data';
import { AuthContext } from '../store/auth_context';

const StudentQuizzesScreen = ({ route, navigation }) => {
  const { courseId, courseTitle, courseCode } = route.params;
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Get authentication context
  const { logout } = useContext(AuthContext);

  // Set up header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: courseTitle ? `${courseTitle} - Quizzes` : 'Course Quizzes',
      headerTitleStyle: {
        fontSize: 16,
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
    });
  }, [navigation, courseTitle]);

  const fetchQuizzes = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('access_token');
      const role = await AsyncStorage.getItem('role');

      if (!token) {
        Alert.alert(
          'Authentication Required',
          'Please log in to view quizzes.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }

      console.log('Fetching quizzes for course:', courseId);
      console.log('User role:', role);

      let response;
      if (role === 'admin') {
        const { studentId } = route.params;
        if (!studentId) {
          Alert.alert('Error', 'Student ID is missing.');
          return;
        }

        // Admin fetching quizzes for a specific student
        response = await axios.get(`${data.url}/api/admin/${studentId}/course/${courseId}/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        });
      } else {
        // Normal user fetching their quizzes
        response = await axios.get(`${data.url}/api/course/${courseId}/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        });
      }

      console.log('API Response:', response.data);

      // Check response success and update state
      if (response.data.success) {
        const quizzesData = response.data.quizzes || [];
        
        // Ensure each quiz has proper structure with safe fallbacks
        const processedQuizzes = quizzesData.map(quiz => ({
          id: quiz.id || Math.random(),
          title: quiz.title || 'Untitled Quiz',
          description: quiz.description || 'No description available',
          questions: Array.isArray(quiz.questions) ? quiz.questions : [],
          isSubmitted: Boolean(quiz.isSubmitted),
          is_graded: Boolean(quiz.is_graded),
          marksObtained: Number(quiz.marksObtained) || 0,
          totalMarks: Number(quiz.totalMarks) || Number(quiz.total_marks) || 0,
          total_marks: Number(quiz.total_marks) || Number(quiz.totalMarks) || 0,
          submission_date: quiz.submission_date || null,
          created_at: quiz.created_at || null,
          due_date: quiz.due_date || null
        }));

        setQuizzes(processedQuizzes);
        
        // Animate list entrance
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();

        console.log('Successfully loaded quizzes:', processedQuizzes.length);
      } else {
        console.warn('API returned success: false', response.data.message);
        setError(response.data.message || 'No quizzes available for this course.');
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      
      let errorMessage = 'Unable to fetch quizzes. Please try again.';
      
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
        
        if (error.response.status === 401) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log in again.',
            [{ text: 'OK', onPress: async () => {
              await AsyncStorage.multiRemove(['access_token', 'role']);
              logout();
            }}]
          );
          return;
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have access to this course.';
        } else if (error.response.status === 404) {
          errorMessage = 'Course not found.';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();
    }, [courseId])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuizzes(false);
  }, []);

  const getQuizStatusColor = (quiz) => {
    if (quiz.is_graded) return '#4CAF50'; // Green for completed
    if (quiz.isSubmitted) return '#FF9800'; // Orange for submitted but not graded
    return '#2196F3'; // Blue for available
  };

  const getQuizStatusText = (quiz) => {
    if (quiz.is_graded) return 'Completed';
    if (quiz.isSubmitted) return 'Submitted';
    return 'Available';
  };

  const getQuizStatusIcon = (quiz) => {
    if (quiz.is_graded) return 'check-circle';
    if (quiz.isSubmitted) return 'schedule';
    return 'play-circle-filled';
  };

  const getScoreColor = (quiz) => {
    if (!quiz.is_graded || !quiz.totalMarks) return '#666';
    const percentage = (quiz.marksObtained / quiz.totalMarks) * 100;
    if (percentage >= 80) return '#4CAF50'; // Green for excellent
    if (percentage >= 60) return '#FF9800'; // Orange for good
    return '#F44336'; // Red for needs improvement
  };

  // Simplified quiz press handler - always continues automatically
  const handleQuizPress = async (quiz) => {
    try {
      console.log('🎯 Quiz pressed:', quiz.id);
      
      // For submitted quizzes, just navigate to view results
      if (quiz.isSubmitted) {
        console.log('📋 Opening submitted quiz for review');
        const navigationParams = {
          quizId: quiz.id,
          quiz: quiz,
          questions: quiz.questions,
          isSubmitted: quiz.isSubmitted,
          courseId,
          courseTitle,
          courseCode
        };
        
        navigation.navigate('StudentQuizDetailsScreen', navigationParams);
        return;
      }
      
      // For active quizzes, check for existing state and auto-continue
      const quizStateKey = `quiz_${quiz.id}_${courseId}_state`;
      console.log('🔍 Checking for existing state with key:', quizStateKey);
      
      let existingState = null;
      
      try {
        const savedState = await AsyncStorage.getItem(quizStateKey);
        if (savedState) {
          existingState = JSON.parse(savedState);
          console.log('📁 Found existing quiz state:', existingState);
          
          // Validate the existing state structure
          if (!existingState.selectedOptions || !existingState.quizStartTime) {
            console.log('❌ Invalid existing state structure, clearing');
            await AsyncStorage.removeItem(quizStateKey);
            existingState = null;
          } else {
            // IMPROVED TIME CALCULATION - Use precise timing
            const now = Date.now();
            let timeRemaining;
            
            if (existingState.exitTime && existingState.timeRemaining) {
              // Use exitTime for precise calculation
              const timeSinceExit = Math.floor((now - existingState.exitTime) / 1000);
              timeRemaining = Math.max(0, existingState.timeRemaining - timeSinceExit);
              
              console.log('⏰ Precise time calculation:', {
                exitTime: new Date(existingState.exitTime).toLocaleTimeString(),
                savedTimeRemaining: existingState.timeRemaining + ' seconds',
                timeSinceExit: timeSinceExit + ' seconds',
                calculatedRemaining: timeRemaining + ' seconds'
              });
            } else {
              // Fallback calculation
              const elapsed = Math.floor((now - existingState.quizStartTime) / 1000);
              timeRemaining = Math.max(0, 600 - elapsed);
              
              console.log('⏰ Fallback time calculation:', {
                elapsed: elapsed + ' seconds',
                remaining: timeRemaining + ' seconds'
              });
            }
            
            if (timeRemaining <= 0) {
              console.log('⏰ Quiz time expired, clearing old state and starting fresh');
              await AsyncStorage.removeItem(quizStateKey);
              existingState = null;
            } else {
              // Update the existing state with calculated time
              existingState.timeRemaining = timeRemaining;
              
              // Save updated state back to storage
              await AsyncStorage.setItem(quizStateKey, JSON.stringify(existingState));
              
              const answeredCount = Object.keys(existingState.selectedOptions || {}).length;
              const timeMinutes = Math.floor(existingState.timeRemaining / 60);
              const timeSeconds = existingState.timeRemaining % 60;
              const formattedTime = `${timeMinutes}:${String(timeSeconds).padStart(2, '0')}`;
              
              console.log(`🔄 Auto-continuing quiz - ${answeredCount} questions answered, ${formattedTime} remaining`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking existing state:', error);
        // Clear potentially corrupted state
        try {
          await AsyncStorage.removeItem(quizStateKey);
        } catch (clearError) {
          console.error('❌ Failed to clear corrupted state:', clearError);
        }
        existingState = null;
      }
      
      // Prepare navigation parameters
      const navigationParams = {
        quizId: quiz.id,
        quiz: quiz,
        questions: quiz.questions,
        isSubmitted: quiz.isSubmitted,
        courseId,
        courseTitle,
        courseCode,
        // Pass existing state if found to enable automatic restoration
        ...(existingState && { existingState })
      };
      
      console.log('🚀 Navigating with params:', navigationParams);
      
      // Always navigate directly - no dialog or confirmation
      navigation.navigate('StudentQuizDetailsScreen', navigationParams);
      
    } catch (navigationError) {
      console.error('❌ Navigation error:', navigationError);
      Alert.alert('Navigation Error', 'Unable to open quiz details. Please try again.');
    }
  };

  // Helper function to get quiz status info
  const getQuizStatusInfo = (quiz) => {
    if (quiz.isSubmitted) {
      return {
        canTake: false,
        statusText: quiz.is_graded ? 'Completed & Graded' : 'Submitted (Pending Grade)',
        statusColor: quiz.is_graded ? '#4CAF50' : '#FF9800',
        description: quiz.is_graded 
          ? `Score: ${quiz.marksObtained}/${quiz.totalMarks} (${Math.round((quiz.marksObtained / quiz.totalMarks) * 100)}%)`
          : 'Waiting for instructor to grade'
      };
    } else {
      return {
        canTake: true,
        statusText: 'Available',
        statusColor: '#2196F3',
        description: `Take this quiz • ${quiz.totalMarks} marks`
      };
    }
  };

  // Function to check for in-progress quizzes (for display purposes)
  const checkForInProgressQuiz = async (quizId) => {
    try {
      const quizStateKey = `quiz_${quizId}_${courseId}_state`;
      const savedState = await AsyncStorage.getItem(quizStateKey);
      
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Validate state structure
        if (parsed.selectedOptions && parsed.quizStartTime) {
          const now = Date.now();
          const elapsed = Math.floor((now - parsed.quizStartTime) / 1000);
          const timeRemaining = Math.max(0, 600 - elapsed);
          
          if (timeRemaining > 0) {
            return {
              hasProgress: true,
              answeredCount: Object.keys(parsed.selectedOptions).length,
              timeRemaining,
              currentQuestion: parsed.currentQuestion || 0
            };
          } else {
            // Quiz expired, clear state
            await AsyncStorage.removeItem(quizStateKey);
          }
        }
      }
      
      return { hasProgress: false };
    } catch (error) {
      console.error('❌ Error checking in-progress quiz:', error);
      return { hasProgress: false };
    }
  };

  const renderQuiz = ({ item, index }) => {
    // Safe fallbacks for all properties
    const quiz = {
      id: item.id || index,
      title: item.title || 'Untitled Quiz',
      description: item.description || 'No description available',
      questions: Array.isArray(item.questions) ? item.questions : [],
      isSubmitted: Boolean(item.isSubmitted),
      is_graded: Boolean(item.is_graded),
      marksObtained: Number(item.marksObtained) || 0,
      totalMarks: Number(item.totalMarks || item.total_marks) || 0,
      submission_date: item.submission_date,
      created_at: item.created_at,
      due_date: item.due_date
    };

    const statusInfo = getQuizStatusInfo(quiz);

    return (
      <Animated.View
        style={[
          styles.quizCard,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.quizItem, 
            { borderLeftColor: getQuizStatusColor(quiz) }
          ]}
          onPress={() => handleQuizPress(quiz)}
          activeOpacity={0.8}
        >
          {/* Quiz Header */}
          <View style={styles.quizHeader}>
            <View style={styles.quizTitleContainer}>
              <Text style={styles.quizTitle} numberOfLines={2}>{quiz.title}</Text>
              <Text style={styles.quizDescription} numberOfLines={1}>{quiz.description}</Text>
              <Text style={[styles.quizStatusDescription, { color: statusInfo.statusColor }]}>
                {statusInfo.description}
              </Text>
              <View style={styles.quizMetaContainer}>
                <Ionicons name="help-circle-outline" size={16} color="#666" />
                <Text style={styles.quizMeta}>
                  {quiz.questions.length} Question{quiz.questions.length !== 1 ? 's' : ''}
                </Text>
                {quiz.totalMarks > 0 && (
                  <>
                    <Text style={styles.quizMetaDivider}>•</Text>
                    <Text style={styles.quizMeta}>{quiz.totalMarks} Mark{quiz.totalMarks !== 1 ? 's' : ''}</Text>
                  </>
                )}
              </View>
            </View>
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: getQuizStatusColor(quiz) + '15' }]}>
              <Icon
                name={getQuizStatusIcon(quiz)}
                size={16}
                color={getQuizStatusColor(quiz)}
              />
              <Text style={[styles.statusText, { color: getQuizStatusColor(quiz) }]}>
                {getQuizStatusText(quiz)}
              </Text>
            </View>
          </View>

          {/* Quiz Content */}
          <View style={styles.quizContent}>
            <View style={styles.scoreContainer}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(quiz) }]}>
                  {quiz.is_graded ? `${quiz.marksObtained}/${quiz.totalMarks}` : `--/${quiz.totalMarks}`}
                </Text>
              </View>
              
              {quiz.is_graded && quiz.totalMarks > 0 && (
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Percentage</Text>
                  <Text style={[styles.scoreValue, { color: getScoreColor(quiz) }]}>
                    {Math.round((quiz.marksObtained / quiz.totalMarks) * 100)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Action Indicator */}
            <View style={styles.actionContainer}>
              {statusInfo.canTake ? (
                <>
                  <View style={styles.takeQuizButton}>
                    <Text style={styles.takeQuizButtonText}>
                      {quiz.isSubmitted ? 'View Results' : 'Take Quiz'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#ccc" style={styles.chevronIcon} />
                </>
              ) : (
                <>
                  <View style={[styles.takeQuizButton, { backgroundColor: quiz.is_graded ? '#4CAF50' : '#FF9800' }]}>
                    <Text style={styles.takeQuizButtonText}>
                      {quiz.is_graded ? 'View Results' : 'View Submission'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </>
              )}
            </View>
          </View>

          {/* Progress Bar for Graded Quizzes */}
          {quiz.is_graded && quiz.totalMarks > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${Math.min((quiz.marksObtained / quiz.totalMarks) * 100, 100)}%`,
                      backgroundColor: getScoreColor(quiz)
                    }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Submission Date */}
          {quiz.isSubmitted && quiz.submission_date && (
            <View style={styles.submissionInfo}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.submissionText}>
                Submitted: {new Date(quiz.submission_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading quizzes...</Text>
        <Text style={styles.loadingSubtext}>Please wait while we fetch your quiz data</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchQuizzes()}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color="#4A90E2" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="clipboard-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Quizzes Available</Text>
      <Text style={styles.emptyDescription}>
        There are no quizzes available for this course yet.{'\n'}
        Check back later for new quizzes.
      </Text>
    </View>
  );

  // Summary Stats - Safe calculation
  const getQuizStats = () => {
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return { completed: 0, submitted: 0, available: 0, total: 0 };
    }

    const completed = quizzes.filter(q => q && q.is_graded).length;
    const submitted = quizzes.filter(q => q && q.isSubmitted && !q.is_graded).length;
    const available = quizzes.filter(q => q && !q.isSubmitted).length;
    
    return { completed, submitted, available, total: quizzes.length };
  };

  const stats = getQuizStats();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Course Info Header */}
      {courseTitle && (
        <View style={styles.courseHeader}>
          <Text style={styles.courseHeaderTitle}>{courseTitle}</Text>
          {courseCode && <Text style={styles.courseHeaderCode}>{courseCode}</Text>}
        </View>
      )}
      
      {/* Stats Container */}
      {quizzes.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.submitted}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.available}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>
      )}

      <FlatList
        data={quizzes}
        renderItem={renderQuiz}
        keyExtractor={(item, index) => (item?.id ? item.id.toString() : index.toString())}
        contentContainerStyle={quizzes.length === 0 ? styles.flexContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
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
        ListEmptyComponent={renderEmptyState}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </View>
  );
};

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
    paddingTop: 8,
  },

  // Course Header
  courseHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  courseHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  courseHeaderCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },

  // Quiz Card Styles
  quizCard: {
    marginBottom: 16,
  },
  quizItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  quizTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 24,
  },
  quizDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  quizStatusDescription: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  quizMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  quizMeta: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  quizMetaDivider: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Quiz Content
  quizContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  scoreItem: {
    marginRight: 24,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  takeQuizButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  takeQuizButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 4,
  },

  // Progress Bar
  progressContainer: {
    marginTop: 12,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    minWidth: 2,
  },

  // Submission Info
  submissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  submissionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },

  // Loading State
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

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  retryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default StudentQuizzesScreen;





