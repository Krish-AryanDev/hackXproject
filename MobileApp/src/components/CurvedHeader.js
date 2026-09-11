import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 280;

/**
 * Custom Vector Wave Header matching the UI/UX Designer's Mockup
 * Features an organic dark charcoal curve with a soft grey accent wave and centered bold "Login" title.
 */
export const CurvedHeader = ({ title = 'Login' }) => {
    return (
        <View style={styles.container}>
            <Svg
                width={SCREEN_WIDTH}
                height={HEADER_HEIGHT}
                viewBox={`0 0 ${SCREEN_WIDTH} ${HEADER_HEIGHT}`}
                style={StyleSheet.absoluteFill}
            >
                {/* 1. Soft Grey Accent Wave (Top-Left Backdrop) */}
                <Path
                    d={`M 0 0 
                       L 0 160 
                       C ${SCREEN_WIDTH * 0.25} 190, ${SCREEN_WIDTH * 0.45} 120, ${SCREEN_WIDTH * 0.65} 0 
                       Z`}
                    fill="#888E93"
                />

                {/* 2. Main Dark Charcoal Wave Shape */}
                <Path
                    d={`M ${SCREEN_WIDTH * 0.3} 0 
                       C ${SCREEN_WIDTH * 0.15} 60, ${SCREEN_WIDTH * 0.12} 170, ${SCREEN_WIDTH * 0.35} 235 
                       C ${SCREEN_WIDTH * 0.55} 275, ${SCREEN_WIDTH * 0.9} 245, ${SCREEN_WIDTH} 225 
                       L ${SCREEN_WIDTH} 0 
                       Z`}
                    fill="#23272A"
                />
            </Svg>

            {/* Centered White Title matching designer typography */}
            <View style={styles.titleContainer}>
                <Text style={styles.titleText}>{title}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SCREEN_WIDTH,
        height: HEADER_HEIGHT,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        position: 'absolute',
        top: 105,
        left: SCREEN_WIDTH * 0.26,
        alignItems: 'flex-start',
    },
    titleText: {
        fontSize: 48,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        fontFamily: 'System',
    },
});

export default CurvedHeader;
