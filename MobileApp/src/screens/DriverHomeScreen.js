import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    TextInput,
    Alert,
    Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAuth } from '../context/AuthContext.js';
import LiveDriverMap from '../components/LiveDriverMap.js';
import { findPointsOfLoadAlongCorridor, LOGISTICS_HUBS } from '../utils/corridor.util.js';

/**
 * White Vector Location Pin Icon
 */
const WhiteLocationPin = ({ size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            fill="#FFFFFF"
        />
    </Svg>
);

/**
 * Chevron Down / Up Icon
 */
const ChevronIcon = ({ expanded, size = 16 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}
            stroke="#111827"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export const DriverHomeScreen = () => {
    const { logout } = useAuth();
    const [language, setLanguage] = useState('ENGLISH');

    // Driver's Live Location (Jaipur coordinates)
    const [driverLocation, setDriverLocation] = useState({
        lat: 26.9124,
        lng: 75.7873,
        cityName: 'Jaipur',
    });

    // Destination State
    const [destinationInput, setDestinationInput] = useState('Lucknow');
    const [destinationCoords, setDestinationCoords] = useState({
        latitude: 26.8467,
        longitude: 80.9462,
        name: 'Lucknow',
    });

    // Expanded Waypoint card state
    const [expandedWaypoint, setExpandedWaypoint] = useState(null);

    // Haversine Corridor Points-of-Load
    const [corridorAnalysis, setCorridorAnalysis] = useState({
        directDistanceKm: 512,
        pointsOfLoad: [],
    });

    // Proximity Auto-Trip State
    const [distanceRemainingKm, setDistanceRemainingKm] = useState(8.5); // Default simulated: 8.5 km (within 10 km threshold)
    const [autoTripStatus, setAutoTripStatus] = useState(null); // 'creating' | 'created' | 'dispatched'
    const [autoTripDetails, setAutoTripDetails] = useState(null);
    const [loadingProximity, setLoadingProximity] = useState(false);

    // Calculate corridor waypoints
    useEffect(() => {
        recalculateCorridor(destinationInput);
    }, []);

    // Proximity Trigger API Call (Triggers automatically when truck is <= 10 km)
    const triggerProximityAutoCreation = async (isManual = false) => {
        setLoadingProximity(true);
        try {
            const res = await fetch('http://localhost:5000/api/v1/trips/proximity-trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_destination_name: destinationCoords.name,
                    current_lat: destinationCoords.latitude,
                    current_lng: destinationCoords.longitude,
                    return_destination_name: 'Jaipur, Rajasthan',
                    distance_to_dest_km: distanceRemainingKm,
                    corridor_points_of_load: corridorAnalysis.pointsOfLoad,
                    force_create: isManual || distanceRemainingKm <= 10,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setAutoTripStatus('created');
                setAutoTripDetails(data.data?.trip);
                Alert.alert(
                    '⚡ Return Leg Auto-Created in Database',
                    `Your truck is within 10 km of ${destinationCoords.name}!\n\nA return trip to Jaipur with ${corridorAnalysis.pointsOfLoad.length} Corridor Points of Load has been created in the database. Shippers can now book return freight.`,
                    [{ text: 'OK', style: 'default' }]
                );
            }
        } catch (err) {
            console.warn('Proximity trigger error:', err.message);
        } finally {
            setLoadingProximity(false);
        }
    };

    const recalculateCorridor = (destName) => {
        const query = destName.trim().toLowerCase();
        const matchedHub = LOGISTICS_HUBS.find(
            (h) => h.name.toLowerCase().includes(query)
        ) || { name: destName, lat: 28.7041, lng: 77.1025, highway: 'National Corridor' };

        const destObj = {
            latitude: matchedHub.lat,
            longitude: matchedHub.lng,
            name: matchedHub.name,
        };

        setDestinationCoords(destObj);

        const analysis = findPointsOfLoadAlongCorridor(
            driverLocation,
            { lat: matchedHub.lat, lng: matchedHub.lng }
        );

        setCorridorAnalysis(analysis);
    };

    const handleSelectQuickDest = (cityName) => {
        setDestinationInput(cityName);
        recalculateCorridor(cityName);
    };

    const handleToggleLanguage = () => {
        setLanguage((prev) => (prev === 'ENGLISH' ? 'HINDI' : 'ENGLISH'));
    };

    const handleAcceptWaypointLoad = (waypoint) => {
        Alert.alert(
            'Return Load Assigned',
            `You have added ${waypoint.name} (${waypoint.highway}) to your active corridor!\nEstimated payout: ${waypoint.estimatedEarnings}`,
            [{ text: 'OK', style: 'default' }]
        );
    };

    // Total base earnings for trip
    const totalEstimatedEarnings = `₹${(Math.round(corridorAnalysis.directDistanceKm * 1.8 * 8) || 40000).toLocaleString('en-IN')}`;

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="light" />

            {/* 1. TOP HEADER BAR (Mockup Match) */}
            <View style={styles.topHeaderBar}>
                <TouchableOpacity style={styles.avatarButton} onPress={logout} activeOpacity={0.8}>
                    <View style={styles.avatarCircle}>
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                            <Path
                                d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"
                                fill="#FFFFFF"
                            />
                        </Svg>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.languagePill} onPress={handleToggleLanguage} activeOpacity={0.8}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                        <Path
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                            fill="#000000"
                        />
                    </Svg>
                    <Text style={styles.languageText}>{language}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* 2. AUTOMATED 10 KM PROXIMITY RETURN TRIP BANNER */}
                <View style={styles.proximityCard}>
                    <View style={styles.proximityHeaderRow}>
                        <View style={styles.proximityTag}>
                            <View style={styles.proximityLiveDot} />
                            <Text style={styles.proximityTagText}>PROXIMITY RADAR: {distanceRemainingKm} KM TO {destinationCoords.name.toUpperCase()}</Text>
                        </View>
                    </View>

                    <Text style={styles.proximityTitle}>
                        {autoTripStatus === 'created'
                            ? `⚡ Return Leg Active in Database (${destinationCoords.name} → Jaipur)`
                            : `⚡ Approach Destination (<10 KM)`}
                    </Text>
                    <Text style={styles.proximitySub}>
                        {autoTripStatus === 'created'
                            ? `Published with ${corridorAnalysis.pointsOfLoad.length} Corridor Points of Load. Awaiting Shipper Booking & Owner Approval.`
                            : `When your truck is within 10 km of ${destinationCoords.name}, a return trip is automatically published in PostgreSQL for all corridor shippers to book.`}
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.simulateButton,
                            autoTripStatus === 'created' ? styles.simulateButtonSuccess : styles.simulateButtonActive,
                        ]}
                        onPress={() => triggerProximityAutoCreation(true)}
                        disabled={loadingProximity}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.simulateButtonText}>
                            {loadingProximity
                                ? 'CREATING RETURN TRIP IN DATABASE...'
                                : autoTripStatus === 'created'
                                ? '✓ RETURN TRIP PUBLISHED IN DATABASE'
                                : `TRIGGER 10 KM PROXIMITY RETURN TRIP NOW`}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 3. DRIVER DESTINATION SEARCH BAR */}
                <View style={styles.searchSectionCard}>
                    <View style={styles.searchHeaderRow}>
                        <Text style={styles.searchSectionLabel}>RETURN ROUTE DESTINATION</Text>
                        <View style={styles.liveGpsPulsePill}>
                            <View style={styles.greenGpsDot} />
                            <Text style={styles.liveGpsText}>GPS: {driverLocation.cityName}</Text>
                        </View>
                    </View>

                    <View style={styles.destInputContainer}>
                        <View style={styles.pinIconBox}>
                            <WhiteLocationPin size={16} />
                        </View>
                        <TextInput
                            style={styles.destInputField}
                            value={destinationInput}
                            onChangeText={setDestinationInput}
                            placeholder="Enter return city (e.g. Lucknow, Delhi, Agra)"
                            placeholderTextColor="#6B7280"
                            returnKeyType="search"
                            onSubmitEditing={() => recalculateCorridor(destinationInput)}
                        />
                        <TouchableOpacity
                            style={styles.findRouteButton}
                            onPress={() => recalculateCorridor(destinationInput)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.findRouteButtonText}>MATCH</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Quick City Selection Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPillsScroll}>
                        {['Lucknow', 'Delhi NCR', 'Agra', 'Kanpur', 'Chandigarh', 'Mumbai', 'Varanasi'].map((cityName) => {
                            const isSelected = destinationCoords.name.toLowerCase().includes(cityName.toLowerCase());
                            return (
                                <TouchableOpacity
                                    key={cityName}
                                    style={[styles.quickPillItem, isSelected && styles.quickPillItemActive]}
                                    onPress={() => handleSelectQuickDest(cityName)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.quickPillText, isSelected && styles.quickPillTextActive]}>
                                        {cityName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 3. SECTION HEADING: Current Trip */}
                <View style={styles.sectionHeadingRow}>
                    <Text style={styles.sectionHeadingText}>Current Trip</Text>
                    <View style={styles.kmBadge}>
                        <Text style={styles.kmBadgeText}>{corridorAnalysis.directDistanceKm} KM</Text>
                    </View>
                </View>

                {/* 4. INTERACTIVE MAP */}
                <View style={styles.mapFrame}>
                    <LiveDriverMap
                        driverCoords={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                        destinationCoords={destinationCoords}
                        destinationName={destinationCoords.name}
                        pointsOfLoad={corridorAnalysis.pointsOfLoad}
                    />
                </View>

                {/* 5. CURRENT TRIP MAIN CARD (1:1 Designer Mockup Match) */}
                <View style={styles.currentTripCard}>
                    <View style={styles.blackSquirclePin}>
                        <WhiteLocationPin size={22} />
                    </View>

                    <View style={styles.tripRouteInfo}>
                        <Text style={styles.tripRouteTitle}>
                            {driverLocation.cityName} to {destinationCoords.name}
                        </Text>
                        <Text style={styles.tripRouteSub}>
                            {corridorAnalysis.pointsOfLoad.length > 0
                                ? `${corridorAnalysis.pointsOfLoad.length} Points of Load Detected`
                                : '13 sept, 2026'}
                        </Text>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.tripPricingInfo}>
                        <Text style={styles.tripAmount}>{totalEstimatedEarnings}</Text>
                        <Text style={styles.pendingBadge}>Pending</Text>
                    </View>
                </View>

                {/* 6. CORRIDOR POINTS OF LOAD (HAVERSINE ALGORITHM MATCH) */}
                {corridorAnalysis.pointsOfLoad.length > 0 && (
                    <View style={styles.corridorContainer}>
                        <View style={styles.corridorHeaderRow}>
                            <View>
                                <Text style={styles.corridorTitle}>Corridor Points of Load</Text>
                                <Text style={styles.corridorSub}>
                                    Haversine Great-Circle match along {driverLocation.cityName} → {destinationCoords.name}
                                </Text>
                            </View>
                            <View style={styles.hubCountBadge}>
                                <Text style={styles.hubCountText}>{corridorAnalysis.pointsOfLoad.length} HUBS</Text>
                            </View>
                        </View>

                        {/* Waypoints List */}
                        {corridorAnalysis.pointsOfLoad.map((hub, idx) => {
                            const isExpanded = expandedWaypoint === hub.name;
                            const isLowDetour = hub.detourKm <= 25;

                            return (
                                <View key={hub.name} style={styles.waypointCard}>
                                    <TouchableOpacity
                                        style={styles.waypointMainRow}
                                        onPress={() => setExpandedWaypoint(isExpanded ? null : hub.name)}
                                        activeOpacity={0.8}
                                    >
                                        {/* Squircle Stop Icon */}
                                        <View style={styles.stopNumberSquircle}>
                                            <Text style={styles.stopNumberText}>0{idx + 1}</Text>
                                        </View>

                                        {/* Stop Details */}
                                        <View style={styles.stopDetailsCol}>
                                            <View style={styles.stopTitleRow}>
                                                <Text style={styles.stopNameText}>{hub.name}</Text>
                                                {hub.highway && (
                                                    <View style={styles.highwayTag}>
                                                        <Text style={styles.highwayTagText}>{hub.highway}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.stopDistanceSub}>
                                                {hub.distFromOriginKm} km from {driverLocation.cityName} • ETA ~{Math.floor(hub.etaMins / 60)}h {hub.etaMins % 60}m
                                            </Text>
                                        </View>

                                        {/* Payout & Detour */}
                                        <View style={styles.stopPayoutCol}>
                                            <Text style={styles.stopEarningsText}>{hub.estimatedEarnings}</Text>
                                            <View style={[styles.detourPill, isLowDetour ? styles.detourPillGreen : styles.detourPillGray]}>
                                                <Text style={[styles.detourPillText, isLowDetour ? styles.detourTextGreen : styles.detourTextGray]}>
                                                    +{hub.detourKm} km
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.chevronWrapper}>
                                            <ChevronIcon expanded={isExpanded} />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Expanded Load Opportunity Panel */}
                                    {isExpanded && (
                                        <View style={styles.expandedPanel}>
                                            <View style={styles.cargoInfoGrid}>
                                                <View style={styles.cargoInfoItem}>
                                                    <Text style={styles.cargoInfoLabel}>HUB TYPE</Text>
                                                    <Text style={styles.cargoInfoValue}>{hub.hubType}</Text>
                                                </View>
                                                <View style={styles.cargoInfoItem}>
                                                    <Text style={styles.cargoInfoLabel}>DETOUR IMPACT</Text>
                                                    <Text style={styles.cargoInfoValue}>
                                                        {isLowDetour ? '⚡ Direct On-Route (<25km)' : `~${hub.detourKm}km corridor deviation`}
                                                    </Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.addStopButton}
                                                onPress={() => handleAcceptWaypointLoad(hub)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.addStopButtonText}>
                                                    ACCEPT RETURN LOAD AT {hub.name.toUpperCase()}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* 7. SECTION HEADING: History */}
                <Text style={[styles.sectionHeadingText, { marginTop: 32, marginBottom: 16 }]}>History</Text>

                {/* History Placeholders (Designer Mockup Match) */}
                <View style={styles.historyCard}>
                    <View style={styles.blackSquirclePin}>
                        <WhiteLocationPin size={22} />
                    </View>
                </View>

                <View style={styles.historyCard}>
                    <View style={styles.blackSquirclePin}>
                        <WhiteLocationPin size={22} />
                    </View>
                </View>

                <View style={styles.historyCard}>
                    <View style={styles.blackSquirclePin}>
                        <WhiteLocationPin size={22} />
                    </View>
                </View>
            </ScrollView>

            {/* 8. BOTTOM BLACK BAR */}
            <View style={styles.bottomBlackBar} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    topHeaderBar: {
        width: '100%',
        height: 64,
        backgroundColor: '#000000',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    avatarButton: {
        padding: 2,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#9CA3AF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    languagePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9CA3AF',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
    },
    languageText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 28,
    },
    proximityCard: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#000000',
    },
    proximityHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    proximityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    proximityLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#38BDF8',
        marginRight: 6,
    },
    proximityTagText: {
        color: '#E0F2FE',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    proximityTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 4,
    },
    proximitySub: {
        color: '#94A3B8',
        fontSize: 11,
        lineHeight: 15,
        marginBottom: 12,
    },
    simulateButton: {
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    simulateButtonActive: {
        backgroundColor: '#38BDF8',
    },
    simulateButtonSuccess: {
        backgroundColor: '#10B981',
    },
    simulateButtonText: {
        color: '#000000',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    searchSectionCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    searchHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    searchSectionLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#111827',
        letterSpacing: 0.8,
    },
    liveGpsPulsePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    greenGpsDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 5,
    },
    liveGpsText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#374151',
    },
    destInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#000000',
        paddingHorizontal: 8,
        height: 48,
    },
    pinIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    destInputField: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: '#000000',
    },
    findRouteButton: {
        backgroundColor: '#000000',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    findRouteButtonText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    quickPillsScroll: {
        marginTop: 12,
    },
    quickPillItem: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
    },
    quickPillItemActive: {
        backgroundColor: '#000000',
        borderColor: '#000000',
    },
    quickPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563',
    },
    quickPillTextActive: {
        color: '#FFFFFF',
    },
    sectionHeadingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionHeadingText: {
        fontSize: 26,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.6,
        fontFamily: 'System',
    },
    kmBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    kmBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#111827',
    },
    mapFrame: {
        width: '100%',
        height: 220,
        borderRadius: 24,
        borderWidth: 6,
        borderColor: '#9CA3AF',
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
    },
    currentTripCard: {
        width: '100%',
        backgroundColor: '#D1D5DB',
        borderRadius: 22,
        marginTop: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    blackSquirclePin: {
        width: 44,
        height: 44,
        backgroundColor: '#1E2224',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    tripRouteInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    tripRouteTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.3,
    },
    tripRouteSub: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '600',
        marginTop: 3,
    },
    cardDivider: {
        width: 1.5,
        height: 44,
        backgroundColor: '#6B7280',
        marginHorizontal: 14,
    },
    tripPricingInfo: {
        alignItems: 'flex-start',
        justifyContent: 'center',
        minWidth: 72,
    },
    tripAmount: {
        fontSize: 15,
        fontWeight: '900',
        color: '#000000',
    },
    pendingBadge: {
        fontSize: 13,
        color: '#111827',
        fontWeight: '500',
        marginTop: 2,
    },
    corridorContainer: {
        marginTop: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 18,
        borderWidth: 2,
        borderColor: '#000000',
    },
    corridorHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    corridorTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.3,
    },
    corridorSub: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 2,
    },
    hubCountBadge: {
        backgroundColor: '#000000',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    hubCountText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    waypointCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    waypointMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    stopNumberSquircle: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    stopNumberText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
    },
    stopDetailsCol: {
        flex: 1,
        justifyContent: 'center',
    },
    stopTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    stopNameText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000000',
    },
    highwayTag: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    highwayTagText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#374151',
    },
    stopDistanceSub: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 2,
    },
    stopPayoutCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginRight: 6,
    },
    stopEarningsText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000000',
    },
    detourPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 2,
    },
    detourPillGreen: {
        backgroundColor: '#DCFCE7',
    },
    detourPillGray: {
        backgroundColor: '#F3F4F6',
    },
    detourPillText: {
        fontSize: 9,
        fontWeight: '800',
    },
    detourTextGreen: {
        color: '#15803D',
    },
    detourTextGray: {
        color: '#6B7280',
    },
    chevronWrapper: {
        paddingLeft: 4,
    },
    expandedPanel: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        padding: 14,
    },
    cargoInfoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
    },
    cargoInfoItem: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cargoInfoLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#6B7280',
        marginBottom: 2,
    },
    cargoInfoValue: {
        fontSize: 11,
        fontWeight: '800',
        color: '#111827',
    },
    addStopButton: {
        backgroundColor: '#000000',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    addStopButtonText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    historyCard: {
        width: '100%',
        height: 68,
        backgroundColor: '#D1D5DB',
        borderRadius: 22,
        marginBottom: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bottomBlackBar: {
        width: '100%',
        height: 48,
        backgroundColor: '#000000',
    },
});

export default DriverHomeScreen;
