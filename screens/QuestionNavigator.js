import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Alert, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  Vibration 
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  Easing,
  interpolateColor,
  runOnJS,
  SlideInRight,
  SlideOutLeft,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
// Fixed import - use the correct path for your project
import Ionicons from 'react-native-vector-icons/Ionicons'; // or '@expo/vector-icons/Ionicons' for Expo
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { data } from '../data/data';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Enhanced Color Palette
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
  warning: '#f59e0b',
  success: '#10b981',
  border: '#e5e7eb',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.05)',
};

export default function QuestionNavigator() {
  const route = useRoute();
  const navigation = useNavigation();
  const { questions, courseId, quizId, isSubmitted } = route.params;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuestionNav, setShowQuestionNav] = useState(true);
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);
  
  const progress = useSharedValue(0);
  const questionScale = useSharedValue(1);
  const optionAnimations = useRef(questions[currentQuestion]?.options.map(() => useSharedValue(0)) || []).current;
  const navToggleRotation = useSharedValue(0);

  // Storage key for persistence
  const getStorageKey = () => `quiz_answers_${quizId}_${courseId}`;

  // Load saved answers when component mounts
  useEffect(() => {
    loadSavedAnswers();
  }, []);

  // Load saved answers from AsyncStorage or API
  const loadSavedAnswers = async () => {
    try {
      // First try to load from AsyncStorage (for draft answers)
      const storageKey = getStorageKey();
      const savedAnswers = await AsyncStorage.getItem(storageKey);
      
      if (savedAnswers) {
        const parsedAnswers = JSON.parse(savedAnswers);
        console.log('📁 Loading saved answers from storage:', parsedAnswers);
        
        setSelectedOptions(parsedAnswers);
        setHasLoadedSavedState(true);
        
        // Update option animations for loaded state
        Object.entries(parsedAnswers).forEach(([questionIndex, optionIndex]) => {
          if (parseInt(questionIndex) === currentQuestion && optionAnimations[optionIndex]) {
            optionAnimations[optionIndex].value = 1;
          }
        });
      } else if (isSubmitted) {
        // If quiz is submitted, try to load answers from the backend
        await loadSubmittedAnswers();
      } else {
        setHasLoadedSavedState(true);
      }
    } catch (error) {
      console.error('❌ Failed to load saved answers:', error);
      setHasLoadedSavedState(true);
    }
  };

  // Load submitted answers from backend (for admin viewing submitted answers)
  const loadSubmittedAnswers = async () => {
    try {
      const authToken = await AsyncStorage.getItem('access_token');
      
      // Call an API endpoint to get submitted admin answers
      const response = await axios.get(
        `${data.url}/api/admin/course/${courseId}/quiz/${quizId}/answers`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.data.success && response.data.answers) {
        const submittedAnswers = {};
        
        // Convert submitted answers to the format expected by the component
        response.data.answers.forEach((answer, questionIndex) => {
          if (answer.selected_option_id) {
            // Find the option index for this option ID
            const question = questions[questionIndex];
            if (question && question.options) {
              const optionIndex = question.options.findIndex(opt => opt.id === answer.selected_option_id);
              if (optionIndex !== -1) {
                submittedAnswers[questionIndex] = optionIndex;
              }
            }
          }
        });
        
        console.log('📋 Loaded submitted answers:', submittedAnswers);
        setSelectedOptions(submittedAnswers);
      }
      
      setHasLoadedSavedState(true);
    } catch (error) {
      console.error('❌ Failed to load submitted answers:', error);
      setHasLoadedSavedState(true);
    }
  };

  // Save answers to AsyncStorage
  const saveAnswers = async (newSelectedOptions) => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(newSelectedOptions));
      console.log('💾 Answers saved successfully');
    } catch (error) {
      console.error('❌ Failed to save answers:', error);
    }
  };

  // Clear saved answers after successful submission
  const clearSavedAnswers = async () => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.removeItem(storageKey);
      console.log('🗑️ Saved answers cleared');
    } catch (error) {
      console.error('❌ Failed to clear saved answers:', error);
    }
  };

  // Save answers when screen loses focus (user navigates away)
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Save current answers when leaving the screen
        if (Object.keys(selectedOptions).length > 0 && !isSubmitted) {
          saveAnswers(selectedOptions);
        }
      };
    }, [selectedOptions, isSubmitted])
  );

  // Initialize with safe defaults and bounds checking
  useEffect(() => {
    // Ensure questions array is valid before proceeding
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.warn('Invalid questions array:', questions);
      return;
    }
    
    // Ensure currentQuestion is within bounds
    const safeCurrentQuestion = Math.max(0, Math.min(currentQuestion, questions.length - 1));
    if (safeCurrentQuestion !== currentQuestion) {
      setCurrentQuestion(safeCurrentQuestion);
      return;
    }
    
    animateProgress(currentQuestion);
    animateQuestionChange();
    
    // Update option animations when question changes
    if (hasLoadedSavedState) {
      updateOptionAnimationsForCurrentQuestion();
    }
  }, [currentQuestion, hasLoadedSavedState, questions]);

  // Update option animations for the current question with safety checks
  const updateOptionAnimationsForCurrentQuestion = () => {
    // Ensure we have valid questions and animations
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return;
    }
    
    if (!optionAnimations || !Array.isArray(optionAnimations)) {
      return;
    }
    
    // Ensure currentQuestion is within bounds
    const safeCurrentQuestion = Math.max(0, Math.min(currentQuestion, questions.length - 1));
    const currentQuestionData = questions[safeCurrentQuestion];
    
    if (!currentQuestionData || !currentQuestionData.options) {
      return;
    }
    
    // Reset all animations safely
    optionAnimations.forEach((animation, index) => {
      if (animation && typeof animation.value !== 'undefined') {
        animation.value = 0;
      }
    });
    
    // Set animation for selected option in current question
    const selectedOption = selectedOptions[safeCurrentQuestion];
    if (selectedOption !== undefined && 
        selectedOption >= 0 && 
        selectedOption < optionAnimations.length && 
        optionAnimations[selectedOption]) {
      optionAnimations[selectedOption].value = 1;
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      const nextQuestion = Math.min(currentQuestion + 1, questions.length - 1);
      setCurrentQuestion(nextQuestion);
      Vibration.vibrate(50); // Haptic feedback
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const prevQuestion = Math.max(currentQuestion - 1, 0);
      setCurrentQuestion(prevQuestion);
      Vibration.vibrate(50); // Haptic feedback
    }
  };

  const handleQuestionJump = (index) => {
    // Ensure index is within valid bounds
    const safeIndex = Math.max(0, Math.min(index, questions.length - 1));
    if (safeIndex !== currentQuestion && questions && questions[safeIndex]) {
      setCurrentQuestion(safeIndex);
      Vibration.vibrate(50);
    }
  };

  const handleOptionSelect = (questionIndex, optionIndex) => {
    // Don't allow selection if quiz is already submitted
    if (isSubmitted) {
      return;
    }

    // Validate indices
    if (questionIndex < 0 || questionIndex >= questions.length) {
      console.warn('Invalid question index:', questionIndex);
      return;
    }

    const currentQuestionData = questions[questionIndex];
    if (!currentQuestionData || !currentQuestionData.options || 
        optionIndex < 0 || optionIndex >= currentQuestionData.options.length) {
      console.warn('Invalid option index:', optionIndex);
      return;
    }

    setSelectedOptions((prev) => {
      const currentSelection = prev[questionIndex];
      let newSelection;
      
      // If clicking on the already selected option, deselect it
      if (currentSelection === optionIndex) {
        const { [questionIndex]: removed, ...rest } = prev;
        newSelection = rest;
        
        // Animate deselection safely
        if (optionAnimations[optionIndex] && typeof optionAnimations[optionIndex].value !== 'undefined') {
          optionAnimations[optionIndex].value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
        }
        
        // Different vibration for deselection
        Vibration.vibrate([50, 50, 50]);
      } else {
        // Normal selection logic
        newSelection = {
          ...prev,
          [questionIndex]: optionIndex,
        };
        
        // Reset previous selection animation if exists
        if (currentSelection !== undefined && 
            optionAnimations[currentSelection] && 
            typeof optionAnimations[currentSelection].value !== 'undefined') {
          optionAnimations[currentSelection].value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
        }
        
        // Animate new selection safely
        if (optionAnimations[optionIndex] && typeof optionAnimations[optionIndex].value !== 'undefined') {
          optionAnimations[optionIndex].value = withSpring(1, {
            damping: 15,
            stiffness: 150,
          });
        }
        
        // Normal selection vibration
        Vibration.vibrate(100);
      }
      
      // Save the new selection immediately
      saveAnswers(newSelection);
      
      return newSelection;
    });
  };

  const animateProgress = (index) => {
    // Fix NaN issue by ensuring valid numbers and handling edge cases
    const totalQuestions = questions.length;
    const currentIndex = index;
    
    // Ensure we have valid numbers
    if (!totalQuestions || totalQuestions <= 0 || currentIndex < 0) {
      progress.value = 0;
      return;
    }
    
    // Calculate progress with safe fallback
    let progressValue = 0;
    if (totalQuestions === 1) {
      progressValue = currentIndex >= 0 ? 1 : 0;
    } else {
      progressValue = Math.min(Math.max(currentIndex / (totalQuestions - 1), 0), 1);
    }
    
    // Ensure the progress value is valid
    if (isNaN(progressValue) || !isFinite(progressValue)) {
      progressValue = 0;
    }
    
    console.log('Progress calculation:', { currentIndex, totalQuestions, progressValue });
    
    progress.value = withTiming(progressValue, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  };

  const animateQuestionChange = () => {
    questionScale.value = withSpring(0.95, { damping: 15 }, () => {
      questionScale.value = withSpring(1, { damping: 15 });
    });
  };

  const toggleQuestionNav = () => {
    setShowQuestionNav(!showQuestionNav);
    navToggleRotation.value = withSpring(showQuestionNav ? 180 : 0);
  };

  const handleSubmit = async () => {
    const unansweredQuestions = questions.filter((_, index) => selectedOptions[index] === undefined);
    
    if (unansweredQuestions.length > 0) {
      Alert.alert(
        'Incomplete Quiz',
        `You have ${unansweredQuestions.length} unanswered question(s). Please answer all questions before submitting.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Submit Quiz',
      'Are you sure you want to submit your answers? You cannot change them after submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          style: 'destructive',
          onPress: submitAnswers 
        }
      ]
    );
  };

  const submitAnswers = async () => {
    setIsSubmitting(true);
    
    try {
      const answers = questions.map((question, index) => ({
        question_id: question.id,
        selected_option_id: selectedOptions[index] ?? null,
      }));
      
      const payload = { answers };
      const authToken = await AsyncStorage.getItem('access_token');
      
      await axios.post(
        `${data.url}/api/admin/course/${courseId}/quiz/${quizId}/answer`, 
        payload, 
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // Clear saved answers after successful submission
      await clearSavedAnswers();

      Alert.alert(
        'Success!', 
        'Your answers have been submitted successfully!',
        [{ 
          text: 'OK', 
          style: 'default',
          onPress: () => {
            // Navigate back or to results screen
            navigation.goBack();
          }
        }]
      );
    } catch (error) {
      Alert.alert(
        'Submission Failed', 
        'Failed to submit answers. Please check your connection and try again.',
        [{ text: 'Retry', onPress: submitAnswers }, { text: 'Cancel' }]
      );
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animated Styles with NaN protection
  const animatedProgressStyle = useAnimatedStyle(() => {
    const maxWidth = screenWidth - 40;
    const calculatedWidth = progress.value * maxWidth;
    
    // Protect against NaN and invalid values
    const safeWidth = isNaN(calculatedWidth) || !isFinite(calculatedWidth) || calculatedWidth < 0 
      ? 0 
      : Math.min(calculatedWidth, maxWidth);
    
    return {
      width: safeWidth,
    };
  });

  const questionContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: questionScale.value }],
  }));

  const navToggleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${navToggleRotation.value}deg` }],
  }));

  const answeredCount = Object.keys(selectedOptions).length;
  const completionPercentage = Math.round((answeredCount / questions.length) * 100);

  // Don't render until saved state is loaded
  if (!hasLoadedSavedState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header with Progress */}
      <View style={styles.header}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {isSubmitted ? 'Quiz Results' : 'Quiz Progress'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Question {currentQuestion + 1} of {questions.length}
            </Text>
            <View style={styles.completionInfo}>
              <Text style={styles.completionText}>
                {completionPercentage}% Complete ({answeredCount}/{questions.length})
              </Text>
            </View>
            {isSubmitted && (
              <View style={styles.submittedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={styles.submittedText}>Submitted</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
        </View>
      </View>

      {/* Question Navigation Toggle */}
      <TouchableOpacity style={styles.navToggle} onPress={toggleQuestionNav}>
        <Animated.View style={navToggleStyle}>
          <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.navToggleText}>
          {showQuestionNav ? 'Hide' : 'Show'} Question Grid
        </Text>
      </TouchableOpacity>

      {/* Question Navigation Grid */}
      {showQuestionNav && (
        <Animated.View 
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.questionNavContainer}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.questionNavScroll}
          >
            {questions.map((_, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => handleQuestionJump(index)}
                style={styles.questionNavItem}
              >
                <View
                  style={[
                    styles.questionCircle,
                    selectedOptions[index] !== undefined && styles.questionCircleAnswered,
                    currentQuestion === index && styles.currentQuestionCircle,
                  ]}
                >
                  {selectedOptions[index] !== undefined ? (
                    <Ionicons name="checkmark" size={16} color="white" />
                  ) : (
                    <Text style={[
                      styles.questionNumber,
                      currentQuestion === index && styles.currentQuestionNumber
                    ]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.questionContainer, questionContainerStyle]}>
          {/* Question Text */}
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>Question {currentQuestion + 1}</Text>
            <Text style={styles.questionText}>
              {questions[currentQuestion]?.text}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {questions[currentQuestion]?.options.map((option, idx) => {
              const isSelected = selectedOptions[currentQuestion] === idx;
              
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                    isSubmitted && styles.optionButtonDisabled,
                  ]}
                  onPress={() => handleOptionSelect(currentQuestion, idx)}
                  activeOpacity={isSubmitted ? 1 : 0.8}
                  disabled={isSubmitted}
                >
                  <View style={styles.optionContent}>
                    <View style={[
                      styles.optionIndicator,
                      isSelected && styles.optionIndicatorSelected
                    ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}>
                      {option.text}
                    </Text>
                    {/* Visual indicator for selected state */}
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>Selected</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Deselection Hint - only show if not submitted */}
          {!isSubmitted && selectedOptions[currentQuestion] !== undefined && (
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.deselectionHint}
            >
              <Ionicons name="information-circle" size={16} color={COLORS.primary} />
              <Text style={styles.deselectionHintText}>
                Tap the selected option again to deselect it
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Navigation Footer - only show if not submitted */}
      {!isSubmitted && (
        <View style={styles.navigationFooter}>
          <LinearGradient
            colors={['transparent', COLORS.background]}
            style={styles.footerGradient}
          >
            <View style={styles.navButtons}>
              {/* Previous Button */}
              {currentQuestion > 0 && (
                <TouchableOpacity 
                  style={styles.navButton} 
                  onPress={handlePrevious}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.textSecondary, COLORS.textLight]}
                    style={styles.navButtonGradient}
                  >
                    <Ionicons name="chevron-back" size={24} color="white" />
                    <Text style={styles.navButtonText}>Previous</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Next/Submit Button */}
              <TouchableOpacity
                style={[styles.navButton, styles.primaryNavButton]}
                onPress={currentQuestion < questions.length - 1 ? handleNext : handleSubmit}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={
                    currentQuestion < questions.length - 1 
                      ? [COLORS.primary, COLORS.primaryDark]
                      : [COLORS.success, '#059669']
                  }
                  style={styles.navButtonGradient}
                >
                  {currentQuestion < questions.length - 1 ? (
                    <>
                      <Text style={styles.navButtonText}>Next</Text>
                      <Ionicons name="chevron-forward" size={24} color="white" />
                    </>
                  ) : (
                    <>
                      <Ionicons 
                        name={isSubmitting ? "hourglass" : "checkmark-circle"} 
                        size={24} 
                        color="white" 
                      />
                      <Text style={styles.navButtonText}>
                        {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
  },
  
  header: {
    marginBottom: 10,
  },
  
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  
  headerContent: {
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
  },
  
  completionInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  
  completionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  
  submittedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  
  progressBackground: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  
  navToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  
  navToggleText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  questionNavContainer: {
    marginBottom: 15,
  },
  
  questionNavScroll: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  
  questionNavItem: {
    marginHorizontal: 6,
  },
  
  questionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  questionCircleAnswered: {
    backgroundColor: COLORS.success,
  },
  
  currentQuestionCircle: {
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.surface,
    transform: [{ scale: 1.1 }],
  },
  
  questionNumber: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  currentQuestionNumber: {
    color: 'white',
  },
  
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  questionContainer: {
    paddingBottom: 20,
  },
  
  questionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  questionLabel: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  questionText: {
    fontSize: 20,
    color: COLORS.text,
    lineHeight: 28,
    fontWeight: '500',
    marginBottom: 12,
  },
  
  optionsContainer: {
    gap: 12,
  },
  
  optionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    transform: [{ scale: 1.02 }],
  },
  
  optionButtonDisabled: {
    opacity: 0.7,
  },
  
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  optionIndicatorSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
    lineHeight: 22,
  },
  
  optionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  
  selectedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  
  selectedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  deselectionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  
  deselectionHintText: {
    color: COLORS.primary,
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  
  navigationFooter: {
    paddingBottom: 20,
  },
  
  footerGradient: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  
  navButton: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  
  primaryNavButton: {
    flex: 1.2,
  },
  
  navButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});