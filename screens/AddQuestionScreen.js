import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { data } from '../data/data';

const { width } = Dimensions.get('window');

const AddQuestionsScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [numQuestions, setNumQuestions] = useState('');
  const [questions, setQuestions] = useState([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bulkInputModal, setBulkInputModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [documentProcessing, setDocumentProcessing] = useState(false);

  const handleSetQuestions = () => {
    const count = parseInt(numQuestions, 10);
    if (!count || count <= 0) {
      Alert.alert('Error', 'Please enter a valid number of questions.');
      return;
    }
    setQuestions(
      Array.from({ length: count }, () => ({
        text: '',
        options: ['', '', '', ''],
        marks: '',
      }))
    );
    setShowQuestions(true);
  };

  const parseBulkQuestions = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsedQuestions = [];
    let currentQuestion = null;
    let optionIndex = 0;

    for (let line of lines) {
      line = line.trim();
      
      // Check if it's a question (starts with Q, Question, or number followed by .)
      if (line.match(/^(?:Q\d*\.?|Question\s*\d*:?|\d+\.)\s*/i)) {
        if (currentQuestion) {
          parsedQuestions.push(currentQuestion);
        }
        currentQuestion = {
          text: line.replace(/^(?:Q\d*\.?|Question\s*\d*:?|\d+\.)\s*/i, ''),
          options: ['', '', '', ''],
          marks: '1'
        };
        optionIndex = 0;
      }
      // Check if it's an option (A., B., C., D. or a), b), c), d))
      else if (line.match(/^[A-Da-d][\.)]\s*/)) {
        if (currentQuestion && optionIndex < 4) {
          currentQuestion.options[optionIndex] = line.replace(/^[A-Da-d][\.)]\s*/, '');
          optionIndex++;
        }
      }
      // Skip answer lines - we don't need them anymore
      // else if (line.match(/^(?:Answer|Correct|Ans):\s*[A-Da-d]/i)) {
      //   // Answers will be provided separately later
      // }
    }
    
    if (currentQuestion) {
      parsedQuestions.push(currentQuestion);
    }
    
    return parsedQuestions.filter(q => q.text && q.options.some(opt => opt));
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      Alert.alert('Error', 'Please enter questions in the text area');
      return;
    }

    const parsed = parseBulkQuestions(bulkText);
    if (parsed.length === 0) {
      Alert.alert('Error', 'No valid questions found. Please check the format.');
      return;
    }

    setQuestions(parsed);
    setShowQuestions(true);
    setBulkInputModal(false);
    setBulkText('');
    Alert.alert('Success', `Imported ${parsed.length} questions successfully!`);
  };

  const handleDocumentPicker = async () => {
    try {
      setDocumentProcessing(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/pdf',
          'text/*'
        ],
        copyToCacheDirectory: true,
        multiple: false
      });

      if (result.type === 'cancel') {
        setDocumentProcessing(false);
        return;
      }

      const { uri, name, mimeType, size } = result.assets[0];

      // Check file size (max 5MB)
      if (size > 5 * 1024 * 1024) {
        Alert.alert('Error', 'File size must be less than 5MB');
        setDocumentProcessing(false);
        return;
      }

      // Read file content
      let content = '';
      
      if (mimeType === 'text/plain' || mimeType?.startsWith('text/')) {
        content = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8
        });
      } else {
        // For other file types, we'll use a basic text extraction
        Alert.alert(
          'File Type Notice', 
          'For best results with Word/PDF files, please copy the text content and use the "Import from Text" option instead.',
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Try Anyway', 
              style: 'default',
              onPress: async () => {
                try {
                  content = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.UTF8
                  });
                } catch (error) {
                  Alert.alert('Error', 'Unable to read this file format. Please use a plain text file or copy-paste the content.');
                  setDocumentProcessing(false);
                  return;
                }
              }
            }
          ]
        );
        setDocumentProcessing(false);
        return;
      }

      if (!content.trim()) {
        Alert.alert('Error', 'The file appears to be empty or unreadable.');
        setDocumentProcessing(false);
        return;
      }

      // Parse the content
      const parsed = parseBulkQuestions(content);
      
      if (parsed.length === 0) {
        Alert.alert(
          'No Questions Found',
          'No valid questions were found in the document. Please ensure your document follows the correct format:\n\nQ1. Question text?\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\nAnswer: C',
          [
            { text: 'Edit Content', onPress: () => {
              setBulkText(content);
              setBulkInputModal(true);
            }},
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        setQuestions(parsed);
        setShowQuestions(true);
        Alert.alert(
          'Success', 
          `Successfully imported ${parsed.length} questions from ${name}!`
        );
      }

    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to process the document. Please try again.');
    } finally {
      setDocumentProcessing(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle || !quizDescription) {
      Alert.alert('Error', 'Please provide a title and description for the quiz.');
      return;
    }

    if (
      questions.some(
        (q) => !q.text || q.options.some((opt) => !opt) || !q.marks || isNaN(parseFloat(q.marks))
      )
    ) {
      Alert.alert(
        'Error',
        'Please fill all fields for each question, option, and ensure marks are valid numbers.'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${data.url}/api/admin/quiz`, {
        title: quizTitle,
        description: quizDescription,
        courseId,
        questions,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Quiz and questions saved successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to save quiz.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save quiz. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    if (field === 'text') updatedQuestions[index].text = value;
    if (field === 'options') updatedQuestions[index].options = value;
    if (field === 'marks') updatedQuestions[index].marks = value;
    setQuestions(updatedQuestions);
  };

  const addNewQuestion = () => {
    setQuestions([...questions, {
      text: '',
      options: ['', '', '', ''],
      marks: '',
    }]);
  };

  const removeQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  const QuestionIcon = () => (
    <Text style={styles.icon}>❓</Text>
  );

  const DescriptionIcon = () => (
    <Text style={styles.icon}>📝</Text>
  );

  const NumberIcon = () => (
    <Text style={styles.icon}>🔢</Text>
  );

  const BulkIcon = () => (
    <Text style={styles.icon}>📋</Text>
  );

  const DocumentIcon = () => (
    <Text style={styles.icon}>📄</Text>
  );

  const StarIcon = () => (
    <Text style={styles.icon}>⭐</Text>
  );

  const DeleteIcon = () => (
    <Text style={styles.deleteIcon}>🗑️</Text>
  );

  const AddIcon = () => (
    <Text style={styles.addIcon}>➕</Text>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Quiz</Text>
      </View>

      {/* Quiz Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📚 Quiz Information</Text>
        <View style={styles.inputContainer}>
          <QuestionIcon />
          <TextInput
            style={styles.input}
            placeholder="Quiz Title"
            value={quizTitle}
            onChangeText={setQuizTitle}
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.inputContainer}>
          <DescriptionIcon />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Quiz Description"
            value={quizDescription}
            onChangeText={setQuizDescription}
            multiline={true}
            numberOfLines={3}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Question Setup Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚙️ Setup Questions</Text>
        
        {/* Manual Setup */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionTitle}>Manual Setup</Text>
          <View style={styles.questionSetupRow}>
            <View style={styles.inputContainer}>
              <NumberIcon />
              <TextInput
                style={[styles.input, styles.numberInput]}
                placeholder="Number of questions"
                keyboardType="number-pad"
                value={numQuestions}
                onChangeText={setNumQuestions}
                placeholderTextColor="#999"
              />
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSetQuestions}>
              <Text style={styles.primaryButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.orText}>OR</Text>
        
        {/* Import Options */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionTitle}>Import Questions</Text>
          
          {/* Bulk Import */}
          <TouchableOpacity 
            style={styles.bulkButton} 
            onPress={() => setBulkInputModal(true)}
          >
            <BulkIcon />
            <Text style={styles.bulkButtonText}>Import from Text</Text>
          </TouchableOpacity>
          
          {/* Document Import */}
          <TouchableOpacity 
            style={[styles.bulkButton, styles.documentButton]} 
            onPress={handleDocumentPicker}
            disabled={documentProcessing}
          >
            {documentProcessing ? (
              <ActivityIndicator size="small" color="#ff9800" />
            ) : (
              <DocumentIcon />
            )}
            <Text style={[styles.bulkButtonText, styles.documentButtonText]}>
              {documentProcessing ? 'Processing...' : 'Import from Document'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.helpText}>
            Import from text format or upload documents (.txt, .docx, .pdf) - answers not required
          </Text>
          
          {/* Supported formats info */}
          <View style={styles.supportedFormats}>
            <Text style={styles.supportedTitle}>Supported formats:</Text>
            <Text style={styles.supportedText}>• Plain text files (.txt)</Text>
            <Text style={styles.supportedText}>• Word documents (.docx)</Text>
            <Text style={styles.supportedText}>• PDF files (.pdf)</Text>
            <Text style={styles.supportedText}>• Maximum file size: 5MB</Text>
          </View>
        </View>
      </View>

      {/* Questions List */}
      {showQuestions && (
        <View style={styles.card}>
          <View style={styles.questionsHeader}>
            <Text style={styles.cardTitle}>📋 Questions ({questions.length})</Text>
            <TouchableOpacity style={styles.addQuestionButton} onPress={addNewQuestion}>
              <AddIcon />
              <Text style={styles.addQuestionText}>Add Question</Text>
            </TouchableOpacity>
          </View>
          
          {questions.map((q, index) => (
            <View key={index} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>Question {index + 1}</Text>
                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => removeQuestion(index)}
                >
                  <DeleteIcon />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[styles.input, styles.questionInput]}
                placeholder={`Enter question ${index + 1}`}
                value={q.text}
                onChangeText={(value) => updateQuestion(index, 'text', value)}
                multiline={true}
                placeholderTextColor="#999"
              />
              
              {q.options.map((option, optIndex) => (
                <View key={optIndex} style={styles.optionContainer}>
                  <View style={styles.optionLabel}>
                    <Text style={styles.optionLetter}>
                      {String.fromCharCode(65 + optIndex)}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                    value={option}
                    onChangeText={(value) => {
                      const updatedOptions = [...q.options];
                      updatedOptions[optIndex] = value;
                      updateQuestion(index, 'options', updatedOptions);
                    }}
                    placeholderTextColor="#999"
                  />
                </View>
              ))}
              
              <View style={styles.marksContainer}>
                <StarIcon />
                <TextInput
                  style={[styles.input, styles.marksInput]}
                  placeholder="Marks"
                  keyboardType="number-pad"
                  value={q.marks}
                  onChangeText={(value) => updateQuestion(index, 'marks', value)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          ))}
          
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.disabledButton]} 
            onPress={handleSaveQuiz}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>💾 Save Quiz</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Bulk Import Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bulkInputModal}
        onRequestClose={() => setBulkInputModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Bulk Import Questions</Text>
              <TouchableOpacity 
                onPress={() => setBulkInputModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Paste your questions in the following format (answers not required):
            </Text>
            
            <View style={styles.exampleBox}>
              <Text style={styles.exampleText}>
                {`Q1. What is the capital of France?
A) London
B) Berlin
C) Paris
D) Madrid

Q2. Which planet is closest to the sun?
A) Venus
B) Mercury
C) Earth
D) Mars`}
              </Text>
            </View>
            
            <TextInput
              style={styles.bulkTextInput}
              placeholder="Paste your questions here..."
              value={bulkText}
              onChangeText={setBulkText}
              multiline={true}
              placeholderTextColor="#999"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setBulkInputModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.importButton, !bulkText.trim() && styles.disabledButton]} 
                onPress={handleBulkImport}
                disabled={!bulkText.trim()}
              >
                <Text style={styles.importButtonText}>Import Questions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
  },
  backText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  setupSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  icon: {
    fontSize: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  numberInput: {
    flex: 0,
    minWidth: 120,
  },
  questionSetupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginVertical: 16,
    fontWeight: '500',
  },
  bulkButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196f3',
    borderStyle: 'dashed',
    padding: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  documentButton: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  bulkButtonText: {
    color: '#2196f3',
    fontSize: 16,
    fontWeight: '600',
  },
  documentButtonText: {
    color: '#ff9800',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  supportedFormats: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeft: 4,
    borderLeftColor: '#007bff',
  },
  supportedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  supportedText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  questionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addIcon: {
    fontSize: 14,
  },
  addQuestionText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeft: 4,
    borderLeftColor: '#007bff',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#ffebee',
  },
  deleteIcon: {
    fontSize: 16,
  },
  questionInput: {
    backgroundColor: '#fff',
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  optionLabel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetter: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#fff',
    marginBottom: 0,
  },
  marksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9c4',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f9f90b',
  },
  marksInput: {
    flex: 1,
    paddingVertical: 12,
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: width * 0.95,
    maxHeight: '90%',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
  },
  closeText: {
    fontSize: 16,
    color: '#666',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  exampleBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeft: 4,
    borderLeftColor: '#007bff',
  },
  exampleText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  bulkTextInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddQuestionsScreen;