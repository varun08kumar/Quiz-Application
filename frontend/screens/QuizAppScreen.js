import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { Easing, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;

const questions = [
  {
    text: "What is React Native?",
    options: ["A mobile app framework", "A database", "A backend service", "A cloud provider"],
  },
  {
    text: "What is Expo?",
    options: ["A code editor", "A build toolchain for React Native", "A cloud storage", "A backend framework"],
  },
  {
    text: "What is React Navigation?",
    options: ["A routing library", "A database", "A testing framework", "An animation library"],
  },
  {
    text: "What is Redux?",
    options: ["A state management tool", "A CSS framework", "A cloud provider", "A database"],
  },
  {
    text: "What is Context API?",
    options: ["A way to manage state globally", "A way to build mobile apps", "A database", "A type of middleware"],
  }
];

export default function QuizApp() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null)); // Stores answers for backend
  const progress = useSharedValue(0);

  const handleAnswerSelect = (answer) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestion] = updatedAnswers[currentQuestion] === answer ? null : answer; // Toggle selection
    setAnswers(updatedAnswers);
  };

  const handleNext = () => {
    if (answers[currentQuestion] !== null) {
      if (currentQuestion < questions.length - 1) {
        const nextQuestion = currentQuestion + 1;
        setCurrentQuestion(nextQuestion);
        animateProgress(nextQuestion);
      }
    }
  };

  const handleQuestionSelect = (index) => {
    setCurrentQuestion(index);
    animateProgress(index);
  };

  const animateProgress = (index) => {
    progress.value = withTiming(index / (questions.length - 1), {
      duration: 800,
      easing: Easing.inOut(Easing.ease)
    });
  };

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: progress.value * screenWidth,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.questionNavContainer}>
        {questions.map((_, index) => (
          <TouchableOpacity key={index} onPress={() => handleQuestionSelect(index)}>
            <View style={styles.questionItem}>
              <View
                style={[
                  styles.questionCircle,
                  answers[index] !== null && styles.questionCircleAnswered,
                ]}
              >
                <Text style={styles.questionNumber}>{index + 1}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View style={[styles.progressBar, animatedProgressStyle]} />

      <Text style={styles.questionText}>{questions[currentQuestion].text}</Text>

      <View style={styles.optionsContainer}>
        {questions[currentQuestion].options.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => handleAnswerSelect(option)}
            style={[
              styles.optionButton,
              answers[currentQuestion] === option && styles.selectedOptionButton,
            ]}
          >
            <Text style={[styles.optionText,  answers[currentQuestion] === option && styles.selectedOptionButton]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
      {/* <Button title="Next" onPress={handleNext} style={styles.buttonStyle} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
    nextButton: {
        backgroundColor: '#2196f3', // Green color for the button
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 30, // Rounded button
        marginTop: 20,
        width: '60%', // Adjust width
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 4, // Shadow for Android
      },
      nextButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
      },
   
  container: {
    flex: 1,
    alignItems: 'center',
  },
  questionNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginVertical: 20,
  },
  questionItem: {
    alignItems: 'center',
  },
  questionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCircleAnswered: {
    backgroundColor: '#4caf50',
  },
  questionNumber: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 5,
    backgroundColor: '#4caf50',
    position: 'absolute',
    top: 80,
  },
  questionText: {
    fontSize: 24,
    textAlign: 'center',
    marginVertical: 20,
  },
  optionsContainer: {
    width: '80%',
    marginBottom: 20,
  },
  optionButton: {
    padding: 15,
    backgroundColor: '#eee',
    marginVertical: 5,
    borderRadius: 5,
  },
  selectedOptionButton: {
    backgroundColor: '#2196f3', 
    color:'white'// Blue color for selected options
  },
  optionText: {
    fontSize: 18,
    textAlign: 'center',
  },
});
