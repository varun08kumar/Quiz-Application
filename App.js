import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Animated, Dimensions, PanResponder } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useState, useContext, useRef, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignUpScreen';
import LeaderboardScreen from './screens/LeaderBoard';
import CourseScreen from './screens/CoursesScreen';
import QuestionsCreationScreen from './screens/QuestionsCreationScreen';
import ImagePickerComponent from './components/ImagePick';
import QuestionNavigator from './screens/QuestionNavigator';
import QuizApp from './screens/QuizAppScreen';
import CourseRegistration from './screens/CourseRegistration';
import CreateCourseScreen from './screens/CourseCreateScreen';
import CourseDetailScreen from './screens/CourseDetailsScreen';
import AdminDashboardScreen from './screens/AdminDashBoard';
import StudentsScreen from './screens/StudentsScreen';
import QuizzesScreen from './screens/QuizzesScreen';
import AddQuestionsScreen from './screens/AddQuestionScreen';
import StudentDashboardScreen from './screens/StudentDashboardScreen';
import StudentCourseDetailsScreen from './screens/StudentCourseDetailsScreen';
import StudentQuizzesScreen from './screens/StudentQuizzesScreen';
import StudentQuizDetailsScreen from './screens/StudentQuizDetailsScreen';

import AuthContextProvider from './store/auth_context';
import { AuthContext } from './store/auth_context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Theme colors
const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#10b981',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  border: '#e5e7eb',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Custom Tab Bar Component with Bouncing Ball Animation
function CustomTabBar({ state, descriptors, navigation }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  // Original position (attached to tab bar)
  const originalPosition = {
    x: screenWidth / 2 - 20,
    y: screenHeight - (Platform.OS === 'ios' ? 120 : 105)
  };
  
  // Tab bar animations - all non-native
  const slideAnim = useRef(new Animated.Value(100)).current; // Start hidden
  const toggleButtonRotation = useRef(new Animated.Value(0)).current;
  
  // Cascading fall animations for tab bar elements - simplified opacity handling
  const outerContainerAnim = useRef(new Animated.ValueXY({ x: 0, y: -200 })).current;
  const outerContainerScale = useRef(new Animated.Value(0.3)).current;
  const outerContainerVisible = useRef(new Animated.Value(0)).current;
  
  const dashboardContainerAnim = useRef(new Animated.ValueXY({ x: -100, y: -150 })).current;
  const dashboardScale = useRef(new Animated.Value(0.2)).current;
  const dashboardVisible = useRef(new Animated.Value(0)).current;
  
  const signoutContainerAnim = useRef(new Animated.ValueXY({ x: 100, y: -150 })).current;
  const signoutScale = useRef(new Animated.Value(0.2)).current;
  const signoutVisible = useRef(new Animated.Value(0)).current;
  
  // Position for draggable toggle button
  const panX = useRef(new Animated.Value(originalPosition.x)).current;
  const panY = useRef(new Animated.Value(originalPosition.y)).current;
  
  // Bouncing ball animation - all non-native
  const bounceX = useRef(new Animated.Value(originalPosition.x)).current;
  const bounceY = useRef(new Animated.Value(originalPosition.y)).current;
  const ballBounceY = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(1)).current;
  const ballRotation = useRef(new Animated.Value(0)).current;

  // PanResponder for draggable functionality (only when tab bar is hidden)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isVisible,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only start dragging if there's significant movement
      const { dx, dy } = gestureState;
      return !isVisible && (Math.abs(dx) > 2 || Math.abs(dy) > 2);
    },
    
    onPanResponderGrant: () => {
      setIsDragging(true);
      // Store current values as offset
      panX.setOffset(panX._value);
      panY.setOffset(panY._value);
      panX.setValue(0);
      panY.setValue(0);
    },
    
    onPanResponderMove: Animated.event([
      null,
      { dx: panX, dy: panY }
    ], {
      useNativeDriver: false,
    }),
    
    onPanResponderRelease: (evt, gestureState) => {
      const wasActuallyDragging = isDragging;
      setIsDragging(false);
      
      // Flatten the offset
      panX.flattenOffset();
      panY.flattenOffset();
      
      // If it wasn't actually dragged (just a tap), don't constrain position
      if (!wasActuallyDragging) {
        return;
      }
      
      // Boundary constraints
      const buttonSize = 40;
      const padding = 10;
      
      let newX = panX._value;
      let newY = panY._value;
      
      // Keep within screen bounds
      if (newX < padding) newX = padding;
      if (newX > screenWidth - buttonSize - padding) newX = screenWidth - buttonSize - padding;
      if (newY < padding + 50) newY = padding + 50;
      if (newY > screenHeight - buttonSize - padding - 100) newY = screenHeight - buttonSize - padding - 100;
      
      // Animate to final position
      Animated.parallel([
        Animated.spring(panX, {
          toValue: newX,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(panY, {
          toValue: newY,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        })
      ]).start();
    },
  });

  // Cascading fall animation function
  const createCascadingFallAnimation = () => {
    // Get current toggle button position
    const toggleX = isVisible ? bounceX._value : panX._value;
    const toggleY = isVisible ? bounceY._value : panY._value;
    
    // Calculate relative positions from toggle button to final tab bar position
    const tabBarFinalY = screenHeight - (Platform.OS === 'ios' ? 120 : 105);
    const fallDistance = toggleY - tabBarFinalY;
    
    // Reset all container positions to fall from toggle button area
    outerContainerAnim.setValue({ 
      x: toggleX - (screenWidth / 2), 
      y: fallDistance 
    });
    outerContainerScale.setValue(0.3);
    outerContainerVisible.setValue(0);
    
    dashboardContainerAnim.setValue({ 
      x: toggleX - (screenWidth * 0.25), 
      y: fallDistance - 30 
    });
    dashboardScale.setValue(0.2);
    dashboardVisible.setValue(0);
    
    signoutContainerAnim.setValue({ 
      x: toggleX - (screenWidth * 0.75), 
      y: fallDistance - 30 
    });
    signoutScale.setValue(0.2);
    signoutVisible.setValue(0);
    
    // Create cascading sequence
    return Animated.sequence([
      // 1. First: Outer container falls and bounces
      Animated.parallel([
        Animated.spring(outerContainerAnim, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          tension: 40,
          friction: 8,
          delay: 0
        }),
        Animated.sequence([
          Animated.timing(outerContainerScale, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(outerContainerScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          })
        ]),
        Animated.timing(outerContainerVisible, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        })
      ]),
      
      // 2. Second: Dashboard container falls (slightly delayed)
      Animated.parallel([
        Animated.spring(dashboardContainerAnim, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }),
        Animated.sequence([
          Animated.timing(dashboardScale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(dashboardScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          })
        ]),
        Animated.timing(dashboardVisible, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        })
      ]),
      
      // 3. Third: Sign out container falls (more delayed)
      Animated.parallel([
        Animated.spring(signoutContainerAnim, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          tension: 60,
          friction: 8,
        }),
        Animated.sequence([
          Animated.timing(signoutScale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(signoutScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          })
        ]),
        Animated.timing(signoutVisible, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        })
      ])
    ]);
  };
  // Bouncing ball animation function - ALL NON-NATIVE
  const createBouncingAnimation = () => {
    // Set bounce position to current pan position
    bounceX.setValue(panX._value);
    bounceY.setValue(panY._value);
    
    // Reset ball animation values
    ballBounceY.setValue(0);
    ballScale.setValue(1);
    ballRotation.setValue(0);
    
    // Create bouncing sequence - ALL useNativeDriver: false
    const bounces = [
      // First bounce (highest)
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ballBounceY, {
            toValue: -80,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(ballBounceY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          })
        ]),
        Animated.sequence([
          Animated.timing(ballScale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(ballScale, {
            toValue: 0.8,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(ballScale, {
            toValue: 1.1,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(ballScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          })
        ]),
        Animated.timing(ballRotation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        })
      ]),
      
      // Second bounce (medium)
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ballBounceY, {
            toValue: -40,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(ballBounceY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          })
        ]),
        Animated.sequence([
          Animated.timing(ballScale, {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(ballScale, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(ballScale, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(ballScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          })
        ])
      ]),
      
      // Third bounce (small)
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ballBounceY, {
            toValue: -20,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(ballBounceY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          })
        ]),
        Animated.sequence([
          Animated.timing(ballScale, {
            toValue: 1.05,
            duration: 75,
            useNativeDriver: false,
          }),
          Animated.timing(ballScale, {
            toValue: 0.95,
            duration: 75,
            useNativeDriver: false,
          }),
          Animated.timing(ballScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          })
        ])
      ])
    ];
    
    return Animated.sequence(bounces);
  };

  useEffect(() => {
    if (isVisible) {
      // When opening: Move toggle to original position and show tab bar with cascading fall
      Animated.parallel([
        // Move toggle button back to original position
        Animated.spring(panX, {
          toValue: originalPosition.x,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(panY, {
          toValue: originalPosition.y,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }),
        // Move bounce position to original
        Animated.spring(bounceX, {
          toValue: originalPosition.x,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(bounceY, {
          toValue: originalPosition.y,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }),
        // Rotate toggle button
        Animated.timing(toggleButtonRotation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        // Show basic tab bar container
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start(() => {
        // Start cascading fall animation, then bounce the toggle button
        createCascadingFallAnimation().start(() => {
          // After cascading is done, bounce the toggle button
          setTimeout(() => {
            createBouncingAnimation().start();
          }, 200);
        });
      });
      
    } else {
      // When closing: Hide everything with simple fade
      Animated.parallel([
        // Hide tab bar elements quickly
        Animated.timing(signoutVisible, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(dashboardVisible, {
          toValue: 0,
          duration: 150,
          delay: 50,
          useNativeDriver: false,
        }),
        Animated.timing(outerContainerVisible, {
          toValue: 0,
          duration: 200,
          delay: 100,
          useNativeDriver: false,
        }),
        // Slide tab bar down
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: false,
        }),
        // Rotate toggle button
        Animated.timing(toggleButtonRotation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        })
      ]).start(() => {
        // Reset all animations
        ballBounceY.setValue(0);
        ballScale.setValue(1);
        ballRotation.setValue(0);
        
        // Reset cascade animations for next time
        outerContainerAnim.setValue({ x: 0, y: -200 });
        outerContainerScale.setValue(0.3);
        outerContainerVisible.setValue(0);
        
        dashboardContainerAnim.setValue({ x: -100, y: -150 });
        dashboardScale.setValue(0.2);
        dashboardVisible.setValue(0);
        
        signoutContainerAnim.setValue({ x: 100, y: -150 });
        signoutScale.setValue(0.2);
        signoutVisible.setValue(0);
      });
    }
  }, [isVisible]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const rotateInterpolate = toggleButtonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const ballRotateInterpolate = ballRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      {/* Draggable Toggle Button - Non-Native Driver Only */}
      {!isVisible && (
        <Animated.View
          style={[
            styles.toggleButton,
            {
              transform: [
                { translateX: panX },
                { translateY: panY },
              ],
            }
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={toggleVisibility}
            activeOpacity={0.7}
            style={styles.toggleButtonTouchable}
            disabled={isDragging}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.toggleButtonGradient}
            >
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <Ionicons 
                  name="chevron-up-outline" 
                  size={20} 
                  color="white" 
                />
              </Animated.View>
            </LinearGradient>
            
            {/* Drag indicator dots when closed and not dragging */}
            {!isDragging && (
              <View style={styles.dragIndicator}>
                <View style={styles.dragDot} />
                <View style={styles.dragDot} />
                <View style={styles.dragDot} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bouncing Toggle Button - Native Driver Only */}
      {isVisible && (
        <Animated.View
          style={[
            styles.toggleButton,
            {
              transform: [
                { translateX: bounceX },
                { translateY: bounceY },
                { translateY: ballBounceY },
                { scale: ballScale },
                { rotate: ballRotateInterpolate }
              ],
            }
          ]}
        >
          <TouchableOpacity
            onPress={toggleVisibility}
            activeOpacity={0.7}
            style={styles.toggleButtonTouchable}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.toggleButtonGradient}
            >
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <Ionicons 
                  name="chevron-up-outline" 
                  size={20} 
                  color="white" 
                />
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Tab Bar Container with Cascading Fall Animation */}
      <Animated.View 
        style={[
          styles.customTabBar,
          {
            transform: [
              { translateY: slideAnim },
              ...outerContainerAnim.getTranslateTransform(),
              { scale: outerContainerScale }
            ],
            opacity: outerContainerVisible,
          }
        ]}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.98)']}
          style={styles.tabBarGradient}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel || route.name;
            const isFocused = state.index === index;
            const isDashboard = route.name === 'Admin' || route.name === 'Student';
            const isSignOut = route.name === 'SignOut';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // Apply individual container animations
            let containerStyle = {};
            if (isDashboard) {
              containerStyle = {
                transform: [
                  ...dashboardContainerAnim.getTranslateTransform(),
                  { scale: dashboardScale }
                ],
                opacity: dashboardVisible,
              };
            } else if (isSignOut) {
              containerStyle = {
                transform: [
                  ...signoutContainerAnim.getTranslateTransform(),
                  { scale: signoutScale }
                ],
                opacity: signoutVisible,
              };
            }

            return (
              <Animated.View
                key={route.key}
                style={[
                  { flex: 1 },
                  containerStyle
                ]}
              >
                <TouchableOpacity
                  onPress={onPress}
                  style={[styles.tabItem, isFocused && styles.tabItemActive]}
                  activeOpacity={0.7}
                >
                  {options.tabBarIcon && options.tabBarIcon({ focused: isFocused })}
                  <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </LinearGradient>
      </Animated.View>
    </>
  );
}

// Enhanced Sign Out Screen
function SignOutScreen() {
  const authCtx = useContext(AuthContext);

  return (
    <View style={styles.signOutContainer}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.signOutGradient}
      >
        <View style={styles.signOutContent}>
          <Ionicons name="log-out-outline" size={64} color="white" />
          <Text style={styles.signOutTitle}>Sign Out</Text>
          <Text style={styles.signOutSubtitle}>
            Are you sure you want to sign out?
          </Text>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => authCtx.logout()}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutButtonText}>Confirm Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// Common screen options
const commonScreenOptions = {
  headerStyle: {
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTintColor: COLORS.text,
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 18,
  },
  headerBackTitleVisible: false,
};

// Admin Stack with enhanced styling
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen 
        name="AdminDashboardScreen" 
        component={AdminDashboardScreen}
        options={{ 
          title: 'Admin Dashboard',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen 
        name="CreateCourse" 
        component={CreateCourseScreen}
        options={{ title: 'Create Course' }}
      />
      <Stack.Screen 
        name="courses" 
        component={CourseScreen}
        options={{ title: 'Courses' }}
      />
      <Stack.Screen 
        name="StudentsScreen" 
        component={StudentsScreen}
        options={{ title: 'Students' }}
      />
      <Stack.Screen 
        name="leaderboard" 
        component={LeaderboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="QuizzesScreen" 
        component={QuizzesScreen}
        options={{ title: 'Quizzes' }}
      />
      <Stack.Screen 
        name="questionsCreation" 
        component={QuestionsCreationScreen}
        options={{ title: 'Create Questions' }}
      />
      <Stack.Screen 
        name="quizapp" 
        component={QuizApp}
        options={{ title: 'Quiz' }}
      />
      <Stack.Screen 
        name="question" 
        component={QuestionNavigator}
        options={{ title: 'Questions' }}
      />
      <Stack.Screen 
        name="CourseDetailsScreen" 
        component={CourseDetailScreen}
        options={{ title: 'Course Details' }}
      />
      <Stack.Screen 
        name="AddQuestionScreen" 
        component={AddQuestionsScreen}
        options={{ title: 'Add Questions' }}
      />
      <Stack.Screen 
        name="StudentDashboardScreen" 
        component={StudentDashboardScreen}
        options={{ title: 'Student View' }}
      />
      <Stack.Screen 
        name="StudentQuizzesScreen" 
        component={StudentQuizzesScreen}
        options={{ title: 'Student Quizzes' }}
      />
      <Stack.Screen 
        name="QuizDetailsScreen" 
        component={QuestionNavigator}
        options={{ title: 'Quiz Details' }}
      />
      <Stack.Screen 
        name="StudentCourseDetailsScreen" 
        component={StudentCourseDetailsScreen}
        options={{ title: 'Course Details' }}
      />
      <Stack.Screen 
        name="StudentQuizDetailsScreen" 
        component={StudentQuizDetailsScreen}
        options={{ title: 'Quiz Details' }}
      />
      <Stack.Screen 
        name="CourseRegistration" 
        component={CourseRegistration}
        options={{ title: 'Course Registration' }}
      />
    </Stack.Navigator>
  );
}

// Student Stack with enhanced styling
function StudentStack() {
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen 
        name="StudentDashboardScreen" 
        component={StudentDashboardScreen}
        options={{ 
          title: 'Student Dashboard',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen 
        name="courses" 
        component={CourseScreen}
        options={{ title: 'Available Courses' }}
      />
      <Stack.Screen 
        name="leaderboard" 
        component={LeaderboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="quizapp" 
        component={QuizApp}
        options={{ title: 'Take Quiz' }}
      />
      <Stack.Screen 
        name="question" 
        component={QuestionNavigator}
        options={{ title: 'Quiz Questions' }}
      />
      <Stack.Screen 
        name="CourseDetailsScreen" 
        component={CourseDetailScreen}
        options={{ title: 'Course Details' }}
      />
      <Stack.Screen 
        name="StudentQuizzesScreen" 
        component={StudentQuizzesScreen}
        options={{ title: 'My Quizzes' }}
      />
      <Stack.Screen 
        name="QuizDetailsScreen" 
        component={QuestionNavigator}
        options={{ title: 'Quiz Details' }}
      />
      <Stack.Screen 
        name="StudentCourseDetailsScreen" 
        component={StudentCourseDetailsScreen}
        options={{ title: 'Course Details' }}
      />
      <Stack.Screen 
        name="StudentQuizDetailsScreen" 
        component={StudentQuizDetailsScreen}
        options={{ title: 'Quiz Results' }}
      />
      <Stack.Screen 
        name="CourseRegistration" 
        component={CourseRegistration}
        options={{ title: 'Enroll in Course' }}
      />
    </Stack.Navigator>
  );
}

// Enhanced Tab Navigator
function MainTabs() {
  const authCtx = useContext(AuthContext);

  const handleSignOut = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {} 
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            authCtx.logout();
          },
        },
      ],
      { 
        cancelable: true,
        userInterfaceStyle: 'light'
      }
    );
  };

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {authCtx.userRole === 'admin' && (
        <Tab.Screen 
          name="Admin" 
          component={AdminStack}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                <Ionicons 
                  name={focused ? "grid" : "grid-outline"} 
                  size={24} 
                  color={focused ? COLORS.primary : COLORS.textSecondary} 
                />
              </View>
            ),
          }}
        />
      )}
      
      {authCtx.userRole === 'student' && (
        <Tab.Screen 
          name="Student" 
          component={StudentStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                <Ionicons 
                  name={focused ? "home" : "home-outline"} 
                  size={24} 
                  color={focused ? COLORS.primary : COLORS.textSecondary} 
                />
              </View>
            ),
          }}
        />
      )}

      <Tab.Screen
        name="SignOut"
        component={View}
        options={{
          tabBarLabel: 'Sign Out',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, styles.signOutIconContainer]}>
              <Ionicons 
                name="log-out-outline" 
                size={24} 
                color={COLORS.error} 
              />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleSignOut();
          },
        }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack with enhanced styling
function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// Main Navigation Component
function Navigation() {
  const authCtx = useContext(AuthContext);

  return (
    <NavigationContainer>
      <StatusBar style="auto" backgroundColor={COLORS.surface} />
      {!authCtx.isAuthenticated && <AuthStack />}
      {authCtx.isAuthenticated && <MainTabs />}
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthContextProvider>
        <Navigation />
      </AuthContextProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // Draggable Toggle Button Styles
  toggleButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    elevation: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 1000,
  },
  
  toggleButtonTouchable: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'relative',
  },
  
  toggleButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Drag indicator (dots)
  dragIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  
  dragDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.primary,
    marginHorizontal: 1,
  },

  // Custom Tab Bar Styles
  customTabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 20,
    right: 20,
    elevation: 15,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    borderRadius: 25,
    overflow: 'hidden',
  },
  
  tabBarGradient: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
    minHeight: 60,
  },
  
  tabItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    transform: [{ scale: 1.05 }],
  },
  
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  
  iconContainer: {
    padding: 6,
    borderRadius: 12,
  },
  
  iconContainerActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  
  signOutIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  
  // Sign Out Screen Styles
  signOutContainer: {
    flex: 1,
  },
  
  signOutGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  signOutContent: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    margin: 20,
    backdropFilter: 'blur(10px)',
  },
  
  signOutTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  
  signOutSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  
  signOutButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  signOutButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});