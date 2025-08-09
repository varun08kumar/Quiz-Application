// import {createContext, useState} from "react"

// export const AuthContext=createContext(
// {
//     token:'',
//     isAuthenticated:false,
//     authenticate:(token)=>{},
//     logout:()=>{},
// });

// export default function AuthContextProvider({children}){
//     const [authToken,setAuthToken]=useState();
//     function authenticate(token){
//         setAuthToken(token);
//     }
//     function logout(){
//         setAuthToken(null);
//     }
//    const  value={
//         token:authToken,
//         isAuthenticated:!!authToken,
//         authenticate:authenticate,
//         logout:logout,

//     }
//     return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
// }

import React, { createContext, useState } from "react";

// Create context with default values (token, role, authentication state)
export const AuthContext = createContext({
  token: '',
  isAuthenticated: false,
  userRole: '', // Added user role to differentiate admin from normal user
  authenticate: (token, role) => {},
  logout: () => {},
});

export default function AuthContextProvider({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(''); // Manage user role (admin/user)

  // Handle authentication with token and role (e.g., 'admin', 'user')
  function authenticate(token, role) {
    setAuthToken(token);
    setUserRole(role);
    console.log(userRole);
    
  }

  // Handle logout by clearing the token and role
  function logout() {
    setAuthToken(null);
    setUserRole('');
  }

  const value = {
    token: authToken,
    isAuthenticated: !!authToken, // true if token exists
    userRole, // Provide the current user role
    authenticate, // Function to authenticate a user and set role
    logout, // Function to log out
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
