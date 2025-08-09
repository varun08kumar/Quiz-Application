import React, { useEffect, useState, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Animated,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { data } from '../data/data';

const { width, height } = Dimensions.get('window');

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
  errorLight: '#fecaca',
  warning: '#f59e0b',
  success: '#10b981',
  border: '#e5e7eb',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.05)',
};

const StudentsScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    fetchStudents();
    
    // Animate screen entrance
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
      })
    ]).start();
  }, []);

  // Monitor students state changes
  useEffect(() => {
    console.log('Students state changed:', students.length, students);
  }, [students]);

  useEffect(() => {
    // No search functionality - just set filtered students to all students
    setFilteredStudents(students);
  }, [students]);

  // Set up header with search and stats
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Registered Students',
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
      },
      headerStyle: {
        backgroundColor: COLORS.surface,
        elevation: 4,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={fetchStudents}
          style={styles.headerButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="refresh" size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, loading]);

  const fetchStudents = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const response = await axios.get(`${data.url}/api/admin/course/${courseId}/students`);
      console.log('API Response:', response.data);
      
      const studentsData = response.data.students || [];
      console.log('Students data to set:', studentsData);
      
      // Set students state
      setStudents(studentsData);
      
    } catch (error) {
      console.error('Fetch students error:', error);
      
      let errorMessage = 'Unable to fetch students. Please try again.';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Course not found or no students registered.';
        // Set empty array for 404 case
        setStudents([]);
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage, [
        { text: 'OK', style: 'default' },
        { text: 'Retry', onPress: () => fetchStudents(), style: 'cancel' }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents(false);
  };

  const handleDelete = async (studentId, studentName) => {
    Alert.alert(
      'Confirm Deregistration',
      `Are you sure you want to deregister ${studentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(studentId, studentName)
        },
      ]
    );
  };

  const performDelete = async (studentId, studentName) => {
    setDeletingIds(prev => new Set([...prev, studentId]));
    
    try {
      await axios.delete(`${data.url}/api/admin/course/${courseId}/deregister/${studentId}`);
      
      // Update students state by removing the deleted student
      setStudents(prevStudents => {
        const updatedStudents = prevStudents.filter(student => student.id !== studentId);
        return updatedStudents;
      });
      
      // Show success message
      Alert.alert(
        'Success',
        `${studentName} has been deregistered successfully.`,
        [{ text: 'OK', style: 'default' }]
      );
      
    } catch (error) {
      console.error('Delete student error:', error);
      
      Alert.alert('Error', 'Unable to deregister student. Please try again.', [
        { text: 'OK', style: 'default' },
        { text: 'Retry', onPress: () => performDelete(studentId, studentName) }
      ]);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const navigateToStudentQuizzes = (student) => {
    // Remove navigation since route doesn't exist
    console.log('Student selected:', student);
  };



  const renderStudent = ({ item, index }) => {
    const isDeleting = deletingIds.has(item.id);
    
    return (
      <View style={styles.studentItem}>
        <View style={styles.studentContent}>
          {/* Student Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          </View>

          {/* Student Info */}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name || 'Unknown'}</Text>
            {item.email && (
              <Text style={styles.studentEmail}>{item.email}</Text>
            )}
            <View style={styles.studentMeta}>
              <Text style={styles.metaText}>ID: {item.id}</Text>
            </View>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
          onPress={() => handleDelete(item.id, item.name)}
          disabled={isDeleting}
          activeOpacity={0.8}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ color: 'white', fontSize: 16 }}>×</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={{ fontSize: 64, color: COLORS.textLight }}>👥</Text>
      </View>
      <Text style={styles.emptyTitle}>No students registered</Text>
      <Text style={styles.emptySubtitle}>
        No students have registered for this course yet.
      </Text>
    </View>
  );

  console.log('Render - students:', students.length, 'filtered:', filteredStudents.length, 'loading:', loading);

  if (loading && students.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      {/* Simple test list first */}
      <FlatList
        data={filteredStudents}
        renderItem={renderStudent}
        keyExtractor={(item, index) => `student-${item.id || index}`}
        
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  
  statsCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  statsGradient: {
    padding: 20,
  },
  
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statsText: {
    marginLeft: 16,
    flex: 1,
  },
  
  statsNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  
  statsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  searchIcon: {
    marginRight: 12,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 0,
  },
  
  clearButton: {
    padding: 4,
  },
  
  filterInfo: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  
  filterText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  listContent: {
    paddingBottom: 20,
  },
  
  listContentEmpty: {
    flex: 1,
  },
  
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  studentContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  avatarContainer: {
    marginRight: 16,
  },
  
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
  },
  
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  
  studentInfo: {
    flex: 1,
  },
  
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  
  studentEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  
  navigationArrow: {
    padding: 4,
  },
  
  deleteButton: {
    backgroundColor: COLORS.error,
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  
  deleteButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  
  clearSearchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  
  clearSearchText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  statsIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  
  searchIcon: {
    marginRight: 12,
    fontSize: 16,
  },
});

export default StudentsScreen;