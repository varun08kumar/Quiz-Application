import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { data } from '../data/data';

const QuizzesScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gradingQuizId, setGradingQuizId] = useState(null);

  // Fetch quizzes from the backend
  const fetchQuizzes = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await axios.get(
        `${data.url}/api/admin/course/${courseId}/quizzes`,
        { timeout: 10000 } // Add timeout
      );
      
      if (response.data.success && response.data.quizzes) {
        setQuizzes(response.data.quizzes);
      } else {
        setQuizzes([]);
        if (!isRefresh) {
          Alert.alert('No Quizzes', 'No quizzes available for this course.');
        }
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      
      // Better error handling
      let errorMessage = 'Unable to fetch quizzes. Please try again.';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuizzes(true);
  }, [fetchQuizzes]);

  // Add the "Add Quiz" button to the header
  const handleAddQuiz = useCallback(() => {
    navigation.navigate('AddQuestionScreen', { courseId });
  }, [navigation, courseId]);

  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();

      // Set the header with the "Add Quiz" button
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity style={styles.addButton} onPress={handleAddQuiz}>
            <Text style={styles.addButtonText}>+ Add Quiz</Text>
          </TouchableOpacity>
        ),
      });
    }, [navigation, fetchQuizzes, handleAddQuiz])
  );

  const handleGradeQuiz = useCallback(async (quizId) => {
    Alert.alert(
      'Grade Quiz',
      'Are you sure you want to grade all users who attended this quiz?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Grade',
          style: 'destructive',
          onPress: async () => {
            setGradingQuizId(quizId);
            try {
              const response = await axios.post(
                `${data.url}/api/admin/course/${courseId}/quiz/${quizId}/grade`,
                {},
                { timeout: 15000 }
              );
              
              if (response.data.success) {
                Alert.alert('Success', 'The quiz has been graded successfully.', [
                  { text: 'OK', onPress: () => fetchQuizzes() }
                ]);
              } else {
                Alert.alert('Error', response.data.message || 'Failed to grade the quiz.');
              }
            } catch (error) {
              console.error('Error grading quiz:', error);
              
              let errorMessage = 'Unable to grade the quiz. Please try again.';
              if (error.code === 'ECONNABORTED') {
                errorMessage = 'Grading timeout. The process may still be running.';
              } else if (error.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setGradingQuizId(null);
            }
          },
        },
      ]
    );
  }, [courseId, fetchQuizzes]);

  const navigateToQuizDetails = useCallback((item) => {
    navigation.navigate('QuizDetailsScreen', { 
      quizId: item.id, 
      questions: item.questions,
      courseId 
    });
  }, [navigation, courseId]);

  const renderQuiz = useCallback(({ item, index }) => {
    const isGrading = gradingQuizId === item.id;
    
    return (
      <Animated.View style={[styles.quizItem, { opacity: isGrading ? 0.7 : 1 }]}>
        <TouchableOpacity
          style={styles.quizContent}
          onPress={() => navigateToQuizDetails(item)}
          disabled={isGrading}
          activeOpacity={0.7}
        >
          <View>
            <Text style={styles.quizTitle}>{item.title}</Text>
            <Text style={styles.quizSubtitle}>
              Questions: {item.questions?.length || 0}
            </Text>
            {item.createdAt && (
              <Text style={styles.dateText}>
                Created: {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.gradeButton,
            isGrading && styles.gradeButtonDisabled
          ]}
          onPress={() => handleGradeQuiz(item.id)}
          disabled={isGrading}
          activeOpacity={0.7}
        >
          {isGrading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.gradeButtonText}>Grade</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }, [gradingQuizId, navigateToQuizDetails, handleGradeQuiz]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateTitle}>No Quizzes Yet</Text>
      <Text style={styles.emptyStateMessage}>
        Create your first quiz to get started with assessments.
      </Text>
      <TouchableOpacity style={styles.createFirstQuizButton} onPress={handleAddQuiz}>
        <Text style={styles.createFirstQuizText}>Create First Quiz</Text>
      </TouchableOpacity>
    </View>
  ), [handleAddQuiz]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading quizzes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quizzes</Text>
      
      {quizzes.length > 0 ? (
        <FlatList
          data={quizzes}
          renderItem={renderQuiz}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007bff']}
              tintColor="#007bff"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        renderEmptyState()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
    marginTop: 10,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quizItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  quizContent: {
    flex: 1,
    padding: 16,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  quizSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  addButton: {
    marginRight: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  gradeButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  gradeButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  gradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  createFirstQuizButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createFirstQuizText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginHorizontal: 20,
  },
});
export default QuizzesScreen;
