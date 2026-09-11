import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';
import LoginScreen from './src/screens/LoginScreen.js';
import DriverHomeScreen from './src/screens/DriverHomeScreen.js';

function NavigationRoot() {
    const { user, token, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000000" />
            </View>
        );
    }

    // If driver is authenticated with valid token, show Driver Home Screen
    // Otherwise, show the Login Screen matching the designer's mockup
    return token && user ? <DriverHomeScreen /> : <LoginScreen />;
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationRoot />
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
});
