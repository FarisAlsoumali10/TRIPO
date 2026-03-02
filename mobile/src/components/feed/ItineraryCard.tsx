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

const PRIMARY_EMERALD = '#059669'; // لون Tripo الرسمي

const ItineraryCard: React.FC<ItineraryCardProps> = ({ itinerary, onPress }) => {
  const firstPlace = itinerary.places[0]?.placeId as Place;
  const firstPhoto = firstPlace?.photos?.[0];
  const authorName =
    typeof itinerary.userId === 'object' ? itinerary.userId.name : 'مستخدم مجهول';

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} دقيقة`;
    }
    return `${hours} ساعة`;
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'مجاني';
    return `${cost} ر.س`;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
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
            <MaterialCommunityIcons name="map-marker-outline" size={48} color="#9CA3AF" />
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
                color={PRIMARY_EMERALD}
                style={styles.verifiedIcon}
              />
            )}
          </View>

          <Text variant="bodySmall" style={styles.author} numberOfLines={1}>
            بواسطة {authorName}
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
                {itinerary.places.length} محطات
              </Text>
            </View>

            {/* 🛡️ الحماية هنا باستخدام ?. لتجنب انهيار التطبيق */}
            {itinerary.ratingSummary?.reviewCount > 0 && (
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
    backgroundColor: '#fff',
    borderRadius: 12, // زوايا أنعم
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'left',
  },
  verifiedIcon: {
    marginLeft: 8,
  },
  author: {
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'left',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    color: '#4B5563',
  },
});

export default ItineraryCard;