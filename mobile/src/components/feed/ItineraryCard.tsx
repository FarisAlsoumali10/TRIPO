import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Itinerary, Place } from '../../types';

interface ItineraryCardProps {
  itinerary: Itinerary;
  onPress: () => void;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({ itinerary, onPress }) => {
  const firstPlace = itinerary.places[0]?.placeId as Place;
  const firstPhoto = firstPlace?.photos?.[0];
  const authorName =
    typeof itinerary.userId === 'object' ? itinerary.userId.name : 'Unknown';

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours}h`;
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    return `$${cost}`;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        {firstPhoto ? (
          <Image
            source={{ uri: firstPhoto }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <MaterialCommunityIcons name="map-marker" size={48} color="#9CA3AF" />
          </View>
        )}

        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
              {itinerary.title}
            </Text>
            {itinerary.isVerified && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={20}
                color="#3B82F6"
                style={styles.verifiedIcon}
              />
            )}
          </View>

          <Text variant="bodySmall" style={styles.author} numberOfLines={1}>
            by {authorName}
          </Text>

          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#6B7280" />
              <Text variant="bodySmall" style={styles.metadataText}>
                {formatDuration(itinerary.estimatedDuration)}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="cash" size={16} color="#6B7280" />
              <Text variant="bodySmall" style={styles.metadataText}>
                {formatCost(itinerary.estimatedCost)}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
              <Text variant="bodySmall" style={styles.metadataText}>
                {itinerary.places.length} stops
              </Text>
            </View>

            {itinerary.ratingSummary.reviewCount > 0 && (
              <View style={styles.metadataItem}>
                <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
                <Text variant="bodySmall" style={styles.metadataText}>
                  {itinerary.ratingSummary.avgRating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 200,
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
  },
  verifiedIcon: {
    marginLeft: 8,
  },
  author: {
    color: '#6B7280',
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    color: '#6B7280',
  },
});

export default ItineraryCard;
