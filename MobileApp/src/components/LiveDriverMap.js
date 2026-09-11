import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    Dimensions,
} from 'react-native';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Interactive Live Driver GPS & Route Corridor Map
 * Shows:
 * 1. Live Driver GPS Location (with animated pulse)
 * 2. Intermediate Points of Load (Discovered via Haversine & Highway Detour)
 * 3. Final Destination Pin
 */
export const LiveDriverMap = ({
    driverCoords,
    destinationCoords,
    destinationName = 'Lucknow',
    pointsOfLoad = [],
}) => {
    const [liveLocation, setLiveLocation] = useState(
        driverCoords || { latitude: 26.9124, longitude: 75.7873 } // Default: Jaipur
    );

    // Track real device GPS in real time
    useEffect(() => {
        let subscription = null;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const initial = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    if (initial?.coords) {
                        setLiveLocation({
                            latitude: initial.coords.latitude,
                            longitude: initial.coords.longitude,
                        });
                    }

                    subscription = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.High,
                            timeInterval: 4000,
                            distanceInterval: 10,
                        },
                        (newLoc) => {
                            if (newLoc?.coords) {
                                setLiveLocation({
                                    latitude: newLoc.coords.latitude,
                                    longitude: newLoc.coords.longitude,
                                });
                            }
                        }
                    );
                }
            } catch (err) {
                console.warn('GPS tracking note:', err.message);
            }
        })();

        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    const driverLat = liveLocation.latitude;
    const driverLng = liveLocation.longitude;
    const destLat = destinationCoords?.latitude || 26.8467;
    const destLng = destinationCoords?.longitude || 80.9462;

    // Calculate map bounding box
    const allLats = [driverLat, destLat, ...pointsOfLoad.map((p) => p.lat)];
    const allLngs = [driverLng, destLng, ...pointsOfLoad.map((p) => p.lng)];

    const minLat = Math.min(...allLats) - 0.08;
    const maxLat = Math.max(...allLats) + 0.08;
    const minLng = Math.min(...allLngs) - 0.08;
    const maxLng = Math.max(...allLngs) + 0.08;

    if (Platform.OS === 'web') {
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${driverLat}%2C${driverLng}`;

        return (
            <View style={styles.mapInnerContainer}>
                <iframe
                    title="Live Driver Navigation"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={mapUrl}
                    style={{ border: 0, borderRadius: 18 }}
                />

                {/* Floating GPS Telemetry HUD */}
                <View style={styles.floatingGpsBadge}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.floatingGpsText}>
                        LIVE GPS: {liveLocation.latitude.toFixed(4)}, {liveLocation.longitude.toFixed(4)}
                    </Text>
                </View>

                {/* Corridor Status Pill */}
                {pointsOfLoad.length > 0 && (
                    <View style={styles.pointsOfLoadBanner}>
                        <Text style={styles.pointsOfLoadBannerText}>
                            ⚡ {pointsOfLoad.length} RETURN LOAD POINTS ACTIVE
                        </Text>
                    </View>
                )}
            </View>
        );
    }

    // Native iOS / Android Simulation View
    return (
        <View style={styles.mapInnerContainer}>
            <View style={styles.simulatedMapBackground}>
                {/* Live Driver Marker */}
                <View style={styles.driverMarkerContainer}>
                    <View style={styles.pulseRing} />
                    <View style={styles.driverIconCircle}>
                        <Text style={{ fontSize: 14 }}>🚚</Text>
                    </View>
                    <Text style={styles.markerLabel}>Origin (GPS)</Text>
                </View>

                {/* Render Intermediate Waypoints */}
                {pointsOfLoad.slice(0, 3).map((wp, idx) => (
                    <View
                        key={wp.name}
                        style={[
                            styles.waypointMarkerContainer,
                            {
                                left: `${32 + idx * 22}%`,
                                top: `${52 - idx * 12}%`,
                            },
                        ]}
                    >
                        <View style={styles.waypointSquircle}>
                            <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '900' }}>
                                0{idx + 1}
                            </Text>
                        </View>
                        <Text style={styles.waypointLabel}>{wp.name.split(' ')[0]}</Text>
                    </View>
                ))}

                {/* Destination Marker */}
                <View style={styles.destMarkerContainer}>
                    <View style={styles.destIconCircle}>
                        <Text style={{ fontSize: 13 }}>🏁</Text>
                    </View>
                    <Text style={styles.destMarkerLabel}>{destinationName}</Text>
                </View>

                {/* Floating Telemetry Badge */}
                <View style={styles.floatingGpsBadge}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.floatingGpsText}>
                        GPS: {liveLocation.latitude.toFixed(4)}, {liveLocation.longitude.toFixed(4)}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mapInnerContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#E8ECF0',
    },
    floatingGpsBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        zIndex: 10,
    },
    livePulseDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    floatingGpsText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    pointsOfLoadBanner: {
        position: 'absolute',
        bottom: 8,
        left: 10,
        right: 10,
        backgroundColor: '#000000',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        alignItems: 'center',
        zIndex: 10,
    },
    pointsOfLoadBannerText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    simulatedMapBackground: {
        flex: 1,
        backgroundColor: '#E2E8F0',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    driverMarkerContainer: {
        position: 'absolute',
        left: '18%',
        top: '58%',
        alignItems: 'center',
    },
    pulseRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
    },
    driverIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    markerLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#000000',
        marginTop: 2,
    },
    waypointMarkerContainer: {
        position: 'absolute',
        alignItems: 'center',
    },
    waypointSquircle: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    waypointLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#1F2937',
        marginTop: 1,
    },
    destMarkerContainer: {
        position: 'absolute',
        right: '15%',
        top: '22%',
        alignItems: 'center',
    },
    destIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    destMarkerLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#000000',
        marginTop: 2,
    },
});

export default LiveDriverMap;
