


import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import Svg, { Path, Rect, Line, G } from 'react-native-svg';
import axios from 'axios';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { data } from '../data/data';
import { AuthContext } from '../store/auth_context';

const GaussianChart = ({ route }) => {
  const [marksAllUsers, setMarksAllUsers] = useState([]);
  const [yourMarks, setYourMarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const { quizId } = route.params;
  const authCtx = useContext(AuthContext);

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const response = await axios.get(
          `${data.url}/api/quizzes/${quizId}/marks`,
          { headers: { Authorization: `Bearer ${authCtx.token}` } }
        );
        const { marksAllUsers, yourMarks } = response.data;

        // Extract total_marks from the marksAllUsers array
        const marks = marksAllUsers.map((item) => item.total_marks);

        setMarksAllUsers(marks);
        setYourMarks(yourMarks);
      } catch (error) {
        console.error('Error fetching marks data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, [quizId]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (!marksAllUsers.length) {
    return <Text>No marks data available.</Text>;
  }

  // Calculate mean and standard deviation
  const meanMarks =
    marksAllUsers.reduce((sum, mark) => sum + mark, 0) / marksAllUsers.length;
  const stdDevMarks = Math.sqrt(
    marksAllUsers
      .map((mark) => Math.pow(mark - meanMarks, 2))
      .reduce((sum, squaredDiff) => sum + squaredDiff, 0) / marksAllUsers.length
  );

  // Define the X and Y scales
  const xScale = scaleLinear()
    .domain([Math.min(...marksAllUsers) - 10, Math.max(...marksAllUsers) + 10])
    .range([0, 300]);

  const yScale = scaleLinear().domain([0, 0.05]).range([200, 0]);

  // Gaussian formula
  const gaussian = (x) => {
    return (
      (1 / (stdDevMarks * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * Math.pow((x - meanMarks) / stdDevMarks, 2))
    );
  };

  // Generate Gaussian curve points
  const lineGenerator = line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  const gaussianPoints = [];
  for (
    let x = Math.min(...marksAllUsers) - 10;
    x <= Math.max(...marksAllUsers) + 10;
    x++
  ) {
    gaussianPoints.push({ x, y: gaussian(x) });
  }

  const gaussianPath = lineGenerator(gaussianPoints);

  // Render histogram bars
  const histogramBars = marksAllUsers.map((mark, index) => (
    <Rect
      key={index}
      x={xScale(mark)}
      y={yScale(gaussian(mark))}
      width={5}
      height={200 - yScale(gaussian(mark))}
      fill="green"
    />
  ));

  return (
    <View>
      <Svg width={350} height={220}>
        <G>
          {histogramBars}
          <Path d={gaussianPath} fill="none" stroke="blue" strokeWidth="2" />
          {/* Marking the user's position */}
          <Line
            x1={xScale(yourMarks)}
            y1={0}
            x2={xScale(yourMarks)}
            y2={200}
            stroke="red"
            strokeWidth="2"
          />
          <Text
            x={xScale(yourMarks)}
            y={210}
            textAnchor="middle"
            style={styles.userMarkText}
          >
            Your Mark: {yourMarks}
          </Text>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  userMarkText: {
    fontSize: 12,
    fill: 'red',
  },
});

export default GaussianChart;
