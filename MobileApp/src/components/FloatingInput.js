import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

/**
 * Custom Input matching the UI/UX Mockup design
 * Outlined black box with top notched label badge
 */
export const FloatingInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    maxLength,
    secureTextEntry = false,
    autoCapitalize = 'none',
    editable = true,
}) => {
    return (
        <View style={styles.wrapper}>
            {/* Notched Floating Label */}
            <View style={styles.labelContainer}>
                <Text style={styles.labelText}>{label}</Text>
            </View>

            {/* Outlined Rounded Border Container */}
            <View style={styles.inputBox}>
                <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={keyboardType}
                    maxLength={maxLength}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize={autoCapitalize}
                    editable={editable}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        marginVertical: 12,
        position: 'relative',
    },
    labelContainer: {
        position: 'absolute',
        top: -10,
        left: 24,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        zIndex: 2,
    },
    labelText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        letterSpacing: 0.2,
        fontFamily: 'System',
    },
    inputBox: {
        width: '100%',
        height: 58,
        borderWidth: 1.8,
        borderColor: '#000000',
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    textInput: {
        fontSize: 16,
        color: '#111827',
        fontFamily: 'System',
        paddingVertical: 0,
    },
});

export default FloatingInput;
