import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, TouchableOpacity, Alert, FlatList } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

const QuizForm = () => {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState('');
  const [questionImage, setQuestionImage] = useState(null);
  const [answerImage, setAnswerImage] = useState(null);
  const [questions, setQuestions] = useState([]);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const renderOptions = () => {
    return options.map((option, index) => (
      <TextInput
        key={index}
        style={{ borderWidth: 1, padding: 5, marginVertical: 5 }}
        placeholder={`Option ${index + 1}`}
        value={option}
        onChangeText={(text) => {
          const newOptions = [...options];
          newOptions[index] = text;
          setOptions(newOptions);
        }}
      />
    ));
  };

  const renderFormFields = () => {
    switch (questionType) {
      case 'multiple choice':
        return (
          <View>
            <Text>Options:</Text>
            {renderOptions()}
            <Button title="Add Option" onPress={handleAddOption} />
          </View>
        );
      case 'true/false':
        return (
          <View>
            <Text>Answer:</Text>
            <RNPickerSelect
              onValueChange={setAnswer}
              items={[
                { label: 'True', value: 'true' },
                { label: 'False', value: 'false' },
              ]}
              style={{ inputIOS: { padding: 10, borderWidth: 1, borderRadius: 5 } }}
            />
          </View>
        );
      case 'short answer':
        return (
          <TextInput
            placeholder="Correct Answer"
            value={answer}
            onChangeText={setAnswer}
            style={{ borderWidth: 1, padding: 5, marginVertical: 5 }}
          />
        );
      case 'upload image':
        return (
          <View>
            <Text>Answer Image:</Text>
            <TouchableOpacity onPress={() => handleImagePicker(setAnswerImage)} style={{ marginVertical: 10 }}>
              <Ionicons name="camera" size={32} color="blue" />
            </TouchableOpacity>
            {answerImage && (
              <Image
                source={{ uri: answerImage }}
                style={{ width: 300, height: 300, marginVertical: 10 }}
              />
            )}
          </View>
        );
      default:
        return null;
    }
  };

  const handleImagePicker = async (setImage) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // console.log('====================================');
    // console.log(permissionResult);
    // console.log('====================================');

    if (!permissionResult.granted) {
      Alert.alert("Permission required", "You need to allow access to your photo library.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    console.log('====================================');
    console.log(pickerResult.assets[0].uri);
    console.log('====================================');
    if (!pickerResult.canceled) {  
        // Check if the picker wasn't cancelled
        // console.log('====================================');
        console.log(pickerResult.assets[0].uri);
        // console.log('====================================');
        setImage(pickerResult.assets[0].uri); // Set the image if it's not cancelled
      } else {
        console.log('Image picker was canceled');
      }
    console.log('====================================');
    console.log(answerImage);
    console.log('====================================');
  };

  const handleAddQuestion = () => {
    if (questions.length >= 16) {
      Alert.alert("Limit Reached", "You can only add up to 10 questions.");
      return;
    }

    const newQuestion = {
      topic,
      question,
      questionType,
      options,
      answer,
      questionImage,
      answerImage,
    };

    setQuestions([...questions, newQuestion]);

    // Clear the form fields
    setTopic('');
    setQuestion('');
    setQuestionType('');
    setOptions(['', '', '', '']);
    setAnswer('');
    setQuestionImage(null);
    setAnswerImage(null);
  };

  const handleSubmitQuiz = () => {
    console.log("Quiz data:", questions); // Send this data to backend or save it
    Alert.alert("Quiz Submitted", "Your quiz with 10 questions has been saved.");
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Topic"
        value={topic}
        onChangeText={setTopic}
        style={{ borderWidth: 1, padding: 5, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Question"
        value={question}
        onChangeText={setQuestion}
        style={{ borderWidth: 1, padding: 5, marginBottom: 10 }}
      />
      <RNPickerSelect
        onValueChange={(value) => setQuestionType(value)}
        items={[
          { label: 'Multiple Choice', value: 'multiple choice' },
          { label: 'True/False', value: 'true/false' },
          { label: 'Short Answer', value: 'short answer' },
          { label: 'Upload Image', value: 'upload image' },
        ]}
        style={{ inputIOS: { padding: 10, borderWidth: 1, borderRadius: 5 } }}
        placeholder={{ label: "Select Question Type", value: null }}
      />
      {renderFormFields()}
      
      {/* Question Image Upload */}
      <TouchableOpacity onPress={() => handleImagePicker(setQuestionImage)} style={{ marginVertical: 10 }}>
        <Ionicons name="camera" size={32} color="blue" />
      </TouchableOpacity>
      {questionImage && (
        <Image
          source={{ uri: questionImage }}
          style={{ width: 200, height: 200, marginVertical: 10 }}
        />
      )}

      <Button title="Add Question" onPress={handleAddQuestion} />

      {/* List of added questions */}
      
      <FlatList
        data={questions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={{ marginVertical:20}}>
            <Text>Question {index + 1}: {item.question}</Text>
          </View>
        )}
      />

      {questions.length === 16 && (
        <Button title="Submit Quiz" onPress={handleSubmitQuiz} />
      )}
    </View>
  );
};

export default QuizForm;

