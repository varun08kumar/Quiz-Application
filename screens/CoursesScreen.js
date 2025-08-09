


import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {data} from '../data/data';

const CourseScreen = () => {
  const navigation = useNavigation();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCourses = async () => {
    try {
      console.log("hfsdhfssjk");
      
      setIsLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('Token not found');

      const response = await axios.get(`${data.url}/api/registered_courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses(response.data.courses);
    } catch (error) {
      console.error(error);
      alert('Failed to fetch courses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch courses whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchCourses();
    }, [])
  );

  const renderCourse = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('leaderboard')}
    >
      <Text style={styles.courseTitle}>{item.course_code}</Text>
      <Text style={styles.courseDescription}>{item.title}</Text>
    </TouchableOpacity>
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CourseRegistration')}
          style={styles.iconButton}
        >
          <Ionicons name="add-circle-outline" size={24} color="#007bff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registered Courses</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id.toString()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 3,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  courseDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },
  iconButton: {
    marginRight: 10,
  },
});

export default CourseScreen;
