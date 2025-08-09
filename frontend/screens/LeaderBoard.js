import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Avatar, IconButton } from 'react-native-paper';
import QuizApp from '../components/Avatargen';
const data = [
  { id: '1', name: 'Sophia Cba', diamonds: 360, rank: 1 },
  { id: '2', name: 'Emma Ema', diamonds: 338, rank: 2 },
  { id: '3', name: 'Andrew W', diamonds: 306, rank: 3 },
  { id: '4', name: 'Bayu aji sadewa', diamonds: 88, rank: 4 },
  { id: '5', name: 'Olivia Ava', diamonds: 50, rank: 5 },
  { id: '6', name: 'David Joshua', diamonds: 52, rank: 6 },
  { id: '7', name: 'Charlotte Harper', diamonds: 97, rank: 7 },
  { id: '8', name: 'Mia Evelyn', diamonds: 120, rank: 8 },
];

export default function LeaderboardScreen() {
  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      {/* <Avatar.Image size={50} source={{ uri: 'https://via.placeholder.com/50' }} style={styles.avatar} /> */}
      {/* <UserAvatar name={item.name} style={styles.avatar} /> */}
      <QuizApp  keys= {item.id} name={item.name} style={styles.topAvatar}/>
      <View style={styles.textContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.diamonds}>{item.diamonds} Diamonds</Text>
      </View>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard🔥</Text>
        <IconButton icon="diamond-stone" color="#1e90ff" size={24} />
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.top3Container}>
            {data.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.top3Item}>
               
                <QuizApp keys={item.id} name={item.name} style={styles.Avatar}/>
                <Text style={styles.topName}>{item.name}</Text>
                <Text style={styles.topDiamonds}>{item.diamonds} Diamonds</Text>
              </View>
            ))}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  top3Container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  top3Item: {
    alignItems: 'center',
  },
  topAvatar: {
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  topName: {
    marginTop: 5,
    fontWeight: 'bold',
  },
  topDiamonds: {
    color: '#888',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  avatar: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  diamonds: {
    color: '#888',
  },
  rankContainer: {
    backgroundColor: '#4caf50',
    padding: 5,
    borderRadius: 10,
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontWeight: 'bold',
    color: '#fff',
  },
});