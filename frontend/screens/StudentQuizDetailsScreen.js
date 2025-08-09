import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Alert, 
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  AppState
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  withSpring
} from 'react-native-reanimated';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { data } from '../data/data';
import { AuthContext } from '../store/auth_context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

export default function StudentQuizDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { logout } = useContext(AuthContext);
  
  // Get route parameters with safe fallbacks
  const routeParams = route.params || {};
  const {
    questions: routeQuestions,
    quizId,
    courseId,
    isSubmitted: routeIsSubmitted,
    quiz,
    courseTitle,
    courseCode,
    existingState
  } = routeParams;

  // State with safe initialization
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(Boolean(routeIsSubmitted));
  const [role, setRole] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [timerInterval, setTimerInterval] = useState(null);
  const [autoSubmitTimer, setAutoSubmitTimer] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Animations
  const progress = useSharedValue(0);
  const cardAnimation = useSharedValue(0);

  // Storage keys for persistence
  const getStorageKey = (suffix) => `quiz_${quizId}_${courseId}_${suffix}`;

  console.log('=== Quiz Component Render ===');
  console.log('QuizId:', quizId, 'CourseId:', courseId);
  console.log('Route isSubmitted:', routeIsSubmitted);
  console.log('Existing state passed:', existingState);

  // Enhanced save quiz state with better verification and race condition handling
  const saveQuizState = async (optionsOverride = null, questionOverride = null, timeOverride = null) => {
    if (!quizId || !courseId || isSubmitted || role === 'admin') {
      console.log('❌ Skipping save - invalid conditions');
      return false;
    }

    // Prevent multiple concurrent saves
    if (isSaving) {
      console.log('⏳ Save already in progress, skipping...');
      return false;
    }

    setIsSaving(true);

    try {
      const currentTimestamp = Date.now();
      const stateToSave = {
        selectedOptions: optionsOverride !== null ? optionsOverride : selectedOptions,
        currentQuestion: questionOverride !== null ? questionOverride : currentQuestion,
        timeRemaining: timeOverride !== null ? timeOverride : timeRemaining,
        quizStartTime: quizStartTime || currentTimestamp,
        lastSaved: currentTimestamp,
        version: 1,
        saveId: `${currentTimestamp}_${Math.random().toString(36).substr(2, 9)}` // Unique save ID
      };

      console.log('💾 Saving quiz state:', stateToSave);
      
      const key = getStorageKey('state');
      
      // Use await to ensure write completes before verification
      await AsyncStorage.setItem(key, JSON.stringify(stateToSave));
      
      // Add small delay to ensure AsyncStorage write is fully committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify save worked with better error handling
      try {
        const verification = await AsyncStorage.getItem(key);
        if (verification) {
          const parsed = JSON.parse(verification);
          
          // Use saveId for verification instead of timestamp (more reliable)
          if (parsed.saveId === stateToSave.saveId) {
            console.log('✅ Quiz state saved and verified successfully');
            return true;
          } else {
            console.error('❌ Save verification failed - saveId mismatch');
            console.error('Expected:', stateToSave.saveId);
            console.error('Found:', parsed.saveId);
            return false;
          }
        } else {
          console.error('❌ Save verification failed - no data found after save');
          return false;
        }
      } catch (verificationError) {
        console.error('❌ Save verification failed - parse error:', verificationError);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Simplified immediate save function for option selection (no verification to avoid race conditions)
  const saveQuizStateImmediate = async (newSelectedOptions, questionIndex) => {
    if (!quizId || !courseId || isSubmitted || role === 'admin') {
      return;
    }

    try {
      const immediateState = {
        selectedOptions: newSelectedOptions,
        currentQuestion: questionIndex,
        timeRemaining,
        quizStartTime: quizStartTime || Date.now(),
        lastSaved: Date.now(),
        version: 1
      };
      
      const key = getStorageKey('state');
      
      // Fire and forget - don't wait for verification to avoid blocking UI
      AsyncStorage.setItem(key, JSON.stringify(immediateState))
        .then(() => console.log('✅ Option selection saved immediately'))
        .catch(error => console.error('❌ Failed to save option selection:', error));
        
    } catch (error) {
      console.error('❌ Immediate save failed:', error);
    }
  };

  // Enhanced load quiz state with better validation
  const loadQuizState = async () => {
    if (!quizId || !courseId) {
      console.log('❌ Cannot load - missing IDs');
      return null;
    }

    try {
      const key = getStorageKey('state');
      console.log('📁 Loading from key:', key);
      
      const saved = await AsyncStorage.getItem(key);
      console.log('📄 Raw saved data exists:', !!saved);
      
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📋 Parsed saved data:', parsed);
        
        // Validate the parsed data structure
        if (!parsed.selectedOptions || typeof parsed.selectedOptions !== 'object') {
          console.log('❌ Invalid selectedOptions in saved data');
          await AsyncStorage.removeItem(key);
          return null;
        }
        
        if (!parsed.quizStartTime || typeof parsed.quizStartTime !== 'number') {
          console.log('❌ Invalid quizStartTime in saved data');
          await AsyncStorage.removeItem(key);
          return null;
        }
        
        // Calculate actual time remaining
        const now = Date.now();
        const elapsed = Math.floor((now - parsed.quizStartTime) / 1000);
        const remaining = Math.max(0, 600 - elapsed);
        
        console.log('⏰ Time calculation:', {
          startTime: new Date(parsed.quizStartTime).toLocaleTimeString(),
          elapsed: elapsed + ' seconds',
          remaining: remaining + ' seconds'
        });
        
        if (remaining <= 0) {
          console.log('⏰ Saved quiz has expired, clearing state');
          await AsyncStorage.removeItem(key);
          return null;
        }
        
        parsed.timeRemaining = remaining;
        return parsed;
      } else {
        console.log('📭 No saved data found');
        return null;
      }
    } catch (error) {
      console.error('❌ Load failed:', error);
      // Clear corrupted data
      try {
        await AsyncStorage.removeItem(getStorageKey('state'));
      } catch (clearError) {
        console.error('❌ Failed to clear corrupted data:', clearError);
      }
      return null;
    }
  };

  // Clear quiz state from local storage
  const clearQuizState = async () => {
    try {
      const key = getStorageKey('state');
      await AsyncStorage.removeItem(key);
      console.log('🗑️ Quiz state cleared');
    } catch (error) {
      console.error('❌ Error clearing quiz state:', error);
    }
  };

  // Enhanced useFocusEffect with better save handling
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 SCREEN FOCUSED - Checking for saved state');
      
      const restoreStateIfNeeded = async () => {
        if (!isSubmitted && role !== 'admin' && questions.length > 0 && !hasRestoredState) {
          console.log('🔄 Attempting state restoration...');
          
          let stateToRestore = existingState;
          
          if (!stateToRestore) {
            stateToRestore = await loadQuizState();
          }
          
          if (stateToRestore) {
            console.log('✅ RESTORING SAVED STATE');
            console.log('📊 Restoring selectedOptions:', stateToRestore.selectedOptions);
            console.log('📍 Restoring currentQuestion:', stateToRestore.currentQuestion);
            console.log('⏰ Restoring timeRemaining:', stateToRestore.timeRemaining);
            
            setSelectedOptions(stateToRestore.selectedOptions || {});
            setCurrentQuestion(stateToRestore.currentQuestion || 0);
            setTimeRemaining(stateToRestore.timeRemaining || 600);
            setQuizStartTime(stateToRestore.quizStartTime || Date.now());
            setHasRestoredState(true);
            
            setTimeout(() => {
              animateProgress(stateToRestore.currentQuestion || 0);
            }, 200);
            
            if (timerInterval) clearInterval(timerInterval);
            if (autoSubmitTimer) clearTimeout(autoSubmitTimer);
            
            setTimeout(() => {
              setupQuizTimer(stateToRestore.timeRemaining || 600);
            }, 500);
          }
        }
      };
      
      const timeoutId = setTimeout(restoreStateIfNeeded, 300);
      
      return () => {
        clearTimeout(timeoutId);
        console.log('👋 Screen blurred - saving state immediately');
        
        // Use immediate save without verification on screen blur
        if (quizId && courseId && !isSubmitted && role !== 'admin') {
          const stateToSave = {
            selectedOptions,
            currentQuestion,
            timeRemaining,
            quizStartTime: quizStartTime || Date.now(),
            lastSaved: Date.now(),
            version: 1
          };
          
          console.log('💾 Immediate save on blur:', stateToSave);
          
          // Use fire-and-forget approach for blur save to prevent delays
          AsyncStorage.setItem(getStorageKey('state'), JSON.stringify(stateToSave))
            .then(() => console.log('✅ State saved on blur successfully'))
            .catch(error => console.error('❌ Failed to save on blur:', error));
        }
      };
    }, [
      questions.length, 
      role, 
      isSubmitted, 
      quizId, 
      courseId, 
      selectedOptions, 
      currentQuestion, 
      timeRemaining, 
      quizStartTime, 
      hasRestoredState,
      existingState
    ])
  );

  // Initialize quiz only once
  useEffect(() => {
    initializeQuiz();
    
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (autoSubmitTimer) clearTimeout(autoSubmitTimer);
    };
  }, []); // Empty dependency - run only once

  // App state change handler for background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📱 App going to background - saving state');
        if (!isSaving) {
          saveQuizState().catch(error => 
            console.error('❌ Background save failed:', error)
          );
        }
      } else if (nextAppState === 'active' && hasRestoredState) {
        console.log('📱 App became active - checking if state needs refresh');
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [quizId, courseId, isSubmitted, role, selectedOptions, currentQuestion, timeRemaining, hasRestoredState, isSaving]);

  // Updated periodic auto-save with reduced frequency
  useEffect(() => {
    if (!isSubmitted && role !== 'admin' && hasRestoredState) {
      console.log('🔄 Setting up periodic auto-save');
      
      const autoSaveInterval = setInterval(() => {
        console.log('🔄 Periodic auto-save triggered');
        // Use the verified save function
        if (!isSaving) {
          saveQuizState().catch(error => 
            console.error('❌ Periodic save failed:', error)
          );
        }
      }, 60000); // Every 60 seconds to reduce save frequency
      
      return () => {
        console.log('🔄 Clearing periodic auto-save');
        clearInterval(autoSaveInterval);
      };
    }
  }, [isSubmitted, role, hasRestoredState, isSaving]);

  const initializeQuiz = async () => {
    console.log('🚀 INITIALIZING QUIZ');
    
    try {
      setLoading(true);
      setError(null);
      
      // Get user role
      const userRole = await AsyncStorage.getItem('role');
      setRole(userRole);
      console.log('👤 User role:', userRole);

      // Validate required parameters
      if (!quizId || !courseId) {
        throw new Error('Missing quiz ID or course ID');
      }

      // Process questions data
      let questionsData = [];
      
      if (routeQuestions && Array.isArray(routeQuestions) && routeQuestions.length > 0) {
        console.log('📝 Using questions from route params');
        questionsData = processQuestions(routeQuestions);
      } else if (quiz && quiz.questions && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
        console.log('📝 Using questions from quiz object');
        questionsData = processQuestions(quiz.questions);
      } else {
        console.log('🌐 Fetching questions from API...');
        questionsData = await fetchQuizQuestions();
      }

      if (!questionsData || questionsData.length === 0) {
        throw new Error('No questions found for this quiz');
      }

      setQuestions(questionsData);
      console.log('📋 Questions loaded:', questionsData.length);

      // Handle quiz state based on submission status
      if (isSubmitted) {
        console.log('📤 Quiz already submitted - setting up submitted view');
        setupSubmittedQuizSelections(questionsData);
      } else if (userRole !== 'admin') {
        console.log('🔄 Student quiz - will check for saved state in focus effect');
        
        // Set initial state if no existing state
        if (!existingState) {
          const startTime = Date.now();
          setQuizStartTime(startTime);
          setTimeRemaining(600);
        }
      }

      // Animate card entrance
      cardAnimation.value = withSpring(1, {
        damping: 15,
        stiffness: 100,
      });

    } catch (err) {
      console.error('❌ Initialize error:', err);
      setError(err.message || 'Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  // Updated timer setup with better save handling
  const setupQuizTimer = (initialTime = timeRemaining) => {
    console.log('⏰ SETTING UP TIMER with time:', initialTime);
    
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    if (autoSubmitTimer) {
      clearTimeout(autoSubmitTimer);
      setAutoSubmitTimer(null);
    }

    if (isSubmitted || role === 'admin') {
      console.log('⏰ Skipping timer - submitted or admin');
      return;
    }

    if (initialTime <= 0) {
      console.log('⏰ Time expired - auto submit');
      handleSubmit();
      return;
    }

    console.log('⏰ Starting timer with', initialTime, 'seconds');
    setTimeRemaining(initialTime);

    const autoTimer = setTimeout(() => {
      console.log('⏰ AUTO SUBMIT TRIGGERED');
      handleSubmit();
    }, initialTime * 1000);
    setAutoSubmitTimer(autoTimer);

    const countdownTimer = setInterval(() => {
      setTimeRemaining((prevTime) => {
        const newTime = prevTime - 1;
        
        // Save state every 30 seconds instead of 10 to reduce save frequency
        if (newTime % 30 === 0 && newTime > 0 && !isSaving) {
          console.log('⏰ Timer auto-save at', newTime, 'seconds');
          
          // Use the verified save function but don't wait for it
          saveQuizState(null, null, newTime).catch(error => 
            console.error('❌ Timer save failed:', error)
          );
        }
        
        if (newTime <= 0) {
          clearInterval(countdownTimer);
          handleSubmit();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    setTimerInterval(countdownTimer);
  };

  // Updated handleOptionSelect with the new immediate save function
  const handleOptionSelect = (questionIndex, optionIndex) => {
    if (isSubmitted || role === 'admin') return;

    console.log('🎯 OPTION SELECTED:', questionIndex, '->', optionIndex);

    setSelectedOptions((prev) => {
      const newState = { ...prev };
      
      if (prev[questionIndex] === optionIndex) {
        delete newState[questionIndex];
        console.log('❌ Deselected option');
      } else {
        newState[questionIndex] = optionIndex;
        console.log('✅ Selected option');
      }
      
      console.log('📝 New selectedOptions:', newState);
      
      // Use immediate save function that doesn't block or verify
      saveQuizStateImmediate(newState, questionIndex);
      
      return newState;
    });
  };

  const processQuestions = (rawQuestions) => {
    if (!Array.isArray(rawQuestions)) {
      console.warn('Questions is not an array:', rawQuestions);
      return [];
    }

    return rawQuestions.map((question, index) => ({
      id: question.id || index,
      text: question.question_text || question.text || `Question ${index + 1}`,
      options: processOptions(question.options || []),
      selected_option_id: question.selected_option_id || null,
      isCorrect: question.isCorrect,
      marks: question.marks || 1
    }));
  };

  const processOptions = (rawOptions) => {
    if (!Array.isArray(rawOptions)) {
      console.warn('Options is not an array:', rawOptions);
      return [];
    }

    return rawOptions.map((option, index) => ({
      id: option.id || index,
      text: option.text || `Option ${index + 1}`
    }));
  };

  const fetchQuizQuestions = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching quiz from API...');
      const response = await axios.get(`${data.url}/api/course/${courseId}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      console.log('API Response:', response.data);

      if (response.data.success && response.data.quizzes) {
        const targetQuiz = response.data.quizzes.find(q => q.id == quizId);
        if (targetQuiz && targetQuiz.questions) {
          return processQuestions(targetQuiz.questions);
        }
      }
      
      throw new Error('Quiz not found or has no questions');
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.', [
          { text: 'OK', onPress: () => logout() }
        ]);
      }
      throw error;
    }
  };

  const setupSubmittedQuizSelections = (questionsData) => {
    const initialSelections = {};
    questionsData.forEach((question, index) => {
      if (question.selected_option_id !== undefined && question.selected_option_id !== null) {
        const optionIndex = question.options.findIndex(opt => opt.id == question.selected_option_id);
        if (optionIndex !== -1) {
          initialSelections[index] = optionIndex;
        }
      }
    });
    setSelectedOptions(initialSelections);
    console.log('Initial selections for submitted quiz:', initialSelections);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      animateProgress(nextQuestion);
      
      // Save state when navigating (use verified save)
      if (!isSaving) {
        saveQuizState(null, nextQuestion).catch(error => 
          console.error('❌ Navigation save failed:', error)
        );
      }
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      const prevQuestion = currentQuestion - 1;
      setCurrentQuestion(prevQuestion);
      animateProgress(prevQuestion);
      
      // Save state when navigating (use verified save)
      if (!isSaving) {
        saveQuizState(null, prevQuestion).catch(error => 
          console.error('❌ Navigation save failed:', error)
        );
      }
    }
  };

  const handleQuestionSelect = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
      animateProgress(index);
      
      // Save state when navigating (use verified save)
      if (!isSaving) {
        saveQuizState(null, index).catch(error => 
          console.error('❌ Question select save failed:', error)
        );
      }
    }
  };

  const animateProgress = (index) => {
    const progressValue = questions.length > 1 ? index / (questions.length - 1) : 0;
    progress.value = withTiming(progressValue, {
      duration: 800,
      easing: Easing.inOut(Easing.ease),
    });
  };

  const handleSubmit = async () => {
    if (role === 'admin' || isSubmitted) {
      console.log('Cannot submit: admin user or already submitted');
      return;
    }

    try {
      console.log('📤 Submitting quiz...');
      
      // Clear timers immediately
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      if (autoSubmitTimer) {
        clearTimeout(autoSubmitTimer);
        setAutoSubmitTimer(null);
      }

      // Prepare answers
      const answers = questions.map((question, index) => {
        const selectedOptionIndex = selectedOptions[index];
        const selectedOption = selectedOptionIndex !== undefined ? question.options[selectedOptionIndex] : null;
        
        return {
          question_id: question.id,
          selected_option_id: selectedOption ? selectedOption.id : null,
        };
      });

      console.log('Submitting answers:', answers);

      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const payload = {
        quiz_id: quizId,
        course_id: courseId,
        answers,
      };

      const response = await axios.post(`${data.url}/api/quiz/submit`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Submit response:', response.data);

      if (response.data.success) {
        setIsSubmitted(true);
        await clearQuizState();
        
        Alert.alert('Success', 'Your answers have been submitted!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'There was an issue submitting your answers.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit your answers. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 60) return '#FF4444';
    if (timeRemaining <= 180) return '#FF8C00';
    return '#4A90E2';
  };

  const getCompletionPercentage = () => {
    if (questions.length === 0) return 0;
    const answeredQuestions = Object.keys(selectedOptions).length;
    return Math.round((answeredQuestions / questions.length) * 100);
  };

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: progress.value * (screenWidth - 40),
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardAnimation.value },
      { translateY: (1 - cardAnimation.value) * 20 }
    ],
    opacity: cardAnimation.value,
  }));

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
        <Text style={styles.errorTitle}>Unable to Load Quiz</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            initializeQuiz();
          }}
        >
          <Ionicons name="refresh" size={20} color="#4A90E2" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No questions state
  if (!questions || questions.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="help-circle-outline" size={64} color="#ccc" />
        <Text style={styles.errorTitle}>No Questions Found</Text>
        <Text style={styles.errorDescription}>
          This quiz doesn't have any questions yet.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Safe access to current question
  const currentQuestionData = questions[currentQuestion] || {};
  const currentOptions = currentQuestionData.options || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Quiz</Text>
          <Text style={styles.headerSubtitle}>
            Question {currentQuestion + 1} of {questions.length}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
            </Text>
          </View>
          
          {!isSubmitted && role !== 'admin' && (
            <View style={styles.timerContainer}>
              <Ionicons name="time" size={20} color={getTimerColor()} />
              <Text style={[styles.timerText, { color: getTimerColor() }]}>
                {formatTime(timeRemaining)}
              </Text>
              {isSaving && (
                <View style={styles.savingIndicator}>
                  <ActivityIndicator size="small" color="#4A90E2" />
                  <Text style={styles.savingText}>Saving...</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Question Navigation */}
        <View style={styles.questionNavSection}>
          <Text style={styles.navTitle}>Questions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.questionNavContainer}>
            {questions.map((_, index) => (
              <TouchableOpacity key={index} onPress={() => handleQuestionSelect(index)}>
                <View style={styles.questionItem}>
                  <View
                    style={[
                      styles.questionCircle,
                      selectedOptions[index] !== undefined && styles.questionCircleAnswered,
                      currentQuestion === index && styles.currentQuestionCircle,
                    ]}
                  >
                    <Text style={[
                      styles.questionNumber,
                      currentQuestion === index && styles.currentQuestionNumber
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Question Card */}
        <Animated.View style={[styles.questionCard, animatedCardStyle]}>
          <View style={styles.questionHeader}>
            <View style={styles.questionBadge}>
              <Text style={styles.questionBadgeText}>Q{currentQuestion + 1}</Text>
            </View>
            {isSubmitted && (
              <View style={styles.submittedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.submittedText}>Submitted</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.questionText}>{currentQuestionData.text || 'Question text not available'}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentOptions.map((option, idx) => {
              const isSelected = selectedOptions[currentQuestion] === idx;
              const isCorrect = currentQuestionData.isCorrect;
              const isAnswer = isCorrect !== undefined && idx === selectedOptions[currentQuestion];

              return (
                <TouchableOpacity
                  key={`${currentQuestion}-${idx}`}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                    isSubmitted && isAnswer && (isCorrect ? styles.correctOption : styles.incorrectOption),
                    (role === 'admin' || isSubmitted) && styles.optionButtonDisabled,
                  ]}
                  onPress={() => handleOptionSelect(currentQuestion, idx)}
                  disabled={isSubmitted || role === 'admin'}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionContent}>
                    <View style={[
                      styles.optionIndicator,
                      isSelected && styles.optionIndicatorSelected,
                      isSubmitted && isAnswer && (isCorrect ? styles.correctIndicator : styles.incorrectIndicator),
                    ]}>
                      {isSelected && <View style={styles.optionIndicatorDot} />}
                    </View>
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                      isSubmitted && isAnswer && styles.submittedOptionText,
                    ]}>
                      {option.text || `Option ${idx + 1}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Completion Status */}
        {!isSubmitted && role !== 'admin' && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Progress Summary</Text>
            <Text style={styles.completionText}>
              {Object.keys(selectedOptions).length} of {questions.length} questions answered ({getCompletionPercentage()}%)
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.navigationFooter}>
        <TouchableOpacity
          onPress={handlePrev}
          style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
          disabled={currentQuestion === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={currentQuestion === 0 ? "#ccc" : "#4A90E2"} />
          <Text style={[styles.navButtonText, currentQuestion === 0 && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        {currentQuestion < questions.length - 1 ? (
          <TouchableOpacity
            onPress={handleNext}
            style={styles.navButton}
            activeOpacity={0.8}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color="#4A90E2" />
          </TouchableOpacity>
        ) : (
          !isSubmitted && role !== 'admin' && (
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.submitButton}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Quiz</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4A90E2',
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerBackButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  savingText: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 4,
  },
  questionNavSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  questionNavContainer: {
    flexDirection: 'row',
  },
  questionItem: {
    alignItems: 'center',
    marginRight: 12,
  },
  questionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCircleAnswered: {
    backgroundColor: '#4A90E2',
  },
  currentQuestionCircle: {
    borderWidth: 3,
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  questionNumber: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  currentQuestionNumber: {
    color: '#fff',
  },
  questionCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  questionBadgeText: {
    color: '#1976D2',
    fontWeight: '600',
    fontSize: 14,
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  submittedText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  questionText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
    marginBottom: 24,
    fontWeight: '500',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIndicatorSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  optionIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#1976D2',
    fontWeight: '500',
  },
  submittedOptionText: {
    fontWeight: '500',
  },
  correctOption: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  incorrectOption: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  correctIndicator: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  incorrectIndicator: {
    borderColor: '#F44336',
    backgroundColor: '#F44336',
  },
  completionCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  completionText: {
    fontSize: 14,
    color: '#666',
  },
  navigationFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
    marginHorizontal: 8,
  },
  navButtonTextDisabled: {
    color: '#ccc',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});