// // import React from 'react';
// // import { Avatar } from 'react-native-paper';

// // export default function UserAvatar({ name }) {
// //   const initials = name
// //     .split(' ')
// //     .map(word => word[0])
// //     .join('');

// //   return (
// //     <Avatar.Text size={50} label={initials} />
// //   );
// // }

// // // Usage


// import React, { useEffect, useState } from 'react';
// import { Image, StyleSheet, ActivityIndicator, View } from 'react-native';

// export default function UserAvatar({ name, style }) {
//   const [avatarUrl, setAvatarUrl] = useState(null);

//   useEffect(() => {
//     const initials = name.split(' ').map(n => n[0]).join('');
//     console.log('====================================');
//     console.log(initials);
//     console.log('====================================');
//     const url = `https://api.dicebear.com/6.x/avataaars/svg?seed=${initials}'
// `;
//     // Fetch a random anime-style avatar
//     const fetchAvatar = async () => {
//       try {
//         const response = await fetch(url);
//         const data = await response.json();
//         console.log('====================================');
//         console.log(data.url);
//         console.log('====================================');
//         setAvatarUrl(data.url);
//       } catch (error) {
//         console.error('Error fetching avatar:', error);
//       }
//     };

//     fetchAvatar();
//   }, [name]);

//   return (
//     <View style={[styles.container, style]}>
//       {avatarUrl ? (
//         <Image source={{ uri: avatarUrl }} style={styles.avatar} />
//       ) : (
//         <ActivityIndicator size="small" color="#0000ff" />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   avatar: {
//     width: 50, // Set the desired avatar size
//     height: 50,
//     borderRadius: 25,
//   },
// });

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SvgUri } from 'react-native-svg';



// Helper function to generate the DiceBear avatar URL
const getAnimeAvatarUrl = (seed) => {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
};

 const StudentAvatar = ({ name,style }) => {
  const [avatarUri, setAvatarUri] = useState('');

  useEffect(() => {
    const seed = encodeURIComponent(name); 
    console.log('====================================');
    console.log(seed);
    console.log('====================================');
     // Using the name as a unique seed

    setAvatarUri(getAnimeAvatarUrl(seed));
    console.log('====================================');
    console.log(avatarUri);
    console.log('====================================');
  }, [name,avatarUri]);

  return (
    <View style={[styles.avatarContainer]}>
      {/* <Image source={'https://api.dicebear.com/9.x/adventurer/png?seed=David%20Joshua' } style={styles.avatar} /> */}
      <SvgUri
  width={100}
  height={100}
  uri={avatarUri}
/>
      {/* <Text style={styles.name}>{name}</Text> */}
    </View>
  );
};


// export default function QuizApp() {
//   const students = ['Sophia', 'Emma', 'Liam', 'Noah', 'Olivia', 'Ava'];

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Student Avatars</Text>
//       <View style={styles.avatarList}>
//         {students.map((name, index) => (
//           <StudentAvatar key={index} name={name} />
//         ))}
//       </View>
//     </View>
//   );
// }

export default function QuizApp({keys,name,style}){
    return (
        <StudentAvatar key={keys} name={name} style={style}/>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  avatarList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    margin: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  name: {
    marginTop: 5,
    fontSize: 14,
  },
});



